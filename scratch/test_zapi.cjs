const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = "https://zvqsqcxtowqoyqxjapoq.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cXNxY3h0b3dxb3lxeGphcG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDMzNTksImV4cCI6MjA5MTI3OTM1OX0.P6QfkVNtJA8dAVwOPTYlA8U9GYFn2xxYz4Pl_dpXCqQ"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runTest() {
  console.log("--- TESTANDO GATEWAY Z-API (NODE) ---")
  
  try {
    const { data, error } = await supabase.functions.invoke('whatsapp-gateway', {
      body: { action: 'status' }
    })

    if (error) {
      console.error("❌ ERRO DA EDGE FUNCTION:", error)
    } else {
      console.log("🛰️ RESPOSTA COMPLETA:", JSON.stringify(data, null, 2))
    }
  } catch (err) {
    console.error("❌ ERRO NA CHAMADA:", err.message)
  }
}

runTest()
