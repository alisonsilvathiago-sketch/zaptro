import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Send,
  Search,
  Clock,
  Zap,
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
  BellOff,
  Star,
} from 'lucide-react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { ZAPTRO_FIELD_BG, ZAPTRO_SOFT_NEUTRAL_MUTED } from '../constants/zaptroUi';
import { isZaptroTenantAdminRole } from '../utils/zaptroPermissions';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { toastError, toastSuccess } from '../lib/toast';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import {
  readAllConversationCargo,
  persistConversationCargoPhase,
  markConversationCargoSynced,
  type ConversationCargoPhase,
} from '../constants/zaptroConversationCargoStore';
import { readExternalApiIntegrations } from '../constants/zaptroExternalApisStore';

const LIME = '#D9FF00';

/** Telefones na UI — sempre Arial (fallbacks genéricos). */
const WHATSAPP_PHONE_FONT_FAMILY = 'Arial, Helvetica, sans-serif' as const;

interface Message {
  id: string;
  content: string;
  direction: 'in' | 'out';
  created_at: string;
  connection_id?: string;
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
  /** Conversa de equipa / grupo (quando a API enviar ou em seeds de demo). */
  is_group?: boolean;
  /** Contador de não lidas quando existir na base ou em demo. */
  unread_count?: number;
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

function onlyDigits(s: string): string {
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

function digitsForTel(phone: string): string {
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
  const [search, setSearch] = useState('');
  const [waInboxFilter, setWaInboxFilter] = useState<WaInboxFilter>('all');
  const [starredChatIds, setStarredChatIds] = useState<Set<string>>(readInboxStarredIds);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        sender_name: 'Equipe CD Rio',
        last_message: 'Cliente pediu status da carga — SLA 20 min.',
        last_customer_message_at: agoIso(90),
        status: 'open',
        is_group: true,
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

  const displayConversations =
    conversations.length > 0 ? conversations : mergedDemoConversations;
  /**
   * Badge «Demo» + aviso de pré-visualização: só enquanto não há conversas reais em `whatsapp_conversations`
   * para esta empresa. Some assim que a API (ou realtime) preencher `conversations`.
   */
  const showDemoInboxNotice = useMemo(
    () => !loading && conversations.length === 0,
    [loading, conversations.length]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!callActionModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCallActionModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [callActionModal]);

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

  // 2. Carregar Conversas
  useEffect(() => {
    if (!profile?.company_id) return;

    const fetchConversations = async () => {
      try {
        let query = supabaseZaptro
          .from('whatsapp_conversations')
          .select('*')
          .eq('company_id', profile.company_id);

        // Multi-atendente: agente vê conversas atribuídas a si **e** fila sem dono (para «Atribuir responsável»).
        const role = (profile.role || '').toLowerCase();
        if (role === 'agent' && profile.id) {
          query = query.or(`assigned_to.eq.${profile.id},assigned_to.is.null`);
        }

        const { data, error } = await query.order('last_customer_message_at', { ascending: false });

        if (!error) setConversations(data || []);
      } catch (err) {
        console.error('Erro ao carregar conversas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    
    // Realtime para conversas
    const channel = supabaseZaptro
      .channel('whatsapp_realtime_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabaseZaptro.removeChannel(channel); };
  }, [profile?.company_id, profile?.id, profile?.role]);

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
    if (isMaster) return false;
    if (isZaptroDemoConversationId(selectedChat.id)) return false;
    const who = selectedChat.assigned_to;
    return !!(who && who !== profile.id);
  }, [selectedChat, profile?.id, isMaster]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    const text = newMessage.trim();

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

  const getDisplayName = (chat: Conversation | null) => {
    if (!chat) return 'Contato';
    return chat.sender_name || chat.sender_number || 'Novo Contato';
  };

  const filteredInboxList = useMemo(() => {
    let list = displayConversations;
    if (waInboxFilter === 'unread') {
      list = list.filter((c) => (c.unread_count ?? 0) > 0);
    } else if (waInboxFilter === 'starred') {
      list = list.filter((c) => starredChatIds.has(c.id));
    } else if (waInboxFilter === 'groups') {
      list = list.filter((c) => c.is_group === true);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        (c.sender_name || c.sender_number || 'Novo Contato').toLowerCase().includes(q)
      );
    }
    return list;
  }, [displayConversations, waInboxFilter, starredChatIds, search]);

  const toggleInboxStar = useCallback((id: string) => {
    setStarredChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistInboxStarred(next);
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
          fontWeight: 950,
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

  const handleQuickChip = (label: 'Nova carga' | 'Orçamento' | 'Comprovante' | 'Localização') => {
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

  const border = palette.sidebarBorder;
  const softBg = palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : ZAPTRO_FIELD_BG;
  const activeCargo = selectedChat ? cargoPhaseFor(selectedChat.id) : 'transito';
  const pillOn = (key: CargoPhase) =>
    activeCargo === key
      ? { backgroundColor: '#D9FF00', color: '#000', borderColor: '#D9FF00' }
      : { backgroundColor: 'transparent', color: palette.textMuted, borderColor: border };

  const shellStyle: React.CSSProperties = {
    flex: 1,
    borderRadius: 24,
    border: `1px solid ${border}`,
    overflow: 'hidden',
    minHeight: 'min(820px, calc(100dvh - 148px))',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    boxShadow:
      palette.mode === 'dark'
        ? '0 0 0 1px rgba(255,255,255,0.04), 0 24px 48px rgba(0,0,0,0.32)'
        : '0 1px 2px rgba(15,23,42,0.06), 0 20px 44px rgba(15,23,42,0.07)',
    backgroundColor: 'rgba(217, 255, 0, 0.16)',
  };

  const callModalName = selectedChat ? getDisplayName(selectedChat) : '';
  const callModalPhone = selectedChat?.sender_number?.trim() || '—';
  const callModalDigits = selectedChat ? digitsForTel(selectedChat.sender_number) : '';

  return (
    <ZaptroLayout
      contentFullWidth
      scrollAreaTop={
        selectedChat ? (
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 12,
              color: 'rgba(88, 89, 90, 1)',
              lineHeight: 1.45,
              fontWeight: 600,
              paddingLeft: 'clamp(16px, 3vw, 48px)',
              paddingRight: 'clamp(16px, 3vw, 48px)',
              boxSizing: 'border-box',
            }}
          >
            Agrupado como no WhatsApp: o que enviaste ou recebeste nesta conversa (NF, fotos, PDFs) aparece aqui para
            consulta rápida.
          </p>
        ) : null
      }
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
    <div style={{ ...styles.container, flex: 1, minHeight: 0 }}>
      <div style={{ ...styles.sidebar, borderRight: `1px solid ${border}`, backgroundColor: palette.sidebarBg }}>
        <div style={styles.sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ ...styles.sidebarTitle, color: palette.text, marginBottom: 0 }}>Mensagens</h2>
            {showDemoInboxNotice && (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 950,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '5px 10px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(217, 255, 0, 0.22)',
                  color: palette.mode === 'dark' ? '#ecfccb' : '#14532d',
                  border: `1px solid ${palette.mode === 'dark' ? 'rgba(217,255,0,0.35)' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                Demo
              </span>
            )}
          </div>
          <div style={{ ...styles.liveIndicator, marginTop: 10 }}>
            <div style={styles.liveDot} /> Zaptro Pro Intelligence ativa
          </div>
          {showDemoInboxNotice && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                boxSizing: 'border-box',
                backgroundColor: palette.mode === 'dark' ? '#182229' : '#f0f2f5',
                border:
                  palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <BellOff
                size={20}
                strokeWidth={2}
                color={palette.mode === 'dark' ? '#8696a0' : '#54656f'}
                style={{ flexShrink: 0, marginTop: 1 }}
                aria-hidden
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.45,
                    fontWeight: 400,
                    color: palette.mode === 'dark' ? '#e9edef' : '#111b21',
                  }}
                >
                  Pré-visualização: conversas fictícias para testar o layout.
                </p>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    fontWeight: 400,
                    color: palette.mode === 'dark' ? '#8696a0' : '#667781',
                  }}
                >
                  Quando existirem dados reais, esta lista é substituída automaticamente.{' '}
                  <span style={{ color: '#00a884', fontWeight: 500 }}>Modo demonstração</span>
                </p>
              </div>
            </div>
          )}
          <div
            role="tablist"
            aria-label="Filtro da lista de conversas"
            style={{
              marginTop: 14,
              paddingTop: 13,
              paddingBottom: 13,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              maxWidth: 358,
              width: '100%',
            }}
          >
            {(
              [
                { id: 'all' as const, label: 'Tudo' },
                { id: 'unread' as const, label: 'Não lidas' },
                { id: 'starred' as const, label: 'Favoritas' },
                { id: 'groups' as const, label: 'Grupos' },
              ] as const
            ).map(({ id, label }) => {
              const on = waInboxFilter === id;
              const dark = palette.mode === 'dark';
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setWaInboxFilter(id)}
                  title={
                    id === 'groups'
                      ? 'Mostrar só conversas de grupo / equipa já registadas'
                      : id === 'starred'
                        ? 'Conversas que marcou com a estrela'
                        : id === 'unread'
                          ? 'Conversas com mensagens por ler'
                          : undefined
                  }
                  style={{
                    borderRadius: 999,
                    padding: '6px 14px',
                    fontSize: 10,
                    fontWeight: on ? 700 : 500,
                    cursor: 'pointer',
                    border: on
                      ? '1px solid transparent'
                      : dark
                        ? '1px solid rgba(134,150,160,0.28)'
                        : '1px solid rgba(15,23,42,0.12)',
                    backgroundColor: on
                      ? dark
                        ? 'rgba(255,255,255,0.14)'
                        : ZAPTRO_SOFT_NEUTRAL_MUTED
                      : 'transparent',
                    color: on ? (dark ? '#e9edef' : 'rgba(74, 74, 74, 1)') : dark ? 'rgba(233,237,239,0.55)' : '#64748b',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div
            style={{
              ...styles.searchBox,
              width: '100%',
              maxWidth: 358,
              boxSizing: 'border-box',
              backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f4f4f4',
              marginTop: 12,
            }}
          >
            <Search size={16} color="#737373" />
            <input
              placeholder="Buscar conversas…"
              style={{ ...styles.searchInput, color: palette.text }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.chatList}>
          {loading ? (
            <div style={styles.loadingArea}>
              <Clock className="spin" size={24} color="#D9FF00" />
            </div>
          ) : filteredInboxList.length === 0 ? (
            <div
              style={{
                padding: '28px 24px',
                fontSize: 13,
                color: palette.textMuted,
                fontWeight: 600,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              Nenhuma conversa corresponde a este filtro ou à pesquisa.
            </div>
          ) : (
            filteredInboxList.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                style={{
                  ...styles.chatItem,
                  backgroundColor: selectedChat?.id === chat.id ? 'rgba(217, 255, 0, 0.09)' : 'transparent',
                  borderLeft: selectedChat?.id === chat.id ? '4px solid #D9FF00' : '4px solid transparent',
                }}
              >
                <div style={styles.avatarWrap}>{renderAvatar(chat, 'list')}</div>
                <div style={styles.itemMain}>
                  <div style={styles.itemHeader}>
                    <span style={{ ...styles.itemName, color: palette.text }}>{getDisplayName(chat)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
                    </span>
                  </div>
                  <p style={styles.itemPreview}>{chat.last_message || 'Nenhuma mensagem'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.centerColumn}>
        {selectedChat ? (
          <>
            <div style={{ ...styles.chatHeader, borderBottom: `1px solid ${border}`, backgroundColor: palette.sidebarBg }}>
              <div style={styles.headerProfile}>
                {renderAvatar(selectedChat, 'header')}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ ...styles.activeName, color: palette.text }}>{getDisplayName(selectedChat)}</h3>
                    {isZaptroDemoConversationId(selectedChat.id) && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 950,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '4px 8px',
                          borderRadius: 8,
                          backgroundColor: 'rgba(217, 255, 0, 0.2)',
                          color: palette.text,
                          border: `1px solid ${border}`,
                        }}
                      >
                        Demonstração
                      </span>
                    )}
                  </div>
                  <div style={styles.statusRow}>
                    <span style={styles.onlinePill}>● online</span>
                  </div>
                </div>
              </div>
              <div style={styles.headerActions}>
                <button
                  type="button"
                  style={{ ...styles.iconRound, borderColor: border, color: palette.text }}
                  title="Ligar — ver número e aviso"
                  onClick={() => setCallActionModal('voice')}
                >
                  <Phone size={18} />
                </button>
                <button
                  type="button"
                  style={{ ...styles.iconRound, borderColor: border, color: palette.text }}
                  title="Vídeo — informação"
                  onClick={() => setCallActionModal('video')}
                >
                  <Video size={18} />
                </button>
                <button type="button" style={{ ...styles.iconRound, borderColor: border, color: palette.text }} title="Mais">
                  <MoreVertical size={18} />
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.assignBtn,
                    opacity: assigning ? 0.65 : 1,
                    cursor: assigning ? 'wait' : 'pointer',
                  }}
                  disabled={assigning}
                  onClick={() => void handleAssignResponsible()}
                >
                  {assigning ? 'A atribuir…' : 'Atribuir responsável'}
                </button>
              </div>
            </div>

            <div style={{ ...styles.cargoStrip, borderBottom: `1px solid ${border}`, backgroundColor: softBg }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: palette.mode === 'dark' ? '4px 0 2px' : '16px 18px',
                  borderRadius: palette.mode === 'dark' ? 0 : 16,
                  backgroundColor: palette.mode === 'dark' ? 'transparent' : ZAPTRO_SOFT_NEUTRAL_MUTED,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    role="group"
                    aria-label="Estado da carga"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 10,
                      minWidth: 0,
                      flex: '1 1 220px',
                    }}
                  >
                    {(
                      [
                        { id: 'coletado' as const, label: 'Coletado' },
                        { id: 'transito' as const, label: 'Em trânsito' },
                        { id: 'entregue' as const, label: 'Entregue' },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => selectedChat && setCargoPhaseForChat(selectedChat.id, id)}
                        style={{
                          ...styles.cargoPill,
                          border: `1px solid ${border}`,
                          ...pillOn(id),
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginLeft: 4,
                        paddingLeft: 6,
                        borderLeft: `1px solid ${border}`,
                        minHeight: 28,
                        boxSizing: 'border-box',
                      }}
                      aria-hidden={true}
                    >
                      <Truck size={18} color={palette.lime} aria-hidden />
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateCargoStatus}
                    style={{
                      ...styles.updateCargoBtn,
                      backgroundColor: palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                      color: palette.text,
                      borderColor: border,
                    }}
                  >
                    Atualizar status
                  </button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    columnGap: 20,
                    rowGap: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    width: '100%',
                    boxSizing: 'border-box',
                    paddingTop: 4,
                    borderTop: palette.mode === 'dark' ? `1px solid rgba(255,255,255,0.08)` : `1px solid rgba(0,0,0,0.07)`,
                  }}
                >
                  <span style={{ ...styles.metaItem, color: palette.textMuted }}>
                    <MapPin size={15} strokeWidth={2.2} /> Origem → Destino
                  </span>
                  <span style={{ ...styles.metaItem, color: palette.textMuted }}>
                    <Calendar size={15} strokeWidth={2.2} /> Prazo: —
                  </span>
                  <span style={{ ...styles.metaItem, color: palette.textMuted }}>
                    <DollarSign size={15} strokeWidth={2.2} /> Frete: —
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                ...styles.aiHint,
                borderBottom: `1px solid ${border}`,
                backgroundColor: palette.mode === 'dark' ? palette.sidebarBg : '#f4f4f4',
              }}
            >
              <Sparkles size={16} color={palette.lime} style={{ flexShrink: 0 }} />
              <span style={{ color: palette.textMuted, fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>
                {assistantHint}
              </span>
            </div>

            {slaBreached ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderBottom: `1px solid ${border}`,
                  backgroundColor: palette.mode === 'dark' ? 'rgba(251,191,36,0.12)' : '#FFFBEB',
                  color: palette.mode === 'dark' ? '#FDE68A' : '#92400E',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.45 }}>
                  Cliente há mais de {SLA_CUSTOMER_REPLY_MIN} min na fila (última entrada). Prioriza resposta ou
                  reatribui a conversa.
                </span>
              </div>
            ) : null}

            <div
              style={{
                ...styles.messagesArea,
                backgroundColor: palette.mode === 'dark' ? palette.searchBg : ZAPTRO_FIELD_BG,
              }}
            >
              {messages.map((msg) => {
                const isOut = msg.direction === 'out';
                return (
                  <div key={msg.id} style={{...styles.msgRow, justifyContent: isOut ? 'flex-end' : 'flex-start'}}>
                    <div
                      style={{
                        ...styles.bubble,
                        backgroundColor: isOut ? '#D9FF00' : palette.mode === 'dark' ? '#1E293B' : '#FFFFFF',
                        color: isOut ? '#000000' : palette.text,
                        borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        border: isOut ? 'none' : `1px solid ${palette.mode === 'dark' ? 'rgba(148,163,184,0.2)' : border}`,
                      }}
                    >
                      <p style={styles.msgText}>{msg.content}</p>
                      <span
                        style={{
                          display: 'block',
                          marginTop: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          opacity: 0.55,
                          textAlign: isOut ? 'right' : 'left',
                        }}
                      >
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ ...styles.quickBar, borderTop: `1px solid ${border}`, backgroundColor: palette.sidebarBg }}>
              {(['Nova carga', 'Orçamento', 'Comprovante', 'Localização'] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleQuickChip(label)}
                  style={{ ...styles.quickChip, borderColor: border, color: palette.text }}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (!canUseTransfer) {
                    notifyZaptro(
                      'info',
                      'Transferir',
                      'Só o responsável atual, um administrador da empresa ou conversa sem dono pode reatribuir.',
                    );
                    return;
                  }
                  setTransferOpen((v) => !v);
                }}
                style={{
                  ...styles.quickChip,
                  borderColor: transferOpen ? palette.lime : border,
                  color: palette.text,
                  fontWeight: 950,
                  backgroundColor: transferOpen
                    ? palette.mode === 'dark'
                      ? 'rgba(217,255,0,0.12)'
                      : 'rgba(217,255,0,0.35)'
                    : 'transparent',
                }}
              >
                Transferir
              </button>
            </div>

            {transferOpen && selectedChat ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderTop: `1px solid ${border}`,
                  backgroundColor: softBg,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <label style={{ fontSize: 11, fontWeight: 950, color: palette.textMuted, display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 200px' }}>
                  Passar conversa para
                  <select
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: `1px solid ${border}`,
                      backgroundColor: palette.mode === 'dark' ? '#111' : '#fff',
                      color: palette.text,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">— Escolher colega —</option>
                    {teamMembers
                      .filter((m) => m.id !== profile?.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name?.trim() || m.id}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!transferTargetId || transferring}
                  onClick={() => void handleTransferToUser()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#000',
                    color: LIME,
                    fontWeight: 950,
                    fontSize: 13,
                    cursor: transferring || !transferTargetId ? 'not-allowed' : 'pointer',
                    opacity: transferring || !transferTargetId ? 0.55 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {transferring ? 'A transferir…' : 'Confirmar transferência'}
                </button>
                <button
                  type="button"
                  onClick={() => setTransferOpen(false)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: `1px solid ${border}`,
                    background: 'transparent',
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: 'pointer',
                    color: palette.textMuted,
                    fontFamily: 'inherit',
                  }}
                >
                  Fechar
                </button>
              </div>
            ) : null}

            {sendBlocked ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderTop: `1px solid ${border}`,
                  backgroundColor: palette.mode === 'dark' ? 'rgba(248,113,113,0.1)' : '#FEF2F2',
                  color: palette.text,
                }}
              >
                <Lock size={18} style={{ flexShrink: 0, color: '#f87171' }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, flex: '1 1 200px', lineHeight: 1.45 }}>
                  Envio bloqueado: conversa atribuída a outro agente. Atribui a ti para responder por aqui.
                </p>
                <button
                  type="button"
                  disabled={assigning}
                  onClick={() => void handleAssignResponsible()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#000',
                    color: LIME,
                    fontWeight: 950,
                    fontSize: 13,
                    cursor: assigning ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {assigning ? '…' : 'Atribuir a mim'}
                </button>
              </div>
            ) : null}

            <div style={{ ...styles.inputFooter, backgroundColor: palette.sidebarBg }}>
              <form
                onSubmit={handleSendMessage}
                style={{
                  ...styles.inputContainer,
                  backgroundColor: palette.mode === 'dark' ? '#111' : '#f4f4f4',
                  border: `1px solid ${border}`,
                }}
              >
                <button type="button" style={styles.inputSideBtn} title="Anexo" disabled={sendBlocked}>
                  <Paperclip size={18} color={palette.textMuted} />
                </button>
                <button type="button" style={styles.inputSideBtn} title="Imagem" disabled={sendBlocked}>
                  <ImageIcon size={18} color={palette.textMuted} />
                </button>
                <input
                  placeholder={sendBlocked ? 'Atribui a conversa a ti para escrever…' : 'Escreva uma mensagem…'}
                  style={{ ...styles.inputField, color: palette.text, opacity: sendBlocked ? 0.55 : 1 }}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending || sendBlocked}
                />
                <button type="submit" disabled={!newMessage.trim() || sending || sendBlocked} style={styles.sendBtn}>
                  <Send size={18} color="#000" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ ...styles.emptyView, background: softBg }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.mode === 'dark' ? 'rgba(217,255,0,0.1)' : 'rgba(217,255,0,0.35)',
                border: `1px solid ${palette.mode === 'dark' ? 'rgba(217,255,0,0.25)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <Zap size={40} color="#D9FF00" fill="#0a0a0a" />
            </div>
            <h2 style={{ color: palette.text, fontWeight: 950, fontSize: 22, letterSpacing: '-0.03em', margin: 0 }}>
              Zaptro Pro Messenger
            </h2>
            <p style={{ color: palette.textMuted, maxWidth: 400, fontWeight: 600, fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              {showDemoInboxNotice
                ? 'As conversas à esquerda são de demonstração — escolha uma para ver o painel completo (carga, chat e lateral).'
                : 'Selecione uma conversa à esquerda. O painel central reúne chat, status da carga e ações rápidas.'}
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          ...styles.rightPanel,
          borderLeft: `1px solid ${border}`,
          backgroundColor: palette.sidebarBg,
          color: palette.text,
        }}
      >
        {selectedChat ? (
          <>
            <div style={{ ...styles.rightHead, width: '100%', boxSizing: 'border-box' }}>
              {renderAvatar(selectedChat, 'panel')}
              <h3 style={{ margin: '12px 0 6px', fontSize: 15, fontWeight: 950, color: palette.text }}>{getDisplayName(selectedChat)}</h3>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 22,
                  fontWeight: 600,
                  color: 'rgba(102, 237, 83, 1)',
                  letterSpacing: '0.01em',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.25,
                  fontFamily: WHATSAPP_PHONE_FONT_FAMILY,
                }}
              >
                {selectedChat.sender_number}
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: palette.textMuted, fontWeight: 700 }}>
                {company?.name?.trim() || 'A tua empresa'} · contacto WhatsApp
              </p>
              {waGatewayStatus === 'checking' && (
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  style={{
                    margin: '0 0 12px',
                    padding: '9px 7px',
                    borderRadius: 8,
                    backgroundColor: palette.mode === 'dark' ? 'rgba(217,255,0,0.08)' : 'rgba(217, 255, 0, 0.33)',
                    border: `1px solid ${palette.mode === 'dark' ? 'rgba(217,255,0,0.2)' : 'rgba(0,0,0,0.06)'}`,
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      height: 3,
                      borderRadius: 999,
                      overflow: 'hidden',
                      marginBottom: 8,
                      backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: '42%',
                        borderRadius: 999,
                        background: `linear-gradient(90deg, transparent, ${palette.lime}, transparent)`,
                        animation: 'zaptroWaConnectBar 1.35s ease-in-out infinite',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }} aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            backgroundColor: palette.lime,
                            animation: `zaptroWaConnectDot 1s ease-in-out ${i * 0.15}s infinite`,
                          }}
                        />
                      ))}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        lineHeight: 1.3,
                        color: palette.mode === 'dark' ? 'rgba(233,237,239,0.85)' : 'rgba(74, 74, 74, 1)',
                        letterSpacing: 0,
                      }}
                    >
                      A conectar ao gateway WhatsApp…
                    </span>
                  </div>
                </div>
              )}
              <p style={{ margin: 0, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', color: palette.textMuted }}>
                PERFIL · TUDO O QUE PARTILHAS COM O CLIENTE
              </p>
            </div>
            <div style={styles.rightSection}>
              <h4 style={styles.rightH4}>Documentos, mídia e envios</h4>
              <button type="button" style={{ ...styles.docRow, borderColor: border }} onClick={() => openNotaFiscalFromChat()}>
                <FileText size={18} color={palette.lime} />
                <span style={{ flex: 1, minWidth: 0, color: palette.text }}>Nota fiscal</span>
                {nfeIntegrations.length > 0 ? (
                  <span style={{ fontSize: 10, fontWeight: 800, color: palette.textMuted, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nfeIntegrations[0].name}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 800, color: palette.textMuted }}>API</span>
                )}
              </button>
              <button type="button" style={{ ...styles.docRow, borderColor: border }}>
                <ImageIcon size={18} color={palette.lime} /> Imagens e vídeos do chat
              </button>
              <button type="button" style={{ ...styles.docRow, borderColor: border }}>
                <Package size={18} color={palette.lime} /> Fotos da carga / POD
              </button>
              <button type="button" style={{ ...styles.docRow, borderColor: border }}>
                <Paperclip size={18} color={palette.lime} /> Outros anexos
              </button>
            </div>
            <div style={styles.rightSection}>
              <h4 style={styles.rightH4}>Resumo logístico</h4>
              <p style={{ margin: 0, fontSize: 13, color: palette.textMuted, lineHeight: 1.55, fontWeight: 600 }}>
                Estado da carga nesta conversa: <strong style={{ color: palette.text }}>{CARGO_PHASE_LABEL[activeCargo]}</strong>.
                Origem, destino e frete estão na barra compacta acima das mensagens.
              </p>
            </div>
            <div style={styles.rightSection}>
              <h4 style={styles.rightH4}>Alertas</h4>
              <div style={{ ...styles.alertBox, borderColor: border }}>
                Nenhum alerta ativo nesta conversa (protótipo de UI).
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 32,
              gap: 12,
              color: palette.textMuted,
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            <Package size={36} strokeWidth={1.8} color={palette.lime} style={{ opacity: 0.85 }} />
            <p style={{ margin: 0, maxWidth: 220 }}>
              Documentos, resumo logístico e alertas aparecem aqui quando uma conversa estiver ativa.
            </p>
          </div>
        )}
      </div>
    </div>
    </div>

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
        }}
        onClick={() => setCallActionModal(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="zaptro-call-modal-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 22,
            border: `1px solid ${border}`,
            backgroundColor: palette.mode === 'dark' ? '#111' : '#fff',
            color: palette.text,
            boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
            padding: '22px 22px 18px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', color: palette.textMuted }}>
                {callActionModal === 'voice' ? 'CHAMADA DE VOZ' : 'CHAMADA DE VÍDEO'}
              </p>
              <h2 id="zaptro-call-modal-title" style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 950, letterSpacing: '-0.03em', lineHeight: 1.25 }}>
                {callActionModal === 'voice'
                  ? `Ligue agora para ${callModalName}`
                  : `Vídeo com ${callModalName}`}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setCallActionModal(null)}
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: 12,
                border: `1px solid ${border}`,
                background: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: palette.text,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {callActionModal === 'voice' ? (
            <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: palette.textMuted, lineHeight: 1.5 }}>
              Utilize o número abaixo no <strong style={{ color: palette.text }}>telefone do seu dispositivo</strong>. O Zaptro mostra aqui o contacto apenas como referência.
            </p>
          ) : (
            <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: palette.textMuted, lineHeight: 1.5 }}>
              <strong style={{ color: palette.text }}>Não fazemos</strong> chamadas de vídeo pela aplicação Zaptro. O contacto com o cliente continua por <strong style={{ color: palette.text }}>mensagens escritas</strong> neste painel.
            </p>
          )}

          <div
            style={{
              padding: '14px 16px',
              borderRadius: 16,
              border: `1px solid ${border}`,
              backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : ZAPTRO_FIELD_BG,
              marginBottom: 14,
            }}
          >
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', color: palette.textMuted }}>TELEFONE</p>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 950,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: WHATSAPP_PHONE_FONT_FAMILY,
              }}
            >
              {callModalPhone}
            </p>
          </div>

          <p
            style={{
              margin: '0 0 16px',
              fontSize: 12,
              fontWeight: 700,
              color: palette.textMuted,
              lineHeight: 1.55,
              paddingTop: 4,
              borderTop: `1px dashed ${border}`,
            }}
          >
            O Zaptro <strong style={{ color: palette.text }}>não grava nem transmite</strong> chamadas de voz ou vídeo. Apenas as{' '}
            <strong style={{ color: palette.text }}>mensagens escritas</strong> desta conversa ficam registadas no sistema para a sua equipa trabalhar em conjunto.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(callModalDigits || callModalPhone).catch(() => {});
                toastSuccess('Número copiado.');
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
                fontWeight: 950,
                fontSize: 13,
                cursor: 'pointer',
                color: palette.text,
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
                  fontWeight: 950,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Phone size={16} /> Abrir chamada no telefone
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setCallActionModal(null)}
              style={{
                flex: '1 1 100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: 'none',
                background: 'transparent',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                color: palette.textMuted,
                fontFamily: 'inherit',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    ) : null}
      </>
    </ZaptroLayout>
  );
};

const WhatsAppPremium: React.FC = () => {
  return (
    <>
      <WhatsAppPremiumContent />
      <style>{`
        .spin { animation: rotate 2s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', height: '100%', overflow: 'hidden', width: '100%', minHeight: 0 },
  sidebar: { width: '358px', minWidth: 280, display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '24px 30px' },
  sidebarTitle: { margin: '0 0 8px 0', fontSize: '26px', fontWeight: 600, letterSpacing: '0.1px' },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '10px',
    color: 'rgba(75, 231, 8, 1)',
    fontWeight: 800,
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
  itemName: { fontWeight: 900, fontSize: '15px' },
  itemTime: { fontSize: '10px', color: '#737373', fontWeight: 700, lineHeight: 1.3 },
  itemPreview: { fontSize: '13px', color: '#737373', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 },
  /** Base 224px — evita coluna central colapsar (~96px) quando o flex reparte espaço. */
  centerColumn: { flex: '1 1 224px', minWidth: 224, display: 'flex', flexDirection: 'column' },
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
    fontWeight: 950,
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
  onlinePill: { fontSize: 10, fontWeight: 800, color: 'rgba(75, 231, 8, 1)', lineHeight: 1.3 },
  statusPill: { fontSize: 10, fontWeight: 800, lineHeight: 1.3 },
  cargoStrip: { padding: '14px 22px 16px' },
  cargoPills: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  cargoPill: {
    padding: '10px 16px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
    border: '1px solid',
  },
  metaItem: { display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1.45 },
  updateCargoBtn: {
    padding: '10px 16px',
    borderRadius: 12,
    border: '1px solid #CBD5E1',
    background: '#fff',
    fontWeight: 950,
    fontSize: 13,
    cursor: 'pointer',
    flexShrink: 0,
  },
  aiHint: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 24px' },
  activeName: { margin: 0, fontSize: '17px', fontWeight: 950 },
  messagesArea: { flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 },
  msgRow: { display: 'flex' },
  bubble: { maxWidth: '70%', padding: '14px 20px' },
  msgText: { margin: 0, fontSize: '14px', lineHeight: 1.6 },
  quickBar: { display: 'flex', flexWrap: 'wrap', gap: 10, padding: '16px 28px', alignItems: 'center', boxSizing: 'border-box' },
  quickChip: {
    padding: '8px 12px',
    borderRadius: 12,
    border: '1px solid',
    background: 'transparent',
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
  },
  inputFooter: { padding: '18px 28px 26px', boxSizing: 'border-box' },
  inputContainer: { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 14px', borderRadius: '20px' },
  inputSideBtn: { border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' },
  inputField: { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', fontWeight: 600, minWidth: 0 },
  sendBtn: { border: 'none', backgroundColor: '#D9FF00', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
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
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
    marginBottom: 8,
    textAlign: 'left',
  },
  alertBox: {
    padding: 12,
    borderRadius: 14,
    border: '1px dashed',
    fontSize: 12,
    fontWeight: 700,
    color: '#64748B',
  },
};

export default WhatsAppPremium;
