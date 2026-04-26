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
    <ZaptroLayout hideTopbar contentFullWidth>
      <div
        style={{
          boxSizing: 'border-box',
          width: '100%',
          borderRadius: 27,
          overflow: 'hidden',
          backgroundColor: '#000',
          backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #D9FF00 45%, #051c0f 80%, #000000 100%)',
          minHeight: 'calc(100dvh - 56px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 24px 0',
          position: 'relative',
        }}
      >
        {/* Grid Overlay Premium */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
            maskImage: 'radial-gradient(circle at 50% 40%, black, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 40%, black, transparent 80%)',
          }}
        />

        {/* Header Toolbar */}
        <div
          style={{
            width: '100%',
            height: 72,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
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
                boxShadow: '0 1px 0 rgba(255,255,255,0.55) inset, 0 4px 12px rgba(0,0,0,0.08)',
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
                  top: 'calc(100% + 14px)',
                  right: 0,
                  width: 340,
                  borderRadius: 28,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  padding: 24,
                  zIndex: 50,
                  backgroundColor: palette.hubPopupBg,
                  border: `1px solid ${palette.searchBorder}`,
                  boxSizing: 'border-box',
                  animation: 'zaptro-hub-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <style>{`
                  @keyframes zaptro-hub-pop-in {
                    from { opacity: 0; transform: translateY(10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                  }
                `}</style>
                
                {/* Header Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ShieldCheck size={24} color="#10B981" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: palette.text, letterSpacing: '-0.02em' }}>
                      Ambiente Seguro
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: palette.textMuted, fontWeight: 500 }}>
                      Criptografia de nível militar ativa
                    </p>
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: 12, 
                  marginBottom: 24 
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 18,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${palette.searchBorder}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>Latência</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>24ms</div>
                  </div>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 18,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${palette.searchBorder}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: palette.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>Uptime</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: palette.text }}>99.9%</div>
                  </div>
                </div>

                {/* Action List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => notifyZaptro('info', 'Suporte', 'Use o menu lateral ou o email de suporte.')}
                    style={{
                      padding: '14px 16px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                      border: `1px solid ${palette.searchBorder}`,
                      borderRadius: 16,
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: palette.text,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.1)' : '#f8fafc';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : '#ffffff';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <HelpCircle size={18} /> 
                    <span style={{ flex: 1 }}>Central de Suporte</span>
                    <ArrowRight size={14} opacity={0.5} />
                  </button>

                  <button 
                    type="button" 
                    onClick={handleSignOutFromHub}
                    style={{ 
                      padding: '14px 16px', 
                      background: 'rgba(239, 68, 68, 0.08)', 
                      border: '1px solid rgba(239, 68, 68, 0.1)', 
                      borderRadius: 16, 
                      color: '#EF4444', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <LogOut size={18} /> 
                    <span>Encerrar Sessão</span>
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
              maxWidth: 1400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                marginBottom: 48,
                paddingTop: 'clamp(20px, 4vw, 40px)',
                boxSizing: 'border-box',
                borderRadius: 24,
                minHeight: 0,
                background: 'transparent',
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
                  width: '100%',
                  maxWidth: 880,
                  fontSize: 'clamp(48px, 9vw, 92px)',
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  lineHeight: 0.95,
                  color: '#000000',
                }}
              >
                Do Zap ao controle.
              </h2>
              <p
                style={{
                  margin: '16px 0 0',
                  width: '100%',
                  maxWidth: 640,
                  fontSize: 'clamp(17px, 2.2vw, 22px)',
                  fontWeight: 400,
                  lineHeight: 1.4,
                  color: '#000000',
                  opacity: 0.85,
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
