import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Globe,
  Image as ImageIcon,
  Info,
  LayoutTemplate,
  Palette,
  Sparkles,
  SquareStack,
  Upload,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useZaptroTheme } from '../../context/ZaptroThemeContext';
import { supabaseZaptro } from '../../lib/supabase-zaptro';
import { notifyZaptro } from './ZaptroNotificationSystem';
import { formatZaptroDbErrorForToast } from '../../utils/zaptroSchemaErrors';
import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER, ZAPTRO_TITLE_COLOR } from '../../constants/zaptroUi';
import { zaptroCompanyLoginPath } from '../../constants/zaptroRoutes';

type BrandTab = 'logo' | 'cores' | 'login';

const DEFAULT_LOGIN_GRAD =
  'linear-gradient(135deg, #667eea 0%, #764ba2 45%, #6dd5ed 100%)';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });
}

/** Contraste simples para texto sobre swatches de cor. */
function pickLabelOnColor(hex: string): string {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6 || /[^0-9a-f]/i.test(full)) return '#0f172a';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 186 ? '#0f172a' : '#ffffff';
}

const baseTab: React.CSSProperties = {
  padding: '8px 20px',
  border: 'none',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 900,
  cursor: 'pointer',
  backgroundColor: 'transparent',
};

const st = {
  brandModalSub: { margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, fontWeight: 600 } as const,
  brandModalBody: { marginBottom: 24 } as const,
  brandFieldLbl: {
    display: 'block',
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: '0.06em',
    color: ZAPTRO_TITLE_COLOR,
    marginBottom: 6,
  } as const,
  brandInputBase: {
    width: '100%',
    marginTop: 0,
    padding: '12px 14px',
    borderRadius: 14,
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    fontWeight: 700,
    fontSize: 14,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  } as const,
  brandHint: { margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, fontWeight: 600 } as const,
  brandColorRow: { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' } as const,
  /** Swatch + hex compacto (hex não precisa de linha larga). */
  brandColorPair: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' } as const,
  brandColorHexInput: {
    width: 118,
    maxWidth: 118,
    flex: '0 0 118px',
    marginTop: 0,
    padding: '10px 10px',
    borderRadius: 14,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.03em',
    boxSizing: 'border-box',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  } as const,
  brandColorNative: {
    width: 48,
    height: 44,
    padding: 0,
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    borderRadius: 12,
    cursor: 'pointer',
    background: 'transparent',
  } as const,
  brandPreviewRow: { marginTop: 20, paddingTop: 16, borderTop: `1px solid ${ZAPTRO_SECTION_BORDER}` } as const,
  brandModalFooter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 16,
    borderTop: `1px solid ${ZAPTRO_SECTION_BORDER}`,
  } as const,
  saveBtn: {
    padding: '18px 32px',
    borderRadius: '18px',
    border: 'none',
    backgroundColor: '#0F172A',
    color: 'white',
    fontWeight: 950,
    fontSize: '15px',
    cursor: 'pointer',
  } as const,
};

export type ZaptroCompanyBrandingEditorProps = {
  /** Em Configurações a aba já se chama “Personalizar empresa”; omitir título duplicado. */
  showHeading?: boolean;
  /** Dentro de Configurações > Marca: layout e textos orientados ao cliente. */
  embedded?: boolean;
};

export const ZaptroCompanyBrandingEditor: React.FC<ZaptroCompanyBrandingEditorProps> = ({
  showHeading = true,
  embedded = false,
}) => {
  const { company, fetchCompanyData, setCompany } = useTenant();
  const { palette, canCustomizeTenant } = useZaptroTheme();
  const [brandTab, setBrandTab] = useState<BrandTab>('logo');
  const [loginPreviewLayout, setLoginPreviewLayout] = useState<'split' | 'center'>('split');
  const [loginGradient, setLoginGradient] = useState(DEFAULT_LOGIN_GRAD);
  const [loginButtonColor, setLoginButtonColor] = useState('#D9FF00');
  const [brandForm, setBrandForm] = useState({
    logo_url: '',
    favicon_url: '',
    primary_color: '#D9FF00',
    secondary_color: '#0F172A',
    menu_color: '',
    bg_color: '',
    subdomain: '',
  });
  const [brandSaving, setBrandSaving] = useState(false);
  /** Evita empurrar cores para o tenant no mesmo ciclo em que hidratamos o formulário a partir de `company`. */
  const skipTenantPalettePush = useRef(false);

  useEffect(() => {
    if (!company) return;
    skipTenantPalettePush.current = true;
    const s =
      company.settings && typeof company.settings === 'object' && !Array.isArray(company.settings)
        ? (company.settings as Record<string, unknown>)
        : {};
    const layoutRaw = s.login_layout;
    setLoginPreviewLayout(layoutRaw === 'mesh' ? 'center' : 'split');
    setLoginGradient(typeof s.login_gradient === 'string' && s.login_gradient.trim() ? s.login_gradient : DEFAULT_LOGIN_GRAD);
    setLoginButtonColor(
      typeof s.login_button_color === 'string' && s.login_button_color.trim()
        ? s.login_button_color
        : company.primary_color || '#D9FF00'
    );
    setBrandForm({
      logo_url: company.logo_url || '',
      favicon_url: company.favicon_url || '',
      primary_color: company.primary_color || '#D9FF00',
      secondary_color: company.secondary_color || '#0F172A',
      menu_color: company.menu_color || '',
      bg_color: company.bg_color || '',
      subdomain: (company.subdomain || '').trim().toLowerCase(),
    });
  }, [company]);

  /** Tempo real: `ZaptroThemeProvider` lê `company.*_color` → `palette.lime` e restantes acertos no painel. */
  useEffect(() => {
    if (!company || !canCustomizeTenant) return;
    if (skipTenantPalettePush.current) {
      skipTenantPalettePush.current = false;
      return;
    }
    const menuTrim = brandForm.menu_color.trim();
    const bgTrim = brandForm.bg_color.trim();
    if (
      company.primary_color === brandForm.primary_color &&
      company.secondary_color === brandForm.secondary_color &&
      String(company.menu_color || '') === menuTrim &&
      String(company.bg_color || '') === bgTrim
    ) {
      return;
    }
    setCompany({
      ...company,
      primary_color: brandForm.primary_color,
      secondary_color: brandForm.secondary_color,
      menu_color: menuTrim || undefined,
      bg_color: bgTrim || undefined,
    });
  }, [
    brandForm.primary_color,
    brandForm.secondary_color,
    brandForm.menu_color,
    brandForm.bg_color,
    company,
    canCustomizeTenant,
    setCompany,
  ]);

  const tabsUi = useMemo(() => {
    const light = palette.mode === 'light';
    const tabGroup: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      borderRadius: '14px',
      padding: '2px 4px',
      border: `1px solid ${light ? ZAPTRO_SECTION_BORDER : '#334155'}`,
      backgroundColor: light ? ZAPTRO_FIELD_BG : '#1e293b',
    };
    const tabInactive: React.CSSProperties = {
      ...baseTab,
      color: light ? ZAPTRO_TITLE_COLOR : palette.textMuted,
    };
    const tabActive: React.CSSProperties = light
      ? { ...baseTab, backgroundColor: '#0F172A', color: 'white' }
      : { ...baseTab, backgroundColor: palette.lime, color: '#000' };
    return { tabGroup, tabInactive, tabActive };
  }, [palette]);

  const sanitizeSubdomain = (raw: string) =>
    raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 48);

  const saveCompanyBranding = async () => {
    if (!company?.id || !canCustomizeTenant) return;
    setBrandSaving(true);
    try {
      const subdomain = sanitizeSubdomain(brandForm.subdomain);
      const prev =
        company.settings && typeof company.settings === 'object' && !Array.isArray(company.settings)
          ? (company.settings as Record<string, unknown>)
          : {};
      const nextSettings: Record<string, unknown> = {
        ...prev,
        login_layout: loginPreviewLayout === 'center' ? 'mesh' : 'split',
        login_gradient: loginGradient.trim() || DEFAULT_LOGIN_GRAD,
        login_button_color: loginButtonColor.trim() || brandForm.primary_color,
      };
      const { error } = await supabaseZaptro
        .from('whatsapp_companies')
        .update({
          logo_url: brandForm.logo_url.trim() || null,
          favicon_url: brandForm.favicon_url.trim() || null,
          primary_color: brandForm.primary_color,
          secondary_color: brandForm.secondary_color,
          menu_color: brandForm.menu_color.trim() || null,
          bg_color: brandForm.bg_color.trim() || null,
          subdomain: subdomain || null,
          settings: nextSettings,
        })
        .eq('id', company.id);
      if (error) throw error;
      await fetchCompanyData();
      notifyZaptro('success', 'Empresa', 'Identidade visual e domínio atualizados.');
    } catch (e: unknown) {
      notifyZaptro('error', 'Empresa', formatZaptroDbErrorForToast(e, 'Não foi possível salvar.'));
    } finally {
      setBrandSaving(false);
    }
  };

  const fieldBorder = palette.mode === 'dark' ? palette.searchBorder : palette.sidebarBorder;
  const inputShell = {
    ...st.brandInputBase,
    border: `1px solid ${fieldBorder}`,
    backgroundColor: palette.searchBg,
    color: palette.text,
  };

  return (
    <div style={{ width: '100%', maxWidth: 'min(100%, 1180px)', boxSizing: 'border-box' }}>
      {showHeading && (
        <header style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: '-0.5px', color: palette.text }}>
            Personalizar empresa
          </h2>
          <p style={{ ...st.brandModalSub, color: palette.textMuted }}>
            Logo, cores da interface e endereço do login com a cara da transportadora.
          </p>
        </header>
      )}

      {embedded && !showHeading && (
        <div
          style={{
            marginBottom: 22,
            padding: '18px 20px',
            borderRadius: 18,
            border: `1px solid ${palette.mode === 'dark' ? 'rgba(148,163,184,0.2)' : '#e8e8ec'}`,
            backgroundColor: palette.mode === 'dark' ? 'rgba(15,23,42,0.65)' : '#ffffff',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'flex-start',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${brandForm.primary_color} 0%, ${brandForm.secondary_color} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: pickLabelOnColor(brandForm.primary_color),
            }}
            aria-hidden
          >
            <Sparkles size={22} strokeWidth={2.2} />
          </div>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <h2
              style={{
                margin: '0 0 6px',
                fontSize: 18,
                fontWeight: 950,
                letterSpacing: '-0.03em',
                color: palette.text,
              }}
            >
              Marca no painel e no login
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, fontWeight: 600, color: palette.textMuted, maxWidth: 560 }}>
              Logo, cores e domínio de entrada — a pré-visualização segue o que definires (cores em tempo real no painel).
            </p>
          </div>
        </div>
      )}

      {!canCustomizeTenant && (
        <div
          style={{
            marginBottom: 28,
            padding: '22px 22px 26px',
            borderRadius: 20,
            border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : palette.navActiveBorder}`,
            backgroundColor: palette.navActiveBg,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            <div
              style={{
                flexShrink: 0,
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: palette.mode === 'dark' ? 'rgba(15,23,42,0.85)' : '#0f172a',
                color: palette.lime,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Info size={24} strokeWidth={2.2} />
            </div>
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <div
                style={{
                  display: 'inline-block',
                  marginBottom: 10,
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 950,
                  letterSpacing: '0.08em',
                  backgroundColor: palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : '#0f172a',
                  color: palette.lime,
                }}
              >
                SOMENTE LEITURA
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 950, color: palette.text, letterSpacing: '-0.02em' }}>
                Marca bloqueada neste plano
              </h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, fontWeight: 600, color: palette.textMuted }}>
                O plano desta transportadora <strong style={{ color: palette.text }}>não inclui edição de marca</strong>, ou o
                Administrador Master definiu <code style={{ fontSize: 12, fontWeight: 800 }}>settings.zaptro_branding = false</code>{' '}
                em <code style={{ fontSize: 12, fontWeight: 800 }}>whatsapp_companies</code>. O MASTER altera plano / JSON; o ADMIN
                consulta abaixo em pré-visualização mas <strong style={{ color: palette.text }}>não grava</strong> até a marca estar
                activa.
              </p>
            </div>
          </div>

          <p
            style={{
              margin: '22px 0 12px',
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: '0.1em',
              color: palette.textMuted,
            }}
          >
            PRÉ-VISUALIZAÇÃO · DOIS MODELOS DE LOGIN (QUANDO A MARCA ESTIVER LIBERADA)
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: 16,
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                overflow: 'hidden',
                backgroundColor: palette.mode === 'dark' ? '#0f172a' : '#fff',
                boxShadow: palette.mode === 'dark' ? 'none' : '0 10px 30px rgba(15,23,42,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderBottom: `1px solid ${palette.mode === 'dark' ? '#334155' : '#f1f5f9'}`,
                  fontSize: 11,
                  fontWeight: 950,
                  color: palette.textMuted,
                  letterSpacing: '0.04em',
                }}
              >
                <LayoutTemplate size={15} strokeWidth={2.2} /> MODELO 1 · PAINEL LATERAL
              </div>
              <div style={{ display: 'flex', minHeight: 148, alignItems: 'stretch' }}>
                <div
                  style={{
                    flex: '0 0 42%',
                    background: `linear-gradient(165deg, ${brandForm.secondary_color} 0%, #0f172a 92%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 10,
                  }}
                >
                  {brandForm.logo_url.trim() ? (
                    <img src={brandForm.logo_url.trim()} alt="" style={{ maxWidth: '100%', maxHeight: 40, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: '#e2e8f0', fontWeight: 950, fontSize: 10 }}>LOGO</span>
                  )}
                </div>
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ height: 8, borderRadius: 4, background: '#ebebeb', width: '50%' }} />
                  <div style={{ height: 8, borderRadius: 4, background: '#ebebeb', width: '100%' }} />
                  <div style={{ height: 8, borderRadius: 4, background: '#ebebeb', width: '100%' }} />
                  <div
                    style={{
                      height: 26,
                      borderRadius: 8,
                      backgroundColor: brandForm.primary_color,
                      marginTop: 4,
                      fontSize: 9,
                      fontWeight: 950,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                    }}
                  >
                    Entrar
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, padding: '10px 12px 12px', fontSize: 12, fontWeight: 600, color: palette.textMuted, lineHeight: 1.45 }}>
                Formulário à direita; arte / logo à esquerda — igual ao login Zaptro em ecrã largo.
              </p>
            </div>

            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                overflow: 'hidden',
                backgroundColor: palette.mode === 'dark' ? '#0f172a' : '#fff',
                boxShadow: palette.mode === 'dark' ? 'none' : '0 10px 30px rgba(15,23,42,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderBottom: `1px solid ${palette.mode === 'dark' ? '#334155' : '#f1f5f9'}`,
                  fontSize: 11,
                  fontWeight: 950,
                  color: palette.textMuted,
                  letterSpacing: '0.04em',
                }}
              >
                <SquareStack size={15} strokeWidth={2.2} /> MODELO 2 · CENTRADO
              </div>
              <div
                style={{
                  minHeight: 148,
                  padding: '14px 12px',
                  background: DEFAULT_LOGIN_GRAD,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: 200,
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    padding: '14px 12px',
                    boxShadow: '0 14px 32px rgba(15,23,42,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {brandForm.logo_url.trim() ? (
                    <img src={brandForm.logo_url.trim()} alt="" style={{ maxWidth: '100%', maxHeight: 36, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: '#0f172a', fontWeight: 950, fontSize: 11 }}>Marca</span>
                  )}
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#ebebeb' }} />
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#ebebeb' }} />
                  <div
                    style={{
                      width: '100%',
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: brandForm.primary_color,
                      fontSize: 9,
                      fontWeight: 950,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                    }}
                  >
                    Entrar
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, padding: '10px 12px 12px', fontSize: 12, fontWeight: 600, color: palette.textMuted, lineHeight: 1.45 }}>
                Cartão branco ao centro sobre degradê — ideal para marca forte e fundo personalizado.
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...tabsUi.tabGroup, marginBottom: 22, flexWrap: 'wrap', padding: '4px 6px' }}>
        {(
          [
            { id: 'logo' as const, label: 'Logo & favicon', Icon: ImageIcon },
            { id: 'cores' as const, label: 'Cores', Icon: Palette },
            { id: 'login' as const, label: 'Login & domínio', Icon: Globe },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            style={{
              ...tabsUi.tabInactive,
              ...(brandTab === id ? tabsUi.tabActive : {}),
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={() => setBrandTab(id)}
          >
            <Icon size={16} strokeWidth={2.2} />
            {label}
          </button>
        ))}
      </div>

      <div style={st.brandModalBody}>
        {brandTab === 'logo' && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                gap: 28,
                alignItems: 'stretch',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ ...st.brandHint, color: palette.textMuted, marginTop: 0, marginBottom: 18 }}>
                  Anexe o <strong style={{ color: palette.text }}>ícone quadrado</strong> (menu fechado) e o{' '}
                  <strong style={{ color: palette.text }}>logo horizontal</strong> (menu aberto). À direita vê como fica no
                  painel; depois de <strong style={{ color: palette.text }}>Guardar</strong>, a equipa passa a ver a mesma
                  coisa.
                </p>

                <div
                  style={{
                    marginBottom: 18,
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                    backgroundColor: palette.mode === 'dark' ? 'rgba(15,23,42,0.45)' : '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={st.brandFieldLbl}>Ícone do menu lateral</span>
                  <p style={{ margin: '4px 0 14px', fontSize: 12, fontWeight: 600, color: palette.textMuted, lineHeight: 1.45 }}>
                    Quadrado · cerca de <strong style={{ color: palette.text }}>192–512 px</strong> (PNG/SVG)
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: 16,
                        border: `1px dashed ${palette.mode === 'dark' ? '#475569' : '#cbd5e1'}`,
                        backgroundColor: palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : ZAPTRO_FIELD_BG,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {brandForm.favicon_url.trim() ? (
                        <img
                          src={brandForm.favicon_url.trim()}
                          alt=""
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <ImageIcon size={28} color={palette.textMuted} strokeWidth={1.8} aria-hidden />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 16px',
                          borderRadius: 14,
                          border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                          backgroundColor: brandForm.primary_color,
                          color: pickLabelOnColor(brandForm.primary_color),
                          fontWeight: 950,
                          fontSize: 13,
                          cursor: canCustomizeTenant ? 'pointer' : 'not-allowed',
                          opacity: canCustomizeTenant ? 1 : 0.55,
                        }}
                      >
                        <Upload size={16} strokeWidth={2.2} aria-hidden />
                        Anexar ícone
                        <input
                          id="zaptro-brand-favicon-file"
                          type="file"
                          accept="image/*"
                          disabled={!canCustomizeTenant}
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              const url = await fileToDataUrl(f);
                              setBrandForm((prev) => ({ ...prev, favicon_url: url }));
                            } catch {
                              notifyZaptro('error', 'Ícone', 'Não foi possível ler o ficheiro.');
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {brandForm.favicon_url.trim() ? (
                        <button
                          type="button"
                          disabled={!canCustomizeTenant}
                          onClick={() => setBrandForm((f) => ({ ...f, favicon_url: '' }))}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: palette.textMuted,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: canCustomizeTenant ? 'pointer' : 'not-allowed',
                            textDecoration: 'underline',
                            padding: 0,
                            fontFamily: 'inherit',
                          }}
                        >
                          Remover ícone
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginBottom: 18,
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                    backgroundColor: palette.mode === 'dark' ? 'rgba(15,23,42,0.45)' : '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={st.brandFieldLbl}>Logo horizontal (marca com nome)</span>
                  <p style={{ margin: '4px 0 14px', fontSize: 12, fontWeight: 600, color: palette.textMuted, lineHeight: 1.45 }}>
                    Faixa larga · cerca de <strong style={{ color: palette.text }}>440×120 px</strong> (fundo transparente)
                  </p>
                  <div
                    style={{
                      width: '100%',
                      minHeight: 72,
                      borderRadius: 14,
                      border: `1px dashed ${palette.mode === 'dark' ? '#475569' : '#cbd5e1'}`,
                      backgroundColor: palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : ZAPTRO_FIELD_BG,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                      marginBottom: 12,
                      boxSizing: 'border-box',
                    }}
                  >
                    {brandForm.logo_url.trim() ? (
                      <img
                        src={brandForm.logo_url.trim()}
                        alt=""
                        style={{ maxWidth: '100%', maxHeight: 56, objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700, color: palette.textMuted }}>Pré-visualização do logo</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        borderRadius: 14,
                        border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                        backgroundColor: brandForm.primary_color,
                        color: pickLabelOnColor(brandForm.primary_color),
                        fontWeight: 950,
                        fontSize: 13,
                        cursor: canCustomizeTenant ? 'pointer' : 'not-allowed',
                        opacity: canCustomizeTenant ? 1 : 0.55,
                      }}
                    >
                      <Upload size={16} strokeWidth={2.2} aria-hidden />
                      Anexar logo
                      <input
                        id="zaptro-brand-logo-file"
                        type="file"
                        accept="image/*"
                        disabled={!canCustomizeTenant}
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          try {
                            const url = await fileToDataUrl(f);
                            setBrandForm((prev) => ({ ...prev, logo_url: url }));
                          } catch {
                            notifyZaptro('error', 'Logo', 'Não foi possível ler o ficheiro.');
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {brandForm.logo_url.trim() ? (
                      <button
                        type="button"
                        disabled={!canCustomizeTenant}
                        onClick={() => setBrandForm((f) => ({ ...f, logo_url: '' }))}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: palette.textMuted,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: canCustomizeTenant ? 'pointer' : 'not-allowed',
                          textDecoration: 'underline',
                          padding: 0,
                          fontFamily: 'inherit',
                        }}
                      >
                        Remover logo
                      </button>
                    ) : null}
                  </div>
                </div>

                <details
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                    backgroundColor: palette.mode === 'dark' ? 'rgba(15,23,42,0.35)' : ZAPTRO_FIELD_BG,
                    padding: '12px 14px',
                  }}
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 950,
                      letterSpacing: '0.04em',
                      color: palette.textMuted,
                      listStyle: 'none',
                    }}
                  >
                    URL em produção (HTTPS, opcional)
                  </summary>
                  <p style={{ ...st.brandHint, color: palette.textMuted, marginTop: 12, marginBottom: 10 }}>
                    Para CDN ou alojamento estável, cole o link em vez de anexar ficheiro.
                  </p>
                  <label style={st.brandFieldLbl}>Logo horizontal (URL)</label>
                  <input
                    disabled={!canCustomizeTenant}
                    value={brandForm.logo_url}
                    onChange={(e) => setBrandForm((f) => ({ ...f, logo_url: e.target.value }))}
                    placeholder="https://…"
                    style={{ ...inputShell, marginBottom: 12 }}
                  />
                  <label style={st.brandFieldLbl}>Ícone (URL)</label>
                  <input
                    disabled={!canCustomizeTenant}
                    value={brandForm.favicon_url}
                    onChange={(e) => setBrandForm((f) => ({ ...f, favicon_url: e.target.value }))}
                    placeholder="https://…"
                    style={inputShell}
                  />
                </details>
              </div>

              <div
                style={{
                  minWidth: 0,
                  padding: 18,
                  borderRadius: 18,
                  border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                  backgroundColor: palette.mode === 'dark' ? 'rgba(15,23,42,0.55)' : '#fff',
                  boxSizing: 'border-box',
                  alignSelf: 'start',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 950,
                    letterSpacing: '0.1em',
                    color: palette.textMuted,
                    marginBottom: 6,
                  }}
                >
                  PRÉ-VISUALIZAÇÃO · MENU LATERAL
                </div>
                <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: palette.textMuted }}>
                  Esquerda: barra estreita (só ícone). Direita: barra aberta com o logo completo — é o padrão Zaptro.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
                  <div style={{ flex: '1 1 120px', maxWidth: 140 }}>
                    <div style={{ fontSize: 10, fontWeight: 950, color: palette.textMuted, marginBottom: 8 }}>FECHADO</div>
                    <div
                      style={{
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                        background: `linear-gradient(165deg, ${brandForm.secondary_color} 0%, #0f172a 95%)`,
                        minHeight: 160,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '14px 8px',
                        gap: 10,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {brandForm.favicon_url.trim() ? (
                          <img
                            src={brandForm.favicon_url.trim()}
                            alt=""
                            style={{ maxWidth: 40, maxHeight: 40, objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: 9, fontWeight: 950, color: 'rgba(226,232,240,0.85)' }}>ÍC.</span>
                        )}
                      </div>
                      <div style={{ width: '100%', height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.12)' }} />
                      <div style={{ width: '100%', height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
                      <div style={{ width: '100%', height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                  </div>
                  <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <div style={{ fontSize: 10, fontWeight: 950, color: palette.textMuted, marginBottom: 8 }}>ABERTO</div>
                    <div
                      style={{
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                        background: `linear-gradient(165deg, ${brandForm.secondary_color} 0%, #0f172a 95%)`,
                        minHeight: 160,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '12px 12px 14px',
                        gap: 12,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          minHeight: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 6px',
                        }}
                      >
                        {brandForm.logo_url.trim() ? (
                          <img
                            src={brandForm.logo_url.trim()}
                            alt=""
                            style={{ maxWidth: '100%', maxHeight: 40, objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 950, color: 'rgba(226,232,240,0.9)' }}>LOGO HORIZONTAL</span>
                        )}
                      </div>
                      <div style={{ width: '100%', height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.12)' }} />
                      <div style={{ width: '100%', height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
                      <div style={{ width: '100%', height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {brandTab === 'cores' && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px 40px', alignItems: 'stretch' }}>
              <div style={{ flex: '1 1 280px', minWidth: 0, maxWidth: 'min(100%, 720px)' }}>
                <p style={{ ...st.brandHint, color: palette.textMuted, marginTop: 0, marginBottom: 14, maxWidth: 520 }}>
                  Primária = destaques do painel (ex-limão). À direita: resumo. As cores
                  <strong style={{ color: palette.text }}> atualizam o tema já</strong> nesta sessão; «Salvar» grava no servidor.
                </p>
                <div style={st.brandColorRow}>
                  <div style={{ flex: '0 1 auto', minWidth: 0 }}>
                    <label style={st.brandFieldLbl}>Cor primária</label>
                    <div style={st.brandColorPair}>
                      <input
                        type="color"
                        disabled={!canCustomizeTenant}
                        value={brandForm.primary_color}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBrandForm((f) => ({ ...f, primary_color: v }));
                          setLoginButtonColor(v);
                        }}
                        style={st.brandColorNative}
                      />
                      <input
                        disabled={!canCustomizeTenant}
                        value={brandForm.primary_color}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBrandForm((f) => ({ ...f, primary_color: v }));
                          setLoginButtonColor(v);
                        }}
                        style={{ ...inputShell, ...st.brandColorHexInput }}
                      />
                    </div>
                  </div>
                  <div style={{ flex: '0 1 auto', minWidth: 0 }}>
                    <label style={st.brandFieldLbl}>Cor secundária</label>
                    <div style={st.brandColorPair}>
                      <input
                        type="color"
                        disabled={!canCustomizeTenant}
                        value={brandForm.secondary_color}
                        onChange={(e) => setBrandForm((f) => ({ ...f, secondary_color: e.target.value }))}
                        style={st.brandColorNative}
                      />
                      <input
                        disabled={!canCustomizeTenant}
                        value={brandForm.secondary_color}
                        onChange={(e) => setBrandForm((f) => ({ ...f, secondary_color: e.target.value }))}
                        style={{ ...inputShell, ...st.brandColorHexInput }}
                      />
                    </div>
                  </div>
                </div>
                <label style={{ ...st.brandFieldLbl, marginTop: 18 }}>Cor do menu lateral (opcional)</label>
                <div style={st.brandColorPair}>
                  <input
                    type="color"
                    disabled={!canCustomizeTenant}
                    value={brandForm.menu_color || '#ffffff'}
                    onChange={(e) => setBrandForm((f) => ({ ...f, menu_color: e.target.value }))}
                    style={st.brandColorNative}
                  />
                  <input
                    disabled={!canCustomizeTenant}
                    value={brandForm.menu_color}
                    onChange={(e) => setBrandForm((f) => ({ ...f, menu_color: e.target.value }))}
                    placeholder="#FFF ou vazio"
                    style={{ ...inputShell, ...st.brandColorHexInput }}
                  />
                </div>
                <label style={{ ...st.brandFieldLbl, marginTop: 14 }}>Fundo geral do painel (opcional)</label>
                <div style={st.brandColorPair}>
                  <input
                    type="color"
                    disabled={!canCustomizeTenant}
                    value={brandForm.bg_color || '#ffffff'}
                    onChange={(e) => setBrandForm((f) => ({ ...f, bg_color: e.target.value }))}
                    style={st.brandColorNative}
                  />
                  <input
                    disabled={!canCustomizeTenant}
                    value={brandForm.bg_color}
                    onChange={(e) => setBrandForm((f) => ({ ...f, bg_color: e.target.value }))}
                    placeholder="#FFF ou vazio"
                    style={{ ...inputShell, ...st.brandColorHexInput }}
                  />
                </div>
              </div>

              <div
                style={{
                  flex: '1 1 360px',
                  minWidth: 300,
                  maxWidth: 'min(100%, 480px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                    padding: '18px 20px 16px',
                    backgroundColor: palette.mode === 'dark' ? 'rgba(15,23,42,0.75)' : '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: '0.1em',
                      color: palette.textMuted,
                      marginBottom: 10,
                    }}
                  >
                    AS SUAS CORES
                  </div>
                  {(
                    [
                      { key: 'p', label: 'Primária', sub: 'Destaques e botões', hex: brandForm.primary_color },
                      { key: 's', label: 'Secundária', sub: 'Texto forte / barras', hex: brandForm.secondary_color },
                      {
                        key: 'm',
                        label: 'Menu',
                        sub: brandForm.menu_color.trim() ? 'Barra lateral' : 'Padrão Zaptro (até definir)',
                        hex: brandForm.menu_color.trim() || '#0f172a',
                      },
                      {
                        key: 'b',
                        label: 'Fundo',
                        sub: brandForm.bg_color.trim() ? 'Área de trabalho' : 'Claro suave (até definir)',
                        hex: brandForm.bg_color.trim() || (palette.mode === 'dark' ? '#020617' : '#f1f5f9'),
                      },
                    ] as const
                  ).map((row) => (
                    <div
                      key={row.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: row.key === 'b' ? 0 : 12,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: row.hex,
                          border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)'}`,
                          flexShrink: 0,
                        }}
                        title={row.hex}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 950, color: palette.text }}>{row.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: palette.textMuted }}>{row.sub}</div>
                        <code
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: palette.text,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {row.hex.toUpperCase()}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                    overflow: 'hidden',
                    backgroundColor: palette.mode === 'dark' ? '#0f172a' : '#fff',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: '0.1em',
                      padding: '8px 12px',
                      borderBottom: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                      color: palette.textMuted,
                    }}
                  >
                    MINI PAINEL
                  </div>
                  <div style={{ display: 'flex', height: 132, alignItems: 'stretch' }}>
                    <div
                      style={{
                        width: 56,
                        flexShrink: 0,
                        backgroundColor: brandForm.menu_color.trim() || '#0f172a',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: 12,
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 8,
                          backgroundColor: 'rgba(255,255,255,0.15)',
                        }}
                      />
                      <div style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                      <div style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: brandForm.bg_color.trim() || (palette.mode === 'dark' ? '#020617' : '#f1f5f9'),
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        justifyContent: 'center',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 950, color: brandForm.secondary_color }}>Área principal</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: 'none',
                            backgroundColor: brandForm.primary_color,
                            color: pickLabelOnColor(brandForm.primary_color),
                            fontWeight: 950,
                            fontSize: 11,
                            cursor: 'default',
                          }}
                          disabled
                        >
                          Ação
                        </button>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: brandForm.secondary_color,
                            opacity: 0.85,
                          }}
                        >
                          Secundária
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p style={{ ...st.brandHint, color: palette.textMuted, margin: 0, fontSize: 12 }}>
                  Ao guardar, o painel passa a usar estas cores no menu, botões e fundo (quando preenchidos).
                </p>
              </div>
            </div>
          </>
        )}
        {brandTab === 'login' && (
          <>
            <div
              style={{
                marginBottom: 18,
                padding: '14px 16px',
                borderRadius: 16,
                border: `1px solid ${palette.mode === 'dark' ? 'rgba(148,163,184,0.25)' : '#e2e8f0'}`,
                backgroundColor: palette.mode === 'dark' ? 'rgba(15,23,42,0.55)' : '#f4f4f4',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 950, color: palette.text, marginBottom: 6 }}>
                O que a equipa vê ao abrir o link de login
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, fontWeight: 600, color: palette.textMuted }}>
                À <strong style={{ color: palette.text }}>esquerda</strong> configure o modelo do login; à{' '}
                <strong style={{ color: palette.text }}>direita</strong> vê a pré-visualização viva com o logo e as
                cores das outras abas. O ecrã real segue este modelo depois de{' '}
                <strong style={{ color: palette.text }}>Salvar alterações</strong> e com DNS apontado para o
                subdomínio.
              </p>
            </div>

            <label style={st.brandFieldLbl}>Subdomínio (slug)</label>
            <input
              disabled={!canCustomizeTenant}
              value={brandForm.subdomain}
              onChange={(e) => setBrandForm((f) => ({ ...f, subdomain: sanitizeSubdomain(e.target.value) }))}
              placeholder="sua-transportadora"
              style={inputShell}
            />
            <p style={{ ...st.brandHint, color: palette.textMuted }}>
              Exemplo em produção:{' '}
              <strong style={{ color: palette.text }}>
                https://{brandForm.subdomain || 'suaempresa'}.zaptro.com.br
              </strong>
              — DNS e certificado com o suporte Zaptro.
            </p>
            {brandForm.subdomain ? (
              <div
                style={{
                  marginTop: 12,
                  marginBottom: 4,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                  backgroundColor: palette.mode === 'dark' ? '#0f172a' : ZAPTRO_FIELD_BG,
                }}
              >
                <div style={{ ...st.brandFieldLbl, marginBottom: 6 }}>Link de login (equipa)</div>
                <code style={{ fontSize: 12, fontWeight: 800, color: palette.text, wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}${zaptroCompanyLoginPath(brandForm.subdomain)}`
                    : zaptroCompanyLoginPath(brandForm.subdomain)}
                </code>
                <button
                  type="button"
                  disabled={!canCustomizeTenant}
                  onClick={() => {
                    const u =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}${zaptroCompanyLoginPath(brandForm.subdomain)}`
                        : zaptroCompanyLoginPath(brandForm.subdomain);
                    void navigator.clipboard.writeText(u).then(
                      () => notifyZaptro('success', 'Link', 'Copiado para a área de transferência.'),
                      () => notifyZaptro('warning', 'Link', 'Não foi possível copiar automaticamente.'),
                    );
                  }}
                  style={{
                    marginTop: 10,
                    padding: '8px 14px',
                    borderRadius: 12,
                    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
                    background: '#000',
                    color: palette.lime,
                    fontWeight: 950,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Copiar link
                </button>
              </div>
            ) : null}
            <p style={{ ...st.brandHint, color: palette.textMuted, marginTop: 10 }}>
              Esta página é o login <strong style={{ color: palette.text }}>da empresa</strong> (não confundir com o
              login global do produto). Guarde para aplicar logo, cores e modelo escolhidos.
            </p>

            <div
              style={{
                marginTop: 22,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '22px 28px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  flex: '1 1 280px',
                  minWidth: 240,
                  maxWidth: 'min(100%, 400px)',
                  borderRadius: 20,
                  border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                  padding: '16px 16px 18px',
                  backgroundColor: palette.mode === 'dark' ? 'rgba(15,23,42,0.45)' : '#ffffff',
                  boxSizing: 'border-box',
                  boxShadow: palette.mode === 'dark' ? 'none' : '0 8px 24px rgba(15, 23, 42, 0.06)',
                }}
              >
                <span style={{ ...st.brandFieldLbl, display: 'block', marginBottom: 6 }}>
                  Personalização do ecrã de login
                </span>
                <p style={{ ...st.brandHint, color: palette.textMuted, marginTop: 0, marginBottom: 12 }}>
                  Escolha o formato; no modelo centrado pode editar o degradê CSS. O botão «Entrar» usa a cor abaixo
                  (por defeito coincide com a cor primária da marca).
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setLoginPreviewLayout('split')}
                    style={{
                      ...baseTab,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      borderRadius: 12,
                      border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                      backgroundColor: loginPreviewLayout === 'split' ? palette.lime : 'transparent',
                      color: loginPreviewLayout === 'split' ? '#000' : palette.text,
                      fontWeight: 900,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <LayoutTemplate size={16} /> Painel lateral
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginPreviewLayout('center')}
                    style={{
                      ...baseTab,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      borderRadius: 12,
                      border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                      backgroundColor: loginPreviewLayout === 'center' ? palette.lime : 'transparent',
                      color: loginPreviewLayout === 'center' ? '#000' : palette.text,
                      fontWeight: 900,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <SquareStack size={16} /> Centrado
                  </button>
                </div>

                <label style={{ ...st.brandFieldLbl, marginTop: 16 }}>Degradê de fundo (só no layout centrado)</label>
                <div
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${fieldBorder}`,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    aria-hidden
                    title="Pré-visualização do degradê"
                    style={{
                      height: 14,
                      width: '100%',
                      background: loginGradient.trim() || DEFAULT_LOGIN_GRAD,
                      boxSizing: 'border-box',
                    }}
                  />
                  <textarea
                    disabled={!canCustomizeTenant}
                    value={loginGradient}
                    onChange={(e) => setLoginGradient(e.target.value)}
                    rows={3}
                    style={{
                      ...inputShell,
                      border: 'none',
                      borderTop: `1px solid ${fieldBorder}`,
                      borderRadius: 0,
                      resize: 'vertical',
                      minHeight: 72,
                      width: '100%',
                      boxSizing: 'border-box',
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: 12,
                      display: 'block',
                      caretColor: brandForm.primary_color?.trim() || palette.lime,
                    }}
                  />
                </div>
                <label style={{ ...st.brandFieldLbl, marginTop: 12 }}>Cor do botão «Entrar» no login</label>
                <div style={st.brandColorPair}>
                  <input
                    type="color"
                    disabled={!canCustomizeTenant}
                    value={loginButtonColor}
                    onChange={(e) => setLoginButtonColor(e.target.value)}
                    style={st.brandColorNative}
                  />
                  <input
                    disabled={!canCustomizeTenant}
                    value={loginButtonColor}
                    onChange={(e) => setLoginButtonColor(e.target.value)}
                    style={{ ...inputShell, flex: 1, minWidth: 0 }}
                  />
                </div>
              </div>

              <div style={{ flex: '1 1 360px', minWidth: 280, minHeight: 0 }}>
                <div
                  style={{
                    borderRadius: 20,
                    border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                    overflow: 'hidden',
                    backgroundColor: palette.mode === 'dark' ? '#0f172a' : '#f4f4f4',
                    boxShadow: palette.mode === 'dark' ? 'none' : '0 16px 40px rgba(15, 23, 42, 0.07)',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '12px 16px',
                      borderBottom: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                      backgroundColor: palette.mode === 'dark' ? 'rgba(2,6,23,0.5)' : '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 950,
                        letterSpacing: '0.1em',
                        color: palette.textMuted,
                      }}
                    >
                      PRÉ-VISUALIZAÇÃO DO LOGIN
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 850, color: palette.text }}>
                      {loginPreviewLayout === 'split' ? 'Modelo com painel lateral' : 'Modelo centrado no degradê'}
                    </span>
                  </div>
                  {loginPreviewLayout === 'split' ? (
                    <div style={{ display: 'flex', minHeight: 228, alignItems: 'stretch' }}>
                      <div
                        style={{
                          flex: '0 0 42%',
                          minWidth: 0,
                          background: `linear-gradient(165deg, ${brandForm.secondary_color} 0%, #0f172a 92%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 18,
                        }}
                      >
                        {brandForm.logo_url.trim() ? (
                          <img
                            src={brandForm.logo_url.trim()}
                            alt=""
                            style={{ maxWidth: '100%', maxHeight: 56, objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ color: '#e2e8f0', fontWeight: 950, fontSize: 11 }}>LOGO</span>
                        )}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          backgroundColor: '#ffffff',
                          padding: '20px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>E-mail ou utilizador</div>
                        <div style={{ height: 10, borderRadius: 5, background: '#ebebeb', width: '100%' }} />
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginTop: 4 }}>
                          Palavra-passe
                        </div>
                        <div style={{ height: 10, borderRadius: 5, background: '#ebebeb', width: '100%' }} />
                        <div
                          style={{
                            height: 34,
                            borderRadius: 10,
                            backgroundColor: loginButtonColor,
                            marginTop: 6,
                            fontSize: 11,
                            fontWeight: 950,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: pickLabelOnColor(loginButtonColor),
                          }}
                        >
                          Entrar
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '24px 18px 28px',
                        background: loginGradient,
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 280,
                          backgroundColor: '#fff',
                          borderRadius: 16,
                          padding: '22px 20px',
                          boxShadow: '0 18px 40px rgba(15,23,42,0.14)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        {brandForm.logo_url.trim() ? (
                          <img
                            src={brandForm.logo_url.trim()}
                            alt=""
                            style={{ maxWidth: '100%', maxHeight: 48, objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ color: '#0f172a', fontWeight: 950, fontSize: 12 }}>Marca</span>
                        )}
                        <div style={{ width: '100%', height: 10, borderRadius: 5, background: '#ebebeb' }} />
                        <div style={{ width: '100%', height: 10, borderRadius: 5, background: '#ebebeb' }} />
                        <div
                          style={{
                            width: '100%',
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: loginButtonColor,
                            fontSize: 11,
                            fontWeight: 950,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: pickLabelOnColor(loginButtonColor),
                          }}
                        >
                          Entrar
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {canCustomizeTenant && (
        <footer
          style={{
            ...st.brandModalFooter,
            borderTopColor: palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER,
          }}
        >
          <button
            type="button"
            style={{
              ...st.saveBtn,
              opacity: brandSaving || !company?.id ? 0.6 : 1,
            }}
            disabled={brandSaving || !company?.id}
            onClick={() => void saveCompanyBranding()}
          >
            {brandSaving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </footer>
      )}
    </div>
  );
};
