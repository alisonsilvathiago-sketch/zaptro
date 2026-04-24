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
    padding: '14px 16px',
    borderRadius: 14,
    border: `1px solid ${border}`,
    backgroundColor: palette.mode === 'dark' ? '#0a0a0a' : '#f4f4f4',
    color: palette.text,
    fontSize: 14,
    fontWeight: 700,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    color: palette.text,
    marginBottom: 8,
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 0 24px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 32 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            backgroundColor: palette.mode === 'dark' ? 'rgba(217,255,0,0.1)' : '#f4f4f4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: `1px solid ${border}`,
          }}
        >
          <Webhook size={28} color={palette.lime} strokeWidth={2.2} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: palette.text }}>
            Integrações API
          </h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: palette.textMuted, fontWeight: 600 }}>
            Conecte o Zaptro ao seu ERP, TMS ou sistemas de faturamento via API.
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
            flex: '1 1 300px',
            maxWidth: 440,
            padding: 24,
            borderRadius: 24,
            border: `1px solid ${border}`,
            backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
            boxSizing: 'border-box',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          }}
        >
          <h3
            style={{
              margin: '0 0 16px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: palette.text,
            }}
          >
            DOCUMENTAÇÃO RÁPIDA
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {[
              {
                Icon: Shield,
                title: 'Conexão Segura',
                desc: 'Utilize tokens únicos por empresa.',
              },
              {
                Icon: ArrowDownToLine,
                title: 'Recebimento (Webhook)',
                desc: `POST …${ZAPTRO_INBOUND_WEBHOOK_PATH_PREFIX}/:source`,
              },
            ].map(({ Icon, title, desc }, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 16,
                  backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                  border: `1px solid ${border}`,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={palette.lime} strokeWidth={2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{title}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: palette.textMuted, opacity: 0.8 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: palette.textMuted }}>
            EXEMPLOS DE WEBHOOK
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {webhookExamples.map((w) => (
              <li
                key={w.source}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '14px',
                  borderRadius: 16,
                  border: `1px solid ${border}`,
                  backgroundColor: palette.mode === 'dark' ? '#0a0a0a' : '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{w.label}</span>
                  <button
                    type="button"
                    onClick={() => copyUrl(w.url)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: palette.lime,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {copiedUrl === w.url ? <Check size={14} /> : <Copy size={14} />}
                    {copiedUrl === w.url ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <code
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    wordBreak: 'break-all',
                    color: palette.textMuted,
                    fontFamily: 'ui-monospace, monospace',
                    backgroundColor: palette.mode === 'dark' ? '#111' : '#f1f5f9',
                    padding: '8px 10px',
                    borderRadius: 8,
                  }}
                >
                  {w.url}
                </code>
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
                padding: 24,
                borderRadius: 24,
                marginBottom: 32,
                border: `1px solid ${border}`,
                backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: palette.text }}>
                Nova Integração
              </h3>
              <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div>
                  <span style={labelStyle}>Tipo de Sistema</span>
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
                  <span style={labelStyle}>Nome da Integração</span>
                  <input
                    style={inputStyle}
                    placeholder="Ex.: Focus NFe · Produção"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={labelStyle}>URL Base da API</span>
                  <input
                    style={inputStyle}
                    placeholder="https://api.exemplo.com/v1"
                    value={draft.baseUrl}
                    onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={labelStyle}>Token de Acesso / API Key</span>
                  <input
                    style={inputStyle}
                    type="password"
                    autoComplete="off"
                    placeholder="Cole sua chave de acesso aqui"
                    value={draft.apiKey}
                    onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 14,
                      color: palette.text,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: '#000' }}
                    />
                    Ativar integração imediatamente
                  </label>
                  <button
                    type="button"
                    onClick={handleAdd}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '14px 28px',
                      borderRadius: 16,
                      border: 'none',
                      backgroundColor: '#000',
                      color: palette.lime,
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={20} /> Guardar Integração
                  </button>
                </div>
              </div>
            </div>
          )}

          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: palette.text, letterSpacing: '0.04em' }}>
            Configuradas ({rows.length})
          </h3>

          {rows.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: palette.textMuted, fontWeight: 600 }}>
              Nenhuma API configurada ainda.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rows.map((r) => (
                <li
                  key={r.id}
                  style={{
                    padding: '20px 24px',
                    borderRadius: 20,
                    border: `1px solid ${border}`,
                    backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: '#000',
                          color: palette.lime,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {ZAPTRO_EXTERNAL_API_CATEGORY_LABEL[r.category]}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: r.enabled ? '#16a34a' : palette.textMuted,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: r.enabled ? '#16a34a' : '#94a3b8' }} />
                        {r.enabled ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: palette.text, marginBottom: 4, letterSpacing: '-0.01em' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: palette.textMuted, wordBreak: 'break-all', opacity: 0.8, lineHeight: 1.4 }}>
                      {r.baseUrl}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          title={r.enabled ? 'Desativar' : 'Ativar'}
                          onClick={() => toggle(r.id)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            border: `1px solid ${border}`,
                            background: palette.mode === 'dark' ? '#111' : '#f4f4f4',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: r.enabled ? palette.text : palette.textMuted,
                            transition: '0.2s',
                          }}
                        >
                          <Power size={18} />
                        </button>
                        <button
                          type="button"
                          title="Remover"
                          onClick={() => remove(r.id)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            border: `1px solid ${border}`,
                            background: palette.mode === 'dark' ? '#111' : '#f4f4f4',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444',
                            transition: '0.2s',
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
