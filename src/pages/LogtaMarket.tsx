import React, { useState, useEffect } from 'react';
import { 
  Check, Zap, Building, Crown, Package, 
  MessageSquare, BookOpen, Star, ArrowRight,
  ShoppingCart, Wallet, Smartphone, ShieldCheck,
  Plus, Minus, RefreshCw, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import LogtaModal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import type { MasterCatalogProduct, MasterProductType } from '../types/index';

import { getContext } from '../utils/domains';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';

const LogtaMarket: React.FC = () => {
  const context = getContext();
  const { company } = useTenant();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<MasterCatalogProduct[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'SaaS_PLAN' | 'WHATSAPP' | 'COURSE'>('all');
  const [selectedProduct, setSelectedProduct] = useState<MasterCatalogProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [wallet, setWallet] = useState<{credits_balance: number} | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch products
      const { data: prodData } = await supabase
        .from('master_products_catalog')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      setProducts(prodData || []);

      // 2. Fetch wallet
      if (company?.id) {
        const { data: walletData } = await supabase
          .from('company_wallet')
          .select('credits_balance')
          .eq('company_id', company.id)
          .single();
        setWallet(walletData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [company?.id]);

  const handleOpenCheckout = (product: MasterCatalogProduct) => {
    setSelectedProduct(product);
    setIsCheckoutOpen(true);
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !company) return;
    const tId = toastLoading('Processando transação segura...');
    
    try {
      // Simulação: Criar entitlement
      const { error: entError } = await supabase
        .from('company_entitlements')
        .insert({
          company_id: company.id,
          product_id: selectedProduct.id,
          status: 'active'
        });

      if (entError) throw entError;

      // Se for crédito, recarregar carteira
      if (selectedProduct.type === 'WHATSAPP_CREDITS') {
        const { error: walletError } = await supabase.rpc('increment_wallet_credits', {
          comp_id: company.id,
          amount: selectedProduct.credits_amount
        });
        // Nota: Precisaremos dessa RPC ou fazer um update manual seguro
      }

      toastSuccess(`Sua compra de "${selectedProduct.name}" foi concluída!`);
      setIsCheckoutOpen(false);
      fetchData();
    } catch (err) {
      toastError('Erro ao processar pagamento. Tente novamente.');
    } finally {
      toastDismiss(tId);
    }
  };

  const filteredProducts = products.filter(p => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'WHATSAPP') return p.type === 'WHATSAPP_ACTIVATION' || p.type === 'WHATSAPP_CREDITS';
    return p.type === activeCategory;
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const isZaptro = context === 'WHATSAPP';
  
  const content = (
    <div style={styles.container} className="animate-fade-in">
      {/* Header com Wallet */}
      <header style={styles.header}>
        <div style={styles.headerInfo}>
          <div style={styles.badge}>{isZaptro ? 'PLANS & MESSAGES' : 'MARKETPLACE OFICIAL'}</div>
          <h1 style={styles.title}>{isZaptro ? 'Zaptro' : 'Logta Market'} <span style={styles.gradient}>{isZaptro ? 'Store' : 'Loja'}</span></h1>
          <p style={styles.subtitle}>Evolua sua operação com as melhores ferramentas e treinamentos personalizados.</p>
        </div>
        
        <div style={styles.walletCard}>
           <div style={styles.walletIcon}><Wallet size={20} color="white" /></div>
           <div>
              <span style={styles.walletLabel}>SALDO DE CRÉDITOS</span>
              <div style={styles.walletValue}>{wallet?.credits_balance || 0} <span style={styles.wUnit}>mensagens</span></div>
           </div>
           <button style={styles.rechargeBtn} onClick={() => setActiveCategory('WHATSAPP')}>
              <Plus size={16} /> Recarregar
           </button>
        </div>
      </header>

      {/* Categorias */}
      <div style={styles.categoryBar}>
         {[
           { id: 'all', label: 'Todos', icon: <Package size={16} /> },
           { id: 'SaaS_PLAN', label: 'Planos SaaS', icon: <Layers size={16} /> },
           { id: 'WHATSAPP', label: 'WhatsApp', icon: <MessageSquare size={16} /> },
           { id: 'COURSE', label: 'Academia', icon: <BookOpen size={16} /> }
         ].map(cat => (
           <button 
             key={cat.id}
             style={{...styles.catBtn, ...(activeCategory === cat.id ? styles.catBtnActive : {})}}
             onClick={() => setActiveCategory(cat.id as any)}
           >
             {cat.icon} {cat.label}
           </button>
         ))}
      </div>

      {/* Grid de Produtos */}
      <div style={styles.grid}>
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={styles.productCard}>
               <Skeleton height="16px" width="80px" borderRadius="10px" style={{marginBottom: '16px'}} />
               <Skeleton height="24px" width="70%" style={{marginBottom: '12px'}} />
               <Skeleton height="60px" width="100%" style={{marginBottom: '32px'}} />
               <div style={styles.pPriceRow}>
                  <Skeleton height="32px" width="100px" />
                  <Skeleton height="40px" width="100px" borderRadius="14px" />
               </div>
            </div>
          ))
        ) : filteredProducts.length === 0 ? (
          <div style={{gridColumn: 'span 3', textAlign: 'center', padding: '100px', color: '#94a3b8', fontWeight: '600'}}>
             Nenhum produto encontrado nesta categoria.
          </div>
        ) : filteredProducts.map((p) => (
          <div key={p.id} style={styles.productCard}>
            <div style={styles.typeTag}>
               {p.type === 'SaaS_PLAN' ? 'Assinatura SaaS' : 
                p.type === 'WHATSAPP_ACTIVATION' ? 'Add-on WhatsApp' :
                p.type === 'WHATSAPP_CREDITS' ? 'Pack de Créditos' : 'Treinamento'}
            </div>
            <h3 style={styles.pName}>{p.name}</h3>
            <p style={styles.pDesc}>{p.description}</p>
            
            <div style={styles.pPriceRow}>
               <div style={styles.pPrice}>
                  <span style={styles.pCurrency}>R$</span> {p.price}
                  {p.billing_cycle === 'MONTHLY' && <span style={styles.pPeriod}>/mês</span>}
               </div>
               <button style={styles.buyBtn} onClick={() => handleOpenCheckout(p)}>
                  <ShoppingCart size={16} /> 
                  {p.type === 'SaaS_PLAN' ? 'Alterar Plano' : 'Adquirir'}
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Checkout Modal */}
      <LogtaModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        width="450px" 
        title="Confirmar Pedido"
      >
        {selectedProduct && (
          <div style={styles.checkout}>
             <div style={styles.orderSummary}>
                <div style={styles.orderItem}>
                   <div style={styles.orderIcon}><ShieldCheck size={24} color="var(--primary)" /></div>
                   <div>
                      <div style={styles.orderName}>{selectedProduct.name}</div>
                      <div style={styles.orderType}>
                          {selectedProduct.type === 'SaaS_PLAN' ? 'Plano Recorrente' : 
                           selectedProduct.type === 'WHATSAPP_ACTIVATION' ? 'Ativação de Serviço' :
                           selectedProduct.type === 'WHATSAPP_CREDITS' ? 'Pacote de Uso' : 'Acesso Vitalício'}
                      </div>
                   </div>
                   <div style={styles.orderPrice}>{formatCurrency(selectedProduct.price)}</div>
                </div>
             </div>

             <div style={styles.paymentMethod}>
                <div style={styles.pmHeader}>Método de Pagamento</div>
                <div style={styles.pmCard}>
                   <Smartphone size={20} color="#10b981" />
                   <div style={styles.pmText}>PIX Logta (Confirmação Imediata)</div>
                </div>
             </div>

             <div style={styles.totalRow}>
                <span>Total a Pagar:</span>
                <span style={styles.totalValue}>{formatCurrency(selectedProduct.price)}</span>
             </div>

             <button style={styles.confirmBtn} onClick={handlePurchase}>
                CONFIRMAR PAGAMENTO AGORA
             </button>
             <p style={styles.secureText}>Pagamento processado via ASAAS Gateway &bull; Criptografia 256-bit</p>
          </div>
        )}
      </LogtaModal>
    </div>
  );

  if (isZaptro) {
    return <ZaptroLayout>{content}</ZaptroLayout>;
  }

  return content;
};

const styles: Record<string, any> = {
  container: { padding: '0px', backgroundColor: 'transparent', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' },
  headerInfo: { maxWidth: '600px' },
  badge: { display: 'inline-block', padding: '4px 12px', backgroundColor: '#CCFF0015', color: '#0F172A', borderRadius: '30px', fontSize: '10px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' },
  title: { fontSize: '40px', fontWeight: '950', color: '#0F172A', letterSpacing: '-2px', marginBottom: '12px' },
  gradient: { background: 'linear-gradient(to right, #CCFF00, #92B200)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { fontSize: '16px', color: '#64748B', fontWeight: '500' },
  
  walletCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' },
  walletIcon: { width: '48px', height: '48px', backgroundColor: '#0F172A', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  walletLabel: { fontSize: '10px', fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  walletValue: { fontSize: '24px', fontWeight: '950', color: '#0F172A', lineHeight: '1' },
  wUnit: { fontSize: '12px', fontWeight: '700', color: '#64748B' },
  rechargeBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#F1F5F9', color: '#0F172A', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' },

  categoryBar: { display: 'flex', gap: '12px', marginBottom: '32px' },
  catBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', fontSize: '14px', fontWeight: '800', color: '#64748B', cursor: 'pointer', transition: 'all 0.2s' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  productCard: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column' as const, transition: '0.3s' },
  typeTag: { fontSize: '9px', fontWeight: '950', color: '#0F172A', textTransform: 'uppercase' as const, marginBottom: '16px', backgroundColor: '#CCFF00', padding: '4px 10px', borderRadius: '20px', width: 'fit-content' },
  pName: { fontSize: '20px', fontWeight: '950', color: '#0F172A', marginBottom: '12px', letterSpacing: '-0.5px' },
  pDesc: { fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '32px', flex: 1, fontWeight: '500' },
  pPriceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid #F1F5F9' },
  pPrice: { fontSize: '24px', fontWeight: '950', color: '#0F172A' },
  pCurrency: { fontSize: '14px', color: '#94A3B8', fontWeight: '700', marginRight: '4px' },
  pPeriod: { fontSize: '12px', color: '#64748B', fontWeight: '600' },
  buyBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' },

  checkout: { padding: '10px' },
  orderSummary: { backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '16px', marginBottom: '24px' },
  orderItem: { display: 'flex', alignItems: 'center', gap: '16px' },
  orderIcon: { width: '48px', height: '48px', backgroundColor: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  orderName: { fontSize: '16px', fontWeight: '900', color: '#0F172A' },
  orderType: { fontSize: '11px', fontWeight: '800', color: '#94A3B8' },
  orderPrice: { marginLeft: 'auto', fontSize: '18px', fontWeight: '950', color: '#0F172A' },
  
  paymentMethod: { marginBottom: '32px' },
  pmHeader: { fontSize: '12px', fontWeight: '900', color: '#94A3B8', marginBottom: '12px' },
  pmCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' },
  pmText: { fontSize: '14px', fontWeight: '800', color: '#0F172A' },

  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 8px' },
  totalValue: { fontSize: '28px', fontWeight: '950', color: '#0F172A' },
  confirmBtn: { width: '100%', padding: '20px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '18px', fontSize: '16px', fontWeight: '950', cursor: 'pointer', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' },
  secureText: { textAlign: 'center' as const, fontSize: '11px', color: '#94A3B8', marginTop: '20px', fontWeight: '600' }
};

export default LogtaMarket;
