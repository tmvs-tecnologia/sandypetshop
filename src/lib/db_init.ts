import { supabase } from '@/supabaseClient';

export async function createMaintenanceLogsTable() {
    try {
        const { error } = await supabase.rpc('create_maintenance_logs_table_if_not_exists');
        if (error) {
            // Fallback: Try to query it to see if it exists, if not we might need to rely on SQL editor
            // Since we can't run raw SQL from client easily without a specific RPC.
            // However, we can check if it exists by selecting from it.
            const { error: checkError } = await supabase.from('maintenance_logs').select('id').limit(1);
            if (checkError && checkError.code === '42P01') { // undefined_table
                 console.error("Table 'maintenance_logs' does not exist and RPC is missing. Please run the SQL manually.");
                 return false;
            }
        }
        return true;
    } catch (e) {
        console.error("Error checking/creating maintenance_logs:", e);
        return false;
    }
}
