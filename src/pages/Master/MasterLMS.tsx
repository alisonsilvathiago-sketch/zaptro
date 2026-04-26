import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, BookOpen, Search, Filter, Video, 
  Trash2, Edit2, Play, Users, DollarSign, 
  CheckCircle, History, Layers, ExternalLink, 
  MoreVertical, Save, X, FileText, Layout,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import LogtaModal from '../../components/Modal';

const MasterLMS: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'master' | 'empresas' | 'metricas'>('master');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    segment: 'Transporte',
    price: 0,
    status: 'rascunho' as 'rascunho' | 'publicado'
  });

  const fetchCourses = async () => {
    setLoading(true);
    try {
      // No Master Admin, buscamos todos os cursos
      const { data, error } = await supabase
        .from('courses')
        .select('*, company:companies(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const tid = toastLoading('Registrando curso no catálogo global...');

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([{
          ...newCourse,
          company_id: null, // Master course
        }])
        .select()
        .single();

      if (error) throw error;
      
      toastDismiss(tid);
      toastSuccess('Curso Master criado com sucesso! 🚀');
      setShowAddModal(false);
      fetchCourses();
    } catch (err: any) {
      toastDismiss(tid);
      toastError('Erro ao criar curso: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    if (activeTab === 'master') return c.company_id === null;
    if (activeTab === 'empresas') return c.company_id !== null;
    return true;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
       <header style={styles.header}>
          <div>
             <h2 style={styles.title}>Gestão de Educação Global</h2>
             <p style={styles.subtitle}>Gerencie cursos proprietários e monitore treinamentos de empresas.</p>
          </div>
          <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
             <Plus size={18} /> Novo Curso Master
          </button>
       </header>

       <div style={styles.tabNav}>
          <button 
            style={{...styles.tabBtn, ...(activeTab === 'master' ? styles.tabActive : {})}} 
            onClick={() => setActiveTab('master')}
          >
             <BookOpen size={18} /> Cursos Master
          </button>
          <button 
            style={{...styles.tabBtn, ...(activeTab === 'empresas' ? styles.tabActive : {})}} 
            onClick={() => setActiveTab('empresas')}
          >
             <Layers size={18} /> Cursos das Empresas
          </button>
          <button 
            style={{...styles.tabBtn, ...(activeTab === 'metricas' ? styles.tabActive : {})}} 
            onClick={() => setActiveTab('metricas')}
          >
             <TrendingUp size={18} /> Métricas de Venda
          </button>
       </div>

       <div style={styles.grid}>
          {loading ? (
             <div style={styles.loading}>Sincronizando catálogo...</div>
          ) : filteredCourses.length === 0 ? (
             <div style={styles.empty}>Nenhum curso encontrado nesta categoria.</div>
          ) : (
            filteredCourses.map(course => (
              <div key={course.id} style={styles.card} onClick={() => navigate(`/master/treinamentos/${course.id}`)}>
                 <div style={styles.cardHeader}>
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt="Cover" style={styles.cover} />
                    ) : (
                      <div style={styles.placeholderCover}><Video size={32} /></div>
                    )}
                    <span style={{
                      ...styles.statusBadge, 
                      backgroundColor: course.status === 'publicado' ? '#ecfdf5' : '#fef3c7',
                      color: course.status === 'publicado' ? '#10b981' : '#d97706'
                    }}>
                      {course.status.toUpperCase()}
                    </span>
                 </div>
                 <div style={styles.cardBody}>
                    <h3 style={styles.cTitle}>{course.name}</h3>
                    <p style={styles.cDesc}>{course.description?.substring(0, 80)}...</p>
                    {course.company && <div style={styles.owner}>Empresa: <b>{course.company.name}</b></div>}
                    <div style={styles.footer}>
                       <div style={styles.price}>
                          {course.price > 0 ? (
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(course.price)
                          ) : 'Gratuito'}
                       </div>
                       <button style={styles.editBtn} title="Editar Conteúdo">
                          <Edit2 size={16} />
                       </button>
                    </div>
                 </div>
              </div>
            ))
          )}
       </div>

       {/* Modal Adicionar Curso */}
       <LogtaModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Lançar Curso Master">
          <form onSubmit={handleCreateCourse} style={styles.form}>
             <div style={styles.fGroup}>
                <label style={styles.fLabel}>Título do Curso</label>
                <input 
                  style={styles.input} 
                  required 
                  value={newCourse.name}
                  onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                  placeholder="Ex: Formação em Gestão de Frotas 4.0"
                />
             </div>
             <div style={styles.fGrid}>
                <div style={styles.fGroup}>
                   <label style={styles.fLabel}>Segmento</label>
                   <input 
                      style={styles.input} 
                      value={newCourse.segment}
                      onChange={e => setNewCourse({...newCourse, segment: e.target.value})}
                      placeholder="Ex: Logística"
                   />
                </div>
                <div style={styles.fGroup}>
                   <label style={styles.fLabel}>Preço de Venda (R$)</label>
                   <input 
                      style={styles.input} 
                      type="number"
                      step="0.01"
                      value={newCourse.price}
                      onChange={e => setNewCourse({...newCourse, price: parseFloat(e.target.value)})}
                      placeholder="0.00"
                   />
                </div>
             </div>
             <div style={styles.fGroup}>
                <label style={styles.fLabel}>Descrição Completa</label>
                <textarea 
                  style={styles.textarea} 
                  required
                  value={newCourse.description}
                  onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                  placeholder="Descreva o que os alunos aprenderão..."
                />
             </div>
             <div style={styles.fGroup}>
                <label style={styles.fLabel}>Status Inicial</label>
                <select 
                  style={styles.input} 
                  value={newCourse.status}
                  onChange={e => setNewCourse({...newCourse, status: e.target.value as any})}
                >
                   <option value="rascunho">Rascunho (Privado)</option>
                   <option value="publicado">Publicado (Venda Ativa)</option>
                </select>
             </div>
             <button type="submit" style={styles.submitBtn} disabled={saving}>
                {saving ? 'Publicando...' : 'Salvar Curso Master'}
             </button>
          </form>
       </LogtaModal>
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' },
  tabNav: { display: 'flex', gap: '8px', padding: '6px', backgroundColor: '#ebebeb', borderRadius: '14px', width: 'fit-content' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'none', color: '#64748b', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  tabActive: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginTop: '16px' },
  card: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const, transition: 'transform 0.2s', cursor: 'pointer' },
  cardHeader: { position: 'relative' as const, height: '160px', backgroundColor: '#f4f4f4' },
  cover: { width: '100%', height: '100%', objectFit: 'cover' as const },
  placeholderCover: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' },
  statusBadge: { position: 'absolute' as const, top: '12px', right: '12px', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700' },
  cardBody: { padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' as const },
  cTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' },
  cDesc: { fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' },
  owner: { fontSize: '11px', color: '#94a3b8', marginTop: 'auto', marginBottom: '12px' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e8e8e8' },
  price: { fontSize: '16px', fontWeight: '700', color: '#10b981' },
  editBtn: { padding: '8px', borderRadius: '10px', backgroundColor: 'var(--bg-app)', border: 'none', color: 'var(--primary)', cursor: 'pointer' },
  empty: { padding: '80px', textAlign: 'center' as const, color: '#94a3b8', border: '2px dashed var(--border)', borderRadius: '24px', gridColumn: '1 / -1' },
  loading: { padding: '80px', textAlign: 'center' as const, color: 'var(--primary)', gridColumn: '1 / -1', fontWeight: '700' },

  // Form
  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  fGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  fGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  fLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  input: { padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', backgroundColor: '#f4f4f4', color: 'var(--text-main)', outline: 'none' },
  textarea: { padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', backgroundColor: '#f4f4f4', color: 'var(--text-main)', outline: 'none', height: '100px', resize: 'none' as const },
  submitBtn: { marginTop: '12px', padding: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer' }
};

export default MasterLMS;
