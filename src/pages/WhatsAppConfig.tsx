import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, CircleDashed, LogOut, RefreshCw, QrCode } from 'lucide-react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { useZaptroTheme } from '../context/ZaptroThemeContext';

/**
 * WhatsApp liga-se a um fornecedor externo na edge; em código/comentários técnicos pode referir-se a isso,
 * mas strings visíveis ao utilizador devem falar só em Zaptro — nunca expor o nome do fornecedor na UI.
 */

const WhatsAppConfig: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { palette } = useZaptroTheme();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');
  const [syncing, setSyncing] = useState(false);
  const [step, setStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollIntervalRef = useRef<any>(null);


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
      setStep('A contactar servidor...');
      // Tentar criar a instância (se já existir, a Evolution API ignora ou retorna erro que tratamos)
      await gatewayAction('create-instance');
      
      setStep('A gerar código QR…');
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

  const isDark = palette.mode === 'dark';
  const cardBg = isDark ? '#12151c' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15, 23, 42, 0.08)';
  const titleColor = isDark ? '#f8fafc' : '#0f172a';
  const muted = palette.textMuted;
  /** Faixa Zaptro: preto → lima → (claro: branco | escuro: cinza do cartão) */
  const rail = isDark
    ? 'linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 28%, #D9FF00 28%, #D9FF00 52%, #141416 52%)'
    : 'linear-gradient(180deg, #0f172a 0%, #0f172a 26%, #D9FF00 26%, #D9FF00 50%, #ffffff 50%)';
  const stageBg = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const subtleLine = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15, 23, 42, 0.08)';

  const statusConnected = status === 'connected';

  const primaryBtn: React.CSSProperties = {
    ...styles.v2Primary,
    background: isDark ? 'linear-gradient(180deg, #14b8a6 0%, #0d9488 100%)' : 'linear-gradient(180deg, #0d9488 0%, #0f766e 100%)',
    opacity: syncing || loadingAction ? 0.55 : 1,
    cursor: syncing || loadingAction ? 'not-allowed' : 'pointer',
  };

  const mainColumn = (
    <div style={{ padding: '4px 10px' }}>
      <h1 style={{ ...styles.officialTitle, color: titleColor }}>Escaneie para entrar</h1>
      
      <div style={styles.stepsContainer}>
        <div style={styles.stepItem}>
          <div style={styles.stepNumberContainer}>
            <span style={styles.stepNumber}>1</span>
            <div style={styles.stepLine} />
          </div>
          <p style={{ ...styles.stepText, color: titleColor }}>Use a câmera do seu celular para escanear o QR code.</p>
        </div>

        <div style={styles.stepItem}>
          <div style={styles.stepNumberContainer}>
            <span style={styles.stepNumber}>2</span>
            <div style={styles.stepLine} />
          </div>
          <p style={{ ...styles.stepText, color: titleColor }}>
            Toque no link para abrir o WhatsApp <span style={styles.waIconSmall}>💬</span>.
          </p>
        </div>

        <div style={styles.stepItem}>
          <div style={styles.stepNumberContainer}>
            <span style={styles.stepNumber}>3</span>
          </div>
          <p style={{ ...styles.stepText, color: titleColor }}>Escaneie o QR code novamente para acessar sua conta.</p>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <button 
          onClick={handleSimpleReconnect} 
          disabled={syncing || loadingAction}
          style={{
            ...styles.connectBtn,
            backgroundColor: palette.lime,
            color: '#000',
            opacity: syncing || loadingAction ? 0.6 : 1
          }}
        >
          {syncing ? 'Gereando Código...' : 'Conectar Dispositivo'}
        </button>
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <a href="#" style={{ ...styles.waLink, color: '#0d9488' }}>Precisa de ajuda? ↗</a>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" defaultChecked style={styles.waCheckbox} />
          <span style={{ fontSize: 14, color: muted, fontWeight: 500 }}>Continuar conectado neste navegador ⓘ</span>
        </label>

        <button style={{ ...styles.waTextBtn, color: '#0d9488' }}>
          Entrar com número de telefone <span>›</span>
        </button>
      </div>
    </div>
  );

  const sideColumn = (
    <div style={styles.qrCardContainer}>
      <div style={{
        ...styles.qrCard,
        backgroundColor: '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}>
        {qrCode ? (
          <div style={styles.qrWrapper}>
            <img src={qrCode} alt="WhatsApp QR" style={styles.qrImage} />
            <div style={styles.qrLogoOverlay}>
              <div style={styles.qrLogoBg}>
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M12.0004 0C5.38531 0 0.000732422 5.38458 0.000732422 12.0004C0.000732422 14.3986 0.702931 16.6346 1.91 18.5204L0.0102539 24L5.65961 22.1207C7.45899 23.313 9.6469 24.0007 12.0004 24.0007C18.6154 24.0007 24 18.6162 24 12.0004C24 5.38458 18.6154 0 12.0004 0Z" fill="#25D366"/>
                   <path d="M17.51 14.88C17.21 14.73 15.73 14 15.45 13.9C15.17 13.8 14.97 13.75 14.77 14.05C14.57 14.35 14 15.06 13.83 15.26C13.66 15.46 13.49 15.48 13.19 15.33C12.89 15.18 11.93 14.87 10.79 13.85C9.9 13.06 9.3 12.08 9.12 11.78C8.95 11.48 9.1 11.32 9.25 11.17C9.39 11.03 9.56 10.81 9.71 10.63C9.86 10.45 9.91 10.33 10.01 10.13C10.11 9.93 10.06 9.76 9.98 9.61C9.91 9.46 9.31 7.98 9.06 7.37C8.82 6.78 8.57 6.86 8.39 6.86C8.22 6.86 8.02 6.85 7.82 6.85C7.62 6.85 7.3 6.93 7.03 7.22C6.77 7.51 6.02 8.21 6.02 9.64C6.02 11.07 7.06 12.44 7.2 12.64C7.35 12.84 9.24 15.74 12.14 16.99C12.83 17.29 13.35 17.46 13.77 17.6C14.47 17.82 15.1 17.79 15.6 17.71C16.16 17.63 17.31 17.02 17.55 16.34C17.79 15.66 17.79 15.08 17.72 14.96C17.65 14.83 17.47 14.77 17.17 14.62" fill="white"/>
                 </svg>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.qrPlaceholder}>
            <QrCode size={80} color="#e2e8f0" strokeWidth={1} />
            <p style={{ marginTop: 12, fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '0 20px' }}>
              {syncing ? 'Gerando código...' : 'Clique em conectar para gerar o código QR'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const connectedView = (
    <div style={{ padding: '20px 10px', textAlign: 'center' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
        <div style={{ 
          width: 80, height: 80, borderRadius: '50%', 
          backgroundColor: 'rgba(217, 255, 0, 0.1)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${palette.lime}`
        }}>
          <CheckCircle2 size={40} color={palette.lime} />
        </div>
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: titleColor, marginBottom: 8 }}>WhatsApp Conectado</h2>
      <p style={{ color: muted, marginBottom: 24 }}>Sua instância Zaptro está ativa e sincronizando mensagens em tempo real.</p>
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={handleLogout} disabled={loadingAction} style={styles.actionBtnSecondary}>Desconectar</button>
        {isMaster && <button onClick={handleRestart} disabled={loadingAction} style={styles.actionBtnSecondary}>Reiniciar</button>}
      </div>
    </div>
  );

  return (
    <div style={styles.outerContainer}>
      <div style={{
        ...styles.officialShell,
        backgroundColor: cardBg,
        borderColor: cardBorder,
      }}>
        {status === 'connected' ? connectedView : (
          <div className="wa-official-grid">
            <div style={styles.v2ColMain}>{mainColumn}</div>
            <div style={styles.v2ColSide}>{sideColumn}</div>
          </div>
        )}
      </div>

      <style>{`
        .wa-official-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 40px;
          align-items: start;
        }
        @media (max-width: 850px) {
          .wa-official-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  outerContainer: {
    padding: '20px 0',
    width: '100%',
    maxWidth: 1000,
    margin: '0 auto',
  },
  officialShell: {
    padding: '40px',
    borderRadius: 24,
    border: '1px solid',
    boxShadow: '0 4px 60px rgba(0,0,0,0.05)',
  },
  officialTitle: {
    fontSize: 32,
    fontWeight: 400,
    margin: '0 0 40px 0',
    fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif'
  },
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  stepItem: {
    display: 'flex',
    gap: 16,
    minHeight: 60,
  },
  stepNumberContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 32,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    flexShrink: 0,
  },
  stepLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#e2e8f0',
    margin: '4px 0',
  },
  stepText: {
    fontSize: 18,
    margin: 0,
    lineHeight: 1.5,
    paddingBottom: 24,
  },
  waIconSmall: {
    fontSize: 18,
  },
  connectBtn: {
    padding: '12px 32px',
    borderRadius: 999,
    border: 'none',
    fontWeight: 700,
    fontSize: 16,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  waLink: {
    fontSize: 14,
    textDecoration: 'none',
    fontWeight: 600,
  },
  waCheckbox: {
    width: 18,
    height: 18,
    accentColor: '#0d9488',
  },
  waTextBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    width: 'fit-content'
  },
  qrCardContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCard: {
    padding: 24,
    borderRadius: 16,
    border: '1px solid',
    width: 280,
    height: 280,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
  },
  qrWrapper: {
    position: 'relative',
    lineHeight: 0,
  },
  qrImage: {
    width: 240,
    height: 240,
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
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
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
    padding: '10px 20px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#0f172a',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer'
  }
};

export default WhatsAppConfig;
