import { ZAPTRO_INICIO_COPILOT_QUICK_ACTIONS } from '../constants/zaptroInicioAssistantCopilot';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';

export type ZaptroInicioCopilotKeywordAction = {
  label: string;
  path: string;
};

export type ZaptroInicioCopilotKeywordReply = {
  title: string;
  details: string[];
  action: ZaptroInicioCopilotKeywordAction;
  /** Saudação contextual (nome, hora); a UI mostra antes do título. */
  leadIn?: string[];
};

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

type Rule = {
  keywords: string[];
  reply: ZaptroInicioCopilotKeywordReply;
};

/**
 * Ordem = prioridade (primeira regra em que alguma keyword aparece no texto).
 * Regras mais específicas primeiro (ex.: «onde está o motorista» antes de «motorista»).
 */
const RULES: Rule[] = [
  {
    keywords: ['whatsapp', 'whats app', 'zap', 'inbox', 'conversa no whats', 'mensagem whats'],
    reply: {
      title: 'WhatsApp por aqui',
      details: [
        'Suas conversas ficam organizadas na inbox ligada à operação.',
        'Quer abrir e dar uma olhada?',
      ],
      action: { label: 'Abrir WhatsApp', path: ZAPTRO_ROUTES.CHAT },
    },
  },
  {
    keywords: [
      'onde esta o motorista',
      'onde está o motorista',
      'onde estao os motoristas',
      'onde estão os motoristas',
      'localizacao do motorista',
      'localização do motorista',
      'rastrear motorista',
      'posicao do motorista',
      'posição do motorista',
    ],
    reply: {
      title: 'Encontrei onde acompanhar',
      details: [
        'No mapa dá pra ver posição e rotas; a lista completa fica em Motoristas.',
        'Quer ver localização agora?',
      ],
      action: { label: 'Abrir mapa', path: ZAPTRO_ROUTES.OPENSTREETMAP },
    },
  },
  {
    keywords: ['orcamento', 'orcamentos', 'orçamento', 'orçamentos', 'cotacao', 'cotação', 'proposta de frete'],
    reply: {
      title: 'Orçamentos de frete',
      details: [
        'Tudo que foi gerado no comercial está reunido ali.',
        'Quer abrir a lista?',
      ],
      action: { label: 'Ver orçamentos', path: ZAPTRO_ROUTES.COMMERCIAL_QUOTES },
    },
  },
  {
    keywords: [
      'faturamento',
      'financeiro',
      'receita',
      'despesa',
      'lucro',
      'assinatura',
      'plano',
      'cobranca',
      'cobrança',
      'boleto',
      'fatura',
    ],
    reply: {
      title: 'Olha só: financeiro e faturamento',
      details: [
        'Planos, faturas e o que entrou no mês ficam num lugar só.',
        'Quer ver os detalhes?',
      ],
      action: { label: 'Ver faturamento', path: ZAPTRO_ROUTES.BILLING },
    },
  },
  {
    keywords: ['mapa', 'mapas', 'openstreetmap', 'osm', 'gps', 'rastreamento', 'geolocalizacao', 'geolocalização'],
    reply: {
      title: 'Mapa operacional',
      details: ['É o mapa com rotas e pontos da operação.', 'Abrir pra ti?'],
      action: { label: 'Abrir mapa', path: ZAPTRO_ROUTES.OPENSTREETMAP },
    },
  },
  {
    keywords: ['rota', 'rotas', 'percurso', 'parada', 'paradas'],
    reply: {
      title: 'Rotas do dia',
      details: [
        'Rotas planejadas e o que veio do CRM comercial estão por ali.',
        'Quer ver?',
      ],
      action: { label: 'Ver rotas', path: ZAPTRO_ROUTES.ROUTES },
    },
  },
  {
    keywords: ['entrega', 'entregas', 'carga', 'cargas', 'envio', 'envios', 'logistica', 'logística'],
    reply: {
      title: 'Suas entregas em movimento',
      details: [
        'Dá pra acompanhar cargas e o fluxo do dia nas operações.',
        'Quer ver o status completo?',
      ],
      action: { label: 'Ver entregas', path: ZAPTRO_ROUTES.LOGISTICS },
    },
  },
  {
    keywords: ['ocorrencia', 'ocorrência', 'ocorrencias', 'ocorrências', 'alerta operacional'],
    reply: {
      title: 'Ocorrências por perto',
      details: [
        'Alertas e ocorrências ficam no painel de operações.',
        'Quer ver se tem algo urgente?',
      ],
      action: { label: 'Abrir operações', path: ZAPTRO_ROUTES.LOGISTICS },
    },
  },
  {
    keywords: ['buscar cliente', 'lista de clientes', 'cadastro de cliente', 'nome do cliente'],
    reply: {
      title: 'Base de clientes',
      details: [
        'Dá pra buscar por nome, telefone ou empresa.',
        'Abrir pra ti?',
      ],
      action: { label: 'Abrir clientes', path: ZAPTRO_ROUTES.CLIENTS },
    },
  },
  {
    keywords: ['crm', 'kanban', 'lead', 'leads', 'pipeline', 'oportunidade', 'negocio', 'negócio', 'comercial'],
    reply: {
      title: 'CRM comercial',
      details: ['Pipeline, etapas e negócios num só quadro.', 'Quer entrar?'],
      action: { label: 'Abrir CRM', path: ZAPTRO_ROUTES.COMMERCIAL_CRM },
    },
  },
  {
    keywords: ['cliente', 'clientes', 'contato', 'contatos'],
    reply: {
      title: 'Achei o caminho pros clientes',
      details: [
        'Pesquisa por nome, telefone ou empresa; o funil completo está no CRM.',
        'Abrir clientes?',
      ],
      action: { label: 'Ver clientes', path: ZAPTRO_ROUTES.CLIENTS },
    },
  },
  {
    keywords: ['motorista', 'motoristas', 'entregador', 'condutor'],
    reply: {
      title: 'Motoristas da operação',
      details: [
        'Lista, status e dados de quem está na rua.',
        'Quer abrir? (No mapa dá pra ver posição se buscar «mapa» também.)',
      ],
      action: { label: 'Ver motoristas', path: ZAPTRO_ROUTES.DRIVERS },
    },
  },
  {
    keywords: ['placa', 'placas', 'veiculo', 'veículo', 'veiculos', 'veículos', 'caminhao', 'caminhão', 'frota'],
    reply: {
      title: 'Frota e veículos',
      details: [
        'Placas e veículos ligados à operação e aos motoristas.',
        'Ver motoristas?',
      ],
      action: { label: 'Ver motoristas', path: ZAPTRO_ROUTES.DRIVERS },
    },
  },
  {
    keywords: ['documento', 'documentos', 'comprovante', 'comprovantes', 'arquivo', 'arquivos', 'anexo', 'anexos'],
    reply: {
      title: 'Documentos e arquivos',
      details: [
        'Anexos e integrações da empresa ficam nos ajustes.',
        'Quer ir pra lá?',
      ],
      action: { label: 'Abrir ajustes', path: `${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=config` },
    },
  },
  {
    keywords: ['historico', 'histórico', 'timeline', 'registro de atividade'],
    reply: {
      title: 'Histórico',
      details: ['Linha do tempo do que aconteceu no sistema.', 'Abrir?'],
      action: { label: 'Abrir histórico', path: ZAPTRO_ROUTES.HISTORY },
    },
  },
  {
    keywords: ['equipe', 'usuario', 'usuário', 'usuarios', 'usuários', 'permissao', 'permissão', 'colaborador'],
    reply: {
      title: 'Equipe',
      details: ['Quem acessa e o papel de cada pessoa.', 'Ver equipe?'],
      action: { label: 'Abrir equipe', path: ZAPTRO_ROUTES.TEAM },
    },
  },
  {
    keywords: ['ajuste', 'ajustes', 'configuracao', 'configuração', 'integracao', 'integração', 'marca da empresa'],
    reply: {
      title: 'Ajustes',
      details: [
        'Configuração da empresa, conexões e preferências.',
        'Abrir ajustes?',
      ],
      action: { label: 'Abrir ajustes', path: `${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=config` },
    },
  },
  {
    keywords: ['minha conta', 'perfil', 'senha', 'avatar', 'dados da conta'],
    reply: {
      title: 'Sua conta',
      details: ['Perfil, senha e dados pessoais.', 'Ir pro perfil?'],
      action: { label: 'Abrir conta', path: ZAPTRO_ROUTES.PROFILE },
    },
  },
  {
    keywords: ['resultado', 'resultados', 'metricas', 'métricas', 'dashboard', 'painel', 'resumo', 'indicadores', 'visao geral', 'visão geral'],
    reply: {
      title: 'Resultados e métricas',
      details: ['Widgets e números do painel de resultados.', 'Dar uma olhada?'],
      action: { label: 'Ver resultados', path: ZAPTRO_ROUTES.RESULTADOS },
    },
  },
  {
    keywords: ['inicio', 'início', 'pagina inicial', 'home'],
    reply: {
      title: 'Você já está no Início',
      details: [
        'É daqui que parte tudo — pergunta de novo ou usa um atalho em baixo.',
      ],
      action: { label: 'Recarregar início', path: ZAPTRO_ROUTES.DASHBOARD },
    },
  },
  {
    keywords: ['problema', 'problemas', 'urgente', 'alerta', 'atraso', 'atrasos'],
    reply: {
      title: 'Situações urgentes',
      details: [
        'Operações e resultados costumam mostrar primeiro o que piscou.',
        'Te levo pro painel?',
      ],
      action: { label: 'Ver resultados', path: ZAPTRO_ROUTES.RESULTADOS },
    },
  },
];

const FALLBACK: ZaptroInicioCopilotKeywordReply = {
  title: 'Hmm, não peguei essa',
  details: [
    'Ainda não sou chat com IA — entendo palavras-chave e te levo ao sítio certo.',
    'Experimenta CRM, WhatsApp, fatura, motorista, mapa… ou escolhe «Atalhos» em baixo.',
  ],
  action: { label: 'Explorar resultados', path: ZAPTRO_ROUTES.RESULTADOS },
};

const QUICK_REPLIES: Record<string, ZaptroInicioCopilotKeywordReply> = {
  'resumo-hoje': {
    title: 'Resumo de hoje',
    details: [
      'Os indicadores do dia estão organizados no painel de resultados.',
      'Quer abrir?',
    ],
    action: { label: 'Abrir resultados', path: ZAPTRO_ROUTES.RESULTADOS },
  },
  'faturamento-mes': {
    title: 'Seu faturamento este mês está ativo',
    details: [
      'Já tem movimentações registradas e tudo organizado no financeiro.',
      'Quer ver os detalhes completos?',
    ],
    action: { label: 'Ver faturamento', path: ZAPTRO_ROUTES.BILLING },
  },
  'motoristas-onde': {
    title: 'Encontrei informações do motorista',
    details: [
      'Dá pra acompanhar no mapa (posição e rotas) ou ver a lista em Motoristas.',
      'Quer ver localização ou mais detalhes?',
    ],
    action: { label: 'Ver no mapa', path: ZAPTRO_ROUTES.OPENSTREETMAP },
  },
  'entregas-andamento': {
    title: 'Suas entregas estão em andamento',
    details: [
      'Tem movimentação nas rotas e no operacional agora.',
      'Quer ver o status completo?',
    ],
    action: { label: 'Ver entregas', path: ZAPTRO_ROUTES.LOGISTICS },
  },
  'buscar-cliente': {
    title: 'Achei esse cliente pra você',
    details: [
      'Já existem dados e histórico cadastrados.',
      'Posso te mostrar tudo rapidinho?',
    ],
    action: { label: 'Ver clientes', path: ZAPTRO_ROUTES.CLIENTS },
  },
  'ocorrencias-abertas': {
    title: 'Ocorrências por perto',
    details: [
      'Alertas e ocorrências ficam no painel de operações.',
      'Quer ver se tem algo urgente?',
    ],
    action: { label: 'Abrir operações', path: ZAPTRO_ROUTES.LOGISTICS },
  },
};

function matchRules(raw: string): ZaptroInicioCopilotKeywordReply {
  const n = normalize(raw);
  if (!n) return FALLBACK;

  for (const rule of RULES) {
    const hit = rule.keywords.some((k) => n.includes(normalize(k)));
    if (hit) return rule.reply;
  }

  return FALLBACK;
}

/** Atalhos (texto igual ao prompt do menu), depois primeira regra de palavra-chave que bater. */
function computeZaptroInicioCopilotReply(raw: string, _selectedShortcutId: string): ZaptroInicioCopilotKeywordReply {
  const text = raw.trim();
  if (!text) return FALLBACK;

  for (const a of ZAPTRO_INICIO_COPILOT_QUICK_ACTIONS) {
    if (normalize(a.prompt) === normalize(text) && QUICK_REPLIES[a.id]) {
      return QUICK_REPLIES[a.id];
    }
  }

  return matchRules(text);
}

/**
 * Motor do copiloto da página Início: respostas fixas por palavras-chave e prompts dos atalhos (sem IA).
 * @param selectedShortcutId Reservado; o texto igual ao `prompt` do atalho já devolve a resposta certa.
 */
export function getZaptroInicioCopilotKeywordReply(
  raw: string,
  selectedShortcutId = '',
): ZaptroInicioCopilotKeywordReply {
  return computeZaptroInicioCopilotReply(raw, selectedShortcutId);
}

export const resolveZaptroInicioCopilotReply = getZaptroInicioCopilotKeywordReply;
