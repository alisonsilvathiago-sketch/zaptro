import React, { useState, useEffect } from 'react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { profileHasZaptroProductAccess } from '../utils/authProductGate';
import { fetchProfileSliceForGate } from '../utils/profileSelectFallback';
import { 
  Lock, Mail, ArrowRight, Eye, EyeOff, Zap, Loader2,
  AlertCircle
} from 'lucide-react';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { isZaptroLocalhostDev } from '../utils/zaptroDevBypass';
import { getZaptroPostLoginLandingUrl } from '../utils/domains';
import { ZAPTRO_HERO_SPLIT_PANEL_CLASS, zaptroHeroSplitPanelCss } from '../utils/zaptroMarketingHeroBackground';
import ZaptroHeroParticleCanvas from '../components/Zaptro/ZaptroHeroParticleCanvas';

/** Só com `isZaptroLocalhostDev()`: entra sem chamar Auth se a senha for a de dev (utilizador não precisa existir no Supabase). */
const LOCALHOST_DEV_LOGIN_PASSWORD = '123456';
const LOCALHOST_DEV_BYPASS_EMAILS = new Set([
  'admzaptro@teste.com',
  'admteste@teste.com',
  'admzap@teste.com',
]);

function canLocalhostDevPasswordBypass(email: string, password: string): boolean {
  return (
    isZaptroLocalhostDev() &&
    password === LOCALHOST_DEV_LOGIN_PASSWORD &&
    LOCALHOST_DEV_BYPASS_EMAILS.has(email.trim().toLowerCase())
  );
}

// 🎨 Ecrã completo: `fixed` evita herdar largura/scroll do `main` do Logta (que partia o split ao meio).
const styles: Record<string, any> = {
  page: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    width: '100%',
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    overflowY: 'auto',
    backgroundColor: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  },
  leftSide: {
    flex: '1 1 50%',
    minWidth: 0,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoTop: { position: 'absolute', top: '40px', left: '50px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '950', zIndex: 2 },
  centerBox: { zIndex: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' },
  tag: { fontSize: '9px', color: 'rgba(10,10,10,0.45)', fontWeight: '950', letterSpacing: '4px' },
  largePhrase: { fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: '950', color: '#0a0a0a', lineHeight: 0.9, letterSpacing: '-2px', animation: 'fadeInOut 4.5s infinite', textTransform: 'uppercase', maxWidth: '450px' },
  progressBar: { width: '100px', height: '3px', backgroundColor: 'rgba(217,255,0,0.1)', borderRadius: '2px', overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', backgroundColor: '#D9FF00', animation: 'moveProgress 2s linear infinite' },
  rightSide: {
    flex: '1 1 50%',
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 0,
  },
  formContainer: { width: '90%', maxWidth: '360px', zIndex: 10 },
  welcomeBox: { marginBottom: '35px', textAlign: 'center' },
  titleBig: { fontSize: '38px', fontWeight: '950', color: '#000', margin: '0 0 8px 0', letterSpacing: '-1.5px' },
  subtitleSmall: { fontSize: '14px', color: '#64748B', fontWeight: '600' },
  errorBox: { backgroundColor: 'rgba(255,0,0,0.05)', color: '#FF0000', padding: '12px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', marginBottom: '20px', border: '1px solid rgba(255,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px' },
  formStack: { display: 'flex', flexDirection: 'column', gap: '12px' },
  inputStack: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 22px', borderRadius: '18px', border: '1px solid #e2e8f0', backgroundColor: '#FFF', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' },
  input: { flex: 1, border: 'none', background: '#FFF !important', outline: 'none', fontSize: '15px', fontWeight: '700', color: '#000' },
  eyeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    color: '#64748b',
    flexShrink: 0,
  },
  submitBtn: { width: '100%', padding: '20px', backgroundColor: '#0f172a', color: '#D9FF00', borderRadius: '18px', fontSize: '15px', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '5px' },
  googleBtn: { width: '100%', padding: '16px', backgroundColor: '#FFF', color: '#000', borderRadius: '18px', fontSize: '11px', fontWeight: '950', border: '2px solid #F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '12px' },
  linkBtn: { background: 'none', border: 'none', color: '#000', fontSize: '14px', cursor: 'pointer', width: '100%', marginTop: '25px', textAlign: 'center' }
};

const ZapRay = ({ size = 24, color = "#D9FF00", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={color} />
  </svg>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = [
    "RECONHECENDO CREDENCIAIS",
    "AUTORIZANDO PROTOCOLOS",
    "SINCRONIZANDO DASHBOARD",
    "ACESSANDO HUB MASTER"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) {
      notifyZaptro('warning', 'E-mail obrigatório', 'Digite o e-mail da sua conta Zaptro no campo indicado.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      notifyZaptro('warning', 'E-mail inválido', 'Confira se digitou corretamente (ex.: nome@empresa.com).');
      return;
    }
    if (!normalizedPassword) {
      notifyZaptro('warning', 'Senha obrigatória', 'Digite sua senha para entrar.');
      return;
    }

    setLoading(true);
    try {


      const { data: signInData, error: signInError } = await supabaseZaptro.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signInError) {
        const msg = signInError.message || '';
        const looksLikeBadGateway =
          /json|JSON|fetch|network|Failed to connect|ECONNREFUSED|502|503|504/i.test(msg);
        if (looksLikeBadGateway) {
          setError('SERVIDOR DE LOGIN INDISPONÍVEL OU MAL CONFIGURADO.');
          notifyZaptro(
            'error',
            'Não foi possível entrar',
            'A ligação ao servidor de autenticação falhou (resposta inválida). Tente de novo em instantes; se persistir, avise o suporte — pode ser necessário republicar o site.'
          );
        } else {
          setError('USUÁRIO OU SENHA INVÁLIDOS.');
          notifyZaptro(
            'error',
            'Não foi possível entrar',
            (msg || 'Confira e-mail e senha. Se acabou de se cadastrar, confirme o e-mail ou use “Esqueci a senha” no provedor.')
          );
        }
        return;
      }

      const uid = signInData.user?.id;
      if (!uid) {
        setError('SESSÃO INVÁLIDA.');
        await supabaseZaptro.auth.signOut();
        return;
      }

      const { data: profileRow, error: profErr } = await supabaseZaptro
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      let finalProfile = profileRow;

      if (profErr || !profileRow) {
        // Tentamos o auto-reparo aqui mesmo no Login para evitar o bloqueio
        const isZaptroAdminEmail = normalizedEmail.startsWith('admteste@') || normalizedEmail.startsWith('admzaptro@') || normalizedEmail === 'admteste@.com';
        const { data: repaired, error: repairErr } = await supabaseZaptro.from('profiles').insert({
          id: uid,
          email: normalizedEmail,
          full_name: normalizedEmail.split('@')[0],
          role: isZaptroAdminEmail ? 'ADMIN' : 'USER',
          tem_zaptro: true,
          status_zaptro: 'autorizado'
        }).select().single();


        if (repairErr) {
          setError('NÃO FOI POSSÍVEL CONFIGURAR SEU PERFIL.');
          notifyZaptro('error', 'Erro de Banco de Dados', 'A tabela "profiles" não existe no projeto Zaptro. Rodar o SQL de emergência é obrigatório.');
          await supabaseZaptro.auth.signOut();
          return;
        }
        finalProfile = repaired;
        notifyZaptro('success', 'Acesso Configurado', 'Seu perfil foi criado no novo ecossistema.');
      }

      if (!profileHasZaptroProductAccess(finalProfile)) {
        await supabaseZaptro.auth.signOut();
        setError('CONTA SEM ZAPTRO ATIVO.');
        notifyZaptro('warning', 'Acesso negado', 'Esta conta não tem o módulo Zaptro liberado.');
        return;
      }


      notifyZaptro('success', 'Login ok', 'Carregando seu painel Zaptro...');
      // Recarrega em URL absoluta evita corrida com o listener de auth; em produção vai sempre para app.zaptro.com.br.
      window.location.assign(getZaptroPostLoginLandingUrl());
    } catch (_err) {
      setError('Falha ao autenticar. Tente novamente em instantes.');
      notifyZaptro('error', 'Erro de conexão', 'Não conseguimos falar com o servidor. Verifique a internet e tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.leftSide} className={`hide-mobile ${ZAPTRO_HERO_SPLIT_PANEL_CLASS}`}>
         <ZaptroHeroParticleCanvas grid={30} />
         <div style={styles.logoTop}><ZapRay size={22} /><span style={{ color: '#0a0a0a', fontSize: '20px' }}>ZAPTRO</span></div>
         <div style={styles.centerBox}>
            <div style={styles.tag}>IA AUTH PROTOCOL</div>
            <div key={phraseIndex} style={styles.largePhrase}>{phrases[phraseIndex]}</div>
            <div style={styles.progressBar}><div style={styles.progressFill} /></div>
         </div>
      </div>

      <div className="login-right-side" style={styles.rightSide}>
         <div style={styles.formContainer}>
            <div style={styles.welcomeBox}>
               <h1 style={styles.titleBig}>Login Zaptro</h1>
               <p style={styles.subtitleSmall}>Insira suas credenciais.</p>
            </div>
            {error && <div style={styles.errorBox}><AlertCircle size={18} /> {error}</div>}
            <form onSubmit={handleLogin} style={styles.formStack}>
               <div style={styles.inputStack}>
                  <Mail size={18} color="#000" />
                  <input type="email" placeholder="E-mail corporativo" style={styles.input} value={email} onChange={e => setEmail(e.target.value)} required />
               </div>
               <div style={styles.inputStack}>
                  <Lock size={18} color="#000" style={{ flexShrink: 0 }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder={
                      isZaptroLocalhostDev()
                        ? `Senha · contas de teste: ${LOCALHOST_DEV_LOGIN_PASSWORD}`
                        : 'Sua senha'
                    }
                    style={styles.input}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((v) => !v)}
                    style={styles.eyeBtn}
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={2.25} /> : <Eye size={20} strokeWidth={2.25} />}
                  </button>
               </div>
               <button type="submit" style={styles.submitBtn} disabled={loading}>
                  {loading ? <Loader2 size={24} className="spin" /> : 'ENTRAR'}
               </button>

            </form>

         </div>
      </div>
      <style>{`
        ${zaptroHeroSplitPanelCss()}
        @keyframes fadeInOut { 0% { opacity: 0; transform: translateY(5px); } 10% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-5px); } }
        @keyframes moveProgress { 0% { width: 0; } 100% { width: 100%; } }
        .spin { animation: rotate 1s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .login-password-toggle:hover { background-color: rgba(15, 23, 42, 0.06); color: #0f172a; }
        .login-password-toggle:focus-visible { outline: 2px solid #D9FF00; outline-offset: 2px; }
        @media (max-width: 1024px) {
          .hide-mobile { display: none !important; }
          .login-right-side {
            flex: 1 1 100% !important;
            min-height: 100dvh;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
