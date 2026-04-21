const supabaseUrl = "https://zvqsqcxtowqoyqxjapoq.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cXNxY3h0b3dxb3lxeGphcG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDMzNTksImV4cCI6MjA5MTI3OTM1OX0.P6QfkVNtJA8dAVwOPTYlA8U9GYFn2xxYz4Pl_dpXCqQ"

async function runTest() {
  console.log("--- TESTANDO GATEWAY Z-API VIA FETCH DIRETO ---")
  
  const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-gateway`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'status' })
  })

  console.log("Status:", response.status)
  const body = await response.text()
  console.log("Response Body:", body)
}

runTest()
