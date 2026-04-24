import React, { useEffect, useState, useCallback } from 'react';
import { 
  Truck, Package, Users, DollarSign, TrendingUp, 
  AlertCircle, ChevronRight, Calendar, ArrowUpRight, Clock, CheckCircle,
  Activity, Download, FileText, BarChart2, Target, Navigation2,
  Calculator, UserPlus, Briefcase, Box, MessageCircle, BarChart as ChartIcon,
  Smartphone, Database, Shield, Layout, Settings as SettingsIcon, Filter as FilterIcon,
  ChevronLeft, PieChart as PieIcon, GraduationCap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../hooks/useRealtime';
import { seedDatabase } from '../lib/seed';
import ExportButton from '../components/ExportButton';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import Modal from '../components/Modal';
import { getSegmentConfig } from '../utils/segmentLabels';
import FinanceCalculator from '../components/FinanceCalculator';
import { Thermometer } from 'lucide-react';

import { 
  RHDashboard, 
  LogisticsDashboard, 
  FinanceDashboard, 
  CRMDashboard, 
  InventoryDashboard 
} from '../components/RoleDashboards';

const dataLabels = [
  { name: 'Seg', entregas: 45, receita: 4000 },
  { name: 'Ter', entregas: 52, receita: 4500 },
  { name: 'Qua', entregas: 48, receita: 4200 },
  { name: 'Qui', entregas: 61, receita: 5800 },
  { name: 'Sex', entregas: 55, receita: 5100 },
  { name: 'Sáb', entregas: 42, receita: 3800 },
  { name: 'Dom', entregas: 30, receita: 2500 },
];

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { company } = useTenant();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    todayDeliveries: 0,
    activeRoutes: 0,
    activeDrivers: 0,
    monthlyRevenue: 0,
    totalClients: 0,
    totalFleet: 0,
    inventoryCount: 0,
    pendingInvoices: 0,
    teamTotal: 0,
    activeLeads: 0,
    paidAmount: 0,
    receivedAmount: 0,
    expectedRevenue: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');

  const fetchActivities = useCallback(async () => {
    if (!profile?.company_id) return;
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  }, [profile?.company_id]);

  const fetchMetrics = useCallback(async () => {
    if (!profile?.company_id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [
        routesRes, 
        shipmentsRes, 
        driversRes, 
        financeRes,
        clientsRes,
        fleetRes,
        inventoryRes,
        employeesRes,
        leadsRes
      ] = await Promise.all([
        supabase.from('routes').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id).eq('status', 'EM_ANDAMENTO'),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id).gte('created_at', today),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id).eq('role', 'MOTORISTA'),
        supabase.from('transactions').select('amount, type, status').eq('company_id', profile.company_id),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id).eq('source', 'CRM')
      ]);

      const paid = financeRes.data?.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const received = financeRes.data?.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const totalRevenue = received;
      const expected = financeRes.data?.filter(t => t.type === 'INCOME' && t.status === 'PENDING').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setMetrics({
        todayDeliveries: shipmentsRes.count || 0,
        activeRoutes: routesRes.count || 0,
        activeDrivers: driversRes.count || 0,
        monthlyRevenue: totalRevenue,
        totalClients: clientsRes.count || 0,
        totalFleet: fleetRes.count || 0,
        inventoryCount: inventoryRes.count || 0,
        teamTotal: employeesRes.count || 0,
        activeLeads: leadsRes.count || 0,
        paidAmount: paid,
        receivedAmount: received,
        expectedRevenue: expected + received,
        pendingInvoices: financeRes.data?.filter(t => t.status === 'PENDING').length || 0
      });

      // Fetch Calendar Events for Mini Calendar
      const { data: events } = await supabase
        .from('calendar_events')
        .select('start_date')
        .eq('company_id', profile.company_id);
      
      setCalendarEvents(events || []);
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    // Redirecionamento automático para a URL específica da Role (UX Profissional)
    const currentPath = window.location.pathname;
    if (currentPath === '/dashboard' && profile?.role) {
      if (profile.role === 'RH') navigate('/rh/dashboard', { replace: true });
      else if (profile.role === 'LOGISTICA') navigate('/logistica/dashboard', { replace: true });
      else if (profile.role === 'FINANCEIRO') navigate('/financeiro/dashboard', { replace: true });
      else if (profile.role === 'CRM') navigate('/crm/dashboard', { replace: true });
      else if (profile.role === 'ESTOQUE') navigate('/estoque/dashboard', { replace: true });
      else if (profile.role === 'ADMIN' || profile.role === 'MASTER_ADMIN') navigate('/admin/dashboard', { replace: true });
    }

    fetchMetrics();
    fetchActivities();
  }, [fetchMetrics, fetchActivities, profile?.role, navigate]);

  // Sincronização em Tempo Real
  useRealtime('shipments', profile?.company_id, fetchMetrics);
  useRealtime('routes', profile?.company_id, fetchMetrics);
  useRealtime('transactions', profile?.company_id, fetchMetrics);
  useRealtime('audit_logs', profile?.company_id, fetchActivities);

  const { company: tenantCompany } = useTenant();
  const segment = getSegmentConfig(tenantCompany?.segment);

  const kpis = [
    { label: segment.primaryLabel, value: metrics.todayDeliveries, sub: `${metrics.activeRoutes} ${segment.terminology.fleet.toLowerCase()} on`, Icon: segment.mainIcon, color: '#D9FF00', trend: '+14%' },
    { label: segment.terminology.drivers, value: metrics.activeDrivers, sub: `${metrics.teamTotal} no total`, Icon: Users, color: '#10b981', trend: '+8%' },
    { label: segment.specialKpi, value: segment.specialKpi.includes('Temp') ? '4.5°C' : (metrics.monthlyRevenue / 1000).toFixed(1) + 'k', sub: segment.terminology.load, Icon: segment.specialKpiIcon, color: '#f59e0b', trend: 'Ok' },
    { label: 'Relacionamento (CRM)', value: metrics.totalClients, sub: `${metrics.activeLeads} novos leads`, Icon: UserPlus, color: '#D9FF00', trend: 'Crescente' },
    { label: 'Estoque Central', value: metrics.inventoryCount, sub: 'Itens em almoxarifado', Icon: Package, color: '#D9FF00', trend: 'Equilibrado' },
    { label: 'Logta Academy', value: '45', sub: 'Treinamentos concluídos', Icon: GraduationCap, color: '#f43f5e', trend: 'Alto Comprometimento' },
    { label: 'Frota & Ativos', value: metrics.totalFleet, sub: 'Veículos cadastrados', Icon: Truck, color: '#06b6d4', trend: '100% Up' },
    { label: 'Agenda Operacional', value: 'CALENDARIO', sub: 'Compromissos críticos', Icon: Calendar, color: '#ef4444', trend: 'Monitorado' },
  ];

  const clientData = [
    { name: 'Jan', ativos: 400 },
    { name: 'Fev', ativos: 600 },
    { name: 'Mar', ativos: 800 },
    { name: 'Abr', ativos: 1000 },
    { name: 'Mai', ativos: 1300 },
    { name: 'Jun', ativos: 1540 },
  ];

  const handleCalcClick = (val: string) => {
    if (val === 'C') setCalcDisplay('0');
    else if (val === '=') {
      try { setCalcDisplay(eval(calcDisplay).toString()); } catch { setCalcDisplay('Erro'); }
    } else {
      setCalcDisplay(prev => prev === '0' ? val : prev + val);
    }
  };

  const renderCalculator = () => (
    <Modal isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} title="Calculadora Financeira Avançada (Nuvem Logta)" width="1100px">
       <FinanceCalculator />
    </Modal>
  );

  const MiniCalendar = () => {
    const today = new Date();
    const days = [];
    const date = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDay = date.getDay();
    
    for (let i = 0; i < startDay; i++) days.push(null);
    while (date.getMonth() === today.getMonth()) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }

    return (
      <div style={styles.miniCal}>
        <div style={styles.miniCalHeader}>
           <span style={styles.miniMonth}>{today.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
           <div style={styles.miniNav}><ChevronLeft size={12} /><ChevronRight size={12} /></div>
        </div>
        <div style={styles.miniGrid}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d} style={styles.miniWeekDay}>{d}</div>)}
          {days.slice(0, 14).map((d, i) => {
            const hasEvent = d && calendarEvents.some(e => new Date(e.start_date).toDateString() === d.toDateString());
            const isToday = d && d.toDateString() === today.toDateString();
            return (
              <div key={i} style={{
                ...styles.miniDay,
                ...(isToday ? styles.miniToday : {}),
                ...(hasEvent ? styles.miniEvent : {})
              }}>
                {d ? d.getDate() : ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSeed = async () => {
    if (!profile?.company_id) return;
    const ok = await seedDatabase(profile.company_id);
    if (ok) {
       toastSuccess('Dados de teste gerados com sucesso!');
       fetchMetrics();
       fetchActivities();
    }
  };

  if (loading || !profile) return null;

  // --- RENDERIZADOR POR CONTEXTO DE CARGO ---
  const renderContent = () => {
    switch (profile?.role) {
      case 'RH': return <RHDashboard />;
      case 'LOGISTICA': return <LogisticsDashboard />;
      case 'FINANCEIRO': return <FinanceDashboard />;
      case 'CRM': return <CRMDashboard />;
      case 'ESTOQUE': return <InventoryDashboard />;
      case 'ADMIN':
      case 'MASTER_ADMIN':
        return renderAdminView();
      default:
        return (
          <div style={{ textAlign: 'center', padding: '100px' }}>
            <Activity size={64} color="var(--primary-light)" style={{ marginBottom: '20px' }} />
            <h2>Preparando seu ambiente...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Estamos configurando as ferramentas do seu setor.</p>
          </div>
        );
    }
  };

  const renderAdminView = () => (
    <>
      {/* KPI Row */}
      <div style={styles.kpiGrid}>
        {kpis.map((kpi, index) => (
          <div key={index} style={styles.kpiCard}>
            {kpi.value === 'CALENDARIO' ? (
              <div style={styles.calendarMiniCard}><MiniCalendar /></div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', position: 'relative' }}>
                <div style={{ ...styles.kpiIconBox, backgroundColor: `${kpi.color}15`, color: kpi.color, flexShrink: 0 }}>
                  <kpi.Icon size={24} />
                </div>
                <div style={styles.kpiInfo}>
                  <p style={styles.kpiLabel}>{kpi.label}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <h3 style={styles.kpiValue}>{loading ? '...' : kpi.value}</h3>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#10b981' }}>{kpi.trend}</span>
                  </div>
                  <p style={styles.kpiSub}>{kpi.sub}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={styles.chartsGrid}>
        <div style={styles.chartCard} className="card">
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Performance da Semana</h3>
            <div style={styles.cardBadge}>Inteligência Logta</div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={dataLabels}>
                <defs>
                  <linearGradient id="colorEntregas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D9FF00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D9FF00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                />
                <Area type="monotone" dataKey="entregas" stroke="#D9FF00" strokeWidth={3} fillOpacity={1} fill="url(#colorEntregas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard} className="card">
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Financeiro Previsto</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={dataLabels}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                <Bar dataKey="receita" fill="#C084FC" radius={[6, 6, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard} className="card">
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Clientes Ativos</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={clientData}>
                <defs>
                   <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Area type="step" dataKey="ativos" stroke="#10b981" fill="url(#colorClients)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Admin Financial Deep Dive */}
      <div style={styles.adminFinGrid}>
         <div style={styles.finCard}>
            <p style={styles.finLabel}>TOTAL RECEBIDO (MÊS)</p>
            <h4 style={styles.finValue}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.receivedAmount)}</h4>
            <div style={styles.finBar}><div style={{...styles.finFill, width: '70%', backgroundColor: '#10b981'}} /></div>
         </div>
         <div style={styles.finCard}>
            <p style={styles.finLabel}>TOTAL PAGO (MÊS)</p>
            <h4 style={styles.finValue}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.paidAmount)}</h4>
            <div style={styles.finBar}><div style={{...styles.finFill, width: '40%', backgroundColor: '#ef4444'}} /></div>
         </div>
         <div style={styles.finCard}>
            <p style={styles.finLabel}>FATURAMENTO PREVISTO</p>
            <h4 style={{...styles.finValue, color: 'var(--primary)'}}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.expectedRevenue)}</h4>
            <div style={styles.finBar}><div style={{...styles.finFill, width: '100%', backgroundColor: 'var(--primary)'}} /></div>
         </div>
      </div>

      {/* Recent Alerts & Status */}
      <div style={styles.bottomGrid}>
        <div style={styles.activityCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Atividade Recente (Global)</h3>
            <div style={styles.liveTag}><div style={styles.liveDot} /> Sincronizado</div>
          </div>
          <div style={styles.alertList}>
             {activities.length === 0 ? (
               <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Nenhuma atividade registrada.</p>
             ) : activities.map((log) => (
               <div key={log.id} style={styles.alertItem}>
                  <div style={{ ...styles.logIconBox, backgroundColor: log.type === 'LOGISTICS' ? '#ecfdf5' : '#fef2f2' }}>
                     {log.type === 'LOGISTICS' ? <Truck size={16} color="#10b981" /> : <Package size={16} color="#ef4444" />}
                  </div>
                  <div style={styles.alertContent}>
                     <p style={styles.alertText}>{log.action}: {log.details}</p>
                     <span style={styles.alertTime}>{new Date(log.created_at).toLocaleTimeString()} • {log.type}</span>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div style={styles.secondaryCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Health Check</h3>
          </div>
          <div style={styles.fleetGauge}>
             <div style={styles.gaugeCenter}>
                <h2 style={styles.gaugeValue}>100%</h2>
                <p style={styles.gaugeLabel}>Uptime</p>
             </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Todos os módulos sincronizados com o Sistema Mãe.</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <div>
              <h1 style={styles.title}>
                 {profile?.role === 'ADMIN' || profile?.role === 'MASTER_ADMIN' ? (
                   `Olá, ${profile?.full_name?.split(' ')[0]}`
                 ) : (
                   `Olá, ${profile?.full_name?.split(' ')[0]}`
                 )}
              </h1>
              <p style={styles.subtitle}>Visão Administrativa 360º de todas as operações.</p>
           </div>
        </div>
        <div style={styles.headerActions}>
           <div style={styles.kpiPill}>
              <Users size={14} />
              <span>{metrics.teamTotal} Equipe</span>
           </div>
           <div style={styles.kpiPill}>
              <BarChart2 size={14} />
              <span>{metrics.pendingInvoices} Relatórios</span>
           </div>
          <button style={styles.secondaryBtn} onClick={handleSeed}>Seed (Test)</button>
          <div style={styles.datePicker}>
            <Calendar size={18} />
            <span>Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <button 
             style={{
               ...styles.secondaryBtn, 
               color: '#10b981', 
               fontWeight: '700', 
               backgroundColor: '#ecfdf5', 
               border: '1px solid rgba(16, 185, 129, 0.2)',
               display: 'flex',
               alignItems: 'center',
               gap: '8px'
             }} 
             onClick={() => setIsCalculatorOpen(true)}
          >
             <Calculator size={18} /> Calculadora
          </button>
          <ExportButton filename={`Relatorio-Dashboard-${company?.name}`} />
          <button style={styles.primaryBtn} onClick={() => navigate('/relatorios')}>Relatório Full</button>
        </div>
      </header>

      {renderCalculator()}
      {renderContent()}
    </div>
  );
};

const styles = {
  container: { padding: '0', minHeight: '100vh', backgroundColor: 'transparent' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '600', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  subtitle: { color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' },
  headerActions: { display: 'flex', gap: '12px', alignItems: 'center' },
  datePicker: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-card)', padding: '10px 16px', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' },
  primaryBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  secondaryBtn: { backgroundColor: 'white', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '14px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
  kpiCard: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '110px' },
  kpiInfo: { display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  kpiLabel: { fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  kpiValue: { fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 },
  kpiSub: { fontSize: '11px', color: '#94a3b8', margin: 0 },
  kpiIconBox: { width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  calendarMiniCard: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' },
  chartCard: { backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '28px', border: '1px solid var(--border)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' },
  cardBadge: { padding: '5px 12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  
  // Mini Calendar Styles
  miniCal: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  miniCalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  miniMonth: { fontSize: '10px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '1px' },
  miniNav: { display: 'flex', gap: '8px', color: 'var(--text-muted)' },
  miniGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' },
  miniWeekDay: { fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'center' as const },
  miniDay: { fontSize: '10px', fontWeight: '700', color: 'var(--text-main)', textAlign: 'center' as const, height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' },
  miniToday: { backgroundColor: 'var(--primary)', color: 'white' },
  miniEvent: { backgroundColor: '#fee2e2', color: '#ef4444' },

  // Admin Finance Grid
  adminFinGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' },
  finCard: { backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' },
  finLabel: { fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '12px' },
  finValue: { fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px' },
  finBar: { width: '100%', height: '6px', backgroundColor: 'var(--bg-app)', borderRadius: '10px', overflow: 'hidden' },
  finFill: { height: '100%', borderRadius: '10px' },

  // Header Elements
  calcTrigger: { width: '48px', height: '48px', borderRadius: '14px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { backgroundColor: 'var(--bg-app)', transform: 'scale(1.05)' } },
  kpiPill: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--bg-app)', borderRadius: '30px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' },

  // Calculator Styles
  calcBody: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  calcScreen: { width: '100%', padding: '20px', backgroundColor: '#0f172a', borderRadius: '16px', color: 'white', fontSize: '24px', fontWeight: '600', textAlign: 'right' as const, overflow: 'hidden' },
  calcGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' },
  calcBtn: { padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer', '&:hover': { backgroundColor: 'var(--bg-app)' } },

  bottomGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' },
  activityCard: { backgroundColor: 'var(--bg-card)', padding: '28px', borderRadius: '28px', border: '1px solid var(--border)' },
  secondaryCard: { backgroundColor: 'var(--bg-card)', padding: '28px', borderRadius: '28px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  liveTag: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '20px' },
  liveDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' },
  alertList: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  alertItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)' },
  logIconBox: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  alertContent: { flex: 1 },
  alertText: { fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' },
  alertTime: { fontSize: '12px', color: 'var(--text-muted)' },
  fleetGauge: { width: '180px', height: '180px', borderRadius: '50%', border: '12px solid var(--bg-app)', borderTopColor: 'var(--primary)', position: 'relative' as const, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' },
  gaugeCenter: { textAlign: 'center' as const },
  gaugeValue: { fontSize: '32px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0' },
  gaugeLabel: { fontSize: '14px', color: 'var(--text-muted)' },
};

export default Dashboard;
