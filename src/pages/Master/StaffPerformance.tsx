import React, { useState, useEffect } from 'react';
import { 
  Trophy, Target, Zap, Clock, 
  CheckCircle2, AlertCircle, BarChart3, 
  Users, Plus, Search, Filter,
  MoreVertical, Calendar, Flag, Activity,
  ArrowUpRight, ArrowDownRight, Layout
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError } from '../../lib/toast';
import LogtaModal from '../../components/Modal';

interface PerformanceStat {
  staff_id: string;
  full_name: string;
  tier: string;
  actions_24h: number;
  tasks_done: number;
  tasks_pending: number;
}

interface MasterTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  complexity: number;
  assigned_to: string;
  due_date: string;
}

const StaffPerformance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PerformanceStat[]>([]);
  const [tasks, setTasks] = useState<MasterTask[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'TASKS'>('ANALYTICS');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Summary Stats from View
      const { data: statsData } = await supabase.from('staff_performance_summary').select('*');
      setStats(statsData || []);

      // 2. Fetch Tasks
      const { data: tasksData } = await supabase
        .from('master_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      setTasks(tasksData || []);
    } catch (err) {
      toastError('Erro ao sincronizar performance HQ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const performanceData = stats.map(s => ({
    name: s.full_name.split(' ')[0],
    acoes: s.actions_24h,
    tarefas: s.tasks_done
  }));

  const COLORS = ['#D9FF00', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <div style={styles.bread}>{'MASTER HQ > PERFORMANCE'}</div>
          <h1 style={styles.title}>Alta Performance HQ</h1>
          <p style={styles.subtitle}>Métricas de produtividade e gestão de demandas da equipe master.</p>
        </div>
        <div style={styles.tabSwitch}>
           <button 
              style={{...styles.tabBtn, ...(activeTab === 'ANALYTICS' ? styles.tabActive : {})}}
              onClick={() => setActiveTab('ANALYTICS')}
           >
              <BarChart3 size={16} /> Analytics
           </button>
           <button 
              style={{...styles.tabBtn, ...(activeTab === 'TASKS' ? styles.tabActive : {})}}
              onClick={() => setActiveTab('TASKS')}
           >
              <Layout size={16} /> Quadro de Tarefas
           </button>
        </div>
      </header>

      {activeTab === 'ANALYTICS' ? (
        <div className="animate-slide-up">
           <div style={styles.statsGrid}>
              <div style={{...styles.statCard, borderLeft: '4px solid #D9FF00'}}>
                 <div style={styles.statLabel}>Eficiência do Time</div>
                 <div style={styles.statMain}>
                    <div style={styles.statValue}>94%</div>
                    <div style={styles.trendUp}><ArrowUpRight size={14} /> 2.4%</div>
                 </div>
                 <div style={styles.statSub}>Baseado em SLAs de suporte</div>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #10b981'}}>
                 <div style={styles.statLabel}>Ações (24h)</div>
                 <div style={styles.statMain}>
                    <div style={styles.statValue}>
                      {stats.reduce((acc, curr) => acc + curr.actions_24h, 0)}
                    </div>
                    <div style={styles.trendUp}><ArrowUpRight size={14} /> 12%</div>
                 </div>
                 <div style={styles.statSub}>Interações master globais</div>
              </div>
              <div style={{...styles.statCard, borderLeft: '4px solid #f59e0b'}}>
                 <div style={styles.statLabel}>Tarefas Concluídas</div>
                 <div style={styles.statMain}>
                    <div style={styles.statValue}>
                      {stats.reduce((acc, curr) => acc + curr.tasks_done, 0)}
                    </div>
                    <div style={styles.trendDown}><ArrowDownRight size={14} /> 5%</div>
                 </div>
                 <div style={styles.statSub}>Sprint de operações atual</div>
              </div>
           </div>

           <div style={styles.chartRow}>
              <div style={styles.chartCard}>
                 <h3 style={styles.chartTitle}>Atividade por Arquiteto (Ações)</h3>
                 <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={performanceData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} style={{fontSize: '12px', fontWeight: 'bold'}} />
                          <YAxis axisLine={false} tickLine={false} style={{fontSize: '12px'}} />
                          <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                          />
                          <Bar dataKey="acoes" fill="#D9FF00" radius={[4, 4, 0, 0]} barSize={40} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
              <div style={styles.chartCard}>
                 <h3 style={styles.chartTitle}>Distribuição de Tiers</h3>
                 <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={[
                              { name: 'Admin', value: stats.filter(s => s.tier === 'ADMIN').length },
                              { name: 'Suporte', value: stats.filter(s => s.tier === 'SUPPORT').length },
                              { name: 'Operador', value: stats.filter(s => s.tier === 'OPERATOR').length },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                             {stats.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Pie>
                          <Tooltip />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="animate-slide-up">
           <div style={styles.taskActions}>
              <div style={styles.searchBox}>
                 <Search size={18} color="#94a3b8" />
                 <input style={styles.searchInput} placeholder="Buscar tarefas HQ..." />
              </div>
              <button style={styles.addTaskBtn} onClick={() => setIsTaskModalOpen(true)}>
                 <Plus size={18} /> Nova Tarefa HQ
              </button>
           </div>

           <div style={styles.taskGrid}>
              {['Pendente', 'Em Andamento', 'Concluido'].map(status => (
                <div key={status} style={styles.taskColumn}>
                   <div style={styles.colHeader}>
                      <span>{status.toUpperCase()}</span>
                      <span style={styles.badge}>{tasks.filter(t => t.status === status).length}</span>
                   </div>
                   <div style={styles.taskList}>
                      {tasks.filter(t => t.status === status).map(task => (
                        <div key={task.id} style={styles.taskCardItem}>
                           <div style={styles.taskPriority}>
                              <span style={{
                                color: task.priority === 'Alta' || task.priority === 'Critica' ? '#ef4444' : '#64748b',
                                fontSize: '10px', fontWeight: '700'
                              }}>{task.priority.toUpperCase()}</span>
                           </div>
                           <h4 style={styles.taskTitle}>{task.title}</h4>
                           <p style={styles.taskDesc}>{task.description}</p>
                           <div style={styles.taskFooter}>
                              <div style={styles.taskMeta}>
                                <Clock size={12} /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sem prazo'}
                              </div>
                              <div style={styles.userIcon}>T</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* MODAL: NOVA TAREFA HQ */}
      <LogtaModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} width="500px" title="Delegar Tarefa HQ">
         <div style={styles.form}>
            <div style={styles.inputGroup}>
               <label style={styles.labelForm}>Título da Demanda</label>
               <input style={styles.input} placeholder="Ex: Auditar faturamento da empresa X" />
            </div>
            <div style={styles.inputGroup}>
               <label style={styles.labelForm}>Descrição Detalhada</label>
               <textarea style={{...styles.input, height: '80px', resize: 'none'}} placeholder="O que precisa ser feito?" />
            </div>
            <div style={styles.inputGroup}>
               <label style={styles.labelForm}>Responsável Arquiteto</label>
               <select style={styles.input}>
                  {stats.map(s => <option key={s.staff_id} value={s.staff_id}>{s.full_name}</option>)}
               </select>
            </div>
            <div style={styles.row}>
               <div style={styles.inputGroup}>
                  <label style={styles.labelForm}>Prioridade</label>
                  <select style={styles.input}>
                     <option>Baixa</option>
                     <option>Media</option>
                     <option>Alta</option>
                     <option>Critica</option>
                  </select>
               </div>
               <div style={styles.inputGroup}>
                  <label style={styles.labelForm}>Prazo (Due Date)</label>
                  <input type="date" style={styles.input} />
               </div>
            </div>
            <button style={styles.submitBtn}>
               Delegar e Monitorar 🚀
            </button>
         </div>
      </LogtaModal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '0', minHeight: '100vh', backgroundColor: 'transparent' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' },
  bread: { fontSize: '10px', fontWeight: '700', color: '#D9FF00', marginBottom: '4px', opacity: 0.6 },
  title: { fontSize: '28px', fontWeight: '700', color: '#000000', margin: 0, letterSpacing: '-1px' },
  subtitle: { color: '#64748b', fontSize: '15px', fontWeight: '500' },
  
  tabSwitch: { display: 'flex', backgroundColor: '#ebebeb', padding: '4px', borderRadius: '12px', gap: '4px' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', fontSize: '13px', fontWeight: '700', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' },
  tabActive: { backgroundColor: 'white', color: '#D9FF00', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  statLabel: { fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' },
  statMain: { display: 'flex', alignItems: 'baseline', gap: '12px' },
  statValue: { fontSize: '32px', fontWeight: '700', color: '#000000' },
  trendUp: { fontSize: '12px', fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' },
  trendDown: { fontSize: '12px', fontWeight: '600', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' },
  statSub: { fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '600' },

  chartRow: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' },
  chartCard: { backgroundColor: 'white', padding: '24px', borderRadius: '28px', border: '1px solid #e8e8e8' },
  chartTitle: { fontSize: '16px', fontWeight: '700', color: '#000000', marginBottom: '24px' },

  taskActions: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '12px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', width: '350px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', fontWeight: '600', width: '100%' },
  addTaskBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#D9FF00', color: '#000000', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(217, 255, 0, 0.2)' },

  taskGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' },
  taskColumn: { display: 'flex', flexDirection: 'column', gap: '16px' },
  colHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' },
  badge: { backgroundColor: '#ebebeb', color: '#64748b', fontSize: '10px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px' },
  taskList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  taskCardItem: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e8e8e8', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', cursor: 'grab' },
  taskPriority: { marginBottom: '8px' },
  taskTitle: { fontSize: '15px', fontWeight: '600', color: '#000000', margin: '0 0 8px 0' },
  taskDesc: { fontSize: '12px', color: '#6b7280', margin: '0 0 16px 0', lineHeight: '1.5' },
  taskFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e8e8e8', paddingTop: '12px' },
  taskMeta: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: '600' },
  userIcon: { width: '24px', height: '24px', borderRadius: '6px', backgroundColor: 'rgba(217, 255, 0, 0.18)', color: '#D9FF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700' },

  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  labelForm: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f4f4f4', fontWeight: '600', outline: 'none' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  submitBtn: { padding: '18px', backgroundColor: '#D9FF00', color: '#000000', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '12px', boxShadow: '0 10px 15px -3px rgba(217, 255, 0, 0.2)' }
};

export default StaffPerformance;
