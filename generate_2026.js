require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching active monthly clients...');
    const { data: clients, error: clientsError } = await supabase
        .from('monthly_clients')
        .select('*')
        .eq('is_active', true);

    if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return;
    }

    console.log(`Found ${clients.length} active clients.`);

    let totalInserted = 0;
    const endDate = new Date('2026-12-31T23:59:59Z');

    for (const client of clients) {
        // Determine the service to insert:
        // Some are '4x Banho', some '2x Banho', some 'Banho (Pet Móvel)'
        // The previous inserts used standard names from the client's original service names,
        // or mapped '4x Banho (Pet Móvel)' -> 'Banho (Pet Móvel)'
        // Looking at the standard: if the string includes '(Pet Móvel)', usually we insert 'Banho (Pet Móvel)'
        // If it's just 'Banho' or '2x Banho', the frontend usually just shows '2x Banho' or 'Banho'.
        // Wait, the client's `service` is exactly what was used or mapped.
        // Let's create a mapped service name:
        let serviceName = client.service;
        if (serviceName.includes('Pet Móvel')) {
            serviceName = 'Banho (Pet Móvel)';
        } else if (serviceName.toLowerCase().includes('banho')) {
            // Keep original or strip "4x / 2x"? 
            // Look at earlier query, Bud was 'Banho (Pet Móvel)', Luna was '2x Banho'.
            // We'll just use the client.service if we can't cleanly map, but let's strip "4x " and "2x " if we want to be exact? 
            // Luna was "2x Banho". So we keep it exactly as it is unless it's Pet Móvel.
            if (!serviceName.includes('2x') && !serviceName.includes('4x')) {
                // just leave it
            }
        }

        // Fetch existing appointments for this client
        const { data: existingApps, error: appsError } = await supabase
            .from('appointments')
            .select('appointment_time')
            .eq('monthly_client_id', client.id)
            .order('appointment_time', { ascending: false });

        if (appsError) {
            console.error(`Error fetching appointments for ${client.pet_name}:`, appsError);
            continue;
        }

        let latestDate = null;
        let existingDates = new Set();

        if (existingApps && existingApps.length > 0) {
            latestDate = new Date(existingApps[0].appointment_time);
            existingApps.forEach(a => {
                existingDates.add(new Date(a.appointment_time).toISOString().split('T')[0]);
            });
        } else {
            // Fallback if no appointments at all: Start from today or nearest future day
            latestDate = new Date();
            // adjust to the nearest requested day
            // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
            let currentDay = latestDate.getDay();
            let targetDay = client.recurrence_day;
            let daysToAdd = targetDay - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7;
            latestDate.setDate(latestDate.getDate() + daysToAdd);

            // set time
            latestDate.setHours(client.recurrence_time || 10, 0, 0, 0);
        }

        let nextDate = new Date(latestDate);
        const toInsert = [];

        while (true) {
            if (nextDate > endDate) {
                break;
            }

            // Only generate if the date is in the future (from today roughly, or we just generate all missing up to Dec)
            // Actually we just generate everything greater than today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (nextDate >= today) {
                const dateString = nextDate.toISOString().split('T')[0];
                if (!existingDates.has(dateString)) {
                    toInsert.push({
                        appointment_time: nextDate.toISOString(),
                        pet_name: client.pet_name,
                        pet_breed: client.pet_breed,
                        owner_name: client.owner_name,
                        owner_address: client.owner_address,
                        whatsapp: client.whatsapp,
                        service: serviceName,
                        weight: client.weight,
                        price: client.price ? (client.price / (client.recurrence_type === 'weekly' ? 4 : 2)) : 0, // Approx price per appointment
                        status: 'pending',
                        monthly_client_id: client.id,
                        condominium: client.condominium,
                        extra_services: client.extra_services
                    });
                    existingDates.add(dateString); // prevent duplicates in the same run
                }
            }

            if (client.recurrence_type === 'weekly') {
                nextDate.setDate(nextDate.getDate() + 7);
            } else if (client.recurrence_type === 'bi-weekly') {
                nextDate.setDate(nextDate.getDate() + 14);
            } else {
                // default weekly
                nextDate.setDate(nextDate.getDate() + 7);
            }
        }

        if (toInsert.length > 0) {
            console.log(`Inserting ${toInsert.length} appointments for ${client.pet_name} (${client.recurrence_type})...`);
            const { error: insertError } = await supabase
                .from('appointments')
                .insert(toInsert);

            if (insertError) {
                console.error(`Error inserting for ${client.pet_name}:`, insertError);
            } else {
                totalInserted += toInsert.length;
            }
        }
    }

    console.log(`Finished! Inserted a total of ${totalInserted} appointments.`);
}

main().catch(console.error);
