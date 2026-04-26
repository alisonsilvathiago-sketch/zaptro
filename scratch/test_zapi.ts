import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = "https://zvqsqcxtowqoyqxjapoq.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cXNxY3h0b3dxb3lxeGphcG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDMzNTksImV4cCI6MjA5MTI3OTM1OX0.P6QfkVNtJA8dAVwOPTYlA8U9GYFn2xxYz4Pl_dpXCqQ"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runTest() {
  console.log("--- TESTANDO GATEWAY Z-API ---")
  
  // Testando ação de status (que está dando erro 400)
  console.log("Chamando ação: status...")
  const { data, error } = await supabase.functions.invoke('whatsapp-gateway', {
    body: { action: 'status' }
  })

  if (error) {
    console.error("❌ ERRO DA EDGE FUNCTION:", error)
  } else {
    console.log("🛰️ RESPOSTA COMPLETA:", JSON.stringify(data, null, 2))
    
    if (data.error === "your client-token is not configured") {
      console.log("\n⚠️ CONCLUSÃO: O Client-Token (Security Token) ainda não está sendo reconhecido ou falta configurar na Z-API.")
    } else if (data.success) {
      console.log("\n✅ SUCESSO! A comunicação com a Z-API está funcionando.")
    }
  }
}

runTest()
