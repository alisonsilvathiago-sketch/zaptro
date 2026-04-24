import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { profileHasZaptroProductAccess } from '../utils/authProductGate';
import { fetchProfileSliceForGate } from '../utils/profileSelectFallback';
import { MessageSquare, Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, Zap } from 'lucide-react';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';

const WhatsAppLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabaseZaptro.auth.getSession();
      if (!data?.session?.user) return;
      const { data: profile, error } = await fetchProfileSliceForGate(
        supabaseZaptro,
        data.session.user.id
      );
      if (error || !profileHasZaptroProductAccess(profile)) {
        await supabaseZaptro.auth.signOut();
        return;
      }
      navigate('/whatsapp');
    };
    void checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    const pw = password.trim();
    if (!em) {
      notifyZaptro('warning', 'E-mail obrigatório', 'Preencha o e-mail Zaptro para entrar.');
      return;
    }
    if (!pw) {
      notifyZaptro('warning', 'Senha obrigatória', 'Digite sua senha e tente novamente.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabaseZaptro.auth.signInWithPassword({ email: em, password: pw });

      if (error) {
        notifyZaptro(
          'error',
          'Não foi possível entrar',
          error.message || 'Confira e-mail e senha. Se esqueceu a senha, redefina pelo fluxo do Supabase / e-mail.'
        );
        return;
      }

      const { data: profile, error: profErr } = await fetchProfileSliceForGate(supabaseZaptro, data.user.id);

      if (profErr) {
        notifyZaptro('error', 'Perfil não carregado', profErr.message || 'Tente de novo em instantes.');
        await supabaseZaptro.auth.signOut();
        return;
      }

      if (!profileHasZaptroProductAccess(profile)) {
        await supabaseZaptro.auth.signOut();
        notifyZaptro(
          'warning',
          'Módulo não liberado',
          'Sua conta não tem o Zaptro (WhatsApp) ativo para este login, ou o acesso foi bloqueado. Fale com o administrador ou conclua o cadastro em /registrar.'
        );
        return;
      }

      navigate('/whatsapp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
         <header style={styles.header}>
            <div style={styles.logoBox}>
               <MessageSquare size={24} color="white" />
            </div>
            <h1 style={styles.title}>Zaptro WhatsApp</h1>
            <p style={styles.subtitle}>Acesse sua central de multi-atendimento empresarial.</p>
         </header>

         <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
               <label style={styles.label}>E-mail Zaptro</label>
               <div style={styles.inputWrapper}>
                  <Mail size={18} style={styles.icon} />
                  <input 
                    type="email" placeholder="seu@email.com" 
                    style={styles.input} value={email} onChange={e => setEmail(e.target.value)} required
                  />
               </div>
            </div>

            <div style={styles.inputGroup}>
               <label style={styles.label}>Senha de Atendente</label>
               <div style={styles.inputWrapper}>
                  <Lock size={18} style={styles.icon} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" style={styles.input}
                    value={password} onChange={e => setPassword(e.target.value)} required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                     {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
               </div>
            </div>

            <button type="submit" style={styles.loginBtn} disabled={loading}>
               {loading ? 'Autenticando...' : 'Entrar no Chat'}
               {!loading && <ArrowRight size={18} />}
            </button>
         </form>

         <footer style={styles.footer}>
            <p style={styles.upsellText}>Ainda não usa nosso multi-atendimento?</p>
            <button style={styles.registerBtn} onClick={() => navigate('/checkout-whatsapp')}>
               Ver Planos WhatsApp
            </button>
         </footer>
      </div>

      <div style={styles.features}>
         <div style={styles.featItem}><ShieldCheck size={16} /> API Oficial</div>
         <div style={styles.featItem}><Zap size={16} /> Alta Performance</div>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f4', backgroundImage: 'radial-gradient(circle at 2px 2px, #e2e8f0 1px, transparent 0)', backgroundSize: '40px 40px' },
  card: { backgroundColor: 'white', width: '100%', maxWidth: '440px', padding: '60px 40px', borderRadius: '40px', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.1)', border: '1px solid #e8e8e8' },
  header: { textAlign: 'center', marginBottom: '40px' },
  logoBox: { width: '48px', height: '48px', backgroundColor: '#D9FF00', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-1px' },
  subtitle: { fontSize: '14px', color: '#64748b', marginTop: '8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  icon: { position: 'absolute', left: '16px', color: '#94a3b8' },
  input: { width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', backgroundColor: '#ebebeb', border: '1px solid #e8e8e8', fontSize: '15px', outline: 'none', transition: 'all 0.2s', '&:focus': { backgroundColor: 'white', borderColor: '#D9FF00' } },
  eyeBtn: { position: 'absolute', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' },
  loginBtn: { padding: '18px', backgroundColor: '#D9FF00', color: '#000000', borderRadius: '16px', border: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 20px -5px rgba(217, 255, 0, 0.4)' },
  footer: { marginTop: '40px', borderTop: '1px solid #e8e8e8', paddingTop: '32px', textAlign: 'center' },
  upsellText: { fontSize: '13px', color: '#64748b', marginBottom: '16px' },
  registerBtn: { backgroundColor: 'transparent', border: '1px solid #D9FF00', color: '#D9FF00', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' },
  features: { display: 'flex', gap: '24px', marginTop: '40px' },
  featItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8', fontWeight: '600' }
};

export default WhatsAppLogin;
