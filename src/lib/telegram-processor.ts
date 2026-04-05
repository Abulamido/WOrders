/**
 * Telegram message processor.
 * Handles incoming Telegram messages and routes them through the order flow.
 */

import { createServiceClient } from "./supabase";
import {
    sendMessage,
    answerCallbackQuery,
    requestContact,
    sendPhoto
} from "./telegram-sender";
import { createPaymentLink } from "./stripe";
import { formatCurrency } from "./utils";
import { Organization, MenuItem, OrderItem } from "../types/database";

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

interface TelegramSession {
    orgId: string;
    state: "welcome" | "idle" | "browsing" | "category" | "item_selected" | "variant" | "cart" | "checkout_name" | "checkout_phone" | "checkout_type" | "checkout_address" | "checkout_payment" | "awaiting_payment" | "support_chat";
    selectedCategory?: string;
    selectedItem?: MenuItem;
    cart: CartItem[];
    pickupTime?: string;
    // New complex checkout fields
    customerName?: string;
    customerPhone?: string;
    orderType?: "pickup" | "delivery";
    deliveryAddress?: string;
    paymentMethod?: "online" | "cash";
}

const sessions = new Map<string, TelegramSession>();

function getTelegramSession(chatId: string | number, orgId: string): TelegramSession {
    const key = `${chatId}:${orgId}`;
    if (!sessions.has(key)) {
        sessions.set(key, { orgId, state: "idle", cart: [] });
    }
    return sessions.get(key)!;
}

function getActiveTelegramSession(chatId: string | number): TelegramSession | undefined {
    // Find the session currently engaged in checkout or support chat for this user
    for (const [key, session] of sessions.entries()) {
        if (key.startsWith(`${chatId}:`) && (session.state.startsWith("checkout_") || session.state === "support_chat")) {
            return session;
        }
    }
    // Fallback to any session for this user
    for (const [key, session] of sessions.entries()) {
        if (key.startsWith(`${chatId}:`)) {
            return session;
        }
    }
    return undefined;
}

/**
 * Main message processor — called by the webhook handler.
 */
export async function processTelegramUpdate(update: any) {
    const supabase = createServiceClient();

    // 1. Handle Message (text or contact)
    if (update.message) {
        const { chat, text, contact, from } = update.message;
        const chatId = chat.id;

        // --- DEEP LINKING CHECK (/start slug or /start vendor_{id}) ---
        if (text && text.startsWith("/start ")) {
            const payload = text.replace("/start ", "").trim();
            
            // 1. Handle Vendor Linking
            if (payload.startsWith("vendor_")) {
                const orgId = payload.replace("vendor_", "").trim();
                const { error: orgError } = await supabase
                    .from("organizations")
                    .update({ notification_telegram_id: chatId })
                    .eq("id", orgId);

                if (orgError) {
                    console.error("Vendor link error:", orgError);
                    await sendMessage(chatId, "❌ Failed to link your vendor account via link. Please use the dashboard ID.");
                } else {
                    await sendMessage(chatId, "✅ *Vendor Authorized & Linked!*\n\nYou will now receive real-time order notifications for your cafeteria.");
                }
                return;
            }

            // 2. Handle Customer Startup (Slug)
            console.log(`DEBUG: Processing /start for slug: ${payload}`);
            
            const { data: organization, error: orgError } = await supabase
                .from("organizations")
                .select("*")
                .eq("slug", payload)
                .single();

            if (orgError || !organization) {
                console.error("Organization lookup error:", orgError);
                await sendMessage(chatId, "❌ Sorry, this cafeteria is not found or inactive.");
                return;
            }

            // Approval Check
            if (organization.approval_status !== "approved") {
                await sendMessage(chatId, "⏳ *Kitchen Under Review*\n\nThis cafeteria is currently being set up or is under review by our team. Please check back soon!");
                return;
            }

            console.log(`DEBUG: Found organization: ${organization.name} (${organization.id})`);
            
            const session = getTelegramSession(chatId, organization.id);
            session.state = "welcome";
            await handleStart(chatId, from, organization);
            return;
        }

        // --- VENDOR DEEP LINKING (/vendor {orgId}) ---
        if (text && text.startsWith("/vendor ")) {
            const orgId = text.replace("/vendor ", "").trim();
            const { error: orgError } = await supabase
                .from("organizations")
                .update({ notification_telegram_id: chatId })
                .eq("id", orgId);

            if (orgError) {
                console.error("Vendor auth error:", orgError);
                await sendMessage(chatId, "❌ Failed to link your vendor account. Please try again from the dashboard.");
            } else {
                await sendMessage(chatId, "✅ *Vendor Authorized!*\n\nYou will now receive real-time order notifications and can use /open or /close to manage your shop status.");
            }
            return;
        }

        // --- VENDOR COMMANDS (/open, /close) ---
        if (text && (text.trim() === "/open" || text.trim() === "/close")) {
            const isOpening = text.trim() === "/open";
            const { data: org, error } = await supabase
                .from("organizations")
                .update({ is_open_manually: isOpening })
                .eq("notification_telegram_id", chatId)
                .select("name")
                .single();

            if (error || !org) {
                await sendMessage(chatId, "❌ You must be a linked vendor to use this command. Use `/vendor {orgId}` to link.");
            } else {
                await sendMessage(chatId, `✅ *Status Updated!* \n\n${org.name} is now *${isOpening ? "OPEN" : "CLOSED"}* for new orders.`);
            }
            return;
        }

        // --- EXIT SUPPORT CHAT (/done) ---
        if (text && text.trim() === "/done") {
            const activeTelegramSession = getActiveTelegramSession(chatId);
            if (activeTelegramSession && activeTelegramSession.state === "support_chat") {
                activeTelegramSession.state = "idle";
                await sendMessage(chatId, "✅ *Support chat ended.* You can continue ordering or request help again from your order receipt.");
            }
            return;
        }

        // --- CONTACT (Phone sharing) ---
        if (contact && contact.phone_number) {
            const activeTelegramSession = getActiveTelegramSession(chatId);
            if (activeTelegramSession && activeTelegramSession.state === "checkout_phone") {
                await processCheckoutInput(chatId, contact.phone_number, activeTelegramSession);
                return;
            }
        }

        // --- VENDOR REPLY ROUTING ---
        if (update.message.reply_to_message && update.message.reply_to_message.text) {
            const replyText = update.message.reply_to_message.text;
            const match = replyText.match(/\[ChatID:\s*(\d+)\]/);
            if (match && match[1]) {
                const customerChatId = match[1];
                await sendMessage(customerChatId, `💬 *Message from Kitchen:*\n${text}`);
                return;
            }
        }

        // --- TEXT INPUT STATE MACHINE ---
        if (text && !text.startsWith("/")) {
            const activeTelegramSession = getActiveTelegramSession(chatId);
            
            if (activeTelegramSession && activeTelegramSession.state === "support_chat") {
                const { data: org } = await supabase.from("organizations").select("notification_telegram_id").eq("id", activeTelegramSession.orgId).single();
                if (org && org.notification_telegram_id) {
                    await sendMessage(org.notification_telegram_id as unknown as string, `💬 *Message from Customer [ChatID: ${chatId}]*:\n${text}`);
                    await sendMessage(chatId, "✅ _Message sent to kitchen_");
                }
                return;
            }

            if (activeTelegramSession && activeTelegramSession.state.startsWith("checkout_")) {
                await processCheckoutInput(chatId, text, activeTelegramSession);
                return;
            }
        }

        // --- FALLBACK ---
        await sendMessage(chatId, "Please use one of the buttons or scan a QR code to start ordering!");
    }

    // 2. Handle Callback Queries (Buttons)
    if (update.callback_query) {
        const { id, from, message, data } = update.callback_query;
        const chatId = message.chat.id;

        // Callback data is usually "action:payload"
        const [action, payload] = data.split(":");
        let orgId = "";

        try {
            if (["menu", "cart", "checkout", "history"].includes(action)) {
                orgId = payload;
            } else if (["checkout_type", "checkout_payment"].includes(action)) {
                const activeTelegramSession = getActiveTelegramSession(chatId);
                if (!activeTelegramSession) return;
                orgId = activeTelegramSession.orgId;
            } else if (action === "cat") {
                const { data: catData } = await supabase.from("categories").select("org_id").eq("id", payload).single();
                if (!catData) throw new Error("Category not found");
                orgId = catData.org_id;
            } else if (action === "item") {
                const { data: itemData } = await supabase.from("menu_items").select("org_id").eq("id", payload).single();
                if (!itemData) throw new Error("Item not found");
                orgId = itemData.org_id;
            } else if (["accept", "reject", "status_ready", "status_completed", "support_request"].includes(action)) {
                const { data: orderData } = await supabase.from("orders").select("org_id").eq("id", payload).single();
                if (!orderData) throw new Error("Order not found");
                orgId = orderData.org_id;
            } else if (action === "noop") {
                // Sold-out items — just acknowledge the click
                await answerCallbackQuery(id, "This item is currently sold out.");
                return;
            } else {
                return;
            }

            const session = getTelegramSession(chatId, orgId);
            const { data: org } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", orgId)
                .single();

            if (!org) {
                await answerCallbackQuery(id, "Error: Organization not found.");
                return;
            }
            switch (action) {
                case "menu":
                    await sendCategories(chatId, org);
                    break;
                case "cat":
                    await handleCategorySelect(chatId, org, payload, session);
                    break;
                case "item":
                    await handleItemSelect(chatId, org, payload, session);
                    break;
                case "cart":
                    await showCartSummary(chatId, org, session);
                    break;
                case "checkout":
                    await handleCheckoutStart(chatId, org, session);
                    break;
                case "checkout_type":
                    session.orderType = payload as "pickup" | "delivery";
                    await advanceCheckoutState(chatId, org, session);
                    break;
                case "checkout_payment":
                    session.paymentMethod = payload as "online" | "cash";
                    await finalizeOrder(chatId, org, session);
                    break;
                case "accept":
                    await handleOrderAction(chatId, org, payload, "accepted");
                    break;
                case "reject":
                    await handleOrderAction(chatId, org, payload, "rejected");
                    break;
                case "status_ready":
                    await handleOrderAction(chatId, org, payload, "ready");
                    break;
                case "status_completed":
                    await handleOrderAction(chatId, org, payload, "completed");
                    break;
                case "support_request":
                    session.state = "support_chat";
                    await sendMessage(chatId, "💬 *Live Support Activated*\n\nType your message and it will be sent directly to the kitchen staff. They can reply to you right here.\n\nTo exit support, type /done");
                    break;
                case "history":
                {
                    const { data: pastOrders } = await supabase
                        .from("orders")
                        .select("id, status, total_amount, created_at")
                        .eq("telegram_chat_id", chatId)
                        .order("created_at", { ascending: false })
                        .limit(5);

                    if (!pastOrders || pastOrders.length === 0) {
                        await sendMessage(chatId, "📭 You haven't placed any orders yet!");
                    } else {
                        const historyText = pastOrders.map(o => 
                            `• #${o.id.slice(0, 8)} (${new Date(o.created_at).toLocaleDateString()})\n  Status: ${o.status.toUpperCase()}\n  Total: ${formatCurrency(o.total_amount)}`
                        ).join("\n\n");
                        await sendMessage(chatId, `📜 *Your Recent Orders*\n\n${historyText}`);
                    }
                    break;
                }
            }
            await answerCallbackQuery(id);
        } catch (err: any) {
            console.error("Callback processing error:", err);
            await answerCallbackQuery(id, "Something went wrong.");
        }
    }
}

/** Start Page — Welcome and initial buttons */
async function handleStart(chatId: number, from: any, org: Organization) {
    const isOpen = org.is_open_manually !== false; // Default to open if column doesn't exist
    
    let welcomeMsg = `👋 Welcome to *${org.name}*!\n\n`;
    if (!isOpen) {
        welcomeMsg += `⚠️ _We are currently closed and not accepting new orders._\nFeel free to browse our menu in the meantime!`;
    } else {
        welcomeMsg += `You can browse our menu and place orders right here in Telegram.`;
    }
    
    // We'll use inline keyboards for the main flow
    const buttons = [
        [{ text: "📋 Browse Menu", callback_data: `menu:${org.id}` }],
        [{ text: "📦 My Orders", callback_data: `history:${org.id}` }],
    ];

    await sendMessage(chatId, welcomeMsg, {
        reply_markup: { inline_keyboard: buttons }
    });
}

/** Removed V1 handleContactShared as it is handled by processCheckoutInput */

/** Send categories as inline buttons */
async function sendCategories(chatId: number, org: Organization) {
    const supabase = createServiceClient();
    const { data: categories } = await supabase
        .from("categories")
        .select("*")
        .eq("org_id", org.id)
        .eq("is_active", true)
        .order("sort_order");

    if (!categories || categories.length === 0) {
        await sendMessage(chatId, "No categories found.");
        return;
    }

    const buttons = categories.map(cat => ([{
        text: cat.name,
        callback_data: `cat:${cat.id}`
    }]));

    await sendMessage(chatId, "🍽️ Select a category:", {
        reply_markup: { inline_keyboard: buttons }
    });
}

/** Handle Category Selection — Shows items with photos and descriptions */
async function handleCategorySelect(chatId: number, org: Organization, catId: string, session: TelegramSession) {
    const supabase = createServiceClient();
    // Fetch ALL items (including unavailable) to show sold-out badges
    const { data: items } = await supabase
        .from("menu_items")
        .select("*")
        .eq("category_id", catId)
        .order("sort_order");

    if (!items || items.length === 0) {
        await sendMessage(chatId, "No items found in this category.");
        return;
    }

    await sendMessage(chatId, "👇 *Here are the options in this category:*");

    // Send individual messages/photos for each item
    for (const item of items) {
        const desc = item.description ? `\n_${item.description}_\n` : "";
        const caption = `*${item.name}*${desc}\n💰 ${formatCurrency(item.price)}`;
        
        let reply_markup: any = {
            inline_keyboard: [
                [
                    item.is_available 
                        ? { text: `🛒 Add to Cart`, callback_data: `item:${item.id}` }
                        : { text: `❌ SOLD OUT`, callback_data: `noop:${item.id}` }
                ]
            ]
        };

        if (item.image_url) {
            await sendPhoto(chatId, item.image_url, caption, { reply_markup });
        } else {
            await sendMessage(chatId, caption, { reply_markup });
        }
    }
}

/** Handle Item Selection — Add to Cart directly for MVP */
async function handleItemSelect(chatId: number, org: Organization, itemId: string, session: TelegramSession) {
    // Guard: Store Status
    if (!org.is_open_manually) {
        await sendMessage(chatId, `❌ *Kitchen Closed*\n\n${org.name} is not accepting new orders at this time. Please check back later!`);
        return;
    }

    const supabase = createServiceClient();
    const { data: item } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", itemId)
        .single();

    if (!item) return;

    // Guard: Sold-out items cannot be added
    if (!item.is_available) {
        await sendMessage(chatId, `❌ Sorry, *${item.name}* is currently sold out.`);
        return;
    }

    const cartItem: CartItem = {
        item_id: item.id,
        name: item.name,
        quantity: 1,
        unit_price: item.price,
        total_price: item.price,
    };

    session.cart.push(cartItem);
    
    const text = `✅ Added *${item.name}* to your cart.`;
    const buttons = [
        [{ text: "🛒 View Cart & Checkout", callback_data: `cart:${org.id}` }],
        [{ text: "➕ Add More Items", callback_data: `menu:${org.id}` }]
    ];

    await sendMessage(chatId, text, {
        reply_markup: { inline_keyboard: buttons }
    });
}

/** Cart Summary */
async function showCartSummary(chatId: number, org: Organization, session: TelegramSession) {
    if (session.cart.length === 0) {
        await sendMessage(chatId, "Your cart is empty.");
        return;
    }

    const total = session.cart.reduce((sum, item) => sum + item.total_price, 0);
    const summary = session.cart.map(i => `• ${i.quantity}x ${i.name} - ${formatCurrency(i.total_price)}`).join("\n");

    const text = `🛒 *Your Cart*\n\n${summary}\n\n💰 *Total: ${formatCurrency(total)}*`;
    const buttons = [
        [{ text: "💳 Checkout", callback_data: `checkout:${org.id}` }],
        [{ text: "➕ Add More Items", callback_data: `menu:${org.id}` }]
    ];

    await sendMessage(chatId, text, {
        reply_markup: { inline_keyboard: buttons }
    });
}

/** MULTI-STEP CHECKOUT FLOW */

async function handleCheckoutStart(chatId: number, org: Organization, session: TelegramSession) {
    // Guard: Store Status
    if (!org.is_open_manually) {
        await sendMessage(chatId, `❌ *Checkout Disabled*\n\n${org.name} is currently closed. We cannot process your order right now.`);
        return;
    }

    if (session.cart.length === 0) {
        await sendMessage(chatId, "Your cart is empty.");
        return;
    }

    session.state = "checkout_name";
    await sendMessage(chatId, "📝 Let's get your order ready!\n\nPlease reply with your *Full Name*.");
}

async function processCheckoutInput(chatId: number, input: string, session: TelegramSession) {
    const supabase = createServiceClient();
    const { data: org } = await supabase.from("organizations").select("*").eq("id", session.orgId).single();
    if (!org) return;

    if (session.state === "checkout_name") {
        session.customerName = input;
        session.state = "checkout_phone";
        await requestContact(chatId, "📱 Great! Now please share your *Phone Number* (tap the button below or type it).");
        return;
    }
    
    if (session.state === "checkout_phone") {
        session.customerPhone = input;
        // Upsert customer
        await supabase.from("customers").upsert({
            org_id: session.orgId,
            phone: input,
            name: session.customerName,
            telegram_chat_id: chatId,
            is_active: true
        });

        session.state = "checkout_type";
        const buttons = [
            [{ text: "🚶 Pick Up", callback_data: `checkout_type:pickup` }],
            [{ text: "🚚 Delivery", callback_data: `checkout_type:delivery` }]
        ];
        await sendMessage(chatId, "How would you like to receive your order?", {
            reply_markup: { inline_keyboard: buttons, remove_keyboard: true }
        });
        return;
    }

    if (session.state === "checkout_address") {
        session.deliveryAddress = input;
        // For delivery, payment is strictly online
        session.paymentMethod = "online";
        await finalizeOrder(chatId, org, session);
        return;
    }
}

async function advanceCheckoutState(chatId: number, org: Organization, session: TelegramSession) {
    if (session.state === "checkout_type") {
        if (session.orderType === "delivery") {
            session.state = "checkout_address";
            await sendMessage(chatId, "📍 Please enter your *Delivery Address* (Building, Street, Room).");
        } else {
            session.state = "checkout_payment";
            const buttons = [
                [{ text: "💳 Pay Online (Card)", callback_data: `checkout_payment:online` }],
                [{ text: "💵 Pay on Pick Up", callback_data: `checkout_payment:cash` }]
            ];
            await sendMessage(chatId, "How would you like to pay?", {
                reply_markup: { inline_keyboard: buttons }
            });
        }
    }
}

async function finalizeOrder(chatId: number, org: Organization, session: TelegramSession) {
    const supabase = createServiceClient();
    
    const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("org_id", org.id)
        .eq("telegram_chat_id", chatId)
        .single();

    const subtotal = session.cart.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
    const deliveryFee = session.orderType === "delivery" ? 5.00 : 0.00;
    
    // Monetization: Calculate Platform Fee (Revenue Share)
    // The vendor pays this percentage. If they belong to an agency, the agency sets the rate.
    // Only vendors NOT under an agency pay the default 5% commission to the platform.
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
    
    // Customer pays Subtotal + Tax + Delivery. Platform Fee is deducted from vendor gross later.
    const totalAmount = Math.round((subtotal + taxAmount + deliveryFee) * 100) / 100;

    const { data: order, error } = await supabase
        .from("orders")
        .insert({
            org_id: org.id,
            customer_id: customer?.id || null,
            customer_name: session.customerName,
            customer_phone: session.customerPhone,
            items_json: session.cart,
            subtotal,
            tax_amount: taxAmount,
            delivery_fee: deliveryFee,
            platform_fee: platformFee, // Assuming we added this column in migration
            total_amount: totalAmount,
            status: "pending",
            payment_status: session.paymentMethod === "cash" ? "cash_on_pickup" : "pending",
            order_type: session.orderType,
            delivery_address: session.deliveryAddress || null,
            payment_method: session.paymentMethod,
            telegram_chat_id: chatId
        })
        .select()
        .single();

    if (error || !order) {
        console.error("Order creation error:", error);
        await sendMessage(chatId, "❌ Error creating your order. Please try again.");
        return;
    }

    const summaryText = session.cart.map(i => `• ${i.quantity}x ${i.name}`).join("\n");

    if (session.paymentMethod === "online") {
        try {
            const paymentUrl = await createPaymentLink({
                orderId: order.id,
                orgName: org.name,
                items: session.cart.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.total_price,
                })).concat(session.orderType === "delivery" ? [{ name: "Delivery Fee", quantity: 1, price: deliveryFee }] : []),
                totalAmount,
                customerPhone: session.customerPhone || "",
                agencyId: org.agency_id,
            });

            const checkoutMsg = `📋 *Order Draft Created!*\n\n${summaryText}\n\n🚚 Delivery Fee: ${formatCurrency(deliveryFee)}\n💰 *Total: ${formatCurrency(totalAmount)}*\n\n💳 *Pay here:* ${paymentUrl}`;
            const supportButton = [[{ text: "💬 Request Help", callback_data: `support_request:${order.id}` }]];
            await sendMessage(chatId, checkoutMsg, { reply_markup: { inline_keyboard: supportButton } });
            session.state = "awaiting_payment";
        } catch (e: any) {
            console.error("Payment generation error:", e);
            await sendMessage(chatId, "❌ Error generating payment link.");
        }
    } else {
        const checkoutMsg = `📋 *Order Confirmed!*\n\n${summaryText}\n\n💰 *Total: ${formatCurrency(totalAmount)}*\n💵 You chose to pay *in cash on pick up*.`;
        const supportButton = [[{ text: "💬 Request Help", callback_data: `support_request:${order.id}` }]];
        await sendMessage(chatId, checkoutMsg, { reply_markup: { inline_keyboard: supportButton } });
        session.state = "idle";
        session.cart = []; // clear cart
    }

    // 4. Notify Vendor
    if (org.notification_telegram_id) {
        const vendorMsg = `🔔 *New Order!* (#${order.id.slice(0, 8)})\n\n👤 Customer: ${session.customerName} (${session.customerPhone})\n📦 Type: ${session.orderType === 'delivery' ? '🚚 Delivery' : '🚶 Pick Up'}\n${session.deliveryAddress ? `📍 Address: ${session.deliveryAddress}\n` : ''}💵 Payment: ${session.paymentMethod === 'cash' ? 'Pay on Pick Up' : 'Online'}\n\nItems:\n${summaryText}\n\n💰 Total: ${formatCurrency(totalAmount)}`;
        const vendorButtons = [
            [{ text: "✅ Accept", callback_data: `accept:${order.id}` }],
            [{ text: "❌ Reject", callback_data: `reject:${order.id}` }]
        ];
        await sendMessage(org.notification_telegram_id as unknown as string, vendorMsg, {
            reply_markup: { inline_keyboard: vendorButtons }
        });
    }
}

/** Handle Vendor Actions (Accept/Reject and new Status Updates) */
async function handleOrderAction(chatId: number | string, org: Organization, orderId: string, action: "accepted" | "rejected" | "ready" | "completed") {
    const supabase = createServiceClient();
    
    // Map action to DB status
    const statusMap: Record<string, string> = {
        "accepted": "preparing",
        "rejected": "cancelled",
        "ready": "ready",
        "completed": "completed"
    };

    const newStatus = statusMap[action] || "pending";
    
    const { data: order, error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId)
        .select()
        .single();

    if (error || !order) {
        console.error("Order update error:", error);
        await sendMessage(chatId, "❌ Failed to update order status.");
        return;
    }

    if (action === "accepted") {
        const msg = `✅ Order *Accepted* and is now Preparing.\nWhat is the current status?`;
        const actionButtons = [
            [{ text: "📦 Mark Ready for Pickup/Delivery", callback_data: `status_ready:${order.id}` }],
            [{ text: "✅ Mark Completed", callback_data: `status_completed:${order.id}` }]
        ];
        await sendMessage(chatId, msg, { reply_markup: { inline_keyboard: actionButtons } });

        if (order.telegram_chat_id) {
            await sendMessage(order.telegram_chat_id as unknown as string, `✅ *Your order from ${org.name} has been accepted!*\n\nOur kitchen is starting to prepare it now.`);
        }
    } else if (action === "rejected") {
        await sendMessage(chatId, `❌ Order Rejected and Cancelled.`);
        if (order.telegram_chat_id) {
            await sendMessage(order.telegram_chat_id as unknown as string, `❌ *Sorry, your order from ${org.name} could not be accepted at this time.*\n\nIf you have already paid, a refund will be processed automatically.`);
        }
    } else if (action === "ready") {
        await sendMessage(chatId, `📦 Order marked as *Ready*.`);
        if (order.telegram_chat_id) {
            await sendMessage(order.telegram_chat_id as unknown as string, `📦 *Your order from ${org.name} is ready!*`);
        }
    } else if (action === "completed") {
        await sendMessage(chatId, `✅ Order marked as *Completed*.`);
        if (order.telegram_chat_id) {
            await sendMessage(order.telegram_chat_id as unknown as string, `✅ *Your order from ${org.name} has been completed/delivered!* Enjoy your meal!`);
        }
    }
}
