import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

const LOG_FILE = path.resolve(__dirname, 'robust_backfill.log');

try { fs.writeFileSync(LOG_FILE, ''); } catch (e) { }

function log(msg) {
    console.log(msg);
    try { fs.appendFileSync(LOG_FILE, msg + '\n'); } catch (e) { }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const getNextDate = (currentDate, type, dayValue) => {
    const next = new Date(currentDate);
    next.setSeconds(0);
    next.setMilliseconds(0);

    if (type === 'weekly') {
        next.setDate(next.getDate() + 7);
    } else if (type === 'bi-weekly') {
        next.setDate(next.getDate() + 14);
    } else if (type === 'monthly') {
        const targetMonth = next.getMonth() + 1;
        next.setMonth(targetMonth);
        next.setDate(dayValue);
        if (next.getMonth() !== targetMonth % 12) {
            next.setDate(0);
        }
    }
    return next;
};

async function robustBackfill() {
    log(`Starting robust backfill for 2026...`);

    const { data: clientsRaw, error: clientsError } = await supabase
        .from('monthly_clients')
        .select('*')
        .eq('is_active', true);

    if (clientsError || !clientsRaw) {
        log(`Error fetching clients: ${JSON.stringify(clientsError)}`);
        return;
    }

    const clients = clientsRaw;
    log(`Found ${clients.length} active monthly clients.`);

    let totalCreated = 0;

    for (const client of clients) {
        try {
            log(`\nProcessing ${client.pet_name} (${client.recurrence_type}, Dia: ${client.recurrence_day}, Hora: ${client.recurrence_time})`);

            const recTime = parseInt(client.recurrence_time, 10);
            const recDay = parseInt(client.recurrence_day, 10);

            // Fetch ALL existing appointments for this client in 2026
            const { data: existingApps } = await supabase
                .from('appointments')
                .select('appointment_time')
                .eq('monthly_client_id', client.id)
                .gte('appointment_time', '2026-01-01T00:00:00Z')
                .lte('appointment_time', '2026-12-31T23:59:59Z');

            const existingDatesStr = new Set(
                (existingApps || []).map(a => new Date(a.appointment_time).toISOString().split('T')[0])
            );

            // Determine start date: max(2026-01-01, client.created_at)
            let startDate = new Date('2026-01-01T00:00:00Z');
            const clientCreated = new Date(client.created_at);
            if (clientCreated > startDate) {
                startDate = new Date(clientCreated);
            }

            // Generate the VERY FIRST candidate date for this client on/after startDate
            let candidate = new Date(startDate);
            candidate.setHours(recTime, 0, 0, 0);

            if (client.recurrence_type === 'monthly') {
                // Find first day matching recurrence_day
                if (candidate.getDate() > recDay) {
                    candidate.setMonth(candidate.getMonth() + 1);
                }
                candidate.setDate(recDay);
            } else {
                // Weekly or Bi-weekly
                let targetJsDay = recDay;
                if (targetJsDay === 7) targetJsDay = 0; // Sun=0

                while (candidate.getDay() !== targetJsDay) {
                    candidate.setDate(candidate.getDate() + 1);
                }
            }

            const newAppointments = [];
            let currentDate = candidate;

            // Ensure we don't start before the actual start date if manipulating dates pushed it back somehow
            if (currentDate < startDate) {
                currentDate = getNextDate(currentDate, client.recurrence_type, recDay);
            }

            let iteration = 0;
            while (currentDate.getFullYear() === 2026 && iteration < 100) {
                iteration++;

                const dateStr = currentDate.toISOString().split('T')[0];

                // Generate for all of 2026 properly
                if (!existingDatesStr.has(dateStr)) {
                    newAppointments.push({
                        monthly_client_id: client.id,
                        pet_name: client.pet_name,
                        owner_name: client.owner_name,
                        whatsapp: client.whatsapp,
                        service: client.service,
                        price: client.price,
                        appointment_time: currentDate.toISOString(),
                        status: currentDate < new Date() ? 'CONCLUÍDO' : 'AGENDADO', // If past, mark as done
                        extra_services: client.extra_services,
                        condominium: client.condominium,
                        weight: client.weight,
                    });
                }

                currentDate = getNextDate(currentDate, client.recurrence_type, recDay);
            }

            if (newAppointments.length > 0) {
                const { error: insertError } = await supabase
                    .from('appointments')
                    .insert(newAppointments);

                if (insertError) {
                    log(`Failed to insert for ${client.pet_name}: ${JSON.stringify(insertError)}`);
                } else {
                    log(`-> Created ${newAppointments.length} missing appointments for ${client.pet_name}.`);
                    totalCreated += newAppointments.length;
                }
            } else {
                log(`-> All appointments already exist.`);
            }

        } catch (err) {
            log(`Error processing ${client.pet_name}: ${err.message}`);
            log(err.stack);
        }
    }

    log(`\n----------------------------------`);
    log(`Robust Backfill Complete. Total Created: ${totalCreated}`);
}

robustBackfill();
