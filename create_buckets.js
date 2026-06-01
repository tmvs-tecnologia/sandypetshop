import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE0MDYxOCwiZXhwIjoyMDg5NzE2NjE4fQ.bWbPrMN8FNAHUNV5WKApBa-B5_x1FOJzUy1hOWINU74';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const buckets = ['monthly_pet_photos', 'daycare_pet_photos', 'pet_photos'];

async function createAndUpdateBuckets() {
  for (const bucket of buckets) {
    console.log(`Updating configuration for bucket: ${bucket}...`);
    const { data: updateData, error: updateError } = await supabase.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: 52428800, // 50MB limit (52428800 bytes)
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    });

    if (updateError) {
      console.log(`Bucket ${bucket} does not exist or failed to update. Attempting to create...`);
      const { data, error } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
      });

      if (error) {
        console.error(`Error with bucket ${bucket}:`, error.message);
      } else {
        console.log(`Successfully created bucket: ${bucket} with 50MB limit`);
      }
    } else {
      console.log(`Successfully updated bucket ${bucket} configuration to 50MB limit.`);
    }
  }
}

createAndUpdateBuckets();
