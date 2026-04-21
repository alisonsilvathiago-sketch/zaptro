import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ width, height, borderRadius = '12px', className, style }) => {
  return (
    <div 
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: shimmer 1.5s infinite;
        }
      `}</style>
      <div className="shimmer" />
    </div>
  );
};

export default Skeleton;
