import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, Truck, Users, Activity, 
  DollarSign, Package, AlertCircle, 
  MapPin, ChevronDown, Filter, Calendar,
  ArrowUpRight, ArrowDownRight, Zap, Eye,
  Camera, PenTool, ExternalLink, Settings,
  Target, Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import FleetMap from '../components/FleetMap';

const COLORS = ['#D9FF00', '#F97316', '#D9FF00', '#10B981', '#D9FF00'];

const IntelligenceDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [selectedPOD, setSelectedPOD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecentShipments = useCallback(async () => {
    const { data: shipments } = await supabase
      .from('shipments')
      .select('*, clients(name)')
      .order('delivered_at', { ascending: false })
      .limit(10);

    setRecentShipments(shipments || []);
  }, []);

  const fetchIntelligenceData = useCallback(async () => {
    setLoading(true);
    const mockData = {
      kpis: [
        { label: 'Faturamento Total', value: 'R$ 284.150', trend: '+12.5%', isUp: true, icon: DollarSign, color: '#D9FF00' },
        { label: 'Fretes Concluídos', value: '1.248', trend: '+8.2%', isUp: true, icon: Truck, color: '#10b981' },
        { label: 'Ticket Médio', value: 'R$ 227', trend: '-2.1%', isUp: false, icon: Zap, color: '#f59e0b' },
        { label: 'Ocupação de Frota', value: '84%', trend: '+5.0%', isUp: true, icon: Activity, color: '#D9FF00' },
      ],
      revenueHistory: [
        { name: 'Jan', receita: 4000, custo: 2400 },
        { name: 'Fev', receita: 3000, custo: 1398 },
        { name: 'Mar', receita: 2000, custo: 9800 },
        { name: 'Abr', receita: 2780, custo: 3908 },
        { name: 'Mai', receita: 1890, custo: 4800 },
        { name: 'Jun', receita: 2390, custo: 3800 },
        { name: 'Jul', receita: 3490, custo: 4300 },
      ],
      fleetStatus: [
        { name: 'Em Operação', value: 45 },
        { name: 'Disponível', value: 12 },
        { name: 'Manutenção', value: 5 },
        { name: 'Parado', value: 8 },
      ],
      topDrivers: [
        { name: 'João Silva', efficiency: 98, trips: 45 },
        { name: 'Maria Santos', efficiency: 95, trips: 42 },
        { name: 'Ricardo Lima', efficiency: 92, trips: 50 },
      ]
    };
    
    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    void fetchIntelligenceData();
    void fetchRecentShipments();
  }, [fetchIntelligenceData, fetchRecentShipments]);

  if (loading) return <div style={styles.loader}>Compilando Inteligência de Dados...</div>;

  return (
    <div style={styles.dashboardWrapper}>
      {/* CONTEXTUAL BI SIDEBAR */}
      <aside style={styles.biSidebar}>
         <div style={styles.biSidebarHeader}>
            <TrendingUp size={18} color="#D9FF00" />
            <span style={styles.biSidebarTitle}>Radar BI</span>
         </div>
         <nav style={styles.biNav}>
             <div style={{...styles.biNavItem, ...styles.biNavItemActive}}>
                <Activity size={18} /> Performance Global
             </div>
             <div style={styles.biNavItem}>
                <DollarSign size={18} /> Previsão de Receita
             </div>
             <div style={styles.biNavItem}>
                <Package size={18} /> Eficiência de Carga
             </div>
             <div style={styles.biNavItem}>
                <Users size={18} /> Produtividade Equipe
             </div>
             <div style={styles.biDivider} />
             <div style={styles.biNavItem}>
                <MapPin size={18} /> Monitoramento em Mapa
             </div>
             <div style={styles.biNavItem}>
                <Target size={18} /> Metas & KPIs
             </div>
             <div style={styles.biNavItem}>
                <Download size={18} /> Exportar Relatórios
             </div>
             <div style={styles.biDivider} />
             <div style={styles.biNavItem}>
                <Settings size={18} /> Configurar Radar
             </div>
         </nav>
         
         <div style={styles.aiCard}>
            <Zap size={20} color="#D9FF00" />
            <p style={styles.aiText}>Logta AI sugere aumentar frota em 12% para atender demanda de Maio.</p>
            <button style={styles.aiBtn}>Ver Insight →</button>
         </div>
      </aside>

      <div style={styles.contentArea}>
        {/* HEADER & FILTERS */}
        <header style={styles.header}>
           <div>
              <h1 style={styles.title}>Centro de Inteligência Logta</h1>
              <p style={styles.subtitle}>Visão estratégica em tempo real da sua operação 360.</p>
           </div>
           <div style={styles.filterBar}>
              <div style={styles.filterBtn}><Calendar size={16} /> Últimos 30 Dias <ChevronDown size={14} /></div>
              <div style={styles.filterBtn}><Filter size={16} /> Filtros Avançados</div>
              <button style={styles.refreshBtn} onClick={fetchIntelligenceData}>Atualizar Radar</button>
           </div>
        </header>

        {/* KPI SCROLL */}
        <div style={styles.kpiGrid}>
           {data?.kpis?.map((kpi: any, i: number) => (
             <div key={i} style={styles.kpiCard}>
                <div style={{...styles.kpiIcon, backgroundColor: `${kpi.color}15`}}>
                   <kpi.icon size={24} color={kpi.color} />
                </div>
                <div style={styles.kpiInfo}>
                   <span style={styles.kpiLabel}>{kpi.label}</span>
                   <h3 style={styles.kpiValue}>{kpi.value}</h3>
                   <span style={{...styles.kpiTrend, color: kpi.isUp ? '#10b981' : '#ef4444'}}>
                      {kpi.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {kpi.trend}
                   </span>
                </div>
             </div>
           ))}
        </div>

        {/* CHARTS SECTION */}
        <div style={styles.mainGrid}>
           {/* REVENUE GROWTH */}
           <div style={{...styles.chartCard, gridColumns: 'span 2'}}>
              <div style={styles.chartHeader}>
                 <h3 style={styles.chartTitle}>Crescimento de Receita vs Custos</h3>
                 <TrendingUp size={18} color="#94a3b8" />
              </div>
              <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.revenueHistory}>
                    <defs>
                      <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D9FF00" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#D9FF00" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    <Area type="monotone" dataKey="receita" stroke="#D9FF00" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" />
                    <Area type="monotone" dataKey="custo" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* FLEET STATUS */}
           <div style={styles.chartCard}>
              <div style={styles.chartHeader}>
                 <h3 style={styles.chartTitle}>Distribuição da Frota</h3>
                 <Activity size={18} color="#94a3b8" />
              </div>
              <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.fleetStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data?.fleetStatus?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* TOP DRIVERS LIST */}
           <div style={styles.chartCard}>
               <div style={styles.chartHeader}>
                  <h3 style={styles.chartTitle}>Elite de Motoristas</h3>
                  <StarIcon style={{ width: '18px', height: '18px', color: '#94a3b8' }} />
               </div>
               <div style={styles.driverList}>
                  {data?.topDrivers?.map((driver: any, i: number) => (
                     <div key={i} style={styles.driverRow}>
                        <div style={styles.driverInitial}>{driver.name[0]}</div>
                        <div style={{flex: 1}}>
                           <div style={styles.driverName}>{driver.name}</div>
                           <div style={styles.driverTrips}>{driver.trips} viagens</div>
                        </div>
                        <div style={styles.driverScore}>
                           {driver.efficiency}%
                        </div>
                     </div>
                  ))}
               </div>
               <button style={styles.viewMoreBtn}>Ver Ranking Completo</button>
           </div>

           {/* OPERATIONAL RADAR Placeholder for GPS */}
           <div style={{...styles.chartCard, gridColumns: 'span 2'}}>
               <div style={styles.chartHeader}>
                  <h3 style={styles.chartTitle}>Radar Operacional (GPS em Tempo Real)</h3>
                  <MapPin size={18} color="#94a3b8" />
               </div>
               <div style={{ height: '400px', marginTop: '20px' }}>
                  <FleetMap />
               </div>
           </div>

           {/* POD FEED (Live Proof of Delivery) */}
           <div style={{...styles.chartCard, gridColumns: 'span 3'}}>
              <div style={styles.chartHeader}>
                 <h3 style={styles.chartTitle}>Centro de Controle de Entregas (POD em Tempo Real)</h3>
                 <Camera size={18} color="#94a3b8" />
              </div>
              <div style={styles.podGrid}>
                 {recentShipments.filter(s => s.status === 'ENTREGUE').length === 0 ? (
                   <div style={styles.emptyPOD}>Aguardando capturas de campo...</div>
                 ) : (
                   recentShipments.filter(s => s.status === 'ENTREGUE').map((ship, idx) => (
                     <div key={idx} style={styles.podItem} onClick={() => setSelectedPOD(ship)}>
                        <div style={styles.podImageGroup}>
                           {ship.pod_images?.[0] ? (
                             <img src={ship.pod_images[0]} style={styles.podThumb} alt="POD" />
                           ) : (
                             <div style={styles.noImage}><Camera size={20} /></div>
                           )}
                        </div>
                        <div style={styles.podInfo}>
                           <div style={styles.podClient}>{ship.clients?.name}</div>
                           <div style={styles.podTime}>{new Date(ship.delivered_at).toLocaleTimeString()}</div>
                        </div>
                        <button style={styles.podViewBtn}><Eye size={14} /></button>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* DETAIL MODAL POD */}
      {selectedPOD && (
        <div style={styles.podModalOverlay} onClick={() => setSelectedPOD(null)}>
           <div style={styles.podModalContent} onClick={e => e.stopPropagation()}>
              <header style={styles.podMHeader}>
                 <div>
                    <h2 style={styles.podMTitle}>Prova de Entrega (POD)</h2>
                    <p style={styles.podMSubtitle}>Remessa #{selectedPOD.id.substring(0,8)} • {selectedPOD.clients?.name}</p>
                 </div>
                 <button style={styles.podMClose} onClick={() => setSelectedPOD(null)}><Filter size={20} style={{transform: 'rotate(45deg)'}} /></button>
              </header>
              <div style={styles.podMBody}>
                 <div style={styles.podMPhotos}>
                    <h4 style={styles.podMSection}>Evidências Fotográficas</h4>
                    <div style={styles.photoRow}>
                       {selectedPOD.pod_images?.map((img: string, i: number) => (
                         <img key={i} src={img} style={styles.fullPhoto} alt="POD" />
                       ))}
                    </div>
                 </div>
                 <div style={styles.podMSide}>
                    <div style={styles.podMSection}>Assinatura Digital</div>
                    <div style={styles.podMSignature}>
                       {selectedPOD.pod_signature_url ? (
                         <img src={selectedPOD.pod_signature_url} style={{width: '100%', height: 'auto'}} alt="Assinatura" />
                       ) : (
                         <span style={{color: '#94a3b8', fontSize: '12px'}}>Sem assinatura</span>
                       )}
                    </div>
                    <div style={styles.podMSection}>Localização</div>
                    <div style={styles.podMCoord}>
                       <MapPin size={14} /> {selectedPOD.delivery_lat}, {selectedPOD.delivery_lng}
                    </div>
                    <a href={`https://www.google.com/maps?q=${selectedPOD.delivery_lat},${selectedPOD.delivery_lng}`} target="_blank" rel="noreferrer" style={styles.mapLink}>
                       Google Maps <ExternalLink size={14} />
                    </a>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const StarIcon = ({ style }: any) => (
  <svg style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
);

const styles: Record<string, any> = {
  dashboardWrapper: { display: 'flex', minHeight: '100vh', backgroundColor: '#f4f4f4' },
  biSidebar: { width: '280px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', padding: '32px', display: 'flex', flexDirection: 'column' as const, gap: '32px', position: 'sticky' as const, top: 0, height: '100vh' },
  biSidebarHeader: { display: 'flex', alignItems: 'center', gap: '12px' },
  biSidebarTitle: { fontSize: '18px', fontWeight: '950', color: '#000000', letterSpacing: '-0.5px' },
  biNav: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  biNavItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' },
  biNavItemActive: { backgroundColor: 'rgba(217, 255, 0, 0.18)', color: '#D9FF00' },
  biDivider: { height: '1px', backgroundColor: '#ebebeb', margin: '8px 0' },
  
  aiCard: { marginTop: 'auto', backgroundColor: 'rgba(217, 255, 0, 0.18)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(217, 255, 0, 0.1)' },
  aiText: { fontSize: '12px', color: '#D9FF00', fontWeight: '700', lineHeight: '1.5', margin: '12px 0' },
  aiBtn: { width: '100%', padding: '10px', backgroundColor: 'white', border: '1px solid #D9FF00', color: '#D9FF00', borderRadius: '10px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' },

  contentArea: { flex: 1, padding: '40px', display: 'flex', flexDirection: 'column' as const, gap: '40px', overflowY: 'auto' as const },
  loader: { padding: '100px', textAlign: 'center' as const, color: '#D9FF00', fontWeight: '900' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '28px', fontWeight: '950', color: '#000000', margin: 0, letterSpacing: '-1.2px' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: 0 },
  filterBar: { display: 'flex', gap: '12px' },
  filterBtn: { padding: '10px 18px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  refreshBtn: { padding: '10px 20px', backgroundColor: '#D9FF00', color: '#000000', borderRadius: '12px', border: 'none', fontWeight: '900', fontSize: '13px', cursor: 'pointer' },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' },
  kpiCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' },
  kpiIcon: { width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiInfo: { display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  kpiLabel: { fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' as const },
  kpiValue: { fontSize: '22px', fontWeight: '950', color: '#000000', margin: 0 },
  kpiTrend: { fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' },

  mainGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' },
  chartCard: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { fontSize: '16px', fontWeight: '900', color: '#000000', margin: 0 },
  
  driverList: { display: 'flex', flexDirection: 'column' as const, gap: '16px', marginTop: '24px' },
  driverRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', backgroundColor: '#f4f4f4' },
  driverInitial: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' },
  driverName: { fontSize: '14px', fontWeight: '900', color: '#000000' },
  driverTrips: { fontSize: '11px', color: '#94a3b8', fontWeight: '800' },
  driverScore: { fontSize: '14px', fontWeight: '950', color: '#10b981' },
  viewMoreBtn: { width: '100%', marginTop: '20px', padding: '12px', background: 'none', border: '1px dashed #e2e8f0', borderRadius: '14px', color: '#94a3b8', fontSize: '13px', fontWeight: '800', cursor: 'pointer' },

  podGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '24px' },
  podItem: { backgroundColor: '#f4f4f4', padding: '12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' },
  podImageGroup: { position: 'relative' as const },
  podThumb: { width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' as const },
  podInfo: { flex: 1 },
  podClient: { fontSize: '13px', fontWeight: '850', color: '#000000' },
  podTime: { fontSize: '11px', color: '#94a3b8', fontWeight: '700' },
  podViewBtn: { border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer' },
  emptyPOD: { padding: '40px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '14px', fontWeight: '700', gridColumn: 'span 3' },

  podModalOverlay: { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  podModalContent: { backgroundColor: 'white', width: '100%', maxWidth: '900px', borderRadius: '32px', overflow: 'hidden' },
  podMHeader: { padding: '32px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  podMTitle: { fontSize: '20px', fontWeight: '950', color: '#000000', margin: 0 },
  podMSubtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  podMClose: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  podMBody: { padding: '32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' },
  podMSection: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '16px' },
  podMPhotos: { display: 'flex', flexDirection: 'column' as const },
  photoRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  fullPhoto: { width: '100%', height: '220px', borderRadius: '20px', objectFit: 'cover' as const },
  podMSide: { display: 'flex', flexDirection: 'column' as const, gap: '24px', backgroundColor: '#f4f4f4', padding: '24px', borderRadius: '24px' },
  podMSignature: { backgroundColor: 'white', borderRadius: '16px', padding: '12px', border: '1px solid #e2e8f0' },
  podMCoord: { fontSize: '13px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' },
  mapLink: { display: 'flex', alignItems: 'center', gap: '8px', color: '#D9FF00', fontSize: '13px', fontWeight: '800', textDecoration: 'none' }
};

export default IntelligenceDashboard;
