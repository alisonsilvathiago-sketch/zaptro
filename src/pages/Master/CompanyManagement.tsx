import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Filter, MoreVertical, 
  CheckCircle, ShieldAlert, Edit2, ExternalLink,
  ChevronRight, ArrowUpRight, DollarSign, Users,
  Globe, Mail, Phone, Plus, X, Save, Settings,
  Activity, CreditCard, Lock, History, UserPlus,
  ArrowDownRight, TrendingUp, Briefcase, Eye,
  Pause, Trash2, RefreshCw, Layers, GraduationCap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import LogtaModal from '../../components/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Company, Profile } from '../../types';

// Mock data for charts if DB doesn't have enough history
const growthData = [
  { month: 'Jan', companies: 4 },
  { month: 'Fev', companies: 7 },
  { month: 'Mar', companies: 12 },
  { month: 'Abr', companies: 18 },
];

const CompanyManagement: React.FC = () => {
  const { impersonate } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyUsers, setCompanyUsers] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'dados' | 'usuarios' | 'permissoes' | 'financeiro' | 'auditoria'>('dados');
  const [saving, setSaving] = useState(false);

  const [newCompany, setNewCompany] = useState({
    name: '',
    subdomain: '',
    plan: 'BRONZE' as Company['plan'],
    email: '',
    phone: '',
    cnpj: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', companyId);
      
      if (error) throw error;
      setCompanyUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCompany && isDetailsModalOpen) {
      fetchUsers(selectedCompany.id);
    }
  }, [selectedCompany, isDetailsModalOpen]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ATIVO' ? 'SUSPENSO' : 'ATIVO';
    try {
      const { error } = await supabase
        .from('companies')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toastSuccess(`Instância ${newStatus === 'ATIVO' ? 'ativada' : 'suspensa'} com sucesso!`);
      fetchData();
    } catch (err) {
      toastError('Erro ao alterar status da empresa');
    }
  };
  const toggleModule = async (companyId: string, moduleKey: string) => {
    if (!selectedCompany) return;
    const currentModules = selectedCompany.settings?.modules || [];
    const newModules = currentModules.includes(moduleKey)
      ? currentModules.filter((m: string) => m !== moduleKey)
      : [...currentModules, moduleKey];
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          settings: {
            ...selectedCompany.settings,
            modules: newModules
          }
        })
        .eq('id', companyId);
      if (error) throw error;
      toastSuccess('Permissões da instância atualizadas!');
      setSelectedCompany({
        ...selectedCompany,
        settings: { ...selectedCompany.settings, modules: newModules }
      });
      fetchData();
    } catch (err) {
      toastError('Falha ao atualizar módulos');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toastLoading('Iniciando instância Master...');
    
    try {
      const { error } = await supabase
        .from('companies')
        .insert([{
          id: crypto.randomUUID(),
          name: newCompany.name,
          subdomain: newCompany.subdomain.toLowerCase(),
          plan: newCompany.plan,
          status: 'ATIVO',
          settings: {
            cnpj: newCompany.cnpj,
            email: newCompany.email,
            phone: newCompany.phone,
            modules: ['logistics', 'finance', 'crm']
          }
        }]);

      if (error) throw error;
      
      toastDismiss(toastId);
      toastSuccess('Nova empresa cadastrada e instância ativa!');
      setIsAddModalOpen(false);
      setNewCompany({ name: '', subdomain: '', plan: 'BRONZE', email: '', phone: '', cnpj: '' });
      fetchData();
    } catch (err: any) {
      toastDismiss(toastId);
      console.error('Erro Master:', err);
      toastError('Falha ao abrir unidade: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDetails = (company: Company) => {
    setSelectedCompany(company);
    setActiveTab('dados');
    setIsDetailsModalOpen(true);
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subdomain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.settings?.cnpj?.includes(searchTerm)
  );

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.status === 'ATIVO').length,
    suspended: companies.filter(c => c.status === 'SUSPENSO').length,
    revenue: companies.reduce((acc, c) => {
        const value = c.plan === 'OURO' ? 997 : c.plan === 'PRATA' ? 497 : 197;
        return acc + value;
    }, 0)
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header Master */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Hub de Empresas Master</h1>
          <p style={styles.subtitle}>Visão estratégica e controle total do ecossistema Logta.</p>
        </div>
        <div style={styles.headerActions}>
           <button style={styles.refreshBtn} onClick={fetchData} title="Atualizar Dados">
             <RefreshCw size={18} />
           </button>
           <button style={styles.addBtn} onClick={() => setIsAddModalOpen(true)}>
             <Plus size={18} /> Abrir Nova Instância
           </button>
        </div>
      </header>

      {/* DASHBOARD MASTER */}
      <div style={styles.statsGrid}>
         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: 'rgba(217, 255, 0, 0.12)', color: '#D9FF00'}}><Building2 size={20} /></div>
               <span style={styles.statLabel}>Total de Empresas</span>
            </div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statFooter}>
               <span style={{color: '#10b981', fontWeight: '700', fontSize: '12px'}}><TrendingUp size={12} /> +12%</span>
               <span style={styles.statSub}>em relação ao mês anterior</span>
            </div>
         </div>

         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#ecfdf5', color: '#10b981'}}><CheckCircle size={20} /></div>
               <span style={styles.statLabel}>Empresas Ativas</span>
            </div>
            <div style={styles.statValue}>{stats.active}</div>
            <div style={styles.statFooter}>
               <span style={styles.statSub}>Taxa de retenção: 98%</span>
            </div>
         </div>

         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#fef2f2', color: '#ef4444'}}><Pause size={20} /></div>
               <span style={styles.statLabel}>Suspensas/Inativas</span>
            </div>
            <div style={styles.statValue}>{stats.suspended}</div>
            <div style={styles.statFooter}>
               <span style={{color: '#ef4444', fontWeight: '700', fontSize: '12px'}}><ArrowDownRight size={12} /> -2%</span>
               <span style={styles.statSub}>Churn mensal controlado</span>
            </div>
         </div>

         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#fff7ed', color: '#f59e0b'}}><DollarSign size={20} /></div>
               <span style={styles.statLabel}>MRR Estimado</span>
            </div>
            <div style={styles.statValue}>
               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}
            </div>
            <div style={styles.statFooter}>
               <span style={styles.statSub}>Baseado no mix de planos</span>
            </div>
         </div>
      </div>

      {/* CHARTS ROW */}
      <div style={styles.chartsRow}>
         <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Crescimento de Empresas</h3>
            <div style={{height: '200px'}}>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                     <defs>
                        <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#D9FF00" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#D9FF00" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)'}}
                        itemStyle={{fontWeight: 700, color: '#D9FF00'}}
                     />
                     <Area type="monotone" dataKey="companies" stroke="#D9FF00" strokeWidth={3} fillOpacity={1} fill="url(#colorComp)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>
         <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Distribuição por Plano</h3>
            <div style={{height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: '32px', fontWeight: '900', color: 'var(--primary)'}}>
                     {Math.round((companies.filter(c => c.plan === 'OURO').length / (companies.length || 1)) * 100)}%
                  </div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700'}}>EMPRESAS NO PLANO OURO</div>
               </div>
            </div>
         </div>
      </div>

      {/* Search and Filter */}
      <div style={styles.controls}>
        <div style={styles.searchBox}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar por nome, CNPJ ou subdomínio..." 
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button style={styles.filterBtn}><Filter size={18} /> Filtros Avançados</button>
      </div>

      {/* Main List */}
      <div style={styles.listCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHead}>
               <th style={styles.th}>INSTÂNCIA / MASTER</th>
               <th style={styles.th}>PLAN/ID</th>
               <th style={styles.th}>CONTATO</th>
               <th style={styles.th}>STATUS</th>
               <th style={styles.th}>ÚLTIMO ACESSO</th>
               <th style={styles.th}>AÇÕES MASTER</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={6} style={{padding: '40px', textAlign: 'center', color: '#94a3b8'}}>Processando dados master...</td></tr>
            ) : filteredCompanies.length === 0 ? (
               <tr><td colSpan={6} style={{padding: '40px', textAlign: 'center', color: '#94a3b8'}}>Nenhuma instância encontrada.</td></tr>
            ) : filteredCompanies.map(company => (
              <tr key={company.id} style={styles.tr}>
                <td style={styles.td}>
                   <div style={styles.companyInfo}>
                      <div style={{...styles.avatar, backgroundColor: company.primary_color || 'var(--primary)'}}>
                         {company.name[0]}
                      </div>
                      <div>
                         <div style={styles.companyName}>{company.name}</div>
                         <div style={styles.subdomainLink}>
                            {company.subdomain || 'padrao'}.logta.app
                         </div>
                      </div>
                   </div>
                </td>
                <td style={styles.td}>
                   <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      <span style={{
                         ...styles.planBadge,
                         backgroundColor: company.plan === 'OURO' ? '#fef3c7' : company.plan === 'PRATA' ? 'rgba(217, 255, 0, 0.12)' : '#f1f5f9',
                         color: company.plan === 'OURO' ? '#92400e' : company.plan === 'PRATA' ? '#D9FF00' : '#64748b'
                      }}>
                         {company.plan || 'BRONZE'}
                      </span>
                      <span style={styles.companyId}>ID: {company.id.substring(0,8)}</span>
                   </div>
                </td>
                <td style={styles.td}>
                   <div style={styles.contactCell}>
                      <span style={styles.contactText}><Mail size={12} /> {company.settings?.email || 'N/A'}</span>
                      <span style={styles.cnpjText}><Briefcase size={12} /> {company.settings?.cnpj || 'S/ CNPJ'}</span>
                   </div>
                </td>
                <td style={styles.td}>
                   <div style={{
                      ...styles.statusBadge,
                      backgroundColor: company.status === 'ATIVO' ? '#ecfdf5' : '#fef2f2',
                      color: company.status === 'ATIVO' ? '#10b981' : '#ef4444'
                   }}>
                      {company.status === 'ATIVO' ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
                      {company.status}
                   </div>
                </td>
                <td style={styles.td}>
                   <span style={styles.dateText}>Hoje às 14:30</span>
                </td>
                <td style={styles.td}>
                   <div style={styles.actions}>
                      <button 
                         style={{...styles.actionBtn, backgroundColor: '#ebebeb', color: 'var(--primary)'}} 
                         title="Visualizar Detalhes"
                         onClick={() => openDetails(company)}
                      >
                         <Eye size={16} />
                      </button>
                      <button 
                         style={{...styles.actionBtn, backgroundColor: '#ecfdf5', color: '#10b981'}} 
                         title="Acessar como Admin"
                         onClick={() => impersonate(company.id)}
                      >
                         <ExternalLink size={16} />
                      </button>
                      <button 
                         style={{...styles.actionBtn, backgroundColor: company.status === 'ATIVO' ? '#fef2f2' : '#ecfdf5', color: company.status === 'ATIVO' ? '#ef4444' : '#10b981'}} 
                         title={company.status === 'ATIVO' ? "Bloquear" : "Ativar"}
                         onClick={() => toggleStatus(company.id, company.status)}
                      >
                         {company.status === 'ATIVO' ? <Pause size={16} /> : <CheckCircle size={16} />}
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DETALHES EMPRESA */}
      <LogtaModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        width="900px" 
        title={`Gestão Master: ${selectedCompany?.name}`}
      >
         <div style={styles.modalContent}>
            <div style={styles.modalTabs}>
               <button 
                  style={{...styles.tabBtn, ...(activeTab === 'dados' ? styles.activeTab : {})}}
                  onClick={() => setActiveTab('dados')}
               >
                  <Building2 size={16} /> Dados Gerais
               </button>
               <button 
                  style={{...styles.tabBtn, ...(activeTab === 'usuarios' ? styles.activeTab : {})}}
                  onClick={() => setActiveTab('usuarios')}
               >
                  <Users size={16} /> Usuários ({companyUsers.length})
               </button>
               <button 
                  style={{...styles.tabBtn, ...(activeTab === 'permissoes' ? styles.activeTab : {})}}
                  onClick={() => setActiveTab('permissoes')}
               >
                  <Lock size={16} /> Módulos & RLS
               </button>
               <button 
                  style={{...styles.tabBtn, ...(activeTab === 'financeiro' ? styles.activeTab : {})}}
                  onClick={() => setActiveTab('financeiro')}
               >
                  <CreditCard size={16} /> Financeiro
               </button>
               <button 
                  style={{...styles.tabBtn, ...(activeTab === 'auditoria' ? styles.activeTab : {})}}
                  onClick={() => setActiveTab('auditoria')}
               >
                  <History size={16} /> Auditoria
               </button>
            </div>

            <div style={styles.tabContent}>
               {activeTab === 'dados' && selectedCompany && (
                  <div style={styles.dadosGrid}>
                     <div style={styles.infoGroup}>
                        <label style={styles.infoLabel}>Nome Jurídico</label>
                        <div style={styles.infoValue}>{selectedCompany.name}</div>
                     </div>
                     <div style={styles.infoGroup}>
                        <label style={styles.infoLabel}>CNPJ</label>
                        <div style={styles.infoValue}>{selectedCompany.settings?.cnpj || 'Não informado'}</div>
                     </div>
                     <div style={styles.infoGroup}>
                        <label style={styles.infoLabel}>Subdomínio Ativo</label>
                        <div style={styles.infoValue}>{selectedCompany.subdomain}.logta.app</div>
                     </div>
                     <div style={styles.infoGroup}>
                        <label style={styles.infoLabel}>Data de Ativação</label>
                        <div style={styles.infoValue}>{new Date(selectedCompany.created_at || Date.now()).toLocaleDateString('pt-BR')}</div>
                     </div>
                     <div style={styles.infoGroup}>
                        <label style={styles.infoLabel}>Responsável (Email)</label>
                        <div style={styles.infoValue}>{selectedCompany.settings?.email || 'N/A'}</div>
                     </div>
                     <div style={styles.infoGroup}>
                        <label style={styles.infoLabel}>Status da Instância</label>
                        <div style={{...styles.statusBadge, 
                           backgroundColor: selectedCompany.status === 'ATIVO' ? '#ecfdf5' : '#fef2f2',
                           color: selectedCompany.status === 'ATIVO' ? '#10b981' : '#ef4444'
                        }}>{selectedCompany.status}</div>
                     </div>
                  </div>
               )}

               {activeTab === 'usuarios' && (
                  <div style={styles.usersList}>
                     <header style={styles.listHeader}>
                        <h4 style={styles.listTitle}>Colaboradores Vinculados</h4>
                        <button style={styles.smallAddBtn}><UserPlus size={14} /> Novo Usuário</button>
                     </header>
                     <table style={styles.smallTable}>
                        <thead>
                           <tr>
                              <th>NOME</th>
                              <th>CARGO</th>
                              <th>EMAIL</th>
                              <th>STATUS</th>
                              <th>AÇÕES</th>
                           </tr>
                        </thead>
                        <tbody>
                           {companyUsers.map(u => (
                              <tr key={u.id}>
                                 <td style={{fontWeight: '700'}}>{u.full_name}</td>
                                 <td><span style={styles.roleBadge}>{u.role}</span></td>
                                 <td style={{color: '#64748b'}}>{u.email || 'N/A'}</td>
                                 <td><span style={{color: '#10b981', fontWeight: '800'}}>ATIVO</span></td>
                                 <td>
                                    <button style={styles.iconOnlyBtn}><Edit2 size={14} /></button>
                                    <button style={styles.iconOnlyBtn}><Lock size={14} /></button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}

               {activeTab === 'permissoes' && (
                  <div style={styles.permissionsGrid}>
                     <div style={styles.permissionCard} onClick={() => toggleModule(selectedCompany!.id, 'logistics')}>
                        <div style={styles.permIcon}><Activity size={20} /></div>
                        <div>
                           <div style={styles.permTitle}>Módulo Logística</div>
                           <div style={styles.permDesc}>Cálculos, frotas e roteirização ativa.</div>
                        </div>
                        <input type="checkbox" checked={selectedCompany?.settings?.modules?.includes('logistics')} readOnly />
                     </div>
                     <div style={styles.permissionCard} onClick={() => toggleModule(selectedCompany!.id, 'finance')}>
                        <div style={styles.permIcon}><DollarSign size={20} /></div>
                        <div>
                           <div style={styles.permTitle}>Módulo Financeiro</div>
                           <div style={styles.permDesc}>Contas a pagar/receber e fluxo de caixa.</div>
                        </div>
                        <input type="checkbox" checked={selectedCompany?.settings?.modules?.includes('finance')} readOnly />
                     </div>
                     <div style={styles.permissionCard} onClick={() => toggleModule(selectedCompany!.id, 'training')}>
                        <div style={styles.permIcon}><GraduationCap size={20} /></div>
                        <div>
                           <div style={styles.permTitle}>Módulo LMS (Treinamentos)</div>
                           <div style={styles.permDesc}>Criação de cursos e área de membros corporativa.</div>
                        </div>
                        <input type="checkbox" checked={selectedCompany?.settings?.modules?.includes('training')} readOnly />
                     </div>
                     <div style={styles.permissionCard} onClick={() => toggleModule(selectedCompany!.id, 'whatsapp')}>
                        <div style={styles.permIcon}><Phone size={20} /></div>
                        <div>
                           <div style={styles.permTitle}>Módulo WhatsApp</div>
                           <div style={styles.permDesc}>Atendimento multi-agente e disparos.</div>
                        </div>
                        <input type="checkbox" checked={selectedCompany?.settings?.modules?.includes('whatsapp')} readOnly />
                     </div>
                  </div>
               )}

               {activeTab === 'financeiro' && (
                  <div style={styles.financeView}>
                     <div style={styles.planSummary}>
                        <div>
                           <div style={styles.infoLabel}>Plano Contratado</div>
                           <div style={{fontSize: '24px', fontWeight: '900', color: 'var(--primary)'}}>{selectedCompany?.plan}</div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                           <div style={styles.infoLabel}>Valor Mensal</div>
                           <div style={{fontSize: '24px', fontWeight: '900', color: '#10b981'}}>R$ 997,00</div>
                        </div>
                     </div>
                     <h4 style={{marginTop: '24px', marginBottom: '16px', fontSize: '14px', fontWeight: '800'}}>HISTÓRICO DE FATURAMENTO</h4>
                     <div style={styles.billingRow}>
                        <span>Fatura #9928 - Abril 2026</span>
                        <span style={{color: '#10b981', fontWeight: '800'}}>PAGO</span>
                        <span>12/04/2026</span>
                     </div>
                     <div style={styles.billingRow}>
                        <span>Fatura #9812 - Março 2026</span>
                        <span style={{color: '#10b981', fontWeight: '800'}}>PAGO</span>
                        <span>10/03/2026</span>
                     </div>
                  </div>
               )}

               {activeTab === 'auditoria' && (
                  <div style={styles.auditView}>
                     <div style={styles.auditItem}>
                        <div style={styles.auditDot} />
                        <div>
                           <div style={styles.auditText}><b>Sistema</b> alterou plano de BRONZE para OURO</div>
                           <div style={styles.auditDate}>Ontem às 18:45</div>
                        </div>
                     </div>
                     <div style={styles.auditItem}>
                        <div style={styles.auditDot} />
                        <div>
                           <div style={styles.auditText}><b>Admin</b> resetou senha do usuário João Silva</div>
                           <div style={styles.auditDate}>10/04/2026 às 11:20</div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            <footer style={styles.modalFooter}>
               <button style={styles.dangerBtn} onClick={() => { if(confirm('Excluir instância permanentemente?')) toastError('Funcionalidade Master Restrita'); }}>
                  <Trash2 size={16} /> Excluir Unidade
               </button>
               <button style={styles.saveBtn} onClick={() => setIsDetailsModalOpen(false)}>
                  Fechar Gerenciamento
               </button>
            </footer>
         </div>
      </LogtaModal>

      {/* MODAL ADICIONAR EMPRESA */}
      <LogtaModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        width="600px" 
        title="Ouvir Nova Instância Master"
      >
        <form onSubmit={handleCreateCompany} style={styles.form}>
           <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                 <label style={styles.label}>Nome da Empresa</label>
                 <input 
                    style={styles.formInput} 
                    value={newCompany.name} 
                    required 
                    onChange={e => setNewCompany({...newCompany, name: e.target.value})} 
                    placeholder="Ex: Transportes Brasil LTDA"
                 />
              </div>
              <div style={styles.inputGroup}>
                 <label style={styles.label}>Subdomínio (Ex: brasil)</label>
                 <div style={styles.subdomainInputBox}>
                    <input 
                       style={styles.formInputSub} 
                       value={newCompany.subdomain} 
                       required 
                       onChange={e => setNewCompany({...newCompany, subdomain: e.target.value.replace(/[^a-z0-9]/gi, '')})} 
                       placeholder="brasil"
                    />
                    <span>.logta.app</span>
                 </div>
              </div>
           </div>
           
           <div style={styles.formGrid}>
             <div style={styles.inputGroup}>
               <label style={styles.label}>E-mail de Contato</label>
               <input 
                 style={styles.formInput} 
                 type="email"
                 value={newCompany.email} 
                 required 
                 onChange={e => setNewCompany({...newCompany, email: e.target.value})} 
                 placeholder="admin@empresa.com"
               />
             </div>
             <div style={styles.inputGroup}>
               <label style={styles.label}>Documento (CNPJ)</label>
               <input 
                 style={styles.formInput} 
                 value={newCompany.cnpj} 
                 required 
                 onChange={e => setNewCompany({...newCompany, cnpj: e.target.value})} 
                 placeholder="00.000.000/0001-00"
               />
             </div>
           </div>

           <div style={styles.inputGroup}>
              <label style={styles.label}>Tier de Plano</label>
              <select 
                 style={styles.formInput} 
                 value={newCompany.plan} 
                 onChange={e => setNewCompany({...newCompany, plan: e.target.value as any})}
              >
                 <option value="BRONZE">Logta Essencial (BRONZE)</option>
                 <option value="PRATA">Logta Profissional (PRATA)</option>
                 <option value="OURO">Logta Enterprise 360° (OURO)</option>
              </select>
           </div>

           <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? 'Provisionando infra...' : 'Ativar Instância AGORA 🔥'}
           </button>
        </form>
      </LogtaModal>
    </div>
  );
};

const styles = {
  container: { padding: '0', backgroundColor: 'transparent', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-1.5px' },
  subtitle: { color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500' },
  headerActions: { display: 'flex', gap: '12px' },
  refreshBtn: { width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', height: '46px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  statHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  statIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const },
  statValue: { fontSize: '32px', fontWeight: '900', color: 'var(--primary)', marginBottom: '8px' },
  statFooter: { display: 'flex', alignItems: 'center', gap: '6px' },
  statSub: { fontSize: '11px', color: '#94a3b8', fontWeight: '600' },

  chartsRow: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '32px' },
  chartCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  chartTitle: { fontSize: '16px', fontWeight: '800', color: 'var(--primary)', marginBottom: '20px' },

  controls: { display: 'flex', gap: '16px', marginBottom: '24px' },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' },
  searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontWeight: '600', color: 'var(--primary)' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '16px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', color: 'var(--primary)' },
  
  listCard: { backgroundColor: 'white', borderRadius: '28px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  tableHead: { backgroundColor: '#f4f4f4', borderBottom: '1px solid var(--border)' },
  th: { padding: '18px 24px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.2s' },
  td: { padding: '20px 24px' },
  companyInfo: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatar: { width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  companyName: { fontSize: '15px', fontWeight: '800', color: 'var(--primary)', marginBottom: '2px' },
  subdomainLink: { fontSize: '12px', color: 'var(--accent)', fontWeight: '700' },
  companyId: { fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' },
  planBadge: { padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', width: 'fit-content' },
  contactCell: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  contactText: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: '600' },
  cnpjText: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: '700' },
  statusBadge: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', width: 'fit-content' },
  dateText: { fontSize: '12px', fontWeight: '700', color: '#64748b' },
  actions: { display: 'flex', gap: '10px' },
  actionBtn: { width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'transform 0.2s' },
  
  // Modal Styles
  modalContent: { padding: '0px' },
  modalTabs: { display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: '#f4f4f4', padding: '0 20px' },
  tabBtn: { padding: '20px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' as const, transition: 'all 0.2s' },
  activeTab: { color: 'var(--primary)', borderBottom: '3px solid var(--primary)' },
  tabContent: { padding: '32px', minHeight: '400px' },
  
  dadosGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' },
  infoGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  infoLabel: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  infoValue: { fontSize: '15px', fontWeight: '800', color: 'var(--primary)' },
  
  usersList: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  listTitle: { fontSize: '16px', fontWeight: '800', color: 'var(--primary)' },
  smallAddBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  smallTable: { width: '100%', borderCollapse: 'collapse' as const },
  roleBadge: { backgroundColor: '#ebebeb', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' },
  iconOnlyBtn: { padding: '6px', border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' },
  
  permissionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  permissionCard: { padding: '20px', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' },
  permIcon: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' },
  permTitle: { fontSize: '14px', fontWeight: '800', color: 'var(--primary)' },
  permDesc: { fontSize: '12px', color: '#94a3b8', fontWeight: '500' },
  
  financeView: { display: 'flex', flexDirection: 'column' as const },
  planSummary: { display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '24px', backgroundColor: '#f4f4f4', borderRadius: '20px', gap: '24px' },
  billingRow: { display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #e8e8e8', fontSize: '13px', fontWeight: '600' },
  
  auditView: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  auditItem: { display: 'flex', gap: '16px' },
  auditDot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '6px' },
  auditText: { fontSize: '14px', color: 'var(--primary)' },
  auditDate: { fontSize: '12px', color: '#94a3b8', fontWeight: '600' },
  
  modalFooter: { padding: '24px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '16px', backgroundColor: '#f4f4f4' },
  dangerBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },

  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px', padding: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  formInput: { padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '14px', fontWeight: '600', outline: 'none', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' },
  subdomainInputBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 18px', height: '48px', borderRadius: '14px', border: '1px solid var(--border)', backgroundColor: '#f4f4f4' },
  formInputSub: { border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: '14px', textAlign: 'right' as const, fontWeight: '800', color: 'var(--primary)' },
  saveBtn: { padding: '16px 32px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }
};

export default CompanyManagement;
