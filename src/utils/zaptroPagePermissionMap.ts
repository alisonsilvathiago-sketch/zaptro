import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';

/**
 * Registo canónico: cada entrada = uma permissão que o ADMIN atribui ao colaborador.
 * Ao acrescentar rota Zaptro protegida por permissão, inclua aqui e envolva a rota em `App.tsx` com o mesmo `id`.
 */
export const ZAPTRO_PAGE_REGISTRY = [
  { id: 'inicio', label: 'Painel Central', primaryPath: ZAPTRO_ROUTES.DASHBOARD },
  { id: 'crm', label: 'CRM comercial', primaryPath: ZAPTRO_ROUTES.COMMERCIAL_CRM },
  { id: 'orcamentos', label: 'Orçamentos', primaryPath: ZAPTRO_ROUTES.COMMERCIAL_QUOTES },
  { id: 'whatsapp', label: 'Atendimentos WhatsApp', primaryPath: ZAPTRO_ROUTES.CHAT },
  { id: 'historico', label: 'Histórico e ocorrências', primaryPath: ZAPTRO_ROUTES.HISTORY },
  { id: 'clientes', label: 'Clientes', primaryPath: ZAPTRO_ROUTES.CLIENTS },
  { id: 'motoristas', label: 'Motoristas', primaryPath: ZAPTRO_ROUTES.DRIVERS },
  { id: 'equipe', label: 'Equipe e acessos', primaryPath: ZAPTRO_ROUTES.TEAM },
  { id: 'operacoes', label: 'Operações / logística', primaryPath: ZAPTRO_ROUTES.LOGISTICS },
  { id: 'faturamento', label: 'Faturamento e plano', primaryPath: ZAPTRO_ROUTES.BILLING },
  {
    id: 'cfg',
    label: 'Configurações (conexão, automação, chatbot, equipe no menu Config.)',
    primaryPath: `${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=config`,
  },
  { id: 'cfg_api', label: 'Integrações API', primaryPath: `${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=api` },
  {
    id: 'cfg_marca',
    label: 'Personalizar login e marca',
    primaryPath: `${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=marca`,
    requiresBrandingPlan: true as const,
  },
] as const;

export type ZaptroPagePermissionId = (typeof ZAPTRO_PAGE_REGISTRY)[number]['id'];

export type ZaptroPagePermissionDef = {
  id: ZaptroPagePermissionId;
  label: string;
  requiresBrandingPlan?: boolean;
};

export const ZAPTRO_PAGE_PERMISSION_DEFS: ZaptroPagePermissionDef[] = ZAPTRO_PAGE_REGISTRY.map((r) => ({
  id: r.id,
  label: r.label,
  ...(r.requiresBrandingPlan ? { requiresBrandingPlan: true } : {}),
}));

export const ZAPTRO_PAGE_IDS: ZaptroPagePermissionId[] = ZAPTRO_PAGE_REGISTRY.map((r) => r.id);

/** Ordem para “primeira página permitida” após um 403 de rota. */
export const ZAPTRO_COLLABORATOR_PAGE_ORDER: ZaptroPagePermissionId[] = [...ZAPTRO_PAGE_IDS];

function splitPath(full: string): [string, string] {
  const i = full.indexOf('?');
  return i < 0 ? [full, ''] : [full.slice(0, i), full.slice(i + 1)];
}

export function zaptroPageIdToPrimaryPath(id: ZaptroPagePermissionId): string {
  const row = ZAPTRO_PAGE_REGISTRY.find((r) => r.id === id);
  return row?.primaryPath ?? ZAPTRO_ROUTES.DASHBOARD;
}

export function isZaptroPagePermissionId(v: string): v is ZaptroPagePermissionId {
  return (ZAPTRO_PAGE_IDS as readonly string[]).includes(v);
}

/** Remove ids desconhecidos antes de gravar em `profiles.permissions`. */
export function sanitizeZaptroPagePermissions(raw: string[] | null | undefined): ZaptroPagePermissionId[] {
  if (!raw?.length) return [];
  const out: ZaptroPagePermissionId[] = [];
  for (const x of raw) {
    if (isZaptroPagePermissionId(x)) out.push(x);
  }
  return out;
}

export function zaptroMenuPathToPageId(fullPath: string): ZaptroPagePermissionId | null {
  const [base, queryPart] = splitPath(fullPath);
  const query = queryPart ? `?${queryPart}` : '';

  if (base === ZAPTRO_ROUTES.SETTINGS_ALIAS || base === '/whatsapp/config') {
    const tabHave = new URLSearchParams(query).get('tab') || 'config';
    const normalizedTab = tabHave === 'branding' ? 'marca' : tabHave;
    for (const r of ZAPTRO_PAGE_REGISTRY) {
      const [pb, qRaw] = splitPath(r.primaryPath);
      if (pb !== ZAPTRO_ROUTES.SETTINGS_ALIAS) continue;
      const tabWant = new URLSearchParams(qRaw ? `?${qRaw}` : '').get('tab') || 'config';
      if (tabWant === normalizedTab) return r.id;
    }
    return 'cfg';
  }

  for (const r of ZAPTRO_PAGE_REGISTRY) {
    const [pb] = splitPath(r.primaryPath);
    if (pb === base && pb !== ZAPTRO_ROUTES.SETTINGS_ALIAS) return r.id;
  }
  return null;
}

export type ZaptroSettingsTabKey = 'config' | 'automation' | 'chatbot' | 'marca' | 'api' | 'time';

export function zaptroSettingsTabToPageId(tab: ZaptroSettingsTabKey): ZaptroPagePermissionId {
  if (tab === 'api') return 'cfg_api';
  if (tab === 'marca') return 'cfg_marca';
  return 'cfg';
}

const SETTINGS_ANY: ZaptroPagePermissionId[] = ['cfg', 'cfg_api', 'cfg_marca'];

export function zaptroSettingsEntryPermissionIds(): ZaptroPagePermissionId[] {
  return [...SETTINGS_ANY];
}

/** Ex.: `/configuracao?tab=api` → `cfg_api`. */
export function zaptroPathStringToPageId(fullPath: string): ZaptroPagePermissionId | null {
  const qi = fullPath.indexOf('?');
  const p = qi >= 0 ? fullPath.slice(0, qi) : fullPath;
  const search = qi >= 0 ? `?${fullPath.slice(qi + 1)}` : '';
  return pathnameToZaptroPageId(p, search);
}

export function pathnameToZaptroPageId(pathname: string, search: string): ZaptroPagePermissionId | null {
  const p = pathname.split('?')[0];
  const q = search || (pathname.includes('?') ? pathname.slice(pathname.indexOf('?')) : '');
  const fromMenu = zaptroMenuPathToPageId(p + (q || ''));
  if (fromMenu) return fromMenu;

  if (p === '/ocorrencia' || p.startsWith('/ocorrencia/')) return 'historico';
  if (p === ZAPTRO_ROUTES.CLIENTS || p.startsWith(`${ZAPTRO_ROUTES.CLIENTS}/`)) return 'clientes';
  if (p === ZAPTRO_ROUTES.DRIVER_PROFILE || p.startsWith(`${ZAPTRO_ROUTES.DRIVER_PROFILE}/`)) return 'motoristas';
  if (p === ZAPTRO_ROUTES.PROFILE || p === ZAPTRO_ROUTES.LEGACY_PROFILE) return null;
  if (p === ZAPTRO_ROUTES.SALES || p === '/' || p.startsWith(`${ZAPTRO_ROUTES.COMPANY_LOGIN}/`)) return null;
  return null;
}
