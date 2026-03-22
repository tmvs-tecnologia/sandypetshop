import fs from 'fs';

const inputFile = `C:\\Users\\henri\\.gemini\\antigravity\\brain\\a72a158d-a27e-452a-90f6-3dd97d7e7b96\\.system_generated\\steps\\200\\output.txt`;
const outputFile = `C:\\Users\\henri\\OneDrive\\Documentos\\Henrique\\Projetos Sistemas\\Sandy's PetShop\\git\\sandypetshop\\schema_antigo.sql`;

const content = fs.readFileSync(inputFile, 'utf-8');
const data = JSON.parse(content);
const tables = data.tables;

let sql = '';

for (const table of tables) {
    const tableName = table.name.replace('public.', '');
    sql += `-- Table: public.${tableName}\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;

    const columnDefs = [];
    for (const col of table.columns) {
        let def = `  ${col.name} ${col.data_type === 'ARRAY' ? col.format.replace('_', '') + '[]' : col.data_type}`;
        
        if (col.options?.includes('identity')) {
             def += ` GENERATED ${col.identity_generation} AS IDENTITY`;
        }

        if (col.options && !col.options.includes('nullable') && !col.options.includes('identity')) {
            def += ` NOT NULL`;
        }

        if (col.default_value !== undefined) {
             // For strings like 'Pendente'::text we can just use the exact string
             def += ` DEFAULT ${col.default_value}`;
        }
        
        if (col.options?.includes('unique')) {
             def += ` UNIQUE`;
        }

        // Add check constraint if exists
        if (col.check) {
            def += ` CHECK (${col.check})`;
        }

        columnDefs.push(def);
    }

    if (table.primary_keys && table.primary_keys.length > 0) {
        columnDefs.push(`  PRIMARY KEY (${table.primary_keys.join(', ')})`);
    }

    sql += columnDefs.join(',\n');
    sql += `\n);\n\n`;
}

// Second pass for foreign keys
sql += `-- Foreign Keys\n`;
for (const table of tables) {
     const tableName = table.name.replace('public.', '');
     if (table.foreign_key_constraints && table.foreign_key_constraints.length > 0) {
          for (const fk of table.foreign_key_constraints) {
               // Source format is public.tablename.colname
               const parts = fk.source.split('.');
               const sourceCol = parts[parts.length - 1];
               
               const targetParts = fk.target.split('.');
               const targetTable = targetParts[1];
               const targetCol = targetParts[2];
               
               sql += `ALTER TABLE public.${tableName}\n`;
               sql += `  ADD CONSTRAINT ${fk.name} FOREIGN KEY (${sourceCol}) REFERENCES public.${targetTable} (${targetCol}) ON DELETE CASCADE;\n\n`;
          }
     }
}

// Optional RLS hints
sql += `-- Remember to re-configure RLS Policies manually in the new project dashboard for full security.\n`;

fs.writeFileSync(outputFile, sql);
console.log('Schema dump created at:', outputFile);
