
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://phfzqvmofnqwxszdgjch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZnpxdm1vZm5xd3hzemRnamNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE1MzIsImV4cCI6MjA3NzI1NzUzMn0.bWL2t6XGQJ5OmNxAB8mLjAzY5uF1fVzheMNksVJ2Dkk';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function listClients() {
    const { data: clients, error } = await supabase.from('monthly_clients').select('*');
    if (error) { console.error(error); return; }
    console.log('--- Clients ---');
    clients.forEach(c => {
        console.log(`ID: ${c.id}, Owner: ${c.owner_name}, Pet: ${c.pet_name}, Service: '${c.service}', Price: ${c.price}`);
    });
    console.log('---------------');
}

listClients();
