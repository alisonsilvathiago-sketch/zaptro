import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  Lock, 
  ArrowLeft, 
  Mail,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toastError } from '../lib/toast';

const TwoFactorVerify: React.FC = () => {
  const { verifyMFA, mfaUser, signOut } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus no próximo
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) return;

    setLoading(true);
    const success = await verifyMFA(fullCode);
    setLoading(false);
    
    if (!success) {
      setCode(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    }
  };

  useEffect(() => {
    if (code.every(digit => digit !== '')) {
      handleSubmit();
    }
  }, [code]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
       ...styles.page,
       ...(isMobile && { overflowY: 'auto', display: 'block' })
    }}>
      {/* Section of Form */}
      <div style={{
         ...styles.formSection,
         ...(isMobile && { padding: '24px', flex: 'none' })
      }}>
        <div style={{
           ...styles.formContainer,
           ...(isMobile && { maxWidth: '100%', margin: '40px 0' })
        }}>
          <header style={styles.header}>
            <div style={styles.logoRow}>
               <div style={styles.logoBox}><Lock size={20} color="white" /></div>
               <span style={styles.platformName}>Segurança Logta</span>
            </div>
            
            <div style={styles.welcomeArea}>
               <h1 style={styles.title}>Verifique sua identidade</h1>
               <p style={styles.subtitle}>
                  Enviamos um código de 6 dígitos para o seu e-mail:<br/>
                  <strong style={{color: '#0F172A'}}>{mfaUser?.email}</strong>
               </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} style={styles.form}>
             <div style={{
                ...styles.otpGrid,
                ...(isMobile && { gap: '8px' })
             }}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    style={{
                       ...styles.otpInput,
                       borderColor: digit ? 'var(--primary)' : '#E2E8F0',
                       backgroundColor: digit ? '#F5F3FF' : '#f4f4f4',
                       ...(isMobile && { height: '54px', fontSize: '20px' })
                    }}
                  />
                ))}
             </div>

             <button 
                type="submit" 
                style={{...styles.submitBtn, opacity: loading || code.join('').length < 6 ? 0.7 : 1}} 
                disabled={loading || code.join('').length < 6}
             >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Verificar Acesso'}
             </button>
          </form>

          <footer style={styles.footer}>
             <div style={styles.resendArea}>
                {timer > 0 ? (
                  <p style={styles.resendText}>Reenviar código em <strong>{timer}s</strong></p>
                ) : (
                  <button style={styles.resendBtn} onClick={() => { setTimer(60); }}>
                     Solicitar Novo Código
                  </button>
                )}
             </div>

             <button style={styles.backBtn} onClick={signOut}>
                <ArrowLeft size={16} /> Voltar para o Login
             </button>
          </footer>
        </div>

        <div style={{
           ...styles.copyright,
           ...(isMobile && { position: 'static' as const, marginTop: '40px', textAlign: 'center' })
        }}>
           © 2026 Logta Shield • v2.1.0
        </div>
      </div>

      {/* Right Section: Visual Marketing (Hidden on Mobile) */}
      {!isMobile && (
        <div style={styles.visualSection}>
           <div style={styles.visualContent}>
              <div style={styles.visualHeader}>
                 <div style={styles.appIcon}><ShieldCheck size={24} color="white" /></div>
                 <h2 style={styles.visualTitle}>PROTEÇÃO 360°</h2>
                 <p style={styles.visualDesc}>Camadas extras de segurança para garantir o isolamento total dos seus dados operacionais.</p>
              </div>

              <div style={styles.illustration}>
                 <div style={styles.abstractGraphic}>
                    <div style={styles.circle1} />
                    <div style={styles.circle2} />
                 </div>
                 <img 
                   src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800" 
                   alt="Security Visual" 
                   style={styles.mockupImg} 
                 />
              </div>

              <div style={styles.visualFooter}>
                 <div style={styles.footerCol}>
                    <h4 style={styles.footerTitleText}>2FA Obrigatório</h4>
                    <p style={styles.footerP}>Padronização de segurança para todos os níveis de acesso.</p>
                 </div>
                 <div style={styles.footerCol}>
                    <h4 style={styles.footerTitleText}>Audit Log</h4>
                    <p style={styles.footerP}>Cada tentativa de acesso é monitorada e registrada.</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { height: '100vh', width: '100vw', display: 'flex', backgroundColor: 'white', overflow: 'hidden' },
  
  // Left Side
  formSection: { flex: 1, display: 'flex', flexDirection: 'column' as const, padding: '40px', position: 'relative' as const },
  formContainer: { maxWidth: '440px', width: '100%', margin: 'auto' },
  
  header: { marginBottom: '32px' },
  logoRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' },
  logoBox: { width: '40px', height: '40px', backgroundColor: '#0F172A', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  platformName: { fontSize: '18px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.5px' },
  
  welcomeArea: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '850', color: '#0F172A', marginBottom: '8px', letterSpacing: '-1px' },
  subtitle: { color: '#64748B', fontSize: '15px', lineHeight: '1.6' },
  
  form: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  otpGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' },
  otpInput: { width: '100%', height: '64px', border: '2px solid #E2E8F0', borderRadius: '14px', fontSize: '24px', fontWeight: '900', color: '#0F172A', textAlign: 'center' as const, outline: 'none', transition: 'all 0.2s' },
  
  submitBtn: { width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', fontWeight: '850', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 20px var(--primary-glow)' },
  
  footer: { marginTop: '32px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  resendArea: { minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  resendText: { fontSize: '14px', color: '#64748b', margin: 0 },
  resendBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', fontSize: '14px', cursor: 'pointer' },
  backBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' },

  copyright: { position: 'absolute' as const, bottom: '40px', left: '40px', fontSize: '12px', color: '#94A3B8', fontWeight: '600' },

  // Right Side (Visual)
  visualSection: { flex: 1.1, backgroundColor: '#FAFBFD', margin: '16px', borderRadius: '32px', border: '1px solid #e8e8e8', overflow: 'hidden', display: 'flex' },
  visualContent: { flex: 1, padding: '60px', display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between' },
  visualHeader: { maxWidth: '340px' },
  appIcon: { width: '48px', height: '48px', backgroundColor: 'var(--primary)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' },
  visualTitle: { fontSize: '20px', fontWeight: '900', color: '#0F172A', marginBottom: '12px' },
  visualDesc: { fontSize: '15px', color: '#64748B', lineHeight: '1.5' },
  
  illustration: { position: 'relative' as const, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' },
  abstractGraphic: { position: 'absolute' as const, width: '100%', height: '100%' },
  circle1: { position: 'absolute' as const, width: '400px', height: '400px', border: '2px solid rgba(217, 255, 0, 0.04)', borderRadius: '50%', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
  circle2: { position: 'absolute' as const, width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(217, 255, 0, 0.08) 0%, transparent 70%)', borderRadius: '50%', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
  mockupImg: { width: '85%', borderRadius: '24px', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.1)', objectFit: 'cover' as const, zIndex: 1 },

  visualFooter: { display: 'flex', gap: '60px' },
  footerCol: { maxWidth: '200px' },
  footerTitleText: { fontSize: '13px', fontWeight: '950', color: '#0F172A', marginBottom: '8px' },
  footerP: { fontSize: '13px', color: '#94A3B8', lineHeight: '1.5' }
};

export default TwoFactorVerify;
