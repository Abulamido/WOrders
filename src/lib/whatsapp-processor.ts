/**
 * WhatsApp message processor.
 * Handles incoming WhatsApp messages and routes them through the order flow.
 * 
 * Adapted for Green API: uses numbered text menus instead of interactive buttons.
 * Users reply with "1", "2", etc. to select options.
 * 
 * Flow: Hi → Browse Menu → Select Category → Select Item → Variants/Modifiers → Cart → Checkout → Pay
 */

import { createServiceClient } from "./supabase";
import {
    sendTextMessage,
    sendButtonMessage,
    sendListMessage,
    sendImageMessage,
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
    state: "idle" | "browsing" | "category" | "item_selected" | "variant" | "modifiers" | "cart" 
           | "checkout_name" | "checkout_type" | "checkout_address" | "checkout_payment" | "checkout_complete" | "awaiting_payment";
    selectedCategory?: string;
    selectedItem?: MenuItem;
    selectedVariant?: string;
    selectedModifiers?: string[];
    cart: CartItem[];
    customerName?: string;
    orderType?: "pickup" | "delivery";
    deliveryAddress?: string;
    paymentMethod?: "online" | "cash";
    // Numbered menu mapping: maps "1","2","3" → action IDs like "cat_abc", "item_xyz"
    lastMenuOptions?: { id: string; title: string }[];
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
 * Resolve numbered input ("1", "2", etc.) to the mapped action ID.
 * Falls back to the raw input if no mapping exists.
 */
function resolveNumberedInput(input: string, session: Session): string {
    const num = parseInt(input, 10);
    if (!isNaN(num) && session.lastMenuOptions && num >= 1 && num <= session.lastMenuOptions.length) {
        return session.lastMenuOptions[num - 1].id;
    }
    return input;
}

/**
 * Store menu options in session for numbered reply mapping.
 */
function setMenuOptions(session: Session, options: { id: string; title: string }[]) {
    session.lastMenuOptions = options;
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

    // MVP Fallback: If no exact match, grab the first active org
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

    // Resolve numbered replies (e.g. "1" → "cat_abc123")
    const resolvedInput = resolveNumberedInput(userInput, session);

    // Route based on state + input
    try {
        if (resolvedInput.startsWith("order_accept_") || resolvedInput.startsWith("order_reject_")) {
            await handleVendorOrderAction(from, resolvedInput);
        } else if (
            userInput === "hi" ||
            userInput === "hello" ||
            userInput === "hey" ||
            userInput === "start" ||
            userInput === "menu" ||
            session.state === "idle"
        ) {
            await handleWelcome(from, org, session);
            session.state = "browsing";
        } else if (resolvedInput === "menu") {
            await sendCategories(from, org, session);
            session.state = "browsing";
        } else if (resolvedInput.startsWith("cat_")) {
            await handleCategorySelect(from, org, resolvedInput, session);
        } else if (resolvedInput.startsWith("item_") || resolvedInput.startsWith("soldout_") || session.state === "category") {
            await handleItemSelect(from, org, resolvedInput, session);
        } else if (resolvedInput.startsWith("var_") || session.state === "variant") {
            await handleVariantSelect(from, org, resolvedInput, session);
        } else if (resolvedInput === "add_to_cart" || resolvedInput === "checkout") {
            await handleCartAction(from, org, resolvedInput, session);
        } else if (resolvedInput === "add_more") {
            session.state = "browsing";
            await sendCategories(from, org, session);
        } else if (session.state.startsWith("checkout_")) {
            await processCheckoutInput(from, org, userInput, session); // pass the raw userInput so we can get exactly what they typed

        } else if (resolvedInput === "history") {
            await handleOrderHistory(from, org, session);
        } else if (resolvedInput === "reorder") {
            await handleReorder(from, org);
        } else {
            const options = [
                { id: "menu", title: "📋 Browse Menu" },
                { id: "history", title: "📦 My Orders" },
            ];
            setMenuOptions(session, options);
            await sendButtonMessage(from, `I didn't understand that. What would you like to do?`, options);
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
async function handleWelcome(phone: string, org: Organization, session: Session) {
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

    const isOpen = org.is_open_manually !== false;
    const closedNote = !isOpen ? "\n\n⚠️ _We are currently closed. Feel free to browse, but ordering is paused._" : "";

    setMenuOptions(session, buttons);
    await sendButtonMessage(
        phone,
        `👋 Welcome to ${org.name}!\nWhat would you like to do?${closedNote}`,
        buttons
    );
}

/** Send category list for menu browsing */
async function sendCategories(phone: string, org: Organization, session: Session) {
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

    const options = categories.map((cat) => ({
        id: `cat_${cat.id}`,
        title: cat.name.slice(0, 24),
        description: cat.description?.slice(0, 72) || undefined,
    }));

    setMenuOptions(session, options);
    await sendListMessage(
        phone,
        `🍽️ ${org.name} Menu\nSelect a category to browse:`,
        "View Menu",
        [{ title: "Categories", rows: options }]
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
        .order("sort_order");

    if (!items || items.length === 0) {
        await sendTextMessage(phone, "No items in this category right now.");
        session.state = "browsing";
        return;
    }

    const options = items.map((item) => ({
        id: item.is_available ? `item_${item.id}` : `soldout_${item.id}`,
        title: item.is_available
            ? `${item.name} - ${formatCurrency(item.price)}`
            : `❌ ${item.name} - SOLD OUT`,
        description: item.description?.slice(0, 72) || undefined,
    }));

    setMenuOptions(session, options);
    await sendListMessage(
        phone,
        `Here's what we have:`,
        "Select Item",
        [{ title: "Items", rows: options }]
    );
}

/** Handle item selection — show variants or add to cart */
async function handleItemSelect(
    phone: string,
    org: Organization,
    input: string,
    session: Session
) {
    // Guard: Sold-out items cannot be selected
    if (input.startsWith("soldout_")) {
        await sendTextMessage(phone, "❌ Sorry, this item is currently sold out. Please pick something else!");
        return;
    }

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

    if (!item.is_available) {
        await sendTextMessage(phone, `❌ Sorry, *${item.name}* is currently sold out.`);
        return;
    }

    session.selectedItem = item;

    // Send product image if available
    if (item.image_url) {
        await sendImageMessage(phone, item.image_url, `*${item.name}*\n${item.description || ""}`);
    }

    // If item has variants, show variant selection
    if (item.variants && item.variants.length > 0) {
        session.state = "variant";
        const variantOptions = (item.variants as { name: string; price: number }[]).map((v) => ({
            id: `var_${v.name}`,
            title: `${v.name} - ${formatCurrency(v.price)}`,
        }));

        setMenuOptions(session, variantOptions);
        await sendListMessage(
            phone,
            `Select a size for ${item.name}:`,
            "Choose Size",
            [{ title: "Sizes", rows: variantOptions }]
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

    const options = [
        { id: "add_more", title: "➕ Add More" },
        { id: "checkout", title: "💳 Checkout" },
    ];
    setMenuOptions(session, options);
    await sendButtonMessage(
        phone,
        `🛒 Your Cart:\n${itemLines}\n\n💰 Total: ${formatCurrency(total)}`,
        options
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
        // Guard: Store must be open to proceed
        if (org.is_open_manually === false) {
            await sendTextMessage(
                phone,
                "⚠️ Sorry, we are currently closed and cannot accept orders right now. Please come back when we are open! Your cart has been saved."
            );
            return;
        }

        session.state = "checkout_type"; 
        // We set to checkout_type because we skip name (WhatsApp handles phone inherently, but what about name? The user said we can skip asking for *phone* "since whatsapp provides it". BUT WhatsApp doesn't always provide a proper name, sometimes it's just a raw number. Wait, we DO get senderName natively! `messageData.senderData.senderName`! I can use it. But wait, I'm inside handleCartAction, I don't have senderName here unless I grab it. I can just ask for name, or assume we already have it.)

        // Wait, let's just ask for Name properly because Telegram asks for it, and WhatsApp profile names are sometimes emojis.
        session.state = "checkout_name";
        await sendTextMessage(phone, "📝 Let's get your order ready!\n\nPlease reply with your *Full Name*.");
    }

}

/** MULTI-STEP CHECKOUT FLOW */

async function processCheckoutInput(phone: string, org: Organization, rawInput: string, session: Session) {
    // Resolve any numbered replies if they pressed an option
    const input = resolveNumberedInput(rawInput, session);

    if (session.state === "checkout_name") {
        session.customerName = rawInput; // save their raw typed name
        session.state = "checkout_type";
        const options = [
            { id: "checkout_type:pickup", title: "🚶 Pick Up" },
            { id: "checkout_type:delivery", title: "🚚 Delivery" }
        ];
        setMenuOptions(session, options);
        await sendButtonMessage(phone, "How would you like to receive your order?", options);
        return;
    }
    
    if (session.state === "checkout_type") {
        if (input === "checkout_type:pickup") {
            session.orderType = "pickup";
            session.state = "checkout_payment";
            const options = [
                { id: "checkout_payment:online", title: "💳 Pay Online (Card)" },
                { id: "checkout_payment:cash", title: "💵 Pay on Pick Up" }
            ];
            setMenuOptions(session, options);
            await sendButtonMessage(phone, "How would you like to pay?", options);
        } else if (input === "checkout_type:delivery") {
            session.orderType = "delivery";
            session.state = "checkout_address";
            await sendTextMessage(phone, "📍 Please enter your *Delivery Address* (Building, Street, Room).");
        } else {
            await sendTextMessage(phone, "Please reply with a valid number for Pick Up or Delivery.");
        }
        return;
    }

    if (session.state === "checkout_address") {
        session.deliveryAddress = rawInput;
        // For delivery, payment is strictly online
        session.paymentMethod = "online";
        await finalizeOrder(phone, org, session);
        return;
    }

    if (session.state === "checkout_payment") {
        if (input === "checkout_payment:online") {
            session.paymentMethod = "online";
            await finalizeOrder(phone, org, session);
        } else if (input === "checkout_payment:cash") {
            session.paymentMethod = "cash";
            await finalizeOrder(phone, org, session);
        } else {
            await sendTextMessage(phone, "Please reply with a valid number for Online or Cash.");
        }
        return;
    }
}

async function finalizeOrder(phone: string, org: Organization, session: Session) {
    const supabase = createServiceClient();
    
    // Upsert customer (we already have phone)
    const { data: customer } = await supabase
        .from("customers")
        .upsert(
            { org_id: org.id, phone, name: session.customerName || "WhatsApp Customer" },
            { onConflict: "org_id,phone" }
        )
        .select()
        .single();

    const subtotal = session.cart.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
    const deliveryFee = session.orderType === "delivery" ? 5.00 : 0.00;
    
    // Monetization: Calculate Platform Fee (Revenue Share)
    let platformFeePercent = org.platform_fee_percent || 5.0;

    if (org.agency_id) {
        const { data: agency } = await supabase
            .from("agencies")
            .select("platform_fee_percent")
            .eq("id", org.agency_id)
            .single();
        if (agency) platformFeePercent = agency.platform_fee_percent;
    }

    const platformFee = Math.round((subtotal * (platformFeePercent / 100)) * 100) / 100;
    
    // Customer pays Subtotal + Tax + Delivery.
    const totalAmount = Math.round((subtotal + taxAmount + deliveryFee) * 100) / 100;

    const orderItems: OrderItem[] = session.cart.map((item) => ({
        item_id: item.item_id,
        name: item.name,
        variant: item.variant,
        modifiers: item.modifiers,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
    }));

    const { data: order, error: insertError } = await supabase
        .from("orders")
        .insert({
            org_id: org.id,
            customer_id: customer?.id || null,
            customer_phone: phone,
            customer_name: session.customerName,
            items_json: orderItems,
            subtotal,
            tax_amount: taxAmount,
            delivery_fee: deliveryFee,
            platform_fee: platformFee,
            total_amount: totalAmount,
            status: "pending",
            payment_status: "pending",
            order_type: session.orderType,
            delivery_address: session.deliveryAddress,
            payment_method: session.paymentMethod,
        })
        .select()
        .single();

    if (!order) {
        console.error("Order Insert Error:", insertError);
        await supabase.from("whatsapp_logs").insert({
            org_id: org.id,
            phone: phone,
            direction: "incoming",
            payload: { error_msg: "Order Insert Error", details: insertError } as any,
            status: "CRASH",
        });
        await sendTextMessage(phone, "Sorry, there was an error creating your order. Please try again.");
        return;
    }

    const summaryText = `📋 Order Summary:\n${session.cart.map((i) => `  ${i.quantity}x ${i.name}${i.variant ? ` (${i.variant})` : ""} — ${formatCurrency(i.total_price)}`).join("\n")}\n\nSubtotal: ${formatCurrency(subtotal)}\nTax: ${formatCurrency(taxAmount)}\n${deliveryFee > 0 ? `Delivery: ${formatCurrency(deliveryFee)}\n` : ""}💰 Total: ${formatCurrency(totalAmount)}\nType: ${session.orderType === 'delivery' ? '🚚 Delivery' : '🚶 Pick Up'}\nPayment: ${session.paymentMethod === 'online' ? '💳 Online' : '💵 Cash'}`;

    // --- Notify Vendor ---
    if (org.notification_phone) {
        const vendorMsg = `🔔 *New Order!* (#${order.id.slice(0, 8)})\n\n👤 ${session.customerName || phone} (${phone})\nType: ${session.orderType === 'delivery' ? 'Delivery' : 'Pick Up'}\n${session.deliveryAddress ? `📍 ${session.deliveryAddress}\n` : ""}\nItems:\n${session.cart.map((i) => `• ${i.quantity}x ${i.name}`).join("\n")}\n\n💰 Total: ${formatCurrency(totalAmount)} (${session.paymentMethod})`;
        const vendorOptions = [
            { id: `order_accept_${order.id}`, title: "✅ Accept" },
            { id: `order_reject_${order.id}`, title: "❌ Reject" },
        ];
        await sendButtonMessage(org.notification_phone, vendorMsg, vendorOptions);
    }

    if (session.paymentMethod === "online" && totalAmount > 0) {
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
                agencyId: org.agency_id,
            });

            await sendTextMessage(phone, `${summaryText}\n\n💳 Pay here: ${paymentUrl}`);
            session.state = "awaiting_payment";
        } catch (error) {
            console.error("Payment link error:", error);
            await sendTextMessage(phone, "Sorry, there was a payment error. Please try again.");
        }
    } else {
        await sendTextMessage(phone, `✅ Your order has been placed successfully!\n\n${summaryText}\n\nWe will notify you when it's ready.`);
        session.state = "checkout_complete";
        clearSession(phone, org.id); // clear cart after successful cash/free placement
    }
}

/** Handle order history request */
async function handleOrderHistory(phone: string, org: Organization, session: Session) {
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

    const options = [
        { id: "reorder", title: "🔄 Reorder Last" },
        { id: "menu", title: "📋 Browse Menu" },
    ];
    setMenuOptions(session, options);
    await sendButtonMessage(phone, `📦 Your Recent Orders:\n\n${orderLines}`, options);
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
