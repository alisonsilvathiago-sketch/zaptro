import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [freePins, setFreePins] = useState<{ id: string; lat: number; lng: number; n: number }[]>([]);
  const [tool, setTool] = useState<PlacementTool>('origin');
  const [route, setRoute] = useState<OsrmRouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
  }, []);

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
            {tool === 'origin' && 'Clique no mapa: origem (verde)'}
            {tool === 'dest' && 'Clique no mapa: destino (vermelho)'}
            {tool === 'pin' && 'Clique no mapa: marcador numerado'}
          </span>
        )}
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
