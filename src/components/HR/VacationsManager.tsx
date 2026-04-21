import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Clock, Download, Plus, 
  Search, Filter, MoreVertical, CheckCircle2, 
  XCircle, AlertCircle, History, TrendingUp, 
  FileText, ArrowRight, Check, X, User
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import LogtaModal from '../Modal';
import ExportButton from '../ExportButton';

interface Vacation {
  id: string;
  employee_id: string;
  employee_name: string;
  position: string;
  start_date: string;
  end_date: string;
  days: number;
  status: 'AGENDADA' | 'APROVADA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA' | 'PENDENTE' | 'REJEITADA';
  observation?: string;
  created_at: string;
}

const VacationsManager: React.FC = () => {
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'lista' | 'calendario' | 'historico'>('dashboard');
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'MASTER_ADMIN' || profile?.role === 'RH';

  const [newRequest, setNewRequest] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    days: 0,
    observation: ''
  });

  const fetchVacations = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      // Mock for development OR fetch
      const mockVacations: Vacation[] = [
        { id: '1', employee_id: '101', employee_name: 'Ana Costa', position: 'Gerente Comercial', start_date: '2026-05-10', end_date: '2026-05-30', days: 20, status: 'AGENDADA', created_at: '2026-01-10' },
        { id: '2', employee_id: '102', employee_name: 'Thiago Silva', position: 'Motorista Jr', start_date: '2026-04-01', end_date: '2026-04-15', days: 15, status: 'EM_ANDAMENTO', created_at: '2026-01-15' },
        { id: '3', employee_id: '103', employee_name: 'Carla Nunes', position: 'Analista de RH', start_date: '2026-06-15', end_date: '2026-07-15', days: 30, status: 'PENDENTE', created_at: '2026-02-10' },
        { id: '4', employee_id: '104', employee_name: 'Marcos Braz', position: 'Supervisor Frota', start_date: '2026-03-01', end_date: '2026-03-10', days: 9, status: 'FINALIZADA', created_at: '2026-01-05' }
      ];

      // If NOT admin, filter to see only own? 
      // This part depends on how users are linked to employees.
      // For now, I'll assume we show based on identity if not admin.
      setVacations(isAdmin ? mockVacations : mockVacations.filter(v => v.employee_name === profile.full_name));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!profile?.company_id) return;
    try {
      const { data, error } = await supabase.from('employees').select('id, full_name, position').eq('company_id', profile.company_id);
      if (!error) setEmployees(data || []);
    } catch {
      /* lista opcional de colaboradores */
    }
  };

  useEffect(() => {
    fetchVacations();
    fetchEmployees();
  }, [profile]);

  const handleCreateRequest = async () => {
    if (!newRequest.employee_id || !newRequest.start_date || !newRequest.end_date) {
      toastError('Preencha os campos obrigatórios.');
      return;
    }

    const toastId = toastLoading('Registrando solicitação...');
    try {
      // Logic for saving...
      // await supabase.from('vacations').insert(...)
      
      toastDismiss(toastId);
      toastSuccess('Férias solicitadas com sucesso! Aguarde aprovação.');
      setIsModalOpen(false);
      fetchVacations();
    } catch (err) {
      toastError('Erro ao solicitar férias.');
    }
  };

  const handleApprove = async (id: string) => {
    toastLoading('Aprovando...');
    // update status to approved
    toastDismiss('');
    toastSuccess('Férias aprovadas!');
    fetchVacations();
  };

  const handleReject = async (id: string) => {
    toastLoading('Rejeitando...');
    toastDismiss('');
    toastError('Férias rejeitadas.');
    fetchVacations();
  };

  const stats = {
    total_on: vacations.filter(v => v.status === 'EM_ANDAMENTO').length,
    scheduled: vacations.filter(v => v.status === 'AGENDADA').length,
    expired: 2, // Mock expired logic
    in_progress: vacations.filter(v => v.status === 'EM_ANDAMENTO').length
  };

  const chartData = [
    { name: 'Jan', v: 4 }, { name: 'Fev', v: 3 }, { name: 'Mar', v: 8 },
    { name: 'Abr', v: 12 }, { name: 'Mai', v: 15 }, { name: 'Jun', v: 10 }
  ];

  const statusPie = [
    { name: 'Aprovadas', value: 12, color: '#10b981' },
    { name: 'Pendentes', value: 5, color: '#f59e0b' },
    { name: 'Canceladas', value: 2, color: '#ef4444' }
  ];

  const styles = {
    section: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
    kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' },
    kpiCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', gap: '24px', alignItems: 'center' },
    kpiIcon: { width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    
    chartGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' },
    card: { backgroundColor: 'white', padding: '24px', borderRadius: '32px', border: '1px solid #E2E8F0' },
    cardTitle: { fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
    
    actionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    searchBox: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', width: '350px' },
    
    table: { width: '100%', borderCollapse: 'separate' as const, borderSpacing: '0 8px' },
    th: { textAlign: 'left' as const, padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' as const },
    tr: { backgroundColor: 'white', border: '1px solid #e8e8e8', borderRadius: '16px' },
    td: { padding: '16px', fontSize: '14px', fontWeight: '600' },
    
    statusBadge: (status: string) => {
      const colors: any = {
        'EM_ANDAMENTO': { bg: '#ecfdf5', text: '#10b981' },
        'AGENDADA': { bg: 'rgba(217, 255, 0, 0.12)', text: '#D9FF00' },
        'PENDENTE': { bg: '#fff7ed', text: '#f97316' },
        'FINALIZADA': { bg: '#f4f4f4', text: '#64748b' },
        'CANCELADA': { bg: '#fef2f2', text: '#ef4444' }
      };
      const c = colors[status] || { bg: '#f1f5f9', text: '#94a3b8' };
      return { backgroundColor: c.bg, color: c.text, padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '800' };
    },

    primaryBtn: { padding: '12px 24px', borderRadius: '14px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginTop: '20px' },
    day: { aspectRatio: '1/1', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '8px', position: 'relative' as const },
    dayLabel: { fontSize: '12px', fontWeight: '800', color: '#94a3b8' }
  };

  const renderDashboard = () => (
    <div style={styles.section}>
       <div style={styles.kpiRow}>
          <div style={styles.kpiCard}>
             <div style={{...styles.kpiIcon, backgroundColor: '#ecfdf5', color: '#10b981'}}><Users size={24} /></div>
             <div><p style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8', margin: 0}}>Atualmente de Férias</p><p style={{fontSize: '28px', fontWeight: '950', margin: 0}}>{stats.total_on}</p></div>
          </div>
          <div style={styles.kpiCard}>
             <div style={{...styles.kpiIcon, backgroundColor: 'rgba(217, 255, 0, 0.12)', color: '#D9FF00'}}><Calendar size={24} /></div>
             <div><p style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8', margin: 0}}>Próximas Férias</p><p style={{fontSize: '28px', fontWeight: '950', margin: 0}}>{stats.scheduled}</p></div>
          </div>
          <div style={styles.kpiCard}>
             <div style={{...styles.kpiIcon, backgroundColor: '#fef2f2', color: '#ef4444'}}><AlertCircle size={24} /></div>
             <div><p style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8', margin: 0}}>Inconsistências (Vencidas)</p><p style={{fontSize: '28px', fontWeight: '950', margin: 0}}>{stats.expired}</p></div>
          </div>
          <div style={styles.kpiCard}>
             <div style={{...styles.kpiIcon, backgroundColor: 'rgba(217, 255, 0, 0.18)', color: 'var(--primary)'}}><Clock size={24} /></div>
             <div><p style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8', margin: 0}}>Solicitações Pendentes</p><p style={{fontSize: '28px', fontWeight: '950', margin: 0}}>5</p></div>
          </div>
       </div>

       <div style={styles.chartGrid}>
          <div style={styles.card}>
             <h3 style={styles.cardTitle}><TrendingUp size={20} color="var(--primary)" /> Histórico de Saídas por Mês</h3>
             <div style={{height: '300px'}}>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
                      <Tooltip cursor={{fill: '#f4f4f4'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="v" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={24} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div style={styles.card}>
             <h3 style={styles.cardTitle}><AlertCircle size={20} color="var(--primary)" /> Status Geral do Mês</h3>
             <div style={{height: '300px'}}>
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie data={statusPie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                         {statusPie.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                   </PieChart>
                </ResponsiveContainer>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px'}}>
                   {statusPie.map(s => (
                     <div key={s.name} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                           <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color}} />
                           <span style={{fontSize: '13px', fontWeight: '700', color: '#64748b'}}>{s.name}</span>
                        </div>
                        <span style={{fontWeight: '800'}}>{s.value}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );

  const renderList = () => (
    <div style={styles.section}>
       <div style={styles.actionRow}>
          <div style={styles.searchBox}>
             <Search size={18} color="#94a3b8" />
             <input placeholder="Buscar colaborador..." style={{border: 'none', background: 'none', outline: 'none', width: '100%'}} />
          </div>
          <div style={{display: 'flex', gap: '12px'}}>
             <ExportButton filename="Relatorio-Ferias" />
             <button style={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> Nova Solicitação
             </button>
          </div>
       </div>

       <div style={{overflowX: 'auto'}}>
          <table style={styles.table}>
             <thead>
                <tr>
                   <th style={styles.th}>Colaborador</th>
                   <th style={styles.th}>Período</th>
                   <th style={styles.th}>Dias</th>
                   <th style={styles.th}>Status</th>
                   <th style={{...styles.th, textAlign: 'right'}}>Ações Operacionais</th>
                </tr>
             </thead>
             <tbody>
                {vacations.map(v => (
                   <tr key={v.id} style={styles.tr}>
                      <td style={{...styles.td, borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px'}}>
                         <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <div style={{width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><User size={16} color="var(--primary)" /></div>
                            <div><p style={{margin: 0, fontWeight: '800'}}>{v.employee_name}</p><p style={{margin: 0, fontSize: '11px', color: '#94a3b8'}}>{v.position}</p></div>
                         </div>
                      </td>
                      <td style={styles.td}>
                         <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <span style={{fontWeight: '700'}}>{new Date(v.start_date).toLocaleDateString()}</span>
                            <ArrowRight size={14} color="#cbd5e1" />
                            <span style={{fontWeight: '700'}}>{new Date(v.end_date).toLocaleDateString()}</span>
                         </div>
                      </td>
                      <td style={styles.td}>{v.days} Dias</td>
                      <td style={styles.td}>
                         <span style={styles.statusBadge(v.status)}>{v.status.replace('_', ' ')}</span>
                      </td>
                      <td style={{...styles.td, borderTopRightRadius: '16px', borderBottomRightRadius: '16px', textAlign: 'right'}}>
                         <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                            {v.status === 'PENDENTE' && (
                               <>
                                 <button onClick={() => handleApprove(v.id)} style={{padding: '8px', borderRadius: '10px', border: '1px solid #10b981', color: '#10b981', backgroundColor: 'transparent', cursor: 'pointer'}} title="Aprovar"><Check size={16} /></button>
                                 <button onClick={() => handleReject(v.id)} style={{padding: '8px', borderRadius: '10px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', cursor: 'pointer'}} title="Rejeitar"><X size={16} /></button>
                               </>
                            )}
                            <button onClick={() => { setSelectedVacation(v); setIsDetailOpen(true); }} style={{padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#64748b', backgroundColor: 'transparent', cursor: 'pointer'}}><FileText size={16} /></button>
                         </div>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderCalendar = () => (
    <div style={styles.card}>
       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
          <h3 style={{margin: 0, fontWeight: '950'}}>Mapa de Ausências Abril 2026</h3>
          <div style={{display: 'flex', gap: '8px'}}>
             <span style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#D9FF00'}}><div style={{width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#D9FF00'}} /> Férias</span>
             <span style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: '#10b981'}}><div style={{width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#10b981'}} /> Treinamento</span>
          </div>
       </div>
       <div style={styles.calendarGrid}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => <div key={d} style={{textAlign: 'center', fontSize: '11px', fontWeight: '900', color: '#94a3b8', padding: '10px'}}>{d}</div>)}
          {Array.from({length: 30}).map((_, i) => (
             <div key={i} style={styles.day}>
                <span style={styles.dayLabel}>{i + 1}</span>
                {i === 10 && <div style={{marginTop: '4px', padding: '4px', backgroundColor: 'rgba(217, 255, 0, 0.1)', color: '#D9FF00', fontSize: '10px', fontWeight: '800', borderRadius: '4px'}}>Ana Costa</div>}
                {i === 15 && <div style={{marginTop: '4px', padding: '4px', backgroundColor: 'rgba(217, 255, 0, 0.1)', color: '#D9FF00', fontSize: '10px', fontWeight: '800', borderRadius: '4px'}}>Thiago Silva</div>}
             </div>
          ))}
       </div>
    </div>
  );

  return (
    <div style={{paddingTop: '20px'}}>
        <div style={{display: 'flex', gap: '8px', marginBottom: '32px', backgroundColor: '#ebebeb', padding: '6px', borderRadius: '20px', width: 'fit-content', border: '1px solid #e2e8f0'}}>
           {[
             { id: 'dashboard', label: 'Intelligence Dashboard', icon: TrendingUp },
             { id: 'lista', label: 'Gestão de Férias', icon: Users },
             { id: 'calendario', label: 'Calendário Operacional', icon: Calendar },
             { id: 'historico', label: 'Histórico Completo', icon: History }
           ].map(tab => (
             <button 
                key={tab.id} 
                onClick={() => setActiveView(tab.id as any)}
                style={{
                   padding: '10px 20px', border: 'none', borderRadius: '16px', background: activeView === tab.id ? 'white' : 'none', cursor: 'pointer',
                   color: activeView === tab.id ? 'var(--primary)' : '#94a3b8',
                   fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                   boxShadow: activeView === tab.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                   transition: 'all 0.3s'
                }}
             >
                <tab.icon size={16} /> {tab.label}
             </button>
           ))}
        </div>

       {activeView === 'dashboard' && renderDashboard()}
       {activeView === 'lista' && renderList()}
       {activeView === 'calendario' && renderCalendar()}
       {activeView === 'historico' && renderList()}

       <LogtaModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Solicitar Férias de Colaborador" 
          width="600px"
       >
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px'}}>
             <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{fontSize: '13px', fontWeight: '800', color: '#64748b'}}>Seleção de Colaborador</label>
                <select 
                   style={{padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', width: '100%'}}
                   value={newRequest.employee_id}
                   onChange={e => setNewRequest({...newRequest, employee_id: e.target.value})}
                >
                   <option value="">Selecione...</option>
                   {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                </select>
             </div>

             <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                   <label style={{fontSize: '13px', fontWeight: '800', color: '#64748b'}}>Data Início</label>
                   <input 
                      type="date" 
                      style={{padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none'}} 
                      value={newRequest.start_date}
                      onChange={e => {
                         const start = e.target.value;
                         setNewRequest(prev => {
                            const diff = prev.end_date ? Math.ceil((new Date(prev.end_date).getTime() - new Date(start).getTime()) / (1000 * 3600 * 24)) : 0;
                            return {...prev, start_date: start, days: diff > 0 ? diff : 0};
                         });
                      }}
                   />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                   <label style={{fontSize: '13px', fontWeight: '800', color: '#64748b'}}>Data Fim</label>
                   <input 
                      type="date" 
                      style={{padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none'}} 
                      value={newRequest.end_date}
                      onChange={e => {
                         const end = e.target.value;
                         setNewRequest(prev => {
                            const diff = prev.start_date ? Math.ceil((new Date(end).getTime() - new Date(prev.start_date).getTime()) / (1000 * 3600 * 24)) : 0;
                            return {...prev, end_date: end, days: diff > 0 ? diff : 0};
                         });
                      }}
                   />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                   <label style={{fontSize: '13px', fontWeight: '800', color: '#64748b'}}>Total Dias</label>
                   <div style={{padding: '14px', borderRadius: '12px', backgroundColor: '#f4f4f4', border: '1px solid #e2e8f0', fontWeight: '900', textAlign: 'center'}}>{newRequest.days}</div>
                </div>
             </div>

             <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{fontSize: '13px', fontWeight: '800', color: '#64748b'}}>Observação Interna</label>
                <textarea 
                   style={{padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', height: '100px'}} 
                   placeholder="Ex: Férias relativas ao período aquisitivo 2024/2025"
                   value={newRequest.observation}
                   onChange={e => setNewRequest({...newRequest, observation: e.target.value})}
                />
             </div>

             <button style={{...styles.primaryBtn, width: '100%', padding: '16px', fontSize: '16px', justifyContent: 'center'}} onClick={handleCreateRequest}>
                Confirmar Solicitação de Férias
             </button>
          </div>
       </LogtaModal>

       <LogtaModal 
          isOpen={isDetailOpen} 
          onClose={() => setIsDetailOpen(false)} 
          title="Detalhes das Férias"
          width="500px"
       >
          {selectedVacation && (
             <div style={{padding: '10px'}}>
                <div style={{backgroundColor: '#f4f4f4', padding: '24px', borderRadius: '24px', border: '1px solid #e8e8e8', marginBottom: '24px'}}>
                   <p style={{fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px'}}>STATUS ATUAL</p>
                   <span style={styles.statusBadge(selectedVacation.status)}>{selectedVacation.status}</span>
                </div>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{fontWeight: '700', color: '#64748b'}}>Colaborador</span><span style={{fontWeight: '800'}}>{selectedVacation.employee_name}</span></div>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{fontWeight: '700', color: '#64748b'}}>Início</span><span style={{fontWeight: '800'}}>{new Date(selectedVacation.start_date).toLocaleDateString()}</span></div>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{fontWeight: '700', color: '#64748b'}}>Término</span><span style={{fontWeight: '800'}}>{new Date(selectedVacation.end_date).toLocaleDateString()}</span></div>
                   <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{fontWeight: '700', color: '#64748b'}}>Total de Dias</span><span style={{fontWeight: '800'}}>{selectedVacation.days} Dias</span></div>
                </div>

                <div style={{marginTop: '32px', display: 'flex', gap: '12px'}}>
                   <button style={{flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'transparent', fontWeight: '800', cursor: 'pointer'}} onClick={() => setIsDetailOpen(false)}>Fechar</button>
                   <button style={{flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontWeight: '800', cursor: 'pointer'}} onClick={() => toastSuccess('Cancelamento em processamento...')}>Cancelar Férias</button>
                </div>
             </div>
          )}
       </LogtaModal>
    </div>
  );
};

export default VacationsManager;
