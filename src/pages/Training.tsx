import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Award, Plus, X, BookOpen, 
  Search, Filter, Clock, Star, Layout, 
  CheckCircle2, ChevronRight, Video, TrendingUp, Users, History,
  Lock
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import ExportButton from '../components/ExportButton';

const Training: React.FC = () => {
  const { company } = useTenant();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'catalogo' | 'meu-progresso' | 'ad'>('dashboard');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    segment: 'Operacional'
  });

  const segments = ['Operacional', 'Logística', 'Financeiro', 'Frota', 'Estoque', 'RH', 'Segurança', 'Comercial', 'Administrativo', 'Direção Defensiva'];
  const canManage = profile?.role === 'ADMIN' || profile?.role === 'MASTER_ADMIN';
  const isModuleActive = profile?.metadata?.modules?.treinamentos || profile?.role === 'ADMIN' || profile?.role === 'MASTER_ADMIN';

  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);

  const fetchCourses = async () => {
    if (!isModuleActive) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Cursos Internos da Empresa
      const { data: internal, error: iErr } = await supabase
        .from('courses')
        .select('*')
        .eq('company_id', profile?.company_id);

      if (!iErr) setCourses(internal || []);

      // 2. Cursos Comprados (Matrículas) do Master
      const { data: enrolled, error: eErr } = await supabase
        .from('enrollments')
        .select('*, course:courses(*)')
        .eq('profile_id', profile?.id);

      if (!eErr) setEnrolledCourses(enrolled?.map(e => e.course) || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [profile?.company_id]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .insert([{
          ...newCourse,
          company_id: profile?.company_id,
          created_by: profile?.id
        }]);

      if (error) throw error;
      setNewCourse({ name: '', description: '', segment: 'Operacional' });
      setShowAddModal(false);
      fetchCourses();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const renderDashboard = () => (
    <div className="animate-fade-in" style={styles.dashboardSection}>
       <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Cursos Disponíveis</p><h2 style={styles.kpiValue}>{courses.length}</h2></div>
             <Video size={32} color="var(--primary)" />
          </div>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Tempo Total Conteúdo</p><h2 style={styles.kpiValue}>24h 45m</h2></div>
             <Clock size={32} color="#D9FF00" />
          </div>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Pessoas Assistindo</p><h2 style={styles.kpiValue}>1.240</h2></div>
             <Users size={32} color="#D9FF00" />
          </div>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Taxa de Conclusão</p><h2 style={styles.kpiValue}>92%</h2></div>
             <CheckCircle2 size={32} color="var(--success)" />
          </div>
       </div>
    </div>
  );

  const renderCatalog = () => (
    <div className="animate-fade-in">
      <div style={styles.filterRow}>
        <div style={styles.searchBox}>
          <Search size={18} color="var(--text-muted)" />
          <input type="text" placeholder="O que você quer aprender hoje?" style={styles.searchInput} />
        </div>
      </div>

      <div style={styles.courseGrid}>
         {courses.map(course => (
           <div key={course.id} style={styles.courseCard} onClick={() => navigate(`/treinamentos/${course.id}`)}>
              <div style={styles.courseHeader}>
                 <div style={styles.iconBox}><BookOpen size={24} color="var(--accent)" /></div>
                 <span style={styles.segmentBadge}>{course.segment}</span>
              </div>
              <h3 style={styles.courseTitle}>{course.name}</h3>
              <p style={styles.courseDesc}>{course.description?.substring(0, 80)}...</p>
              
              <div style={styles.courseFooter}>
                 <div style={styles.meta}><Clock size={14} /> 6 aulas</div>
                 <ChevronRight size={18} color="var(--text-muted)" />
              </div>
           </div>
         ))}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
       <header style={styles.headerPremium}>
        <div style={styles.headerTitleArea}>
          <div style={styles.headerBadge}>UNIVERSIDADE CORPORATIVA & LMS</div>
          <h1 style={styles.title}>Centro de Academy</h1>
          <p style={{color: 'var(--text-muted)', fontSize: '14px'}}>Gerencie o conhecimento e capacitação da sua equipe.</p>
        </div>
        
        <div className="mobile-scroll" style={styles.tabNavCompact}>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'dashboard' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('dashboard')}>
            <TrendingUp size={18} /> <span>Gestão & KPIs</span>
          </button>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'catalogo' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('catalogo')}>
            <BookOpen size={18} /> <span>Materiais Internos</span>
          </button>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'meus-cursos' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('meus-cursos')}>
            <Layout size={18} /> <span>Minha Trilha</span>
          </button>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'meu-progresso' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('meu-progresso')}>
            <Award size={18} /> <span>Certificações</span>
          </button>
        </div>
      </header>

      {canManage && activeTab === 'catalogo' && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: 'flex-end' }}>
          <ExportButton filename="Catalogo-Treinamentos" />
          <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
            <Plus size={20} /> Adicionar Curso
          </button>
        </div>
      )}

      {!isModuleActive ? (
        <div style={styles.upgradeCard}>
           <Lock size={48} color="var(--primary)" />
           <h2>Sistema de Treinamentos Desativado</h2>
           <p>Sua empresa ainda não possui o add-on de LMS ativo. Entre em contato com o suporte para liberar cursos internos e de parceiros.</p>
           <button style={styles.addBtn}>Ver Planos de Upgrade</button>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'meus-cursos' && (
            <div style={styles.courseGrid}>
               {enrolledCourses.length === 0 ? (
                 <p style={styles.empty}>Você ainda não possui nenhum curso liberado.</p>
               ) : (
                 enrolledCourses.map(course => (
                   <div key={course.id} style={styles.courseCard} onClick={() => navigate(`/treinamentos/${course.id}`)}>
                      <div style={styles.courseHeader}>
                         <div style={styles.iconBox}><Video size={24} color="var(--primary)" /></div>
                         <span style={styles.segmentBadge}>{course.segment}</span>
                      </div>
                      <h3 style={styles.courseTitle}>{course.name}</h3>
                      <button style={styles.playBtn}><Play size={14} /> Retomar Aula</button>
                   </div>
                 ))
               )}
            </div>
          )}
          {activeTab === 'catalogo' && renderCatalog()}
          {activeTab === 'meu-progresso' && (
            <div style={styles.emptyView}>
               <Award size={64} color="#e5e7eb" />
               <h2>Seus Certificados</h2>
               <p>Conclua 100% das aulas de um curso para emitir seu certificado aqui.</p>
            </div>
          )}
          
          {loading && <p style={{textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)'}}>Sincronizando universidade corporativa...</p>}
        </>
      )}

      {/* Modal Adicionar Curso */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Criar Novo Treinamento">
        <form onSubmit={handleAddCourse} style={styles.form}>
           <div style={styles.inputGroup}>
              <label style={styles.label}>Nome do Curso</label>
              <input 
                style={styles.input} 
                required 
                value={newCourse.name}
                onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                placeholder="Ex: Treinamento de Direção Defensiva"
              />
           </div>
           
           <div style={styles.inputGroup}>
              <label style={styles.label}>Segmento</label>
              <select 
                style={styles.select}
                value={newCourse.segment}
                onChange={e => setNewCourse({...newCourse, segment: e.target.value})}
              >
                 {segments.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>

           <div style={styles.inputGroup}>
              <label style={styles.label}>Descrição</label>
              <textarea 
                style={styles.textarea} 
                required 
                value={newCourse.description}
                onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                placeholder="O que os alunos vão aprender neste curso?"
              />
           </div>

           <button type="submit" style={styles.submitBtn} disabled={saving}>
              {saving ? 'Criando...' : 'Salvar e Próximo'}
           </button>
        </form>
      </Modal>
    </div>
  );
};

const styles = {
  container: { padding: '32px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  headerPremium: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap' as const, gap: '24px' },
  headerTitleArea: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  headerBadge: { display: 'inline-block', width: 'fit-content', padding: '4px 12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '30px', fontSize: '10px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1px' },
  tabNavCompact: { display: 'flex', gap: '8px', backgroundColor: 'rgba(241, 245, 249, 0.5)', padding: '6px', borderRadius: '18px', border: '1px solid var(--border)', overflowX: 'auto' as const, scrollbarWidth: 'none' as const },
  tabBtnCompact: { 
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', 
    padding: '10px 16px', borderRadius: '14px', border: 'none', backgroundColor: 'transparent', 
    fontWeight: '700', color: '#94A3B8', cursor: 'pointer', transition: 'all 0.2s', 
    minWidth: '80px', fontSize: '11px' 
  },
  tabBtnActive: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' },
  
  dashboardSection: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' },
  kpiCard: { backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: '8px' },
  kpiInfo: { display: 'flex', flexDirection: 'column' as const },
  kpiValue: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)' },

  addBtn: {
    backgroundColor: 'var(--primary)', color: 'white', border: 'none', 
    padding: '12px 24px', borderRadius: '12px', fontWeight: '700', 
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s'
  },
  filterRow: { marginBottom: '32px' },
  searchBox: { 
    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', 
    backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' 
  },
  searchInput: { border: 'none', outline: 'none', backgroundColor: 'transparent', flex: 1, color: 'var(--text-main)', fontWeight: '500' },
  courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' },
  courseCard: { 
    backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '24px', 
    border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', flexDirection: 'column' as const, gap: '16px', boxShadow: 'var(--shadow-sm)'
  },
  courseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  segmentBadge: { fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' as const, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '4px 8px', borderRadius: '8px' },
  courseTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' },
  courseDesc: { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' },
  courseFooter: { marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' },
  meta: { fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' },
  playBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', width: '100%', justifyContent: 'center', backgroundColor: '#f4f4f4', border: '1px solid #e2e8f0', borderRadius: '12px', color: 'var(--primary)', fontWeight: '800', cursor: 'pointer', marginTop: '10px' },
  upgradeCard: { textAlign: 'center' as const, padding: '80px', backgroundColor: 'white', borderRadius: '32px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '20px' },
  emptyView: { textAlign: 'center' as const, padding: '100px', backgroundColor: 'white', borderRadius: '32px', border: '1px solid var(--border)', color: '#94a3b8' },
  empty: { textAlign: 'center' as const, padding: '40px', color: 'var(--text-muted)', gridColumn: '1 / -1' }
};

export default Training;
