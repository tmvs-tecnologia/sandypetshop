
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
    console.log('Inspecting clients...');
    // Fetch all to search manually in memory to avoid URL encoding issues or specific filter quirks
    const { data: clients, error } = await supabase
        .from('monthly_clients')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!clients) {
        console.log('No clients found');
        return;
    }

    const targets = ['Blue', 'Princesa'];
    const found = clients.filter(c => targets.some(t => c.pet_name.trim().toLowerCase().includes(t.toLowerCase())));

    console.log('Found clients:', found.length);
    found.forEach(c => {
        console.log(`ID: ${c.id}`);
        console.log(`Name: '${c.pet_name}'`);
        console.log(`Recurrence: ${c.recurrence_type}`);
        console.log(`Day: ${c.recurrence_day}`);
        console.log(`Time: ${c.recurrence_time}`);
        console.log('---');
    });
}

inspect();
