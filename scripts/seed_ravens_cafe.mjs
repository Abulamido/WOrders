import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SOURCE_ORG_ID = '5ab0af91-031f-4411-b240-d90bdf3bee42'; // Abu Cafe
const TARGET_ORG_ID = '0a828127-2016-4c6f-b681-ebfa524ce128'; // Raven's Cafe
const TARGET_PHONE = '2347077241096';

async function seedRavensCafe() {
    console.log("--- Seeding Raven's Cafe from Abu Cafe ---");

    // 1. Link Phone Number & Approve Target Org
    console.log(`Step 1: Linking phone ${TARGET_PHONE} to Raven's Cafe...`);
    const { error: orgError } = await supabase
        .from('organizations')
        .update({ 
            notification_phone: TARGET_PHONE, 
            whatsapp_number: TARGET_PHONE,
            is_active: true,
            approval_status: 'approved'
        })
        .eq('id', TARGET_ORG_ID);
        
    if (orgError) {
        console.error("Error updating organization:", orgError);
        return;
    }

    // 2. Cleanup Target Data
    console.log("Step 2: Cleaning up existing categories and items for Raven's Cafe...");
    // Item deletion is cascade normally, but we will do it manually for safety
    await supabase.from('menu_items').delete().eq('org_id', TARGET_ORG_ID);
    await supabase.from('categories').delete().eq('org_id', TARGET_ORG_ID);

    // 3. Fetch Source Categories
    console.log("Step 3: Fetching source categories from Abu Cafe...");
    const { data: sourceCats, error: catFetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('org_id', SOURCE_ORG_ID);

    if (catFetchError) {
        console.error("Error fetching source categories:", catFetchError);
        return;
    }

    // 4. Migrate Categories & Items
    console.log(`Step 4: Migrating ${sourceCats.length} categories...`);
    for (const sourceCat of sourceCats) {
        const { id: oldId, created_at, updated_at, org_id, ...catData } = sourceCat;
        
        // Insert new category
        const { data: newCat, error: catInsertError } = await supabase
            .from('categories')
            .insert({ ...catData, org_id: TARGET_ORG_ID })
            .select()
            .single();

        if (catInsertError) {
            console.error(`Failed to insert category ${catData.name}:`, catInsertError);
            continue;
        }

        console.log(`  - Migrating items for category: ${newCat.name}`);

        // Fetch source items for this category
        const { data: sourceItems, error: itemFetchError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('category_id', oldId);

        if (itemFetchError) {
            console.error(`Error fetching items for category ${oldId}:`, itemFetchError);
            continue;
        }

        // Insert items into new category
        for (const sourceItem of sourceItems) {
            const { id: oldItemId, created_at, updated_at, org_id: oldOrgId, category_id, ...itemData } = sourceItem;
            
            const { error: itemInsertError } = await supabase
                .from('menu_items')
                .insert({ 
                    ...itemData, 
                    org_id: TARGET_ORG_ID, 
                    category_id: newCat.id 
                });

            if (itemInsertError) {
                console.error(`    Failed to insert item ${itemData.name}:`, itemInsertError);
            } else {
                console.log(`    + Copied item: ${itemData.name}`);
            }
        }
    }

    console.log("\n--- Seeding Complete! Raven's Cafe is now rich and linked. ---");
}

seedRavensCafe();
