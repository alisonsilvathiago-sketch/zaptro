import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, ThumbsUp, ThumbsDown, 
  Share2, ChevronRight, Home, LayoutDashboard 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import SEOManager from '../components/SEOManager';

const HelpArticle: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);

  useEffect(() => {
    if (slug) {
      fetchArticle();
      window.scrollTo(0, 0);
    }
  }, [slug]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select(`
          *,
          category:knowledge_categories(*)
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;
      setArticle(data);

      // Increment views
      await supabase.rpc('increment_article_views', { article_id: data.id });

      // Fetch related articles (same category)
      const { data: related } = await supabase
        .from('knowledge_articles')
        .select('title, slug')
        .eq('category_id', data.category_id)
        .neq('id', data.id)
        .limit(5);

      setRelatedArticles(related || []);
    } catch (err) {
      console.error('Error fetching article:', err);
      navigate('/ajuda');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Carregando artigo...</div>;
  }

  if (!article) return null;

  return (
    <div style={styles.container} className="animate-fade-in">
      <SEOManager 
        title={`${article.title} | Central de Ajuda Logta`}
        description={article.excerpt || `Aprenda tudo sobre ${article.title} no guia oficial do Logta.`}
      />

      {/* Breadcrumbs */}
      <nav style={styles.breadcrumb}>
        <div style={styles.bcItem} onClick={() => navigate('/ajuda')}>
          <Home size={14} /> Home
        </div>
        <ChevronRight size={14} color="#94a3b8" />
        <div style={styles.bcItem} onClick={() => navigate(`/ajuda/categoria/${article.category_id}`)}>
          {article.category?.name}
        </div>
        <ChevronRight size={14} color="#94a3b8" />
        <div style={{...styles.bcItem, color: 'var(--text-main)', cursor: 'default'}}>
          Artigo
        </div>
      </nav>

      <main style={styles.main}>
        <article style={styles.article}>
          <header style={styles.header}>
            <button style={styles.backBtn} onClick={() => navigate('/ajuda')}>
              <ArrowLeft size={18} /> Voltar
            </button>
            <h1 style={styles.title}>{article.title}</h1>
            <div style={styles.meta}>
              <div style={styles.metaItem}>
                <Clock size={14} /> 5 min de leitura
              </div>
              <div style={styles.metaItem}>
                Atualizado em {new Date(article.updated_at).toLocaleDateString()}
              </div>
            </div>
          </header>

          <div style={{...styles.content, whiteSpace: 'pre-wrap'}}>
            {article.content}
          </div>

          <footer style={styles.footer}>
            <div style={styles.feedback}>
              <h4 style={styles.feedbackTitle}>Este artigo foi útil?</h4>
              <div style={styles.feedbackBtns}>
                <button style={styles.fBtn}><ThumbsUp size={18} /> Sim</button>
                <button style={styles.fBtn}><ThumbsDown size={18} /> Não</button>
              </div>
            </div>
            <div style={styles.share}>
               <button style={styles.shareBtn}><Share2 size={16} /> Compartilhar</button>
            </div>
          </footer>
        </article>

        <aside style={styles.sidebar}>
          <div style={styles.sidebarBox}>
            <h3 style={styles.sidebarTitle}>Nesta Categoria</h3>
            <div style={styles.relatedList}>
              {relatedArticles.map(rel => (
                <div 
                  key={rel.slug} 
                  style={styles.relatedItem}
                  onClick={() => navigate(`/ajuda/artigo/${rel.slug}`)}
                >
                  {rel.title}
                </div>
              ))}
            </div>
          </div>

          <div style={styles.supportBox}>
             <h3 style={styles.sidebarTitle}>Ainda com dúvida?</h3>
             <p style={styles.supportText}>Nossos especialistas estão prontos para ajudar no que for preciso.</p>
             <button style={styles.contactBtn} onClick={() => navigate('/suporte')}>Falar com Suporte</button>
          </div>
        </aside>
      </main>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { minHeight: '100vh', backgroundColor: 'white', padding: '120px 40px 80px 40px' },
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' },
  breadcrumb: { 
    maxWidth: '1200px', margin: '0 auto 40px auto', display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '13px', color: '#94a3b8', fontWeight: '500' 
  },
  bcItem: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s', '&:hover': { color: 'var(--primary)' } },
  main: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '64px' },
  article: { display: 'flex', flexDirection: 'column' },
  header: { marginBottom: '40px' },
  backBtn: { 
    display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', 
    color: 'var(--primary)', fontWeight: '600', fontSize: '14px', marginBottom: '24px', cursor: 'pointer' 
  },
  title: { fontSize: '36px', fontWeight: '700', color: '#0F172A', letterSpacing: '-1.5px', marginBottom: '16px' },
  meta: { display: 'flex', gap: '24px', fontSize: '13px', color: '#94a3b8', fontWeight: '500' },
  metaItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  
  content: { 
    fontSize: '17px', color: '#334155', lineHeight: '1.8', 
    marginBottom: '60px', borderBottom: '1px solid #e8e8e8', paddingBottom: '60px' 
  },
  
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  feedback: { display: 'flex', alignItems: 'center', gap: '24px' },
  feedbackTitle: { fontSize: '15px', fontWeight: '600', color: '#0f172a' },
  feedbackBtns: { display: 'flex', gap: '8px' },
  fBtn: { 
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
    border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', 
    fontSize: '13px', fontWeight: '700', color: '#64748B', cursor: 'pointer' 
  },
  shareBtn: { 
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
    background: 'none', border: 'none', fontSize: '14px', fontWeight: '700', 
    color: '#94a3b8', cursor: 'pointer' 
  },

  sidebar: { display: 'flex', flexDirection: 'column', gap: '32px' },
  sidebarBox: { padding: '32px', border: '1px solid #e8e8e8', borderRadius: '24px' },
  sidebarTitle: { fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '20px' },
  relatedList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  relatedItem: { 
    fontSize: '14px', color: '#64748B', fontWeight: '600', cursor: 'pointer', 
    transition: 'color 0.2s', '&:hover': { color: 'var(--primary)' } 
  },
  supportBox: { padding: '32px', backgroundColor: '#0f172a', borderRadius: '24px', color: 'white' },
  supportText: { fontSize: '14px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '20px' },
  contactBtn: { 
    width: '100%', padding: '12px', backgroundColor: 'var(--primary)', color: 'white', 
    border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' 
  }
};

export default HelpArticle;
