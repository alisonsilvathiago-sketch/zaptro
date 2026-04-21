import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'zaptro_cookie_consent_v1';

export type ZaptroCookieConsentStatus = 'accepted' | 'rejected';

export function readCookieConsent(): ZaptroCookieConsentStatus | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Faixa fixa no fundo do ecrã (LGPD / consentimento de cookies).
 * Mostra-se até o utilizador aceitar, rejeitar ou guardar preferências nas definições.
 */
const ZaptroCookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (!v) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dispatchConsent = useCallback((status: ZaptroCookieConsentStatus) => {
    window.dispatchEvent(new CustomEvent('zaptro:cookie-consent', { detail: { status } }));
  }, []);

  const persist = useCallback(
    (status: ZaptroCookieConsentStatus) => {
      try {
        localStorage.setItem(STORAGE_KEY, status);
      } catch {
        /* ignore */
      }
      dispatchConsent(status);
      setVisible(false);
      setPrefsOpen(false);
    },
    [dispatchConsent],
  );

  const acceptAll = useCallback(() => {
    try {
      localStorage.setItem('zaptro_cookie_prefs_v1', JSON.stringify({ analytics: true, ads: true }));
    } catch {
      /* ignore */
    }
    persist('accepted');
  }, [persist]);

  const rejectAll = useCallback(() => {
    try {
      localStorage.setItem('zaptro_cookie_prefs_v1', JSON.stringify({ analytics: false, ads: false }));
    } catch {
      /* ignore */
    }
    persist('rejected');
  }, [persist]);

  const savePreferences = useCallback(() => {
    const marketing = analytics || ads;
    try {
      localStorage.setItem('zaptro_cookie_prefs_v1', JSON.stringify({ analytics, ads }));
    } catch {
      /* ignore */
    }
    persist(marketing ? 'accepted' : 'rejected');
  }, [analytics, ads, persist]);

  if (!visible) return null;

  return (
    <>
      {prefsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="zaptro-cookie-prefs-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPrefsOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              borderRadius: 16,
              backgroundColor: '#111',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '24px 22px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
              color: '#fafafa',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <h2 id="zaptro-cookie-prefs-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Definições de cookies
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setPrefsOpen(false)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: 8,
                  cursor: 'pointer',
                  color: '#fff',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: '14px 0 18px', fontSize: 13, lineHeight: 1.55, color: 'rgba(250,250,250,0.75)' }}>
              Escolhe que cookies opcionais autorizas. Os cookies necessários para o funcionamento do serviço permanecem
              ativos.
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
              Medição e análise de utilização
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} />
              Personalização e medição de anúncios
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPrefsOpen(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={savePreferences}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#fff',
                  color: '#0a0a0a',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Guardar preferências
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        role="dialog"
        aria-label="Consentimento de cookies"
        aria-describedby="zaptro-cookie-banner-desc"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99990,
          backgroundColor: '#0a0a0a',
          color: '#fafafa',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.35)',
          padding: 'clamp(16px, 3vw, 22px) clamp(18px, 4vw, 40px)',
          paddingBottom: 'max(18px, env(safe-area-inset-bottom, 18px))',
          boxSizing: 'border-box',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <p
            id="zaptro-cookie-banner-desc"
            style={{
              margin: 0,
              flex: '1 1 320px',
              fontSize: 13,
              lineHeight: 1.55,
              color: 'rgba(250,250,250,0.92)',
              maxWidth: 'min(720px, 100%)',
            }}
          >
            Ao clicar em &quot;Aceitar todos os cookies&quot;, você concorda em armazenar cookies em seu navegador para
            aprimorar a navegação no site, analisar o uso do site e fornecer aos nossos parceiros de anúncios informações
            para personalização e medição de anúncios.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setPrefsOpen(true);
                setAnalytics(readPrefs().analytics);
                setAds(readPrefs().ads);
              }}
              style={{
                border: 'none',
                background: 'none',
                color: '#fafafa',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '4px 0',
              }}
            >
              Definições de cookies
            </button>
            <button
              type="button"
              onClick={rejectAll}
              style={{
                padding: '11px 18px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.35)',
                background: '#fff',
                color: '#0a0a0a',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              Rejeitar todos
            </button>
            <button
              type="button"
              onClick={acceptAll}
              style={{
                padding: '11px 18px',
                borderRadius: 10,
                border: 'none',
                background: '#fff',
                color: '#0a0a0a',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              Aceitar todos os cookies
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

function readPrefs(): { analytics: boolean; ads: boolean } {
  try {
    const raw = localStorage.getItem('zaptro_cookie_prefs_v1');
    if (raw) {
      const j = JSON.parse(raw) as { analytics?: boolean; ads?: boolean };
      return { analytics: !!j.analytics, ads: !!j.ads };
    }
  } catch {
    /* ignore */
  }
  return { analytics: false, ads: false };
}

export default ZaptroCookieBanner;
