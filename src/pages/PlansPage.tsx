import React from 'react';
import { Check, ArrowRight, Shield, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PlansPage: React.FC = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Start',
      price: '499',
      icon: <Zap size={24} />,
      desc: 'Ideal para pequenas frotas iniciando sua jornada digital.',
      features: ['Até 5 veículos', 'Gestão Financeira Básica', 'Cadastro de Motoristas', 'Relatórios Mensais', 'Suporte via Chat'],
      color: 'var(--text-secondary)'
    },
    {
      name: 'Pro',
      price: '999',
      icon: <Crown size={24} />,
      desc: 'Para transportadoras que buscam escala e controle total.',
      features: ['Frota Ilimitada', 'CRM de Expansão', 'Dashboards em Tempo Real', 'Módulo de RH Completo', 'Suporte VIP 24h'],
      color: 'var(--primary)',
      recommended: true
    },
    {
      name: 'Enterprise',
      price: 'Personalizado',
      icon: <Shield size={24} />,
      desc: 'Soluções customizadas para grandes holdings e grupos.',
      features: ['Customização White-Label', 'API de Integração Aberta', 'Gestão Multi-Empresa', 'Audit Log Detalhado', 'Consultoria Dedicada'],
      color: '#0F172A'
    }
  ];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.badge}>PLANOS E PREÇOS</div>
        <h1 style={styles.title}>Invista no futuro da sua <span className="text-gradient-purple">logística.</span></h1>
        <p style={styles.subtitle}>Escolha o plano que melhor se adapta ao momento da sua empresa.</p>
      </header>

      <div style={styles.grid}>
        {plans.map((p, i) => (
          <div key={i} style={{
            ...styles.card,
            border: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)',
            transform: p.recommended ? 'scale(1.05)' : 'scale(1)'
          }}>
            {p.recommended && <div style={styles.recommended}>MAIS RECOMENDADO</div>}
            <div style={{...styles.iconBox, color: p.color, backgroundColor: p.recommended ? 'var(--primary-light)' : 'var(--bg-app)'}}>{p.icon}</div>
            <h3 style={styles.planName}>{p.name}</h3>
            <p style={styles.planDesc}>{p.desc}</p>
            <div style={styles.priceRow}>
              {p.price !== 'Personalizado' && <span style={styles.currency}>R$</span>}
              <span style={styles.amount}>{p.price}</span>
              {p.price !== 'Personalizado' && <span style={styles.period}>/mês</span>}
            </div>
            
            <button style={{
              ...styles.btn,
              backgroundColor: p.recommended ? 'var(--primary)' : 'var(--text-main)',
              color: 'white'
            }} onClick={() => navigate('/contato')}>
              Começar Agora
            </button>

            <div style={styles.divider} />

            <ul style={styles.featureList}>
              {p.features.map((f, j) => (
                <li key={j} style={styles.featureItem}>
                  <Check size={16} color="var(--primary)" /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section style={styles.comparisonSection}>
        <h2 style={styles.compTitle}>Dúvidas sobre o plano ideal?</h2>
        <p style={styles.compSub}>Fale com um de nossos especialistas e receba um diagnóstico gratuito da sua operação.</p>
        <button style={styles.btnSecondary} onClick={() => window.location.href = 'https://wa.me/5500000000000'}>Falar no WhatsApp</button>
      </section>
    </div>
  );
};

const styles: Record<string, any> = {
  page: { padding: '120px 24px 80px 24px', backgroundColor: '#FFFFFF', minHeight: '100vh' },
  header: { textAlign: 'center', maxWidth: '800px', margin: '0 auto 80px auto' },
  badge: { display: 'inline-block', padding: '6px 14px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '30px', fontSize: '11px', fontWeight: '800', marginBottom: '20px', letterSpacing: '1px' },
  title: { fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '800', color: 'var(--text-main)', marginBottom: '20px', lineHeight: '1.2' },
  subtitle: { fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6' },
  
  grid: { maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' },
  card: { padding: '48px 32px', borderRadius: '24px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' },
  recommended: { position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary)', color: 'white', padding: '8px 20px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' },
  iconBox: { width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' },
  planName: { fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' },
  planDesc: { fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px', minHeight: '44px' },
  priceRow: { display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' },
  currency: { fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' },
  amount: { fontSize: '48px', fontWeight: '800', color: 'var(--text-main)' },
  period: { fontSize: '16px', color: 'var(--text-muted)', fontWeight: '500' },
  btn: { padding: '18px', borderRadius: '14px', border: 'none', fontWeight: '800', fontSize: '16px', cursor: 'pointer', marginBottom: '32px' },
  divider: { height: '1px', backgroundColor: 'var(--border)', marginBottom: '32px' },
  featureList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' },

  comparisonSection: { marginTop: '100px', textAlign: 'center', backgroundColor: '#FAFBFD', padding: '80px 24px', borderRadius: '40px', border: '1px solid var(--border)' },
  compTitle: { fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' },
  compSub: { color: 'var(--text-secondary)', marginBottom: '32px' },
  btnSecondary: { padding: '16px 40px', backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '16px', cursor: 'pointer' }
};

export default PlansPage;
