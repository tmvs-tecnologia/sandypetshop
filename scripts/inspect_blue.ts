
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectBlue() {
    // Get client
    const { data: clients, error: clientError } = await supabase
        .from('monthly_clients')
        .select('*')
        .ilike('pet_name', '%Blue%');

    if (clientError) {
        console.error(clientError);
        return;
    }

    if (!clients || clients.length === 0) {
        console.log('Blue not found');
        return;
    }

    const blue = clients[0];
    console.log('Client Blue:', { id: blue.id, pet_name: blue.pet_name, price: blue.price });

    // Get recent appointments
    const { data: appts, error: apptError } = await supabase
        .from('appointments')
        .select('id, appointment_time, price, status')
        .eq('monthly_client_id', blue.id)
        .gte('appointment_time', '2026-01-01')
        .limit(5);

    if (apptError) {
        console.error(apptError);
        return;
    }

    console.log('Recent 2026 Appointments:', appts);
}

inspectBlue();
