
const url = "https://xilavhopbmjhsovvybza.supabase.co/rest/v1/fiscal_notes?select=*&order=created_at.desc&limit=3";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI";

fetch(url, {
    method: 'GET',
    headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
    }
})
.then(res => res.json())
.then(data => {
    console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
