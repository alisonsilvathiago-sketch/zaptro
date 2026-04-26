-- Correção: erros ao guardar fluxo — colunas «options» ou «welcome_message» em falta no schema cache
-- Rode UMA VEZ no Supabase → SQL Editor (role postgres).
-- Depois do ALTER, o PostgREST deve recarregar o cache (NOTIFY abaixo).

ALTER TABLE public.whatsapp_automation_flows
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.whatsapp_automation_flows
  ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT '';

-- Recarrega cache do API (PostgREST). No dashboard hosted às vezes ajuda também recarregar a página da app.
NOTIFY pgrst, 'reload schema';
