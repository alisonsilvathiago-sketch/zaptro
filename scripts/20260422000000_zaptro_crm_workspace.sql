-- Snapshot do CRM (kanban, timeline, orçamentos por lead, rotas activas listadas no CRM).
-- Rode no SQL Editor do Supabase (projeto Zaptro). Política: só utilizadores com o mesmo `profiles.company_id`.

CREATE TABLE IF NOT EXISTS public.zaptro_crm_workspace (
  company_id uuid NOT NULL PRIMARY KEY REFERENCES public.whatsapp_companies (id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zaptro_crm_workspace_updated_at_idx ON public.zaptro_crm_workspace (updated_at DESC);

ALTER TABLE public.zaptro_crm_workspace ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zaptro_crm_workspace_company_rw" ON public.zaptro_crm_workspace;
CREATE POLICY "zaptro_crm_workspace_company_rw"
  ON public.zaptro_crm_workspace
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.company_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id IS NOT NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zaptro_crm_workspace TO authenticated;
