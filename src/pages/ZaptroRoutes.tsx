import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HubGuard from '../components/HubGuard';
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
  Navigation,
  MessageSquare,
  Plus,
  Send,
  MoreVertical,
  Filter,
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
import OpenStreetRouteMap from '../components/OpenStreetRouteMap';
import { ZAPTRO_DEMO_DRIVERS } from '../constants/zaptroDriversDemo';

const LIME = '#D9FF00';

const ZaptroRoutesInner: React.FC = () => {
  const { profile, user } = useAuth();
  const { company } = useTenant();
  const { palette } = useZaptroTheme();
  const isDark = palette.mode === 'dark';
  const navigate = useNavigate();
  const crmStorageId = profile?.company_id || 'local-demo';
  const border = palette.sidebarBorder;
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const muted = palette.textMuted;
  const text = palette.text;
  const panelBg = isDark ? '#111' : '#ffffff';
  const pageBg = isDark ? '#000' : '#ffffff';

  const [rows, setRows] = useState<ActiveRouteRow[]>([]);
  const [, bumpLive] = useState(0);
  const [startDrawerOpen, setStartDrawerOpen] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [statusTab, setStatusTab] = useState<RoutesStatusTab>('all');
  const [detailRouteId, setDetailRouteId] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<ActiveRouteRow | null>(null);

  // Form State for New Route
  const [clientRefDraft, setClientRefDraft] = useState('');
  const [driverIdDraft, setDriverIdDraft] = useState('');
  const [originDraft, setOriginDraft] = useState('');
  const [destDraft, setDestDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

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
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => rowMatchesSearch(r, routeSearch) && rowMatchesStatusTab(r, statusTab));
  }, [rows, routeSearch, statusTab]);

  const detailRow = useMemo(() => (detailRouteId ? rows.find((r) => r.id === detailRouteId) ?? null : null), [rows, detailRouteId]);

  const commitNewRoute = useCallback(() => {
    const token = `rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const datePart = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const driver = ZAPTRO_DEMO_DRIVERS.find(d => d.id === driverIdDraft);
    
    const row: ActiveRouteRow = {
      id: `route-${Date.now()}`,
      token,
      label: clientRefDraft.trim() ? `${clientRefDraft.trim()} · ${datePart}` : `Rota · ${datePart}`,
      createdAt: new Date().toISOString(),
      status: 'ativa',
      createdBy: profile?.full_name || undefined,
      clientRef: clientRefDraft.trim() || undefined,
      internalNote: noteDraft.trim() || undefined,
    };

    setRows((prev) => {
      const next = [row, ...prev];
      writeActiveRoutes(crmStorageId, next);
      return next;
    });

    patchRouteLive(token, {
      publicCompanyName: company?.name || 'Zaptro User',
      publicHeaderLogoUrl: company?.logo_url || null,
      driverDisplayName: driver?.name || undefined,
      driverAvatarUrl: driver?.photo_url || undefined,
      originLabel: originDraft || undefined,
      destLabel: destDraft || undefined,
    });

    setStartDrawerOpen(false);
    setClientRefDraft('');
    setDriverIdDraft('');
    setOriginDraft('');
    setDestDraft('');
    setNoteDraft('');
    notifyZaptro('success', 'Rota criada', 'Operação iniciada e vinculada ao motorista.');
  }, [company, crmStorageId, profile?.full_name, clientRefDraft, driverIdDraft, originDraft, destDraft, noteDraft]);

  const executeDeletePermanently = (row: ActiveRouteRow) => {
    setRows((prev) => {
      const next = prev.filter((x) => x.id !== row.id);
      writeActiveRoutes(crmStorageId, next);
      return next;
    });
    deleteRouteLiveToken(row.token);
    setDetailRouteId(null);
    setConfirmDeleteRow(null);
    notifyZaptro('success', 'Rota eliminada', 'A rota foi removida permanentemente.');
  };

  const closeRoute = (id: string) => {
    setRows((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, status: 'encerrada' as const } : x));
      writeActiveRoutes(crmStorageId, next);
      return next;
    });
    notifyZaptro('info', 'Rota encerrada', 'A rota foi marcada como concluída.');
  };

  const fleetForMap = useMemo(() => {
    return rows.filter(r => r.status === 'ativa').map(r => {
      const live = readRouteLive(r.token);
      return {
        id: r.id,
        lat: live?.lastLat ?? -23.5505 + (Math.random() - 0.5) * 0.1,
        lng: live?.lastLng ?? -46.6333 + (Math.random() - 0.5) * 0.1,
        label: r.clientRef || r.label,
        driverName: live?.driverDisplayName,
        status: live?.status === 'started' ? 'moving' as const : 'stopped' as const,
        type: 'truck' as const
      };
    });
  }, [rows]);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: pageBg, padding: 16, gap: 16 }}>
      
      {/* ─── SIDEBAR (LEFT) ─────────────────────────────────── */}
      <aside style={{
        width: 380,
        minWidth: 380,
        background: panelBg,
        borderRadius: 24,
        border: `1px solid ${border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
        boxShadow: isDark ? 'none' : '0 10px 40px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '24px 24px 16px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: text, letterSpacing: '-0.03em' }}>Rotas</h1>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: muted }}>CENTRAL LOGÍSTICA</p>
            </div>
            <button 
              onClick={() => setStartDrawerOpen(true)}
              style={{ width: 44, height: 44, borderRadius: 14, background: LIME, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 12px ${LIME}40` }}
            >
              <Plus size={22} color="#000" strokeWidth={3} />
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={18} color={muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              value={routeSearch}
              onChange={e => setRouteSearch(e.target.value)}
              placeholder="Pesquisar rotas..."
              style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: 14, border: `1px solid ${border}`, background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', fontWeight: 600, outline: 'none', fontSize: 14, color: text }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {ROUTES_STATUS_TABS.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                style={{
                  padding: '8px 14px', borderRadius: 10, border: `1px solid ${statusTab === tab.id ? LIME : border}`,
                  background: statusTab === tab.id ? `${LIME}15` : 'transparent',
                  color: statusTab === tab.id ? (isDark ? LIME : '#000') : muted,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredRows.map(row => {
            const visual = getRouteCardVisual(row);
            return (
              <div 
                key={row.id}
                onClick={() => setDetailRouteId(row.id)}
                style={{
                  padding: 16, borderRadius: 20, border: `1px solid ${border}`,
                  background: cardBg, cursor: 'pointer', transition: 'all 0.2s',
                  position: 'relative', overflow: 'hidden'
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = visual.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <RouteCardDualAvatars visual={visual} border={border} mode={palette.mode} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: text }}>{row.clientRef || 'Sem Referência'}</div>
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
      </aside>

      {/* ─── MAIN AREA (MAP) ─────────────────────────────────── */}
      <main style={{ 
        flex: 1, 
        position: 'relative', 
        overflow: 'hidden', 
        borderRadius: 24, 
        background: '#fff', 
        border: `1px solid ${border}`, 
        boxShadow: isDark ? 'none' : '0 10px 40px rgba(0,0,0,0.06)' 
      }}>
        <OpenStreetRouteMap 
          height="100%" 
          vehicles={fleetForMap} 
          mode="planning" 
          onVehicleClick={(id) => setDetailRouteId(id)}
        />

        {/* OPERACIONAL AO VIVO BADGE - Bottom Center */}
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: 8 }}>
           <div style={{ padding: '12px 24px', borderRadius: 20, background: '#fff', border: `1px solid ${border}`, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#D9FF00', boxShadow: '0 0 12px #D9FF00', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 900, color: '#000', letterSpacing: '0.05em' }}>ZAPTRO LIVE FEED</span>
              <div style={{ width: 1, height: 16, background: border }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: muted }}>{stats.ativas} OPERAÇÕES ATIVAS</span>
           </div>
        </div>
      </main>

      {/* ─── PREMIUM MODALS ────────────────────────────── */}
      
      {/* NEW ROUTE MODAL (CENTERED) */}
      {startDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{
            width: '100%', maxWidth: 840, background: isDark ? '#111' : '#fff',
            borderRadius: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
            position: 'relative', animation: 'zaptroModalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', overflow: 'hidden'
          }}>
            <button onClick={() => setStartDrawerOpen(false)} style={{ position: 'absolute', top: 24, right: 24, border: 'none', background: 'none', cursor: 'pointer', color: muted, zIndex: 10 }}><X size={24} /></button>
            
            <div style={{ display: 'flex', flex: 1 }}>
              {/* LEFT COLUMN - Primary Info */}
              <div style={{ flex: 1, padding: 40, borderRight: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: LIME, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Truck size={24} color="#000" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: text, letterSpacing: '-0.02em' }}>Nova Operação</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: muted }}>DETALHES DO CLIENTE E MOTORISTA</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <section>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Identificação da Carga</label>
                    <input value={clientRefDraft} onChange={e => setClientRefDraft(e.target.value)} placeholder="Cliente ou Ref. Pedido" style={inputStyle(isDark, border, text)} />
                  </section>

                  <section>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Motorista Responsável</label>
                    <div style={{ position: 'relative' }}>
                      <select value={driverIdDraft} onChange={e => setDriverIdDraft(e.target.value)} style={{ ...inputStyle(isDark, border, text), appearance: 'none' }}>
                        <option value="">Selecionar Motorista...</option>
                        {ZAPTRO_DEMO_DRIVERS.map(d => <option key={d.id} value={d.id}>{d.name} ({d.vehicle})</option>)}
                      </select>
                      <ChevronRight size={18} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} color={muted} />
                    </div>
                  </section>

                  <div style={{ marginTop: 20, padding: 24, borderRadius: 20, background: isDark ? 'rgba(217, 255, 0, 0.05)' : '#fff', border: `1.5px dashed ${LIME}40` }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Sparkles size={18} color={LIME} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: text, lineHeight: 1.5 }}>A rota será monitorizada em tempo real assim que o motorista iniciar o trajeto.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - Logistics Details */}
              <div style={{ flex: 1.1, padding: 40, background: '#fff' }}>
                <div style={{ marginBottom: 40 }}>
                   <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: text, letterSpacing: '0.05em' }}>PARÂMETROS LOGÍSTICOS</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <section>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Origem (Saída)</label>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={16} color="#10b981" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                        <input value={originDraft} onChange={e => setOriginDraft(e.target.value)} placeholder="Endereço ou Cidade" style={{ ...inputStyle(isDark, border, text), paddingLeft: 44 }} />
                      </div>
                    </section>
                    <section>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Destino (Entrega)</label>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={16} color="#ef4444" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                        <input value={destDraft} onChange={e => setDestDraft(e.target.value)} placeholder="Endereço ou Cidade" style={{ ...inputStyle(isDark, border, text), paddingLeft: 44 }} />
                      </div>
                    </section>
                  </div>

                  <section>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Observações Operacionais</label>
                    <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Ex: Cuidado com carga frágil, ligar antes de chegar..." style={{ ...inputStyle(isDark, border, text), minHeight: 120, resize: 'none', lineHeight: 1.6 }} />
                  </section>
                </div>

                <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
                  <button onClick={() => setStartDrawerOpen(false)} style={{ flex: 1, padding: 18, borderRadius: 18, border: `1.5px solid ${border}`, background: 'transparent', color: muted, fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
                  <button onClick={commitNewRoute} style={{ flex: 2, padding: 18, borderRadius: 18, background: '#000', color: LIME, border: 'none', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14 }}>
                    <Send size={18} /> CRIAR E DESPACHAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {detailRow && (
        <>
          <div onClick={() => setDetailRouteId(null)} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, background: isDark ? '#111' : '#fff',
            zIndex: 8001, boxShadow: '-20px 0 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
            borderLeft: `1px solid ${border}`, animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)', padding: 32
          }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <button onClick={() => setDetailRouteId(null)} style={{ position: 'absolute', top: 24, right: 24, border: 'none', background: 'none', cursor: 'pointer', color: muted }}><X size={24} /></button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
              <RouteCardDualAvatars visual={getRouteCardVisual(detailRow)} border={border} mode={palette.mode} />
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: text, letterSpacing: '-0.02em' }}>{detailRow.clientRef || 'Rota Ativa'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: muted }}>ID: {detailRow.token}</span>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: border }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: muted }}>{formatDateTime(detailRow.createdAt)}</span>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ padding: 24, borderRadius: 24, background: isDark ? 'rgba(217, 255, 0, 0.05)' : '#ffffff', border: `1px solid ${LIME}30` }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <Sparkles size={20} color={LIME} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: text }}>Status da Operação</span>
                 </div>
                 <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: text, lineHeight: 1.6 }}>O motorista está atualmente vinculado a esta rota. Você pode acompanhar a localização em tempo real no mapa principal ou compartilhar o link público.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <button onClick={() => navigate(zaptroDriverRoutePath(detailRow.token))} style={{ padding: 16, borderRadius: 16, background: '#000', color: LIME, border: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Truck size={18} /> Painel Motorista</button>
                 <button onClick={() => navigate(zaptroPublicTrackPath(detailRow.token))} style={{ padding: 16, borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', color: text, border: `1px solid ${border}`, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><ExternalLink size={18} /> Link Público</button>
              </div>

              <section>
                <h4 style={{ fontSize: 12, fontWeight: 900, color: muted, textTransform: 'uppercase', marginBottom: 16 }}>Dados da Rota</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, border: `1px solid ${border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: '#10b98120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={16} color="#10b981" /></div>
                    <div><div style={{ fontSize: 10, fontWeight: 800, color: muted }}>ORIGEM</div><div style={{ fontSize: 13, fontWeight: 700 }}>{readRouteLive(detailRow.token)?.originLabel || 'Não definido'}</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, border: `1px solid ${border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: '#ef444420', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={16} color="#ef4444" /></div>
                    <div><div style={{ fontSize: 10, fontWeight: 800, color: muted }}>DESTINO</div><div style={{ fontSize: 13, fontWeight: 700 }}>{readRouteLive(detailRow.token)?.destLabel || 'Não definido'}</div></div>
                  </div>
                </div>
              </section>

              <section>
                <h4 style={{ fontSize: 12, fontWeight: 900, color: muted, textTransform: 'uppercase', marginBottom: 16 }}>Notas Internas</h4>
                <div style={{ padding: 16, borderRadius: 16, border: `1px solid ${border}`, background: cardBg, fontSize: 13, fontWeight: 600, color: text, lineHeight: 1.6 }}>
                  {detailRow.internalNote || "Nenhuma observação registrada."}
                </div>
              </section>
            </div>

            <div style={{ marginTop: 32, padding: '24px 0 0', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between' }}>
               <button onClick={() => setConfirmDeleteRow(detailRow)} style={{ padding: '12px 20px', borderRadius: 14, border: `1px solid #ef444430`, color: '#ef4444', fontWeight: 800, cursor: 'pointer', background: 'transparent' }}><Trash2 size={18} /></button>
               {detailRow.status === 'ativa' && (
                 <button onClick={() => closeRoute(detailRow.id)} style={{ padding: '12px 32px', borderRadius: 14, background: LIME, color: '#000', border: 'none', fontWeight: 900, cursor: 'pointer', letterSpacing: '0.02em' }}>ENCERRAR OPERAÇÃO</button>
               )}
            </div>
          </div>
        </>
      )}

      {/* DELETE CONFIRMATION */}
      {confirmDeleteRow && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
           <div style={{ background: cardBg, padding: 40, borderRadius: 32, maxWidth: 440, width: '100%', textAlign: 'center', border: `1px solid ${border}`, boxShadow: ZAPTRO_SHADOW.lg }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                 <Trash2 size={32} strokeWidth={2.5} />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12, color: text }}>Excluir Rota?</h3>
              <p style={{ color: muted, fontWeight: 600, marginBottom: 32, fontSize: 15, lineHeight: 1.6 }}>Esta ação é irreversível. O rastreamento será interrompido e o histórico desta rota será removido do sistema.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 <button onClick={() => executeDeletePermanently(confirmDeleteRow)} style={{ padding: 18, borderRadius: 16, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 15 }}>Sim, Excluir Agora</button>
                 <button onClick={() => setConfirmDeleteRow(null)} style={{ padding: 18, borderRadius: 16, background: 'transparent', color: muted, border: `1px solid ${border}`, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>Cancelar</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes zaptroModalPop {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

    </div>
  );
};

const inputStyle = (isDark: boolean, border: string, text: string): React.CSSProperties => ({
  width: '100%',
  padding: '16px',
  borderRadius: 16,
  border: `1.5px solid ${border}`,
  background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff',
  color: text,
  fontSize: 14,
  fontWeight: 700,
  outline: 'none',
  boxSizing: 'border-box',
});

// --- HELPERS (KEEPING EXISTING ONES) ---

function formatDateTime(iso: string) {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

function rowMatchesSearch(r: ActiveRouteRow, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  const hay = [r.label, r.clientRef, r.token, r.createdBy, r.internalNote].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(n);
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
  { id: 'em_rota', label: 'Em rota' },
  { id: 'encerrada', label: 'Concluídas' },
];

type RouteCardVisual = {
  title: string; accent: string; iconBg: string; iconFg: string;
  companyPhotoUrl: string | null; driverPhotoUrl: string | null;
  companyInitials: string; driverInitials: string; companyDisplayName: string;
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

  if (row.status === 'encerrada') return { title: 'Encerrada', accent: '#737373', iconBg: 'rgba(115,115,115,0.2)', iconFg: '#404040', ...photos };
  const st: RouteExecutionStatus = live?.status ?? 'assigned';
  switch (st) {
    case 'delivered': return { title: 'Entregue', accent: '#16a34a', iconBg: 'rgba(34,197,94,0.2)', iconFg: '#15803d', ...photos };
    case 'arrived': return { title: 'No Local', accent: '#ea580c', iconBg: 'rgba(249,115,22,0.22)', iconFg: '#c2410c', ...photos };
    case 'started': return { title: 'Em Rota', accent: LIME, iconBg: 'rgba(217,255,0,0.15)', iconFg: '#000', ...photos };
    case 'issue': return { title: 'Problema', accent: '#dc2626', iconBg: 'rgba(239,68,68,0.2)', iconFg: '#b91c1c', ...photos };
    default: return { title: 'Agendada', accent: '#525252', iconBg: 'rgba(64,64,64,0.14)', iconFg: '#262626', ...photos };
  }
}

const RouteCardDualAvatars: React.FC<{ visual: RouteCardVisual; border: string; mode: 'dark' | 'light'; }> = ({ visual, border, mode }) => {
  const [coFail, setCoFail] = React.useState(false);
  const [drFail, setDrFail] = React.useState(false);
  const edge = mode === 'dark' ? 'rgba(255,255,255,0.12)' : border;
  const dotRing = mode === 'dark' ? '#000' : '#ffffff';
  
  const placeholder = (bg: string, initials: string, fg: string, size: number) => (
    <div style={{ width: size, height: size, borderRadius: size > 30 ? 12 : 8, backgroundColor: bg, border: `1px solid ${edge}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size > 30 ? 12 : 9, fontWeight: 800, color: fg, flexShrink: 0 }}>
      {initials}
    </div>
  );

  return (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      {/* COMPANY / CLIENT (BASE) */}
      <div style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden', position: 'absolute', bottom: 0, right: 0 }}>
        {visual.companyPhotoUrl && !coFail ? (
          <img src={visual.companyPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', border: `1px solid ${edge}` }} onError={() => setCoFail(true)} />
        ) : placeholder(visual.iconBg, visual.companyInitials, visual.iconFg, 44)}
      </div>

      {/* DRIVER / COLLABORATOR (BADGE) */}
      <div style={{ 
        position: 'absolute', 
        top: -2, 
        left: -2, 
        width: 24, 
        height: 24, 
        borderRadius: 8, 
        backgroundColor: '#000', 
        border: `2px solid ${dotRing}`, 
        overflow: 'hidden', 
        zIndex: 10,
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
      }}>
        {visual.driverPhotoUrl && !drFail ? (
          <img src={visual.driverPhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setDrFail(true)} />
        ) : placeholder('rgba(115,115,115,0.2)', visual.driverInitials, '#ffffff', 24)}
      </div>

      {/* STATUS DOT */}
      <div style={{ 
        position: 'absolute', 
        right: -2, 
        bottom: -2, 
        width: 12, 
        height: 12, 
        borderRadius: '50%', 
        backgroundColor: visual.accent, 
        border: `2.5px solid ${dotRing}`, 
        zIndex: 20 
      }} />
    </div>
  );
};

const ZaptroRoutes: React.FC = () => {
  const { profile } = useAuth();
  
  if (!profile?.company_id) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <HubGuard companyId={profile.company_id}>
      <ZaptroLayout contentFullWidth>
        <ZaptroRoutesInner />
      </ZaptroLayout>
    </HubGuard>
  );
};

export default ZaptroRoutes;
