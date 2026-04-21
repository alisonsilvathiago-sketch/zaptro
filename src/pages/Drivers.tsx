import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Users, User, Phone, Mail, MapPin, Search, Plus, Filter, Download, 
  Truck, Package, Activity, Clock, Heart, ShieldAlert, Star, 
  History as HistoryIcon, Calendar, ArrowLeft, ArrowRight, TrendingUp, AlertCircle,
  MoreVertical, FileText, CheckCircle2, MessageCircle, DollarSign, Wrench, ShieldCheck,
  AlertTriangle, Navigation
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import LogtaModal from '../components/Modal';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import ExportButton from '../components/ExportButton';

interface Driver {
  id: string;
  full_name: string;
  type: 'Motorista' | 'Agregado';
  phone: string;
  email: string;
  status: 'Ativo' | 'Inativo' | 'Afastado';
  position: string;
  hiring_date: string;
  cnh_number?: string;
  cnh_expiry?: string;
  health_score?: number;
  rating?: number;
  company_id: string;
}

const Drivers: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id: profileId } = useParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'list' | 'profile'>('list');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Stats mock
  const perfData = [
    { name: 'Seg', entregas: 12, fuel: 8.5 },
    { name: 'Ter', entregas: 15, fuel: 9.0 },
    { name: 'Qua', entregas: 10, fuel: 7.8 },
    { name: 'Qui', entregas: 18, fuel: 8.2 },
    { name: 'Sex', entregas: 14, fuel: 8.4 },
  ];

  useEffect(() => {
    if (profileId) {
      setActiveTab('profile');
      fetchDriverProfile(profileId);
    } else {
      setActiveTab('list');
      fetchDrivers();
    }
  }, [profileId, profile?.company_id]);

  const fetchDrivers = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .in('type', ['Motorista', 'Agregado'])
        .order('full_name');
      
      if (error) throw error;
      setDrivers(data || []);
    } catch (err: any) {
      toastError('Erro ao carregar motoristas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverProfile = async (id: string) => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setSelectedDriver(data);
    } catch (err: any) {
      toastError('Erro ao carregar perfil: ' + err.message);
      navigate('/motoristas');
    } finally {
      setLoading(false);
    }
  };

   const renderAddDriverModal = () => (
      <LogtaModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        width="600px" 
        title="Novo Vínculo Operacional"
      >
         <form style={styles.formGrid} onSubmit={(e) => { e.preventDefault(); toastSuccess('Motorista cadastrado com sucesso!'); setIsAddModalOpen(false); }}>
            <div style={styles.inputGroup}>
               <label style={styles.label}>Nome Completo</label>
               <input style={styles.input} placeholder="Ex: João da Silva" required />
            </div>
            <div style={styles.formRow}>
               <div style={styles.inputGroup}>
                  <label style={styles.label}>Tipo de Vínculo</label>
                  <select style={styles.input} required>
                     <option value="Motorista">Motorista CLT (Interno)</option>
                     <option value="Agregado">Agregado (Externo / Frota Terceira)</option>
                  </select>
               </div>
               <div style={styles.inputGroup}>
                  <label style={styles.label}>CPF / Identidade</label>
                  <input style={styles.input} placeholder="000.000.000-00" />
               </div>
            </div>
            <div style={styles.formRow}>
               <div style={styles.inputGroup}>
                  <label style={styles.label}>Veículo / Placa (Padronizada)</label>
                  <input style={styles.input} placeholder="ABC-1234" />
               </div>
               <div style={styles.inputGroup}>
                  <label style={styles.label}>Telefone / WhatsApp</label>
                  <input style={styles.input} placeholder="(00) 00000-0000" />
               </div>
            </div>
            <button type="submit" style={styles.primaryBtnFull}>
               Finalizar Cadastro e Ativar Acesso
            </button>
         </form>
      </LogtaModal>
   );

   const renderKPIs = () => (
      <div style={styles.kpiGrid}>
         <div style={styles.kpiCard}>
            <div style={{...styles.kpiIconBox, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}>
               <Users size={24} />
            </div>
            <div style={styles.kpiInfo}>
               <p style={styles.kpiLabel}>Total Motoristas</p>
               <h2 style={styles.kpiValue}>{drivers.length}</h2>
            </div>
         </div>
         <div style={styles.kpiCard}>
            <div style={{...styles.kpiIconBox, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}>
               <ShieldCheck size={24} />
            </div>
            <div style={styles.kpiInfo}>
               <p style={styles.kpiLabel}>Colab. Corporativos</p>
               <h2 style={styles.kpiValue}>{drivers.filter(d => d.type === 'Motorista').length}</h2>
            </div>
         </div>
         <div style={styles.kpiCard}>
            <div style={{...styles.kpiIconBox, backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6'}}>
               <Truck size={24} />
            </div>
            <div style={styles.kpiInfo}>
               <p style={styles.kpiLabel}>Motoristas Agregados</p>
               <h2 style={styles.kpiValue}>{drivers.filter(d => d.type === 'Agregado').length}</h2>
            </div>
         </div>
         <div style={styles.kpiCard}>
            <div style={{...styles.kpiIconBox, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}>
               <Navigation size={24} />
            </div>
            <div style={styles.kpiInfo}>
               <p style={styles.kpiLabel}>Status Operacional</p>
               <h2 style={styles.kpiValue}>{drivers.filter(d => d.status === 'Ativo').length}</h2>
            </div>
         </div>
      </div>
   );

  const renderProfile360 = (driver: Driver) => (
    <div className="animate-fade-in" style={styles.profileContainer}>
      {/* Header Profile */}
      <div style={styles.profileHeader}>
        <button style={styles.backBtn} onClick={() => navigate('/motoristas')}>
          <ArrowLeft size={20} /> Voltar para Lista
        </button>
        <div style={styles.profileHero}>
           <div style={styles.avatarLarge}>{driver.full_name[0]}</div>
           <div style={styles.heroInfo}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                 <h1 style={styles.heroName}>{driver.full_name}</h1>
                 <span style={{...styles.statusTag, backgroundColor: driver.status === 'Ativo' ? '#ecfdf5' : '#fef2f2', color: driver.status === 'Ativo' ? '#10b981' : '#ef4444'}}>
                    {driver.status}
                 </span>
              </div>
              <p style={styles.heroSub}>{driver.type} • {driver.position || 'Motorista Operacional'} • Membro desde {new Date(driver.hiring_date).toLocaleDateString()}</p>
           </div>
           <div style={styles.heroStats}>
              <div style={styles.miniStat}>
                 <Star size={16} color="#f59e0b" fill="#f59e0b" />
                 <span><strong>4.9</strong> Score</span>
              </div>
              <div style={styles.miniStat}>
                 <ShieldCheck size={16} color="#10b981" />
                 <span>CNH {driver.cnh_expiry || 'Normal'}</span>
              </div>
           </div>
        </div>
      </div>

      <div style={styles.profileMainGrid}>
        {/* COLUNA ESQUERDA: PERFORMANCE & HISTÓRICO */}
        <div style={styles.profileColumnMain}>
           {/* Seção 1: Logística e Rotas */}
           <section style={styles.profileCard}>
              <div style={styles.cardHeader}>
                 <div style={styles.cardTitleArea}>
                    <Navigation size={20} color="var(--primary)" />
                    <h3 style={styles.cardTitle}>Histórico Logístico 360°</h3>
                 </div>
                 <div style={styles.dateFilter}>Últimos 30 dias <Calendar size={14} /></div>
              </div>
              
              <div style={{height: 300, padding: '24px 0'}}>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={perfData}>
                       <defs>
                          <linearGradient id="colorRoutes" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                       <Tooltip />
                       <Area type="monotone" dataKey="entregas" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRoutes)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>

              <div style={styles.timelineList}>
                 <div style={styles.timelineItem}>
                    <div style={styles.timelineDot} />
                    <div style={styles.timelineContent}>
                       <div style={styles.timelineRow}>
                          <strong>Rota SP-Interior #9921</strong>
                          <span>Ontem, 08:30h</span>
                       </div>
                       <p style={styles.timelineText}>Veículo: <strong>ABC-1234 (Renault Master)</strong> • 15 entregas realizadas (100% sucesso)</p>
                    </div>
                 </div>
                 <div style={styles.timelineItem}>
                    <div style={styles.timelineDot} />
                    <div style={styles.timelineContent}>
                       <div style={styles.timelineRow}>
                          <strong>Rota Capital Sul #9880</strong>
                          <span>10/04/2026, 09:12h</span>
                       </div>
                       <p style={styles.timelineText}>Veículo: <strong>XYZ-9988 (Mercedes Accelo)</strong> • 08 entregas realizadas (1 ocorrência reportada)</p>
                    </div>
                 </div>
              </div>
           </section>

           {/* Seção 2: Frota e Veículos Vinculados */}
           <section style={styles.profileCard}>
              <div style={styles.cardHeader}>
                 <div style={styles.cardTitleArea}>
                    <Truck size={20} color="#10b981" />
                    <h3 style={styles.cardTitle}>Histórico de Frota & Oficina</h3>
                 </div>
              </div>
              <div style={styles.tableMini}>
                 <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                       <tr>
                          <th style={styles.miniTh}>Placa/Veículo</th>
                          <th style={styles.miniTh}>Período de Uso</th>
                          <th style={styles.miniTh}>Ocorrência Técnica</th>
                          <th style={styles.miniTh}>KM Rodada</th>
                       </tr>
                    </thead>
                    <tbody>
                       <tr style={styles.miniTr}>
                          <td style={styles.miniTd}><strong>ABC-1234</strong></td>
                          <td style={styles.miniTd}>01/04 - Atual</td>
                          <td style={styles.miniTd}><span style={{color: 'var(--success)', fontWeight: '700'}}>Sem ocorrências</span></td>
                          <td style={styles.miniTd}>1.240 km</td>
                       </tr>
                       <tr style={styles.miniTr}>
                          <td style={styles.miniTd}><strong>XYZ-9988</strong></td>
                          <td style={styles.miniTd}>15/03 - 31/03</td>
                          <td style={styles.miniTd}><span style={{color: 'var(--danger)', fontWeight: '700'}}>Oficina (Suspensão)</span></td>
                          <td style={styles.miniTd}>850 km</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
           </section>
        </div>

        {/* COLUNA DIREITA: RH, SAÚDE, DOCUMENTOS & FEEDBACK */}
        <div style={styles.profileColumnSide}>
           {/* Card Saúde & RH */}
           <div style={styles.sideCard}>
              <div style={styles.cardHeader}>
                 <h3 style={styles.sideCardTitle}>Inteligência RH & Saúde</h3>
                 <Heart size={18} color="#ef4444" />
              </div>
              <div style={styles.healthMetric}>
                 <div style={styles.healthHeader}>
                    <span>Saúde Ocupacional</span>
                    <strong>94%</strong>
                 </div>
                 <div style={styles.healthBar}><div style={{...styles.healthFill, width: '94%'}} /></div>
              </div>
              <div style={styles.pontoSummary}>
                 <div style={styles.pontoItem}>
                    <Clock size={16} color="#64748b" />
                    <div>
                       <p>Jornada Hoje</p>
                       <span>08:15h - 18:00h (Normal)</span>
                    </div>
                 </div>
              </div>
              <div style={styles.sideDivider} />
              <div style={styles.docListMini}>
                 <p style={styles.docTitleMini}>Documentos Vinculados</p>
                 <div style={styles.docItemMini}>
                    <FileText size={14} /> <span>Exame Toxicológico (Vence 20/05)</span>
                    <Download size={12} style={{marginLeft: 'auto'}} />
                 </div>
                 <div style={styles.docItemMini}>
                    <ShieldCheck size={14} /> <span>PGR - Treinamento de Risco</span>
                    <CheckCircle2 size={12} color="#10b981" style={{marginLeft: 'auto'}} />
                 </div>
              </div>
           </div>

           {/* Feedback & Notas Estratégicas */}
           <div style={styles.sideCard}>
              <div style={styles.cardHeader}>
                 <h3 style={styles.sideCardTitle}>Feedback Operacional</h3>
                 <MessageCircle size={18} color="var(--primary)" />
              </div>
              <div style={styles.feedbackList}>
                 <div style={styles.feedbackItem}>
                    <div style={{...styles.typeBadge, backgroundColor: '#ecfdf5', color: '#10b981'}}>POSITIVO</div>
                    <p>"Excelente condução em dias de chuva no trecho da serra. Cuidado extremo com a carga."</p>
                    <span>- Coord. Logística (08/04)</span>
                 </div>
                 <div style={styles.feedbackItem}>
                    <div style={{...styles.typeBadge, backgroundColor: '#fef2f2', color: '#ef4444'}}>RECLAMAÇÃO</div>
                    <p>"Atraso de 20 min na descarga no cliente Industrial Sul por erro de rota."</p>
                    <span>- Central de Monitoramento (02/04)</span>
                 </div>
              </div>
              <button style={styles.fullActionBtn} onClick={() => toastSuccess('Abrindo editor de feedbacks...')}>Adicionar Feedback</button>
           </div>

           {/* Card Financeiro / Estoque */}
           <div style={styles.sideCard}>
              <div style={styles.cardHeader}>
                 <h3 style={styles.sideCardTitle}>Controle Financeiro & Carga</h3>
              </div>
              <div style={styles.financeMini}>
                 <div style={styles.financeRow}><span>Remuneração Estimada (Mês)</span><strong>R$ 6.250,00</strong></div>
                 <div style={styles.financeRow}><span>Carga sob responsabilidade</span><strong>R$ 85.400,00</strong></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container} className="animate-fade-in">
       {isAddModalOpen ? renderAddDriverModal() : null}
       {activeTab === 'list' ? (
          <>
             <header style={styles.header}>
                <div style={styles.titleArea}>
                   <div style={styles.badge}>GESTÃO DE PESSOAL OPERACIONAL</div>
                   <h1 style={styles.titleText}>Motoristas da Empresa</h1>
                </div>
                <div style={styles.headerActions}>
                   <button style={styles.primaryBtn} onClick={() => setIsAddModalOpen(true)}>
                      <Plus size={18} /> Adicionar Motorista
                   </button>
                </div>
             </header>

             {renderKPIs()}

             <div style={styles.actionRow}>
                <div style={styles.searchBox}>
                   <Search size={18} color="#94a3b8" />
                   <input 
                      placeholder="Buscar motorista por nome, ID ou CPF..." 
                      style={styles.searchInput}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>
                
                <div style={styles.dateFilter}>
                   <Calendar size={18} color="#94a3b8" />
                   <input type="date" style={styles.dateInput} placeholder="De" />
                   <span style={{color: '#94a3b8'}}>até</span>
                   <input type="date" style={styles.dateInput} placeholder="Até" />
                </div>

                <div style={styles.actionGroup}>
                   <button style={styles.excelBtn} onClick={() => toastSuccess('Exportando para Excel...')}>
                      <Download size={16} /> Excel
                   </button>
                   <ExportButton filename="Relatorio-Motoristas" />
                   <button style={styles.filterBtn}><Filter size={16} /> Filtros</button>
                </div>
             </div>

             <div style={styles.tableCard}>
                <table style={styles.table}>
                   <thead>
                      <tr>
                         <th style={styles.th}>Motorista / Identidade</th>
                         <th style={styles.th}>Vínculo</th>
                         <th style={styles.th}>Saúde / Score</th>
                         <th style={styles.th}>Status Atual</th>
                         <th style={styles.th}>Venc. CNH</th>
                         <th style={styles.th}>Ações</th>
                      </tr>
                   </thead>
                   <tbody>
                      {drivers.filter(d => (d.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(driver => (
                         <tr key={driver.id} style={styles.tr}>
                            <td style={{ ...styles.td, cursor: 'pointer' }} onClick={() => navigate(`/motoristas/perfil/${driver.id}`)}>
                               <div style={styles.userCell}>
                                  <div style={styles.avatarMini}>{driver.full_name[0]}</div>
                                  <div>
                                     <p style={styles.uName}>{driver.full_name}</p>
                                     <p style={styles.uSub}>CPF: ***.***.{driver.id.slice(0,3)}-**</p>
                                  </div>
                               </div>
                            </td>
                            <td style={styles.td}>
                               <span style={{...styles.badgeLink, backgroundColor: driver.type === 'Agregado' ? '#f5f3ff' : '#eff6ff', color: driver.type === 'Agregado' ? '#8b5cf6' : '#3b82f6'}}>
                                  {driver.type}
                               </span>
                            </td>
                            <td style={styles.td}>
                               <div style={styles.scoreRow}>
                                  <div style={{...styles.scoreBar, width: `${driver.health_score || 85}%`, backgroundColor: (driver.health_score || 85) > 90 ? '#10b981' : '#f59e0b'}} />
                                  <span style={{fontSize: '11px', fontWeight: '800', marginLeft: '8px'}}>{driver.health_score || 85}%</span>
                               </div>
                            </td>
                            <td style={styles.td}>
                               <span style={{...styles.statusDotLabel, color: driver.status === 'Ativo' ? '#10b981' : '#ef4444'}}>
                                  <div style={{...styles.pulseDot, backgroundColor: driver.status === 'Ativo' ? '#10b981' : '#ef4444'}} />
                                  {driver.status}
                               </span>
                            </td>
                            <td style={styles.td}>{driver.cnh_expiry || '12/2028'}</td>
                            <td style={styles.td}>
                               <div style={{display: 'flex', gap: '8px'}}>
                                  <button style={styles.view360Btn} onClick={() => navigate(`/motoristas/perfil/${driver.id}`)}>Ficha 360°</button>
                                  <button style={styles.iconBtn}><MessageCircle size={16} /></button>
                               </div>
                            </td>
                         </tr>
                      ))}
                      {drivers.length === 0 && !loading && (
                         <tr>
                            <td colSpan={6} style={{padding: '60px', textAlign: 'center', color: '#94a3b8'}}>Nenhum motorista cadastrado na base administrativa.</td>
                         </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </>
       ) : (
          selectedDriver && renderProfile360(selectedDriver)
       )}
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titleArea: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  badge: { fontSize: '10px', fontWeight: '900', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '4px 12px', borderRadius: '30px', width: 'fit-content', letterSpacing: '1px' },
  titleText: { fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.5px' },
  headerActions: { display: 'flex', gap: '12px' },
  primaryBtn: { height: '52px', padding: '0 32px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.3)' },
  
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' },
  kpiCard: { backgroundColor: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  kpiInfo: { display: 'flex', flexDirection: 'column' as const },
  kpiLabel: { fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  kpiValue: { fontSize: '24px', fontWeight: '950', color: '#0f172a', margin: '2px 0' },
  kpiSub: { fontSize: '11px', color: '#94a3b8' },
  kpiIconBox: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  actionRow: { display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'transparent' },
  searchBox: { flex: 2, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '0 20px', borderRadius: '16px', border: '1px solid #e2e8f0', height: '52px' },
  searchInput: { border: 'none', background: 'none', width: '100%', outline: 'none', fontSize: '14px', color: '#1E293B', fontWeight: '600' },
  actionGroup: { display: 'flex', gap: '12px', alignItems: 'center' },
  dateFilter: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '0 20px', borderRadius: '16px', border: '1px solid #e2e8f0', height: '52px' },
  dateInput: { border: 'none', outline: 'none', fontSize: '12px', color: '#1E293B', backgroundColor: 'transparent', fontWeight: '700' },
  excelBtn: { height: '52px', padding: '0 20px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ecfdf5', fontSize: '14px', fontWeight: '800', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  filterBtn: { height: '52px', padding: '0 20px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '14px', fontWeight: '700', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },

  tableCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' as const, borderBottom: '1px solid #f1f5f9' },
  td: { padding: '16px 24px', borderBottom: '1px solid #f1f5f9' },
  tr: { transition: 'background 0.2s' },

  formGrid: { display: 'flex', flexDirection: 'column' as const, gap: '20px', padding: '10px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  input: { height: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', transition: 'all 0.2s' },
  primaryBtnFull: { height: '52px', width: '100%', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginTop: '12px' },

  userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatarMini: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800' },
  uName: { fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 },
  uSub: { fontSize: '12px', color: '#64748b', margin: 0 },
  badgeLink: { padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' as const },
  scoreRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  scoreBar: { height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', flex: 1 },
  statusDotLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700' },
  pulseDot: { width: '8px', height: '8px', borderRadius: '50%' },
  view360Btn: { padding: '6px 16px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' },
  iconBtn: { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' },

  // PROFILE STYLES
  profileContainer: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  profileHeader: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
  profileHero: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '32px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' },
  avatarLarge: { width: '100px', height: '100px', borderRadius: '28px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: '900' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: '32px', fontWeight: '950', color: '#0f172a', margin: 0, letterSpacing: '-1px' },
  heroSub: { fontSize: '14px', color: '#64748b', margin: '8px 0 0 0' },
  statusTag: { padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' as const },
  heroStats: { display: 'flex', gap: '16px' },
  miniStat: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155' },

  profileMainGrid: { display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px' },
  profileColumnMain: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  profileColumnSide: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  
  profileCard: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  cardTitleArea: { display: 'flex', alignItems: 'center', gap: '12px' },
  cardTitle: { fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 },
  
  timelineList: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  timelineItem: { display: 'flex', gap: '16px', position: 'relative' as const },
  timelineDot: { width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '6px', zIndex: 1 },
  timelineContent: { flex: 1, backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' },
  timelineRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  timelineText: { fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' },

  tableMini: { marginTop: '16px' },
  miniTh: { textAlign: 'left' as const, fontSize: '11px', fontWeight: '800', color: '#94a3b8', padding: '12px 0', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase' as const },
  miniTd: { padding: '12px 0', fontSize: '13px', borderBottom: '1px solid #f1f5f9' },

  sideCard: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0' },
  sideCardTitle: { fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 },
  healthMetric: { marginTop: '24px' },
  healthHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: '#64748b' },
  healthBar: { height: '8px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' },
  healthFill: { height: '100%', backgroundColor: '#ef4444', borderRadius: '10px' },
  pontoSummary: { marginTop: '24px' },
  pontoItem: { display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px' },
  sideDivider: { height: '1px', backgroundColor: '#f1f5f9', margin: '24px 0' },
  docListMini: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  docTitleMini: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: '4px' },
  docItemMini: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#334155', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' },
  
  feedbackList: { display: 'flex', flexDirection: 'column' as const, gap: '16px', marginTop: '24px' },
  feedbackItem: { padding: '16px', borderLeft: '3px solid var(--primary)', backgroundColor: '#f8fafc' },
  typeBadge: { fontSize: '9px', fontWeight: '900', padding: '2px 8px', borderRadius: '4px', marginBottom: '8px', width: 'fit-content' },
  fullActionBtn: { width: '100%', height: '44px', marginTop: '24px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  
  financeMini: { display: 'flex', flexDirection: 'column' as const, gap: '12px', marginTop: '24px' },
  financeRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' },
};

export default Drivers;
