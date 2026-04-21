-- Zaptro — modelo sugerido para integrações (multi-tenant). Executar no projeto Supabase do Zaptro.
-- Ajustar nomes de schema se a vossa convenção for outra.

-- Conexões outbound (APIs que o Zaptro chama: NF-e, ERP, etc.)
CREATE TABLE IF NOT EXISTS public.zaptro_integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.whatsapp_companies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  auth_type text NOT NULL CHECK (auth_type IN ('api_key', 'oauth2', 'webhook_only', 'none')),
  base_url text,
  access_token text,
  refresh_token text,
  api_key_encrypted text,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zaptro_int_conn_company ON public.zaptro_integration_connections(company_id);

-- Webhooks de entrada (configuração por fonte)
CREATE TABLE IF NOT EXISTS public.zaptro_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.whatsapp_companies(id) ON DELETE CASCADE,
  source text NOT NULL,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, source)
);

-- Log de entregas (auditoria)
CREATE TABLE IF NOT EXISTS public.zaptro_webhook_inbound_log (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL,
  source text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  http_status smallint,
  payload_hash text,
  error text,
  processing_ms int
);

CREATE INDEX IF NOT EXISTS idx_zaptro_wh_in_company ON public.zaptro_webhook_inbound_log(company_id, received_at DESC);

-- Mapeamento de campos (opcional — “Zapier interno”)
CREATE TABLE IF NOT EXISTS public.zaptro_integration_field_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.whatsapp_companies(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_key text NOT NULL,
  canonical_key text NOT NULL,
  UNIQUE (company_id, source, external_key)
);

COMMENT ON TABLE public.zaptro_integration_connections IS 'Credenciais e estado de integrações por empresa.';
COMMENT ON TABLE public.zaptro_webhook_endpoints IS 'Segredos e rotas lógicas para POST /api/v1/webhooks/inbound/:source';
COMMENT ON TABLE public.zaptro_webhook_inbound_log IS 'Trilha de auditoria de webhooks recebidos.';
COMMENT ON TABLE public.zaptro_integration_field_maps IS 'Mapeamento campo externo → evento canónico Zaptro.';
