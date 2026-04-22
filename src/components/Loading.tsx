import React from 'react';
import { getContext, isZaptroProductPath } from '../utils/domains';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import {
  ZAPTRO_LOADING_FADE_MS,
  ZAPTRO_LOADING_PHRASES,
  ZAPTRO_LOADING_STEP_HOLD_MS,
  type ZaptroLoadingPhraseContext,
} from '../constants/zaptroLoadingPhrases';

type ZaptroAuthLoadingInnerProps = {
  context: ZaptroLoadingPhraseContext;
};

const ZaptroAuthLoadingInner: React.FC<ZaptroAuthLoadingInnerProps> = ({ context }) => {
  const steps = ZAPTRO_LOADING_PHRASES[context];
  const [step, setStep] = React.useState(0);
  const [textOpacity, setTextOpacity] = React.useState(1);
  const [showRetry, setShowRetry] = React.useState(false);
  const timeoutIdsRef = React.useRef<number[]>([]);

  const clearTimers = () => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current = [];
  };

  React.useEffect(() => {
    const retryTimer = window.setTimeout(() => setShowRetry(true), 15000);
    return () => clearTimeout(retryTimer);
  }, []);

  React.useEffect(() => {
    clearTimers();
    if (step >= steps.length - 1) return;

    const q = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timeoutIdsRef.current.push(id);
    };

    q(() => {
      setTextOpacity(0);
      q(() => {
        setStep((s) => s + 1);
        setTextOpacity(1);
      }, ZAPTRO_LOADING_FADE_MS);
    }, ZAPTRO_LOADING_STEP_HOLD_MS);

    return clearTimers;
  }, [step, steps.length]);

  return (
    <div style={styles.premiumContainer} role="status" aria-live="polite" aria-busy="true">
      <div style={styles.gradientOverlay} aria-hidden />
      <div style={{ ...styles.content, opacity: textOpacity }}>
        <p style={styles.premiumText}>{steps[step]}</p>
      </div>

      {showRetry && (
        <div style={styles.retryBox}>
          <button type="button" onClick={() => window.location.reload()} style={styles.retryBtn}>
            Forçar sincronização
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
};

const Loading: React.FC = () => {
  const context = getContext();
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isZaptro = context === 'WHATSAPP' || isZaptroProductPath(path);
  const [showRetry, setShowRetry] = React.useState(false);

  const currentContext = React.useMemo<ZaptroLoadingPhraseContext>(() => {
    if (!isZaptro) return 'sistema';
    if (path === ZAPTRO_ROUTES.DASHBOARD) return 'dashboard';
    if (path.startsWith(ZAPTRO_ROUTES.CHAT)) return 'mensagens';
    if (path.startsWith(ZAPTRO_ROUTES.ROUTES)) return 'rotas';
    if (path.startsWith(ZAPTRO_ROUTES.LOGISTICS)) return 'cargas';
    if (path.startsWith(ZAPTRO_ROUTES.COMMERCIAL_QUOTES)) return 'orcamentos';
    if (path.startsWith(ZAPTRO_ROUTES.DRIVERS)) return 'motoristas';
    if (path.startsWith(ZAPTRO_ROUTES.DRIVER_PROFILE)) return 'motoristas';
    if (path.startsWith(ZAPTRO_ROUTES.COMMERCIAL_CRM)) return 'crm';
    if (path.startsWith(ZAPTRO_ROUTES.OPENSTREETMAP)) return 'mapa';
    return 'sistema';
  }, [path, isZaptro]);

  React.useEffect(() => {
    if (isZaptro) return;
    const retryTimer = window.setTimeout(() => setShowRetry(true), 15000);
    return () => clearTimeout(retryTimer);
  }, [isZaptro]);

  if (isZaptro) {
    return <ZaptroAuthLoadingInner key={currentContext} context={currentContext} />;
  }

  return (
    <div style={{ ...styles.classicOverlay, backgroundColor: '#f4f4f4' }}>
      <div style={styles.content}>
        <div style={styles.classicLogoBox}>
          <div style={styles.classicSpinner} />
        </div>
        <h1 style={{ ...styles.classicTitle, color: '#0F172A' }}>Logta SaaS</h1>
        <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>Sincronizando dados...</p>

        {showRetry && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              padding: '10px 20px',
              borderRadius: 12,
              background: '#D9FF00',
              color: '#FFF',
              border: 'none',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
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
    fontFamily: 'Inter, sans-serif',
  },
  gradientOverlay: {
    position: 'absolute',
    width: '100vw',
    height: '100vh',
    background: 'radial-gradient(circle at center, rgba(217, 255, 0, 0.12) 0%, rgba(0, 0, 0, 0) 70%)',
    animation: 'premiumPulse 4s ease-in-out infinite',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    padding: '0 20px',
    transition: `opacity ${ZAPTRO_LOADING_FADE_MS}ms ease-in-out`,
  },
  premiumText: {
    fontSize: 'clamp(24px, 3.6vw, 38px)',
    fontWeight: 800,
    margin: 0,
    maxWidth: 'min(92vw, 640px)',
    lineHeight: 1.2,
    letterSpacing: '-0.03em',
    background: 'linear-gradient(70deg, #ffffff 0%, #e8ffc4 42%, #d9ff00 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(0 10px 28px rgba(0, 0, 0, 0.55))',
  },
  retryBox: {
    position: 'absolute',
    bottom: '40px',
    zIndex: 100,
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
    letterSpacing: '1px',
  },
  classicOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicLogoBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#D9FF00',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  classicSpinner: {
    width: 24,
    height: 24,
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  classicTitle: {
    fontSize: 20,
    fontWeight: 900,
    margin: '0 0 8px 0',
  },
};

export default Loading;
