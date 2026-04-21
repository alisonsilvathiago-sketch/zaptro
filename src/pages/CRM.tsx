import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { createAuditLog } from '../utils/audit';
import { 
  Users, Target, ShoppingCart, History as HistoryIcon, 
  Plus, Search, Filter, MoreVertical, Star, Mail, Phone, 
  MapPin, ChevronRight, Download, FileText, TrendingUp,
  Layout, Kanban, List, CheckCircle2, Clock, X, Save,
  ArrowRight, DollarSign, User, Building, Truck, Wallet,
  Calendar, MessageSquare, ExternalLink, ShieldCheck, Navigation, Edit3, Trash2,
  PieChart as PieIcon, BarChart as BarIcon, LineChart as LineIcon, Activity as ActivityIcon,
  TrendingDown, ArrowUpRight, ArrowDownRight, Briefcase as BriefcaseIcon, Eye
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import LogtaModal from '../components/Modal';
import LogtaCalendar from '../components/Calendar';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import ModuleLayout from '../layouts/ModuleLayout';
import EmptyState from '../components/EmptyState';

// --- Types ---
interface Lead {
  id: string;
  company_name: string;
  responsible_name: string;
  email: string;
  phone: string;
  status: 'FIRST_CONTACT' | 'NEGOTIATION' | 'PROPOSAL' | 'CLOSED' | 'LOST';
  estimated_value?: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  cnpj_cpf: string;
  segment: string;
}

const CRM: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(() => {
    const segments = location.pathname.split('/');
    const last = segments[segments.length - 1];
    if (last === 'crm') return 'inteligencia';
    return last || 'inteligencia';
  }, [location.pathname]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Form State
  const [newLead, setNewLead] = useState({
    company_name: '',
    responsible_name: '',
    email: '',
    phone: '',
    estimated_value: '',
    status: 'FIRST_CONTACT' as Lead['status']
  });

  const onTabChange = (id: string) => {
    if (id === 'inteligencia') navigate('/crm');
    else navigate(`/crm/${id}`);
  };

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data: leadData } = await supabase.from('leads').select('*').eq('company_id', profile.company_id);
      setLeads(leadData || []);
      const { data: clientData } = await supabase.from('clients').select('*').eq('company_id', profile.company_id);
      setClients(clientData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.company_id]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    setLoadingAction(true);
    const toastId = toastLoading('Salvando lead...');

    try {
      const { error } = await supabase
        .from('leads')
        .insert([{
          company_id: profile.company_id,
          ...newLead,
          estimated_value: parseFloat(newLead.estimated_value) || 0
        }]);

      if (error) throw error;

      // Log de Auditoria
      await createAuditLog({
        company_id: profile.company_id,
        user_id: profile.id,
        module: 'CRM',
        action: 'CREATE',
        details: `Novo Lead prospectado: ${newLead.company_name} (R$ ${newLead.estimated_value})`
      });

      toastDismiss(toastId);
      toastSuccess('Lead cadastrado com sucesso!');
      setIsDetailModalOpen(false);
      setNewLead({
        company_name: '', responsible_name: '', email: '', phone: '',
        estimated_value: '', status: 'FIRST_CONTACT'
      });
      fetchData();
    } catch (err: any) {
      toastDismiss(toastId);
      toastError(`Erro: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, status: Lead['status']) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', leadId);
      
      if (error) throw error;

      // Log de Auditoria
      await createAuditLog({
        company_id: profile.company_id!,
        user_id: profile.id,
        module: 'CRM',
        action: 'UPDATE',
        details: `Status do Lead alterado para: ${status}`
      });

      toastSuccess('Status atualizado!');
      setIsDetailModalOpen(false);
      fetchData();
    } catch (err: any) {
      toastError('Erro ao atualizar status');
    }
  };

  const handleConvertToClient = async (lead: Lead) => {
    const toastId = toastLoading('Convertendo para cliente...');
    try {
      // 1. Create client
      const { error: clientError } = await supabase
        .from('clients')
        .insert([{
          company_id: profile?.company_id,
          name: lead.company_name,
          email: lead.email,
          phone: lead.phone,
          segment: 'Transportes' // Default
        }]);
      
      if (clientError) throw clientError;

      // 2. Update lead status to CLOSED
      await supabase.from('leads').update({ status: 'CLOSED' }).eq('id', lead.id);

      toastDismiss(toastId);
      toastSuccess('Parabéns! Novo cliente adicionado à carteira.');
      setIsDetailModalOpen(false);
      fetchData();
    } catch (err: any) {
      toastDismiss(toastId);
      toastError('Erro na conversão');
    }
  };

  const navItems = [
    { id: 'inteligencia', label: 'Centro de Inteligência CRM', icon: Target },
    { id: 'kanban', label: 'Pipeline de Vendas', icon: Kanban },
    { id: 'clientes', label: 'Carteira Clientes', icon: Users },
    { id: 'leads', label: 'Leads Ativos', icon: Users },
    { id: 'agenda', label: 'Agenda & Visitas', icon: Calendar },
  ];

  const columns = [
    { id: 'FIRST_CONTACT', title: 'Primeiro Contato', color: '#D9FF00' },
    { id: 'NEGOTIATION', title: 'Negociação', color: '#f59e0b' },
    { id: 'PROPOSAL', title: 'Proposta Enviada', color: '#D9FF00' },
    { id: 'CLOSED', title: 'Fechado (Sucesso)', color: '#10b981' },
  ];

  const renderDashboard = () => (
    <div style={styles.tabContent}>
      <div style={styles.kpiGrid}>
         <div style={styles.kpiCard}>
           <div style={styles.kpiInfo}>
             <span style={styles.kpiLabel}>Negociações Ativas</span>
             <h2 style={styles.kpiValueText}>{leads.length}</h2>
             <span style={{fontSize: '11px', color: '#10b981', fontWeight: '800'}}>+12% este mês</span>
           </div>
           <div style={{...styles.iconBox, backgroundColor: 'rgba(217, 255, 0, 0.1)'}}>
             <Target size={24} color="var(--primary)" />
           </div>
         </div>
         <div style={styles.kpiCard}>
           <div style={styles.kpiInfo}>
             <span style={styles.kpiLabel}>Base de Clientes</span>
             <h2 style={styles.kpiValueText}>{clients.length}</h2>
             <span style={{fontSize: '11px', color: '#10b981', fontWeight: '800'}}>Crescimento estável</span>
           </div>
           <div style={{...styles.iconBox, backgroundColor: 'rgba(217, 255, 0, 0.1)'}}>
             <Users size={24} color="#D9FF00" />
           </div>
         </div>
      </div>
      
      <div style={styles.chartCard}>
         <div style={styles.cardHeader}>
           <h3 style={styles.cardTitle}>Conversão de Pipeline (Mês)</h3>
         </div>
         <div style={{padding:'32px', height:'350px'}}>
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={[
               {name:'Sem 1', v: 4500},
               {name:'Sem 2', v: 8200},
               {name:'Sem 3', v: 7100},
               {name:'Sem 4', v: 9800}
             ]}>
               <defs>
                 <linearGradient id="crmGradient" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                   <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
               <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
               <Tooltip />
               <Area type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={4} fill="url(#crmGradient)" />
             </AreaChart>
           </ResponsiveContainer>
         </div>
      </div>
    </div>
  );

  const renderKanban = () => (
    <div style={styles.kanbanBoard}>
      {columns.map(col => {
        const columnLeads = leads.filter(l => l.status === col.id);
        return (
          <div key={col.id} style={styles.kanbanColumn}>
            <div style={styles.columnHeader}>
              <div style={styles.columnHeaderTitle}>
                <div style={{...styles.columnDot, backgroundColor: col.color}} />
                <span>{col.title}</span>
              </div>
              <span style={styles.columnCount}>{columnLeads.length}</span>
            </div>
            <div style={styles.columnBody}>
              {columnLeads.length === 0 ? (
                <div style={styles.emptyColumn}>
                  <p>Arraste leads aqui</p>
                </div>
              ) : columnLeads.map(lead => (
                <div 
                  key={lead.id} 
                  style={styles.leadCard} 
                  onClick={() => { setSelectedLead(lead); setIsDetailModalOpen(true); }}
                >
                  <h4 style={styles.leadName}>{lead.company_name}</h4>
                  <p style={styles.leadResponsible}>{lead.responsible_name}</p>
                  <div style={styles.leadFooter}>
                    <span style={styles.leadValue}>R$ {lead.estimated_value?.toLocaleString('pt-BR')}</span>
                    <ChevronRight size={14} color="#94a3b8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderClients = () => (
    <div style={styles.tabContent}>
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Cliente / Empresa</th>
              <th style={styles.th}>E-mail de Contato</th>
              <th style={styles.th}>CNPJ/CPF</th>
              <th style={styles.th}>Segmento</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <div style={{width:'36px', height:'36px', borderRadius:'10px', backgroundColor:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <Building size={18} color="#64748b" />
                    </div>
                    <strong>{c.name}</strong>
                  </div>
                </td>
                <td style={styles.td}>{c.email}</td>
                <td style={styles.td}>{c.cnpj_cpf}</td>
                <td style={styles.td}>
                  <span style={styles.categoryBadge}>{c.segment}</span>
                </td>
                <td style={styles.td}>
                  <button style={styles.iconBtn}><Eye size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const headerActions = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button style={styles.actionBtn} onClick={() => toastSuccess('Exportando CRM...')}>
        <Download size={16} />
        <span>Exportar</span>
      </button>
      <button style={{...styles.actionBtn, backgroundColor: 'var(--primary)', color: 'white', border: 'none'}} onClick={() => { setSelectedLead(null); setIsDetailModalOpen(true); }}>
        <Plus size={16} />
        <span>Novo Lead</span>
      </button>
    </div>
  );

  return (
    <ModuleLayout
      title="Relacionamento"
      badge="CRM & VENDAS"
      items={navItems}
      activeTab={activeTab}
      onTabChange={onTabChange}
      actions={headerActions}
    >
      <div style={styles.viewContainer}>
        <Routes>
          <Route path="/" element={renderDashboard()} />
          <Route path="/kanban" element={renderKanban()} />
          <Route path="/clientes" element={renderClients()} />
          <Route path="/leads" element={renderClients()} /> {/* Leads will use same table for now */}
          <Route path="/agenda" element={<LogtaCalendar />} />
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </div>

      <LogtaModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhe do Lead Estratégico" width="700px">
         {selectedLead ? (
          <div style={{padding: '32px'}}>
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px'}}>
                <div>
                  <h2 style={{fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', margin: 0}}>{selectedLead.company_name}</h2>
                  <p style={{color: '#64748b', fontSize: '15px', marginTop: '4px'}}>Status Atual: <span style={{color: 'var(--primary)', fontWeight: '800'}}>{selectedLead.status}</span></p>
                </div>
                <div style={{textAlign: 'right'}}>
                  <p style={{fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800', margin: 0}}>Valor Estimado</p>
                  <h3 style={{fontSize: '24px', fontWeight: '950', color: '#10b981', margin: 0}}>R$ {selectedLead.estimated_value?.toLocaleString('pt-BR')}</h3>
                </div>
             </div>
             
             <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px'}}>
                <div style={styles.detailBox}>
                   <User size={18} color="var(--primary)" />
                   <div>
                      <span style={styles.detailLabel}>Responsável</span>
                      <p style={styles.detailValue}>{selectedLead.responsible_name}</p>
                   </div>
                </div>
                <div style={styles.detailBox}>
                   <Mail size={18} color="var(--primary)" />
                   <div>
                      <span style={styles.detailLabel}>E-mail</span>
                      <p style={styles.detailValue}>{selectedLead.email}</p>
                   </div>
                </div>
             </div>

             <div style={{display: 'flex', gap: '12px', marginTop: '40px'}}>
                <button style={styles.btnFull} onClick={() => handleUpdateStatus(selectedLead.id, 'PROPOSAL')}>
                  <FileText size={18} /> Mudar para Proposta
                </button>
                <button style={{...styles.btnFull, backgroundColor: '#10b981'}} onClick={() => handleConvertToClient(selectedLead)}>
                  <CheckCircle2 size={18} /> Marcar como Ganho
                </button>
             </div>
          </div>
       ) : (
          <form onSubmit={handleCreateLead} style={{padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
             <div style={{textAlign: 'center', marginBottom: '10px'}}>
                <Target size={48} color="var(--primary)" style={{opacity: 0.2, marginBottom: '12px'}} />
                <h3 style={{fontSize: '20px', fontWeight: '900', margin: 0}}>Cadastrar Novo Lead</h3>
                <p style={{color: '#64748b', fontSize: '14px'}}>Inicie uma nova oportunidade de negócio</p>
             </div>

             <div style={styles.inputGroup}>
                <label style={styles.detailLabel}>Nome da Empresa / Lead</label>
                <input 
                  style={styles.searchInput} 
                  style={{paddingLeft: '16px'}}
                  placeholder="Ex: Transportadora Matriz" 
                  required
                  value={newLead.company_name}
                  onChange={e => setNewLead({...newLead, company_name: e.target.value})}
                />
             </div>

             <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <div style={styles.inputGroup}>
                   <label style={styles.detailLabel}>Pessoa Responsável</label>
                   <input 
                     style={styles.searchInput} 
                     style={{paddingLeft: '16px'}}
                     placeholder="Nome do contato" 
                     value={newLead.responsible_name}
                     onChange={e => setNewLead({...newLead, responsible_name: e.target.value})}
                   />
                </div>
                <div style={styles.inputGroup}>
                   <label style={styles.detailLabel}>Valor Estimado (R$)</label>
                   <input 
                     style={styles.searchInput} 
                     style={{paddingLeft: '16px'}}
                     placeholder="0,00" 
                     value={newLead.estimated_value}
                     onChange={e => setNewLead({...newLead, estimated_value: e.target.value})}
                   />
                </div>
             </div>

             <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <div style={styles.inputGroup}>
                   <label style={styles.detailLabel}>E-mail</label>
                   <input 
                     type="email"
                     style={styles.searchInput} 
                     style={{paddingLeft: '16px'}}
                     placeholder="contato@empresa.com" 
                     value={newLead.email}
                     onChange={e => setNewLead({...newLead, email: e.target.value})}
                   />
                </div>
                <div style={styles.inputGroup}>
                   <label style={styles.detailLabel}>Telefone</label>
                   <input 
                     style={styles.searchInput} 
                     style={{paddingLeft: '16px'}}
                     placeholder="(00) 00000-0000" 
                     value={newLead.phone}
                     onChange={e => setNewLead({...newLead, phone: e.target.value})}
                   />
                </div>
             </div>

             <button type="submit" style={{...styles.btnFull, height: '56px', marginTop: '10px'}} disabled={loadingAction}>
                {loadingAction ? 'Salvando...' : 'Criar Lead Estratégico'}
             </button>
          </form>
         )}
      </LogtaModal>
    </ModuleLayout>
  );
};

const styles: Record<string, any> = {
  viewContainer: { flex: 1, display: 'flex', flexDirection: 'column' },
  tabContent: { display: 'flex', flexDirection: 'column', gap: '32px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' },
  kpiCard: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' },
  kpiInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  kpiLabel: { fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  kpiValueText: { fontSize: '32px', fontWeight: '950', color: 'var(--text-main)', margin: '4px 0' },
  iconBox: { width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  chartCard: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e8e8e8', overflow: 'hidden' },
  cardHeader: { padding: '24px 32px', borderBottom: '1px solid #e8e8e8' },
  cardTitle: { fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: 0 },
  
  kanbanBoard: { display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '24px', minHeight: 'calc(100vh - 400px)' },
  kanbanColumn: { minWidth: '320px', backgroundColor: '#f4f4f4', borderRadius: '32px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid #e8e8e8' },
  columnHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  columnHeaderTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: '900', color: '#1e293b' },
  columnDot: { width: '8px', height: '8px', borderRadius: '50%' },
  columnCount: { fontSize: '11px', fontWeight: '900', color: '#64748b', backgroundColor: 'white', padding: '2px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  columnBody: { display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 },
  emptyColumn: { flex: 1, border: '2px dashed #e2e8f0', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: '700' },
  
  leadCard: { backgroundColor: 'white', padding: '20px', borderRadius: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e8e8e8', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' } },
  leadName: { margin: '0 0 4px 0', fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' },
  leadResponsible: { fontSize: '12px', color: '#64748b', margin: 0 },
  leadFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e8e8e8' },
  leadValue: { fontSize: '14px', fontWeight: '900', color: 'var(--primary)' },
  
  tableCard: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e8e8e8', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e8e8e8', backgroundColor: '#fcfdfe' },
  td: { padding: '20px 32px', fontSize: '14px', borderBottom: '1px solid #e8e8e8', color: '#475569' },
  tr: { transition: 'background-color 0.2s', '&:hover': { backgroundColor: '#fcfdfe' } },
  
  detailBox: { display: 'flex', gap: '16px', alignItems: 'center', padding: '20px', backgroundColor: '#f4f4f4', borderRadius: '20px', border: '1px solid #e8e8e8' },
  detailLabel: { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800' },
  detailValue: { fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: 0 },
  btnFull: { flex: 1, padding: '16px', borderRadius: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', fontWeight: '900', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  actionBtn: { padding: '10px 18px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800' },
  categoryBadge: { padding: '5px 12px', backgroundColor: '#f0f9ff', color: '#0369a1', borderRadius: '12px', fontSize: '11px', fontWeight: '900' },
  iconBtn: { padding: '8px', color: '#94a3b8', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '10px', transition: 'all 0.2s', '&:hover': { backgroundColor: '#ebebeb', color: 'var(--primary)' } }
};

export default CRM;
