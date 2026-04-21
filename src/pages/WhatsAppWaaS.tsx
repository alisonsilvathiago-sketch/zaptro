import React from 'react';
import { 
  Zap, Shield, Users, 
  CheckCircle2, ArrowRight, BarChart3, 
  PlayCircle, Star, Phone,
  MessageSquare, Globe, Target, Cpu, 
  MousePointer2, ChevronRight, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEOManager from '../components/SEOManager';
import Footer from '../components/Footer';

const WhatsAppWaaS: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <SEOManager 
        title="Zaptro | WhatsApp Inteligente para sua Transportadora"
        description="Shaping transport futures with expertise and care. A suíte completa de automação para logística."
      />

      <div style={styles.gridOverlay} />

      {/* Navigation */}
      <nav style={styles.nav}>
         <div style={styles.logo}>
            <div style={styles.mecoLogo}>
               <Zap size={24} color="#D2FF00" fill="#D2FF00" />
            </div>
            <span style={styles.logoText}>Zaptro</span>
         </div>
         <div style={styles.navLinks}>
            <span style={styles.navLink}>Sobre</span>
            <span style={styles.navLink}>Soluções</span>
            <span style={styles.navLink}>Produto</span>
            <span style={styles.navLink}>Empresa</span>
            <span style={styles.navLink}>Insight</span>
         </div>
         <div style={styles.authActions}>
            <button style={styles.loginBtn} onClick={() => navigate('/login-whatsapp')}>Login</button>
            <button style={styles.signUpBtn} onClick={() => navigate('/register-business')}>Sign Up</button>
         </div>
      </nav>

      <main style={styles.main}>
        {/* Hero Section - MECO STYLE */}
        <section style={styles.hero}>
           <div style={styles.heroContent}>
              <h1 style={styles.heroTitle}>
                 Shaping Transport futures with expertise and care.
              </h1>
              <p style={styles.heroSub}>
                 Oferecemos uma suíte completa de serviços, desde atendimento automatizado até soluções de logística avançadas, tudo com precisão inigualável.
              </p>
              
              <div style={styles.heroButtons}>
                 <button style={styles.getStarted} onClick={() => navigate('/register-business')}>Get Started</button>
                 <button style={styles.watchDemo}>
                    Watch Demo <PlayCircle size={20} />
                 </button>
              </div>

              {/* Floating Element - Central Visual */}
              <div style={styles.visualContainer}>
                 {/* Floating Card 1 - Income */}
                 <div style={styles.incomeCard}>
                    <div style={styles.incomeHeader}>
                       <span style={styles.incomeValue}>+374.00</span>
                       <span style={styles.incomeBadge}>+3.4%</span>
                    </div>
                    <span style={styles.incomeLabel}>Atendimentos este mês</span>
                 </div>

                 {/* Floating Card 2 - Balance */}
                 <div style={styles.balanceCard}>
                    <span style={styles.balanceLabel}>Faturamento Centralizado</span>
                    <div style={styles.balanceHeader}>
                       <span style={styles.balanceValue}>64,573.00</span>
                       <span style={styles.balanceBadge}>+57%</span>
                    </div>
                 </div>

                 {/* Main Phone Visual */}
                 <div style={styles.phoneMockup}>
                    <div style={styles.phoneFrame}>
                       <div style={styles.phoneScreen}>
                          <div style={styles.appHeader}>
                             <span style={styles.appTitle}>Estatísticas</span>
                             <div style={styles.appIcons}>
                                <Users size={16} />
                                <TrendingUp size={16} />
                             </div>
                          </div>
                          
                          <div style={styles.appTabs}>
                             <span style={styles.appTab}>Dia</span>
                             <span style={{...styles.appTab, backgroundColor: '#D2FF00', color: '#000'}}>Sem</span>
                             <span style={styles.appTab}>Mes</span>
                             <span style={styles.appTab}>Ano</span>
                          </div>

                          <div style={styles.appStats}>
                             <p style={styles.appStatLabel}>Gasto Total</p>
                             <h2 style={styles.appStatValue}>$6,340.00</h2>
                             <div style={styles.statGraph}>
                                <div style={{...styles.statIndicator, left: '60%'}}>
                                   <div style={styles.statTooltip}>$89.00</div>
                                </div>
                             </div>
                          </div>

                          <div style={styles.transactionCard}>
                             <div style={styles.transHeader}>
                                <div style={styles.avatarSmall}></div>
                                <div>
                                   <p style={styles.transName}>Expedição Alpha</p>
                                   <p style={styles.transDate}>02-11-2024</p>
                                </div>
                             </div>
                             <span style={styles.transValue}>-18,985.00</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Middle Floating Card */}
                 <div style={styles.sellCard}>
                    <div style={styles.avatarGroup}>
                       <div style={styles.avatarBox}></div>
                       <div style={styles.avatarBox}></div>
                       <div style={styles.avatarBox}></div>
                       <div style={styles.avatarMore}>+50</div>
                    </div>
                    <span style={styles.sellLabel}>BTC/USDT</span>
                    <h2 style={styles.sellValue}>$41,984.00</h2>
                    <span style={styles.sellTrend}>+18.25%</span>
                    <button style={styles.sellBtn}>Liberar Frete</button>
                 </div>
              </div>
           </div>
        </section>

        {/* Partners White Section */}
        <section style={styles.partnersSection}>
           <h2 style={styles.partnersTitle}>Nossos Recentes Clientes e Parceiros</h2>
           <div style={styles.partnersGrid}>
              <div style={styles.partnerItem}><Zap size={24} /> Boltshift</div>
              <div style={styles.partnerItem}><Cpu size={24} /> Lightbox</div>
              <div style={styles.partnerItem}><Target size={24} /> FeatherDev</div>
              <div style={styles.partnerItem}><Globe size={24} /> GlobalBank</div>
              <div style={styles.partnerItem}><Users size={24} /> Nietzsche</div>
           </div>
        </section>

        <section style={styles.ctaSection}>
           <h2 style={styles.ctaTitle}>Recursos de WhatsApp projetados para transformar sua visão em realidade.</h2>
        </section>
      </main>

      <Footer />
    </div>
  );
};

const styles: Record<string, any> = {
  page: { 
    backgroundColor: '#051c0f', minHeight: '100vh', width: '100vw', 
    overflowX: 'hidden', color: '#fff', position: 'relative'
  },
  gridOverlay: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '1000px',
    backgroundImage: `linear-gradient(rgba(210, 255, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(210, 255, 0, 0.03) 1px, transparent 1px)`,
    backgroundSize: '60px 60px', pointerEvents: 'none', zIndex: 0
  },
  nav: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    padding: '30px 100px', position: 'relative', zIndex: 10
  },
  logo: { display: 'flex', alignItems: 'center', gap: '12px' },
  mecoLogo: { width: '40px', height: '40px', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: '24px', fontWeight: '950', color: '#D2FF00', letterSpacing: '-1px' },
  navLinks: { display: 'flex', gap: '32px' },
  navLink: { fontSize: '14px', fontWeight: '500', color: '#9dffc8', opacity: 0.8, cursor: 'pointer' },
  authActions: { display: 'flex', gap: '16px' },
  loginBtn: { backgroundColor: 'transparent', border: 'none', color: '#fff', padding: '10px 24px', fontWeight: '600', cursor: 'pointer' },
  signUpBtn: { backgroundColor: '#D2FF00', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '30px', fontWeight: '850', cursor: 'pointer' },

  main: { position: 'relative', zIndex: 1 },
  hero: { padding: '80px 100px 0 100px', textAlign: 'center' },
  heroContent: { maxWidth: '1200px', margin: '0 auto', position: 'relative' },
  heroTitle: { fontSize: '64px', fontWeight: '800', maxWidth: '900px', margin: '0 auto', lineHeight: '1.1', letterSpacing: '-1px' },
  heroSub: { fontSize: '18px', color: '#9dffc8', opacity: 0.6, maxWidth: '700px', margin: '24px auto', lineHeight: '1.6' },
  heroButtons: { display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '80px' },
  getStarted: { padding: '16px 32px', backgroundColor: '#D2FF00', color: '#000', border: 'none', borderRadius: '30px', fontWeight: '900', fontSize: '16px', cursor: 'pointer' },
  watchDemo: { padding: '16px 32px', backgroundColor: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '30px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' },

  visualContainer: { position: 'relative', width: '100%', height: '700px', marginTop: '40px' },
  
  phoneMockup: { 
    position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)',
    width: '320px', height: '620px', zIndex: 2
  },
  phoneFrame: { 
    width: '100%', height: '100%', backgroundColor: '#000', borderRadius: '48px', 
    padding: '12px', border: '6px solid #1a1a1a', boxShadow: '0 50px 100px rgba(0,0,0,0.5)' 
  },
  phoneScreen: { 
    width: '100%', height: '100%', backgroundColor: '#051c0f', borderRadius: '36px', 
    padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden'
  },
  appHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  appTitle: { fontSize: '14px', fontWeight: '600' },
  appIcons: { display: 'flex', gap: '8px' },
  appTabs: { display: 'flex', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' },
  appTab: { flex: 1, textAlign: 'center', fontSize: '11px', padding: '8px', borderRadius: '8px', color: '#9dffc8' },
  appStatLabel: { fontSize: '12px', color: '#9dffc8', opacity: 0.5, marginBottom: '4px' },
  appStatValue: { fontSize: '28px', fontWeight: '800', margin: 0 },
  statGraph: { height: '80px', position: 'relative', borderBottom: '1px solid rgba(210,255,0,0.2)' },
  statIndicator: { position: 'absolute', bottom: '0', width: '1px', height: '100%', backgroundColor: '#D2FF00' },
  statTooltip: { position: 'absolute', top: '20%', left: '-20px', backgroundColor: '#D2FF00', color: '#000', padding: '4px 8px', borderRadius: '30px', fontSize: '10px', fontWeight: '900' },
  
  transactionCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px' },
  transHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  avatarSmall: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#444' },
  transName: { fontSize: '12px', fontWeight: '700', margin: 0 },
  transDate: { fontSize: '10px', opacity: 0.5, margin: 0 },
  transValue: { fontSize: '16px', fontWeight: '800' },

  incomeCard: { 
    position: 'absolute', top: '10%', left: '20%', backgroundColor: 'rgba(255,255,255,0.95)',
    padding: '20px', borderRadius: '24px', color: '#000', textAlign: 'left', width: '180px', zIndex: 10,
    boxShadow: '0 30px 60px rgba(0,0,0,0.2)'
  },
  incomeValue: { fontSize: '20px', fontWeight: '900' },
  incomeBadge: { fontSize: '10px', backgroundColor: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '30px', marginLeft: '10px' },
  incomeLabel: { fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' },

  balanceCard: { 
    position: 'absolute', top: '20%', right: '15%', backgroundColor: 'rgba(255,255,255,0.95)',
    padding: '24px', borderRadius: '24px', color: '#000', textAlign: 'left', width: '220px', zIndex: 10,
    boxShadow: '0 30px 60px rgba(0,0,0,0.2)'
  },
  balanceValue: { fontSize: '24px', fontWeight: '900' },
  balanceBadge: { fontSize: '10px', backgroundColor: '#ecfdf5', color: '#10b981', padding: '4px 8px', borderRadius: '30px', marginLeft: '10px' },
  balanceLabel: { fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' },

  sellCard: { 
    position: 'absolute', bottom: '15%', left: '25%', backgroundColor: 'rgba(255,255,255,1)',
    padding: '24px', borderRadius: '32px', color: '#000', textAlign: 'left', width: '220px', zIndex: 10,
    boxShadow: '0 40px 80px rgba(0,0,0,0.3)'
  },
  sellBtn: { width: '100%', backgroundColor: '#D2FF00', border: 'none', padding: '12px', borderRadius: '16px', fontWeight: '900', marginTop: '16px', cursor: 'pointer' },
  sellValue: { fontSize: '20px', fontWeight: '900', margin: '4px 0' },
  sellTrend: { fontSize: '12px', color: '#D9FF00', fontWeight: '700' },
  avatarGroup: { display: 'flex', marginBottom: '16px' },
  avatarBox: { width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#ddd', border: '2px solid #fff', marginLeft: '-8px' },
  avatarMore: { fontSize: '10px', fontWeight: '900', padding: '4px' },

  partnersSection: { backgroundColor: '#fff', color: '#000', padding: '100px', textAlign: 'center', position: 'relative', zIndex: 10 },
  partnersTitle: { fontSize: '24px', fontWeight: '800', marginBottom: '60px' },
  partnersGrid: { display: 'flex', justifyContent: 'center', gap: '60px', opacity: 0.5 },
  partnerItem: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: '900' },

  ctaSection: { padding: '120px 100px', textAlign: 'center', backgroundColor: '#fff', color: '#000' },
  ctaTitle: { fontSize: '48px', fontWeight: '800', maxWidth: '900px', margin: '0 auto' }
};

export default WhatsAppWaaS;
