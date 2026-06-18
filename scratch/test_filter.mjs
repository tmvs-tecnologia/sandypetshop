import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xilavhopbmjhsovvybza.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: VITE_SUPABASE_ANON_KEY is not defined in env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFilter() {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

    console.log('Fetching from agendamento_banhotosa...');
    const { data: banhoTosaAppointments, error: err } = await supabase
      .from('agendamento_banhotosa')
      .select('*, monthly_clients(pet_photo_url, recurrence_type)')
      .gte('appointment_time', windowStart)
      .order('appointment_time', { ascending: false });

    if (err) throw err;

    console.log(`Fetched ${banhoTosaAppointments.length} appointments from agendamento_banhotosa`);

    const { data: inactiveClients, error: err2 } = await supabase
      .from('monthly_clients')
      .select('id')
      .eq('is_active', false);

    if (err2) throw err2;

    const inactiveIds = new Set((inactiveClients || []).map((c) => c.id));
    console.log('Inactive Client IDs:', Array.from(inactiveIds));

    const apolloAndFrederico = banhoTosaAppointments.filter(
      (r) => r.pet_name.includes('APOLLO') || r.pet_name.includes('Frederico')
    );

    console.log('\n--- Apollo & Frederico raw appointments ---');
    apolloAndFrederico.forEach(rec => {
      console.log({
        id: rec.id,
        pet_name: rec.pet_name,
        appointment_time: rec.appointment_time,
        monthly_client_id: rec.monthly_client_id,
        has_monthly_clients_relation: !!rec.monthly_clients,
        relation_data: rec.monthly_clients
      });
    });

    const nowTime = new Date().getTime();
    console.log('\nnowTime:', nowTime, `(${new Date().toISOString()})`);

    console.log('\n--- Filtering test ---');
    apolloAndFrederico.forEach(app => {
      const appTime = new Date(app.appointment_time).getTime();
      const hasId = app.monthly_client_id && inactiveIds.has(app.monthly_client_id);
      const isPast = appTime < nowTime;
      const keep = hasId ? isPast : true;
      console.log(`Pet: ${app.pet_name}, Time: ${app.appointment_time} (${appTime}), hasInactiveId: ${hasId}, isPast: ${isPast}, keep: ${keep}`);
    });

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testFilter();
