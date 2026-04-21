import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Star, ShieldCheck, 
  MapPin, MessageSquare, Box, 
  DollarSign, Users, BarChart3, 
  GraduationCap, Link as LinkIcon,
  ChevronRight, Search, Filter, 
  CheckCircle2, Plus, ArrowRight,
  Zap, Info, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApps } from '../hooks/useApps';
import { toastSuccess, toastError } from '../lib/toast';

const IconMap: Record<string, any> = {
  MapPin, MessageSquare, Box, DollarSign, Users, BarChart3, GraduationCap, Link: LinkIcon
};

const Marketplace: React.FC = () => {
  const { profile } = useAuth();
  const { isInstalled } = useApps();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketplace_apps')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false });
    
    setApps(data || []);
    setLoading(false);
  };

  const handleInstall = async (app: any) => {
    if (isInstalled(app.slug)) return;

    if (app.price > 0) {
      toastSuccess(`Redirecionando para o checkout Logta do ${app.name}...`);
      // Aqui integraria com o Checkout Global que o usuário aprovou
      window.location.href = `/checkout/${app.id}`;
      return;
    }

    try {
      const { error } = await supabase.from('company_apps').insert([{
        company_id: profile?.company_id,
        app_id: app.id,
        is_active: true
      }]);

      if (error) throw error;
      toastSuccess(`${app.name} instalado com sucesso!`);
      window.location.reload(); // Recarregar para atualizar Sidebar/Contexto
    } catch (err: any) {
      toastError('Erro na instalação: ' + err.message);
    }
  };

  const filteredApps = category === 'ALL' ? apps : apps.filter(a => a.category === category);

  if (loading) return <div style={styles.loader}>Sincronizando Catálogo de Soluções...</div>;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* HERO BANNER */}
      <div style={styles.hero}>
         <div style={styles.heroText}>
            <div style={styles.heroBadge}><Zap size={14} /> Logta Hub Platform</div>
            <h1 style={styles.heroTitle}>Transforme seu SaaS em uma Plataforma Infinita</h1>
            <p style={styles.heroSubtitle}>Adicione ferramentas de rastreamento, automação e inteligência logística com um único clique.</p>
         </div>
         <div style={styles.heroStats}>
            <div style={styles.heroStat}>
               <span style={styles.statNum}>8+</span>
               <span style={styles.statLabel}>Soluções</span>
            </div>
            <div style={styles.heroStat}>
               <span style={styles.statNum}>100%</span>
               <span style={styles.statLabel}>Seguro</span>
            </div>
         </div>
      </div>

      {/* FILTER TABS */}
      <div style={styles.filters}>
         {['ALL', 'LOGISTICS', 'CRM', 'FINANCE', 'RH', 'INTEGRATION', 'ACADEMY'].map(cat => (
           <button 
             key={cat} 
             onClick={() => setCategory(cat)} 
             style={{...styles.filterBtn, ...(category === cat ? styles.filterActive : {})}}
           >
             {cat.replace('ALL', 'Explorar Todos')}
           </button>
         ))}
      </div>

      {/* APPS GRID */}
      <div style={styles.grid}>
         {filteredApps.map(app => {
           const Icon = IconMap[app.icon_name] || Box;
           const installed = isInstalled(app.slug);
           
           return (
             <div key={app.id} style={styles.card}>
                <div style={styles.cardHeader}>
                   <div style={styles.iconWrap}><Icon size={24} color="var(--primary)" /></div>
                   {app.is_featured && <span style={styles.featuredBadge}><Star size={10} /> Destaque</span>}
                </div>
                
                <h3 style={styles.appName}>{app.name}</h3>
                <p style={styles.appDescription}>{app.description}</p>
                
                <div style={styles.appMeta}>
                   <div style={styles.categoryTag}>{app.category}</div>
                   <div style={styles.priceTag}>
                      {app.price === 0 ? 'Gratuito' : `R$ ${app.price}/${app.price_type === 'MONTHLY' ? 'mês' : 'avulso'}`}
                   </div>
                </div>

                <button 
                  style={{...styles.installBtn, ...(installed ? styles.installedBtn : {})}}
                  onClick={() => handleInstall(app)}
                >
                   {installed ? (
                     <> <CheckCircle2 size={16} /> Já Instalado </>
                   ) : (
                     <> <Plus size={16} /> {app.price > 0 ? 'Adquirir' : 'Instalar Agora'} </>
                   )}
                </button>
                
                {!installed && (
                   <button style={styles.detailsBtn}><Info size={14} /> Ver Detalhes</button>
                )}
             </div>
           );
         })}
      </div>

      {/* PARTNER BANNER */}
      <div style={styles.partnerSection}>
         <div style={styles.partnerInfo}>
            <h3 style={styles.pTitle}>Gostaria de integrar o seu sistema favorito?</h3>
            <p style={styles.pText}>Desenvolvedores podem criar extensões para o ecossistema Logta. Conheça nosso SDK.</p>
         </div>
         <button style={styles.partnerBtn}>Ver todos os plugins <ArrowRight size={18} /></button>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', display: 'flex', flexDirection: 'column' as const, gap: '40px' },
  loader: { padding: '100px', textAlign: 'center' as const, color: 'var(--primary)', fontWeight: '900' },
  
  hero: { 
    background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', 
    padding: '60px 80px', 
    borderRadius: '40px', 
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 25px 50px -12px rgba(49, 46, 129, 0.4)'
  },
  heroText: { maxWidth: '600px', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#A5B4FC', padding: '6px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', width: 'fit-content', display: 'flex', alignItems: 'center', gap: '8px' },
  heroTitle: { fontSize: '42px', fontWeight: '950', margin: 0, letterSpacing: '-1.5px', lineHeight: '1.1' },
  heroSubtitle: { fontSize: '18px', color: '#C7D2FE', margin: 0, lineHeight: '1.6' },
  heroStats: { display: 'flex', gap: '40px' },
  heroStat: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  statNum: { fontSize: '32px', fontWeight: '950', color: 'white' },
  statLabel: { fontSize: '13px', fontWeight: '800', color: '#A5B4FC' },

  filters: { display: 'flex', gap: '12px', pading: '0 8px', overflowX: 'auto' as const },
  filterBtn: { padding: '12px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontSize: '13px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' as const },
  filterActive: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '32px' },
  card: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', padding: '32px', display: 'flex', flexDirection: 'column' as const, gap: '16px', transition: 'transform 0.3s, border-color 0.3s', cursor: 'pointer' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconWrap: { width: '56px', height: '56px', borderRadius: '18px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  featuredBadge: { backgroundColor: '#fff7ed', color: '#f97316', fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' as const },
  appName: { fontSize: '18px', fontWeight: '900', color: '#111827', margin: 0 },
  appDescription: { fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: 0, flex: 1 },
  appMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  categoryTag: { fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  priceTag: { fontSize: '13px', fontWeight: '900', color: 'var(--primary)' },
  installBtn: { width: '100%', padding: '14px', borderRadius: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', fontWeight: '900', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  installedBtn: { backgroundColor: '#f0fdf4', color: '#10b981', cursor: 'default' },
  detailsBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: '800', cursor: 'pointer' },

  partnerSection: { padding: '40px 60px', backgroundColor: '#f8fafc', borderRadius: '32px', border: '2px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  partnerInfo: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  pTitle: { fontSize: '18px', fontWeight: '900', color: '#111827', margin: 0 },
  pText: { fontSize: '14px', color: '#64748b', margin: 0 },
  partnerBtn: { backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '14px 24px', borderRadius: '16px', color: '#334155', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }
};

export default Marketplace;
