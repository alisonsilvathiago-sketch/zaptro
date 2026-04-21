import React, { useEffect, useRef, useState } from 'react';
import {
  ZAPTRO_LOADING_AFTER_LAST_MS,
  ZAPTRO_LOADING_FADE_MS,
  ZAPTRO_LOADING_PHRASES,
  ZAPTRO_LOADING_STEP_HOLD_MS,
  type ZaptroLoadingPhraseContext,
} from '../../constants/zaptroLoadingPhrases';

interface ZaptroLoadingProps {
  context?: ZaptroLoadingPhraseContext;
  onFinished?: () => void;
}

const ZaptroLoading: React.FC<ZaptroLoadingProps> = ({ context = 'sistema', onFinished }) => {
  const steps = ZAPTRO_LOADING_PHRASES[context] ?? ZAPTRO_LOADING_PHRASES.sistema;
  const [index, setIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const timeoutIdsRef = useRef<number[]>([]);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const clearTimers = () => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current = [];
  };

  useEffect(() => {
    clearTimers();
    setIndex(0);
    setOpacity(1);
  }, [context]);

  useEffect(() => {
    clearTimers();
    if (steps.length === 0) {
      onFinishedRef.current?.();
      return;
    }
    if (index >= steps.length) return;

    const isLast = index === steps.length - 1;
    const q = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timeoutIdsRef.current.push(id);
    };

    q(() => {
      if (isLast) {
        q(() => onFinishedRef.current?.(), ZAPTRO_LOADING_AFTER_LAST_MS);
      } else {
        setOpacity(0);
        q(() => {
          setIndex((i) => i + 1);
          setOpacity(1);
        }, ZAPTRO_LOADING_FADE_MS);
      }
    }, ZAPTRO_LOADING_STEP_HOLD_MS);

    return clearTimers;
  }, [context, index, steps.length]);

  const phrase =
    steps.length > 0 ? steps[Math.min(index, steps.length - 1)] : '';

  return (
    <div style={styles.container} role="status" aria-live="polite" aria-busy="true">
      <div style={styles.gradientOverlay} aria-hidden />
      <div style={styles.content}>
        <p style={{ ...styles.loadingText, opacity }}>{phrase}</p>
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
    fontFamily: 'Inter, sans-serif',
  },
  gradientOverlay: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    top: '-25%',
    left: '-25%',
    background: 'radial-gradient(circle at center, rgba(217, 255, 0, 0.08) 0%, rgba(0, 0, 0, 0) 60%)',
    animation: 'zaptro-loading-pulse 4s ease-in-out infinite',
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
  },
  loadingText: {
    fontSize: 'clamp(24px, 3.6vw, 38px)',
    fontWeight: 600,
    margin: 0,
    maxWidth: 'min(92vw, 640px)',
    lineHeight: 1.2,
    letterSpacing: '-0.03em',
    transition: `opacity ${ZAPTRO_LOADING_FADE_MS}ms ease-in-out`,
    background: 'linear-gradient(70deg, #ffffff 0%, #e8ffc4 42%, #d9ff00 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(0 10px 28px rgba(0, 0, 0, 0.55))',
  },
};

export default ZaptroLoading;
