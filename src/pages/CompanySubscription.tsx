import React, { useState, useEffect } from 'react';
import { 
  CreditCard, CheckCircle2, AlertCircle, Calendar, 
  ExternalLink, ShieldCheck, Zap, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { createAsaasCheckout } from '../lib/asaas';

const CompanySubscription: React.FC = () => {
  const { profile } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billingType, setBillingType] = useState<'PIX' | 'BOLETO'>('PIX');

  const handleCheckout = async () => {
    if (!profile?.company_id || !sub) return;
    setCheckoutLoading(true);
    try {
      const resp = await createAsaasCheckout({
        company_id: profile.company_id,
        plan_id: sub.plan_name,
        amount: sub.amount,
        billingType: billingType as any,
        customerName: profile.full_name,
        customerEmail: profile.email || 'financeiro@empresa.com',
        customerCnpj: '00000000000000' // Deveria vir do profile/company
      });

      if (resp?.invoiceUrl) {
        window.open(resp.invoiceUrl, '_blank');
      } else {
        alert('Faturamento gerado com sucesso! Verifique seu e-mail.');
      }
    } catch (err: any) {
      alert('Erro ao gerar pagamento: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const fetchSubscription = async () => {
    if (!profile?.company_id) return;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();
      
      if (error && error.code !== 'PGRST') console.error(error);
      setSub(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [profile]);

  if (loading) return <div style={{padding: '40px'}}>Carregando assinatura...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Assinatura Logta</h1>
        <p style={styles.subtitle}>Gerencie seu plano e mantenha seu sistema sempre ativo.</p>
      </header>

      <div style={styles.main}>
        {/* Card do Plano Atual */}
        <div style={styles.planCard}>
           <div style={styles.planHeader}>
              <div style={styles.planBadge}>PLANO {sub?.plan_name || 'FREE'}</div>
              <h2 style={styles.planPrice}>
                 {sub ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.amount) : 'R$ 0,00'}
                 <span style={styles.perMonth}>/mês</span>
              </h2>
           </div>

           <div style={styles.statusBox}>
              {sub?.status === 'ATIVO' ? (
                 <div style={styles.statusOk}><CheckCircle2 size={16} /> Sua conta está regularizada.</div>
              ) : (
                 <div style={styles.statusAlert}><AlertCircle size={16} /> Pagamento pendente ou em atraso.</div>
              )}
           </div>

           <div style={styles.details}>
              <div style={styles.detailItem}>
                 <Calendar size={18} color="#94a3b8" />
                 <div>
                    <label style={styles.dL}>Próximo Vencimento</label>
                    <p style={styles.dV}>{sub?.next_due_date ? new Date(sub.next_due_date).toLocaleDateString() : 'A definir'}</p>
                 </div>
              </div>
              <div style={styles.detailItem}>
                 <CreditCard size={18} color="#94a3b8" />
                 <div>
                    <label style={styles.dL}>Método de Pagamento</label>
                    <p style={styles.dV}>PIX / Boleto Bancário via Asaas</p>
                 </div>
              </div>
           </div>

           <div style={styles.paymentSelector}>
              <button 
                style={{...styles.paymentBtn, borderColor: billingType === 'PIX' ? '#8b5cf6' : '#e2e8f0'}} 
                onClick={() => setBillingType('PIX')}
              >
                <div style={styles.pIcon}><Zap size={16} /></div>
                <span>PIX</span>
              </button>
              <button 
                style={{...styles.paymentBtn, borderColor: billingType === 'BOLETO' ? '#8b5cf6' : '#e2e8f0'}}
                onClick={() => setBillingType('BOLETO')}
              >
                <div style={styles.pIcon}><FileText size={16} /></div>
                <span>Boleto</span>
              </button>
           </div>

           <button 
             style={{...styles.payBtn, opacity: checkoutLoading ? 0.7 : 1}} 
             onClick={handleCheckout}
             disabled={checkoutLoading}
           >
              {checkoutLoading ? 'Gerando fatura...' : <><Zap size={18} /> GERAR {billingType} AGORA</>}
           </button>
        </div>

        {/* Informações de Segurança */}
        <div style={styles.infoSide}>
           <div style={styles.infoCard}>
              <ShieldCheck size={24} color="#8b5cf6" />
              <h4 style={styles.infoTitle}>Pagamento Seguro</h4>
              <p style={styles.infoText}>Utilizamos tecnologia Asaas para processar suas faturas de forma criptografada e automática.</p>
           </div>
           
           <div style={styles.infoCard}>
              <ExternalLink size={24} color="#3b82f6" />
              <h4 style={styles.infoTitle}>Deseja Upgrade?</h4>
              <p style={styles.infoText}>Fale com nosso gerente de contas Master para expandir seus limites de frota e usuários.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', backgroundColor: '#F8FAFC', minHeight: '100vh' },
  header: { marginBottom: '40px' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: '15px', color: '#64748b' },
  main: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' },
  planCard: { backgroundColor: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' },
  planHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  planBadge: { padding: '6px 14px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '10px', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' },
  planPrice: { fontSize: '32px', fontWeight: '900', color: '#1e293b' },
  perMonth: { fontSize: '14px', color: '#94a3b8', fontWeight: '500' },
  statusBox: { marginBottom: '32px' },
  statusOk: { display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '16px', fontSize: '14px', fontWeight: '700' },
  statusAlert: { display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: '#fff1f2', color: '#f43f5e', borderRadius: '16px', fontSize: '14px', fontWeight: '700' },
  details: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' },
  detailItem: { display: 'flex', alignItems: 'center', gap: '16px' },
  dL: { fontSize: '12px', color: '#94a3b8', fontWeight: '600', display: 'block' },
  dV: { fontSize: '15px', color: '#1e293b', fontWeight: '800' },
  payBtn: { width: '100%', padding: '18px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' },
  paymentSelector: { display: 'flex', gap: '12px', marginBottom: '20px' },
  paymentBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px', fontWeight: '700', color: '#1e293b' },
  pIcon: { width: '24px', height: '24px', backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  infoSide: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  infoCard: { padding: '24px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' },
  infoTitle: { fontSize: '16px', fontWeight: '800', color: '#1e293b', marginTop: '16px', marginBottom: '8px' },
  infoText: { fontSize: '13px', color: '#64748b', lineHeight: '1.5' }
};

export default CompanySubscription;
