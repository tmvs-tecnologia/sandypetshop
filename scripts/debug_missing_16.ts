
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAppointments() {
    const targetDateStr = '2026-03-16';
    console.log(`Debugging appointments for ${targetDateStr}...`);

    // Simulate the logic in App.tsx
    // 1. Setup Date object for 16/03/2026
    // Note: In Node, new Date('2026-03-16') is UTC midnight. 
    // In App.tsx, selectedDate is likely derived from local time or a calendar click which usually sets local midnight.
    // Let's simulate "Local Midnight" logic as best as we can in Node by being explicit.
    
    // We want to query the range that covers 2026-03-16 in Brasilia Time (UTC-3).
    // 16/03 00:00 BRT = 16/03 03:00 UTC
    // 16/03 23:59 BRT = 17/03 02:59 UTC
    
    // App.tsx logic:
    // startOfDay = selectedDate (00:00:00)
    // queryStart = startOfDay - 4 hours
    // queryEnd = endOfDay + 4 hours
    
    // Let's define the query window manually to see what we catch.
    const startIso = '2026-03-15T20:00:00.000Z'; // Well before midnight BRT
    const endIso = '2026-03-17T10:00:00.000Z';   // Well after end of day BRT

    console.log(`Querying range: ${startIso} to ${endIso}`);

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, appointment_time, service, pet_name, status')
        .gte('appointment_time', startIso)
        .lte('appointment_time', endIso);

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`Found ${appointments?.length} appointments in raw range.`);
    
    appointments?.forEach(appt => {
        const d = new Date(appt.appointment_time);
        console.log(`\nID: ${appt.id}`);
        console.log(`Service: ${appt.service}`);
        console.log(`Status: ${appt.status}`);
        console.log(`DB Time (ISO): ${appt.appointment_time}`);
        console.log(`Parsed Date (Local Node): ${d.toString()}`);
        console.log(`Parsed Date (ISO): ${d.toISOString()}`);
        console.log(`UTC Hours: ${d.getUTCHours()}`);
        // Simulate the Frontend Filter Logic
        // In App.tsx: 
        // const isSameDate = apptYear === selectedYear && apptMonth === selectedMonth && apptDate === selectedDay;
        // The frontend compares the appointment date parts (in browser local time) with selected date parts.
        
        // If the browser is in UTC-3:
        // 16/03 10:00 BRT is stored as 16/03 13:00 UTC.
        // new Date('2026-03-16T13:00:00Z') in browser -> 16/03 10:00.
        // Date matches 16. Match!
        
        // If the appointment was stored INCORRECTLY as 16/03 10:00 UTC (maybe 07:00 BRT? or just raw string?)
        // If stored as 2026-03-16T10:00:00+00
        // Browser reads: 16/03 07:00 BRT. Date matches 16. Match!
        
        // But what if it's stored as previous day late night?
        // e.g. 15/03 22:00 BRT = 16/03 01:00 UTC.
        // Stored as 16/03 01:00 UTC.
        // Browser reads 15/03 22:00. Date is 15. NO MATCH for 16th.
    });
}

debugAppointments();
