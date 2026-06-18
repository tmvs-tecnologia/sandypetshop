import fetch from 'node-fetch';

const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

async function updateAppointment() {
  console.log('--- ATUALIZANDO AGENDAMENTO DO TITI ---');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamento_banhotosa?id=eq.be671d9c-1be8-433e-b0de-82a9d4092c25`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        appointment_time: '2026-06-15T18:00:00+00:00'
      })
    });
    const data = await res.json();
    console.log('Resultado da atualização:', data);
  } catch (error) {
    console.error('Erro ao atualizar:', error);
  }
}

updateAppointment();
