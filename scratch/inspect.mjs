import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xilavhopbmjhsovvybza.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- INSPECIONANDO DAYCARE ENROLLMENTS ---');
  const daycareRes = await supabase.from('daycare_enrollments').select('*');
  const daycareData = daycareRes.data || [];
  daycareData.forEach(d => {
    console.log(`Pet: ${d.pet_name}, tutor: ${d.tutor_name}, price: ${d.total_price}, status: "${d.status}", created_at: "${d.created_at}"`);
  });

  console.log('\n--- INSPECIONANDO HOTEL REGISTRATIONS ---');
  const hotelRes = await supabase.from('hotel_registrations').select('*');
  const hotelData = hotelRes.data || [];
  hotelData.forEach(h => {
    console.log(`Pet: ${h.pet_name}, tutor: ${h.tutor_name}, price: ${h.total_services_price}, status: "${h.status}", check_in: "${h.check_in_date}"`);
  });
}

run();
