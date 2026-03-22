import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE0MDYxOCwiZXhwIjoyMDg5NzE2NjE4fQ.bWbPrMN8FNAHUNV5WKApBa-B5_x1FOJzUy1hOWINU74';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'login@sandypetshop.com',
    password: '1234',
    email_confirm: true
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created successfully:', data.user.email);
  }
}

createAdmin();
