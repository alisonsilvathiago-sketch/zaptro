import React, { useEffect, useRef } from 'react';
import { fillCanvasZaptroMarketingHeroGradient } from '../../utils/zaptroMarketingHeroBackground';

type Props = { grid?: number };

/**
 * Campo de partículas + mesmo degradê vertical do hero Zaptro (preto → limão → branco).
 * `grid`: divisões da grelha (ex.: 30 Login, 40 Home).
 */
const ZaptroHeroParticleCanvas: React.FC<Props> = ({ grid = 30 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const n = Math.max(12, Math.min(48, Math.floor(grid)));
    let particles: { x: number; y: number; z: number }[] = [];
    let frame = 0;
    let animationId = 0;

    const init = () => {
      const parent = canvas.parentElement;
      canvas.width = parent?.clientWidth || window.innerWidth;
      canvas.height = parent?.clientHeight || window.innerHeight;
      particles = [];
      for (let x = 0; x < n; x++) {
        for (let z = 0; z < n; z++) {
          particles.push({ x: (x / (n - 1)) - 0.5, y: 0, z: (z / (n - 1)) - 0.5 });
        }
      }
    };

    const draw = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      fillCanvasZaptroMarketingHeroGradient(ctx, canvas.width, canvas.height);

      /** Grão leve; não desenhar na faixa central (evita mancha escura por cima do degradê). */
      particles.forEach((p) => {
        const y = Math.sin(p.x * 4 + frame) * Math.cos(p.z * 4 + frame) * 0.16;
        const scale = 1.0 / (p.z + 1.2);
        const sx = cx + p.x * (canvas.width * 1.5) * scale;
        const sy = cy + (p.y + y) * (canvas.height * 0.8) * scale;
        if (sx < -50 || sx > canvas.width + 50 || sy < -50 || sy > canvas.height + 50) return;
        const dist = Math.sqrt(p.x * p.x + p.z * p.z);
        const ny = Math.max(0, Math.min(1, sy / canvas.height));
        if (ny > 0.34 && ny < 0.66) return;
        const baseA = (1.1 - dist) * 0.038;
        let rr = 217;
        let gg = 255;
        let bb = 0;
        let a = baseA * 0.35;
        if (ny < 0.42) {
          rr = 255;
          gg = 255;
          bb = 255;
          a = baseA * 0.22;
        } else if (ny > 0.78) {
          rr = 255;
          gg = 255;
          bb = 255;
          a = baseA * 0.18;
        } else {
          a = baseA * 0.28;
        }
        ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${a})`;
        const pSize = (1.45 - dist) * (0.55 + ny * 0.25);
        ctx.beginPath();
        ctx.arc(sx, sy, pSize, 0, Math.PI * 2);
        ctx.fill();
      });

      frame += 0.005;
      animationId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', init);
    init();
    draw();
    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationId);
    };
  }, [grid]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 1, zIndex: 1, display: 'block' }}
      aria-hidden
    />
  );
};

export default ZaptroHeroParticleCanvas;
