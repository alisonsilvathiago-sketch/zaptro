import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Paperclip, Smile, Search, 
  MoreVertical, Phone, Video, Info,
  CheckCheck, Clock, User, ShieldCheck,
  Hash, Bell, X, Image as ImageIcon, FileText,
  Filter, History, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../lib/toast';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  room_id: string;
  content: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  company_id: string;
}

interface ChatContact {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  lastMessage?: string;
  isOnline?: boolean;
  type: 'user' | 'department';
}

const DEPARTMENTS = [
  { id: 'RH', name: 'Recursos Humanos', icon: <User size={18} /> },
  { id: 'FINANCEIRO', name: 'Financeiro', icon: <Zap size={18} /> },
  { id: 'LOGISTICA', name: 'Logística', icon: <Zap size={18} /> },
  { id: 'ADM', name: 'Diretoria / ADM', icon: <ShieldCheck size={18} /> }
];

const ChatPage: React.FC = () => {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'MASTER_ADMIN';

  const fetchContacts = async () => {
    if (!profile?.company_id) return;
    try {
      // Fetch all users from company
      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id)
        .neq('id', profile.id);

      const userContacts: ChatContact[] = (users || []).map(u => ({
        id: u.id,
        name: u.full_name,
        role: u.role,
        type: 'user',
        isOnline: Math.random() > 0.5 // Simulado para o exemplo
      }));

      const deptContacts: ChatContact[] = DEPARTMENTS.map(d => ({
        id: d.id,
        name: d.name,
        role: 'Departamento',
        type: 'department'
      }));

      setContacts([...deptContacts, ...userContacts]);
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async (contactId: string) => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${profile.id}),room_id.eq.${contactId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Marcar como lido
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('receiver_id', profile.id)
        .eq('sender_id', contactId);
        
    } catch (err) { console.error(err); }
  };

  const fetchGlobalHistory = async () => {
    if (!isAdmin || !profile?.company_id) return;
    try {
      const query = supabase
        .from('chat_messages')
        .select('*, sender_name:profiles(full_name)')
        .order('created_at', { ascending: false });
        
      if (profile.role !== 'MASTER_ADMIN') {
        query.eq('company_id', profile.company_id);
      }
      
      const { data } = await query;
      setMessages(data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchContacts();
    setLoading(false);
    
    // Realtime subscription
    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.receiver_id === profile?.id || newMsg.room_id === selectedContact?.id || newMsg.sender_id === profile?.id) {
           setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, selectedContact?.id]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
      setIsHistoryView(false);
    }
  }, [selectedContact]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !profile) return;

    try {
      const msgData: any = {
        sender_id: profile.id,
        content: newMessage,
        company_id: profile.company_id,
        is_read: false
      };

      if (selectedContact.type === 'department') {
        msgData.room_id = selectedContact.id;
      } else {
        msgData.receiver_id = selectedContact.id;
      }

      const { error } = await supabase.from('chat_messages').insert(msgData);
      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      toastError('Falha ao enviar: ' + err.message);
    }
  };

  if (loading) return <div>Carregando central de mensagens...</div>;

  return (
    <div style={styles.container}>
       {/* Sidebar de Contatos */}
       <aside style={styles.sidebar}>
          <header style={styles.sidebarHeader}>
             <h2 style={styles.sidebarTitle}>Comunica Logta</h2>
             <div style={styles.searchBox}>
                <Search size={16} color="var(--text-muted)" />
                <input placeholder="Buscar conversa..." style={styles.searchInput} />
             </div>
          </header>

          <div style={styles.contactTabs}>
             <button 
               style={{...styles.tabBtn, ...(isHistoryView ? {} : styles.tabBtnActive)}}
               onClick={() => { setIsHistoryView(false); setSelectedContact(contacts[0]); }}
             >Mensagens</button>
             {isAdmin && (
               <button 
                 style={{...styles.tabBtn, ...(isHistoryView ? styles.tabBtnActive : {})}}
                 onClick={() => { setIsHistoryView(true); setSelectedContact(null); fetchGlobalHistory(); }}
               >Histórico Geral</button>
             )}
          </div>

          <div style={styles.contactList}>
             {contacts.map(contact => (
                <div 
                  key={contact.id} 
                  style={{...styles.contactItem, ...(selectedContact?.id === contact.id ? styles.contactItemActive : {})}}
                  onClick={() => setSelectedContact(contact)}
                >
                   <div style={styles.avatarBox}>
                      {contact.type === 'department' ? <Hash size={20} /> : <User size={20} />}
                      {contact.isOnline && <div style={styles.onlineStatus} />}
                   </div>
                   <div style={styles.contactInfo}>
                      <div style={styles.contactMain}>
                         <p style={styles.contactName}>{contact.name}</p>
                         <span style={styles.contactTime}>12:45</span>
                      </div>
                      <p style={styles.contactSub}>{contact.role}</p>
                   </div>
                </div>
             ))}
          </div>
       </aside>

       {/* Área de Chat */}
       <main style={styles.chatArea}>
          {isHistoryView && isAdmin ? (
             <div style={styles.historyContainer}>
                <div style={styles.historyHeader}>
                   <History size={24} />
                   <div>
                      <h3 style={{margin: 0}}>Logs de Comunicação Corporativa</h3>
                      <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>Ouvidoria e gestão de canais internos (ADMIN).</p>
                   </div>
                </div>
                <div style={styles.historyList}>
                   {messages.map(m => (
                      <div key={m.id} style={styles.historyRow}>
                         <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                            <strong>{m.sender_name || 'Usuário'}</strong>
                            <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>{new Date(m.created_at).toLocaleString()}</span>
                         </div>
                         <p style={{margin: '4px 0 0 0', fontSize: '13px'}}>{m.content}</p>
                         <hr style={{border: 'none', borderTop: '1px solid var(--bg-app)', marginTop: '8px'}} />
                      </div>
                   ))}
                </div>
             </div>
          ) : selectedContact ? (
             <>
                <header style={styles.chatHeader}>
                   <div style={styles.chatInfo}>
                      <div style={styles.avatarMini}>{selectedContact.name[0]}</div>
                      <div>
                         <p style={styles.chatTitle}>{selectedContact.name}</p>
                         <p style={styles.chatStatus}>{selectedContact.isOnline ? 'Online agora' : 'Offline'}</p>
                      </div>
                   </div>
                   <div style={styles.chatActions}>
                      <button style={styles.iconBtn}><Phone size={20} /></button>
                      <button style={styles.iconBtn}><Video size={20} /></button>
                      <button style={styles.iconBtn}><Info size={20} /></button>
                   </div>
                </header>

                <div style={styles.messageList} ref={scrollRef}>
                   {messages.map(m => {
                      const isMe = m.sender_id === profile?.id;
                      return (
                         <div key={m.id} style={{...styles.messageWrapper, alignSelf: isMe ? 'flex-end' : 'flex-start'}}>
                            {!isMe && <div style={styles.senderName}>{selectedContact.name}</div>}
                            <div style={{...styles.messageBubble, ...(isMe ? styles.bubbleMe : styles.bubbleThem)}}>
                               {m.content}
                               <div style={styles.messageMeta}>
                                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {isMe && <CheckCheck size={14} style={{marginLeft: '4px', opacity: m.is_read ? 1 : 0.5}} />}
                               </div>
                            </div>
                         </div>
                      );
                   })}
                </div>

                <footer style={styles.inputArea}>
                   <button style={styles.footerIconBtn}><Smile size={20} /></button>
                   <button style={styles.footerIconBtn}><Paperclip size={20} /></button>
                   <div style={styles.inputWrapper}>
                      <input 
                        style={styles.input} 
                        placeholder="Mensagem..." 
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button style={styles.sendBtn} onClick={handleSendMessage}>
                         <Send size={18} />
                      </button>
                   </div>
                </footer>
             </>
          ) : (
             <div style={styles.emptyChat}>
                <div style={styles.emptyIllustration}>
                   <Bell size={48} color="var(--primary)" />
                </div>
                <h3>Central de Atendimento Logta</h3>
                <p>Selecione um colaborador ou departamento para iniciar conversas em tempo real.</p>
             </div>
          )}
       </main>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { display: 'flex', height: 'calc(100vh - 100px)', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-premium)' },
  sidebar: { width: '350px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, backgroundColor: 'var(--bg-app)' },
  sidebarHeader: { padding: '24px', borderBottom: '1px solid var(--border)', backgroundColor: 'white' },
  sidebarTitle: { fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '16px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)' },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: '14px', flex: 1 },
  contactTabs: { padding: '12px 24px', display: 'flex', gap: '8px', backgroundColor: 'white' },
  tabBtn: { padding: '8px 16px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer', backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)' },
  tabBtnActive: { backgroundColor: 'var(--primary)', color: 'white' },
  contactList: { flex: 1, overflowY: 'auto' as const },
  contactItem: { padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid var(--bg-app)', transition: '0.2s', '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } },
  contactItemActive: { backgroundColor: 'white', borderLeft: '4px solid var(--primary)' },
  avatarBox: { width: '48px', height: '48px', borderRadius: '16px', backgroundColor: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const, color: 'var(--primary)' },
  onlineStatus: { position: 'absolute' as const, bottom: '-2px', right: '-2px', width: '12px', height: '12px', backgroundColor: 'var(--success)', borderRadius: '50%', border: '2px solid white' },
  contactInfo: { flex: 1 },
  contactMain: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  contactName: { fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: 0 },
  contactTime: { fontSize: '11px', color: 'var(--text-muted)' },
  contactSub: { fontSize: '11px', color: 'var(--text-muted)', margin: 0 },

  chatArea: { flex: 1, display: 'flex', flexDirection: 'column' as const, backgroundColor: 'white' },
  chatHeader: { padding: '16px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatarMini: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' },
  chatTitle: { fontSize: '16px', fontWeight: '800', margin: 0 },
  chatStatus: { fontSize: '12px', color: 'var(--success)', margin: 0 },
  chatActions: { display: 'flex', gap: '12px' },
  iconBtn: { backgroundColor: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '10px', transition: '0.2s', '&:hover': { color: 'var(--primary)', backgroundColor: 'var(--bg-app)' } },

  messageList: { flex: 1, padding: '32px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '24px', backgroundColor: '#fcfcfc' },
  messageWrapper: { maxWidth: '70%', display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  senderName: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginLeft: '12px' },
  messageBubble: { padding: '12px 16px', borderRadius: '16px', fontSize: '14px', position: 'relative' as const, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  bubbleMe: { backgroundColor: 'var(--primary)', color: 'white', borderRadius: '16px 16px 4px 16px' },
  bubbleThem: { backgroundColor: 'white', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '16px 16px 16px 4px' },
  messageMeta: { fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '6px', opacity: 0.8 },

  inputArea: { padding: '20px 32px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' },
  footerIconBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' },
  inputWrapper: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--bg-app)', padding: '6px 6px 6px 16px', borderRadius: '30px' },
  input: { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text-main)' },
  sendBtn: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  emptyChat: { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-muted)', textAlign: 'center' as const, padding: '40px' },
  emptyIllustration: { width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' },

  historyContainer: { flex: 1, display: 'flex', flexDirection: 'column' as const, padding: '40px' },
  historyHeader: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px' },
  historyList: { flex: 1, overflowY: 'auto' as const },
  historyRow: { padding: '12px 0' }
};

export default ChatPage;
