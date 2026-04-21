import React, { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Loader2, Save, Upload } from 'lucide-react';
import { supabaseZaptro } from '../../lib/supabase-zaptro';
import { useTenant } from '../../context/TenantContext';
import { useZaptroTheme } from '../../context/ZaptroThemeContext';
import { notifyZaptro } from './ZaptroNotificationSystem';
import { ZAPTRO_SHADOW } from '../../constants/zaptroShadows';
import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER, ZAPTRO_TITLE_COLOR } from '../../constants/zaptroUi';
import { LOGTA_DOMAINS } from '../../utils/domains';
import { formatZaptroDbErrorForToast } from '../../utils/zaptroSchemaErrors';

const MAX_FILE_BYTES = 650 * 1024;

function sanitizeSubdomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 48);
}

/**
 * Identidade na página de configuração: pré-visualização em tempo real + guardar na transportadora.
 */
const ZaptroSettingsBranding: React.FC = () => {
  const { company, fetchCompanyData } = useTenant();
  const { canCustomizeTenant } = useZaptroTheme();
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [primary, setPrimary] = useState('#D9FF00');
  const [secondary, setSecondary] = useState('#0F172A');
  const [subdomain, setSubdomain] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    setLogoUrl(company.logo_url || '');
    setFaviconUrl(company.favicon_url || '');
    setPrimary(company.primary_color || '#D9FF00');
    setSecondary(company.secondary_color || '#0F172A');
    setSubdomain((company.subdomain || '').trim().toLowerCase());
  }, [company?.id, company?.logo_url, company?.favicon_url, company?.primary_color, company?.secondary_color, company?.subdomain]);

  const applyFile = useCallback(
    (file: File | null, field: 'logo' | 'favicon') => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        notifyZaptro('warning', 'Formato', 'Escolhe uma imagem (PNG, JPG, WebP, SVG).');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        notifyZaptro(
          'warning',
          'Ficheiro grande',
          'Até ~650 KB neste formulário. Para imagens maiores, hospeda num CDN e cola o URL abaixo.'
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        if (field === 'logo') setLogoUrl(url);
        else setFaviconUrl(url);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleSave = async () => {
    if (!company?.id) {
      notifyZaptro('error', 'Empresa', 'Ainda não há transportadora vinculada ao teu perfil.');
      return;
    }
    if (!canCustomizeTenant) {
      notifyZaptro('info', 'Plano', 'A personalização avançada não está ativa para esta conta.');
      return;
    }
    setSaving(true);
    try {
      const slug = sanitizeSubdomain(subdomain);
      const { error } = await supabaseZaptro
        .from('whatsapp_companies')
        .update({
          logo_url: logoUrl.trim() || null,
          favicon_url: faviconUrl.trim() || null,
          primary_color: primary,
          secondary_color: secondary,
          subdomain: slug || null,
        })
        .eq('id', company.id);
      if (error) throw error;
      await fetchCompanyData();
      notifyZaptro('success', 'Identidade', 'Logo, cores e domínio guardados. Atualiza o painel se não vires já a mudança.');
    } catch (e: unknown) {
      notifyZaptro('error', 'Identidade', formatZaptroDbErrorForToast(e, 'Não foi possível guardar.'));
    } finally {
      setSaving(false);
    }
  };

  const logoOk = logoUrl.trim().length > 0;
  const favOk = faviconUrl.trim().length > 0;

  return (
    <div style={{ maxWidth: 1040 }}>
      <header style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 950, color: '#0f172a', letterSpacing: '-0.03em' }}>
          Marca & logo
        </h2>
        <p style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 600, color: '#64748b', maxWidth: 720, lineHeight: 1.55 }}>
          Cola o URL da imagem ou carrega um ficheiro pequeno — vês o resultado ao lado antes de guardar. Isto atualiza
          o painel e o favicon do browser quando aplicável.
        </p>
      </header>

      {!canCustomizeTenant && (
        <div
          style={{
            marginBottom: 24,
            padding: '16px 18px',
            borderRadius: 18,
            border: '1px solid #e4e4e7',
            backgroundColor: ZAPTRO_FIELD_BG,
            fontSize: 14,
            fontWeight: 700,
            color: ZAPTRO_TITLE_COLOR,
          }}
        >
          O plano desta transportadora não inclui edição guardada (ou o MASTER Logta definiu{' '}
          <code style={{ fontSize: 12 }}>settings.zaptro_branding = false</code> na empresa). Vês abaixo a
          pré-visualização; para ativar, o MASTER ou o suporte ajustam o plano / o JSON em{' '}
          <code style={{ fontSize: 12 }}>whatsapp_companies.settings</code>.
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 420px)',
          gap: 32,
          alignItems: 'start',
        }}
        className="zaptro-branding-grid"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <FieldBlock title="Logo horizontal (menu e cabeçalho)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <label style={fileLabel}>
                <Upload size={16} />
                Carregar imagem
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={!canCustomizeTenant}
                  onChange={(e) => applyFile(e.target.files?.[0] ?? null, 'logo')}
                />
              </label>
            </div>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              disabled={!canCustomizeTenant}
              placeholder="https://…/logo.png"
              style={inputStyle}
            />
          </FieldBlock>

          <FieldBlock title="Ícone / favicon (quadrado)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <label style={fileLabel}>
                <Upload size={16} />
                Carregar ícone
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={!canCustomizeTenant}
                  onChange={(e) => applyFile(e.target.files?.[0] ?? null, 'favicon')}
                />
              </label>
            </div>
            <input
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              disabled={!canCustomizeTenant}
              placeholder="https://…/icon.png"
              style={inputStyle}
            />
          </FieldBlock>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="zaptro-branding-colors">
            <FieldBlock title="Cor primária">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  disabled={!canCustomizeTenant}
                  style={colorNative}
                />
                <input
                  type="text"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  disabled={!canCustomizeTenant}
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                />
              </div>
            </FieldBlock>
            <FieldBlock title="Cor secundária">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="color"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  disabled={!canCustomizeTenant}
                  style={colorNative}
                />
                <input
                  type="text"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  disabled={!canCustomizeTenant}
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                />
              </div>
            </FieldBlock>
          </div>

          <FieldBlock title="Subdomínio (login dedicado)">
            <input
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(sanitizeSubdomain(e.target.value))}
              disabled={!canCustomizeTenant}
              placeholder="minha-transportadora"
              style={inputStyle}
            />
            <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
              Exemplo:{' '}
              <strong style={{ color: '#334155' }}>
                https://{subdomain || 'slug'}.{LOGTA_DOMAINS.ZAPTRO}
              </strong>{' '}
              — DNS com o suporte Logta.
            </p>
          </FieldBlock>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !canCustomizeTenant || !company?.id}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '16px 28px',
              borderRadius: 18,
              border: 'none',
              backgroundColor: '#000',
              color: '#D9FF00',
              fontWeight: 950,
              fontSize: 14,
              cursor: saving || !canCustomizeTenant ? 'not-allowed' : 'pointer',
              opacity: !canCustomizeTenant ? 0.45 : 1,
              boxShadow: ZAPTRO_SHADOW.md,
            }}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            {saving ? 'A guardar…' : 'Guardar identidade'}
          </button>
        </div>

        <aside style={{ position: 'sticky', top: 12 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', color: '#94a3b8' }}>
            PRÉ-VISUALIZAÇÃO
          </p>
          <div
            style={{
              borderRadius: 24,
              border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
              overflow: 'hidden',
              boxShadow: ZAPTRO_SHADOW.lg,
              backgroundColor: '#fff',
            }}
          >
            <div
              style={{
                height: 10,
                background: '#e4e4e7',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                paddingLeft: 10,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fca5a5' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fde047' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#86efac' }} />
            </div>
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: secondary,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                minHeight: 56,
              }}
            >
              {logoOk ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ maxHeight: 40, maxWidth: '58%', objectFit: 'contain' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    opacity: 0.85,
                  }}
                >
                  <ImageIcon size={20} />
                  Sem logo — cola URL ou carrega ficheiro
                </div>
              )}
              <div style={{ flex: 1 }} />
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: 'none',
                  backgroundColor: primary,
                  color: '#000',
                  fontWeight: 950,
                  fontSize: 12,
                  cursor: 'default',
                }}
              >
                Ação
              </button>
            </div>
            <div style={{ padding: '20px 18px', backgroundColor: ZAPTRO_FIELD_BG }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: ZAPTRO_TITLE_COLOR, marginBottom: 10 }}>
                Separador do browser
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 10,
                  backgroundColor: '#fff',
                  border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
                  maxWidth: '100%',
                }}
              >
                {favOk ? (
                  <img
                    src={faviconUrl}
                    alt=""
                    width={18}
                    height={18}
                    style={{ borderRadius: 4, objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.visibility = 'hidden';
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: '#e4e4e7',
                    }}
                  />
                )}
                <span style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>Zaptro · Painel</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .zaptro-branding-grid { grid-template-columns: 1fr !important; }
          .zaptro-branding-colors { grid-template-columns: 1fr !important; }
        }
        .spin { animation: ztspin 0.9s linear infinite; }
        @keyframes ztspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

function FieldBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', color: ZAPTRO_TITLE_COLOR, marginBottom: 8 }}>
        {title}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 8,
  padding: '12px 14px',
  borderRadius: 14,
  border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
  fontSize: 14,
  fontWeight: 600,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const fileLabel: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 14,
  border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
  backgroundColor: '#fff',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const colorNative: React.CSSProperties = {
  width: 48,
  height: 44,
  padding: 0,
  border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
  borderRadius: 12,
  cursor: 'pointer',
  background: 'transparent',
};

export default ZaptroSettingsBranding;
