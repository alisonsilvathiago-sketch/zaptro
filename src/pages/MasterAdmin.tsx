import React, { useState, useEffect } from 'react';
import { 
  DollarSign, CheckCircle, Search, 
  Loader2, TrendingUp, Globe, Lock, AlertCircle,
  Users, LayoutDashboard, Settings, MoreVertical,
  Activity, ArrowUpRight, ArrowDownLeft, Calendar,
  Briefcase, User, ShieldCheck, Mail, Phone, MapPin,
  ChevronRight, ExternalLink, RefreshCw, X, Eye, 
  Key, Ban, Trash2, History, ShieldAlert, Zap,
  Power, MessageSquare, BarChart3, PieChart as PieIcon,
  CreditCard, Layers, Smartphone, Database, Building2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, BarChart, Bar,
  CartesianGrid
} from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Company } from '../types';

const MasterAdmin: React.FC = () => {
  const { profile: masterProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    mrr: 0,
    activeUsers: 0,
    pendingApis: 0,
    growth: 12.5
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: companies }, { data: profiles }, { data: apis }] = await Promise.all([
        supabase.from('companies').select('id, status, plan'),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('apis_company').select('id').eq('status', 'solicitado')
      ]);

      const cList = companies || [];
      const mrrTotal = cList.reduce((acc, c) => acc + (c.plan === 'OURO' ? 997 : c.plan === 'PRATA' ? 497 : 197), 0);

      setMetrics({
        totalCompanies: cList.length,
        activeCompanies: cList.filter(c => c.status_empresa === 'ativo' || c.status === 'ATIVO').length,
        mrr: mrrTotal,
        activeUsers: profiles?.length || 0,
        pendingApis: apis?.length || 0,
        growth: 15.8
      });
    } catch (err) {
      console.error('Master Data Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const chartData = [
    { name: 'Jan', revenue: 4500, companies: 4 },
    { name: 'Fev', revenue: 5200, companies: 7 },
    { name: 'Mar', revenue: 6800, companies: 12 },
    { name: 'Abr', revenue: 9500, companies: 18 },
  ];

  const shortcuts = [
    { label: 'Auditoria de Logs', icon: History, path: '/auditoria', color: '#ff4b4b', desc: 'Rastreabilidade total de ações' },
    { label: 'Intelligence Hub', icon: BarChart3, path: '/dashboard', color: '#7c3aed', desc: 'BI & Performance de Logística' },
    { label: 'Gestão de Empresas', icon: Building2, path: '/master/empresas', color: '#10b981', desc: 'Controle de instâncias e planos' },
    { label: 'Gestão de Usuários', icon: Users, path: '/master/usuarios', color: '#8b5cf6', desc: 'Separação de usuários e produtos' },
    { label: 'CRM Expansão', icon: Briefcase, path: '/master/crm', color: '#2563eb', desc: 'Pipeline de vendas corporativo' },

    { label: 'Financeiro Master', icon: DollarSign, path: '/master/financeiro', color: '#f59e0b', desc: 'Faturamento e recorrência (MRR)' },
  ];

  if (loading) return (
     <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px'}}>
        <Loader2 className="animate-spin" size={24} color="var(--primary)" />
        <span style={{fontWeight: '700', color: 'var(--text-muted)'}}>Sincronizando Ecossistema Master...</span>
     </div>
  );

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.badge}>MASTER COCKPIT</div>
          <h1 style={styles.title}>Painel de Controle Global</h1>
          <p style={styles.subtitle}>Visão unificada do crescimento e saúde do ecossistema.</p>

        </div>

        <div style={styles.headerRight}>
          {/* TABS CONCENTRADAS À DIREITA NO CABEÇALHO */}
          <div style={styles.tabContainer}>
             {shortcuts.map((s, i) => (
                <div 
                   key={i} 
                   style={{...styles.tabLink, ...(location.pathname === s.path ? styles.tabActive : {})}}
                   onClick={() => navigate(s.path)}
                >
                   <s.icon size={16} />
                   <span>{s.label}</span>
                </div>
             ))}
          </div>

          <div style={styles.headerActions}>
             <button style={styles.refreshBtn} onClick={fetchData} title="Sincronizar Dados">
                <RefreshCw size={18} />
             </button>
             <div style={styles.statusPill}>
                <div style={styles.statusDot} />
                ONLINE
             </div>
          </div>
        </div>
      </header>

      {/* KPI ROW */}
      <div style={styles.kpiGrid}>
         <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
               <div style={{...styles.kpiIcon, backgroundColor: '#eff6ff', color: '#2563eb'}}><Globe size={20} /></div>
               <span style={styles.kpiLabel}>Empresas Onboarded</span>
            </div>
            <h2 style={styles.kpiValue}>{metrics.totalCompanies}</h2>
            <div style={styles.kpiFooter}>
               <span style={{color: '#10b981', fontWeight: '800'}}><TrendingUp size={12} /> {metrics.growth}%</span>
               <span style={{color: '#94a3b8', fontSize: '11px'}}>vs mês anterior</span>
            </div>
         </div>
         <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
               <div style={{...styles.kpiIcon, backgroundColor: '#ecfdf5', color: '#10b981'}}><DollarSign size={20} /></div>
               <span style={styles.kpiLabel}>MRR Acumulado</span>
            </div>
            <h2 style={styles.kpiValue}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}</h2>
            <div style={styles.kpiFooter}>
               <span style={{color: '#94a3b8', fontSize: '11px'}}>Receita recorrente mensal</span>
            </div>
         </div>
         <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
               <div style={{...styles.kpiIcon, backgroundColor: '#f5f3ff', color: '#7c3aed'}}><Users size={20} /></div>
               <span style={styles.kpiLabel}>Usuários Ativos</span>
            </div>
            <h2 style={styles.kpiValue}>{metrics.activeUsers}</h2>
            <div style={styles.kpiFooter}>
               <span style={{color: '#94a3b8', fontSize: '11px'}}>Sessões únicas do dia</span>
            </div>
         </div>
         <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
               <div style={{...styles.kpiIcon, backgroundColor: '#fff7ed', color: '#f59e0b'}}><Zap size={20} /></div>
               <span style={styles.kpiLabel}>Solicitações API</span>
            </div>
            <h2 style={styles.kpiValue}>{metrics.pendingApis}</h2>
            <div style={styles.kpiFooter}>
               <span style={{color: '#f59e0b', fontWeight: '800'}}>Pendente autorização Master</span>
            </div>
         </div>
      </div>


      {/* CHARTS ROW */}
      <div style={styles.chartsRow}>
         <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Crescimento de Receita (Logta Master)</h4>
            <div style={{height: '300px'}}>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-lg)'}}
                        itemStyle={{fontWeight: 800, color: '#7c3aed'}}
                     />
                     <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Health Check Mestre</h4>
            <div style={styles.healthList}>
               <div style={styles.healthItem}>
                  <div style={styles.hIcon}><Database size={18} /></div>
                  <div style={styles.hContent}>
                     <span style={styles.hLabel}>Supabase DB Cluster</span>
                     <span style={styles.hStatus}>99.9% Uptime</span>
                  </div>
                  <div style={styles.hDot} />
               </div>
               <div style={styles.healthItem}>
                  <div style={styles.hIcon}><Smartphone size={18} /></div>
                  <div style={styles.hContent}>
                     <span style={styles.hLabel}>Z-API Gateway</span>
                     <span style={styles.hStatus}>Conectado</span>
                  </div>
                  <div style={styles.hDot} />
               </div>
               <div style={styles.healthItem}>
                  <div style={styles.hIcon}><Layers size={18} /></div>
                  <div style={styles.hContent}>
                     <span style={styles.hLabel}>SaaS Modules RLS</span>
                     <span style={styles.hStatus}>Integridade OK</span>
                  </div>
                  <div style={styles.hDot} />
               </div>
            </div>
            <button style={styles.auditBtn} onClick={() => navigate('/master/auditoria')}>Ver Logs de Auditoria Master →</button>
         </div>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '40px', backgroundColor: 'transparent', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px', gap: '32px', backgroundColor: 'white', padding: '24px 32px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  headerLeft: { flex: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '24px' },
  badge: { display: 'inline-block', padding: '4px 12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '30px', fontSize: '10px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' },
  title: { fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1.5px', margin: 0 },
  subtitle: { fontSize: '15px', color: 'var(--text-muted)', margin: 0 },
  headerActions: { display: 'flex', gap: '12px', alignItems: 'center' },
  refreshBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' },
  statusPill: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '12px', fontSize: '11px', fontWeight: '800', border: '1px solid rgba(16, 185, 129, 0.1)' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' },
  
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' },
  kpiCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  kpiHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  kpiIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const },
  kpiValue: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' },
  kpiFooter: { display: 'flex', alignItems: 'center', gap: '6px' },

  tabContainer: { display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '14px', width: 'fit-content' },
  tabLink: { padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' },
  tabActive: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },

  sectionTitle: { fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '20px', letterSpacing: '-0.5px' },
  shortcutsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' },
  shortcutCard: { backgroundColor: 'white', padding: '20px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 'var(--shadow-lg)', borderColor: 'var(--primary)' } },
  shortcutIcon: { width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  shortcutContent: { flex: 1 },
  shortcutLabel: { fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px' },
  shortcutDesc: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' },

  chartsRow: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
  chartCard: { backgroundColor: 'white', padding: '32px', borderRadius: '28px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  chartTitle: { fontSize: '16px', fontWeight: '800', color: 'var(--primary)', marginBottom: '24px' },
  
  healthList: { display: 'flex', flexDirection: 'column' as const, gap: '16px', marginBottom: '32px' },
  healthItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-app)', borderRadius: '16px' },
  hIcon: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' },
  hContent: { flex: 1, display: 'flex', flexDirection: 'column' as const },
  hLabel: { fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' },
  hStatus: { fontSize: '11px', color: '#10b981', fontWeight: '700' },
  hDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' },
  auditBtn: { width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--primary)', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }
};

export default MasterAdmin;
