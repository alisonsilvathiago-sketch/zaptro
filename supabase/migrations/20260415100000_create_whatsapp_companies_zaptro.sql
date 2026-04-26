-- Cria public.whatsapp_companies + RLS (Zaptro).
-- Rode no Supabase → SQL Editor (uma vez). Idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Espelha scripts/schema-zaptro-minimal.sql (secção 1).

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_companies TO authenticated;
