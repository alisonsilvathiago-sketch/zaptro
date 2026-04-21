-- 🚀 SETUP DEFINITIVO ZAPTRO: admteste@teste.com
-- Este script configura o ambiente separado para o Zaptro e garante que o usuário de teste
-- tenha todas as permissões administrativas e o produto liberado.

-- 1) Garantir que as colunas de controle do Zaptro existam no perfil
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS tem_zaptro BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_zaptro TEXT DEFAULT 'pendente';

COMMENT ON COLUMN public.profiles.tem_zaptro IS 'Indica se o usuário adquiriu/tem acesso ao produto Zaptro.';
COMMENT ON COLUMN public.profiles.status_zaptro IS 'Status do acesso: autorizado | pendente | bloqueado';

-- 2) Criar/Atualizar a Empresa Zaptro para o Admin de Teste
-- Usamos um UUID fixo para consistência em desenvolvimento
INSERT INTO public.whatsapp_companies (
  id,
  name,
  status,
  billing_status,
  primary_color,
  secondary_color
)
VALUES (
  'e4444444-4444-4444-a444-444444444444',
  'Transportadora Zaptro Demo',
  'ATIVO',
  'active',
  '#CCFF00',
  '#0F172A'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  billing_status = EXCLUDED.billing_status;

-- Garantir espelho na tabela de empresas do Logta (para FKs antigas que ainda apontam para lá)
INSERT INTO public.companies (id, name)
VALUES ('e4444444-4444-4444-a444-444444444444', 'Transportadora Zaptro Demo')
ON CONFLICT (id) DO NOTHING;

-- 3) Configurar o Perfil do Usuário admteste@teste.com
-- Nota: O script assume que o usuário já existe no auth.users (bb94576d-2f28-4da4-b7cc-e1193dccff7e)
-- Se não existir, crie via Dashboard do Supabase antes de rodar este script.

UPDATE public.profiles
SET
  role = 'ADMIN',
  company_id = 'e4444444-4444-4444-a444-444444444444',
  tem_zaptro = true,
  status_zaptro = 'autorizado'
WHERE email = 'admteste@teste.com'
   OR id = 'bb94576d-2f28-4da4-b7cc-e1193dccff7e';

-- Caso o perfil não exista, inserimos (garante que o usuário consiga logar)
INSERT INTO public.profiles (id, email, full_name, role, company_id, tem_zaptro, status_zaptro)
SELECT 
  id, 
  email, 
  'Admin Zaptro Teste', 
  'ADMIN', 
  'e4444444-4444-4444-a444-444444444444', 
  true, 
  'autorizado'
FROM auth.users
WHERE lower(email) = 'admteste@teste.com'
ON CONFLICT (id) DO UPDATE
SET
  role = 'ADMIN',
  company_id = EXCLUDED.company_id,
  tem_zaptro = true,
  status_zaptro = 'autorizado';

-- 4) Forçar Senha 123456 no Auth
DO $pw$
BEGIN
  UPDATE auth.users
  SET encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf'))
  WHERE lower(email::text) = lower('admteste@teste.com');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Não foi possível atualizar a senha via SQL. Defina manualmente como 123456 no Dashboard.';
END
$pw$;

-- 5) Verificar resultado
SELECT email, role, tem_zaptro, status_zaptro, company_id 
FROM public.profiles 
WHERE email = 'admteste@teste.com';
