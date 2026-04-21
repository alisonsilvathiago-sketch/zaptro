/**
 * Orçamentos de frete ligados ao lead (CRM Zaptro) + link público para aprovação.
 * Persistência local até backend (Supabase) e WhatsApp oficiais.
 */

export type QuoteStatus = 'pendente' | 'enviado' | 'visualizado' | 'aprovado' | 'recusado';

export type FreightQuote = {
  id: string;
  leadId: string;
  /** Token secreto na URL pública */
  token: string;
  clientNameSnapshot: string;
  origin?: string;
  destination?: string;
  productService: string;
  quantity: string;
  quoteValue: number;
  deliveryDeadline: string;
  notes: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  history: { at: string; action: string; detail?: string }[];
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  visualizado: 'Visualizado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export function quotesStorageKey(crmStorageId: string): string {
  return `zaptro_crm_quotes_v1_${crmStorageId}`;
}

export function leadsStorageKey(crmStorageId: string): string {
  return `zaptro_crm_kanban_v3_${crmStorageId}`;
}

export function timelineStorageKey(crmStorageId: string): string {
  return `zaptro_crm_timeline_v1_${crmStorageId}`;
}

export function quotePublicPath(token: string): string {
  return `/orcamento/${encodeURIComponent(token)}`;
}

/** Orçamento + id do lead no kanban (para listagens). */
export type FreightQuoteWithLead = FreightQuote & { leadId: string };

/** Todos os orçamentos da empresa (localStorage), mais recentes primeiro. */
export function readAllQuotesFlattened(crmStorageId: string): FreightQuoteWithLead[] {
  const map = readQuotesMap(crmStorageId);
  const out: FreightQuoteWithLead[] = [];
  for (const [leadId, list] of Object.entries(map)) {
    if (!Array.isArray(list)) continue;
    for (const q of list) out.push({ ...q, leadId });
  }
  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out;
}

export function readQuotesMap(crmStorageId: string): Record<string, FreightQuote[]> {
  try {
    const raw = localStorage.getItem(quotesStorageKey(crmStorageId));
    if (!raw) return {};
    const p = JSON.parse(raw) as Record<string, FreightQuote[]>;
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

export function writeQuotesMap(crmStorageId: string, map: Record<string, FreightQuote[]>) {
  localStorage.setItem(quotesStorageKey(crmStorageId), JSON.stringify(map));
}

export function findQuoteByToken(token: string): { crmStorageId: string; leadId: string; quote: FreightQuote } | null {
  const decoded = decodeURIComponent(token);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('zaptro_crm_quotes_v1_')) continue;
    const crmStorageId = key.slice('zaptro_crm_quotes_v1_'.length);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const byLead = JSON.parse(raw) as Record<string, FreightQuote[]>;
      for (const [leadId, arr] of Object.entries(byLead)) {
        const q = arr?.find((x) => x.token === decoded || x.token === token);
        if (q) return { crmStorageId, leadId, quote: q };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function markQuoteVisualizado(token: string): void {
  const found = findQuoteByToken(token);
  if (!found) return;
  const { crmStorageId, leadId, quote } = found;
  if (quote.status === 'visualizado' || quote.status === 'aprovado' || quote.status === 'recusado') return;
  if (quote.status !== 'pendente' && quote.status !== 'enviado') return;

  const map = readQuotesMap(crmStorageId);
  const arr = [...(map[leadId] || [])];
  const idx = arr.findIndex((q) => q.id === quote.id);
  if (idx === -1) return;

  const now = new Date().toISOString();
  const next: FreightQuote = {
    ...arr[idx],
    status: 'visualizado',
    updatedAt: now,
    history: [...(arr[idx].history || []), { at: now, action: 'Cliente abriu o link', detail: 'Marcado como visualizado' }],
  };
  arr[idx] = next;
  map[leadId] = arr;
  writeQuotesMap(crmStorageId, map);
  try {
    window.dispatchEvent(new Event('zaptro-quotes-updated'));
  } catch {
    /* ignore */
  }
}

export function applyPublicQuoteDecision(token: string, decision: 'aprovar' | 'recusar'): { ok: boolean } {
  const found = findQuoteByToken(token);
  if (!found) return { ok: false };
  const { crmStorageId, leadId, quote } = found;
  if (quote.status === 'aprovado' || quote.status === 'recusado') return { ok: true };

  const map = readQuotesMap(crmStorageId);
  const arr = [...(map[leadId] || [])];
  const idx = arr.findIndex((q) => q.id === quote.id);
  if (idx === -1) return { ok: false };

  const now = new Date().toISOString();
  const newStatus: QuoteStatus = decision === 'aprovar' ? 'aprovado' : 'recusado';
  const nextQ: FreightQuote = {
    ...arr[idx],
    status: newStatus,
    updatedAt: now,
    history: [
      ...(arr[idx].history || []),
      {
        at: now,
        action: decision === 'aprovar' ? 'Cliente aprovou o orçamento' : 'Cliente recusou o orçamento',
        detail: 'Resposta via link público',
      },
    ],
  };
  arr[idx] = nextQ;
  map[leadId] = arr;
  writeQuotesMap(crmStorageId, map);

  if (decision === 'aprovar') {
    try {
      const raw = localStorage.getItem(leadsStorageKey(crmStorageId));
      if (raw) {
        const leads = JSON.parse(raw) as Array<{
          id: string;
          stage: string;
          progress?: number;
          approvedQuoteId?: string | null;
        }>;
        const leadsNext = leads.map((l) => {
          if (l.id !== leadId) return l;
          let stage = l.stage;
          if (stage === 'novos' || stage === 'atendimento') stage = 'negociacao';
          const progress = Math.max(Number(l.progress) || 1, 4);
          return { ...l, stage, progress, approvedQuoteId: quote.id };
        });
        localStorage.setItem(leadsStorageKey(crmStorageId), JSON.stringify(leadsNext));
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const evKey = timelineStorageKey(crmStorageId);
    const raw = localStorage.getItem(evKey);
    const events = raw ? (JSON.parse(raw) as Record<string, unknown[]>) : {};
    const list = [...(events[leadId] || [])];
    list.push({
      id: `ev-q-${Date.now()}`,
      at: now,
      kind: 'proposal',
      title: decision === 'aprovar' ? 'Orçamento aprovado (cliente)' : 'Orçamento recusado (cliente)',
      body: `Ref. ${quote.id} · Frete R$ ${quote.freightValue.toLocaleString('pt-BR')}`,
      actor: 'Cliente · link público',
    });
    events[leadId] = list;
    localStorage.setItem(evKey, JSON.stringify(events));
  } catch {
    /* ignore */
  }

  try {
    window.dispatchEvent(new Event('zaptro-quotes-updated'));
  } catch {
    /* ignore */
  }

  return { ok: true };
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

/**
 * Quando não existe nenhum orçamento no `localStorage` deste `crmStorageId`,
 * grava linhas de demonstração (alinhadas aos leads `demo-*` do Kanban) para
 * a página «Orçamentos» mostrar a tabela e links públicos de exemplo.
 */
export function seedDemoQuotesIfEmpty(crmStorageId: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  const map = readQuotesMap(crmStorageId);
  const hasAny = Object.values(map).some((arr) => Array.isArray(arr) && arr.length > 0);
  if (hasAny) return false;

  const mk = (
    leadId: string,
    id: string,
    token: string,
    status: QuoteStatus,
    daysAgo: number,
    freightValue: number,
    origin: string,
    destination: string,
    clientNameSnapshot: string,
    extraHistory?: string,
  ): FreightQuote => {
    const createdAt = daysAgoIso(daysAgo);
    return {
      id,
      leadId,
      token,
      clientNameSnapshot,
      origin,
      destination,
      productService: 'Subscrição Premium — 12 meses',
      quantity: '1 licença',
      quoteValue: freightValue,
      deliveryDeadline: 'Imediato',
      notes: 'Dados de demonstração no browser até integrar Supabase.',
      status,
      createdAt,
      updatedAt: createdAt,
      history: [
        {
          at: createdAt,
          action: 'Orçamento de demonstração',
          detail: extraHistory || 'Pré-visualização na lista de orçamentos',
        },
      ],
    };
  };

  const next: Record<string, FreightQuote[]> = {
    'demo-1': [
      mk(
        'demo-1',
        'qt-demo-silva',
        'zaptro-demo-quote-silva',
        'aprovado',
        6,
        12800,
        'São Paulo — SP',
        'Lisboa — PT',
        'Empresa de Tecnologia Silva',
        'Cliente aprovou no link público (simulação)',
      ),
    ],
    'demo-2': [
      mk(
        'demo-2',
        'qt-demo-maria',
        'zaptro-demo-quote-maria',
        'visualizado',
        2,
        22400,
        'Rio — RJ',
        'Porto — PT',
        'Maria Consultoria',
        'Cliente abriu o link (visualizado)',
      ),
    ],
    'demo-3': [
      mk(
        'demo-3',
        'qt-demo-norte-a',
        'zaptro-demo-quote-norte-a',
        'enviado',
        1,
        5600,
        'Fortaleza — CE',
        'Belém — PA',
        'Logística Norte',
      ),
      mk(
        'demo-3',
        'qt-demo-norte-b',
        'zaptro-demo-quote-norte-b',
        'pendente',
        0,
        6200,
        'Fortaleza — CE',
        'Miami — US',
        'Norte Digital',
        'Rascunho interno',
      ),
    ],
  };

  writeQuotesMap(crmStorageId, next);
  try {
    window.dispatchEvent(new Event('zaptro-quotes-updated'));
  } catch {
    /* ignore */
  }
  return true;
}
