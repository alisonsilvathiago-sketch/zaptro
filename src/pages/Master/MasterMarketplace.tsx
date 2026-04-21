import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Plus, Edit3, Trash2, 
  Search, Filter, ExternalLink, 
  Settings, Zap, Star, LayoutGrid,
  CheckCircle2, XCircle, DollarSign,
  Activity, BarChart2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError } from '../../lib/toast';

const MasterMarketplace: React.FC = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketplace_apps')
      .select('*')
      .order('created_at', { ascending: false });
    
    setApps(data || []);
    setLoading(false);
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('marketplace_apps')
        .update({ is_active: !current })
        .eq('id', id);
      
      if (error) throw error;
      toastSuccess('Status da extensão atualizado!');
      fetchApps();
    } catch (err: any) {
      toastError(err.message);
    }
  };

  const filtered = apps.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div style={styles.headerInfo}>
           <h1 style={styles.title}>Gestão de Hub & Extensões</h1>
           <p style={styles.subtitle}>Controle total sobre os módulos, plugins e integrações da plataforma Logta.</p>
        </div>
        <button style={styles.primaryBtn}>
           <Plus size={20} /> Nova Extensão
        </button>
      </header>

      {/* DASHBOARD STATS */}
      <div style={styles.statsGrid}>
         <div style={styles.statCard}>
            <div style={styles.statIcon}><Zap size={24} color="var(--primary)" /></div>
            <div>
               <p style={styles.statLabel}>Apps Ativos</p>
               <h3 style={styles.statValue}>{apps.filter(a => a.is_active).length}</h3>
            </div>
         </div>
         <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: '#f0fdf4'}}><Activity size={24} color="#10b981" /></div>
            <div>
               <p style={styles.statLabel}>Instalações Totais</p>
               <h3 style={styles.statValue}>1,254</h3>
            </div>
         </div>
         <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: 'rgba(217, 255, 0, 0.12)'}}><BarChart2 size={24} color="#D9FF00" /></div>
            <div>
               <p style={styles.statLabel}>Receita Add-ons (Mês)</p>
               <h3 style={styles.statValue}>R$ 12.450</h3>
            </div>
         </div>
      </div>

      {/* REFINEMENT BAR */}
      <div style={styles.refinement}>
         <div style={styles.searchWrap}>
            <Search size={18} color="#94a3b8" />
            <input 
              style={styles.searchInput} 
              placeholder="Buscar por nome ou slug..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      {/* APPS TABLE */}
      <div style={styles.mainCard}>
         <table style={styles.table}>
            <thead>
               <tr>
                  <th style={styles.th}>Extensão</th>
                  <th style={styles.th}>Categoria</th>
                  <th style={styles.th}>Slug / Ativação</th>
                  <th style={styles.th}>Preço</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Ações</th>
               </tr>
            </thead>
            <tbody>
               {filtered.map(app => (
                 <tr key={app.id} style={styles.tr}>
                    <td style={styles.td}>
                       <div style={styles.appCell}>
                          <div style={styles.iconThumb}><LayoutGrid size={16} /></div>
                          <div style={styles.appInfo}>
                             <span style={styles.appName}>{app.name}</span>
                             <span style={styles.appType}>{app.type}</span>
                          </div>
                       </div>
                    </td>
                    <td style={styles.td}>
                       <span style={styles.catBadge}>{app.category}</span>
                    </td>
                    <td style={styles.td}><code style={styles.slugCode}>{app.slug}</code></td>
                    <td style={styles.td}>
                       <div style={styles.priceCell}>
                          {app.price > 0 ? `R$ ${app.price}` : 'FREE'}
                          <span style={styles.pricePeriod}>{app.price_type}</span>
                       </div>
                    </td>
                    <td style={styles.td}>
                       <button 
                         onClick={() => toggleStatus(app.id, app.is_active)}
                         style={{...styles.statusBtn, color: app.is_active ? '#10b981' : '#64748b'}}
                       >
                          {app.is_active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          {app.is_active ? 'Ativo' : 'Pausado'}
                       </button>
                    </td>
                    <td style={styles.td}>
                       <div style={styles.actions}>
                          <button style={styles.actionBtn}><Edit3 size={16} /></button>
                          <button style={styles.actionBtn}><Star size={16} color={app.is_featured ? '#f97316' : '#cbd5e1'} /></button>
                          <button style={{...styles.actionBtn, color: '#ef4444'}}><Trash2 size={16} /></button>
                       </div>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerInfo: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  title: { fontSize: '28px', fontWeight: '950', color: '#000000', margin: 0, letterSpacing: '-1.2px' },
  subtitle: { fontSize: '15px', color: '#6b7280', margin: 0 },
  primaryBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 16px rgba(217, 255, 0, 0.2)' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' },
  statIcon: { width: '56px', height: '56px', borderRadius: '18px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '12px', fontWeight: '800', color: '#64748b', margin: 0, textTransform: 'uppercase' as const },
  statValue: { fontSize: '24px', fontWeight: '950', color: '#000000', margin: '4px 0 0 0' },

  refinement: { backgroundColor: 'white', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px', borderRight: '1px solid #e8e8e8', width: '400px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', fontWeight: '800', color: '#000000', width: '100%' },

  mainCard: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '20px 32px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '1px', borderBottom: '1px solid #e8e8e8' },
  tr: { borderBottom: '1px solid #e8e8e8', transition: 'background-color 0.2s' },
  td: { padding: '20px 32px', fontSize: '14px', color: '#334155' },
  
  appCell: { display: 'flex', gap: '16px', alignItems: 'center' },
  iconThumb: { width: '40px', height: '40px', backgroundColor: '#f4f4f4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e8e8e8' },
  appInfo: { display: 'flex', flexDirection: 'column' as const },
  appName: { fontSize: '14px', fontWeight: '900', color: '#000000' },
  appType: { fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' as const },

  catBadge: { fontSize: '10px', fontWeight: '900', color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '4px 10px', borderRadius: '8px' },
  slugCode: { fontSize: '12px', fontWeight: '700', color: '#1e293b', backgroundColor: '#ebebeb', padding: '4px 8px', borderRadius: '6px' },
  
  priceCell: { display: 'flex', flexDirection: 'column' as const },
  pricePeriod: { fontSize: '10px', color: '#94a3b8', fontWeight: '800' },
  
  statusBtn: { background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' },
  
  actions: { display: 'flex', gap: '8px' },
  actionBtn: { width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }
};

export default MasterMarketplace;
