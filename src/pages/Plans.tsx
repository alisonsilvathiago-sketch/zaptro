import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, Zap, Building, Crown } from 'lucide-react';

const PlansPage: React.FC = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Starter',
      price: 'R$ 299',
      period: '/mês',
      desc: 'Ideal para pequenas frotas em crescimento.',
      icon: <Zap size={24} color="var(--primary)" />,
      features: ['Até 5 veículos', 'Acesso aplicativo motorista', 'Roteirização básica', 'Suporte via chat'],
      btnText: 'Começar Agora',
      recommended: false
    },
    {
      name: 'Business',
      price: 'R$ 899',
      period: '/mês',
      desc: 'Nossa solução completa para médias empresas.',
      icon: <Building size={24} color="#10B981" />,
      features: ['Veículos ilimitados', 'CRM Avançado', 'Relatórios Customizados', 'Treinamentos integrados', 'API de integração'],
      btnText: 'Escolher Business',
      recommended: true
    },
    {
      name: 'Enterprise',
      price: 'Sob Consulta',
      period: '',
      desc: 'Soluções customizadas para grandes operações.',
      icon: <Crown size={24} color="#F59E0B" />,
      features: ['Tudo do Business', 'Gerente de conta dedicado', 'Treinamento on-site', 'SLA de 99.9%', 'Segurança avançada'],
      btnText: 'Falar com Consultor',
      recommended: false
    }
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>
          <ArrowLeft size={20} /> Voltar
        </button>
        <h1 style={styles.title}>Planos flexíveis para o <br /><span style={styles.gradient}>seu negócio.</span></h1>
        <p style={styles.subtitle}>Escolha o plano que melhor se adapta à sua escala atual.</p>
      </header>

      <div style={styles.grid}>
        {plans.map((plan, idx) => (
          <div key={idx} style={{
            ...styles.card,
            ...(plan.recommended ? styles.cardRecommended : {})
          }}>
            {plan.recommended && <div style={styles.recommendBadge}>MAIS POPULAR</div>}
            <div style={styles.planIcon}>{plan.icon}</div>
            <h3 style={styles.planName}>{plan.name}</h3>
            <div style={styles.priceContainer}>
              <span style={styles.price}>{plan.price}</span>
              <span style={styles.period}>{plan.period}</span>
            </div>
            <p style={styles.planDesc}>{plan.desc}</p>
            
            <div style={styles.featuresList}>
              {plan.features.map((feature, fIdx) => (
                <div key={fIdx} style={styles.featureItem}>
                  <Check size={18} color="var(--primary)" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button style={{
              ...styles.planBtn,
              ...(plan.recommended ? styles.planBtnPrimary : styles.planBtnSecondary)
            }}>
              {plan.btnText}
            </button>
          </div>
        ))}
      </div>

      <footer style={styles.footer}>
        <p>Precisa de um plano personalizado? <span style={styles.contactLink}>Entre em contato conosco.</span></p>
      </footer>
    </div>
  );
};

const styles = {
  container: { padding: '80px 40px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  header: { textAlign: 'center' as const, marginBottom: '64px', maxWidth: '800px', margin: '0 auto 64px auto' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', marginBottom: '32px' },
  title: { fontSize: '48px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.2', marginBottom: '16px' },
  gradient: { background: 'linear-gradient(to right, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { fontSize: '18px', color: 'var(--text-secondary)' },
  grid: { display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' as const, maxWidth: '1200px', margin: '0 auto' },
  card: { flex: 1, minWidth: '320px', maxWidth: '380px', backgroundColor: 'white', borderRadius: '32px', padding: '48px', position: 'relative' as const, border: '1px solid var(--border)', transition: 'transform 0.3s' },
  cardRecommended: { border: '2px solid var(--primary)', transform: 'scale(1.05)', boxShadow: 'var(--shadow-premium)' },
  recommendBadge: { position: 'absolute' as const, top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  planIcon: { width: '64px', height: '64px', borderRadius: '18px', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' },
  planName: { fontSize: '24px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '12px' },
  priceContainer: { display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' },
  price: { fontSize: '40px', fontWeight: '700', color: 'var(--text-main)' },
  period: { fontSize: '16px', color: 'var(--text-muted)' },
  planDesc: { fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '32px', minHeight: '44px' },
  featuresList: { display: 'flex', flexDirection: 'column' as const, gap: '16px', marginBottom: '40px' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' },
  planBtn: { width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: '700', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
  planBtnPrimary: { backgroundColor: 'var(--primary)', color: 'white' },
  planBtnSecondary: { backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border)' },
  footer: { marginTop: '80px', textAlign: 'center' as const, color: 'var(--text-muted)' },
  contactLink: { color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' },
};

export default PlansPage;
