import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  LayoutGrid,
  List,
  MapPinned,
  Radio,
  Search,
  Trash2,
  Truck,
  Workflow,
  X,
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import {
  ZAPTRO_MAP_ROUTE_HANDOFF_KEY,
  type ZaptroMapRouteHandoffPayload,
} from '../constants/zaptroMapRouteHandoff';
import {
  ROUTE_STATUS_LABEL,
  type RouteExecutionStatus,
  zaptroDriverRoutePath,
  zaptroPublicTrackPath,
} from '../constants/zaptroRouteExecution';
import { appendZaptroActivityLog } from '../constants/zaptroActivityLogStore';
import { deleteRouteLiveToken, patchRouteLive, readRouteLive } from '../constants/zaptroRouteLiveStore';
import {
  readActiveRoutes,
  routesStorageKey,
  writeActiveRoutes,
  type ActiveRouteRow,
} from '../constants/zaptroCrmActiveRoutes';
import { getZaptroPlanVerifiedTier } from '../utils/zaptroPlanVerifiedSeal';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import ZaptroKpiMetricCard from '../components/Zaptro/ZaptroKpiMetricCard';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { hasZaptroGranularPermission, isZaptroTenantAdminRole } from '../utils/zaptroPermissions';
import { zaptroProfileInitials } from '../utils/zaptroDriverSelfProfile';

const FleetMap = React.lazy(() => import('../components/FleetMap'));

const LIME = '#D9FF00';

/** Cinzas neutros na página Rotas (evitar fundos tipo slate / #e8eaef). */
const ROUTES_UI_NEUTRAL = {
  /** Rail do toggle Cartões/Lista — um pouco mais escuro que #f4f4f4 */
  railBg: '#ebebeb',
  borderHairline: 'rgba(0,0,0,0.09)',
  shadowCard: 'rgba(0,0,0,0.06)',
  shadowInset: 'rgba(0,0,0,0.05)',
  shadowSegment: 'rgba(0,0,0,0.14)',
  segmentActiveBg: '#0a0a0a',
  modalOverlay: 'rgba(0,0,0,0.48)',
} as const;

const ROUTES_VIEW_STORAGE_PREFIX = 'zaptro_routes_view_v1_';

function readRoutesViewMode(tenantId: string): 'cards' | 'list' {
  try {
    const v = localStorage.getItem(`${ROUTES_VIEW_STORAGE_PREFIX}${tenantId}`);
    if (v === 'list' || v === 'cards') return v;
  } catch {
    /* ignore */
  }
  return 'cards';
}

function writeRoutesViewMode(tenantId: string, mode: 'cards' | 'list') {
  try {
    localStorage.setItem(`${ROUTES_VIEW_STORAGE_PREFIX}${tenantId}`, mode);
  } catch {
    /* ignore */
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function rowMatchesSearch(r: ActiveRouteRow, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  const hay = [r.label, r.clientRef, r.token, r.createdBy, r.internalNote].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(n);
}

function rowMatchesDateRange(r: ActiveRouteRow, fromStr: string, toStr: string): boolean {
  const t = new Date(r.createdAt).getTime();
  if (Number.isNaN(t)) return true;
  if (fromStr) {
    const from = new Date(fromStr).getTime();
    if (!Number.isNaN(from) && t < from) return false;
  }
  if (toStr) {
    const to = new Date(toStr).getTime();
    if (!Number.isNaN(to) && t > to) return false;
  }
  return true;
}

/** Filtro por estado operacional (live) ou rota encerrada na lista. */
type RoutesStatusTab = 'all' | 'encerrada' | 'iniciar' | 'em_rota' | 'cheguei' | 'entrega' | 'problema';

function rowLiveOrListStatus(row: ActiveRouteRow): RouteExecutionStatus | 'encerrada' {
  if (row.status === 'encerrada') return 'encerrada';
  return readRouteLive(row.token)?.status ?? 'assigned';
}

function rowMatchesStatusTab(row: ActiveRouteRow, tab: RoutesStatusTab): boolean {
  if (tab === 'all') return true;
  const lv = rowLiveOrListStatus(row);
  if (tab === 'encerrada') return lv === 'encerrada';
  if (lv === 'encerrada') return false;
  switch (tab) {
    case 'iniciar':
      return lv === 'assigned' || lv === 'draft';
    case 'em_rota':
      return lv === 'started';
    case 'cheguei':
      return lv === 'arrived';
    case 'entrega':
      return lv === 'delivered';
    case 'problema':
      return lv === 'issue';
    default:
      return true;
  }
}

const ROUTES_STATUS_TABS: { id: RoutesStatusTab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'iniciar', label: 'Iniciar rota' },
  { id: 'em_rota', label: 'Em rota' },
  { id: 'cheguei', label: 'Cheguei no local' },
  { id: 'entrega', label: 'Entrega realizada' },
  { id: 'problema', label: 'Problema na entrega' },
  { id: 'encerrada', label: 'Encerrada' },
];

type RouteCardVisual = {
  title: string;
  accent: string;
  iconBg: string;
  iconFg: string;
  companyPhotoUrl: string | null;
  driverPhotoUrl: string | null;
  companyInitials: string;
  driverInitials: string;
  /** Nome da transportadora (`publicCompanyName` no live) — tooltip no avatar. */
  companyDisplayName: string;
};

/** Cor + ícone + título conforme estado operacional (live) ou rota encerrada na lista. */
function getRouteCardVisual(row: ActiveRouteRow): RouteCardVisual {
  const live = readRouteLive(row.token);
  const companyPhotoUrl = live?.publicHeaderLogoUrl?.trim() || null;
  const driverPhotoUrl = live?.driverAvatarUrl?.trim() || null;
  let companyInitials = zaptroProfileInitials(live?.publicCompanyName || '');
  if (companyInitials === '·') companyInitials = 'Em';
  let driverInitials = zaptroProfileInitials(live?.driverDisplayName || '');
  if (driverInitials === '·') driverInitials = 'Mt';
  const companyDisplayName = (live?.publicCompanyName ?? '').trim();
  const photos = { companyPhotoUrl, driverPhotoUrl, companyInitials, driverInitials, companyDisplayName };

  if (row.status === 'encerrada') {
    return {
      title: 'Encerrada',
      accent: '#737373',
      iconBg: 'rgba(115,115,115,0.2)',
      iconFg: '#404040',
      ...photos,
    };
  }
  const st: RouteExecutionStatus = live?.status ?? 'assigned';
  switch (st) {
    case 'delivered':
      return {
        title: 'Entrega realizada',
        accent: '#16a34a',
        iconBg: 'rgba(34,197,94,0.2)',
        iconFg: '#15803d',
        ...photos,
      };
    case 'arrived':
      return {
        title: 'Cheguei no local',
        accent: '#ea580c',
        iconBg: 'rgba(249,115,22,0.22)',
        iconFg: '#c2410c',
        ...photos,
      };
    case 'started':
      return {
        title: 'Em rota',
        accent: '#ca8a04',
        iconBg: 'rgba(234,179,8,0.28)',
        iconFg: '#854d0e',
        ...photos,
      };
    case 'issue':
      return {
        title: ROUTE_STATUS_LABEL.issue,
        accent: '#dc2626',
        iconBg: 'rgba(239,68,68,0.2)',
        iconFg: '#b91c1c',
        ...photos,
      };
    case 'draft':
    case 'assigned':
    default:
      return {
        title: 'Iniciar rota',
        accent: '#525252',
        iconBg: 'rgba(64,64,64,0.14)',
        iconFg: '#262626',
        ...photos,
      };
  }
}

/** Duas fotos (empresa + motorista) com indicador de estado no canto. */
const RouteCardDualAvatars: React.FC<{
  visual: RouteCardVisual;
  border: string;
  mode: 'dark' | 'light';
}> = ({ visual, border, mode }) => {
  const [coFail, setCoFail] = React.useState(false);
  const [drFail, setDrFail] = React.useState(false);
  React.useEffect(() => {
    setCoFail(false);
    setDrFail(false);
  }, [visual.companyPhotoUrl, visual.driverPhotoUrl]);
  const edge = mode === 'dark' ? 'rgba(255,255,255,0.12)' : border;
  const dotRing = mode === 'dark' ? 'rgba(0,0,0,0.92)' : '#ffffff';
  const companyHoverTitle = visual.companyDisplayName
    ? `Empresa: ${visual.companyDisplayName}`
    : 'Empresa: nome ainda não definido (aparece quando a rota grava o nome público)';
  const placeholder = (bg: string, initials: string, fg: string) => (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: bg,
        border: `1px solid ${edge}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 950,
        color: fg,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {initials}
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <div title={companyHoverTitle} style={{ flexShrink: 0, lineHeight: 0, borderRadius: 10 }}>
        {visual.companyPhotoUrl && !coFail ? (
          <img
            src={visual.companyPhotoUrl}
            alt=""
            width={36}
            height={36}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              objectFit: 'cover',
              border: `1px solid ${edge}`,
              flexShrink: 0,
              display: 'block',
              boxSizing: 'border-box',
            }}
            onError={() => setCoFail(true)}
          />
        ) : (
          placeholder(visual.iconBg, visual.companyInitials, visual.iconFg)
        )}
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: '36px',
          gridTemplateRows: '36px',
          overflow: 'visible',
        }}
      >
        <div style={{ gridRow: 1, gridColumn: 1, position: 'relative', width: 36, height: 36, overflow: 'visible' }}>
          {visual.driverPhotoUrl && !drFail ? (
            <img
              src={visual.driverPhotoUrl}
              alt=""
              width={36}
              height={36}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                objectFit: 'cover',
                border: `1px solid ${edge}`,
                display: 'block',
                boxSizing: 'border-box',
              }}
              onError={() => setDrFail(true)}
            />
          ) : (
            placeholder('rgba(115,115,115,0.2)', visual.driverInitials, '#525252')
          )}
          <div
            title={visual.title}
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              width: 11,
              height: 11,
              borderRadius: 999,
              backgroundColor: visual.accent,
              border: `2px solid ${dotRing}`,
              boxSizing: 'border-box',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};

/** Conteúdo da página: tem de viver **dentro** de `ZaptroLayout` para `useZaptroTheme()` funcionar. */
const ZaptroRoutesInner: React.FC = () => {
  const { profile, isMaster, user } = useAuth();
  const canOpenCrm =
    isMaster || isZaptroTenantAdminRole(profile?.role) || hasZaptroGranularPermission(profile?.role, profile?.permissions, 'crm');
  const canOpenAutomation =
    isMaster ||
    isZaptroTenantAdminRole(profile?.role) ||
    hasZaptroGranularPermission(profile?.role, profile?.permissions, 'cfg');
  const { company } = useTenant();
  const { palette } = useZaptroTheme();
  const navigate = useNavigate();
  const crmStorageId = profile?.company_id || 'local-demo';
  const border = palette.sidebarBorder;
  const cardBg = palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff';
  const muted = palette.textMuted;
  const text = palette.text;

  const [rows, setRows] = useState<ActiveRouteRow[]>([]);
  const [, bumpLive] = useState(0);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [clientRefDraft, setClientRefDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusTab, setStatusTab] = useState<RoutesStatusTab>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [detailRouteId, setDetailRouteId] = useState<string | null>(null);
  /** Painel com mapa (mesmo estilo de ação que «Automação») — vista geral até GPS por rota. */
  const [showActiveRoutesMap, setShowActiveRoutesMap] = useState(false);

  const persistViewMode = useCallback(
    (mode: 'cards' | 'list') => {
      setViewMode(mode);
      writeRoutesViewMode(crmStorageId, mode);
    },
    [crmStorageId],
  );

  useEffect(() => {
    setViewMode(readRoutesViewMode(crmStorageId));
  }, [crmStorageId]);

  useEffect(() => {
    const k = `${ROUTES_VIEW_STORAGE_PREFIX}${crmStorageId}`;
    const onStorage = (e: StorageEvent) => {
      if (e.key === k && (e.newValue === 'list' || e.newValue === 'cards')) {
        setViewMode(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [crmStorageId]);

  const reload = useCallback(() => {
    setRows(readActiveRoutes(crmStorageId));
  }, [crmStorageId]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Rota preparada na página Mapa (OSRM) — aviso único ao entrar em Rotas. */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ZAPTRO_MAP_ROUTE_HANDOFF_KEY);
      if (!raw) return;
      sessionStorage.removeItem(ZAPTRO_MAP_ROUTE_HANDOFF_KEY);
      const d = JSON.parse(raw) as Partial<ZaptroMapRouteHandoffPayload>;
      const km = typeof d.distanceKm === 'number' ? d.distanceKm.toFixed(1) : '—';
      const name = d.driverName?.trim() || 'motorista';
      notifyZaptro(
        'info',
        'Plano vindo do Mapa',
        `Rota associada a ${name} (~${km} km, ~${typeof d.durationMin === 'number' ? `${d.durationMin} min` : '—'}). Cria ou acompanha a rota operacional na lista abaixo.`,
      );
    } catch {
      try {
        sessionStorage.removeItem(ZAPTRO_MAP_ROUTE_HANDOFF_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const key = routesStorageKey(crmStorageId);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [crmStorageId, reload]);

  useEffect(() => {
    const onLive = () => bumpLive((n) => n + 1);
    window.addEventListener('zaptro-route-live', onLive);
    return () => window.removeEventListener('zaptro-route-live', onLive);
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const ativas = rows.filter((r) => r.status === 'ativa').length;
    const encerradas = rows.filter((r) => r.status === 'encerrada').length;
    const comLive = rows.filter((r) => readRouteLive(r.token) != null).length;
    return { total, ativas, encerradas, comLive };
  }, [rows, bumpLive]);

  const dateSearchFiltered = useMemo(
    () => rows.filter((r) => rowMatchesSearch(r, routeSearch) && rowMatchesDateRange(r, dateFrom, dateTo)),
    [rows, routeSearch, dateFrom, dateTo, bumpLive],
  );

  const tabCounts = useMemo(() => {
    const c: Record<RoutesStatusTab, number> = {
      all: dateSearchFiltered.length,
      encerrada: 0,
      iniciar: 0,
      em_rota: 0,
      cheguei: 0,
      entrega: 0,
      problema: 0,
    };
    for (const r of dateSearchFiltered) {
      if (rowMatchesStatusTab(r, 'encerrada')) c.encerrada += 1;
      if (rowMatchesStatusTab(r, 'iniciar')) c.iniciar += 1;
      if (rowMatchesStatusTab(r, 'em_rota')) c.em_rota += 1;
      if (rowMatchesStatusTab(r, 'cheguei')) c.cheguei += 1;
      if (rowMatchesStatusTab(r, 'entrega')) c.entrega += 1;
      if (rowMatchesStatusTab(r, 'problema')) c.problema += 1;
    }
    return c;
  }, [dateSearchFiltered, bumpLive]);

  const filteredRows = useMemo(
    () => dateSearchFiltered.filter((r) => rowMatchesStatusTab(r, statusTab)),
    [dateSearchFiltered, statusTab, bumpLive],
  );

  const hasActiveFilters = Boolean(routeSearch.trim() || dateFrom || dateTo || statusTab !== 'all');

  const routesHeaderGhostBtn = useMemo(
    (): React.CSSProperties => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '13px 20px',
      borderRadius: 16,
      border: `1px solid ${border}`,
      backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff',
      color: text,
      fontWeight: 900,
      fontSize: 14,
      cursor: 'pointer',
      fontFamily: 'inherit',
    }),
    [border, palette.mode, text],
  );

  const inputShell: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: 14,
    border: `1px solid ${border}`,
    fontSize: 13,
    fontWeight: 600,
    color: text,
    backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f4',
    fontFamily: 'inherit',
    outline: 'none',
  };

  const commitNewRoute = useCallback(
    (clientRef: string, internalNote: string) => {
      const token = `rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const datePart = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const ref = clientRef.trim();
      const note = internalNote.trim();
      const row: ActiveRouteRow = {
        id: `route-${Date.now()}`,
        token,
        label: ref ? `${ref} · ${datePart}` : `Rota · ${datePart}`,
        createdAt: new Date().toISOString(),
        status: 'ativa',
        createdBy: profile?.full_name || undefined,
        ...(ref ? { clientRef: ref } : {}),
        ...(note ? { internalNote: note } : {}),
      };
      setRows((prev) => {
        const next = [row, ...prev];
        writeActiveRoutes(crmStorageId, next);
        return next;
      });
      const displayName = company?.name?.trim();
      const tier = getZaptroPlanVerifiedTier(company ?? undefined);
      const premium = tier === 'premium';
      const notify = (profile?.email || user?.email || '').trim().toLowerCase();
      const opsNotifyEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notify) ? notify : null;
      patchRouteLive(token, {
        ...(displayName ? { publicCompanyName: displayName } : {}),
        publicTrackPremiumBranding: premium,
        publicHeaderLogoUrl: company?.logo_url?.trim() || null,
        ...(opsNotifyEmail ? { opsNotifyEmail } : {}),
      });
      setStartModalOpen(false);
      setClientRefDraft('');
      setNoteDraft('');
      notifyZaptro(
        'success',
        'Rota criada',
        'Abre «Motorista» para a operação. «Copiar público» é só para o cliente acompanhar — não confundas os dois links.',
      );
      appendZaptroActivityLog(crmStorageId, {
        type: 'rota',
        actorName: profile?.full_name || 'Equipa',
        clientLabel: ref || 'Rota sem referência',
        action: 'Nova rota criada',
        details: `Token ${token}${note ? ` · Nota interna: ${note}` : ''}`,
      });
    },
    [company, crmStorageId, profile?.email, profile?.full_name, user?.email],
  );

  const closeRoute = useCallback(
    (id: string) => {
      let closed: ActiveRouteRow | undefined;
      setRows((prev) => {
        closed = prev.find((x) => x.id === id);
        const next = prev.map((x) => (x.id === id ? { ...x, status: 'encerrada' as const } : x));
        writeActiveRoutes(crmStorageId, next);
        return next;
      });
      notifyZaptro('info', 'Rota', 'Marcada como encerrada nesta lista local.');
      if (closed) {
        appendZaptroActivityLog(crmStorageId, {
          type: 'rota',
          actorName: profile?.full_name || 'Equipa',
          clientLabel: closed.clientRef || closed.label,
          action: 'Rota encerrada na lista',
          details: `Token ${closed.token}`,
        });
      }
    },
    [crmStorageId, profile?.full_name],
  );

  const detailRow = useMemo(
    () => (detailRouteId ? rows.find((r) => r.id === detailRouteId) ?? null : null),
    [rows, detailRouteId],
  );

  const removeRoutePermanently = useCallback(
    (row: ActiveRouteRow) => {
      const ok = window.confirm(
        `Eliminar permanentemente esta rota?\n\n${row.token}\n\nA entrada sai da lista e o estado local deste token é apagado (links motorista / público neste browser deixam de ter dados guardados).`,
      );
      if (!ok) return;
      setRows((prev) => {
        const next = prev.filter((x) => x.id !== row.id);
        writeActiveRoutes(crmStorageId, next);
        return next;
      });
      deleteRouteLiveToken(row.token);
      setDetailRouteId(null);
      bumpLive((n) => n + 1);
      notifyZaptro('success', 'Rota eliminada', 'A rota foi removida da lista e o token limpo localmente.');
      appendZaptroActivityLog(crmStorageId, {
        type: 'rota',
        actorName: profile?.full_name || 'Equipa',
        clientLabel: row.clientRef || row.label,
        action: 'Rota eliminada da lista',
        details: `Token ${row.token} removido e estado local apagado.`,
      });
    },
    [crmStorageId, profile?.full_name],
  );

  useEffect(() => {
    if (!detailRow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailRouteId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailRow]);

  const kpiCard = (label: string, value: string | number, hint: string, Icon: LucideIcon, accent?: boolean) => (
    <ZaptroKpiMetricCard
      key={label}
      icon={Icon}
      title={label}
      value={value}
      subtitle={hint}
      accentBorder={!!accent}
      titleCaps
      valueSize="hero"
      style={{ boxShadow: palette.mode === 'dark' ? 'none' : `0 4px 24px ${ROUTES_UI_NEUTRAL.shadowCard}` }}
    />
  );

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1320,
        margin: '0 auto',
        padding: '0 0 48px',
        boxSizing: 'border-box',
        backgroundColor: palette.pageBg,
        minHeight: '100%',
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 950, letterSpacing: '0.12em', color: muted }}>OPERAÇÃO</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div
            style={{
              flex: '1 1 260px',
              minWidth: 0,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {canOpenCrm ? (
              <button
                type="button"
                onClick={() => navigate(ZAPTRO_ROUTES.COMMERCIAL_CRM)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '13px 20px',
                  borderRadius: 16,
                  border: `1px solid ${border}`,
                  backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : ROUTES_UI_NEUTRAL.railBg,
                  color: text,
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                <ArrowLeft size={18} strokeWidth={2.2} /> CRM
              </button>
            ) : null}
            <h1
              style={{
                margin: 0,
                fontSize: 38,
                fontWeight: 950,
                letterSpacing: '-1.2px',
                color: text,
                flex: '1 1 160px',
                minWidth: 0,
              }}
            >
              Rotas
            </h1>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {canOpenAutomation ? (
              <button
                type="button"
                onClick={() => navigate(`${ZAPTRO_ROUTES.SETTINGS_ALIAS}?tab=automation`)}
                style={routesHeaderGhostBtn}
              >
                <Workflow size={18} strokeWidth={2.2} /> Automação
              </button>
            ) : null}
            <button
              type="button"
              aria-pressed={showActiveRoutesMap}
              onClick={() => setShowActiveRoutesMap((v) => !v)}
              style={{
                ...routesHeaderGhostBtn,
                ...(showActiveRoutesMap
                  ? {
                      border: `1px solid ${LIME}`,
                      backgroundColor: palette.mode === 'dark' ? 'rgba(217,255,0,0.12)' : 'rgba(217,255,0,0.22)',
                    }
                  : {}),
              }}
            >
              <MapPinned size={18} strokeWidth={2.2} /> Mapa rotas ativas
            </button>
            <button
              type="button"
              onClick={() => {
                setClientRefDraft('');
                setNoteDraft('');
                setStartModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 20px',
                borderRadius: 16,
                border: `1px solid ${border}`,
                backgroundColor: palette.mode === 'dark' ? 'rgba(217,255,0,0.12)' : 'rgba(217,255,0,0.35)',
                color: text,
                fontWeight: 900,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Truck size={18} strokeWidth={2.2} /> Iniciar rota
            </button>
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 22,
          width: '100%',
        }}
      >
        {kpiCard('TOTAL', stats.total, 'Rotas registadas nesta empresa.', LayoutGrid, true)}
        {kpiCard('ATIVAS', stats.ativas, 'Em curso — partilha o link do motorista.', Truck)}
        {kpiCard('ENCERRADAS', stats.encerradas, 'Histórico na lista abaixo.', CheckCircle2)}
        {kpiCard('COM ESTADO LIVE', stats.comLive, 'Token com dados em tempo real (demo local).', Radio)}
      </div>

      {showActiveRoutesMap ? (
        <section
          style={{
            borderRadius: 22,
            marginBottom: 22,
            overflow: 'hidden',
            border: `1px solid ${border}`,
            backgroundColor: cardBg,
            boxShadow: palette.mode === 'dark' ? 'none' : ZAPTRO_SHADOW.xs,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 18px',
              borderBottom: `1px solid ${border}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 950, color: text }}>Mapa operacional</p>
              <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: muted, lineHeight: 1.45 }}>
                <strong style={{ color: text }}>{stats.ativas}</strong> rotas ativas na lista · vista de exemplo (frota). Com GPS no token, os marcadores passam a refletir a operação real.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowActiveRoutesMap(false)}
              style={{
                ...routesHeaderGhostBtn,
                padding: '10px 16px',
                fontSize: 13,
              }}
            >
              Fechar mapa
            </button>
          </div>
          <div style={{ height: 'min(52vh, 520px)', minHeight: 360, width: '100%', position: 'relative' }}>
            <Suspense
              fallback={
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: muted,
                  }}
                >
                  A carregar mapa…
                </div>
              }
            >
              <FleetMap />
            </Suspense>
          </div>
        </section>
      ) : null}

      <section
        style={{
          borderRadius: 22,
          padding: 22,
          backgroundColor: cardBg,
          border: `1px solid ${border}`,
          boxShadow: palette.mode === 'dark' ? 'none' : ZAPTRO_SHADOW.xs,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 950, color: text }}>Todas as rotas</h2>
          {rows.length > 0 ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: muted }}>
              <strong style={{ color: text }}>{filteredRows.length}</strong> rotas visíveis
              {dateSearchFiltered.length !== rows.length || statusTab !== 'all' ? (
                <span style={{ fontWeight: 600 }}>
                  {' '}
                  · texto/datas: {dateSearchFiltered.length}
                  {statusTab !== 'all' ? <> · separador «{ROUTES_STATUS_TABS.find((t) => t.id === statusTab)?.label}»</> : null} · total {rows.length}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>

        {rows.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              marginBottom: 18,
              padding: '14px 16px',
              borderRadius: 18,
              border: `1px solid ${border}`,
              backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafafa',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div
                role="tablist"
                aria-label="Filtrar por estado da rota"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  flex: '1 1 280px',
                  minWidth: 0,
                }}
              >
                {ROUTES_STATUS_TABS.map((tab) => {
                  const active = statusTab === tab.id;
                  const count = tabCounts[tab.id];
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setStatusTab(tab.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 12,
                        border: active ? `2px solid ${LIME}` : `1px solid ${border}`,
                        backgroundColor: active
                          ? palette.mode === 'dark'
                            ? 'rgba(217,255,0,0.14)'
                            : 'rgba(217,255,0,0.35)'
                          : palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.04)'
                            : '#fff',
                        color: text,
                        fontWeight: 900,
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.label}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: muted,
                          opacity: 0.95,
                          minWidth: 18,
                          textAlign: 'center',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                role="group"
                aria-label="Vista das rotas"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 4,
                  gap: 4,
                  borderRadius: 14,
                  border: `1px solid ${border}`,
                  backgroundColor: palette.mode === 'dark' ? 'rgba(0,0,0,0.5)' : ROUTES_UI_NEUTRAL.railBg,
                  boxShadow:
                    palette.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : `inset 0 1px 2px ${ROUTES_UI_NEUTRAL.shadowInset}`,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  aria-pressed={viewMode === 'cards'}
                  onClick={() => persistViewMode('cards')}
                  title="Vista em cartões"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor:
                      viewMode === 'cards'
                        ? palette.mode === 'dark'
                          ? LIME
                          : ROUTES_UI_NEUTRAL.segmentActiveBg
                        : 'transparent',
                    color:
                      viewMode === 'cards' ? (palette.mode === 'dark' ? '#0a0a0a' : LIME) : muted,
                    fontWeight: viewMode === 'cards' ? 950 : 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    boxShadow:
                      viewMode === 'cards'
                        ? palette.mode === 'dark'
                          ? '0 2px 10px rgba(217,255,0,0.35)'
                          : `0 2px 8px ${ROUTES_UI_NEUTRAL.shadowSegment}`
                        : 'none',
                    transition: 'background-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease',
                  }}
                >
                  <LayoutGrid size={16} strokeWidth={2.3} /> Cartões
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'list'}
                  onClick={() => persistViewMode('list')}
                  title="Vista em lista"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor:
                      viewMode === 'list'
                        ? palette.mode === 'dark'
                          ? LIME
                          : ROUTES_UI_NEUTRAL.segmentActiveBg
                        : 'transparent',
                    color: viewMode === 'list' ? (palette.mode === 'dark' ? '#0a0a0a' : LIME) : muted,
                    fontWeight: viewMode === 'list' ? 950 : 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    boxShadow:
                      viewMode === 'list'
                        ? palette.mode === 'dark'
                          ? '0 2px 10px rgba(217,255,0,0.35)'
                          : `0 2px 8px ${ROUTES_UI_NEUTRAL.shadowSegment}`
                        : 'none',
                    transition: 'background-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease',
                  }}
                >
                  <List size={16} strokeWidth={2.3} /> Lista
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ flex: '2 1 220px', minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', color: muted, marginBottom: 6 }}>PESQUISAR</label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  color={muted}
                  strokeWidth={2.2}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
                <input
                  type="search"
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  placeholder="Nome, cliente, token…"
                  style={{ ...inputShell, paddingLeft: 38 }}
                />
              </div>
            </div>
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', color: muted, marginBottom: 6 }}>DESDE</label>
              <input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputShell} />
            </div>
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', color: muted, marginBottom: 6 }}>ATÉ</label>
              <input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputShell} />
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setRouteSearch('');
                  setDateFrom('');
                  setDateTo('');
                  setStatusTab('all');
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 14,
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  fontWeight: 900,
                  fontSize: 12,
                  cursor: 'pointer',
                  color: muted,
                  fontFamily: 'inherit',
                  flexShrink: 0,
                  alignSelf: 'flex-end',
                }}
              >
                Limpar filtros
              </button>
            ) : null}
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: muted }}>
            Ainda não há rotas. Clica em «Iniciar rota» acima para criar a primeira (o botão homónimo no CRM apenas abre esta página).
          </p>
        ) : filteredRows.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: muted }}>
            {dateSearchFiltered.length === 0
              ? 'Nenhuma rota corresponde à pesquisa ou ao intervalo de datas.'
              : 'Nenhuma rota neste separador — escolhe outro estado ou «Todos».'}
          </p>
        ) : (
          <>
            <style>{`
              .zaptro-routes-card-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 14px;
                width: 100%;
              }
              @media (max-width: 1180px) {
                .zaptro-routes-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              }
              @media (max-width: 520px) {
                .zaptro-routes-card-grid { grid-template-columns: minmax(0, 1fr); }
              }
            `}</style>
            {viewMode === 'cards' ? (
            <div className="zaptro-routes-card-grid">
              {filteredRows.map((r) => {
                const driverUrl = `${window.location.origin}${zaptroDriverRoutePath(r.token)}`;
                const publicUrl = `${window.location.origin}${zaptroPublicTrackPath(r.token)}`;
                const visual = getRouteCardVisual(r);
                const btnRow: React.CSSProperties = {
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '7px 6px',
                  borderRadius: 10,
                  fontWeight: 900,
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  flex: 1,
                  minWidth: 0,
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                };
                return (
                  <div
                    key={r.id}
                    style={{
                      minWidth: 0,
                      borderRadius: 16,
                      border: `1px solid ${border}`,
                      overflow: 'hidden',
                      backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ height: 5, width: '100%', backgroundColor: visual.accent, flexShrink: 0 }} />
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0,
                      }}
                    >
                    <div
                      role="button"
                      tabIndex={0}
                      title="Ver detalhes da rota"
                      onClick={() => setDetailRouteId(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailRouteId(r.id);
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <RouteCardDualAvatars visual={visual} border={border} mode={palette.mode} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', color: muted }}>ESTADO</div>
                          <div style={{ fontSize: 13, fontWeight: 950, color: text, lineHeight: 1.25 }}>{visual.title}</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 8, minWidth: 0 }}>
                        {r.clientRef ? (
                          <strong style={{ fontSize: 13, fontWeight: 950, color: text, lineHeight: 1.3, display: 'block', wordBreak: 'break-word' }}>
                            {r.clientRef}
                          </strong>
                        ) : (
                          <strong style={{ fontSize: 13, fontWeight: 950, color: text, lineHeight: 1.3, wordBreak: 'break-word' }}>{r.label}</strong>
                        )}
                      </div>
                      <div
                        title={`${r.token}\n${r.createdBy || ''}\n${formatDateTime(r.createdAt)}`}
                        style={{
                          marginBottom: r.internalNote ? 6 : 10,
                          fontSize: 11,
                          color: muted,
                          fontWeight: 600,
                          lineHeight: 1.35,
                          minWidth: 0,
                        }}
                      >
                        <code
                          style={{
                            display: 'block',
                            color: text,
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: 10,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.token}
                        </code>
                        <span style={{ display: 'block', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[r.createdBy, formatDateTime(r.createdAt)].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      {r.internalNote ? (
                        <p
                          style={{
                            margin: '0 0 10px',
                            fontSize: 10,
                            fontWeight: 600,
                            color: muted,
                            lineHeight: 1.35,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={r.internalNote}
                        >
                          {r.internalNote}
                        </p>
                      ) : null}
                    </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          flexWrap: 'nowrap',
                          alignItems: 'stretch',
                          gap: 6,
                          flexShrink: 0,
                          padding: '8px 14px 12px',
                          borderTop: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : ROUTES_UI_NEUTRAL.borderHairline}`,
                        }}
                      >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          window.open(driverUrl, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                          ...btnRow,
                          border: `1px solid ${border}`,
                          background: '#000',
                          color: LIME,
                        }}
                      >
                        <ExternalLink size={12} strokeWidth={2.2} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Motorista</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          void navigator.clipboard?.writeText(publicUrl).catch(() => {});
                          notifyZaptro('success', 'Copiado', 'Link público na área de transferência.');
                        }}
                        style={{
                          ...btnRow,
                          border: `1px solid ${border}`,
                          background: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f4',
                          color: text,
                        }}
                      >
                        <Copy size={12} strokeWidth={2.2} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Público</span>
                      </button>
                      {r.status === 'ativa' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            closeRoute(r.id);
                          }}
                          style={{
                            ...btnRow,
                            border: `1px solid ${border}`,
                            background: 'transparent',
                            color: muted,
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Encerrar</span>
                        </button>
                      ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
            <div style={{ width: '100%', overflowX: 'auto', borderRadius: 16, border: `1px solid ${border}` }}>
              <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff' }}>
                <thead>
                  <tr style={{ backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f4f4f4', borderBottom: `1px solid ${border}` }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', color: muted }}>ESTADO</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', color: muted }}>CLIENTE / REF.</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', color: muted }}>TOKEN</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', color: muted }}>CRIADO</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', color: muted }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => {
                    const driverUrl = `${window.location.origin}${zaptroDriverRoutePath(r.token)}`;
                    const publicUrl = `${window.location.origin}${zaptroPublicTrackPath(r.token)}`;
                    const visual = getRouteCardVisual(r);
                    const btnList: React.CSSProperties = {
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '6px 8px',
                      borderRadius: 8,
                      fontWeight: 900,
                      fontSize: 10,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      border: `1px solid ${border}`,
                      whiteSpace: 'nowrap',
                    };
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setDetailRouteId(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDetailRouteId(r.id);
                          }
                        }}
                        tabIndex={0}
                        style={{
                          borderBottom: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#e8e8e8'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, backgroundColor: visual.accent, flexShrink: 0 }} />
                            <RouteCardDualAvatars visual={visual} border={border} mode={palette.mode} />
                            <span style={{ fontSize: 13, fontWeight: 950, color: text }}>{visual.title}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: text, maxWidth: 220 }}>
                          <div style={{ wordBreak: 'break-word' }}>{r.clientRef || r.label}</div>
                          {r.internalNote ? (
                            <div style={{ fontSize: 10, fontWeight: 600, color: muted, marginTop: 4 }} title={r.internalNote}>
                              {r.internalNote}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: text }}>
                          {r.token}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: muted, whiteSpace: 'nowrap' }}>
                          {formatDateTime(r.createdAt)}
                          {r.createdBy ? <div style={{ fontSize: 10, marginTop: 4 }}>{r.createdBy}</div> : null}
                        </td>
                        <td
                          style={{ padding: '10px 14px', textAlign: 'right', verticalAlign: 'middle' }}
                          role="presentation"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(driverUrl, '_blank', 'noopener,noreferrer');
                              }}
                              style={{ ...btnList, background: '#000', color: LIME, border: `1px solid ${border}` }}
                            >
                              <ExternalLink size={12} /> Motorista
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void navigator.clipboard?.writeText(publicUrl).catch(() => {});
                                notifyZaptro('success', 'Copiado', 'Link público na área de transferência.');
                              }}
                              style={{
                                ...btnList,
                                background: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f4',
                                color: text,
                              }}
                            >
                              <Copy size={12} /> Público
                            </button>
                            {r.status === 'ativa' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeRoute(r.id);
                                }}
                                style={{ ...btnList, background: 'transparent', color: muted }}
                              >
                                Encerrar
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </section>

      {startModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 6000,
            backgroundColor: ROUTES_UI_NEUTRAL.modalOverlay,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setStartModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setStartModalOpen(false);
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="zaptro-routes-start-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              borderRadius: 24,
              padding: 26,
              backgroundColor: cardBg,
              border: `1px solid ${border}`,
              color: text,
              boxShadow: palette.mode === 'dark' ? 'none' : ZAPTRO_SHADOW.sm,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <h2 id="zaptro-routes-start-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                Nova rota
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setStartModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
              >
                <X size={22} color={muted} />
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: muted, lineHeight: 1.5 }}>
              O <strong>token</strong> identifica a rota no sistema. O <strong>cliente</strong> (opcional) ajuda-te a saber de quem é a entrega na lista. Depois
              usas <strong>Motorista</strong> (frota) ou <strong>Copiar público</strong> (cliente final).
            </p>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', color: muted, marginBottom: 8 }}>CLIENTE OU REFERÊNCIA (OPCIONAL)</label>
            <input
              value={clientRefDraft}
              onChange={(e) => setClientRefDraft(e.target.value)}
              placeholder="Ex.: Maria Silva · Pedido #4421"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: 14,
                border: `1px solid ${border}`,
                fontSize: 14,
                fontWeight: 600,
                color: text,
                backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f4',
                marginBottom: 16,
                fontFamily: 'inherit',
              }}
            />
            <label style={{ display: 'block', fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', color: muted, marginBottom: 8 }}>NOTA INTERNA (OPCIONAL)</label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Só a tua equipa vê isto."
              rows={3}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: 14,
                border: `1px solid ${border}`,
                fontSize: 13,
                fontWeight: 600,
                color: text,
                backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f4',
                marginBottom: 20,
                resize: 'vertical' as const,
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setStartModalOpen(false)}
                style={{
                  padding: '12px 18px',
                  borderRadius: 14,
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: muted,
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => commitNewRoute(clientRefDraft, noteDraft)}
                style={{
                  padding: '12px 18px',
                  borderRadius: 14,
                  border: 'none',
                  background: '#000000',
                  color: LIME,
                  fontWeight: 950,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Criar rota
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailRow ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 6100,
            backgroundColor: ROUTES_UI_NEUTRAL.modalOverlay,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setDetailRouteId(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="zaptro-routes-detail-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              borderRadius: 24,
              padding: 26,
              backgroundColor: cardBg,
              border: `1px solid ${border}`,
              color: text,
              boxShadow: palette.mode === 'dark' ? 'none' : ZAPTRO_SHADOW.sm,
              maxHeight: 'min(92dvh, 720px)',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            {(() => {
              const d = detailRow;
              const live = readRouteLive(d.token);
              const dv = getRouteCardVisual(d);
              const driverUrl = `${window.location.origin}${zaptroDriverRoutePath(d.token)}`;
              const publicUrl = `${window.location.origin}${zaptroPublicTrackPath(d.token)}`;
              const execStatus =
                live?.status != null ? ROUTE_STATUS_LABEL[live.status] : 'Sem registo local ainda (ninguém abriu o link do motorista).';
              const listStatus = d.status === 'ativa' ? 'Activa na lista' : 'Encerrada na lista';
              const detailLine = (label: string, value: string) => (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', color: muted, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: text, lineHeight: 1.4, wordBreak: 'break-word' }}>{value}</div>
                </div>
              );
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <h2 id="zaptro-routes-detail-title" style={{ margin: 0, fontSize: 20, fontWeight: 950, lineHeight: 1.2 }}>
                      {d.clientRef || d.label}
                    </h2>
                    <button
                      type="button"
                      aria-label="Fechar"
                      onClick={() => setDetailRouteId(null)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                    >
                      <X size={22} color={muted} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 18,
                      padding: 12,
                      borderRadius: 16,
                      border: `1px solid ${border}`,
                      backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f4f4f4',
                    }}
                  >
                    <RouteCardDualAvatars visual={dv} border={border} mode={palette.mode} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', color: muted }}>ESTADO NA ROTA</div>
                      <div style={{ fontSize: 15, fontWeight: 950, color: text }}>{dv.title}</div>
                    </div>
                  </div>

                  {detailLine('Estado na operação (lista)', listStatus)}
                  {detailLine('Estado de execução (motorista / local)', execStatus)}
                  {detailLine('Token', d.token)}
                  {detailLine('Título na lista', d.label)}
                  {d.clientRef ? detailLine('Cliente / referência', d.clientRef) : null}
                  {detailLine('Criada em', formatDateTime(d.createdAt))}
                  {d.createdBy ? detailLine('Criada por', d.createdBy) : null}
                  {d.internalNote ? detailLine('Nota interna', d.internalNote) : null}

                  {live ? (
                    <div
                      style={{
                        marginTop: 8,
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: 16,
                        border: `1px solid ${border}`,
                        backgroundColor: palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', color: muted, marginBottom: 10 }}>
                        DADOS NO BROWSER (LINK MOTORISTA)
                      </div>
                      {live.driverDisplayName ? detailLine('Motorista', live.driverDisplayName) : null}
                      {live.driverPhone ? detailLine('Telemóvel motorista', live.driverPhone) : null}
                      {live.driverVehicle ? detailLine('Veículo', live.driverVehicle) : null}
                      {live.lastLat != null && live.lastLng != null
                        ? detailLine(
                            'Última posição',
                            `${live.lastLat.toFixed(5)}, ${live.lastLng.toFixed(5)}${live.lastLocAt ? ` · ${formatDateTime(live.lastLocAt)}` : ''}`,
                          )
                        : null}
                      {live.publicCompanyName ? detailLine('Empresa (pública)', live.publicCompanyName) : null}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                    <button
                      type="button"
                      onClick={() => window.open(driverUrl, '_blank', 'noopener,noreferrer')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        borderRadius: 14,
                        border: `1px solid ${border}`,
                        background: '#000',
                        color: LIME,
                        fontWeight: 900,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <ExternalLink size={16} strokeWidth={2.2} /> Abrir motorista
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(publicUrl).catch(() => {});
                        notifyZaptro('success', 'Copiado', 'Link público na área de transferência.');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        borderRadius: 14,
                        border: `1px solid ${border}`,
                        background: palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f4f4',
                        color: text,
                        fontWeight: 900,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <Copy size={16} strokeWidth={2.2} /> Copiar link público
                    </button>
                  </div>

                  <div
                    style={{
                      paddingTop: 16,
                      borderTop: `1px solid ${palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : ROUTES_UI_NEUTRAL.borderHairline}`,
                    }}
                  >
                    <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: muted, lineHeight: 1.45 }}>
                      Se a rota foi criada por engano, podes <strong style={{ color: text }}>eliminar</strong> da lista e limpar o estado local do token.
                    </p>
                    <button
                      type="button"
                      onClick={() => removeRoutePermanently(d)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 18px',
                        borderRadius: 14,
                        border: '1px solid rgba(220,38,38,0.45)',
                        background: 'rgba(220,38,38,0.08)',
                        color: '#dc2626',
                        fontWeight: 950,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <Trash2 size={18} strokeWidth={2.2} /> Eliminar rota
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ZaptroRoutes: React.FC = () => (
  <ZaptroLayout contentFullWidth>
    <ZaptroRoutesInner />
  </ZaptroLayout>
);

export default ZaptroRoutes;
