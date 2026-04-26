import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  X,
  Users,
  ChevronDown,
  Paperclip,
  Search,
  ArrowLeft,
  Hash,
  MapPin,
  Package,
  Calendar,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { isZaptroProductPath } from '../utils/domains';
import { toastSuccess, toastError } from '../lib/toast';

interface Message {
  id: string;
  user_name: string;
  text: string;
  user_id: string;
  timestamp: Date;
  room_id?: string;
  attachment_url?: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  type: 'user' | 'department';
  /** Só utilizadores — URL pública da foto de perfil (Supabase `profiles.avatar_url`). */
  avatarUrl?: string | null;
}

/** Miniatura no cabeçalho do chat e nas linhas de pesquisa (foto ou iniciais / setor). */
function TeamMemberThumb({
  contact,
  size,
  variant,
}: {
  contact: Contact;
  size: number;
  variant: 'header' | 'list';
}) {
  const br = Math.max(8, Math.round(size * 0.32));
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: br,
    flexShrink: 0,
    objectFit: 'cover',
    boxSizing: 'border-box',
  };
  const ringHeader: React.CSSProperties =
    variant === 'header' ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.4)' } : { border: '1px solid #e2e8f0' };

  if (contact.type === 'user' && contact.avatarUrl) {
    return <img src={contact.avatarUrl} alt="" style={{ ...base, ...ringHeader }} />;
  }
  if (contact.type === 'department') {
    return (
      <div
        style={{
          ...base,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'header' ? 'rgba(255,255,255,0.22)' : '#f1f5f9',
          color: variant === 'header' ? '#fff' : '#64748b',
        }}
      >
        <Hash size={Math.round(size * 0.45)} strokeWidth={2.2} />
      </div>
    );
  }
  const ch = (contact.name || '?')[0]?.toUpperCase() || '?';
  return (
    <div
      style={{
        ...base,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: Math.max(11, Math.round(size * 0.4)),
        backgroundColor: variant === 'header' ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
        color: variant === 'header' ? '#fff' : '#475569',
        ...(variant === 'header' ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.4)' } : {}),
      }}
    >
      {ch}
    </div>
  );
}

const DEPARTMENTS: Contact[] = [
  { id: 'RH', name: 'Recursos Humanos', role: 'Setor', type: 'department' },
  { id: 'FINANCEIRO', name: 'Financeiro', role: 'Setor', type: 'department' },
  { id: 'LOGISTICA', name: 'Logística', role: 'Setor', type: 'department' },
  { id: 'EQUIPE GERAL', name: 'Canal Geral', role: 'Setor', type: 'department' },
];

type ClientSummary = {
  name: string;
  doc: string;
  route: string;
  product: string;
  eta: string;
  phoneDigits: string;
};

function onlyDigits(s: string) {
  return s.replace(/\D/g, '');
}

/** Resumo de exemplo: liga nome / CPF / CNPJ a uma rota e contacto (dados fictícios até integrar API). */
function threadKey(c: Contact): string {
  return c.type === 'department' ? `d:${c.id}` : `u:${c.id}`;
}

/** Chave da thread para uma linha nova em `chat_messages` (vista do utilizador actual). */
function threadKeyFromInboundRow(row: { room_id?: string | null; sender_id?: string; receiver_id?: string | null }, myId: string): string | null {
  if (row.sender_id === myId) return null;
  if (row.room_id) return `d:${row.room_id}`;
  if (row.receiver_id === myId && row.sender_id) return `u:${row.sender_id}`;
  return null;
}

function mockClientSummary(query: string): ClientSummary {
  const raw = query.trim();
  const digits = onlyDigits(raw);
  const isCnpj = digits.length === 14;
  const isCpf = digits.length === 11;
  const name =
    raw.includes('@') ? raw.split('@')[0].replace(/[._-]/g, ' ') : isCnpj ? 'Transportadora Exemplo LTDA' : isCpf ? 'Cliente PF (exemplo)' : raw || 'Cliente sem nome';
  const docLabel = isCnpj ? `CNPJ ${digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}` : isCpf ? `CPF ${digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')}` : raw || '—';
  const phoneDigits = digits.length >= 10 && digits.length <= 13 ? (digits.startsWith('55') ? digits : `55${digits}`) : '5511999887766';
  return {
    name,
    doc: docLabel,
    route: 'Campinas, SP → Recife, PE',
    product: isCnpj ? 'Carga seca — 24 pallets (contrato)' : 'Carga fracionada — 6 pallets',
    eta: 'Previsão: 3 a 5 dias úteis',
    phoneDigits,
  };
}

const Chat: React.FC = () => {
  const { profile, isMaster } = useAuth();
  const location = useLocation();
  const db = useMemo(
    () => (isZaptroProductPath(location.pathname) ? supabaseZaptro : supabase),
    [location.pathname],
  );
  const hasZaptro = (profile?.metadata?.modules?.whatsapp || isMaster) && profile?.status_zaptro === 'autorizado';
  const [isOpen, setIsOpen] = useState(false);
  const [zaptroQuickOpen, setZaptroQuickOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [clientSummary, setClientSummary] = useState<ClientSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact>(DEPARTMENTS[3]); // Default: Geral
  /** Mensagens novas por thread enquanto não estás a ver essa conversa (tempo real). */
  const [threadUnread, setThreadUnread] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const teamSearchInputRef = useRef<HTMLInputElement>(null);
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);
  const selectedRef = useRef(selectedContact);
  const isOpenRef = useRef(isOpen);
  selectedRef.current = selectedContact;
  isOpenRef.current = isOpen;

  const fetchContacts = useCallback(async () => {
    if (!profile?.company_id) return;
    try {
      const { data } = await db
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .eq('company_id', profile.company_id)
        .neq('id', profile.id);
      
      const userContacts: Contact[] = (data || []).map((u: { id: string; full_name: string; role: string; avatar_url?: string | null }) => ({
        id: u.id,
        name: u.full_name || 'Sem nome',
        role: u.role || 'Colaborador',
        type: 'user' as const,
        avatarUrl: u.avatar_url ?? null,
      }));
      setContacts([...DEPARTMENTS, ...userContacts]);
    } catch (err) { console.error(err); }
  }, [db, profile?.company_id, profile?.id]);

  const fetchMessages = useCallback(async () => {
    if (!profile?.id || !selectedContact) return;
    try {
      let query = db.from('chat_messages').select('*, sender_name:profiles(full_name)');
      
      if (selectedContact.type === 'department') {
        query = query.eq('room_id', selectedContact.id).eq('company_id', profile.company_id);
      } else {
        query = query.or(`and(sender_id.eq.${profile.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${profile.id})`);
      }

      const { data } = await query.order('created_at', { ascending: true }).limit(80);
      
      if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          user_name: m.sender_name?.full_name || 'Usuário',
          text: m.content,
          user_id: m.sender_id,
          timestamp: new Date(m.created_at),
          attachment_url: m.attachment_url
        })));
      }
    } catch (err) { console.error(err); }
  }, [db, profile?.company_id, profile?.id, selectedContact]);

  useEffect(() => {
    if (isOpen) {
      void fetchContacts();
      void fetchMessages();
    }
  }, [isOpen, fetchContacts, fetchMessages]);

  /** Tempo real: mensagens da mesma empresa chegam na hora (painel aberto ou fechado). */
  useEffect(() => {
    if (!profile?.id || !profile?.company_id) return;

    const channel = db
      .channel(`floating_chat_live_${profile.company_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `company_id=eq.${profile.company_id}`,
        },
        (payload) => {
          const row = payload.new as {
            company_id?: string;
            sender_id?: string;
            receiver_id?: string | null;
            room_id?: string | null;
          };
          if (!row?.sender_id || row.sender_id === profile.id) return;

          const k = threadKeyFromInboundRow(row, profile.id);
          if (!k) return;

          const open = isOpenRef.current;
          const sel = selectedRef.current;
          const viewingKey = sel ? threadKey(sel) : null;

          if (open && viewingKey === k) {
            void fetchMessages();
            return;
          }
          setThreadUnread((prev) => ({ ...prev, [k]: (prev[k] || 0) + 1 }));
        }
      )
      .subscribe();

    return () => {
      void db.removeChannel(channel);
    };
  }, [db, profile?.company_id, profile?.id, fetchMessages]);

  const clearUnreadFor = useCallback((c: Contact) => {
    const k = threadKey(c);
    setThreadUnread((prev) => ({ ...prev, [k]: 0 }));
  }, []);

  const pickContact = useCallback(
    (c: Contact) => {
      setSelectedContact(c);
      clearUnreadFor(c);
      setIsSearching(false);
      setRecipientPickerOpen(false);
      setSearchQuery('');
    },
    [clearUnreadFor]
  );

  useEffect(() => {
    if (isSearching) {
      const t = window.setTimeout(() => teamSearchInputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [isSearching]);

  useEffect(() => {
    if (isOpen) clearUnreadFor(selectedContact);
  }, [isOpen, selectedContact, clearUnreadFor]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (attachmentUrl?: string) => {
    if ((!inputText.trim() && !attachmentUrl) || !profile || !selectedContact) return;
    
    try {
      const msgData: any = {
        sender_id: profile.id,
        content: inputText || (attachmentUrl ? 'Arquivo enviado' : ''),
        company_id: profile.company_id,
        attachment_url: attachmentUrl
      };

      if (selectedContact.type === 'department') {
        msgData.room_id = selectedContact.id;
      } else {
        msgData.receiver_id = selectedContact.id;
      }

      const { error } = await db.from('chat_messages').insert(msgData);
      if (!error) setInputText('');
    } catch (err) { console.error(err); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulação de upload (Em produção usaríamos supabase.storage)
    const mockUrl = URL.createObjectURL(file);
    handleSend(mockUrl);
    toastSuccess('Arquivo preparado para envio!');
  };

  const onMessageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleTriggerClick = () => {
    setIsOpen(true);
  };

  const openClientQuickPanel = () => {
    setClientSummary(null);
    setClientQuery('');
    setZaptroQuickOpen(true);
    setIsOpen(false);
  };

  const runClientLookup = () => {
    const q = clientQuery.trim();
    if (!q) {
      toastError('Digite nome, CPF ou CNPJ para buscar o resumo.');
      return;
    }
    setClientSummary(mockClientSummary(q));
    toastSuccess('Resumo de exemplo gerado. Em produção isto vem do CRM / TMS.');
  };

  const openWhatsAppForClient = () => {
    if (!clientSummary) return;
    const text = encodeURIComponent(
      `Olá, ${clientSummary.name}! Falo da operação sobre o envio ${clientSummary.route}. Podemos alinhar a entrega?`
    );
    window.open(`https://wa.me/${clientSummary.phoneDigits}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const teamChatTitle =
    'Chat interno só com a equipa: setores (RH, Logística, canal geral) ou um colega. As mensagens chegam em tempo real na mesma empresa — não é WhatsApp com clientes.';
  const teamChatAria = 'Abrir chat interno com a equipa e setores da empresa';

  const totalTeamUnread = useMemo(
    () => Object.values(threadUnread).reduce((a, n) => a + (n > 0 ? n : 0), 0),
    [threadUnread]
  );

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    const tokens = q.split(/\s+/).filter(Boolean);
    return contacts.filter((c) => {
      const hay = `${c.name || ''} ${c.role || ''} ${c.id || ''}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [contacts, searchQuery]);

  if (!isOpen && !zaptroQuickOpen) {
    return (
      <button
        type="button"
        title={teamChatTitle}
        aria-label={teamChatAria}
        style={{
          ...styles.chatTrigger,
          backgroundColor: '#0f172a',
          color: '#ffffff',
        }}
        onClick={handleTriggerClick}
      >
        <MessageSquare size={30} strokeWidth={2} />
        <span style={styles.triggerCol}>
          <span style={styles.triggerLabel}>Chat da equipa</span>
          <span style={styles.triggerHint}>Interno · tempo real</span>
        </span>
        {totalTeamUnread > 0 ? (
          <span style={styles.unreadBubble} aria-label={`${totalTeamUnread} mensagens por ler`}>
            {totalTeamUnread > 99 ? '99+' : totalTeamUnread}
          </span>
        ) : (
          <div style={{ ...styles.onlineDot, backgroundColor: '#10b981' }} />
        )}
      </button>
    );
  }

  if (zaptroQuickOpen) {
    return (
      <div style={styles.zaptroQuickWrap}>
        <div style={styles.zaptroQuickPanel}>
          <header style={styles.zaptroQuickHeader}>
            <div>
              <p style={styles.zaptroQuickKicker}>BUSCA RÁPIDA</p>
              <h2 style={styles.zaptroQuickTitle}>Cliente / rota / carga</h2>
              <p style={styles.zaptroQuickSub}>Digite nome, CPF ou CNPJ para ver um resumo de exemplo e abrir o WhatsApp com o contacto.</p>
            </div>
            <button
              type="button"
              style={styles.zaptroQuickClose}
              onClick={() => {
                setZaptroQuickOpen(false);
                setIsOpen(true);
              }}
              aria-label="Fechar e voltar ao chat da equipa"
            >
              <X size={20} />
            </button>
          </header>
          <div style={styles.zaptroQuickSearchRow}>
            <Search size={18} color="#64748b" />
            <input
              style={styles.zaptroQuickInput}
              placeholder="Nome, CPF ou CNPJ do cliente…"
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runClientLookup()}
            />
            <button type="button" style={styles.zaptroQuickSearchBtn} onClick={runClientLookup}>
              Buscar
            </button>
          </div>
          {clientSummary && (
            <div style={styles.zaptroQuickCard}>
              <p style={styles.zaptroQuickName}>{clientSummary.name}</p>
              <p style={styles.zaptroQuickDoc}>{clientSummary.doc}</p>
              <ul style={styles.zaptroQuickList}>
                <li>
                  <MapPin size={16} /> <strong>Rota:</strong> {clientSummary.route}
                </li>
                <li>
                  <Package size={16} /> <strong>Produto / carga:</strong> {clientSummary.product}
                </li>
                <li>
                  <Calendar size={16} /> <strong>{clientSummary.eta}</strong>
                </li>
                <li>
                  <Phone size={16} /> <strong>WhatsApp:</strong> +{clientSummary.phoneDigits}
                </li>
              </ul>
              <button type="button" style={styles.zaptroQuickWaBtn} onClick={openWhatsAppForClient}>
                <ExternalLink size={18} /> Falar com o cliente no WhatsApp
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          style={{ ...styles.chatTrigger, marginTop: 12, alignSelf: 'flex-end' }}
          onClick={() => {
            setZaptroQuickOpen(false);
            setIsOpen(true);
          }}
        >
          <X size={22} />
          <span style={styles.triggerLabel}>Voltar ao chat da equipa</span>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.chatWindow}>
      <header style={styles.chatHeader}>
        <div style={styles.headerInfo}>
           {isSearching ? (
             <button style={styles.hBtn} onClick={() => setIsSearching(false)}><ArrowLeft size={18} /></button>
           ) : (
             <div style={styles.avatarMini}>
               <TeamMemberThumb contact={selectedContact} size={36} variant="header" />
             </div>
           )}
           <div onClick={() => setIsSearching(true)} style={{ cursor: 'pointer', minWidth: 0 }}>
              <p style={styles.headerTitle}>{isSearching ? 'Quem recebe a mensagem' : selectedContact.name}</p>
              {!isSearching && (
              <div style={styles.statusRow}>
                {selectedContact.type === 'department' ? (
                  <>Canal de setor · toda a equipa · lista <ChevronDown size={10} /></>
                ) : (
                  <>
                    {(selectedContact.role || 'Colaborador').replace(/_/g, ' ')} · pesquisa ou lista{' '}
                    <ChevronDown size={10} />
                  </>
                )}
              </div>
            )}
           </div>
        </div>
        <div style={styles.headerActions}>
           {hasZaptro && isZaptroProductPath(location.pathname) ? (
             <button
               type="button"
               style={styles.hBtn}
               title="Busca rápida de cliente (exemplo) — o WhatsApp com clientes fica em Conversas"
               onClick={openClientQuickPanel}
             >
               <Search size={18} />
             </button>
           ) : null}
           <button style={styles.hBtn} onClick={() => setIsOpen(false)}><X size={18} /></button>
        </div>
      </header>

      {isSearching ? (
        <div style={styles.searchPanel}>
           <div style={styles.searchBar}>
              <Search size={16} color="#94a3b8" />
              <input
                ref={teamSearchInputRef}
                placeholder="Nome ou função (ex.: Maria comercial)…"
                style={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <div style={styles.contactResults}>
              {filteredContacts.map((c) => (
                <div
                  key={`${c.type}-${c.id}`}
                  style={styles.contactRow}
                  onClick={() => pickContact(c)}
                >
                   <TeamMemberThumb contact={c} size={36} variant="list" />
                   <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.contactName}>{c.name}</p>
                      <p style={styles.contactRole}>
                        {c.type === 'department' ? 'Setor · recebe toda a equipa' : (c.role || 'Colaborador').replace(/_/g, ' ')}
                      </p>
                   </div>
                   {(threadUnread[threadKey(c)] || 0) > 0 ? (
                     <span style={styles.contactRowBadge}>{threadUnread[threadKey(c)]! > 99 ? '99+' : threadUnread[threadKey(c)]}</span>
                   ) : null}
                </div>
              ))}
           </div>
        </div>
      ) : (
        <>
          <div style={styles.recipientSearchStrip}>
            <Search size={16} color="#94a3b8" />
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Nome ou função do colega, ou setor…"
              style={styles.recipientSearchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setRecipientPickerOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setRecipientPickerOpen(false), 200);
              }}
            />
          </div>
          {recipientPickerOpen ? (
            <div style={styles.recipientSearchDropdown}>
              {filteredContacts.length === 0 ? (
                <p style={styles.recipientSearchEmpty}>Nenhum colega ou setor corresponde à pesquisa.</p>
              ) : (
                filteredContacts.map((c) => (
                  <button
                    key={`${c.type}-${c.id}`}
                    type="button"
                    style={styles.recipientSearchRow}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickContact(c)}
                  >
                    <TeamMemberThumb contact={c} size={34} variant="list" />
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' as const }}>
                      <span style={styles.recipientSearchRowName}>{c.name}</span>
                      <span style={styles.recipientSearchRowMeta}>
                        {c.type === 'department' ? 'Setor · mensagens em tempo real' : (c.role || 'Colaborador').replace(/_/g, ' ')}
                      </span>
                    </span>
                    {(threadUnread[threadKey(c)] || 0) > 0 ? (
                      <span style={styles.contactRowBadge}>{threadUnread[threadKey(c)]! > 99 ? '99+' : threadUnread[threadKey(c)]}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}
          <div style={styles.messageArea} ref={scrollRef}>
            {messages.length === 0 ? (
              <div style={styles.emptyThread}>
                <Users size={28} color="#94a3b8" style={{ marginBottom: 10 }} />
                <p style={styles.emptyThreadTitle}>Mensagens só entre equipa</p>
                <p style={styles.emptyThreadText}>
                  Usa a <strong>pesquisa acima</strong> para escolher um <strong>colega</strong> ou um <strong>setor</strong>. A mensagem chega <strong>na hora</strong> a quem está nessa conversa; com o painel fechado ou outro destinatário, vês a{' '}
                  <strong>bolha vermelha</strong> no botão flutuante.
                </p>
                <p style={{ ...styles.emptyThreadText, marginTop: 10 }}>
                  Conversas com clientes (WhatsApp) ficam na área <strong>Conversas</strong> do produto — este painel é só equipa interna.
                </p>
              </div>
            ) : null}
            {messages.map(msg => (
              <div key={msg.id} style={{...styles.messageItem, alignSelf: msg.user_id === profile?.id ? 'flex-end' : 'flex-start'}}>
                <div style={styles.msgHeader}>
                   <span style={styles.msgUser}>{msg.user_name}</span>
                </div>
                <div style={{...styles.msgBubble, backgroundColor: msg.user_id === profile?.id ? 'var(--primary)' : '#f1f5f9', color: msg.user_id === profile?.id ? 'white' : '#1e293b'}}>
                   {msg.text}
                   {msg.attachment_url && (
                     <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" style={styles.attachmentLink}>
                        <Paperclip size={12} /> Ver anexo
                     </a>
                   )}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.inputArea}>
            <input type="file" ref={fileInputRef} style={{display: 'none'}} onChange={handleFileUpload} />
            <div style={styles.inputWrapper}>
              <button style={{...styles.hBtn, color: '#64748b'}} onClick={() => fileInputRef.current?.click()}><Paperclip size={18} /></button>
              <input 
                style={styles.input} 
                placeholder="Mensagem..." 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={onMessageKeyDown}
              />
              <button style={styles.sendBtn} onClick={() => handleSend()}><Send size={18} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, any> = {
  chatTrigger: {
    position: 'fixed' as const,
    left: 'auto',
    bottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
    right: 'max(10px, env(safe-area-inset-right, 0px))',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '22px 32px',
    borderRadius: '48px', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '16px',
    boxShadow: '0 24px 40px -8px rgba(15, 23, 42, 0.35)',
    zIndex: 9999, transition: 'all 0.3s ease',
    fontWeight: '600',
    width: 'fit-content',
    maxWidth: 'calc(100vw - 20px)',
    boxSizing: 'border-box' as const,
  },
  triggerCol: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', gap: 4, minWidth: 0, textAlign: 'left' as const },
  triggerLabel: { fontSize: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, lineHeight: 1.15, letterSpacing: '-0.02em' },
  triggerHint: { fontSize: '13px', fontWeight: 650, opacity: 0.9, lineHeight: 1.2, whiteSpace: 'nowrap' as const },
  onlineDot: { width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%', border: '2px solid white' },
  unreadBubble: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    minWidth: 26,
    height: 26,
    padding: '0 7px',
    borderRadius: 999,
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid white',
    boxSizing: 'border-box' as const,
  },
  contactRowBadge: {
    flexShrink: 0,
    minWidth: 22,
    height: 22,
    padding: '0 7px',
    borderRadius: 999,
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  chatWindow: {
    position: 'fixed' as const,
    bottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
    right: 'max(10px, env(safe-area-inset-right, 0px))',
    width: '380px', height: '560px', backgroundColor: 'white',
    borderRadius: '24px', boxShadow: 'var(--shadow-premium)', 
    display: 'flex', flexDirection: 'column' as const, zIndex: 9999,
    overflow: 'hidden', border: '1px solid #e2e8f0',
    animation: 'slideUp 0.3s ease'
  },
  chatHeader: { padding: '16px 24px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatarMini: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: { fontSize: '15px', fontWeight: '600', margin: 0 },
  statusRow: { fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 },
  headerActions: { display: 'flex', gap: '8px' },
  hBtn: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' },

  recipientSearchStrip: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderBottom: '1px solid #e8e8e8',
    backgroundColor: '#f4f4f4',
  },
  recipientSearchInput: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 600,
    outline: 'none',
    backgroundColor: '#fff',
    color: '#0f172a',
    fontFamily: 'inherit',
  },
  recipientSearchDropdown: {
    flexShrink: 0,
    maxHeight: 200,
    overflowY: 'auto' as const,
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
  },
  recipientSearchRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    border: 'none',
    borderBottom: '1px solid #e8e8e8',
    background: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
  },
  recipientSearchRowName: { display: 'block', fontSize: 13, fontWeight: 600, color: '#1e293b' },
  recipientSearchRowMeta: { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2 },
  recipientSearchEmpty: { margin: 0, padding: '16px 20px', fontSize: 13, fontWeight: 600, color: '#64748b' },

  searchPanel: { flex: 1, display: 'flex', flexDirection: 'column' as const, backgroundColor: 'white' },
  searchBar: { padding: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e8e8e8' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', flex: 1 },
  contactResults: { flex: 1, overflowY: 'auto' as const },
  contactRow: { padding: '12px 24px', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #e8e8e8', '&:hover': { backgroundColor: '#ebebeb' } },
  contactName: { fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: 0 },
  contactRole: { fontSize: '11px', color: '#64748b', margin: 0 },

  messageArea: { flex: 1, padding: '20px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  emptyThread: {
    margin: 'auto',
    maxWidth: 280,
    textAlign: 'center' as const,
    padding: '16px 8px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  emptyThreadTitle: { margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' },
  emptyThreadText: { margin: '8px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.5, fontWeight: 600 },
  messageItem: { maxWidth: '80%', display: 'flex', flexDirection: 'column' as const },
  msgHeader: { marginBottom: '4px' },
  msgUser: { fontSize: '11px', fontWeight: '700', color: '#64748b' },
  msgBubble: { padding: '10px 14px', borderRadius: '16px', fontSize: '14px', lineHeight: '1.4' },
  attachmentLink: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginTop: '6px', color: 'inherit', textDecoration: 'underline' },
  
  inputArea: { padding: '16px 20px', borderTop: '1px solid #e8e8e8' },
  inputWrapper: { display: 'flex', gap: '8px', backgroundColor: '#ebebeb', padding: '6px 6px 6px 14px', borderRadius: '24px', alignItems: 'center' },
  input: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '14px', color: '#1e293b' },
  sendBtn: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  zaptroQuickWrap: {
    position: 'fixed' as const,
    bottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
    right: 'max(10px, env(safe-area-inset-right, 0px))',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: 0,
    maxWidth: 'min(420px, calc(100vw - 20px))',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  zaptroQuickPanel: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: '20px',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: 'min(72vh, 640px)',
  },
  zaptroQuickHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '18px 20px 14px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: '#fff',
  },
  zaptroQuickKicker: { fontSize: '10px', letterSpacing: '0.12em', margin: 0, opacity: 0.75, fontWeight: 700 },
  zaptroQuickTitle: { fontSize: '17px', fontWeight: 600, margin: '6px 0 0', lineHeight: 1.25 },
  zaptroQuickSub: { fontSize: '12px', margin: '8px 0 0', opacity: 0.85, lineHeight: 1.45 },
  zaptroQuickClose: {
    flexShrink: 0,
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    border: 'none',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zaptroQuickSearchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    borderBottom: '1px solid #e8e8e8',
    backgroundColor: '#f4f4f4',
  },
  zaptroQuickInput: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
  },
  zaptroQuickSearchBtn: {
    flexShrink: 0,
    border: 'none',
    borderRadius: '12px',
    padding: '10px 16px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    backgroundColor: '#D2FF00',
    color: '#0f172a',
  },
  zaptroQuickCard: {
    padding: '16px 18px 20px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  zaptroQuickName: { fontSize: '16px', fontWeight: 600, margin: 0, color: '#0f172a' },
  zaptroQuickDoc: { fontSize: '12px', color: '#64748b', margin: '4px 0 12px' },
  zaptroQuickList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    fontSize: '13px',
    color: '#334155',
    lineHeight: 1.45,
  },
  zaptroQuickWaBtn: {
    marginTop: '16px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 16px',
    border: 'none',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: '#25D366',
    color: '#fff',
  },
};

export default Chat;
