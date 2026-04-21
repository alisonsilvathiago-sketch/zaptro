import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Mail, Lock, Phone, ArrowRight, Navigation, 
  ChevronRight, Check, ShieldCheck, Zap, MessageSquare,
  Trophy, Briefcase
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';

const plans = [
  { id: 'BRONZE', name: 'LOGTA ESSENCIAL', price: '197' },
  { id: 'PRATA', name: 'LOGTA PROFISSIONAL', price: '497' },
  { id: 'OURO', name: 'LOGTA ENTERPRISE', price: '997' }
];

const RegisterBusiness: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [formData, setFormData] = useState({
    companyName: '',
    cnpj: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    plan: 'BRONZE',
    includeWhatsApp: false
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    // Detectar plano da URL (ex: ?plan=waas)
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plan');
    if (planParam === 'waas') {
       setFormData(prev => ({ ...prev, plan: 'WAAS', includeWhatsApp: true }));
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRegister = async () => {
    if (formData.password !== formData.confirmPassword) {
      toastError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const tid = toastLoading('Provisionando ambiente seguro...');

    try {
      // 1. Criar Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.companyName,
            role: 'COMPANY_ADMIN'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário.');

      // 2. Criar Empresa
      const companyId = crypto.randomUUID();
      const { error: companyError } = await supabase
        .from('companies')
        .insert([{
          id: companyId,
          name: formData.companyName,
          status: 'ATIVO',
          plan: formData.plan,
          settings: {
            cnpj: formData.cnpj,
            email: formData.email,
            phone: formData.phone,
            modules: formData.plan === 'WAAS' ? ['whatsapp'] : (formData.includeWhatsApp ? ['logistics', 'finance', 'crm', 'whatsapp'] : ['logistics', 'finance', 'crm'])
          }
        }]);

      if (companyError) throw companyError;

      // 3. Vincular Perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: companyId,
          role: 'COMPANY_ADMIN'
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      toastDismiss(tid);
      toastSuccess('Unidade Logta ativada com sucesso!');
      navigate('/login');
    } catch (err: any) {
      toastDismiss(tid);
      toastError('Erro no cadastro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* LEFT SIDE: FORM */}
      <div style={styles.formSide}>
        <div style={styles.formContent}>
          <div style={styles.logtaHeaderSmall}>
            <div style={styles.logoBoxPurple}>
               <Navigation size={22} color="white" fill="white" />
            </div>
            <h1 style={styles.logoTitle}>Logta SaaS</h1>
          </div>

          <div style={styles.welcomeSection}>
            <span style={styles.badgeRegister}>EXPANSÃO GLOBAL</span>
            <h2 style={styles.titleBig}>Cadastre sua Empresa</h2>
            <p style={styles.subtitleSmall}>Crie sua instância exclusiva e comece a escalar em minutos.</p>
          </div>

          <div style={styles.stepperComplex}>
             <div style={{...styles.stepBar, width: step === 1 ? '33%' : step === 2 ? '66%' : '100%'}} />
             <div style={styles.stepDotsRow}>
                {[1, 2, 3].map(s => (
                   <div key={s} style={{...styles.stepMarker, backgroundColor: step >= s ? '#D9FF00' : '#F1F5F9'}} />
                ))}
             </div>
          </div>

          <div style={styles.formArea}>
             {step === 1 && (
                <div style={styles.formStackLogta}>
                   <div style={styles.fieldLogta}>
                      <label style={styles.labelLogta}>Nome da Empresa / Razão Social</label>
                      <div style={styles.inputWrapperLogta}>
                         <Building2 size={18} color="#94A3B8" />
                         <input 
                           style={styles.inputClean} 
                           placeholder="Ex: Transportes Logta LTDA" 
                           value={formData.companyName}
                           onChange={e => setFormData({...formData, companyName: e.target.value})}
                         />
                      </div>
                   </div>
                   <div style={styles.fieldLogta}>
                      <label style={styles.labelLogta}>CNPJ</label>
                      <div style={styles.inputWrapperLogta}>
                         <ShieldCheck size={18} color="#94A3B8" />
                         <input 
                           style={styles.inputClean} 
                           placeholder="00.000.000/0000-00" 
                           value={formData.cnpj}
                           onChange={e => setFormData({...formData, cnpj: e.target.value})}
                         />
                      </div>
                   </div>
                   <button style={styles.submitBtnLogta} onClick={() => setStep(2)}>
                      Próximo Passo <ChevronRight size={18} />
                   </button>
                </div>
             )}

             {step === 2 && (
                <div style={styles.formStackLogta}>
                   <div style={styles.fieldLogta}>
                      <label style={styles.labelLogta}>E-mail Corporativo</label>
                      <div style={styles.inputWrapperLogta}>
                         <Mail size={18} color="#94A3B8" />
                         <input 
                           type="email"
                           style={styles.inputClean} 
                           placeholder="admin@suaempresa.com" 
                           value={formData.email}
                           onChange={e => setFormData({...formData, email: e.target.value})}
                         />
                      </div>
                   </div>
                   <div style={styles.fieldLogta}>
                      <label style={styles.labelLogta}>Senha</label>
                      <div style={styles.inputWrapperLogta}>
                         <Lock size={18} color="#94A3B8" />
                         <input 
                           type="password"
                           style={styles.inputClean} 
                           placeholder="••••••••" 
                           value={formData.password}
                           onChange={e => setFormData({...formData, password: e.target.value})}
                         />
                      </div>
                   </div>
                   <div style={styles.btnRow}>
                      <button style={styles.secBtn} onClick={() => setStep(1)}>Voltar</button>
                      <button style={styles.submitBtnLogta} onClick={() => setStep(3)}>Próximo <ChevronRight size={18} /></button>
                   </div>
                </div>
             )}

             {step === 3 && (
                <div style={styles.formStackLogta}>
                   <div style={styles.plansSelect}>
                      {plans.map(p => (
                         <div key={p.id} style={{...styles.planItem, borderColor: formData.plan === p.id ? '#D9FF00' : '#F1F5F9'}} onClick={() => setFormData({...formData, plan: p.id})}>
                            <span style={styles.planNameLabel}>{p.name}</span>
                            <strong style={styles.planPriceLabel}>R$ {p.price}</strong>
                         </div>
                      ))}
                   </div>
                   <button style={styles.submitBtnLogta} onClick={handleRegister} disabled={loading}>
                      {loading ? 'Processando...' : 'Finalizar Cadastro'} <Check size={18} />
                   </button>
                </div>
             )}
          </div>

          <div style={styles.footerLinkArea}>
             <span>Já possui uma conta?</span>
             <span style={styles.linkAction} onClick={() => navigate('/login')}>Fazer Login</span>
          </div>
        </div>

        <div style={styles.copyrightBottom}>
           © 2026 Logta SaaS • Infraestrutura v2.4
        </div>
      </div>

      {/* RIGHT SIDE: BRANDING PANE */}
      <div style={styles.brandingSide}>
        <div style={{...styles.brandingCard, backgroundColor: '#0F172A', color: 'white'}}>
           <div style={styles.cardHeader}>
              <div style={{...styles.cardIconBox, backgroundColor: 'white'}}>
                 <Navigation size={28} color="#0F172A" fill="#0F172A" />
              </div>
              <h3 style={{...styles.cardTitle, color: 'white'}}>LOGTA INFRA CORE</h3>
              <p style={{...styles.cardSubtitle, color: 'rgba(255,255,255,0.6)'}}>
                 Nossa infraestrutura escala com você. Ative sua unidade em tempo real com isolamento de dados total.
              </p>
           </div>
           
           <div style={styles.cardVisualRegister}>
              <img 
                src="https://images.unsplash.com/photo-1551288049-bb848a55a110?auto=format&fit=crop&q=80&w=1200" 
                style={styles.laptopMockup} 
                alt="Dashboard" 
              />
           </div>

           <div style={{...styles.cardFooter, borderTop: '1px solid rgba(255,255,255,0.1)'}}>
              <div style={styles.footerItem}>
                 <strong style={{fontSize: '14px', marginBottom: '4px', display:'block'}}>Auto-Escalável</strong>
                 <p style={{fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0}}>Ambientes isolados e alta disponibilidade garantida.</p>
              </div>
              <div style={styles.footerItem}>
                 <strong style={{fontSize: '14px', marginBottom: '4px', display:'block'}}>Personalizável</strong>
                 <p style={{fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0}}>Personalize 100% da experiência do seu cliente.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden', backgroundColor: 'white' },
  
  // FORM SIDE (LEFT)
  formSide: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', position: 'relative' as const },
  formContent: { width: '100%', maxWidth: '440px' },
  logtaHeaderSmall: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '80px', position: 'absolute' as const, top: '60px', left: '60px' },
  logoBoxPurple: { width: '40px', height: '40px', backgroundColor: '#D9FF00', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoTitle: { fontSize: '20px', fontWeight: '900', color: '#0F172A', margin: 0 },
  
  welcomeSection: { marginBottom: '32px' },
  badgeRegister: { fontSize: '11px', fontWeight: '900', color: '#D9FF00', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', display: 'block' },
  titleBig: { fontSize: '36px', fontWeight: '950', color: '#0F172A', margin: '0 0 12px 0', letterSpacing: '-1.5px' },
  subtitleSmall: { fontSize: '16px', color: '#64748B', fontWeight: '500' },
  
  stepperComplex: { height: '6px', width: '100%', backgroundColor: '#ebebeb', borderRadius: '10px', position: 'relative' as const, margin: '32px 0 40px' },
  stepBar: { height: '100%', backgroundColor: '#D9FF00', borderRadius: '10px', transition: 'width 0.3s ease' },
  stepDotsRow: { position: 'absolute' as const, top: '-4px', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 2px' },
  stepMarker: { width: '14px', height: '14px', borderRadius: '50%', border: '3px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },

  formArea: { minHeight: '300px' },
  formStackLogta: { display: 'flex', flexDirection: 'column', gap: '24px' },
  fieldLogta: { display: 'flex', flexDirection: 'column', gap: '8px' },
  labelLogta: { fontSize: '14px', fontWeight: '850', color: '#0F172A' },
  inputWrapperLogta: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: '#f4f4f4', borderRadius: '16px', border: '1px solid #e8e8e8' },
  inputClean: { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', fontWeight: '600', color: '#1E293B' },
  
  btnRow: { display: 'flex', gap: '16px' },
  secBtn: { flex: 0.4, padding: '18px', backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', color: '#64748B', fontWeight: '800', cursor: 'pointer' },
  submitBtnLogta: { 
    flex: 1, padding: '20px', backgroundColor: '#D9FF00', color: '#000000', border: 'none', 
    borderRadius: '16px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', 
    boxShadow: '0 10px 30px rgba(217, 255, 0, 0.2)', transition: '0.2s' 
  },

  plansSelect: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  planItem: { padding: '16px', borderRadius: '16px', border: '2px solid #e8e8e8', cursor: 'pointer', textAlign: 'center' as const },
  planNameLabel: { fontSize: '11px', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' },
  planPriceLabel: { fontSize: '18px', fontWeight: '900', color: '#0F172A' },

  footerLinkArea: { textAlign: 'center' as const, marginTop: '40px', fontSize: '14px', color: '#64748B', display: 'flex', justifyContent: 'center', gap: '8px' },
  linkAction: { color: '#D9FF00', fontWeight: '900', cursor: 'pointer' },
  copyrightBottom: { position: 'absolute' as const, bottom: '40px', left: '60px', fontSize: '12px', color: '#94A3B8', fontWeight: '500' },

  // BRANDING PANE (RIGHT)
  brandingSide: { flex: 1, backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' },
  brandingCard: { 
    width: '100%', maxWidth: '620px', height: '100%', maxHeight: '800px', backgroundColor: 'white', 
    borderRadius: '48px', padding: '60px', display: 'flex', flexDirection: 'column', 
    boxShadow: '0 40px 100px rgba(0,0,0,0.05)', position: 'relative' as const
  },
  cardHeader: { textAlign: 'center' as const, marginBottom: '60px' },
  cardIconBox: { width: '64px', height: '64px', backgroundColor: '#0F172A', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' },
  cardTitle: { fontSize: '24px', fontWeight: '950', color: '#0F172A', margin: '0 0 12px 0', letterSpacing: '1px' },
  cardSubtitle: { fontSize: '15px', color: '#64748B', fontWeight: '500', maxWidth: '380px', margin: '0 auto' },
  
  cardVisualRegister: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  laptopMockup: { width: '120%', maxWidth: '800px', height: 'auto', borderRadius: '24px', boxShadow: '0 50px 100px rgba(0,0,0,0.3)', transform: 'rotate(-2deg)' },

  cardFooter: { display: 'flex', justifyContent: 'space-between', gap: '32px', paddingTop: '40px' },
  footerItem: { flex: 1 }
};

export default RegisterBusiness;
