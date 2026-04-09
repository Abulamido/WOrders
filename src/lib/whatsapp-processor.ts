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

const MARKETPLACE_ORG_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// Database-backed session persistence via 'user_carts' table
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
    phone: string;
    orgId: string;
    state: string;
    cart: CartItem[];
    customerName?: string;
    orderType?: string;
    deliveryAddress?: string;
    paymentMethod?: string;
    selectedCategory?: string;
    selectedItemId?: string;
    selectedVariantName?: string;
    selectedModifiers?: string[];
    lastMenuOptions?: { id: string; title: string }[];
}

/**
 * Fetch or create a session in Supabase.
 */
async function getSession(phone: string, orgId: string): Promise<Session> {
    const supabase = createServiceClient();
    const { data: cart } = await supabase
        .from("user_carts")
        .select("*")
        .eq("phone", phone)
        .eq("org_id", orgId)
        .single();

    if (cart) {
        return {
            phone,
            orgId,
            state: cart.state || "idle",
            cart: (cart.cart as CartItem[]) || [],
            customerName: cart.customer_name,
            orderType: cart.order_type,
            deliveryAddress: cart.delivery_address,
            paymentMethod: cart.payment_method,
            selectedCategory: cart.selected_category,
            selectedItemId: cart.selected_item_id,
            selectedVariantName: cart.selected_variant_name,
            selectedModifiers: cart.selected_modifiers,
            lastMenuOptions: (cart.last_menu_options as any[]) || [],
        };
    }

    // Default session if not found
    return { phone, orgId, state: "idle", cart: [] };
}

/**
 * Persist session to Supabase.
 */
async function saveSession(session: Session) {
    const supabase = createServiceClient();
    await supabase.from("user_carts").upsert({
        phone: session.phone,
        org_id: session.orgId,
        state: session.state,
        cart: session.cart as any,
        customer_name: session.customerName,
        order_type: session.orderType,
        delivery_address: session.deliveryAddress,
        payment_method: session.paymentMethod,
        selected_category: session.selectedCategory,
        selected_item_id: session.selectedItemId,
        selected_variant_name: session.selectedVariantName,
        selected_modifiers: session.selectedModifiers,
        last_menu_options: session.lastMenuOptions as any,
        last_interaction: new Date().toISOString()
    });
}

function clearSession(phone: string, orgId: string) {
    const supabase = createServiceClient();
    // We don't delete to keep history/lastInteraction, just reset state
    supabase.from("user_carts").update({
        state: "idle",
        cart: [],
        customer_name: null,
        order_type: null,
        delivery_address: null,
        payment_method: null,
        selected_category: null,
        selected_item_id: null,
        selected_variant_name: null,
        selected_modifiers: null,
        last_menu_options: []
    }).eq("phone", phone).eq("org_id", orgId);
}

/**
 * Log an outgoing message sent to a user/vendor.
 */
async function logOutgoingMessage(orgId: string, phone: string, text: string, type: string = "text") {
    const supabase = createServiceClient();
    await supabase.from("whatsapp_logs").insert({
        org_id: orgId,
        phone,
        direction: "outgoing",
        payload: { text, type } as any,
        status: "sent"
    });
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
    const from = message.from.replace(/\D/g, ""); // Clean ID (strip @c.us or other suffixes)
    const businessNumber = metadata.display_phone_number;

    // Mark message as read (non-blocking for MVP/testing)
    try {
        await markAsRead(message.id);
    } catch (e) {
        console.warn("Could not mark message as read:", e);
    }

    // 1. Extract user input FIRST to support slug-based routing
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

    // 2. IDENTIFY ORGANIZATION (Marketplace vs White-Label)
    let org: Organization | null = null;
    let switchOrg = false;

    // A. Slug Check (Priority 1): Did they type a store slug? (e.g. "pizzahut" or "menu pizzahut")
    const slugMatch = userInput.match(/^(?:menu\s+)?([a-z0-9-]+)$/i);
    if (slugMatch) {
        const potentialSlug = slugMatch[1];
        const { data: slugOrg } = await supabase
            .from("organizations")
            .select("*")
            .eq("slug", potentialSlug)
            .eq("is_active", true)
            .single();
        if (slugOrg) {
            org = slugOrg;
            switchOrg = true;
        }
    }

    // B. White-Label Number Match (Priority 2): If this number belongs to EXACTLY one active org, use it.
    if (!org) {
        const { data: numOrgs } = await supabase
            .from("organizations")
            .select("*")
            .eq("whatsapp_number", businessNumber)
            .eq("is_active", true);
        
        if (numOrgs && numOrgs.length === 1) {
            org = numOrgs[0];
        }
    }

    // C. Sticky Session (Priority 3): If on a shared/unknown number, use the user's most recent session.
    if (!org) {
        const { data: existingSess } = await supabase
            .from("user_carts")
            .select("org_id")
            .eq("phone", from)
            .order("last_interaction", { ascending: false })
            .limit(1)
            .single();
        
        if (existingSess) {
            const { data: sessOrg } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", existingSess.org_id)
                .eq("is_active", true)
                .single();
            if (sessOrg) org = sessOrg;
        }
    }

    // D. Marketplace Discovery (Priority 4): Fallback to Store Selection
    if (!org) {
        await handleStoreSelection(from);
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

    const session = await getSession(from, org.id);
    if (switchOrg) {
        // If they explicitly typed a new slug, clear their old state for this org
        session.state = "idle";
        session.cart = [];
    }

    // Resolve numbered replies (e.g. "1" → "cat_abc123")
    const resolvedInput = resolveNumberedInput(userInput, session);

    // Route based on state + input
    try {
        // RESET command for testing/debugging
        if (userInput === "reset") {
            await clearSession(from, org.id);
            await sendTextMessage(from, "Session cleared. Type 'Hi' to start over.");
            await logOutgoingMessage(org.id, from, "Session cleared.");
            return;
        }

        // EXIT command to go back to Marketplace
        if (userInput === "exit" || userInput === "back") {
            // We clear the cart but also the "sticky" preference by simply not loading the org in the next message
            // and instead manually triggering discovery now.
            await clearSession(from, org.id);
            await handleStoreSelection(from);
            return;
        }

        // --- Cross-Tenant Switching (Marketplace Selection) ---
        if (resolvedInput.startsWith("switch_")) {
            const targetSlug = resolvedInput.replace("switch_", "");
            const { data: targetOrg } = await supabase
                .from("organizations")
                .select("*")
                .eq("slug", targetSlug)
                .eq("is_active", true)
                .single();
            
            if (targetOrg) {
                // Transfer user to the new org and start welcome flow
                const targetSession = await getSession(from, targetOrg.id);
                targetSession.state = "idle";
                targetSession.cart = [];
                await saveSession(targetSession);
                await handleWelcome(from, targetOrg, targetSession);
                return;
            }
        }

        // --- Vendor text commands: ACCEPT / REJECT / READY / DONE / OPEN / CLOSE <orderId?> ---
        // Loosened regex to allow 'CLOSE Raven's Cafe' etc.
        const vendorCmd = userInput.match(/^(?:\*?\s*)(accept|reject|ready|done|open|close)(?:\s+(.*))?$/i);
        if (vendorCmd) {
            const action = vendorCmd[1].toLowerCase();
            const orderId = vendorCmd[2];

            if (action === "open" || action === "close") {
                await handleVendorStatusAction(from, org, action as "open" | "close");
                return;
            }

            if (orderId) {
                await handleVendorOrderAction(from, action as "accept" | "reject" | "ready" | "done", orderId);
                return;
            }
        }

        if (resolvedInput.startsWith("order_accept_") || resolvedInput.startsWith("order_reject_")) {
            const isAccept = resolvedInput.startsWith("order_accept_");
            const oid = resolvedInput.replace(isAccept ? "order_accept_" : "order_reject_", "");
            await handleVendorOrderAction(from, isAccept ? "accept" : "reject", oid);
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
            if (resolvedInput.startsWith("item_")) {
                session.selectedItemId = resolvedInput.replace("item_", "");
            } else if (resolvedInput.startsWith("soldout_")) {
                session.selectedItemId = resolvedInput.replace("soldout_", "");
            }
            await handleItemSelect(from, org, resolvedInput, session);
        } else if (resolvedInput.startsWith("var_") || session.state === "variant") {
            await handleVariantSelect(from, org, resolvedInput, session);
        } else if (resolvedInput.startsWith("mod_") || session.state === "modifier") {
            await handleModifierSelect(from, org, resolvedInput, session);
        } else if (resolvedInput === "add_to_cart" || resolvedInput === "checkout") {
            await handleCartAction(from, org, resolvedInput, session);
        } else if (resolvedInput === "add_more") {
            session.state = "browsing";
            await sendCategories(from, org, session);
        } else if (resolvedInput === "view_cart" || resolvedInput === "cart") {
            await showCartSummary(from, session);
        } else if (resolvedInput === "remove_item") {
            await handleShowRemoveMenu(from, session);
        } else if (resolvedInput === "clear_cart") {
            await clearSession(from, org.id);
            await sendTextMessage(from, "🛒 Your cart has been cleared. Type 'Menu' to start a search fresh!");
            session.cart = [];
            session.state = "idle";
        } else if (session.state === "cart_remove") {
            await handleRemoveItem(from, org, resolvedInput, session);
        } else if (session.state.startsWith("checkout_")) {
            await processCheckoutInput(from, org, userInput, session); 
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
            const msg = `I didn't understand that. What would you like to do?`;
            await sendButtonMessage(from, msg, options);
            await logOutgoingMessage(org.id, from, msg);
        }

        // AUTO-SAVE SESSION AFTER EVERY TURN
        await saveSession(session);

    } catch (error) {
        console.error("Message processing error:", error);
        const errorMsg = "Sorry, something went wrong. Please try again or type 'Hi' to start over.";
        await sendTextMessage(from, errorMsg);
        await logOutgoingMessage(org.id, from, errorMsg);
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
    // Try to get itemId from the input if it's already a prefixed ID
    if (input.startsWith("item_")) {
        session.selectedItemId = input.replace("item_", "");
    }

    const itemId = session.selectedItemId;

    if (!itemId) {
        await sendTextMessage(phone, "❌ Selection lost. Please pick your item again from the menu.");
        await sendCategories(phone, org, session);
        return;
    }

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

    session.selectedItemId = itemId;

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
        // No variants — check for modifiers
        if (item.modifiers && item.modifiers.length > 0) {
            await showModifierPicker(phone, item, undefined, session);
        } else {
            // No modifiers — add directly to cart
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
}

/** Handle variant selection */
async function handleVariantSelect(
    phone: string,
    _org: Organization,
    input: string,
    session: Session
) {
    const variantName = input.replace("var_", "");
    const item = session.selectedItemId;
    if (!item) {
        await sendTextMessage(phone, "No item selected. Please try again.");
        return;
    }

    const supabase = createServiceClient();
    const { data: menuItem } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", item)
        .single();

    if (!menuItem) {
        await sendTextMessage(phone, "Item not found. Please try again.");
        return;
    }

    const variant = (menuItem.variants as { name: string; price: number }[])?.find(
        (v) => v.name === variantName
    );

    const price = variant?.price || menuItem.price;
    session.selectedVariantName = variantName;

    // Check for modifiers after variant selection
    if (menuItem.modifiers && menuItem.modifiers.length > 0) {
        await showModifierPicker(phone, menuItem, variantName, session);
    } else {
        const cartItem: CartItem = {
            item_id: menuItem.id,
            name: menuItem.name,
            variant: variantName,
            quantity: 1,
            unit_price: price,
            total_price: price,
        };
        session.cart.push(cartItem);
        session.state = "cart";
        await showCartSummary(phone, session);
    }
}

/** Show modifier selection menu */
async function showModifierPicker(phone: string, item: MenuItem, variantName: string | undefined, session: Session) {
    session.state = "modifier";
    session.selectedVariantName = variantName || "";
    session.selectedModifiers = []; // Reset selected modifiers for this turn

    const modOptions = (item.modifiers as { name: string; price: number }[]).map((m) => ({
        id: `mod_${m.name}`,
        title: `${m.name} (+${formatCurrency(m.price)})`,
    }));

    // Add a "Finish" option
    const options = [
        ...modOptions,
        { id: "mod_done", title: "✅ Finish & Add to Cart" }
    ];

    setMenuOptions(session, options);
    await sendListMessage(
        phone,
        `Any extras for your ${variantName ? `${variantName} ` : ""}${item.name}?`,
        "Select Extras",
        [{ title: "Modifiers", rows: options }]
    );
}

/** Handle modifier selection */
async function handleModifierSelect(
    phone: string,
    _org: Organization,
    input: string,
    session: Session
) {
    const itemId = session.selectedItemId;
    if (!itemId) {
        await sendTextMessage(phone, "Selection lost. Please try again.");
        return;
    }

    const supabase = createServiceClient();
    const { data: menuItem } = await supabase.from("menu_items").select("*").eq("id", itemId).single();
    if (!menuItem) return;

    if (input === "mod_done") {
        // Finalize selection
        const variant = (menuItem.variants as any[])?.find(v => v.name === session.selectedVariantName);
        const basePrice = variant?.price || menuItem.price;
        
        let modTotal = 0;
        const modNames: string[] = session.selectedModifiers || [];
        
        if (modNames.length > 0) {
            const mods = menuItem.modifiers as any[];
            modNames.forEach(name => {
                const m = mods.find(mod => mod.name === name);
                if (m) modTotal += m.price;
            });
        }

        const cartItem: CartItem = {
            item_id: menuItem.id,
            name: menuItem.name,
            variant: session.selectedVariantName || undefined,
            modifiers: modNames.length > 0 ? modNames : undefined,
            quantity: 1,
            unit_price: basePrice + modTotal,
            total_price: basePrice + modTotal,
        };

        session.cart.push(cartItem);
        session.state = "cart";
        await showCartSummary(phone, session);
        return;
    }

    // Toggle modifier selection
    const modName = input.replace("mod_", "");
    if (!session.selectedModifiers) session.selectedModifiers = [];
    
    if (session.selectedModifiers.includes(modName)) {
        session.selectedModifiers = session.selectedModifiers.filter(m => m !== modName);
        await sendTextMessage(phone, `Removed: ${modName}`);
    } else {
        session.selectedModifiers.push(modName);
        await sendTextMessage(phone, `Added: ${modName}. Select more or click 'Finish'.`);
    }
    
    // Show current selection
    const current = session.selectedModifiers.length > 0 
        ? `\nCurrent selection: ${session.selectedModifiers.join(", ")}` 
        : "";
    
    const options = (session.lastMenuOptions as any[]);
    await sendListMessage(
        phone,
        `Extras for ${menuItem.name}:${current}`,
        "Select Extras",
        [{ title: "Modifiers", rows: options }]
    );
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
        { id: "remove_item", title: "🗑️ Remove Item" },
        { id: "clear_cart", title: "💥 Clear Cart" },
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

/** Show a list of items to remove */
async function handleShowRemoveMenu(phone: string, session: Session) {
    if (session.cart.length === 0) {
        await sendTextMessage(phone, "Your cart is empty.");
        return;
    }

    const options = session.cart.map((item, index) => ({
        id: `rem_${index}`,
        title: `Remove ${item.name}`,
        description: `${item.quantity}x ${item.variant || ""} — ${formatCurrency(item.total_price)}`,
    }));

    session.state = "cart_remove";
    setMenuOptions(session, options);
    await sendListMessage(
        phone,
        "Select an item to remove from your cart:",
        "Remove Items",
        [{ title: "Cart Items", rows: options }]
    );
}

/** Process removal and show cart again */
async function handleRemoveItem(phone: string, org: Organization, input: string, session: Session) {
    if (input.startsWith("rem_")) {
        const index = parseInt(input.replace("rem_", ""), 10);
        if (!isNaN(index) && index >= 0 && index < session.cart.length) {
            const removed = session.cart.splice(index, 1)[0];
            await sendTextMessage(phone, `🗑️ Removed *${removed.name}* from your cart.`);
        }
    }

    if (session.cart.length === 0) {
        session.state = "browsing";
        await sendCategories(phone, org, session);
    } else {
        await showCartSummary(phone, session);
    }
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://w-orders.vercel.app";
    const dashboardUrl = `${appUrl}/dashboard/orders/${order.id}`;

    if (org.notification_phone) {
        const shortId = order.id.slice(0, 8);
        const vendorMsg = `🔔 *New Order!* (#${shortId})\n\n👤 ${session.customerName || phone} (${phone})\nType: ${session.orderType === 'delivery' ? 'Delivery' : 'Pick Up'}\n${session.deliveryAddress ? `📍 ${session.deliveryAddress}\n` : ""}\nItems:\n${session.cart.map((i) => `• ${i.quantity}x ${i.name}`).join("\n")}\n\n💰 Total: ${formatCurrency(totalAmount)} (${session.paymentMethod})\n\n--- Manage Order ---\n1️⃣ ✅ Accept Order\n2️⃣ ❌ Reject Order\n\n🔗 Dashboard: ${dashboardUrl}\n\n(Reply with *1* or *2*)`;
        await sendTextMessage(org.notification_phone, vendorMsg);

        // --- Store Vendor Context ---
        // This allows the vendor to reply "1" or "2" to manage THIS specific order.
        const vendorSession = await getSession(org.notification_phone, org.id);
        vendorSession.lastMenuOptions = [
            { id: `order_accept_${order.id}`, title: "Accept" },
            { id: `order_reject_${order.id}`, title: "Reject" }
        ];
        vendorSession.state = "vendor_waiting";
        await saveSession(vendorSession);
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
    }

    // ALWAYS Clear cart after order creation to prevent carry-over
    await clearSession(phone, org.id);
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
    const session = await getSession(phone, org.id);
    session.cart = (lastOrder.items_json as OrderItem[]).map((item) => ({
        item_id: item.item_id,
        name: item.name,
        variant: item.variant,
        modifiers: item.modifiers,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
    }));
    
    await saveSession(session);
    await showCartSummary(phone, session);
}

/** Handle Vendor order management commands (ACCEPT / REJECT / READY / DONE) */
async function handleVendorOrderAction(vendorPhone: string, action: "accept" | "reject" | "ready" | "done", orderId: string) {
    const supabase = createServiceClient();

    // Try matching either the full UUID or the short 8-char prefix
    let orderQuery = supabase.from("orders").select("*");
    if (orderId.length >= 36) {
        orderQuery = orderQuery.eq("id", orderId);
    } else {
        orderQuery = orderQuery.ilike("id", `${orderId}%`);
    }

    const { data: order } = await orderQuery.limit(1).single();

    if (!order) {
        await sendTextMessage(vendorPhone, `❌ Order not found for ID: ${orderId}`);
        return;
    }

    const { data: orgData } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", order.org_id)
        .single();

    const orgName = orgData?.name || "the restaurant";
    const shortId = order.id.slice(0, 8);

    const statusMap: Record<string, string> = {
        accept: "preparing",
        reject: "cancelled",
        ready: "ready",
        done: "completed",
    };
    const newStatus = statusMap[action];

    const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

    if (error) {
        await sendTextMessage(vendorPhone, `❌ Error updating order #${shortId}.`);
        return;
    }

    // --- Vendor Confirmation ---
    const vendorMessages: Record<string, string> = {
        accept: `✅ Order #${shortId} *ACCEPTED* — now preparing.\n\nWhen ready, type: READY ${order.id}`,
        reject: `❌ Order #${shortId} *REJECTED* and cancelled.`,
        ready: `📦 Order #${shortId} marked as *READY*.\n\nWhen picked up/delivered, type: DONE ${order.id}`,
        done: `🎉 Order #${shortId} marked as *COMPLETED*. Great job!`,
    };
    await sendTextMessage(vendorPhone, vendorMessages[action]);

    // --- Customer Notification (WhatsApp only — no Telegram mixing) ---
    // Only notify if this is a WhatsApp order (no telegram_chat_id)
    if (!order.telegram_chat_id && order.customer_phone) {
        const customerMessages: Record<string, string> = {
            accept: `👨‍🍳 *Good news!* ${orgName} has accepted your order (#${shortId}) and is now preparing it. We'll let you know when it's ready!`,
            reject: `⚠️ *Update:* Your order (#${shortId}) at ${orgName} could not be accepted and has been cancelled. If you already paid, a refund will be processed.`,
            ready: `📦 *Your order (#${shortId}) from ${orgName} is ready!* ${order.order_type === 'delivery' ? 'It\'s on its way!' : 'Come pick it up!'}`,
            done: `✅ *Your order (#${shortId}) from ${orgName} is complete!* Enjoy your meal! 🍽️`,
        };
        await sendTextMessage(order.customer_phone, customerMessages[action]);
    }

    // Clear vendor menu options to prevent accidental double-action
    const vendorSess = await getSession(vendorPhone, order.org_id);
    vendorSess.lastMenuOptions = [];
    vendorSess.state = "idle";
    await saveSession(vendorSess);
}

/**
 * Handle store discovery on shared/marketplace numbers.
 * Fetches active organizations and presents them to the user.
 */
async function handleStoreSelection(phone: string) {
    const supabase = createServiceClient();
    const { data: orgs } = await supabase
        .from("organizations")
        .select("name, slug")
        .eq("is_active", true)
        .neq("id", MARKETPLACE_ORG_ID) // Don't list the marketplace itself
        .limit(10);

    if (!orgs || orgs.length === 0) {
        await sendTextMessage(phone, "Sorry, there are no active stores at the moment. Please check back later!");
        return;
    }

    const session = await getSession(phone, MARKETPLACE_ORG_ID);
    const options = orgs.map(o => ({
        id: `switch_${o.slug}`,
        title: o.name
    }));
    setMenuOptions(session, options);
    await saveSession(session);

    const storeList = orgs.map((o, idx) => `*${idx + 1}*. ${o.name}`).join("\n");
    const welcomeMsg = `👋 *Welcome to MenuFlow Marketplace!*\n\nPlease select a store to start ordering:\n\n${storeList}\n\n_Reply with the number or name of the store!_`;

    await sendTextMessage(phone, welcomeMsg);
}

/** 
 * Handle Vendor store status toggle (OPEN / CLOSE) 
 */
async function handleVendorStatusAction(phone: string, currentOrg: Organization, action: "open" | "close") {
    const supabase = createServiceClient();
    const isOpen = action === "open";

    // FIND ORGANIZATIONS MANAGED BY THIS PHONE
    // This allows OPEN/CLOSE to work even on shared numbers
    const { data: managedOrgs } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("notification_phone", phone)
        .eq("is_active", true);

    const targetOrgs = managedOrgs && managedOrgs.length > 0 
        ? managedOrgs 
        : (currentOrg.id !== MARKETPLACE_ORG_ID ? [currentOrg] : []);

    if (targetOrgs.length === 0) {
        await sendTextMessage(phone, "❌ You don't seem to be registered as a staff member for any active store. Please check your notification phone set up.");
        return;
    }

    const targetIds = targetOrgs.map(o => o.id);
    const { error } = await supabase
        .from("organizations")
        .update({ is_open_manually: isOpen })
        .in("id", targetIds);

    if (error) {
        await sendTextMessage(phone, `❌ Error updating status: ${error.message}`);
        return;
    }

    const orgNames = targetOrgs.map(o => o.name).join(" & ");
    const msg = isOpen 
        ? `🟢 *${orgNames}* is now OPEN. You will receive notifications for new orders!`
        : `🔴 *${orgNames}* is now CLOSED. Customers can browse but cannot place new orders.`;
    
    await sendTextMessage(phone, msg);
    for (const org of targetOrgs) {
        await logOutgoingMessage(org.id, phone, msg);
    }
}
