import React, { useState } from 'react';
import { 
  Search, Calendar, Clock, User, ArrowRight,
  Truck, Briefcase, GraduationCap, Heart, BadgeCheck,
  TrendingUp, MessageSquare, ShieldCheck, Mail, Share2
} from 'lucide-react';
import SEOManager from '../components/SEOManager';

const articles = [
  {
    id: 1,
    category: 'Estratégia White Label',
    title: 'Como a tecnologia White Label está moldando o futuro das transportadoras brasileiras',
    excerpt: 'Descubra por que ter sua própria plataforma de gestão com sua marca é o passo definitivo para a escalabilidade e autoridade no mercado logístico.',
    author: 'Equipe Logta',
    date: '10 de Abril, 2026',
    readTime: '8 min',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000'
  },
  {
    id: 2,
    category: 'Treinamento & Capacitação',
    title: 'Academy Logta: O sistema de treinamentos que reduz acidentes e melhora a produtividade',
    excerpt: 'Treinar sua equipe de motoristas e estoquistas nunca foi tão fácil. Conheça o módulo que está revolucionando a educação corporativa na logística.',
    author: 'Lorena Silva',
    date: '08 de Abril, 2026',
    readTime: '12 min',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=2000'
  },
  {
    id: 3,
    category: 'Logística 4.0',
    title: 'Monitoramento 360°: Do estoque à entrega final em tempo real',
    excerpt: 'Integrar CRM, estoque e rastreamento de frota não é mais luxo, é sobrevivência. Veja como a visibilidade total impacta no seu lucro líquido.',
    author: 'Ricardo Mendes',
    date: '05 de Abril, 2026',
    readTime: '15 min',
    image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaad5b?auto=format&fit=crop&q=80&w=2000'
  },
  {
    id: 4,
    category: 'Saúde & RH',
    title: 'Health Score: Por que cuidar da saúde do motorista aumenta a eficiência operacional?',
    excerpt: 'Conheça a lógica por trás do nosso sistema de saúde ocupacional e como ele ajuda a prevenir afastamentos e garantir viagens seguras.',
    author: 'Dr. Fernando Souza',
    date: '02 de Abril, 2026',
    readTime: '10 min',
    image: 'https://images.unsplash.com/photo-1505751172107-57325a483421?auto=format&fit=crop&q=80&w=2000'
  }
];

const BlogPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div style={styles.container}>
      <SEOManager 
        title="Blog Logta | Inteligência Logística e Gestão White Label"
        description="Acompanhe as últimas tendências em tecnologia para logística. Artigos sobre White Label, Treinamento de Equipes, Gestão de Frota e o futuro do transporte 4.0."
      />

      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.heroContent}>
           <div style={styles.badge}>CONHECIMENTO LOGTA</div>
           <h1 style={styles.title}>Blog de Inteligência Logística</h1>
           <p style={styles.subtitle}>Estratégias, tendências e inovação para transformar sua transportadora em uma potência tecnológica.</p>
           
           <div style={styles.searchBox}>
              <Search size={20} color="#94a3b8" />
              <input 
                 placeholder="O que você deseja aprender hoje?" 
                 style={styles.searchInput}
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
              />
              <button style={styles.searchBtn}>Buscar Artigo</button>
           </div>
        </div>
      </header>

      {/* Categories Bar */}
      <div className="mobile-scroll" style={styles.categoryNav}>
         {['Tudo', 'Logística', 'White Label', 'Treinamentos', 'Financeiro', 'RH', 'Sucesso do Cliente'].map(cat => (
           <button key={cat} style={styles.catBtn}>{cat}</button>
         ))}
      </div>

      {/* Main Grid */}
      <main style={styles.main}>
         <div style={styles.articleGrid}>
            {articles.map(article => (
               <article key={article.id} style={styles.card}>
                  <div style={styles.cardInfo}>
                     <div style={styles.cardHeader}>
                        <span style={styles.cardCat}>{article.category}</span>
                        <div style={styles.meta}>
                           <Calendar size={12} /> {article.date}
                        </div>
                     </div>
                     <h3 style={styles.cardTitle}>{article.title}</h3>
                     <p style={styles.cardExcerpt}>{article.excerpt}</p>
                     
                     <div style={styles.cardFooter}>
                        <div style={styles.authorArea}>
                           <div style={styles.authorAvatar}>{article.author[0]}</div>
                           <p style={styles.authorName}>{article.author}</p>
                        </div>
                        <div style={styles.readMore}>
                           {article.readTime} • Ler Artigo <ArrowRight size={16} />
                        </div>
                     </div>
                  </div>
                  <div style={styles.cardImageArea}>
                     <img src={article.image} alt={article.title} style={styles.cardImg} />
                  </div>
               </article>
            ))}
         </div>

         {/* Sidebar SEO */}
         <aside style={styles.sidebar}>
            <div style={styles.sideCard}>
               <h4 style={styles.sideTitle}>Por que o Logta?</h4>
               <ul style={styles.tagList}>
                  <li><BadgeCheck size={14} /> Marca Própria (White Label)</li>
                  <li><Truck size={14} /> Frota Integrada</li>
                  <li><GraduationCap size={14} /> Academy em Vídeo</li>
                  <li><Heart size={14} /> Health Score</li>
                  <li><ShieldCheck size={14} /> Auditoria Realtime</li>
               </ul>
               <button style={styles.ctaBtn} onClick={() => window.location.href = 'https://app.logta.com.br/register-business'}>Criar minha conta grátis</button>
            </div>

            <div style={styles.newsletter}>
               <h4 style={styles.sideTitle}>Newsletter Estratégica</h4>
               <p style={styles.newsDesc}>Receba pílulas de inteligência logística todas as semanas.</p>
               <div style={styles.newsFlex}>
                  <input placeholder="Seu e-mail..." style={styles.newsInput} />
                  <button style={styles.newsBtn}><Mail size={18} /></button>
               </div>
            </div>
         </aside>
      </main>

      <footer style={styles.footer}>
         <p>© 2026 Logta Business Evolution. Todos os direitos reservados.</p>
         <div style={styles.footerLinks}>
            <a href="#">Privacidade</a>
            <a href="#">Termos</a>
            <a href="#">FAQ</a>
         </div>
      </footer>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { backgroundColor: '#f4f4f4', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  hero: { backgroundColor: '#0F172A', padding: '120px 40px', textAlign: 'center' as const, color: 'white' },
  heroContent: { maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '24px' },
  badge: { fontSize: '11px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '2px', backgroundColor: 'rgba(217, 255, 0, 0.15)', padding: '6px 16px', borderRadius: '30px' },
  title: { fontSize: '48px', fontWeight: '950', letterSpacing: '-2px', margin: 0 },
  subtitle: { fontSize: '18px', color: '#94A3B8', lineHeight: '1.6' },
  searchBox: { 
     width: '100%', maxWidth: '600px', backgroundColor: 'white', borderRadius: '20px', 
     padding: '8px 12px 8px 24px', display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' 
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#1E293B' },
  searchBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: '700', cursor: 'pointer' },

  categoryNav: { display: 'flex', justifyContent: 'center', gap: '12px', padding: '32px 40px', borderBottom: '1px solid #E2E8F0', backgroundColor: 'white' },
  catBtn: { padding: '10px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#64748B', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: '0.2s' },

  main: { maxWidth: '1200px', margin: '60px auto', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px' },
  articleGrid: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  card: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden', transition: 'transform 0.3s ease', cursor: 'pointer', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' } },
  cardInfo: { padding: '40px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardCat: { fontSize: '11px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  meta: { fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' },
  cardTitle: { fontSize: '24px', fontWeight: '900', color: '#0F172A', margin: 0, lineHeight: '1.3' },
  cardExcerpt: { fontSize: '15px', color: '#64748B', lineHeight: '1.6', margin: 0 },
  cardFooter: { marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid #e8e8e8' },
  authorArea: { display: 'flex', alignItems: 'center', gap: '10px' },
  authorAvatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ebebeb', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900' },
  authorName: { fontSize: '13px', fontWeight: '700', color: '#475569', margin: 0 },
  readMore: { fontSize: '13px', fontWeight: '800', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' },
  cardImageArea: { position: 'relative' as const },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover' as const },

  sidebar: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  sideCard: { backgroundColor: '#ebebeb', padding: '32px', borderRadius: '32px', border: '1px solid #E2E8F0' },
  sideTitle: { fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '20px' },
  tagList: { listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  tagListLi: { fontSize: '13px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' },
  ctaBtn: { width: '100%', height: '50px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' },
  
  newsletter: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #E2E8F0' },
  newsDesc: { fontSize: '14px', color: '#64748B', lineHeight: '1.5', marginBottom: '20px' },
  newsFlex: { display: 'flex', gap: '8px' },
  newsInput: { flex: 1, height: '44px', padding: '0 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none' },
  newsBtn: { width: '44px', height: '44px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' },

  footer: { padding: '60px 40px', textAlign: 'center' as const, borderTop: '1px solid #E2E8F0' },
  footerLinks: { display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '13px', color: '#94A3B8' }
};

export default BlogPage;
