import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";

// Load test env
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("🌱 Seeding test database...");

    try {
        // 1. Create Organization
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .upsert({
                name: "Test Cafeteria",
                slug: "test-cafeteria",
                whatsapp_number: "test",
                is_active: true,
                plan: "starter",
                business_hours: {
                    mon: { open: "00:00", close: "23:59" },
                    tue: { open: "00:00", close: "23:59" },
                    wed: { open: "00:00", close: "23:59" },
                    thu: { open: "00:00", close: "23:59" },
                    fri: { open: "00:00", close: "23:59" },
                    sat: { open: "00:00", close: "23:59" },
                    sun: { open: "00:00", close: "23:59" },
                },
                timezone: "America/New_York"
            }, { onConflict: "slug" })
            .select()
            .single();

        if (orgError) throw orgError;
        console.log(`✅ Created test org: ${org.name}`);

        // 2. Create Category
        const { data: category, error: catError } = await supabase
            .from("categories")
            .insert({
                org_id: org.id,
                name: "Lunch Specials",
                sort_order: 1,
                is_active: true
            })
            .select()
            .single();

        if (catError) throw catError;
        console.log(`✅ Created category: ${category.name}`);

        // 3. Create Items
        const { error: itemError } = await supabase
            .from("menu_items")
            .insert([
                {
                    org_id: org.id,
                    category_id: category.id,
                    name: "Classic Cheeseburger",
                    description: "100% beef patty with melted cheddar, lettuce, and tomato.",
                    price: 8.50,
                    is_available: true,
                    prep_time_min: 10,
                    sort_order: 1
                },
                {
                    org_id: org.id,
                    category_id: category.id,
                    name: "Chicken Caesar Wrap",
                    description: "Grilled chicken, crisp romaine, parmesan, and creamy caesar dressing.",
                    price: 9.00,
                    is_available: true,
                    prep_time_min: 5,
                    sort_order: 2
                },
                {
                    org_id: org.id,
                    category_id: category.id,
                    name: "Spicy Tuna Roll",
                    description: "Fresh tuna with spicy mayo and cucumber. 8 pieces.",
                    price: 11.50,
                    is_available: true,
                    prep_time_min: 8,
                    sort_order: 3
                }
            ]);

        if (itemError) throw itemError;
        console.log("✅ Created 3 menu items");

        console.log("🎉 Seeding complete! You can now test the WhatsApp chatbot.");
    } catch (err) {
        console.error("❌ Seeding failed:", err);
    }
}

seed();
