import React, { useState, useEffect } from 'react';
import { 
  Headphones, Search, Filter, MessageSquare, 
  Clock, AlertCircle, CheckCircle2, User, 
  Building2, Send, ChevronRight, MoreVertical 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toastSuccess, toastError } from '../../lib/toast';

const SupportTickets: React.FC = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [stats, setStats] = useState({ open: 0, slaPerc: 85 });

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      // Realtime subscription
      const channel = supabase
        .channel(`master-ticket-${selectedTicket.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(scrollToBottom, 100);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          companies(name, logo_url),
          profiles(full_name)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
      setStats(prev => ({ ...prev, open: data?.filter(t => t.status === 'OPEN').length || 0 }));
      
      if (data && data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0]);
      }
    } catch (err: any) {
      toastError('Erro ao carregar chamados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !profile) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: profile.id,
          message: messageText,
          is_master_response: true
        });

      if (error) throw error;

      // Update ticket status to IN_PROGRESS if it was OPEN
      if (selectedTicket.status === 'OPEN') {
        await supabase
          .from('support_tickets')
          .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
          .eq('id', selectedTicket.id);
        
        setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: 'IN_PROGRESS' } : t));
      }

    } catch (err: any) {
      toastError('Erro ao enviar: ' + err.message);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'RESOLVED', updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      toastSuccess('Chamado marcado como resolvido!');
      setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: 'RESOLVED' } : t));
      setSelectedTicket({ ...selectedTicket, status: 'RESOLVED' });
    } catch (err: any) {
      toastError('Erro ao resolver chamado: ' + err.message);
    }
  };

  const scrollToBottom = () => {
    const chatBody = document.getElementById('chat-body-master');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'URGENT': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#D9FF00';
      default: return '#10b981';
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Painel de Atendimento Master</h1>
          <p style={styles.subtitle}>Suporte nível 2 para os administradores das transportadoras.</p>
        </div>
        <div style={styles.stats}>
           <div style={styles.miniStat}>
              <strong style={styles.miniStatValue}>{stats.open}</strong>
              <span style={styles.miniStatLabel}>Abertos</span>
           </div>
           <div style={styles.miniStatDivider} />
           <div style={styles.miniStat}>
              <strong style={styles.miniStatValue}>{stats.slaPerc}%</strong>
              <span style={styles.miniStatLabel}>SLA (24h)</span>
           </div>
        </div>
      </header>

      <div style={styles.mainGrid}>
         {/* Lista de Chamados */}
         <div style={styles.ticketListSection}>
            <div style={styles.listHeader}>
               <div style={styles.searchBox}>
                  <Search size={18} color="#94a3b8" />
                  <input type="text" placeholder="Buscar ticket ou empresa..." style={styles.searchInput} />
               </div>
               <button style={styles.iconBtn} onClick={fetchTickets}><Filter size={18} /></button>
            </div>
            
            <div style={styles.ticketsContainer}>
               {loading ? (
                 <div style={styles.emptyMsg}>Carregando chamados...</div>
               ) : tickets.length === 0 ? (
                 <div style={styles.emptyMsg}>Nenhum chamado pendente.</div>
               ) : tickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    style={{
                      ...styles.ticketItem,
                      ...(selectedTicket?.id === ticket.id ? styles.ticketItemActive : {})
                    }}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                     <div style={styles.ticketTop}>
                        <div style={styles.companyInfo}>
                           <Building2 size={12} /> {ticket.companies?.name}
                        </div>
                        <span style={styles.dateText}>{new Date(ticket.created_at).toLocaleDateString()}</span>
                     </div>
                     <h3 style={styles.ticketSubject}>{ticket.title}</h3>
                     <div style={styles.ticketFooter}>
                        <div style={{...styles.priorityBadge, color: getPriorityColor(ticket.priority), backgroundColor: `${getPriorityColor(ticket.priority)}20`}}>
                           {ticket.priority}
                        </div>
                        <div style={styles.statusIndicator}>
                           <div style={{...styles.statusDot, backgroundColor: ticket.status === 'OPEN' ? '#ef4444' : '#D9FF00'}} />
                           {ticket.status}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Painel de Conversa / Detalhes */}
         <div style={styles.chatSection}>
            {selectedTicket ? (
               <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={styles.chatHeader}>
                     <div style={styles.chatClientInfo}>
                        <div style={styles.chatAvatar}>{selectedTicket.companies?.name?.[0]}</div>
                        <div>
                           <h2 style={styles.chatTitle}>{selectedTicket.companies?.name}</h2>
                           <p style={styles.chatSub}>Ticket #{selectedTicket.id.substring(0,8)} • Aberto por {selectedTicket.profiles?.full_name}</p>
                        </div>
                     </div>
                     <div style={styles.chatActions}>
                        <button style={styles.resolveBtn} onClick={handleResolveTicket}><CheckCircle2 size={18} /> Resolver</button>
                        <button style={styles.moreBtn}><MoreVertical size={18} /></button>
                     </div>
                  </div>

                  <div style={styles.chatBody} id="chat-body-master">
                     {messages.map((msg, idx) => (
                       <div key={msg.id || idx} style={{
                         ...styles.messageGroup, 
                         alignItems: msg.is_master_response ? 'flex-end' : 'flex-start'
                       }}>
                          <div style={styles.messageHeader}>
                             {msg.is_master_response ? (
                               <><span style={styles.mTime}>{new Date(msg.created_at).toLocaleTimeString()}</span> <strong>Você (Logta Support)</strong></>
                             ) : (
                               <><strong>{selectedTicket.profiles?.full_name}</strong> <span style={styles.mTime}>{new Date(msg.created_at).toLocaleTimeString()}</span></>
                             )}
                          </div>
                          <div style={{
                            ...styles.messageContent,
                            ...(msg.is_master_response ? styles.masterBubble : {})
                          }}>
                             {msg.message}
                          </div>
                       </div>
                     ))}
                  </div>

                  <div style={styles.chatInputArea}>
                     <form style={styles.inputWrapper} onSubmit={handleSendMessage}>
                        <input 
                          type="text" 
                          placeholder="Digite sua resposta técnica..." 
                          style={styles.mainInput} 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button type="submit" style={styles.sendBtn} disabled={!newMessage.trim()}><Send size={18} /></button>
                     </form>
                  </div>
               </div>
            ) : (
               <div style={styles.emptyChat}>
                  <Headphones size={64} color="#e1e7ef" />
                  <p>Selecione um chamado para iniciar o atendimento.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '40px', backgroundColor: 'transparent', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '-1' },
  subtitle: { color: 'var(--text-muted)', fontSize: '15px' },
  stats: { display: 'flex', alignItems: 'center', gap: '24px', backgroundColor: 'white', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border)' },
  miniStat: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  miniStatValue: { fontSize: '18px', color: 'var(--primary)', fontWeight: '700' },
  miniStatLabel: { fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' as const },
  miniStatDivider: { width: '1px', height: '30px', backgroundColor: 'var(--border)' },
  
  mainGrid: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', height: 'calc(100vh - 200px)' },
  
  ticketListSection: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  listHeader: { padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px' },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f4f4f4', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  searchInput: { border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '13px', width: '100%' },
  iconBtn: { padding: '10px', backgroundColor: '#f4f4f4', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' },
  ticketsContainer: { flex: 1, overflowY: 'auto' as const },
  ticketItem: { padding: '20px', borderBottom: '1px solid #e8e8e8', cursor: 'pointer', transition: 'all 0.2s' },
  ticketItemActive: { backgroundColor: 'rgba(217, 255, 0, 0.18)', borderLeft: '4px solid var(--primary)' },
  ticketTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  companyInfo: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#94a3b8' },
  dateText: { fontSize: '11px', color: '#94a3b8' },
  ticketSubject: { fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' },
  ticketFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  priorityBadge: { fontSize: '10px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px' },
  statusIndicator: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' },
  statusDot: { width: '6px', height: '6px', borderRadius: '50%' },

  chatSection: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const },
  chatHeader: { padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatClientInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  chatAvatar: { width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '18px' },
  chatTitle: { fontSize: '18px', fontWeight: '600', color: 'var(--primary)' },
  chatSub: { fontSize: '13px', color: '#94a3b8' },
  chatActions: { display: 'flex', gap: '12px' },
  resolveBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#ecfdf5', color: '#10b981', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
  moreBtn: { padding: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer' },

  chatBody: { flex: 1, padding: '32px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  messageGroup: { maxWidth: '80%', display: 'flex', flexDirection: 'column' as const },
  messageHeader: { fontSize: '12px', color: '#94a3b8', marginBottom: '8px' },
  mTime: { fontWeight: '400', fontSize: '11px', marginLeft: '6px' },
  messageContent: { backgroundColor: '#ebebeb', padding: '16px 20px', borderRadius: '0 16px 16px 16px', fontSize: '14px', color: 'var(--primary)', lineHeight: '1.5' },
  masterBubble: { backgroundColor: 'var(--primary)', color: 'white', borderRadius: '16px 16px 0 16px' },

  chatInputArea: { padding: '24px 32px', borderTop: '1px solid var(--border)' },
  inputWrapper: { display: 'flex', gap: '16px', backgroundColor: '#ebebeb', padding: '12px 20px', borderRadius: '16px' },
  mainInput: { flex: 1, border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '14px' },
  sendBtn: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  emptyChat: { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '20px', color: '#94a3b8' },
  emptyMsg: { padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }
};

export default SupportTickets;
