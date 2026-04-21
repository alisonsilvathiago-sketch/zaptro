import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
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

/** Demo: São Paulo → Campinas (rota real via OSRM). */
const DEMO_FROM = { lat: -23.5505, lng: -46.6333 };
const DEMO_TO = { lat: -22.9056, lng: -47.0608 };

/** Rota em verde lima; sombra escura por baixo para leitura no mapa P&B. */
const ROUTE_GREEN = '#D9FF00';

/** Partida (saída): disco preto + bordo branco. */
const monoStartIcon = L.divIcon({
  className: 'zaptro-mono-marker',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#000;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** Chegada: disco branco + bordo preto. */
const monoEndIcon = L.divIcon({
  className: 'zaptro-mono-marker',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#fff;box-sizing:border-box;border:3px solid #000;box-shadow:0 2px 10px rgba(0,0,0,.35)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

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

function FitWhenReady({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 2) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: 11 });
  }, [map, positions]);
  return null;
}

export type DashboardMonochromeMapProps = {
  isDark: boolean;
  /** Altura em px ou CSS (ex. `100%`). */
  height?: number | string;
  className?: string;
};

/**
 * Mapa Leaflet para o preview do dashboard: tiles estilo claro/escuro (Carto),
 * filtro monocromático e rota OSRM de demonstração. Sem Google Maps.
 */
const DashboardMonochromeMap: React.FC<DashboardMonochromeMapProps> = ({ isDark, height = 440, className }) => {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  /** Leaflet + React 18 Strict Mode: só monta o mapa no cliente após o 1.º paint — evita crash / tela branca. */
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      const pts = await fetchOsrmDriving(DEMO_FROM, DEMO_TO, ac.signal);
      if (pts) setRoute(pts);
      else {
        setRoute([
          [DEMO_FROM.lat, DEMO_FROM.lng],
          [(DEMO_FROM.lat + DEMO_TO.lat) / 2, (DEMO_FROM.lng + DEMO_TO.lng) / 2],
          [DEMO_TO.lat, DEMO_TO.lng],
        ]);
      }
    })();
    return () => ac.abort();
  }, []);

  const lineColor = ROUTE_GREEN;
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

  return (
    <div className={className} style={outerStyle}>
      {/* Tiles P&B (linhas escuras / fundo claro ou escuro) via index.css; rota e pins em destaque. */}
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
          {route && route.length >= 2 && <FitWhenReady positions={route} />}
          {route && (
            <>
              <Polyline
                positions={route}
                color="#000000"
                weight={7}
                opacity={0.22}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                positions={route}
                color={lineColor}
                weight={4}
                opacity={1}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}
          <Marker position={[DEMO_FROM.lat, DEMO_FROM.lng]} icon={monoStartIcon} />
          <Marker position={[DEMO_TO.lat, DEMO_TO.lng]} icon={monoEndIcon} />
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
          fontWeight: 900,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(248,250,252,0.85)' : 'rgba(15,23,42,0.75)',
          textShadow: isDark ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        OpenStreetMap · demo
      </div>
    </div>
  );
};

export default DashboardMonochromeMap;
