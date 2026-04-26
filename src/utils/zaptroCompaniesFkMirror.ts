import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Em bases híbridas, `profiles.company_id` pode ter FK para `public.companies`
 * (Logta) enquanto o Zaptro grava em `whatsapp_companies`. Sem linha espelhada
 * em `companies`, o UPDATE do perfil falha e a vitrine “não grava” após reload.
 */
export async function mirrorCompanyRowForProfilesFk(
  client: SupabaseClient,
  companyId: string,
  displayName: string
): Promise<void> {
  const name = displayName.trim() || 'Transportadora';
  const { error } = await client.from('companies').upsert({ id: companyId, name }, { onConflict: 'id' });
  if (!error) return;
  const msg = `${error.message || ''} ${error.code || ''} ${error.details || ''}`;
  const missing =
    /does not exist|relation.*not found|schema cache|Could not find the table/i.test(msg) ||
    error.code === '42P01';
  if (missing) return;
  console.warn('[zaptroCompaniesFkMirror] companies upsert:', msg);
}
