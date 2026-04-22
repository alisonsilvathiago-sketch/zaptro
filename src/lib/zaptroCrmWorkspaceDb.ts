import { supabaseZaptro } from './supabase-zaptro';

export const ZAPTRO_CRM_WORKSPACE_PAYLOAD_VERSION = 1 as const;

/** JSON gravado em `zaptro_crm_workspace.payload` (v1). */
export type ZaptroCrmWorkspacePayloadV1 = {
  v: typeof ZAPTRO_CRM_WORKSPACE_PAYLOAD_VERSION;
  leads: unknown;
  leadEvents: unknown;
  quotesByLead: unknown;
  activeRoutes: unknown;
};

function isMissingWorkspaceTable(err: { message?: string } | null): boolean {
  const m = (err?.message || '').toLowerCase();
  return m.includes('zaptro_crm_workspace') || m.includes('does not exist') || m.includes('schema cache');
}

export function zaptroCrmWorkspaceTouchKey(companyId: string): string {
  return `zaptro_crm_workspace_touch_${companyId}`;
}

export function readWorkspaceLocalTouchIso(companyId: string): string | null {
  try {
    return localStorage.getItem(zaptroCrmWorkspaceTouchKey(companyId));
  } catch {
    return null;
  }
}

export function writeWorkspaceLocalTouchIso(companyId: string, iso: string): void {
  try {
    localStorage.setItem(zaptroCrmWorkspaceTouchKey(companyId), iso);
  } catch {
    /* ignore */
  }
}

export type ZaptroCrmWorkspaceRow = {
  payload: ZaptroCrmWorkspacePayloadV1;
  updated_at: string;
};

/**
 * Lê o snapshot CRM da empresa (kanban + timeline + orçamentos + rotas activas no CRM).
 * `null` se não existir linha ou se a tabela ainda não foi criada no Supabase.
 */
export async function fetchCrmWorkspace(companyId: string): Promise<ZaptroCrmWorkspaceRow | null> {
  const { data, error } = await supabaseZaptro
    .from('zaptro_crm_workspace')
    .select('payload, updated_at')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    if (isMissingWorkspaceTable(error)) return null;
    throw error;
  }
  if (!data?.payload || typeof data.payload !== 'object') return null;
  const payload = data.payload as ZaptroCrmWorkspacePayloadV1;
  const updated_at = typeof data.updated_at === 'string' ? data.updated_at : '';
  if (!updated_at) return null;
  return { payload, updated_at };
}

/** Grava ou actualiza o snapshot (ignora silenciosamente se a tabela não existir). */
export async function upsertCrmWorkspace(companyId: string, payload: ZaptroCrmWorkspacePayloadV1): Promise<boolean> {
  const row = {
    company_id: companyId,
    payload,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseZaptro.from('zaptro_crm_workspace').upsert(row, { onConflict: 'company_id' });
  if (error) {
    if (isMissingWorkspaceTable(error)) return false;
    throw error;
  }
  return true;
}
