import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import ZaptroCopilot from '../components/Zaptro/ZaptroCopilot';
import { ZaptroPlanVerifiedSealBubble } from '../components/Zaptro/ZaptroPlanVerifiedSealBubble';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { ZAPTRO_FIELD_BG } from '../constants/zaptroUi';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { resolveSessionAvatarUrl } from '../utils/zaptroAvatar';
import { getZaptroPlanVerifiedTier } from '../utils/zaptroPlanVerifiedSeal';

function roleBadgeLabel(role?: string): string {
  if (!role) return 'USER';
  if (role === 'ADMIN') return 'ADM';
  if (role.startsWith('MASTER')) return 'MST';
  if (role.length <= 6) return role;
  return `${role.slice(0, 5)}…`;
}


const ZaptroHomeInicio: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { company } = useTenant();
  const { palette } = useZaptroTheme();
  const navigate = useNavigate();
  const location = useLocation();
    const [hubOpen, setHubOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);

  const sessionAvatarSrc = useMemo(() => resolveSessionAvatarUrl(profile), [profile]);
  const planVerifiedTier = useMemo(() => getZaptroPlanVerifiedTier(company), [company]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Comandante';

  /** Boas-vindas pós-registo: o modal continua no painel de resultados. */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('welcome') === 'true') {
      navigate(`${ZAPTRO_ROUTES.RESULTADOS}?welcome=true`, { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (!hubOpen) return;
    const onDoc = (ev: MouseEvent) => {
      const el = hubRef.current;
      if (el && !el.contains(ev.target as Node)) setHubOpen(false);
    };
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [hubOpen]);

  const handleSignOutFromHub = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setHubOpen(false);
      void signOut();
    },
    [signOut]
  );

  const isDark = palette.mode === 'dark';

  
  return (
    <ZaptroLayout hideTopbar>
      <div
        style={{
          boxSizing: 'border-box',
          width: '100%',
          borderRadius: 27,
          overflow: 'hidden',
          backgroundColor: 'var(--z-p)',
          backgroundImage: 'linear-gradient(0deg, #000000 5%, #D9FF00 50%, #FFFFFF 95%)',
          /**
           * Preenche a viewport menos o padding vertical da área rolável do layout (`24px` + `32px`).
           * O valor antigo `100dvh - 88px` deixava ~`88px` em falta com `hideTopbar`, criando faixa cinza em baixo.
           */
          minHeight: 'calc(100dvh - 56px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <div
          style={{
            width: '100%',
            height: 72,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
            marginTop: 10,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            aria-label="Notificações"
            onClick={() => notifyZaptro('info', 'Notificações', 'Em breve: centro de notificações no painel.')}
            style={{
              position: 'relative',
              width: 52,
              height: 52,
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(244, 244, 244, 1)',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              flexShrink: 0,
            }}
          >
            <Bell size={20} color={palette.text} strokeWidth={2} />
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 10,
                height: 10,
                backgroundColor: '#EF4444',
                borderRadius: '50%',
                border: '2px solid white',
              }}
            />
          </button>

          <div ref={hubRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setHubOpen((o) => !o)}
              style={{
                padding: '14px 24px',
                borderRadius: 18,
                backgroundColor: 'rgba(217, 255, 0, 1)',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                color: '#000000',
                fontWeight: 700,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                boxShadow: '0 1px 0 rgba(255,255,255,0.55) inset, 0 8px 22px rgba(217, 255, 0, 0.22)',
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#000',
                  boxShadow: '0 0 12px rgba(0,0,0,0.4)',
                  animation: 'zaptro-inicio-hub-pulse 1.8s infinite',
                }}
              />
              <span>SISTEMA ATIVO</span>
            </button>
            <style>{`
              @keyframes zaptro-inicio-hub-pulse {
                0% { transform: scale(0.95); opacity: 1; }
                50% { transform: scale(1.15); opacity: 0.7; }
                100% { transform: scale(0.95); opacity: 1; }
              }
            `}</style>

            {hubOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: 300,
                  borderRadius: 25,
                  boxShadow: ZAPTRO_SHADOW.lg,
                  padding: 25,
                  zIndex: 50,
                  backgroundColor: palette.hubPopupBg,
                  border: `1px solid ${palette.searchBorder}`,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                  <ShieldCheck size={20} color="#10B981" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: palette.text }}>Nível de Proteção Ativo</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>Criptografia ponta-a-ponta ativada.</p>
                  </div>
                </div>
                <div
                  style={{
                    borderTop: `1px solid ${palette.searchBorder}`,
                    paddingTop: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => notifyZaptro('info', 'Suporte', 'Use o menu lateral ou o email de suporte da sua conta.')}
                    style={{
                      padding: 12,
                      background: isDark ? palette.searchBg : ZAPTRO_FIELD_BG,
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: palette.text,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      justifyContent: 'center',
                      fontFamily: 'inherit',
                    }}
                  >
                    <HelpCircle size={16} /> Suporte
                  </button>
                  <button type="button" style={{ padding: 12, background: 'transparent', border: 'none', color: '#EF4444', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontFamily: 'inherit' }} onClick={handleSignOutFromHub}>
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(ZAPTRO_ROUTES.PROFILE)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px 10px 20px',
              borderRadius: 20,
              backgroundColor: palette.profileBg,
              border: `1px solid ${palette.profileBorder}`,
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>{firstName}</span>
              <div
                style={{
                  padding: '2px 8px',
                  backgroundColor: '#000',
                  color: '#D9FF00',
                  borderRadius: 6,
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {roleBadgeLabel(profile?.role)}
              </div>
            </div>
            <ChevronDown size={18} color={palette.textMuted} strokeWidth={2.4} style={{ marginRight: 4 }} aria-hidden />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: '#000',
                  color: '#D9FF00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 16,
                  overflow: 'hidden',
                }}
              >
                {sessionAvatarSrc ? (
                  <img src={sessionAvatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  profile?.full_name?.[0] || 'U'
                )}
              </span>
              {planVerifiedTier !== 'none' && (
                <span style={{ lineHeight: 0, flexShrink: 0 }} aria-hidden>
                  <ZaptroPlanVerifiedSealBubble tier={planVerifiedTier} size="sm" />
                </span>
              )}
            </div>
          </button>
        </div>

        <div
          style={{
            flex: 1,
            height: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            width: '100%',
            minHeight: 0,
            marginTop: 0,
            marginBottom: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 664,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '100%',
                height: 266,
                marginBottom: 20,
                paddingTop: 'clamp(28px, 4vw, 48px)',
                paddingBottom: 0,
                paddingLeft: 'clamp(20px, 3vw, 32px)',
                paddingRight: 'clamp(20px, 3vw, 32px)',
                boxSizing: 'border-box',
                borderRadius: 24,
                minHeight: 0,
                background: 'unset',
                backgroundColor: 'unset',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  marginTop: 23,
                  marginBottom: 22,
                  maxWidth: '100%',
                  paddingBottom: 5,
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 20px',
                    borderRadius: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 1)',
                    color: '#ffffff',
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Zaptro AI
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#000000',
                    letterSpacing: '-0.01em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  Tudo cruzado num só lugar, pergunta que eu te guio
                  <ArrowRight size={16} strokeWidth={2.4} aria-hidden />
                </span>
              </div>
              <h2
                style={{
                  margin: '0 0 16px',
                  width: 837,
                  maxWidth: 762,
                  height: 132,
                  paddingLeft: 0,
                  paddingRight: 0,
                  fontSize: 76,
                  fontWeight: 700,
                  letterSpacing: 0,
                  lineHeight: 0.9,
                  color: '#000000',
                }}
              >
                Do Zap ao controle.
              </h2>
              <p
                style={{
                  margin: '9px 0',
                  width: 755,
                  maxWidth: 843,
                  height: 57,
                  paddingTop: 0,
                  paddingBottom: 0,
                  fontSize: 20,
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color: '#000000',
                  background: 'unset',
                  backgroundColor: 'unset',
                }}
              >
                Tudo cruzado num só lugar, pergunta que eu te guio.
              </p>
            </div>
            <ZaptroCopilot variant="inline" />
          </div>
        </div>
      </div>
    </ZaptroLayout>
  );
};

export default ZaptroHomeInicio;
