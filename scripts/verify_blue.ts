
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyBlue() {
    const { data: clients, error: clientError } = await supabase
        .from('monthly_clients')
        .select('*')
        .ilike('pet_name', '%Blue%');

    if (clients && clients.length > 0) {
        console.log('Client Price:', clients[0].price);

        const { data: appts } = await supabase
            .from('appointments')
            .select('price')
            .eq('monthly_client_id', clients[0].id)
            .gte('appointment_time', '2026-01-01')
            .limit(5);

        console.log('Appt Prices (first 5):', appts);
    }
}

verifyBlue();
