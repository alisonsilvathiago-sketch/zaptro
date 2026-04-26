/**
 * Define que tipos de orçamento/calculadora a transportadora oferece.
 * Persistido em `whatsapp_companies.settings.zaptro_service_scope` (JSON).
 */
export type ZaptroServiceScope = 'freight_only' | 'storage_only' | 'freight_and_storage';

export const DEFAULT_ZAPTRO_SERVICE_SCOPE: ZaptroServiceScope = 'freight_and_storage';

export function readZaptroServiceScope(company: { settings?: unknown } | null | undefined): ZaptroServiceScope {
  const s = company?.settings;
  if (!s || typeof s !== 'object' || Array.isArray(s)) return DEFAULT_ZAPTRO_SERVICE_SCOPE;
  const raw = (s as Record<string, unknown>).zaptro_service_scope;
  if (raw === 'freight_only' || raw === 'storage_only' || raw === 'freight_and_storage') return raw;
  return DEFAULT_ZAPTRO_SERVICE_SCOPE;
}

/** Modo efectivo da calculadora tendo em conta o escopo da empresa. */
export function zaptroEffectiveCalcMode(
  scope: ZaptroServiceScope,
  uiMode: 'freight' | 'storage',
): 'freight' | 'storage' {
  if (scope === 'freight_only') return 'freight';
  if (scope === 'storage_only') return 'storage';
  return uiMode;
}
