import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';
const supabase = createClient(supabaseUrl, supabaseKey);

// Pricing logic from constants
const PET_WEIGHT_OPTIONS = {
    UP_TO_5: 'Até 5kg',
    KG_10: 'Até 10kg',
    KG_15: 'Até 15kg',
    KG_20: 'Até 20kg',
    KG_25: 'Até 25kg',
    KG_30: 'Até 30kg',
    OVER_30: 'Acima de 30kg',
};

const SERVICE_PRICES = {
    UP_TO_5: { BATH: 70, GROOMING_ONLY: 70 },
    KG_10: { BATH: 80, GROOMING_ONLY: 80 },
    KG_15: { BATH: 90, GROOMING_ONLY: 90 },
    KG_20: { BATH: 100, GROOMING_ONLY: 100 },
    KG_25: { BATH: 120, GROOMING_ONLY: 120 },
    KG_30: { BATH: 160, GROOMING_ONLY: 150 },
    OVER_30: { BATH: 180, GROOMING_ONLY: 170 },
};

function getWeightKeyFromLabel(label) {
    if (!label) return null;
    const keys = Object.keys(PET_WEIGHT_OPTIONS);
    return keys.find(k => PET_WEIGHT_OPTIONS[k] === label) || null;
}

function inferServiceTypesBase(label) {
    if (!label) return [];
    const l = label.toLowerCase();
    const hasBathTosa = l.includes('banho & tosa') || l.includes('banho e tosa');
    const hasBath = l.includes('banho');
    const hasTosa = l.includes('tosa');

    if (hasBathTosa) return ['BATH', 'GROOMING_ONLY'];
    if (hasBath && !hasBathTosa) return ['BATH'];
    if (hasTosa && !hasBathTosa) return ['GROOMING_ONLY'];
    return [];
}

function calculateBasePrice(weightLabel, serviceLabel) {
    const weightKey = getWeightKeyFromLabel(weightLabel);
    if (!weightKey) return 0;

    const types = inferServiceTypesBase(serviceLabel);
    let total = 0;
    for (const t of types) {
        total += SERVICE_PRICES[weightKey][t] || 0;
    }
    return total;
}

async function runFixes() {
    console.log('--- Iniciando Correção de Preços Avulsos para Mensalistas (Semanais / Quinzenais) ---');

    // 1. Fetch weekly or bi-weekly clients
    const { data: clients, error: errClients } = await supabase
        .from('monthly_clients')
        .select('*')
        .in('recurrence_type', ['weekly', 'bi-weekly']);

    if (errClients) {
        console.error('Erro ao buscar clientes:', errClients.message);
        return;
    }

    console.log(`Encontrados ${clients.length} clientes semanais/quinzenais.`);

    for (const c of clients) {
        const baseAvulsoPrice = calculateBasePrice(c.weight, c.service);

        let extrasTotal = 0;
        let extras = c.extra_services;
        if (typeof extras === 'string') {
            try { extras = JSON.parse(extras); } catch (e) { extras = {}; }
        }
        if (!extras) extras = {};

        Object.values(extras).forEach((service: any) => {
            if (service && (service.enabled || service.quantity > 0)) {
                const val = Number(service.value || 0);
                const qtd = Number(service.quantity || 1);
                extrasTotal += val * qtd;
            }
        });

        const divisor = c.recurrence_type === 'weekly' ? 4 : 2;
        const extraPerVisit = extrasTotal / divisor;

        // Final per-visit price is the standard single service table (e.g. 70 for bath 0-5kg) + prorated extra values
        const finalUnitPrice = baseAvulsoPrice + extraPerVisit;
        const roundedPrice = Math.round(finalUnitPrice * 100) / 100;

        console.log(`> Cliente: ${c.pet_name} (${c.recurrence_type}) - Peso: ${c.weight} - Serviço: ${c.service}`);
        console.log(`  Tabela Base Avulso = R$ ${baseAvulsoPrice}`);
        console.log(`  Extras Total = R$ ${extrasTotal} (Extras/Visita = R$ ${extraPerVisit})`);
        console.log(`  => Preço corrigido por agendamento: R$ ${roundedPrice}`);

        // Update appointments where date > 2026-01-01
        const { error: errorAppts } = await supabase
            .from('appointments')
            .update({ price: roundedPrice })
            .eq('monthly_client_id', c.id)
            .gte('appointment_time', '2026-01-01T00:00:00');

        if (errorAppts) console.error(`Erro ao atualizar appointments para ${c.pet_name}:`, errorAppts.message);

        const { error: errorPetMovel } = await supabase
            .from('pet_movel_appointments')
            .update({ price: roundedPrice })
            .eq('monthly_client_id', c.id)
            .gte('appointment_time', '2026-01-01T00:00:00');

        if (errorPetMovel) console.error(`Erro ao atualizar pet_movel_appointments para ${c.pet_name}:`, errorPetMovel.message);

    }
    console.log('--- FIM DO SCRIPT ---');
}

runFixes();
