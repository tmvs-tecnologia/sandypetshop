import fetch from 'node-fetch';

const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

const ryanDetails = {
    owner_name: 'marcela',
    pet_name: 'ryan',
    service: 'Banho (Pet Móvel)',
    price: 60, // 240 / 4
    whatsapp: '(11) 97363-6734',
    pet_breed: 'yorkshire ',
    owner_address: 'sem cond centro diadema ',
    weight: 'Até 5kg',
    condominium: 'Banho & Tosa Fixo',
    monthly_client_id: '4b040b8b-bc75-4582-85ba-b97015fa9ff1',
    observation: 'bonzinho so treme muito ',
    owner_cpf: '00000000000'
};

const datesToInsert = [
    { time: '2026-06-08T14:00:00+00:00', status: 'CONCLUÍDO' },
    { time: '2026-06-15T14:00:00+00:00', status: 'CONCLUÍDO' },
    { time: '2026-06-22T14:00:00+00:00', status: 'CONCLUÍDO' },
    { time: '2026-06-29T14:00:00+00:00', status: 'AGENDADO' }
];

async function run() {
    try {
        const payloads = datesToInsert.map(d => ({
            ...ryanDetails,
            appointment_time: d.time,
            status: d.status
        }));

        console.log("=== Inserindo agendamentos para o Ryan em agendamento_banhotosa ===");
        const response = await fetch(`${SUPABASE_URL}/rest/v1/agendamento_banhotosa`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payloads)
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Agendamentos inseridos com sucesso!");
            console.log(JSON.stringify(data, null, 2));
        } else {
            const errText = await response.text();
            console.error("Erro ao inserir:", errText);
        }
    } catch (e) {
        console.error("Erro de rede:", e);
    }
}

run();
