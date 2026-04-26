/**
 * Contrato público de integrações — alinhado a docs/ZAPTRO_INTEGRATIONS_ARCHITECTURE.md.
 * O SPA só documenta e gera URLs de exemplo; o processamento real vive no backend.
 */

/** Path canónico do backend para receber webhooks (POST). */
export const ZAPTRO_INBOUND_WEBHOOK_PATH_PREFIX = '/api/v1/webhooks/inbound';

/**
 * URL completa de exemplo para configurar no Shopify, Zapier, etc.
 * Em produção, substituir `origin` pelo domínio da API Zaptro (ex.: https://api.zaptro.com.br).
 */
export function buildZaptroInboundWebhookExample(origin: string, source: string): string {
  const base = origin.replace(/\/$/, '');
  const seg = encodeURIComponent(source.trim().toLowerCase() || 'custom');
  return `${base}${ZAPTRO_INBOUND_WEBHOOK_PATH_PREFIX}/${seg}`;
}

/** Formato alvo após normalização (referência para adaptadores no backend). */
export type ZaptroCanonicalInboundEvent = {
  event_type: string;
  occurred_at: string;
  source: string;
  company_id?: string;
  payload: Record<string, unknown>;
};
