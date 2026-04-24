import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import type { ZaptroInicioCopilotKeywordReply } from './zaptroInicioCopilotKeywordReply';

export type ZaptroInicioCopilotPersonalizeOpts = {
  /** Primeiro nome ou apelido curto. */
  firstName: string;
  /** Momento em que o utilizador enviou (cada envio varia a resposta). */
  now: Date;
  /** Texto enviado (pergunta ou prompt do atalho) — mistura variações entre tópicos. */
  queryFingerprint: string;
};

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length]!;
}

const WEEKDAYS_PT = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

/** 05–11 Bom dia | 12–17 Boa tarde | 18–04 Boa noite (noite estendida). */
export function getZaptroInicioPeriodGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatClock(now: Date): string {
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function displayName(firstName: string): string {
  const t = firstName.trim();
  if (!t) return 'aí';
  if (t.toLowerCase() === 'comandante') return 'Comandante';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function basePath(path: string): string {
  const i = path.indexOf('?');
  return i === -1 ? path : path.slice(0, i);
}

type CopilotIntent =
  | 'billing'
  | 'whatsapp'
  | 'crm'
  | 'quotes'
  | 'map'
  | 'routes'
  | 'logistics'
  | 'drivers'
  | 'clients'
  | 'profile'
  | 'team'
  | 'history'
  | 'settings'
  | 'summary'
  | 'dashboard'
  | 'generic';

function inferIntent(reply: ZaptroInicioCopilotKeywordReply): CopilotIntent {
  const p = basePath(reply.action.path);
  if (p === ZAPTRO_ROUTES.BILLING) return 'billing';
  if (p === ZAPTRO_ROUTES.CHAT) return 'whatsapp';
  if (p === ZAPTRO_ROUTES.COMMERCIAL_QUOTES) return 'quotes';
  if (p === ZAPTRO_ROUTES.COMMERCIAL_CRM) return 'crm';
  if (p === ZAPTRO_ROUTES.OPENSTREETMAP) return 'map';
  if (p === ZAPTRO_ROUTES.ROUTES) return 'routes';
  if (p === ZAPTRO_ROUTES.LOGISTICS) return 'logistics';
  if (p === ZAPTRO_ROUTES.DRIVERS) return 'drivers';
  if (p === ZAPTRO_ROUTES.CLIENTS) return 'clients';
  if (p === ZAPTRO_ROUTES.PROFILE) return 'profile';
  if (p === ZAPTRO_ROUTES.TEAM) return 'team';
  if (p === ZAPTRO_ROUTES.HISTORY) return 'history';
  if (p === ZAPTRO_ROUTES.SETTINGS_ALIAS || p.startsWith(`${ZAPTRO_ROUTES.SETTINGS_ALIAS}/`))
    return 'settings';
  if (p === ZAPTRO_ROUTES.RESULTADOS) return 'summary';
  if (p === ZAPTRO_ROUTES.DASHBOARD) return 'dashboard';
  return 'generic';
}

/** Saudação curta: período + nome (opcional 👋). */
function buildGreetingLine(name: string, now: Date, seed: number): string {
  const dn = displayName(name);
  const period = getZaptroInicioPeriodGreeting(now.getHours());
  const wave = seed % 4 !== 3 ? ' 👋' : '';
  const compact = [
    `${period}, ${dn}${wave}`,
    `${period}, ${dn} — tudo bem?`,
    `${period}! ${dn}, conte comigo.`,
    `${period}, ${dn}. Tô aqui pra te ajudar.`,
  ];
  return pick(compact, seed);
}

/** Pulso de contexto por intenção (soa “inteligente”, sem inventar dados). */
function buildContextPulse(intent: CopilotIntent, now: Date, seed: number): string {
  const clock = formatClock(now);
  const weekday = WEEKDAYS_PT[now.getDay()]!;

  const byIntent: Record<CopilotIntent, readonly string[]> = {
    billing: [
      'Acabei de puxar o que importa no seu faturamento neste momento.',
      'Olha só o que achei na área financeira — já tem movimentação registrada.',
      'Encontrei isso pra você no faturamento; dá pra aprofundar quando quiser.',
    ],
    whatsapp: [
      'Acabei de verificar onde ficam suas conversas no WhatsApp.',
      'Encontrei a inbox certa pra acompanhar mensagens e respostas.',
    ],
    crm: [
      'Olha só: o quadro comercial e o pipeline estão prontos pra você.',
      'Acabei de alinhar o caminho pro CRM — negócios e etapas num só lugar.',
    ],
    quotes: [
      'Encontrei o lugar dos orçamentos de frete gerados no comercial.',
      'Acabei de verificar onde estão as propostas — tudo reunido ali.',
    ],
    map: [
      'Encontrei o mapa operacional pra ver posição e rotas em campo.',
      'Acabei de verificar o melhor lugar pro acompanhamento geográfico.',
    ],
    routes: [
      'Olha só: rotas planejadas e o que veio do comercial estão por aqui.',
      'Acabei de puxar o caminho certo pras rotas do dia.',
    ],
    logistics: [
      'Encontrei o painel de operações — entregas, cargas e ocorrências.',
      'Acabei de verificar onde acompanhar o que está em movimento agora.',
    ],
    drivers: [
      'Encontrei informações dos motoristas e da operação em campo.',
      'Olha só: lista, status e perfil — e o mapa complementa a visão.',
    ],
    clients: [
      'Achei o caminho certo pra base de clientes e histórico.',
      'Encontrei isso pra você — pesquise por nome, telefone ou empresa.',
    ],
    profile: [
      'Acabei de verificar onde ficam os dados da sua conta.',
      'Encontrei o perfil e as configurações pessoais num só lugar.',
    ],
    team: [
      'Olha só: equipe, acessos e papéis da transportadora.',
      'Acabei de puxar o módulo certo pra ver quem entra no sistema.',
    ],
    history: [
      'Encontrei a linha do tempo de eventos e interações.',
      'Acabei de verificar onde cruzar o que já aconteceu.',
    ],
    settings: [
      'Encontrei os ajustes da empresa — integrações e preferências.',
      'Acabei de alinhar o caminho pra configuração.',
    ],
    summary: [
      `Acabei de montar um panorama leve com o que costuma importar às ${clock}.`,
      'Olha só: o painel de resultados junta métricas e widgets num só lugar.',
      `Encontrei o resumo certo pra esta ${weekday} — pronto pra você navegar.`,
    ],
    dashboard: [
      'Você já está no Início — daqui você parte pra todo o painel.',
      'Acabei de confirmar: você já está na página inicial.',
    ],
    generic: [
      'Acabei de verificar o que melhor encaixa com o que você pediu.',
      'Encontrei isso pra você — já deixo o próximo passo claro embaixo.',
      'Olha só o que achei a partir das suas palavras-chave.',
    ],
  };

  const lines = byIntent[intent];
  const base = pick(lines, seed >>> 5);
  const eventish = seed % 5 === 0;
  if (eventish && intent !== 'dashboard') {
    const extra = pick(
      [
        ' Parece que acabou de entrar algo novo pra você acompanhar.',
        ' Isso chegou agora há pouco no fluxo do assistente.',
      ],
      seed >>> 9,
    );
    return `${base}${extra}`;
  }
  return base;
}

function buildSummaryBody(seed: number): string[] {
  const intro = pick(
    [
      'Aqui vai um resumo rápido do que está acontecendo agora:',
      'Olha só o que está no radar neste momento:',
      'Acabei de montar um panorama leve pra te situar:',
    ],
    seed,
  );
  const bullets = [
    '• 💰 Faturamento e plano no teu painel',
    '• 🚛 Motoristas e rotas quando precisar de visão em campo',
    '• 📦 Entregas e operação em movimento',
  ];
  const closer = pick(
    [
      'Quer ver tudo em detalhes?',
      'Quer que eu te leve ao painel completo?',
      'Posso abrir o painel com os widgets pra ti?',
    ],
    seed >>> 3,
  );
  return [intro, ...bullets, closer];
}

function maybeEnrichAction(
  action: ZaptroInicioCopilotKeywordReply['action'],
  intent: CopilotIntent,
  seed: number,
): ZaptroInicioCopilotKeywordReply['action'] {
  if (intent === 'summary') {
    return {
      ...action,
      label: pick(
        ['Ver painel completo', 'Ver tudo em detalhe', 'Abrir resultados', 'Explorar resultados'],
        seed >>> 2,
      ),
    };
  }
  if (intent === 'billing') {
    return {
      ...action,
      label: pick(['Ver financeiro', 'Ver faturamento', 'Abrir financeiro'], seed >>> 4),
    };
  }
  if (intent === 'clients') {
    return {
      ...action,
      label: pick(['Ver cliente', 'Abrir clientes', 'Ver na base'], seed >>> 4),
    };
  }
  if (intent === 'map' || intent === 'drivers') {
    return {
      ...action,
      label: pick(['Ver motorista', 'Ver no mapa', 'Acompanhar agora'], seed >>> 6),
    };
  }
  return action;
}

/**
 * Enriquece a resposta do motor por palavras-chave:
 * saudação (período + nome) → pulso de contexto por intenção → corpo + CTA.
 */
export function personalizeZaptroInicioCopilotReply(
  reply: ZaptroInicioCopilotKeywordReply,
  opts: ZaptroInicioCopilotPersonalizeOpts,
): ZaptroInicioCopilotKeywordReply {
  const intent = inferIntent(reply);
  const fp = `${opts.queryFingerprint}|${opts.now.getTime()}|${opts.firstName}|${reply.title}|${intent}`;
  const seed = stableHash(fp);

  const leadIn = [
    buildGreetingLine(opts.firstName, opts.now, seed),
    buildContextPulse(intent, opts.now, seed),
  ];

  let details = reply.details;
  let title = reply.title;

  /** Painel tipo “cartões” só quando o utilizador pediu resumo/métricas — não em fallback nem urgência. */
  const useRichSummary =
    intent === 'summary' &&
    (reply.title === 'Resumo de hoje' || reply.title === 'Resultados e métricas');

  if (useRichSummary) {
    details = buildSummaryBody(seed);
    title = pick(
      ['Resumo inteligente do momento', 'O que está a mexer agora', 'Panorama rápido pra você'],
      seed >>> 1,
    );
  }

  const action = maybeEnrichAction(reply.action, intent, seed);

  return {
    ...reply,
    title,
    details,
    leadIn,
    action,
  };
}
