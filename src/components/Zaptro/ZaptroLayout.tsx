import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  User,
  MessageSquare,
  History,
  Settings,
  LogOut,
  Menu,
  ShieldCheck,
  Zap,
  CreditCard,
  LayoutDashboard,
  Kanban,
  FileSpreadsheet,
  Truck,
  HelpCircle,
  Clock,
  X,
  Bell,
  Moon,
  Sun,
  Palette,
  ChevronDown,
  Search,
  ArrowRight,
  Navigation,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { supabaseZaptro } from '../../lib/supabase-zaptro';
import { ZAPTRO_ROUTES } from '../../constants/zaptroRoutes';
import { ZAPTRO_SHADOW } from '../../constants/zaptroShadows';
import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER } from '../../constants/zaptroUi';
import { ZaptroThemeProvider, useZaptroTheme } from '../../context/ZaptroThemeContext';
import { hasZaptroGranularPermission, isZaptroTenantAdminRole } from '../../utils/zaptroPermissions';
import { zaptroMenuPathToPageId, zaptroPathStringToPageId } from '../../utils/zaptroPagePermissionMap';
import { isZaptroBrandingEntitledByPlan } from '../../utils/zaptroBrandingEntitlement';
import { resolveMemberAvatarUrl, resolveSessionAvatarUrl } from '../../utils/zaptroAvatar';
import { isZaptroAccessEnabled } from '../../utils/zaptroSubscription';
import { getZaptroPlanVerifiedTier } from '../../utils/zaptroPlanVerifiedSeal';
import ZaptroPlanGateModal from './ZaptroPlanGateModal';
import { ZaptroPlanVerifiedSealBubble } from './ZaptroPlanVerifiedSealBubble';
import ZaptroLoading from './ZaptroLoading';
import { getContext, isZaptroProductPath } from '../../utils/domains';

interface ZaptroLayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
  hideTopbar?: boolean;
  /** Coluna principal sem cap 1320px (ex.: Kanban em `/comercial`). */
  contentFullWidth?: boolean;
}

type MenuEntry = {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  path: string;
  adminOnly?: boolean;
};

type TeamPresenceRow = { id: string; full_name: string | null; avatar_url?: string | null };

function SidebarTeamPresence({
  companyId,
  selfId,
  sessionProfile,
  onlineUserIds,
  compact,
  textColor,
  textMuted,
  sidebarBg,
  borderColor,
}: {
  companyId?: string | null;
  selfId?: string | null;
  sessionProfile: { id: string; avatar_url?: string | null } | null;
  onlineUserIds: string[];
  compact: boolean;
  textColor: string;
  textMuted: string;
  sidebarBg: string;
  borderColor: string;
}) {
  const [members, setMembers] = useState<TeamPresenceRow[]>([]);

  const load = useCallback(async () => {
    if (!companyId) {
      setMembers([]);
      return;
    }
    const { data, error } = await supabaseZaptro
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('company_id', companyId)
      .order('full_name', { ascending: true })
      .limit(16);
    if (error) {
      setMembers([]);
      return;
    }
    setMembers((data as TeamPresenceRow[]) || []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOnline = (id: string) => id === selfId || onlineUserIds.includes(id);

  if (!companyId || members.length === 0) return null;

  const dot = (id: string) => ({
    position: 'absolute' as const,
    bottom: -1,
    right: -1,
    width: compact ? 7 : 9,
    height: compact ? 7 : 9,
    borderRadius: '50%',
    backgroundColor: isOnline(id) ? '#10B981' : '#94A3B8',
    border: `2px solid ${sidebarBg}`,
  });

  /** Sidebar estreita: preferir quem está online; se a lista em tempo real estiver vazia, mostrar até 8 membros (evita bloco vazio). */
  const onlineMembersCompact = members.filter((m) => isOnline(m.id)).slice(0, 8);
  const compactAvatarMembers =
    onlineMembersCompact.length > 0 ? onlineMembersCompact : members.slice(0, 8);

  if (compact) {
    if (compactAvatarMembers.length === 0) return null;

    return (
      <div
        style={{
          padding: '10px 0 8px',
          borderTop: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          minWidth: 0,
        }}
      >
        {compactAvatarMembers.map((m) => {
          const av = resolveMemberAvatarUrl(m, selfId, sessionProfile);
          const on = isOnline(m.id);
          return (
            <div
              key={m.id}
              title={`${m.full_name || 'Usuário'} — ${on ? 'Online' : 'Indisponível'}`}
              style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}
            >
              {av ? (
                <img src={av} alt="" style={{ width: 28, height: 28, borderRadius: 10, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 10,
                    backgroundColor: '#000000',
                    color: '#D9FF00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 950,
                  }}
                >
                  {(m.full_name || '?')[0].toUpperCase()}
                </div>
              )}
              <span style={dot(m.id)} />
            </div>
          );
        })}
      </div>
    );
  }

  /** Sidebar expandida: nome em cima, linha de estado em baixo (verde = online). */
  return (
    <div style={{ padding: '12px 12px 8px', borderTop: `1px solid ${borderColor}` }}>
      <div
        style={{
          fontSize: '10px',
          fontWeight: 950,
          letterSpacing: '0.08em',
          color: textMuted,
          marginBottom: '10px',
        }}
      >
        EQUIPE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto' }}>
        {members.map((m) => {
          const av = resolveMemberAvatarUrl(m, selfId, sessionProfile);
          const on = isOnline(m.id);
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }} title={m.full_name || 'Usuário'}>
              <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
                {av ? (
                  <img src={av} alt="" style={{ width: 32, height: 32, borderRadius: 12, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 12,
                      backgroundColor: '#000000',
                      color: '#D9FF00',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    {(m.full_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <span style={dot(m.id)} />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 950,
                    color: textColor,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {m.full_name || 'Usuário'}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: on ? '#10B981' : textMuted,
                  }}
                >
                  {on ? 'Online' : 'Indisponível'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Itens da busca global (topo): rotas canónicas + palavras-chave para filtro. */
const ZAPTRO_GLOBAL_SEARCH_ITEMS: readonly { id: string; label: string; path: string; keywords: string }[] = [
  { id: 'inicio', label: 'Painel Central', path: ZAPTRO_ROUTES.DASHBOARD, keywords: 'inicio dashboard painel métricas resumo home' },
  { id: 'crm', label: 'CRM Comercial', path: ZAPTRO_ROUTES.COMMERCIAL_CRM, keywords: 'crm kanban comercial oportunidades vendas pipeline' },
  {
    id: 'orcamentos',
    label: 'Orçamentos (lista)',
    path: ZAPTRO_ROUTES.COMMERCIAL_QUOTES,
    keywords: 'orcamento orçamentos frete proposta lista valores',
  },
  { id: 'whatsapp', label: 'Atendimentos WhatsApp', path: ZAPTRO_ROUTES.CHAT, keywords: 'whatsapp mensagem atendimento chat inbox conversa messenger' },
  { id: 'hist', label: 'Histórico', path: ZAPTRO_ROUTES.HISTORY, keywords: 'historico registo eventos log' },
  { id: 'clients', label: 'Clientes', path: ZAPTRO_ROUTES.CLIENTS, keywords: 'clientes empresas contatos perfil' },
  { id: 'motor', label: 'Motoristas', path: ZAPTRO_ROUTES.DRIVERS, keywords: 'motorista frota camião caminhao veiculo placa condutor' },
  {
    id: 'routes',
    label: 'Rotas',
    path: ZAPTRO_ROUTES.ROUTES,
    keywords: 'rotas rota motorista acompanhar link público entrega',
  },
  { id: 'equipe', label: 'Equipe e acessos', path: ZAPTRO_ROUTES.TEAM, keywords: 'equipe colaboradores utilizadores permissoes acessos' },
  { id: 'ops', label: 'Operações / logística', path: ZAPTRO_ROUTES.LOGISTICS, keywords: 'operacoes operação logistica carga rota' },
  { id: 'fat', label: 'Faturamento', path: ZAPTRO_ROUTES.BILLING, keywords: 'fatura cobrança plano assinatura billing' },
  { id: 'cfg', label: 'Configurações', path: ZAPTRO_ROUTES.SETTINGS_ALIAS, keywords: 'configuracao definicoes ajustes whatsapp conexao marca' },
  { id: 'api', label: 'Integrações API', path: `${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=api`, keywords: 'api nfe nota fiscal integração webhook erp provedor' },
  { id: 'conta', label: 'Minha conta', path: ZAPTRO_ROUTES.PROFILE, keywords: 'perfil conta utilizador senha email' },
];

function canAccessZaptroRoutesPage(
  role: string | null | undefined,
  permissions: string[] | null | undefined,
  isMaster: boolean
): boolean {
  if (isMaster || isZaptroTenantAdminRole(role)) return true;
  return (
    hasZaptroGranularPermission(role, permissions, 'crm') || hasZaptroGranularPermission(role, permissions, 'motoristas')
  );
}

function roleBadgeLabel(role?: string): string {
  if (!role) return 'USER';
  if (role === 'ADMIN') return 'ADM';
  if (role.startsWith('MASTER')) return 'MST';
  if (role.length <= 6) return role;
  return `${role.slice(0, 5)}…`;
}

const ZaptroLayoutChrome: React.FC<ZaptroLayoutProps> = ({
  children,
  hideSidebar = false,
  hideTopbar = false,
  contentFullWidth = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile, onlineUsers, user, refreshProfile, isMaster } = useAuth();
  const { company, isLoading: tenantLoading, fetchCompanyData } = useTenant();
  const [planRechecking, setPlanRechecking] = useState(false);
  const { palette, toggleMode, canCustomizeTenant } = useZaptroTheme();
  
  // 🔥 Cinematic Loading Control
  const [isPageLoading, setIsPageLoading] = useState(true);
  const contextType = getContext();
  const isZaptro = contextType === 'WHATSAPP' || isZaptroProductPath(location.pathname);

  // Re-trigger loading on significant path changes for that "premium" feel
  useEffect(() => {
    if (isZaptro) {
      setIsPageLoading(true);
    }
  }, [location.pathname, isZaptro]);

  const currentLoadingContext = useMemo(() => {
    const p = location.pathname;
    if (p === ZAPTRO_ROUTES.DASHBOARD) return 'dashboard';
    if (p.startsWith(ZAPTRO_ROUTES.CHAT)) return 'mensagens';
    if (p.startsWith(ZAPTRO_ROUTES.ROUTES)) return 'rotas';
    if (p.startsWith(ZAPTRO_ROUTES.LOGISTICS)) return 'cargas';
    if (p.startsWith(ZAPTRO_ROUTES.COMMERCIAL_QUOTES)) return 'orcamentos';
    if (p.startsWith(ZAPTRO_ROUTES.DRIVERS)) return 'motoristas';
    if (p.startsWith(ZAPTRO_ROUTES.COMMERCIAL_CRM)) return 'crm';
    return 'sistema';
  }, [location.pathname]);

  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const globalSearchRef = useRef<HTMLDivElement>(null);

  const filteredGlobalSearch = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    const base =
      q.length === 0
        ? ZAPTRO_GLOBAL_SEARCH_ITEMS.slice(0, 8)
        : ZAPTRO_GLOBAL_SEARCH_ITEMS.filter((item) => {
            const hay = `${item.label} ${item.keywords} ${item.path}`.toLowerCase();
            return hay.includes(q);
          }).slice(0, 12);
    if (isMaster || isZaptroTenantAdminRole(profile?.role)) return base;
    return base.filter((item) => {
      if (item.path === ZAPTRO_ROUTES.ROUTES) {
        return canAccessZaptroRoutesPage(profile?.role, profile?.permissions, isMaster);
      }
      const pid = zaptroPathStringToPageId(item.path);
      if (!pid) return true;
      return hasZaptroGranularPermission(profile?.role, profile?.permissions, pid);
    });
  }, [globalSearchQuery, profile?.role, profile?.permissions, isMaster]);

  const goGlobalSearchHit = useCallback(
    (path: string) => {
      navigate(path);
      setGlobalSearchQuery('');
      setGlobalSearchOpen(false);
    },
    [navigate],
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /** Marca / Conexão WhatsApp: menu do perfil (topo) e `/configuracao` — não duplicar na sidebar. */
  const menuItems = useMemo<MenuEntry[]>(() => {
    const all: MenuEntry[] = [
      { icon: LayoutDashboard, label: 'Início', path: ZAPTRO_ROUTES.DASHBOARD },
      { icon: Kanban, label: 'CRM', path: ZAPTRO_ROUTES.COMMERCIAL_CRM },
      { icon: FileSpreadsheet, label: 'Orçamentos', path: ZAPTRO_ROUTES.COMMERCIAL_QUOTES },
      { icon: MessageSquare, label: 'WhatsApp', path: ZAPTRO_ROUTES.CHAT },
      { icon: Clock, label: 'Histórico', path: ZAPTRO_ROUTES.HISTORY },
      { icon: Users, label: 'Clientes', path: ZAPTRO_ROUTES.CLIENTS },
      { icon: Users, label: 'Equipe', path: ZAPTRO_ROUTES.TEAM },
      { icon: Settings, label: 'Ajustes', path: `${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=config` },
    ];
    if (isMaster || isZaptroTenantAdminRole(profile?.role)) return all;
    return all.filter((item) => {
      if (item.path === ZAPTRO_ROUTES.ROUTES) {
        return canAccessZaptroRoutesPage(profile?.role, profile?.permissions, isMaster);
      }
      const id = zaptroMenuPathToPageId(item.path);
      if (!id) return true;
      return hasZaptroGranularPermission(profile?.role, profile?.permissions, id);
    });
  }, [profile?.role, profile?.permissions, isMaster]);

  const toggleMobileMenu = () => setIsMenuOpen(!isMenuOpen);

  const sidebarW = isMobile ? '280px' : isHovered ? '280px' : '90px';
  /** Rail estreito (~90px): mais respiro lateral e ítens do menu mais “chip”, sem faixa ativa a largura inteira. */
  const sidebarCollapsed = !isHovered && !isMobile;
  const isDark = palette.mode === 'dark';
  const sessionAvatarSrc = useMemo(() => resolveSessionAvatarUrl(profile), [profile]);

  const planVerifiedTier = useMemo(() => getZaptroPlanVerifiedTier(company), [company]);

  const planGateOpen = useMemo(() => {
    // Disabled as requested: remover sobreposição de cobrança
    return false;
  }, []);

  const handlePlanRecheck = async () => {
    setPlanRechecking(true);
    try {
      await refreshProfile();
      await fetchCompanyData();
    } finally {
      setPlanRechecking(false);
    }
  };

  const handleSignOutFromHub = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsHubOpen(false);
      void signOut();
    },
    [signOut],
  );

  const showSettingsMenuLink = useMemo(() => {
    if (isMaster || isZaptroTenantAdminRole(profile?.role)) return true;
    return ['cfg', 'cfg_api', 'cfg_marca'].some((id) =>
      hasZaptroGranularPermission(profile?.role, profile?.permissions, id),
    );
  }, [isMaster, profile?.role, profile?.permissions]);

  const showBillingMenuLink = useMemo(() => {
    const isMaster = profile?.role?.toUpperCase() === 'MASTER' || profile?.role?.toUpperCase() === 'ADMIN';
    if (isMaster || isZaptroTenantAdminRole(profile?.role)) return true;
    return hasZaptroGranularPermission(profile?.role, profile?.permissions, 'faturamento');
  }, [isMaster, profile?.role, profile?.permissions]);

  const showBrandingMenuLink = useMemo(() => {
    if (!isZaptroBrandingEntitledByPlan(company)) return false;
    if (isMaster || isZaptroTenantAdminRole(profile?.role)) return true;
    return hasZaptroGranularPermission(profile?.role, profile?.permissions, 'cfg_marca');
  }, [isMaster, profile?.role, profile?.permissions, company]);

  const showProfileAdvancedLinks = showSettingsMenuLink || showBillingMenuLink || showBrandingMenuLink;

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setGlobalSearchOpen(false);
    setGlobalSearchQuery('');
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!globalSearchOpen) return;
    const onDoc = (ev: MouseEvent) => {
      const el = globalSearchRef.current;
      if (el && !el.contains(ev.target as Node)) setGlobalSearchOpen(false);
    };
    const attachId = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc);
    }, 0);
    return () => {
      window.clearTimeout(attachId);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [globalSearchOpen]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const onDocMouseDown = (ev: MouseEvent) => {
      const el = profileMenuRef.current;
      if (el && !el.contains(ev.target as Node)) setIsProfileMenuOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setIsProfileMenuOpen(false);
    };
    /** Adia o listener para o próximo tick: evita o mesmo clique que abre o menu ser tratado como “fora” em alguns casos (touch / stacking). */
    const attachId = window.setTimeout(() => {
      document.addEventListener('mousedown', onDocMouseDown);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      window.clearTimeout(attachId);
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isProfileMenuOpen]);

  const goProfileMenu = useCallback(
    (path: string) => {
      setIsProfileMenuOpen(false);
      navigate(path);
    },
    [navigate],
  );

  const hubPopupBody = (
    <>
      <div style={styles.hubHeader}>
        <ShieldCheck size={20} color="#10B981" />
        <div>
          <h4 style={{ ...styles.hubTitle, color: palette.text }}>Nível de Proteção Ativo</h4>
          <p style={styles.hubDesc}>Criptografia ponta-a-ponta ativada.</p>
        </div>
      </div>
      <div style={{ ...styles.hubFooter, borderTopColor: palette.searchBorder }}>
        <button
          type="button"
          style={{
            ...styles.supportBtn,
            backgroundColor: palette.mode === 'dark' ? palette.searchBg : ZAPTRO_FIELD_BG,
            color: palette.text,
          }}
        >
          <HelpCircle size={16} /> Suporte
        </button>
        <button type="button" style={styles.logoutBtnHub} onClick={handleSignOutFromHub}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div
      style={{
        display: 'flex',
        /** `100%` evita barra horizontal fantasma; `100vw` inclui a largura da barra de rolagem do SO. */
        width: '100%',
        maxWidth: '100%',
        height: '100vh',
        backgroundColor: palette.pageBg,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Inter, sans-serif',
        color: palette.text,
        // Injeção de cores da empresa
        ['--zaptro-primary' as any]: company?.primary_color || palette.lime,
        ['--zaptro-secondary' as any]: company?.secondary_color || (isDark ? '#000' : '#000'),
      }}
    >
      {/* 🎬 Premium Cinematic Loader */}
      {isZaptro && isPageLoading && (
        <ZaptroLoading 
          context={currentLoadingContext as any} 
          onFinished={() => setIsPageLoading(false)} 
        />
      )}
      <style>{`
        :root {
          --z-p: ${company?.primary_color || palette.lime};
          --z-s: ${company?.secondary_color || '#000'};
        }
      `}</style>
      {!hideTopbar && isMobile && (
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '70px',
            backgroundColor: palette.mobileHeaderBg,
            borderBottom: `1px solid ${palette.mobileHeaderBorder}`,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
          }}
        >
          <button type="button" style={styles.hamburger} onClick={toggleMobileMenu}>
            <Menu size={24} color={palette.text} />
          </button>
          <div style={styles.mobileLogo}>
            <Zap size={20} color={palette.text} fill="var(--z-p)" />
            <span style={{ ...styles.logoTextMainMobile, color: palette.text }}>ZAPTRO</span>
          </div>
          <div style={{ ...styles.mobileActions, gap: 10 }}>
            <button
              type="button"
              style={styles.hubBtnMobile}
              onClick={toggleMode}
              title={palette.mode === 'light' ? 'Modo escuro' : 'Modo claro'}
              aria-label={palette.mode === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              {palette.mode === 'light' ? (
                <Moon size={20} color={palette.text} />
              ) : (
                <Sun size={20} color={palette.lime} />
              )}
            </button>
            <button
              type="button"
              style={styles.hubBtnMobile}
              onClick={() => {
                setIsHubOpen(false);
                navigate(ZAPTRO_ROUTES.PROFILE);
              }}
              aria-label="Minha conta"
              title="Minha conta"
            >
              <User size={20} color={palette.text} />
            </button>
            <button type="button" style={styles.hubBtnMobile} onClick={() => setIsHubOpen(!isHubOpen)}>
              <ShieldCheck size={20} color={palette.text} />
            </button>
          </div>
        </header>
      )}

      {isMobile && isHubOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar painel de ambiente seguro"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 220,
              border: 'none',
              margin: 0,
              padding: 0,
              cursor: 'default',
              backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(15, 23, 42, 0.2)',
            }}
            onClick={() => setIsHubOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: 74,
              right: 16,
              width: 300,
              borderRadius: 25,
              boxShadow: ZAPTRO_SHADOW.lg,
              padding: 25,
              zIndex: 230,
              backgroundColor: palette.hubPopupBg,
              border: `1px solid ${palette.searchBorder}`,
            }}
          >
            {hubPopupBody}
          </div>
        </>
      )}

      {isMobile && isMenuOpen && <div style={styles.overlay} onClick={toggleMobileMenu} />}

      {!hideSidebar && (
        <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...styles.sidebar,
          width: sidebarW,
          left: isMobile ? (isMenuOpen ? '0' : '-280px') : '0',
          backgroundColor: palette.sidebarBg,
          borderRight: `1px solid ${palette.sidebarBorder}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            boxSizing: 'border-box',
            /** Painel 280px: respiro nas margens internas sem alterar o rail colapsado (~90px). */
            ...(!sidebarCollapsed ? { paddingLeft: 20, paddingRight: 20 } : {}),
          }}
        >
        <div
          style={{
            ...styles.sidebarHeader,
            ...(sidebarCollapsed ? { paddingLeft: 10, paddingRight: 10, boxSizing: 'border-box' as const } : {}),
          }}
        >
          {isHovered || isMobile ? (
            <div style={styles.logoArea}>
                <div
                  style={{
                    ...styles.logoIcon,
                    backgroundColor: company?.secondary_color || '#000000',
                  }}
                >
                  <Zap size={22} color={palette.lime} fill={palette.lime} />
                </div>
              <div style={styles.logoText}>
                <span style={{ ...styles.logoMain, color: palette.text }}>ZAPTRO</span>
                <span style={{ ...styles.logoSub, color: palette.textMuted }}>WHATSAPP WAAS</span>
              </div>
            </div>
          ) : (
            <div
              style={{
                ...styles.logoIconCompact,
                backgroundColor: isDark ? '#111827' : ZAPTRO_FIELD_BG,
                borderColor: isDark ? 'var(--z-p)' : ZAPTRO_SECTION_BORDER,
              }}
            >
              <Zap size={22} color={palette.text} fill="var(--z-p)" />
            </div>
          )}
        </div>

        <div
          style={{
            ...styles.navColumn,
            ...(sidebarCollapsed ? { paddingLeft: 10, paddingRight: 10, boxSizing: 'border-box' as const } : {}),
          }}
        >
          <div style={styles.navCenterWrap}>
            <div
              style={{
                ...styles.nav,
                ...(sidebarCollapsed ? { alignItems: 'center' as const } : {}),
              }}
            >
            {menuItems.map((item) => {
              const [pathBase, pathQuery] = item.path.split('?');
              const isActive =
                location.pathname === pathBase &&
                (pathQuery
                  ? (() => {
                      const want = new URLSearchParams(pathQuery);
                      const have = new URLSearchParams(location.search);
                      if (pathBase === ZAPTRO_ROUTES.SETTINGS_ALIAS) {
                        const wt = want.get('tab') || 'config';
                        const ht = have.get('tab') || 'config';
                        return wt === ht;
                      }
                      return [...want].every(([k, v]) => have.get(k) === v);
                    })()
                  : true);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setIsMenuOpen(false);
                  }}
                  style={{
                    ...styles.navItem,
                    backgroundColor: isActive ? palette.navActiveBg : 'transparent',
                    color: isActive ? palette.text : palette.mode === 'light' ? '#000000' : palette.textMuted,
                    justifyContent: isHovered || isMobile ? 'flex-start' : 'center',
                    borderLeft: isActive ? `3px solid ${palette.navActiveBorder}` : '3px solid transparent',
                    paddingLeft: isHovered || isMobile ? '24px' : '0',
                    ...(sidebarCollapsed
                      ? {
                          width: 50,
                          height: 50,
                          marginLeft: 'auto',
                          marginRight: 'auto',
                          borderRadius: 16,
                          flexShrink: 0,
                        }
                      : {}),
                  }}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} color="currentColor" />
                  {(isHovered || isMobile) && <span style={styles.navLabel}>{item.label}</span>}
                </button>
              );
            })}
            </div>
          </div>
          <SidebarTeamPresence
            companyId={profile?.company_id}
            selfId={profile?.id}
            sessionProfile={profile ? { id: profile.id, avatar_url: profile.avatar_url } : null}
            onlineUserIds={onlineUsers}
            compact={!isHovered && !isMobile}
            textColor={palette.text}
            textMuted={palette.textMuted}
            sidebarBg={palette.sidebarBg}
            borderColor={palette.sidebarBorder}
          />
        </div>

        <div
          style={{
            ...styles.sidebarFooter,
            ...(sidebarCollapsed ? { padding: '16px 10px', boxSizing: 'border-box' as const } : {}),
          }}
        >
          <button
            type="button"
            style={{
              ...styles.logoutBtn,
              justifyContent: isHovered || isMobile ? 'flex-start' : 'center',
              padding: isHovered || isMobile ? '18px 24px' : '0',
              ...(sidebarCollapsed
                ? {
                    width: 50,
                    height: 50,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    borderRadius: 16,
                  }
                : {}),
            }}
            onClick={signOut}
          >
            <LogOut size={20} />
            {(isHovered || isMobile) && <span>Sair do Sistema</span>}
          </button>
        </div>
        </div>
      </aside>
      )}

      <main
        style={{
          ...styles.main,
          marginLeft: hideSidebar || isMobile ? '0' : isHovered ? '280px' : '90px',
        }}
      >
        {!hideTopbar && !isMobile && (
          <header
            style={{
              ...styles.topbarShell,
              backgroundColor: palette.topbarBg,
              borderBottom: `1px solid ${palette.topbarBorder}`,
            }}
          >
            <div style={styles.topbarInner}>
            <div style={styles.topbarLeft}>
              <div ref={globalSearchRef} style={{ position: 'relative', width: 450, maxWidth: '100%' }}>
                <div
                  style={{
                    ...styles.searchBox,
                    backgroundColor: palette.searchBg,
                    border: `1px solid ${palette.searchBorder}`,
                  }}
                >
                  <Search size={18} color={palette.textMuted} strokeWidth={2.2} aria-hidden />
                  <input
                    type="search"
                    value={globalSearchQuery}
                    onChange={(e) => {
                      setGlobalSearchQuery(e.target.value);
                      setGlobalSearchOpen(true);
                    }}
                    onFocus={() => setGlobalSearchOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setGlobalSearchOpen(false);
                    }}
                    placeholder="Buscar páginas: equipe, CRM, API, WhatsApp…"
                    style={{ ...styles.topSearch, color: palette.text }}
                    aria-label="Busca global Zaptro"
                    aria-expanded={globalSearchOpen}
                    aria-controls="zaptro-global-search-results"
                    autoComplete="off"
                  />
                </div>
                {globalSearchOpen && filteredGlobalSearch.length > 0 && (
                  <div
                    id="zaptro-global-search-results"
                    role="listbox"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 'calc(100% + 8px)',
                      zIndex: 300,
                      maxHeight: 380,
                      overflowY: 'auto',
                      borderRadius: 18,
                      border: `1px solid ${palette.searchBorder}`,
                      backgroundColor: palette.hubPopupBg,
                      boxShadow: isDark ? '0 20px 50px rgba(0,0,0,0.45)' : '0 16px 48px rgba(15,23,42,0.12)',
                      padding: 8,
                    }}
                  >
                    {filteredGlobalSearch.map((hit) => (
                      <button
                        key={hit.id}
                        type="button"
                        role="option"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goGlobalSearchHit(hit.path)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 14px',
                          borderRadius: 14,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <LayoutDashboard size={18} color={palette.lime} strokeWidth={2.2} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 950, fontSize: 14, color: palette.text }}>{hit.label}</span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: 11,
                              fontWeight: 600,
                              color: palette.textMuted,
                              marginTop: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {hit.path}
                          </span>
                        </span>
                        <ArrowRight size={16} color={palette.textMuted} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={styles.topbarRight}>
              <button
                type="button"
                style={{
                  ...styles.newsBtn,
                  backgroundColor: palette.iconButtonBg,
                  border: `1px solid ${palette.iconButtonBorder}`,
                }}
                onClick={() => setIsNewsOpen(!isNewsOpen)}
              >
                <Bell size={20} color={palette.text} />
                <div style={{ ...styles.newsDot, borderColor: palette.topbarBg }} />
              </button>

              {!isMobile && (
                <button
                  type="button"
                  style={{
                    ...styles.newsBtn,
                    backgroundColor: palette.iconButtonBg,
                    border: `1px solid ${palette.iconButtonBorder}`,
                  }}
                  onClick={toggleMode}
                  title={palette.mode === 'light' ? 'Modo escuro (aparência)' : 'Modo claro (aparência)'}
                  aria-label={palette.mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
                >
                  {palette.mode === 'light' ? (
                    <Moon size={22} color={palette.text} strokeWidth={2.2} />
                  ) : (
                    <Sun size={22} color={palette.lime} strokeWidth={2.2} />
                  )}
                </button>
              )}

              <div style={styles.hubContainer}>
                <button type="button" style={styles.hubBtn} onClick={() => setIsHubOpen(!isHubOpen)}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#000',
                    boxShadow: '0 0 12px rgba(0,0,0,0.4)',
                    animation: 'zaptro-pulse 1.8s infinite'
                  }} />
                  <span>SISTEMA ATIVO</span>
                </button>
                <style>{`
                  @keyframes zaptro-pulse {
                    0% { transform: scale(0.95); opacity: 1; }
                    50% { transform: scale(1.15); opacity: 0.7; }
                    100% { transform: scale(0.95); opacity: 1; }
                  }
                `}</style>

                {isHubOpen && (
                  <div
                    style={{
                      ...styles.hubPopup,
                      backgroundColor: palette.hubPopupBg,
                      border: `1px solid ${palette.searchBorder}`,
                    }}
                  >
                    {hubPopupBody}
                  </div>
                )}
              </div>

              <div ref={profileMenuRef} style={styles.profileMenuWrap}>
                <div
                  style={{
                    ...styles.profileArea,
                    backgroundColor: palette.profileBg,
                    border: `1px solid ${palette.profileBorder}`,
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-haspopup="menu"
                    aria-expanded={isProfileMenuOpen}
                    style={styles.profileNameZone}
                    onClick={() => setIsProfileMenuOpen((o) => !o)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsProfileMenuOpen((o) => !o);
                      }
                    }}
                  >
                    <div style={styles.profileInfo}>
                      <span style={{ ...styles.profileName, color: palette.text }}>
                        {profile?.full_name?.split(' ')[0]}
                      </span>
                      <div style={styles.roleBadgeHeader}>{roleBadgeLabel(profile?.role)}</div>
                    </div>
                    <ChevronDown
                      size={18}
                      color={palette.textMuted}
                      strokeWidth={2.4}
                      style={{
                        marginRight: 4,
                        transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                      aria-hidden
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={isProfileMenuOpen}
                      aria-label="Abrir menu do perfil"
                      style={{
                        ...styles.avatarMenuButton,
                        border: `1px solid ${palette.profileBorder}`,
                        backgroundColor: palette.profileBg,
                      }}
                      onClick={() => setIsProfileMenuOpen((o) => !o)}
                    >
                      <span style={styles.avatarMini}>
                        {sessionAvatarSrc ? (
                          <img
                            src={sessionAvatarSrc}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px', display: 'block' }}
                          />
                        ) : (
                          profile?.full_name?.[0] || 'U'
                        )}
                      </span>
                    </button>
                    {planVerifiedTier !== 'none' && (
                      <span style={{ lineHeight: 0, flexShrink: 0 }} aria-hidden>
                        <ZaptroPlanVerifiedSealBubble tier={planVerifiedTier} size="sm" />
                      </span>
                    )}
                  </div>
                </div>

                {isProfileMenuOpen && (
                  <>
                    <div
                      role="menu"
                      style={{
                        ...styles.profileDropdown,
                        backgroundColor: palette.hubPopupBg,
                        border: `1px solid ${palette.searchBorder}`,
                        boxShadow: ZAPTRO_SHADOW.lg,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                    <button
                      type="button"
                      role="menuitem"
                      style={{ ...styles.profileMenuItem, color: palette.text }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = palette.navActiveBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => goProfileMenu(ZAPTRO_ROUTES.PROFILE)}
                    >
                      <User size={18} strokeWidth={2.2} color={palette.text} />
                      Perfil
                    </button>

                    {showProfileAdvancedLinks && (
                      <>
                        <div style={{ ...styles.profileMenuDivider, backgroundColor: palette.searchBorder }} />
                        {showSettingsMenuLink && (
                          <button
                            type="button"
                            role="menuitem"
                            style={{ ...styles.profileMenuItem, color: palette.text }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = palette.navActiveBg;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            onClick={() => goProfileMenu(`${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=config`)}
                          >
                            <Settings size={18} strokeWidth={2.2} color={palette.text} />
                            Configurações
                          </button>
                        )}
                        {showBillingMenuLink && (
                          <button
                            type="button"
                            role="menuitem"
                            style={{ ...styles.profileMenuItem, color: palette.text }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = palette.navActiveBg;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            onClick={() => goProfileMenu(ZAPTRO_ROUTES.BILLING)}
                          >
                            <CreditCard size={18} strokeWidth={2.2} color={palette.text} />
                            Assinaturas, plano e faturamento
                          </button>
                        )}
                        {showBrandingMenuLink && (
                          <button
                            type="button"
                            role="menuitem"
                            style={{ ...styles.profileMenuItem, color: palette.text }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = palette.navActiveBg;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            onClick={() => goProfileMenu(`${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=marca`)}
                          >
                            <Palette size={18} strokeWidth={2.2} color={palette.text} />
                            Personalizar empresa
                          </button>
                        )}
                      </>
                    )}
                    </div>
                  </>
                )}
              </div>
            </div>
            </div>
          </header>
        )}

        <div
          className="zaptro-scroll-area"
          style={{
            ...styles.content,
            backgroundColor: palette.pageBg,
            color: palette.text,
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? 'rgba(148, 163, 184, 0.45) transparent' : 'rgba(100, 116, 139, 0.4) transparent',
          }}
        >
          <div
            style={{
              ...styles.contentInner,
              ...(contentFullWidth
                ? {
                    maxWidth: 'none',
                    width: '100%',
                    marginLeft: 0,
                    marginRight: 0,
                    paddingLeft: 'clamp(32px, 4.5vw, 72px)',
                    paddingRight: 'clamp(32px, 4.5vw, 72px)',
                  }
                : {}),
            }}
          >
            {children}
          </div>
        </div>
      </main>
      <ZaptroPlanGateModal
        open={planGateOpen}
        email={user?.email ?? profile?.email}
        onGoToBilling={() => navigate(`${ZAPTRO_ROUTES.PROFILE}?tab=billing`)}
        onRecheck={() => void handlePlanRecheck()}
        rechecking={planRechecking}
      />

      <style>{`
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 50px ${isDark ? '#111827' : ZAPTRO_FIELD_BG} inset !important;
          -webkit-text-fill-color: ${palette.text} !important;
        }
        /* Só a coluna principal: trilho transparente = sem “faixa” cinzenta a roubar espaço visual. */
        .zaptro-scroll-area::-webkit-scrollbar { width: 3px; }
        .zaptro-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .zaptro-scroll-area::-webkit-scrollbar-thumb {
          background-color: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)'};
          border-radius: 999px;
        }
        .zaptro-scroll-area::-webkit-scrollbar-thumb:hover {
          background-color: ${isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.38)'};
        }
      `}</style>
    </div>
  );
};

const ZaptroLayout: React.FC<ZaptroLayoutProps> = ({
  children,
  hideSidebar = false,
  hideTopbar = false,
  contentFullWidth = false,
}) => {
  const { profile, isMaster } = useAuth();
  const { company } = useTenant();
  /** Testes: `VITE_ZAPTRO_BRANDING_FOR_ALL=true` no `.env.development` — remova em produção. */
  const brandingMenuForAll =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ZAPTRO_BRANDING_FOR_ALL === 'true';
  const canCustomizeTenant = useMemo(() => {
    if (brandingMenuForAll) return true;
    if (isMaster) return true;
    if (!isZaptroBrandingEntitledByPlan(company)) return false;
    if (isZaptroTenantAdminRole(profile?.role)) return true;
    return hasZaptroGranularPermission(profile?.role, profile?.permissions, 'cfg_marca');
  }, [brandingMenuForAll, isMaster, profile?.role, profile?.permissions, company]);

  return (
    <ZaptroThemeProvider canCustomizeTenant={canCustomizeTenant}>
      <ZaptroLayoutChrome
        hideSidebar={hideSidebar}
        hideTopbar={hideTopbar}
        contentFullWidth={contentFullWidth}
      >
        {children}
      </ZaptroLayoutChrome>
    </ZaptroThemeProvider>
  );
};

const styles: Record<string, React.CSSProperties> = {
  hamburger: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubBtnMobile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: '1px solid #E2E8F0',
    background: ZAPTRO_FIELD_BG,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(24, 24, 27, 0.22)',
    zIndex: 150,
  },
  hubContainer: { position: 'relative' },
  mobileLogo: { display: 'flex', alignItems: 'center', gap: 10 },
  mobileActions: { display: 'flex', alignItems: 'center', gap: 10 },
  logoTextMainMobile: { fontSize: '20px', fontWeight: 950, letterSpacing: '-1px' },
  sidebar: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 200,
  },
  sidebarHeader: { height: '110px', padding: '0 24px', display: 'flex', alignItems: 'center' },
  logoArea: { display: 'flex', alignItems: 'center', gap: '15px' },
  logoIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconCompact: {
    width: '46px',
    height: '46px',
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    borderRadius: '15px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { display: 'flex', flexDirection: 'column' },
  logoMain: { fontSize: '22px', fontWeight: 950, letterSpacing: '-1.5px', lineHeight: 1 },
  logoSub: { fontSize: '9px', fontWeight: 950, marginTop: '4px', letterSpacing: '2px' },
  navColumn: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
  /** Ocupa o espaço entre logo e equipe; menu alinhado ao topo (não centrado verticalmente). */
  navCenterWrap: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  nav: {
    flex: '0 1 auto',
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
    maxHeight: '100%',
    minHeight: 0,
  },
  navItem: {
    border: 'none',
    background: 'transparent',
    height: '58px',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    cursor: 'pointer',
    transition: '0.2s',
    fontSize: '15px',
    fontWeight: 800,
  },
  navLabel: { whiteSpace: 'nowrap' },
  sidebarFooter: { padding: '20px' },
  logoutBtn: {
    border: 'none',
    background: 'transparent',
    color: '#EF4444',
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    fontSize: '15px',
    fontWeight: 950,
    cursor: 'pointer',
    width: '100%',
  },
  main: {
    flex: 1,
    minWidth: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  /** Barra superior em toda a largura do `main` (não segue a coluna centrada do conteúdo). */
  topbarShell: {
    height: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'stretch',
    flexShrink: 0,
    minWidth: 0,
    width: '100%',
    position: 'relative',
    zIndex: 120,
  },
  topbarInner: {
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    padding: '0 clamp(16px, 3vw, 32px)',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    minWidth: 0,
  },
  topbarLeft: { flex: 1, minWidth: 0, overflow: 'hidden' },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '14px 28px',
    borderRadius: '20px',
    width: '450px',
    maxWidth: '100%',
  },
  topSearch: {
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    fontSize: '15px',
    fontWeight: 700,
    width: '100%',
  },
  topbarRight: { display: 'flex', alignItems: 'center', gap: '20px' },
  newsBtn: {
    position: 'relative',
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsDot: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    width: '10px',
    height: '10px',
    backgroundColor: '#EF4444',
    borderRadius: '50%',
    border: '2px solid white',
  },
  hubBtn: {
    padding: '14px 24px',
    borderRadius: '18px',
    backgroundColor: '#D9FF00',
    border: 'none',
    color: '#000',
    fontWeight: 950,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  hubPopup: {
    position: 'absolute',
    top: '80px',
    right: 0,
    width: '300px',
    borderRadius: '25px',
    boxShadow: ZAPTRO_SHADOW.lg,
    padding: '25px',
    zIndex: 1000,
  },
  hubHeader: { display: 'flex', gap: '15px', marginBottom: '20px' },
  hubTitle: { margin: 0, fontSize: '16px', fontWeight: 950 },
  hubDesc: { margin: '4px 0 0 0', fontSize: '13px', color: '#94A3B8', fontWeight: 600 },
  hubFooter: { borderTop: '1px solid #F1F5F9', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  supportBtn: {
    padding: '12px',
    background: ZAPTRO_FIELD_BG,
    border: 'none',
    borderRadius: '12px',
    fontWeight: 900,
    cursor: 'pointer',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  logoutBtnHub: {
    padding: '12px',
    background: 'transparent',
    border: 'none',
    color: '#EF4444',
    fontWeight: 950,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  profileMenuWrap: {
    position: 'relative',
    flexShrink: 0,
    /** Acima do popup do hub (z-index 1000) para o avatar / menu de perfil continuarem clicáveis. */
    zIndex: 1105,
  },
  profileDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 10,
    minWidth: 280,
    borderRadius: 18,
    padding: '8px',
    zIndex: 1100,
  },
  profileMenuDivider: {
    height: 1,
    margin: '4px 8px',
    border: 'none',
  },
  profileMenuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    border: 'none',
    borderRadius: 14,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 14,
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  profileArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px 10px 20px',
    borderRadius: '20px',
  },
  profileNameZone: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
  },
  avatarMenuButton: {
    flexShrink: 0,
    padding: 0,
    margin: 0,
    borderRadius: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 0,
    outline: 'none',
  },
  profileInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  profileName: { fontSize: '14px', fontWeight: 950 },
  roleBadgeHeader: {
    padding: '2px 8px',
    backgroundColor: '#000',
    color: '#D9FF00',
    borderRadius: '6px',
    fontSize: '9px',
    fontWeight: 950,
  },
  avatarMini: {
    width: '42px',
    height: '42px',
    borderRadius: '14px',
    backgroundColor: '#000',
    color: '#D9FF00',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 950,
    fontSize: '16px',
  },
  /**
   * Área rolável full-bleed no `main` (sem max-width): scroll e cor de fundo; margens laterais “originais”.
   */
  content: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    margin: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    padding: '24px 0 64px',
    boxSizing: 'border-box',
  },
  /** Coluna centrada e respiro horizontal só no interior (não estreita a zona de scroll). */
  contentInner: {
    width: '100%',
    maxWidth: 1320,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: 'clamp(20px, 4vw, 56px)',
    paddingRight: 'clamp(20px, 4vw, 56px)',
    boxSizing: 'border-box',
  },
};

export default ZaptroLayout;
