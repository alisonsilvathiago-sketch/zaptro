/**
 * Orçamentos de frete ligados ao lead (CRM Zaptro) + link público para aprovação.
 * Persistência local até backend (Supabase) e WhatsApp oficiais.
 */

import type { CSSProperties } from 'react';

export type QuoteStatus = 'pendente' | 'enviado' | 'visualizado' | 'aprovado' | 'recusado';

export type FreightQuote = {
  id: string;
  leadId: string;
  /** Token secreto na URL pública */
  token: string;
  clientNameSnapshot: string;
  origin?: string;
  destination?: string;
  /** Linha única para listagens (demos / legado) */
  productService?: string;
  quantity?: string;
  /** Valor em R$ (preferido na UI) */
  quoteValue?: number;
  /** CRM grava também como `frete` — manter sincronizado com `quoteValue` ao criar */
  freightValue?: number;
  /** CRM: tipo de carga */
  cargoType?: string;
  /** CRM: peso / quantidade */
  weightQty?: string;
  deliveryDeadline: string;
  notes: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  history: { at: string; action: string; detail?: string }[];
  /** Snapshot na criação — nome da transportadora no PDF */
  issuerCompanyName?: string;
  /** Snapshot — logo público quando plano com marca */
  issuerLogoUrl?: string | null;
  /** Se true na criação, PDF usa logo/cor da empresa */
  issuerPdfBranded?: boolean;
  /** Cor de destaque no PDF (hex), quando marca ativa */
  issuerPrimaryColor?: string;
};

/** Valor monetário único (demos usam `quoteValue`, CRM pode usar só `freightValue`). */
export function quoteMonetaryValue(q: FreightQuote): number {
  if (typeof q.quoteValue === 'number' && !Number.isNaN(q.quoteValue)) return q.quoteValue;
  if (typeof q.freightValue === 'number' && !Number.isNaN(q.freightValue)) return q.freightValue;
  return 0;
}

/** Texto para coluna «produto/serviço» em listas. */
export function quoteProductLabel(q: FreightQuote): string {
  const ps = q.productService?.trim();
  if (ps) return ps;
  const parts = [q.cargoType?.trim(), q.weightQty?.trim()].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  visualizado: 'Visualizado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

/**
 * Pill do estado na lista de orçamentos — cor por etapa:
 * pendente (amarelo), enviado (azul), visualizado (ciano), aprovado (verde), recusado (vermelho).
 * O terceiro argumento mantém compatibilidade com chamadas existentes (tema Zaptro).
 */
export function quoteStatusBadgeStyle(
  status: QuoteStatus,
  isDark: boolean,
  _lime: string,
): CSSProperties {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5px 11px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: '0.02em',
    boxSizing: 'border-box',
    borderWidth: 1,
    borderStyle: 'solid',
    maxWidth: '100%',
  };

  if (isDark) {
    switch (status) {
      case 'pendente':
        return {
          ...base,
          backgroundColor: 'rgba(234, 179, 8, 0.14)',
          color: '#fcd34d',
          borderColor: 'rgba(250, 204, 21, 0.42)',
        };
      case 'enviado':
        return {
          ...base,
          backgroundColor: 'rgba(59, 130, 246, 0.16)',
          color: '#93c5fd',
          borderColor: 'rgba(96, 165, 250, 0.45)',
        };
      case 'visualizado':
        return {
          ...base,
          backgroundColor: 'rgba(6, 182, 212, 0.16)',
          color: '#67e8f9',
          borderColor: 'rgba(34, 211, 238, 0.42)',
        };
      case 'aprovado':
        return {
          ...base,
          backgroundColor: 'rgba(34, 197, 94, 0.18)',
          color: '#86efac',
          borderColor: 'rgba(74, 222, 128, 0.48)',
        };
      case 'recusado':
        return {
          ...base,
          backgroundColor: 'rgba(239, 68, 68, 0.14)',
          color: '#fca5a5',
          borderColor: 'rgba(248, 113, 113, 0.45)',
          textDecoration: 'line-through',
          textDecorationColor: 'rgba(248, 113, 113, 0.55)',
        };
      default:
        return { ...base, backgroundColor: 'rgba(148, 163, 184, 0.12)', color: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.35)' };
    }
  }

  switch (status) {
    case 'pendente':
      return {
        ...base,
        backgroundColor: 'rgba(254, 243, 199, 0.95)',
        color: '#a16207',
        borderColor: 'rgba(202, 138, 4, 0.55)',
      };
    case 'enviado':
      return {
        ...base,
        backgroundColor: 'rgba(219, 234, 254, 0.95)',
        color: '#1d4ed8',
        borderColor: 'rgba(59, 130, 246, 0.5)',
      };
    case 'visualizado':
      return {
        ...base,
        backgroundColor: 'rgba(207, 250, 254, 0.95)',
        color: '#0e7490',
        borderColor: 'rgba(8, 145, 178, 0.45)',
      };
    case 'aprovado':
      return {
        ...base,
        backgroundColor: 'rgba(220, 252, 231, 0.95)',
        color: '#15803d',
        borderColor: 'rgba(34, 197, 94, 0.5)',
      };
    case 'recusado':
      return {
        ...base,
        backgroundColor: 'rgba(254, 226, 226, 0.95)',
        color: '#b91c1c',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        textDecoration: 'line-through',
        textDecorationColor: 'rgba(185, 28, 28, 0.45)',
      };
    default:
      return { ...base, backgroundColor: '#f1f5f9', color: '#334155', borderColor: 'rgba(148, 163, 184, 0.45)' };
  }
}

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
      body: `Ref. ${quote.id} · Frete R$ ${quoteMonetaryValue(quote).toLocaleString('pt-BR')}`,
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
      freightValue,
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
