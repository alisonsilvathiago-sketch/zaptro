-- 🛠️ SCRIPT DE EMERGÊNCIA: CORREÇÃO DE PERFIL ZAPTRO
-- INSTRUÇÕES: Execute este script NO EDITOR SQL do seu projeto Supabase Secundário (ZAPTRO).
-- Este script garante que a tabela de perfis exista e que seu usuário de teste tenha acesso.

-- 1. Criar tabela de perfis (espelho do auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'USER',
  company_id UUID,
  tem_zaptro BOOLEAN DEFAULT false,
  status_zaptro TEXT DEFAULT 'pendente',
  status_empresa TEXT DEFAULT 'ativo',
  avatar_url TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS (Segurança)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem ver o próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. SINCRONIZAR USUÁRIO admteste@teste.com
-- Este bloco insere o perfil caso ele exista no auth.users mas não no public.profiles
INSERT INTO public.profiles (id, email, full_name, role, tem_zaptro, status_zaptro, status_empresa)
SELECT 
  id, 
  email, 
  'Admin Zaptro Teste', 
  'ADMIN', 
  true, 
  'autorizado', 
  'ativo'
FROM auth.users
WHERE lower(email) = 'admteste@teste.com'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'ADMIN',
  tem_zaptro = true,
  status_zaptro = 'autorizado',
  status_empresa = 'ativo';

-- ✅ VERIFICAÇÃO FINAL
SELECT email, role, tem_zaptro FROM public.profiles WHERE email = 'admteste@teste.com';
