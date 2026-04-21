/**
 * Rotas canónicas do produto Zaptro (paths curtos — em produção em app.zaptro.com.br).
 * Redirecionamentos das URLs antigas com prefixo `/zaptro-*` ficam no `App.tsx`.
 */
export const ZAPTRO_ROUTES = {
  SALES: '/vendas',
  DASHBOARD: '/inicio',
  REGISTER: '/registrar',
  LEGACY_REGISTER: '/zaptro-registrar',
  CHAT: '/whatsapp',
  /** Legado Evolution; redireciona para `/configuracao?tab=config`. */
  SETTINGS: '/whatsapp/config',
  CLIENTS: '/clientes',
  /**
   * CRM Kanban (Zaptro / transportadora). Path curto `/comercial` para não colidir com o ERP Logta em `/crm/*`.
   */
  COMMERCIAL_CRM: '/comercial',
  /** Lista de rotas criadas no CRM (local até backend). */
  ROUTES: '/rotas',
  /** Lista de orçamentos de frete gerados no CRM (local até backend). */
  COMMERCIAL_QUOTES: '/comercial/orcamentos',
  LOGISTICS: '/operacoes',
  DRIVERS: '/motoristas',
  /** Perfil operacional do motorista (frota). URL canónica singular. */
  DRIVER_PROFILE: '/motorista/perfil',
  TEAM: '/equipe',
  HISTORY: '/historico',
  SETTINGS_ALIAS: '/configuracao',
  PROFILE: '/conta',
  /** Mesma UI que `PROFILE` — útil para links antigos e como URL de referência em demos. */
  LEGACY_PROFILE: '/zaptro-perfil',
  BILLING: '/faturamento',
  /** Login público com marca da transportadora (slug = subdomínio cadastrado). Não confundir com `/login` (Zaptro global). */
  COMPANY_LOGIN: '/entrada',
} as const;

/** Inbox Zaptro com thread pré-selecionada (telefone só dígitos, ex. `5511999887766`, ou UUID de `whatsapp_conversations`). */
export function zaptroWhatsappInboxThreadPath(threadKey: string): string {
  const t = threadKey.trim();
  if (!t) return ZAPTRO_ROUTES.CHAT;
  const uuidish =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
  const seg = uuidish ? t : t.replace(/\D/g, '');
  if (!seg) return ZAPTRO_ROUTES.CHAT;
  return `${ZAPTRO_ROUTES.CHAT}/${encodeURIComponent(seg)}`;
}

export function zaptroCompanyLoginPath(slug: string): string {
  const s = encodeURIComponent(slug.trim().toLowerCase());
  return `${ZAPTRO_ROUTES.COMPANY_LOGIN}/${s}`;
}

export const zaptroOccurrencePath = (id: string | number) => `/ocorrencia/${id}`;

/** Perfil unificado do contacto (histórico WhatsApp + CRM local, etc.) — não confundir com `/whatsapp`. */
export function zaptroClientProfilePath(id: string): string {
  return `/clientes/perfil/${encodeURIComponent(id)}`;
}

export function zaptroDriverProfilePath(id: string): string {
  return `${ZAPTRO_ROUTES.DRIVER_PROFILE}/${encodeURIComponent(id)}`;
}
