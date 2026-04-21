-- Schema mínimo Zaptro para projeto Supabase que ainda NÃO tem as tabelas.
-- Rode UMA VEZ no SQL Editor (como postgres), depois rode seed-zaptro-admteste-full-plan.sql (ou seed-zaptro-test-admin.sql).
--
-- Se o app der HTTP 500 ao ler `profiles`, pode haver políticas RLS antigas com outros nomes:
-- rode scripts/fix-zaptro-profiles-rls-reset.sql (remove todas as policies de `profiles` e recria a dev).
--
-- ATENÇÃO: políticas abaixo são permissivas para desenvolvimento. Em produção, restrinja RLS.

-- 1) Transportadora (espelho / vitrine / cobrança)
CREATE TABLE IF NOT EXISTS public.whatsapp_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text,
  address text,
  website text,
  category text,
  description text,
  opening_hours text,
  logo_url text,
  primary_color text DEFAULT '#D9FF00',
  secondary_color text DEFAULT '#0F172A',
  menu_color text,
  bg_color text,
  button_radius text DEFAULT '12px',
  menu_name text,
  subdomain text,
  favicon_url text,
  status text DEFAULT 'pending_setup',
  billing_status text DEFAULT 'trial',
  trial_ends_at timestamptz,
  settings jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_companies_authenticated_rw" ON public.whatsapp_companies;
CREATE POLICY "whatsapp_companies_authenticated_rw"
  ON public.whatsapp_companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2) Perfil ligado ao Auth (mesmo id que auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text,
  company_id uuid REFERENCES public.whatsapp_companies (id),
  status_zaptro text DEFAULT 'autorizado',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garante coluna se `profiles` já existia antes deste script sem `status_zaptro`.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_zaptro text DEFAULT 'autorizado';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own_row" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_dev" ON public.profiles;
CREATE POLICY "profiles_authenticated_dev"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3) Instância WhatsApp (tela de conexão; pode criar depois se der erro só na empresa)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.whatsapp_companies (id) ON DELETE CASCADE,
  instance_id text NOT NULL,
  token text,
  provider text DEFAULT 'evolution',
  status text DEFAULT 'disconnected',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id),
  UNIQUE (instance_id)
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_instances_authenticated_rw" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_authenticated_rw"
  ON public.whatsapp_instances
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
