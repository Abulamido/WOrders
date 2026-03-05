import { config } from "dotenv";
config({ path: ".env.local" });

import { processTelegramCommand, processTelegramCallback } from "./src/lib/telegram/processor";
import { createServiceClient } from "./src/lib/supabase";

// Mock global fetch to capture Telegram API calls instead of actually sending them
const originalFetch = global.fetch;
global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    if (typeof url === "string" && url.includes("api.telegram.org")) {
        console.log(`\n[TELEGRAM API CALL]: ${url}`);
        if (init?.body) {
            const body = JSON.parse(init.body as string);
            console.log("PAYLOAD:", JSON.stringify(body, null, 2));
        }
        return new Response(JSON.stringify({ ok: true, result: { message_id: Math.floor(Math.random() * 1000) } }));
    }
    return originalFetch(url, init);
};

const TEST_CHAT_ID = 999111222;
const TEST_MSG_ID = 888;
const TEST_NAME = "AutomatedTester";

async function runTest() {
    console.log("==== STARTING TELEGRAM FLOW TEST ====");
    const supabase = createServiceClient();

    // 1. Get an active org
    const { data: org } = await supabase.from("organizations").select("*").eq("is_active", true).limit(1).single();
    if (!org) {
        console.error("❌ No active organization found. Cannot run test.");
        return;
    }
    console.log(`✅ Using Organization: ${org.name} (${org.id})`);

    // 2. Ensure menu items exist
    let { data: categories } = await supabase.from("categories").select("*").eq("org_id", org.id);
    if (!categories || categories.length === 0) {
        console.log("⚠️ No categories found. Creating dummy menu...");
        const { data: cat } = await supabase.from("categories").insert({ org_id: org.id, name: "Test Drinks", description: "Hot and cold drinks", sort_order: 1 }).select().single();
        await supabase.from("menu_items").insert({ org_id: org.id, category_id: cat!.id, name: "Test Coffee", price: 2.50, description: "Hot black coffee", is_available: true });
        categories = [cat];
    }
    console.log(`✅ Organization has ${categories!.length} categories.`);

    const catId = categories![0].id;
    const { data: items } = await supabase.from("menu_items").select("*").eq("category_id", catId);
    const itemId = items![0].id;
    console.log(`✅ Testing with item: ${items![0].name} ($${items![0].price})`);

    // --- STEP 1: /start ---
    console.log("\n--- STEP 1: SENDING /start ---");
    await processTelegramCommand(TEST_CHAT_ID, "/start", TEST_NAME);

    // --- STEP 2: click "browse_menu" ---
    console.log('\n--- STEP 2: CLICK "browse_menu" ---');
    await processTelegramCallback(TEST_CHAT_ID, TEST_MSG_ID, "cb_1", "browse_menu", TEST_NAME);

    // --- STEP 3: select category ---
    console.log(`\n--- STEP 3: SELECT CATEGORY (${catId}) ---`);
    await processTelegramCallback(TEST_CHAT_ID, TEST_MSG_ID, "cb_2", `cat_${catId}`, TEST_NAME);

    // --- STEP 4: select item ---
    console.log(`\n--- STEP 4: SELECT ITEM (${itemId}) ---`);
    await processTelegramCallback(TEST_CHAT_ID, TEST_MSG_ID, "cb_3", `item_${itemId}`, TEST_NAME);

    // --- STEP 5: checkout ---
    console.log('\n--- STEP 5: CLICK "checkout" ---');
    await processTelegramCallback(TEST_CHAT_ID, TEST_MSG_ID, "cb_4", "checkout", TEST_NAME);

    // --- STEP 6: select pickup time ---
    console.log('\n--- STEP 6: SELECT PICKUP (15 min) ---');
    await processTelegramCallback(TEST_CHAT_ID, TEST_MSG_ID, "cb_5", "pickup_15", TEST_NAME);

    // Verify order in database
    const { data: order } = await supabase.from("orders").select("*").eq("customer_phone", `tg:${TEST_CHAT_ID}`).order("created_at", { ascending: false }).limit(1).single();
    if (order) {
        console.log("\n✅ ORDER SUCCESSFULLY CREATED IN DATABASE:");
        console.log(`   ID: ${order.id}`);
        console.log(`   Total Amount: $${order.total_amount}`);
        console.log(`   Status: ${order.status}`);
    } else {
        console.error("\n❌ FAILED TO CREATE ORDER IN DATABASE");
    }

    console.log("\n==== TELEGRAM FLOW TEST COMPLETE ====");
}

runTest().catch(console.error);
