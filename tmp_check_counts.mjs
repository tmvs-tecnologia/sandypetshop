const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

async function check() {
    const today = '2026-03-16';
    console.log(`Checking appointments for ${today}...`);
    
    try {
        // Total count
        const countRes = await fetch(`${SUPABASE_URL}/rest/v1/appointments?select=count`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'count=exact'
            }
        });
        const totalCount = countRes.headers.get('content-range')?.split('/')[1];
        console.log(`Total appointments in DB: ${totalCount}`);

        const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments?appointment_time=gte.${today}T00:00:00Z&appointment_time=lte.${today}T23:59:59Z`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        const data = await response.json();
        console.log(`Found ${data.length} appointments for ${today}.`);
        data.forEach(app => {
            console.log(`- ID: ${app.id}, Pet: ${app.pet_name}, Service: ${app.service}, Status: "${app.status}", Time: ${app.appointment_time}`);
        });

        // Check if there are appointments in the "future" (after today)
        const futureRes = await fetch(`${SUPABASE_URL}/rest/v1/appointments?appointment_time=gt.${today}T23:59:59Z&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'count=exact'
            }
        });
        const futureCount = futureRes.headers.get('content-range')?.split('/')[1];
        console.log(`Appointments after ${today}: ${futureCount}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

check();
