import React, { Component, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  MessageSquare,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  X,
  MapPin,
  CheckCircle,
  Info,
  Calendar,
  User,
  ShieldCheck,
  Zap,
  AlertTriangle,
  ExternalLink,
  Camera,
  Eye,
  EyeOff,
  Plus,
  Mic,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  Sparkles,
  Inbox,
  Bot,
  Kanban,
  Truck,
  HelpCircle,
  BookOpen,
  LayoutGrid,
  Check,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import ZaptroDashboardModernPreview from '../components/Zaptro/ZaptroDashboardModernPreview';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { zaptroOccurrencePath, ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { isZaptroTenantAdminRole } from '../utils/zaptroPermissions';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';

import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER, ZAPTRO_TITLE_COLOR } from '../constants/zaptroUi';
import { resolveSessionAvatarUrl } from '../utils/zaptroAvatar';
import { readAllQuotesFlattened } from '../constants/zaptroQuotes';
import {
  buildDashLayoutSegments,
  flattenDashLayoutSegments,
  moveSegmentByIndex,
  normalizeDashWidgetOrder,
  reorderDashWidgets,
  type DashLayoutSegment,
} from './zaptroDashboardLayoutUtils';

/** Superfícies claras “preto suave” (zinc) — alinhado aos badges do painel. */
const ZT_UI = {
  surface: ZAPTRO_FIELD_BG,
  surfaceBorder: ZAPTRO_SECTION_BORDER,
  tabTrack: ZAPTRO_FIELD_BG,
} as const;

const ZapRay = ({ size = 24, color = "#D9FF00", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={color} />
  </svg>
);

const LIME = '#D9FF00';

/** `true` — painel Início logístico (pré-visualização preto + lima). `false` — painel Zaptro clássico completo. */
const ZAPTRO_DASHBOARD_MODERN_PREVIEW = true;

const DASH_LAYOUT_STORAGE_KEY = 'zaptro_dashboard_widgets_v1';

export type DashWidgetId =
  | 'hero'
  | 'kpis'
  | 'chart'
  | 'feed'
  | 'automation'
  | 'promo'
  | 'resources'
  | 'assistant';

const DASH_WIDGET_IDS: DashWidgetId[] = [
  'hero',
  'kpis',
  'chart',
  'feed',
  'automation',
  'promo',
  'resources',
  'assistant',
];

const DASH_WIDGET_LABELS: Record<DashWidgetId, string> = {
  hero: 'Painel superior (saudação, comando e atalhos)',
  kpis: 'Indicadores (cartões de métricas)',
  chart: 'Volume de mensagens (gráfico)',
  feed: 'Fila de atendimento',
  automation: 'Automação (resumo)',
  promo: 'Destaque Zaptro Pro',
  resources: 'Atalhos inferiores (histórico, equipa…)',
  assistant: 'Assistente operacional (painel expandido)',
};

type DashWidgetCatalogTag = 'operacoes' | 'marketing';

const DASH_WIDGET_CATALOG: Record<
  DashWidgetId,
  { title: string; description: string; tags: DashWidgetCatalogTag[] }
> = {
  hero: {
    title: 'Painel principal',
    description: 'Saudação, créditos, comando rápido e atalhos para os módulos principais.',
    tags: ['operacoes', 'marketing'],
  },
  kpis: {
    title: 'Indicadores',
    description: 'Cartões com conversas activas, mensagens, contactos e tempo médio de resposta.',
    tags: ['operacoes'],
  },
  chart: {
    title: 'Volume de mensagens',
    description: 'Gráfico de actividade ao longo do tempo para acompanhar o ritmo da operação.',
    tags: ['operacoes'],
  },
  feed: {
    title: 'Fila de atendimento',
    description: 'Próximas conversas e estados para priorizar o que está em aberto.',
    tags: ['operacoes'],
  },
  automation: {
    title: 'Automação',
    description: 'Resumo do menu WhatsApp e atalho para configurar fluxos e triagem.',
    tags: ['marketing'],
  },
  promo: {
    title: 'Destaque Zaptro',
    description: 'Chamada para funcionalidades Pro e evolução do teu plano.',
    tags: ['marketing'],
  },
  resources: {
    title: 'Atalhos inferiores',
    description: 'Histórico, equipa, conta e central de ajuda num só bloco.',
    tags: ['marketing'],
  },
  assistant: {
    title: 'Assistente operacional',
    description: 'Painel do assistente com resumo e digest alinhado à tua operação.',
    tags: ['operacoes', 'marketing'],
  },
};

function loadDashboardHidden(): DashWidgetId[] {
  try {
    const raw = localStorage.getItem(DASH_LAYOUT_STORAGE_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as { hidden?: string[] };
    if (!j?.hidden || !Array.isArray(j.hidden)) return [];
    return j.hidden.filter((x): x is DashWidgetId =>
      (DASH_WIDGET_IDS as readonly string[]).includes(x)
    );
  } catch {
    return [];
  }
}

function saveDashboardHidden(hidden: DashWidgetId[]) {
  try {
    localStorage.setItem(DASH_LAYOUT_STORAGE_KEY, JSON.stringify({ hidden }));
  } catch {
    /* ignore */
  }
}

const INITIAL_MONTHLY_DELIVERY = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(
  (name) => ({
    name,
    mensagens: 0,
  })
);

const INITIAL_WEEKLY_DELIVERY = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((name) => ({
  name,
  mensagens: 0,
}));

type DigestMsg = { id: string; role: 'user' | 'system'; text: string; at: string; suggestHistory?: boolean };

type AgentReply = { text: string; suggestHistory: boolean };

function collectCrmStorageIdsFromLocalStorage(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('zaptro_crm_kanban_v3_')) ids.push(k.slice('zaptro_crm_kanban_v3_'.length));
    }
  } catch {
    /* ignore */
  }
  return [...new Set(ids)];
}

function countKanbanLeadsForCrmId(crmId: string): number {
  try {
    const raw = localStorage.getItem(`zaptro_crm_kanban_v3_${crmId}`);
    if (!raw) return 0;
    const j = JSON.parse(raw) as unknown;
    return Array.isArray(j) ? j.length : 0;
  } catch {
    return 0;
  }
}

type AgentCtx = {
  activeCount: string;
  totalCRM: string;
  onlineAgents: string;
  companyId: string | undefined;
  userFirstName?: string;
  /** ADMIN / MASTER: totais de equipa, créditos, rotas administrativas no texto. */
  isTenantAdmin: boolean;
};

function aggregateLocalCrm(ctx: AgentCtx): { leadsLocal: number; quotesLocal: number } {
  const orderedIds = ctx.companyId
    ? [ctx.companyId, ...collectCrmStorageIdsFromLocalStorage().filter((x) => x !== ctx.companyId)]
    : collectCrmStorageIdsFromLocalStorage();
  const uniqueIds = [...new Set(orderedIds)].slice(0, 16);
  let leadsLocal = 0;
  let quotesLocal = 0;
  for (const id of uniqueIds) {
    leadsLocal += countKanbanLeadsForCrmId(id);
    quotesLocal += readAllQuotesFlattened(id).length;
  }
  return { leadsLocal, quotesLocal };
}

function snapshotBlock(ctx: AgentCtx, leadsLocal: number, quotesLocal: number): string[] {
  const lines = [
    'Números que consigo cruzar para o teu perfil agora:',
    `• Conversas activas: ${ctx.activeCount}`,
    `• Contactos na base: ${ctx.totalCRM}`,
  ];
  if (ctx.isTenantAdmin) {
    lines.push(`• Agentes de campo (contagem no servidor): ${ctx.onlineAgents}`);
  } else {
    lines.push('• Contagem global de equipa / agentes: apenas para administradores da empresa.');
  }
  lines.push(`• Leads no kanban CRM (neste browser): ${leadsLocal}`);
  lines.push(`• Propostas Comerciais (armazenamento local): ${quotesLocal}`);
  return lines;
}

/** Respostas por regras + dados locais/servidor. `suggestHistory` só quando não dá para aprofundar aqui. */
function buildOperationalAgentReply(rawInput: string, ctx: AgentCtx): AgentReply {
  const trimmed = rawInput.trim();
  const q = trimmed.toLowerCase();
  const who = ctx.userFirstName?.trim() || '';

  if (!q) {
    return {
      text:
        'Escreve uma pergunta ou usa um atalho em baixo. Ex.: «resumo», «CRM», «histórico».' +
        (ctx.isTenantAdmin
          ? ' Administradores podem ver também totais de equipa e créditos no painel.'
          : ' O que aparece respeita o teu acesso.'),
      suggestHistory: false,
    };
  }

  const { leadsLocal, quotesLocal } = aggregateLocalCrm(ctx);
  const snap = snapshotBlock(ctx, leadsLocal, quotesLocal);

  if (/^(olá|ola|oi|hey|bom dia|boa tarde|boa noite)\b/i.test(trimmed)) {
    return {
      text: [`Olá${who ? `, ${who}` : ''}!`, '', ...snap, '', 'Pergunta o que precisares.'].join('\n'),
      suggestHistory: false,
    };
  }

  if (/obrigad|valeu|^ok\.?$|^certo\.?$/i.test(trimmed)) {
    return { text: `Disponha${who ? `, ${who}` : ''}!`, suggestHistory: false };
  }

  if (/ajuda|help|como (usar|funciona)|\?$/.test(q) || /^o que (é|e)s\b/i.test(trimmed)) {
    const pages = ctx.isTenantAdmin
      ? 'Clientes, CRM, Propostas, Histórico (com responsável), Ocorrências, Equipe e Configurações.'
      : 'Clientes, CRM, Propostas, Histórico (com responsável) e Ocorrências.';
    return {
      text: [
        'Neste bloco dá para cruzar:',
        '• contagens de conversas e contactos,',
        '• leads e orçamentos do CRM neste browser,',
        `• ligações úteis: ${pages}`,
        '',
        ctx.isTenantAdmin
          ? 'Exemplos: «resumo geral», «créditos», «equipa», «histórico».'
          : 'Exemplos: «resumo geral», «motoristas», «histórico».',
        '',
        ...snap,
      ].join('\n'),
      suggestHistory: false,
    };
  }

  if (/hora|horas|que horas|data de hoje|hoje é/i.test(q)) {
    return {
      text: `Agora neste dispositivo: ${new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}.\n\n${snap.join('\n')}`,
      suggestHistory: false,
    };
  }

  if (/cr(é|e)dito|plano|assinatura|fatura/i.test(q)) {
    if (!ctx.isTenantAdmin) {
      return {
        text: [
          'Créditos, plano e faturação são geridos pelo administrador da empresa.',
          'Para saldo ou facturas, fala com quem tem perfil de admin.',
          '',
          ...snap,
        ].join('\n'),
        suggestHistory: false,
      };
    }
    return {
      text: [
        'Créditos e plano: chip «CRÉDITOS» no topo deste painel; faturamento em Conta / Configurações.',
        '',
        ...snap,
      ].join('\n'),
      suggestHistory: false,
    };
  }

  if (/whatsapp|conversa|atendimento|inbox|mensagem/i.test(q)) {
    return {
      text: [
        `Conversas activas no servidor: ${ctx.activeCount}. Total na base: ${ctx.totalCRM}.`,
        `Atendimentos WhatsApp: ${ZAPTRO_ROUTES.CHAT}`,
        '',
        ...snap,
      ].join('\n'),
      suggestHistory: false,
    };
  }

  if (/hist(ó|o)rico|registo|log\b/i.test(q)) {
    return { text: [`Histórico de eventos: ${ZAPTRO_ROUTES.HISTORY}`, '', ...snap].join('\n'), suggestHistory: false };
  }

  if (/equipa|equipe|colaborador|utilizador|acesso/i.test(q)) {
    if (!ctx.isTenantAdmin) {
      return {
        text: [
          'Gestão de equipa e permissões é feita pelo administrador da empresa.',
          'Conversas e CRM seguem o acesso que te deram.',
          '',
          ...snap,
        ].join('\n'),
        suggestHistory: false,
      };
    }
    return {
      text: ['Colaboradores e permissões — menu Equipe.', `Caminho: ${ZAPTRO_ROUTES.TEAM}`, '', ...snap].join('\n'),
      suggestHistory: false,
    };
  }

  if (/painel|dashboard|início|home/i.test(q)) {
    return {
      text: ['Painel central: cartões acima com indicadores; mais abaixo gráficos e feed.', '', ...snap].join('\n'),
      suggestHistory: false,
    };
  }

  if (/sess(ã|a)o|login|empresa|conta\b/i.test(q)) {
    return {
      text: [
        ctx.companyId
          ? 'Sessão com empresa ligada — os números do servidor são desta conta.'
          : 'Sem empresa na sessão, muitos totais ficam em zero; usa login com conta vinculada.',
        '',
        ...snap,
      ].join('\n'),
      suggestHistory: false,
    };
  }

  if (/resumo|tudo|360|geral|vis(ã|a)o/i.test(q)) {
    return { text: ['Resumo rápido:', '', ...snap].join('\n'), suggestHistory: false };
  }

  if (/crm|lead|cliente|comercial/i.test(q)) {
    return {
      text: [
        `Leads no kanban (neste browser): ${leadsLocal}.`,
        `CRM: ${ZAPTRO_ROUTES.COMMERCIAL_CRM} · Clientes: ${ZAPTRO_ROUTES.CLIENTS}`,
        '',
        ...snap,
      ].join('\n'),
      suggestHistory: false,
    };
  }

  if (/equipa|equipe|agente|colaborador/i.test(q)) {
    return {
      text: ['Equipa — gestão e contactos.', `Abre: ${ZAPTRO_ROUTES.TEAM}`, '', ...snap].join('\n'),
      suggestHistory: false,
    };
  }

  if (/or(ç|c)amento|cota(ç|c)(ã|a)o|venda|proposta/i.test(q)) {
    return {
      text: [
        `Propostas comerciais encontradas: ${quotesLocal}.`,
        `Lista: ${ZAPTRO_ROUTES.COMMERCIAL_QUOTES}`,
        '',
        ...snap,
      ].join('\n'),
      suggestHistory: false,
    };
  }

  if (/venda|suporte|proposta/i.test(q)) {
    return {
      text: [
        'Vendas e propostas têm páginas próprias; aqui só há totais gerais do painel.',
        'Abre Comercial / CRM ou suporte no menu para casos com ID.',
        '',
        ...snap,
      ].join('\n'),
      suggestHistory: false,
    };
  }

  /** Palavra solta (ex.: nome) — não pesquisa pessoa aqui. */
  const singleToken = /^[\p{L}\p{N}._-]{1,40}$/u.test(trimmed);
  if (singleToken && trimmed.length >= 2) {
    return {
      text: [
        `«${trimmed}» não dá para pesquisar como pessoa neste quadro.`,
        'Para um contacto, usa Clientes ou o CRM (nome ou telefone).',
        '',
        ...snap,
        '',
        'Para outro tema, tenta «resumo» ou «orçamentos».',
      ].join('\n'),
      suggestHistory: true,
    };
  }

  return {
    text: [
      'Não encontrei um tópico específico para essa frase. Dados disponíveis agora:',
      '',
      ...snap,
      '',
      ctx.isTenantAdmin
        ? 'Tenta: resumo geral, CRM, equipe, propostas, WhatsApp, histórico, equipe, créditos ou «ajuda».'
        : 'Tenta: resumo geral, CRM, equipe, propostas, WhatsApp, histórico ou «ajuda».',
    ].join('\n'),
    suggestHistory: true,
  };
}

const ZaptroDashboardContent: React.FC = () => {
  const { profile, isMaster } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeCount, setActiveCount] = useState('0');
  const [totalCRM, setTotalCRM] = useState('0');
  const [onlineAgents, setOnlineAgents] = useState('0');
  const [messagesTodayCount, setMessagesTodayCount] = useState('0');
  const [avgAttendance, setAvgAttendance] = useState('—');
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'failed'>('success');
  const [deliveryPeriod, setDeliveryPeriod] = useState<'week' | 'month'>('month');
  const [monthlyChartData, setMonthlyChartData] = useState(INITIAL_MONTHLY_DELIVERY);
  const [weeklyChartData, setWeeklyChartData] = useState(INITIAL_WEEKLY_DELIVERY);
  const [uploadModal, setUploadModal] = useState<{ kind: 'stat'; index: number } | { kind: 'hero' } | null>(null);
  const [pendingStatImage, setPendingStatImage] = useState<string | null>(null);
  const [statImages, setStatImages] = useState<Record<number, string>>(() => {
    try {
      const raw = localStorage.getItem('zaptro_dashboard_stat_images');
      if (raw) return JSON.parse(raw) as Record<number, string>;
    } catch {
      /* ignore */
    }
    return {};
  });
  const [creditsVisible, setCreditsVisible] = useState(true);
  const [digestInput, setDigestInput] = useState('');
  const [digestMessages, setDigestMessages] = useState<DigestMsg[]>([]);
  const assistantPillRef = useRef<HTMLDivElement>(null);
  const chartSentinelRef = useRef<HTMLDivElement>(null);
  const [digestAuxOpen, setDigestAuxOpen] = useState(false);
  /** Painel do assistente expandido — a barra de comando no herói abre ao tocar. */
  const [digestPanelOpen, setDigestPanelOpen] = useState(false);
  const [chartInView, setChartInView] = useState(false);
  /** Personalização da página inicial (widgets visíveis) — estilo painéis modulares. */
  const [dashLayoutEdit, setDashLayoutEdit] = useState(false);
  const [dashHiddenSaved, setDashHiddenSaved] = useState<DashWidgetId[]>(() => loadDashboardHidden());
  const [dashHiddenDraft, setDashHiddenDraft] = useState<DashWidgetId[]>([]);
  const [dashManageWidgetsOpen, setDashManageWidgetsOpen] = useState(false);
  /** No modal de widgets: mostrar só entradas com etiqueta Marketing. */
  const [dashWidgetFilterMarketingOnly, setDashWidgetFilterMarketingOnly] = useState(false);

  const [headerHeroImage, setHeaderHeroImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem('zaptro_dashboard_hero');
    } catch {
      return null;
    }
  });

  const { palette } = useZaptroTheme();
  const canPurchaserTools = isMaster || isZaptroTenantAdminRole(profile?.role);
  const sessionAvatarSrc = useMemo(() => resolveSessionAvatarUrl(profile), [profile]);

  const assistantUi = useMemo(() => {
    const dark = palette.mode === 'dark';
    return {
      shellBg: dark
        ? 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 55%, #0a0a0a 100%)'
        : `linear-gradient(180deg, ${palette.pageBg} 0%, ${ZT_UI.surface} 100%)`,
      shellBorder: dark ? 'rgba(255,255,255,0.12)' : ZAPTRO_SECTION_BORDER,
      text: dark ? '#fafafa' : palette.text,
      muted: dark ? '#a3a3a3' : palette.textMuted,
      chipBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
      chipBorder: dark ? 'rgba(255,255,255,0.14)' : ZAPTRO_SECTION_BORDER,
      divider: dark ? 'rgba(255,255,255,0.1)' : ZAPTRO_SECTION_BORDER,
      bubbleSystem: dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)',
      bubbleSystemBorder: dark ? 'rgba(255, 255, 255, 0.1)' : ZAPTRO_SECTION_BORDER,
      popoverBg: dark ? '#111111' : palette.hubPopupBg,
      popoverBorder: dark ? 'rgba(255,255,255,0.12)' : ZAPTRO_SECTION_BORDER,
      inactiveSend: dark ? '#3f3f46' : '#e2e8f0',
    };
  }, [palette.mode, palette.pageBg, palette.text, palette.textMuted, palette.hubPopupBg]);

  const chartData = useMemo(
    () => (deliveryPeriod === 'month' ? monthlyChartData : weeklyChartData),
    [deliveryPeriod, monthlyChartData, weeklyChartData]
  );

  const chartStrokeGrid = palette.mode === 'dark' ? '#334155' : '#e2e8f0';
  const chartTick = palette.mode === 'dark' ? '#94a3b8' : '#64748b';
  const chartDotFill = palette.mode === 'dark' ? '#0a0a0a' : '#0f172a';
  const gradId = `zt-area-${palette.mode}`;

  const ds = useMemo(() => {
    const light = palette.mode === 'light';
    if (light) {
      return {
        title: { ...styles.title, fontSize: '56px', letterSpacing: '-1px' },
        statCard: styles.statCard,
        gridCard: styles.gridCard,
        cardTitle: styles.cardTitle,
        statValue: styles.statValue,
        statLabel: styles.statLabel,
        priBtn: styles.priBtn,
        secBtn: styles.secBtn,
        feedItem: styles.feedItem,
        feedText: styles.feedText,
        userAvatar: styles.userAvatar,
        viewMoreBtn: styles.viewMoreBtn,
        neonIconBox: styles.neonIconBox,
        statBadgeBg: '#e4e4e7',
        statBadgeColor: '#18181b',
        statBadgeBorder: `1px solid ${ZT_UI.surfaceBorder}`,
        statBadgeArrow: '#52525b',
        typeBadgeBg: ZT_UI.surface,
        typeBadgeColor: '#18181b',
        tabActive: { backgroundColor: '#0F172A', color: 'white' as const },
        tabInactive: { ...styles.tab, color: ZAPTRO_TITLE_COLOR },
        tabGroup: {
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          borderRadius: '14px',
          backgroundColor: ZT_UI.tabTrack,
          border: `1px solid ${ZT_UI.surfaceBorder}`,
          padding: '2px 4px',
        },
        barDim: '#E2E8F0',
        iconStroke: '#000',
      };
    }
    return {
      title: { ...styles.title, fontSize: '56px', letterSpacing: '-1px', color: palette.text },
      statCard: {
        ...styles.statCard,
        backgroundColor: 'rgba(17, 17, 17, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'none',
        transition: 'transform 0.2s ease',
      },
      gridCard: { 
        ...styles.gridCard, 
        backgroundColor: 'rgba(17, 17, 17, 0.8)', 
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease'
      },

      cardTitle: { ...styles.cardTitle, color: '#f8fafc' },
      statValue: { ...styles.statValue, color: '#f1f5f9' },
      statLabel: styles.statLabel,
      priBtn: { ...styles.priBtn, backgroundColor: palette.lime, color: '#000' },
      secBtn: {
        ...styles.secBtn,
        backgroundColor: '#111111',
        color: palette.text,
        border: '1px solid #334155',
      },
      feedItem: {
        ...styles.feedItem,
        backgroundColor: '#111111',
        border: '1px solid #334155',
        boxShadow: 'none',
      },
      feedText: { ...styles.feedText, color: '#e2e8f0' },
      userAvatar: {
        ...styles.userAvatar,
        backgroundColor: '#1e293b',
        color: '#f8fafc',
        borderColor: '#475569',
      },
      viewMoreBtn: { ...styles.viewMoreBtn, borderColor: '#334155', color: palette.textMuted },
      neonIconBox: { ...styles.neonIconBox, backgroundColor: 'rgba(217,255,0,0.12)' },
      statBadgeBg: '#27272a',
      statBadgeColor: '#e4e4e7',
      statBadgeBorder: '1px solid #52525b',
      statBadgeArrow: '#a1a1aa',
      typeBadgeBg: '#1e293b',
      typeBadgeColor: '#f8fafc',
      tabActive: { backgroundColor: palette.lime, color: '#000' as const },
      tabInactive: { ...styles.tab, color: palette.textMuted },
      tabGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: '14px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        padding: '2px 4px',
      },
      barDim: '#334155',
      iconStroke: '#f8fafc',
    };
  }, [palette]);

  const assistantFirstName = profile?.full_name?.trim()?.split(/\s+/)[0] || '';

  const agentCtx = useMemo<AgentCtx>(
    () => ({
      activeCount,
      totalCRM,
      onlineAgents,
      companyId: profile?.company_id,
      userFirstName: assistantFirstName || undefined,
      isTenantAdmin: isZaptroTenantAdminRole(profile?.role),
    }),
    [activeCount, totalCRM, onlineAgents, profile?.company_id, profile?.role, assistantFirstName]
  );

  const appendDigestExchange = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      const at = new Date().toLocaleString('pt-BR');
      const uid = `digest-u-${Date.now()}`;
      const sid = `digest-s-${Date.now()}`;
      const userMsg: DigestMsg = { id: uid, role: 'user', text: t, at };
      const { text: reply, suggestHistory } = buildOperationalAgentReply(t, agentCtx);
      const botMsg: DigestMsg = { id: sid, role: 'system', text: reply, at, suggestHistory };
      setDigestMessages((m) => [...m, userMsg, botMsg]);
    },
    [agentCtx]
  );

  const openHistoryFromAssistant = useCallback(() => {
    navigate(`${ZAPTRO_ROUTES.HISTORY}?from=assistant`);
  }, [navigate]);

  const assistantQuickChips = useMemo(() => {
    const base = ['Resumo geral', 'CRM', 'Orçamentos', 'Atendimentos', 'Histórico', 'WhatsApp'];
    if (isZaptroTenantAdminRole(profile?.role)) base.push('Equipe', 'Créditos');
    return base;
  }, [profile?.role]);

  useEffect(() => {
    if (!digestAuxOpen) return;
    const onDown = (ev: MouseEvent) => {
      const el = assistantPillRef.current;
      if (el && !el.contains(ev.target as Node)) setDigestAuxOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [digestAuxOpen]);

  useEffect(() => {
    const el = chartSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setChartInView(true);
      },
      { rootMargin: '120px', threshold: 0.06 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // Check for welcome param
    const params = new URLSearchParams(location.search);
    const welcomeSeen = localStorage.getItem('zaptro_welcome_seen');

    if (params.get('welcome') === 'true' && !welcomeSeen) {
      setShowWelcome(true);
      localStorage.setItem('zaptro_welcome_seen', 'true');
      // Limpa a URL para ficar limpa
      navigate(ZAPTRO_ROUTES.DASHBOARD, { replace: true });
    }


    const fetchStats = async () => {
      if (!profile?.company_id) return;

      const crmCtx: AgentCtx = {
        activeCount: '0',
        totalCRM: '0',
        onlineAgents: '0',
        companyId: profile.company_id,
        userFirstName: profile?.full_name?.trim()?.split(/\s+/)[0],
        isTenantAdmin: isZaptroTenantAdminRole(profile?.role),
      };

      try {
        // 1. Conversas ativas (abertas ou em espera)
        const { count: active } = await supabaseZaptro
          .from('whatsapp_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .in('status', ['open', 'waiting']);

        // 2. Total na base (threads WhatsApp Supabase + leads Kanban só em localStorage)
        const { count: supabaseCrmCount } = await supabaseZaptro
          .from('whatsapp_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id);

        const { leadsLocal } = aggregateLocalCrm(crmCtx);
        const totalCombinedCRM = (supabaseCrmCount || 0) + leadsLocal;

        // 3. Agentes de atendimento (papéis usados em Equipa)
        const { count: agents } = await supabaseZaptro
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .in('role', ['agent', 'atendimento']);

        // 4. Média de atendimento (proxy: criação → última mensagem do cliente)
        const { data: attendanceData } = await supabaseZaptro
          .from('whatsapp_conversations')
          .select('created_at, last_customer_message_at')
          .eq('company_id', profile.company_id)
          .not('last_customer_message_at', 'is', null)
          .limit(20);

        if (attendanceData && attendanceData.length > 0) {
          const avg =
            attendanceData.reduce((acc, c) => {
              const t1 = new Date(c.created_at).getTime();
              const t2 = new Date(c.last_customer_message_at).getTime();
              return acc + (t2 - t1);
            }, 0) / attendanceData.length;

          const mins = Math.max(0.5, Math.floor(avg / 60000));
          setAvgAttendance(`${mins} min`);
        } else {
          setAvgAttendance('—');
        }

        if (active !== null) setActiveCount(String(active));
        setTotalCRM(String(totalCombinedCRM));
        if (agents !== null) setOnlineAgents(String(agents));

        // 5. Atividades recentes
        const { data: convs } = await supabaseZaptro
          .from('whatsapp_conversations')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('last_customer_message_at', { ascending: false })
          .limit(5);

        if (convs?.length) {
          setRecentActivities(
            convs.map((c: Record<string, unknown>) => {
              const lastAt = c.last_customer_message_at as string | null | undefined;
              const displayName =
                (c.sender_name as string) ||
                (c.customer_name as string) ||
                (c.sender_number as string) ||
                (c.customer_phone as string) ||
                'Cliente';
              return {
                id: c.id as string,
                type: 'ATENDIMENTO',
                user: displayName,
                action: 'Mensagem recebida',
                time: lastAt ? new Date(lastAt).toLocaleString('pt-BR') : '—',
                icon: <MessageSquare size={14} />,
                color: '#D9FF00',
                details: (c.last_message as string) || 'Iniciou uma nova conversa.',
              };
            })
          );
        } else {
          setRecentActivities([]);
        }

        // 6. Volume de mensagens (últimos 12 meses) — dados reais em `whatsapp_messages`
        const mData = INITIAL_MONTHLY_DELIVERY.map((b) => ({ ...b }));
        const wData = INITIAL_WEEKLY_DELIVERY.map((b) => ({ ...b }));

        const { data: convIdRows } = await supabaseZaptro
          .from('whatsapp_conversations')
          .select('id')
          .eq('company_id', profile.company_id);

        const convIds = (convIdRows ?? []).map((r) => r.id as string).filter(Boolean);
        const since = new Date();
        since.setFullYear(since.getFullYear() - 1);
        const sinceIso = since.toISOString();

        const timestamps: string[] = [];
        const chunk = 400;
        for (let i = 0; i < convIds.length; i += chunk) {
          const slice = convIds.slice(i, i + chunk);
          const { data: msgRows } = await supabaseZaptro
            .from('whatsapp_messages')
            .select('created_at')
            .in('conversation_id', slice)
            .gte('created_at', sinceIso);
          for (const row of msgRows ?? []) {
            if (row?.created_at) timestamps.push(row.created_at as string);
          }
        }

        for (const iso of timestamps) {
          const d = new Date(iso);
          if (!Number.isFinite(d.getTime())) continue;
          const month = d.getMonth();
          const day = (d.getDay() + 6) % 7;
          if (mData[month]) mData[month].mensagens += 1;
          if (wData[day]) wData[day].mensagens += 1;
        }

        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        let msgsToday = 0;
        for (const iso of timestamps) {
          const t = new Date(iso).getTime();
          if (Number.isFinite(t) && t >= startToday.getTime()) msgsToday += 1;
        }
        setMessagesTodayCount(String(msgsToday));

        setMonthlyChartData(mData);
        setWeeklyChartData(wData);
      } catch (e) {
        console.error('[ZaptroDashboard] fetchStats', e);
      }
    };

    void fetchStats();

    const channel = supabaseZaptro
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        void fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, () => {
        void fetchStats();
      })
      .subscribe();

    return () => {
      supabaseZaptro.removeChannel(channel);
    };
  }, [profile?.company_id, profile?.role, profile?.full_name, location.search, navigate]);

  useEffect(() => {
    try {
      localStorage.setItem('zaptro_dashboard_stat_images', JSON.stringify(statImages));
    } catch {
      /* ignore */
    }
  }, [statImages]);

  useEffect(() => {
    try {
      if (headerHeroImage) localStorage.setItem('zaptro_dashboard_hero', headerHeroImage);
      else localStorage.removeItem('zaptro_dashboard_hero');
    } catch {
      /* ignore */
    }
  }, [headerHeroImage]);

  /** Links antigos `#personalizar-empresa` no painel → mesma experiência que o menu do perfil. */
  useEffect(() => {
    if (location.pathname !== ZAPTRO_ROUTES.DASHBOARD || location.hash !== '#personalizar-empresa') return;
    if (canPurchaserTools) navigate(`${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=marca`, { replace: true });
    else navigate(ZAPTRO_ROUTES.DASHBOARD, { replace: true });
  }, [location.pathname, location.hash, canPurchaserTools, navigate]);

  const stats = useMemo(
    () =>
      [
        {
          label: 'Conversas ativas',
          value: activeCount,
          change: 'Abertas / em espera',
          positive: true,
          icon: MessageSquare,
          color: 'linear-gradient(135deg, #D9FF00 0%, #A3E635 100%)',
        },
        {
          label: 'Mensagens hoje',
          value: messagesTodayCount,
          change: 'Hoje',
          positive: true,
          icon: Inbox,
          color: 'linear-gradient(135deg, #D9FF00 0%, #84CC16 100%)',
        },
        {
          label: 'Total de contatos',
          value: totalCRM,
          change: 'Base',
          positive: true,
          icon: Users,
          color: 'linear-gradient(135deg, #22C55E 0%, #D9FF00 100%)',
        },
        {
          label: 'Tempo médio de resposta',
          value: avgAttendance,
          change: 'SLA',
          positive: true,
          icon: Clock,
          color: 'linear-gradient(135deg, #EF4444 0%, #D9FF00 100%)',
        },
      ] as const,
    [activeCount, totalCRM, messagesTodayCount, avgAttendance]
  );

  const submitDigest = (e: React.FormEvent) => {
    e.preventDefault();
    const text = digestInput.trim();
    if (!text) return;
    appendDigestExchange(text);
    setDigestInput('');
  };

  const dashFirstName = useMemo(
    () => profile?.full_name?.trim().split(/\s+/)[0] ?? '',
    [profile?.full_name]
  );

  const dashFooterLinks = useMemo(
    () =>
      [
        {
          label: 'Histórico',
          sub: 'Actividade e responsáveis',
          Icon: Clock,
          to: ZAPTRO_ROUTES.HISTORY,
        },
        {
          label: 'Equipa',
          sub: 'Membros e permissões',
          Icon: Users,
          to: ZAPTRO_ROUTES.TEAM,
        },
        {
          label: 'Conta',
          sub: 'Perfil e segurança',
          Icon: User,
          to: ZAPTRO_ROUTES.PROFILE,
        },
        {
          label: 'Central de ajuda',
          sub: 'Configuração e guias',
          Icon: BookOpen,
          to: ZAPTRO_ROUTES.SETTINGS_ALIAS,
        },
      ] as const,
    []
  );

  const dashHiddenEffective = useMemo(
    () => (dashLayoutEdit ? dashHiddenDraft : dashHiddenSaved),
    [dashLayoutEdit, dashHiddenDraft, dashHiddenSaved]
  );
  const dashShow = useCallback(
    (id: DashWidgetId) => !dashHiddenEffective.includes(id),
    [dashHiddenEffective]
  );

  const startDashLayoutEdit = useCallback(() => {
    setDashHiddenDraft([...dashHiddenSaved]);
    setDashLayoutEdit(true);
    setDashManageWidgetsOpen(true);
  }, [dashHiddenSaved]);

  const cancelDashLayoutEdit = useCallback(() => {
    setDashHiddenDraft([...dashHiddenSaved]);
    setDashLayoutEdit(false);
    setDashManageWidgetsOpen(false);
    setDashWidgetFilterMarketingOnly(false);
  }, [dashHiddenSaved]);

  const saveDashLayoutEdit = useCallback(() => {
    setDashHiddenSaved([...dashHiddenDraft]);
    saveDashboardHidden(dashHiddenDraft);
    setDashLayoutEdit(false);
    setDashManageWidgetsOpen(false);
    setDashWidgetFilterMarketingOnly(false);
  }, [dashHiddenDraft]);

  /** Aplica a selecção do modal ao estado guardado e mantém o modo personalizar aberto. */
  const confirmDashWidgetModal = useCallback(() => {
    setDashHiddenSaved([...dashHiddenDraft]);
    saveDashboardHidden(dashHiddenDraft);
    setDashManageWidgetsOpen(false);
    setDashWidgetFilterMarketingOnly(false);
  }, [dashHiddenDraft]);

  const cancelDashWidgetModal = useCallback(() => {
    setDashHiddenDraft([...dashHiddenSaved]);
    setDashManageWidgetsOpen(false);
    setDashWidgetFilterMarketingOnly(false);
  }, [dashHiddenSaved]);

  const hideDashWidget = useCallback((id: DashWidgetId) => {
    setDashHiddenDraft((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const toggleDashWidgetVisible = useCallback((id: DashWidgetId, visible: boolean) => {
    setDashHiddenDraft((prev) => {
      if (visible) return prev.filter((x) => x !== id);
      return prev.includes(id) ? prev : [...prev, id];
    });
  }, []);

  useEffect(() => {
    if (dashHiddenEffective.includes('assistant')) setDigestPanelOpen(false);
  }, [dashHiddenEffective]);

  const dashWidgetModalIds = useMemo(() => {
    if (!dashWidgetFilterMarketingOnly) return DASH_WIDGET_IDS;
    return DASH_WIDGET_IDS.filter((id) => DASH_WIDGET_CATALOG[id].tags.includes('marketing'));
  }, [dashWidgetFilterMarketingOnly]);

  /** Acento painel / modal de widgets — verde limão Zaptro (substitui violeta). */
  const accent = palette.lime;
  const accentBorder = palette.mode === 'dark' ? 'rgba(217, 255, 0, 0.38)' : 'rgba(15, 23, 42, 0.12)';
  const accentSoft = palette.mode === 'dark' ? 'rgba(217, 255, 0, 0.14)' : 'rgba(217, 255, 0, 0.22)';
  const accentText = palette.mode === 'dark' ? '#ecfccb' : '#14532d';
  const dashEditOutline =
    palette.mode === 'dark' ? '2px dashed rgba(217, 255, 0, 0.55)' : '2px dashed rgba(20, 83, 45, 0.38)';

  return (
    <>
      <div style={styles.container}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: dashLayoutEdit ? 14 : 10,
            width: '100%',
          }}
        >
          {!dashLayoutEdit ? (
            <div style={{ flex: 1 }} />
          ) : (
            <span style={{ fontSize: 13, fontWeight: 800, color: palette.textMuted }}>Personalizar página</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {!dashLayoutEdit ? (
              <button
                type="button"
                onClick={startDashLayoutEdit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 14,
                  border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : ZAPTRO_SECTION_BORDER}`,
                  backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
                  color: palette.text,
                  fontSize: 13,
                  fontWeight: 950,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <LayoutGrid size={17} strokeWidth={2.2} />
                Personalizar página
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={cancelDashLayoutEdit}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 14,
                    border: 'none',
                    background: 'transparent',
                    color: palette.textMuted,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveDashLayoutEdit}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 14,
                    border: 'none',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 950,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Salvar página
                </button>
              </>
            )}
          </div>
        </div>

        {dashLayoutEdit && (
          <div
            role="status"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: 18,
              padding: '14px 18px',
              borderRadius: 16,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              backgroundColor: palette.mode === 'dark' ? 'rgba(217, 255, 0, 0.1)' : 'rgba(217, 255, 0, 0.16)',
              border: `1px solid ${palette.mode === 'dark' ? 'rgba(217, 255, 0, 0.32)' : 'rgba(15, 23, 42, 0.08)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: '1 1 280px' }}>
              <Info size={20} color={accent} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: palette.text }}>
                Estás a personalizar o teu painel. Os dados são os mesmos de sempre; podes remover widgets e voltar a
                adicioná-los em «Gerir widgets». Não te esqueças de guardar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDashManageWidgetsOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: 'none',
                color: palette.mode === 'dark' ? accent : '#14532d',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={17} strokeWidth={2.2} /> Gerir widgets
            </button>
          </div>
        )}

        {dashManageWidgetsOpen && dashLayoutEdit && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="zaptro-dash-widgets-title"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200000,
              backgroundColor: 'rgba(15,23,42,0.48)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              boxSizing: 'border-box',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) cancelDashWidgetModal();
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 900,
                borderRadius: 22,
                padding: '28px 32px 26px',
                backgroundColor: palette.mode === 'dark' ? '#141414' : '#ffffff',
                border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : ZAPTRO_SECTION_BORDER}`,
                boxShadow: '0 28px 80px rgba(15, 23, 42, 0.2)',
                boxSizing: 'border-box',
                maxHeight: 'min(92vh, 900px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 18,
                  flexShrink: 0,
                }}
              >
                <h2
                  id="zaptro-dash-widgets-title"
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 950,
                    letterSpacing: '-0.03em',
                    color: palette.text,
                    lineHeight: 1.2,
                  }}
                >
                  Selecionar seus widgets
                </h2>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={cancelDashWidgetModal}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: palette.textMuted,
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <X size={22} strokeWidth={2.2} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDashWidgetFilterMarketingOnly((v) => !v)}
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: `1.5px solid ${accent}`,
                  backgroundColor: dashWidgetFilterMarketingOnly ? accentSoft : 'transparent',
                  color: accentText,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: 4,
                  flexShrink: 0,
                }}
              >
                Selecionar apenas widgets de Marketing
              </button>

              <div
                style={{
                  marginTop: 18,
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 0,
                  paddingRight: 4,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
                    gap: 16,
                  }}
                >
                  {dashWidgetModalIds.map((id) => {
                    const selected = !dashHiddenDraft.includes(id);
                    const meta = DASH_WIDGET_CATALOG[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleDashWidgetVisible(id, !selected)}
                        style={{
                          position: 'relative',
                          textAlign: 'left',
                          padding: '16px 16px 18px',
                          borderRadius: 14,
                          border: `1px solid ${accentBorder}`,
                          backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafafa',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          display: 'block',
                          width: '100%',
                          minHeight: 0,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 10,
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {meta.tags.includes('operacoes') && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 850,
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                  backgroundColor: '#ffedd5',
                                  color: '#c2410c',
                                }}
                              >
                                Operações
                              </span>
                            )}
                            {meta.tags.includes('marketing') && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 850,
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                  backgroundColor: palette.mode === 'dark' ? 'rgba(217, 255, 0, 0.16)' : 'rgba(217, 255, 0, 0.28)',
                                  color: palette.mode === 'dark' ? '#ecfccb' : '#14532d',
                                }}
                              >
                                Marketing
                              </span>
                            )}
                          </div>
                          <span
                            aria-hidden
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              flexShrink: 0,
                              border: `2px solid ${selected ? accent : palette.mode === 'dark' ? 'rgba(255,255,255,0.25)' : '#d4d4d8'}`,
                              backgroundColor: selected ? accent : 'transparent',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {selected ? <Check size={14} strokeWidth={3} color="#0a0a0a" /> : null}
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 950, color: palette.text, marginBottom: 8, lineHeight: 1.25 }}>
                          {meta.title}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: palette.textMuted, lineHeight: 1.5 }}>
                          {meta.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 22,
                  marginTop: 26,
                  paddingTop: 4,
                  flexShrink: 0,
                  borderTop: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f4f4f5'}`,
                }}
              >
                <button
                  type="button"
                  onClick={cancelDashWidgetModal}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: palette.textMuted,
                    fontWeight: 850,
                    fontSize: 15,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    padding: '8px 4px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDashWidgetModal}
                  style={{
                    padding: '14px 28px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#000000',
                    color: '#ffffff',
                    fontWeight: 950,
                    fontSize: 15,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                  }}
                >
                  Confirmar seleção
                </button>
              </div>
            </div>
          </div>
        )}

        {dashShow('hero') && (
        <section
          aria-labelledby="zaptro-dash-hero-title"
          style={{
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
            borderRadius: 28,
            padding: 'clamp(22px, 3.8vw, 36px) clamp(22px, 3.2vw, 40px)',
            marginBottom: 4,
            overflow: 'hidden',
            background:
              palette.mode === 'dark'
                ? 'radial-gradient(ellipse 100% 80% at 0% -30%, rgba(217,255,0,0.1) 0%, transparent 52%), linear-gradient(168deg, #000000 0%, #0a0a0a 48%, #111111 100%)'
                : 'radial-gradient(ellipse 90% 70% at 12% -15%, rgba(217,255,0,0.14) 0%, transparent 46%), linear-gradient(158deg, #000000 0%, #0a0a0a 42%, #141414 100%)',
            border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)'}`,
            boxShadow:
              palette.mode === 'dark'
                ? '0 28px 56px -16px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 28px 56px -16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
            ...(dashLayoutEdit ? { outline: dashEditOutline, outlineOffset: 4 } : {}),
          }}
        >
          {dashLayoutEdit && (
            <button
              type="button"
              onClick={() => hideDashWidget('hero')}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                zIndex: 20,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.28)',
                background: 'rgba(15,23,42,0.65)',
                color: '#f8fafc',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <EyeOff size={15} strokeWidth={2} />
              Remover widget
            </button>
          )}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: '8%',
              right: '8%',
              height: 2,
              borderRadius: '0 0 8px 8px',
              background: 'linear-gradient(90deg, transparent, rgba(217,255,0,0.55), rgba(217,255,0,0.85), rgba(217,255,0,0.55), transparent)',
              opacity: 0.9,
            }}
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 18,
              marginBottom: 22,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: '1 1 280px' }}>
              <button
                type="button"
                aria-label="Definir foto ao lado da saudação"
                title="Sua foto aparece aqui ao salvar"
                onClick={() => {
                  setPendingStatImage(headerHeroImage || sessionAvatarSrc);
                  setUploadModal({ kind: 'hero' });
                }}
                style={{
                  ...styles.heroPhotoBtn,
                  width: 58,
                  height: 58,
                  borderRadius: 20,
                  border: '2px solid rgba(217,255,0,0.35)',
                  backgroundColor: 'rgba(15,23,42,0.55)',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06) inset',
                }}
              >
                {headerHeroImage ? (
                  <img src={headerHeroImage} alt="" style={styles.heroPhotoImg} />
                ) : sessionAvatarSrc ? (
                  <img src={sessionAvatarSrc} alt="" style={styles.heroPhotoImg} />
                ) : (
                  <span style={{ ...styles.heroPhotoPh, color: '#f8fafc' }}>{profile?.full_name?.[0] || 'Z'}</span>
                )}
                <span style={styles.heroPhotoCam}>
                  <Camera size={14} color="#FFFFFF" />
                </span>
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      padding: '5px 12px',
                      borderRadius: 999,
                      backgroundColor: 'rgba(217,255,0,0.32)',
                      color: '#0f172a',
                      border: '1px solid rgba(217,255,0,0.5)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    Beta
                  </span>
                  <button
                    type="button"
                    aria-label="Abrir assistente operacional"
                    title="Assistente"
                    onClick={() => setDigestPanelOpen(true)}
                    style={{
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: 999,
                      padding: 7,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <HelpCircle size={18} color="rgba(248,250,252,0.9)" strokeWidth={2} />
                  </button>
                </div>
                <p
                  style={{
                    margin: '0 0 6px',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(248,250,252,0.45)',
                  }}
                >
                  Painel principal
                </p>
                <h1
                  id="zaptro-dash-hero-title"
                  style={{
                    margin: 0,
                    fontSize: 'clamp(18px, 2.1vw, 24px)',
                    fontWeight: 800,
                    color: '#f8fafc',
                    lineHeight: 1.3,
                    letterSpacing: '-0.03em',
                    textWrap: 'balance' as const,
                  }}
                >
                  Olá, {dashFirstName || profile?.full_name || 'Comandante'}. O que queres que eu faça hoje?
                </h1>
              </div>
            </div>
            <div style={{ ...styles.headerActions, marginLeft: 'auto' }}>
              {isZaptroTenantAdminRole(profile?.role) && (
                <div
                  style={{
                    ...styles.dashboardCredits,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                  title="O saldo de créditos aparecerá aqui quando o número WhatsApp estiver habilitado para a empresa."
                >
                  <span style={{ ...styles.dashboardCreditsLabel, color: palette.mode === 'dark' ? '#a3a3a3' : '#71717a' }}>CRÉDITOS</span>
                  <div style={styles.dashboardCreditsRow}>
                    <span style={{ ...styles.dashboardCreditsValue, color: '#FFFFFF' }}>
                      {creditsVisible ? '1,240' : '•••••'}
                    </span>
                    <button
                      type="button"
                      aria-label={creditsVisible ? 'Ocultar saldo de créditos' : 'Mostrar saldo de créditos'}
                      title={creditsVisible ? 'Ocultar' : 'Mostrar'}
                      style={{
                        ...styles.dashboardCreditsEye,
                        background: palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.08)',
                      }}
                      onClick={() => setCreditsVisible((v) => !v)}
                    >
                      {creditsVisible ? (
                        <Eye size={20} color={palette.lime} strokeWidth={2.2} />
                      ) : (
                        <EyeOff size={20} color={palette.lime} strokeWidth={2.2} />
                      )}
                    </button>
                  </div>
                  <div style={styles.dashboardCreditsZap} aria-hidden>
                    <Zap
                      size={12}
                      color={palette.lime}
                      fill={palette.mode === 'dark' ? '#111111' : '#18181b'}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p
              style={{
                margin: '0 0 10px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(248,250,252,0.5)',
              }}
            >
              Comando rápido
            </p>
            <button
              type="button"
              aria-expanded={digestPanelOpen}
              aria-controls="zaptro-dash-assistant-panel"
              onClick={() => setDigestPanelOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                padding: '16px 20px',
                borderRadius: 20,
                border: '1px solid rgba(15, 23, 42, 0.06)',
                backgroundColor: 'rgba(255,255,255,0.98)',
                color: '#475569',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                boxSizing: 'border-box',
                boxShadow:
                  '0 4px 24px rgba(15,23,42,0.08), 0 1px 0 rgba(255,255,255,0.95) inset, 0 0 0 1px rgba(255,255,255,0.4) inset',
                fontFamily: 'inherit',
                transition: 'box-shadow 0.2s ease, transform 0.15s ease',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                Pergunta ao Zaptro ou pede uma ação — resumo, CRM, histórico…
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: 'rgba(148, 163, 184, 0.16)',
                  }}
                  aria-hidden
                >
                  <Mic size={20} color="#64748b" strokeWidth={1.9} />
                </span>
                <span
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 999,
                    background: `linear-gradient(145deg, ${LIME} 0%, #bef264 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0a0a0a',
                    boxShadow: '0 6px 20px rgba(217,255,0,0.35)',
                  }}
                  aria-hidden
                >
                  <ArrowUp size={22} strokeWidth={2.4} />
                </span>
              </span>
            </button>
          </div>
        </section>
        )}

        {dashShow('assistant') && digestPanelOpen && (
        <div
          id="zaptro-dash-assistant-panel"
          role="region"
          aria-label="Assistente operacional"
          style={{
            width: '100%',
            marginTop: 16,
            position: 'relative',
            boxSizing: 'border-box',
            overflow: 'visible',
            ...(dashLayoutEdit ? { outline: dashEditOutline, outlineOffset: 4, borderRadius: 24, paddingTop: 8 } : {}),
          }}
        >
          {dashLayoutEdit && (
            <button
              type="button"
              onClick={() => hideDashWidget('assistant')}
              style={{
                position: 'absolute',
                top: 4,
                right: 8,
                zIndex: 30,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 12,
                border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : ZAPTRO_SECTION_BORDER}`,
                background: palette.mode === 'dark' ? 'rgba(17,17,17,0.9)' : 'rgba(255,255,255,0.95)',
                color: palette.text,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <EyeOff size={15} strokeWidth={2} />
              Remover widget
            </button>
          )}
          <div
            ref={assistantPillRef}
            style={{
              position: 'relative',
              overflow: 'visible',
              borderRadius: 30,
              padding: 'clamp(22px, 4vw, 32px) clamp(22px, 4.5vw, 36px) clamp(20px, 3.5vw, 28px)',
              border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.1)'}`,
              backgroundColor: palette.mode === 'dark' ? 'rgba(20,20,20,0.78)' : 'rgba(255,255,255,0.86)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <Sparkles size={18} color={LIME} />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 950,
                    color: assistantUi.text,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Assistente operacional
                </span>
              </div>
              <button
                type="button"
                aria-expanded
                aria-label="Minimizar assistente"
                title="Minimizar"
                onClick={() => setDigestPanelOpen(false)}
                style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: `1px solid ${assistantUi.chipBorder}`,
                  backgroundColor: assistantUi.chipBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronUp size={20} color={assistantUi.muted} />
              </button>
            </div>
            {digestAuxOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: 8,
                  right: 8,
                  padding: 12,
                  borderRadius: 20,
                  backgroundColor: assistantUi.popoverBg,
                  border: `1px solid ${assistantUi.popoverBorder}`,
                  boxShadow: palette.mode === 'dark' ? '0 16px 40px rgba(0,0,0,0.55)' : '0 16px 36px rgba(15,23,42,0.12)',
                  zIndex: 200,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  justifyContent: 'center',
                }}
              >
                {assistantQuickChips.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      appendDigestExchange(label);
                      setDigestAuxOpen(false);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: `1px solid ${assistantUi.chipBorder}`,
                      backgroundColor: assistantUi.chipBg,
                      color: assistantUi.text,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={submitDigest}
              style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
            >
              <textarea
                value={digestInput}
                onChange={(e) => setDigestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const t = digestInput.trim();
                    if (!t) return;
                    appendDigestExchange(t);
                    setDigestInput('');
                  }
                }}
                rows={1}
                placeholder="Pergunta à operação — resumo, CRM, motoristas, histórico…"
                style={{
                  width: '100%',
                  minHeight: 56,
                  maxHeight: 200,
                  resize: 'none' as const,
                  border: 'none',
                  background: 'transparent',
                  color: assistantUi.text,
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  lineHeight: 1.45,
                  outline: 'none',
                  padding: '10px 8px 8px',
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginTop: 16,
                  paddingTop: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDigestAuxOpen((v) => !v);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 14px',
                      borderRadius: 999,
                      border: `1px solid ${assistantUi.chipBorder}`,
                      backgroundColor: assistantUi.chipBg,
                      color: assistantUi.text,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Atalhos
                    <ChevronDown size={16} color={assistantUi.muted} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    title="Voz em breve"
                    aria-label="Entrada de voz em breve"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      border: `1px solid ${assistantUi.chipBorder}`,
                      backgroundColor: assistantUi.chipBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'default',
                      opacity: 0.75,
                    }}
                  >
                    <Mic size={20} color={assistantUi.muted} strokeWidth={1.9} />
                  </button>
                  <button
                    type="submit"
                    aria-label="Enviar"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 999,
                      border: 'none',
                      backgroundColor: digestInput.trim() ? LIME : assistantUi.inactiveSend,
                      color: digestInput.trim() ? '#000000' : palette.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: digestInput.trim()
                        ? 'none'
                        : `inset 0 0 0 1px ${palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : ZAPTRO_SECTION_BORDER}`,
                    }}
                  >
                    <ArrowUp size={22} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </form>

            {digestMessages.length > 0 && (
              <div
                aria-live="polite"
                style={{
                  marginTop: 18,
                  paddingTop: 18,
                  borderTop: `1px solid ${assistantUi.divider}`,
                  maxHeight: 240,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  paddingLeft: 4,
                  paddingRight: 4,
                  paddingBottom: 8,
                }}
              >
                {digestMessages.map((m) => {
                  const hist = m.role === 'system' && m.suggestHistory;
                  return (
                    <div
                      key={m.id}
                      role={hist ? 'button' : undefined}
                      tabIndex={hist ? 0 : undefined}
                      onClick={hist ? openHistoryFromAssistant : undefined}
                      onKeyDown={
                        hist
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openHistoryFromAssistant();
                              }
                            }
                          : undefined
                      }
                      style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: 'min(100%, 720px)',
                        padding: '10px 12px',
                        borderRadius: 16,
                        backgroundColor: m.role === 'user' ? LIME : assistantUi.bubbleSystem,
                        color: m.role === 'user' ? '#000000' : assistantUi.text,
                        border: m.role === 'user' ? 'none' : `1px solid ${assistantUi.bubbleSystemBorder}`,
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.45,
                        boxSizing: 'border-box',
                        cursor: hist ? 'pointer' : 'default',
                        outline: 'none',
                      }}
                      title={hist ? 'Abrir Histórico (responsáveis e detalhe)' : undefined}
                    >
                      {m.role === 'user' && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            marginBottom: 6,
                            color: 'rgba(0,0,0,0.55)',
                          }}
                        >
                          {`TU${profile?.full_name ? ` · ${profile.full_name}` : ''}`}
                        </div>
                      )}
                      {m.text}
                      {hist && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: LIME, marginTop: 6, opacity: 0.95 }}>
                          Histórico →
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 10,
                          opacity: m.role === 'user' ? 0.55 : 0.5,
                          marginTop: 8,
                          fontWeight: 700,
                          borderTop:
                            m.role === 'user' ? '1px solid rgba(0,0,0,0.12)' : `1px solid ${assistantUi.divider}`,
                          paddingTop: 6,
                          color: m.role === 'user' ? '#000000' : assistantUi.muted,
                        }}
                      >
                        {m.at}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        )}

        <div style={styles.dashTwoColumn}>
          <div style={styles.dashLeftColumn}>
        {dashShow('kpis') && (
        <div
          style={{
            position: 'relative',
            marginBottom: 0,
            ...(dashLayoutEdit ? { outline: dashEditOutline, outlineOffset: 4, borderRadius: 20, paddingTop: 10 } : {}),
          }}
        >
          {dashLayoutEdit && (
            <button
              type="button"
              onClick={() => hideDashWidget('kpis')}
              style={{
                position: 'absolute',
                top: 4,
                right: 8,
                zIndex: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 12,
                border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : ZAPTRO_SECTION_BORDER}`,
                background: palette.mode === 'dark' ? 'rgba(17,17,17,0.92)' : '#fff',
                color: palette.text,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <EyeOff size={15} strokeWidth={2} />
              Remover widget
            </button>
          )}
        <div
          style={{
            ...styles.statsGrid,
            width: '100%',
            marginTop: 8,
            marginBottom: 24,
            padding: 0,
            boxSizing: 'border-box',
          }}
        >
           {stats.map((s, i) => {
             const demo = 'isDemo' in s && s.isDemo;
             return (
             <div key={i} style={ds.statCard}>
                <div style={styles.statTop}>
                   <div style={ds.neonIconBox}>
                      <s.icon size={22} strokeWidth={2.5} color={ds.iconStroke} />
                   </div>
                   <div
                     role="button"
                     tabIndex={0}
                     style={{
                       ...styles.statBadge,
                       backgroundColor: ds.statBadgeBg,
                       color: ds.statBadgeColor,
                       border: ds.statBadgeBorder,
                     }}
                     onClick={(e) => {
                       e.stopPropagation();
                       setPendingStatImage(statImages[i] ?? null);
                       setUploadModal({ kind: 'stat', index: i });
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' || e.key === ' ') {
                         e.preventDefault();
                         setPendingStatImage(statImages[i] ?? null);
                         setUploadModal({ kind: 'stat', index: i });
                       }
                     }}
                   >
                      {statImages[i] ? (
                        <img src={statImages[i]} alt="" style={styles.statBadgeImg} />
                      ) : s.positive ? (
                        <ArrowUpRight size={14} color={ds.statBadgeArrow} />
                      ) : (
                        <ArrowDownRight size={14} color={ds.statBadgeArrow} />
                      )}
                      <span>{s.change}</span>
                   </div>
                </div>
                <div style={styles.statContent}>
                   <h3 style={ds.statValue}>{s.value}</h3>
                   <p style={{ ...ds.statLabel, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                     {s.label}
                     {demo && (
                       <span
                         style={{
                           fontSize: 9,
                           fontWeight: 950,
                           letterSpacing: '0.08em',
                           textTransform: 'uppercase',
                           padding: '3px 8px',
                           borderRadius: 8,
                           backgroundColor: palette.mode === 'dark' ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.25)',
                           color: palette.mode === 'dark' ? '#fcd34d' : '#92400e',
                         }}
                       >
                         Exemplo
                       </span>
                     )}
                   </p>
                </div>
             </div>
           );
           })}
        </div>
        </div>
        )}

        {(dashShow('chart') || dashShow('feed')) && (
        <div style={styles.mainGrid}>
           {dashShow('chart') && (
           <div
             style={{
               position: 'relative',
               flex: dashShow('feed') ? 2 : '1 1 100%',
               minWidth: 300,
               ...(dashLayoutEdit ? { outline: dashEditOutline, outlineOffset: 4, borderRadius: 24, paddingTop: 10 } : {}),
             }}
           >
             {dashLayoutEdit && (
               <button
                 type="button"
                 onClick={() => hideDashWidget('chart')}
                 style={{
                   position: 'absolute',
                   top: 6,
                   right: 10,
                   zIndex: 10,
                   display: 'inline-flex',
                   alignItems: 'center',
                   gap: 6,
                   padding: '8px 12px',
                   borderRadius: 12,
                   border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : ZAPTRO_SECTION_BORDER}`,
                   background: palette.mode === 'dark' ? 'rgba(17,17,17,0.92)' : '#fff',
                   color: palette.text,
                   fontSize: 12,
                   fontWeight: 800,
                   cursor: 'pointer',
                   fontFamily: 'inherit',
                 }}
               >
                 <EyeOff size={15} strokeWidth={2} />
                 Remover widget
               </button>
             )}
           <div style={{...ds.gridCard, flex: 1, minWidth: 0, width: '100%'}}>
              <div
                style={{
                  ...styles.cardHeader,
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                 <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                   <h3 style={{ ...ds.cardTitle, marginBottom: 6 }}>Volume de mensagens</h3>
                   <p
                     style={{
                       margin: 0,
                       fontSize: 11,
                       fontWeight: 700,
                       lineHeight: 1.45,
                       color: palette.textMuted,
                       maxWidth: 420,
                     }}
                   >
                     Visão simples por semana (dias úteis agregados) ou por mês (últimos 12 meses).
                   </p>
                 </div>
                 <div style={{ ...ds.tabGroup, flexShrink: 0 }}>
                    <button
                      type="button"
                      style={{
                        ...ds.tabInactive,
                        ...(deliveryPeriod === 'week' ? ds.tabActive : {}),
                      }}
                      onClick={() => setDeliveryPeriod('week')}
                    >
                      Semana
                    </button>
                    <button
                      type="button"
                      style={{
                        ...ds.tabInactive,
                        ...(deliveryPeriod === 'month' ? ds.tabActive : {}),
                      }}
                      onClick={() => setDeliveryPeriod('month')}
                    >
                      Mês
                    </button>
                 </div>
              </div>
              <div ref={chartSentinelRef} style={styles.chartWrap}>
                {chartInView ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={LIME} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={LIME} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 8" stroke={chartStrokeGrid} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: chartTick, fontSize: 11, fontWeight: 800 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fill: chartTick, fontSize: 11, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ stroke: chartStrokeGrid, strokeWidth: 1 }}
                      contentStyle={{
                        borderRadius: 14,
                        border: `1px solid ${chartStrokeGrid}`,
                        backgroundColor: palette.mode === 'dark' ? '#000000' : '#ffffff',
                        boxShadow: ZAPTRO_SHADOW.md,
                        fontWeight: 800,
                        fontSize: 13,
                        color: palette.text,
                      }}
                      formatter={(value: number) => [`${value}`, 'Mensagens']}
                      labelStyle={{ color: palette.textMuted, fontWeight: 800, fontSize: 11 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mensagens"
                      name="Mensagens"
                      stroke={LIME}
                      strokeWidth={2.8}
                      fill={`url(#${gradId})`}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: LIME, fill: chartDotFill }}
                      dot={{ r: 3, strokeWidth: 2, stroke: LIME, fill: chartDotFill }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      minHeight: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 20,
                      backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : ZAPTRO_FIELD_BG,
                      color: palette.textMuted,
                      fontSize: 14,
                      fontWeight: 700,
                      border: `1px dashed ${palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : ZAPTRO_SECTION_BORDER}`,
                    }}
                  >
                    A carregar gráfico…
                  </div>
                )}
              </div>
           </div>
           </div>
           )}

           {dashShow('feed') && (
           <div
             style={{
               position: 'relative',
               flex: dashShow('chart') ? 1.2 : '1 1 100%',
               minWidth: 300,
               ...(dashLayoutEdit ? { outline: dashEditOutline, outlineOffset: 4, borderRadius: 24, paddingTop: 10 } : {}),
             }}
           >
             {dashLayoutEdit && (
               <button
                 type="button"
                 onClick={() => hideDashWidget('feed')}
                 style={{
                   position: 'absolute',
                   top: 6,
                   right: 10,
                   zIndex: 10,
                   display: 'inline-flex',
                   alignItems: 'center',
                   gap: 6,
                   padding: '8px 12px',
                   borderRadius: 12,
                   border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : ZAPTRO_SECTION_BORDER}`,
                   background: palette.mode === 'dark' ? 'rgba(17,17,17,0.92)' : '#fff',
                   color: palette.text,
                   fontSize: 12,
                   fontWeight: 800,
                   cursor: 'pointer',
                   fontFamily: 'inherit',
                 }}
               >
                 <EyeOff size={15} strokeWidth={2} />
                 Remover widget
               </button>
             )}
           <div style={{...ds.gridCard, flex: 1, minWidth: 0, width: '100%'}}>
              <div
                style={{
                  ...styles.cardHeader,
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <h3 style={{ ...ds.cardTitle, margin: 0 }}>Fila de atendimento</h3>
                  <Activity size={18} color="#CCFF00" aria-hidden />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.45,
                    color: palette.textMuted,
                  }}
                >
                  Quem falou por último e quando — toca num cartão para ver detalhe.
                </p>
              </div>
              <div style={styles.feedList}>
                 {recentActivities.length === 0 ? (
                   <div
                     style={{
                       padding: '20px 14px',
                       textAlign: 'center',
                       fontSize: 13,
                       fontWeight: 700,
                       color: palette.textMuted,
                       lineHeight: 1.5,
                     }}
                   >
                     Sem conversas recentes na base. Abre «Nova conversa» ou o WhatsApp para começar.
                   </div>
                 ) : null}
                 {recentActivities.map((item) => (
                   <div 
                     key={item.id} 
                     style={ds.feedItem} 
                     onClick={() => setSelectedLog(item)}
                   >
                      <div style={styles.feedBase}>
                         <div style={{...styles.typeBadge, color: ds.typeBadgeColor, backgroundColor: ds.typeBadgeBg, borderLeft: `2px solid ${item.color}`}}>
                            {item.icon} {item.type}
                         </div>
                         <div style={styles.feedRow}>
                            <div style={ds.userAvatar}>{item.user[0]}</div>
                            <div style={styles.feedInfo}>
                               <p style={ds.feedText}><strong>{item.user}</strong> {item.action}</p>
                               <span style={styles.feedTime}><Clock size={12} /> {item.time}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
              <button
                type="button"
                style={ds.viewMoreBtn}
                onClick={() => navigate(ZAPTRO_ROUTES.HISTORY)}
              >
                Histórico completo
              </button>
           </div>
           </div>
           )}
        </div>
        )}

        {connectionStatus === 'failed' ? (
          <div
            role="alert"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '14px 18px',
              borderRadius: 16,
              border: `1px solid ${palette.mode === 'dark' ? 'rgba(248,113,113,0.35)' : 'rgba(220,38,38,0.35)'}`,
              backgroundColor: palette.mode === 'dark' ? 'rgba(127,29,29,0.25)' : '#FEF2F2',
              color: palette.mode === 'dark' ? '#fecaca' : '#991b1b',
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
            <span>
              <strong>WhatsApp desconectado ou com erro.</strong> Vai a Configurações → ligação para voltar a receber mensagens.
            </span>
          </div>
        ) : null}

        {dashShow('automation') && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            ...(dashLayoutEdit ? { outline: dashEditOutline, outlineOffset: 4, borderRadius: 22, paddingTop: 10 } : {}),
          }}
        >
          {dashLayoutEdit && (
            <button
              type="button"
              onClick={() => hideDashWidget('automation')}
              style={{
                position: 'absolute',
                top: 6,
                right: 10,
                zIndex: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 12,
                border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : ZAPTRO_SECTION_BORDER}`,
                background: palette.mode === 'dark' ? 'rgba(17,17,17,0.92)' : '#fff',
                color: palette.text,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <EyeOff size={15} strokeWidth={2} />
              Remover widget
            </button>
          )}
        <div
          style={{
            ...ds.gridCard,
            width: '100%',
            boxSizing: 'border-box',
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <h3 style={{ ...ds.cardTitle, marginBottom: 8 }}>Automação (resumo)</h3>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: palette.text, lineHeight: 1.45 }}>
                Agentes de atendimento na equipa: <strong>{onlineAgents}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: palette.textMuted, lineHeight: 1.45 }}>
                Mensagens automáticas hoje: <strong style={{ color: palette.text }}>—</strong> (métrica em evolução)
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=automation`)}
              style={{
                ...ds.secBtn,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 14,
                fontWeight: 950,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              <Bot size={17} strokeWidth={2.2} /> Abrir automações
            </button>
          </div>
        </div>
        </div>
        )}
          </div>

          {dashShow('promo') && (
          <div
            style={{
              position: 'relative',
              flex: '1 1 280px',
              maxWidth: 440,
              minWidth: 260,
              boxSizing: 'border-box',
              ...(dashLayoutEdit ? { outline: dashEditOutline, outlineOffset: 4, borderRadius: 24, paddingTop: 10 } : {}),
            }}
          >
            {dashLayoutEdit && (
              <button
                type="button"
                onClick={() => hideDashWidget('promo')}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 10,
                  zIndex: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 12,
                  border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : ZAPTRO_SECTION_BORDER}`,
                  background: palette.mode === 'dark' ? 'rgba(17,17,17,0.92)' : '#fff',
                  color: palette.text,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <EyeOff size={15} strokeWidth={2} />
                Remover widget
              </button>
            )}
          <aside
            style={{
              ...styles.dashSidePromo,
              ...ds.gridCard,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 18,
              padding: 'clamp(22px, 3vw, 28px)',
              background:
                palette.mode === 'dark'
                  ? 'linear-gradient(165deg, rgba(217,255,0,0.08) 0%, rgba(15,23,42,0.9) 45%, #111111 100%)'
                  : 'linear-gradient(165deg, rgba(217,255,0,0.22) 0%, #ffffff 38%, #fafafa 100%)',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 950,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '5px 10px',
                  borderRadius: 999,
                  backgroundColor: LIME,
                  color: '#0a0a0a',
                  marginBottom: 12,
                }}
              >
                Zaptro Pro
              </span>
              <h2
                style={{
                  margin: '0 0 10px',
                  fontSize: 'clamp(18px, 2vw, 22px)',
                  fontWeight: 950,
                  letterSpacing: '-0.03em',
                  color: palette.text,
                  lineHeight: 1.25,
                }}
              >
                Operação e WhatsApp num só hub
              </h2>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: palette.textMuted, lineHeight: 1.55 }}>
                Inbox, CRM e automações ligados ao teu fluxo logístico — mesmo estilo de painel que conheces, com atalhos à
                mão.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.9 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: palette.mode === 'dark' ? 'rgba(217,255,0,0.12)' : 'rgba(217,255,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden
              >
                <Zap size={26} color={palette.lime} fill={palette.mode === 'dark' ? '#111' : '#18181b'} />
              </div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: palette.text, lineHeight: 1.45 }}>
                Mensagens, equipa e rotas alinhadas ao mesmo tempo real.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(ZAPTRO_ROUTES.CHAT)}
              style={{
                ...ds.priBtn,
                width: '100%',
                justifyContent: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 18px',
                borderRadius: 14,
                fontWeight: 950,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                backgroundColor: palette.mode === 'dark' ? palette.lime : '#0f172a',
                color: palette.mode === 'dark' ? '#0a0a0a' : '#f8fafc',
              }}
            >
              <MessageSquare size={18} strokeWidth={2.2} />
              Abrir WhatsApp
            </button>
          </aside>
          </div>
          )}
        </div>

        {dashShow('resources') && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            ...(dashLayoutEdit ? { outline: dashEditOutline, outlineOffset: 4, borderRadius: 20, paddingTop: 10 } : {}),
          }}
        >
          {dashLayoutEdit && (
            <button
              type="button"
              onClick={() => hideDashWidget('resources')}
              style={{
                position: 'absolute',
                top: 4,
                right: 8,
                zIndex: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 12,
                border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : ZAPTRO_SECTION_BORDER}`,
                background: palette.mode === 'dark' ? 'rgba(17,17,17,0.92)' : '#fff',
                color: palette.text,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <EyeOff size={15} strokeWidth={2} />
              Remover widget
            </button>
          )}
        <div style={styles.dashFooterGrid} role="navigation" aria-label="Recursos e atalhos">
          {dashFooterLinks.map(({ label, sub, Icon, to }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(to)}
              style={{
                ...styles.dashFooterCard,
                border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : ZAPTRO_SECTION_BORDER}`,
                backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff',
                color: palette.text,
              }}
            >
              <Icon size={20} strokeWidth={2} color={palette.lime} style={{ flexShrink: 0 }} />
              <span style={{ textAlign: 'left', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 950, letterSpacing: '-0.02em' }}>{label}</span>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: palette.textMuted, marginTop: 4 }}>
                  {sub}
                </span>
              </span>
              <ArrowUpRight size={18} color={palette.textMuted} style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
        </div>
        )}
      </div>

      {/* WELCOME POPUP */}
      {showWelcome && (
        <div style={styles.modalOverlay}>
           <div style={styles.welcomeCard}>
              <div style={styles.welcomeZapBox}>
                 <ZapRay size={80} color="#D9FF00" />
              </div>
              <h2 style={styles.welcomeTitle}>Bem-vindo à Zaptro Connect</h2>
              <div style={styles.welcomeStatusBox}>
                 {connectionStatus === 'success' ? (
                    <div style={styles.statusLine}>
                       <CheckCircle size={20} color="#10B981" />
                       <p style={styles.statusText}>Sua conexão está <strong>bem-sucedida.</strong></p>
                    </div>
                 ) : (
                    <div style={styles.statusLine}>
                       <AlertTriangle size={20} color="#EF4444" />
                       <p style={styles.statusText}>A conexão falhou. Por favor, reinicie.</p>
                    </div>
                 )}
              </div>
              <p style={styles.welcomeDesc}>
                 Sua estrutura logística inteligente foi criada com sucesso. A partir de agora, toda a sua malha operacional está integrada ao Hub Master do Zaptro.
              </p>
              
              <div style={styles.welcomeActions}>
                 <button style={styles.modalActionBtn} onClick={() => setShowWelcome(false)}>
                    ACESSAR DASHBOARD
                 </button>
                 {connectionStatus === 'failed' && (
                    <button style={styles.modalSecBtn} onClick={() => navigate(`${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=config`)}>
                       CONECTAR WHATSAPP <ExternalLink size={14} />
                    </button>
                 )}
              </div>
           </div>
        </div>
      )}

      {uploadModal !== null && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            setUploadModal(null);
            setPendingStatImage(null);
          }}
        >
          <div style={styles.statUploadModal} onClick={(e) => e.stopPropagation()}>
            <header style={styles.statUploadHeader}>
              <h2 style={styles.statUploadTitle}>
                {uploadModal.kind === 'hero' ? 'Foto ao lado do Olá' : 'Imagem do indicador'}
              </h2>
              <button
                type="button"
                style={styles.closeBtn}
                aria-label="Fechar"
                onClick={() => {
                  setUploadModal(null);
                  setPendingStatImage(null);
                }}
              >
                <X size={20} />
              </button>
            </header>
            <p style={styles.statUploadHint}>
              {uploadModal.kind === 'hero' ? (
                <>
                  A imagem salva aparece <strong>ao lado da saudação</strong> no topo do painel (não confunde com o modo
                  claro/escuro do canto superior).
                </>
              ) : (
                <>
                  Métrica: <strong>{stats[uploadModal.index]?.label}</strong>. Envie uma imagem para exibir no selo ao
                  lado da variação.
                </>
              )}
            </p>
            <label style={styles.statUploadFileLabel}>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setPendingStatImage(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              Escolher arquivo
            </label>
            {pendingStatImage && (
              <div style={styles.statUploadPreviewWrap}>
                <img src={pendingStatImage} alt="Pré-visualização" style={styles.statUploadPreview} />
              </div>
            )}
            <div style={styles.statUploadActions}>
              <button
                type="button"
                style={styles.modalSecBtn}
                onClick={() => {
                  if (uploadModal.kind === 'stat') {
                    setStatImages((prev) => {
                      const next = { ...prev };
                      delete next[uploadModal.index];
                      return next;
                    });
                  } else {
                    setHeaderHeroImage(null);
                  }
                  setUploadModal(null);
                  setPendingStatImage(null);
                }}
              >
                {uploadModal.kind === 'hero' ? 'Remover foto do topo' : 'Remover imagem'}
              </button>
              <button
                type="button"
                style={styles.modalActionBtn}
                disabled={!pendingStatImage}
                onClick={() => {
                  if (!pendingStatImage) return;
                  if (uploadModal.kind === 'hero') {
                    setHeaderHeroImage(pendingStatImage);
                  } else {
                    setStatImages((prev) => ({ ...prev, [uploadModal.index]: pendingStatImage }));
                  }
                  setUploadModal(null);
                  setPendingStatImage(null);
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {selectedLog && (
        <div style={styles.modalOverlay} onClick={() => setSelectedLog(null)}>
           <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <header style={styles.modalHeader}>
                 <div style={{...styles.modalTypeBadge, color: selectedLog.color, backgroundColor: `${selectedLog.color}15`}}>
                    {selectedLog.icon} DETALHES DO EVENTO
                 </div>
                 <button style={styles.closeBtn} onClick={() => setSelectedLog(null)}><X size={20} /></button>
              </header>

              <div style={styles.modalBody}>
                 <div style={styles.modalMainInfo}>
                    <div style={{...styles.modalAvatarLarge, backgroundColor: selectedLog.color}}>
                       {selectedLog.user[0]}
                    </div>
                    <div>
                       <h2 style={styles.modalTitle}>{selectedLog.action}</h2>
                       <p style={styles.modalUserSub}><User size={14} /> Atribuído a: <strong>{selectedLog.user}</strong></p>
                    </div>
                 </div>

                 <div style={styles.modalGrid}>
                    <div style={styles.modalInfoCard}>
                       <span style={styles.modalLabel}><Calendar size={14} /> DATA E HORA</span>
                       <p style={styles.modalVal}>{selectedLog.time}</p>
                    </div>
                    <div style={styles.modalInfoCard}>
                       <span style={styles.modalLabel}><ShieldCheck size={14} /> STATUS ATUAL</span>
                       <p style={{...styles.modalVal, color: '#10B981'}}>Processado</p>
                    </div>
                 </div>

                 <div style={styles.modalDescription}>
                    <span style={styles.modalLabel}><Info size={14} /> DESCRIÇÃO COMPLETA</span>
                    <p style={styles.modalDescText}>{selectedLog.details}</p>
                 </div>

                 <div style={styles.modalFooter}>
                    <button type="button" style={styles.modalActionBtn} onClick={() => setSelectedLog(null)}>Entendido</button>
                    <button
                      type="button"
                      style={styles.modalSecBtn}
                      onClick={() => {
                        navigate(zaptroOccurrencePath(selectedLog.id));
                        setSelectedLog(null);
                      }}
                    >
                      Ver Ocorrência
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

/**
 * Se o preview moderno rebentar (Recharts 3, Leaflet, etc.), mostra o painel clássico — evita tela branca.
 */
class ZaptroDashboardPreviewErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ZaptroDashboard] Preview moderno falhou; a usar painel clássico.', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ZaptroDashboardContent />;
    }
    return this.props.children;
  }
}

const ZaptroDashboard: React.FC = () => (
  <ZaptroLayout>
    {ZAPTRO_DASHBOARD_MODERN_PREVIEW ? (
      <ZaptroDashboardPreviewErrorBoundary>
        <ZaptroDashboardModernPreview />
      </ZaptroDashboardPreviewErrorBoundary>
    ) : (
      <ZaptroDashboardContent />
    )}
  </ZaptroLayout>
);

const styles: Record<string, any> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    padding: 0,
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: '100%',
  },
  /** Modelo tipo painel hosting: coluna principal + cartão lateral. */
  dashTwoColumn: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 24,
    width: '100%',
    alignItems: 'stretch',
    boxSizing: 'border-box',
  },
  dashLeftColumn: {
    flex: '2 1 560px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  dashSidePromo: {
    flex: '1 1 280px',
    maxWidth: 440,
    minWidth: 260,
    boxSizing: 'border-box',
  },
  dashFooterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
    gap: 16,
    width: '100%',
    boxSizing: 'border-box',
  },
  dashFooterCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 18px',
    borderRadius: 18,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
    boxShadow: ZAPTRO_SHADOW.sm,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  pageHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '24px',
    gap: '20px',
    width: '100%',
    boxSizing: 'border-box',
  },
  /** Saudação: não esticar por toda a linha quando as ações descem para a linha de baixo. */
  headerLead: { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', minWidth: 0, flex: '0 1 auto', alignSelf: 'flex-start', maxWidth: '100%' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 },
  dashboardCredits: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '2px',
    padding: '16px 40px 18px',
    borderRadius: '18px',
    flexShrink: 0,
    minWidth: '140px',
    marginRight: '16px',
    boxSizing: 'border-box',
  },
  dashboardCreditsLabel: {
    fontSize: '9px',
    fontWeight: 950,
    letterSpacing: '0.14em',
    color: '#a3a3a3',
  },
  dashboardCreditsRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  dashboardCreditsValue: {
    fontSize: '32px',
    fontWeight: 950,
    color: '#FFFFFF',
    letterSpacing: '-1.5px',
    lineHeight: 1,
  },
  dashboardCreditsEye: {
    padding: '6px',
    border: 'none',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.08)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCreditsZap: {
    position: 'absolute',
    top: '12px',
    right: '18px',
    opacity: 0.35,
  },
  heroPhotoBtn: {
    position: 'relative',
    width: '72px',
    height: '72px',
    borderRadius: '22px',
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    padding: 0,
    cursor: 'pointer',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPhotoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  heroPhotoPh: { fontSize: '28px', fontWeight: 950 },
  heroPhotoCam: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    width: '24px',
    height: '24px',
    borderRadius: '8px',
    backgroundColor: 'rgba(15,23,42,0.85)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: '40px', fontWeight: '950', color: '#000000', margin: 0, letterSpacing: '-2px' },
  subtitle: { fontSize: '16px', color: '#64748B', margin: 0, fontWeight: '500' },
  /** Ocupa a linha inteira abaixo da saudação → botões alinhados à direita do painel. */
  headerActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginLeft: 'auto',
    flex: '0 0 auto',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  /** Mesmo estilo “premium” do item de menu lateral (só admins no painel). */
  adminSidebarStyleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 28px',
    borderRadius: '18px',
    border: '1px solid #d4d4d8',
    fontSize: '14px',
    fontWeight: 950,
    cursor: 'pointer',
    transition: '0.2s',
    fontFamily: 'inherit',
  },
  priBtn: { padding: '14px 28px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', transition: '0.2s' },
  secBtn: { padding: '14px 28px', backgroundColor: 'white', border: `1px solid ${ZAPTRO_SECTION_BORDER}`, borderRadius: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' },
  statCard: { 
    backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '40px', border: `1px solid ${ZAPTRO_SECTION_BORDER}`, 
    boxShadow: ZAPTRO_SHADOW.sm, cursor: 'pointer', transition: '0.2s'
  },
  statTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  neonIconBox: { 
    width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', 
    justifyContent: 'center', backgroundColor: '#D9FF0015'
  },
  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 12px',
    minHeight: '28px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '900',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  statBadgeImg: { width: 'auto', height: '20px', maxWidth: '44px', objectFit: 'cover', borderRadius: '6px' },
  statUploadModal: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'white',
    borderRadius: '28px',
    padding: '28px 32px 32px',
    boxShadow: ZAPTRO_SHADOW.overlay,
  },
  statUploadHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  statUploadTitle: { margin: 0, fontSize: '20px', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.5px' },
  statUploadHint: { margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.5 },
  statUploadFileLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 20px',
    borderRadius: '14px',
    border: '1px solid #e4e4e7',
    fontWeight: 900,
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '16px',
    width: 'fit-content',
  },
  statUploadPreviewWrap: { marginBottom: '20px', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${ZAPTRO_SECTION_BORDER}` },
  statUploadPreview: { display: 'block', width: '100%', maxHeight: '200px', objectFit: 'contain', background: ZAPTRO_FIELD_BG },
  statUploadActions: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' },
  statContent: { display: 'flex', flexDirection: 'column', gap: '4px' },
  statValue: { fontSize: '42px', fontWeight: '950', color: '#0F172A', margin: 0, letterSpacing: '-1.5px' },
  statLabel: { fontSize: '14px', color: ZAPTRO_TITLE_COLOR, fontWeight: '700' },

  mainGrid: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  gridCard: { backgroundColor: 'white', padding: '32px', borderRadius: '40px', border: `1px solid ${ZAPTRO_SECTION_BORDER}`, boxShadow: ZAPTRO_SHADOW.md, minWidth: '320px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  cardTitle: { fontSize: '22px', fontWeight: '950', color: ZAPTRO_TITLE_COLOR, margin: 0, letterSpacing: '-0.8px' },
  tabGroup: { display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '14px' },
  tab: { padding: '8px 20px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '900', cursor: 'pointer', backgroundColor: 'transparent', color: ZAPTRO_TITLE_COLOR },

  chartWrap: { width: '100%', minHeight: 300, marginTop: 4 },

  feedList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  feedItem: {
    padding: '14px 20px',
    borderRadius: '24px',
    backgroundColor: ZT_UI.surface,
    cursor: 'pointer',
    transition: '0.2s',
    border: `1px solid ${ZT_UI.surfaceBorder}`,
  },
  feedBase: { display: 'flex', flexDirection: 'column', gap: '12px' },
  typeBadge: { alignSelf: 'flex-start', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' },
  feedRow: { display: 'flex', gap: '14px', alignItems: 'center' },
  userAvatar: { width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0F172A', border: `1px solid ${ZAPTRO_SECTION_BORDER}` },
  feedInfo: { flex: 1 },
  feedText: { fontSize: '13px', color: '#1E293B', margin: 0, lineHeight: '1.4' },
  feedTime: { fontSize: '11px', color: '#94A3B8', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' },
  viewMoreBtn: { width: '100%', padding: '16px', marginTop: '32px', backgroundColor: 'transparent', border: '1px solid #e4e4e7', borderRadius: '16px', color: '#64748B', fontWeight: '900', fontSize: '13px', cursor: 'pointer' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modalContent: { width: '600px', backgroundColor: 'white', borderRadius: '48px', boxShadow: ZAPTRO_SHADOW.xxl, overflow: 'hidden' },
  modalHeader: { padding: '40px 40px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTypeBadge: { padding: '8px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '1px' },
  closeBtn: { background: ZAPTRO_FIELD_BG, border: 'none', width: '40px', height: '40px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' },
  
  modalBody: { padding: '0 40px 40px' },
  modalMainInfo: { display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '40px', marginTop: '10px' },
  modalAvatarLarge: { width: '64px', height: '64px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '950', color: 'white' },
  modalTitle: { fontSize: '24px', fontWeight: '950', color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-1px' },
  modalUserSub: { fontSize: '14px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 },
  
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' },
  modalInfoCard: { padding: '20px', backgroundColor: ZAPTRO_FIELD_BG, borderRadius: '24px', border: `1px solid ${ZAPTRO_SECTION_BORDER}` },
  modalLabel: { fontSize: '10px', fontWeight: '950', color: ZAPTRO_TITLE_COLOR, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', letterSpacing: '0.5px' },
  modalVal: { fontSize: '15px', fontWeight: '850', color: '#0F172A', margin: 0 },
  
  modalDescription: { padding: '24px', backgroundColor: ZAPTRO_FIELD_BG, borderRadius: '24px', border: `1px solid ${ZAPTRO_SECTION_BORDER}`, marginBottom: '40px' },
  modalDescText: { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: 0, fontWeight: '500' },
  
  modalFooter: { display: 'flex', gap: '16px' },
  modalActionBtn: { flex: 1, padding: '18px', borderRadius: '18px', border: 'none', backgroundColor: '#0F172A', color: 'white', fontWeight: '950', fontSize: '15px', cursor: 'pointer' },
  modalSecBtn: { padding: '18px 32px', borderRadius: '18px', border: '1px solid #e4e4e7', backgroundColor: 'transparent', color: '#0F172A', fontWeight: '950', fontSize: '14px', cursor: 'pointer' },

  welcomeCard: { width: '90%', maxWidth: '500px', backgroundColor: 'white', borderRadius: '48px', padding: '60px', textAlign: 'center', boxShadow: ZAPTRO_SHADOW.overlay, border: `1px solid ${ZAPTRO_SECTION_BORDER}` },
  welcomeZapBox: { marginBottom: '30px' },
  welcomeTitle: { fontSize: '32px', fontWeight: '950', color: '#000', margin: '0 0 20px 0', letterSpacing: '-1.5px' },
  welcomeStatusBox: { marginBottom: '30px', backgroundColor: ZAPTRO_FIELD_BG, padding: '20px', borderRadius: '24px', border: `1px solid ${ZAPTRO_SECTION_BORDER}` },
  statusLine: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' },
  statusText: { fontSize: '16px', color: '#000', margin: 0, fontWeight: '600' },
  welcomeDesc: { fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '40px', fontWeight: '500' },
  welcomeActions: { display: 'flex', flexDirection: 'column', gap: '12px' },
};

export default ZaptroDashboard;
