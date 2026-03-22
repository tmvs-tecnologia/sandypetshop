import fs from 'fs';

const inputFile = `C:\\Users\\henri\\.gemini\\antigravity\\brain\\a72a158d-a27e-452a-90f6-3dd97d7e7b96\\.system_generated\\steps\\45\\output.txt`;
const outputFile = `C:\\Users\\henri\\OneDrive\\Documentos\\Henrique\\Projetos Sistemas\\Sandy's PetShop\\git\\sandypetshop\\supabase\\inserts_export.sql`;

const content = fs.readFileSync(inputFile, 'utf-8');
const data = JSON.parse(content);
const resultStr = data.result;

// Match the array inside <untrusted-data-xxx> tags
const match = resultStr.match(/<untrusted-data-[^>]+>\s*(\[\{.*\}\])\s*<\/untrusted-data-[^>]+>/s);
if (!match) {
  console.error("Could not find array in the result string.", resultStr.substring(0, 200));
  process.exit(1);
}

let db;
try {
  const parsedArray = JSON.parse(match[1]);
  // The first element has our db dump object
  db = parsedArray[0].full_db_dump;

} catch (e) {
  console.error("Failed to parse JSON", e);
  process.exit(1);
}

// Table order based on foreign keys
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

let sql = '-- Dump de Inserts para Migração de Projeto Supabase\\n\\n';
let totalRows = 0;

// Set constraints deferred if possible, but standard inserts usually work if ordered correctly.
for (const tableName of tableOrder) {
  const rows = db[tableName] || [];
  if (rows.length === 0) continue;
  
  sql += `-- Table: public.${tableName} (${rows.length} rows)\\n`;
  
  for (const row of rows) {
    const keys = Object.keys(row);
    const values = keys.map(k => {
      let val = row[k];
      if (val === null) return 'NULL';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      if (typeof val === 'number') return val;
      if (typeof val === 'object') {
         // Some arrays are postgres arrays rather than json, but pg treats JSON string literals casted as acceptable if inserted,
         // wait, arrays like text[] need formatting like ARRAY['a','b'] or '{a,b}'. 
         // If it's a JSON string, replace ' with ''
         if (Array.isArray(val)) {
            // For simple string arrays that supabase returns
            // It might be better to just dump as JSON and cast if needed, but postgres usually accepts '{a,b}' format or JSON arrays for JSONB.
            // When querying via json_build_object, Postgres JSONifies text arrays as JSON arrays `["a", "b"]`.
            // When inserting into a text[] column, '["a", "b"]' works IF the column is JSONB, but fails if text[].
            // To be safe, we can formulate postgres arrays format.
            return `'{${val.map(v => typeof v === "string" ? `"${v.replace(/"/g, '\\\\"')}"` : v).join(',')}}'`;
         } else {
             return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
         }
      }
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    
    // Create insert command
    sql += `INSERT INTO public.${tableName} (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${values.join(', ')});\\n`;
    totalRows++;
  }
  sql += '\\n';
}

fs.writeFileSync(outputFile, sql);
console.log(`Successfully wrote ${totalRows} INSERTS to ${outputFile}`);
