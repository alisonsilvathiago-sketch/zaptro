import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Truck, CheckCircle2, XCircle, Package, MapPin, Calendar, Banknote } from 'lucide-react';
import {
  applyPublicQuoteDecision,
  findQuoteByToken,
  markQuoteVisualizado,
  QUOTE_STATUS_LABEL,
  type FreightQuote,
} from '../constants/zaptroQuotes';

const LIME = '#D9FF00';
const PAGE_BG = '#ffffff';
const TEXT = '#0f172a';
const TEXT_MUTED = '#64748b';
const TEXT_SOFT = '#475569';
const BORDER = '#e2e8f0';
const CARD_BG = '#f8fafc';

/** Fundo branco explícito (background + backgroundColor) para não perder com cache/CSS global. */
const shellBase: React.CSSProperties = {
  minHeight: '100vh',
  width: '100%',
  boxSizing: 'border-box',
  background: PAGE_BG,
  backgroundColor: PAGE_BG,
  color: TEXT,
  fontFamily: 'system-ui, sans-serif',
};

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
          <p style={{ fontSize: 18, fontWeight: 800 }}>Orçamento não encontrado</p>
          <p style={{ color: TEXT_MUTED, marginTop: 8 }}>O link pode ter expirado ou foi gerado noutro ambiente.</p>
        </div>
      </div>
    );
  }

  const { quote } = snap;
  const decided = quote.status === 'aprovado' || quote.status === 'recusado';
  const val = quote.freightValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <div
      style={{
        ...shellBase,
        padding: '24px 18px 48px',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: LIME,
          }}
        >
          <Truck size={22} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: TEXT_MUTED }}>ZAPTRO · ORÇAMENTO</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 950, letterSpacing: '-0.03em', color: TEXT }}>Proposta de frete</h1>
        </div>
      </div>

      <p style={{ margin: '0 0 18px', fontSize: 14, color: TEXT_SOFT, fontWeight: 600 }}>
        Olá, <strong style={{ color: TEXT }}>{snap.clientName}</strong>. Confere os dados e responde em um clique.
      </p>

      <div
        style={{
          borderRadius: 22,
          border: `1px solid ${BORDER}`,
          background: CARD_BG,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', color: TEXT_MUTED }}>STATUS</p>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 950, color: quote.status === 'aprovado' ? '#15803d' : quote.status === 'recusado' ? '#dc2626' : '#0f172a' }}>
          {QUOTE_STATUS_LABEL[quote.status]}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Banknote size={18} style={{ flexShrink: 0, marginTop: 2, color: '#0f172a' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED }}>VALOR DO FRETE</div>
            <div style={{ fontSize: 26, fontWeight: 950, color: TEXT }}>{val}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <MapPin size={18} style={{ flexShrink: 0, marginTop: 2, color: '#0f172a' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED }}>ROTA</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
              {quote.origin} → {quote.destination}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Package size={18} style={{ flexShrink: 0, marginTop: 2, color: '#0f172a' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED }}>CARGA / PESO</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
              {quote.cargoType} · {quote.weightQty}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Calendar size={18} style={{ flexShrink: 0, marginTop: 2, color: '#0f172a' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED }}>PRAZO DE ENTREGA</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{quote.deliveryDeadline}</div>
          </div>
        </div>
        {quote.notes ? (
          <div style={{ paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED, marginBottom: 6 }}>OBSERVAÇÕES</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: TEXT_SOFT }}>{quote.notes}</div>
          </div>
        ) : null}
      </div>

      {!decided && !done ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            type="button"
            onClick={() => onDecide('aprovar')}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 16,
              border: 'none',
              background: LIME,
              color: '#000',
              fontWeight: 950,
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <CheckCircle2 size={22} /> Aprovar orçamento
          </button>
          <button
            type="button"
            onClick={() => onDecide('recusar')}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 16,
              border: '1px solid #fecaca',
              background: '#fff',
              color: '#b91c1c',
              fontWeight: 950,
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <XCircle size={22} /> Recusar
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            background: done === 'aprovar' || quote.status === 'aprovado' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${done === 'aprovar' || quote.status === 'aprovado' ? '#bbf7d0' : '#fecaca'}`,
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 15,
            color: TEXT,
          }}
        >
          {quote.status === 'aprovado' || done === 'aprovar'
            ? 'Obrigado! A transportadora foi notificada e vai dar seguimento à operação.'
            : 'Registámos a recusa. Podes fechar esta página.'}
        </div>
      )}

      <p style={{ marginTop: 28, fontSize: 11, color: TEXT_MUTED, textAlign: 'center', lineHeight: 1.45 }}>
        Zaptro — orçamento vinculado ao CRM da transportadora (demonstração local).
      </p>
    </div>
  );
};

export default ZaptroPublicQuote;
