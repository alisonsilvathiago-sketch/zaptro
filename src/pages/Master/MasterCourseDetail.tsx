import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Video, FileText, ChevronDown, 
  ChevronUp, Play, ArrowLeft, Layout, 
  Trash2, Edit2, Save, X, Eye, 
  Move, MoreVertical, Upload
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import LogtaModal from '../../components/Modal';

const MasterCourseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const [newModule, setNewModule] = useState({ name: '' });
  const [newLesson, setNewLesson] = useState({ 
    name: '', 
    description: '', 
    video_url: '', 
    storage_video_path: '',
    material_url: '',
    duration: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cData, error: cErr } = await supabase.from('courses').select('*').eq('id', id).single();
      if (cErr) throw cErr;
      setCourse(cData);

      const { data: mData, error: mErr } = await supabase
        .from('course_modules')
        .select('*, lessons(*)')
        .eq('course_id', id)
        .order('order_index', { ascending: true });
      
      if (mErr) throw mErr;
      setModules(mData || []);
    } catch (err: any) {
      toastError('Erro ao carregar curso: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddModule = async () => {
    try {
      const { error } = await supabase.from('course_modules').insert([{
        course_id: id,
        name: newModule.name,
        order_index: modules.length
      }]);
      if (error) throw error;
      toastSuccess('Módulo adicionado!');
      setNewModule({ name: '' });
      setShowModuleModal(false);
      fetchData();
    } catch (err: any) {
      toastError(err.message);
    }
  };

  const handleAddLesson = async () => {
    try {
      const { error } = await supabase.from('lessons').insert([{
        course_id: id,
        module_id: activeModuleId,
        ...newLesson,
        order_index: 0 // Simplificado para exemplo
      }]);
      if (error) throw error;
      toastSuccess('Aula adicionada com sucesso!');
      setNewLesson({ name: '', description: '', video_url: '', storage_video_path: '', material_url: '', duration: '' });
      setShowLessonModal(false);
      fetchData();
    } catch (err: any) {
      toastError(err.message);
    }
  };

  if (loading) return <div style={styles.loading}>Sincronizando grade curricular...</div>;

  return (
    <div style={styles.container} className="animate-fade-in">
       <header style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/master/configuracoes')}>
             <ArrowLeft size={18} /> Voltar ao Hub
          </button>
          <div style={styles.cHeaderInfo}>
             <div style={styles.badge}>{course?.segment?.toUpperCase()}</div>
             <h1 style={styles.title}>{course?.name}</h1>
             <p style={styles.subtitle}>{course?.description}</p>
          </div>
       </header>

       <div style={styles.content}>
          <div style={styles.sectionHeader}>
             <h2 style={styles.secTitle}>Grade Curricular (Módulos)</h2>
             <button style={styles.addBtn} onClick={() => setShowModuleModal(true)}>
                <Plus size={18} /> Novo Módulo
             </button>
          </div>

          <div style={styles.moduleList}>
             {modules.map((mod, idx) => (
                <div key={mod.id} style={styles.moduleCard}>
                   <div style={styles.modHeader}>
                      <div style={styles.modTitleWrap}>
                         <div style={styles.modIndex}>{idx + 1}</div>
                         <h3 style={styles.modName}>{mod.name}</h3>
                      </div>
                      <div style={styles.modActions}>
                         <button style={styles.lessonAddBtn} onClick={() => { setActiveModuleId(mod.id); setShowLessonModal(true); }}>
                            <Plus size={16} /> Adicionar Aula
                         </button>
                         <button style={styles.iconBtn}><Edit2 size={16} /></button>
                         <button style={{...styles.iconBtn, color: '#ef4444'}}><Trash2 size={16} /></button>
                      </div>
                   </div>

                   <div style={styles.lessonList}>
                      {mod.lessons?.map((lesson: any) => (
                         <div key={lesson.id} style={styles.lessonItem}>
                            <div style={styles.lessonIcon}><Play size={14} /></div>
                            <div style={styles.lessonInfo}>
                               <span style={styles.lessonName}>{lesson.name}</span>
                               <span style={styles.lessonMeta}>
                                  {lesson.duration || '00:00'} • {lesson.video_url ? 'Link Externo' : 'Hospedado no Storage'}
                               </span>
                            </div>
                            <div style={styles.lessonActions}>
                               {lesson.material_url && <FileText size={16} color="var(--primary)" title="Tem Material" />}
                               <button style={styles.iconBtn}><Edit2 size={14} /></button>
                            </div>
                         </div>
                      ))}
                      {(!mod.lessons || mod.lessons.length === 0) && (
                        <p style={styles.emptyText}>Nenhuma aula neste módulo ainda.</p>
                      )}
                   </div>
                </div>
             ))}
          </div>
       </div>

       {/* Modais */}
       <LogtaModal isOpen={showModuleModal} onClose={() => setShowModuleModal(false)} title="Criar Novo Módulo">
          <div style={styles.form}>
             <div style={styles.fGroup}>
                <label style={styles.fLabel}>Nome do Módulo</label>
                <input 
                  style={styles.input} 
                  value={newModule.name} 
                  onChange={e => setNewModule({name: e.target.value})}
                  placeholder="Ex: Introdução ao Mercado Logístico"
                />
             </div>
             <button style={styles.submitBtn} onClick={handleAddModule}>Cadastrar Módulo</button>
          </div>
       </LogtaModal>

       <LogtaModal isOpen={showLessonModal} onClose={() => setShowLessonModal(false)} title="Adicionar Aula ao Módulo">
          <div style={styles.form}>
             <div style={styles.fGroup}>
                <label style={styles.fLabel}>Nome da Aula</label>
                <input style={styles.input} value={newLesson.name} onChange={e => setNewLesson({...newLesson, name: e.target.value})} />
             </div>
             <div style={styles.fGrid}>
                <div style={styles.fGroup}>
                   <label style={styles.fLabel}>URL do Vídeo (Youtube/Vimeo)</label>
                   <input style={styles.input} value={newLesson.video_url} onChange={e => setNewLesson({...newLesson, video_url: e.target.value})} />
                </div>
                <div style={styles.fGroup}>
                   <label style={styles.fLabel}>Duração</label>
                   <input style={styles.input} placeholder="Ex: 12:45" value={newLesson.duration} onChange={e => setNewLesson({...newLesson, duration: e.target.value})} />
                </div>
             </div>
             <div style={styles.fGroup}>
                <label style={styles.fLabel}>Caminho Supabase Storage (Privado)</label>
                <div style={styles.storageBox}>
                   <input style={styles.input} placeholder="videos/curso1/aula1.mp4" value={newLesson.storage_video_path} onChange={e => setNewLesson({...newLesson, storage_video_path: e.target.value})} />
                   <button style={styles.uploadBtn} title="Upload Direct"><Upload size={18} /></button>
                </div>
             </div>
             <div style={styles.fGroup}>
                <label style={styles.fLabel}>Link de Material de Apoio (PDF/Docs)</label>
                <input style={styles.input} value={newLesson.material_url} onChange={e => setNewLesson({...newLesson, material_url: e.target.value})} />
             </div>
             <div style={styles.fGroup}>
                <label style={styles.fLabel}>Descrição da Aula</label>
                <textarea style={styles.textarea} value={newLesson.description} onChange={e => setNewLesson({...newLesson, description: e.target.value})} />
             </div>
             <button style={styles.submitBtn} onClick={handleAddLesson}>Publicar Aula</button>
          </div>
       </LogtaModal>
    </div>
  );
};

const styles = {
  container: { padding: '0', display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  loading: { padding: '100px', textAlign: 'center' as const, color: 'var(--primary)', fontWeight: '800' },
  header: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  backBtn: { background: 'none', border: 'none', color: '#64748b', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', width: 'fit-content' },
  cHeaderInfo: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0' },
  badge: { display: 'inline-block', padding: '6px 14px', backgroundColor: '#f1f5f9', color: '#1e293b', fontSize: '10px', fontWeight: '900', borderRadius: '12px', marginBottom: '16px', letterSpacing: '0.5px' },
  title: { fontSize: '28px', fontWeight: '950', color: '#111827', margin: '0 0 12px 0', letterSpacing: '-1px' },
  subtitle: { fontSize: '16px', color: '#6b7280', margin: 0, lineHeight: '1.6' },

  content: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  secTitle: { fontSize: '18px', fontWeight: '900', color: '#111827' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' },

  moduleList: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  moduleCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  modHeader: { padding: '20px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modTitleWrap: { display: 'flex', alignItems: 'center', gap: '16px' },
  modIndex: { width: '28px', height: '28px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900' },
  modName: { fontSize: '15px', fontWeight: '800', color: '#111827' },
  modActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  lessonAddBtn: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' },
  iconBtn: { padding: '8px', borderRadius: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },

  lessonList: { display: 'flex', flexDirection: 'column' as const, padding: '12px' },
  lessonItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '16px', transition: 'background 0.2s' },
  lessonIcon: { width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' },
  lessonInfo: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  lessonName: { fontSize: '14px', fontWeight: '700', color: '#1e293b' },
  lessonMeta: { fontSize: '11px', color: '#94a3b8', fontWeight: '600' },
  lessonActions: { display: 'flex', alignItems: 'center', gap: '12px' },
  emptyText: { padding: '24px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '13px' },

  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  fGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  fGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  fLabel: { fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  input: { padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#111827', fontWeight: '700', outline: 'none', width: '100%' },
  textarea: { padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#111827', fontWeight: '700', outline: 'none', height: '100px', resize: 'none' as const },
  submitBtn: { padding: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '900', cursor: 'pointer' },
  storageBox: { display: 'flex', gap: '8px' },
  uploadBtn: { width: '48px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
};

export default MasterCourseDetail;
