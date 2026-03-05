/**
 * Telegram message processor.
 * Mirrors the WhatsApp ordering flow but uses Telegram inline keyboards.
 *
 * Flow: /start → Browse Menu → Category → Item → Variants → Cart → Checkout → Pay
 */

import { createServiceClient } from "@/lib/supabase";
import { createPaymentLink } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";
import type { Organization, MenuItem, OrderItem } from "@/types/database";

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN!;
const API = () => `https://api.telegram.org/bot${BOT_TOKEN()}`;

// ─── Session Store ────────────────────────────────────────────────────────────

interface CartItem {
    item_id: string;
    name: string;
    variant?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Session {
    orgId: string;
    state: "idle" | "browsing" | "category" | "variant" | "cart" | "checkout" | "awaiting_payment";
    selectedItem?: MenuItem;
    cart: CartItem[];
}

const sessions = new Map<string, Session>();

function getSession(chatId: number, orgId: string): Session {
    const key = `${chatId}:${orgId}`;
    if (!sessions.has(key)) {
        sessions.set(key, { orgId, state: "idle", cart: [] });
    }
    return sessions.get(key)!;
}

// ─── Telegram API helpers ─────────────────────────────────────────────────────

async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
    await fetch(`${API()}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "Markdown",
            reply_markup: replyMarkup,
        }),
    });
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: object) {
    await fetch(`${API()}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: "Markdown",
            reply_markup: replyMarkup,
        }),
    });
}

async function answerCallback(callbackId: string, text?: string) {
    await fetch(`${API()}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackId, text }),
    });
}

// ─── Main entry points ────────────────────────────────────────────────────────

/** Handle text commands like /start, /menu, /cart */
export async function processTelegramCommand(
    chatId: number,
    text: string,
    firstName: string
) {
    const supabase = createServiceClient();
    const cmd = text.toLowerCase().trim();

    // Multi-restaurant deep link: /start <org_id_prefix>
    // Users access via t.me/Cafteriaflow_bot?start=<org_id_short>
    let org = null;

    if (cmd.startsWith("/start ")) {
        const orgCode = text.split(" ")[1]?.trim();
        if (orgCode) {
            // Try to find org by ID prefix (first 8 chars of UUID)
            const { data: orgs } = await supabase
                .from("organizations")
                .select("*")
                .eq("is_active", true);

            org = orgs?.find((o: { id: string }) => o.id.startsWith(orgCode)) || null;
        }
    }

    // Fallback: grab the first active org (MVP single-tenant default)
    if (!org) {
        const { data } = await supabase
            .from("organizations")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();
        org = data;
    }

    if (!org) {
        await sendMessage(chatId, "⚠️ The ordering service is not yet configured. Please check back later.");
        return;
    }

    const session = getSession(chatId, org.id);

    if (cmd === "/start" || cmd.startsWith("/start ") || cmd === "hi" || cmd === "hello") {
        await handleWelcome(chatId, firstName, org, session);
    } else if (cmd === "/menu" || cmd === "menu") {
        await sendCategories(chatId, org);
        session.state = "browsing";
    } else if (cmd === "/cart" || cmd === "cart") {
        await showCart(chatId, session);
    } else {
        await sendMessage(chatId, `👋 Hi *${firstName}*! Use /menu to browse the menu or /cart to view your cart.`);
    }
}

/** Handle inline keyboard button presses */
export async function processTelegramCallback(
    chatId: number,
    messageId: number,
    callbackId: string,
    data: string,
    firstName: string
) {
    const supabase = createServiceClient();
    await answerCallback(callbackId);

    const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

    if (!org) return;

    const session = getSession(chatId, org.id);

    if (data === "browse_menu") {
        await sendCategories(chatId, org);
        session.state = "browsing";
    } else if (data.startsWith("cat_")) {
        await handleCategorySelect(chatId, messageId, org, data, session);
    } else if (data.startsWith("item_")) {
        await handleItemSelect(chatId, messageId, org, data, session);
    } else if (data.startsWith("var_")) {
        await handleVariantSelect(chatId, messageId, data, session);
    } else if (data === "add_more") {
        await editMessage(chatId, messageId, "🍽️ What else would you like?");
        await sendCategories(chatId, org);
        session.state = "browsing";
    } else if (data === "checkout") {
        await handleCheckout(chatId, messageId, org, session, firstName);
    } else if (data.startsWith("pickup_")) {
        await handlePickupTime(chatId, messageId, org, data, session, firstName);
    }
}

// ─── Flow handlers ────────────────────────────────────────────────────────────

async function handleWelcome(chatId: number, firstName: string, org: Organization, session: Session) {
    const supabase = createServiceClient();

    const { data: lastOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("org_id", org.id)
        .eq("customer_phone", String(chatId))
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(1);

    const buttons: { text: string; callback_data: string }[][] = [
        [{ text: "📋 Browse Menu", callback_data: "browse_menu" }],
    ];

    if (lastOrder && lastOrder.length > 0) {
        buttons.unshift([{ text: "🔄 Reorder Last", callback_data: "reorder" }]);
    }

    await sendMessage(
        chatId,
        `👋 Welcome to *${org.name}*, ${firstName}!\n\nOrder your food via Telegram — browse the menu and pay in seconds.`,
        { inline_keyboard: buttons }
    );
    session.state = "browsing";
}

async function sendCategories(chatId: number, org: Organization) {
    const supabase = createServiceClient();
    const { data: categories } = await supabase
        .from("categories")
        .select("*")
        .eq("org_id", org.id)
        .eq("is_active", true)
        .order("sort_order");

    if (!categories || categories.length === 0) {
        await sendMessage(chatId, "The menu is currently empty. Please check back later!");
        return;
    }

    const buttons = categories.map((cat) => [
        { text: cat.name, callback_data: `cat_${cat.id}` },
    ]);

    await sendMessage(chatId, `🍽️ *${org.name} Menu*\n\nSelect a category:`, {
        inline_keyboard: buttons,
    });
}

async function handleCategorySelect(
    chatId: number,
    messageId: number,
    org: Organization,
    data: string,
    session: Session
) {
    const categoryId = data.replace("cat_", "");
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
        await editMessage(chatId, messageId, "No items available in this category right now.");
        return;
    }

    const buttons = items.map((item) => [
        {
            text: `${item.name} — ${formatCurrency(item.price)}`,
            callback_data: `item_${item.id}`,
        },
    ]);
    buttons.push([{ text: "⬅️ Back to Categories", callback_data: "browse_menu" }]);

    await editMessage(chatId, messageId, `📂 *Items:*`, { inline_keyboard: buttons });
}

async function handleItemSelect(
    chatId: number,
    messageId: number,
    org: Organization,
    data: string,
    session: Session
) {
    const itemId = data.replace("item_", "");
    const supabase = createServiceClient();

    const { data: item } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", itemId)
        .single();

    if (!item) {
        await editMessage(chatId, messageId, "Item not found. Please try again.");
        return;
    }

    session.selectedItem = item;

    // If item has variants, show variant selection
    if (item.variants && (item.variants as { name: string; price: number }[]).length > 0) {
        session.state = "variant";
        const buttons = (item.variants as { name: string; price: number }[]).map((v) => [
            {
                text: `${v.name} — ${formatCurrency(v.price)}`,
                callback_data: `var_${v.name}`,
            },
        ]);

        await editMessage(
            chatId,
            messageId,
            `*${item.name}*\n${item.description || ""}\n\nChoose a size:`,
            { inline_keyboard: buttons }
        );
    } else {
        // No variants — add directly to cart
        session.cart.push({
            item_id: item.id,
            name: item.name,
            quantity: 1,
            unit_price: item.price,
            total_price: item.price,
        });
        await showCart(chatId, session, messageId);
    }
}

async function handleVariantSelect(
    chatId: number,
    messageId: number,
    data: string,
    session: Session
) {
    const variantName = data.replace("var_", "");
    const item = session.selectedItem!;
    const variant = (item.variants as { name: string; price: number }[])?.find(
        (v) => v.name === variantName
    );
    const price = variant?.price || item.price;

    session.cart.push({
        item_id: item.id,
        name: item.name,
        variant: variantName,
        quantity: 1,
        unit_price: price,
        total_price: price,
    });
    session.state = "cart";
    await showCart(chatId, session, messageId);
}

async function showCart(chatId: number, session: Session, messageId?: number) {
    if (session.cart.length === 0) {
        const msg = "🛒 Your cart is empty. Use /menu to browse.";
        if (messageId) await editMessage(chatId, messageId, msg);
        else await sendMessage(chatId, msg);
        return;
    }

    const total = session.cart.reduce((sum, item) => sum + item.total_price, 0);
    const lines = session.cart
        .map((i) => `• ${i.quantity}x *${i.name}*${i.variant ? ` (${i.variant})` : ""} — ${formatCurrency(i.total_price)}`)
        .join("\n");

    const keyboard = {
        inline_keyboard: [
            [{ text: "➕ Add More", callback_data: "add_more" }, { text: "💳 Checkout", callback_data: "checkout" }],
        ],
    };
    const text = `🛒 *Your Cart:*\n\n${lines}\n\n💰 *Total: ${formatCurrency(total)}*`;

    if (messageId) await editMessage(chatId, messageId, text, keyboard);
    else await sendMessage(chatId, text, keyboard);
    session.state = "cart";
}

async function handleCheckout(
    chatId: number,
    messageId: number,
    _org: Organization,
    session: Session,
    _firstName: string
) {
    await editMessage(chatId, messageId, "⏰ *When would you like to pick up?*", {
        inline_keyboard: [
            [
                { text: "🕐 15 min", callback_data: "pickup_15" },
                { text: "🕑 30 min", callback_data: "pickup_30" },
                { text: "🕐 1 hour", callback_data: "pickup_60" },
            ],
        ],
    });
    session.state = "checkout";
}

async function handlePickupTime(
    chatId: number,
    messageId: number,
    org: Organization,
    data: string,
    session: Session,
    firstName: string
) {
    const minutes = parseInt(data.replace("pickup_", ""), 10);
    const pickupTime = new Date(Date.now() + minutes * 60000).toISOString();
    const supabase = createServiceClient();

    // Upsert customer using chatId as phone identifier for Telegram users
    const telegramPhone = `tg:${chatId}`;
    const { data: customer } = await supabase
        .from("customers")
        .upsert(
            { org_id: org.id, phone: telegramPhone, order_count: 0, total_spent: 0, preferences: {} },
            { onConflict: "org_id,phone" }
        )
        .select()
        .single();

    const subtotal = session.cart.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    const orderItems: OrderItem[] = session.cart.map((item) => ({
        item_id: item.item_id,
        name: item.name,
        variant: item.variant,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
    }));

    const { data: order } = await supabase
        .from("orders")
        .insert({
            org_id: org.id,
            customer_id: customer?.id || null,
            customer_phone: telegramPhone,
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
        await editMessage(chatId, messageId, "⚠️ Error creating your order. Please try again.");
        return;
    }

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
            customerPhone: telegramPhone,
        });

        const pickupTimeStr = new Date(pickupTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });

        const summary = session.cart
            .map((i) => `• ${i.quantity}x ${i.name}${i.variant ? ` (${i.variant})` : ""} — ${formatCurrency(i.total_price)}`)
            .join("\n");

        await editMessage(
            chatId,
            messageId,
            `✅ *Order Confirmed!*\n\n${summary}\n\nSubtotal: ${formatCurrency(subtotal)}\nTax: ${formatCurrency(taxAmount)}\n💰 *Total: ${formatCurrency(totalAmount)}*\n⏰ Pickup: *${pickupTimeStr}*`,
            {
                inline_keyboard: [
                    [{ text: "💳 Pay Now", url: paymentUrl }],
                    [{ text: "📋 Order Again", callback_data: "browse_menu" }],
                ],
            }
        );

        // Notify vendor via WhatsApp if configured, otherwise skip
        if (org.notification_phone) {
            const { sendTextMessage } = await import("@/lib/whatsapp-sender");
            const vendorMsg = `🔔 New Telegram Order! (#${order.id.slice(0, 8)})\n\n👤 From: ${firstName} (Telegram)\n⏰ Pickup: ${pickupTimeStr}\n\nItems:\n${session.cart.map((i) => `• ${i.quantity}x ${i.name}`).join("\n")}\n\n💰 Total: ${formatCurrency(totalAmount)}`;
            await sendTextMessage(org.notification_phone, vendorMsg).catch(() => null);
        }

        session.state = "awaiting_payment";
        session.cart = []; // Clear cart after order
    } catch (error) {
        console.error("Telegram payment link error:", error);
        await sendMessage(chatId, "⚠️ Payment error. Please try again with /menu.");
    }
}
