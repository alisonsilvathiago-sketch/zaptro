/**
 * Integrações API externas por empresa (demo: localStorage até existir tabela Supabase).
 * O motor de produto pode ler estas entradas para habilitar módulos (NF-e, ERP, etc.).
 */

export type ZaptroExternalApiCategory = 'nfe' | 'erp' | 'shipping' | 'payment' | 'webhook' | 'custom';

export const ZAPTRO_EXTERNAL_API_CATEGORY_LABEL: Record<ZaptroExternalApiCategory, string> = {
  nfe: 'Nota fiscal / documentos fiscais',
  erp: 'ERP / TMS / WMS',
  shipping: 'Transporte / rastreio',
  payment: 'Pagamentos / cobrança',
  webhook: 'Webhook genérico',
  custom: 'Outra API',
};

export type ZaptroExternalApiIntegration = {
  id: string;
  category: ZaptroExternalApiCategory;
  /** Nome amigável (ex.: provedor NF-e da transportadora). */
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
};

const STORAGE_PREFIX = 'zaptro_external_apis_v1';

function storageKey(companyId: string | null | undefined): string {
  const c = (companyId || 'local').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${STORAGE_PREFIX}_${c}`;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function coerceCategory(x: unknown): ZaptroExternalApiCategory {
  const s = typeof x === 'string' ? x : '';
  if (s in ZAPTRO_EXTERNAL_API_CATEGORY_LABEL) return s as ZaptroExternalApiCategory;
  return 'custom';
}

function parseRow(x: unknown): ZaptroExternalApiIntegration | null {
  if (!isRecord(x)) return null;
  if (typeof x.id !== 'string' || typeof x.name !== 'string') return null;
  return {
    id: x.id,
    category: coerceCategory(x.category),
    name: x.name,
    baseUrl: typeof x.baseUrl === 'string' ? x.baseUrl : '',
    apiKey: typeof x.apiKey === 'string' ? x.apiKey : '',
    enabled: x.enabled === true,
  };
}

export function readExternalApiIntegrations(companyId?: string | null): ZaptroExternalApiIntegration[] {
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseRow).filter((r): r is ZaptroExternalApiIntegration => r != null);
  } catch {
    return [];
  }
}

export function writeExternalApiIntegrations(
  companyId: string | null | undefined,
  list: ZaptroExternalApiIntegration[]
): void {
  try {
    localStorage.setItem(storageKey(companyId), JSON.stringify(list));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Lista de integrações activas (para outros módulos reconhecerem o que está ligado). */
export function readEnabledExternalApiCategories(companyId?: string | null): ZaptroExternalApiCategory[] {
  const rows = readExternalApiIntegrations(companyId).filter((r) => r.enabled);
  return [...new Set(rows.map((r) => r.category))];
}
