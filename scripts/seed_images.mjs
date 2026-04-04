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

// Royalty-free Unsplash images optimized for food delivery UI
const IMAGE_MAP = {
    'Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    'Shawarma': 'https://images.unsplash.com/photo-1662116765994-6d9bba7ccdd9?auto=format&fit=crop&q=80&w=800', // wrap
    'Fries': 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&q=80&w=800',
    'Pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    'Drink': 'https://images.unsplash.com/photo-1543253687-c931c8e01820?auto=format&fit=crop&q=80&w=800',
    'Coke': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=800',
    'Water': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&q=80&w=800',
    'Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
    'Chicken': 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&q=80&w=800', // fried chicken
    'Default': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800' // nice generic food plate
};

function getMatchingImage(itemName) {
    const nameStr = itemName.toLowerCase();
    for (const [key, url] of Object.entries(IMAGE_MAP)) {
        if (nameStr.includes(key.toLowerCase())) {
            return url;
        }
    }
    return IMAGE_MAP['Default'];
}

async function seedImages() {
    console.log("Fetching menu items to update...");
    
    const { data: menuItems, error } = await supabase
        .from('menu_items')
        .select('*');
        
    if (error) {
        console.error("Error fetching items:", error);
        return;
    }
    
    if (!menuItems || menuItems.length === 0) {
        console.log("No menu items found in the database to update.");
        return;
    }
    
    let updatedCount = 0;
    
    for (const item of menuItems) {
        if (!item.image_url) {
            const imageUrl = getMatchingImage(item.name);
            console.log(`Updating '${item.name}' with image URL...`);
            
            const { error: updateError } = await supabase
                .from('menu_items')
                .update({ image_url: imageUrl })
                .eq('id', item.id);
                
            if (updateError) {
                console.error(`Failed to update ${item.name}:`, updateError);
            } else {
                updatedCount++;
            }
        } else {
            console.log(`Skipping '${item.name}', already has an image.`);
        }
    }
    
    console.log(`\nSuccessfully populated images for ${updatedCount} menu items!`);
}

seedImages();
