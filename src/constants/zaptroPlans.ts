/**
 * Estrutura SaaS Zaptro - Definição de Planos e Limites
 */
export type ZaptroPlanTier = 'basico' | 'profissional' | 'avancado' | 'master';

export interface ZaptroPlanDetails {
  id: ZaptroPlanTier;
  label: string;
  priceMonthly: number;
  priceYearly: number;
  whatsappConnections: number;
  retentionDays: number;
  hasBackup: boolean;
  hasWhiteLabel: boolean;
  hasCustomDomain: boolean;
  hasCustomBranding: boolean;
}

export const ZAPTRO_PLANS: Record<ZaptroPlanTier, ZaptroPlanDetails> = {
  basico: {
    id: 'basico',
    label: 'Básico',
    priceMonthly: 49,
    priceYearly: 490,
    whatsappConnections: 1,
    retentionDays: 1, // 24 horas
    hasBackup: false,
    hasWhiteLabel: false,
    hasCustomDomain: false,
    hasCustomBranding: false,
  },
  profissional: {
    id: 'profissional',
    label: 'Profissional',
    priceMonthly: 97,
    priceYearly: 970,
    whatsappConnections: 3,
    retentionDays: 3,
    hasBackup: false, // Adicional pago
    hasWhiteLabel: false,
    hasCustomDomain: false,
    hasCustomBranding: true,
  },
  avancado: {
    id: 'avancado',
    label: 'Avançado',
    priceMonthly: 197,
    priceYearly: 1970,
    whatsappConnections: 9999, // Ilimitado
    retentionDays: 7,
    hasBackup: true, // 15 dias incluído
    hasWhiteLabel: true,
    hasCustomDomain: true,
    hasCustomBranding: true,
  },
  master: {
    id: 'master',
    label: 'Master (Admin)',
    priceMonthly: 0,
    priceYearly: 0,
    whatsappConnections: 9999,
    retentionDays: 30,
    hasBackup: true,
    hasWhiteLabel: true,
    hasCustomDomain: true,
    hasCustomBranding: true,
  },
};

export function getZaptroPlan(tier: string | undefined): ZaptroPlanDetails {
  const t = (tier || 'basico').toLowerCase() as ZaptroPlanTier;
  return ZAPTRO_PLANS[t] || ZAPTRO_PLANS.basico;
}
