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

async function setupBucket() {
  const BUCKET_NAME = "menu-images";
  
  console.log(`Checking for bucket '${BUCKET_NAME}'...`);
  const { data: buckets } = await supabase.storage.listBuckets();
  
  const exists = buckets?.find(b => b.name === BUCKET_NAME);
  
  if (!exists) {
    console.log(`Bucket '${BUCKET_NAME}' not found. Creating it...`);
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    });
    
    if (error) {
      console.error("Failed to create bucket:", error);
    } else {
      console.log(`Successfully created bucket '${BUCKET_NAME}'!`);
    }
  } else {
    console.log(`Bucket '${BUCKET_NAME}' already exists. Making sure it's public...`);
    const { error } = await supabase.storage.updateBucket(BUCKET_NAME, {
      public: true
    });
    if (error) {
       console.error("Failed to make bucket public:", error);
    } else {
       console.log("Bucket is set to public.");
    }
  }
}

setupBucket();
