import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const today = '2026-03-16';
    console.log(`Checking appointments for ${today}...`);
    
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_time', `${today}T00:00:00Z`)
        .lte('appointment_time', `${today}T23:59:59Z`);
        
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Found ${data.length} appointments.`);
    data.forEach(app => {
        console.log(`- ${app.pet_name} (${app.service}) at ${app.appointment_time}`);
    });

    const { data: mc, error: mcError } = await supabase
        .from('monthly_clients')
        .select('*')
        .eq('is_active', true);

    if (mcError) {
        console.error('Error fetching monthly clients:', mcError);
    } else {
        console.log(`Found ${mc.length} active monthly clients.`);
    }
}

check();
