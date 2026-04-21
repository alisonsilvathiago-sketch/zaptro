import React, { useState, useEffect } from 'react';

type LoadingContext = 'dashboard' | 'mensagens' | 'rotas' | 'cargas' | 'orcamentos' | 'motoristas' | 'crm' | 'sistema';

interface ZaptroLoadingProps {
  context?: LoadingContext;
  onFinished?: () => void;
}

const PHRASES: Record<LoadingContext, string[]> = {
  dashboard: ["Inicializando motores", "Carregando métricas", "Preparando visão geral"],
  mensagens: ["Conectando conversas", "Sincronizando mensagens", "Preparando atendimento"],
  rotas: ["Calculando rotas", "Sincronizando trajetos", "Preparando execução"],
  cargas: ["Organizando cargas", "Validando informações", "Preparando operação"],
  orcamentos: ["Processando valores", "Calculando propostas", "Preparando negociação"],
  motoristas: ["Carregando equipe", "Sincronizando motoristas", "Preparando operação"],
  crm: ["Organizando pipeline", "Atualizando oportunidades", "Preparando negociações"],
  sistema: ["Iniciando sistema", "Conectando módulos", "Finalizando carregamento"]
};

// Use "sistema" as fallback if context is not provided
const ZaptroLoading: React.FC<ZaptroLoadingProps> = ({ context = 'sistema', onFinished }) => {
  const [step, setStep] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const steps = PHRASES[context] || PHRASES.sistema;

  useEffect(() => {
    if (step < steps.length) {
      const timer = setTimeout(() => {
        // Fade out
        setOpacity(0);
        
        // Wait for fade out to change text
        setTimeout(() => {
          setStep(prev => prev + 1);
          setOpacity(1);
        }, 300);
      }, 900);

      return () => clearTimeout(timer);
    } else {
      // Completed last step
      const finalTimer = setTimeout(() => {
        if (onFinished) onFinished();
      }, 500);
      return () => clearTimeout(finalTimer);
    }
  }, [step, steps.length, onFinished]);

  // If steps are finished, we can return null (assuming layout handles visibility via parent state)
  // But for safety, we show the last state until unmounted
  const currentPhrase = steps[Math.min(step, steps.length - 1)];

  return (
    <div style={styles.container}>
      {/* Premium Lima Gradient Background */}
      <div style={styles.gradientOverlay} />
      
      <div style={{ ...styles.content, opacity }}>
        <p style={styles.loadingText}>{currentPhrase}</p>
      </div>

      <style>{`
        @keyframes zaptro-loading-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
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
    width: '150%',
    height: '150%',
    top: '-25%',
    left: '-25%',
    background: 'radial-gradient(circle at center, rgba(217, 255, 0, 0.08) 0%, rgba(0, 0, 0, 0) 60%)',
    animation: 'zaptro-loading-pulse 4s ease-in-out infinite'
  },
  content: {
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
    transition: 'opacity 0.3s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0px'
  },
  loadingText: {
    fontSize: '30px',
    fontWeight: 950,
    margin: 0,
    letterSpacing: '-0.02em',
    background: 'linear-gradient(to bottom, #FFFFFF 0%, #D9FF00 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 10px 30px rgba(217, 255, 0, 0.2)'
  }
};

export default ZaptroLoading;
