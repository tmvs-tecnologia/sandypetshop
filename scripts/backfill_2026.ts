
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Helper for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

const COMPLETED_YEAR = 2026;
const LOG_FILE = path.resolve(__dirname, 'backfill_debug.log');
const FORCE_CLIENTS = ['Blue', 'Princesa'];

// Setup Logger
try {
    fs.writeFileSync(LOG_FILE, ''); // Clear log
} catch (e) {
    console.error('Failed to create log file', e);
}

function log(msg: string) {
    console.log(msg);
    try {
        fs.appendFileSync(LOG_FILE, msg + '\n');
    } catch (e) {
        // ignore
    }
}

// Interfaces (simplified for script)
interface MonthlyClient {
    id: string;
    pet_name: string;
    owner_name: string;
    whatsapp: string;
    service: string;
    price: number;
    recurrence_type: 'weekly' | 'bi-weekly' | 'monthly';
    recurrence_day: number;
    recurrence_time: number;
    condominium?: string;
    pet_photo_url?: string;
    extra_services?: any;
    is_active: boolean;
    weight: string; // Added weight
}

interface Appointment {
    id: string;
    appointment_time: string;
    monthly_client_id: string;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const getNextDate = (currentDate: Date, type: string, dayValue: number): Date => {
    const next = new Date(currentDate);

    // Reset seconds/milliseconds for cleaner dates
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

async function backfill() {
    log(`Starting backfill for year ${COMPLETED_YEAR}...`);

    const { data: clientsRaw, error: clientsError } = await supabase
        .from('monthly_clients')
        .select('*')
        .eq('is_active', true);

    if (clientsError || !clientsRaw) {
        log(`Error fetching clients: ${JSON.stringify(clientsError)}`);
        return;
    }

    const clients = clientsRaw as MonthlyClient[];

    log(`Found ${clients.length} active monthly clients.`);

    let totalCreated = 0;

    for (const client of clients) {
        // Check if forced
        const isForced = FORCE_CLIENTS.some(name => client.pet_name.trim().toLowerCase().includes(name.toLowerCase()));

        const { data: appointments, error: appError } = await supabase
            .from('appointments')
            .select('id, appointment_time, monthly_client_id')
            .eq('monthly_client_id', client.id)
            .gte('appointment_time', new Date().toISOString())
            .order('appointment_time', { ascending: false });

        if (appError) {
            log(`Error fetching appointments for ${client.pet_name}: ${JSON.stringify(appError)}`);
            continue;
        }

        let lastDate: Date;
        const newAppointments = [];

        if (!appointments || appointments.length === 0) {
            if (isForced) {
                log(`\nForcing backfill for ${client.pet_name}. No future appointments, starting from NOW.`);

                const now = new Date();
                let candidate = new Date(now);
                // Set time to preferred recurrence time
                candidate.setHours(client.recurrence_time, 0, 0, 0);

                // Ensure we start in Future (from 'now')
                if (candidate < now) {
                    candidate.setDate(candidate.getDate() + 1);
                }

                // Find first valid occurrence
                if (client.recurrence_type === 'monthly') {
                    while (candidate.getDate() !== client.recurrence_day) {
                        candidate.setDate(candidate.getDate() + 1);
                    }
                } else {
                    // Weekly/Bi-weekly
                    // Code assume 1=Monday (based on usage like 1: 'Segunda')
                    // JS getDay(): 0=Sun, 1=Mon
                    // So we map system Day to JS Day
                    // If system uses 7=Dom, we map to 0. Else 1-6 is same.
                    let targetJsDay = client.recurrence_day;
                    if (targetJsDay === 7) targetJsDay = 0;

                    while (candidate.getDay() !== targetJsDay) {
                        candidate.setDate(candidate.getDate() + 1);
                    }
                }

                lastDate = candidate;
                log(`   -> First computed start date: ${lastDate.toISOString()}`);

                // Add this FIRST appointment
                newAppointments.push({
                    monthly_client_id: client.id,
                    pet_name: client.pet_name,
                    owner_name: client.owner_name,
                    whatsapp: client.whatsapp,
                    service: client.service,
                    price: client.price,
                    appointment_time: lastDate.toISOString(),
                    status: 'AGENDADO',
                    extra_services: client.extra_services,
                    condominium: client.condominium,
                    // pet_photo_url removed
                    // recurrence_type removed
                    weight: client.weight,
                });

            } else {
                // Not forced, no appointments -> Skip
                log(`Skipping ${client.pet_name} (No future appointments found).`);
                continue;
            }
        } else {
            const lastAppointment = appointments[0];
            lastDate = new Date(lastAppointment.appointment_time);
            log(`\nProcessing ${client.pet_name} (${client.recurrence_type}). Last scheduled: ${lastDate.toISOString()}`);
        }

        // Generate subsequent appointments loop
        let iteration = 0;
        while (true) {
            iteration++;
            if (iteration > 300) {
                log('Safety break triggered');
                break;
            }

            const nextDate = getNextDate(lastDate, client.recurrence_type, client.recurrence_day);

            if (nextDate.getFullYear() > COMPLETED_YEAR) {
                log(`Stopping generation. Next date ${nextDate.toISOString()} is beyond ${COMPLETED_YEAR}.`);
                break;
            }

            log(`   -> Generated: ${nextDate.toISOString()}`);

            // Update lastDate
            lastDate = nextDate;

            newAppointments.push({
                monthly_client_id: client.id,
                pet_name: client.pet_name,
                owner_name: client.owner_name,
                whatsapp: client.whatsapp,
                service: client.service,
                price: client.price,
                appointment_time: nextDate.toISOString(),
                status: 'AGENDADO', // Default status
                extra_services: client.extra_services,
                condominium: client.condominium,
                // recurrence_type removed
                weight: client.weight,
            });
        }

        if (newAppointments.length > 0) {
            const { error: insertError } = await supabase
                .from('appointments')
                .insert(newAppointments);

            if (insertError) {
                log(`Failed to insert for ${client.pet_name}: ${JSON.stringify(insertError)}`);
            } else {
                log(`-> Created ${newAppointments.length} appointments for ${client.pet_name}.`);
                totalCreated += newAppointments.length;
            }
        } else {
            log(`-> No new appointments needed.`);
        }
    }

    log(`\n----------------------------------`);
    log(`Backfill Create Complete. Total Created: ${totalCreated}`);
}

backfill();
