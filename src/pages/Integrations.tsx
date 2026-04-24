import React, { useState, useEffect } from 'react';
import { 
  Plus, Settings2, Key, Globe, 
  CheckCircle2, AlertCircle, RefreshCw, X,
  ShieldCheck, Lock, ExternalLink, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import LogtaModal from '../components/Modal';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';

interface ApiMaster {
  id: string;
  name: string;
  category: string;
  description: string;
  icon_name: string;
  logo_url?: string;
  doc_url?: string;
}

const CATEGORIES = ['Todos', 'Financeiro', 'RH', 'Logistica', 'Atendimento', 'CRM', 'Estoque'];

const Integrations: React.FC = () => {
  const { profile } = useAuth();
  const [availableApis, setAvailableApis] = useState<ApiMaster[]>([]);
  const [myApis, setMyApis] = useState<Record<string, ApiCompany>>({});
  const [loading, setLoading] = useState(true);
  const [selectedApi, setSelectedApi] = useState<ApiMaster | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data: masterData } = await supabase
        .from('apis_master')
        .select('*')
        .eq('status', 'ativo')
        .order('category');
        
      const { data: companyData } = await supabase
        .from('apis_company')
        .select('*')
        .eq('company_id', profile.company_id);
      
      setAvailableApis(masterData || []);
      
      const apiMap: Record<string, ApiCompany> = {};
      companyData?.forEach(item => {
        apiMap[item.api_id] = item;
      });
      setMyApis(apiMap);
    } catch (err) {
      console.error('Fetch Integrations Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.company_id]);

  const handleOpenConfig = (api: ApiMaster) => {
    setSelectedApi(api);
    const myApi = myApis[api.id];
    setApiKey(myApi?.api_key || '');
    setApiUrl(myApi?.api_url || '');
    setIsModalOpen(true);
  };

  const handleConnect = async () => {
    if (!profile?.company_id || !selectedApi) return;
    
    const toastId = toastLoading('Sincronizando credenciais...');
    try {
      const { error } = await supabase
        .from('apis_company')
        .upsert({
          company_id: profile.company_id,
          api_id: selectedApi.id,
          api_key: apiKey,
          api_url: apiUrl,
          status: 'ativo',
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id,api_id' });

      if (error) throw error;
      
      toastDismiss(toastId);
      toastSuccess(`${selectedApi.name} conectado com sucesso!`);
      fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      toastDismiss(toastId);
      toastError('Erro na conexão: ' + err.message);
    }
  };

  const getApiIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageSquare': return <MessageSquare size={24} />;
      case 'CreditCard': return <CreditCard size={24} />;
      case 'Map': return <Globe size={24} />;
      case 'Mail': return <Mail size={24} />;
      case 'ShieldCheck': return <ShieldCheck size={24} />;
      default: return <Layers size={24} />;
    }
  };

  const filteredApis = activeCategory === 'Todos' 
    ? availableApis 
    : availableApis.filter(api => api.category === activeCategory);

  if (loading) return <div style={styles.loading}>Sincronizando catálogo de integrações...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.headerPremium}>
        <div style={styles.headerTitleArea}>
          <div style={styles.headerBadge}><Zap size={14} /> CENTRAL DE INTEGRAÇÕES</div>
          <h1 style={styles.title}>Ecossistema Logta</h1>
          <p style={styles.subtitle}>Potencialize sua operação conectando as ferramentas líderes de mercado diretamente ao seu painel.</p>
        </div>
      </header>

      {/* CATEGORY FILTER */}
      <div style={styles.filterBar}>
         {CATEGORIES.map(cat => (
            <button 
               key={cat} 
               onClick={() => setActiveCategory(cat)}
               style={{
                  ...styles.filterTab,
                  ...(activeCategory === cat ? styles.filterTabActive : {})
               }}
            >
               {cat}
            </button>
         ))}
      </div>

      <div style={styles.grid}>
        {filteredApis.map(api => {
          const config = myApis[api.id];
          const isActive = config?.status === 'ativo';

          return (
            <div key={api.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.logoBox}>
                  {getApiIcon(api.icon_name)}
                </div>
                <div style={styles.badgeArea}>
                  {isActive ? (
                    <span style={styles.statusActive}><CheckCircle2 size={12} /> Ativo</span>
                  ) : (
                    <span style={styles.statusDispo}>Disponível</span>
                  )}
                </div>
              </div>
              
              <h3 style={styles.apiName}>{api.name}</h3>
              <p style={styles.apiDesc}>{api.description}</p>
              
              <div style={styles.cardFooter}>
                <span style={styles.typeTag}>{api.category}</span>
                <button 
                  style={isActive ? styles.configBtn : styles.setupBtn}
                  onClick={() => handleOpenConfig(api)}
                >
                  {isActive ? <Settings2 size={16} /> : <Plus size={16} />}
                  {isActive ? 'Configurar' : 'Conectar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <LogtaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Conectar Integração: ${selectedApi?.name}`}
        width="550px"
      >
         <div style={styles.modalBody}>
            <div style={styles.modalHero}>
               <div style={styles.heroIcon}>{selectedApi && getApiIcon(selectedApi.icon_name)}</div>
               <div>
                  <h4 style={{margin: 0, fontSize: '18px', fontWeight: '700'}}>{selectedApi?.name}</h4>
                  <p style={{fontSize: '12px', color: 'var(--text-muted)', margin: 0}}>Libere automações de {selectedApi?.category.toLowerCase()}.</p>
               </div>
            </div>

            <div style={styles.alertInfo}>
               <ShieldCheck size={18} />
               <p>Suas chaves são protegidas por criptografia de ponta e isolamento Master.</p>
            </div>

            <div style={styles.inputGroup}>
               <label style={styles.label}>Chave de API (API Key / Token)</label>
               <div style={styles.inputWrapper}>
                  <Key size={16} color="var(--text-muted)" />
                  <input 
                    style={styles.input} 
                    type="password" 
                    value={apiKey} 
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Cole seu token aqui..."
                  />
               </div>
            </div>

            {selectedApi?.name.includes('Z-API') && (
               <div style={styles.inputGroup}>
                  <label style={styles.label}>Instância / URL Customizada</label>
                  <div style={styles.inputWrapper}>
                     <Globe size={16} color="var(--text-muted)" />
                     <input 
                       style={styles.input} 
                       value={apiUrl} 
                       onChange={e => setApiUrl(e.target.value)}
                       placeholder="https://api.gateway.com/..."
                     />
                  </div>
               </div>
            )}

            <div style={styles.formActions}>
               <button style={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancelar</button>
               <button style={styles.saveBtn} onClick={handleConnect}>
                  {myApis[selectedApi?.id || ''] ? 'Atualizar Conexão' : 'Validar e Conectar 🚀'}
               </button>
            </div>
         </div>
      </LogtaModal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '40px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  headerPremium: { marginBottom: '40px' },
  headerTitleArea: { display: 'flex', flexDirection: 'column', gap: '8px' },
  headerBadge: { display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content', padding: '6px 14px', backgroundColor: 'rgba(217, 255, 0, 0.18)', color: 'var(--primary)', borderRadius: '30px', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' },
  title: { fontSize: '32px', fontWeight: '700', color: '#000000', letterSpacing: '-1.5px', margin: 0 },
  subtitle: { fontSize: '15px', color: '#64748b', maxWidth: '700px' },
  
  filterBar: { display: 'flex', gap: '8px', marginBottom: '40px', overflowX: 'auto', paddingBottom: '12px' },
  filterTab: { padding: '10px 20px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '600', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  filterTabActive: { backgroundColor: 'var(--primary)', color: 'white', borderColor: 'var(--primary)', boxShadow: '0 4px 12px rgba(217, 255, 0, 0.2)' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  card: { backgroundColor: 'white', borderRadius: '28px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'all 0.3s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  logoBox: { width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid #e2e8f0' },
  badgeArea: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  statusActive: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  statusDispo: { padding: '6px 12px', backgroundColor: '#ebebeb', color: '#64748b', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  apiName: { fontSize: '18px', fontWeight: '700', color: '#000000', marginBottom: '8px' },
  apiDesc: { fontSize: '13px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px', flex: 1 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #e8e8e8' },
  typeTag: { fontSize: '10px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' },
  setupBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  configBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#f4f4f4', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },

  modalBody: { display: 'flex', flexDirection: 'column', gap: '24px', padding: '12px' },
  modalHero: { display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f4f4f4', padding: '20px', borderRadius: '20px' },
  heroIcon: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid #e2e8f0' },
  alertInfo: { display: 'flex', gap: '12px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '14px', color: '#0369a1', fontSize: '13px', fontWeight: '600' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  input: { flex: 1, padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', fontWeight: '600' },
  formActions: { display: 'flex', gap: '12px', marginTop: '12px' },
  cancelBtn: { flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', cursor: 'pointer' },
  saveBtn: { flex: 2, padding: '14px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' },
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: '600', fontSize: '15px' }
};

export default Integrations;
