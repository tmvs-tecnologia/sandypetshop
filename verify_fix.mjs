const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

async function verify() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`Verifying records from ${windowStart} onwards...`);
    
    try {
        const countRes = await fetch(`${SUPABASE_URL}/rest/v1/appointments?appointment_time=gte.${windowStart}&select=id`, {
            method: 'HEAD',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'count=exact'
            }
        });
        const totalCount = parseInt(countRes.headers.get('content-range')?.split('/')[1] || "0");
        console.log(`Appointments in window: ${totalCount}`);

        const pmCountRes = await fetch(`${SUPABASE_URL}/rest/v1/pet_movel_appointments?appointment_time=gte.${windowStart}&select=id`, {
            method: 'HEAD',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'count=exact'
            }
        });
        const pmTotalCount = parseInt(pmCountRes.headers.get('content-range')?.split('/')[1] || "0");
        console.log(`Pet Movel appointments in window: ${pmTotalCount}`);

        const total = totalCount + pmTotalCount;
        console.log(`Total records to be fetched: ${total}`);
        
        if (total < 1000) {
            console.log("SUCCESS: Total records within window is well below 1000. Truncation fixed.");
        } else {
            console.warn("WARNING: Still close to or above 1000 records. Consider narrowing the window.");
        }

    } catch (error) {
        console.error('Error during verification:', error);
    }
}

verify();
