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
  Navigation,
  Plus,
  TrendingUp,
  LayoutGrid,
  MapPin,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { supabaseZaptro } from '../../lib/supabase-zaptro';
import { ZAPTRO_ROUTES } from '../../constants/zaptroRoutes';
import { ZAPTRO_SHADOW } from '../../constants/zaptroShadows';
import { zaptroCardSurfaceStyle } from '../../constants/zaptroCardSurface';
import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER } from '../../constants/zaptroUi';
import { ZaptroThemeProvider, useZaptroTheme } from '../../context/ZaptroThemeContext';
import { hasZaptroGranularPermission, isZaptroTenantAdminRole } from '../../utils/zaptroPermissions';
import { zaptroMenuPathToPageId } from '../../utils/zaptroPagePermissionMap';
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
  /** Conteúdo opcional como primeiro filho de `.zaptro-scroll-area` (acima do wrapper da página). */
  scrollAreaTop?: React.ReactNode;
}

type MenuEntry = {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  path: string;
  adminOnly?: boolean;
};

type TeamPresenceRow = { id: string; full_name: string | null; avatar_url?: string | null };

/** Só quem está online — fila fixa no topbar, avatares sobrepostos, sem scroll. */
function SidebarTeamPresence({
  companyId,
  selfId,
  sessionProfile,
  onlineUserIds,
  /** Cor de fundo por trás do indicador de estado (ex.: `palette.topbarBg`). */
  ringBg,
  maxAvatars = 32,
}: {
  companyId?: string | null;
  selfId?: string | null;
  sessionProfile: { id: string; avatar_url?: string | null } | null;
  onlineUserIds: string[];
  ringBg: string;
  maxAvatars?: number;
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
      .limit(48);
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

  const onlineMembers = members.filter((m) => isOnline(m.id)).slice(0, maxAvatars);
  if (onlineMembers.length === 0) return null;

  const n = onlineMembers.length;
  const overlap = n > 14 ? 12 : n > 10 ? 10 : n > 6 ? 9 : 8;
  const size = n > 16 ? 26 : n > 12 ? 28 : n > 8 ? 30 : 32;
  const dotSize = n > 16 ? 7 : 8;

  const dotStyle = (): React.CSSProperties => ({
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: dotSize,
    height: dotSize,
    borderRadius: '50%',
    backgroundColor: 'rgba(75, 231, 8, 1)',
    border: `2px solid ${ringBg}`,
    boxSizing: 'border-box',
    pointerEvents: 'none',
  });

  return (
    <div
      role="group"
      aria-label="Equipa online"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        minWidth: 0,
        overflow: 'visible',
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      {onlineMembers.map((m, i) => {
        const av = resolveMemberAvatarUrl(m, selfId, sessionProfile);
        const displayName = m.full_name?.trim() || 'Usuário';
        const tip = `${displayName} — online`;
        return (
          <div
            key={m.id}
            title={tip}
            style={{
              position: 'relative',
              width: size,
              height: size,
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: n - i,
              flexShrink: 0,
            }}
          >
            {av ? (
              <img
                src={av}
                alt={displayName}
                title={tip}
                style={{
                  width: size,
                  height: size,
                  borderRadius: 10,
                  objectFit: 'cover',
                  display: 'block',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
                }}
              />
            ) : (
              <div
                title={tip}
                style={{
                  width: size,
                  height: size,
                  borderRadius: 10,
                  backgroundColor: '#0f172a',
                  color: '#D9FF00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: Math.max(11, Math.round(size * 0.38)),
                  fontWeight: 950,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
                }}
              >
                {(m.full_name || '?')[0].toUpperCase()}
              </div>
            )}
            <span style={dotStyle()} aria-hidden />
          </div>
        );
      })}
    </div>
  );
}

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
  scrollAreaTop,
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

  /** Referência estável — se passarmos inline `() => set…` ao `ZaptroLoading`, cada render cancela os timers do loader. */
  const finishPageLoading = useCallback(() => {
    setIsPageLoading(false);
  }, []);

  /** Garante que o painel nunca fica preso atrás do loader se algo falhar nos timers. */
  useEffect(() => {
    if (!isZaptro || !isPageLoading) return;
    const id = window.setTimeout(() => setIsPageLoading(false), 12000);
    return () => window.clearTimeout(id);
  }, [isZaptro, isPageLoading, location.pathname]);

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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [railHover, setRailHover] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsMenuOpen(false);
      if (mobile) setRailHover(false);
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
      { icon: Navigation, label: 'Rotas', path: ZAPTRO_ROUTES.ROUTES },
      { icon: MapPin, label: 'Mapa', path: ZAPTRO_ROUTES.OPENSTREETMAP },
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

  /** «Ajustes» fica no rodapé, por cima de «Sair» — não repetir no meio da lista. */
  const sidebarNavItems = useMemo(
    () => menuItems.filter((item) => item.label !== 'Ajustes'),
    [menuItems],
  );
  const sidebarSettingsItem = useMemo(
    () => menuItems.find((item) => item.label === 'Ajustes') ?? null,
    [menuItems],
  );

  /** Rail fixo só com ícones (desktop); ao hover expande à direita (labels); drawer largo no telemóvel. */
  const RAIL_WIDTH = 76;
  const RAIL_WIDTH_EXPANDED = 232;
  const RAIL_MARGIN = 12;
  const RAIL_AFTER_GAP = 20;
  const mainMarginDesktop = hideSidebar ? 0 : RAIL_MARGIN + RAIL_WIDTH + RAIL_AFTER_GAP;
  const railExpandedLabels = isMobile || railHover;

  const railDivider = (key: string) => (
    <div
      key={key}
      aria-hidden
      style={{
        height: 1,
        background: palette.mode === 'dark' ? 'rgba(148,163,184,0.22)' : '#e8e8ea',
        margin: '8px 10px',
        flexShrink: 0,
      }}
    />
  );

  const renderSidebarNavButton = useCallback(
    (item: MenuEntry) => {
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
      const expanded = railExpandedLabels;
      const activeFg =
        isActive && palette.mode === 'light' ? '#000000' : isActive ? palette.text : palette.mode === 'light' ? '#374151' : palette.textMuted;
      return (
        <button
          key={item.path}
          type="button"
          className="zaptro-sidebar-nav-btn"
          title={item.label}
          aria-label={item.label}
          aria-current={isActive ? 'page' : undefined}
          onClick={() => {
            navigate(item.path);
            if (isMobile) setIsMenuOpen(false);
          }}
          style={{
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            gap: expanded ? 14 : 0,
            width: expanded ? '100%' : 44,
            height: expanded ? 'auto' : 44,
            minHeight: expanded ? 48 : 44,
            padding: expanded ? '12px 14px' : 0,
            marginLeft: expanded ? 0 : 'auto',
            marginRight: expanded ? 0 : 'auto',
            borderRadius: 12,
            backgroundColor: isActive ? palette.navActiveBg : 'transparent',
            color: activeFg,
            flexShrink: 0,
            boxSizing: 'border-box',
            transition: 'background-color 0.2s ease, color 0.2s ease',
          }}
        >
          <Icon size={20} strokeWidth={isActive ? 2.35 : 2} color="currentColor" />
          {expanded && <span style={styles.navLabel}>{item.label}</span>}
        </button>
      );
    },
    [
      location.pathname,
      location.search,
      navigate,
      palette.mode,
      palette.navActiveBg,
      palette.text,
      palette.textMuted,
      isMobile,
      railExpandedLabels,
    ],
  );

  const toggleMobileMenu = () => setIsMenuOpen(!isMenuOpen);

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

  const showIntegrationsMenuLink = useMemo(() => {
    if (isMaster || isZaptroTenantAdminRole(profile?.role)) return true;
    return hasZaptroGranularPermission(profile?.role, profile?.permissions, 'cfg_api');
  }, [isMaster, profile?.role, profile?.permissions]);

  const showProfileAdvancedLinks =
    showSettingsMenuLink || showBillingMenuLink || showBrandingMenuLink || showIntegrationsMenuLink;

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [location.pathname, location.search]);

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

  const handleProfileMenuSignOut = useCallback(() => {
    setIsProfileMenuOpen(false);
    void signOut();
  }, [signOut]);

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
          key={`${location.pathname}:${currentLoadingContext}`}
          context={currentLoadingContext as any}
          onFinished={finishPageLoading}
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
          onMouseEnter={() => {
            if (!isMobile) setRailHover(true);
          }}
          onMouseLeave={() => setRailHover(false)}
          style={{
            position: 'fixed',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            transition: isMobile
              ? 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'width 0.28s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.28s ease',
            ...(isMobile
              ? {
                  top: 0,
                  bottom: 0,
                  left: isMenuOpen ? 0 : '-280px',
                  width: '280px',
                  backgroundColor: palette.sidebarBg,
                  borderRight: `1px solid ${palette.sidebarBorder}`,
                }
              : {
                  top: RAIL_MARGIN,
                  bottom: RAIL_MARGIN,
                  left: RAIL_MARGIN,
                  width: railHover ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH,
                  borderRadius: 22,
                  backgroundColor: palette.sidebarBg,
                  border: `1px solid ${palette.sidebarBorder}`,
                  boxShadow: isDark
                    ? railHover
                      ? '0 16px 48px rgba(0,0,0,0.55)'
                      : '0 12px 40px rgba(0,0,0,0.5)'
                    : railHover
                      ? '0 12px 36px rgba(15, 23, 42, 0.14)'
                      : '0 4px 28px rgba(15, 23, 42, 0.09)',
                  overflow: 'hidden',
                }),
          }}
        >
          <style>{`
            .zaptro-sidebar-nav-btn { transition: transform 0.2s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.2s ease; }
            .zaptro-sidebar-nav-btn:hover { transform: translateY(-3px) scale(1.06); box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12); }
            .zaptro-sidebar-nav-btn:active { transform: translateY(-1px) scale(1.03); }
          `}</style>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              padding: isMobile ? '20px 20px 16px' : railHover ? '12px 12px 14px' : '12px 8px 14px',
              boxSizing: 'border-box',
              transition: isMobile ? undefined : 'padding 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: isMobile || railHover ? 'flex-start' : 'center',
                alignItems: 'center',
                paddingBottom: 4,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                className={!isMobile ? 'zaptro-sidebar-nav-btn' : undefined}
                onClick={() => {
                  navigate(ZAPTRO_ROUTES.DASHBOARD);
                  if (isMobile) setIsMenuOpen(false);
                }}
                aria-label="Início Zaptro"
                title="Início"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 14,
                  backgroundColor: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMobile || railHover ? 'flex-start' : 'center',
                  padding: isMobile ? '10px 16px' : railHover ? '10px 12px' : 0,
                  gap: isMobile || railHover ? 10 : 0,
                  width: isMobile ? '100%' : railHover ? '100%' : 44,
                  height: isMobile ? 'auto' : 44,
                  minHeight: isMobile ? 48 : 44,
                  boxSizing: 'border-box',
                }}
              >
                <LayoutGrid size={22} color="#ffffff" strokeWidth={2} />
                {(isMobile || railHover) && <span style={{ ...styles.logoMain, color: '#ffffff', fontSize: 18 }}>ZAPTRO</span>}
              </button>
            </div>

            {railDivider('rail-1')}

            <div style={{ ...styles.navColumn, padding: 0 }}>
              <div style={{ ...styles.navCenterWrap, alignItems: isMobile || railHover ? 'stretch' : 'center' }}>
                <div
                  style={{
                    ...styles.nav,
                    alignItems: isMobile || railHover ? 'stretch' : 'center',
                    gap: 6,
                    padding: '8px 0',
                  }}
                >
                  {sidebarNavItems.map(renderSidebarNavButton)}
                  {!isMobile && (
                    <button
                      type="button"
                      className="zaptro-sidebar-nav-btn"
                      title={palette.mode === 'light' ? 'Modo escuro' : 'Modo claro'}
                      aria-label={palette.mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
                      onClick={toggleMode}
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        width: railHover ? '100%' : 44,
                        height: 44,
                        minHeight: railHover ? 48 : 44,
                        marginLeft: railHover ? 0 : 'auto',
                        marginRight: railHover ? 0 : 'auto',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: railHover ? 'flex-start' : 'center',
                        gap: railHover ? 14 : 0,
                        padding: railHover ? '12px 14px' : 0,
                        background: 'transparent',
                        color: palette.textMuted,
                        boxSizing: 'border-box',
                      }}
                    >
                      {palette.mode === 'light' ? (
                        <Moon size={20} strokeWidth={2} />
                      ) : (
                        <Sun size={20} color={palette.lime} strokeWidth={2} />
                      )}
                      {railHover && (
                        <span style={{ fontWeight: 850, fontSize: 14, color: palette.text }}>
                          {palette.mode === 'light' ? 'Modo escuro' : 'Modo claro'}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {railDivider('rail-2')}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 2, flexShrink: 0 }}>
              {sidebarSettingsItem ? renderSidebarNavButton(sidebarSettingsItem) : null}
              <button
                type="button"
                className="zaptro-sidebar-nav-btn"
                title="Sair do sistema"
                aria-label="Sair do sistema"
                onClick={() => void signOut()}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMobile || railHover ? 'flex-start' : 'center',
                  gap: isMobile || railHover ? 14 : 0,
                  width: isMobile ? '100%' : railHover ? '100%' : 44,
                  height: isMobile ? 'auto' : 44,
                  minHeight: isMobile ? 48 : railHover ? 48 : 44,
                  padding: isMobile ? '12px 14px' : railHover ? '12px 14px' : 0,
                  marginLeft: isMobile || railHover ? 0 : 'auto',
                  marginRight: isMobile || railHover ? 0 : 'auto',
                  borderRadius: 12,
                  background: 'transparent',
                  color: '#EF4444',
                  boxSizing: 'border-box',
                }}
              >
                <LogOut size={20} strokeWidth={2} />
                {(isMobile || railHover) && <span style={{ fontWeight: 950, fontSize: 15 }}>Sair do Sistema</span>}
              </button>
            </div>

            {!isMobile && railDivider('rail-3')}

            {!isMobile && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: railHover ? 'flex-start' : 'center',
                  paddingTop: 6,
                  flexShrink: 0,
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  className="zaptro-sidebar-nav-btn"
                  title="Minha conta"
                  aria-label="Abrir perfil"
                  onClick={() => navigate(ZAPTRO_ROUTES.PROFILE)}
                  style={{
                    border: 'none',
                    padding: railHover ? '6px 8px 6px 6px' : 0,
                    cursor: 'pointer',
                    width: railHover ? '100%' : 44,
                    height: railHover ? 'auto' : 44,
                    minHeight: 44,
                    borderRadius: railHover ? 14 : 999,
                    overflow: 'hidden',
                    background: palette.profileBg,
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: palette.sidebarBorder,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: railHover ? 'flex-start' : 'center',
                    gap: railHover ? 12 : 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'block',
                    }}
                  >
                    {sessionAvatarSrc ? (
                      <img src={sessionAvatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                          fontSize: 16,
                          fontWeight: 950,
                          color: palette.text,
                          background: palette.profileBg,
                        }}
                      >
                        {profile?.full_name?.[0] ?? 'U'}
                      </span>
                    )}
                  </span>
                  {railHover && (
                    <span style={{ fontWeight: 850, fontSize: 13, color: palette.text, textAlign: 'left', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Minha conta
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      <main
        style={{
          ...styles.main,
          marginLeft: hideSidebar || isMobile ? '0' : `${mainMarginDesktop}px`,
          backgroundColor: palette.pageBg,
        }}
      >
        {!hideTopbar && !isMobile && (
          <header
            style={{
              ...styles.topbarShell,
              backgroundColor: 'transparent',
              borderBottom: 'none',
            }}
          >
            <div style={styles.topbarInner}>
            <div style={{ flex: 1, minWidth: 0 }} aria-hidden />
            <div style={styles.topbarRight}>
              <SidebarTeamPresence
                companyId={profile?.company_id}
                selfId={profile?.id}
                sessionProfile={profile ? { id: profile.id, avatar_url: profile.avatar_url } : null}
                onlineUserIds={onlineUsers}
                ringBg={palette.pageBg}
              />
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
                <div style={{ ...styles.newsDot, borderColor: palette.pageBg }} />
              </button>

              {!isMobile && hideSidebar && (
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
                        backgroundColor: palette.mode === 'dark' ? '#141414' : '#ffffff',
                        border: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                        boxShadow: '0 22px 55px rgba(15, 23, 42, 0.16)',
                        padding: 0,
                        overflow: 'hidden',
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => goProfileMenu(ZAPTRO_ROUTES.PROFILE)}
                        style={{
                          width: '100%',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: 10,
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div
                          style={{
                            ...(isDark
                              ? { ...zaptroCardSurfaceStyle(true), borderRadius: 16 }
                              : {
                                  backgroundColor: ZAPTRO_FIELD_BG,
                                  border: '1px solid rgba(0, 0, 0, 0.12)',
                                  borderRadius: 16,
                                  boxSizing: 'border-box',
                                }),
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: '50%',
                              backgroundColor: '#0f172a',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 15,
                              fontWeight: 950,
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {sessionAvatarSrc ? (
                              <img
                                src={sessionAvatarSrc}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              (() => {
                                const n = profile?.full_name?.trim();
                                if (n) {
                                  const p = n.split(/\s+/).filter(Boolean);
                                  return (p.length >= 2
                                    ? `${p[0][0]}${p[p.length - 1][0]}`
                                    : n.slice(0, 2)
                                  ).toUpperCase();
                                }
                                return (profile?.email?.slice(0, 2) || 'ZT').toUpperCase();
                              })()
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 950,
                                color: palette.text,
                                letterSpacing: '-0.02em',
                              }}
                            >
                              Meu perfil
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: palette.textMuted,
                                marginTop: 3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {profile?.email ?? user?.email ?? '—'}
                            </div>
                          </div>
                        </div>
                      </button>

                      <div style={{ padding: '2px 10px 8px' }}>
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
                            Meu plano
                          </button>
                        )}

                        {showProfileAdvancedLinks && (
                          <>
                            {(showBillingMenuLink &&
                              (showSettingsMenuLink || showIntegrationsMenuLink || showBrandingMenuLink)) ||
                            (!showBillingMenuLink &&
                              showSettingsMenuLink &&
                              (showIntegrationsMenuLink || showBrandingMenuLink)) ? (
                              <div
                                style={{
                                  height: 1,
                                  margin: '6px 4px',
                                  backgroundColor: palette.searchBorder,
                                  border: 'none',
                                }}
                              />
                            ) : null}

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
                            {showIntegrationsMenuLink && (
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
                                onClick={() => goProfileMenu(`${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=api`)}
                              >
                                <LayoutGrid size={18} strokeWidth={2.2} color={palette.text} />
                                Integrações
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

                      <div style={{ height: 1, backgroundColor: palette.searchBorder }} />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleProfileMenuSignOut}
                        style={{
                          ...styles.profileMenuItem,
                          color: '#ef4444',
                          borderRadius: 0,
                          padding: '14px 18px',
                          fontWeight: 950,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <LogOut size={18} strokeWidth={2.2} color="#ef4444" />
                        Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            </div>
          </header>
        )}

        {/*
          Coluna principal: filho directo de `main` com classe explícita `zaptro-main-primary`
          (modelo “conteúdo da página” antes de qualquer outro bloco auxiliar).
          Mantém `zaptro-scroll-area` para estilos de scrollbar existentes.
        */}
        <div
          className="zaptro-main-primary zaptro-scroll-area"
          style={{
            ...styles.content,
            backgroundColor: palette.pageBg,
            color: palette.text,
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? 'rgba(148, 163, 184, 0.45) transparent' : 'rgba(100, 116, 139, 0.4) transparent',
          }}
        >
          {scrollAreaTop}
          <div
            style={{
              ...styles.contentInner,
              ...(contentFullWidth
                ? {
                    maxWidth: 'none',
                    width: '100%',
                    marginLeft: 0,
                    marginRight: 0,
                    paddingLeft: 'clamp(12px, 2vw, 28px)',
                    paddingRight: 'clamp(12px, 2vw, 28px)',
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
          -webkit-box-shadow: 0 0 0 50px ${isDark ? '#000000' : ZAPTRO_FIELD_BG} inset !important;
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
  scrollAreaTop,
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
        scrollAreaTop={scrollAreaTop}
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
    gap: '0px',
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
    fontWeight: 600,
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
  hubFooter: { borderTop: '1px solid #e8e8e8', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
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
    paddingLeft: 'clamp(8px, 1.5vw, 22px)',
    paddingRight: 'clamp(8px, 1.5vw, 22px)',
    boxSizing: 'border-box',
  },
};

export default ZaptroLayout;
