import React from 'react';
import toast, { type Toast } from 'react-hot-toast';

export type NotificationType = 'success' | 'error' | 'info' | 'news' | 'warning';

/** Ícone “atenção” em amarelo/âmbar (emoji ℹ️ não herda cor no mesmo jeito). */
const AttentionInfoIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10" fill="#facc15" stroke="#ca8a04" strokeWidth="1.35" />
    <circle cx="12" cy="8" r="1.35" fill="#111111" />
    <path d="M12 11.25v6.5" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const DURATION_MS: Record<NotificationType, number> = {
  success: 4800,
  error: 8200,
  info: 5200,
  warning: 6200,
  news: 5200,
};

/** Traço esquerdo por tipo (sem lime fixo): verde · vermelho · âmbar + azul/violeta para info/news. */
const ACCENT: Record<NotificationType, string> = {
  success: '#16a34a',
  error: '#dc2626',
  warning: '#ca8a04',
  info: '#2563eb',
  news: '#7c3aed',
};

/**
 * Feedback Zaptro: toast **não modal** no fundo do ecrã (título + descrição).
 * Não bloqueia cliques nem navegação — só `react-hot-toast` com `toast.custom`.
 */
export type NotifyZaptroOptions = {
  /** Evita filas de toasts iguais; o novo substitui o anterior com o mesmo id. */
  toastId?: string;
};

function ZaptroToastCard({
  t,
  type,
  title,
  message,
}: {
  t: Toast;
  type: NotificationType;
  title: string;
  message: string;
}) {
  const accent = ACCENT[type];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        /** Largura explícita — evita colapso do contentor flex do react-hot-toast (faixa ~35px). */
        width: 'min(420px, 92vw)',
        minWidth: 'min(320px, 92vw)',
        maxWidth: 'min(420px, 92vw)',
        borderRadius: 16,
        padding: '14px 16px 14px 14px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        border: '1px solid rgba(15, 23, 42, 0.1)',
        borderLeft: `3px solid ${accent}`,
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.06)',
        textAlign: 'left',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 14, letterSpacing: '-0.02em', lineHeight: 1.25, color: '#0f172a' }}>
            {title}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: '#475569', lineHeight: 1.45 }}>
            {message}
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar notificação"
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          style={{
            flexShrink: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 4,
            margin: '-4px -4px 0 0',
            borderRadius: 8,
            color: '#64748b',
            fontSize: 18,
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export const notifyZaptro = (
  type: NotificationType,
  title: string,
  message: string,
  options?: NotifyZaptroOptions,
) => {
  const duration = DURATION_MS[type];

  toast.custom((t) => <ZaptroToastCard t={t} type={type} title={title} message={message} />, {
    id: options?.toastId,
    duration,
  });
};

/** Mantido para compatibilidade. */
const ZaptroNotificationSystem: React.FC = () => null;

export default ZaptroNotificationSystem;

export { AttentionInfoIcon };
