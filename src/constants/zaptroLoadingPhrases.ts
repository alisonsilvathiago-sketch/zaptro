/** Tempo em cada frase antes de avançar (ms) — entre 900ms e 1200ms conforme spec. */
export const ZAPTRO_LOADING_STEP_HOLD_MS = 1000;
/** Duração do crossfade entre frases (ms). */
export const ZAPTRO_LOADING_FADE_MS = 400;
/** Após a última frase, espera antes de `onFinished` (só `ZaptroLoading`). */
export const ZAPTRO_LOADING_AFTER_LAST_MS = 300;

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
  | 'logout'
  | 'login'
  | 'sistema';

export const ZAPTRO_LOADING_PHRASES: Record<ZaptroLoadingPhraseContext, readonly string[]> = {
  dashboard: ['Preparando visão estratégica', 'Sincronizando indicadores', 'Carregando painel'],
  mensagens: ['Conectando gateway', 'Sincronizando conversas', 'Preparando chat'],
  rotas: ['Otimizando percursos', 'Sincronizando GPS', 'Preparando mapas'],
  cargas: ['Organizando manifestos', 'Sincronizando documentos', 'Preparando ordens'],
  orcamentos: ['Calculando propostas', 'Sincronizando tabelas', 'Preparando orçamentos'],
  motoristas: ['Carregando equipe', 'Sincronizando motoristas', 'Preparando operação'],
  crm: ['Organizando pipeline', 'Atualizando oportunidades', 'Preparando negociações'],
  mapa: ['Carregando mapa', 'Sincronizando camadas', 'Preparando navegação'],
  login: [
    'Olá, {{name}}.',
    'Preparando seu ambiente...',
    'Aguarde.',
    'Tudo pronto.'
  ],
  logout: [
    'Até logo, {{name}}.',
    'Encerrando...',
    'Até breve.'
  ],
  sistema: ['Iniciando sistema', 'Conectando módulos', 'Finalizando carregamento'],
};
