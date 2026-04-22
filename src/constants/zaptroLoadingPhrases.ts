/** Tempo em cada frase antes de avançar (ms) — mais baixo = ciclo menos “cansativo”. */
export const ZAPTRO_LOADING_STEP_HOLD_MS = 400;
/** Duração do crossfade entre frases (ms). */
export const ZAPTRO_LOADING_FADE_MS = 150;
/** Após a última frase, espera antes de `onFinished` (só `ZaptroLoading`). */
export const ZAPTRO_LOADING_AFTER_LAST_MS = 400;

/** Frases do carregamento “inteligente” por contexto (sem nome do produto). */
export type ZaptroLoadingPhraseContext =
  | 'dashboard'
  | 'mensagens'
  | 'rotas'
  | 'cargas'
  | 'orcamentos'
  | 'motoristas'
  | 'crm'
  | 'mapa'
  | 'sistema';

export const ZAPTRO_LOADING_PHRASES: Record<ZaptroLoadingPhraseContext, readonly string[]> = {
  dashboard: ['Inicializando dados', 'Carregando métricas', 'Preparando visão geral'],
  mensagens: ['Conectando conversas', 'Sincronizando mensagens', 'Preparando atendimento'],
  rotas: ['Calculando rotas', 'Sincronizando trajetos', 'Preparando execução'],
  cargas: ['Organizando cargas', 'Validando informações', 'Preparando operação'],
  orcamentos: ['Processando valores', 'Calculando propostas', 'Preparando negociação'],
  motoristas: ['Carregando equipe', 'Sincronizando motoristas', 'Preparando operação'],
  crm: ['Organizando pipeline', 'Atualizando oportunidades', 'Preparando negociações'],
  mapa: ['Carregando mapa', 'Sincronizando camadas', 'Preparando navegação'],
  sistema: ['Iniciando sistema', 'Conectando módulos', 'Finalizando carregamento'],
};
