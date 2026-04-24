import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  Clock,
  Zap,
  Plus,
  Smile,
  Send,
  MoreVertical,
  Paperclip,
  Phone,
  Video,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Sparkles,
  Truck,
  FileText,
  Image as ImageIcon,
  Lock,
  AlertTriangle,
  X,
  Copy,
  Bell,
  BellOff,
  Star,
  Info,
  CheckSquare,
  XCircle,
  ThumbsDown,
  Ban,
  MinusCircle,
  Trash2,
  CreditCard,
  ClipboardList,
  Navigation,
  Check,
  User,
  Archive,
  Pin,
  PinOff,
  Tag,
  MessageSquare,
  MessageSquarePlus,
  Briefcase,
  Users,
  Megaphone,
  LayoutGrid,
  CheckCheck,
  LogOut,
  UserPlus,
  Unlock,
  Camera,
  Mic,
  BarChart3,
  CircleDollarSign,
  Store,
  Share,
  Play,
  Circle,
} from 'lucide-react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { ZAPTRO_FIELD_BG, ZAPTRO_SOFT_NEUTRAL_MUTED } from '../constants/zaptroUi';
import { isZaptroTenantAdminRole } from '../utils/zaptroPermissions';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import LogtaModal from '../components/Modal';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { toastError, toastSuccess } from '../lib/toast';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import {
  readAllConversationCargo,
  persistConversationCargoPhase,
  markConversationCargoSynced,
  type ConversationCargoPhase,
} from '../constants/zaptroConversationCargoStore';
import OpenStreetRouteMap from '../components/OpenStreetRouteMap';
import { Download } from 'lucide-react';
import { readExternalApiIntegrations } from '../constants/zaptroExternalApisStore';
import {
  getWaBrowserNotificationPermission,
  getWaNotificationBannerKind,
  playWaIncomingMessageSound,
  readWaNotifDesktopDesired,
  readWaNotifSoundEnabled,
  requestWaBrowserNotificationPermission,
  setWaNotifDesktopDesired,
  setWaNotifSoundEnabled,
  showWaDesktopNotificationIfAllowed,
} from '../lib/zaptroWaMessageNotifications';

const LIME = '#D9FF00';

/** Telefones na UI — sempre Arial (fallbacks genéricos). */
const WHATSAPP_PHONE_FONT_FAMILY = 'Arial, Helvetica, sans-serif' as const;

type WaQuickChipLabel = 'Nova carga' | 'Orçamento' | 'Comprovante' | 'Localização';

/** Atalhos por `@` no campo de mensagem (token após o arroba, sem espaço). */
const WA_AT_SHORTCUTS: { token: string; label: WaQuickChipLabel; hint: string }[] = [
  { token: 'carga', label: 'Nova carga', hint: 'Nova rota / carga' },
  { token: 'nova', label: 'Nova carga', hint: 'Nova rota / carga' },
  { token: 'orc', label: 'Orçamento', hint: 'CRM / orçamento' },
  { token: 'orcamento', label: 'Orçamento', hint: 'CRM / orçamento' },
  { token: 'doc', label: 'Comprovante', hint: 'Texto modelo comprovante' },
  { token: 'comp', label: 'Comprovante', hint: 'Texto modelo comprovante' },
  { token: 'loc', label: 'Localização', hint: 'Texto modelo link carga' },
  { token: 'local', label: 'Localização', hint: 'Texto modelo link carga' },
];

interface Message {
  id: string;
  content: string;
  direction: 'in' | 'out';
  created_at: string;
  connection_id?: string;
  type?: 'text' | 'image' | 'file' | 'audio' | 'system';
  audio_url?: string;
  duration?: number;
}

type CargoPhase = ConversationCargoPhase;

const CARGO_PHASE_LABEL: Record<CargoPhase, string> = {
  coletado: 'Coletado',
  transito: 'Em trânsito',
  entregue: 'Entregue',
};

interface Conversation {
  id: string;
  sender_number: string;
  sender_name: string;
  customer_avatar?: string;
  last_message: string;
  last_customer_message_at: string;
  status: string;
  connection_id?: string;
  assigned_to?: string | null;
  department?: string | null;
  attendance_status?: 'awaiting' | 'in_service' | 'finished';
  claimed_at?: string | null;
  /** Conversa de equipa / grupo (quando a API enviar ou em seeds de demo). */
  is_group?: boolean;
  /** Contador de não lidas quando existir na base ou em demo. */
  unread_count?: number;
  tags?: string[];
}

function waInboxContactLabel(chat: Pick<Conversation, 'sender_name' | 'sender_number'> | null): string {
  if (!chat) return 'WhatsApp';
  return chat.sender_name || chat.sender_number || 'Novo contato';
}

const WA_INBOX_STARRED_KEY = 'zaptro_wa_inbox_starred_v1';

type WaInboxFilter = 'all' | 'unread' | 'starred' | 'groups';

function readInboxStarredIds(): Set<string> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(WA_INBOX_STARRED_KEY) : null;
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function persistInboxStarred(ids: Set<string>) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WA_INBOX_STARRED_KEY, JSON.stringify([...ids]));
    }
  } catch {
    /* ignore */
  }
}

function isZaptroDemoConversationId(id: string): boolean {
  return id.startsWith('zaptro-demo-');
}

function onlyDigits(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\D/g, '');
}

/** Telefone internacional ou UUID da conversa na URL `/whatsapp/:waThread`. */
function findConversationByThreadKey(list: Conversation[], threadRaw: string): Conversation | null {
  const key = threadRaw.trim();
  if (!key) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    return list.find((c) => c.id === key) ?? null;
  }
  const want = onlyDigits(key);
  if (!want) return null;
  return (
    list.find((c) => {
      const n = onlyDigits(c.sender_number);
      return n === want || n.endsWith(want) || want.endsWith(n);
    }) ?? null
  );
}

function agoIso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function digitsForTel(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/** SLA simples: minutos desde a última mensagem **entrada** do cliente (sem exigir coluna extra na BD). */
const SLA_CUSTOMER_REPLY_MIN = 12;

type TeamPick = { id: string; full_name: string | null };

/** Minutos desde a última mensagem **se for entrada do cliente** (equipa ainda não respondeu depois dela). */
function minutesSinceLastPendingCustomerMessage(messages: Message[], fallbackIso?: string | null): number | null {
  const last = messages.length ? messages[messages.length - 1] : null;
  if (last && last.direction === 'in') {
    const t = new Date(last.created_at).getTime();
    if (!Number.isFinite(t)) return null;
    return (Date.now() - t) / 60_000;
  }
  if (!last && fallbackIso) {
    const t = new Date(fallbackIso).getTime();
    if (!Number.isFinite(t)) return null;
    return (Date.now() - t) / 60_000;
  }
  return null;
}

/** Mensagens fictícias só para pré-visualizar o layout (sem Supabase). */
function buildDemoThread(chatId: string): Message[] {
  switch (chatId) {
    case 'zaptro-demo-1':
      return [
        {
          id: 'z1-1',
          content: 'Bom dia! Preciso cotar coleta hoje à tarde — SP → Sorocaba, 12 pallets.',
          direction: 'in',
          created_at: agoIso(52),
        },
        {
          id: 'z1-2',
          content: 'Olá, Mariana. Temos janela entre 14h e 17h. O motorista avisa 30 min antes.',
          direction: 'out',
          created_at: agoIso(50),
        },
        {
          id: 'z1-3',
          content: 'Perfeito. Pode confirmar NF-e no CNPJ da Silva Logística?',
          direction: 'in',
          created_at: agoIso(12),
        },
        {
          id: 'z1-4',
          content: 'Sim — envio o XML em seguida pelo portal. Obrigada!',
          direction: 'out',
          created_at: agoIso(10),
        },
      ];
    case 'zaptro-demo-2':
      return [
        {
          id: 'z2-1',
          content: 'Carga urgente Curitiba → Joinville. Tem caminhão disponível?',
          direction: 'in',
          created_at: agoIso(120),
        },
        {
          id: 'z2-2',
          content: 'Temos bitrem saindo amanhã 06h. Te mando link de rastreio assim que fechar o agendamento.',
          direction: 'out',
          created_at: agoIso(118),
        },
        {
          id: 'z2-3',
          content: 'Ótimo. Preciso do POD digital na entrega.',
          direction: 'in',
          created_at: agoIso(30),
        },
      ];
    case 'zaptro-demo-3':
      return [
        {
          id: 'z3-1',
          content: 'Oi, o cliente reclamou de atraso na última entrega. Conseguem status?',
          direction: 'in',
          created_at: agoIso(200),
        },
        {
          id: 'z3-2',
          content: 'Abri ocorrência #8842. Equipe de campo já está no CD — retorno em até 20 min.',
          direction: 'out',
          created_at: agoIso(195),
        },
      ];
    default:
      if (chatId.startsWith('zaptro-demo-crm-')) {
        return [
          {
            id: `${chatId}-m1`,
            content: 'Bom dia! Podem confirmar janela de coleta e documentação?',
            direction: 'in' as const,
            created_at: agoIso(95),
          },
          {
            id: `${chatId}-m2`,
            content: 'Olá! Sim — encaminho o protocolo e o motorista no grupo assim que fechar o agendamento.',
            direction: 'out' as const,
            created_at: agoIso(88),
          },
          {
            id: `${chatId}-m3`,
            content: 'Perfeito, aguardo o link de acompanhamento.',
            direction: 'in' as const,
            created_at: agoIso(22),
          },
        ];
      }
      return [];
  }
}

const WhatsAppPremiumContent: React.FC = () => {
  const navigate = useNavigate();
  const { waThread } = useParams<{ waThread?: string }>();
  const { profile, isMaster } = useAuth();
  const { company } = useTenant();
  const { palette } = useZaptroTheme();
  
  const [activeSession, setActiveSession] = useState<string | null>(null);
  /** Verificação Evolution / gateway — animação «a conectar» no painel direito enquanto `checking`. */
  const [waGatewayStatus, setWaGatewayStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [waSearchTerm, setWaSearchTerm] = useState('');
  const [waInboxFilter, setWaInboxFilter] = useState<WaInboxFilter>('all');
  const [starredChatIds, setStarredChatIds] = useState<Set<string>>(readInboxStarredIds);
  const [pinnedChatIds, setPinnedChatIds] = useState<Set<string>>(new Set());
  const [archivedChatIds, setArchivedChatIds] = useState<Set<string>>(new Set());
  const [unreadForcedIds, setUnreadForcedIds] = useState<Set<string>>(new Set());
  const [lockedChatIds, setLockedChatIds] = useState<Set<string>>(new Set());
  const [newContactModalOpen, setNewContactModalOpen] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    name: '',
    phone: '',
    cnpj: '',
    companyName: '',
    segmentWa: '',
    segmentCompany: '',
    email: '',
    address: ''
  });
  const [readSessionIds, setReadSessionIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  /** Estado logístico da carga por conversa (demo + UI até existir coluna dedicada no backend). */
  const [cargoPhaseByChat, setCargoPhaseByChat] = useState<Record<string, CargoPhase>>({});
  const [assigning, setAssigning] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamPick[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferring, setTransferring] = useState(false);
  /** Popup informativo: voz e vídeo não passam pelo Zaptro; só texto fica no sistema. */
  const [callActionModal, setCallActionModal] = useState<null | 'voice' | 'video'>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [newChatPanelOpen, setNewChatPanelOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [interrupting, setInterrupting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickShortcutsRef = useRef<HTMLDivElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const waAttachmentInputRef = useRef<HTMLInputElement>(null);
  const selectedChatRef = useRef<Conversation | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const [atMenu, setAtMenu] = useState<{ start: number; filter: string } | null>(null);
  /** Menu compacto de atalhos (@) — evita fila de pills no compositor. */
  const [quickShortcutsOpen, setQuickShortcutsOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  /** Força re-render ao mudar prefs de notificação / permissão. */
  const [notifPrefsTick, setNotifPrefsTick] = useState(0);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chat: Conversation } | null>(null);
  const [searchInsideOpen, setSearchInsideOpen] = useState(false);
  const [searchInsideTerm, setSearchInsideTerm] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [tempMessagesEnabled, setTempMessagesEnabled] = useState(false);
  const [massSelectionMode, setMassSelectionMode] = useState(false);
  const [massSelectedChatIds, setMassSelectedChatIds] = useState<Set<string>>(new Set());
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingAmount, setBillingAmount] = useState('');
  const [billingDescription, setBillingDescription] = useState('');
  const [quickResponsesOpen, setQuickResponsesOpen] = useState(false);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [quotesModalOpen, setQuotesModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; previewUrl: string | null } | null>(null);
  const [sendingFile, setSendingFile] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const nfeIntegrations = useMemo(
    () => readExternalApiIntegrations(profile?.company_id).filter((i) => i.category === 'nfe' && i.enabled),
    [profile?.company_id]
  );

  useEffect(() => {
    const m = readAllConversationCargo();
    const phases: Record<string, CargoPhase> = {};
    for (const [id, row] of Object.entries(m)) {
      if (row?.phase) phases[id] = row.phase;
    }
    if (Object.keys(phases).length > 0) {
      setCargoPhaseByChat((prev) => ({ ...phases, ...prev }));
    }
  }, []);

  const demoConversationSeeds = useMemo((): Conversation[] => {
    return [
      {
        id: 'zaptro-demo-1',
        sender_number: '+55 11 99876-1122',
        sender_name: 'Mariana · Silva Logística',
        last_message: 'Conseguem slot para descarga amanhã no CD Guarulhos?',
        last_customer_message_at: agoIso(4),
        status: 'open',
        unread_count: 2,
      },
      {
        id: 'zaptro-demo-2',
        sender_number: '+55 41 98222-1100',
        sender_name: 'Carlos · Frigorífico Sul',
        last_message: 'Preciso de bitrem Curitiba → Joinville com POD digital.',
        last_customer_message_at: agoIso(35),
        status: 'open',
        unread_count: 0,
      },
      {
        id: 'zaptro-demo-3',
        sender_number: '+55 21 97000-8899',
        sender_name: 'Equipe CD Rio - Logística',
        last_message: 'Cliente pediu status da carga — SLA 20 min.',
        last_customer_message_at: agoIso(90),
        status: 'open',
        unread_count: 1,
      },
    ];
  }, []);

  /** Leads de demonstração do CRM (`ZaptroCrm`) — mesmos telefones para abrir inbox com histórico fictício. */
  const crmDemoInboxSeeds = useMemo((): Conversation[] => {
    const face = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/128/128`;
    return [
      {
        id: 'zaptro-active-5511988776655',
        sender_number: '+55 11 98877-6655',
        sender_name: 'Transportes MoviLog Ltda',
        customer_avatar: face('zaptro-movilog'),
        last_message: 'Preciso atualizar a janela de coleta em Porto Alegre.',
        last_customer_message_at: agoIso(40),
        status: 'open',
        unread_count: 1,
      },
      {
        id: 'zaptro-active-5521977112200',
        sender_number: '+55 21 97711-2200',
        sender_name: 'Expresso Catarinense',
        customer_avatar: face('zaptro-ecatarinense'),
        last_message: 'Confirmam temperatura -18°C no trecho RJ → DF?',
        last_customer_message_at: agoIso(18),
        status: 'open',
        unread_count: 3,
      },
      {
        id: 'zaptro-active-5585991234400',
        sender_number: '+55 85 99123-4400',
        sender_name: 'NorteSul Logística',
        customer_avatar: face('zaptro-nortesul'),
        last_message: 'NF-e disponível — podem seguir com o embarque?',
        last_customer_message_at: agoIso(12),
        status: 'open',
        is_group: true,
        unread_count: 0,
      },
    ];
  }, []);

  const mergedDemoConversations = useMemo(
    () => [...crmDemoInboxSeeds, ...demoConversationSeeds],
    [crmDemoInboxSeeds, demoConversationSeeds]
  );

  const displayConversations = useMemo(() => {
    const raw = conversations.length > 0 ? conversations : mergedDemoConversations;
    return [...raw].sort((a, b) => {
      const aPinned = pinnedChatIds.has(a.id);
      const bPinned = pinnedChatIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.last_customer_message_at || 0).getTime() - new Date(a.last_customer_message_at || 0).getTime();
    });
  }, [conversations, mergedDemoConversations, pinnedChatIds]);
  /**
   * Badge «Demo» + aviso de pré-visualização: só enquanto não há conversas reais em `whatsapp_conversations`
   * para esta empresa. Some assim que a API (ou realtime) preencher `conversations`.
   */
  const showDemoInboxNotice = useMemo(
    () => !loading && conversations.length === 0,
    [loading, conversations.length]
  );

  const inboxUnreadTotal = useMemo(
    () => displayConversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0),
    [displayConversations]
  );

  const waNotifBannerKind = useMemo(() => getWaNotificationBannerKind(), [notifPrefsTick]);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') setNotifPrefsTick((t) => t + 1);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = composerTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 48), 168)}px`;
  }, [newMessage]);

  useEffect(() => {
    if (!quickShortcutsOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = quickShortcutsRef.current;
      if (el && !el.contains(e.target as Node)) setQuickShortcutsOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [quickShortcutsOpen]);

  useEffect(() => {
    setQuickShortcutsOpen(false);
  }, [selectedChat?.id]);

  useEffect(() => {
    if (!callActionModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCallActionModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [callActionModal]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [headerMenuOpen]);

  useEffect(() => {
    if (!contextMenu && !sidebarMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      // Se clicou no context menu, deixa o evento seguir para os botões internos
      if (contextMenuRef.current && contextMenuRef.current.contains(e.target as Node)) return;
      // Se clicou no sidebar menu, deixa o evento seguir
      if (sidebarMenuRef.current && sidebarMenuRef.current.contains(e.target as Node)) return;
      
      setContextMenu(null);
      setSidebarMenuOpen(false);
    };
    // Usamos mousedown para evitar conflitos de ordem com o onClick dos itens do menu
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('contextmenu', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('contextmenu', onDocClick);
    };
  }, [contextMenu, sidebarMenuOpen]);

  useEffect(() => {
    if (!profile?.company_id) setLoading(false);
  }, [profile?.company_id]);

  /** Sem conversas reais e sem deep link: abre a primeira thread de demo para mostrar o layout completo. */
  useEffect(() => {
    if (loading || conversations.length > 0 || waThread) return;
    setSelectedChat((prev) => prev ?? mergedDemoConversations[0] ?? null);
  }, [loading, conversations.length, mergedDemoConversations, waThread]);

  /** Deep link `/whatsapp/:waThread` — telefone (dígitos) ou UUID de conversa. */
  useEffect(() => {
    if (!waThread || loading) return;
    const decoded = decodeURIComponent(waThread).trim();
    if (!decoded) return;
    const list = conversations.length > 0 ? conversations : mergedDemoConversations;
    const found = findConversationByThreadKey(list, decoded);
    if (found) {
      setSelectedChat(found);
      return;
    }
    if (conversations.length > 0) {
      notifyZaptro(
        'info',
        'WhatsApp',
        'Ainda não há conversa registada neste número no Zaptro. Quando o cliente escrever, a thread aparece aqui com o histórico.'
      );
    }
  }, [waThread, loading, conversations, mergedDemoConversations]);

  /** Ao entrarem conversas reais, trocar seleção de demo pela thread do deep link ou pela primeira real. */
  useEffect(() => {
    if (conversations.length === 0 || !selectedChat) return;
    if (!isZaptroDemoConversationId(selectedChat.id)) return;
    if (waThread) {
      const decoded = decodeURIComponent(waThread).trim();
      const found = decoded ? findConversationByThreadKey(conversations, decoded) : null;
      if (found) {
        setSelectedChat(found);
        return;
      }
    }
    setSelectedChat(conversations[0] ?? null);
  }, [conversations, selectedChat, waThread]);

  // 1. Identificar a sessão ativa da transportadora (Z-API)
  useEffect(() => {
    if (!profile?.company_id) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabaseZaptro
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', profile.company_id)
        .order('full_name', { ascending: true })
        .limit(80);
      if (cancelled || error) return;
      setTeamMembers((data as TeamPick[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) {
      setActiveSession(null);
      setWaGatewayStatus('offline');
      return;
    }

    let cancelled = false;
    setWaGatewayStatus('checking');
    const companyId = profile.company_id;

    const findActiveSession = async () => {
      try {
        const instanceName = `instance_${companyId.substring(0, 8)}`;
        const { data } = await supabaseZaptro.functions.invoke('evolution-gateway', {
          body: { action: 'status', instanceName },
        });
        if (cancelled) return;
        if (data?.connected) {
          setActiveSession(instanceName);
          setWaGatewayStatus('connected');
        } else {
          setActiveSession(null);
          setWaGatewayStatus('offline');
        }
      } catch (e) {
        console.error('Erro ao verificar sessão:', e);
        if (!cancelled) {
          setActiveSession(null);
          setWaGatewayStatus('offline');
        }
      }
    };

    void findActiveSession();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  const fetchConversationsFromDb = useCallback(
    async (opts?: { manageLoading?: boolean }) => {
      if (!profile?.company_id) return;
      try {
        let query = supabaseZaptro
          .from('whatsapp_conversations')
          .select('*')
          .eq('company_id', profile.company_id);

        const role = (profile.role || '').toLowerCase();
        if (role === 'agent' && profile.id) {
          query = query.or(`assigned_to.eq.${profile.id},assigned_to.is.null`);
        }

        const { data, error } = await query.order('last_customer_message_at', { ascending: false });

        if (!error) setConversations(data || []);
      } catch (err) {
        console.error('Erro ao carregar conversas:', err);
      } finally {
        if (opts?.manageLoading) setLoading(false);
      }
    },
    [profile?.company_id, profile?.id, profile?.role],
  );

  // 2. Carregar conversas + realtime da lista
  useEffect(() => {
    if (!profile?.company_id) return;

    void fetchConversationsFromDb({ manageLoading: true });

    const channel = supabaseZaptro
      .channel('whatsapp_realtime_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        void fetchConversationsFromDb({ manageLoading: false });
      })
      .subscribe();

    return () => {
      supabaseZaptro.removeChannel(channel);
    };
  }, [profile?.company_id, profile?.id, profile?.role, fetchConversationsFromDb]);

  const refetchMessagesIfSelected = useCallback(async (conversationId: string) => {
    const sel = selectedChatRef.current;
    if (!sel || sel.id !== conversationId) return;
    if (isZaptroDemoConversationId(sel.id)) return;
    const { data } = await supabaseZaptro
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  }, []);

  // Novas mensagens (entrada): som, notificação do sistema, lista e thread aberta
  useEffect(() => {
    if (!profile?.company_id) return;

    const channel = supabaseZaptro
      .channel(`whatsapp_messages_notify_${profile.company_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const dir = String(row.direction ?? '').toLowerCase();
          if (dir !== 'in') return;
          const convId = String(row.conversation_id ?? '');
          if (!convId) return;
          const preview = String(row.content ?? 'Nova mensagem').slice(0, 140);
          const hit = conversationsRef.current.find((c) => c.id === convId);
          const senderLabel = waInboxContactLabel(hit ?? null);

          playWaIncomingMessageSound();
          showWaDesktopNotificationIfAllowed({
            title: `Nova mensagem — ${senderLabel}`,
            body: preview,
            tag: `zaptro-wa-${String(row.id ?? convId)}`,
          });

          void fetchConversationsFromDb({ manageLoading: false });
          void refetchMessagesIfSelected(convId);
        },
      )
      .subscribe();

    return () => {
      supabaseZaptro.removeChannel(channel);
    };
  }, [profile?.company_id, fetchConversationsFromDb, refetchMessagesIfSelected]);

  // 3. Carregar Mensagens (ou thread de demonstração)
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    if (isZaptroDemoConversationId(selectedChat.id)) {
      setMessages(buildDemoThread(selectedChat.id));
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabaseZaptro
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', selectedChat.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    void fetchMessages();
  }, [selectedChat]);

  useEffect(() => {
    setTransferOpen(false);
    setTransferTargetId('');
  }, [selectedChat?.id]);

  const sendBlocked = useMemo(() => {
    if (!selectedChat || !profile?.id) return false;
    if (lockedChatIds.has(selectedChat.id)) return true; // Forced lock by Admin
    if (isMaster) return false;
    if (isZaptroDemoConversationId(selectedChat.id)) return false;
    const who = selectedChat.assigned_to;
    return !!(who && who !== profile.id);
  }, [selectedChat, profile?.id, isMaster, lockedChatIds]);

  const customerIdleMinutes = useMemo(() => {
    if (!selectedChat) return null;
    if (isZaptroDemoConversationId(selectedChat.id)) {
      return minutesSinceLastPendingCustomerMessage(messages, null);
    }
    return minutesSinceLastPendingCustomerMessage(messages, selectedChat.last_customer_message_at);
  }, [selectedChat, messages]);

  const slaBreached = useMemo(() => {
    if (!selectedChat) return false;
    if (selectedChat.status === 'closed') return false;
    const m = customerIdleMinutes;
    return m !== null && m >= SLA_CUSTOMER_REPLY_MIN;
  }, [selectedChat, customerIdleMinutes]);

  const canUseTransfer = useMemo(() => {
    if (!selectedChat || isZaptroDemoConversationId(selectedChat.id)) return false;
    const admin = isZaptroTenantAdminRole(profile?.role) || isMaster;
    const self = profile?.id && selectedChat.assigned_to === profile.id;
    const free = !selectedChat.assigned_to;
    return admin || self || free;
  }, [selectedChat, profile?.role, profile?.id, isMaster]);

  const assistantHint = useMemo(() => {
    if (slaBreached && customerIdleMinutes != null) {
      return `SLA: última mensagem do cliente há ~${Math.floor(customerIdleMinutes)} min — responde com prazo e próximo passo.`;
    }
    return 'Sugestão: responda com prazo e confirmação de coleta — a IA completa estará ligada ao motor de conversas.';
  }, [slaBreached, customerIdleMinutes]);

  const handleTransferToUser = async () => {
    if (!selectedChat || !transferTargetId || !profile?.company_id) return;
    if (isZaptroDemoConversationId(selectedChat.id)) {
      toastSuccess('Demonstração: conversas fictícias não gravam transferência.');
      setTransferOpen(false);
      return;
    }
    setTransferring(true);
    try {
      const { error } = await supabaseZaptro
        .from('whatsapp_conversations')
        .update({ assigned_to: transferTargetId })
        .eq('id', selectedChat.id)
        .eq('company_id', profile.company_id);
      if (error) throw error;
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedChat.id ? { ...c, assigned_to: transferTargetId } : c))
      );
      setSelectedChat((prev) =>
        prev && prev.id === selectedChat.id ? { ...prev, assigned_to: transferTargetId } : prev
      );
      toastSuccess('Conversa transferida para o colega.');
      setTransferOpen(false);
      setTransferTargetId('');
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'Falha ao transferir.');
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferToDept = async (dept: string) => {
    if (!selectedChat || !profile?.company_id) return;
    setTransferring(true);
    try {
      const { error } = await supabaseZaptro
        .from('whatsapp_conversations')
        .update({ department: dept, assigned_to: null, attendance_status: 'awaiting' })
        .eq('id', selectedChat.id)
        .eq('company_id', profile.company_id);
      if (error) throw error;
      toastSuccess(`Conversa enviada para departamento ${dept}.`);
      setTransferOpen(false);
    } catch (e: any) {
      toastError(e.message || 'Erro ao transferir por departamento.');
    } finally {
      setTransferring(false);
    }
  };

  const handleClaimConversation = async () => {
    if (!selectedChat || !profile?.id || !profile?.company_id) return;
    if (isZaptroDemoConversationId(selectedChat.id)) {
      toastSuccess('Demonstração: Conversa assumida (simulado).');
      setSelectedChat(prev => prev ? { ...prev, assigned_to: profile.id, attendance_status: 'in_service' } : null);
      return;
    }
    setClaiming(true);
    try {
      const { error } = await supabaseZaptro
        .from('whatsapp_conversations')
        .update({ 
          assigned_to: profile.id, 
          attendance_status: 'in_service',
          department: profile.department || null,
          claimed_at: new Date().toISOString()
        })
        .eq('id', selectedChat.id)
        .eq('company_id', profile.company_id);

      if (error) throw error;
      
      notifyZaptro('success', 'Atendimento', `Você assumiu esta conversa.`);
    } catch (e: any) {
      toastError(e.message || 'Falha ao assumir conversa.');
    } finally {
      setClaiming(false);
    }
  };

  const handleInterruptConversation = async () => {
    if (!selectedChat || !profile?.id || !profile?.company_id || !isMaster) return;
    setInterrupting(true);
    try {
      const { error } = await supabaseZaptro
        .from('whatsapp_conversations')
        .update({ 
          assigned_to: profile.id, 
          attendance_status: 'in_service',
          claimed_at: new Date().toISOString()
        })
        .eq('id', selectedChat.id)
        .eq('company_id', profile.company_id);

      if (error) throw error;
      notifyZaptro('warning', 'Interrupção', 'Você assumiu o controle deste atendimento.');
    } catch (e: any) {
      toastError(e.message || 'Falha ao interromper.');
    } finally {
      setInterrupting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    let text = newMessage.trim();

    // Auto-identificação se for a primeira mensagem do atendente ou se não houver mensagens recentes da equipe
    const isFirstAgentMessage = messages.filter(m => m.direction === 'out').length === 0;
    if (isFirstAgentMessage) {
      const deptLabel = profile?.department ? ` — ${profile.department}` : '';
      const intro = `Atendente ${profile?.full_name || 'Zaptro'}${deptLabel}:\n\n`;
      text = intro + text;
    }

    setSending(true);

    if (!isZaptroDemoConversationId(selectedChat.id) && !isMaster) {
      const who = selectedChat.assigned_to;
      if (who && profile?.id && who !== profile.id) {
        toastError('Conversa atribuída a outro agente. Usa «Atribuir responsável a mim» antes de enviar.');
        return;
      }
    }

    if (isZaptroDemoConversationId(selectedChat.id)) {
      setNewMessage('');
      setMessages((m) => [
        ...m,
        {
          id: `zaptro-demo-local-${Date.now()}`,
          content: text,
          direction: 'out',
          created_at: new Date().toISOString(),
        },
      ]);
      toastSuccess('Demonstração: mensagem não enviada ao WhatsApp.');
      return;
    }

    if (!profile?.company_id) return;

    setNewMessage('');
    setSending(true);

    try {
      const instanceName = profile?.company_id ? `instance_${profile.company_id.substring(0, 8)}` : 'default';
      const { data, error } = await supabaseZaptro.functions.invoke('evolution-gateway', {
        body: { 
          action: 'send-message',
          number: selectedChat.sender_number,
          text: text,
          instanceName: instanceName
        }
      });

      if (error || !data.success) throw new Error(error?.message || data.error || 'Erro no envio');
      toastSuccess('Mensagem enviada!');
    } catch (error: any) {
      toastError(error.message || 'Falha ao enviar.');
    } finally {
      setSending(false);
    }
  };

  const handleSelectChat = useCallback(async (chat: Conversation) => {
    setSelectedChat(chat);
    setNewMessage('');
    setReadSessionIds(prev => {
      const next = new Set(prev);
      next.add(chat.id);
      return next;
    });
    setUnreadForcedIds(prev => {
      const next = new Set(prev);
      next.delete(chat.id);
      return next;
    });

    setSearchInsideOpen(false);
    setSearchInsideTerm('');
    setSelectionMode(false);
    setSelectedMessageIds(new Set());

    // Mark as read in local state list
    setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c));

    // Mark as read in database
    if (!isZaptroDemoConversationId(chat.id) && profile?.company_id) {
      void supabaseZaptro
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', chat.id)
        .eq('company_id', profile.company_id);
    }

    if (chat.sender_number) {
      navigate(`${ZAPTRO_ROUTES.CHAT}/${onlyDigits(chat.sender_number) || chat.id}`);
    }
  }, [navigate, profile?.company_id]);

  const startRecording = async () => {
    // 1. Check permission status before requesting
    try {
      const permResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      if (permResult.state === 'denied') {
        notifyZaptro('error', '🎤 Microfone bloqueado', 'O acesso ao microfone foi negado. Clique no cadeado 🔒 na barra do navegador e permita o microfone.');
        return;
      }

      if (permResult.state === 'prompt') {
        notifyZaptro('info', '🎤 Permissão necessária', 'O navegador vai pedir acesso ao microfone. Clique em "Permitir" para continuar.');
      }
    } catch {
      // Alguns browsers não suportam permissions.query — continuar normalmente
    }

    // 2. Request actual stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        handleSendAudioMessage(audioUrl, recordingDuration);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        notifyZaptro('error', '🎤 Permissão negada', 'Acesso ao microfone bloqueado. Clique no cadeado 🔒 na barra de endereço e selecione "Permitir".');
      } else if (name === 'NotFoundError') {
        notifyZaptro('error', '🎤 Microfone não encontrado', 'Nenhum microfone detectado. Conecte um e tente novamente.');
      } else {
        notifyZaptro('error', '🎤 Microfone', 'Não foi possível iniciar a gravação. Tente novamente.');
      }
      console.error('Falha ao acessar microfone:', err);
    }
  };


  const stopRecording = () => {
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
      // Limpa os chunks para não enviar
      audioChunksRef.current = [];
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleSendAudioMessage = (url: string, duration: number) => {
    if (!selectedChat) return;

    const newMsg: Message = {
      id: `audio-${Date.now()}`,
      content: 'Áudio',
      type: 'audio',
      audio_url: url,
      duration: duration,
      direction: 'out',
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    notifyZaptro('success', 'WhatsApp', 'Mensagem de voz enviada.');
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMessageSelection = useCallback((id: string) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (!searchInsideTerm) return true;
      return m.content.toLowerCase().includes(searchInsideTerm.toLowerCase());
    });
  }, [messages, searchInsideTerm]);

  const handleSaveNewContact = async () => {
    if (!profile?.company_id) return;
    if (!newContactForm.name || !newContactForm.phone) {
      notifyZaptro('warning', 'Dados incompletos', 'Nome e WhatsApp são obrigatórios para o cadastro.');
      return;
    }

    try {
      const { data, error } = await supabaseZaptro
        .from('whatsapp_conversations')
        .insert({
          company_id: profile.company_id,
          sender_name: newContactForm.name,
          sender_number: newContactForm.phone,
          status: 'open',
          metadata: {
            cnpj: newContactForm.cnpj,
            company_name: newContactForm.companyName,
            segment_wa: newContactForm.segmentWa,
            segment_company: newContactForm.segmentCompany,
            email: newContactForm.email,
            address: newContactForm.address,
            created_manually: true,
            source: 'whatsapp_premium_popup'
          }
        })
        .select()
        .single();

      if (error) throw error;

      notifyZaptro('success', 'CRM Zaptro', 'Contato cadastrado com sucesso e sincronizado com o CRM.');
      setNewContactModalOpen(false);
      setNewContactForm({
        name: '',
        phone: '',
        cnpj: '',
        companyName: '',
        segmentWa: '',
        segmentCompany: '',
        email: '',
        address: ''
      });
      
      if (data) {
        handleSelectChat(data as any);
      }
    } catch (err: any) {
      console.error('Erro ao salvar contato:', err);
      notifyZaptro('error', 'Falha no cadastro', err.message || 'Não foi possível salvar o contato no CRM.');
    }
  };

  const getDisplayName = (chat: Conversation | null) => {
    if (!chat) return 'Contato';
    return chat.sender_name || chat.sender_number || 'Novo Contato';
  };

  const filteredInboxList = useMemo(() => {
    let list = displayConversations;
    // Exclude archived
    list = list.filter(c => !archivedChatIds.has(c.id));

    if (waInboxFilter === 'unread') {
      list = list.filter((c) => ((c.unread_count ?? 0) > 0 || unreadForcedIds.has(c.id)) && !readSessionIds.has(c.id));
    } else if (waInboxFilter === 'starred') {
      list = list.filter((c) => starredChatIds.has(c.id));
    } else if (waInboxFilter === 'groups') {
      list = list.filter((c) => c.is_group === true);
    } else if (waInboxFilter === 'billing') {
      list = list.filter((c) => 
        (c.last_message || '').toLowerCase().includes('boleto') ||
        (c.last_message || '').toLowerCase().includes('pagamento') ||
        (c.last_message || '').toLowerCase().includes('cobrança') ||
        (c.tags || []).some(t => t.toLowerCase() === 'financeiro')
      );
    }
    const q = waSearchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        (c.sender_name || c.sender_number || 'Novo Contato').toLowerCase().includes(q)
      );
    }
    return list;
  }, [displayConversations, waInboxFilter, starredChatIds, waSearchTerm, archivedChatIds, unreadForcedIds, readSessionIds]);

  const toggleInboxStar = useCallback((id: string) => {
    setStarredChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistInboxStarred(next);
      return next;
    });
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedChatIds((prev) => {
      const next = new Set(prev);
      const isPinned = next.has(id);
      if (isPinned) next.delete(id);
      else next.add(id);
      notifyZaptro('success', 'WhatsApp', isPinned ? 'Conversa desafixada.' : 'Conversa fixada no topo.');
      return next;
    });
  }, []);

  const archiveChat = useCallback((id: string) => {
    setArchivedChatIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    notifyZaptro('success', 'WhatsApp', 'Conversa arquivada.');
  }, []);

  const toggleUnread = useCallback((id: string) => {
    setUnreadForcedIds(prev => {
      const next = new Set(prev);
      const isUnread = next.has(id);
      if (isUnread) next.delete(id);
      else next.add(id);
      notifyZaptro('success', 'WhatsApp', isUnread ? 'Marcada como lida.' : 'Marcada como não lida.');
      return next;
    });
  }, []);

  const toggleLock = useCallback((id: string) => {
    setLockedChatIds(prev => {
      const next = new Set(prev);
      const isLocked = next.has(id);
      if (isLocked) next.delete(id);
      else next.add(id);
      notifyZaptro('success', 'WhatsApp', isLocked ? 'Conversa desbloqueada.' : 'Conversa bloqueada.');
      return next;
    });
  }, []);

  const renderAvatar = (chat: Conversation, variant: 'list' | 'header' | 'panel') => {
    const label = (getDisplayName(chat)[0] || 'C').toUpperCase();
    const url = chat.customer_avatar?.trim();
    const box =
      variant === 'list'
        ? { width: 52, height: 52, borderRadius: 18, flexShrink: 0 as const, boxSizing: 'border-box' as const }
        : variant === 'header'
          ? { width: 48, height: 48, borderRadius: 16, flexShrink: 0 as const, boxSizing: 'border-box' as const }
          : {
              width: 72,
              height: 72,
              borderRadius: 22,
              margin: '0 auto' as const,
              flexShrink: 0 as const,
              boxSizing: 'border-box' as const,
            };
    if (url) {
      return (
        <div style={{ ...box, overflow: 'hidden', border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e4e4e7'}`, backgroundColor: '#0f172a' }}>
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      );
    }
    const fontSize = variant === 'panel' ? 28 : variant === 'header' ? 18 : 17;
    return (
      <div
        style={{
          ...box,
          backgroundColor: '#000',
          color: '#D9FF00',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize,
          border: `1px solid ${palette.mode === 'dark' ? 'rgba(217,255,0,0.2)' : 'transparent'}`,
          boxSizing: 'border-box',
        }}
      >
        {label}
      </div>
    );
  };

  const cargoPhaseFor = (chatId: string): CargoPhase => cargoPhaseByChat[chatId] ?? 'transito';

  const setCargoPhaseForChat = (chatId: string, phase: CargoPhase) => {
    setCargoPhaseByChat((prev) => ({ ...prev, [chatId]: phase }));
    persistConversationCargoPhase(chatId, phase);
  };

  const handleUpdateCargoStatus = () => {
    if (!selectedChat) return;
    const phase = cargoPhaseFor(selectedChat.id);
    const row = markConversationCargoSynced(selectedChat.id);
    const when = row.syncedAt
      ? new Date(row.syncedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      : '';
    toastSuccess(
      `Status «${CARGO_PHASE_LABEL[phase]}» confirmado nesta conversa${when ? ` (${when})` : ''}. Persistido localmente até ligar ao servidor.`
    );
  };

  const openNotaFiscalFromChat = () => {
    if (!selectedChat) return;
    if (nfeIntegrations.length === 0) {
      notifyZaptro(
        'info',
        'Nota fiscal',
        'Ligue um provedor de NF-e em Configurações → Integrações API. Vamos abrir essa página.'
      );
      navigate('/configuracao?tab=api');
      return;
    }
    const api = nfeIntegrations[0];
    let url: URL;
    try {
      url = new URL(api.baseUrl);
    } catch {
      notifyZaptro('error', 'Nota fiscal', 'URL da integração inválida. Corrija em Configurações → Integrações API.');
      navigate('/configuracao?tab=api');
      return;
    }
    url.searchParams.set('zaptro_from', 'whatsapp');
    url.searchParams.set('conversation_id', selectedChat.id);
    url.searchParams.set('customer_hint', getDisplayName(selectedChat).slice(0, 120));
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
    toastSuccess(`${api.name}: portal aberto com referência a esta conversa (parâmetros na URL).`);
  };

  const updateAtMenuFromCaret = useCallback((value: string, caret: number) => {
    const slice = value.slice(0, caret);
    const at = slice.lastIndexOf('@');
    if (at === -1) {
      setAtMenu(null);
      return;
    }
    const after = slice.slice(at + 1);
    if (/\s/.test(after)) {
      setAtMenu(null);
      return;
    }
    setAtMenu({ start: at, filter: after.toLowerCase() });
  }, []);

  const handleQuickChip = (label: WaQuickChipLabel) => {
    if (!selectedChat) return;
    if (label === 'Nova carga') {
      notifyZaptro('success', 'Nova carga', 'A abrir Rotas — cria a rota e associa o contacto ao cliente desta conversa.');
      navigate(ZAPTRO_ROUTES.ROUTES);
      return;
    }
    if (label === 'Orçamento') {
      notifyZaptro('info', 'Orçamento', 'No CRM escolhe o lead do cliente e gera o link público de orçamento.');
      navigate(ZAPTRO_ROUTES.COMMERCIAL_CRM);
      return;
    }
    if (sendBlocked) {
      notifyZaptro('info', label, 'Atribui a conversa a ti para usar o campo de mensagem.');
      return;
    }
    if (label === 'Comprovante') {
      setNewMessage(
        (prev) =>
          `${prev ? `${prev.trim()}\n\n` : ''}Segue o comprovante / documento em anexo. Qualquer dúvida, estamos à disposição.`,
      );
      notifyZaptro('success', 'Comprovante', 'Texto modelo inserido no campo de mensagem — anexa o PDF antes de enviar.');
      return;
    }
    if (label === 'Localização') {
      setNewMessage(
        (prev) =>
          `${prev ? `${prev.trim()}\n\n` : ''}Segue o link de acompanhamento da carga em tempo real: `,
      );
      notifyZaptro('success', 'Localização', 'Texto modelo inserido — completa com o link público da rota quando existir.');
    }
  };

  const consumeAtTokenThenChip = (label: WaQuickChipLabel) => {
    setNewMessage((prev) => {
      const ta = composerTextareaRef.current;
      const caret = ta?.selectionStart ?? prev.length;
      const slice = prev.slice(0, caret);
      const at = slice.lastIndexOf('@');
      if (at < 0) return prev;
      return prev.slice(0, at) + prev.slice(caret);
    });
    setAtMenu(null);
    queueMicrotask(() => {
      handleQuickChip(label);
      composerTextareaRef.current?.focus();
    });
  };

  const waAtFiltered = useMemo(() => {
    if (!atMenu) return [] as typeof WA_AT_SHORTCUTS;
    const f = atMenu.filter;
    const rows = WA_AT_SHORTCUTS.filter(
      (x) =>
        !f ||
        x.token.startsWith(f) ||
        x.hint.toLowerCase().includes(f) ||
        x.label.toLowerCase().includes(f),
    );
    const byLabel = new Map<WaQuickChipLabel, (typeof WA_AT_SHORTCUTS)[number]>();
    for (const r of rows) {
      if (!byLabel.has(r.label)) byLabel.set(r.label, r);
    }
    return Array.from(byLabel.values());
  }, [atMenu]);

  const handleAssignResponsible = async () => {
    if (!selectedChat) return;
    const selfName = profile?.full_name?.trim() || profile?.email || 'Utilizador actual';

    if (isZaptroDemoConversationId(selectedChat.id)) {
      toastSuccess(`Demonstração: ${selfName} ficou como responsável por esta conversa.`);
      notifyZaptro('success', 'Responsável', 'Nesta demo o estado fica neste browser — em produção grava-se na base.');
      return;
    }

    if (!profile?.id || !profile.company_id) {
      toastError('Inicie sessão com uma empresa Zaptro para atribuir conversas reais.');
      return;
    }

    if (selectedChat.assigned_to === profile.id) {
      notifyZaptro('info', 'Responsável', 'Esta conversa já está atribuída a ti. Podes responder normalmente.');
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabaseZaptro
        .from('whatsapp_conversations')
        .update({ assigned_to: profile.id })
        .eq('id', selectedChat.id)
        .eq('company_id', profile.company_id);

      if (error) throw error;

      setConversations((prev) =>
        prev.map((c) => (c.id === selectedChat.id ? { ...c, assigned_to: profile.id } : c))
      );
      setSelectedChat((prev) =>
        prev && prev.id === selectedChat.id ? { ...prev, assigned_to: profile.id } : prev
      );
      toastSuccess('Responsável atribuído. A conversa aparece na sua caixa de entrada.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao atribuir responsável.';
      toastError(msg);
    } finally {
      setAssigning(false);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isDark = palette.mode === 'dark';
  const border = palette.sidebarBorder;
  const softBg = isDark ? 'rgba(255,255,255,0.04)' : ZAPTRO_FIELD_BG;
  const text = palette.text;
  const sub = palette.textMuted;
  const activeCargo = selectedChat ? cargoPhaseFor(selectedChat.id) : 'transito';
  const pillOn = (key: CargoPhase) =>
    activeCargo === key
      ? { backgroundColor: '#D9FF00', color: '#000', borderColor: '#D9FF00' }
      : { backgroundColor: 'transparent', color: palette.textMuted, borderColor: border };

  const shellStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    borderRadius: 20,
    border: `1px solid ${border}`,
    overflow: 'hidden',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    boxShadow:
      palette.mode === 'dark'
        ? '0 0 0 1px rgba(255,255,255,0.06), 0 18px 40px rgba(0,0,0,0.45)'
        : '0 1px 2px rgba(15,23,42,0.05), 0 12px 32px rgba(15,23,42,0.06)',
    backgroundColor: isDark ? 'rgba(13, 13, 13, 0.98)' : '#ffffff',
  };

  const callModalName = selectedChat ? getDisplayName(selectedChat) : '';
  const callModalPhone = selectedChat?.sender_number?.trim() || '—';
  const callModalDigits = (selectedChat && selectedChat.sender_number) ? digitsForTel(selectedChat.sender_number) : '';

  return (
    <ZaptroLayout
      contentFullWidth
    >
      <>
      <style>{`
        @keyframes zaptroWaConnectDot {
          0%, 80%, 100% { transform: translateY(0) scale(0.75); opacity: 0.35; }
          40% { transform: translateY(-3px) scale(1); opacity: 1; }
        }
        @keyframes zaptroWaConnectBar {
          0% { transform: translateX(-100%); opacity: 0.5; }
          100% { transform: translateX(250%); opacity: 1; }
        }
      `}</style>
    <div style={shellStyle}>
      {/* NOVA CONVERSA PANEL (DRAWER) - FULL SIDEBAR COVER (TOP TO BOTTOM) */}
      {newChatPanelOpen && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 400, // Exactly the sidebar width
          backgroundColor: palette.sidebarBg,
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          animation: 'zaptroSlideInLeft 0.25s ease-out',
          borderRight: `1px solid ${border}`
        }}>
          <div style={{ padding: '24px 30px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <button
              onClick={() => setNewChatPanelOpen(false)}
              style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer', padding: 0 }}
            >
              <Navigation size={22} style={{ transform: 'rotate(-90deg)' }} />
            </button>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: palette.text, flex: 1 }}>Nova conversa</h2>
            <button
              onClick={() => setNewChatPanelOpen(false)}
              style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer', padding: 4 }}
            >
              <X size={22} />
            </button>
          </div>
          
          <div style={{ padding: '0 30px 20px' }}>
            <div
              style={{
                ...styles.searchBox,
                backgroundColor: palette.mode === 'dark' ? '#202124' : '#f1f5f9',
                border: `1px solid ${border}`,
                padding: '2px 14px',
                borderRadius: 14,
              }}
            >
              <Search size={18} color={palette.textMuted} />
              <input
                type="text"
                placeholder="Pesquisar nome ou número..."
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                autoFocus
                style={{ ...styles.searchInput, color: palette.text }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '8px 0' }}>
              <button 
                style={{
                  ...styles.newChatOption,
                  backgroundColor: LIME,
                  margin: '0 30px',
                  width: 'calc(100% - 60px)',
                  borderRadius: 16,
                  padding: '16px 24px',
                  boxShadow: '0 4px 12px rgba(217, 255, 0, 0.2)'
                }}
                onClick={() => {
                  setNewContactModalOpen(true);
                  setNewChatPanelOpen(false);
                }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.95)')}
                onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
              >
                <div style={{ ...styles.newChatIconWrap, backgroundColor: '#000', border: 'none' }}><UserPlus size={22} color={LIME} /></div>
                <span style={{ fontWeight: 800, color: '#000', fontSize: 16 }}>Novo contato</span>
              </button>
            </div>

            <div style={{ padding: '20px 30px 10px', fontSize: 11, fontWeight: 700, color: palette.lime, textTransform: 'uppercase' }}>
              Contatos frequentes
            </div>

            {mergedDemoConversations.filter(c => 
              !newChatSearch || getDisplayName(c).toLowerCase().includes(newChatSearch.toLowerCase())
            ).map(chat => (
              <div
                key={chat.id}
                onClick={() => {
                  handleSelectChat(chat);
                  setNewChatPanelOpen(false);
                }}
                style={{ ...styles.chatItem, borderBottom: 'none' }}
              >
                <div style={styles.avatarWrap}>
                  <img src={chat.customer_avatar || `https://picsum.photos/seed/${chat.id}/64/64`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                </div>
                <div style={styles.itemMain}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: palette.text }}>{getDisplayName(chat)}</span>
                  <p style={{ ...styles.itemPreview, marginTop: 2 }}>{chat.sender_number || 'Contacto frequente'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...styles.container, flex: 1, minHeight: 0 }}>
        {/* 1. SIDEBAR (Lista de Conversas) */}
        <div style={{ ...styles.sidebar, borderRight: `1px solid ${border}`, backgroundColor: palette.sidebarBg, position: 'relative' }}>

        <div style={styles.sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: palette.text }}>Mensagens</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={styles.liveIndicator}>
                <div style={styles.liveDot} />
                LIVE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  title="Nova conversa"
                  onClick={() => setNewChatPanelOpen(true)}
                  style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                >
                  <MessageSquarePlus size={22} strokeWidth={2} />
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    title="Mais opções"
                    onClick={(e) => { e.stopPropagation(); setSidebarMenuOpen(!sidebarMenuOpen); }}
                    style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                  >
                    <MoreVertical size={22} strokeWidth={2} />
                  </button>
                  {sidebarMenuOpen && (
                    <div 
                      ref={sidebarMenuRef}
                      style={{
                        position: 'absolute',
                      top: '100%',
                      right: 0,
                      width: 260,
                      backgroundColor: isDark ? '#1E1E1E' : '#fff',
                      borderRadius: 14,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      padding: '8px 0',
                      zIndex: 200,
                      border: `1px solid ${border}`,
                      marginTop: 8
                    }}>
                      {[
                        { 
                          icon: FileText, 
                          label: 'Cobranças', 
                          onClick: () => { setWaInboxFilter('billing'); setSidebarMenuOpen(false); } 
                        },
                        { 
                          icon: Zap, 
                          label: 'Respostas rápidas', 
                          onClick: () => { navigate('/configuracao?tab=automation'); setSidebarMenuOpen(false); } 
                        },
                        { 
                          icon: Star, 
                          label: 'Mensagens favoritas', 
                          onClick: () => { setWaInboxFilter('starred'); setSidebarMenuOpen(false); } 
                        },
                        { 
                          icon: CheckSquare, 
                          label: 'Selecionar conversas',
                          onClick: () => { setMassSelectionMode(true); setMassSelectedChatIds(new Set()); setSidebarMenuOpen(false); }
                        },
                        { 
                          icon: Tag, 
                          label: 'Etiquetas',
                          onClick: () => { notifyZaptro('info', 'Etiquetas', 'Selecione as conversas para aplicar etiquetas.'); setSidebarMenuOpen(false); }
                        },
                        { 
                          icon: CheckCheck, 
                          label: 'Marcar todas como lidas',
                          onClick: () => {
                            setConversations(prev => prev.map(c => ({ ...c, unread_count: 0 })));
                            setReadSessionIds(new Set(conversations.map(c => c.id)));
                            if (profile?.company_id) {
                              void supabaseZaptro
                                .from('whatsapp_conversations')
                                .update({ unread_count: 0 })
                                .eq('company_id', profile.company_id);
                            }
                            notifyZaptro('success', 'WhatsApp', 'Todas as conversas marcadas como lidas.');
                            setSidebarMenuOpen(false);
                          }
                        },
                        { 
                          icon: selectedChat && lockedChatIds.has(selectedChat.id) ? Unlock : Lock, 
                          label: selectedChat && lockedChatIds.has(selectedChat.id) ? 'Desbloquear conversa' : 'Bloqueio do app',
                          onClick: () => {
                            if (selectedChat) {
                              toggleLock(selectedChat.id);
                              const isLocked = lockedChatIds.has(selectedChat.id);
                              notifyZaptro(isLocked ? 'info' : 'warning', 'Bloqueio', `${isLocked ? 'Desbloqueado' : 'Bloqueado'}: ${getDisplayName(selectedChat)}`);
                            } else {
                              notifyZaptro('info', 'Bloqueio', 'Selecione uma conversa para bloquear.');
                            }
                            setSidebarMenuOpen(false);
                          }
                        },
                        { 
                          icon: LogOut, 
                          label: 'Desconectar', 
                          color: '#ff4d4f', 
                          onClick: () => {
                            if (!isMaster && !isZaptroTenantAdminRole(profile?.role)) {
                              notifyZaptro('error', 'Acesso Negado', 'Apenas administradores podem desconectar o WhatsApp.');
                            } else {
                              if (confirm('Deseja desconectar este WhatsApp para conectar outro?')) {
                                notifyZaptro('warning', 'WhatsApp', 'Desconectando instância...');
                              }
                            }
                            setSidebarMenuOpen(false);
                          }
                        },
                      ].map((item, idx) => (
                        (!item.adminOnly || isMaster) && (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              item.onClick?.();
                              setSidebarMenuOpen(false);
                              if (!item.onClick) notifyZaptro('info', 'WhatsApp', `Ação "${item.label}" em desenvolvimento.`);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 18px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              border: 'none',
                              background: 'transparent',
                              color: item.color || palette.text,
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {item.icon && <item.icon size={18} color={item.color || palette.textMuted} />}
                            {item.label}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              ...styles.searchBox,
              backgroundColor: palette.mode === 'dark' ? '#202124' : '#f1f5f9',
              border: `1px solid ${border}`,
              padding: '2px 14px',
              borderRadius: 14,
            }}
          >
            <Search size={18} color={palette.textMuted} />
            <input
              type="text"
              placeholder="Pesquisar conversas..."
              value={waSearchTerm}
              onChange={(e) => setWaSearchTerm(e.target.value)}
              style={{ ...styles.searchInput, color: palette.text }}
            />
          </div>
        </div>

        {/* FILTROS (STICKY) */}
        <div
          role="tablist"
          aria-label="Filtro da lista de conversas"
          style={{
            padding: '12px 30px',
            display: massSelectionMode ? 'none' : 'flex',
            flexWrap: 'wrap',
            gap: 8,
            position: 'sticky',
            top: 0,
            backgroundColor: palette.sidebarBg,
            zIndex: 10,
            boxSizing: 'border-box',
            borderBottom: `1px solid ${border}`
          }}
        >
          {(
            [
              { id: 'all' as const, label: 'Tudo' },
              { id: 'unread' as const, label: 'Não lidas' },
              { id: 'starred' as const, label: 'Favoritas' },
              { id: 'groups' as const, label: 'Grupos' },
              { id: 'billing' as const, label: 'Cobranças' },
            ] as const
          ).map(({ id, label }) => {
            const on = waInboxFilter === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setWaInboxFilter(id)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 16,
                  border: on ? 'none' : `1px solid ${border}`,
                  backgroundColor: on ? '#000' : 'transparent',
                  color: on ? LIME : palette.text,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {massSelectionMode && (
          <div style={{ 
            backgroundColor: palette.mode === 'dark' ? '#202c33' : '#f0f2f5',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button 
                onClick={() => setMassSelectionMode(false)}
                style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>{massSelectedChatIds.size} selecionadas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button title="Arquivar" onClick={() => notifyZaptro('info', 'WhatsApp', 'Conversas arquivadas.')} style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer' }}><Archive size={18} /></button>
              <button title="Favoritar" onClick={() => notifyZaptro('info', 'WhatsApp', 'Conversas favoritadas.')} style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer' }}><Star size={18} /></button>
              <button title="Apagar" onClick={() => notifyZaptro('danger', 'WhatsApp', 'Conversas apagadas.')} style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
            </div>
          </div>
        )}

        {/* LISTA DE CONVERSAS */}
        <div style={{ ...styles.chatList }}>
          {loading ? (
            <div style={{ padding: '40px 30px', textAlign: 'center' }}>
              <Clock className="spin" size={24} color={LIME} />
            </div>
          ) : filteredInboxList.length === 0 ? (
            <div style={{ padding: '40px 30px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: palette.textMuted, fontWeight: 700 }}>Nenhuma conversa encontrada.</p>
            </div>
          ) : (
            filteredInboxList.map((chat) => {
              const isUnread = ((chat.unread_count ?? 0) > 0 || unreadForcedIds.has(chat.id)) && !readSessionIds.has(chat.id);
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    if (massSelectionMode) {
                      const next = new Set(massSelectedChatIds);
                      if (next.has(chat.id)) next.delete(chat.id);
                      else next.add(chat.id);
                      setMassSelectedChatIds(next);
                    } else {
                      handleSelectChat(chat);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, chat });
                  }}
                  style={{
                    ...styles.chatItem,
                    backgroundColor: massSelectedChatIds.has(chat.id) ? (palette.mode === 'dark' ? '#2b3941' : '#e2e8f0') : (selectedChat?.id === chat.id ? softBg : 'transparent'),
                    borderBottom: `1px solid ${border}`,
                    transition: 'background 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {massSelectionMode && (
                    <div style={{ marginRight: 12 }}>
                      <input 
                        type="checkbox" 
                        checked={massSelectedChatIds.has(chat.id)} 
                        onChange={() => {}} 
                        style={{ cursor: 'pointer', accentColor: LIME }} 
                      />
                    </div>
                  )}
                  <div style={styles.avatarWrap}>
                    <img
                      alt=""
                      src={chat.customer_avatar || `https://picsum.photos/seed/${chat.id}/64/64`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={styles.itemMain}>
                    <div style={styles.itemHeader}>
                      <span style={{ 
                        ...styles.itemName, 
                        color: palette.text,
                        fontWeight: isUnread ? 800 : 700,
                        fontSize: 15
                      }}>
                        {getDisplayName(chat)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        title={starredChatIds.has(chat.id) ? 'Remover dos favoritos' : 'Favoritar conversa'}
                        aria-pressed={starredChatIds.has(chat.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleInboxStar(chat.id);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 4,
                          margin: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 8,
                          color: starredChatIds.has(chat.id) ? palette.lime : palette.textMuted,
                        }}
                      >
                        <Star size={15} strokeWidth={2} fill={starredChatIds.has(chat.id) ? 'currentColor' : 'none'} />
                      </button>
                      <span style={styles.itemTime}>{formatTime(chat.last_customer_message_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ ...styles.itemPreview, flex: 1 }}>{chat.last_message || 'Nenhuma mensagem'}</p>
                    {isUnread && (
                      <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: LIME,
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 900,
                        flexShrink: 0,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {chat.unread_count || 1}
                      </div>
                    )}
                    {chat.assigned_to && (
                      <span style={{ 
                        fontSize: 9, 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        color: palette.lime, 
                        backgroundColor: '#000', 
                        padding: '2px 6px', 
                        borderRadius: 4,
                        whiteSpace: 'nowrap'
                      }}>
                        Em Atendimento
                      </span>
                    )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

              <div style={styles.centerColumn}>
        {selectedChat ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              width: '100%',
              backgroundColor: palette.mode === 'dark' ? '#0b141a' : '#efeae2',
              position: 'relative'
            }}
          >
            {/* CHAT HEADER */}
            <div style={{ ...styles.chatHeader, borderBottom: `1px solid ${border}`, backgroundColor: palette.sidebarBg }}>
              <div 
                style={{ ...styles.headerProfile, cursor: 'pointer' }}
                onClick={() => setShowRightPanel(true)}
              >
                {renderAvatar(selectedChat, 'header')}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ ...styles.activeName, color: palette.text, fontSize: 18, marginBottom: 2 }}>{getDisplayName(selectedChat)}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'rgba(75, 231, 8, 1)' }} />
                    <span style={styles.onlinePill}>online agora</span>
                  </div>
                </div>
              </div>

              {searchInsideOpen ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search 
                      size={16} 
                      color={palette.textMuted} 
                      style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} 
                    />
                    <input
                      autoFocus
                      placeholder="Pesquisar na conversa..."
                      value={searchInsideTerm}
                      onChange={(e) => setSearchInsideTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 16px 10px 42px',
                        borderRadius: 12,
                        border: 'none',
                        backgroundColor: palette.mode === 'dark' ? '#202c33' : '#f0f2f5',
                        color: palette.text,
                        fontSize: 14,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => { setSearchInsideOpen(false); setSearchInsideTerm(''); }}
                    style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    Fechar
                  </button>
                </div>
              ) : selectionMode ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button 
                      onClick={() => setSelectionMode(false)}
                      style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer' }}
                    >
                      <X size={20} />
                    </button>
                    <span style={{ fontSize: 16, fontWeight: 700, color: palette.text }}>{selectedMessageIds.size} selecionadas</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button 
                      title="Favoritar"
                      onClick={() => notifyZaptro('info', 'WhatsApp', 'Mensagens favoritadas.')}
                      style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer' }}
                    >
                      <Star size={20} />
                    </button>
                    <button 
                      title="Compartilhar"
                      onClick={() => notifyZaptro('info', 'WhatsApp', 'Link de compartilhamento gerado.')}
                      style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer' }}
                    >
                      <Share size={20} />
                    </button>
                    <button 
                      title="Apagar"
                      onClick={() => {
                        setMessages(prev => prev.filter(m => !selectedMessageIds.has(m.id)));
                        setSelectedMessageIds(new Set());
                        setSelectionMode(false);
                        notifyZaptro('success', 'WhatsApp', 'Mensagens apagadas.');
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  style={{ ...styles.iconRound, borderColor: border, color: palette.text }}
                  onClick={() => setCallActionModal('voice')}
                >
                  <Phone size={18} />
                </button>
                <button
                  type="button"
                  style={{ ...styles.iconRound, borderColor: border, color: palette.text }}
                  onClick={() => setCallActionModal('video')}
                >
                  <Video size={18} />
                </button>
                <div style={{ position: 'relative' }} ref={headerMenuRef}>
                  <button
                    type="button"
                    style={{ ...styles.iconRound, borderColor: border, color: palette.text }}
                    onClick={() => setHeaderMenuOpen((v) => !v)}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {headerMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 8,
                      width: 220,
                      backgroundColor: palette.mode === 'dark' ? '#233138' : '#fff',
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      padding: '8px 0',
                      zIndex: 1000,
                      border: `1px solid ${border}`
                    }}>
                      {[
                        { icon: Info, label: 'Dados do contato', onClick: () => { setShowRightPanel(true); setHeaderMenuOpen(false); } },
                        { icon: Search, label: 'Pesquisar', onClick: () => { setSearchInsideOpen(true); setHeaderMenuOpen(false); } },
                        { icon: CheckSquare, label: 'Selecionar mensagens', onClick: () => { setSelectionMode(true); setSelectedMessageIds(new Set()); setHeaderMenuOpen(false); } },
                        { 
                          icon: Clock, 
                          label: tempMessagesEnabled ? 'Desativar mensagens temporárias' : 'Mensagens temporárias', 
                          onClick: () => { setTempMessagesEnabled(!tempMessagesEnabled); setHeaderMenuOpen(false); notifyZaptro('info', 'WhatsApp', tempMessagesEnabled ? 'Mensagens temporárias desativadas.' : 'Mensagens temporárias ativadas (24h).'); } 
                        },
                        { icon: XCircle, label: 'Fechar conversa', onClick: () => { setSelectedChat(null); setHeaderMenuOpen(false); } },
                        { divider: true },
                        { 
                          icon: MinusCircle, 
                          label: 'Limpar conversa', 
                          onClick: () => { 
                            if (confirm('Deseja limpar todas as mensagens desta conversa?')) {
                              setMessages([]);
                              setHeaderMenuOpen(false);
                              notifyZaptro('success', 'WhatsApp', 'Conversa limpa.');
                            }
                          } 
                        },
                        { 
                          icon: Trash2, 
                          label: 'Apagar conversa', 
                          onClick: () => { 
                            if (confirm('Deseja apagar esta conversa permanentemente?')) {
                              setConversations(prev => prev.filter(c => c.id !== selectedChat.id));
                              setSelectedChat(null);
                              setHeaderMenuOpen(false);
                              notifyZaptro('success', 'WhatsApp', 'Conversa apagada.');
                            }
                          } 
                        },
                      ].map((item, idx) => (
                        item.divider ? (
                          <div key={idx} style={{ height: 1, backgroundColor: border, margin: '8px 0' }} />
                        ) : (
                          <button
                            key={idx}
                            onClick={item.onClick}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              border: 'none',
                              background: 'transparent',
                              color: palette.text,
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = palette.mode === 'dark' ? '#111b21' : '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {item.icon && <item.icon size={18} color={palette.textMuted} />}
                            {item.label}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI HINT / SUMMARY */}
            <div
              style={{
                ...styles.aiHint,
                borderBottom: `1px solid ${border}`,
                backgroundColor: palette.mode === 'dark' ? 'rgba(217, 255, 0, 0.05)' : '#f8fafc',
                padding: '10px 24px'
              }}
            >
              <Sparkles size={16} color={palette.lime} style={{ flexShrink: 0 }} />
              <span style={{ color: palette.textMuted, fontSize: 13, fontWeight: 700 }}>
                {assistantHint}
              </span>
            </div>
            {/* MESSAGES AREA */}
            <div
              style={{
                ...styles.messagesArea,
                flex: 1,
                overflowY: 'auto',
                padding: '20px 40px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                backgroundImage: palette.mode === 'dark' 
                  ? 'linear-gradient(rgba(11,20,26,0.92), rgba(11,20,26,0.92)), url("https://static.whatsapp.net/rsrc.php/v3/y6/r/wa669ae5z23.png")'
                  : 'linear-gradient(rgba(244, 244, 244, 0.96), rgba(244, 244, 244, 0.96)), url("https://static.whatsapp.net/rsrc.php/v3/y6/r/wa669ae5z23.png")',
                backgroundSize: '400px',
                position: 'relative'
              }}
            >
              {filteredMessages.map((msg) => {
                const isOut = msg.direction === 'out';
                const isSystem = msg.type === 'system';
                
                if (isSystem) {
                  return (
                    <div key={msg.id} style={{ alignSelf: 'center', margin: '12px 0' }}>
                      <span style={{ padding: '6px 16px', borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)', fontSize: 11, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase' }}>
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                const isSelected = selectedMessageIds.has(msg.id);

                if (msg.type === 'audio' && msg.audio_url) {
                  return (
                    <div key={msg.id} style={{ 
                      display: 'flex', 
                      justifyContent: isOut ? 'flex-end' : 'flex-start',
                      marginBottom: 4
                    }}>
                      <div style={{
                        ...styles.bubble,
                        backgroundColor: isOut ? LIME : (palette.mode === 'dark' ? '#202c33' : '#fff'),
                        borderRadius: isOut ? '12px 0 12px 12px' : '0 12px 12px 12px',
                        padding: '8px 12px',
                        minWidth: 260,
                        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${isOut ? '#000' : LIME}` }}>
                            <img src={isOut ? (profile?.avatar_url || 'https://i.pravatar.cc/150?u=me') : (selectedChat?.customer_avatar || 'https://i.pravatar.cc/150?u=cust')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          </div>
                          <Mic size={14} color={LIME} style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#000', borderRadius: '50%', padding: 2 }} />
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const audio = new Audio(msg.audio_url);
                            audio.play();
                          }}
                          style={{ border: 'none', background: isOut ? '#000' : LIME, color: isOut ? LIME : '#000', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifySelf: 'center' }}
                        >
                          <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
                        </button>

                        <div style={{ flex: 1 }}>
                          <div style={{ height: 4, width: '100%', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '30%', backgroundColor: isOut ? '#000' : LIME }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isOut ? '#000' : palette.textMuted }}>{formatAudioTime(msg.duration || 0)}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, opacity: 0.5 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: isOut ? '#000' : palette.text }}>{formatTime(msg.created_at)}</span>
                              {isOut && <CheckCheck size={14} color={isOut ? '#000' : LIME} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} 
                    onClick={() => selectionMode && toggleMessageSelection(msg.id)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 12,
                      justifyContent: isOut ? 'flex-end' : 'flex-start',
                      filter: (sendBlocked && !isMaster) ? 'blur(8px)' : 'none',
                      pointerEvents: (sendBlocked && !isMaster) ? 'none' : 'auto',
                      cursor: selectionMode ? 'pointer' : 'default',
                    }}
                  >
                    {selectionMode && (
                      <div style={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: 4, 
                        border: `2px solid ${isSelected ? LIME : palette.textMuted}`,
                        backgroundColor: isSelected ? LIME : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        order: isOut ? 2 : -1
                      }}>
                        {isSelected && <Check size={14} color="#000" strokeWidth={4} />}
                      </div>
                    )}
                    <div style={{
                      ...styles.bubble,
                      backgroundColor: isOut ? LIME : (palette.mode === 'dark' ? '#202c33' : '#fff'),
                      color: isOut ? '#000' : palette.text,
                      borderRadius: isOut ? '12px 0 12px 12px' : '0 12px 12px 12px',
                      padding: '10px 14px',
                      maxWidth: '75%',
                      boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                      position: 'relative',
                      border: isSelected ? `1px solid ${palette.textMuted}` : 'none'
                    }}>
                      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, lineHeight: 1.45 }}>{msg.content}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4, opacity: 0.5 }}>
                        <span style={{ fontSize: 10, fontWeight: 600 }}>{formatTime(msg.created_at)}</span>
                        {isOut && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />

              {/* BLUR OVERLAY FOR BLOCKED CHATS */}
              {sendBlocked && !isMaster && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(4px)',
                  padding: 24
                }}>
                  <div style={{ backgroundColor: palette.mode === 'dark' ? '#1f2937' : '#fff', padding: '32px', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', maxWidth: 360, textAlign: 'center' }}>
                    <Lock size={48} color={LIME} style={{ marginBottom: 16 }} />
                    <h4 style={{ color: palette.text, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Conversa Protegida</h4>
                    <p style={{ color: palette.textMuted, fontSize: 14, fontWeight: 700, marginBottom: 24, lineHeight: 1.5 }}>
                      Este cliente está a ser atendido por outro colega. Para intervir, precisa de assumir o atendimento.
                    </p>
                    <button
                      onClick={() => void handleClaimConversation()}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 14,
                        backgroundColor: '#000',
                        color: LIME,
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {claiming ? 'A processar...' : 'Assumir Atendimento'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* COMPOSER AREA */}
            <div style={{ padding: '12px 24px', backgroundColor: palette.sidebarBg, borderTop: `1px solid ${border}` }}>
              {sendBlocked && isMaster ? (
                 <div style={{ padding: '10px 16px', borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Lock size={16} color="#ef4444" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: palette.text, flex: 1 }}>Conversa atribuída a outro agente. Como Admin, pode assumir agora.</span>
                    <button onClick={handleInterruptConversation} style={{ padding: '6px 12px', borderRadius: 8, backgroundColor: '#ef4444', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {interrupting ? '...' : 'Interromper'}
                    </button>
                 </div>
              ) : null}

              <form
                onSubmit={handleSendMessage}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 12,
                  backgroundColor: palette.mode === 'dark' ? '#2a3942' : '#fff',
                  padding: '8px 12px',
                  borderRadius: 24,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ position: 'relative' }}>
                  {attachmentMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 14px)',
                      left: 0,
                      width: 220,
                      backgroundColor: '#fff',
                      borderRadius: 14,
                      padding: '6px 0',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      zIndex: 1000,
                      border: '1px solid rgba(0,0,0,0.06)',
                      animation: 'zaptroSlideUp 0.15s ease-out'
                    }}>
                      {[
                        { icon: FileText, label: 'Documento', color: '#7f66ff' },
                        { icon: ImageIcon, label: 'Fotos e vídeos', color: '#007aff' },
                        { icon: Mic, label: 'Áudio', color: '#ff9500' },
                        { icon: User, label: 'Contato', color: '#007aff' },
                        { divider: true },
                        { icon: CircleDollarSign, label: 'Pix', color: '#34c759' },
                        { icon: FileText, label: 'Orçamento', color: '#ff9500' },
                        { icon: Zap, label: 'Resposta rápida', color: '#ffcc00' },
                        { icon: CreditCard, label: 'Cobrar', color: '#007aff' },
                      ].map((item, idx) => (
                        item.divider ? (
                          <div key={idx} style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.04)', margin: '4px 0' }} />
                        ) : (
                          <button
                            key={idx}
                            onClick={() => {
                              setAttachmentMenuOpen(false);
                              if (item.label === 'Documento') {
                                docInputRef.current?.click();
                                return;
                              }
                              if (item.label === 'Fotos e vídeos') {
                                mediaInputRef.current?.click();
                                return;
                              }
                              if (item.label === 'Áudio') {
                                startRecording();
                                return;
                              }
                              if (item.label === 'Contato') {
                                setContactsModalOpen(true);
                                return;
                              }
                              if (item.label === 'Pix') {
                                const s = company?.settings as any;
                                const pix = s?.pix_key;
                                if (pix) {
                                  const text = `Seguem os dados para pagamento via Pix:\n\n🔑 Chave Pix: ${pix}\n🏦 Banco: ${s?.bank_name || '—'}\n👤 Titular: ${s?.bank_holder || company?.name || '—'}`;
                                  setNewMessage(text);
                                  notifyZaptro('success', 'Pix', 'Dados inseridos. Pressione enviar.');
                                } else {
                                   notifyZaptro('warning', 'Pix não configurado', 'Cadastre sua chave em Conta > Minha Empresa.');
                                }
                                return;
                              }
                              if (item.label === 'Orçamento') {
                                setQuotesModalOpen(true);
                                return;
                              }
                              if (item.label === 'Cobrar') {
                                setBillingModalOpen(true);
                                return;
                              }
                              if (item.label === 'Resposta rápida') {
                                setQuickResponsesOpen(true);
                                return;
                              }
                              notifyZaptro('info', 'WhatsApp', `Ação "${item.label}" em desenvolvimento.`);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              border: 'none',
                              background: 'transparent',
                              color: '#000',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <div style={{ 
                              width: 28, 
                              height: 28, 
                              borderRadius: 8, 
                              backgroundColor: `${item.color}15`, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              color: item.color
                            }}>
                              <item.icon size={16} strokeWidth={2.5} />
                            </div>
                            <span>{item.label}</span>
                          </button>
                        )
                      ))}
                    </div>
                  )}
                  <button 
                    type="button" 
                    style={{ ...styles.inputSideBtn, color: palette.textMuted }} 
                    onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                  >
                    <Plus size={24} />
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={docInputRef} 
                  style={{ display: 'none' }} 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPendingFile({ file, previewUrl: null });
                    }
                    e.target.value = '';
                  }}
                />
                <input 
                  type="file" 
                  ref={mediaInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const isImg = file.type.startsWith('image/');
                      const url = isImg ? URL.createObjectURL(file) : null;
                      setPendingFile({ file, previewUrl: url });
                    }
                    e.target.value = '';
                  }}
                />
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* ── FILE PREVIEW INLINE ── */}
                  {pendingFile && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 14,
                      background: palette.mode === 'dark' ? '#1a2530' : '#f0f7ff',
                      border: `1.5px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,120,255,0.15)'}`,
                      animation: 'zaptroSlideUp 0.2s ease-out',
                      marginBottom: 2,
                    }}>
                      {/* Thumbnail or file icon */}
                      {pendingFile.previewUrl ? (
                        <img
                          src={pendingFile.previewUrl}
                          alt="preview"
                          style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 52, height: 52, borderRadius: 10,
                          background: palette.mode === 'dark' ? '#2a3942' : '#e8f0fe',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#007aff" strokeWidth="2" strokeLinejoin="round"/>
                            <polyline points="14 2 14 8 20 8" stroke="#007aff" strokeWidth="2" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: palette.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pendingFile.file.name}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: palette.textMuted, marginTop: 2 }}>
                          {(pendingFile.file.size / 1024).toFixed(0)} KB · {pendingFile.file.type.split('/')[1]?.toUpperCase() || 'ARQUIVO'}
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (pendingFile.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
                            setPendingFile(null);
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.12)',
                            background: 'transparent', fontSize: 12, fontWeight: 700,
                            color: palette.textMuted, cursor: 'pointer'
                          }}
                        >Cancelar</button>
                        <button
                          type="button"
                          disabled={sendingFile}
                          onClick={async () => {
                            setSendingFile(true);
                            // Simulate upload + send
                            await new Promise(r => setTimeout(r, 900));
                            notifyZaptro('success', 'Arquivo enviado!', `"${pendingFile.file.name}" foi enviado para ${selectedChat?.sender_name || 'o cliente'}.`);
                            if (pendingFile.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
                            setPendingFile(null);
                            setSendingFile(false);
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: 10, border: 'none',
                            background: LIME, fontSize: 12, fontWeight: 800,
                            color: '#000', cursor: sendingFile ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6
                          }}
                        >
                          {sendingFile ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="#000" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#000" strokeWidth="2.5" strokeLinejoin="round"/></svg>
                          )}
                          Enviar
                        </button>
                      </div>
                    </div>
                  )}

                  {isRecording ? (
                    <div style={{ 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '0 12px',
                      animation: 'zaptroSlideUp 0.2s ease-out' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button type="button" onClick={cancelRecording} style={{ border: 'none', background: 'transparent', color: '#ff4d4f', cursor: 'pointer' }}>
                          <Trash2 size={20} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff4d4f', animation: 'pulse 1s infinite' }} />
                          <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>{formatAudioTime(recordingDuration)}</span>
                        </div>
                      </div>
                      
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '0 20px', opacity: 0.3 }}>
                        {[...Array(20)].map((_, i) => (
                          <div key={i} style={{ width: 3, height: 6 + Math.random() * 24, backgroundColor: palette.text, borderRadius: 2 }} />
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <button type="button" onClick={stopRecording} style={{ border: 'none', background: 'transparent', color: '#ff4d4f', cursor: 'pointer' }}>
                           <Circle size={20} fill="#ff4d4f" />
                         </button>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      rows={1}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={selectedChat && lockedChatIds.has(selectedChat.id) ? "Esta conversa foi bloqueada pelo administrador" : "Escreva uma mensagem..."}
                      disabled={sendBlocked || sending}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        padding: '8px 0',
                        fontSize: 15,
                        fontWeight: 600,
                        resize: 'none',
                        maxHeight: 120,
                        color: palette.text
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as any);
                        }
                      }}
                    />
                  )}
                </div>

                {!newMessage.trim() && !isRecording && !sendBlocked ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer',
                      color: palette.textMuted,
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Mic size={22} strokeWidth={2.5} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={(sending || sendBlocked) && !isRecording}
                    onClick={isRecording ? (e) => { e.preventDefault(); stopRecording(); } : undefined}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: (isRecording || newMessage.trim()) ? LIME : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#000',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isRecording ? <Send size={20} fill="#000" /> : <Send size={20} fill={newMessage.trim() ? '#000' : 'none'} />}
                  </button>
                )}
              </form>
            </div>
          </div>
        ) : (
          <div style={{ ...styles.emptyView, backgroundColor: palette.mode === 'dark' ? '#222e35' : '#f4f4f4' }}>
             <div style={{ width: 120, height: 120, borderRadius: '50%', backgroundColor: 'rgba(217, 255, 0, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Zap size={64} color={LIME} />
             </div>
             <h2 style={{ fontSize: 28, fontWeight: 700, color: palette.text, letterSpacing: '-0.04em', margin: '0 0 12px 0' }}>Zaptro Premium Chat</h2>
             <p style={{ fontSize: 16, color: palette.textMuted, fontWeight: 700, maxWidth: 400, lineHeight: 1.5 }}>
               Selecione uma conversa para começar a gerir os atendimentos e a logística em tempo real.
             </p>
          </div>
        )}
      </div>

      {/* 3. RIGHT PANEL (Contact Info & Logistics) */}
      {showRightPanel && selectedChat && (
        <div style={{ 
          ...styles.rightPanel, 
          borderLeft: `1px solid ${border}`, 
          backgroundColor: palette.sidebarBg,
          animation: 'zaptroSlideInRight 0.3s ease-out'
        }}>
          {/* RIGHT HEADER */}
          <div style={{ ...styles.rightHead, borderBottom: `1px solid ${border}`, position: 'relative' }}>
             <button 
              onClick={() => setShowRightPanel(false)}
              style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'transparent', cursor: 'pointer', color: palette.textMuted }}
             >
               <X size={20} />
             </button>
             <div style={{ width: 120, height: 120, borderRadius: 24, margin: '0 auto 16px', overflow: 'hidden' }}>
                <img src={selectedChat.customer_avatar || `https://picsum.photos/seed/${selectedChat.id}/120/120`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             </div>
             <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: palette.text }}>{getDisplayName(selectedChat)}</h3>
             <p style={{ margin: '4px 0 0', fontSize: 14, color: palette.textMuted, fontWeight: 600 }}>{selectedChat.customer_phone}</p>
          </div>

          {/* LOGISTICS SECTION */}
          <div style={{ ...styles.rightSection, borderBottom: `1px solid ${border}` }}>
             <h4 style={styles.rightH4}>LOGÍSTICA EM TEMPO REAL</h4>
             <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                   <span style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>Progresso da Entrega</span>
                   <span style={{ fontSize: 12, fontWeight: 700, color: LIME }}>65%</span>
                </div>
                <div style={{ height: 6, width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                   <div style={{ height: '100%', width: '65%', backgroundColor: LIME, borderRadius: 3 }} />
                </div>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                {[
                  { label: 'Status da Carga', val: 'Em Trânsito', icon: Truck, color: LIME },
                  { label: 'Localização', val: 'Curitiba, PR', icon: MapPin, color: '#3b82f6' },
                  { label: 'Motorista', val: 'Carlos Santos', icon: User, color: '#a855f7' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={16} color={item.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: palette.textMuted, textTransform: 'uppercase' }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: palette.text }}>{item.val}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div style={{ ...styles.rightSection, borderBottom: `1px solid ${border}`, padding: "16px 20px" }}>
             <h4 style={styles.rightH4}>RASTREAMENTO OPERACIONAL</h4>
             <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${border}`, marginTop: 12 }}>
                <OpenStreetRouteMap 
                  height="240px" 
                  mode="tracking"
                  initialOrigin={{ lat: -25.4297, lng: -49.2719 }}
                  initialDest={{ lat: -25.4497, lng: -49.2919 }}
                  driverPos={{ lat: -25.4397, lng: -49.2819 }}
                />
             </div>
          </div>
          {/* DOCUMENTS */}
          <div style={styles.rightSection}>
             <h4 style={styles.rightH4}>DOCUMENTOS OPERACIONAIS</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: 'NFE_7822.pdf', size: '2.4 MB' },
                  { name: 'Comprovante_Entrega.jpg', size: '1.1 MB' }
                ].map((doc, i) => (
                  <div key={i} style={{ ...styles.docRow, borderColor: border, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={18} color={palette.textMuted} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: palette.text }}>{doc.name}</p>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: palette.textMuted }}>{doc.size}</p>
                      </div>
                    </div>
                    <Download size={16} color={palette.textMuted} />
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
    </div>

    {/* MODALS */}
    {callActionModal && selectedChat ? (
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10050,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          boxSizing: 'border-box',
          backdropFilter: 'blur(8px)'
        }}
        onClick={() => setCallActionModal(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 22,
            backgroundColor: palette.mode === 'dark' ? '#111' : '#fff',
            color: palette.text,
            boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700 }}>{callActionModal === 'voice' ? 'Chamada de Voz' : 'Chamada de Vídeo'}</h2>
          <p style={{ fontSize: 14, fontWeight: 700, color: palette.textMuted, lineHeight: 1.5, marginBottom: 20 }}>
            {callActionModal === 'voice' 
              ? 'As chamadas de voz via browser estão em manutenção. Por favor, utilize o telemóvel para contactar o cliente.' 
              : 'O Zaptro não suporta chamadas de vídeo nativas. O contacto deve ser mantido por mensagem.'}
          </p>
          <div style={{ padding: '16px', borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.03)', marginBottom: 20 }}>
             <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: palette.textMuted }}>NÚMERO DO CLIENTE</p>
             <p style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: WHATSAPP_PHONE_FONT_FAMILY }}>{selectedChat.customer_phone}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(selectedChat.customer_phone);
              }}
              style={{
                flex: '1 1 140px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 14px',
                borderRadius: 14,
                border: `1px solid ${border}`,
                background: 'transparent',
                color: palette.text,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Copy size={16} /> Copiar número
            </button>

            {callActionModal === 'voice' && callModalDigits.length >= 8 ? (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `tel:${callModalDigits}`;
                }}
                style={{
                  flex: '1 1 140px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: 'none',
                  background: '#000',
                  color: LIME,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Phone size={16} /> Abrir no telefone
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setCallActionModal(null)}
              style={{
                flex: '1 1 100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                color: palette.textMuted,
                fontFamily: 'inherit',
                marginTop: 8
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
        ) : null}
      </>
      {/* CONTEXT MENU */}
       {contextMenu && (
        <div 
          ref={contextMenuRef}
          style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          width: 240,
          backgroundColor: '#F4F4F4', // Requested light background
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '8px 0',
          zIndex: 100000,
          border: '1px solid rgba(0,0,0,0.08)',
        }}>
          {[
            { icon: Archive, label: 'Arquivar conversa', action: 'archive' },
            { 
              icon: pinnedChatIds.has(contextMenu.chat.id) ? PinOff : Pin, 
              label: pinnedChatIds.has(contextMenu.chat.id) ? 'Desafixar conversa' : 'Fixar conversa',
              action: 'pin'
            },
            { icon: Tag, label: 'Etiquetar conversa', action: 'label' },
            { icon: MessageSquare, label: 'Marcar como não lida', action: 'unread' },
            { divider: true },
            { icon: MinusCircle, label: 'Limpar conversa', action: 'clear' },
            { icon: Trash2, label: 'Apagar conversa', action: 'delete' },
          ].map((item, idx) => (
            item.divider ? (
              <div key={idx} style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', margin: '8px 0' }} />
            ) : (
              <button
                key={idx}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: 'none',
                  background: 'transparent',
                  color: '#000',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.action === 'pin') {
                    togglePin(contextMenu.chat.id);
                  } else if (item.action === 'archive') {
                    archiveChat(contextMenu.chat.id);
                  } else if (item.action === 'unread') {
                    toggleUnread(contextMenu.chat.id);
                  } else {
                    notifyZaptro('info', 'WhatsApp', `Ação "${item.label}" executada.`);
                  }
                  setContextMenu(null);
                }}
              >
                {item.icon && <item.icon size={18} color="rgba(0,0,0,0.5)" />}
                <span>{item.label}</span>
              </button>
            )
          ))}
        </div>
      )}

      {/* MODAL NOVO CONTATO */}
      {newContactModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            width: '100%',
            maxWidth: 500,
            backgroundColor: isDark ? '#1a1a1a' : '#fff',
            borderRadius: 24,
            padding: 30,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            <button
              onClick={() => setNewContactModalOpen(false)}
              style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: palette.text }}>Adicionar Novo Contato</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Nome Completo', key: 'name', placeholder: 'Ex: João Silva' },
                { label: 'WhatsApp', key: 'phone', placeholder: '55 11 99999-9999' },
                { label: 'CNPJ / CPF', key: 'cnpj', placeholder: '00.000.000/0000-00' },
                { label: 'Nome da Empresa', key: 'companyName', placeholder: 'Ex: Logística S.A.' },
                { label: 'Segmento WhatsApp', key: 'segmentWa', placeholder: 'Ex: Comercial, Suporte' },
                { label: 'Segmento da Empresa', key: 'segmentCompany', placeholder: 'Ex: Transportadora' },
                { label: 'E-mail', key: 'email', placeholder: 'email@exemplo.com' },
                { label: 'Endereço', key: 'address', placeholder: 'Rua, Número, Bairro, Cidade' }
              ].map((f, i) => (
                <div key={i}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 700, color: palette.textMuted }}>{f.label}</label>
                  <input
                    type="text"
                    value={(newContactForm as any)[f.key]}
                    onChange={(e) => setNewContactForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      backgroundColor: softBg,
                      color: palette.text,
                      fontSize: 14,
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}
              
              <button
                onClick={handleSaveNewContact}
                style={{
                  marginTop: 10,
                  padding: '16px',
                  borderRadius: 14,
                  border: 'none',
                  background: LIME,
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer'
                }}
              >
                Salvar Contato
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BILLING MODAL */}
      <LogtaModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        title="Gerar Cobrança (Pix)"
        width="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={{ margin: 0, fontSize: 13, color: palette.textMuted, fontWeight: 600 }}>
            Insira o valor e uma descrição opcional. Geraremos uma mensagem formatada com seus dados de Pix.
          </p>
          
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: palette.text, marginBottom: 8, textTransform: 'uppercase' }}>Valor da Cobrança</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: LIME }}>R$</span>
              <input 
                type="text" 
                placeholder="0,00"
                value={billingAmount}
                onChange={(e) => setBillingAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  borderRadius: 14,
                  backgroundColor: palette.mode === 'dark' ? '#1c1c1e' : '#f4f4f5',
                  border: '1px solid rgba(0,0,0,0.1)',
                  color: palette.text,
                  fontSize: 18,
                  fontWeight: 800,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: palette.text, marginBottom: 8, textTransform: 'uppercase' }}>Referência / Descrição</label>
            <input 
              type="text" 
              placeholder="Ex: Frete Matriz -> Filial"
              value={billingDescription}
              onChange={(e) => setBillingDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 14,
                backgroundColor: palette.mode === 'dark' ? '#1c1c1e' : '#f4f4f5',
                border: '1px solid rgba(0,0,0,0.1)',
                color: palette.text,
                fontSize: 14,
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={() => {
              const s = company?.settings as any;
              const pix = s?.pix_key;
              if (!pix) {
                notifyZaptro('warning', 'Pix não configurado', 'Cadastre sua chave em Conta > Minha Empresa.');
                return;
              }
              const text = `Solicitação de Pagamento\n\n💰 Valor: R$ ${billingAmount}\n📝 Ref: ${billingDescription || 'Prestação de serviços'}\n\n🔑 Chave Pix: ${pix}\n🏦 Banco: ${s?.bank_name || '—'}\n👤 Titular: ${s?.bank_holder || company?.name || '—'}\n\nPor favor, envie o comprovante após o pagamento.`;
              setNewMessage(text);
              setBillingModalOpen(false);
              setBillingAmount('');
              setBillingDescription('');
              notifyZaptro('success', 'Cobrança', 'Mensagem de cobrança gerada.');
            }}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 14,
              backgroundColor: '#000',
              color: LIME,
              border: 'none',
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: 10
            }}
          >
            Gerar e Inserir no Chat
          </button>
        </div>
      </LogtaModal>

      {/* QUICK RESPONSES MODAL */}
      <LogtaModal
        isOpen={quickResponsesOpen}
        onClose={() => setQuickResponsesOpen(false)}
        title="Respostas Rápidas"
        width="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { title: 'Saudação Inicial', text: 'Olá! Seja bem-vindo à nossa central transportadora. Como podemos ajudar no seu embarque hoje?' },
            { title: 'Solicitar NF-e', text: 'Poderia nos enviar a NF-e e o arquivo XML da carga para iniciarmos o processo de emissão do CT-e?' },
            { title: 'Status de Entrega', text: 'Sua carga já saiu para entrega e o motorista está em rota. Previsão de chegada no destino nas próximas 2 horas.' },
            { title: 'Agradecimento', text: 'Agradecemos a preferência! Ficamos à disposição para novos serviços. Tenha um excelente dia.' },
            { title: 'Aguardar Atendimento', text: 'Nossos consultores estão em atendimento no momento. Por favor, aguarde alguns instantes que já falaremos com você.' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setNewMessage(item.text);
                setQuickResponsesOpen(false);
                notifyZaptro('success', 'Resposta Rápida', 'Template inserido no chat.');
              }}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 16,
                backgroundColor: palette.mode === 'dark' ? '#1c1c1e' : '#f8fafc',
                border: `1px solid ${border}`,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = LIME)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = border)}
            >
              <div style={{ fontWeight: 800, fontSize: 14, color: palette.text, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: palette.textMuted, fontWeight: 600, lineHeight: 1.4 }}>{item.text}</div>
            </button>
          ))}
          <button
            onClick={() => {
              setQuickResponsesOpen(false);
              navigate('/configuracao?tab=automation');
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              backgroundColor: 'transparent',
              color: palette.text,
              border: `1px solid ${border}`,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              marginTop: 8
            }}
          >
            Gerenciar Modelos Completos
          </button>
        </div>
      </LogtaModal>

      {/* CONTACTS MODAL */}
      <LogtaModal
        isOpen={contactsModalOpen}
        onClose={() => setContactsModalOpen(false)}
        title="Enviar Contato"
        width="460px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou telefone..."
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.08)',
                backgroundColor: '#f8fafc',
                fontSize: 14,
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>
          {[
            { name: 'Alison Silva (Admin)', phone: '+55 11 99999-1111', role: 'Proprietário' },
            { name: 'Suporte Zaptro', phone: '+55 11 98888-2222', role: 'Comercial' },
            { name: 'Logística Filial SP', phone: '+55 11 97777-3333', role: 'Operacional' },
          ].map((contact, idx) => (
            <button
              key={idx}
              onClick={() => {
                setNewMessage(`Aqui está o contato de *${contact.name}*:\n📞 Telefone: ${contact.phone}\n🏢 Setor: ${contact.role}`);
                setContactsModalOpen(false);
                notifyZaptro('success', 'Contato', 'Informações de contato inseridas.');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 16px',
                borderRadius: 14,
                backgroundColor: '#fff',
                border: '1px solid rgba(0,0,0,0.04)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#007aff15', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: '#007aff' }}>
                <User size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>{contact.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{contact.phone} • {contact.role}</div>
              </div>
            </button>
          ))}
        </div>
      </LogtaModal>

      {/* QUOTES MODAL */}
      <LogtaModal
        isOpen={quotesModalOpen}
        onClose={() => setQuotesModalOpen(false)}
        title="Enviar Orçamento"
        width="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            Selecione um orçamento ativo para enviar ao cliente.
          </p>
          {[
            { id: 'ORC-2931', destiny: 'São Paulo -> Rio de Janeiro', value: 'R$ 2.450,00', status: 'Aprovado' },
            { id: 'ORC-3012', destiny: 'Curitiba -> Porto Alegre', value: 'R$ 1.890,00', status: 'Pendente' },
            { id: 'ORC-3055', destiny: 'Belo Horizonte -> Vitória', value: 'R$ 3.200,00', status: 'Aguardando' },
          ].map((quote, idx) => (
            <button
              key={idx}
              onClick={() => {
                setNewMessage(`Olá! Segue o link do orçamento *${quote.id}* para o trecho *${quote.destiny}*:\n\n💰 Valor Total: ${quote.value}\n🔗 Visualizar: https://zaptro.com/budget/${quote.id}\n\nFicamos no aguardo da sua confirmação.`);
                setQuotesModalOpen(false);
                notifyZaptro('success', 'Orçamento', 'Link do orçamento inserido.');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px',
                borderRadius: 16,
                backgroundColor: '#fff',
                border: '1px solid rgba(0,0,0,0.04)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#ff950015', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff9500' }}>
                <FileText size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>{quote.id} • {quote.destiny}</div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{quote.value} • <span style={{ color: quote.status === 'Aprovado' ? '#10b981' : '#f59e0b' }}>{quote.status}</span></div>
              </div>
            </button>
          ))}
        </div>
      </LogtaModal>
    </ZaptroLayout>
  );
};

const WhatsAppPremium: React.FC = () => {
  return (
    <>
      <WhatsAppPremiumContent />
      <style>{`
        @keyframes zaptroSlideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes zaptroSlideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .spin { animation: rotate 2s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes zaptroSlideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: '100%', overflow: 'hidden', width: '100%', minHeight: 0 },
  sidebar: { width: '400px', minWidth: 320, display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '24px 30px' },
  sidebarTitle: { margin: '0', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', color: '#000' },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '10px',
    color: 'rgba(75, 231, 8, 1)',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  liveDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(75, 231, 8, 1)' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '8px' },
  searchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    flex: 1,
    fontSize: '14px',
    fontWeight: 600,
    padding: '9px 7px',
    borderRadius: 8,
  },
  chatList: { flex: 1, overflowY: 'auto' },
  /** `align-items: flex-start` evita que a coluna do avatar herde altura errada e fique “achatada” (ex.: 240×30). */
  chatItem: { display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '20px 30px', cursor: 'pointer' },
  avatarWrap: {
    width: 52,
    height: 52,
    minWidth: 52,
    minHeight: 52,
    maxWidth: 52,
    maxHeight: 52,
    flexShrink: 0,
    alignSelf: 'flex-start',
    borderRadius: 18,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  itemMain: { flex: 1, minWidth: 0 },
  itemHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  itemName: { fontWeight: 700, fontSize: '15px' },
  itemTime: { fontSize: '10px', color: '#737373', fontWeight: 700, lineHeight: 1.3 },
  itemPreview: { fontSize: '13px', color: '#737373', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 },
  centerColumn: {
    flex: '1 1 224px',
    minWidth: 224,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatHeader: { padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  headerProfile: { display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 },
  headerActions: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'nowrap',
    width: 326,
    marginTop: 12,
    boxSizing: 'border-box',
    fontSize: 14,
  },
  iconRound: {
    width: 42,
    height: 42,
    borderRadius: 14,
    border: '1px solid',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  assignBtn: {
    padding: '10px 16px',
    borderRadius: 14,
    border: 'none',
    background: 'rgba(41, 41, 41, 1)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
  },
  statusRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    width: 326,
    boxSizing: 'border-box',
    fontSize: 14,
  },
  onlinePill: { fontSize: 11, fontWeight: 700, color: 'rgba(75, 231, 8, 1)', lineHeight: 1.3 },
  statusPill: { fontSize: 10, fontWeight: 600, lineHeight: 1.3 },
  cargoStrip: { padding: '14px 22px 16px' },
  cargoPills: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  cargoPill: {
    padding: '10px 16px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    border: '1px solid',
  },
  metaItem: { display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1.45 },
  updateCargoBtn: {
    padding: '10px 16px',
    borderRadius: 12,
    border: '1px solid #CBD5E1',
    background: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    flexShrink: 0,
  },
  aiHint: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 24px' },
  activeName: { margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' },
  messagesArea: { padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  msgRow: { display: 'flex' },
  bubble: { maxWidth: '70%', padding: '14px 20px' },
  msgText: { margin: 0, fontSize: '14px', lineHeight: 1.6 },
  composerDock: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    /** Mantém compositor ancorado à base da coluna (lista de mensagens rola por cima). */
    marginTop: 'auto',
    zIndex: 4,
  },
  inputFooter: {
    padding: '12px 20px 16px',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  inputContainer: { display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '10px 14px', borderRadius: '20px' },
  inputSideBtn: { border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' },
  inputField: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '15px',
    fontWeight: 600,
    minWidth: 0,
    width: '100%',
    resize: 'none' as const,
    lineHeight: 1.45,
    fontFamily: 'inherit',
  },
  emptyView: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 32,
    gap: 12,
  },
  loadingArea: { padding: '60px', textAlign: 'center' },
  rightPanel: { width: 358, minWidth: 280, maxWidth: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  rightHead: { padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid rgba(148,163,184,0.25)', boxSizing: 'border-box' },
  rightSection: { padding: '18px 20px', borderBottom: '1px solid rgba(148,163,184,0.2)' },
  rightH4: { margin: '0 0 12px', fontSize: 11, fontWeight: 600, letterSpacing: 0, color: 'rgba(135, 135, 135, 1)' },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid',
    background: 'transparent',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    marginBottom: 8,
    textAlign: 'left',
  },
  docIconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 14,
    border: '1px solid',
    background: 'transparent',
    cursor: 'pointer',
    flexShrink: 0,
  },
  alertBox: {
    padding: 12,
    borderRadius: 14,
    border: '1px dashed',
    fontSize: 12,
    fontWeight: 700,
    color: '#64748B',
  },
  newChatOption: {
    width: '100%',
    padding: '12px 30px',
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 0.2s',
    textAlign: 'left',
  },
  newChatIconWrap: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: '1px solid rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
};

export default WhatsAppPremium;
