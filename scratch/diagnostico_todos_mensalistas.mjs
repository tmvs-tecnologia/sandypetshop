import fetch from 'node-fetch';

const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

async function run() {
    try {
        console.log("Fetching active monthly clients...");
        const resClients = await fetch(`${SUPABASE_URL}/rest/v1/monthly_clients?is_active=eq.true`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const clients = await resClients.json();
        console.log(`Found ${clients.length} active monthly clients.\n`);

        console.log("Analyzing client appointments...");
        for (const client of clients) {
            const isBanhoTosaFixo = client.condominium === 'Banho & Tosa Fixo' || client.condominium === 'Nenhum Condomínio';
            // Determine correct table
            let correctTable = 'appointments';
            if (isBanhoTosaFixo) {
                correctTable = 'agendamento_banhotosa';
            } else {
                // Check if any service contains mobile
                const isMobile = client.service.toLowerCase().includes('móvel') || client.service.toLowerCase().includes('movel');
                if (isMobile) {
                    correctTable = 'pet_movel_appointments';
                }
            }

            // Fetch counts from each table for this monthly client
            const resApps = await fetch(`${SUPABASE_URL}/rest/v1/appointments?select=id&monthly_client_id=eq.${client.id}`, {
                method: 'HEAD',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Prefer': 'count=exact'
                }
            });
            const countApps = resApps.headers.get('content-range')?.split('/')[1] || 0;

            const resMovel = await fetch(`${SUPABASE_URL}/rest/v1/pet_movel_appointments?select=id&monthly_client_id=eq.${client.id}`, {
                method: 'HEAD',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Prefer': 'count=exact'
                }
            });
            const countMovel = resMovel.headers.get('content-range')?.split('/')[1] || 0;

            const resBT = await fetch(`${SUPABASE_URL}/rest/v1/agendamento_banhotosa?select=id&monthly_client_id=eq.${client.id}`, {
                method: 'HEAD',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Prefer': 'count=exact'
                }
            });
            const countBT = resBT.headers.get('content-range')?.split('/')[1] || 0;

            console.log(`Pet: ${client.pet_name.padEnd(12)} | Tutor: ${client.owner_name.padEnd(15)} | Condomínio: ${client.condominium.padEnd(20)} | Correta: ${correctTable.padEnd(25)} | appointments: ${countApps} | pet_movel: ${countMovel} | banhotosa: ${countBT}`);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
