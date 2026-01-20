import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock constants for verification
const DAYCARE_EXTRA_SERVICES_PRICES = {
  pernoite: 50,
  banho_tosa: 80,
  so_banho: 40,
  adestrador: 60,
  despesa_medica: 100,
  dia_extra: 30,
};

const calculateExtrasValue = (extras, type) => {
    if (!extras || typeof extras !== 'object') return 0;
    let total = 0;
    // Simple logic matching the component
    if (type === 'daycare') {
        Object.entries(extras).forEach(([key, value]) => {
            if (value) {
                const price = DAYCARE_EXTRA_SERVICES_PRICES[key] || 0;
                total += price;
            }
        });
    }
    return total;
};

async function verifyReset() {
    console.log('Verifying Reset Logic...');
    
    // 1. Create a dummy daycare record with extras
    const { data: record, error: createError } = await supabase
        .from('daycare_enrollments')
        .insert({
            tutor_name: 'Test Reset Bot',
            pet_name: 'ResetTester',
            address: 'Test Address',
            contact_phone: '123456789',
            status: 'Ativo',
            contracted_plan: '4x_month',
            total_price: 500, // Base 300 + 200 extras
            extra_services: { pernoite: true, banho_tosa: true, adestrador: false } // 50 + 80 = 130. Wait, 500 total? Let's say base is 370.
        })
        .select()
        .single();
        
    if (createError) {
        console.error('Failed to create test record:', createError);
        return;
    }
    
    console.log('Created test record:', record.id, 'Total:', record.total_price, 'Extras:', record.extra_services);
    
    // 2. Simulate Reset Logic (Stripped down version of MonthlyResetManager)
    const extrasVal = calculateExtrasValue(record.extra_services, 'daycare'); // 50+80 = 130
    console.log('Calculated extras value to remove:', extrasVal);
    
    const newPrice = Math.max(0, Number(record.total_price) - extrasVal);
    console.log('New Price should be:', newPrice);
    
    // 3. Perform Update
    const { error: updateError } = await supabase
        .from('daycare_enrollments')
        .update({ extra_services: {}, total_price: newPrice })
        .eq('id', record.id);
        
    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log('Update successful.');
    }
    
    // 4. Verify Update
    const { data: updated } = await supabase
        .from('daycare_enrollments')
        .select('*')
        .eq('id', record.id)
        .single();
        
    console.log('Updated Record:', updated.id, 'Total:', updated.total_price, 'Extras:', updated.extra_services);
    
    if (updated.total_price === newPrice && (!updated.extra_services || Object.keys(updated.extra_services).length === 0)) {
        console.log('SUCCESS: Reset logic verified.');
    } else {
        console.error('FAILURE: Record not updated as expected.');
    }
    
    // Cleanup
    await supabase.from('daycare_enrollments').delete().eq('id', record.id);
}

verifyReset();
