const SUPABASE_URL = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

async function check() {
    try {
        console.log("--- DAYCARE ENROLLMENTS ---");
        const daycareRes = await fetch(`${SUPABASE_URL}/rest/v1/daycare_enrollments?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const daycare = await daycareRes.json();
        console.log(`Total daycare records: ${daycare.length}`);
        daycare.forEach(d => {
            console.log(`- Pet: ${d.pet_name}, Price: ${d.total_price}, Status: ${d.status}, Date: ${d.created_at}`);
        });

        console.log("\n--- HOTEL REGISTRATIONS ---");
        const hotelRes = await fetch(`${SUPABASE_URL}/rest/v1/hotel_registrations?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const hotel = await hotelRes.json();
        console.log(`Total hotel records: ${hotel.length}`);
        hotel.forEach(h => {
            console.log(`- Pet: ${h.pet_name}, Price: ${h.total_services_price}, Status: ${h.status}, Check-in: ${h.check_in_date}`);
        });
    } catch (e) {
        console.error(e);
    }
}

check();
