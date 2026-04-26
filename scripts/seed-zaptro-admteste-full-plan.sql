-- admteste@teste.com — ADMIN da transportadora + plano ativo (simula “comprei o plano completo”).
-- User Auth id: bb94576d-2f28-4da4-b7cc-e1193dccff7e
-- Senha desejada: 123456 (bloco no fim; se falhar, defina no Dashboard).
--
-- Se der erro "whatsapp_companies does not exist", rode ANTES: scripts/schema-zaptro-minimal.sql
--
-- Rode no SQL Editor do projeto Supabase ligado ao `supabaseZaptro`.
-- O JSON do auth.users é só referência; o app lê `profiles` + `whatsapp_companies`.

-- Tabelas antigas de `profiles` podem não ter esta coluna (erro 42703).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_zaptro text DEFAULT 'autorizado';

-- Empresa dedicada a este admin (id fixo para reexecutar o script).
INSERT INTO public.whatsapp_companies (
  id,
  name,
  primary_color,
  secondary_color,
  status,
  billing_status
)
VALUES (
  'd3333333-3333-4333-8333-333333333333',
  'Zaptro — Conta Admin Demo',
  '#D9FF00',
  '#0F172A',
  'ATIVO',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  status = EXCLUDED.status,
  billing_status = EXCLUDED.billing_status;

-- `profiles.company_id` costuma ter FK em `public.companies` (Logta), não em `whatsapp_companies`.
-- Sem esta linha o UPDATE do perfil falha com 23503.
INSERT INTO public.companies (id, name)
VALUES (
  'd3333333-3333-4333-8333-333333333333'::uuid,
  'Zaptro — Conta Admin Demo'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

-- Se a sua tabela não tiver colunas `status` ou `billing_status`, remova essas linhas do INSERT/UPDATE acima
-- e use só (id, name, primary_color, secondary_color); depois atualize billing via migration.

-- Perfil: ADMIN + empresa + acesso liberado no hub.
UPDATE public.profiles
SET
  role = 'ADMIN',
  email = 'admteste@teste.com',
  full_name = COALESCE(NULLIF(trim(full_name), ''), 'Admin Zaptro Demo'),
  company_id = 'd3333333-3333-4333-8333-333333333333'::uuid,
  status_zaptro = 'autorizado'
WHERE id = 'bb94576d-2f28-4da4-b7cc-e1193dccff7e';

INSERT INTO public.profiles (id, email, full_name, role, company_id, status_zaptro)
VALUES (
  'bb94576d-2f28-4da4-b7cc-e1193dccff7e',
  'admteste@teste.com',
  'Admin Zaptro Demo',
  'ADMIN',
  'd3333333-3333-4333-8333-333333333333'::uuid,
  'autorizado'
)
ON CONFLICT (id) DO UPDATE
SET
  role = 'ADMIN',
  email = EXCLUDED.email,
  full_name = COALESCE(NULLIF(trim(profiles.full_name), ''), EXCLUDED.full_name),
  company_id = EXCLUDED.company_id,
  status_zaptro = COALESCE(EXCLUDED.status_zaptro, profiles.status_zaptro);

-- Senha 123456 (dev). Se der erro, Authentication → Users → admteste@teste.com → Set password.
DO $pw$
BEGIN
  UPDATE auth.users
  SET encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf'))
  WHERE id = 'bb94576d-2f28-4da4-b7cc-e1193dccff7e'::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Senha não atualizada por SQL (%). Defina 123456 no Dashboard.', SQLERRM;
END
$pw$;

-- Depois: logout/login no Zaptro.
