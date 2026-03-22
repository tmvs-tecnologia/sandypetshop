import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE0MDYxOCwiZXhwIjoyMDg5NzE2NjE4fQ.bWbPrMN8FNAHUNV5WKApBa-B5_x1FOJzUy1hOWINU74';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const buckets = ['monthly_pet_photos', 'daycare_pet_photos', 'pet_photos'];

async function createBuckets() {
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
    });

    if (error) {
      if(error.message.includes('already exists')) {
         console.log(`Bucket ${bucket} already exists.`);
      } else {
         console.error(`Error creating bucket ${bucket}:`, error.message);
      }
    } else {
      console.log(`Successfully created bucket: ${bucket}`);
    }
  }
}

createBuckets();
