/** Fundo de inputs, buscas, trilhos e áreas “chip” (modo claro) — neutro quente, sem tom azulado. */
export const ZAPTRO_FIELD_BG = '#f4f4f4' as const;

/**
 * Painéis e faixas secundárias (ex.: antigo slate-50 #F8FAFC).
 * Um degrau mais escuro que `ZAPTRO_FIELD_BG` para aninhamento ou blocos “muted”.
 */
export const ZAPTRO_SOFT_NEUTRAL_MUTED = '#ebebeb' as const;

/** Traço ao redor de seções/cartões no modo claro. */
export const ZAPTRO_SECTION_BORDER = '#F0F0F1' as const;

/** Títulos de seção, abas, cabeçalhos de tabela e rótulos de campo em preto sólido. */
export const ZAPTRO_TITLE_COLOR = '#000000' as const;

/** Superfície de cartão + orbes de ícone (modelo painel Início). */
export {
  zaptroCardSurfaceStyle,
  zaptroCardRowStyle,
  zaptroIconOrbStyle,
  ZAPTRO_CARD_RADIUS_PX,
  ZAPTRO_CARD_BG_DARK,
  ZAPTRO_ICON_ORB_BG,
  ZAPTRO_ICON_ORB_FG,
} from './zaptroCardSurface';
