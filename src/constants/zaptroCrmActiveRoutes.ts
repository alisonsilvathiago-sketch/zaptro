/** Rotas criadas no CRM — persistência local até backend. */

export type ActiveRouteRow = {
  id: string;
  token: string;
  label: string;
  createdAt: string;
  status: 'ativa' | 'encerrada';
  createdBy?: string;
  /** Nome do cliente, encomenda ou referência interna — identifica a rota na lista. */
  clientRef?: string;
  /** Nota só para a equipa (não vai para o link público). */
  internalNote?: string;
};

export function routesStorageKey(crmId: string): string {
  return `zaptro_crm_active_routes_v1_${crmId}`;
}

export function readActiveRoutes(crmId: string): ActiveRouteRow[] {
  try {
    const raw = localStorage.getItem(routesStorageKey(crmId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActiveRouteRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeActiveRoutes(crmId: string, rows: ActiveRouteRow[]): void {
  try {
    localStorage.setItem(routesStorageKey(crmId), JSON.stringify(rows));
    try {
      window.dispatchEvent(new CustomEvent('zaptro-crm-active-routes'));
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}
