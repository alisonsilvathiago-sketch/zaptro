import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Check, Shield, Zap, 
  Settings, Save, Globe, Info, Clock,
  Edit2, Package, Users, Truck, MessageSquare,
  AlertCircle, ChevronRight, Plus, RefreshCw, BarChart3,
  Key, Database, Smartphone, ShieldCheck, DollarSign,
  Layers, ArrowUpRight, Copy, CheckCircle2, Bookmark,
  BookOpen, Trash2, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import LogtaModal from '../../components/Modal';
import type { MasterCatalogProduct, MasterProductType } from '../../types/index';

const MasterPlans: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MasterProductType>('SaaS_PLAN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<MasterCatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Partial<MasterCatalogProduct> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('master_products_catalog')
        .select('*')
        .order('price', { ascending: true });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      toastError('Erro ao carregar catálogo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (product?: MasterCatalogProduct) => {
    setSelectedProduct(product || {
      name: '',
      type: activeTab,
      price: 0,
      billing_cycle: activeTab === 'WHATSAPP_CREDITS' || activeTab === 'COURSE' ? 'ONETIME' : 'MONTHLY',
      credits_amount: 0,
      features: {},
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!selectedProduct?.name) return toastError('O nome é obrigatório.');
    
    const toastId = toastLoading('Salvando produto...');
    try {
      const { error } = await supabase
        .from('master_products_catalog')
        .upsert(selectedProduct);
      
      if (error) throw error;
      toastSuccess('Catálogo atualizado!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toastError('Erro ao salvar no catálogo.');
    } finally {
      toastDismiss(toastId);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este item do catálogo permanentemente?')) return;
    try {
      const { error } = await supabase.from('master_products_catalog').delete().eq('id', id);
      if (error) throw error;
      toastSuccess('Item removido.');
      fetchData();
    } catch (err) {
      toastError('Erro ao remover item.');
    }
  };

  const filteredProducts = products.filter(p => p.type === activeTab);

  const getIconForType = (type: MasterProductType) => {
    switch (type) {
      case 'SaaS_PLAN': return <Layers size={18} />;
      case 'WHATSAPP_ACTIVATION': return <MessageSquare size={18} />;
      case 'WHATSAPP_CREDITS': return <Zap size={18} />;
      case 'COURSE': return <BookOpen size={18} />;
      default: return <Package size={18} />;
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <div style={styles.badge}>MOTOR DE RECEITA HÍBRIDA</div>
          <h1 style={styles.title}>Modelagem de Ofertas</h1>
          <p style={styles.subtitle}>Gerencie Planos, Add-ons de WhatsApp, Créditos e Cursos em um só lugar.</p>
        </div>
        <div style={styles.headerActions}>
           <button style={styles.refreshBtn} onClick={fetchData} title="Recarregar Catálogo"><RefreshCw size={18} /></button>
           <button style={styles.saveBtn} onClick={() => handleOpenModal()}>
              <Plus size={18} /> Adicionar Oferta
           </button>
        </div>
      </header>

      {/* TABS DE PRODUTOS */}
      <div style={styles.tabContainer}>
         {[
           { id: 'SaaS_PLAN', label: 'Planos SaaS' },
           { id: 'WHATSAPP_ACTIVATION', label: 'WhatsApp Ativação' },
           { id: 'WHATSAPP_CREDITS', label: 'Créditos WhatsApp' },
           { id: 'COURSE', label: 'Cursos / Treinamentos' }
         ].map(tab => (
           <div 
             key={tab.id}
             style={{...styles.tabLink, ...(activeTab === tab.id ? styles.tabActive : {})}}
             onClick={() => setActiveTab(tab.id as MasterProductType)}
           >
             {getIconForType(tab.id as MasterProductType)} {tab.label}
           </div>
         ))}
      </div>

      {/* PLANS GRID */}
      <div style={styles.plansGrid}>
         {loading ? (
           <div style={{gridColumn: 'span 4', textAlign: 'center', padding: '100px', color: '#94a3b8'}}>Sincronizando catálogo mestre...</div>
         ) : filteredProducts.length === 0 ? (
           <div style={{gridColumn: 'span 4', textAlign: 'center', padding: '100px', backgroundColor: '#f8fafc', borderRadius: '32px', border: '2px dashed #e2e8f0'}}>
              <Package size={48} color="#cbd5e1" style={{marginBottom: '16px'}} />
              <p style={{fontWeight: '700', color: '#94a3b8'}}>Nenhuma oferta ativa nesta categoria.</p>
              <button style={styles.addBtnSmall} onClick={() => handleOpenModal()}>Começar Modelagem</button>
           </div>
         ) : filteredProducts.map(plan => (
            <div key={plan.id} style={styles.planCard}>
               <div style={styles.planHeader}>
                  <div style={styles.planCategory}>
                    {getIconForType(plan.type)} 
                    {plan.type === 'SaaS_PLAN' ? 'PLANO SAAS' : 
                     plan.type === 'WHATSAPP_ACTIVATION' ? 'WHATSAPP ATIVAÇÃO' :
                     plan.type === 'WHATSAPP_CREDITS' ? 'PACK DE CRÉDITOS' : 'TREINAMENTO'}
                  </div>
                  <div style={styles.planName}>{plan.name}</div>
                  <div style={styles.planPrice}>
                     <span style={styles.priceSymbol}>R$</span> {plan.price} 
                     {plan.billing_cycle === 'MONTHLY' && <span style={styles.priceSymbol}>/mês</span>}
                     {plan.billing_cycle === 'YEARLY' && <span style={styles.priceSymbol}>/ano</span>}
                     {plan.billing_cycle === 'ONETIME' && <span style={styles.priceSymbol}> (Pagamento Único)</span>}
                  </div>
                  {plan.credits_amount > 0 && (
                    <div style={styles.creditBadge}><Zap size={12} /> {plan.credits_amount} MENSAGENS</div>
                  )}
               </div>
               
               <p style={styles.planDesc}>{plan.description || 'Nenhuma descrição cadastrada para este produto.'}</p>
               
               <div style={styles.planActions}>
                  <button style={styles.editBtn} onClick={() => handleOpenModal(plan)}><Edit2 size={14} /> Editar</button>
                  <button style={styles.trashBtn} onClick={() => handleDelete(plan.id)} title="Excluir Oferta"><Trash2 size={14} /></button>
               </div>
            </div>
         ))}
         {filteredProducts.length > 0 && (
          <button style={styles.addPlanCard} onClick={() => handleOpenModal()}>
              <div style={styles.addIcon}><Plus size={24} /></div>
              <span style={styles.addText}>Criar nova variação estratégica</span>
          </button>
         )}
      </div>

      {/* FOOTER: SIMULAÇÃO */}
      <div style={styles.exampleCard}>
          <div style={styles.exHeader}>
             <div style={styles.exIcon}><Smartphone size={20} color="#7c3aed" /></div>
             <h3 style={styles.exTitle}>Motor de Receita Híbrida Ativo</h3>
          </div>
          <p style={styles.exDesc}>Logta permite venda combinada: SaaS (Recorrência) + WhatsApp (Addon) + Créditos (Consumo) + Cursos (Info).</p>
      </div>

      {/* MODAL: CRIAR/EDITAR PRODUTO */}
      <LogtaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        width="550px" 
        title={selectedProduct?.id ? 'Editar Oferta do Catálogo' : 'Nova Oferta Estratégica'}
      >
         <div style={styles.form}>
            <div style={styles.inputGroup}>
               <label style={styles.fLabel}>Nome do Produto / Plano</label>
               <input 
                  style={styles.fInput} 
                  placeholder="Ex: Plano Master Ouro ou Pack 1000 Mensagens" 
                  value={selectedProduct?.name || ''}
                  onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})}
               />
            </div>
            <div style={styles.fRow}>
               <div style={styles.inputGroup}>
                  <label style={styles.fLabel}>Preço de Venda (R$)</label>
                  <input 
                    type="number"
                    style={styles.fInput} 
                    value={selectedProduct?.price || 0}
                    onChange={e => setSelectedProduct({...selectedProduct, price: Number(e.target.value)})}
                  />
               </div>
               <div style={styles.inputGroup}>
                  <label style={styles.fLabel}>Período de Faturamento</label>
                  <select 
                    style={styles.fInput}
                    value={selectedProduct?.billing_cycle || 'MONTHLY'}
                    onChange={e => setSelectedProduct({...selectedProduct, billing_cycle: e.target.value as any})}
                  >
                     <option value="MONTHLY">Assinatura Mensal</option>
                     <option value="YEARLY">Assinatura Anual</option>
                     <option value="ONETIME">Produto Avulso (Pagamento Único)</option>
                  </select>
               </div>
            </div>

            {selectedProduct?.type === 'WHATSAPP_CREDITS' && (
              <div style={styles.inputGroup}>
                <label style={styles.fLabel}>Quantidade de Mensagens (Créditos)</label>
                <input 
                  type="number"
                  style={styles.fInput} 
                  placeholder="Ex: 500" 
                  value={selectedProduct?.credits_amount || 0}
                  onChange={e => setSelectedProduct({...selectedProduct, credits_amount: Number(e.target.value)})}
                />
              </div>
            )}

            <div style={styles.inputGroup}>
               <label style={styles.fLabel}>Descrição Promocional</label>
               <textarea 
                  style={{...styles.fInput, height: '100px', resize: 'none'}} 
                  placeholder="Descreva as vantagens para o cliente no Marketplace..." 
                  value={selectedProduct?.description || ''}
                  onChange={e => setSelectedProduct({...selectedProduct, description: e.target.value})}
               />
            </div>

            <button style={styles.saveBtnModal} onClick={handleSaveProduct}>
               {selectedProduct?.id ? 'Confirmar Alterações 💾' : 'Lançar Oferta no Mercado 🚀'}
            </button>
         </div>
      </LogtaModal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '40px', backgroundColor: 'transparent', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' },
  badge: { display: 'inline-block', padding: '4px 12px', backgroundColor: '#f5f3ff', color: '#7c3aed', borderRadius: '30px', fontSize: '10px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' },
  title: { fontSize: '40px', fontWeight: '950', color: 'var(--text-main)', letterSpacing: '-2px', marginBottom: '8px' },
  subtitle: { fontSize: '16px', color: 'var(--text-muted)', fontWeight: '500' },
  headerActions: { display: 'flex', gap: '12px' },
  refreshBtn: { width: '45px', height: '45px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' },
  saveBtn: { padding: '0 24px', height: '45px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  
  tabContainer: { display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '16px', width: 'fit-content', marginBottom: '40px' },
  tabLink: { padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' },
  tabActive: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },

  plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' },
  planCard: { backgroundColor: 'white', padding: '24px', borderRadius: '32px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const },
  planHeader: { marginBottom: '20px' },
  planCategory: { fontSize: '9px', fontWeight: '950', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', opacity: 0.8 },
  planName: { fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' },
  planPrice: { fontSize: '20px', fontWeight: '950', color: 'var(--text-main)' },
  priceSymbol: { fontSize: '12px', color: '#94a3b8', fontWeight: '700' },
  creditBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#fff7ed', color: '#ea580c', borderRadius: '8px', fontSize: '10px', fontWeight: '900', marginTop: '12px' },
  planDesc: { fontSize: '13px', color: '#64748b', lineHeight: '1.6', flex: 1, marginBottom: '24px' },
  planActions: { display: 'flex', gap: '8px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' },
  editBtn: { flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '12px', fontWeight: '800', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  trashBtn: { width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #fee2e2', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  addPlanCard: { border: '2px dashed var(--border)', borderRadius: '32px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer', padding: '40px', backgroundColor: 'transparent', transition: 'all 0.2s', ':hover': { borderColor: 'var(--primary)', backgroundColor: '#f5f3ff' } } as any,
  addIcon: { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' },
  addText: { fontSize: '14px', fontWeight: '800', color: '#64748b', textAlign: 'center' as const, maxWidth: '120px' },

  exampleCard: { marginTop: '40px', padding: '24px', borderRadius: '24px', backgroundColor: 'white', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  exHeader: { display: 'flex', alignItems: 'center', gap: '12px' },
  exIcon: { width: '40px', height: '40px', backgroundColor: '#f5f3ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  exTitle: { fontSize: '16px', fontWeight: '850', color: '#1e293b' },
  exDesc: { fontSize: '14px', color: '#64748b', fontWeight: '500' },

  form: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  fLabel: { fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' as const },
  fInput: { padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '700', outline: 'none' },
  fRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  saveBtnModal: { padding: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '900', cursor: 'pointer', marginTop: '10px' }
};

export default MasterPlans;
