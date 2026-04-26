-- Diagnóstico: "Erro de Autenticação" no Zaptro com sessão mas sem perfil.
-- Rode no SQL Editor (postgres). Ajuste o e-mail se não for admteste@teste.com.

-- 1) Mesmo UUID em auth e em profiles?
SELECT u.id AS auth_user_id, u.email::text AS auth_email
FROM auth.users u
WHERE lower(u.email::text) = lower('admteste@teste.com');

SELECT p.id AS profile_id, p.email, p.role, p.company_id
FROM public.profiles p
WHERE lower(p.email) = lower('admteste@teste.com')
   OR p.id = 'bb94576d-2f28-4da4-b7cc-e1193dccff7e'::uuid;

-- 2) Se auth_id ≠ profile_id ou não houver linha em profiles, o app não carrega permissões.
-- 3) Se as linhas existem mas o app falha, costuma ser RLS: rode o bloco de policies de
--    scripts/schema-zaptro-minimal.sql (tabela profiles, policy profiles_authenticated_dev).

-- 4) HTTP 500 no REST ao ler `profiles`: erro no Postgres (política RLS com SQL inválido,
--    trigger, view, etc.). Como postgres (bypass RLS), teste:
--    SELECT * FROM public.profiles WHERE id = 'bb94576d-2f28-4da4-b7cc-e1193dccff7e'::uuid;
--    Se isto ok via SQL mas 500 no app → foque em RLS / PostgREST logs.

-- Políticas atuais em `profiles` (ajuste se alguma referência circular quebrar o SELECT):
SELECT pol.polname, pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
FROM pg_policy pol
JOIN pg_class cls ON cls.oid = pol.polrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'public' AND cls.relname = 'profiles';
