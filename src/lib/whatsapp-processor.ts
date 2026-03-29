/**
 * WhatsApp message processor.
 * Handles incoming WhatsApp messages and routes them through the order flow.
 * 
 * Flow: Hi → Browse Menu → Select Category → Select Item → Variants/Modifiers → Cart → Checkout → Pay
 */

import { createServiceClient } from "./supabase";
import {
    sendTextMessage,
    sendButtonMessage,
    sendListMessage,
    markAsRead,
} from "./whatsapp-sender";
import { createPaymentLink } from "./stripe";
import { formatCurrency } from "./utils";
import type { Organization, MenuItem, OrderItem } from "@/types/database";

// In-memory session store (Redis in Phase 2)
interface CartItem {
    item_id: string;
    name: string;
    variant?: string;
    modifiers?: string[];
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Session {
    orgId: string;
    state: "idle" | "browsing" | "category" | "item_selected" | "variant" | "modifiers" | "cart" | "checkout" | "awaiting_payment";
    selectedCategory?: string;
    selectedItem?: MenuItem;
    selectedVariant?: string;
    selectedModifiers?: string[];
    cart: CartItem[];
    pickupTime?: string;
}

const sessions = new Map<string, Session>();

function getSession(phone: string, orgId: string): Session {
    const key = `${phone}:${orgId}`;
    if (!sessions.has(key)) {
        sessions.set(key, { orgId, state: "idle", cart: [] });
    }
    return sessions.get(key)!;
}

function clearSession(phone: string, orgId: string) {
    sessions.delete(`${phone}:${orgId}`);
}

/**
 * Main message processor — called by the webhook handler.
 */
export async function processMessage(
    message: {
        from: string;
        id: string;
        type: string;
        text?: { body: string };
        interactive?: {
            type: string;
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description?: string };
        };
    },
    metadata: { display_phone_number: string }
) {
    const supabase = createServiceClient();
    const from = message.from;
    const businessNumber = metadata.display_phone_number;

    // Mark message as read (non-blocking for MVP/testing)
    try {
        await markAsRead(message.id);
    } catch (e) {
        console.warn("Could not mark message as read:", e);
    }

    // Find organization by exact number
    let { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("whatsapp_number", businessNumber)
        .eq("is_active", true)
        .single();

    // MVP Fallback: If no exact match (e.g. testing with default Meta test numbers), grab the first active org
    if (!org) {
        const { data: firstOrg } = await supabase
            .from("organizations")
            .select("*")
            .eq("is_active", true)
            .limit(1)
            .single();
        org = firstOrg;
    }

    if (!org) {
        await sendTextMessage(from, "Sorry, this service is currently unavailable.");
        return;
    }

    // Log incoming message
    await supabase.from("whatsapp_logs").insert({
        org_id: org.id,
        phone: from,
        direction: "incoming",
        payload: message as unknown as Record<string, unknown>,
        status: "received",
    });

    const session = getSession(from, org.id);

    // Extract user input
    let userInput = "";
    if (message.type === "text" && message.text) {
        userInput = message.text.body.trim().toLowerCase();
    } else if (message.type === "interactive") {
        if (message.interactive?.button_reply) {
            userInput = message.interactive.button_reply.id;
        } else if (message.interactive?.list_reply) {
            userInput = message.interactive.list_reply.id;
        }
    }

    // Route based on state + input
    try {
        if (userInput.startsWith("order_accept_") || userInput.startsWith("order_reject_")) {
            await handleVendorOrderAction(from, userInput);
        } else if (
            userInput === "hi" ||
            userInput === "hello" ||
            userInput === "hey" ||
            userInput === "start" ||
            session.state === "idle"
        ) {
            await handleWelcome(from, org);
            session.state = "browsing";
        } else if (userInput === "menu") {
            await sendCategories(from, org);
            session.state = "browsing";
        } else if (userInput.startsWith("cat_")) {
            await handleCategorySelect(from, org, userInput, session);
        } else if (userInput.startsWith("item_") || session.state === "category") {
            await handleItemSelect(from, org, userInput, session);
        } else if (userInput.startsWith("var_") || session.state === "variant") {
            await handleVariantSelect(from, org, userInput, session);
        } else if (userInput === "add_to_cart" || userInput === "checkout") {
            await handleCartAction(from, org, userInput, session);
        } else if (userInput === "add_more") {
            session.state = "browsing";
            await sendCategories(from, org);
        } else if (userInput.startsWith("pickup_")) {
            await handlePickupTime(from, org, userInput, session);
        } else if (userInput === "history") {
            await handleOrderHistory(from, org);
        } else if (userInput === "reorder") {
            await handleReorder(from, org);
        } else {
            await sendButtonMessage(from, `I didn't understand that. What would you like to do?`, [
                { id: "menu", title: "📋 Browse Menu" },
                { id: "history", title: "📦 My Orders" },
            ]);
        }
    } catch (error) {
        console.error("Message processing error:", error);
        await sendTextMessage(
            from,
            "Sorry, something went wrong. Please try again or type 'Hi' to start over."
        );
    }
}

/** Send welcome message with main options */
async function handleWelcome(phone: string, org: Organization) {
    const supabase = createServiceClient();
    const { data: lastOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("org_id", org.id)
        .eq("customer_phone", phone)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(1);

    const buttons = [
        { id: "menu", title: "📋 Browse Menu" },
        { id: "history", title: "📦 My Orders" },
    ];

    if (lastOrder && lastOrder.length > 0) {
        buttons.unshift({ id: "reorder", title: "🔄 Reorder Last" });
    }

    await sendButtonMessage(
        phone,
        `👋 Welcome back to ${org.name}!\nWhat would you like to do?`,
        buttons
    );
}

/** Send category list for menu browsing */
async function sendCategories(phone: string, org: Organization) {
    const supabase = createServiceClient();
    const { data: categories } = await supabase
        .from("categories")
        .select("*")
        .eq("org_id", org.id)
        .eq("is_active", true)
        .order("sort_order");

    if (!categories || categories.length === 0) {
        await sendTextMessage(phone, "The menu is currently empty. Please check back later!");
        return;
    }

    await sendListMessage(
        phone,
        `🍽️ ${org.name} Menu\nSelect a category to browse:`,
        "View Menu",
        [
            {
                title: "Categories",
                rows: categories.map((cat) => ({
                    id: `cat_${cat.id}`,
                    title: cat.name.slice(0, 24),
                    description: cat.description?.slice(0, 72) || undefined,
                })),
            },
        ]
    );
}

/** Handle category selection — show items in that category */
async function handleCategorySelect(
    phone: string,
    org: Organization,
    input: string,
    session: Session
) {
    const categoryId = input.replace("cat_", "");
    session.selectedCategory = categoryId;
    session.state = "category";

    const supabase = createServiceClient();
    const { data: items } = await supabase
        .from("menu_items")
        .select("*")
        .eq("org_id", org.id)
        .eq("category_id", categoryId)
        .eq("is_available", true)
        .order("sort_order");

    if (!items || items.length === 0) {
        await sendTextMessage(phone, "No items available in this category right now.");
        session.state = "browsing";
        return;
    }

    await sendListMessage(
        phone,
        `Here's what we have:`,
        "Select Item",
        [
            {
                title: "Items",
                rows: items.map((item) => ({
                    id: `item_${item.id}`,
                    title: `${item.name} - ${formatCurrency(item.price)}`,
                    description: item.description?.slice(0, 72) || undefined,
                })),
            },
        ]
    );
}

/** Handle item selection — show variants or add to cart */
async function handleItemSelect(
    phone: string,
    org: Organization,
    input: string,
    session: Session
) {
    const itemId = input.replace("item_", "");

    const supabase = createServiceClient();
    const { data: item } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", itemId)
        .single();

    if (!item) {
        await sendTextMessage(phone, "Item not found. Please try again.");
        return;
    }

    session.selectedItem = item;

    // If item has variants, show variant selection
    if (item.variants && item.variants.length > 0) {
        session.state = "variant";
        await sendListMessage(
            phone,
            `${item.name}\n${item.description || ""}\n\nSelect a size:`,
            "Choose Size",
            [
                {
                    title: "Sizes",
                    rows: (item.variants as { name: string; price: number }[]).map((v) => ({
                        id: `var_${v.name}`,
                        title: `${v.name} - ${formatCurrency(v.price)}`,
                    })),
                },
            ]
        );
    } else {
        // No variants — add directly to cart
        const cartItem: CartItem = {
            item_id: item.id,
            name: item.name,
            quantity: 1,
            unit_price: item.price,
            total_price: item.price,
        };
        session.cart.push(cartItem);
        await showCartSummary(phone, session);
    }
}

/** Handle variant selection */
async function handleVariantSelect(
    phone: string,
    _org: Organization,
    input: string,
    session: Session
) {
    const variantName = input.replace("var_", "");
    const item = session.selectedItem!;
    const variant = (item.variants as { name: string; price: number }[])?.find(
        (v) => v.name === variantName
    );

    const price = variant?.price || item.price;
    const cartItem: CartItem = {
        item_id: item.id,
        name: item.name,
        variant: variantName,
        quantity: 1,
        unit_price: price,
        total_price: price,
    };
    session.cart.push(cartItem);
    session.state = "cart";
    await showCartSummary(phone, session);
}

/** Show cart summary with add more / checkout */
async function showCartSummary(phone: string, session: Session) {
    const total = session.cart.reduce((sum, item) => sum + item.total_price, 0);
    const itemLines = session.cart
        .map(
            (item) =>
                `${item.quantity}x ${item.name}${item.variant ? ` (${item.variant})` : ""} — ${formatCurrency(item.total_price)}`
        )
        .join("\n");

    await sendButtonMessage(
        phone,
        `🛒 Your Cart:\n${itemLines}\n\n💰 Total: ${formatCurrency(total)}`,
        [
            { id: "add_more", title: "➕ Add More" },
            { id: "checkout", title: "💳 Checkout" },
        ]
    );
    session.state = "cart";
}

/** Handle cart actions: add more or checkout */
async function handleCartAction(
    phone: string,
    org: Organization,
    input: string,
    session: Session
) {
    if (input === "checkout") {
        // Ask for pickup time
        await sendButtonMessage(
            phone,
            "⏰ When would you like to pick up?",
            [
                { id: "pickup_15", title: "15 min" },
                { id: "pickup_30", title: "30 min" },
                { id: "pickup_60", title: "1 hour" },
            ]
        );
        session.state = "checkout";
    }
}

/** Handle pickup time selection and create order + payment */
async function handlePickupTime(
    phone: string,
    org: Organization,
    input: string,
    session: Session
) {
    const minutes = parseInt(input.replace("pickup_", ""), 10);
    const pickupTime = new Date(Date.now() + minutes * 60000).toISOString();
    session.pickupTime = pickupTime;

    const supabase = createServiceClient();

    // Upsert customer
    const { data: customer } = await supabase
        .from("customers")
        .upsert(
            { org_id: org.id, phone, order_count: 0, total_spent: 0, preferences: {} },
            { onConflict: "org_id,phone" }
        )
        .select()
        .single();

    const subtotal = session.cart.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    // Create order
    const orderItems: OrderItem[] = session.cart.map((item) => ({
        item_id: item.item_id,
        name: item.name,
        variant: item.variant,
        modifiers: item.modifiers,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
    }));

    const { data: order } = await supabase
        .from("orders")
        .insert({
            org_id: org.id,
            customer_id: customer?.id || null,
            customer_phone: phone,
            items_json: orderItems,
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: "pending",
            payment_status: "pending",
            pickup_time: pickupTime,
        })
        .select()
        .single();

    if (!order) {
        await sendTextMessage(phone, "Sorry, there was an error creating your order. Please try again.");
        return;
    }

    // Create Stripe payment link
    try {
        const paymentUrl = await createPaymentLink({
            orderId: order.id,
            orgName: org.name,
            items: session.cart.map((item) => ({
                name: `${item.name}${item.variant ? ` (${item.variant})` : ""}`,
                quantity: item.quantity,
                price: item.total_price,
            })),
            totalAmount,
            customerPhone: phone,
        });

        const pickupTimeStr = new Date(pickupTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });

        await sendTextMessage(
            phone,
            `📋 Order Summary:\n${session.cart.map((i) => `  ${i.quantity}x ${i.name}${i.variant ? ` (${i.variant})` : ""} — ${formatCurrency(i.total_price)}`).join("\n")}\n\nSubtotal: ${formatCurrency(subtotal)}\nTax: ${formatCurrency(taxAmount)}\n💰 Total: ${formatCurrency(totalAmount)}\n⏰ Pickup: ${pickupTimeStr}\n\n💳 Pay here: ${paymentUrl}`
        );

        // --- NEW: Notify Vendor ---
        if (org.notification_phone) {
            const vendorMsg = `🔔 *New Order!* (#${order.id.slice(0, 8)})\n\n👤 From: ${phone}\n⏰ Pickup: ${pickupTimeStr}\n\nItems:\n${session.cart.map((i) => `• ${i.quantity}x ${i.name}`).join("\n")}\n\n💰 Total: ${formatCurrency(totalAmount)}`;

            await sendButtonMessage(
                org.notification_phone,
                vendorMsg,
                [
                    { id: `order_accept_${order.id}`, title: "✅ Accept" },
                    { id: `order_reject_${order.id}`, title: "❌ Reject" },
                ]
            );
        }

        session.state = "awaiting_payment";
    } catch (error) {
        console.error("Payment link error:", error);
        await sendTextMessage(phone, "Sorry, there was a payment error. Please try again.");
    }
}

/** Handle order history request */
async function handleOrderHistory(phone: string, org: Organization) {
    const supabase = createServiceClient();
    const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("org_id", org.id)
        .eq("customer_phone", phone)
        .order("created_at", { ascending: false })
        .limit(5);

    if (!orders || orders.length === 0) {
        await sendTextMessage(phone, "You haven't placed any orders yet! Type 'Menu' to browse.");
        return;
    }

    const orderLines = orders
        .map((o) => {
            const items = (o.items_json as OrderItem[])
                .map((i) => `${i.quantity}x ${i.name}`)
                .join(", ");
            const date = new Date(o.created_at).toLocaleDateString();
            return `📦 ${date} — ${items} — ${formatCurrency(o.total_amount)} (${o.status})`;
        })
        .join("\n\n");

    await sendButtonMessage(phone, `📦 Your Recent Orders:\n\n${orderLines}`, [
        { id: "reorder", title: "🔄 Reorder Last" },
        { id: "menu", title: "📋 Browse Menu" },
    ]);
}

/** Handle reorder — repeat last order */
async function handleReorder(phone: string, org: Organization) {
    const supabase = createServiceClient();
    const { data: lastOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("org_id", org.id)
        .eq("customer_phone", phone)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (!lastOrder) {
        await sendTextMessage(phone, "No previous paid orders found. Type 'Menu' to browse!");
        return;
    }

    // Re-populate cart from last order
    const session = getSession(phone, org.id);
    session.cart = (lastOrder.items_json as OrderItem[]).map((item) => ({
        item_id: item.item_id,
        name: item.name,
        variant: item.variant,
        modifiers: item.modifiers,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
    }));

    await showCartSummary(phone, session);
}

/** Handle Vendor Accept/Reject actions from WhatsApp buttons */
async function handleVendorOrderAction(vendorPhone: string, input: string) {
    const isAccept = input.startsWith("order_accept_");
    const orderId = input.replace(isAccept ? "order_accept_" : "order_reject_", "");

    const supabase = createServiceClient();

    const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

    if (!order) {
        await sendTextMessage(vendorPhone, "Order not found.");
        return;
    }

    const { data: orgData } = await supabase
        .from("organizations")
        .select("name, notification_phone")
        .eq("id", order.org_id)
        .single();

    const orgName = orgData?.name || "the cafeteria";

    const newStatus = isAccept ? "preparing" : "cancelled";

    const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

    if (error) {
        await sendTextMessage(vendorPhone, "Error updating order status.");
        return;
    }

    // Notify Vendor of success
    await sendTextMessage(
        vendorPhone,
        `Order #${orderId.slice(0, 8)} has been ${isAccept ? "ACCEPTED ✅" : "REJECTED ❌"}.`
    );

    // Notify Customer
    if (isAccept) {
        await sendTextMessage(
            order.customer_phone,
            `👨‍🍳 *Good news!* ${orgName} has accepted your order and is now preparing it. We'll let you know when it's ready for pickup!`
        );
    } else {
        await sendTextMessage(
            order.customer_phone,
            `⚠️ *Update:* Your order at ${orgName} could not be accepted and has been cancelled. Please contact the cafeteria if you have questions.`
        );
    }
}
