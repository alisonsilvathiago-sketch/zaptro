import React from 'react';
import { 
  Users, Truck, DollarSign, Package, 
  TrendingUp, Activity, BarChart2, 
  UserPlus, UserMinus, Navigation, 
  AlertCircle, ChevronRight, PieChart,
  Target, Briefcase, FileText
} from 'lucide-react';

interface MetricProps {
  label: string;
  value: string | number;
  trend?: string;
  icon: React.ReactNode;
  color: string;
}

const MetricCard: React.FC<MetricProps> = ({ label, value, trend, icon, color }) => (
  <div style={{
    background: 'white',
    padding: '24px',
    borderRadius: '24px',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
    minWidth: '240px',
    boxShadow: 'var(--shadow-sm)'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ 
        padding: '12px', 
        backgroundColor: `${color}15`, 
        color: color, 
        borderRadius: '16px' 
      }}>
        {icon}
      </div>
      {trend && (
        <span style={{ 
          fontSize: '12px', 
          fontWeight: '700', 
          color: trend.startsWith('+') ? '#10B981' : '#EF4444',
          backgroundColor: trend.startsWith('+') ? '#10B98110' : '#EF444410',
          padding: '4px 8px',
          borderRadius: '10px'
        }}>
          {trend}
        </span>
      )}
    </div>
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>{label}</p>
      <h3 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', marginTop: '4px' }}>{value}</h3>
    </div>
  </div>
);

// --- DASHBOARD RH ---
export const RHDashboard = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
      <MetricCard label="Total Equipe" value="124" trend="+4" icon={<Users size={24} />} color="#000000" />
      <MetricCard label="Novas Admissões" value="8" trend="+2" icon={<UserPlus size={24} />} color="#10B981" />
      <MetricCard label="Desligamentos" value="2" trend="-1" icon={<UserMinus size={24} />} color="#EF4444" />
      <MetricCard label="Vagas Abertas" value="15" icon={<Briefcase size={24} />} color="#F59E0B" />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
      <div className="card">
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} color="var(--primary)" /> Clima Organizacional
        </h3>
        <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '15px', padding: '10px' }}>
           {[60, 85, 45, 90, 75].map((h, i) => (
             <div key={i} style={{ flex: 1, backgroundColor: 'var(--primary-light)', height: `${h}%`, borderRadius: '8px 8px 0 0', position: 'relative' }}>
                <span style={{ position: 'absolute', bottom: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: '700' }}>Set {i+1}</span>
             </div>
           ))}
        </div>
      </div>
      <div className="card">
         <h3 style={{ marginBottom: '20px' }}>Próximos Treinamentos</h3>
         {[1, 2, 3].map(i => (
           <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-app)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={18} color="var(--primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '700', fontSize: '14px' }}>Segurança no Trabalho V.{i}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>15 Colaboradores Inscritos</p>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
           </div>
         ))}
      </div>
    </div>
  </div>
);

// --- DASHBOARD LOGÍSTICA ---
export const LogisticsDashboard = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
      <MetricCard label="Entregas de Hoje" value="842" trend="+12%" icon={<Target size={24} />} color="#000000" />
      <MetricCard label="Rotas Ativas" value="48" trend="Live" icon={<Navigation size={24} />} color="#10B981" />
      <MetricCard label="Veículos em Trânsito" value="32" icon={<Truck size={24} />} color="#F59E0B" />
      <MetricCard label="Alertas Críticos" value="3" trend="Urgente" icon={<AlertCircle size={24} />} color="#EF4444" />
    </div>

    <div className="card">
       <h3 style={{ marginBottom: '20px' }}>Status de Frota em Tempo Real</h3>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {['Operacional', 'Em Manutenção', 'Aguardando Carga'].map((status, i) => (
            <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                  <span>{status}</span>
                  <span>{i === 0 ? '85%' : i === 1 ? '10%' : '5%'}</span>
               </div>
               <div style={{ height: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: i === 0 ? '85%' : i === 1 ? '10%' : '5%', backgroundColor: i === 0 ? '#10B981' : i === 1 ? '#EF4444' : '#F59E0B' }} />
               </div>
            </div>
          ))}
       </div>
    </div>
  </div>
);

// --- DASHBOARD FINANCEIRO ---
export const FinanceDashboard = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
      <MetricCard label="Receita Mensal" value="R$ 142.500" trend="+15%" icon={<DollarSign size={24} />} color="#10B981" />
      <MetricCard label="Despesas Operacionais" value="R$ 68.200" trend="-5%" icon={<TrendingUp size={24} />} color="#EF4444" />
      <MetricCard label="Saldo Projetado" value="R$ 74.300" icon={<Activity size={24} />} color="#000000" />
      <MetricCard label="Margem de Lucro" value="52%" icon={<PieChart size={24} />} color="#F59E0B" />
    </div>

    <div className="card">
       <h3 style={{ marginBottom: '20px' }}>Fluxo de Caixa (Últimos 7 dias)</h3>
       <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          {[30, 45, 55, 40, 70, 85, 60].map((h, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: 'var(--primary)', height: `${h}%`, borderRadius: '4px', opacity: 0.8 }} />
          ))}
       </div>
    </div>
  </div>
);

// --- DASHBOARD CRM ---
export const CRMDashboard = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
      <MetricCard label="Leads Ativos" value="245" trend="+18" icon={<Users size={24} />} color="#000000" />
      <MetricCard label="Taxa de Conversão" value="12.5%" trend="+1.2%" icon={<TrendingUp size={24} />} color="#10B981" />
      <MetricCard label="Novos Contratos" value="14" icon={<FileText size={24} />} color="#F59E0B" />
      <MetricCard label="Churn Rate" value="0.8%" trend="-0.2%" icon={<Activity size={24} />} color="#EF4444" />
    </div>
  </div>
);

// --- DASHBOARD ESTOQUE ---
export const InventoryDashboard = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
      <MetricCard label="SKUs Ativos" value="1.240" icon={<Package size={24} />} color="#000000" />
      <MetricCard label="Itens em Falta" value="12" icon={<AlertCircle size={24} />} color="#EF4444" />
      <MetricCard label="Giro de Estoque" value="4.2x" icon={<Activity size={24} />} color="#10B981" />
      <MetricCard label="Valor Total" value="R$ 450k" icon={<DollarSign size={24} />} color="#F59E0B" />
    </div>
  </div>
);
