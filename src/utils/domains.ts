/**
 * Gerenciador de Subdomínios Logta
 * Define a arquitetura multi-domain da plataforma
 */

import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';

export const LOGTA_DOMAINS = {
  MARKETING: 'www.logta.com.br',
  APP: 'app.logta.com.br',
  MASTER: 'adm.logta.com.br',
  CHECKOUT: 'play.logta.com.br',
  ACADEMY: 'academy.logta.com.br',
  SUPPORT: 'support.logta.com.br',
  HELP: 'help.logta.com.br',
  API: 'api.logta.com.br',
  AUTH: 'auth.logta.com.br',
  BLOG: 'blog.logta.com.br',
  PLANS: 'planos.logta.com.br',
  WHATSAPP: 'whatsapp.logta.com.br',
  ZAPTRO: 'zaptro.com.br',
  ZAPTRO_APP: 'app.zaptro.com.br'
};

/**
 * Em produção o shell Zaptro vive em `app.zaptro.com.br`. Em localhost / portas Vite do repo
 * mantém-se a origem actual para não partir o desenvolvimento.
 */
export function shouldUseZaptroCanonicalAppHost(): boolean {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return false;
  const p = window.location.port;
  if (p === '5173' || p === '5174' || p === '5175') return false;
  return true;
}

/** Origem canónica do app Zaptro (HTTPS em produção). */
export function getZaptroAppShellOrigin(): string {
  if (!shouldUseZaptroCanonicalAppHost()) return window.location.origin;
  return `https://${LOGTA_DOMAINS.ZAPTRO_APP}`;
}

/** URL absoluta do painel principal após login ou registo com sessão (ex.: `/inicio`). */
export function getZaptroPostLoginLandingUrl(searchParams?: Record<string, string>): string {
  const origin = getZaptroAppShellOrigin();
  const path = ZAPTRO_ROUTES.DASHBOARD;
  const q =
    searchParams && Object.keys(searchParams).length > 0
      ? `?${new URLSearchParams(searchParams).toString()}`
      : '';
  return `${origin}${path}${q}`;
}

/** Rotas do produto Zaptro (WhatsApp / painel) — usado para separar domínios e layout. */
export const isZaptroProductPath = (pathname: string) => {
  const p = pathname.split('?')[0];
  if (p === ZAPTRO_ROUTES.SALES || p.startsWith(`${ZAPTRO_ROUTES.SALES}/`)) return true;
  if (p === ZAPTRO_ROUTES.REGISTER || p === ZAPTRO_ROUTES.LEGACY_REGISTER) return true;
  if (p.startsWith('/whatsapp')) return true;
  if (p.startsWith('/zaptro')) return true;
  if (p.startsWith('/ocorrencia/')) return true;
  const zaptroCanonical = new Set<string>([
    ZAPTRO_ROUTES.DASHBOARD,
    ZAPTRO_ROUTES.CLIENTS,
    ZAPTRO_ROUTES.COMMERCIAL_CRM,
    ZAPTRO_ROUTES.ROUTES,
    ZAPTRO_ROUTES.COMMERCIAL_QUOTES,
    ZAPTRO_ROUTES.DRIVERS,
    ZAPTRO_ROUTES.TEAM,
    ZAPTRO_ROUTES.HISTORY,
    ZAPTRO_ROUTES.LOGISTICS,
    ZAPTRO_ROUTES.SETTINGS_ALIAS,
    ZAPTRO_ROUTES.PROFILE,
    ZAPTRO_ROUTES.LEGACY_PROFILE,
    ZAPTRO_ROUTES.BILLING,
  ]);
  if (zaptroCanonical.has(p)) return true;
  /** CRM em `/comercial`; sub-rotas (ex. `/comercial/orcamentos`) também são Zaptro. */
  if (p.startsWith(`${ZAPTRO_ROUTES.COMMERCIAL_CRM}/`)) return true;
  return false;
};

/** Rotas do ERP Logta que não devem abrir no domínio Zaptro. */
export const isLogtaErpPath = (pathname: string) => {
  const p = pathname.split('?')[0];
  const prefixes = [
    '/dashboard',
    '/logistica',
    '/financeiro',
    '/rh',
    '/crm',
    '/frota',
    '/estoque',
    '/relatorios',
    '/treinamentos',
    '/marketplace',
    '/configuracoes',
    '/suporte',
    '/ajuda',
    '/master-admin',
    '/master',
  ];
  return prefixes.some((x) => p === x || p.startsWith(`${x}/`));
};

export const getContext = () => {
  const hostname = window.location.hostname;
  const path = window.location.pathname;
  const port = window.location.port;

  /**
   * Portas padrão do Vite no repo: 5174 = Zaptro, 5173 = Logta app, 5175 = Academy.
   * Quando serves com `--host 0.0.0.0` (IP da máquina, túnel Cloudflare, VPS), o hostname
   * deixa de ser `localhost` — estes ports mantêm o mesmo contexto que no dev local.
   */
  if (port === '5174') return 'WHATSAPP';
  if (port === '5173') return 'APP';
  if (port === '5175') return 'ACADEMY';

  // Localhost / Development (mesma lógica para localhost e 127.0.0.1)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Se o path contém whatsapp, ou login-whatsapp, ou play, é Zaptro
    if (
      path.includes('whatsapp') || 
      path.startsWith('/play') || 
      path.startsWith('/vendas') ||
      path.startsWith('/login-whatsapp') ||
      path.startsWith('/zaptro') ||
      path.startsWith('/ocorrencia/') ||
      path === ZAPTRO_ROUTES.DASHBOARD ||
      path === ZAPTRO_ROUTES.CLIENTS ||
      path === ZAPTRO_ROUTES.COMMERCIAL_CRM ||
      path.startsWith(`${ZAPTRO_ROUTES.COMMERCIAL_CRM}/`) ||
      path === ZAPTRO_ROUTES.DRIVERS ||
      path === ZAPTRO_ROUTES.TEAM ||
      path === ZAPTRO_ROUTES.HISTORY ||
      path === ZAPTRO_ROUTES.LOGISTICS ||
      path === ZAPTRO_ROUTES.SETTINGS_ALIAS ||
      path === ZAPTRO_ROUTES.PROFILE ||
      path === ZAPTRO_ROUTES.LEGACY_PROFILE ||
      path === ZAPTRO_ROUTES.BILLING ||
      path === ZAPTRO_ROUTES.REGISTER ||
      path === ZAPTRO_ROUTES.LEGACY_REGISTER
    ) return 'WHATSAPP';
    
    if (path.startsWith('/master-admin') || path.startsWith('/master/')) return 'MASTER';
    if (path.startsWith('/ajuda') || path.startsWith('/faq')) return 'SUPPORT';
    if (path.startsWith('/academy')) return 'ACADEMY';
    
    return 'WHATSAPP'; // DEFAULT PARA LOCALHOST É ZAPTRO
  }

  // Domain-based detection (Production)
  // Checagem mais restrita para evitar falsos positivos
  if (hostname.includes('zaptro') || hostname === 'app.zaptro.com.br') return 'WHATSAPP';
  if (hostname.startsWith('adm.')) return 'MASTER';
  if (hostname.startsWith('academy.')) return 'ACADEMY';
  if (hostname.startsWith('play.')) return 'CHECKOUT';
  if (hostname.startsWith('faq.')) return 'FAQ';
  if (hostname.startsWith('blog.')) return 'BLOG';
  if (hostname.startsWith('help.') || hostname.startsWith('support.')) return 'SUPPORT';
  if (hostname.startsWith('planos.')) return 'PLANS';
  if (hostname.startsWith('whatsapp.')) return 'WHATSAPP';
  if (hostname.startsWith('app.')) return 'APP';
  if (hostname.startsWith('www.')) return 'MARKETING';
  
  return 'MARKETING'; 
};

export const enforceDomain = (_context: string, path: string) => {
  const currentHostname = window.location.hostname;
  const currentPort = window.location.port;

  // Skip during local development e durante “dev no ar” nas portas Vite do projeto
  if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') return;
  if (currentPort === '5174' || currentPort === '5173' || currentPort === '5175') return;

  const onZaptroHost = currentHostname.includes('zaptro');
  const onLogtaMarketingHost =
    currentHostname === 'logta.com.br' ||
    currentHostname === 'www.logta.com.br' ||
    currentHostname.endsWith('.logta.com.br');

  const isZaptroPath = isZaptroProductPath(path) || path.startsWith('/play');

  // 1. REGRA: Zaptro só abre em zaptro.com.br
  if (isZaptroPath && !onZaptroHost && onLogtaMarketingHost) {
    console.warn('⚠️ Acesso indevido ao Zaptro via domínio externo. Redirecionando...');
    window.location.href = `https://zaptro.com.br${path}`;
    return;
  }

  // 2. REGRA: Logta core não abre em zaptro.com.br
  if (onZaptroHost && isLogtaErpPath(path)) {
    console.warn('⚠️ Tentativa de acesso ao Logta via Zaptro. Bloqueado por segurança.');
    window.location.href = `https://${LOGTA_DOMAINS.APP}${path}`;
    return;
  }

  // 3. REGRA: APP (logta) só abre nos subdomínios corretos
  const appPaths = ['/rh', '/crm', '/logistica', '/financeiro', '/estoque', '/frota', '/admin', '/dashboard'];
  const isAppPath = appPaths.some(p => path.startsWith(p));
  
  if (isAppPath && (currentHostname === 'logta.com.br' || currentHostname === 'www.logta.com.br')) {
    window.location.href = `https://${LOGTA_DOMAINS.APP}${path}`;
  }
};
