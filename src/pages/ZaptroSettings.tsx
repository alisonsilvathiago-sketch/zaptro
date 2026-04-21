import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot } from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import WhatsAppConfig from './WhatsAppConfig';
import ZaptroAutomation from './ZaptroAutomation';
import ZaptroTeam from './ZaptroTeam';
import ZaptroSettingsApiTab from './ZaptroSettingsApiTab';
import { ZaptroWhiteLabelInner } from './ZaptroWhiteLabel';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER } from '../constants/zaptroUi';
import { hasZaptroGranularPermission, isZaptroTenantAdminRole } from '../utils/zaptroPermissions';
import { zaptroSettingsTabToPageId } from '../utils/zaptroPagePermissionMap';
import { isZaptroBrandingEntitledByPlan } from '../utils/zaptroBrandingEntitlement';

const TAB_KEYS = ['config', 'automation', 'chatbot', 'marca', 'api', 'time'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const CHATBOT_PREFS_KEY = 'zaptro_chatbot_prefs_v1';

function ZaptroChatbotTab() {
  const { palette } = useZaptroTheme();
  const { profile } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const prefsKey = `${CHATBOT_PREFS_KEY}_${profile?.company_id || 'local'}`;
  const [tone, setTone] = useState<'profissional' | 'amigavel' | 'direto'>('profissional');
  const [quietHours, setQuietHours] = useState(true);
  const [signOff, setSignOff] = useState('— Equipa comercial');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(prefsKey);
      if (!raw) return;
      const j = JSON.parse(raw) as {
        tone?: typeof tone;
        quietHours?: boolean;
        signOff?: string;
      };
      if (j.tone === 'profissional' || j.tone === 'amigavel' || j.tone === 'direto') setTone(j.tone);
      if (typeof j.quietHours === 'boolean') setQuietHours(j.quietHours);
      if (typeof j.signOff === 'string') setSignOff(j.signOff);
    } catch {
      /* ignore */
    }
  }, [prefsKey]);

  const savePrefs = () => {
    try {
      localStorage.setItem(prefsKey, JSON.stringify({ tone, quietHours, signOff }));
      setSavedAt(new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      /* ignore */
    }
  };

  const fieldBorder = palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : ZAPTRO_SECTION_BORDER;
  const fieldBg = palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fafafa';

  return (
    <div style={{ maxWidth: 720, padding: '12px 0 32px', boxSizing: 'border-box', width: '100%' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 22 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f5',
            border: `1px solid ${fieldBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bot size={26} color={palette.text} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 22, fontWeight: 950, letterSpacing: '-0.5px', color: palette.text }}>
            Chatbot
          </h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: palette.textMuted, fontWeight: 600 }}>
            Preferências de tom e encerramento guardadas neste browser. A triagem por menu (opções 1, 2, 3…) configura-se em{' '}
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'automation' }, { replace: true })}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
                fontWeight: 950,
                color: palette.text,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Automação / Fluxos
            </button>
            .
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          padding: 22,
          borderRadius: 20,
          border: `1px solid ${fieldBorder}`,
          backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', color: palette.textMuted }}>TOM DAS RESPOSTAS</span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as typeof tone)}
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              border: `1px solid ${fieldBorder}`,
              backgroundColor: fieldBg,
              color: palette.text,
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'inherit',
              accentColor: '#000',
            }}
          >
            <option value="profissional">Profissional e objetivo</option>
            <option value="amigavel">Amigável e próximo</option>
            <option value="direto">Direto (frases curtas)</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: palette.text }}>
          <input type="checkbox" checked={quietHours} onChange={(e) => setQuietHours(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#000' }} />
          Reduzir automatismos fora do horário comercial (9h–18h) — só aviso, integração WhatsApp continua na Central de Conexão.
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', color: palette.textMuted }}>ASSINATURA / DESPEDIDA (TEXTO CURTO)</span>
          <input
            value={signOff}
            onChange={(e) => setSignOff(e.target.value)}
            placeholder="Ex.: — Equipa Zaptro"
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              border: `1px solid ${fieldBorder}`,
              backgroundColor: fieldBg,
              color: palette.text,
              fontWeight: 600,
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={savePrefs}
            style={{
              padding: '12px 20px',
              borderRadius: 14,
              border: 'none',
              background: '#000',
              color: palette.lime,
              fontWeight: 950,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Guardar preferências
          </button>
          {savedAt ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: palette.textMuted }}>Guardado às {savedAt}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const ZaptroSettingsInner: React.FC = () => {
  const { palette } = useZaptroTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isMaster } = useAuth();
  const { company } = useTenant();
  const rawParam = searchParams.get('tab') || 'config';
  const normalized = rawParam === 'branding' ? 'marca' : rawParam;
  const activeTab: TabKey = TAB_KEYS.includes(normalized as TabKey) ? (normalized as TabKey) : 'config';

  const tabs = useMemo(
    () =>
      [
        { id: 'config' as const, label: 'Configuração' },
        { id: 'automation' as const, label: 'Automação / Fluxos' },
        { id: 'chatbot' as const, label: 'Chatbot' },
        { id: 'marca' as const, label: 'Personalizar empresa' },
        { id: 'api' as const, label: 'Integrações API' },
        { id: 'time' as const, label: 'Equipe e Acessos' },
      ] as const,
    [],
  );

  const tabAllowed = useCallback(
    (id: TabKey) => {
      if (isMaster || isZaptroTenantAdminRole(profile?.role)) return true;
      if (id === 'marca' && !isZaptroBrandingEntitledByPlan(company)) return false;
      return hasZaptroGranularPermission(profile?.role, profile?.permissions, zaptroSettingsTabToPageId(id));
    },
    [isMaster, profile?.role, profile?.permissions, company],
  );

  const visibleTabs = useMemo(() => tabs.filter((t) => tabAllowed(t.id)), [tabs, tabAllowed]);

  const setTab = (id: TabKey) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (visibleTabs.some((t) => t.id === activeTab)) return;
    const next = visibleTabs[0].id;
    setSearchParams({ tab: next }, { replace: true });
  }, [activeTab, visibleTabs, setSearchParams]);

  const isDark = palette.mode === 'dark';
  /** Neutro quente Zaptro (#f4f4f4), não zinc #f4f4f5. */
  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : ZAPTRO_FIELD_BG;
  const tabBorder = isDark ? 'rgba(255,255,255,0.1)' : ZAPTRO_SECTION_BORDER;
  /** Abas inativas: cinza legível sobre o trilho claro (evita slate azulado do textMuted). */
  const tabLabelInactive = isDark ? palette.textMuted : '#525252';

  /** Uma só largura máxima em todas as abas — evita reflow da grelha e sensação de “aba maior” ao entrar em Automação. */
  const shellMax = 'min(100%, 1360px)';

  return (
    <div style={{ width: '100%', maxWidth: shellMax, margin: '0 auto', boxSizing: 'border-box' }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 37, fontWeight: 600, letterSpacing: '-0.8px', color: palette.text }}>
          Configurações
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: palette.textMuted, fontWeight: 600, lineHeight: 1.5 }}>
          Conexão WhatsApp, automação, chatbot, marca, integrações API e equipe.
        </p>
      </header>

      <div className="zaptro-settings-layout">
        <div
          role="tablist"
          aria-label="Secções de configuração"
          className="zaptro-settings-nav"
          style={{
            flexShrink: 0,
            width: 220,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            borderRadius: 18,
            backgroundColor: trackBg,
            border: `1px solid ${tabBorder}`,
            boxSizing: 'border-box',
            alignSelf: 'flex-start',
          }}
        >
          {visibleTabs.map(({ id, label }) => {
            const on = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                id={`zaptro-settings-tab-${id}`}
                onClick={() => setTab(id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  width: '100%',
                  minWidth: 0,
                  minHeight: 0,
                  padding: '14px 12px',
                  boxSizing: 'border-box',
                  borderRadius: 14,
                  border: on ? `1px solid ${isDark ? '#fafafa' : '#18181b'}` : '1px solid transparent',
                  backgroundColor: on ? (isDark ? '#111111' : '#FFFFFF') : 'transparent',
                  color: on ? palette.text : tabLabelInactive,
                  boxShadow: on ? (isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.06)') : 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    fontWeight: 850,
                    fontSize: 12.5,
                    lineHeight: 1.35,
                    textAlign: 'left',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          aria-labelledby={`zaptro-settings-tab-${activeTab}`}
          className="zaptro-settings-panel"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 200,
            borderRadius: 20,
            border: `1px solid ${tabBorder}`,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
            padding:
              activeTab === 'config'
                ? '28px 24px 36px'
                : activeTab === 'time'
                  ? '16px 16px 28px'
                  : '24px 24px 36px',
            boxSizing: 'border-box',
          }}
        >
          {activeTab === 'config' && <WhatsAppConfig />}
          {activeTab === 'automation' && <ZaptroAutomation hideLayout />}
          {activeTab === 'chatbot' && <ZaptroChatbotTab />}
          {activeTab === 'marca' && <ZaptroWhiteLabelInner embedded />}
          {activeTab === 'api' && <ZaptroSettingsApiTab />}
          {activeTab === 'time' && <ZaptroTeam hideLayout />}
        </div>
      </div>

      <style>{`
        .zaptro-settings-layout {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 24px;
          width: 100%;
        }
        @media (max-width: 960px) {
          .zaptro-settings-layout {
            flex-direction: column;
            align-items: stretch;
          }
          .zaptro-settings-nav {
            width: 100% !important;
            flex-direction: row !important;
            flex-wrap: wrap;
            align-self: stretch !important;
          }
          .zaptro-settings-nav button[role="tab"] {
            flex: 1 1 calc(50% - 4px);
            min-width: 140px;
          }
        }
      `}</style>
    </div>
  );
};

const ZaptroSettings: React.FC = () => {
  return (
    <ZaptroLayout contentFullWidth>
      <ZaptroSettingsInner />
    </ZaptroLayout>
  );
};

export default ZaptroSettings;
