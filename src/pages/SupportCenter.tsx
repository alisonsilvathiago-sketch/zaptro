import React, { useState, useEffect } from 'react';
import { 
  Headphones, Plus, Search, Filter, MessageSquare, 
  Clock, AlertCircle, CheckCircle2, History, Send,
  ChevronRight, Building2, User, MoreVertical
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import LogtaModal from '../components/Modal';
import { toastSuccess, toastError } from '../lib/toast';

const SupportCenter: React.FC = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  
  // New Ticket State
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'TECHNICAL',
    priority: 'MEDIUM'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      // Subscribe to real-time messages
      const channel = supabase
        .channel(`ticket-${selectedTicket.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
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
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
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
        .select(`
          *,
          sender:profiles(full_name, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          ...newTicket,
          company_id: profile.company_id,
          user_id: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      toastSuccess('Chamado aberto com sucesso!');
      setIsNewTicketModalOpen(false);
      setTickets([data, ...tickets]);
      setSelectedTicket(data);
      setNewTicket({ title: '', description: '', category: 'TECHNICAL', priority: 'MEDIUM' });
    } catch (err: any) {
      toastError('Erro ao abrir chamado: ' + err.message);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !profile) return;

    const messageToSend = newMessage;
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: profile.id,
          message: messageToSend,
          is_master_response: false
        });

      if (error) throw error;
      
      // Update last_message_at
      await supabase
        .from('support_tickets')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

    } catch (err: any) {
      toastError('Erro ao enviar mensagem: ' + err.message);
    }
  };

  const scrollToBottom = () => {
    const chatBody = document.getElementById('chat-body');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'OPEN': return '#ef4444';
      case 'IN_PROGRESS': return '#3b82f6';
      case 'PENDING': return '#f59e0b';
      case 'RESOLVED': return '#10b981';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Central de Suporte</h1>
          <p style={styles.pageSubtitle}>Comunicação direta com a equipe de engenharia do Logta.</p>
        </div>
        <button style={styles.newBtn} onClick={() => setIsNewTicketModalOpen(true)}>
          <Plus size={20} /> Novo Chamado
        </button>
      </header>

      <div style={styles.mainGrid}>
        {/* Lado Esquerdo: Lista */}
        <div style={styles.sidebar}>
          <div style={styles.listHeader}>
             <div style={styles.searchBox}>
                <Search size={16} color="#94a3b8" />
                <input type="text" placeholder="Buscar chamados..." style={styles.searchInput} />
             </div>
          </div>
          <div style={styles.ticketList}>
            {loading ? (
              <div style={styles.emptyState}>Carregando...</div>
            ) : tickets.length === 0 ? (
              <div style={styles.emptyState}>Nenhum chamado aberto.</div>
            ) : (
              tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  style={{...styles.ticketItem, ...(selectedTicket?.id === ticket.id ? styles.ticketActive : {})}}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div style={styles.ticketTop}>
                    <span style={styles.ticketId}>#{ticket.id.substring(0, 8)}</span>
                    <span style={styles.ticketDate}>{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 style={styles.ticketTitle}>{ticket.title}</h3>
                  <div style={styles.ticketMeta}>
                    <div style={{...styles.statusBadge, backgroundColor: `${getStatusColor(ticket.status)}20`, color: getStatusColor(ticket.status)}}>
                      {ticket.status}
                    </div>
                    <span style={styles.categoryText}>{ticket.category}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lado Direito: Chat */}
        <div style={styles.chatArea}>
          {selectedTicket ? (
            <div style={styles.chatWrapper}>
              <header style={styles.chatHeader}>
                <div style={styles.chatInfo}>
                  <div style={styles.avatar}>LS</div>
                  <div>
                    <h2 style={styles.chatTitle}>{selectedTicket.title}</h2>
                    <p style={styles.chatSub}>Categoria: {selectedTicket.category} • Criado em {new Date(selectedTicket.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div style={styles.chatActions}>
                  {selectedTicket.sla_deadline && (
                    <div style={styles.slaBadge}>
                      <Clock size={14} /> 
                      SLA: {new Date(selectedTicket.sla_deadline).toLocaleString()}
                    </div>
                  )}
                  <button style={styles.moreBtn}><MoreVertical size={18} /></button>
                </div>
              </header>

              <div style={styles.chatBody} id="chat-body">
                {messages.map((msg, idx) => (
                  <div 
                    key={msg.id || idx} 
                    style={{
                      ...styles.messageRow,
                      ...(msg.is_master_response ? styles.masterRow : styles.clientRow)
                    }}
                  >
                    <div style={{
                      ...styles.messageBubble,
                      ...(msg.is_master_response ? styles.masterBubble : styles.clientBubble)
                    }}>
                      <div style={styles.msgHeader}>
                        <strong>{msg.is_master_response ? 'Suporte Logta' : profile?.full_name}</strong>
                        <span style={styles.msgTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p style={styles.msgText}>{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <footer style={styles.chatFooter}>
                <form style={styles.inputArea} onSubmit={handleSendMessage}>
                  <input 
                    type="text" 
                    placeholder="Responda ao suporte..." 
                    style={styles.input} 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" style={styles.sendBtn} disabled={!newMessage.trim()}>
                    <Send size={18} />
                  </button>
                </form>
              </footer>
            </div>
          ) : (
            <div style={styles.emptyChat}>
               <Headphones size={64} color="#e2e8f0" />
               <h2>Como podemos ajudar?</h2>
               <p>Selecione um chamado ao lado ou abra um novo para falar com nossos especialistas.</p>
            </div>
          )}
        </div>
      </div>

      <LogtaModal 
        isOpen={isNewTicketModalOpen} 
        onClose={() => setIsNewTicketModalOpen(false)} 
        title="Abrir Novo Chamado"
        width="600px"
      >
        <form onSubmit={handleCreateTicket} style={styles.form}>
           <div style={styles.field}>
              <label style={styles.label}>Título do Chamado</label>
              <input 
                type="text" 
                placeholder="Ex: Não consigo importar planilha de rotas" 
                style={styles.modalInput} 
                required
                value={newTicket.title}
                onChange={e => setNewTicket({...newTicket, title: e.target.value})}
              />
           </div>
           
           <div style={styles.row}>
              <div style={styles.field}>
                 <label style={styles.label}>Categoria</label>
                 <select 
                   style={styles.modalSelect}
                   value={newTicket.category}
                   onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                 >
                    <option value="TECHNICAL">Técnico / Outros</option>
                    <option value="FINANCE">Financeiro / Faturamento</option>
                    <option value="BUG">Problema / Bug no Sistema</option>
                    <option value="FEATURE_REQUEST">Sugestão de Funcionalidade</option>
                 </select>
              </div>
              <div style={styles.field}>
                 <label style={styles.label}>Prioridade</label>
                 <select 
                   style={styles.modalSelect}
                   value={newTicket.priority}
                   onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                 >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta (Urgente)</option>
                    <option value="URGENT">Emergência (Sistema Parado)</option>
                 </select>
              </div>
           </div>

           <div style={styles.field}>
              <label style={styles.label}>Descrição Detalhada</label>
              <textarea 
                placeholder="O que está acontecendo? Se houver erros, cole aqui." 
                style={styles.textarea} 
                rows={5}
                required
                value={newTicket.description}
                onChange={e => setNewTicket({...newTicket, description: e.target.value})}
              />
           </div>

           <button type="submit" style={styles.submitBtn}>Enviar Chamado</button>
        </form>
      </LogtaModal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '40px', backgroundColor: 'transparent', minHeight: '90vh', display: 'flex', flexDirection: 'column' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  pageTitle: { fontSize: '28px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-1px' },
  pageSubtitle: { fontSize: '15px', color: 'var(--text-muted)' },
  newBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' },
  
  mainGrid: { display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', flex: 1, maxHeight: 'calc(100vh - 250px)' },
  sidebar: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  listHeader: { padding: '20px', borderBottom: '1px solid var(--border)' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  searchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '500' },
  ticketList: { flex: 1, overflowY: 'auto', padding: '10px' },
  ticketItem: { padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent', marginBottom: '8px' },
  ticketActive: { backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' },
  ticketTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  ticketId: { fontSize: '11px', fontWeight: '800', color: '#94a3b8' },
  ticketDate: { fontSize: '11px', color: '#94a3b8' },
  ticketTitle: { fontSize: '14px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ticketMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { fontSize: '10px', fontWeight: '900', padding: '3px 10px', borderRadius: '6px' },
  categoryText: { fontSize: '11px', fontWeight: '700', color: '#94a3b8' },
  
  chatArea: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex' },
  chatWrapper: { flex: 1, display: 'flex', flexDirection: 'column' },
  chatHeader: { padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatar: { width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px' },
  chatTitle: { fontSize: '18px', fontWeight: '900', color: 'var(--primary)' },
  chatSub: { fontSize: '13px', color: '#94a3b8' },
  chatActions: { display: 'flex', gap: '12px', alignItems: 'center' },
  slaBadge: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#f59e0b', backgroundColor: '#fffbeb', padding: '8px 16px', borderRadius: '10px' },
  moreBtn: { border: '1px solid #e2e8f0', background: 'white', padding: '10px', borderRadius: '10px', cursor: 'pointer' },
  
  chatBody: { flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#fcfdfe' },
  messageRow: { display: 'flex', width: '100%' },
  clientRow: { justifyContent: 'flex-end' },
  masterRow: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '70%', padding: '16px', borderRadius: '20px' },
  clientBubble: { backgroundColor: 'var(--primary)', color: 'white', borderRadius: '20px 20px 0 20px' },
  masterBubble: { backgroundColor: '#f1f5f9', color: 'var(--primary)', borderRadius: '20px 20px 20px 0' },
  msgHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px', fontSize: '11px', fontWeight: '800' },
  msgTime: { opacity: 0.7, fontWeight: '400' },
  msgText: { fontSize: '14px', lineHeight: '1.5', margin: 0 },
  
  chatFooter: { padding: '24px 32px', borderTop: '1px solid var(--border)' },
  inputArea: { display: 'flex', gap: '12px', backgroundColor: '#f8fafc', padding: '8px 8px 8px 16px', borderRadius: '16px', border: '1px solid #e2e8f0' },
  input: { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', fontWeight: '500' },
  sendBtn: { width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  emptyChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center', padding: '40px' },
  emptyState: { padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  
  // Modal Form
  form: { display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: '800', color: 'var(--primary)' },
  modalInput: { padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' },
  modalSelect: { padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', backgroundColor: 'white' },
  textarea: { padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', resize: 'none' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  submitBtn: { marginTop: '10px', padding: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '850', fontSize: '15px', cursor: 'pointer' }
};

export default SupportCenter;
