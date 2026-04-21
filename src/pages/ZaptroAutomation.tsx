import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Zap, MessageSquare, ArrowRight, Plus, Trash2,
  Users, Save, Play, Settings, Bot, Shield,
  Layout, Truck, BarChart, Bell, Info, ChevronRight,
  Code, MoreVertical, Edit2, Share2, X, ListOrdered,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import LogtaModal from '../components/Modal';

interface FlowOption {
  id: string;
  keyword: string;
  label: string;
  action: 'message' | 'routing' | 'external' | 'tracking_public';
  target: string;
  /** Texto quando o cliente ainda não tem carga casada pelo WhatsApp — pedir pedido, NF ou CNPJ/CPF. */
  response: string;
  /** Mensagem quando já existe link (use `{{link}}` ou `{{tracking_link}}`). */
  responseWhenFound?: string;
}

interface ZaptroAutomationProps {
  hideLayout?: boolean;
}

/** Colunas no editor (grelha); o número total de opções é livre — novas linhas de 3 em 3. */
const MENU_OPTION_GRID_COLUMNS = 3;

const DEFAULT_FLOW_OPTIONS: FlowOption[] = [
  {
    id: '1',
    keyword: '1',
    label: 'Rastrear entrega',
    action: 'tracking_public',
    target: '',
    response:
      'Não encontramos carga associada ao seu WhatsApp. Envie o número do pedido, da NF ou o CNPJ/CPF cadastrado (pode enviar só números).',
    responseWhenFound:
      '✅ Encontramos a sua carga.\n🔗 Acompanhe em tempo real (página pública do cliente):\n{{link}}',
  },
  {
    id: '2',
    keyword: '2',
    label: 'Falar com comercial',
    action: 'routing',
    target: 'comercial',
    response: 'Vamos direcionar o seu pedido ao time comercial. Um consultor continua por aqui em breve.',
  },
  {
    id: '3',
    keyword: '3',
    label: 'Solicitar coleta',
    action: 'routing',
    target: 'logistica',
    response: 'Registámos o pedido de coleta. A logística vai confirmar janela e endereço com você.',
  },
  {
    id: '4',
    keyword: '4',
    label: '2ª via / faturamento',
    action: 'routing',
    target: 'financeiro',
    response: 'A equipa financeira vai localizar boletos e faturas. Indique CNPJ e número do CT-e ou NF se tiver à mão.',
  },
  {
    id: '5',
    keyword: '5',
    label: 'Ocorrências / avarias (SAC)',
    action: 'routing',
    target: 'sac',
    response: 'O SAC foi alertado. Descreva o que ocorreu (carga, número do pedido) — tratamos com prioridade.',
  },
  {
    id: '6',
    keyword: '6',
    label: 'Cotação de frete',
    action: 'routing',
    target: 'comercial',
    response: 'Para cotar, envie origem, destino, peso/volume e tipo de mercadoria. O comercial responde com valores.',
  },
  {
    id: '7',
    keyword: '7',
    label: 'Horários e filiais',
    action: 'message',
    target: '',
    response:
      'O nosso expediente e moradas das filiais estão no site e na documentação da transportadora. Se precisar de um contacto específico, digite 2 (comercial).',
  },
];

const DEFAULT_WELCOME_MESSAGE =
  'Olá! Bem-vindo à central da transportadora. 🚛\n\nDigite o número da opção:\n1 — Rastrear entrega\n2 — Comercial\n3 — Coleta\n4 — Faturamento\n5 — SAC / ocorrências\n6 — Cotação\n7 — Horários / filiais\n\n(Pode personalizar todas as opções abaixo.)';

/** Comparação estável entre o que está no ecrã e o último estado enviado ao servidor. */
function flowFingerprint(welcome: string, opts: FlowOption[]): string {
  return JSON.stringify({
    wm: welcome,
    opts: opts.map((o) => ({
      id: o.id,
      keyword: o.keyword,
      label: o.label,
      action: o.action,
      target: o.target,
      response: o.response,
      responseWhenFound: o.responseWhenFound ?? '',
    })),
  });
}

const AUTOMATION_LOCAL_PREFIX = 'zaptro_automation_flow_local_v1_';

function automationLocalKey(companyId: string) {
  return `${AUTOMATION_LOCAL_PREFIX}${companyId}`;
}

function readAutomationLocal(companyId: string): {
  welcome_message: string;
  options: FlowOption[];
  flowId: string | null;
} | null {
  if (typeof localStorage === 'undefined' || !companyId) return null;
  try {
    const raw = localStorage.getItem(automationLocalKey(companyId));
    if (!raw) return null;
    const j = JSON.parse(raw) as {
      welcome_message?: string;
      options?: unknown;
      flowId?: string | null;
    };
    if (typeof j.welcome_message !== 'string' || !Array.isArray(j.options)) return null;
    return {
      welcome_message: j.welcome_message,
      options: normalizeFlowOptions(j.options),
      flowId: typeof j.flowId === 'string' ? j.flowId : null,
    };
  } catch {
    return null;
  }
}

const AUTOMATION_LANDING_LS = 'zaptro_automation_landing_dismissed_v1_';

function readLandingDismissed(companyId: string): boolean {
  if (typeof localStorage === 'undefined' || !companyId) return false;
  try {
    return localStorage.getItem(`${AUTOMATION_LANDING_LS}${companyId}`) === '1';
  } catch {
    return false;
  }
}

function writeLandingDismissed(companyId: string) {
  if (typeof localStorage === 'undefined' || !companyId) return;
  try {
    localStorage.setItem(`${AUTOMATION_LANDING_LS}${companyId}`, '1');
  } catch {
    /* quota / private mode */
  }
}

function writeAutomationLocal(
  companyId: string,
  welcome: string,
  opts: FlowOption[],
  fid: string | null,
) {
  if (typeof localStorage === 'undefined' || !companyId) return;
  try {
    localStorage.setItem(
      automationLocalKey(companyId),
      JSON.stringify({
        welcome_message: welcome,
        options: opts,
        flowId: fid,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

/** Quando o Supabase não tem coluna `welcome_message`, gravamos boas-vindas dentro de `options` (jsonb). */
const FLOW_OPTIONS_WRAPPER_VERSION = 1 as const;

type LegacyFlowOptionsEnvelope = {
  __zaptroFlow: typeof FLOW_OPTIONS_WRAPPER_VERSION;
  welcome_message: string;
  menu: unknown[];
};

function isLegacyFlowOptionsEnvelope(raw: unknown): raw is LegacyFlowOptionsEnvelope {
  return (
    !!raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    (raw as Record<string, unknown>).__zaptroFlow === FLOW_OPTIONS_WRAPPER_VERSION &&
    Array.isArray((raw as Record<string, unknown>).menu)
  );
}

function wrapFlowOptionsForLegacyDb(welcome: string, opts: FlowOption[]): LegacyFlowOptionsEnvelope {
  return { __zaptroFlow: FLOW_OPTIONS_WRAPPER_VERSION, welcome_message: welcome, menu: opts as unknown[] };
}

function parseFlowFromDbRow(row: { welcome_message?: unknown; options?: unknown }): {
  welcome: string;
  options: FlowOption[];
} {
  const colWelcome = typeof row.welcome_message === 'string' ? row.welcome_message : '';
  const rawOpts = row.options;
  if (isLegacyFlowOptionsEnvelope(rawOpts)) {
    return {
      welcome: colWelcome || (typeof rawOpts.welcome_message === 'string' ? rawOpts.welcome_message : ''),
      options: normalizeFlowOptions(rawOpts.menu),
    };
  }
  return {
    welcome: colWelcome,
    options: normalizeFlowOptions(rawOpts),
  };
}

function supabaseMissingColumnError(message: string, column: string): boolean {
  const esc = column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(esc, 'i').test(message) && (/schema cache/i.test(message) || /could not find/i.test(message));
}

function normalizeFlowOptions(raw: unknown): FlowOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_FLOW_OPTIONS;
  const mapped = raw.map((o: Record<string, unknown>, i: number) => {
    const actionRaw = o.action;
    const action =
      actionRaw === 'routing' || actionRaw === 'external' || actionRaw === 'message' || actionRaw === 'tracking_public'
        ? actionRaw
        : 'message';
    const kid = o.keyword != null && String(o.keyword) !== '' ? String(o.keyword) : String(i + 1);
    const oid = o.id != null && String(o.id) !== '' ? String(o.id) : `opt-${i}-${kid}`;
    const rwf =
      typeof o.responseWhenFound === 'string'
        ? o.responseWhenFound
        : typeof o.response_when_found === 'string'
          ? o.response_when_found
          : '';
    return {
      id: oid,
      keyword: kid,
      label: typeof o.label === 'string' && o.label ? o.label : 'Opção',
      action,
      target: typeof o.target === 'string' ? o.target : '',
      response: typeof o.response === 'string' ? o.response : '',
      ...(rwf ? { responseWhenFound: rwf } : {}),
    };
  });
  return mapped;
}

/** Ilustração leve (SVG) — estilo Brevo, paleta verde / creme. */
function AutomationLandingIllustration({ accent }: { accent: string }) {
  return (
    <svg
      width="100%"
      height="auto"
      viewBox="0 0 520 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ maxWidth: 560, display: 'block', margin: '0 auto' }}
    >
      <circle cx="120" cy="90" r="72" fill={accent} opacity="0.22" />
      <circle cx="400" cy="140" r="48" fill={accent} opacity="0.35" />
      <rect x="320" y="48" width="36" height="36" rx="8" fill={accent} opacity="0.5" />
      <path
        d="M48 200c24-18 52-28 84-28s60 10 84 28"
        stroke="#0f172a"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.2"
      />
      <ellipse cx="260" cy="218" rx="180" ry="14" fill="#0f172a" opacity="0.06" />
      <rect x="160" y="118" width="200" height="112" rx="14" fill="#fff" stroke="#0f172a" strokeWidth="2" opacity="0.85" />
      <rect x="176" y="134" width="168" height="72" rx="8" fill="#f8fafc" stroke="#e2e8f0" />
      <circle cx="268" cy="168" r="22" fill="#0f172a" opacity="0.9" />
      <path
        d="M258 160c4-8 14-12 22-8s12 14 8 22-14 12-22 8"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.95"
      />
      <rect x="196" y="96" width="64" height="18" rx="6" fill={accent} opacity="0.65" />
      <path
        d="M88 152c12-32 38-52 68-52s56 20 68 52"
        fill="#fff"
        stroke="#0f172a"
        strokeWidth="2"
      />
      <circle cx="156" cy="108" r="20" fill="#0f172a" />
      <path d="M148 118h16v48h-16z" fill="#0f172a" />
      <path d="M412 64h16v16h-16V64zm-8 8h32v16h-32v-16z" fill={accent} opacity="0.75" />
      <path
        d="M72 64l8 14 16 2-12 12 3 16-15-8-15 8 3-16-12-12 16-2z"
        fill={accent}
        opacity="0.45"
      />
    </svg>
  );
}

const ZaptroAutomation: React.FC<ZaptroAutomationProps> = ({ hideLayout = false }) => {
  const { profile } = useAuth();
  const { palette } = useZaptroTheme();
  const [loading, setLoading] = useState(true);
  const [flowId, setFlowId] = useState<string | null>(null);
  /** Incrementa ao concluir a landing (CTA); força releitura do LS e evita depender só do efeito. */
  const [landingNonce, setLandingNonce] = useState(0);

  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME_MESSAGE);

  const [options, setOptions] = useState<FlowOption[]>(DEFAULT_FLOW_OPTIONS);

  /** Último fluxo confirmado como guardado no Supabase (login) ou carregamento inicial de referência. */
  const [syncedFingerprint, setSyncedFingerprint] = useState<string | null>(null);

  /** Indicador curto quando o debounce está a gravar o rascunho em localStorage. */
  const [localDraftBusy, setLocalDraftBusy] = useState(false);

  const welcomeMessageRef = useRef(welcomeMessage);
  const flowIdRef = useRef<string | null>(null);
  welcomeMessageRef.current = welcomeMessage;
  flowIdRef.current = flowId;

  /** Após o primeiro carregamento (Supabase ou rascunho local), passamos a gravar alterações no browser. */
  const persistReadyRef = useRef(false);

  const departments = [
    { id: 'comercial', name: 'Time Comercial', color: '#10B981' },
    { id: 'logistica', name: 'Logística / Frota', color: '#52525b' },
    { id: 'financeiro', name: 'Financeiro', color: '#F59E0B' },
    { id: 'sac', name: 'SAC / Reclamações', color: '#EF4444' },
  ];

  const companyKey = profile?.company_id || 'local-demo';
  const landingDismissedStore = useMemo(
    () => readLandingDismissed(companyKey),
    [companyKey, landingNonce],
  );
  const editorUnlocked = !!flowId || landingDismissedStore || landingNonce > 0;
  const showLanding = !loading && !editorUnlocked;

  const openAutomationEditor = useCallback(() => {
    writeLandingDismissed(companyKey);
    setLandingNonce((n) => n + 1);
  }, [companyKey]);

  const fetchFlow = useCallback(async () => {
    setLoading(true);
    const cid = profile?.company_id || 'local-demo';

    if (!profile?.company_id) {
      const localOnly = readAutomationLocal(cid);
      if (localOnly) {
        const wm = localOnly.welcome_message;
        const opts = localOnly.options;
        setFlowId(localOnly.flowId);
        setWelcomeMessage(wm);
        setOptions(opts);
        setSyncedFingerprint(flowFingerprint(wm, opts));
      } else {
        setSyncedFingerprint(flowFingerprint(DEFAULT_WELCOME_MESSAGE, DEFAULT_FLOW_OPTIONS));
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabaseZaptro
        .from('whatsapp_automation_flows')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('name', 'Padrao')
        .maybeSingle();

      if (error) {
        notifyZaptro(
          'error',
          'Não foi possível carregar a automação',
          error.message || 'Faça login de novo ou abra Configurações e atualize a página.'
        );
      }
      if (data) {
        setFlowId(data.id);
        const { welcome: wm, options: opts } = parseFlowFromDbRow(data);
        setWelcomeMessage(wm);
        setOptions(opts);
        writeAutomationLocal(cid, wm, opts, data.id);
        setSyncedFingerprint(flowFingerprint(wm, opts));
      } else {
        const local = readAutomationLocal(cid);
        if (local) {
          const wm = local.welcome_message;
          const opts = local.options;
          setFlowId(local.flowId);
          setWelcomeMessage(wm);
          setOptions(opts);
          setSyncedFingerprint(flowFingerprint(wm, opts));
        } else {
          setSyncedFingerprint(flowFingerprint(DEFAULT_WELCOME_MESSAGE, DEFAULT_FLOW_OPTIONS));
        }
      }
    } catch (err) {
      console.error(err);
      const local = readAutomationLocal(cid);
      if (local) {
        const wm = local.welcome_message;
        const opts = local.options;
        setFlowId(local.flowId);
        setWelcomeMessage(wm);
        setOptions(opts);
        setSyncedFingerprint(flowFingerprint(wm, opts));
      } else {
        setSyncedFingerprint(flowFingerprint(DEFAULT_WELCOME_MESSAGE, DEFAULT_FLOW_OPTIONS));
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    void fetchFlow();
  }, [fetchFlow]);

  useEffect(() => {
    persistReadyRef.current = !loading;
  }, [loading]);

  /** Guarda rascunho no browser sempre que alteras boas-vindas ou opções (debounce). */
  useEffect(() => {
    if (!persistReadyRef.current || loading || !editorUnlocked) return;
    const cid = profile?.company_id || 'local-demo';
    setLocalDraftBusy(true);
    const t = window.setTimeout(() => {
      writeAutomationLocal(cid, welcomeMessage, options, flowIdRef.current);
      setLocalDraftBusy(false);
    }, 500);
    return () => {
      window.clearTimeout(t);
      setLocalDraftBusy(false);
    };
  }, [welcomeMessage, options, loading, profile?.company_id, editorUnlocked]);

  const addOption = () => {
    setOptions((prev) => {
      const nextNum =
        prev.reduce((m, o) => {
          const n = parseInt(String(o.keyword), 10);
          return Number.isFinite(n) ? Math.max(m, n) : m;
        }, 0) + 1;
      const id = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return [
        ...prev,
        {
          id,
          keyword: String(nextNum),
          label: 'Nova Opção',
          action: 'message' as const,
          target: '',
          response: 'Escreva aqui a resposta automática...',
          responseWhenFound: '',
        },
      ];
    });
  };

  const removeOption = (id: string) => {
    setOptions((prev) => {
      const next = prev.filter((o) => String(o.id) !== String(id));
      const cid = profile?.company_id || 'local-demo';
      if (persistReadyRef.current && !loading) {
        writeAutomationLocal(cid, welcomeMessageRef.current, next, flowIdRef.current);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!profile?.company_id) {
      toastError('Faça login com uma conta Zaptro para salvar a automação.');
      return;
    }
    const tId = toastLoading('Salvando automação...');
    let resolvedFlowId = flowId;
    try {
      const payloadFull = {
        company_id: profile.company_id,
        name: 'Padrao',
        welcome_message: welcomeMessage,
        options: options,
      };
      const payloadLegacyWelcome = {
        company_id: profile.company_id,
        name: 'Padrao',
        options: wrapFlowOptionsForLegacyDb(welcomeMessage, options),
      };

      let error: { message?: string } | null = null;
      const runSave = async (payload: typeof payloadFull | typeof payloadLegacyWelcome) => {
        if (flowId) {
          const { error: updError } = await supabaseZaptro
            .from('whatsapp_automation_flows')
            .update(payload)
            .eq('id', flowId);
          return updError;
        }
        const { data: newData, error: insError } = await supabaseZaptro
          .from('whatsapp_automation_flows')
          .insert([payload])
          .select()
          .single();
        if (newData?.id) {
          resolvedFlowId = newData.id;
          setFlowId(newData.id);
        }
        return insError;
      };

      error = await runSave(payloadFull);
      if (
        error?.message &&
        supabaseMissingColumnError(error.message, 'welcome_message')
      ) {
        error = await runSave(payloadLegacyWelcome);
      }

      if (error) throw error;
      writeAutomationLocal(profile.company_id, welcomeMessage, options, resolvedFlowId);
      setSyncedFingerprint(flowFingerprint(welcomeMessage, options));
      toastSuccess('Automação Zaptro salva com sucesso! 🚀');
    } catch (err: any) {
      writeAutomationLocal(profile.company_id, welcomeMessage, options, resolvedFlowId);
      const msg = typeof err?.message === 'string' ? err.message : String(err);
      const missingOptionsColumn = supabaseMissingColumnError(msg, 'options');
      const missingWelcomeColumn = supabaseMissingColumnError(msg, 'welcome_message');
      if (missingOptionsColumn) {
        toastError(
          'Falta a coluna «options» na tabela whatsapp_automation_flows no Supabase. No SQL Editor, execute scripts/fix-whatsapp-automation-flows-options.sql (ou o bloco de automação no ZaptroHealthGuard) e volte a guardar. O rascunho continua neste browser.',
        );
      } else if (missingWelcomeColumn) {
        toastError(
          'Falta a coluna «welcome_message» no Supabase. Execute scripts/fix-whatsapp-automation-flows-options.sql (inclui welcome_message e options) ou atualize o schema; o rascunho continua neste browser.',
        );
      } else {
        toastError('Erro ao salvar no servidor: ' + msg + ' — rascunho mantido neste browser.');
      }
    } finally {
      toastDismiss(tId);
    }
  };

  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simMessages, setSimMessages] = useState<{from: 'bot' | 'user', text: string}[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    detectNf: true,
    naturalLanguageStatus: true,
    aiModel: 'GPT-4 Logistics Optimized'
  });

  useEffect(() => {
    const cid = profile?.company_id;
    if (!cid) return;
    try {
      const raw = localStorage.getItem(`zaptro_automation_ai_${cid}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{ detectNf: boolean; naturalLanguageStatus: boolean; aiModel: string }>;
      setAiConfig((c) => ({
        ...c,
        ...(typeof parsed.detectNf === 'boolean' ? { detectNf: parsed.detectNf } : {}),
        ...(typeof parsed.naturalLanguageStatus === 'boolean' ? { naturalLanguageStatus: parsed.naturalLanguageStatus } : {}),
        ...(typeof parsed.aiModel === 'string' ? { aiModel: parsed.aiModel } : {}),
      }));
    } catch {
      /* ignore */
    }
  }, [profile?.company_id]);

  const handleSimInput = (opt: FlowOption) => {
    const demoLink = 'https://app.zaptro.com.br/acompanhar/demo-token';
    if (opt.action === 'tracking_public') {
      const found = (opt.responseWhenFound || '').replace(/\{\{\s*link\s*\}\}/gi, demoLink).replace(
        /\{\{\s*tracking_link\s*\}\}/gi,
        demoLink,
      );
      setSimMessages((prev) => [
        ...prev,
        { from: 'user', text: `${opt.keyword}. ${opt.label}` },
        {
          from: 'bot',
          text:
            found.trim() ||
            `✅ (simulador) Carga encontrada.\n🔗 ${demoLink}\n\n— No WhatsApp real: se o telefone estiver na carga em logística, o link é enviado já; senão o robô pede pedido/NF/CNPJ.`,
        },
      ]);
      return;
    }
    setSimMessages([...simMessages, { from: 'user', text: opt.label }, { from: 'bot', text: opt.response }]);
    if (opt.action === 'routing') {
      setTimeout(() => {
        setSimMessages((prev) => [
          ...prev,
          { from: 'bot', text: `🔄 Direcionando para o setor: ${departments.find((d) => d.id === opt.target)?.name}...` },
        ]);
      }, 1000);
    }
  };

  const liveFingerprint = flowFingerprint(welcomeMessage, options);
  const needsRemoteSave =
    !!profile?.company_id && syncedFingerprint !== null && liveFingerprint !== syncedFingerprint;
  const isServerMenuInSync =
    !!profile?.company_id && syncedFingerprint !== null && liveFingerprint === syncedFingerprint;

  const landingHeroBg = palette.mode === 'dark' ? '#1a1914' : '#F9F6EE';
  const landingBottomBg = palette.mode === 'dark' ? palette.pageBg : '#FFFFFF';
  const landingText = palette.text;
  const landingMuted = palette.textMuted;

  const automationLandingView = (
    <div
      style={{
        ...styles.automationLandingRoot,
        background: `linear-gradient(180deg, ${landingHeroBg} 0%, ${landingHeroBg} 52%, ${landingBottomBg} 52%, ${landingBottomBg} 100%)`,
      }}
    >
      <div style={styles.automationLandingInner}>
        <p style={{ ...styles.automationLandingEyebrow, color: landingMuted }}>Comece com Automações</p>
        <h1 style={{ ...styles.automationLandingTitle, color: landingText }}>
          Automação fácil para crescimento sem esforço
        </h1>
        <p style={{ ...styles.automationLandingBody, color: landingMuted }}>
          Aumente a eficiência automatizando o atendimento no WhatsApp. Crie o menu de triagem, direcione para os setores e
          envie o link público de rastreio quando os dados baterem com as cargas — tudo a partir desta página. Quando o teu
          perfil e a operação estiverem prontos, o fluxo fica disponível para os clientes.
        </p>
        <div style={styles.automationLandingCtas}>
          <a
            href="https://www.zaptro.com.br"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...styles.automationLandingLearnLink, color: landingText }}
          >
            Aprenda a automatizar
            <ExternalLink size={16} strokeWidth={2.2} aria-hidden />
          </a>
          <button type="button" style={styles.automationLandingPrimaryBtn} onClick={openAutomationEditor}>
            Criar sua primeira automação
          </button>
        </div>
      </div>
      <div style={{ ...styles.automationLandingArtWrap, backgroundColor: landingBottomBg }}>
        <AutomationLandingIllustration accent={palette.mode === 'dark' ? '#4ade80' : '#16a34a'} />
      </div>
    </div>
  );

  const loadingView = (
    <div style={styles.automationLoadingWrap}>
      <Loader2 size={36} className="animate-spin" color={palette.textMuted} aria-label="A carregar" />
    </div>
  );

  const editorContent = (
      <div style={styles.container} className={hideLayout ? 'zaptro-auto-embed' : undefined}>
        <header style={styles.header}>
           <div style={styles.headerInfo}>
              <h1 style={styles.title}>Automação & Fluxos Inteligentes</h1>
           </div>
           <div style={styles.headerActions}>
              <button type="button" style={styles.secondaryBtn} onClick={() => { setIsSimulatorOpen(true); setSimMessages([{ from: 'bot', text: welcomeMessage }]); }}>
                 <Play size={16} /> Testar Simulador
              </button>
              <button type="button" style={styles.primaryBtn} onClick={handleSave}><Save size={18} /> Salvar Fluxo</button>
           </div>
        </header>

        {isSimulatorOpen && (
          <div style={styles.simulatorOverlay} onClick={() => setIsSimulatorOpen(false)}>
             <div style={styles.simulatorCard} onClick={e => e.stopPropagation()}>
                <div style={styles.simHeader}>
                   <div style={styles.simAvatar}><Bot size={18} /></div>
                   <div style={{flex: 1}}><h4 style={{margin: 0, fontSize: '14px', fontWeight: '950'}}>Simulador Zaptro Bot</h4><span style={{fontSize: '10px', color: '#404040', fontWeight: '800'}}>ONLINE</span></div>
                   <button style={styles.closeBtn} onClick={() => setIsSimulatorOpen(false)}><X size={16} /></button>
                </div>
                <div style={styles.simBody}>
                   {simMessages.map((m, i) => (
                     <div key={i} style={{...styles.simMsg, alignSelf: m.from === 'bot' ? 'flex-start' : 'flex-end', backgroundColor: m.from === 'bot' ? '#FBFBFC' : '#0F172A', color: m.from === 'bot' ? '#0F172A' : '#FFF'}}>
                        {m.text}
                     </div>
                   ))}
                </div>
                <div style={styles.simFooter}>
                   <p style={{fontSize: '11px', color: '#94A3B8', marginBottom: '12px', fontWeight: '700'}}>Selecione uma opção para testar:</p>
                   <div style={styles.simOptions}>
                      {options.map(o => (
                        <button key={o.id} style={styles.simOptBtn} onClick={() => handleSimInput(o)}>{o.keyword}. {o.label}</button>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        <style>{`
          .zaptro-auto-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(200px, 232px);
            gap: 32px 28px;
            align-items: start;
            width: 100%;
          }
          .zaptro-auto-main {
            min-width: 0;
            width: 100%;
          }
          .zaptro-auto-options {
            display: grid;
            width: 100%;
            box-sizing: border-box;
            grid-template-columns: repeat(${MENU_OPTION_GRID_COLUMNS}, minmax(0, 1fr));
            gap: 20px 24px;
            justify-items: stretch;
          }
          .zaptro-auto-options > * {
            min-width: 0;
          }
          .zaptro-auto-aside {
            display: flex;
            flex-direction: column;
            gap: 22px;
            width: 100%;
            min-width: 0;
          }
          .zaptro-auto-menu-row {
            grid-column: 1 / -1;
            width: 100%;
            min-width: 0;
          }
          @media (max-width: 1180px) {
            .zaptro-auto-layout { grid-template-columns: 1fr; }
          }
          @media (max-width: 900px) {
            .zaptro-auto-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 560px) {
            .zaptro-auto-options { grid-template-columns: 1fr; }
          }
          .zaptro-auto-embed .zaptro-auto-layout {
            grid-template-columns: minmax(0, 1fr) minmax(240px, min(394px, 100%));
            gap: 28px 32px;
          }
          .zaptro-auto-embed .zaptro-auto-aside {
            padding: 0;
            width: 100%;
            max-width: 420px;
            justify-content: flex-start;
            align-items: stretch;
            gap: 20px;
            margin-left: 0;
            box-sizing: border-box;
          }
          .zaptro-auto-embed .zaptro-auto-welcome-card {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
        `}</style>
        <div className="zaptro-auto-layout">
           <section className="zaptro-auto-main" style={styles.editorMain}>
              <div className="zaptro-auto-welcome-card" style={styles.card}>
                 <div style={styles.cardHeader}>
                    <div style={styles.iconBox}><Bot size={20} color="#0F172A" /></div>
                    <h3 style={styles.cardTitle}>1. Mensagem de Boas-Vindas</h3>
                 </div>
                 <div style={styles.editorArea}>
                    <textarea 
                      style={styles.textarea}
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="Ex: Olá! Como posso te ajudar?"
                    />
                     <p style={styles.previewHintLabel}>Pré-visualização das opções do menu</p>
                     <div style={styles.previewHint}>
                        {options.map(opt => (
                          <div key={opt.id} style={styles.hintButton}>
                             <span style={styles.hintKeyword}>{opt.keyword}</span>
                             <span style={styles.hintSep}>·</span>
                             <span>{opt.label}</span>
                          </div>
                        ))}
                     </div>
                 </div>
              </div>
           </section>

           <aside className="zaptro-auto-aside">
              <div style={{ ...styles.sideCard, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                 <h4 style={styles.sideTitle}>Timeout</h4>
                 <span style={styles.configDesc}>Reset do fluxo após inatividade</span>
                 <select style={{ ...styles.tinySelect, width: '100%', marginTop: 18, padding: '10px 12px', fontSize: 12, accentColor: '#000' }}>
                    <option>15 min</option>
                    <option>1 hora</option>
                 </select>
              </div>
              <div style={{ ...styles.sideCard, width: '100%', maxWidth: '100%', boxSizing: 'border-box', backgroundColor: '#0F172A', color: 'white' }}>
                 <h4 style={{ ...styles.sideTitle, color: 'white' }}>Inteligência</h4>
                 <p style={{ ...styles.sideDesc, color: 'rgba(255,255,255,0.72)' }}>
                    Deteção de NF e linguagem natural (configuração detalhada no modal).
                 </p>
                 <button type="button" style={styles.proBtn} onClick={() => setIsAiModalOpen(true)}>
                    Configurar motor
                 </button>
              </div>
           </aside>

           <div className="zaptro-auto-menu-row">
              <div className="zaptro-auto-menu-section" style={styles.menuSectionCard}>
                 <div style={styles.cardHeader}>
                    <div style={styles.iconBox}><ListOrdered size={20} color="#0F172A" /></div>
                    <div style={styles.menuSectionHeaderRow}>
                       <div style={styles.menuSectionTitleBlock}>
                          <h3 style={styles.cardTitle}>2. Opções do Menu (Triagem)</h3>
                          <p style={styles.menuSectionHint}>
                             Editor em {MENU_OPTION_GRID_COLUMNS} colunas. «Rastreio público» tenta casar o telefone do WhatsApp com o campo{' '}
                             <em>Telefone do cliente</em> na carga; se não houver correspondência, pede pedido, NF ou CNPJ/CPF e envia o link{' '}
                             <code style={{ fontSize: 11 }}>/acompanhar/…</code>.
                          </p>
                       </div>
                       <button type="button" style={styles.addBtn} onClick={addOption}>
                          <Plus size={16} /> Adicionar Opção
                       </button>
                    </div>
                 </div>

                 <div style={styles.menuSectionBody}>
                    <div style={styles.flowDraftBanner} role="status" aria-live="polite">
                      {localDraftBusy && (
                        <span style={styles.flowDraftLine}>
                          <Loader2 size={14} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
                          A atualizar o rascunho neste browser…
                        </span>
                      )}
                      {!localDraftBusy && needsRemoteSave && (
                        <span style={styles.flowDraftWarn}>
                          Alterações por enviar ao servidor (inclui exclusões): o webhook WhatsApp só usa este menu depois de
                          «Salvar Fluxo». O simulador já reflete o que vê aqui.
                        </span>
                      )}
                      {!localDraftBusy && isServerMenuInSync && (
                        <span style={styles.flowDraftOk}>
                          <CheckCircle2 size={14} aria-hidden style={{ flexShrink: 0 }} />
                          Menu alinhado com o último salvamento no servidor — é este o fluxo que o cliente encontra no WhatsApp.
                        </span>
                      )}
                      {!localDraftBusy && !profile?.company_id && (
                        <span style={styles.flowDraftMuted}>
                          Rascunho neste browser: ao apagar ou editar, a lista atualiza já aqui e no simulador; faça login e use
                          «Salvar Fluxo» para o backend/WhatsApp ficarem iguais.
                        </span>
                      )}
                    </div>
                    <div className="zaptro-auto-options">
                    {options.map((opt, idx) => (
                      <div key={opt.id} style={styles.optionCard}>
                         <div style={styles.optTop}>
                            <div style={styles.optIndex}>{idx + 1}</div>
                            <input 
                              style={styles.optInput} 
                              value={opt.label}
                              onChange={(e) => setOptions(options.map(o => o.id === opt.id ? {...o, label: e.target.value} : o))} 
                            />
                            <button
                              type="button"
                              aria-label={`Remover opção ${opt.label || opt.keyword}`}
                              style={styles.delBtn}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeOption(opt.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                         </div>
                         
                         <div style={styles.optBody}>
                            <div style={styles.settingRow}>
                               <label style={styles.miniLabel}>AÇÃO AO CLICAR</label>
                               <select 
                                 style={styles.select}
                                 value={opt.action}
                                 onChange={(e) =>
                                   setOptions(
                                     options.map((o) =>
                                       o.id === opt.id
                                         ? { ...o, action: e.target.value as FlowOption['action'] }
                                         : o,
                                     ),
                                   )
                                 }
                               >
                                  <option value="message">Apenas responder (texto fixo)</option>
                                  <option value="routing">Direcionar para setor</option>
                                  <option value="tracking_public">Rastreio — link público (/acompanhar)</option>
                                  <option value="external">Integração externa (API)</option>
                               </select>
                            </div>

                            {opt.action === 'routing' && (
                              <div style={styles.settingRow}>
                                 <label style={styles.miniLabel}>SETOR DESTINO</label>
                                 <select 
                                   style={styles.select}
                                   value={opt.target}
                                   onChange={(e) => setOptions(options.map(o => o.id === opt.id ? {...o, target: e.target.value} : o))}
                                 >
                                    <option value="">Selecione um setor...</option>
                                    {departments.map(d => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                 </select>
                              </div>
                            )}

                            {opt.action === 'tracking_public' && (
                              <div style={styles.settingRow}>
                                <label style={styles.miniLabel}>QUANDO ENCONTRAR CARGA (opcional)</label>
                                <p style={{ margin: '0 0 8px', fontSize: 11, color: '#64748B', fontWeight: 600, lineHeight: 1.45 }}>
                                  Use <code>{'{{link}}'}</code> ou <code>{'{{tracking_link}}'}</code> no texto. Se ficar vazio, o servidor envia uma mensagem padrão com o URL.
                                </p>
                                <textarea
                                  style={styles.miniTextarea}
                                  value={opt.responseWhenFound ?? ''}
                                  onChange={(e) =>
                                    setOptions(
                                      options.map((o) =>
                                        o.id === opt.id ? { ...o, responseWhenFound: e.target.value } : o,
                                      ),
                                    )
                                  }
                                  placeholder="Ex.: ✅ Carga localizada.\n🔗 {{link}}"
                                />
                              </div>
                            )}

                            <div style={styles.settingRow}>
                               <label style={styles.miniLabel}>
                                 {opt.action === 'tracking_public'
                                   ? 'PEDIR DADOS SE NÃO CASAR O TELEFONE'
                                   : 'RESPOSTA DO ROBÔ'}
                               </label>
                               <textarea 
                                  style={styles.miniTextarea}
                                  value={opt.response}
                                  onChange={(e) => setOptions(options.map(o => o.id === opt.id ? {...o, response: e.target.value} : o))}
                               />
                            </div>
                         </div>
                      </div>
                    ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <LogtaModal 
          isOpen={isAiModalOpen} 
          onClose={() => setIsAiModalOpen(false)} 
          title="🧠 Inteligência Logística Avançada" 
          width="500px"
        >
           <div style={styles.aiModal}>
              <div style={styles.aiHeader}>
                 <Bot size={32} color="#CCFF00" />
                 <p style={styles.aiSubtitle}>Aumente a eficiência do seu chatbot com detecção inteligente de termos de transporte.</p>
              </div>
              <div style={styles.aiGrid}>
                 <div style={styles.aiOption}>
                    <div>
                       <strong style={styles.aiLabel}>Detecção Automática de NF</strong>
                       <p style={styles.aiDesc}>Identifica números de 5 a 9 dígitos no meio de frases e consulta o status da carga.</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={aiConfig.detectNf}
                      style={{ ...styles.aiToggle, ...(aiConfig.detectNf ? { backgroundColor: '#CCFF00' } : styles.aiToggleOff) }}
                      onClick={() => setAiConfig({ ...aiConfig, detectNf: !aiConfig.detectNf })}
                    />
                 </div>
                 <div style={styles.aiOption}>
                    <div>
                       <strong style={styles.aiLabel}>Linguagem Natural (NLP)</strong>
                       <p style={styles.aiDesc}>Entende frases como 'cadê minha mercadoria?' sem precisar digitar o número 1.</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={aiConfig.naturalLanguageStatus}
                      style={{
                        ...styles.aiToggle,
                        ...(aiConfig.naturalLanguageStatus ? { backgroundColor: '#CCFF00' } : styles.aiToggleOff),
                      }}
                      onClick={() => setAiConfig({ ...aiConfig, naturalLanguageStatus: !aiConfig.naturalLanguageStatus })}
                    />
                 </div>
              </div>
              <button
                type="button"
                style={styles.aiSaveBtn}
                onClick={() => {
                  const cid = profile?.company_id;
                  if (cid) {
                    try {
                      localStorage.setItem(`zaptro_automation_ai_${cid}`, JSON.stringify(aiConfig));
                    } catch {
                      /* ignore */
                    }
                  }
                  toastSuccess('Motor de inteligência guardado neste browser.');
                  setIsAiModalOpen(false);
                }}
              >
                 Ativar motor e guardar
              </button>
           </div>
        </LogtaModal>
      </div>
  );

  const main = loading ? loadingView : showLanding ? automationLandingView : editorContent;

  if (hideLayout) {
    return main;
  }

  return <ZaptroLayout>{main}</ZaptroLayout>;
};

const styles: Record<string, any> = {
  automationLoadingWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    width: '100%',
    boxSizing: 'border-box',
  },
  automationLandingRoot: {
    width: '100%',
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
  },
  automationLandingInner: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '48px 24px 36px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  automationLandingEyebrow: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  automationLandingTitle: {
    margin: '14px 0 0',
    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    fontWeight: 950,
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
  },
  automationLandingBody: {
    marginTop: 18,
    marginLeft: 'auto',
    marginRight: 'auto',
    marginBottom: 0,
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.65,
    maxWidth: 640,
  },
  automationLandingCtas: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 32,
  },
  automationLandingLearnLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15,
    fontWeight: 800,
    textDecoration: 'underline',
    textUnderlineOffset: 4,
    cursor: 'pointer',
  },
  automationLandingPrimaryBtn: {
    backgroundColor: '#000000',
    color: '#ffffff',
    border: 'none',
    padding: '16px 28px',
    borderRadius: 999,
    fontWeight: 950,
    fontSize: 15,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 14px 36px rgba(0,0,0,0.18)',
  },
  automationLandingArtWrap: {
    padding: '28px 20px 56px',
    boxSizing: 'border-box',
  },
  container: { padding: '0px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  title: { fontSize: '32px', fontWeight: '950', color: '#000000', margin: 0, letterSpacing: '-1.5px' },
  headerActions: { display: 'flex', gap: '12px', width: '390px' },
  primaryBtn: {
    backgroundColor: '#0F172A',
    color: 'white',
    border: 'none',
    padding: '16px 28px',
    borderRadius: '16px',
    fontWeight: '950',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '186px',
  },
  secondaryBtn: {
    backgroundColor: 'white',
    color: '#0F172A',
    border: '1px solid #E2E8F0',
    padding: '16px 24px',
    borderRadius: '16px',
    fontWeight: '950',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  editorMain: { display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', minWidth: 0, boxSizing: 'border-box' },
  card: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #EBEBEC', overflow: 'hidden' },
  cardHeader: { padding: '28px 36px', borderBottom: '1px solid #EBEBEC', display: 'flex', alignItems: 'center', gap: '16px' },
  iconBox: { width: '44px', height: '44px', backgroundColor: '#FBFBFC', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: '18px', fontWeight: '900', color: '#0F172A', margin: 0 },
  editorArea: { padding: '36px 40px 40px' },
  textarea: {
    width: '100%',
    minHeight: '148px',
    height: '160px',
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1E293B',
    backgroundColor: '#FBFBFC',
    padding: '26px 28px',
    borderRadius: '20px',
    lineHeight: 1.65,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  previewHintLabel: {
    margin: '28px 0 12px',
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: '0.1em',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  previewHint: {
    marginTop: 0,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px 14px',
    alignItems: 'stretch',
  },
  hintButton: {
    display: 'inline-flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '14px 22px',
    backgroundColor: '#FBFBFC',
    borderRadius: '16px',
    fontSize: '13px',
    color: '#0F172A',
    fontWeight: 800,
    border: '1px solid #EBEBEC',
    transition: '0.2s',
    lineHeight: 1.45,
    flex: '1 1 200px',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  hintKeyword: { fontWeight: 950, color: '#0F172A' },
  hintSep: { opacity: 0.45, fontWeight: 700, padding: '0 2px' },
  menuSectionCard: {
    backgroundColor: '#FAFAFB',
    borderRadius: '32px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
    marginTop: '12px',
    boxShadow: '0 12px 40px rgba(15, 23, 42, 0.06)',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  menuSectionHeaderRow: {
    flex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    minWidth: 0,
  },
  menuSectionTitleBlock: { flex: '1 1 220px', minWidth: 0 },
  menuSectionHint: {
    margin: '6px 0 0',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748B',
    lineHeight: 1.45,
    maxWidth: '520px',
  },
  menuSectionBody: { padding: '8px 20px 28px', backgroundColor: '#FFFFFF' },
  flowDraftBanner: {
    marginBottom: 14,
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid #E2E8F0',
    backgroundColor: '#f4f4f4',
    fontSize: 12,
    fontWeight: 650,
    lineHeight: 1.45,
    color: '#475569',
  },
  flowDraftLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#475569',
  },
  flowDraftWarn: {
    display: 'block',
    color: '#B45309',
    fontWeight: 750,
  },
  flowDraftOk: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    color: '#15803D',
    fontWeight: 650,
  },
  flowDraftMuted: {
    display: 'block',
    color: '#64748B',
    fontWeight: 600,
  },
  addBtn: { backgroundColor: '#CCFF00', color: '#0F172A', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '950', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: '28px',
    border: '1px solid #EBEBEC',
    padding: '24px',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
  },
  optTop: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', minWidth: 0 },
  optIndex: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    backgroundColor: '#0F172A',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '950',
    flexShrink: 0,
  },
  optInput: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    fontWeight: '900',
    color: '#0F172A',
  },
  delBtn: { border: 'none', backgroundColor: 'transparent', color: '#52525b', cursor: 'pointer', padding: 6, borderRadius: 10 },
  optBody: { display: 'flex', flexDirection: 'column', gap: '16px' },
  settingRow: { display: 'flex', flexDirection: 'column', gap: '6px' },
  miniLabel: { fontSize: '10px', fontWeight: '950', color: '#000000', letterSpacing: '0.5px' },
  select: { padding: '12px', borderRadius: '12px', border: '1px solid #EBEBEC', fontSize: '13px', fontWeight: '800', outline: 'none', accentColor: '#000', backgroundColor: '#fff', color: '#0F172A' },
  miniTextarea: {
    width: '100%',
    minHeight: '96px',
    border: '1px solid #EBEBEC',
    outline: 'none',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  sideCard: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #EBEBEC' },
  sideTitle: { margin: '0 0 12px', fontSize: '14px', fontWeight: '950', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px' },
  sideDesc: { fontSize: '13px', color: '#94A3B8', lineHeight: 1.65, fontWeight: '600', marginBottom: '24px' },
  configItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  configInfo: { display: 'flex', flexDirection: 'column' },
  configLabel: { fontSize: '13px', fontWeight: '850', color: '#0F172A' },
  configDesc: { fontSize: '11px', color: '#94A3B8', fontWeight: '600' },
  tinySelect: { padding: '8px 10px', borderRadius: '10px', border: '1px solid #E4E4E7', fontSize: '11px', fontWeight: '900', accentColor: '#000', backgroundColor: '#fff', color: '#0F172A', boxSizing: 'border-box' },
  proBtn: { width: '100%', padding: '16px 14px', borderRadius: '14px', border: 'none', backgroundColor: '#CCFF00', color: '#0F172A', fontWeight: '950', fontSize: '13px', cursor: 'pointer', marginTop: 4 },
  simulatorOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  simulatorCard: { width: '400px', height: '600px', backgroundColor: 'white', borderRadius: '40px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  simHeader: { padding: '24px 32px', backgroundColor: '#FBFBFC', borderBottom: '1px solid #EBEBEC', display: 'flex', alignItems: 'center', gap: '16px' },
  simAvatar: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#0F172A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#64748B' },
  simBody: { flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  simMsg: { padding: '14px 20px', borderRadius: '18px', maxWidth: '85%', fontSize: '14px', fontWeight: '700', lineHeight: '1.5' },
  simFooter: { padding: '24px 32px', backgroundColor: '#FBFBFC', borderTop: '1px solid #EBEBEC' },
  simOptions: { display: 'flex', flexDirection: 'column', gap: '8px' },
  simOptBtn: { width: '100%', padding: '14px 24px', backgroundColor: 'white', border: '1px solid #EBEBEC', borderRadius: '16px', fontSize: '13px', fontWeight: '850', color: '#0F172A', textAlign: 'left', cursor: 'pointer' },
  aiModal: { padding: '20px 10px' },
  aiHeader: { textAlign: 'center', marginBottom: '32px' },
  aiSubtitle: { fontSize: '14px', color: '#64748B', fontWeight: '500', marginTop: '12px', lineHeight: '1.5' },
  aiGrid: { display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' },
  aiOption: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FBFBFC', padding: '20px', borderRadius: '20px', border: '1px solid #EBEBEC' },
  aiLabel: { fontSize: '15px', fontWeight: '900', color: '#0F172A', display: 'block', marginBottom: '4px' },
  aiDesc: { fontSize: '12px', color: '#94A3B8', fontWeight: '600', maxWidth: '300px', lineHeight: '1.4' },
  aiToggle: { width: '48px', height: '24px', borderRadius: '24px', border: 'none', cursor: 'pointer', transition: '0.3s' },
  aiToggleOff: { backgroundColor: '#d4d4d8' },
  aiSaveBtn: { width: '100%', padding: '18px', borderRadius: '16px', border: 'none', backgroundColor: '#0F172A', color: 'white', fontWeight: '950', fontSize: '15px', cursor: 'pointer' }
};

export default ZaptroAutomation;
