import type { Company } from '../types';

export type ZaptroPlanVerifiedTier = 'none' | 'standard' | 'premium';

const PREMIUM_KEYS = new Set([
  'ouro',
  'gold',
  'premium',
  'master',
  'enterprise',
  'white_label',
  'marca',
  'diamond',
]);

const STANDARD_KEYS = new Set([
  'prata',
  'silver',
  'professional',
  'profissional',
  'pro',
  'intermediario',
  'intermediário',
]);

const BASE_KEYS = new Set(['basico', 'bronze', 'starter', 'sem_marca']);

function tierFromPlanColumn(plan: string | undefined | null): ZaptroPlanVerifiedTier {
  const p = String(plan || '').toUpperCase();
  if (p === 'OURO' || p === 'MASTER') return 'premium';
  if (p === 'PRATA' || p === 'PROFISSIONAL') return 'standard';
  return 'none';
}

function tierFromSettingsJson(settings: unknown): ZaptroPlanVerifiedTier {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return 'none';
  const o = settings as Record<string, unknown>;
  const zp = typeof o.zaptro_plan === 'string' ? o.zaptro_plan.trim().toLowerCase() : '';
  if (!zp) return 'none';
  if (PREMIUM_KEYS.has(zp)) return 'premium';
  if (STANDARD_KEYS.has(zp)) return 'standard';
  if (BASE_KEYS.has(zp) || zp === 'standard') return 'none';
  return 'none';
}

/**
 * Selo de plano pago na transportadora (empresa):
 * - **premium** (dourado): `whatsapp_companies.plan` OURO / MASTER (prioridade sobre JSON).
 * - **standard** (azul): PRATA / PROFISSIONAL.
 * - **none**: BRONZE ou sem dados úteis.
 *
 * A coluna `plan` manda: `settings.zaptro_plan` (ex.: `basico` só para marca branca) **não** pode esconder
 * um plano OURO/PRATA já gravado na linha — era o caso em que o selo “sumia”.
 */
export function getZaptroPlanVerifiedTier(
  company: { plan?: Company['plan'] | string; settings?: unknown } | null | undefined
): ZaptroPlanVerifiedTier {
  if (!company) return 'none';
  const fromColumn = tierFromPlanColumn(company.plan as string | undefined);
  if (fromColumn !== 'none') return fromColumn;

  const fromJson = tierFromSettingsJson(company.settings);
  if (fromJson !== 'none') return fromJson;

  return 'none';
}

export const ZAPTRO_VERIFIED_SEAL_META = {
  standard: {
    label: 'Plano Profissional — transportadora verificada',
    bg: '#D9FF00',
  },
  premium: {
    label: 'Plano Premium — transportadora verificada',
    bg: 'linear-gradient(145deg, #fde68a 0%, #f59e0b 42%, #b45309 100%)',
  },
} as const;
