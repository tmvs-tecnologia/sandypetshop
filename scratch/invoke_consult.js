const url = "https://xilavhopbmjhsovvybza.supabase.co/functions/v1/focus-nfe";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI";

console.log("Invocando a Edge Function focus-nfe na nuvem para atualizar a nota: monthly_client-b44675ee-1e43-49e2-836e-05a661926107-1780429361082");

fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({
        action: 'consult',
        focus_nfe_reference: 'monthly_client-b44675ee-1e43-49e2-836e-05a661926107-1780429361082'
    })
})
.then(async res => {
    console.log("HTTP Status:", res.status);
    const json = await res.json();
    console.log("Response:\n", JSON.stringify(json, null, 2));
})
.catch(err => console.error("Error:", err));
