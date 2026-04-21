import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Webhook, Plus, Trash2, Power, Shield, ArrowDownToLine, Copy, Check } from 'lucide-react';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { useAuth } from '../context/AuthContext';
import { canAccessZaptroTenantSettings } from '../utils/zaptroPermissions';
import { buildZaptroInboundWebhookExample, ZAPTRO_INBOUND_WEBHOOK_PATH_PREFIX } from '../constants/zaptroIntegrationContract';
import {
  readExternalApiIntegrations,
  writeExternalApiIntegrations,
  ZAPTRO_EXTERNAL_API_CATEGORY_LABEL,
  type ZaptroExternalApiCategory,
  type ZaptroExternalApiIntegration,
} from '../constants/zaptroExternalApisStore';
import { toastError, toastSuccess } from '../lib/toast';

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `api-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const emptyForm = (): Omit<ZaptroExternalApiIntegration, 'id'> => ({
  category: 'custom',
  name: '',
  baseUrl: '',
  apiKey: '',
  enabled: true,
});

/**
 * Aba de configurações: integrações HTTP genéricas (NF-e, ERP, webhooks, etc.).
 * Persistência local por `company_id`; só administrador do tenant edita.
 */
const ZaptroSettingsApiTab: React.FC = () => {
  const { palette } = useZaptroTheme();
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const canEdit = canAccessZaptroTenantSettings(profile?.role);

  const [rows, setRows] = useState<ZaptroExternalApiIntegration[]>([]);
  const [draft, setDraft] = useState(emptyForm);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const border = palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E2E8F0';
  const cardBg = palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f4f4f4';

  const webhookExamples = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://api.zaptro.com.br';
    return [
      { label: 'Shopify (exemplo)', source: 'shopify' },
      { label: 'Zapier (exemplo)', source: 'zapier' },
      { label: 'Personalizado', source: 'custom' },
    ].map((x) => ({ ...x, url: buildZaptroInboundWebhookExample(origin, x.source) }));
  }, []);

  const copyUrl = (url: string) => {
    void navigator.clipboard?.writeText(url).then(() => {
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const load = useCallback(() => {
    setRows(readExternalApiIntegrations(companyId));
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    (next: ZaptroExternalApiIntegration[]) => {
      writeExternalApiIntegrations(companyId, next);
      setRows(next);
    },
    [companyId]
  );

  const categoryOptions = useMemo(
    () =>
      (Object.keys(ZAPTRO_EXTERNAL_API_CATEGORY_LABEL) as ZaptroExternalApiCategory[]).map((k) => ({
        value: k,
        label: ZAPTRO_EXTERNAL_API_CATEGORY_LABEL[k],
      })),
    []
  );

  const handleAdd = () => {
    if (!canEdit) return;
    const name = draft.name.trim();
    const baseUrl = draft.baseUrl.trim();
    if (!name) {
      toastError('Indique um nome para esta integração.');
      return;
    }
    if (!baseUrl) {
      toastError('Indique a URL base da API (ex.: https://api.provedor.com).');
      return;
    }
    try {
      new URL(baseUrl);
    } catch {
      toastError('URL base inválida. Use https://… completo.');
      return;
    }

    const row: ZaptroExternalApiIntegration = {
      id: newId(),
      category: draft.category,
      name,
      baseUrl,
      apiKey: draft.apiKey.trim(),
      enabled: draft.enabled,
    };
    persist([row, ...rows]);
    setDraft(emptyForm());
    toastSuccess('Integração guardada. O sistema pode reconhecer esta API pelo tipo e pelo estado «activo».');
  };

  const toggle = (id: string) => {
    if (!canEdit) return;
    persist(rows.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const remove = (id: string) => {
    if (!canEdit) return;
    persist(rows.filter((r) => r.id !== id));
    toastSuccess('Integração removida.');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: `1px solid ${border}`,
    backgroundColor: palette.mode === 'dark' ? '#0a0a0a' : '#fff',
    color: palette.text,
    fontSize: 14,
    fontWeight: 600,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: '0.06em',
    color: palette.textMuted,
    marginBottom: 6,
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 0 24px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 22 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: palette.mode === 'dark' ? 'rgba(217,255,0,0.12)' : '#ebebeb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Webhook size={26} color={palette.lime} strokeWidth={2.2} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 22, fontWeight: 950, letterSpacing: '-0.5px', color: palette.text }}>
            Integrações API
          </h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: palette.textMuted, fontWeight: 600 }}>
            APIs por <strong style={{ color: palette.text }}>empresa</strong> (NF-e, ERP, webhooks). Os módulos usam o{' '}
            <strong style={{ color: palette.text }}>tipo</strong> para saber o que está ligado.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '22px 32px',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            flex: '1 1 280px',
            minWidth: 224,
            maxWidth: 'min(100%, 440px)',
            padding: 18,
            borderRadius: 20,
            border: `1px solid ${border}`,
            backgroundColor: palette.mode === 'dark' ? 'rgba(217,255,0,0.06)' : '#fff',
            boxSizing: 'border-box',
          }}
        >
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: '0.06em',
              color: palette.textMuted,
            }}
          >
            REFERÊNCIA TÉCNICA
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5, color: palette.textMuted, fontWeight: 600 }}>
            URLs de exemplo; a API e as chaves correm no servidor.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {[
              {
                Icon: Shield,
                line: (
                  <>
                    <strong style={{ color: palette.text }}>1 · Conexão</strong>
                    {' — '}
                    tokens por empresa.
                  </>
                ),
              },
              {
                Icon: ArrowDownToLine,
                line: (
                  <>
                    <strong style={{ color: palette.text }}>2 · Webhook</strong>
                    {' — '}
                    <code style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>
                      POST …{ZAPTRO_INBOUND_WEBHOOK_PATH_PREFIX}/:source
                    </code>
                  </>
                ),
              },
            ].map(({ Icon, line }, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: `1px solid ${border}`,
                  backgroundColor: cardBg,
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1.45,
                  color: palette.textMuted,
                }}
              >
                <Icon size={16} color={palette.lime} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, minWidth: 0 }}>{line}</p>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 950, letterSpacing: '0.05em', color: palette.textMuted }}>
            WEBHOOKS (EXEMPLO)
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {webhookExamples.map((w) => (
              <li
                key={w.source}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: `1px solid ${border}`,
                  backgroundColor: palette.mode === 'dark' ? '#0a0a0a' : '#ebebeb',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: palette.text, minWidth: 224, flexShrink: 0 }}>
                  {w.label}
                </span>
                <code
                  style={{
                    flex: '1 1 160px',
                    fontSize: 10,
                    fontWeight: 600,
                    wordBreak: 'break-all',
                    color: palette.textMuted,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {w.url}
                </code>
                <button
                  type="button"
                  onClick={() => copyUrl(w.url)}
                  title="Copiar URL"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: `1px solid ${border}`,
                    background: palette.mode === 'dark' ? '#111' : '#fff',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 800,
                    color: palette.text,
                  }}
                >
                  {copiedUrl === w.url ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                  {copiedUrl === w.url ? 'Copiado' : 'Copiar'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: '1 1 360px', minWidth: 280, minHeight: 0 }}>
          {!canEdit && (
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                marginBottom: 16,
                border: `1px solid ${border}`,
                backgroundColor: cardBg,
                fontSize: 13,
                fontWeight: 700,
                color: palette.textMuted,
              }}
            >
              Só <strong style={{ color: palette.text }}>administradores</strong> alteram integrações; a lista abaixo é
              leitura.
            </div>
          )}

          {canEdit && (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                marginBottom: 20,
                border: `1px solid ${border}`,
                backgroundColor: cardBg,
              }}
            >
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 950, color: palette.text, letterSpacing: '0.04em' }}>
                Nova integração
              </h3>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0,1fr)' }}>
                <div>
                  <span style={labelStyle}>Tipo</span>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as ZaptroExternalApiCategory }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={labelStyle}>Nome</span>
                  <input
                    style={inputStyle}
                    placeholder="Ex.: Focus NFe · produção"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div>
                  <span style={labelStyle}>URL base</span>
                  <input
                    style={inputStyle}
                    placeholder="https://api.exemplo.com/v1"
                    value={draft.baseUrl}
                    onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <span style={labelStyle}>Chave / token (local neste browser)</span>
                  <input
                    style={inputStyle}
                    type="password"
                    autoComplete="off"
                    placeholder="Cole a API key ou token"
                    value={draft.apiKey}
                    onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                  />
                </div>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: palette.text,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
                  />
                  Activar assim que guardar
                </label>
                <button
                  type="button"
                  onClick={handleAdd}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 18px',
                    borderRadius: 14,
                    border: 'none',
                    backgroundColor: palette.lime,
                    color: '#000',
                    fontWeight: 950,
                    fontSize: 14,
                    cursor: 'pointer',
                    width: 'fit-content',
                  }}
                >
                  <Plus size={18} /> Guardar integração
                </button>
              </div>
            </div>
          )}

          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 950, color: palette.text, letterSpacing: '0.04em' }}>
            Configuradas ({rows.length})
          </h3>

          {rows.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: palette.textMuted, fontWeight: 600 }}>
              Nenhuma API configurada ainda.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rows.map((r) => (
                <li
                  key={r.id}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${border}`,
                    backgroundColor: cardBg,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                    <div style={{ fontSize: 12, fontWeight: 950, color: palette.lime, marginBottom: 4 }}>
                      {ZAPTRO_EXTERNAL_API_CATEGORY_LABEL[r.category]}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 950, color: palette.text, marginBottom: 6 }}>{r.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: palette.textMuted, wordBreak: 'break-all' }}>
                      {r.baseUrl}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: palette.textMuted, marginTop: 8 }}>
                      Chave: {r.apiKey ? `${'•'.repeat(8)}${r.apiKey.slice(-4)}` : '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 950,
                        padding: '6px 10px',
                        borderRadius: 999,
                        backgroundColor: r.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.2)',
                        color: r.enabled ? '#15803d' : palette.textMuted,
                      }}
                    >
                      {r.enabled ? 'Activa' : 'Inactiva'}
                    </span>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          title={r.enabled ? 'Desactivar' : 'Activar'}
                          onClick={() => toggle(r.id)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            border: `1px solid ${border}`,
                            background: palette.mode === 'dark' ? '#111' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: palette.text,
                          }}
                        >
                          <Power size={18} />
                        </button>
                        <button
                          type="button"
                          title="Remover"
                          onClick={() => remove(r.id)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            border: `1px solid ${border}`,
                            background: palette.mode === 'dark' ? '#111' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#b91c1c',
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZaptroSettingsApiTab;
