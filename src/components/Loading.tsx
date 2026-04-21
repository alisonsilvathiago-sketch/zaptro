import React from 'react';
import { getContext, isZaptroProductPath } from '../utils/domains';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';

type LoadingContext = 'dashboard' | 'mensagens' | 'rotas' | 'cargas' | 'orcamentos' | 'motoristas' | 'crm' | 'sistema';

const PHRASES: Record<LoadingContext, string[]> = {
  dashboard: ["Inicializando dados", "Carregando métricas", "Preparando visão geral"],
  mensagens: ["Conectando conversas", "Sincronizando mensagens", "Preparando atendimento"],
  rotas: ["Calculando rotas", "Sincronizando trajetos", "Preparando execução"],
  cargas: ["Organizando cargas", "Validando informações", "Preparando operação"],
  orcamentos: ["Processando valores", "Calculando propostas", "Preparando negociação"],
  motoristas: ["Carregando equipe", "Sincronizando motoristas", "Preparando operação"],
  crm: ["Organizando pipeline", "Atualizando oportunidades", "Preparando negociações"],
  sistema: ["Iniciando sistema", "Conectando módulos", "Finalizando carregamento"]
};

const Loading: React.FC = () => {
  const context = getContext();
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isZaptro = context === 'WHATSAPP' || isZaptroProductPath(path);
  
  const [step, setStep] = React.useState(0);
  const [textOpacity, setTextOpacity] = React.useState(1);
  const [showRetry, setShowRetry] = React.useState(false);

  // Determine current page context based on path
  const currentContext = React.useMemo<LoadingContext>(() => {
    if (!isZaptro) return 'sistema';
    if (path === ZAPTRO_ROUTES.DASHBOARD) return 'dashboard';
    if (path.startsWith(ZAPTRO_ROUTES.CHAT)) return 'mensagens';
    if (path.startsWith(ZAPTRO_ROUTES.ROUTES)) return 'rotas';
    if (path.startsWith(ZAPTRO_ROUTES.LOGISTICS)) return 'cargas';
    if (path.startsWith(ZAPTRO_ROUTES.COMMERCIAL_QUOTES)) return 'orcamentos';
    if (path.startsWith(ZAPTRO_ROUTES.DRIVERS)) return 'motoristas';
    if (path.startsWith(ZAPTRO_ROUTES.COMMERCIAL_CRM)) return 'crm';
    return 'sistema';
  }, [path, isZaptro]);

  const steps = PHRASES[currentContext];

  React.useEffect(() => {
    // Retry timer (global)
    const retryTimer = setTimeout(() => setShowRetry(true), 15000);

    // Cinematic steps (Zaptro only)
    let sequenceTimer: any;
    if (isZaptro && step < steps.length - 1) {
      sequenceTimer = setTimeout(() => {
        setTextOpacity(0);
        setTimeout(() => {
          setStep(s => s + 1);
          setTextOpacity(1);
        }, 300);
      }, 1000);
    }

    return () => {
      clearTimeout(retryTimer);
      if (sequenceTimer) clearTimeout(sequenceTimer);
    };
  }, [step, isZaptro, steps.length]);

  // Premium Zaptro UI
  if (isZaptro) {
    return (
      <div style={styles.premiumContainer}>
        <div style={styles.gradientOverlay} />
        <div style={{ ...styles.content, opacity: textOpacity }}>
          <h1 style={styles.premiumBrand}>ZAPTRO AI</h1>
          <p style={styles.premiumText}>{steps[step]}...</p>
        </div>

        {showRetry && (
          <div style={styles.retryBox}>
            <button onClick={() => window.location.reload()} style={styles.retryBtn}>
              FORÇAR SINCRONIZAÇÃO
            </button>
          </div>
        )}

        <style>{`
          @keyframes premiumPulse {
            0% { transform: scale(1); opacity: 0.05; }
            50% { transform: scale(1.1); opacity: 0.12; }
            100% { transform: scale(1); opacity: 0.05; }
          }
        `}</style>
      </div>
    );
  }

  // Classic Logta UI (Fallback)
  return (
    <div style={{ ...styles.classicOverlay, backgroundColor: '#F8FAFC' }}>
      <div style={styles.content}>
        <div style={styles.classicLogoBox}>
          <div style={styles.classicSpinner} />
        </div>
        <h1 style={{ ...styles.classicTitle, color: '#0F172A' }}>Logta SaaS</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Sincronizando dados...</p>
        
        {showRetry && (
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: 24, padding: '10px 20px', borderRadius: 12, 
              background: '#7C3AED', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer' 
            }}
          >
            TENTAR NOVAMENTE
          </button>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  premiumContainer: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontFamily: 'Inter, sans-serif'
  },
  gradientOverlay: {
    position: 'absolute',
    width: '100vw',
    height: '100vh',
    background: 'radial-gradient(circle at center, rgba(217, 255, 0, 0.12) 0%, rgba(0, 0, 0, 0) 70%)',
    animation: 'premiumPulse 4s ease-in-out infinite'
  },
  content: {
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'opacity 0.3s ease-in-out'
  },
  premiumBrand: {
    color: '#D9FF00',
    fontSize: '32px',
    fontWeight: 950,
    margin: 0,
    letterSpacing: '10px',
    textShadow: '0 0 30px rgba(217, 255, 0, 0.3)'
  },
  premiumText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '14px',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '2px',
    textTransform: 'uppercase'
  },
  retryBox: {
    position: 'absolute',
    bottom: '40px',
    zIndex: 100
  },
  retryBtn: {
    background: 'transparent',
    border: '1px solid rgba(217, 255, 0, 0.2)',
    color: '#D9FF00',
    padding: '12px 24px',
    borderRadius: '14px',
    fontSize: '11px',
    fontWeight: 900,
    cursor: 'pointer',
    letterSpacing: '1px'
  },
  classicOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  classicLogoBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  classicSpinner: {
    width: 24,
    height: 24,
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  classicTitle: {
    fontSize: 20,
    fontWeight: 900,
    margin: '0 0 8px 0'
  }
};

export default Loading;
