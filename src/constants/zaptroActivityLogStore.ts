/**
 * Auditoria de acções na app Zaptro (localStorage + evento para UI em tempo real).
 * Chave por `company_id` (ou `local-demo`) — mesma ideia que rotas / CRM local.
 */

export const ZAPTRO_ACTIVITY_LOG_EVENT = 'zaptro-activity-log';

export type ZaptroActivityLogType = 'atendimento' | 'config' | 'rota' | 'login' | 'motorista' | 'sistema';

export type ZaptroActivityEntry = {
  id: string;
  at: string;
  type: ZaptroActivityLogType;
  actorName: string;
  clientLabel: string;
  action: string;
  details?: string;
};

const MAX = 500;

export function zaptroActivityLogStorageKey(tenantId: string) {
  return `zaptro_activity_log_v1_${tenantId.trim() || 'local-demo'}`;
}

function key(tenantId: string) {
  return zaptroActivityLogStorageKey(tenantId);
}

export function readZaptroActivityLog(tenantId: string): ZaptroActivityEntry[] {
  const tid = tenantId.trim() || 'local-demo';
  try {
    const raw = localStorage.getItem(key(tid));
    if (!raw) return [];
    const p = JSON.parse(raw) as ZaptroActivityEntry[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function writeLog(tenantId: string, list: ZaptroActivityEntry[]) {
  try {
    localStorage.setItem(key(tenantId), JSON.stringify(list));
  } catch {
    /* quota ou bloqueio */
  }
}

export function appendZaptroActivityLog(
  tenantId: string,
  partial: Omit<ZaptroActivityEntry, 'id' | 'at'> & { at?: string },
): void {
  const tid = tenantId.trim() || 'local-demo';
  const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const at = partial.at ?? new Date().toISOString();
  const entry: ZaptroActivityEntry = {
    id,
    at,
    type: partial.type,
    actorName: partial.actorName,
    clientLabel: partial.clientLabel,
    action: partial.action,
    ...(partial.details ? { details: partial.details } : {}),
  };
  const prev = readZaptroActivityLog(tid);
  const next = [entry, ...prev].slice(0, MAX);
  writeLog(tid, next);
  try {
    window.dispatchEvent(new CustomEvent(ZAPTRO_ACTIVITY_LOG_EVENT, { detail: { tenantId: tid } }));
  } catch {
    /* ignore */
  }
}
