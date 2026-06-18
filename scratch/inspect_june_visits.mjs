import fetch from 'node-fetch';

const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

async function queryTable(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  return res.json();
}

async function inspect() {
  console.log('--- BUSCANDO REGISTROS DE VISITA EM TODAS AS TABELAS ---');
  try {
    const banhoTosa = await queryTable('agendamento_banhotosa');
    const appointments = await queryTable('appointments');
    const petMovel = await queryTable('pet_movel_appointments');

    const isVisit = (service) => {
      const s = String(service || '').toLowerCase();
      return s.includes('visit') || s.includes('creche') || s.includes('hotel');
    };

    console.log(`\n--- agendamento_banhotosa visits ---`);
    banhoTosa.filter(d => isVisit(d.service)).forEach(d => {
      console.log(`ID: ${d.id}, Pet: ${d.pet_name}, Owner: ${d.owner_name}, Service: "${d.service}", Time: ${d.appointment_time}, Status: ${d.status}`);
    });

    console.log(`\n--- appointments visits ---`);
    appointments.filter(d => isVisit(d.service)).forEach(d => {
      console.log(`ID: ${d.id}, Pet: ${d.pet_name}, Owner: ${d.owner_name}, Service: "${d.service}", Time: ${d.appointment_time}, Status: ${d.status}`);
    });

    console.log(`\n--- pet_movel_appointments visits ---`);
    petMovel.filter(d => isVisit(d.service)).forEach(d => {
      console.log(`ID: ${d.id}, Pet: ${d.pet_name}, Owner: ${d.owner_name}, Service: "${d.service}", Time: ${d.appointment_time}, Status: ${d.status}`);
    });

  } catch (error) {
    console.error('Erro:', error);
  }
}

inspect();
