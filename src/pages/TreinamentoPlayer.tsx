import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, BookOpen, ChevronLeft, ChevronRight, 
  MessageSquare, FileText, Star, Clock, 
  CheckCircle2, ArrowLeft, Download, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toastSuccess, toastError } from '../lib/toast';

const TreinamentoPlayer: React.FC = () => {
  const { profile } = useAuth();
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'comments' | 'materials'>('content');

  useEffect(() => {
    fetchData();
  }, [courseId, lessonId]);

  const markAsCompleted = async (lId: string) => {
    if (!profile?.id || !courseId) return;
    try {
      await supabase.from('lesson_progress').upsert({
        profile_id: profile.id,
        course_id: courseId,
        lesson_id: lId,
        completed_at: new Date().toISOString()
      }, { onConflict: 'profile_id, lesson_id' });
      fetchData(); // Refresh progress
      toastSuccess('Aula concluída!');
    } catch (err) {
      console.error('Erro ao salvar progresso:', err);
    }
  };

  const fetchComments = async (lId: string) => {
    const { data } = await supabase
      .from('lesson_comments')
      .select('*, profiles(full_name)')
      .eq('lesson_id', lId)
      .order('created_at', { ascending: false });
    if (data) setComments(data);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !profile?.id) return;
    try {
      const { error } = await supabase.from('lesson_comments').insert([{
        profile_id: profile.id,
        course_id: courseId,
        lesson_id: currentLesson.id,
        content: newComment
      }]);
      if (error) throw error;
      setNewComment('');
      fetchComments(currentLesson.id);
      toastSuccess('Comentário enviado!');
    } catch (err: any) {
      toastError(err.message);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    // Fetch course and its modules/lessons
    const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single();
    if (courseData) setCourse(courseData);

    const { data: moduleData } = await supabase
      .from('course_modules')
      .select('*, lessons(*)')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (moduleData) {
      setModules(moduleData);
      
      let lesson = null;
      if (lessonId) {
        moduleData.forEach(m => {
          const found = m.lessons?.find((l: any) => l.id === lessonId);
          if (found) lesson = found;
        });
      }

      if (!lesson && moduleData[0]?.lessons?.[0]) {
        lesson = moduleData[0].lessons[0];
      }
      
      setCurrentLesson(lesson);

      if (lesson && profile?.id) {
        const { data: prog } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('profile_id', profile.id)
          .eq('lesson_id', lesson.id)
          .single();
        setIsCompleted(!!prog);

        // CHECK TOTAL PROGRESS & CERTIFICATE
        const { data: allProg } = await supabase.from('lesson_progress').select('lesson_id').eq('profile_id', profile.id).eq('course_id', courseId);
        const { count: totalLessons } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
        
        const progressPercent = totalLessons ? ((allProg?.length || 0) / totalLessons) * 100 : 0;
        setTotalProgress(progressPercent);

        if (progressPercent >= 100) {
           const { data: cert } = await supabase.from('certificates').select('id').eq('profile_id', profile.id).eq('course_id', courseId).single();
           if (cert) setCertificateId(cert.id);
        }

        fetchComments(lesson.id);
      }
    }
    setLoading(false);
  };

  const handleNext = () => {
    let flatLessons: any[] = [];
    modules.forEach(m => {
       if (m.lessons) flatLessons = [...flatLessons, ...m.lessons];
    });
    
    const currentIndex = flatLessons.findIndex(l => l.id === currentLesson?.id);
    if (currentIndex < flatLessons.length - 1) {
      const next = flatLessons[currentIndex + 1];
      navigate(`/treinamentos/${courseId}/aula/${next.id}`);
    }
  };

  const handlePrev = () => {
    let flatLessons: any[] = [];
    modules.forEach(m => {
       if (m.lessons) flatLessons = [...flatLessons, ...m.lessons];
    });
    
    const currentIndex = flatLessons.findIndex(l => l.id === currentLesson?.id);
    if (currentIndex > 0) {
      const prev = flatLessons[currentIndex - 1];
      navigate(`/treinamentos/${courseId}/aula/${prev.id}`);
    }
  };

  if (loading) return <div style={styles.loading}>Sincronizando sua aula premium...</div>;

  return (
    <div style={styles.container}>
       <header style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(`/treinamentos/${courseId}`)}>
             <ArrowLeft size={20} /> Sair do Player
          </button>
          
          <div style={styles.sidebarHeader}>
             <h3 style={styles.courseTitle}>{course?.name}</h3>
             <div style={styles.progressContainer}>
                <div style={{...styles.progressBar, width: `${totalProgress}%`}} />
             </div>
             <p style={styles.progressText}>{totalProgress.toFixed(0)}% concluído</p>
             
             {totalProgress >= 100 && (
                <button 
                  style={styles.certBtn} 
                  onClick={() => certificateId ? navigate(`/certificados/${certificateId}`) : alert('Gerando seu certificado...')}
                >
                   <Award size={16} /> Emitir Certificado
                </button>
             )}
          </div>
       </header>

       <div style={styles.mainLayout}>
          {/* PLAYER AREA */}
          <div style={styles.playerArea}>
             <div style={styles.videoWrap}>
                {currentLesson?.video_url ? (
                  <iframe 
                    src={currentLesson.video_url} 
                    style={styles.iframe} 
                    frameBorder="0" 
                    allow="autoplay; fullscreen; picture-in-picture" 
                    allowFullScreen
                  />
                ) : (
                  <div style={styles.noVideo}>
                     <Play size={64} color="var(--primary)" />
                     <p>Vídeo indisponível para esta aula no momento.</p>
                  </div>
                )}
             </div>

             <div style={styles.controls}>
                <button style={styles.stepBtn} onClick={handlePrev}><ChevronLeft size={20} /> Aula Anterior</button>
                <button 
                  style={{...styles.stepBtn, ...(isCompleted ? styles.completedBtn : styles.markBtn)}} 
                  onClick={() => markAsCompleted(currentLesson.id)}
                >
                  {isCompleted ? <CheckCircle2 size={20} /> : <Play size={20} />}
                  {isCompleted ? 'Aula Concluída' : 'Marcar como Concluída'}
                </button>
                <button style={{...styles.stepBtn, ...styles.nextBtn}} onClick={handleNext}>Próxima Aula <ChevronRight size={20} /></button>
             </div>

             <div style={styles.lessonTabs}>
                  <button style={{...styles.tabLink, ...(activeTab === 'content' ? styles.tabActive : {})}} onClick={() => setActiveTab('content')}>Descrição</button>
                  <button style={{...styles.tabLink, ...(activeTab === 'materials' ? styles.tabActive : {})}} onClick={() => setActiveTab('materials')}>Materiais ({currentLesson?.material_url ? 1 : 0})</button>
                  <button style={{...styles.tabLink, ...(activeTab === 'comments' ? styles.tabActive : {})}} onClick={() => setActiveTab('comments')}>Dúvidas</button>
             </div>

             <div style={styles.tabContent}>
                  {activeTab === 'content' && (
                    <div className="animate-fade-in">
                       <p style={styles.description}>{currentLesson?.description || 'Nenhuma descrição disponível para esta aula.'}</p>
                    </div>
                  )}
                  {activeTab === 'comments' && (
                    <div style={styles.tabScrollWrap}>
                       <div style={styles.commentForm}>
                          <textarea 
                            style={styles.commentInput} 
                            placeholder="Escreva sua dúvida ou comentário..." 
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                          />
                          <button style={styles.commentBtn} onClick={handleSendComment}>Enviar Comentário</button>
                       </div>
                       <div style={styles.commentList}>
                          {comments.map(c => (
                             <div key={c.id} style={styles.commentItem}>
                                <div style={styles.cUserInitials}>{c.profiles?.full_name?.substring(0, 1)}</div>
                                <div style={styles.cBody}>
                                   <div style={styles.cHeader}>
                                      <span style={styles.cUserName}>{c.profiles?.full_name}</span>
                                      <span style={styles.cDate}>{new Date(c.created_at).toLocaleDateString()}</span>
                                   </div>
                                   <p style={styles.cText}>{c.content}</p>
                                </div>
                             </div>
                          ))}
                          {comments.length === 0 && (
                            <div style={styles.emptyTab} className="animate-fade-in">
                               <MessageSquare size={40} color="#334155" />
                               <p>Seja o primeiro a comentar nesta aula!</p>
                            </div>
                          )}
                       </div>
                    </div>
                  )}
                  {activeTab === 'materials' && (
                     <div style={styles.tabScrollWrap} className="animate-fade-in">
                        {currentLesson?.material_url ? (
                          <div style={styles.materialCard}>
                             <div style={styles.matIcon}><FileText size={24} /></div>
                             <div style={styles.matInfo}>
                                <p style={styles.matName}>Material de Apoio da Aula</p>
                                <p style={styles.matSize}>Documento PDF / Link Externo</p>
                             </div>
                             <a href={currentLesson.material_url} target="_blank" rel="noreferrer" style={styles.downloadBtnLink}>
                                <Download size={18} /> Baixar Material
                             </a>
                          </div>
                        ) : (
                          <div style={styles.emptyTab}>
                             <FileText size={48} color="#334155" />
                             <p>Nenhum material disponível para esta aula.</p>
                          </div>
                        )}
                     </div>
                  )}
             </div>
          </div>

          {/* SIDEBAR NAVIGATION */}
          <aside style={styles.sidebar}>
             <div style={styles.sideHeader}>CONTEÚDO DO CURSO</div>
             <div style={styles.moduleScroll}>
                {modules.map((mod, mIdx) => (
                  <div key={mod.id} style={styles.moduleGroup}>
                     <div style={styles.moduleLabel}>Módulo {mIdx + 1}: {mod.name}</div>
                     <div style={styles.lessonsInSide}>
                        {mod.lessons?.map((l: any) => (
                           <div 
                              key={l.id} 
                              style={{...styles.sideLessonItem, ...(l.id === currentLesson?.id ? styles.activeSideItem : {})}}
                              onClick={() => navigate(`/treinamentos/${courseId}/aula/${l.id}`)}
                           >
                              <div style={styles.sideIconWrap}>
                                 {l.id === currentLesson?.id ? <Play size={14} /> : <CheckCircle2 size={14} color="#10b981" />}
                              </div>
                              <span style={styles.sideLessonName}>{l.name}</span>
                              <span style={styles.sideLessonTime}>{l.duration || '00:00'}</span>
                           </div>
                        ))}
                     </div>
                  </div>
                ))}
             </div>
          </aside>
       </div>
    </div>
  );
};

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column' as const, backgroundColor: '#0F172A', color: 'white' },
  loading: { padding: '100px', textAlign: 'center' as const, color: '#94A3B8', fontSize: '18px' },
  header: { padding: '16px 32px', backgroundColor: '#1E293B', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '24px' },
  backBtn: { background: 'none', border: 'none', color: '#94A3B8', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
  sidebarHeader: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  courseTitle: { margin: 0, fontSize: '13px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  progressContainer: { width: '200px', height: '6px', backgroundColor: '#334155', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s ease' },
  progressText: { margin: 0, fontSize: '11px', fontWeight: '700', color: '#CBD5E1' },
  certBtn: { width: 'fit-content', marginTop: '8px', padding: '6px 14px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', animation: 'pulse 2s infinite' },

  mainLayout: { flex: 1, display: 'grid', gridTemplateColumns: '1fr 350px', overflow: 'hidden' },
  playerArea: { padding: '40px', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  videoWrap: { width: '100%', aspectRatio: '16/9', backgroundColor: 'black', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
  iframe: { width: '100%', height: '100%' },
  noVideo: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#64748B' },
  
  controls: { display: 'flex', justifyContent: 'space-between', marginTop: '8px' },
  stepBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '14px', border: '1px solid #334155', backgroundColor: '#1E293B', color: 'white', fontWeight: '700', cursor: 'pointer' },
  nextBtn: { backgroundColor: 'var(--primary)', border: 'none' },
  markBtn: { backgroundColor: '#334155', border: '1px solid #475569' },
  completedBtn: { backgroundColor: '#10b981', border: 'none' },

  lessonTabs: { display: 'flex', gap: '32px', borderBottom: '1px solid #334155', marginTop: '24px' },
  tabLink: { padding: '16px 4px', border: 'none', background: 'none', color: '#94A3B8', fontWeight: '600', fontSize: '14px', cursor: 'pointer', position: 'relative' as const },
  tabActive: { color: 'white' },
  tabContent: { padding: '24px 0', minHeight: '300px' },
  tabScrollWrap: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  
  description: { fontSize: '16px', lineHeight: '1.6', color: '#CBD5E1' },
  
  commentForm: { display: 'flex', flexDirection: 'column' as const, gap: '12px', padding: '24px', backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid #334155' },
  commentInput: { width: '100%', minHeight: '80px', backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '12px', color: 'white', padding: '16px', fontSize: '14px', outline: 'none', resize: 'none' as const },
  commentBtn: { alignSelf: 'flex-end', padding: '10px 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  commentList: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  commentItem: { display: 'flex', gap: '16px', padding: '16px', borderBottom: '1px solid #334155' },
  cUserInitials: { width: '40px', height: '40px', backgroundColor: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary)', fontSize: '18px' },
  cBody: { flex: 1 },
  cHeader: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '4px' },
  cUserName: { fontSize: '14px', fontWeight: '600', color: 'white' },
  cDate: { fontSize: '11px', color: '#64748B' },
  cText: { fontSize: '14px', color: '#CBD5E1', lineHeight: '1.5', margin: 0 },

  materialCard: { backgroundColor: '#1E293B', padding: '24px', borderRadius: '20px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '20px' },
  matIcon: { width: '56px', height: '56px', backgroundColor: '#334155', color: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  matInfo: { flex: 1 },
  matName: { margin: 0, fontSize: '15px', fontWeight: '600', color: 'white' },
  matSize: { margin: '4px 0 0 0', fontSize: '12px', color: '#94A3B8' },
  downloadBtnLink: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#334155', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: '700', fontSize: '14px', border: '1px solid #475569' },
  
  emptyTab: { textAlign: 'center' as const, padding: '40px', color: '#64748B', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '16px' },

  sidebar: { backgroundColor: '#1E293B', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column' as const },
  sideHeader: { padding: '24px', fontSize: '12px', fontWeight: '700', color: '#94A3B8', letterSpacing: '1px', borderBottom: '1px solid #334155' },
  moduleScroll: { flex: 1, overflowY: 'auto' as const, padding: '16px' },
  moduleGroup: { marginBottom: '24px' },
  moduleLabel: { fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '12px', paddingLeft: '8px' },
  lessonsInSide: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  sideLessonItem: { padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s' },
  activeSideItem: { backgroundColor: 'rgba(217, 255, 0, 0.15)', border: '1px solid rgba(217, 255, 0, 0.3)' },
  sideIconWrap: { width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sideLessonName: { flex: 1, fontSize: '13px', fontWeight: '600', color: '#CBD5E1' },
  sideLessonTime: { fontSize: '10px', color: '#64748B', fontWeight: '700' }
};

export default TreinamentoPlayer;
