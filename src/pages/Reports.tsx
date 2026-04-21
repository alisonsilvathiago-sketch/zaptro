import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Download, Calendar, Filter, TrendingUp, Users, Truck, AlertCircle 
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import ExportButton from '../components/ExportButton';

const Reports: React.FC = () => {
  const { company } = useTenant();
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'logistica' | 'financeiro' | 'rh'>('dashboard');

  // Dados fictícios para demonstração
  const monthlyData = [
    { name: 'Jan', volume: 400, revenue: 2400 },
    { name: 'Fev', volume: 300, revenue: 1398 },
    { name: 'Mar', volume: 200, revenue: 9800 },
    { name: 'Abr', volume: 278, revenue: 3908 },
    { name: 'Mai', volume: 189, revenue: 4800 },
    { name: 'Jun', volume: 239, revenue: 3800 },
  ];

  const productivityData = [
    { name: 'Motorista A', efficiency: 95 },
    { name: 'Motorista B', efficiency: 88 },
    { name: 'Motorista C', efficiency: 92 },
    { name: 'Motorista D', efficiency: 84 },
    { name: 'Motorista E', efficiency: 70 },
  ];

  const fleetData = [
    { name: 'Em Trânsito', value: 40, color: 'var(--accent)' },
    { name: 'Disponível', value: 30, color: 'var(--success)' },
    { name: 'Manutenção', value: 10, color: 'var(--danger)' },
    { name: 'Em Carga', value: 20, color: 'var(--warning)' },
  ];

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header com Ações */}
      <header style={styles.headerPremium}>
        <div style={styles.headerTitleArea}>
          <div style={styles.headerBadge}>DATA & INSIGHTS</div>
          <h1 style={styles.title}>Relatórios Analíticos</h1>
        </div>
        
        <div className="mobile-scroll" style={styles.tabNavCompact}>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'dashboard' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('dashboard')}>
            <TrendingUp size={18} /> <span>Geral</span>
          </button>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'logistica' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('logistica')}>
            <Truck size={18} /> <span>Logística</span>
          </button>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'financeiro' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('financeiro')}>
            <TrendingUp size={18} /> <span>Financeiro</span>
          </button>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'rh' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('rh')}>
            <Users size={18} /> <span>RH</span>
          </button>
        </div>

        <div style={styles.actions}>
          <button style={styles.filterBtn}><Calendar size={18} /> Últimos 30 Dias</button>
          <ExportButton filename={`Relatorio-Executivo-${company?.name}`} />
        </div>
      </header>

      {/* Grid de Métricas Rápidas */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={{...styles.iconBox, color: 'var(--accent)'}}><Truck size={24} /></div>
          <div>
            <span style={styles.metricLabel}>Total de Viagens</span>
            <h2 style={styles.metricValue}>1,248</h2>
            <span style={styles.trend}><TrendingUp size={14} /> +12.5%</span>
          </div>
        </div>
        <div style={styles.metricCard}>
          <div style={{...styles.iconBox, color: 'var(--success)'}}><Users size={24} /></div>
          <div>
            <span style={styles.metricLabel}>Motoristas Ativos</span>
            <h2 style={styles.metricValue}>86</h2>
            <span style={styles.trendSuccess}>94% taxa de ocupação</span>
          </div>
        </div>
        <div style={styles.metricCard}>
          <div style={{...styles.iconBox, color: 'var(--danger)'}}><AlertCircle size={24} /></div>
          <div>
            <span style={styles.metricLabel}>Ocorrências em Rota</span>
            <h2 style={styles.metricValue}>14</h2>
            <span style={{color: 'var(--danger)', fontSize: '12px', fontWeight: '600'}}>-2% vs mês anterior</span>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <div style={styles.chartsGrid}>
        <div style={styles.chartCardFull}>
          <h3 style={styles.chartTitle}>Volume de Entregas Mensal</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="volume" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Eficiência de Motoristas (%)</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={productivityData}>
                <defs>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip />
                <Area type="monotone" dataKey="efficiency" stroke="var(--accent)" fillOpacity={1} fill="url(#colorEff)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Distribuição da Frota</h3>
          <div style={{ width: '100%', height: 250, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={fleetData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {fleetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={styles.legend}>
              {fleetData.map((item, i) => (
                <div key={i} style={styles.legendItem}>
                  <div style={{...styles.legendDot, backgroundColor: item.color}} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '32px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  headerPremium: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap' as const, gap: '24px' },
  headerTitleArea: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  headerBadge: { display: 'inline-block', width: 'fit-content', padding: '4px 12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '30px', fontSize: '10px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1px' },
  actions: { display: 'flex', gap: '12px', alignItems: 'center' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '12px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' },
  metricCard: { backgroundColor: 'white', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '24px' },
  iconBox: { width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  metricLabel: { display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' },
  metricValue: { fontSize: '28px', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px' },
  trend: { fontSize: '12px', color: 'var(--success)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' },
  trendSuccess: { fontSize: '12px', color: 'var(--success)', fontWeight: '600' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' },
  chartCardFull: { gridColumn: 'span 2', backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' },
  chartCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' },
  chartTitle: { fontSize: '18px', fontWeight: '700', color: 'var(--primary)', marginBottom: '24px' },
  legend: { marginLeft: '20px', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%' }
};

export default Reports;
