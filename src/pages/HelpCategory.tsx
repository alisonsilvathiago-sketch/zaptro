import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, GraduationCap, ArrowRight,
  LayoutDashboard, MessageSquare, CreditCard, 
  Headphones, AlertCircle, ChevronRight, Home
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import SEOManager from '../components/SEOManager';

const IconMap: Record<string, any> = {
  LayoutDashboard,
  MessageSquare,
  GraduationCap,
  CreditCard,
  Headphones,
  AlertCircle
};

const HelpCategory: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCategoryData();
    }
  }, [id]);

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      // Fetch category details
      const { data: catData, error: catError } = await supabase
        .from('knowledge_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (catError) throw catError;
      setCategory(catData);

      // Fetch articles in this category
      const { data: artData, error: artError } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('category_id', id)
        .order('created_at', { ascending: false });

      if (artError) throw artError;
      setArticles(artData || []);
    } catch (err) {
      console.error('Error fetching category data:', err);
      navigate('/ajuda');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Carregando categoria...</div>;
  }

  if (!category) return null;

  const CategoryIcon = IconMap[category.icon] || LayoutDashboard;

  return (
    <div style={styles.container} className="animate-fade-in">
      <SEOManager 
        title={`${category.name} | Central de Ajuda Logta`}
        description={category.description}
      />

      {/* Breadcrumbs */}
      <nav style={styles.breadcrumb}>
        <div style={styles.bcItem} onClick={() => navigate('/ajuda')}>
          <Home size={14} /> Central de Ajuda
        </div>
        <ChevronRight size={14} color="#94a3b8" />
        <div style={{...styles.bcItem, color: 'var(--text-main)', cursor: 'default'}}>
          {category.name}
        </div>
      </nav>

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.iconBox}>
            <CategoryIcon size={32} color="var(--primary)" />
          </div>
          <div>
            <h1 style={styles.title}>{category.name}</h1>
            <p style={styles.subtitle}>{category.description}</p>
          </div>
        </div>
        <div style={styles.articleCount}>
          <strong>{articles.length}</strong> artigos disponíveis
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.articlesGrid}>
          {articles.length === 0 ? (
            <div style={styles.emptyState}>
              <AlertCircle size={48} color="#e2e8f0" />
              <p>Nenhum artigo encontrado nesta categoria ainda.</p>
              <button style={styles.backBtn} onClick={() => navigate('/ajuda')}>Voltar para Home</button>
            </div>
          ) : (
            articles.map(article => (
              <div 
                key={article.id} 
                style={styles.articleCard}
                onClick={() => navigate(`/ajuda/artigo/${article.slug}`)}
              >
                <div style={styles.articleInfo}>
                  <h3 style={styles.articleTitle}>{article.title}</h3>
                  <p style={styles.articleExcerpt}>{article.excerpt}</p>
                </div>
                <div style={styles.articleFooter}>
                  <span>Ler artigo</span>
                  <ArrowRight size={18} />
                </div>
              </div>
            ))
          )}
        </div>

        <aside style={styles.sidebar}>
          <div style={styles.ctaBox}>
            <h3>Não encontrou o que precisava?</h3>
            <p>Nossa equipe técnica pode te ajudar via chat ou chamado direto.</p>
            <button style={styles.contactBtn} onClick={() => navigate('/suporte')}>
              Abrir Chamado
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { minHeight: '100vh', backgroundColor: '#fcfdfe', padding: '120px 40px 80px 40px' },
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' },
  breadcrumb: { 
    maxWidth: '1200px', margin: '0 auto 40px auto', display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '13px', color: '#94a3b8', fontWeight: '500' 
  },
  bcItem: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', '&:hover': { color: 'var(--primary)' } },
  header: { 
    maxWidth: '1200px', margin: '0 auto 60px auto', display: 'flex', justifyContent: 'space-between', 
    alignItems: 'flex-end', paddingBottom: '40px', borderBottom: '1px solid #e2e8f0' 
  },
  headerContent: { display: 'flex', gap: '24px', alignItems: 'center' },
  iconBox: { width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'rgba(217, 255, 0, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '32px', fontWeight: '700', color: '#0F172A', letterSpacing: '-1.5px', marginBottom: '8px' },
  subtitle: { fontSize: '16px', color: '#64748B', maxWidth: '600px' },
  articleCount: { fontSize: '14px', color: '#94a3b8', fontWeight: '600', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e8e8e8' },

  main: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '64px' },
  articlesGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' },
  articleCard: { 
    backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e8e8e8',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
    transition: 'all 0.2s ease', '&:hover': { transform: 'translateX(8px)', borderColor: 'var(--primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }
  },
  articleInfo: { flex: 1, paddingRight: '40px' },
  articleTitle: { fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' },
  articleExcerpt: { fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' },
  articleFooter: { display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary)', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' },

  sidebar: { display: 'flex', flexDirection: 'column', gap: '24px' },
  ctaBox: { padding: '32px', backgroundColor: '#0f172a', borderRadius: '24px', color: 'white' },
  contactBtn: { width: '100%', marginTop: '20px', padding: '14px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' },
  
  emptyState: { textAlign: 'center', padding: '100px 40px', color: '#94a3b8' },
  backBtn: { marginTop: '24px', padding: '10px 20px', backgroundColor: '#ebebeb', border: 'none', borderRadius: '10px', color: '#64748b', fontWeight: '700', cursor: 'pointer' }
};

export default HelpCategory;
