import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xilavhopbmjhsovvybza.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpbGF2aG9wYm1qaHNvdnZ5YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDA2MTgsImV4cCI6MjA4OTcxNjYxOH0.DaGBDdCplBebKEO9epY2L5ZPRvslktQzwo072o7rRwI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
    console.log('Testando invocação da Edge Function via supabase-js...');
    try {
        const { data, error } = await supabase.functions.invoke('focus-nfe', {
            body: { 
                reference_id: '02017bc8-2c36-4d98-9a80-87aae7a2269e', 
                reference_type: 'appointment' 
            }
        });

        if (error) {
            console.error('Erro retornado pela chamada invoke:', error);
            if (error.context) {
                console.error('Contexto do erro:', await error.context.text());
            }
        } else {
            console.log('Sucesso! Dados retornados:', data);
        }
    } catch (e) {
        console.error('Exceção capturada:', e);
    }
}

testEdgeFunction();
