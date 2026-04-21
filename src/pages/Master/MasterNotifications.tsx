import React, { useState, useEffect } from 'react';
import { 
  Send, Users, Building2, Bell, 
  Search, Filter, CheckCircle, AlertOctagon, 
  Info, BellRing, Target, Clock,
  MessageSquare, LayoutGrid, Trash2, Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError } from '../../lib/toast';

const MasterNotifications: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [targetType, setTargetType] = useState<'GLOBAL' | 'COMPANY' | 'USER'>('GLOBAL');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'LOW',
    type: 'MANUAL',
    company_id: '',
    user_id: '',
    path: ''
  });

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: cos } = await supabase.from('companies').select('id, name').order('name');
      setCompanies(cos || []);
      
      const { data: hist } = await supabase
        .from('notifications')
        .select('*, companies(name), profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);
      setHistory(hist || []);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchUsers = async (companyId: string) => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('company_id', companyId).order('full_name');
    setUsers(data || []);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    try {
      const payload: any = {
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        type: formData.type,
        metadata: formData.path ? { path: formData.path } : {},
      };

      if (targetType === 'COMPANY') payload.company_id = formData.company_id;
      if (targetType === 'USER') {
        payload.company_id = formData.company_id;
        payload.user_id = formData.user_id;
      }

      const { error } = await supabase.from('notifications').insert([payload]);
      
      if (error) throw error;
      
      toastSuccess('Comunicado enviado com sucesso!');
      setFormData({ ...formData, title: '', message: '', path: '' });
      
      // Refresh History
      const { data: hist } = await supabase
        .from('notifications')
        .select('*, companies(name), profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);
      setHistory(hist || []);
      
    } catch (err: any) {
      toastError('Erro ao enviar: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const deleteNotif = async (id: string) => {
    if (!confirm('Excluir esta notificação?')) return;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) {
      setHistory(prev => prev.filter(n => n.id !== id));
      toastSuccess('Notificação removida.');
    }
  };

  if (loading) return <div style={styles.loader}>Acessando Central de Inteligência...</div>;

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <h1 style={styles.title}>Central de Notificações Global</h1>
        <p style={styles.subtitle}>Gerencie a comunicação e alertas inteligentes de todo o ecossistema Logta.</p>
      </header>

      <div style={styles.grid}>
        {/* FORMULÁRIO DE ENVIO */}
        <div style={styles.card}>
           <div style={styles.cardHeader}>
              <Send size={20} color="var(--primary)" />
              <h2 style={styles.cardTitle}>Novo Comunicado Master</h2>
           </div>
           
           <form style={styles.form} onSubmit={handleSend}>
              <div style={styles.tabGroup}>
                 <button type="button" onClick={() => setTargetType('GLOBAL')} style={{...styles.tab, ...(targetType === 'GLOBAL' ? styles.tabActive : {})}}><LayoutGrid size={16} /> Global</button>
                 <button type="button" onClick={() => setTargetType('COMPANY')} style={{...styles.tab, ...(targetType === 'COMPANY' ? styles.tabActive : {})}}><Building2 size={16} /> Empresa</button>
                 <button type="button" onClick={() => setTargetType('USER')} style={{...styles.tab, ...(targetType === 'USER' ? styles.tabActive : {})}}><Users size={16} /> Usuário</button>
              </div>

              <div style={styles.field}>
                 <label style={styles.label}>Título do Alerta</label>
                 <input 
                   required
                   style={styles.input} 
                   placeholder="Ex: Manutenção Programada ou Nova Funcionalidade"
                   value={formData.title}
                   onChange={e => setFormData({...formData, title: e.target.value})}
                 />
              </div>

              <div style={styles.field}>
                 <label style={styles.label}>Mensagem Corporativa</label>
                 <textarea 
                   required
                   style={styles.textarea} 
                   placeholder="Descreva o comunicado de forma clara..."
                   value={formData.message}
                   onChange={e => setFormData({...formData, message: e.target.value})}
                 />
              </div>

              <div style={styles.row}>
                 <div style={{...styles.field, flex: 1}}>
                    <label style={styles.label}>Prioridade</label>
                    <select 
                      style={styles.select}
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value})}
                    >
                       <option value="LOW">Baixa (Verde)</option>
                       <option value="MEDIUM">Média (Azul)</option>
                       <option value="HIGH">Alta (Laranja)</option>
                       <option value="CRITICAL">Crítica (Vermelho)</option>
                    </select>
                 </div>
                 <div style={{...styles.field, flex: 1}}>
                    <label style={styles.label}>Link de Ação (Path)</label>
                    <input 
                      style={styles.input} 
                      placeholder="Ex: /financeiro" 
                      value={formData.path}
                      onChange={e => setFormData({...formData, path: e.target.value})}
                    />
                 </div>
              </div>

              {(targetType === 'COMPANY' || targetType === 'USER') && (
                 <div style={styles.field}>
                    <label style={styles.label}>Selecionar Empresa</label>
                    <select 
                      required
                      style={styles.select}
                      value={formData.company_id}
                      onChange={e => {
                        setFormData({...formData, company_id: e.target.value});
                        fetchUsers(e.target.value);
                      }}
                    >
                       <option value="">Escolha uma empresa...</option>
                       {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
              )}

              {targetType === 'USER' && (
                 <div style={styles.field}>
                    <label style={styles.label}>Selecionar Colaborador</label>
                    <select 
                      required
                      style={styles.select}
                      value={formData.user_id}
                      onChange={e => setFormData({...formData, user_id: e.target.value})}
                    >
                       <option value="">Escolha o usuário...</option>
                       {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                 </div>
              )}

              <button type="submit" style={styles.submitBtn} disabled={sending}>
                 {sending ? 'Disparando...' : 'Publicar Notificação'}
              </button>
           </form>
        </div>

        {/* HISTÓRICO RECENTE */}
        <div style={styles.card}>
           <div style={styles.cardHeader}>
              <Clock size={20} color="var(--primary)" />
              <h2 style={styles.cardTitle}>Últimos Enviados</h2>
           </div>
           
           <div style={styles.historyList}>
              {history.map(n => (
                 <div key={n.id} style={styles.historyItem}>
                    <div style={{...styles.priorityDot, backgroundColor: n.priority === 'CRITICAL' ? '#ef4444' : n.priority === 'HIGH' ? '#f59e0b' : '#3b82f6'}} />
                    <div style={styles.historyContent}>
                       <div style={styles.hTitleRow}>
                          <span style={styles.hTitle}>{n.title}</span>
                          <button onClick={() => deleteNotif(n.id)} style={styles.deleteBtn}><Trash2 size={14} /></button>
                       </div>
                       <p style={styles.hMsg}>{n.message}</p>
                       <div style={styles.hMeta}>
                          <span style={styles.hTarget}><Target size={10} /> {n.user_id ? n.profiles?.full_name : n.company_id ? n.companies?.name : 'BROADCAST GLOBAL'}</span>
                          <span style={styles.hTime}>{new Date(n.created_at).toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
              ))}
              {history.length === 0 && <p style={styles.emptyHist}>Nenhuma notificação enviada recentemente.</p>}
           </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  header: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  title: { fontSize: '28px', fontWeight: '950', color: '#111827', margin: 0, letterSpacing: '-1px' },
  subtitle: { fontSize: '16px', color: '#6b7280', margin: 0 },
  
  grid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' },
  card: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', padding: '32px', height: 'fit-content' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  cardTitle: { fontSize: '18px', fontWeight: '900', color: '#111827', margin: 0 },
  
  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  tabGroup: { display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '16px', marginBottom: '8px' },
  tab: { flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: 'none', color: '#64748b', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  tabActive: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  
  field: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  row: { display: 'flex', gap: '16px' },
  label: { fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  input: { padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px', color: '#111827', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc' },
  textarea: { padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px', color: '#111827', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc', minHeight: '100px', resize: 'none' as const },
  select: { padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '15px', color: '#111827', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc' },
  submitBtn: { padding: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' },
  
  historyList: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  historyItem: { display: 'flex', gap: '16px', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9', backgroundColor: '#fff', transition: 'all 0.2s' },
  priorityDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '6px' },
  historyContent: { flex: 1 },
  hTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  hTitle: { fontSize: '14px', fontWeight: '800', color: '#1e293b' },
  hMsg: { fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 12px 0' },
  hMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  hTarget: { fontSize: '10px', fontWeight: '900', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' },
  hTime: { fontSize: '11px', color: '#cbd5e1', fontWeight: '600' },
  deleteBtn: { padding: '4px', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' },
  emptyHist: { textAlign: 'center' as const, padding: '40px', color: '#94a3b8', fontSize: '14px' },
  loader: { padding: '100px', textAlign: 'center' as const, color: 'var(--primary)', fontWeight: '800' }
};

export default MasterNotifications;
