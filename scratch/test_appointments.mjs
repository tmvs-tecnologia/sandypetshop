import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xilavhopbmjhsovvybza.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: VITE_SUPABASE_ANON_KEY is not defined in env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAppointments() {
  try {
    const now = new Date();
    // 30 days ago, same as login filter
    const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const fetchPaginated = async (table) => {
      let allData = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*, monthly_clients(pet_photo_url, recurrence_type)')
          .gte('appointment_time', windowStart)
          .order('appointment_time', { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) {
          console.warn(`Erro paginando ${table}:`, error);
          break;
        }
        if (data) allData = allData.concat(data);
        if (!data || data.length < 1000) break;
        page++;
      }
      return allData;
    };

    const bathAppointments = await fetchPaginated('appointments');
    const petMovelAppointments = await fetchPaginated('pet_movel_appointments');
    const banhoTosaAppointments = await fetchPaginated('agendamento_banhotosa');

    console.log(`Total appointments fetched:
- appointments: ${bathAppointments.length}
- pet_movel_appointments: ${petMovelAppointments.length}
- agendamento_banhotosa: ${banhoTosaAppointments.length}
`);

    const normalize = (arr, tableName) => {
      if (!arr) return [];
      return arr.map((rec) => ({
        id: rec.id,
        appointment_time: rec.appointment_time,
        pet_name: rec.pet_name,
        pet_breed: rec.pet_breed ?? undefined,
        owner_name: rec.owner_name ?? rec.client_name ?? '',
        owner_address: rec.owner_address ?? rec.address ?? undefined,
        whatsapp: rec.whatsapp ?? rec.phone ?? '',
        service: rec.service,
        weight: rec.weight,
        addons: rec.addons ?? [],
        price: rec.price ?? 0,
        status: rec.status,
        monthly_client_id: rec.monthly_client_id ?? undefined,
        condominium: rec.condominium ?? rec.condo ?? undefined,
        extra_services: rec.extra_services ?? undefined,
        observation: rec.observation ?? rec.notes ?? undefined,
        pet_photo_url: rec.monthly_clients?.pet_photo_url ?? undefined,
        recurrence_type: rec.monthly_clients?.recurrence_type ?? undefined,
        responsible: rec.responsible ?? undefined,
        owner_cpf: rec.owner_cpf ?? undefined,
        table: tableName,
      }));
    };

    const combined = [
      ...normalize(bathAppointments, 'appointments'),
      ...normalize(petMovelAppointments, 'pet_movel_appointments'),
      ...normalize(banhoTosaAppointments, 'agendamento_banhotosa'),
    ].sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());

    const { data: inactiveClients } = await supabase
      .from('monthly_clients')
      .select('id')
      .eq('is_active', false);
    const inactiveIds = new Set((inactiveClients || []).map((c) => c.id));
    const nowTime = new Date().getTime();

    const filteredCombined = combined.filter(app => {
      if (app.monthly_client_id && inactiveIds.has(app.monthly_client_id)) {
        return new Date(app.appointment_time).getTime() < nowTime;
      }
      return true;
    });

    console.log(`combined total: ${combined.length}`);
    console.log(`filteredCombined total: ${filteredCombined.length}`);

    // Print Apollo & Frederico in filteredCombined
    const filteredApolloFrederico = filteredCombined.filter(app =>
      app.pet_name.toLowerCase().includes('apollo') || app.pet_name.toLowerCase().includes('frederico')
    );
    console.log('\n--- Apollo & Frederico in filteredCombined ---');
    filteredApolloFrederico.forEach(app => {
      console.log(`Pet: ${app.pet_name}, Time: ${app.appointment_time}, table: ${app.table}, monthly_client_id: ${app.monthly_client_id}`);
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

testAppointments();
