import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, ArrowLeft, ArrowRight, Home, 
  ChevronRight, AlertCircle, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import SEOManager from '../components/SEOManager';

const HelpSearch: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(query);

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select(`
          *,
          category:knowledge_categories(name)
        `)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/ajuda/busca?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <SEOManager 
        title={`Resultados para "${query}" | Central de Ajuda Logta`}
        description={`Encontramos ${results.length} resultados para sua busca na Central de Ajuda.`}
      />

      {/* Breadcrumbs */}
      <nav style={styles.breadcrumb}>
        <div style={styles.bcItem} onClick={() => navigate('/ajuda')}>
          <Home size={14} /> Central de Ajuda
        </div>
        <ChevronRight size={14} color="#94a3b8" />
        <div style={{...styles.bcItem, color: 'var(--text-main)', cursor: 'default'}}>
          Busca
        </div>
      </nav>

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Resultados para "{query}"</h1>
          <p style={styles.subtitle}>Encontramos {results.length} artigos que podem te ajudar.</p>
        </div>
        
        <form style={styles.searchBox} onSubmit={handleNewSearch}>
           <Search size={20} color="#94a3b8" />
           <input 
             type="text" 
             style={styles.searchInput} 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             placeholder="Tentar outra busca..."
           />
           <button type="submit" style={styles.searchBtn}>Buscar</button>
        </form>
      </header>

      <main style={styles.main}>
        <div style={styles.resultsList}>
          {loading ? (
             <div style={styles.loading}>Pesquisando no guia oficial...</div>
          ) : results.length === 0 ? (
            <div style={styles.emptyState}>
              <AlertCircle size={64} color="#e2e8f0" />
              <h3>Nenhum resultado encontrado</h3>
              <p>Tente termos mais genéricos ou acesse uma categoria diretamente.</p>
              <button style={styles.backBtn} onClick={() => navigate('/ajuda')}>
                <ArrowLeft size={16} /> Voltar para Home
              </button>
            </div>
          ) : (
            results.map(article => (
              <div 
                key={article.id} 
                style={styles.resultCard}
                onClick={() => navigate(`/ajuda/artigo/${article.slug}`)}
              >
                <div style={styles.categoryBadge}>{article.category?.name}</div>
                <h3 style={styles.articleTitle}>{article.title}</h3>
                <p style={styles.articleExcerpt}>{article.excerpt}</p>
                <div style={styles.cardFooter}>
                   <div style={styles.meta}>
                      <Clock size={14} /> 5 min leitura
                   </div>
                   <div style={styles.link}>
                      Ler artigo <ArrowRight size={16} />
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { minHeight: '100vh', backgroundColor: '#fcfdfe', padding: '120px 40px 80px 40px' },
  breadcrumb: { 
    maxWidth: '1200px', margin: '0 auto 40px auto', display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '13px', color: '#94a3b8', fontWeight: '500' 
  },
  bcItem: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', '&:hover': { color: 'var(--primary)' } },
  
  header: { 
    maxWidth: '1200px', margin: '0 auto 60px auto', display: 'flex', justifyContent: 'space-between', 
    alignItems: 'center', gap: '40px' 
  },
  headerContent: { flex: 1 },
  title: { fontSize: '32px', fontWeight: '950', color: '#0F172A', letterSpacing: '-1.5px', marginBottom: '8px' },
  subtitle: { fontSize: '16px', color: '#64748B' },
  
  searchBox: { 
    flex: 1, maxWidth: '500px', backgroundColor: 'white', borderRadius: '18px', 
    padding: '6px 6px 6px 20px', display: 'flex', alignItems: 'center', gap: '12px', 
    border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '15px' },
  searchBtn: { padding: '10px 20px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' },

  main: { maxWidth: '1200px', margin: '0 auto' },
  loading: { padding: '80px', textAlign: 'center', color: '#64748B', fontWeight: '600' },
  emptyState: { textAlign: 'center', padding: '100px 40px', color: '#94a3b8' },
  backBtn: { marginTop: '24px', padding: '12px 24px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#0f172a', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' },

  resultsList: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px' },
  resultCard: { 
    backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #f1f5f9',
    cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px',
    '&:hover': { borderColor: 'var(--primary)', transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.05)' }
  },
  categoryBadge: { width: 'fit-content', padding: '4px 10px', backgroundColor: '#f5f3ff', color: 'var(--primary)', borderRadius: '8px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' },
  articleTitle: { fontSize: '20px', fontWeight: '900', color: '#1e293b' },
  articleExcerpt: { fontSize: '15px', color: '#64748B', lineHeight: '1.6' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #f8fafc' },
  meta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' },
  link: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '800', fontSize: '14px' }
};

export default HelpSearch;
