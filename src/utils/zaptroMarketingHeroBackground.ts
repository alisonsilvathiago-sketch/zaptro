/**
 * Degradê vertical Zaptro (Login / Home / Registrar): **topo branco → meio limão → base preto**
 * (uma única zona escura no fundo, sem #101010 + #000 em sequência).
 *
 * CSS `to bottom`: primeiro stop = topo, último = base.
 */
const BLACK = '#000000';
const LIME = '#D9FF00';

/**
 * Paragens calibradas para o texto centrado (~50% altura): o limão fica na zona média;
 * só a parte inferior escurece até ao preto (evita “segundo preto” atrás do título).
 */
export function zaptroMarketingHeroPanelBackground(): string {
  return `
    linear-gradient(
      to bottom,
      #ffffff 0%,
      #f5ffe8 20%,
      #eaff9a 40%,
      ${LIME} 58%,
      #6b7a1e 78%,
      ${BLACK} 100%
    )
  `.replace(/\s+/g, ' ').trim();
}

/** Mesmo degradê no canvas (y = 0 topo, y = height base). */
export function fillCanvasZaptroMarketingHeroGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.2, '#f5ffe8');
  g.addColorStop(0.4, '#eaff9a');
  g.addColorStop(0.58, LIME);
  g.addColorStop(0.78, '#6b7a1e');
  g.addColorStop(1, BLACK);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

export const ZAPTRO_HERO_SPLIT_PANEL_CLASS = 'zaptro-hero-split-panel-bg';

export function zaptroHeroSplitPanelCss(): string {
  const img = zaptroMarketingHeroPanelBackground();
  return `
.${ZAPTRO_HERO_SPLIT_PANEL_CLASS} {
  background-color: #000000 !important;
  background-image: ${img} !important;
  background-repeat: no-repeat !important;
  background-size: 100% 100% !important;
}
  `.trim();
}
