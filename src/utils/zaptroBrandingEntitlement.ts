/**
 * Plano Zaptro — edição de marca (logo, cores, subdomínio).
 *
 * Fonte: `whatsapp_companies.settings` (JSONB), chave `zaptro_branding` (boolean).
 * - `true` ou omitido → transportadora com direito a editar (comportamento legado / plano com marca).
 * - `false` → plano sem marca branca; o ADMIN vê pré-visualização mas não grava (UI já trata).
 *
 * O MASTER Logta ignora isto no layout (vê tudo); quem grava no Supabase continua sujeito a RLS.
 */
import { getZaptroPlan } from '../constants/zaptroPlans';

export function isZaptroBrandingEntitledByPlan(
  company: { settings?: unknown; plan?: string } | null | undefined
): boolean {
  if (!company) return false;
  
  // Prioridade 1: Configuração explícita no settings (overrides)
  const s = company.settings;
  if (s && typeof s === 'object' && !Array.isArray(s)) {
    const o = s as Record<string, unknown>;
    if (o.zaptro_branding === false) return false;
    if (o.zaptro_branding === true) return true;
  }

  // Prioridade 2: Pelo nível do plano no banco ou settings
  let planId = company.plan;
  if (s && typeof s === 'object' && !Array.isArray(s)) {
     const o = s as Record<string, unknown>;
     if (typeof o.zaptro_plan === 'string') planId = o.zaptro_plan;
  }

  const pd = getZaptroPlan(planId);
  return pd.hasCustomBranding || pd.hasWhiteLabel;
}
