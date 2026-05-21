import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xilavhopbmjhsovvybza.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Buscando TODOS os registros de daycare_enrollments e hotel_registrations no banco...');

  const { data: daycare, error: daycareErr } = await supabase
    .from('daycare_enrollments')
    .select('*');
  
  if (daycareErr) {
    console.error('Erro daycare_enrollments:', daycareErr);
  } else {
    console.log(`\nTotal de registros daycare_enrollments no banco: ${daycare.length}`);
    daycare.forEach((d, i) => {
      if (i < 10) {
        console.log(`- ID: ${d.id}, Pet: ${d.pet_name}, Status: ${d.status}, Price: ${d.total_price}, Date: ${d.created_at}`);
      }
    });
  }

  const { data: hotel, error: hotelErr } = await supabase
    .from('hotel_registrations')
    .select('*');

  if (hotelErr) {
    console.error('Erro hotel_registrations:', hotelErr);
  } else {
    console.log(`\nTotal de registros hotel_registrations no banco: ${hotel.length}`);
    hotel.forEach((h, i) => {
      if (i < 10) {
        console.log(`- ID: ${h.id}, Pet: ${h.pet_name}, Status: ${h.status}, Price: ${h.total_services_price}, Date: ${h.check_in_date}`);
      }
    });
  }
}

check();
