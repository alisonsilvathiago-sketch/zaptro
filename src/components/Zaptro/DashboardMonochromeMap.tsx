import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { readActiveRoutes, type ActiveRouteRow } from '../../constants/zaptroCrmActiveRoutes';
import { readRouteLive, type RouteLiveBucket } from '../../constants/zaptroRouteLiveStore';
import { ROUTE_STATUS_LABEL, type RouteExecutionStatus, zaptroDriverRoutePath } from '../../constants/zaptroRouteExecution';
import { zaptroDriverProfilePath } from '../../constants/zaptroRoutes';

import { 
  ZAPTRO_MAP_ORIGIN_ICON, 
  ZAPTRO_MAP_DEST_ICON, 
  ZAPTRO_MAP_DRIVER_ICON,
  ZAPTRO_MAP_ROUTE_COLORS 
} from '../../constants/zaptroMapStyles';

const DefaultIcon = ZAPTRO_MAP_DRIVER_ICON;
L.Marker.prototype.options.icon = DefaultIcon;

/** Rota em verde lima; sombra escura por baixo para leitura no mapa P&B. */
const ROUTE_GREEN = '#D9FF00';

const monoStartIcon = ZAPTRO_MAP_ORIGIN_ICON;
const monoEndIcon = ZAPTRO_MAP_DEST_ICON;

async function fetchOsrmDriving(from: { lat: number; lng: number }, to: { lat: number; lng: number }, signal?: AbortSignal): Promise<[number, number][] | null> {
  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { routes?: Array<{ geometry: { coordinates: [number, number][] } }> };
  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) return null;
  return coords.map((c) => [c[1], c[0]] as [number, number]);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

/** Pontos estáveis por token — rotas sem GPS ainda aparecem no mapa (corredor distinto por rota). */
function stableEndpoints(token: string): [{ lat: number; lng: number }, { lat: number; lng: number }] {
  const h = hashString(token);
  const h1 = h % 2147483647;
  const h2 = Math.imul(h, 1103515245) % 2147483647;
  const baseLat = -23.15;
  const baseLng = -46.65;
  const spread = 0.42;
  const a = (h1 % 1000) / 1000;
  const b = (h2 % 1000) / 1000;
  const c = ((h1 ^ h2) % 1000) / 1000;
  const d = ((h1 + h2 * 7) % 1000) / 1000;
  return [
    { lat: baseLat + (a - 0.5) * spread, lng: baseLng + (b - 0.5) * spread },
    { lat: baseLat + (c - 0.5) * spread + 0.11, lng: baseLng + (d - 0.5) * spread + 0.09 },
  ];
}

function pathFromLive(live: RouteLiveBucket | null, token: string): { path: [number, number][]; useOsrm: boolean } {
  const trail = live?.locationTrail;
  if (trail && trail.length >= 2) {
    return { path: trail.map((p) => [p.lat, p.lng] as [number, number]), useOsrm: false };
  }
  if (trail && trail.length === 1 && live?.lastLat != null && live?.lastLng != null) {
    return {
      path: [
        [trail[0].lat, trail[0].lng],
        [live.lastLat, live.lastLng],
      ],
      useOsrm: false,
    };
  }
  if (live?.lastLat != null && live?.lastLng != null) {
    const d = 0.004;
    return {
      path: [
        [live.lastLat, live.lastLng],
        [live.lastLat + d, live.lastLng + d * 0.6],
      ],
      useOsrm: false,
    };
  }
  const [p0, p1] = stableEndpoints(token);
  return {
    path: [
      [p0.lat, p0.lng],
      [p1.lat, p1.lng],
    ],
    useOsrm: true,
  };
}

function isRouteCreatedToday(createdAtIso: string): boolean {
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function FitWhenReady({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: 11 });
  }, [map, positions]);
  return null;
}

const popupBtn: React.CSSProperties = {
  marginTop: 10,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(15,23,42,0.15)',
  background: '#000',
  color: '#fff',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function MarkerWithDriverPopup({
  position,
  icon,
  row,
  live,
}: {
  position: [number, number];
  icon: L.DivIcon;
  row: ActiveRouteRow;
  live: RouteLiveBucket | null;
}) {
  const navigate = useNavigate();
  const name = live?.driverDisplayName?.trim() || 'Motorista (ainda sem nome no painel)';
  const routeLabel = row.clientRef?.trim() || row.label;
  const st = live?.status as RouteExecutionStatus | undefined;
  const stLabel = st && ROUTE_STATUS_LABEL[st] ? ROUTE_STATUS_LABEL[st] : '—';
  const fleetId = live?.fleetDriverId?.trim();

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div style={{ minWidth: 200, maxWidth: 260 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.35 }}>
            <div>
              <strong style={{ fontWeight: 600 }}>Rota:</strong> {routeLabel}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong style={{ fontWeight: 600 }}>Estado:</strong> {stLabel}
            </div>
          </div>
          <button
            type="button"
            style={popupBtn}
            onClick={() => navigate(zaptroDriverRoutePath(row.token))}
          >
            Abrir painel da rota (motorista)
          </button>
          {fleetId ? (
            <button
              type="button"
              style={{ ...popupBtn, marginTop: 6, background: '#fff', color: '#000' }}
              onClick={() => navigate(zaptroDriverProfilePath(fleetId))}
            >
              Perfil na frota
            </button>
          ) : null}
        </div>
      </Popup>
    </Marker>
  );
}

export type DashboardMonochromeMapProps = {
  isDark: boolean;
  /** Altura em px ou CSS (ex. `100%`). */
  height?: number | string;
  className?: string;
  /** Rotas do CRM local (`readActiveRoutes`) — quando definido, o mapa lista todas as rotas criadas hoje. */
  crmStorageId?: string | null;
};

type PreparedRoute = {
  row: ActiveRouteRow;
  live: RouteLiveBucket | null;
  path: [number, number][];
};

/**
 * Mapa Leaflet para o dashboard: tiles Carto P&B; rotas do dia (CRM local + estado ao vivo)
 * com marcadores clicáveis (motorista) e atalho para `/rota/:token`.
 */
const DashboardMonochromeMap: React.FC<DashboardMonochromeMapProps> = ({ isDark, height = 440, className, crmStorageId }) => {
  const [mapReady, setMapReady] = useState(false);
  const [liveBump, setLiveBump] = useState(0);
  const [osrmById, setOsrmById] = useState<Record<string, [number, number][] | null>>({});

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    const bump = () => setLiveBump((n) => n + 1);
    window.addEventListener('zaptro-route-live', bump);
    window.addEventListener('zaptro-crm-active-routes', bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes('zaptro_crm_active_routes')) bump();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('zaptro-route-live', bump);
      window.removeEventListener('zaptro-crm-active-routes', bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const todayRoutes = useMemo(() => {
    if (!crmStorageId) return [];
    return readActiveRoutes(crmStorageId).filter((r) => isRouteCreatedToday(r.createdAt));
  }, [crmStorageId, liveBump]);

  const prepared = useMemo<PreparedRoute[]>(() => {
    return todayRoutes.map((row) => {
      const live = readRouteLive(row.token);
      const { path, useOsrm } = pathFromLive(live, row.token);
      const osrmPts = osrmById[row.id];
      const resolved =
        useOsrm && Array.isArray(osrmPts) && osrmPts.length >= 2 ? osrmPts : path;
      return { row, live, path: resolved };
    });
  }, [todayRoutes, liveBump, osrmById]);

  useEffect(() => {
    if (!crmStorageId) return;
    const ac = new AbortController();
    void (async () => {
      const next: Record<string, [number, number][] | null> = {};
      for (const row of todayRoutes) {
        const live = readRouteLive(row.token);
        const { path, useOsrm } = pathFromLive(live, row.token);
        if (!useOsrm || path.length < 2) {
          next[row.id] = null;
          continue;
        }
        const from = { lat: path[0][0], lng: path[0][1] };
        const to = { lat: path[path.length - 1][0], lng: path[path.length - 1][1] };
        const pts = await fetchOsrmDriving(from, to, ac.signal);
        next[row.id] = pts ?? path;
      }
      if (!ac.signal.aborted) setOsrmById((prev) => ({ ...prev, ...next }));
    })();
    return () => ac.abort();
  }, [crmStorageId, todayRoutes, liveBump]);

  const allPositions = useMemo(() => {
    const out: [number, number][] = [];
    for (const p of prepared) {
      for (const pt of p.path) out.push(pt);
    }
    return out;
  }, [prepared]);

  const center = useMemo(() => [-23.2, -46.75] as [number, number], []);
  const h = typeof height === 'number' ? `${height}px` : height;

  const outerStyle: React.CSSProperties = {
    height: h,
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    background: isDark ? '#0f172a' : '#f1f5f9',
    border: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15, 23, 42, 0.08)'}`,
    boxSizing: 'border-box',
  };

  if (!mapReady) {
    return (
      <div className={className} style={outerStyle} aria-hidden>
        <div style={{ width: '100%', height: '100%', minHeight: 120, background: isDark ? '#0f172a' : '#e5e7eb' }} />
      </div>
    );
  }

  const tile =
    isDark
      ? {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        }
      : {
          url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        };

  const routeCount = prepared.length;
  const labelTop =
    crmStorageId == null
      ? 'Mapa'
      : routeCount === 0
        ? 'Rotas de hoje · 0'
        : `Rotas de hoje · ${routeCount}`;

  return (
    <div className={className} style={outerStyle}>
      <div
        className={`zaptro-dashboard-map-bw ${isDark ? 'zaptro-dashboard-map-bw--dark' : 'zaptro-dashboard-map-bw--light'}`}
        style={{ width: '100%', height: '100%' }}
      >
        <MapContainer
          center={center}
          zoom={9}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          zoomControl={false}
        >
          <TileLayer attribution={tile.attribution} url={tile.url} />
          {allPositions.length > 0 && <FitWhenReady positions={allPositions} />}
          {prepared.map((pr) => (
            <React.Fragment key={pr.row.id}>
              {pr.path.length >= 2 && (
                <>
                  <Polyline
                    positions={pr.path}
                    color={ZAPTRO_MAP_ROUTE_COLORS.main}
                    weight={6}
                    opacity={1}
                    lineCap="round"
                    lineJoin="round"
                  />
                  <Polyline
                    positions={pr.path}
                    color={ZAPTRO_MAP_ROUTE_COLORS.accent}
                    weight={3}
                    opacity={0.8}
                    lineCap="round"
                    lineJoin="round"
                  />
                </>
              )}
              {pr.path.length > 0 && (
                <MarkerWithDriverPopup
                  position={pr.path[0]}
                  icon={monoStartIcon}
                  row={pr.row}
                  live={pr.live}
                />
              )}
              {pr.path.length > 1 && (
                <MarkerWithDriverPopup
                  position={pr.path[pr.path.length - 1]}
                  icon={monoEndIcon}
                  row={pr.row}
                  live={pr.live}
                />
              )}
            </React.Fragment>
          ))}
        </MapContainer>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          zIndex: 500,
          pointerEvents: 'none',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(248,250,252,0.85)' : 'rgba(15,23,42,0.75)',
          textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {labelTop}
      </div>
    </div>
  );
};

export default DashboardMonochromeMap;
