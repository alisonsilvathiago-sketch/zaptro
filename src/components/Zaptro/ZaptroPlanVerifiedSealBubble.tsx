import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { ZAPTRO_VERIFIED_SEAL_META, type ZaptroPlanVerifiedTier } from '../../utils/zaptroPlanVerifiedSeal';

type Tier = Exclude<ZaptroPlanVerifiedTier, 'none'>;

const DIM: Record<'sm' | 'md', { box: number; icon: number; border: number }> = {
  sm: { box: 22, icon: 13, border: 2 },
  md: { box: 30, icon: 17, border: 2.5 },
};

/**
 * Selo circular estilo “verificado” (check branco sobre fundo azul ou dourado), alinhado ao plano da empresa.
 */
export const ZaptroPlanVerifiedSealBubble: React.FC<{
  tier: Tier;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ tier, size = 'md', className }) => {
  const { box, icon, border } = DIM[size];
  const meta = ZAPTRO_VERIFIED_SEAL_META[tier];
  return (
    <div
      className={className}
      title={meta.label}
      role="img"
      aria-label={meta.label}
      style={{
        width: box,
        height: box,
        borderRadius: '50%',
        background: meta.bg,
        border: `${border}px solid #ffffff`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.2)',
        flexShrink: 0,
      }}
    >
      <BadgeCheck size={icon} color="#ffffff" strokeWidth={2.6} aria-hidden />
    </div>
  );
};
