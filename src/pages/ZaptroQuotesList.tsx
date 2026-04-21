import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileSpreadsheet, RefreshCw } from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { useAuth } from '../context/AuthContext';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import {
  QUOTE_STATUS_LABEL,
  readAllQuotesFlattened,
  quotePublicPath,
  seedDemoQuotesIfEmpty,
  type FreightQuoteWithLead,
} from '../constants/zaptroQuotes';

function formatBrl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function kanbanStorageKey(crmStorageId: string) {
  return `zaptro_crm_kanban_v3_${crmStorageId}`;
}

function readLeadNames(crmStorageId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(kanbanStorageKey(crmStorageId));
    if (!raw) return {};
    const leads = JSON.parse(raw) as Array<{ id: string; clientName?: string }>;
    const m: Record<string, string> = {};
    for (const l of leads) {
      if (l?.id) m[l.id] = (l.clientName || '').trim() || '—';
    }
    return m;
  } catch {
    return {};
  }
}

const ZaptroQuotesListContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { palette } = useZaptroTheme();
  const crmStorageId = profile?.company_id || 'local-demo';
  const leadFilter = searchParams.get('leadId');

  const [rows, setRows] = useState<FreightQuoteWithLead[]>([]);
  const [leadNames, setLeadNames] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    seedDemoQuotesIfEmpty(crmStorageId);
    setRows(readAllQuotesFlattened(crmStorageId));
    setLeadNames(readLeadNames(crmStorageId));
  }, [crmStorageId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onUpd = () => load();
    window.addEventListener('zaptro-quotes-updated', onUpd);
    return () => window.removeEventListener('zaptro-quotes-updated', onUpd);
  }, [load]);

  const filtered = useMemo(() => {
    if (!leadFilter) return rows;
    return rows.filter((r) => r.leadId === leadFilter);
  }, [rows, leadFilter]);

  const border = palette.sidebarBorder;
  const isDark = palette.mode === 'dark';
  const th = palette.textMuted;
  const cellBg = isDark ? 'rgba(255,255,255,0.03)' : '#fff';

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button
            type="button"
            onClick={() => navigate(ZAPTRO_ROUTES.COMMERCIAL_CRM)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 14,
              border: `1px solid ${border}`,
              background: palette.searchBg,
              color: palette.text,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={18} /> CRM
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 950, letterSpacing: '-0.04em', color: palette.text }}>
              Orçamentos
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {leadFilter ? (
            <button
              type="button"
              onClick={() => navigate(ZAPTRO_ROUTES.COMMERCIAL_QUOTES)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 14,
                border: `1px solid ${border}`,
                background: 'transparent',
                color: palette.textMuted,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Limpar filtro do lead
            </button>
          ) : null}
        <button
          type="button"
          onClick={() => load()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 14,
            border: `1px solid ${border}`,
            background: palette.searchBg,
            color: palette.text,
            fontWeight: 900,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={16} /> Atualizar
        </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: '28px 32px',
            borderRadius: 20,
            border: `1px dashed ${border}`,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa',
            color: palette.textMuted,
            fontWeight: 700,
            fontSize: 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, width: '100%', maxWidth: 640, textAlign: 'left' }}>
            <FileSpreadsheet size={40} color={palette.lime} style={{ flexShrink: 0, opacity: 0.9, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 950, fontSize: 17, color: palette.text, letterSpacing: '-0.02em' }}>
                Nenhum orçamento encontrado{leadFilter ? ' para este lead' : ''}.
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: palette.textMuted }}>
                Cria orçamentos a partir de um lead no <strong style={{ color: palette.text }}>CRM (Kanban)</strong>. Quando existir
                linha na tabela, usa «Página do cliente» para o link que o contacto abre no telemóvel — é aí que responde ao orçamento,
                não nesta página (vista interna).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 18, border: `1px solid ${border}`, backgroundColor: cellBg }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}`, textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', fontWeight: 950, color: th, fontSize: 11, letterSpacing: '0.06em' }}>ID</th>
                <th style={{ padding: '12px 14px', fontWeight: 950, color: th, fontSize: 11, letterSpacing: '0.06em' }}>Cliente / lead</th>
                <th style={{ padding: '12px 14px', fontWeight: 950, color: th, fontSize: 11, letterSpacing: '0.06em' }}>Valor</th>
                <th style={{ padding: '12px 14px', fontWeight: 950, color: th, fontSize: 11, letterSpacing: '0.06em' }}>Estado</th>
                <th style={{ padding: '12px 14px', fontWeight: 950, color: th, fontSize: 11, letterSpacing: '0.06em' }}>Produto/Serviço</th>
                <th style={{ padding: '12px 14px', fontWeight: 950, color: th, fontSize: 11, letterSpacing: '0.06em' }}>Criado</th>
                <th style={{ padding: '12px 14px', fontWeight: 950, color: th, fontSize: 11, letterSpacing: '0.06em' }}>
                  Página do cliente
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const client = leadNames[q.leadId] || q.clientNameSnapshot || '—';
                const publicUrl = `${window.location.origin}${quotePublicPath(q.token)}`;
                return (
                  <tr key={q.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: palette.text, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                      {q.id.length > 14 ? `${q.id.slice(0, 12)}…` : q.id}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: palette.text }}>
                      <div>{client}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: palette.textMuted, marginTop: 2 }}>Lead: {q.leadId}</div>
                    </td>
                     <td style={{ padding: '12px 14px', fontWeight: 950, color: palette.text }}>{formatBrl(q.quoteValue)}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: palette.text }}>{QUOTE_STATUS_LABEL[q.status]}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: palette.text, maxWidth: 220 }}>
                      {q.productService}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: palette.textMuted, whiteSpace: 'nowrap' }}>
                      {new Date(q.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 900,
                          fontSize: 12,
                          color: palette.text,
                        }}
                      >
                        Abrir página pública <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ZaptroQuotesList: React.FC = () => (
  <ZaptroLayout contentFullWidth>
    <ZaptroQuotesListContent />
  </ZaptroLayout>
);

export default ZaptroQuotesList;
