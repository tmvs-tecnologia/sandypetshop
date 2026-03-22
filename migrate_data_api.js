import { createClient } from '@supabase/supabase-js';
import fs from 'fs';


const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing supabase keys in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const inputFile = `C:\\Users\\henri\\.gemini\\antigravity\\brain\\a72a158d-a27e-452a-90f6-3dd97d7e7b96\\.system_generated\\steps\\45\\output.txt`;

const content = fs.readFileSync(inputFile, 'utf-8');
const data = JSON.parse(content);
const resultStr = data.result;

const match = resultStr.match(/<untrusted-data-[^>]+>\s*(\[\{.*\}\])\s*<\/untrusted-data-[^>]+>/s);
if(!match) {
  console.error("Failed to parse data");
  process.exit(1);
}

const parsedArray = JSON.parse(match[1]);
const db = parsedArray[0].full_db_dump;

const tableOrder = [
  'monthly_clients',
  'clients',
  'pets',
  'appointments',
  'pet_movel_appointments',
  'daycare_enrollments',
  'daycare_diary_entries',
  'hotel_registrations',
  'feriados',
  'service_prices',
  'disabled_dates',
  'controle_bloqueio_chat',
  'notifications'
];

async function run() {
  let totalInserted = 0;
  for (const table of tableOrder) {
    const rows = db[table] || [];
    if (rows.length === 0) continue;
    
    console.log(`Inserting ${rows.length} rows into ${table}...`);
    
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      
      const { data, error } = await supabase.from(table).insert(chunk);
      if (error) {
        console.error(`Error inserting into ${table}:`, error.message, error.details);
      } else {
        console.log(`Successfully inserted chunk of ${chunk.length} into ${table}`);
        totalInserted += chunk.length;
      }
    }
  }
  console.log(`Migration Complete! Total rows inserted: ${totalInserted}`);
}

run();
