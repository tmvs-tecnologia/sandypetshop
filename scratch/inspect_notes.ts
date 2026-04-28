
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function inspect() {
  const { data, error } = await supabase
    .from('fiscal_notes')
    .select('id, focus_nfe_reference, reference_id')
    .limit(5);

  console.log(JSON.stringify(data, null, 2));
}

inspect();
