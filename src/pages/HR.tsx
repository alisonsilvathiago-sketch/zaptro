import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, Heart, Activity, ShieldAlert, Flame, Plus, 
  Search, Filter, Download, MoreVertical, Building, 
  Mail, Phone, FileText, CheckCircle2, Clock, History as HistoryIcon,
  Briefcase, GraduationCap, Wallet, TrendingUp, Save,
  Calendar, MessageSquare, AlertTriangle, CreditCard, FileCheck,
  UserCheck, UserX, UserPlus, Star, MapPin, Smile, Frown, Meh,
  Upload, Trash2, Edit3, X, ChevronRight, MessageCircle, ArrowLeft, Hash, User,
  AlertCircle, Coffee, Play, Square, ArrowRight, Truck, Bell
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import LogtaModal from '../components/Modal';
import VacationsManager from '../components/HR/VacationsManager';
import ModuleLayout from '../layouts/ModuleLayout';

// --- Types ---
interface Employee {
  id: string;
  full_name: string;
  position: string;
  type: 'Funcionário' | 'Motorista' | 'Agregado';
  email: string;
  phone: string;
  status: 'Ativo' | 'Inativo' | 'Afastado';
  health_score?: number;
  hiring_date: string;
  cnh_number?: string;
  cnh_expiry?: string;
  address?: string;
  photo_url?: string;
}

const HR: React.FC = () => {
  const { company } = useTenant();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --- States ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'colaboradores' | 'saude' | 'ponto' | 'notas' | 'documentos' | 'ferias'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  
  // Strategic Notes & Notifications States
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteDetailOpen, setIsNoteDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [newNoteData, setNewNoteData] = useState({ 
    type: 'POSITIVE', 
    text: '', 
    detail: '',
    collabId: '',
    vehicleId: '',
    plate: '',
    route: '' 
  });
  
  const initialEmployeeState = {
    full_name: '',
    phone: '',
    position: '',
    type: 'Funcionário' as any,
    email: '',
    hiring_date: new Date().toISOString().split('T')[0]
  };

  const [newEmployee, setNewEmployee] = useState(initialEmployeeState);

  // Fetching Data
  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id);
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar colaboradores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setTimeout(() => setShowCheckin(true), 15000);
    return () => clearTimeout(timer);
  }, [profile?.company_id]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .insert([{ ...newEmployee, company_id: profile.company_id }]);
      if (error) throw error;
      toastSuccess('Colaborador cadastrado com sucesso!');
      setIsAddModalOpen(false);
      setNewEmployee(initialEmployeeState);
      fetchData();
    } catch (err: any) {
      toastError('Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Excluir colaborador?')) return;
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      toastSuccess('Removido.');
      setIsDetailModalOpen(false);
      fetchData();
    } catch (err: any) {
      toastError('Erro ao excluir.');
    }
  };

  const handleSaveNote = () => {
    toastSuccess('Nota estratégica registrada!');
    setIsNoteModalOpen(false);
  };

  // --- Render Sections ---
  const renderDashboard = () => (
    <div style={styles.tabContent}>
       <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Total Equipe</p><h2 style={styles.kpiValue}>{employees.length}</h2></div>
             <div style={{...styles.kpiIconWrapper, backgroundColor: 'rgba(217, 255, 0, 0.12)'}}><Users size={24} color="#D9FF00" /></div>
          </div>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Clima Organizacional</p><h2 style={styles.kpiValue}>92%</h2></div>
             <div style={{...styles.kpiIconWrapper, backgroundColor: '#ecfdf5'}}><Smile size={24} color="#10b981" /></div>
          </div>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Afastados</p><h2 style={styles.kpiValue}>02</h2></div>
             <div style={{...styles.kpiIconWrapper, backgroundColor: '#fef2f2'}}><Activity size={24} color="#ef4444" /></div>
          </div>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Alertas de Saúde</p><h2 style={styles.kpiValue}>05</h2></div>
             <div style={{...styles.kpiIconWrapper, backgroundColor: '#fffbeb'}}><Heart size={24} color="#f59e0b" /></div>
          </div>
       </div>

       <div style={styles.dashboardMainGrid}>
          <div style={styles.chartCol}>
             <div style={styles.chartCard}>
                <div style={styles.cardHeader}><h3>Status de Saúde Mental (Radar Humano)</h3></div>
                <div style={{padding: '24px', height: '300px'}}>
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[{ name: 'Seg', val: 80 }, { name: 'Ter', val: 85 }, { name: 'Qua', val: 78 }, { name: 'Qui', val: 82 }, { name: 'Sex', val: 90 }]}>
                         <Area type="monotone" dataKey="val" stroke="var(--primary)" fill="var(--primary-light)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
          <div style={styles.chartCol}>
             <div style={styles.chartCard}>
                <div style={styles.cardHeader}><h3>Notas Recentes</h3></div>
                <div style={{padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
                   <div style={styles.noteCard}>
                      <div style={{display: 'flex', gap: '12px'}}>
                         <div style={styles.avatarMini}>L</div>
                         <div><p style={{margin: 0, fontWeight: '700'}}>Feedback Positivo: Carlos A.</p><p style={{margin: 0, fontSize: '12px', color: '#94a3b8'}}>Excelente conduta na rota sul.</p></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );

  const renderEmployees = () => (
    <div style={styles.tabContent}>
       <div style={styles.filterBar}>
          <div style={styles.searchBox}>
             <Search size={18} color="#94a3b8" />
             <input placeholder="Buscar por nome, cargo ou CPF..." style={styles.searchInput} />
          </div>
          <div style={styles.exportGroup}>
             <button style={styles.exportBtn}><Download size={16} /> Exportar</button>
             <button style={styles.btnPrimary} onClick={() => { setSelectedEmployee(null); setIsAddModalOpen(true); }}><Plus size={18} /> Admitir</button>
          </div>
       </div>

       <div style={styles.tableCard}>
          <table style={styles.table}>
             <thead>
                <tr><th style={styles.th}>Colaborador</th><th style={styles.th}>Cargo</th><th style={styles.th}>Status</th><th style={styles.th}>Admissão</th><th style={styles.th}>Ações</th></tr>
             </thead>
             <tbody>
                {employees.map(emp => (
                   <tr key={emp.id} style={{cursor: 'pointer'}} onClick={() => { setSelectedEmployee(emp); setIsDetailModalOpen(true); }}>
                      <td style={styles.td}><div style={styles.userCell}><div style={styles.avatar}>{emp.full_name[0]}</div><div><p style={styles.uName}>{emp.full_name}</p><p style={styles.uSub}>{emp.email}</p></div></div></td>
                      <td style={styles.td}>{emp.position}</td>
                      <td style={styles.td}><span style={{padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', backgroundColor: '#ecfdf5', color: '#10b981'}}>{emp.status || 'Ativo'}</span></td>
                      <td style={styles.td}>{emp.hiring_date}</td>
                      <td style={styles.td}><button style={styles.iconBtn}><MoreVertical size={18} /></button></td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderHealth = () => <div style={styles.tabContent}><h2>Módulo de Saúde & Segurança</h2><p>Controle de exames, ASOS e EPIs.</p></div>;
  const renderAttendance = () => <div style={styles.tabContent}><h2>Folha de Ponto Digital</h2><p>Registro e tratamento de horas.</p></div>;
  const renderNotes = () => <div style={styles.tabContent}><h2>Notas Estratégicas & Ocorrências</h2><p>Relatórios de conduta e feedbacks.</p></div>;
  const renderDocs = () => <div style={styles.tabContent}><h2>Central de Documentos</h2><p>Contratos e arquivos por colaborador.</p></div>;

  const navItems = [
    { id: 'dashboard', label: 'Resumo Inteligente', icon: TrendingUp },
    { id: 'colaboradores', label: 'Equipe & Gestão', icon: Users },
    { id: 'saude', label: 'Saúde & Segurança', icon: Heart },
    { id: 'ponto', label: 'Registro de Ponto', icon: Clock },
    { id: 'ferias', label: 'Férias & Afastamentos', icon: Calendar },
    { id: 'documentos', label: 'Documentação', icon: FileCheck },
    { id: 'notas', label: 'Notas Estratégicas', icon: MessageSquare },
  ];

  return (
    <ModuleLayout
      title="RH & Gente"
      badge="RECURSOS HUMANOS"
      items={navItems}
      activeTab={activeTab}
      onTabChange={(id) => handleTabChange(id as any)}
    >
      <main>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'colaboradores' && renderEmployees()}
        {activeTab === 'saude' && renderHealth()}
        {activeTab === 'ponto' && renderAttendance()}
        {activeTab === 'notas' && renderNotes()}
        {activeTab === 'documentos' && renderDocs()}
        {activeTab === 'ferias' && <VacationsManager />}
      </main>

      {/* POPUP RADAR HUMANO */}
      {showCheckin && (
        <div className="animate-slide-up" style={styles.checkinPopup}>
           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
              <div><h4 style={{margin: 0}}>Bom dia! 🚀</h4><p style={{margin: 0, fontSize: '12px'}}>Como você está hoje?</p></div>
              <button style={{border: 'none', background: 'none', cursor: 'pointer'}} onClick={() => setShowCheckin(false)}><X size={16} /></button>
           </div>
           <div style={styles.emojiGrid}>
              <button style={styles.emojiBtn} onClick={() => { toastSuccess('Ótimo dia!'); setShowCheckin(false); }}>😊</button>
              <button style={styles.emojiBtn} onClick={() => setShowCheckin(false)}>😐</button>
              <button style={styles.emojiBtn} onClick={() => setShowCheckin(false)}>🤒</button>
              <button style={styles.emojiBtn} onClick={() => setShowCheckin(false)}>😴</button>
           </div>
        </div>
      )}

      {/* MODALS */}
      <LogtaModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Perfil do Colaborador" width="800px">
        {selectedEmployee && (
          <div style={{padding: '24px'}}>
            <div style={{display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '32px'}}>
               <div style={{...styles.avatar, width: '64px', height: '64px', fontSize: '24px'}}>{selectedEmployee.full_name[0]}</div>
               <div><h2 style={{margin: 0}}>{selectedEmployee.full_name}</h2><p style={{margin: 0, color: '#64748b'}}>{selectedEmployee.position}</p></div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
               <div><label style={styles.labelSmall}>Email</label><strong>{selectedEmployee.email}</strong></div>
               <div><label style={styles.labelSmall}>Status</label><strong style={{color: '#10b981'}}>{selectedEmployee.status}</strong></div>
            </div>
            <button style={{...styles.btnPrimary, marginTop: '32px', width: '100%', justifyContent: 'center'}} onClick={() => navigate(`/perfil/${selectedEmployee.id}`)}>Ver Ficha Completa</button>
          </div>
        )}
      </LogtaModal>

      <LogtaModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Admitir Colaborador" width="600px">
        <form onSubmit={handleAddEmployee} style={{display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px'}}>
           <input placeholder="Nome Completo" style={styles.input} value={newEmployee.full_name} onChange={e => setNewEmployee({...newEmployee, full_name: e.target.value})} required />
           <input placeholder="Cargo" style={styles.input} value={newEmployee.position} onChange={e => setNewEmployee({...newEmployee, position: e.target.value})} />
           <input placeholder="Email" type="email" style={styles.input} value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} />
           <button type="submit" style={styles.btnPrimaryLarge}>{loading ? 'Salvando...' : 'Admitir'}</button>
        </form>
      </LogtaModal>

      <LogtaModal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Nova Nota Estratégica" width="600px">
         <div style={{display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px'}}>
            <textarea style={{...styles.input, height: '100px'}} placeholder="Descreva a ocorrência..." />
            <button style={styles.btnPrimaryFull} onClick={handleSaveNote}>Salvar Nota</button>
         </div>
      </LogtaModal>
    </ModuleLayout>
  );
};

const styles: Record<string, any> = {
  tabContent: { display: 'flex', flexDirection: 'column', gap: '32px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' },
  kpiCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  kpiInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  kpiLabel: { fontSize: '12px', fontWeight: '700', color: '#94a3b8', margin: 0 },
  kpiValue: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0 },
  kpiIconWrapper: { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dashboardMainGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' },
  chartCol: { display: 'flex', flexDirection: 'column', gap: '24px' },
  chartCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  cardHeader: { padding: '20px 24px', borderBottom: '1px solid #e8e8e8' },
  noteCard: { backgroundColor: '#f4f4f4', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' },
  avatarMini: { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' },
  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '12px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', width: '400px' },
  searchInput: { border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', fontSize: '14px' },
  exportGroup: { display: 'flex', gap: '12px' },
  exportBtn: { padding: '10px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  btnPrimary: { padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  tableCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e8e8e8' },
  td: { padding: '16px 24px', fontSize: '14px', borderBottom: '1px solid #e8e8e8', color: '#475569' },
  userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' },
  uName: { fontWeight: '800', color: '#1e293b', margin: 0 },
  uSub: { fontSize: '12px', color: '#94a3b8', margin: 0 },
  iconBtn: { padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94a3b8' },
  checkinPopup: { position: 'fixed', bottom: '32px', right: '32px', width: '300px', backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 1000 },
  emojiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  emojiBtn: { padding: '12px', borderRadius: '12px', border: '1px solid #e8e8e8', backgroundColor: '#f4f4f4', cursor: 'pointer', fontSize: '20px' },
  input: { padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none' },
  btnPrimaryLarge: { padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '800', cursor: 'pointer' },
  btnPrimaryFull: { width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '800', cursor: 'pointer' },
  labelSmall: { fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }
};

export default HR;
