
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

const toSaoPauloUTC = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0) => {
    return new Date(Date.UTC(year, month, day, hour, minute, second) + SAO_PAULO_OFFSET_MS);
}

const getSaoPauloTimeParts = (date: Date) => {
    const spDate = new Date(date.getTime() - SAO_PAULO_OFFSET_MS);
    return {
        year: spDate.getUTCFullYear(),
        month: spDate.getUTCMonth(),
        date: spDate.getUTCDate(),
        hour: spDate.getUTCHours(),
        day: spDate.getUTCDay(), // 0 = Sunday
    }
}

async function runBackfill() {
    console.log("Iniciando backfill robusto 2026...");

    const { data: clients, error: clientsError } = await supabase
        .from('monthly_clients')
        .select('*')
        .eq('is_active', true);

    if (clientsError || !clients) {
        console.error("Erro ao buscar mensalistas:", clientsError);
        return;
    }

    console.log(`Encontrados ${clients.length} mensalistas ativos.`);

    const endLimit = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));
    let totalCreated = 0;

    for (const client of clients) {
        console.log(`Processando ${client.pet_name} (${client.owner_name})...`);

        // Get existing appointments to avoid duplication
        const { data: existingAppts } = await supabase
            .from('appointments')
            .select('appointment_time')
            .eq('monthly_client_id', client.id);
        
        const existingTimes = new Set((existingAppts || []).map(a => new Date(a.appointment_time).toISOString()));

        const appointmentsToCreateIndices: string[] = [];
        const startFrom = new Date(); // Start generating from today
        
        if (client.recurrence_type === 'weekly' || client.recurrence_type === 'bi-weekly') {
            let cursor = new Date(startFrom);
            const spParts = getSaoPauloTimeParts(cursor);
            let currentDayOfWeek = spParts.day === 0 ? 7 : spParts.day;
            let daysToAdd = (client.recurrence_day - currentDayOfWeek + 7) % 7;
            cursor.setDate(cursor.getDate() + daysToAdd);

            const intervalDays = client.recurrence_type === 'weekly' ? 7 : 14;

            while (cursor <= endLimit) {
                const appTime = toSaoPauloUTC(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), client.recurrence_time);
                const iso = appTime.toISOString();
                if (!existingTimes.has(iso)) {
                    appointmentsToCreateIndices.push(iso);
                }
                cursor.setDate(cursor.getDate() + intervalDays);
            }
        } else if (client.recurrence_type === 'monthly') {
            let cursor = new Date(startFrom);
            while (cursor <= endLimit) {
                const y = cursor.getFullYear();
                const m = cursor.getMonth();
                const lastDay = new Date(y, m + 1, 0).getDate();
                const day = Math.min(client.recurrence_day, lastDay);
                const appTime = toSaoPauloUTC(y, m, day, client.recurrence_time);
                
                if (appTime >= startFrom && appTime <= endLimit) {
                    const iso = appTime.toISOString();
                    if (!existingTimes.has(iso)) {
                        appointmentsToCreateIndices.push(iso);
                    }
                }
                cursor.setMonth(cursor.getMonth() + 1);
                cursor.setDate(1); // Reset to 1st of next month to avoid skipping months with shorter days
            }
        }

        if (appointmentsToCreateIndices.length > 0) {
            const payloads = appointmentsToCreateIndices.map(time => ({
                owner_name: client.owner_name,
                pet_name: client.pet_name,
                service: client.service.split(',')[0].trim(), // Use primary service
                appointment_time: time,
                status: 'AGENDADO',
                price: client.price / (client.recurrence_type === 'weekly' ? 4 : (client.recurrence_type === 'bi-weekly' ? 2 : 1)), // Simplified price per appt
                whatsapp: client.whatsapp,
                pet_breed: client.pet_breed,
                owner_address: client.owner_address,
                weight: client.weight,
                condominium: client.condominium,
                monthly_client_id: client.id
            }));

            // Check if it's a pet mobile client
            const isPetMovel = client.service.toLowerCase().includes('móvel') || client.service.toLowerCase().includes('movel');

            if (isPetMovel) {
                 const [res1, res2] = await Promise.all([
                    supabase.from('appointments').insert(payloads),
                    supabase.from('pet_movel_appointments').insert(payloads)
                ]);
                if (res1.error || res2.error) console.error(`Erro ao inserir para ${client.pet_name}:`, res1.error || res2.error);
                else totalCreated += payloads.length;
            } else {
                const { error } = await supabase.from('appointments').insert(payloads);
                if (error) console.error(`Erro ao inserir para ${client.pet_name}:`, error);
                else totalCreated += payloads.length;
            }
        }
    }

    console.log(`Backfill concluído. Total de agendamentos criados: ${totalCreated}`);
}

runBackfill();
