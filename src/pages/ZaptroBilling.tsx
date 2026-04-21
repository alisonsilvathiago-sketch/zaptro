import React, { useState } from 'react';
import { 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Download, 
  Zap,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { useAuth } from '../context/AuthContext';
import { supabaseZaptro } from '../lib/supabase-zaptro';

// Dados fictícios para demonstração
const invoices = [
  { id: 'INV-1029', date: '15 Abr 2026', amount: 'R$ 297,00', method: 'Cartão •••• 4412', status: 'pago' },
  { id: 'INV-1028', date: '15 Mar 2026', amount: 'R$ 297,00', method: 'Cartão •••• 4412', status: 'pago' },
  { id: 'INV-1027', date: '15 Fev 2026', amount: 'R$ 247,00', method: 'Boleto Bancário', status: 'pago' },
];

const ZaptroBilling: React.FC = () => {
  const { profile } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      id: 'basico',
      name: 'Básico',
      price: isAnnual ? 'R$ 490,00' : 'R$ 49,00',
      period: isAnnual ? '/ano' : '/mês',
      features: [
        '1 Conexão WhatsApp',
        'Limite de mensagens reduzido',
        'Armazenamento: 24 horas',
        'Sem backup',
        'Sem white label'
      ]
    },
    {
      id: 'profissional',
      name: 'Profissional',
      price: isAnnual ? 'R$ 970,00' : 'R$ 97,00',
      period: isAnnual ? '/ano' : '/mês',
      features: [
        'Até 3 Conexões',
        'Automação básica',
        'Armazenamento: 3 dias',
        'Backup opcional (pago)',
        'Cores personalizadas'
      ]
    },
    {
      id: 'avancado',
      name: 'Avançado',
      price: isAnnual ? 'R$ 1970,00' : 'R$ 197,00',
      period: isAnnual ? '/ano' : '/mês',
      features: [
        'Conexões Ilimitadas',
        'Automação Completa',
        'Armazenamento: 7 dias',
        'Backup incluído (15 dias)',
        'White Label + Domínio Próprio'
      ]
    },
  ];

  const fetchSubscription = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data } = await supabaseZaptro
      .from('subscriptions')
      .select('*')
      .eq('organization_id', profile.company_id)
      .maybeSingle();
    
    setSubscription(data);
    setLoading(false);
  };

  React.useEffect(() => { fetchSubscription(); }, [profile?.company_id]);

  return (
    <ZaptroLayout>
      <div style={styles.container}>
        <header style={styles.header}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
              <div>
                <h1 style={styles.title}>Plano & Faturamento</h1>
                <p style={styles.subtitle}>Escolha o plano ideal para a escala do seu negócio.</p>
              </div>
              
              {/* Toggle Mensal/Anual */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#F1F5F9', padding: '6px', borderRadius: '14px' }}>
                <button 
                  onClick={() => setIsAnnual(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 950,
                    cursor: 'pointer',
                    backgroundColor: !isAnnual ? 'white' : 'transparent',
                    boxShadow: !isAnnual ? ZAPTRO_SHADOW.sm : 'none',
                    color: !isAnnual ? '#000' : '#64748B'
                  }}
                >
                  Mensal
                </button>
                <button 
                  onClick={() => setIsAnnual(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 950,
                    cursor: 'pointer',
                    backgroundColor: isAnnual ? 'white' : 'transparent',
                    boxShadow: isAnnual ? ZAPTRO_SHADOW.sm : 'none',
                    color: isAnnual ? '#000' : '#64748B'
                  }}
                >
                  Anual (-20%)
                </button>
              </div>
            </div>
        </header>

        <div style={styles.mainGrid}>
           {plans.map(plan => {
             const isCurrent = subscription?.plan_name === plan.id;
             return (
               <div key={plan.id} style={{
                 ...styles.card, 
                 borderColor: isCurrent ? '#D9FF00' : '#EBEBEC',
                 borderWidth: isCurrent ? '2px' : '1px'
               }}>
                  <div style={styles.planHeader}>
                     <div style={{...styles.planIcon, backgroundColor: isCurrent ? '#D9FF00' : '#F1F5F9'}}>
                        <Zap size={24} color={isCurrent ? "#000" : "#64748B"} />
                     </div>
                     <div>
                        <h3 style={styles.planTitle}>{plan.name}</h3>
                        <div style={isCurrent ? styles.statusBadge : { visibility: 'hidden' }}>
                           <CheckCircle2 size={14} color="#10B981" />
                           Plano Atual
                        </div>
                     </div>
                  </div>
                  <div style={styles.planPrice}>
                     <span style={styles.priceVal}>{plan.price}</span>
                     <span style={styles.priceUnit}>{plan.period}</span>
                  </div>
                  <ul style={styles.featureList}>
                     {plan.features.map((f, i) => (
                       <li key={i} style={styles.featureItem}><CheckCircle2 size={14} color="#D9FF00" /> {f}</li>
                     ))}
                  </ul>
                  <button 
                    style={{...styles.upgradeBtn, backgroundColor: isCurrent ? '#F1F5F9' : '#000', color: isCurrent ? '#64748B' : '#D9FF00'}}
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'PLANO ATIVO' : 'CONTRATAR AGORA'}
                  </button>
               </div>
             );
           })}
        </div>

        {/* TABELA DE FATURAS */}
        <div style={{...styles.card, marginTop: '32px'}}>
           <h3 style={styles.cardTitle}>Histórico de Faturas</h3>
           <div style={styles.tableWrapper}>
              <table style={styles.table}>
                 <thead>
                    <tr style={styles.thead}>
                       <th style={styles.th}>DATA</th>
                       <th style={styles.th}>IDENTIFICADOR</th>
                       <th style={styles.th}>VALOR</th>
                       <th style={styles.th}>MÉTODO</th>
                       <th style={styles.th}>STATUS</th>
                       <th style={styles.th}>DOCUMENTO</th>
                    </tr>
                 </thead>
                 <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={styles.tr}>
                         <td style={styles.td}>{inv.date}</td>
                         <td style={styles.td}><span style={{fontWeight: 800}}>{inv.id}</span></td>
                         <td style={styles.td}>{inv.amount}</td>
                         <td style={styles.td}>{inv.method}</td>
                         <td style={styles.td}>
                            <span style={{
                              ...styles.badge, 
                              backgroundColor: inv.status === 'pago' ? '#EEFCEF' : '#FEF2F2',
                              color: inv.status === 'pago' ? '#10B981' : '#EF4444'
                            }}>
                               {inv.status.toUpperCase()}
                            </span>
                         </td>
                         <td style={styles.td}>
                            <button style={styles.downBtn}><Download size={16} /> PDF</button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div style={styles.upsellBanner}>
           <TrendingUp size={24} color="#D9FF00" />
           <p style={styles.upsellText}>
              Precisa de mais conexões ou multi-atendentes? <strong>Fale com seu consultor Zaptro</strong> para expandir sua operação.
           </p>
        </div>
      </div>
    </ZaptroLayout>
  );
};

const styles: Record<string, any> = {
  container: { padding: '0px' },
  header: { marginBottom: '40px' },
  title: { fontSize: '32px', fontWeight: '950', color: '#000', margin: 0, letterSpacing: '-1.5px' },
  subtitle: { fontSize: '15px', color: '#64748B', fontWeight: '500', margin: '4px 0 0 0' },
  
  mainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '32px' },
  card: { backgroundColor: 'white', border: '1px solid #EBEBEC', borderRadius: '24px', padding: '32px', boxShadow: ZAPTRO_SHADOW.xs },
  
  planCard: { border: '2px solid #D9FF00' },
  planHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' },
  planIcon: { width: '52px', height: '52px', backgroundColor: '#D9FF00', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  planTitle: { fontSize: '20px', fontWeight: '950', color: '#000', margin: 0, letterSpacing: '-0.5px' },
  statusBadge: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#10B981', marginTop: '4px' },
  
  planDetails: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', padding: '24px', backgroundColor: '#FBFBFC', borderRadius: '18px' },
  planPrice: { display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '24px' },
  priceVal: { fontSize: '32px', fontWeight: '950', color: '#000' },
  priceUnit: { fontSize: '14px', color: '#64748B', fontWeight: '700' },
  featureList: { listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1E293B', fontWeight: '600' },
  upgradeBtn: { width: '100%', padding: '16px', backgroundColor: '#000', color: '#FFF', border: 'none', borderRadius: '16px', fontWeight: '950', fontSize: '14px', cursor: 'pointer' },

  cardTitle: { fontSize: '18px', fontWeight: '950', color: '#000', marginBottom: '24px', letterSpacing: '-0.5px' },
  cardBox: { display: 'flex', alignItems: 'center', gap: '20px', padding: '24px', border: '1px solid #EBEBEC', borderRadius: '18px', marginBottom: '20px' },
  cardText: { margin: 0, fontSize: '15px', fontWeight: '900', color: '#000' },
  cardExpiry: { margin: 0, fontSize: '12px', color: '#94A3B8', fontWeight: '600' },
  editCardBtn: { background: 'none', border: 'none', color: '#000', fontWeight: '950', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' },
  securitySeal: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: '#64748B' },

  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { backgroundColor: '#FBFBFC', borderBottom: '1px solid #EBEBEC' },
  th: { padding: '20px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '950', color: '#000', textTransform: 'uppercase', letterSpacing: '1px' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '20px 24px', fontSize: '14px', color: '#1E293B', fontWeight: '600' },
  badge: { padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '950' },
  downBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '950', cursor: 'pointer' },

  upsellBanner: { marginTop: '40px', padding: '32px', backgroundColor: '#111', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px' },
  upsellText: { margin: 0, color: '#94A3B8', fontSize: '15px', fontWeight: '600' },
};

export default ZaptroBilling;
