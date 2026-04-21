import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Webhook, Plus, Trash2, Power } from 'lucide-react';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { useAuth } from '../context/AuthContext';
import { canAccessZaptroTenantSettings } from '../utils/zaptroPermissions';
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
  const border = palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E2E8F0';
  const cardBg = palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F8FAFC';

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
    <div style={{ maxWidth: 800, padding: '8px 0 24px', boxSizing: 'border-box', width: '100%' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 24 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: palette.mode === 'dark' ? 'rgba(217,255,0,0.12)' : '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Webhook size={26} color={palette.lime} strokeWidth={2.2} />
        </div>
        <div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: 22, fontWeight: 950, letterSpacing: '-0.5px', color: palette.text }}>
            Integrações API
          </h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: palette.textMuted, fontWeight: 600 }}>
            Ligue APIs de terceiros (nota fiscal, ERP, rastreio, webhooks). Cada entrada fica associada à{' '}
            <strong style={{ color: palette.text }}>empresa actual</strong> e pode ser activada ou desactivada aqui.
            Os módulos do Zaptro podem usar o <strong style={{ color: palette.text }}>tipo</strong> da integração para
            saber o que está disponível.
          </p>
        </div>
      </div>

      {!canEdit && (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            marginBottom: 20,
            border: `1px solid ${border}`,
            backgroundColor: cardBg,
            fontSize: 14,
            fontWeight: 700,
            color: palette.textMuted,
          }}
        >
          Apenas <strong style={{ color: palette.text }}>administradores da empresa</strong> podem adicionar ou
          alterar integrações. Pode consultar a lista abaixo em modo leitura.
        </div>
      )}

      {canEdit && (
        <div
          style={{
            padding: 20,
            borderRadius: 18,
            marginBottom: 24,
            border: `1px solid ${border}`,
            backgroundColor: cardBg,
          }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 950, color: palette.text, letterSpacing: '0.04em' }}>
            Nova integração
          </h3>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0,1fr)', maxWidth: 560 }}>
            <div>
              <span style={labelStyle}>Tipo (o sistema usa isto para reconhecer o módulo)</span>
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
              <span style={labelStyle}>Chave / token (guardada neste browser até existir backend seguro)</span>
              <input
                style={inputStyle}
                type="password"
                autoComplete="off"
                placeholder="Cole a API key ou token"
                value={draft.apiKey}
                onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
              />
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 700, color: palette.text }}>
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
                <div style={{ fontSize: 13, fontWeight: 600, color: palette.textMuted, wordBreak: 'break-all' }}>{r.baseUrl}</div>
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
  );
};

export default ZaptroSettingsApiTab;
