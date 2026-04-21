import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, X, Video, FileText, ChevronDown, 
  ChevronUp, MoreVertical, Play, ArrowLeft,
  Layout, BookOpen, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import LogtaModal from '../components/Modal';

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const [newModule, setNewModule] = useState({ name: '' });
  const [newLesson, setNewLesson] = useState({ name: '', description: '', video_url: '', material_url: '' });

  const canManage = profile?.role === 'ADMIN' || (profile?.permissions as string[])?.includes('gerenciar_treinamentos');

  const fetchCourseData = useCallback(async () => {
    setLoading(true);
    const { data: courseData } = await supabase.from('courses').select('*').eq('id', id).single();
    if (courseData) setCourse(courseData);

    const { data: moduleData } = await supabase
      .from('course_modules')
      .select('*, lessons(*)')
      .eq('course_id', id)
      .order('order_index', { ascending: true });

    if (moduleData) setModules(moduleData);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetchCourseData();
  }, [fetchCourseData]);

  const handleAddModule = async (e: React.FormEvent) => {
    if (!id) return;
    const { error } = await supabase.from('course_modules').insert([{
      course_id: id,
      name: newModule.name,
      order_index: modules.length
    }]);
    if (!error) {
      setShowModuleModal(false);
      setNewModule({ name: '' });
      fetchCourseData();
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    if (!activeModule || !id) return;
    const { error } = await supabase.from('lessons').insert([{
      course_id: id,
      module_id: activeModule,
      name: newLesson.name,
      description: newLesson.description,
      video_url: newLesson.video_url,
      material_url: (newLesson as any).material_url,
      order_index: 0
    }]);
    if (!error) {
      setShowLessonModal(false);
      setNewLesson({ name: '', description: '', video_url: '', material_url: '' });
      fetchCourseData();
    }
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>Carregando treinamento...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/treinamentos')}>
          <ArrowLeft size={20} /> Voltar
        </button>
        <div style={styles.courseHeader}>
           <div style={styles.badge}>{course?.segment}</div>
           <h1 style={styles.title}>{course?.name}</h1>
           <p style={styles.subtitle}>{course?.description}</p>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.modulesHeader}>
           <h2 style={styles.sectionTitle}>Módulos e Aulas</h2>
           {canManage && (
             <button style={styles.addBtn} onClick={() => setShowModuleModal(true)}>
               <Plus size={18} /> Novo Módulo
             </button>
           )}
        </div>

        <div style={styles.moduleList}>
          {modules.map((mod, idx) => (
            <div key={mod.id} style={styles.moduleCard}>
               <div style={styles.moduleHeader}>
                  <div style={styles.moduleTitleRow}>
                     <Layout size={18} color="var(--primary)" />
                     <h3 style={styles.moduleName}>{mod.name}</h3>
                  </div>
                  {canManage && (
                    <button style={styles.miniAddBtn} onClick={() => { setActiveModule(mod.id); setShowLessonModal(true); }}>
                       <Plus size={16} /> Adicionar Aula
                    </button>
                  )}
               </div>

               <div style={styles.lessonList}>
                  {mod.lessons?.map((lesson: any) => (
                    <div key={lesson.id} style={styles.lessonItem} onClick={() => navigate(`/treinamentos/${id}/aula/${lesson.id}`)}>
                       <Video size={16} color="var(--text-muted)" />
                       <span style={styles.lessonName}>{lesson.name}</span>
                       <button style={styles.playBtn}><Play size={14} /></button>
                    </div>
                  ))}
                  {(!mod.lessons || mod.lessons.length === 0) && (
                    <p style={styles.emptyText}>Nenhuma aula neste módulo.</p>
                  )}
               </div>
            </div>
          ))}
          {modules.length === 0 && (
            <div style={styles.emptyState}>
               <BookOpen size={48} color="var(--border)" />
               <p>Comece criando o primeiro módulo deste treinamento.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <LogtaModal isOpen={showModuleModal} onClose={() => setShowModuleModal(false)} title="Adicionar Módulo">
         <div style={styles.formGroup}>
            <label style={styles.label}>Nome do Módulo</label>
            <input 
              style={styles.input} 
              value={newModule.name}
              onChange={e => setNewModule({name: e.target.value})}
              placeholder="Ex: Introdução ao CRM"
            />
            <button style={styles.submitBtn} onClick={handleAddModule}>Salvar Módulo</button>
         </div>
      </LogtaModal>

      <LogtaModal isOpen={showLessonModal} onClose={() => setShowLessonModal(false)} title="Adicionar Aula">
         <div style={styles.form}>
            <div style={styles.inputGroup}>
               <label style={styles.label}>Nome da Aula</label>
               <input style={styles.input} value={newLesson.name} onChange={e => setNewLesson({...newLesson, name: e.target.value})} />
            </div>
            <div style={styles.inputGroup}>
               <label style={styles.label}>URL do Vídeo (YouTube/Vimeo)</label>
               <input style={styles.input} value={newLesson.video_url} onChange={e => setNewLesson({...newLesson, video_url: e.target.value})} />
            </div>
            <div style={styles.inputGroup}>
               <label style={styles.label}>Link para Material (PDF/Slide)</label>
               <input style={styles.input} placeholder="Link do Google Drive, Dropbox, etc." value={(newLesson as any).material_url} onChange={e => setNewLesson({...newLesson, material_url: e.target.value} as any)} />
            </div>
            <div style={styles.inputGroup}>
               <label style={styles.label}>Descrição</label>
               <textarea style={styles.textarea} value={newLesson.description} onChange={e => setNewLesson({...newLesson, description: e.target.value})} />
            </div>
            <button style={styles.submitBtn} onClick={handleAddLesson}>Salvar Aula</button>
         </div>
      </LogtaModal>
    </div>
  );
};

const styles = {
  container: { padding: '40px' },
  header: { marginBottom: '40px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', marginBottom: '24px' },
  courseHeader: { backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '32px', border: '1px solid var(--border)' },
  badge: { display: 'inline-block', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontSize: '10px', fontWeight: '800', padding: '6px 12px', borderRadius: '10px', marginBottom: '16px', textTransform: 'uppercase' as const },
  title: { fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' },
  subtitle: { fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.6' },
  content: { marginTop: '40px' },
  modulesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  sectionTitle: { fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' },
  moduleList: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  moduleCard: { backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' },
  moduleHeader: { padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-app)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  moduleTitleRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  moduleName: { fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' },
  miniAddBtn: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--primary)', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' },
  lessonList: { padding: '8px' },
  lessonItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderRadius: '16px', transition: 'background 0.2s', cursor: 'pointer' },
  lessonName: { flex: 1, fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' },
  playBtn: { width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'var(--bg-app)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' },
  emptyText: { padding: '24px', textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: '14px' },
  emptyState: { padding: '80px', textAlign: 'center' as const, color: 'var(--text-muted)' },
  
  // Modais
  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none' },
  textarea: { padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', height: '80px', resize: 'none' as const },
  submitBtn: { padding: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' }
};

export default CourseDetail;
