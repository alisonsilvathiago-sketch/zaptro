import React, { useState, useEffect } from 'react';
import { 
  Briefcase, DollarSign, Heart, Truck, Package, 
  GraduationCap, ShieldCheck, MessageSquare, 
  TrendingUp, Users, AlertCircle, Clock, 
  ArrowUpRight, LayoutGrid, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MODULE_WIDGETS: Record<string, any> = {
  crm: {
    title: 'Monitor Comercial (CRM)',
    icon: Briefcase,
    color: '#D9FF00',
    path: '/crm',
    kpi: '12 Clientes Novos',
    sub: '3 propostas aguardando retorno'
  },
  financeiro: {
    title: 'Fluxo Financeiro',
    icon: DollarSign,
    color: '#10b981',
    path: '/financeiro',
    kpi: 'R$ ••••••',
    sub: '2 faturas vencendo hoje'
  },
  rh: {
    title: 'Gestão de Time (RH)',
    icon: Heart,
    color: '#f43f5e',
    path: '/rh',
    kpi: '98% Presença',
    sub: '1 colaborador de férias'
  },
  logistica: {
    title: 'Monitor Logístico',
    icon: Truck,
    color: '#f59e0b',
    path: '/logistica',
    kpi: '15 Rotas Ativas',
    sub: '2 alertas de atraso (GPS)'
  },
  estoque: {
    title: 'Inventário & Carga',
    icon: Package,
    color: '#D9FF00',
    path: '/estoque',
    kpi: '85% Ocupação',
    sub: 'Entrada de 12 paletes pendente'
  },
  treinamentos: {
    title: 'Academia Logta',
    icon: GraduationCap,
    color: '#06b6d4',
    path: '/treinamentos',
    kpi: '4 Cursos Concluídos',
    sub: 'Nova NR-35 disponível'
  },
  auditoria: {
    title: 'Trilha de Segurança',
    icon: ShieldCheck,
    color: '#64748b',
    path: '/auditoria',
    kpi: 'Logs Estáveis',
    sub: 'Último acesso: há 2 min'
  },
  whatsapp: {
    title: 'Zaptro Chat (WhatsApp)',
    icon: MessageSquare,
    color: '#25d366',
    path: '/whatsapp',
    kpi: '5 Mensagens Novas',
    sub: 'Conversa pendente com Transportadora X'
  }
};

const AREA_STATS: Record<string, any[]> = {
  rh: [
    { label: 'Treinamentos NR', value: '85%', trend: 'up' },
    { label: 'Turnover Mensal', value: '1.2%', trend: 'down' },
    { label: 'Vagas Abertas', value: '4', trend: 'neutral' }
  ],
  financeiro: [
    { label: 'EBITDA Projetado', value: '28%', trend: 'up' },
    { label: 'Inadimplência', value: '3.4%', trend: 'down' },
    { label: 'Fluxo de Caixa', value: 'Positivo', trend: 'up' }
  ],
  logistica: [
    { label: 'On-Time Delivery', value: '94%', trend: 'up' },
    { label: 'Consumo Médio', value: '2.8 km/l', trend: 'neutral' },
    { label: 'Entregas Hoje', value: '142', trend: 'up' }
  ],
  crm: [
    { label: 'Taxa de Conversão', value: '18%', trend: 'up' },
    { label: 'CAC', value: 'R$ 450', trend: 'down' },
    { label: 'LTV Projetado', value: 'R$ 12k', trend: 'up' }
  ]
};

const IntelligenceHub: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      const perms = profile.metadata?.permissions || {};
      const modules = profile.metadata?.modules || {};
      
      const enabled = Object.keys(MODULE_WIDGETS).filter(moduleId => {
        return modules[moduleId] === true || perms[`${moduleId}:view`] === true;
      });

      if (['ADMIN', 'MASTER_ADMIN', 'MASTER'].includes(profile.role)) {
        setAllowedModules(Object.keys(MODULE_WIDGETS));
      } else {
        setAllowedModules(enabled);
      }
      setLoading(false);
    }
  }, [profile]);

  if (loading) return <div style={styles.loading}>Sincronizando Central de Inteligência...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Central de Inteligência Operacional</h1>
          <p style={styles.subtitle}>Painel dinâmico moldado às suas permissões de acesso.</p>
        </div>
        <div style={styles.statusBox}>
          <Activity size={16} color="var(--primary)" />
          <span style={{fontSize: '12px', fontWeight: '600'}}>Sistema Adaptativo On</span>
        </div>
      </header>

      <div style={styles.grid}>
        {allowedModules.map(modId => {
          const mod = MODULE_WIDGETS[modId];
          const Icon = mod.icon;
          return (
            <div key={modId} style={styles.card} onClick={() => navigate(mod.path)}>
               <div style={{...styles.iconBox, backgroundColor: `${mod.color}15`, color: mod.color}}>
                  <Icon size={24} />
               </div>
               <div style={styles.cardContent}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                     <h3 style={styles.cardTitle}>{mod.title}</h3>
                     <ArrowUpRight size={16} color="#94a3b8" />
                  </div>
                  <h4 style={{...styles.kpi, color: mod.color}}>{mod.kpi}</h4>
                  <p style={styles.sub}>{mod.sub}</p>
               </div>
               <div style={{...styles.progress, backgroundColor: `${mod.color}20`}}>
                  <div style={{...styles.progressBar, backgroundColor: mod.color, width: '70%'}} />
               </div>
            </div>
          );
        })}

        {allowedModules.length === 0 && (
          <div style={styles.emptyState}>
            <LayoutGrid size={48} color="#cbd5e1" style={{marginBottom: '16px'}} />
            <h3>Nenhum módulo habilitado</h3>
            <p>Solicite ao administrador a ativação das suas áreas de trabalho.</p>
          </div>
        )}
      </div>

      {allowedModules.length > 0 && (
        <section style={styles.metricsSection}>
           <div style={styles.metricsHeader}>
              <h2 style={styles.metricsTitle}>Métricas em Tempo Real</h2>
              <div style={styles.liveBadge}><div style={styles.liveDot} /> AO VIVO</div>
           </div>
           
           <div style={styles.metricsGrid}>
              {allowedModules.filter(id => AREA_STATS[id]).map(id => (
                <div key={id} style={styles.metricsCard}>
                   <h3 style={styles.metricsCardTitle}>{MODULE_WIDGETS[id].title}</h3>
                   <div style={styles.statsRow}>
                      {AREA_STATS[id].map((stat, sIdx) => (
                        <div key={sIdx} style={styles.statItem}>
                           <span style={styles.statLabel}>{stat.label}</span>
                           <span style={styles.statValue}>{stat.value}</span>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </section>
      )}

      {allowedModules.length > 0 && (
        <section style={styles.recentActivity}>
           <h3 style={{fontSize: '14px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Clock size={18} color="var(--primary)" /> Histórico de Acesso Rápido
           </h3>
           <div style={styles.activityList}>
              {allowedModules.slice(0, 3).map(modId => (
                <div key={modId} style={styles.activityItem} onClick={() => navigate(MODULE_WIDGETS[modId].path)}>
                   <div style={styles.dot} />
                   <p style={{margin: 0, fontSize: '13px', fontWeight: '700'}}>Você acessou <strong>{MODULE_WIDGETS[modId].title}</strong> recentemente.</p>
                   <span style={{fontSize: '11px', color: '#94a3b8', marginLeft: 'auto'}}>há 5 min</span>
                </div>
              ))}
           </div>
        </section>
      )}
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '32px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  title: { fontSize: '28px', fontWeight: '700', color: 'var(--text-main)', margin: 0, letterSpacing: '-1.5px' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' },
  statusBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' },
  card: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', '&:hover': { transform: 'translateY(-4px)', boxShadow: 'var(--shadow-lg)', borderColor: 'var(--primary-light)' } },
  iconBox: { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: 0 },
  kpi: { fontSize: '20px', fontWeight: '700', margin: '4px 0' },
  sub: { fontSize: '11px', color: '#94a3b8', margin: 0, fontWeight: '700' },
  progress: { height: '3px', borderRadius: '4px', width: '100%', marginTop: '8px' },
  progressBar: { height: '100%', borderRadius: '4px' },
  emptyState: { gridColumn: '1 / -1', padding: '80px', textAlign: 'center', backgroundColor: '#f4f4f4', borderRadius: '32px', border: '2px dashed #e2e8f0', color: 'var(--text-muted)' },
  loading: { padding: '100px', textAlign: 'center', color: 'var(--primary)', fontWeight: '700', fontSize: '18px' },
  recentActivity: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  activityList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  activityItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '16px', cursor: 'pointer', transition: '0.2s', '&:hover': { backgroundColor: '#f4f4f4' } },
  dot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 0 4px var(--primary-light)' },
  
  metricsSection: { marginBottom: '40px' },
  metricsHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' },
  metricsTitle: { fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 },
  liveBadge: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#ef4444', backgroundColor: '#fef2f2', padding: '4px 10px', borderRadius: '6px' },
  liveDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s infinite' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
  metricsCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' },
  metricsCardTitle: { fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' },
  statsRow: { display: 'flex', justifyContent: 'space-between', gap: '12px' },
  statItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  statLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: '700' },
  statValue: { fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }
};

export default IntelligenceHub;
