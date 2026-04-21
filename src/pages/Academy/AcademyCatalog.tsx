import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, BookOpen, Star, Clock, 
  ArrowRight, ShieldCheck, CreditCard, 
  ChevronRight, Play, CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AcademyCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicCourses = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('status', 'publicado')
          .is('company_id', null); // Apenas cursos globais do Master

        if (error) throw error;
        setCourses(data || []);
      } catch (err) {
        console.error('Erro Catálogo:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicCourses();
  }, []);

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
           <span style={styles.badge}>FORMAÇÃO PREMIUM PARA TRANSPORTES</span>
           <h1 style={styles.heroTitle}>Acelere sua Carreira na <span style={styles.highlight}>Logta Academy</span></h1>
           <p style={styles.heroSubtitle}>Os melhores treinamentos técnicos e operacionais para profissionais de logística, frotas e gestão de transportes.</p>
           <div style={styles.heroActions}>
              <button style={styles.primaryBtn}>Ver Cursos Disponíveis</button>
              <button style={styles.secondaryBtn} onClick={() => navigate('/login')}>Acessar Minha Conta</button>
           </div>
        </div>
      </section>

      {/* Stats Divider */}
      <div style={styles.statsRow}>
         <div style={styles.statItem}><CheckCircle size={20} color="var(--primary)" /> <span>Certificados Reconhecidos</span></div>
         <div style={styles.statItem}><CheckCircle size={20} color="var(--primary)" /> <span>Acesso Vitalício em cursos master</span></div>
         <div style={styles.statItem}><CheckCircle size={20} color="var(--primary)" /> <span>Suporte de Especialistas</span></div>
      </div>

      {/* Catalog Grid */}
      <section style={styles.catalogSection}>
         <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Nossos Treinamentos</h2>
            <p style={styles.sectionDesc}>Cursos focados em resultados práticos para sua operação.</p>
         </div>

         {loading ? (
            <div style={styles.loader}>Conectando ao servidor de ensino...</div>
         ) : (
            <div style={styles.grid}>
               {courses.length === 0 ? (
                  <p style={styles.empty}>Nenhum curso disponível publicamente no momento.</p>
               ) : (
                  courses.map(course => (
                     <div key={course.id} style={styles.card}>
                        <div style={styles.cardCover}>
                           {course.thumbnail_url ? (
                              <img src={course.thumbnail_url} alt={course.name} style={styles.coverImg} />
                           ) : (
                              <div style={styles.placeholderCover}><BookOpen size={48} /></div>
                           )}
                           <div style={styles.priceTag}>R$ {course.price?.toFixed(2) || '0,00'}</div>
                        </div>
                        <div style={styles.cardBody}>
                           <span style={styles.category}>{course.category || 'Logística'}</span>
                           <h3 style={styles.cTitle}>{course.name}</h3>
                           <p style={styles.cDesc}>{course.description?.substring(0, 100)}...</p>
                           
                           <div style={styles.cardMeta}>
                              <div style={styles.mItem}><Clock size={14} /> <span>8h de conteúdo</span></div>
                              <div style={styles.mItem}><Star size={14} color="#f59e0b" fill="#f59e0b" /> <span>4.9</span></div>
                           </div>

                           <button style={styles.buyBtn} onClick={() => navigate(`/checkout/${course.id}`)}>
                              Comprar Agora <ArrowRight size={18} />
                           </button>
                        </div>
                     </div>
                  ))
               )}
            </div>
         )}
      </section>

      {/* Trust Section */}
      <section style={styles.trustSection}>
         <div style={styles.trustCard}>
            <ShieldCheck size={48} color="var(--primary)" />
            <h3>Ambiente 100% Seguro</h3>
            <p>Pagamentos processados via Gateway Asaas com criptografia de ponta a ponta.</p>
            <div style={styles.paymentIcons}>
               <CreditCard size={24} /> <span>Cartão de Crédito, PIX e Boleto</span>
            </div>
         </div>
      </section>

      {/* Corporate Lead */}
      <section style={styles.corporateLead}>
         <h2>Quer transformar sua empresa?</h2>
         <p>Libere o poder da Logta Academy para todo o seu time com gestão centralizada de RH.</p>
         <button style={styles.corpBtn} onClick={() => window.location.href='https://www.logta.com.br'}>Conhecer Planos Corporativos</button>
      </section>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#ffffff', minHeight: '100vh' },
  hero: { 
    padding: '120px 40px 100px', 
    background: 'radial-gradient(circle at top right, #f8fafc, #ffffff)',
    textAlign: 'center' as const 
  },
  heroContent: { maxWidth: '900px', margin: '0 auto' },
  badge: { 
    fontSize: '11px', fontWeight: '900', color: 'var(--primary)', 
    backgroundColor: 'var(--primary-light)', padding: '6px 16px', 
    borderRadius: '30px', letterSpacing: '1px' 
  },
  heroTitle: { fontSize: '56px', fontWeight: '950', color: '#1e293b', marginTop: '24px', letterSpacing: '-2px', lineHeight: '1.1' },
  highlight: { color: 'var(--primary)' },
  heroSubtitle: { fontSize: '20px', color: '#64748b', marginTop: '24px', lineHeight: '1.6', maxWidth: '700px', margin: '24px auto' },
  heroActions: { display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px' },
  primaryBtn: { padding: '16px 32px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '16px', border: 'none', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' },
  secondaryBtn: { padding: '16px 32px', backgroundColor: '#f1f5f9', color: '#1e293b', borderRadius: '16px', border: 'none', fontWeight: '800', cursor: 'pointer' },

  statsRow: { 
    maxWidth: '1200px', margin: '0 auto', display: 'flex', 
    justifyContent: 'center', gap: '48px', padding: '40px', 
    borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' 
  },
  statItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '700', color: '#475569' },

  catalogSection: { padding: '100px 40px', maxWidth: '1200px', margin: '0 auto' },
  sectionHeader: { textAlign: 'center' as const, marginBottom: '64px' },
  sectionTitle: { fontSize: '36px', fontWeight: '900', color: '#1e293b' },
  sectionDesc: { fontSize: '18px', color: '#64748b', marginTop: '12px' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '32px' },
  card: { 
    backgroundColor: '#ffffff', borderRadius: '28px', border: '1px solid #f1f5f9', 
    overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }
  },
  cardCover: { height: '220px', position: 'relative' as const, backgroundColor: '#f8fafc' },
  coverImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  placeholderCover: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' },
  priceTag: { 
    position: 'absolute' as const, bottom: '16px', right: '16px', 
    backgroundColor: '#16a34a', color: 'white', padding: '8px 16px', 
    borderRadius: '12px', fontWeight: '900', fontSize: '16px' 
  },
  
  cardBody: { padding: '28px', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  category: { fontSize: '11px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase' as const },
  cTitle: { fontSize: '20px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.5px' },
  cDesc: { fontSize: '15px', color: '#64748b', lineHeight: '1.6' },
  cardMeta: { display: 'flex', gap: '24px', alignItems: 'center' },
  mItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#94a3b8' },
  
  buyBtn: { 
    marginTop: '12px', padding: '16px', backgroundColor: '#1e293b', 
    color: 'white', border: 'none', borderRadius: '16px', 
    fontWeight: '800', cursor: 'pointer', display: 'flex', 
    alignItems: 'center', justifyContent: 'center', gap: '10px' 
  },
  
  loader: { padding: '100px', textAlign: 'center' as const, color: 'var(--primary)', fontWeight: '800' },
  empty: { textAlign: 'center' as const, gridColumn: '1 / -1', padding: '100px', color: '#94a3b8' },

  trustSection: { padding: '100px 40px', backgroundColor: '#fcfcfd' },
  trustCard: { 
    maxWidth: '800px', margin: '0 auto', backgroundColor: '#ffffff', 
    padding: '60px', borderRadius: '40px', textAlign: 'center' as const,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9'
  },
  paymentIcons: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px', fontWeight: '700', color: '#64748b' },

  corporateLead: { 
    padding: '100px 40px', backgroundColor: 'var(--primary)', 
    color: 'white', textAlign: 'center' as const 
  },
  corpBtn: { 
    marginTop: '32px', padding: '18px 40px', backgroundColor: 'white', 
    color: 'var(--primary)', border: 'none', borderRadius: '18px', 
    fontWeight: '900', cursor: 'pointer' 
  }
};

export default AcademyCatalog;
