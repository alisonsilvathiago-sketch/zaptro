import { createClient } from 'npm:@supabase/supabase-js'

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStatus() {
  const { data, error } = await supabase
    .from('whatsapp_instances')
    .select('instance_id, status, connection_id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5)
    
  if (error) {
    console.error("Erro:", error)
    return
  }
  
  console.log("Status Atual:")
  console.table(data)
}

checkStatus()
