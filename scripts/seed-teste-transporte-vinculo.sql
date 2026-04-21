-- Vincula a transportadora "teste transporte" ao login teste@gmail.com
-- (telefone público da vitrine: 000007).
--
-- Rode no SQL Editor do projeto Supabase ligado ao `supabaseZaptro`.
-- Pré-requisito: existe linha em auth.users com email teste@gmail.com
-- (crie a conta em Authentication → Users ou pelo registro do app).

-- Id fixo da empresa (reexecutar o script não duplica).
INSERT INTO public.whatsapp_companies (
  id,
  name,
  phone,
  primary_color,
  secondary_color,
  status
)
VALUES (
  'c2222222-2222-4222-8222-222222222222',
  'teste transporte',
  '000007',
  '#D9FF00',
  '#0F172A',
  'pending_setup'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color;

INSERT INTO public.companies (id, name)
VALUES (
  'c2222222-2222-4222-8222-222222222222'::uuid,
  'teste transporte'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

-- Perfil: ADMIN + company_id + email espelhado (ajuste full_name se quiser).
UPDATE public.profiles p
SET
  role = 'ADMIN',
  email = 'teste@gmail.com',
  full_name = COALESCE(NULLIF(trim(p.full_name), ''), 'Perfil Teste Transporte'),
  company_id = 'c2222222-2222-4222-8222-222222222222'::uuid
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = lower('teste@gmail.com');

-- Se ainda não existir linha em profiles para esse usuário:
INSERT INTO public.profiles (id, email, full_name, role, company_id)
SELECT
  u.id,
  'teste@gmail.com',
  'Perfil Teste Transporte',
  'ADMIN',
  'c2222222-2222-4222-8222-222222222222'::uuid
FROM auth.users u
WHERE lower(u.email) = lower('teste@gmail.com')
ON CONFLICT (id) DO UPDATE
SET
  role = 'ADMIN',
  email = EXCLUDED.email,
  full_name = COALESCE(NULLIF(trim(profiles.full_name), ''), EXCLUDED.full_name),
  company_id = EXCLUDED.company_id;

-- Se o UPDATE acima não afetou nenhuma linha e o INSERT também não inseriu,
-- o email não existe em auth.users — crie o usuário e rode de novo.

-- Depois: logout/login no Zaptro ou recarregar a sessão.
