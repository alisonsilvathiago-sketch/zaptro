import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, MapPin, Calendar, 
  TrendingUp, Clock, ChevronLeft, Share2, 
  MoreVertical, CheckCircle2, AlertTriangle, 
  FileText, Star, Briefcase, Activity, 
  ShieldCheck, Truck, Navigation, FileCheck,
  TrendingDown, Plus, Trash2, Edit3, X, CreditCard
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import { createAuditLog } from '../../utils/audit';

const styles: Record<string, any> = {
  container: { padding: '32px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '24px', fontSize: '14px' },
  
  heroSection: { 
    display: 'grid', gridTemplateColumns: 'min-content 1fr min-content', gap: '32px', 
    alignItems: 'center', marginBottom: '40px', backgroundColor: 'white', 
    padding: '40px', borderRadius: '32px', border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)'
  },
  avatarLarge: { 
    width: '120px', height: '120px', borderRadius: '40px', 
    backgroundColor: 'var(--primary-light)', color: 'var(--primary)', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    fontSize: '48px', fontWeight: '950', border: '4px solid white',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
  },
  heroInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  heroTitle: { fontSize: '32px', fontWeight: '950', color: 'var(--text-main)', margin: 0, letterSpacing: '-1.5px' },
  heroSubtitle: { fontSize: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' },
  badgeStatus: { padding: '6px 16px', borderRadius: '30px', fontSize: '12px', fontWeight: '900' },
  
  actionGroup: { display: 'flex', gap: '12px' },
  btnAction: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },
  btnPrimary: { backgroundColor: 'var(--primary)', color: 'white', border: 'none' },

  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '32px' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '24px' },
  sideCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' },
  sideTitle: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' },
  infoItem: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' },

  contentArea: { display: 'flex', flexDirection: 'column', gap: '32px' },
  tabs: { display: 'flex', gap: '24px', borderBottom: '1px solid var(--border)', marginBottom: '8px', overflowX: 'auto' as const, scrollbarWidth: 'none' as const },
  tab: { padding: '12px 4px', border: 'none', background: 'none', fontWeight: '800', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative', whiteSpace: 'nowrap' as const },
  tabActive: { color: 'var(--primary)' },
  tabIndicator: { position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '3px', backgroundColor: 'var(--primary)', borderRadius: '3px' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: '24px', fontWeight: '950', color: 'var(--text-main)', margin: '4px 0 0 0' },
  statLabel: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', margin: 0 },
  
  cardGrid: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' },
  featureCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' },
  
  historyList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  historyItem: { 
    display: 'grid', gridTemplateColumns: 'min-content 1fr min-content min-content', 
    gap: '24px', alignItems: 'center', padding: '20px', 
    backgroundColor: 'white', borderRadius: '20px', border: '1px solid var(--border)',
    transition: 'all 0.2s'
  },
  histIcon: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  tag: { padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900' },
  vehicleVinc: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#f4f4f4', borderRadius: '16px', border: '1px solid #e2e8f0' }
};

const CollaboratorProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'ponto' | 'saude' | 'operacional' | 'docs'>('overview');
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showValues, setShowValues] = useState(false);

  const canSeeValues = ['ADMIN', 'MASTER_ADMIN', 'FINANCEIRO'].includes(profile?.role || '');

  useEffect(() => {
    const loadCollaborator = async () => {
      setLoading(true);
      const { data } = await supabase.from('employees').select('*').eq('id', id).single();
      
      // Carregar Logs de Auditoria do Colaborador
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setAuditLogs(logs || []);
      
      if (data) setEmp(data);
      else {
        // Mock fallback
        setEmp({
          id,
          full_name: 'Lucas Silva Santana',
          email: 'lucas.santana@logta.com.br',
          position: 'Motorista de Pesados',
          type: 'CLT',
          status: 'Ativo',
          hiring_date: '2023-05-12',
          area: 'Logística Regional (Sudeste)',
          handle: '@lucas_logta',
          phone: '(11) 97766-5544',
          address: 'Rua das Palmeiras, 120 - Barueri, SP',
          vehicle: 'Scania R450 - Placa ABC-1234',
          points: { presence: 98, absences: 2, late: 4 },
          health: { score: 92, lastCheckin: 'Bem (😃)' },
          conduct: { complaints: 0, positiveNotes: 14, warnings: 1 },
          vacations: { last: 'Março/2025', next: 'Abril/2026', daysRemaining: 15 }
        });
      }
      setLoading(false);
    };
    loadCollaborator();
  }, [id, profile]);

  const formatCurrency = (val: number) => {
    if (!canSeeValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const productivityData = [
    { name: 'Seg', valor: 8.2 },
    { name: 'Ter', valor: 9.0 },
    { name: 'Qua', valor: 7.5 },
    { name: 'Qui', valor: 8.8 },
    { name: 'Sex', valor: 9.2 },
  ];

  if (loading) return <div style={styles.container}>Carregando dossiê do colaborador...</div>;

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={() => navigate('/rh')}>
        <ChevronLeft size={20} /> Painel de RH
      </button>

      {/* HERO SECTION */}
      <section style={styles.heroSection}>
        <div style={styles.avatarLarge}>
          {emp?.full_name?.[0]}
        </div>
        <div style={styles.heroInfo}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
             <h1 style={styles.heroTitle}>{emp?.full_name}</h1>
             <span style={{...styles.badgeStatus, backgroundColor: emp?.status === 'Ativo' ? '#ecfdf5' : '#fef2f2', color: emp?.status === 'Ativo' ? '#10b981' : '#ef4444'}}>
                {emp?.status?.toUpperCase()}
             </span>
          </div>
          <div style={styles.heroSubtitle}>
             <span>{emp?.handle || '@colaborador'}</span>
             <span style={{color: 'var(--border)'}}>|</span>
             <span>{emp?.position}</span>
             <span style={{color: 'var(--border)'}}>|</span>
             <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Briefcase size={14} /> ID: #{id?.slice(0, 8)}</span>
             <span style={{color: 'var(--border)'}}>|</span>
             <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar size={14} /> Admissão: {new Date(emp?.hiring_date).toLocaleDateString()}</span>
          </div>
        </div>
        <div style={styles.actionGroup}>
           <button style={{...styles.btnAction, ...styles.btnPrimary}} onClick={() => toastSuccess('Link do dossiê copiado!')}>
              <Share2 size={18} /> Compartilhar Dossiê
           </button>
           <button style={styles.btnAction} onClick={() => navigate('/chat')}>
              <Mail size={18} /> Enviar Mensagem
           </button>
        </div>
      </section>

      <div style={styles.mainGrid}>
        {/* SIDEBAR */}
        <aside style={styles.sidebar}>
          <div style={styles.sideCard}>
            <p style={styles.sideTitle}>Perfil Administrativo</p>
            <div style={styles.infoItem}><Mail size={16} /> {emp?.email}</div>
            <div style={styles.infoItem}><Phone size={16} /> {emp?.phone}</div>
            <div style={styles.infoItem}><MapPin size={16} /> {emp?.address}</div>
            <div style={styles.infoItem}><ShieldCheck size={16} /> Contrato: <strong>{emp?.type}</strong></div>
          </div>

          <div style={styles.sideCard}>
            <p style={styles.sideTitle}>Vínculo Operacional</p>
            <div style={styles.vehicleVinc}>
               <Truck size={24} color="var(--primary)" />
               <div>
                  <p style={{margin: 0, fontSize: '13px', fontWeight: '800'}}>Vículo Atual</p>
                  <p style={{margin: 0, fontSize: '11px', color: 'var(--text-muted)'}}>{emp?.vehicle || 'Sem veículo fixo'}</p>
               </div>
            </div>
            <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
               <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px'}}>
                  <span>Área de Atuação</span>
                  <span style={{fontWeight: '800'}}>{emp?.area}</span>
               </div>
               <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px'}}>
                  <span>Tempo de Empresa</span>
                  <span style={{fontWeight: '800'}}>1 ano e 2 meses</span>
               </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main style={styles.contentArea}>
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div><p style={styles.statLabel}>Assiduidade</p><h2 style={styles.statValue}>{emp?.points?.presence}%</h2></div>
              <CheckCircle2 size={24} color="#10b981" />
            </div>
            <div style={styles.statCard}>
              <div><p style={styles.statLabel}>Notas Positivas</p><h2 style={styles.statValue}>{emp?.conduct?.positiveNotes}</h2></div>
              <Star size={24} color="#f59e0b" />
            </div>
            <div style={styles.statCard}>
              <div><p style={styles.statLabel}>Faltas/Atrasos</p><h2 style={{...styles.statValue, color: '#ef4444'}}>{emp?.points?.absences + emp?.points?.late}</h2></div>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <div style={styles.statCard}>
              <div><p style={styles.statLabel}>Status Saúde</p><h2 style={styles.statValue}>{emp?.health?.score}%</h2></div>
              <Activity size={24} color="var(--primary)" />
            </div>
          </div>

          <div style={styles.tabs}>
            <button style={{...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {})}} onClick={() => setActiveTab('overview')}>
               Visão Geral de Resultados {activeTab === 'overview' && <div style={styles.tabIndicator} />}
            </button>
            <button style={{...styles.tab, ...(activeTab === 'ponto' ? styles.tabActive : {})}} onClick={() => setActiveTab('ponto')}>
               Espelho de Ponto {activeTab === 'ponto' && <div style={styles.tabIndicator} />}
            </button>
            <button style={{...styles.tab, ...(activeTab === 'saude' ? styles.tabActive : {})}} onClick={() => setActiveTab('saude')}>
               Radar de Bem-estar {activeTab === 'saude' && <div style={styles.tabIndicator} />}
            </button>
            <button style={{...styles.tab, ...(activeTab === 'operacional' ? styles.tabActive : {})}} onClick={() => setActiveTab('operacional')}>
               Histórico de Rotas {activeTab === 'operacional' && <div style={styles.tabIndicator} />}
            </button>
            <button style={{...styles.tab, ...(activeTab === 'ponto' ? styles.tabActive : {})}} onClick={() => setActiveTab('ponto')}>
               Auditoria & Logs {activeTab === 'ponto' && <div style={styles.tabIndicator} />}
            </button>
            <button style={{...styles.tab, ...(activeTab === 'docs' ? styles.tabActive : {})}} onClick={() => setActiveTab('docs')}>
               Gestão de Férias {activeTab === 'docs' && <div style={styles.tabIndicator} />}
            </button>
          </div>

          <div className="animate-fade-in" style={styles.historyList}>
            {activeTab === 'overview' && (
               <div style={styles.cardGrid}>
                  <div style={styles.featureCard}>
                     <h4 style={{margin: '0 0 24px 0', fontSize: '15px'}}>Produtividade Semanal (Horas)</h4>
                     <div style={{height: '240px'}}>
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={productivityData}>
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
                              <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                              <Bar dataKey="valor" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={24} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                  <div style={styles.featureCard}>
                     <h4 style={{margin: '0 0 24px 0', fontSize: '15px'}}>Últimas Ocorrências</h4>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                        <div style={{padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0'}}>
                           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                              <span style={{fontSize: '11px', fontWeight: '900', color: '#166534'}}>RECONHECIMENTO</span>
                              <span style={{fontSize: '10px', color: '#166534'}}>08/04</span>
                           </div>
                           <p style={{margin: 0, fontSize: '13px', color: '#166534'}}>Excelente performance na rota PR-450. Entrega concluída com nota máxima.</p>
                        </div>
                        <div style={{padding: '16px', backgroundColor: '#f4f4f4', borderRadius: '16px', border: '1px solid #e2e8f0'}}>
                           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                              <span style={{fontSize: '11px', fontWeight: '900', color: '#64748b'}}>ATUALIZAÇÃO DOC</span>
                              <span style={{fontSize: '10px', color: '#64748b'}}>02/04</span>
                           </div>
                           <p style={{margin: 0, fontSize: '13px', color: '#444'}}>Certificado NR-35 atualizado com sucesso no cofre digital.</p>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'ponto' && (
               <div style={{backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                     <thead>
                        <tr style={{backgroundColor: '#f4f4f4'}}>
                           <th style={{textAlign: 'left', padding: '16px 24px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8'}}>Data</th>
                           <th style={{textAlign: 'left', padding: '16px 24px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8'}}>Entrada</th>
                           <th style={{textAlign: 'left', padding: '16px 24px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8'}}>Pausa</th>
                           <th style={{textAlign: 'left', padding: '16px 24px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8'}}>Retorno</th>
                           <th style={{textAlign: 'left', padding: '16px 24px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8'}}>Saída</th>
                           <th style={{textAlign: 'left', padding: '16px 24px', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8'}}>Total</th>
                        </tr>
                     </thead>
                     <tbody>
                        {[...Array(5)].map((_, i) => (
                           <tr key={i} style={{borderBottom: '1px solid #e8e8e8'}}>
                              <td style={{padding: '16px 24px', fontSize: '13px'}}>{i+10}/04/2026</td>
                              <td style={{padding: '16px 24px', fontSize: '13px'}}>08:02h</td>
                              <td style={{padding: '16px 24px', fontSize: '13px'}}>12:00h</td>
                              <td style={{padding: '16px 24px', fontSize: '13px'}}>13:00h</td>
                              <td style={{padding: '16px 24px', fontSize: '13px'}}>18:05h</td>
                              <td style={{padding: '16px 24px', fontSize: '13px'}}><strong>09:03h</strong></td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

            {activeTab === 'saude' && (
               <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div style={styles.featureCard}>
                     <h4 style={{marginBottom: '20px'}}>Histórico de Radar Humano (IA)</h4>
                     <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={[{n:'Seg',v:90},{n:'Ter',v:95},{n:'Qua',v:88},{n:'Qui',v:92},{n:'Sex',v:94}]}>
                           <XAxis dataKey="n" hide />
                           <Tooltip />
                           <Area type="monotone" dataKey="v" stroke="#10b981" fill="#ecfdf5" strokeWidth={3} />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'}}>
                     <div style={{...styles.featureCard, textAlign: 'center'}}>
                        <p style={styles.statLabel}>Check-in de Hoje</p>
                        <h4 style={{margin: '8px 0', fontSize: '24px'}}>😃 Bem</h4>
                     </div>
                     <div style={{...styles.featureCard, textAlign: 'center'}}>
                        <p style={styles.statLabel}>Fadiga Detectada</p>
                        <h4 style={{margin: '8px 0', fontSize: '24px', color: '#10b981'}}>Baixa</h4>
                     </div>
                     <div style={{...styles.featureCard, textAlign: 'center'}}>
                        <p style={styles.statLabel}>Afastamentos 2026</p>
                        <h4 style={{margin: '8px 0', fontSize: '24px'}}>00</h4>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'operacional' && (
               <div style={styles.historyList}>
                  {[
                     { id: 'RT-882', route: 'SP -> RJ (Matriz)', km: '450km', date: 'Há 1 dia', status: 'CONCLUIDA' },
                     { id: 'RT-876', route: 'CD Barueri -> Litoral', km: '120km', date: 'Há 3 dias', status: 'CONCLUIDA' },
                     { id: 'RT-850', route: 'Entrega Urbana - Centro', km: '45km', date: 'Há 5 dias', status: 'CONCLUIDA' }
                  ].map((route, i) => (
                     <div key={i} style={styles.historyItem}>
                        <div style={styles.histIcon}><Navigation size={24} color="var(--primary)" /></div>
                        <div style={styles.histMain}>
                           <h4 style={{margin: 0, fontSize: '15px', fontWeight: '800'}}>Rota #{route.id}</h4>
                           <p style={{margin: 0, fontSize: '12px', color: 'var(--text-muted)'}}>{route.route} • {route.km}</p>
                        </div>
                        <div style={{textAlign: 'right'}}>
                           <p style={{margin: 0, fontSize: '11px', color: 'var(--text-muted)'}}>{route.date}</p>
                           <p style={{margin: 0, fontSize: '14px', fontWeight: '900', color: 'var(--text-main)'}}>Logta Fleet</p>
                        </div>
                        <span style={{...styles.tag, backgroundColor: '#ecfdf5', color: '#10b981'}}>{route.status}</span>
                     </div>
                  ))}
               </div>
            )}

            {activeTab === 'audit' && (
               <div style={styles.historyList}>
                  <div style={{...styles.featureCard, marginBottom: '24px', backgroundColor: '#fcfcfc'}}>
                     <h4 style={{margin: 0, fontSize: '14px'}}>Trilha de Auditoria (Últimas 20 ações)</h4>
                     <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>Histórico de interações do colaborador com o sistema.</p>
                  </div>
                  {auditLogs.length === 0 ? (
                    <div style={styles.emptyState}>Nenhum log de sistema encontrado para este colaborador.</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} style={styles.historyItem}>
                         <div style={styles.histIcon}><ShieldCheck size={20} color="var(--primary)" /></div>
                         <div style={{flex: 1}}>
                            <h4 style={{margin: 0, fontSize: '14px', fontWeight: '800'}}>{log.details}</h4>
                            <p style={{margin: 0, fontSize: '11px', color: 'var(--text-muted)'}}>{log.module} • {log.action}</p>
                         </div>
                         <span style={{fontSize: '11px', fontWeight: '700', color: '#94a3b8'}}>{new Date(log.created_at).toLocaleString()}</span>
                         <button style={styles.detailsBtn}><Eye size={14} /></button>
                      </div>
                    ))
                  )}
               </div>
            )}

            {activeTab === 'docs' && (
               <div style={{display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 300px', gap: '24px'}}>
                  <div style={styles.featureCard}>
                     <h4 style={{margin: '0 0 20px 0'}}>Cronograma de Férias</h4>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                        <div style={{...styles.vehicleVinc, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}}>
                           <Calendar size={20} color="#10b981" />
                           <div>
                              <p style={{margin: 0, fontSize: '13px', fontWeight: '800', color: '#166534'}}>Próximo Período Aquisitivo</p>
                              <p style={{margin: 0, fontSize: '11px', color: '#166534'}}>{emp?.vacations?.next} (Planejado)</p>
                           </div>
                        </div>
                        <div style={{padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0'}}>
                           <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <div>
                                 <p style={{margin: 0, fontSize: '12px', fontWeight: '800'}}>Saldo de Dias</p>
                                 <p style={{margin: 0, fontSize: '11px', color: 'var(--text-muted)'}}>Direito a férias remuneradas</p>
                              </div>
                              <h3 style={{margin: 0, color: 'var(--primary)', fontWeight: '950'}}>{emp?.vacations?.daysRemaining} Dias</h3>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div style={styles.featureCard}>
                     <h4 style={{margin: '0 0 20px 0', color: '#ef4444'}}>Conduta & Alertas</h4>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                        <div style={{padding: '12px', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2'}}>
                           <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                              <AlertTriangle size={14} color="#ef4444" />
                              <span style={{fontSize: '11px', fontWeight: '900', color: '#b91c1c'}}>ADVERTÊNCIA</span>
                           </div>
                           <p style={{margin: 0, fontSize: '12px', color: '#b91c1c'}}>Atraso injustificado na saída da garagem (02/04).</p>
                        </div>
                        <button style={{...styles.btnAction, width: '100%', justifyContent: 'center', marginTop: '12px'}}>
                           <Plus size={16} /> Aplicar Medida Educativa
                        </button>
                     </div>
                  </div>
               </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CollaboratorProfile;
