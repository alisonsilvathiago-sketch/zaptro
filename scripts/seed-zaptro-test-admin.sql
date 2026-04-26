-- Conta de teste (Supabase Zaptro / Auth):
--   Login:  teste@teste.com
--   Senha:  123456
--   Empresa (nome público): teste trsnaport
-- Regra de produto: quem compra / ativa a própria conta = role ADMIN no tenant (ver constants/zaptroProductRules.ts).
--
-- Se faltar tabela whatsapp_companies / profiles, rode antes: scripts/schema-zaptro-minimal.sql
-- Rode no SQL Editor do projeto ligado ao `supabaseZaptro`.
-- Pré-requisito: usuário em auth.users com email teste@teste.com
-- (Authentication → Add user → e-mail + senha 123456, ou registro pelo app).
-- Ordem: empresa → perfil → tentativa de senha 123456 no Auth (no fim).

-- Empresa fixa de dev (re-roda sem duplicar por id).
INSERT INTO public.whatsapp_companies (
  id,
  name,
  primary_color,
  secondary_color
)
VALUES (
  'b1111111-1111-4111-8111-111111111111',
  'teste trsnaport',
  '#D9FF00',
  '#0F172A'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color;

-- Satisfaz FK `profiles_company_id_fkey` → `public.companies` quando existir.
INSERT INTO public.companies (id, name)
VALUES (
  'b1111111-1111-4111-8111-111111111111'::uuid,
  'teste trsnaport'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

-- Vincular perfil à transportadora (por e-mail, não depende de UUID fixo).
UPDATE public.profiles p
SET
  role = 'ADMIN',
  email = 'teste@teste.com',
  full_name = COALESCE(NULLIF(trim(p.full_name), ''), 'Admin teste trsnaport'),
  company_id = 'b1111111-1111-4111-8111-111111111111'::uuid
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email::text) = lower('teste@teste.com');

INSERT INTO public.profiles (id, email, full_name, role, company_id)
SELECT
  u.id,
  'teste@teste.com',
  'Admin teste trsnaport',
  'ADMIN',
  'b1111111-1111-4111-8111-111111111111'::uuid
FROM auth.users u
WHERE lower(u.email::text) = lower('teste@teste.com')
ON CONFLICT (id) DO UPDATE
SET
  role = 'ADMIN',
  email = EXCLUDED.email,
  full_name = COALESCE(NULLIF(trim(profiles.full_name), ''), EXCLUDED.full_name),
  company_id = EXCLUDED.company_id;

-- Força senha 123456 no Auth (dev). Se falhar (permissão / extensão), defina manualmente no Dashboard.
DO $pw$
BEGIN
  UPDATE auth.users
  SET encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf'))
  WHERE lower(email::text) = lower('teste@teste.com');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Senha não atualizada por SQL (%). Em Authentication → Users, defina senha 123456.', SQLERRM;
END
$pw$;

-- Se `whatsapp_companies` não tiver primary_color/secondary_color, use só (id, name) no INSERT e ajuste o ON CONFLICT.
-- Depois: logout/login no Zaptro ou F5 para recarregar o perfil.
