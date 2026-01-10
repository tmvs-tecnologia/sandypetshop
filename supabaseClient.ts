import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://phfzqvmofnqwxszdgjch.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZnpxdm1vZm5xd3hzemRnamNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE1MzIsImV4cCI6MjA3NzI1NzUzMn0.bWL2t6XGQJ5OmNxAB8mLjAzY5uF1fVzheMNksVJ2Dkk';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

// Criar o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  }
});

console.log('Supabase client created successfully');

export { supabase };
