import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read supabase details from existing .env or just hardcode if we know it (Wait, I can read it from .env)
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Fetching data...");
    const [ apptsRes, petMovelRes, monthlyRes, clientsRes ] = await Promise.all([
        supabase.from('appointments').select('*'),
        supabase.from('pet_movel_appointments').select('*'),
        supabase.from('monthly_clients').select('*'),
        supabase.from('clients').select('*')
    ]);
    
    const systemData = {
        dataAtual: new Date().toLocaleDateString('pt-BR'),
        agendamentos_loja: apptsRes.data || [],
        agendamentos_petmovel: petMovelRes.data || [],
        mensalistas: monthlyRes.data || [],
        clientes_avulsos: clientsRes.data || []
    };

    const str = JSON.stringify(systemData);
    console.log(`Data JSON size: ${(str.length / 1024 / 1024).toFixed(3)} MB`);
    console.log(`Row counts: Appts: ${apptsRes.data?.length}, PetMovel: ${petMovelRes.data?.length}, Monthly: ${monthlyRes.data?.length}`);

    // Test Gemini 2.5 Flash with this data
    const apiKey = 'AIzaSyCd3FJBh3wz7VkLI9VqcPi3O_H_hG5bs2I';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemInstruction = {
        parts: [
            {
                text: `Você é a IA. Dados do Sistema:\n${str}`
            }
        ]
    };

    try {
        console.log("Sending to Gemini...");
        const res = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: systemInstruction,
                contents: [{ role: 'user', parts: [{ text: "Quantos agendamentos tem hoje?" }] }],
                generationConfig: { temperature: 0.2 }
            })
        });
        
        console.log("Gemini Status:", res.status);
        const data = await res.json();
        if (data.error) {
            console.log("Gemini Error:", data.error);
        } else {
            console.log("Gemini answered:", data.candidates?.[0]?.content?.parts?.[0]?.text);
        }
    } catch (e) {
        console.error("Fetch failed", e);
    }
}
check();
