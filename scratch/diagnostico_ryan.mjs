import fetch from 'node-fetch';

const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

async function run() {
    try {
        const date = '2026-06-24';
        console.log(`=== Buscando agendamentos do pet "pitoco" para o dia ${date} ===`);
        
        for (const table of ['appointments', 'pet_movel_appointments', 'agendamento_banhotosa']) {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?appointment_time=gte.${date}T00:00:00Z&appointment_time=lte.${date}T23:59:59Z&pet_name=ilike.*pitoco*`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            const data = await res.json();
            console.log(`\nTabela: ${table} | Total: ${data.length}`);
            data.forEach(app => {
                console.log(`- ID: ${app.id} | Pet: ${app.pet_name} | Tutor: ${app.owner_name} | Data/Hora: ${app.appointment_time} | Status: ${app.status} | Service: ${app.service} | Condomínio: ${app.condominium}`);
            });
        }

    } catch (e) {
        console.error("Erro:", e);
    }
}

run();
