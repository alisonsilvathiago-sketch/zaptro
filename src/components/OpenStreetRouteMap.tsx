import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Send, Truck } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ZAPTRO_DEMO_DRIVERS } from '../constants/zaptroDriversDemo';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { ZAPTRO_MAP_ROUTE_HANDOFF_KEY, type ZaptroMapRouteHandoffPayload } from '../constants/zaptroMapRouteHandoff';
import { notifyZaptro } from './Zaptro/ZaptroNotificationSystem';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

/** Centro geográfico aproximado do Brasil (visualização inicial). */
export const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];
export const BRAZIL_ZOOM = 4;

type LatLng = { lat: number; lng: number };

type OsrmRouteResult = {
  positions: [number, number][];
  distanceM: number;
  durationS: number;
};

/** OSRM público (gratuito) — geometria GeoJSON [lng, lat] → Leaflet [lat, lng]. */
async function fetchOsrmDrivingRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<OsrmRouteResult | null> {
  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    routes?: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }>;
    code?: string;
  };
  const route = data.routes?.[0];
  const coords = route?.geometry?.coordinates;
  if (!route || !coords?.length) return null;
  const positions: [number, number][] = coords.map((c) => [c[1], c[0]]);
  return {
    positions,
    distanceM: route.distance,
    durationS: route.duration,
  };
}

/** Rota e pontos no mapa — lime Zaptro (não só na barra lateral da app). */
const MAP_ROUTE_ACCENT = '#D9FF00';

const originIcon = L.divIcon({
  className: 'osrm-pin osrm-pin-origin',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#000;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destIcon = L.divIcon({
  className: 'osrm-pin osrm-pin-dest',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#fff;box-sizing:border-box;border:3px solid #000;box-shadow:0 2px 10px rgba(0,0,0,.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const freeIcon = (n: number) =>
  L.divIcon({
    className: 'osrm-pin osrm-pin-free',
    html: `<div style="min-width:22px;height:22px;border-radius:999px;background:#D9FF00;color:#000;font:800 11px/22px system-ui;text-align:center;border:2px solid #000;box-shadow:0 2px 10px rgba(0,0,0,.3)">${n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 2) return;
    const b = L.latLngBounds(positions);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 14 });
  }, [map, positions]);
  return null;
}

type PlacementTool = 'origin' | 'dest' | 'pin' | null;

function MapClickBridge({
  tool,
  onPick,
}: {
  tool: PlacementTool;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!tool) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export type OpenStreetRouteMapProps = {
  /** Altura CSS do container do mapa (ex.: `420px`, `min(70vh, 560px)`). */
  height?: string;
  className?: string;
};

/**
 * Mapa OpenStreetMap (Leaflet) centrado no Brasil: marcadores, rota rodoviária real via OSRM.
 * Sem Google Maps — apenas tiles OSM + motor de rotas OSRM público.
 */
const OpenStreetRouteMap: React.FC<OpenStreetRouteMapProps> = ({ height = 'min(72vh, 560px)', className }) => {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [freePins, setFreePins] = useState<{ id: string; lat: number; lng: number; n: number }[]>([]);
  const [tool, setTool] = useState<PlacementTool>('origin');
  const [route, setRoute] = useState<OsrmRouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const selectableDrivers = useMemo(() => ZAPTRO_DEMO_DRIVERS.filter((d) => d.status === 'ativo'), []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
  }, []);

  const runRoute = useCallback(async () => {
    if (!origin || !dest) {
      setError('Defina origem e destino no mapa.');
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchOsrmDrivingRoute(origin, dest, ac.signal);
      if (!r) {
        setRoute(null);
        setError('Não foi possível calcular a rota. Tente pontos mais próximos de estradas.');
        return;
      }
      setRoute(r);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setRoute(null);
      setError('Falha de rede ao pedir a rota.');
    } finally {
      setLoading(false);
    }
  }, [origin, dest]);

  const handlePick = useCallback(
    (lat: number, lng: number) => {
      if (tool === 'origin') {
        setOrigin({ lat, lng });
        clearRoute();
        setTool('dest');
        return;
      }
      if (tool === 'dest') {
        setDest({ lat, lng });
        clearRoute();
        setTool(null);
        return;
      }
      if (tool === 'pin') {
        setFreePins((prev) => {
          const n = prev.length + 1;
          return [...prev, { id: `${Date.now()}-${n}`, lat, lng, n }];
        });
      }
    },
    [tool, clearRoute],
  );

  const resetAll = useCallback(() => {
    abortRef.current?.abort();
    setOrigin(null);
    setDest(null);
    setFreePins([]);
    setRoute(null);
    setError(null);
    setTool('origin');
    setSelectedDriverId('');
  }, []);

  const canForwardRoute = Boolean(route && origin && dest && selectedDriverId);

  const persistHandoff = useCallback(
    (driver: { id: string; name: string }, r: OsrmRouteResult) => {
      const payload: ZaptroMapRouteHandoffPayload = {
        driverId: driver.id,
        driverName: driver.name,
        distanceKm: r.distanceM / 1000,
        durationMin: Math.round(r.durationS / 60),
        createdAt: new Date().toISOString(),
      };
      try {
        sessionStorage.setItem(ZAPTRO_MAP_ROUTE_HANDOFF_KEY, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const openWhatsAppToDriver = useCallback(() => {
    if (!route || !origin || !dest || !selectedDriverId) {
      notifyZaptro('warning', 'Rota ou motorista', 'Traça a rota e escolhe um motorista na lista.');
      return;
    }
    const driver = ZAPTRO_DEMO_DRIVERS.find((d) => d.id === selectedDriverId);
    if (!driver) return;
    const mapsUrl = `https://www.google.com/maps/dir/${origin.lat},${origin.lng}/${dest.lat},${dest.lng}`;
    const text = [
      `🚚 Zaptro — rota para ${driver.name}`,
      `Origem: ${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}`,
      `Destino: ${dest.lat.toFixed(5)}, ${dest.lng.toFixed(5)}`,
      `Distância: ${(route.distanceM / 1000).toFixed(1)} km · ~${Math.round(route.durationS / 60)} min (estimado carro)`,
      `Abrir no Maps: ${mapsUrl}`,
    ].join('\n');
    const phone = driver.phone.replace(/\D/g, '');
    const wa = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
    persistHandoff(driver, route);
    notifyZaptro('success', 'WhatsApp', `Mensagem preparada para ${driver.name}. Confirma o envio na janela do WhatsApp.`);
  }, [route, origin, dest, selectedDriverId, persistHandoff]);

  const goToRoutesPage = useCallback(() => {
    if (route && origin && dest && selectedDriverId) {
      const driver = ZAPTRO_DEMO_DRIVERS.find((d) => d.id === selectedDriverId);
      if (driver) persistHandoff(driver, route);
    }
    navigate(ZAPTRO_ROUTES.ROUTES);
    notifyZaptro('info', 'Rotas', 'Na página Rotas podes criar ou acompanhar rotas operacionais com a equipa.');
  }, [navigate, route, origin, dest, selectedDriverId, persistHandoff]);

  const fitPositions = useMemo(() => {
    if (route?.positions?.length) return route.positions;
    const pts: [number, number][] = [];
    if (origin) pts.push([origin.lat, origin.lng]);
    if (dest) pts.push([dest.lat, dest.lng]);
    return pts;
  }, [route, origin, dest]);

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'minmax(0, 1fr)',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          padding: '14px 16px',
          borderRadius: 16,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.85) 100%)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginRight: 4 }}>Colocar no mapa:</span>
        <button
          type="button"
          onClick={() => setTool('origin')}
          style={btnStyle(tool === 'origin')}
        >
          Origem
        </button>
        <button
          type="button"
          onClick={() => setTool('dest')}
          style={btnStyle(tool === 'dest')}
        >
          Destino
        </button>
        <button
          type="button"
          onClick={() => setTool('pin')}
          style={btnStyle(tool === 'pin')}
        >
          + Marcador
        </button>
        <button
          type="button"
          onClick={() => void runRoute()}
          disabled={loading || !origin || !dest}
          style={{
            ...btnStyle(false, true),
            opacity: loading || !origin || !dest ? 0.45 : 1,
            cursor: loading || !origin || !dest ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'A calcular…' : 'Traçar rota (OSRM)'}
        </button>
        <button type="button" onClick={resetAll} style={btnStyle(false, false, true)}>
          Limpar
        </button>
        {tool && (
          <span style={{ fontSize: 12, color: '#000000', fontWeight: 700 }}>
            {tool === 'origin' && 'No mapa abaixo: clique onde fica a origem (disco preto).'}
            {tool === 'dest' && 'No mapa abaixo: clique onde fica o destino (disco branco).'}
            {tool === 'pin' && 'No mapa abaixo: cada clique adiciona um marcador numerado (1, 2, 3…).'}
          </span>
        )}
      </div>

      <div
        role="note"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#475569',
          lineHeight: 1.55,
          padding: '10px 14px',
          borderRadius: 14,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: '#fff',
        }}
      >
        <strong style={{ color: '#0f172a' }}>Onde ficam os marcadores:</strong> no <strong>mapa</strong> (área rectangular logo abaixo), no sítio exato do teu clique — não na barra de ferramentas. Fluxo: <strong>Origem</strong> (disco preto) → <strong>Destino</strong> (disco branco) → opcional <strong>+ Marcador</strong> (1, 2, 3…) → <strong>Traçar rota</strong>.
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      {route && (
        <div style={{ fontSize: 13, fontWeight: 700, color: '#000000', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <span>
            Distância: <strong>{(route.distanceM / 1000).toFixed(1)} km</strong>
          </span>
          <span>
            Tempo estimado (carro): <strong>{Math.round(route.durationS / 60)} min</strong>
          </span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 16,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.85) 100%)',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Truck size={18} color="#0f172a" strokeWidth={2.2} aria-hidden />
          <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em' }}>MOTORISTA E ENTREGA</span>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 800, color: '#64748b' }}>
          Quem faz a entrega
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontWeight: 700,
              fontSize: 13,
              color: '#0f172a',
              fontFamily: 'inherit',
              cursor: 'pointer',
              maxWidth: '100%',
            }}
          >
            <option value="">— Escolher motorista —</option>
            {selectableDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.vehicle}
              </option>
            ))}
          </select>
        </label>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#475569', lineHeight: 1.5 }}>
          Com a rota traçada, envia o destino e o percurso ao motorista por WhatsApp (mensagem com link Google Maps) ou abre a página{' '}
          <strong style={{ color: '#0f172a' }}>Rotas</strong> para registar a operação na frota.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={openWhatsAppToDriver}
            disabled={!canForwardRoute}
            style={{
              ...btnStyle(false, true),
              opacity: canForwardRoute ? 1 : 0.45,
              cursor: canForwardRoute ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Send size={15} strokeWidth={2.2} aria-hidden />
            Encaminhar rota (WhatsApp)
          </button>
          <button type="button" onClick={goToRoutesPage} style={{ ...btnStyle(false), display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Abrir página Rotas
          </button>
        </div>
      </div>

      <div
        className="zaptro-dashboard-map-bw"
        style={{
          height,
          width: '100%',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid rgba(15, 23, 42, 0.1)',
          boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        <MapContainer center={BRAZIL_CENTER} zoom={BRAZIL_ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickBridge tool={tool} onPick={handlePick} />
          {fitPositions.length >= 2 && <FitBounds positions={fitPositions} />}

          {origin && (
            <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
              <Popup>
                <strong>Origem</strong>
                <br />
                {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}
              </Popup>
            </Marker>
          )}
          {dest && (
            <Marker position={[dest.lat, dest.lng]} icon={destIcon}>
              <Popup>
                <strong>Destino</strong>
                <br />
                {dest.lat.toFixed(5)}, {dest.lng.toFixed(5)}
              </Popup>
            </Marker>
          )}
          {freePins.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={freeIcon(p.n)}>
              <Popup>
                Marcador {p.n}
                <br />
                {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
              </Popup>
            </Marker>
          ))}
          {route && (
            <>
              <Polyline
                positions={route.positions}
                color="#000000"
                weight={8}
                opacity={0.2}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                positions={route.positions}
                color={MAP_ROUTE_ACCENT}
                weight={5}
                opacity={0.95}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}
        </MapContainer>
      </div>

      <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
        Rotas calculadas pelo serviço público{' '}
        <a href="https://project-osrm.org/" target="_blank" rel="noreferrer">
          OSRM
        </a>{' '}
        (uso demonstrativo; para produção aloje o teu próprio servidor ou contrata um plano). Mapas © OpenStreetMap.
      </p>
    </div>
  );
};

function btnStyle(active: boolean, primary?: boolean, danger?: boolean): React.CSSProperties {
  if (danger) {
    return {
      padding: '8px 14px',
      borderRadius: 12,
      border: '1px solid #fecaca',
      background: '#fff',
      fontWeight: 800,
      fontSize: 12,
      cursor: 'pointer',
      color: '#b91c1c',
    };
  }
  if (primary) {
    return {
      padding: '8px 14px',
      borderRadius: 12,
      border: 'none',
      background: '#D9FF00',
      color: '#000000',
      fontWeight: 800,
      fontSize: 12,
      cursor: 'pointer',
      opacity: active ? 0.88 : 1,
    };
  }
  return {
    padding: '8px 14px',
    borderRadius: 12,
    border: active ? '2px solid #D9FF00' : '1px solid #cbd5e1',
    background: active ? 'rgba(217, 255, 0, 0.22)' : '#fff',
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
    color: '#000000',
  };
}

export default OpenStreetRouteMap;
