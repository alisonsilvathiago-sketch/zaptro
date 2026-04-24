import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, QrCode, Loader2 } from 'lucide-react';
import { supabaseZaptro } from '../../lib/supabase-zaptro';

type GatewayRes = {
  value?: string;
  connected?: boolean;
  error?: string;
  status?: number;
  message?: string;
  success?: boolean;
};

const FIELD_BORDER = '#e4e4e7';
const FIELD_BG = '#fafafa';
const TITLE = '#09090b';
const MUTED = '#71717a';
const LIME = 'rgba(217, 255, 0, 1)';

export type ZaptroWhatsappQrConnectPanelProps = {
  /** UUID da empresa — define o nome da instância como em Configurações. */
  companyId: string | null;
  /** Após cadastro: cria instância e obtém o QR automaticamente. */
  autoStartWhenReady?: boolean;
  /** Modo compacto (ex.: cartão de onboarding). */
  compact?: boolean;
  /** Chamado uma vez quando a ligação fica ativa (redirect / telemetria no pai). */
  onConnected?: () => void;
};

/**
 * Mesmo modelo visual e mesma origem do QR que em Configurações (evolution-gateway):
 * placeholder → polling `qr` → imagem com overlay WhatsApp → polling `status` até `connected`.
 */
export const ZaptroWhatsappQrConnectPanel: React.FC<ZaptroWhatsappQrConnectPanelProps> = ({
  companyId,
  autoStartWhenReady = false,
  compact = false,
  onConnected,
}) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartedRef = useRef(false);
  const celebrationSentRef = useRef(false);

  const instanceName = companyId ? `instance_${companyId.substring(0, 8)}` : null;

  const stopQrPoll = useCallback(() => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
  }, []);

  const stopStatusPoll = useCallback(() => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
  }, []);

  const gatewayAction = useCallback(
    async (action: string, body: Record<string, unknown> = {}): Promise<GatewayRes> => {
      if (!instanceName) return {};
      try {
        const { data, error } = await supabaseZaptro.functions.invoke('evolution-gateway', {
          body: { action, instanceName, ...body },
        });
        if (error) {
          console.error('[ZaptroWhatsappQrConnectPanel]', error);
          return { success: false, error: error.message };
        }
        return (data || {}) as GatewayRes;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, error: msg };
      }
    },
    [instanceName]
  );

  const startStatusWatch = useCallback(() => {
    stopStatusPoll();
    let n = 0;
    statusPollRef.current = setInterval(async () => {
      n += 1;
      if (n > 120) {
        stopStatusPoll();
        return;
      }
      const res = await gatewayAction('status');
      if (res.connected) {
        stopStatusPoll();
        setConnected(true);
        setQrCode(null);
        setSyncing(false);
      }
    }, 3000);
  }, [gatewayAction, stopStatusPoll]);

  const startQrPolling = useCallback(() => {
    setSyncing(true);
    setQrCode(null);
    setErrorMsg(null);
    stopQrPoll();
    stopStatusPoll();

    let attempts = 0;
    const MAX_ATTEMPTS = 45;

    qrPollRef.current = setInterval(async () => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        stopQrPoll();
        setSyncing(false);
        setErrorMsg('Tempo limite ao obter o código. Tente gerar de novo.');
        return;
      }

      const res = await gatewayAction('qr');

      if (res.value) {
        setQrCode(res.value);
        setSyncing(false);
        setErrorMsg(null);
        stopQrPoll();
        startStatusWatch();
      } else if (res.connected) {
        stopQrPoll();
        setSyncing(false);
        setQrCode(null);
        setConnected(true);
        setErrorMsg(null);
      } else if (res.error || (res.status != null && res.status !== 200)) {
        setErrorMsg(String(res.error || res.message || 'Resposta inválida do servidor.'));
        if (res.status === 401 || res.status === 404) {
          stopQrPoll();
          setSyncing(false);
        }
      }
    }, 4000);
  }, [gatewayAction, startStatusWatch, stopQrPoll]);

  const beginConnectFlow = useCallback(async () => {
    if (!instanceName) return;
    setSyncing(true);
    setErrorMsg(null);
    setConnected(false);
    celebrationSentRef.current = false;
    try {
      await supabaseZaptro.auth.refreshSession();
      await gatewayAction('create-instance');
      startQrPolling();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setSyncing(false);
      stopQrPoll();
      stopStatusPoll();
    }
  }, [gatewayAction, instanceName, startQrPolling, stopQrPoll, stopStatusPoll]);

  useEffect(() => {
    if (!autoStartWhenReady || !companyId || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void beginConnectFlow();
  }, [autoStartWhenReady, companyId, beginConnectFlow]);

  useEffect(() => {
    return () => {
      stopQrPoll();
      stopStatusPoll();
    };
  }, [stopQrPoll, stopStatusPoll]);

  useEffect(() => {
    if (!connected || celebrationSentRef.current) return;
    celebrationSentRef.current = true;
    onConnected?.();
  }, [connected, onConnected]);

  const handleManualGenerate = () => {
    if (!companyId) return;
    autoStartedRef.current = true;
    void beginConnectFlow();
  };

  if (connected) {
    return (
      <div
        className="zaptro-wa-qr-success-pop"
        style={{
          padding: compact ? '20px 16px' : '28px 20px',
          textAlign: 'center',
          border: `1px solid ${FIELD_BORDER}`,
          borderRadius: 20,
          backgroundColor: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div
            style={{
              width: compact ? 72 : 88,
              height: compact ? 72 : 88,
              borderRadius: 999,
              border: `2px solid ${LIME}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(217, 255, 0, 0.12)',
            }}
          >
            <CheckCircle2 size={compact ? 34 : 40} color="#15803d" strokeWidth={2.2} />
          </div>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: compact ? 18 : 20, fontWeight: 700, color: TITLE, letterSpacing: '-0.02em' }}>
          WhatsApp ligado
        </p>
        <p style={{ margin: 0, fontSize: 13, color: MUTED, fontWeight: 600, lineHeight: 1.55 }}>
          A linha está ativa. A redirecionar para o painel…
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {errorMsg ? (
        <div
          role="alert"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #fecdd3',
            backgroundColor: '#fff1f2',
            color: '#be123c',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.45,
            boxSizing: 'border-box',
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <div style={{ width: '100%', maxWidth: compact ? 320 : 400, margin: '0 auto' }}>
        {qrCode ? (
          <div style={{ position: 'relative', lineHeight: 0 }} className="zaptro-wa-qr-pulse-reg">
            <div
              style={{
                position: 'relative',
                padding: compact ? 12 : 14,
                backgroundColor: '#fff',
                borderRadius: 16,
                border: `1px solid ${FIELD_BORDER}`,
              }}
            >
              <img
                src={qrCode}
                alt="Código QR WhatsApp"
                style={{
                  width: '100%',
                  maxWidth: compact ? 220 : 300,
                  height: 'auto',
                  aspectRatio: '1',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#fff',
                    padding: 8,
                    borderRadius: '50%',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12.0004 0C5.38531 0 0.000732422 5.38458 0.000732422 12.0004C0.000732422 14.3986 0.702931 16.6346 1.91 18.5204L0.0102539 24L5.65961 22.1207C7.45899 23.313 9.6469 24.0007 12.0004 24.0007C18.6154 24.0007 24 18.6162 24 12.0004C24 5.38458 18.6154 0 12.0004 0Z"
                      fill="#25D366"
                    />
                    <path
                      d="M17.51 14.88C17.21 14.73 15.73 14 15.45 13.9C15.17 13.8 14.97 13.75 14.77 14.05C14.57 14.35 14 15.06 13.83 15.26C13.66 15.46 13.49 15.48 13.19 15.33C12.89 15.18 11.93 14.87 10.79 13.85C9.9 13.06 9.3 12.08 9.12 11.78C8.95 11.48 9.1 11.32 9.25 11.17C9.39 11.03 9.56 10.81 9.71 10.63C9.86 10.45 9.91 10.33 10.01 10.13C10.11 9.93 10.06 9.76 9.98 9.61C9.91 9.46 9.31 7.98 9.06 7.37C8.82 6.78 8.57 6.86 8.39 6.86C8.22 6.86 8.02 6.85 7.82 6.85C7.62 6.85 7.3 6.93 7.03 7.22C6.77 7.51 6.02 8.21 6.02 9.64C6.02 11.07 7.06 12.44 7.2 12.64C7.35 12.84 9.24 15.74 12.14 16.99C12.83 17.29 13.35 17.46 13.77 17.6C14.47 17.82 15.1 17.79 15.6 17.71C16.16 17.63 17.31 17.02 17.55 16.34C17.79 15.66 17.79 15.08 17.72 14.96C17.65 14.83 17.47 14.77 17.17 14.62"
                      fill="white"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: MUTED, fontWeight: 600, textAlign: 'center', lineHeight: 1.5 }}>
              Abra o WhatsApp → Aparelhos ligados → Ligar um aparelho e aponte para o código.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: compact ? 120 : 132,
                height: compact ? 120 : 132,
                borderRadius: 16,
                backgroundColor: FIELD_BG,
                border: `1px dashed ${FIELD_BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              {syncing ? <Loader2 size={40} color="#09090b" className="zaptro-reg-qr-spin" /> : <QrCode size={56} color="#a3a3a3" strokeWidth={1.5} />}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: TITLE, textAlign: 'center', padding: '0 8px', fontWeight: 700 }}>
              {syncing ? 'A gerar código…' : companyId ? 'A aguardar o código…' : 'Código aparece aqui'}
            </p>
            <p style={{ marginTop: 6, fontSize: 12, color: MUTED, textAlign: 'center', padding: '0 8px', fontWeight: 600, lineHeight: 1.45 }}>
              {syncing
                ? 'Aguarde alguns segundos. É o mesmo fluxo da página de Configuração.'
                : companyId
                  ? 'Se demorar, pode tentar gerar de novo.'
                  : 'Depois de criar a conta, geramos o código automaticamente.'}
            </p>
          </div>
        )}
      </div>

      {companyId && !qrCode && !connected && !syncing && (!autoStartWhenReady || errorMsg) ? (
        <button
          type="button"
          onClick={handleManualGenerate}
          style={{
            padding: '12px 20px',
            borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.14)',
            background: '#000000',
            color: LIME,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <QrCode size={18} strokeWidth={2} color={LIME} />
          {errorMsg ? 'Tentar de novo' : 'Gerar código QR'}
        </button>
      ) : null}

      <style>{`
        @keyframes zaptroRegQrSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .zaptro-reg-qr-spin {
          animation: zaptroRegQrSpin 0.9s linear infinite;
        }
        @keyframes zaptroWaQrPulseReg {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .zaptro-wa-qr-pulse-reg {
          animation: zaptroWaQrPulseReg 3s infinite ease-in-out;
        }
        @keyframes zaptroWaSuccessPop {
          0% { transform: scale(0.92); opacity: 0; }
          55% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .zaptro-wa-qr-success-pop {
          animation: zaptroWaSuccessPop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  );
};

export default ZaptroWhatsappQrConnectPanel;
