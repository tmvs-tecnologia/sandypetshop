const SUPABASE_URL = 'https://xilavhopbmjhsovvybza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

async function check() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/daycare_enrollments?limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        const data = await response.json();
        console.log("One daycare enrollment record keys:", Object.keys(data[0] || {}));
        console.log("Full record data:", data[0]);
    } catch (error) {
        console.error('Error:', error);
    }
}

check();
