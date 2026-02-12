
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixBlue() {
    console.log('Finding Blue...');
    const { data: clients, error: clientError } = await supabase
        .from('monthly_clients')
        .select('*')
        .ilike('pet_name', '%Blue%');

    if (clientError || !clients || clients.length === 0) {
        console.error('Error finding Blue:', clientError);
        return;
    }

    const blue = clients[0];
    console.log(`Updating Blue (${blue.id}) price from ${blue.price} to 60.00`);

    // 1. Update Monthly Client Record
    const { error: updateClientError } = await supabase
        .from('monthly_clients')
        .update({ price: 60.00 })
        .eq('id', blue.id);

    if (updateClientError) {
        console.error('Failed to update client price:', updateClientError);
    } else {
        console.log('Client price updated.');
    }

    // 2. Update 2026 Appointments
    // We only want to update future ones or ones created by backfill script?
    // Probably all future ones to be safe and consistent.
    const { data: appts, error: apptError } = await supabase
        .from('appointments')
        .update({ price: 60.00 })
        .eq('monthly_client_id', blue.id)
        .gte('appointment_time', '2026-01-01')
        .select();

    if (apptError) {
        console.error('Failed to update appointments:', apptError);
    } else {
        console.log(`Updated ${appts?.length} appointments for Blue to 60.00.`);
    }
}

fixBlue();
