const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

async function check() {
    const today = '2026-03-16';
    console.log(`Checking appointments for ${today} using native fetch...`);
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments?appointment_time=gte.${today}T00:00:00Z&appointment_time=lte.${today}T23:59:59Z`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} appointments.`);
        data.forEach(app => {
            console.log(`- ${app.pet_name} (${app.service}) at ${app.appointment_time}`);
        });

        const mcResponse = await fetch(`${SUPABASE_URL}/rest/v1/monthly_clients?is_active=eq.true`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (mcResponse.ok) {
            const mc = await mcResponse.json();
            console.log(`Found ${mc.length} active monthly clients.`);
        }

    } catch (error) {
        console.error('Error during fetch:', error);
    }
}

check();
