import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { profileHasAcademyAccess } from '../utils/authProductGate';
import { fetchProfileSliceForGate } from '../utils/profileSelectFallback';
import { GraduationCap, Mail, Lock, ArrowRight, Eye, EyeOff, Award, BookOpen } from 'lucide-react';
import { toastSuccess, toastError } from '../lib/toast';

const AcademyLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) return;
      const { data: profile, error } = await fetchProfileSliceForGate(supabase, data.session.user.id);
      if (error || !profileHasAcademyAccess(profile)) {
        await supabase.auth.signOut();
        return;
      }
      navigate('/treinamentos');
    };
    void checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toastError('E-mail ou senha incorretos na Academy.');
      return;
    }

    const uid = data.user?.id;
    if (!uid) {
      setLoading(false);
      toastError('Sessão inválida.');
      await supabase.auth.signOut();
      return;
    }

    const { data: profile, error: profErr } = await fetchProfileSliceForGate(supabase, uid);

    if (profErr || !profileHasAcademyAccess(profile)) {
      await supabase.auth.signOut();
      setLoading(false);
      toastError('Esta conta não tem a Academy liberada. Use o login da Logta ou peça acesso ao administrador.');
      return;
    }

    toastSuccess('Bem-vindo à Logta Academy!');
    navigate('/treinamentos');
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
         <header style={styles.header}>
            <div style={styles.logoBox}>
               <GraduationCap size={24} color="white" />
            </div>
            <h1 style={styles.title}>Logta Academy</h1>
            <p style={styles.subtitle}>Acesse seus cursos, certificados e treinamentos operacionais.</p>
         </header>

         <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
               <label style={styles.label}>E-mail de Aluno</label>
               <div style={styles.inputWrapper}>
                  <Mail size={18} style={styles.icon} />
                  <input 
                    type="email" placeholder="seu@email.com" 
                    style={styles.input} value={email} onChange={e => setEmail(e.target.value)} required
                  />
               </div>
            </div>

            <div style={styles.inputGroup}>
               <label style={styles.label}>Senha</label>
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
               {loading ? 'Acessando Sala de Aula...' : 'Entrar na Academy'}
               {!loading && <ArrowRight size={18} />}
            </button>
         </form>

         <footer style={styles.footer}>
            <p style={styles.upsellText}>Quer treinar sua equipe com nossos cursos?</p>
            <button style={styles.registerBtn} onClick={() => navigate('/planos')}>
               Conhecer Planos Academy
            </button>
         </footer>
      </div>

      <div style={styles.features}>
         <div style={styles.featItem}><BookOpen size={16} /> +50 Aulas Práticas</div>
         <div style={styles.featItem}><Award size={16} /> Certificados Oficiais</div>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdfcfe', backgroundImage: 'radial-gradient(circle at 2px 2px, #f3e8ff 1px, transparent 0)', backgroundSize: '40px 40px' },
  card: { backgroundColor: 'white', width: '100%', maxWidth: '440px', padding: '60px 40px', borderRadius: '40px', boxShadow: '0 40px 100px -20px rgba(217, 255, 0, 0.08)', border: '1px solid #f3e8ff' },
  header: { textAlign: 'center', marginBottom: '40px' },
  logoBox: { width: '48px', height: '48px', backgroundColor: '#D9FF00', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1e1b4b', letterSpacing: '-1px' },
  subtitle: { fontSize: '14px', color: '#D9FF00', marginTop: '8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  icon: { position: 'absolute', left: '16px', color: '#a5b4fc' },
  input: { width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', backgroundColor: 'rgba(217, 255, 0, 0.18)', border: '1px solid rgba(217, 255, 0, 0.28)', fontSize: '15px', outline: 'none' },
  eyeBtn: { position: 'absolute', right: '16px', background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer' },
  loginBtn: { padding: '18px', backgroundColor: '#D9FF00', color: '#000000', borderRadius: '16px', border: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 20px -5px rgba(217, 255, 0, 0.35)' },
  footer: { marginTop: '40px', borderTop: '1px solid #f3e8ff', paddingTop: '32px', textAlign: 'center' },
  upsellText: { fontSize: '13px', color: '#D9FF00', marginBottom: '16px' },
  registerBtn: { backgroundColor: 'transparent', border: '1px solid #D9FF00', color: '#D9FF00', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' },
  features: { display: 'flex', gap: '24px', marginTop: '40px' },
  featItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#a5b4fc', fontWeight: '600' }
};

export default AcademyLogin;
