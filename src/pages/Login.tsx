import React, { useState, useEffect } from 'react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { profileHasZaptroProductAccess } from '../utils/authProductGate';
import { fetchProfileSliceForGate } from '../utils/profileSelectFallback';
import { 
  Lock, Mail, ArrowRight, Eye, EyeOff, Zap, Loader2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { isZaptroLocalhostDev } from '../utils/zaptroDevBypass';
import { getZaptroPostLoginLandingUrl } from '../utils/domains';
import { ZAPTRO_HERO_SPLIT_PANEL_CLASS, zaptroHeroSplitPanelCss } from '../utils/zaptroMarketingHeroBackground';
import ZaptroHeroParticleCanvas from '../components/Zaptro/ZaptroHeroParticleCanvas';
import { postZaptroPasswordResetNotice } from '../lib/zaptroMailApi';
import { useAuth } from '../context/AuthContext';

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

const ZapRay = ({ size = 24, color = "#D9FF00", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={color} />
  </svg>
);

const Login: React.FC = () => {
  const { setIsLoggingIn } = useAuth();
  // ⚡ Estado inicial já preenchido em Localhost para agilizar
  const isDev = isZaptroLocalhostDev();
  const [email, setEmail] = useState(isDev ? 'admzaptro@teste.com' : '');
  const [password, setPassword] = useState(isDev ? '123456' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      notifyZaptro('warning', 'E-mail inválido', 'Introduza um e-mail válido para receber o link de recuperação.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      const { error: resetErr } = await supabaseZaptro.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });
      if (resetErr) {
        notifyZaptro('error', 'Não foi possível enviar', resetErr.message || 'Tente novamente em instantes.');
        return;
      }
      await postZaptroPasswordResetNotice(normalizedEmail);
      notifyZaptro(
        'success',
        'Instruções enviadas',
        'Se o e-mail estiver cadastrado, verifique a caixa de entrada e o spam. Pode fechar esta mensagem e voltar ao login.',
      );
      setAuthMode('login');
    } catch {
      notifyZaptro('error', 'Erro de rede', 'Não foi possível concluir o pedido. Tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Auto-preenchimento para Localhost
  useEffect(() => {
    if (isZaptroLocalhostDev()) {
      console.log('[Zaptro Dev] Localhost detectado. Aplicando auto-preenchimento.');
      setEmail('admzaptro@teste.com');
      setPassword('123456');
    }
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
      // ⚡ BYPASS LOCALHOST: Permite entrar sem chamar o Supabase se for ambiente de dev e senha de teste
      if (canLocalhostDevPasswordBypass(normalizedEmail, normalizedPassword)) {
        notifyZaptro('success', 'Modo Desenvolvedor', 'Acesso rápido via bypass local ativo.');
        setIsLoggingIn(true);
        // Em localhost não precisamos esperar os 4.5s completos do "premium cinematic" se quisermos agilidade
        await new Promise((resolve) => setTimeout(resolve, 800));
        window.location.assign(getZaptroPostLoginLandingUrl());
        return;
      }

      const { data: signInData, error: signInError } = await supabaseZaptro.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signInError) {
        const msg = signInError.message || '';
        const looksLikeBadGateway =
          /json|JSON|fetch|network|Failed to connect|ECONNREFUSED|502|503|504/i.test(msg);
        if (looksLikeBadGateway) {
          setError('SERVIDOR DE LOGIN INDISPONÍVEL.');
          notifyZaptro('error', 'Não foi possível entrar', 'Falha na ligação ao servidor.');
        } else {
          setError('USUÁRIO OU SENHA INVÁLIDOS.');
          notifyZaptro('error', 'Não foi possível entrar', msg || 'Confira e-mail e senha.');
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
          setError('ERRO AO CONFIGURAR PERFIL.');
          notifyZaptro('error', 'Erro', 'Contate o suporte.');
          await supabaseZaptro.auth.signOut();
          return;
        }
        finalProfile = repaired;
      }

      if (!profileHasZaptroProductAccess(finalProfile)) {
        await supabaseZaptro.auth.signOut();
        setError('CONTA SEM ACESSO ATIVO.');
        notifyZaptro('warning', 'Acesso negado', 'Módulo Zaptro não liberado.');
        return;
      }

      toast.dismiss();
      setIsLoggingIn(true);
      // Ajustado para o ciclo de 4 frases (aprox 4s total)
      const waitTime = 4500;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      window.location.assign(getZaptroPostLoginLandingUrl());
    } catch (_err) {
      setError('Falha ao autenticar.');
      notifyZaptro('error', 'Erro de conexão', 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zaptro-login-root" style={styles.page}>
      <div className="zaptro-login-card" style={styles.loginCard}>
        {/* Left Side: Mesh Gradient */}
        <div className="zaptro-login-hero" style={styles.cardLeft}>
            <div className="zaptro-login-mesh" style={styles.meshContainer} aria-hidden>
            {/* ~30% verde (lima): mancha forte centro–direita; o resto fica preto base. */}
            <div
              style={{
                ...styles.meshBlob,
                top: '-8%',
                right: '-22%',
                backgroundColor: '#D9FF00',
                width: '92%',
                height: '88%',
                opacity: 0.55,
                filter: 'blur(120px)',
              }}
            />
            {/* ~20% branco: canto inferior direito (não cobre o texto à esquerda). */}
            <div
              style={{
                ...styles.meshBlob,
                bottom: '-25%',
                right: '-18%',
                backgroundColor: '#FFFFFF',
                width: '58%',
                height: '55%',
                opacity: 0.42,
                filter: 'blur(100px)',
              }}
            />
            {/* Reforço preto no canto superior esquerdo (logo / título). */}
            <div
              style={{
                ...styles.meshBlob,
                top: '-15%',
                left: '-20%',
                backgroundColor: '#000000',
                width: '75%',
                height: '70%',
                opacity: 0.5,
                filter: 'blur(80px)',
              }}
            />
          </div>
          
          <div className="zaptro-login-hero-inner" style={styles.cardLeftContent}>
            <div style={styles.cardLogo}>
              <ZapRay size={32} color="#D9FF00" />
              <span style={{ fontSize: 28, fontWeight: 700, color: '#FFF', letterSpacing: '-1.5px' }}>ZAPTRO</span>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
               <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700, margin: '0 0 16px 0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                 Bem-vindo à nova era
               </p>
               <h2
                 style={{
                   color: '#FFF',
                   fontSize: 'clamp(32px, 4vw, 48px)',
                   fontWeight: 700,
                   lineHeight: 1.05,
                   margin: 0,
                   letterSpacing: '-2px',
                   maxWidth: '500px',
                   textShadow: '0 2px 28px rgba(0,0,0,0.85), 0 1px 0 rgba(0,0,0,0.4)',
                 }}
               >
                 Gerencie sua operação com inteligência e clareza.
               </h2>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="zaptro-login-form-col" style={styles.cardRight}>
          <div style={styles.formWrapper}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 40 }}>
               <ZapRay size={24} color="#000" />
            </div>

            <div style={{ marginBottom: 20 }}>
               <h1 style={{ fontSize: 28, fontWeight: 700, color: '#000', margin: '0 0 4px 0', letterSpacing: '-1px' }}>
                 {authMode === 'forgot' ? 'Recuperar conta' : 'Acesse sua conta'}
               </h1>
               <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>
                 {authMode === 'forgot' 
                   ? 'Enviaremos as instruções de recuperação para seu e-mail corporativo.' 
                   : 'Gerencie sua operação logística com inteligência e clareza em um só lugar.'}
               </p>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={authMode === 'forgot' ? handleForgotPassword : handleLogin} style={styles.formStack}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>E-mail</label>
                <div style={styles.inputWrapper}>
                  <input 
                    type="email" 
                    placeholder="exemplo@empresa.com" 
                    style={styles.input} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              {authMode === 'login' && (
                <div style={styles.inputGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={styles.label}>Senha</label>
                  </div>
                  <div style={styles.inputWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      style={styles.input}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" style={styles.submitBtn} disabled={loading}>
                {loading ? <Loader2 size={20} className="spin" /> : (authMode === 'forgot' ? 'Enviar Link' : 'Entrar na Plataforma')}
              </button>

              {/* ⚡ ATALHO PARA DESENVOLVEDOR: Só aparece em localhost */}
              {isDev && authMode === 'login' && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEmail('admzaptro@teste.com');
                    setPassword('123456');
                    setTimeout(() => {
                      const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                      btn?.click();
                    }, 100);
                  }}
                  style={{
                    ...styles.submitBtn,
                    backgroundColor: 'transparent',
                    color: '#D9FF00',
                    border: '2px solid #D9FF00',
                    marginTop: '0'
                  }}
                >
                  Entrar como Desenvolvedor
                </button>
              )}
            </form>

            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>ou continue com</span>
              <div style={styles.dividerLine} />
            </div>

            <div style={styles.socialRow}>
               <button type="button" style={styles.socialBtn}>Google</button>
               <button type="button" style={styles.socialBtn}>Microsoft</button>
            </div>

            <p style={styles.footerText}>
              {authMode === 'login' ? (
                <>
                  Esqueceu sua senha? <span onClick={() => setAuthMode('forgot')} style={styles.link}>Clique aqui</span>
                </>
              ) : (
                <span onClick={() => setAuthMode('login')} style={styles.link}>Voltar para o login</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        .zaptro-login-root {
          background-color: #000000;
        }
        .zaptro-login-mesh {
          pointer-events: none;
        }
        /* Em ecrãs estreitos o painel da marca deixa de ser «uma faixa fina» ao lado do formulário. */
        @media (max-width: 900px) {
          .zaptro-login-card {
            flex-direction: column !important;
          }
          .zaptro-login-hero {
            flex: 0 0 auto !important;
            width: 100% !important;
            min-height: min(40vh, 320px) !important;
            max-height: 48vh;
            padding: 28px 24px 32px !important;
          }
          .zaptro-login-hero .zaptro-login-hero-inner {
            justify-content: flex-start !important;
            gap: 20px;
          }
          .zaptro-login-form-col {
            flex: 1 1 auto !important;
            width: 100% !important;
            min-height: 0;
            padding: 28px 20px 40px !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, any> = {
  page: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    backgroundColor: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  loginCard: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#FFF',
    overflow: 'hidden',
    position: 'relative',
  },
  cardLeft: {
    flex: '1 1 45%',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: '60px',
    backgroundColor: '#000000',
  },
  meshContainer: {
    position: 'absolute',
    inset: 0,
    /**
     * ~50% preto: cor base + vinhetas (o gradiente linear anterior “abria” claro em demasia).
     * ~30% verde + ~20% branco: radiais localizadas + blobs (área visual, não % ao longo de um eixo só).
     */
    backgroundColor: '#000000',
    isolation: 'isolate' as const,
    backgroundImage: [
      'radial-gradient(ellipse 78% 65% at 94% 94%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.12) 22%, transparent 46%)',
      'radial-gradient(ellipse 105% 92% at 74% 36%, rgba(217, 255, 0, 0.62) 0%, rgba(0, 0, 0, 0.22) 34%, rgba(0, 0, 0, 0.06) 52%, transparent 68%)',
      'radial-gradient(ellipse 90% 75% at 6% 10%, #000000 0%, rgba(0, 0, 0, 0.55) 42%, transparent 68%)',
      'radial-gradient(ellipse 80% 70% at 0% 100%, #000000 0%, transparent 55%)',
    ].join(', '),
    overflow: 'hidden',
    zIndex: 0,
  },
  meshBlob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(100px)',
    zIndex: 0,
  },
  cardLeftContent: {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  container: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box' as const,
  },
  cardRight: {
    flex: '1 1 55%',
    backgroundColor: '#FFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 60px',
    overflowY: 'auto',
  },
  formWrapper: {
    width: '100%',
    maxWidth: '400px',
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f172a',
    letterSpacing: '0.01em',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1.5px solid #E2E8F0',
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: '#FFF',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#0f172a',
    color: '#D9FF00',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'transform 0.1s ease',
  },
  errorBox: {
    padding: '12px 16px',
    backgroundColor: '#FFF1F2',
    color: '#E11D48',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px',
    border: '1px solid #FFE4E6',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '24px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'lowercase',
  },
  socialRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  socialBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '12px',
    border: '1.5px solid #E2E8F0',
    backgroundColor: '#FFF',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f172a',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  footerText: {
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748b',
    margin: 0,
  },
  link: {
    color: '#0f172a',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  }
};

export default Login;
