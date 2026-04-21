import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Truck, CheckCircle2, XCircle, Package, MapPin, Calendar, Banknote, FileDown } from 'lucide-react';
import {
  applyPublicQuoteDecision,
  findQuoteByToken,
  markQuoteVisualizado,
  QUOTE_STATUS_LABEL,
  quoteMonetaryValue,
  quoteProductLabel,
  type FreightQuote,
} from '../constants/zaptroQuotes';

const LIME = '#D9FF00';
const PAGE_BG = '#ffffff';
const TEXT = '#0f172a';
const TEXT_MUTED = '#64748b';
const TEXT_SOFT = '#475569';
const BORDER = '#e4e4e4';
const CARD_BG = '#f4f4f4';

const shellBase: React.CSSProperties = {
  minHeight: '100vh',
  width: '100%',
  boxSizing: 'border-box',
  background: PAGE_BG,
  backgroundColor: PAGE_BG,
  color: TEXT,
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
};

function pdfTotalAccent(q: FreightQuote): string {
  const c = q.issuerPrimaryColor?.trim();
  if (c && /^#[0-9A-Fa-f]{3,8}$/.test(c)) return c;
  return '#0369a1';
}

function issuerLabel(q: FreightQuote): string {
  return q.issuerCompanyName?.trim() || 'Zaptro';
}

/**
 * Link público do orçamento — cliente aprova ou recusa (sem login).
 * Dados em `localStorage` até existir API multi-tenant.
 */
const ZaptroPublicQuote: React.FC = () => {
  const { token: rawToken = '' } = useParams<{ token: string }>();
  const token = useMemo(() => decodeURIComponent(rawToken || ''), [rawToken]);
  const [snap, setSnap] = useState<{ quote: FreightQuote; clientName: string } | null>(null);
  const [done, setDone] = useState<'aprovar' | 'recusar' | null>(null);

  useEffect(() => {
    if (!token) return;
    markQuoteVisualizado(token);
    const found = findQuoteByToken(token);
    if (!found) {
      setSnap(null);
      return;
    }
    setSnap({ quote: found.quote, clientName: found.quote.clientNameSnapshot || 'Cliente' });
  }, [token]);

  const refresh = () => {
    const found = findQuoteByToken(token);
    if (found) setSnap({ quote: found.quote, clientName: found.quote.clientNameSnapshot || 'Cliente' });
  };

  const onDecide = (d: 'aprovar' | 'recusar') => {
    const ok = applyPublicQuoteDecision(token, d).ok;
    if (ok) {
      setDone(d);
      refresh();
    }
  };

  const printProposalPdf = () => {
    window.print();
  };

  if (!token) {
    return (
      <div style={{ ...shellBase, padding: 24 }}>
        <p style={{ fontWeight: 700 }}>Link inválido.</p>
      </div>
    );
  }

  if (!snap) {
    return (
      <div
        style={{
          ...shellBase,
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 800 }}>Orçamento não encontrado</p>
          <p style={{ color: TEXT_MUTED, marginTop: 8 }}>O link pode ter expirado ou foi gerado noutro ambiente.</p>
        </div>
      </div>
    );
  }

  const { quote } = snap;
  const decided = quote.status === 'aprovado' || quote.status === 'recusado';
  const amount = quoteMonetaryValue(quote);
  const val = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const valFull = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  const routeLine = [quote.origin, quote.destination].filter(Boolean).join(' → ') || '—';
  const cargoLine = quoteProductLabel(quote);
  const accent = pdfTotalAccent(quote);
  const issuer = issuerLabel(quote);
  const branded = Boolean(quote.issuerPdfBranded && quote.issuerLogoUrl);
  const quoteDate = new Date(quote.createdAt).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const statusPdf = QUOTE_STATUS_LABEL[quote.status];

  const btnFull: React.CSSProperties = {
    width: '100%',
    padding: 'clamp(14px, 3.5vw, 16px) clamp(16px, 4vw, 20px)',
    borderRadius: 16,
    fontWeight: 950,
    fontSize: 'clamp(15px, 3.8vw, 16px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  return (
    <div id="zaptro-public-quote-root" style={shellBase}>
      <style>{`
        @media screen {
          .zaptro-quote-pdf-sheet { display: none !important; }
        }
        @media print {
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #zaptro-public-quote-root { min-height: auto !important; }
          .zaptro-pq-screen { display: none !important; }
          .zaptro-quote-pdf-sheet {
            display: block !important;
            position: relative;
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 0;
            background: #fff !important;
          }
        }
        @page { size: A4; margin: 14mm; }
      `}</style>

      <div
        className="zaptro-pq-screen"
        style={{
          padding: 'clamp(16px, 4vw, 28px) clamp(14px, 3vw, 24px) clamp(32px, 6vw, 48px)',
          maxWidth: 'min(560px, 100%)',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div
            style={{
              width: 'clamp(40px, 10vw, 44px)',
              height: 'clamp(40px, 10vw, 44px)',
              borderRadius: 14,
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: LIME,
              flexShrink: 0,
            }}
          >
            <Truck size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 'clamp(10px, 2.6vw, 11px)',
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: TEXT_MUTED,
              }}
            >
              ZAPTRO · ORÇAMENTO
            </p>
            <h1
              style={{
                margin: '4px 0 0',
                fontSize: 'clamp(18px, 5vw, 22px)',
                fontWeight: 950,
                letterSpacing: '-0.03em',
                color: TEXT,
                lineHeight: 1.15,
              }}
            >
              Proposta de frete
            </h1>
          </div>
        </div>

        <p style={{ margin: '0 0 18px', fontSize: 'clamp(13px, 3.5vw, 14px)', color: TEXT_SOFT, fontWeight: 600 }}>
          Olá, <strong style={{ color: TEXT }}>{snap.clientName}</strong>. Confere os dados e responde em um clique.
        </p>

        <div
          style={{
            borderRadius: 22,
            border: `1px solid ${BORDER}`,
            background: CARD_BG,
            padding: 'clamp(16px, 4vw, 20px)',
            marginBottom: 20,
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', color: TEXT_MUTED }}>
            STATUS
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(15px, 4vw, 16px)',
              fontWeight: 950,
              color: quote.status === 'aprovado' ? '#15803d' : quote.status === 'recusado' ? '#dc2626' : '#0f172a',
            }}
          >
            {QUOTE_STATUS_LABEL[quote.status]}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Banknote size={18} style={{ flexShrink: 0, marginTop: 2, color: '#0f172a' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED }}>VALOR DO FRETE</div>
              <div style={{ fontSize: 'clamp(22px, 6vw, 26px)', fontWeight: 950, color: TEXT }}>{val}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <MapPin size={18} style={{ flexShrink: 0, marginTop: 2, color: '#0f172a' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED }}>ROTA</div>
              <div style={{ fontSize: 'clamp(14px, 3.8vw, 15px)', fontWeight: 700, color: TEXT, wordBreak: 'break-word' }}>
                {routeLine}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Package size={18} style={{ flexShrink: 0, marginTop: 2, color: '#0f172a' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED }}>CARGA / PESO</div>
              <div style={{ fontSize: 'clamp(14px, 3.8vw, 15px)', fontWeight: 700, color: TEXT, wordBreak: 'break-word' }}>
                {cargoLine}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Calendar size={18} style={{ flexShrink: 0, marginTop: 2, color: '#0f172a' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED }}>PRAZO DE ENTREGA</div>
              <div style={{ fontSize: 'clamp(14px, 3.8vw, 15px)', fontWeight: 700, color: TEXT }}>{quote.deliveryDeadline}</div>
            </div>
          </div>
          {quote.notes ? (
            <div style={{ paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED, marginBottom: 6 }}>OBSERVAÇÕES</div>
              <div style={{ fontSize: 'clamp(13px, 3.5vw, 14px)', lineHeight: 1.5, color: TEXT_SOFT, wordBreak: 'break-word' }}>
                {quote.notes}
              </div>
            </div>
          ) : null}
        </div>

        <div className="zaptro-pq-no-print" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 }}>
          <button type="button" onClick={() => printProposalPdf()} style={{ ...btnFull, border: '2px solid #0f172a', background: '#fff', color: '#0f172a' }}>
            <FileDown size={22} strokeWidth={2.25} /> Baixar proposta (PDF)
          </button>
          <p style={{ margin: 0, fontSize: 11, color: TEXT_MUTED, textAlign: 'center', lineHeight: 1.45 }}>
            Abre a impressão do browser — escolhe «Guardar como PDF» para enviar ao teu diretor.
          </p>
        </div>

        {!decided && !done ? (
          <div className="zaptro-pq-no-print" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="button" onClick={() => onDecide('aprovar')} style={{ ...btnFull, border: 'none', background: LIME, color: '#000' }}>
              <CheckCircle2 size={22} /> Aprovar orçamento
            </button>
            <button
              type="button"
              onClick={() => onDecide('recusar')}
              style={{
                ...btnFull,
                padding: 'clamp(12px, 3.2vw, 14px) clamp(16px, 4vw, 20px)',
                border: '1px solid #fecaca',
                background: '#fff',
                color: '#b91c1c',
                fontSize: 'clamp(14px, 3.6vw, 15px)',
              }}
            >
              <XCircle size={22} /> Recusar
            </button>
          </div>
        ) : (
          <div
            className="zaptro-pq-no-print"
            style={{
              padding: 18,
              borderRadius: 18,
              background: done === 'aprovar' || quote.status === 'aprovado' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${done === 'aprovar' || quote.status === 'aprovado' ? '#bbf7d0' : '#fecaca'}`,
              textAlign: 'center',
              fontWeight: 800,
              fontSize: 'clamp(14px, 3.6vw, 15px)',
              color: TEXT,
            }}
          >
            {quote.status === 'aprovado' || done === 'aprovar'
              ? 'Obrigado! A transportadora foi notificada e vai dar seguimento à operação.'
              : 'Registámos a recusa. Podes fechar esta página.'}
          </div>
        )}

        <p className="zaptro-pq-no-print" style={{ marginTop: 28, fontSize: 11, color: TEXT_MUTED, textAlign: 'center', lineHeight: 1.45 }}>
          Zaptro — orçamento vinculado ao CRM da transportadora (demonstração local).
        </p>
      </div>

      {/* Folha só impressão — estilo orçamento profissional */}
      <div className="zaptro-quote-pdf-sheet" aria-hidden="true">
        <div
          style={{
            background: '#eef2f6',
            borderRadius: 12,
            padding: '28px 24px 24px',
            marginBottom: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              {branded ? (
                <img
                  src={quote.issuerLogoUrl!}
                  alt=""
                  style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: LIME,
                    }}
                  >
                    <Truck size={26} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em' }}>ZAPTRO</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Transporte inteligente</div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', minWidth: 140 }}>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.06em', color: '#334155' }}>{issuer.toUpperCase()}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>Documento para aprovação interna</div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 20,
              marginTop: 28,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: '#64748b', marginBottom: 8 }}>DESTINATÁRIO</div>
              <div style={{ fontSize: 15, fontWeight: 950, color: '#0f172a' }}>{snap.clientName}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 6, lineHeight: 1.45 }}>
                Orçamento de frete rodoviário conforme dados abaixo.
              </div>
            </div>
            <div style={{ textAlign: 'right', flex: '0 1 auto' }}>
              <div style={{ fontSize: 28, fontWeight: 950, color: '#0f172a', letterSpacing: '-0.03em' }}>Orçamento</div>
              <div style={{ marginTop: 10, fontSize: 11 }}>
                <span style={{ fontWeight: 800, color: '#334155' }}>REF.</span>{' '}
                <span style={{ color: '#0f172a' }}>{quote.id}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11 }}>
                <span style={{ fontWeight: 800, color: '#334155' }}>DATA</span>{' '}
                <span style={{ color: '#0f172a' }}>{quoteDate}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11 }}>
                <span style={{ fontWeight: 800, color: '#334155' }}>STATUS</span>{' '}
                <span style={{ color: '#0f172a' }}>{statusPdf}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 4px 0', background: '#fff' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['DESCRIÇÃO', 'DETALHE', 'VALOR'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === 'VALOR' ? 'right' : 'left',
                      padding: '10px 8px',
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                      color: '#64748b',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '14px 8px', verticalAlign: 'top', fontWeight: 700, color: '#0f172a' }}>Frete rodoviário</td>
                <td style={{ padding: '14px 8px', verticalAlign: 'top', color: '#334155', lineHeight: 1.5 }}>
                  <div>
                    <strong>Rota:</strong> {routeLine}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Carga / peso:</strong> {cargoLine}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Prazo:</strong> {quote.deliveryDeadline}
                  </div>
                  {quote.notes ? (
                    <div style={{ marginTop: 6 }}>
                      <strong>Obs.:</strong> {quote.notes}
                    </div>
                  ) : null}
                </td>
                <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>{valFull}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: 220 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 8 }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{valFull}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: 12,
                  borderTop: '2px solid #e2e8f0',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.06em', color: '#334155' }}>TOTAL</span>
                <span style={{ fontSize: 22, fontWeight: 950, color: accent }}>{valFull}</span>
              </div>
            </div>
          </div>

          <p
            style={{
              margin: '32px 0 0',
              textAlign: 'center',
              fontSize: 11,
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            Documento gerado para apresentação interna. O valor e condições vinculam-se ao registo no CRM da transportadora.
          </p>
          <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>
            {issuer} · ref. {quote.id}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ZaptroPublicQuote;
