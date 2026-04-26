-- Opcional: faz `profiles.company_id` referenciar `whatsapp_companies` em vez de `companies`.
-- Só rode se TODOS os `company_id` em `profiles` existirem em `whatsapp_companies`
-- (ou após limpar/ajustar linhas órfãs), senão o ADD CONSTRAINT falha.
--
-- Se preferir manter o modelo Logta (FK → companies), não use este arquivo:
-- os seeds já fazem INSERT espelhado em `public.companies` com o mesmo UUID.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES public.whatsapp_companies (id);
