import React from 'react';
import { CreditCard, Mail, RefreshCw, Shield } from 'lucide-react';
import { ZAPTRO_SHADOW } from '../../constants/zaptroShadows';

type Props = {
  open: boolean;
  email?: string | null;
  onGoToBilling: () => void;
  onRecheck: () => void;
  rechecking?: boolean;
};

/**
 * Bloqueio suave até plano ativo: o vínculo do pagamento é o mesmo e-mail do login (Supabase Auth).
 * Após o gateway confirmar, o backend deve atualizar `billing_status` / `status_zaptro` e o usuário usa "Atualizar".
 */
const ZaptroPlanGateModal: React.FC<Props> = ({ open, email, onGoToBilling, onRecheck, rechecking }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="zaptro-plan-gate-title"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          borderRadius: 28,
          backgroundColor: '#fff',
          boxShadow: ZAPTRO_SHADOW.lg,
          border: '1px solid #e2e8f0',
          padding: '28px 28px 24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={26} color="#059669" />
          </div>
          <div>
            <h2 id="zaptro-plan-gate-title" style={{ margin: 0, fontSize: 20, fontWeight: 950, color: '#0f172a' }}>
              Ative seu plano
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              Contratação segura vinculada ao seu acesso
            </p>
          </div>
        </div>

        <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: '0 0 16px' }}>
          Sua transportadora já está cadastrada, mas o sistema ainda não encontrou <strong>plano pago em dia</strong> (período de teste
          encerrado, fatura em atraso ou conta bloqueada no hub). O pagamento é associado ao <strong>mesmo e-mail do login</strong> — quando
          a API de cobrança confirmar, atualize o cadastro e use o botão abaixo para recarregar o status.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 14,
            background: '#f4f4f4',
            border: '1px solid #e2e8f0',
            marginBottom: 20,
          }}
        >
          <Mail size={18} color="#64748b" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Conta (login)</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>{email || '—'}</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55, margin: '0 0 20px' }}>
          Você pode trocar o <strong>WhatsApp</strong> (um número por vez) ou os <strong>dados da empresa</strong> depois, sem perder o
          plano — o que vale para a cobrança é este e-mail e a senha da conta.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={onGoToBilling}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              padding: '16px 18px',
              borderRadius: 16,
              border: 'none',
              background: '#0f172a',
              color: '#fff',
              fontSize: 15,
              fontWeight: 950,
              cursor: 'pointer',
            }}
          >
            <CreditCard size={18} /> Ver planos e assinatura
          </button>
          <button
            type="button"
            onClick={onRecheck}
            disabled={rechecking}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 14,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 850,
              cursor: rechecking ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw
              size={16}
              style={rechecking ? { animation: 'ztPlanSpin 0.75s linear infinite' } : undefined}
            />
            {rechecking ? 'Atualizando…' : 'Já paguei — atualizar status'}
          </button>
        </div>
      </div>
      <style>{`@keyframes ztPlanSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ZaptroPlanGateModal;
