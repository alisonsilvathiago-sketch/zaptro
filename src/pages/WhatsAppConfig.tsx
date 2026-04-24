import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, QrCode, Loader2, MessageCircle, Link2, Scan } from 'lucide-react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER } from '../constants/zaptroUi';
import {
  zaptroCardSurfaceStyle,
  zaptroCardRowStyle,
  zaptroIconOrbStyle,
  ZAPTRO_ICON_ORB_FG,
} from '../constants/zaptroCardSurface';

/**
 * WhatsApp liga-se a um fornecedor externo na edge; em código/comentários técnicos pode referir-se a isso,
 * mas strings visíveis ao utilizador devem falar só em Zaptro — nunca expor o nome do fornecedor na UI.
 */

const WhatsAppConfig: React.FC = () => {
  const { profile } = useAuth();
  const { palette } = useZaptroTheme();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [syncing, setSyncing] = useState(false);
  const [step, setStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrExpiryTime, setQrExpiryTime] = useState<number>(0);
  const [qrCountdown, setQrCountdown] = useState<number>(0);
  const pollIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);


  const gatewayAction = async (action: string, body: any = {}) => {
    try {
      // Usar company_id como nome da instância para isolamento multi-tenant
      const instanceName = profile?.company_id ? `instance_${profile.company_id.substring(0, 8)}` : 'default';
      
      const { data, error } = await supabaseZaptro.functions.invoke('evolution-gateway', {
        body: { action, instanceName, ...body }
      });
      if (error) {
        console.error('[gatewayAction] Function Error:', error);
        throw error;
      }
      return data || {};
    } catch (e: any) { 
      console.error('[gatewayAction] Catch Error:', e);
      return { success: false, error: e.message || String(e) }; 
    }
  };

  const isMaster = profile?.role?.toUpperCase() === 'MASTER' || profile?.role?.toUpperCase() === 'ADMIN';
  const isAdmin = isMaster; 

  const [loadingAction, setLoadingAction] = useState(false);

  const syncState = async () => {
    if (!profile?.company_id) return;
    
    setLoadingAction(true);
    const res = await gatewayAction('status');
    
    if (res.connected) {
      setStatus('connected');
    } else {
      setStatus('disconnected');
    }
    setLoadingAction(false);
  };

  useEffect(() => {
    syncState();
    return () => clearInterval(pollIntervalRef.current);
  }, [profile?.company_id]);

  const startPolling = () => {
    setSyncing(true);
    setQrCode(null);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // 2 min timeout for QR

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(pollIntervalRef.current);
        setSyncing(false);
        setStep("");
        setErrorMsg('Tempo limite esgotado. Verifique a sua ligação à internet e tente novamente.');
        return;
      }

      const res = await gatewayAction('qr');
      console.log('[Poll] Response:', res);
      
      if (res.value) {
        setQrCode(res.value);
        setSyncing(false);
        setStep("");
        setErrorMsg(null);
      } else if (res.connected) {
        clearInterval(pollIntervalRef.current);
        setStatus('connected');
        setSyncing(false);
        setQrCode(null);
      } else if (res.error || (res.status && res.status !== 200)) {
        // Se houver erro, vamos mostrar na tela para o usuário saber o que é
        setErrorMsg(`Erro no serviço Zaptro: ${res.error || res.message || 'Resposta inválida'}`);
        if (res.status === 401 || res.status === 404) {
          clearInterval(pollIntervalRef.current);
          setSyncing(false);
        }
      }
    }, 4000);
  };

  const handleSimpleReconnect = async () => {
    if (!isAdmin || !profile?.company_id) return;
    
    setLoadingAction(true);
    setErrorMsg(null);

    try {
      // Garantir que a sessão está ativa antes de chamar a edge function
      await supabaseZaptro.auth.refreshSession();
      
      setStep('A contactar servidor...');
      // Tentar criar a instância (se já existir, a Evolution API ignora ou retorna erro que tratamos)
      await gatewayAction('create-instance');
      
      setStep('A gerar código QR…');
      // Iniciar countdown de 60 segundos
      setQrCountdown(60);
      startPolling();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLogout = async () => {
    if (!isAdmin || !profile?.company_id) return;
    setLoadingAction(true);
    try {
      await gatewayAction('logout');
      setStatus('disconnected');
      setQrCode(null);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRestart = async () => {
     if (!isMaster) return;
     setLoadingAction(true);
     try {
       await gatewayAction('reconnect');
       await syncState();
     } catch (e: any) {
       setErrorMsg(e.message);
     } finally {
       setLoadingAction(false);
     }
  };

  // Countdown timer for QR code expiry
  useEffect(() => {
    if (qrCountdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            // Auto-refresh when countdown reaches 0
            handleSimpleReconnect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [qrCountdown]);

  const isDark = palette.mode === 'dark';
  const fieldBorder = isDark ? 'rgba(255,255,255,0.12)' : ZAPTRO_SECTION_BORDER;
  const fieldBg = isDark ? 'rgba(255,255,255,0.04)' : ZAPTRO_FIELD_BG;
  const titleColor = palette.text;
  const muted = palette.textMuted;
  const lime = palette.lime;

  const statusConnected = status === 'connected';

  const stepOrb = (): React.CSSProperties => ({
    ...zaptroIconOrbStyle({ size: 44, rounded: 'card' }),
    flexShrink: 0,
  });

  const mainColumn = (
    <div style={{ padding: '0 4px 0 0' }}>
      <p
        style={{
          margin: '0 0 14px 0',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: muted,
        }}
      >
        TRÊS PASSOS
      </p>

      <div style={styles.stepsContainer}>
        <div style={{ ...zaptroCardRowStyle(isDark), ...styles.stepItem }} className="zaptro-wa-step">
          <div style={styles.stepNumberContainer}>
            <div style={stepOrb()}>
              <Scan size={20} color={ZAPTRO_ICON_ORB_FG} strokeWidth={2.4} />
            </div>
            <div style={{ ...styles.stepLine, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
          </div>
          <div>
            <p style={{ ...styles.stepText, color: titleColor, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Capturar o código QR</p>
            <p style={{ fontSize: 13, color: muted, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>Use a câmara do telemóvel para ler o código à direita.</p>
          </div>
        </div>

        <div style={{ ...zaptroCardRowStyle(isDark), ...styles.stepItem }} className="zaptro-wa-step">
          <div style={styles.stepNumberContainer}>
            <div style={stepOrb()}>
              <Link2 size={20} color={ZAPTRO_ICON_ORB_FG} strokeWidth={2.4} />
            </div>
            <div style={{ ...styles.stepLine, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
          </div>
          <div>
            <p style={{ ...styles.stepText, color: titleColor, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Abrir o WhatsApp</p>
            <p style={{ fontSize: 13, color: muted, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>Confirme na app quando o Zaptro pedir ligação.</p>
          </div>
        </div>

        <div style={{ ...zaptroCardRowStyle(isDark), ...styles.stepItem }} className="zaptro-wa-step">
          <div style={styles.stepNumberContainer}>
            <div style={stepOrb()}>
              <CheckCircle2 size={20} color={ZAPTRO_ICON_ORB_FG} strokeWidth={2.4} />
            </div>
          </div>
          <div>
            <p style={{ ...styles.stepText, color: titleColor, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Pronto</p>
            <p style={{ fontSize: 13, color: muted, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>A linha fica disponível na caixa de entrada Zaptro.</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <button
          type="button"
          onClick={handleSimpleReconnect}
          disabled={syncing || loadingAction}
          className="zaptro-wa-connect-btn"
          style={{
            ...styles.connectBtn,
            background: '#000000',
            color: lime,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'}`,
            opacity: syncing || loadingAction ? 0.55 : 1,
            cursor: syncing || loadingAction ? 'not-allowed' : 'pointer',
            boxShadow: isDark ? 'none' : '0 4px 20px rgba(15, 23, 42, 0.08)',
          }}
        >
          {syncing || loadingAction ? (
            <>
              <Loader2 size={18} className="zaptro-wa-spin" />
              A gerar código…
            </>
          ) : (
            <>
              <QrCode size={20} strokeWidth={2} color={lime} />
              Gerar código QR
            </>
          )}
        </button>
      </div>

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button
          type="button"
          style={{
            ...styles.waLink,
            color: titleColor,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
            textDecoration: 'underline',
            fontWeight: 700,
          }}
        >
          Precisa de ajuda?
        </button>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '12px 14px',
            borderRadius: 14,
            backgroundColor: fieldBg,
            border: `1px solid ${fieldBorder}`,
          }}
        >
          <input type="checkbox" defaultChecked style={{ ...styles.waCheckbox, accentColor: '#000' }} />
          <span style={{ fontSize: 13, color: muted, fontWeight: 600 }}>Manter sessão neste browser</span>
        </label>
      </div>
    </div>
  );

  const sideColumn = (
    <div style={styles.qrCardContainer}>
      <div
        style={{
          ...zaptroCardSurfaceStyle(isDark),
          width: '100%',
          maxWidth: 400,
          padding: '22px 20px 26px',
          border: `1px solid ${fieldBorder}`,
        }}
      >
        {qrCode ? (
          <div style={styles.qrWrapper}>
            <div
              style={{
                position: 'relative',
                padding: 14,
                backgroundColor: isDark ? '#0d0d0d' : '#fff',
                borderRadius: 16,
                border: `1px solid ${fieldBorder}`,
                marginBottom: 16,
              }}
            >
              <img src={qrCode} alt="Código QR WhatsApp" style={styles.qrImage} />
              <div style={styles.qrLogoOverlay}>
                <div style={styles.qrLogoBg}>
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
            
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginTop: 0, fontSize: 13, color: titleColor, fontWeight: 700, marginBottom: 8 }}>
                Aguarde alguns segundos.
              </p>
              {qrCountdown > 0 && (
                <span
                  style={{
                    padding: '6px 12px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgb(244, 244, 244)',
                    borderRadius: 12,
                    fontWeight: 700,
                    color: isDark ? '#fff' : 'rgb(0, 0, 0)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgb(240, 240, 241)'}`,
                    display: 'inline-block',
                    fontSize: 12
                  }}
                >
                  Renovar em {qrCountdown}s
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.qrPlaceholder}>
            <div
              style={{
                width: 132,
                height: 132,
                borderRadius: 16,
                backgroundColor: fieldBg,
                border: `1px dashed ${fieldBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <QrCode size={56} color={isDark ? 'rgba(255,255,255,0.35)' : '#a3a3a3'} strokeWidth={1.5} />
            </div>
            <p style={{ marginTop: 0, fontSize: 14, color: titleColor, textAlign: 'center', padding: '0 12px', fontWeight: 700 }}>
              {syncing ? 'A gerar código…' : 'Toque em «Gerar código QR»'}
            </p>
            <p style={{ marginTop: 6, fontSize: 12, color: muted, textAlign: 'center', padding: '0 12px', fontWeight: 600 }}>
              {syncing ? 'Aguarde alguns segundos.' : 'O código aparece aqui.'}
            </p>
            {qrCountdown > 0 && (
              <div style={{ marginTop: 14, fontSize: 12, color: muted, textAlign: 'center' }}>
                <span
                  style={{
                    padding: '6px 12px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgb(244, 244, 244)',
                    borderRadius: 12,
                    fontWeight: 600,
                    color: isDark ? '#fff' : 'rgb(0, 0, 0)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgb(240, 240, 241)'}`,
                    display: 'inline-block',
                  }}
                >
                  Renovar em {qrCountdown}s
                </span>
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: muted }}>Válido cerca de 1 minuto</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const connectedView = (
    <div
      style={{
        ...zaptroCardSurfaceStyle(isDark),
        padding: '28px 24px 32px',
        textAlign: 'center',
        border: `1px solid ${fieldBorder}`,
        maxWidth: 520,
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            ...zaptroIconOrbStyle({ size: 88, rounded: 'circle' }),
            border: `2px solid ${lime}`,
          }}
        >
          <CheckCircle2 size={40} color={lime} strokeWidth={2} />
        </div>
      </div>
      <p style={{ color: muted, marginBottom: 24, fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>
        A instância está activa e a sincronizar mensagens com o Zaptro.
      </p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loadingAction}
          style={{
            ...styles.actionBtnSecondary,
            fontWeight: 700,
            border: `1px solid ${fieldBorder}`,
            backgroundColor: fieldBg,
            color: titleColor,
          }}
        >
          Desligar
        </button>
        {isMaster ? (
          <button
            type="button"
            onClick={handleRestart}
            disabled={loadingAction}
            style={{
              ...styles.actionBtnSecondary,
              fontWeight: 700,
              background: '#000',
              color: lime,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'}`,
            }}
          >
            Reiniciar ligação
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="zaptro-wa-config" style={{ width: '100%', maxWidth: 960, margin: 0, boxSizing: 'border-box', padding: '4px 0 8px' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: statusConnected ? 20 : 22 }}>
        <div style={{ ...zaptroIconOrbStyle({ size: 52, rounded: 'card' }), flexShrink: 0 }}>
          <MessageCircle size={26} color={ZAPTRO_ICON_ORB_FG} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: palette.text }}>
            {statusConnected ? 'Estado da ligação' : 'Ligar o WhatsApp'}
          </h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: muted, fontWeight: 600 }}>
            {statusConnected
              ? 'Gerir a sessão da linha associada ao Zaptro.'
              : 'Use o telemóvel para ler o código QR — o processo é o da app WhatsApp «Aparelhos ligados».'}
          </p>
        </div>
      </div>

      {errorMsg && !statusConnected ? (
        <div
          role="alert"
          style={{
            marginBottom: 18,
            padding: '12px 14px',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'rgba(248, 113, 113, 0.35)' : '#fecdd3'}`,
            backgroundColor: isDark ? 'rgba(248, 113, 113, 0.08)' : '#fff1f2',
            color: isDark ? '#fecaca' : '#be123c',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.45,
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      {statusConnected ? (
        connectedView
      ) : (
        <div className="zaptro-wa-config-grid">
          <div style={{ minWidth: 0 }}>{mainColumn}</div>
          <div style={{ minWidth: 0 }}>{sideColumn}</div>
        </div>
      )}

      <style>{`
        .zaptro-wa-config-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 380px);
          gap: 28px;
          align-items: start;
        }
        .zaptro-wa-step {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .zaptro-wa-step:hover {
          box-shadow: ${isDark ? '0 0 0 1px rgba(217, 255, 0, 0.2)' : '0 4px 18px rgba(15, 23, 42, 0.06)'};
        }
        .zaptro-wa-connect-btn:hover:not(:disabled) {
          filter: brightness(1.06);
        }
        .zaptro-wa-connect-btn:active:not(:disabled) {
          transform: scale(0.99);
        }
        @keyframes zaptroWaSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .zaptro-wa-spin {
          animation: zaptroWaSpin 0.9s linear infinite;
        }
        @media (max-width: 820px) {
          .zaptro-wa-config-grid {
            grid-template-columns: 1fr;
            gap: 22px;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 28,
    marginTop: 0,
  },
  stepItem: {
    display: 'flex',
    gap: 18,
    minHeight: 0,
    padding: '14px 16px',
    borderRadius: 14,
  },
  stepNumberContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 48,
    flexShrink: 0,
  },
  stepLine: {
    width: 1.5,
    flex: 1,
    margin: '8px 0',
  },
  stepText: {
    fontSize: 15,
    margin: 0,
    lineHeight: 1.5,
    paddingBottom: 0,
    fontWeight: 600,
  },
  connectBtn: {
    padding: '14px 22px',
    borderRadius: 14,
    border: 'none',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'transform 0.15s ease, filter 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 360,
    letterSpacing: '-0.01em',
  },
  waLink: {
    fontSize: 14,
    textDecoration: 'none',
    fontWeight: 700,
  },
  waCheckbox: {
    width: 18,
    height: 18,
    accentColor: '#000000',
  },
  qrCardContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrWrapper: {
    position: 'relative',
    lineHeight: 0,
  },
  qrImage: {
    width: '100%',
    maxWidth: 300,
    height: 'auto',
    aspectRatio: '1',
    display: 'block',
  },
  qrLogoOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogoBg: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: '50%',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondary: {
    padding: '12px 24px',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    background: '#fff',
    color: '#0f172a',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }
};

export default WhatsAppConfig;
