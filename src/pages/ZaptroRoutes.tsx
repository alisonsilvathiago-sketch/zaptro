import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Gauge,
  LayoutGrid,
  List,
  MapPin,
  MapPinned,
  Radio,
  Search,
  Shield,
  Trash2,
  Truck,
  User,
  X,
  ChevronRight,
  Sparkles,
  Zap,
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

/** Cinzas neutros na página Rotas. */
const ROUTES_UI_NEUTRAL = {
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
  } catch { /* ignore */ }
  return 'cards';
}

function writeRoutesViewMode(tenantId: string, mode: 'cards' | 'list') {
  try {
    localStorage.setItem(`${ROUTES_VIEW_STORAGE_PREFIX}${tenantId}`, mode);
  } catch { /* ignore */ }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch { return '—'; }
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
    case 'iniciar': return lv === 'assigned' || lv === 'draft';
    case 'em_rota': return lv === 'started';
    case 'cheguei': return lv === 'arrived';
    case 'entrega': return lv === 'delivered';
    case 'problema': return lv === 'issue';
    default: return true;
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
  companyDisplayName: string;
};

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
    return { title: 'Encerrada', accent: '#737373', iconBg: 'rgba(115,115,115,0.2)', iconFg: '#404040', ...photos };
  }
  const st: RouteExecutionStatus = live?.status ?? 'assigned';
  switch (st) {
    case 'delivered': return { title: 'Entrega realizada', accent: '#16a34a', iconBg: 'rgba(34,197,94,0.2)', iconFg: '#15803d', ...photos };
    case 'arrived': return { title: 'Cheguei no local', accent: '#ea580c', iconBg: 'rgba(249,115,22,0.22)', iconFg: '#c2410c', ...photos };
    case 'started': return { title: 'Em rota', accent: '#ca8a04', iconBg: 'rgba(234,179,8,0.28)', iconFg: '#854d0e', ...photos };
    case 'issue': return { title: ROUTE_STATUS_LABEL.issue, accent: '#dc2626', iconBg: 'rgba(239,68,68,0.2)', iconFg: '#b91c1c', ...photos };
    case 'draft':
    case 'assigned':
    default: return { title: 'Iniciar rota', accent: '#525252', iconBg: 'rgba(64,64,64,0.14)', iconFg: '#262626', ...photos };
  }
}

const RouteCardDualAvatars: React.FC<{
  visual: RouteCardVisual;
  border: string;
  mode: 'dark' | 'light';
}> = ({ visual, border, mode }) => {
  const [coFail, setCoFail] = React.useState(false);
  const [drFail, setDrFail] = React.useState(false);
  React.useEffect(() => { setCoFail(false); setDrFail(false); }, [visual.companyPhotoUrl, visual.driverPhotoUrl]);
  const edge = mode === 'dark' ? 'rgba(255,255,255,0.12)' : border;
  const dotRing = mode === 'dark' ? 'rgba(0,0,0,0.92)' : '#ffffff';
  
  const placeholder = (bg: string, initials: string, fg: string) => (
    <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, border: `1px solid ${edge}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: fg, flexShrink: 0, boxSizing: 'border-box' }}>
      {initials}
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <div style={{ flexShrink: 0, lineHeight: 0, borderRadius: 10 }}>
        {visual.companyPhotoUrl && !coFail ? (
          <img src={visual.companyPhotoUrl} alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: `1px solid ${edge}`, display: 'block', boxSizing: 'border-box' }} onError={() => setCoFail(true)} />
        ) : placeholder(visual.iconBg, visual.companyInitials, visual.iconFg)}
      </div>
      <div style={{ width: 36, height: 36, position: 'relative' }}>
        {visual.driverPhotoUrl && !drFail ? (
          <img src={visual.driverPhotoUrl} alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: `1px solid ${edge}`, display: 'block', boxSizing: 'border-box' }} onError={() => setDrFail(true)} />
        ) : placeholder('rgba(115,115,115,0.2)', visual.driverInitials, '#525252')}
        <div style={{ position: 'absolute', right: 2, bottom: 2, width: 11, height: 11, borderRadius: 999, backgroundColor: visual.accent, border: `2px solid ${dotRing}`, boxSizing: 'border-box', zIndex: 2 }} />
      </div>
    </div>
  );
};

const ZaptroRoutesInner: React.FC = () => {
  const { profile, isMaster, user } = useAuth();
  const { company } = useTenant();
  const { palette } = useZaptroTheme();
  const isDark = palette.mode === 'dark';
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
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<ActiveRouteRow | null>(null);
  const [showActiveRoutesMap, setShowActiveRoutesMap] = useState(false);

  const persistViewMode = useCallback((mode: 'cards' | 'list') => {
    setViewMode(mode);
    writeRoutesViewMode(crmStorageId, mode);
  }, [crmStorageId]);

  useEffect(() => { setViewMode(readRoutesViewMode(crmStorageId)); }, [crmStorageId]);

  const reload = useCallback(() => { setRows(readActiveRoutes(crmStorageId)); }, [crmStorageId]);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const key = routesStorageKey(crmStorageId);
    const onStorage = (e: StorageEvent) => { if (e.key === key) reload(); };
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

  const filteredRows = useMemo(() => {
    return rows.filter((r) => rowMatchesSearch(r, routeSearch) && rowMatchesDateRange(r, dateFrom, dateTo) && rowMatchesStatusTab(r, statusTab));
  }, [rows, routeSearch, dateFrom, dateTo, statusTab, bumpLive]);

  const detailRow = useMemo(() => (detailRouteId ? rows.find((r) => r.id === detailRouteId) ?? null : null), [rows, detailRouteId]);

  const executeDeletePermanently = useCallback((row: ActiveRouteRow) => {
    setRows((prev) => {
      const next = prev.filter((x) => x.id !== row.id);
      writeActiveRoutes(crmStorageId, next);
      return next;
    });
    deleteRouteLiveToken(row.token);
    setDetailRouteId(null);
    setConfirmDeleteRow(null);
    bumpLive((n) => n + 1);
    notifyZaptro('success', 'Rota eliminada', 'A rota foi removida da lista e o token limpo localmente.');
  }, [crmStorageId]);

  const closeRoute = useCallback((id: string) => {
    setRows((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, status: 'encerrada' as const } : x));
      writeActiveRoutes(crmStorageId, next);
      return next;
    });
    notifyZaptro('info', 'Rota', 'Marcada como encerrada na lista.');
  }, [crmStorageId]);

  const commitNewRoute = useCallback((clientRef: string, internalNote: string) => {
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
    patchRouteLive(token, {
      publicCompanyName: company?.name || 'Zaptro User',
      publicHeaderLogoUrl: company?.logo_url || null,
    });
    setStartModalOpen(false);
    notifyZaptro('success', 'Rota criada', 'Operação iniciada com sucesso.');
  }, [company, crmStorageId, profile?.full_name]);

  return (
    <div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', padding: '0 0 48px', boxSizing: 'border-box' }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: text, letterSpacing: '-0.02em' }}>Rotas Operacionais</h1>
          <button 
            onClick={() => setStartModalOpen(true)}
            style={{ padding: '14px 24px', borderRadius: 16, background: LIME, color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer' }}
          >
            <Truck size={18} style={{ marginRight: 8 }} /> Iniciar Rota
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'TOTAL', value: stats.total, icon: LayoutGrid },
          { label: 'ATIVAS', value: stats.ativas, icon: Truck, active: true },
          { label: 'ENCERRADAS', value: stats.encerradas, icon: CheckCircle2 },
          { label: 'LIVE', value: stats.comLive, icon: Radio }
        ].map((kpi, idx) => (
          <div key={idx} style={{ padding: 24, borderRadius: 24, background: cardBg, border: `1px solid ${border}`, boxShadow: ZAPTRO_SHADOW.sm }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ padding: 10, borderRadius: 12, background: kpi.active ? LIME : 'rgba(0,0,0,0.05)', color: '#000' }}>
                   <kpi.icon size={20} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: muted }}>{kpi.label}</span>
             </div>
             <div style={{ fontSize: 32, fontWeight: 900, color: text }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: 20, borderRadius: 24, background: cardBg, border: `1px solid ${border}` }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color={muted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            value={routeSearch} 
            onChange={e => setRouteSearch(e.target.value)} 
            placeholder="Pesquisar por cliente, token ou referência..." 
            style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: 14, border: `1px solid ${border}`, background: palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc', fontWeight: 600, outline: 'none' }}
          />
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {filteredRows.map(row => {
          const visual = getRouteCardVisual(row);
          return (
            <div 
              key={row.id} 
              onClick={() => setDetailRouteId(row.id)}
              style={{ padding: 20, borderRadius: 24, background: cardBg, border: `1px solid ${border}`, cursor: 'pointer', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: visual.accent }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                 <RouteCardDualAvatars visual={visual} border={border} mode={palette.mode} />
                 <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: text }}>{row.clientRef || 'Sem Referência'}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: muted }}>{row.token}</div>
                 </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 8, background: visual.iconBg, color: visual.iconFg }}>{visual.title.toUpperCase()}</span>
                 <span style={{ fontSize: 11, fontWeight: 600, color: muted }}>{formatDateTime(row.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDeleteRow && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
           <div style={{ background: cardBg, padding: 32, borderRadius: 32, maxWidth: 400, width: '100%', textAlign: 'center', border: `1px solid ${border}` }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                 <Trash2 size={32} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Excluir Rota?</h3>
              <p style={{ color: muted, fontWeight: 600, marginBottom: 32 }}>Esta ação é permanente e os links de rastreio deixarão de funcionar.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                 <button onClick={() => executeDeletePermanently(confirmDeleteRow)} style={{ padding: 16, borderRadius: 16, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Excluir Permanentemente</button>
                 <button onClick={() => setConfirmDeleteRow(null)} style={{ padding: 16, borderRadius: 16, background: 'transparent', color: muted, border: `1px solid ${border}`, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* Detail Premium Side Drawer */}
      {detailRow && (
        <>
          <div onClick={() => setDetailRouteId(null)} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 560, background: palette.pageBg, zIndex: 8001, boxShadow: '-20px 0 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${border}`, animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
             <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
             <div style={{ padding: 32, borderBottom: `1px solid ${border}`, position: 'relative' }}>
                <button onClick={() => setDetailRouteId(null)} style={{ position: 'absolute', top: 24, right: 24, border: 'none', background: 'none', cursor: 'pointer', color: muted }}><X size={24} /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                   <RouteCardDualAvatars visual={getRouteCardVisual(detailRow)} border={border} mode={palette.mode} />
                   <div>
                      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: text, letterSpacing: '-0.03em' }}>{detailRow.clientRef || 'Rota Ativa'}</h2>
                      <div style={{ fontSize: 13, fontWeight: 700, color: muted }}>Token: {detailRow.token}</div>
                   </div>
                </div>
             </div>
             
             <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
                <div style={{ padding: 20, borderRadius: 20, background: 'rgba(217, 255, 0, 0.05)', border: `1px solid ${LIME}`, marginBottom: 32, display: 'flex', gap: 16 }}>
                   <Sparkles size={24} color={LIME} />
                   <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: text }}>Lead operacional em trânsito. Acompanhe a telemetria em tempo real ou partilhe o link com o cliente.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
                   <button onClick={() => navigate(zaptroDriverRoutePath(detailRow.token))} style={{ padding: 16, borderRadius: 16, background: '#000', color: LIME, border: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Truck size={18} /> Painel Motorista</button>
                   <button onClick={() => navigate(zaptroPublicTrackPath(detailRow.token))} style={{ padding: 16, borderRadius: 16, background: palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: text, border: `1px solid ${border}`, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><ExternalLink size={18} /> Link Público</button>
                </div>

                <div style={{ marginBottom: 40 }}>
                   <h4 style={{ fontSize: 14, fontWeight: 900, marginBottom: 16 }}>HISTÓRICO</h4>
                   <div style={{ padding: 20, borderRadius: 20, border: `1px solid ${border}`, background: cardBg }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                         <div style={{ width: 8, height: 8, borderRadius: '50%', background: LIME }} />
                         <div style={{ fontSize: 13, fontWeight: 700 }}>Criada em {formatDateTime(detailRow.createdAt)}</div>
                      </div>
                      <div style={{ fontSize: 12, color: muted, marginLeft: 20, marginTop: 4 }}>Por {detailRow.createdBy || 'Operador'}</div>
                   </div>
                </div>
             </div>

             <div style={{ padding: '24px 32px', borderTop: `1px solid ${border}`, background: palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setConfirmDeleteRow(detailRow)} style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', background: 'transparent' }}><Trash2 size={16} /> Excluir</button>
                {detailRow.status === 'ativa' && (
                  <button onClick={() => closeRoute(detailRow.id)} style={{ padding: '12px 24px', borderRadius: 12, background: LIME, color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Encerrar Rota</button>
                )}
             </div>
          </div>
        </>
      )}

      {/* Start Route Modal */}
      {startModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zizeIndex: 9000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
           <div style={{ background: cardBg, padding: 32, borderRadius: 32, maxWidth: 500, width: '100%', border: `1px solid ${border}` }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24 }}>Nova Rota</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>REFERÊNCIA / CLIENTE</label>
                    <input value={clientRefDraft} onChange={e => setClientRefDraft(e.target.value)} placeholder="Ex: Logística Norte S.A." style={{ width: '100%', padding: 16, borderRadius: 16, border: `1px solid ${border}`, background: palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc', fontWeight: 700, outline: 'none' }} />
                 </div>
                 <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>NOTA INTERNA</label>
                    <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Observações para a equipe..." style={{ width: '100%', padding: 16, borderRadius: 16, border: `1px solid ${border}`, background: palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc', fontWeight: 600, outline: 'none', minHeight: 100, resize: 'none' }} />
                 </div>
                 <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <button onClick={() => setStartModalOpen(false)} style={{ flex: 1, padding: 16, borderRadius: 16, background: 'transparent', border: `1px solid ${border}`, color: muted, fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={() => commitNewRoute(clientRefDraft, noteDraft)} style={{ flex: 2, padding: 16, borderRadius: 16, background: LIME, color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Criar Rota Operacional</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ZaptroRoutes: React.FC = () => (
  <ZaptroLayout contentFullWidth>
    <ZaptroRoutesInner />
  </ZaptroLayout>
);

export default ZaptroRoutes;
