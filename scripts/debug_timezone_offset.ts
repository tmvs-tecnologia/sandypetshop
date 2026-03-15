
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env
if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://phfzqvmofnqwxszdgjch.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificAppointments() {
    console.log('Checking appointments for 2026-03-17 to debug timezone offset...');

    // Fetch appointments for that day
    const targetDateStart = '2026-03-17T00:00:00';
    const targetDateEnd = '2026-03-17T23:59:59';
    
    // We suspect the 11h appointment is showing as 14h (3h difference -> UTC vs UTC-3)
    
    const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_time', '2026-03-17T00:00:00') // Broad filter
        .lt('appointment_time', '2026-03-18T00:00:00');
        
    const { data: mobileAppts } = await supabase
        .from('pet_movel_appointments')
        .select('*')
        .gte('appointment_time', '2026-03-17T00:00:00')
        .lt('appointment_time', '2026-03-18T00:00:00');

    const all = [...(appts || []), ...(mobileAppts || [])];
    
    console.log(`Found ${all.length} appointments.`);
    
    all.forEach(a => {
        const dbTime = a.appointment_time;
        const d = new Date(dbTime);
        
        console.log(`\nID: ${a.id}`);
        console.log(`Pet: ${a.pet_name} / Service: ${a.service}`);
        console.log(`DB String (ISO): ${dbTime}`);
        console.log(`Parsed Date .toString(): ${d.toString()}`);
        console.log(`Parsed Date .toISOString(): ${d.toISOString()}`);
        console.log(`Local Hours (getHours): ${d.getHours()}`);
        console.log(`UTC Hours (getUTCHours): ${d.getUTCHours()}`);
        
        // Analyze the discrepancy
        // If DB has 14:00:00+00 (UTC), getHours in UTC-3 system will be 11.
        // If DB has 11:00:00+00 (UTC), getHours in UTC-3 system will be 8.
        // If user sees 14h blocked for an 11h appointment, it means:
        // Real time is 11h. 
        // System thinks it is 14h.
        // This suggests the system is using getUTCHours() (14) instead of getHours() (11) OR
        // The DB saved it as 14h Local time treated as UTC?
    });
}

checkSpecificAppointments();
