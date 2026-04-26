import React from 'react';
import { useZaptroTheme } from '../../context/ZaptroThemeContext';
import { zaptroCardSurfaceStyle } from '../../constants/zaptroCardSurface';

type ZaptroCardProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Padding interno (número = px). */
  padding?: number | string;
};

/**
 * Cartão com o modelo visual único do produto (28px, borda preta/branca suave, sombra no claro).
 * Preferível a repetir estilos inline nas páginas Zaptro.
 */
const ZaptroCard: React.FC<ZaptroCardProps> = ({ children, className = '', style, padding }) => {
  const { palette } = useZaptroTheme();
  const isDark = palette.mode === 'dark';
  const pad =
    padding === undefined
      ? undefined
      : typeof padding === 'number'
        ? `${padding}px`
        : padding;

  return (
    <div
      className={className?.trim() || undefined}
      style={{
        ...zaptroCardSurfaceStyle(isDark),
        ...(pad !== undefined ? { padding: pad } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default ZaptroCard;
