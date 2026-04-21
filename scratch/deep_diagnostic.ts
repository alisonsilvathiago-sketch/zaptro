import { createClient } from 'npm:@supabase/supabase-js'

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnostic() {
  console.log("--- INICIANDO DIAGNÓSTICO ZAPTRO ---")
  
  // 1. Testa a Edge Function diretamente
  const { data: ping, error: pingErr } = await supabase.functions.invoke('evolution-api', {
    body: { action: 'ping' }
  })
  
  if (pingErr) {
    console.error("❌ ERRO NO PING DA EDGE FUNCTION:", pingErr)
    return
  }
  console.log("✅ EDGE FUNCTION ONLINE:", ping)

  // 2. Busca a instância no banco
  const { data: inst } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .single()
    
  if (!inst) {
    console.error("❌ NENHUMA INSTÂNCIA ENCONTRADA NO BANCO.")
    return
  }
  console.log("✅ INSTÂNCIA ENCONTRADA:", inst.instance_id)

  // 3. Tenta buscar o QR Code REAL e ver o JSON de erro da Evolution
  console.log("🔄 SOLICITANDO QR CODE À EVOLUTION...")
  const { data: qr, error: qrErr } = await supabase.functions.invoke('evolution-api', {
    body: { 
      action: 'get-connect',
      instanceName: inst.instance_id
    }
  })

  if (qrErr) {
    console.error("❌ ERRO AO INVOCAR GET-CONNECT:", qrErr)
  } else {
    console.log("🛰️ RESPOSTA DA EVOLUTION:", JSON.stringify(qr).slice(0, 300) + "...")
    if (qr.success === false) {
      console.warn("⚠️ EVOLUTION REPORTOU FALHA:", qr.error || qr.message)
    }
    if (qr.qrcode || qr.base64) {
      console.log("✨ QR CODE ENCONTRADO NO PAYLOAD!")
    } else {
      console.error("💀 PAYLOAD VEIO VAZIO (SEM QR CODE).")
    }
  }
}

diagnostic()
