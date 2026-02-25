
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPricesV2() {
    console.log('--- Iniciando Correção Avançada de Preços (v2) ---');

    // 1. Buscar todos os mensalistas
    const { data: clients, error: clientError } = await supabase
        .from('monthly_clients')
        .select('*')
        .eq('is_active', true);

    if (clientError) {
        console.error('Erro ao buscar mensalistas:', clientError.message);
        return;
    }

    console.log(`Processando ${clients.length} mensalistas...`);

    for (const client of clients) {
        // Calcular valor total dos extras
        let extrasTotal = 0;
        let extras = client.extra_services;

        // Parse JSON se for string
        if (typeof extras === 'string') {
            try { extras = JSON.parse(extras); } catch (e) { extras = {}; }
        }
        if (!extras) extras = {};

        // Somar valores de extras ativos ou com quantidade
        Object.values(extras).forEach((service) => {
            if (service && (service.enabled || service.quantity > 0)) {
                const val = Number(service.value || 0);
                const qtd = Number(service.quantity || 1); // Se quantity undefined, assume 1 se enabled
                // Se só enabled true mas sem quantity explícita, assume 1x o valor?
                // Vamos assumir: value * quantity.
                extrasTotal += val * qtd;
            }
        });

        // Preço Total Mensal = Base + Extras
        const basePrice = Number(client.price || 0);
        const totalMonthlyPrice = basePrice + extrasTotal;

        // Calcular Preço Unitário por Agendamento
        let unitPrice = totalMonthlyPrice;
        let divisor = 1;

        if (client.recurrence_type === 'weekly') {
            divisor = 4;
        } else if (client.recurrence_type === 'bi-weekly') {
            divisor = 2;
        }
        // Monthly = 1

        if (divisor > 0) {
            unitPrice = totalMonthlyPrice / divisor;
        }

        unitPrice = Math.round(unitPrice * 100) / 100;

        console.log(`> ${client.pet_name} (${client.recurrence_type}):`);
        console.log(`  Base: ${basePrice} + Extras: ${extrasTotal} = Total: ${totalMonthlyPrice}`);
        console.log(`  Divisor: ${divisor} -> Unitário: ${unitPrice}`);

        // Atualizar agendamentos de 2026
        // Se o unitPrice for > 0, atualizamos. Se for 0 (caso raro), mantemos 0.
        
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ price: unitPrice })
            .eq('monthly_client_id', client.id)
            .gte('appointment_time', '2026-01-01T00:00:00')
            .lte('appointment_time', '2026-12-31T23:59:59');

        if (updateError) {
            console.error(`  ERRO ao atualizar:`, updateError.message);
        } else {
            // console.log(`  Agendamentos atualizados.`);
        }
    }
    console.log('--- Correção v2 Concluída ---');
}

fixPricesV2();
