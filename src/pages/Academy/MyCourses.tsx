import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, BookOpen, Clock, 
  Award, Search, Filter,
  Star, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const AcademyMyCourses: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyCourses = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select(`
            *,
            course:courses(*)
          `)
          .eq('profile_id', profile?.id)
          .eq('status', 'ativo');

        if (error) throw error;
        setCourses(data?.map(e => e.course) || []);
      } catch (err) {
        console.error('Erro Academy:', err);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.id) fetchMyCourses();
  }, [profile?.id]);

  return (
    <div style={styles.container}>
       <header style={styles.header}>
          <h1 style={styles.title}>Bem-vindo de volta, {profile?.full_name?.split(' ')[0]}!</h1>
          <p style={styles.subtitle}>Você tem {courses.length} cursos ativos em sua conta.</p>
       </header>

       {loading ? (
         <div style={styles.loading}>Sincronizando sua biblioteca...</div>
       ) : courses.length === 0 ? (
         <div style={styles.emptyState}>
            <Award size={64} color="#e2e8f0" style={{marginBottom: '20px'}} />
            <h2>Sua estante está vazia</h2>
            <p>Você ainda não adquiriu nenhum treinamento. Explore nosso catálogo master para começar.</p>
            <button style={styles.browseBtn}>Ver Cursos Disponíveis</button>
         </div>
       ) : (
         <div style={styles.grid}>
            {courses.map(course => (
              <div key={course.id} style={styles.card} onClick={() => navigate(`/treinamentos/${course.id}`)}>
                 <div style={styles.cardCover}>
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt="Capa" style={styles.coverImg} />
                    ) : (
                      <div style={styles.placeholderCover}><BookOpen size={40} /></div>
                    )}
                 </div>
                 <div style={styles.cardBody}>
                    <span style={styles.category}>{course.category || 'Treinamento'}</span>
                    <h3 style={styles.cTitle}>{course.name}</h3>
                    
                    <div style={styles.progressContainer}>
                       <div style={styles.progressLabel}>
                          <span>Progresso</span>
                          <span>0%</span>
                       </div>
                       <div style={styles.progressBar}>
                          <div style={{...styles.progressFill, width: '0%'}} />
                       </div>
                    </div>

                    <button style={styles.continueBtn}>
                       <Play size={14} fill="currentColor" /> Começar Agora
                    </button>
                 </div>
              </div>
            ))}
         </div>
       )}
    </div>
  );
};

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  header: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1e293b', letterSpacing: '-1px' },
  subtitle: { fontSize: '16px', color: '#64748b', fontWeight: '500' },
  
  loading: { padding: '100px', textAlign: 'center' as const, color: 'var(--primary)', fontWeight: '600' },
  
  grid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
    gap: '32px' 
  },
  
  card: { 
    backgroundColor: 'white', borderRadius: '24px', 
    border: '1px solid #e2e8f0', overflow: 'hidden', 
    cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'
  },
  cardCover: { height: '160px', width: '100%', backgroundColor: '#ebebeb' },
  coverImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  placeholderCover: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' },
  
  cardBody: { padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  category: { fontSize: '10px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' as const, letterSpacing: '1px' },
  cTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b', height: '40px', overflow: 'hidden' },
  
  progressContainer: { display: 'flex', flexDirection: 'column' as const, gap: '6px', marginTop: '8px' },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: '#94a3b8' },
  progressBar: { height: '6px', backgroundColor: '#ebebeb', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'var(--primary)', borderRadius: '3px' },
  
  continueBtn: { 
    marginTop: '8px', padding: '12px', borderRadius: '14px', border: 'none', 
    backgroundColor: '#1e293b', color: 'white', fontWeight: '600', 
    fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
    gap: '8px', cursor: 'pointer' 
  },
  
  emptyState: { 
    padding: '100px 40px', textAlign: 'center' as const, 
    backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0' 
  },
  browseBtn: { 
    marginTop: '24px', padding: '14px 28px', backgroundColor: 'var(--primary)', 
    color: 'white', border: 'none', borderRadius: '14px', fontWeight: '600', cursor: 'pointer' 
  }
};

export default AcademyMyCourses;
