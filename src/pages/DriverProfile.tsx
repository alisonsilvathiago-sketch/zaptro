import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Truck, Activity, Heart, Calendar, 
  MapPin, Clock, Star, AlertTriangle, FileText,
  Phone, Mail, Shield, CheckCircle2, TrendingUp,
  History, User, Settings, ExternalLink, BadgeCheck, LayoutDashboard
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toastError } from '../lib/toast';

interface DriverProfileProps {
  context?: 'CORPORATE' | 'FLEET';
}

const DriverProfile: React.FC<DriverProfileProps> = ({ context = 'CORPORATE' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'health' | 'documents'>('overview');

  useEffect(() => {
    fetchDriver();
  }, [id]);

  const fetchDriver = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDriver(data);
    } catch (err: any) {
      toastError('Erro ao carregar perfil do motorista: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>Sincronizando Inteligência 360°...</div>;
  if (!driver) return <div style={styles.loading}>Motorista não encontrado.</div>;

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Top Navigation */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/motoristas')}>
          <ArrowLeft size={20} /> Voltar para Listagem
        </button>
        <div style={styles.headerActions}>
           <button style={styles.secondaryBtn}>Exportar PDF</button>
           <button style={styles.primaryBtn}>Editar Registro</button>
        </div>
      </header>

      {/* Profile Summary Card */}
      <section style={styles.profileHero}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: 1 }}>
            <div style={styles.avatarLarge}>
               {driver.profile_image ? <img src={driver.profile_image} style={styles.avatarImg} /> : driver.name[0]}
            </div>
            <div style={styles.heroInfo}>
               <div style={styles.nameRow}>
                  <h1 style={styles.driverName}>{driver.name}</h1>
                  <span style={{...styles.statusBadge, backgroundColor: driver.status === 'Disponível' ? '#ecfdf5' : '#fff7ed', color: driver.status === 'Disponível' ? '#10b981' : '#f59e0b'}}>
                     {driver.status}
                  </span>
               </div>
               <div style={styles.metaRow}>
                  <span style={styles.metaItem}><Mail size={14} /> {driver.email}</span>
                  <span style={{...styles.metaItem, color: 'var(--primary)', fontWeight: '700'}}>{context === 'FLEET' ? `Frota: ${driver.metadata?.vehicle_plate || 'ABC-1234'}` : `Membro RH: ${driver.id.slice(0,5)}`}</span>
                  <span style={styles.metaItem}><Star size={14} color="#f59e0b" fill="#f59e0b" /> Score: {driver.health_score || '4.8'}</span>
               </div>
            </div>
         </div>
         <div style={styles.heroStats}>
            <div style={styles.statBox}>
               <p style={styles.statLabel}>{context === 'FLEET' ? 'MANUTENÇÕES' : 'TREINAMENTOS'}</p>
               <h3 style={styles.statValue}>{context === 'FLEET' ? '02' : '15'} <span style={styles.statUnit}>{context === 'FLEET' ? 'atv' : 'total'}</span></h3>
            </div>
            <div style={styles.statBox}>
               <p style={styles.statLabel}>EFICIÊNCIA</p>
               <h3 style={styles.statValue}>98.2 <span style={styles.statUnit}>%</span></h3>
            </div>
         </div>
      </section>

      {/* Tabs Layout */}
      <div style={styles.contentLayout}>
         <aside style={styles.sidebar}>
            <nav style={styles.tabNav}>
               <button style={{...styles.tabBtn, ...(activeTab === 'overview' ? styles.tabActive : {})}} onClick={() => setActiveTab('overview')}>
                  <LayoutDashboard size={18} /> Resumo Operacional
               </button>
               <button style={{...styles.tabBtn, ...(activeTab === 'logistics' ? styles.tabActive : {})}} onClick={() => setActiveTab('logistics')}>
                  <History size={18} /> Histórico de Rotas
               </button>
               <button style={{...styles.tabBtn, ...(activeTab === 'health' ? styles.tabActive : {})}} onClick={() => setActiveTab('health')}>
                  <Heart size={18} /> Saúde & Bem-estar
               </button>
               <button style={{...styles.tabBtn, ...(activeTab === 'documents' ? styles.tabActive : {})}} onClick={() => setActiveTab('documents')}>
                  <FileText size={18} /> Documentos & CNH
               </button>
            </nav>

            <div style={styles.healthSummary}>
               <h4 style={styles.sideTitle}>Check-in de Saúde</h4>
               <div style={styles.healthCard}>
                  <div style={styles.hRow}><span>Batimentos</span> <strong>78 bpm</strong></div>
                  <div style={styles.hRow}><span>Sono (Média)</span> <strong>7.2h</strong></div>
                  <div style={styles.hRow}><span>Status</span> <span style={{color: '#10b981', fontWeight: '800'}}>Apto</span></div>
               </div>
               <p style={styles.sideNote}>Monitoramento via Telemetria Biológica ativa.</p>
            </div>
         </aside>

         <main style={styles.mainContent}>
            {activeTab === 'overview' && (
               <div className="animate-fade-in" style={styles.tabGrid}>
                  <div style={styles.wideCard}>
                     <h3 style={styles.sectionTitle}>Desempenho Profissional</h3>
                     <div style={styles.performanceRow}>
                        {[1,2,3,4,5].map(i => (
                           <div key={i} style={styles.perfItem}>
                              <div style={styles.perfIcon}><BadgeCheck size={24} color="var(--primary)" /></div>
                              <p style={styles.perfLabel}>Ponta {i}</p>
                              <span style={styles.perfVal}>100%</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div style={styles.card}>
                     <h3 style={styles.sectionTitle}>Última Rota</h3>
                     <div style={styles.routePreview}>
                        <div style={styles.routeLine}>
                           <div style={styles.routeDot} />
                           <div style={styles.routeBar} />
                           <div style={{...styles.routeDot, backgroundColor: 'var(--primary)'}} />
                        </div>
                        <div style={styles.routeInfo}>
                           <p><strong>Saída:</strong> São Paulo, SP</p>
                           <p style={{marginTop: '20px'}}><strong>Chegada:</strong> Curitiba, PR</p>
                        </div>
                     </div>
                  </div>

                  <div style={styles.card}>
                     <h3 style={styles.sectionTitle}>Veículo Atual</h3>
                     <div style={styles.vehicleInfo}>
                        <Truck size={32} color="var(--primary)" />
                        <div>
                           <p style={styles.vLabel}>Scania R450 - Highline</p>
                           <p style={styles.vPlate}>ABC-1234</p>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'logistics' && (
               <div className="animate-fade-in" style={styles.tableCard}>
                  <h3 style={styles.sectionTitle}>Histórico Logístico de Longo Prazo</h3>
                  <table style={styles.table}>
                     <thead>
                        <tr>
                           <th>Data</th>
                           <th>Manifesto</th>
                           <th>KM</th>
                           <th>Tempo de Direção</th>
                           <th>Status</th>
                        </tr>
                     </thead>
                     <tbody>
                        {[1,2,3,4,5,6,7,8].map(i => (
                           <tr key={i}>
                              <td>10/04/2026</td>
                              <td><span style={styles.manifestLink}>#MFT-8821{i}</span></td>
                              <td>450 km</td>
                              <td>05:30h</td>
                              <td><span style={styles.tableBadge}>Finalizada</span></td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

            {activeTab === 'health' && (
               <div className="animate-fade-in" style={styles.tabGrid}>
                  <div style={styles.card}>
                     <h3 style={styles.sectionTitle}>Exames admissionais/periódicos</h3>
                     <p style={{fontSize: '14px', color: '#64748b'}}>Próximo vencimento: 10/10/2026</p>
                     <button style={styles.outlineBtn}>Ver ASO Completo</button>
                  </div>
                  <div style={styles.card}>
                     <h3 style={styles.sectionTitle}>Score de Fadiga</h3>
                     <div style={styles.gaugeContainer}>
                        <div style={styles.gauge}>
                           <div style={{...styles.gaugeFill, width: '15%', backgroundColor: '#10b981'}} />
                        </div>
                        <p style={{fontSize: '12px', textAlign: 'center', marginTop: '10px', fontWeight: '700', color: '#10b981'}}>Baixo Risco</p>
                     </div>
                  </div>
               </div>
            )}
         </main>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: '800' },
  container: { padding: '40px', backgroundColor: '#F8FAFC', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  backBtn: { background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '15px' },
  headerActions: { display: 'flex', gap: '12px' },
  primaryBtn: { padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' },
  secondaryBtn: { padding: '12px 24px', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' },

  profileHero: { backgroundColor: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '40px', marginBottom: '40px' },
  avatarLarge: { width: '120px', height: '120px', borderRadius: '30px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: '900', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  heroInfo: { flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' },
  driverName: { fontSize: '32px', fontWeight: '950', color: '#0F172A', margin: 0, letterSpacing: '-1px' },
  statusBadge: { padding: '6px 16px', borderRadius: '30px', fontSize: '12px', fontWeight: '800' },
  typeTag: { padding: '6px 16px', backgroundColor: '#F1F5F9', color: '#475569', borderRadius: '30px', fontSize: '12px', fontWeight: '800' },
  metaRow: { display: 'flex', gap: '24px' },
  metaItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748B', fontWeight: '600' },
  heroStats: { display: 'flex', gap: '40px', borderLeft: '1px solid #F1F5F9', paddingLeft: '40px' },
  statBox: { textAlign: 'right' as const },
  statLabel: { fontSize: '11px', color: '#94A3B8', fontWeight: '800', letterSpacing: '0.5px' },
  statValue: { fontSize: '24px', fontWeight: '900', color: '#0F172A', margin: '4px 0 0 0' },
  statUnit: { fontSize: '14px', color: '#94A3B8', fontWeight: '600' },

  contentLayout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' },
  sidebar: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  tabNav: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '16px', border: '1px solid transparent', backgroundColor: 'transparent', color: '#64748B', fontWeight: '700', fontSize: '14px', cursor: 'pointer', textAlign: 'left' as const, transition: '0.2s' },
  tabActive: { backgroundColor: 'white', border: '1px solid #E2E8F0', color: 'var(--primary)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },

  healthSummary: { backgroundColor: '#F8FAFC', padding: '24px', borderRadius: '24px', border: '1px dashed #CBD5E1' },
  sideTitle: { fontSize: '14px', fontWeight: '900', color: '#0F172A', marginBottom: '16px', textTransform: 'uppercase' as const },
  healthCard: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  hRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' },
  sideNote: { fontSize: '10px', color: '#94A3B8', marginTop: '16px' },

  mainContent: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  tabGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' },
  card: { backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #E2E8F0' },
  wideCard: { backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #E2E8F0', gridColumn: 'span 2' },
  sectionTitle: { fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '24px' },
  performanceRow: { display: 'flex', justifyContent: 'space-between' },
  perfItem: { textAlign: 'center' as const },
  perfIcon: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' },
  perfLabel: { fontSize: '11px', fontWeight: '800', color: '#94A3B8', marginBottom: '4px' },
  perfVal: { fontSize: '16px', fontWeight: '900', color: '#0F172A' },

  routePreview: { display: 'flex', gap: '20px' },
  routeLine: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  routeDot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#CBD5E1' },
  routeBar: { width: '2px', height: '30px', backgroundColor: '#F1F5F9' },
  routeInfo: { fontSize: '14px', color: '#475569' },

  vehicleInfo: { display: 'flex', alignItems: 'center', gap: '20px' },
  vLabel: { fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 },
  vPlate: { fontSize: '13px', color: '#64748B', margin: 0 },

  tableCard: { backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #E2E8F0' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  manifestLink: { color: 'var(--primary)', fontWeight: '800', textDecoration: 'underline', cursor: 'pointer' },
  tableBadge: { padding: '4px 10px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '8px', fontSize: '11px', fontWeight: '800' },
  outlineBtn: { width: '100%', marginTop: '20px', padding: '12px', backgroundColor: 'transparent', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#64748b', fontWeight: '800', cursor: 'pointer' },
  gaugeContainer: { marginTop: '20px' },
  gauge: { height: '10px', backgroundColor: '#F1F5F9', borderRadius: '10px', overflow: 'hidden' },
  gaugeFill: { height: '100%' }
};

export default DriverProfile;
