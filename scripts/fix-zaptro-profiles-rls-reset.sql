-- Corrige HTTP 500 ao ler `profiles` via PostgREST quando há políticas RLS antigas
-- (nomes diferentes de profiles_own_row / profiles_authenticated_dev) que entram em
-- conflito ou disparam erro ao avaliar USING / WITH CHECK.
--
-- Rode no SQL Editor como `postgres`. Ambiente de dev / homologação.
-- Depois: recarregue o app (F5) e faça login de novo.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  -- Alias `p` (não `pol`): evita colisão com a variável do loop em PL/pgSQL.
  FOR r IN
    SELECT p.polname AS name
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.name);
  END LOOP;
END $$;

CREATE POLICY "profiles_authenticated_dev"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
