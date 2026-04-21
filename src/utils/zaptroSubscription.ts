import type { Company, Profile } from '../types';

/**
 * Situação de cobrança da transportadora no Zaptro.
 * O checkout/API de pagamento deve gravar em `whatsapp_companies`:
 * - `billing_status = 'active'` quando pago / em dia
 * - `billing_status = 'trial'` + `trial_ends_at` para período de teste com fim
 * - `billing_status = 'overdue' | 'blocked'` para bloquear funções pagas
 */
export function isZaptroBillingInGoodStanding(company: Company | null | undefined): boolean {
  if (!company) return false;
  const b = company.billing_status;
  if (b === 'active' || b === 'legacy') return true;
  if (b === 'blocked' || b === 'overdue') return false;
  if (b === 'trial' || b === undefined) {
    if (!company.trial_ends_at) return true;
    return new Date(company.trial_ends_at).getTime() >= Date.now();
  }
  return true;
}

/** Libera o painel Zaptro (plano + status do perfil no hub). */
export function isZaptroAccessEnabled(
  company: Company | null | undefined,
  profile: Profile | null | undefined
): boolean {
  if (!company) return true;
  if (profile?.status_zaptro === 'bloqueado') return false;
  return isZaptroBillingInGoodStanding(company);
}
