import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Image as ImageIcon, Info, LayoutTemplate, Palette, SquareStack } from 'lucide-react';
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
  brandColorRow: { display: 'flex', gap: 20, flexWrap: 'wrap' } as const,
  brandColorPair: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 } as const,
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
};

export const ZaptroCompanyBrandingEditor: React.FC<ZaptroCompanyBrandingEditorProps> = ({
  showHeading = true,
}) => {
  const { company, fetchCompanyData } = useTenant();
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

  useEffect(() => {
    if (!company) return;
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

  const inputShell = {
    ...st.brandInputBase,
    borderColor: palette.mode === 'dark' ? '#334155' : '#e2e8f0',
    backgroundColor: palette.mode === 'dark' ? '#0f172a' : ZAPTRO_FIELD_BG,
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

      {!canCustomizeTenant && (
        <div
          style={{
            marginBottom: 28,
            padding: '22px 22px 26px',
            borderRadius: 20,
            border: `1px solid ${palette.mode === 'dark' ? 'rgba(217, 255, 0, 0.28)' : 'rgba(217, 255, 0, 0.45)'}`,
            backgroundColor: palette.mode === 'dark' ? 'rgba(217, 255, 0, 0.07)' : 'rgba(217, 255, 0, 0.1)',
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
                  <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', width: '50%' }} />
                  <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', width: '100%' }} />
                  <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', width: '100%' }} />
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
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#f1f5f9' }} />
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#f1f5f9' }} />
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

      <div style={{ ...tabsUi.tabGroup, marginBottom: 20, flexWrap: 'wrap' }}>
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
            <p style={{ ...st.brandHint, color: palette.textMuted, marginBottom: 12 }}>
              <strong style={{ color: palette.text }}>Tamanhos recomendados:</strong> logo horizontal aprox.{' '}
              <strong>440×120 px</strong> (PNG/SVG com fundo transparente). Ícone do menu / favicon{' '}
              <strong>192×192 px</strong> ou <strong>512×512 px</strong> (quadrado). Podes colar URL HTTPS ou carregar
              ficheiro (fica em base64 neste browser — ideal é hospedar num CDN e colar o link).
            </p>
            <label style={st.brandFieldLbl}>URL do logo (horizontal, com nome)</label>
            <input
              disabled={!canCustomizeTenant}
              value={brandForm.logo_url}
              onChange={(e) => setBrandForm((f) => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://…"
              style={inputShell}
            />
            <input
              type="file"
              accept="image/*"
              disabled={!canCustomizeTenant}
              style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}
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
            <label style={{ ...st.brandFieldLbl, marginTop: 16 }}>URL do ícone / favicon (quadrado)</label>
            <input
              disabled={!canCustomizeTenant}
              value={brandForm.favicon_url}
              onChange={(e) => setBrandForm((f) => ({ ...f, favicon_url: e.target.value }))}
              placeholder="https://…"
              style={inputShell}
            />
            <input
              type="file"
              accept="image/*"
              disabled={!canCustomizeTenant}
              style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}
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
            <p style={{ ...st.brandHint, color: palette.textMuted }}>
              Mesmo padrão do menu lateral: ícone quando recolhido, marca completa quando expandido. Usa URLs públicas
              (HTTPS) em produção.
            </p>
          </>
        )}
        {brandTab === 'cores' && (
          <>
            <div style={st.brandColorRow}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={st.brandFieldLbl}>Cor primária</label>
                <div style={st.brandColorPair}>
                  <input
                    type="color"
                    disabled={!canCustomizeTenant}
                    value={brandForm.primary_color}
                    onChange={(e) => setBrandForm((f) => ({ ...f, primary_color: e.target.value }))}
                    style={st.brandColorNative}
                  />
                  <input
                    disabled={!canCustomizeTenant}
                    value={brandForm.primary_color}
                    onChange={(e) => setBrandForm((f) => ({ ...f, primary_color: e.target.value }))}
                    style={{ ...inputShell, flex: 1, minWidth: 0 }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
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
                    style={{ ...inputShell, flex: 1, minWidth: 0 }}
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
                placeholder="#FFFFFF ou vazio"
                style={{ ...inputShell, flex: 1, minWidth: 0 }}
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
                placeholder="#FFFFFF ou vazio"
                style={{ ...inputShell, flex: 1, minWidth: 0 }}
              />
            </div>
            <div style={st.brandPreviewRow}>
              <span style={{ fontSize: 12, fontWeight: 800, color: palette.textMuted }}>Pré-visualização</span>
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 12,
                    border: 'none',
                    backgroundColor: brandForm.primary_color,
                    color: '#000',
                    fontWeight: 950,
                    cursor: 'default',
                  }}
                  disabled
                >
                  Ação
                </button>
                <div
                  style={{
                    padding: '10px 18px',
                    borderRadius: 12,
                    backgroundColor: brandForm.secondary_color,
                    color: '#fff',
                    fontWeight: 800,
                  }}
                >
                  Painel
                </div>
              </div>
              <p style={{ ...st.brandHint, color: palette.textMuted, marginTop: 10 }}>
                Ao guardar, o tema do painel Zaptro usa a <strong style={{ color: palette.text }}>primária</strong> nos
                destaques (ex.: lima) e a <strong style={{ color: palette.text }}>secundária</strong> em traços e texto
                de apoio; menu e fundo seguem os campos opcionais.
              </p>
            </div>
          </>
        )}
        {brandTab === 'login' && (
          <>
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
                  marginBottom: 8,
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
                      () => notifyZaptro('warning', 'Link', 'Não foi possível copiar automaticamente.')
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
            <p style={{ ...st.brandHint, color: palette.textMuted, marginTop: 8 }}>
              Esta página é o login <strong style={{ color: palette.text }}>da empresa</strong> (não confundir com o
              login global do produto). Guarda para aplicar logo, cores e modelo escolhidos.
            </p>

            <div style={{ marginTop: 18 }}>
              <span style={{ ...st.brandFieldLbl, marginBottom: 8 }}>Formato do ecrã de login (pré-visualização)</span>
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
            </div>

            <label style={{ ...st.brandFieldLbl, marginTop: 18 }}>Degradê de fundo (layout centrado)</label>
            <textarea
              disabled={!canCustomizeTenant}
              value={loginGradient}
              onChange={(e) => setLoginGradient(e.target.value)}
              rows={3}
              style={{
                ...inputShell,
                resize: 'vertical',
                minHeight: 72,
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
              }}
            />
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

            <div
              style={{
                marginTop: 16,
                borderRadius: 16,
                border: `1px solid ${palette.mode === 'dark' ? '#334155' : ZAPTRO_SECTION_BORDER}`,
                overflow: 'hidden',
                backgroundColor: palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
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
                PRÉ-VISUALIZAÇÃO DO LOGIN
              </div>
              {loginPreviewLayout === 'split' ? (
                <div style={{ display: 'flex', minHeight: 200, alignItems: 'stretch' }}>
                  <div
                    style={{
                      flex: '0 0 44%',
                      background: `linear-gradient(165deg, ${brandForm.secondary_color} 0%, #0f172a 92%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                    }}
                  >
                    {brandForm.logo_url.trim() ? (
                      <img
                        src={brandForm.logo_url.trim()}
                        alt=""
                        style={{ maxWidth: '100%', maxHeight: 52, objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ color: '#e2e8f0', fontWeight: 950, fontSize: 11 }}>LOGO</span>
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      padding: '18px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ height: 10, borderRadius: 5, background: '#f1f5f9', width: '55%' }} />
                    <div style={{ height: 10, borderRadius: 5, background: '#f1f5f9', width: '100%' }} />
                    <div style={{ height: 10, borderRadius: 5, background: '#f1f5f9', width: '100%' }} />
                    <div
                      style={{
                        height: 30,
                        borderRadius: 10,
                        backgroundColor: loginButtonColor,
                        marginTop: 4,
                        fontSize: 10,
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
              ) : (
                <div
                  style={{
                    padding: '20px 16px 24px',
                    background: loginGradient,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 260,
                      backgroundColor: '#fff',
                      borderRadius: 14,
                      padding: '20px 18px',
                      boxShadow: '0 18px 40px rgba(15,23,42,0.12)',
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
                        style={{ maxWidth: '100%', maxHeight: 44, objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ color: '#0f172a', fontWeight: 950, fontSize: 12 }}>Marca</span>
                    )}
                    <div style={{ width: '100%', height: 10, borderRadius: 5, background: '#f1f5f9' }} />
                    <div style={{ width: '100%', height: 10, borderRadius: 5, background: '#f1f5f9' }} />
                    <div
                      style={{
                        width: '100%',
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: loginButtonColor,
                        fontSize: 11,
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
              )}
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
