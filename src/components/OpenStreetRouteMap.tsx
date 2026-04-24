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
import { 
  ZAPTRO_MAP_ORIGIN_ICON, 
  ZAPTRO_MAP_DEST_ICON, 
  ZAPTRO_MAP_DRIVER_ICON,
  ZAPTRO_MAP_VEHICLE_ICON,
  ZAPTRO_MAP_ROUTE_COLORS 
} from '../constants/zaptroMapStyles';

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

const originIcon = ZAPTRO_MAP_ORIGIN_ICON;
const destIcon = ZAPTRO_MAP_DEST_ICON;
const driverIcon = ZAPTRO_MAP_DRIVER_ICON;

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

function CustomMapControls({ fitPositions }: { fitPositions: [number, number][] }) {
  const map = useMap();
  
  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleFit = () => {
    if (fitPositions.length >= 2) {
      const b = L.latLngBounds(fitPositions);
      map.fitBounds(b, { padding: [48, 48], maxZoom: 14 });
    }
  };

  const btnS: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    border: '1px solid rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transition: 'all 0.2s',
    color: '#000',
    fontSize: 20,
    fontWeight: 500,
  };

  return (
    <div style={{ position: 'absolute', bottom: 30, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button 
        style={btnS} 
        onClick={handleZoomIn}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        <span style={{ fontSize: 24, fontWeight: 400 }}>+</span>
      </button>
      <button 
        style={btnS} 
        onClick={handleZoomOut}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        <span style={{ fontSize: 24, fontWeight: 400 }}>−</span>
      </button>
      <button 
        style={btnS} 
        onClick={handleFit}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
    </div>
  );
}

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
  /** Modo do mapa: 'planning' (traçar rotas) ou 'tracking' (acompanhar motorista ao vivo). */
  mode?: 'planning' | 'tracking';
  /** Coordenadas atuais do motorista (para modo tracking). */
  driverPos?: LatLng;
  /** Coordenadas iniciais. */
  initialOrigin?: LatLng;
  initialDest?: LatLng;
  /** Callback ao clicar num veículo. */
  onVehicleClick?: (id: string) => void;
  /** Frota de veículos para mostrar no mapa. */
  vehicles?: Array<{
    id: string;
    lat: number;
    lng: number;
    label: string;
    driverName?: string;
    status: 'moving' | 'stopped';
    type?: 'truck' | 'van' | 'car';
  }>;
};

/**
 * Mapa OpenStreetMap (Leaflet) centrado no Brasil: marcadores, rota rodoviária real via OSRM.
 * Sem Google Maps — apenas tiles OSM + motor de rotas OSRM público.
 */
const OpenStreetRouteMap: React.FC<OpenStreetRouteMapProps> = ({ 
  height = 'min(72vh, 560px)', 
  className,
  mode = 'planning',
  driverPos,
  initialOrigin,
  initialDest,
  vehicles = [],
  onVehicleClick
}) => {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<LatLng | null>(initialOrigin || null);
  const [dest, setDest] = useState<LatLng | null>(initialDest || null);
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
    if (driverPos) pts.push([driverPos.lat, driverPos.lng]);
    vehicles.forEach(v => pts.push([v.lat, v.lng]));
    return pts;
  }, [route, origin, dest, driverPos, vehicles]);

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
        className="zaptro-dashboard-map-bw"
        style={{
          height,
          width: '100%',
          borderRadius: 24,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <style>{`
          .zaptro-grayscale-map .leaflet-tile-container {
            filter: grayscale(100%) brightness(0.9) contrast(1.1);
          }
          .leaflet-popup-content-wrapper {
            border-radius: 16px !important;
            padding: 4px !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
          }
          .leaflet-popup-tip {
            display: none !important;
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* Floating Tools Overlay - Glassmorphism */}
        {mode === 'planning' && (
          <div style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: 'calc(100% - 40px)',
            maxWidth: 800,
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(12px)',
              padding: '12px 16px',
              borderRadius: 20,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" onClick={() => setTool('origin')} style={overlayBtnStyle(tool === 'origin')}>Origem</button>
                <button type="button" onClick={() => setTool('dest')} style={overlayBtnStyle(tool === 'dest')}>Destino</button>
                <button type="button" onClick={() => setTool('pin')} style={overlayBtnStyle(tool === 'pin')}>+ Ponto</button>
              </div>

              <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.1)' }} />

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 200 }}>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: 'transparent',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#000',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Motorista...</option>
                  {selectableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void runRoute()}
                  disabled={loading || !origin || !dest}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#000',
                    color: '#D9FF00',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                    opacity: loading || !origin || !dest ? 0.5 : 1,
                  }}
                >
                  {loading ? 'A calcular...' : 'Gerar Rota'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={resetAll} style={{ ...overlayBtnStyle(false), color: '#ef4444' }}>Limpar</button>
                {canForwardRoute && (
                  <button onClick={openWhatsAppToDriver} style={{ ...overlayBtnStyle(false), background: '#10b981', color: '#fff', border: 'none' }}>
                    <Send size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Instruction Tooltip */}
            {tool && (
              <div style={{
                alignSelf: 'center',
                background: '#000',
                color: '#D9FF00',
                padding: '6px 14px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                animation: 'fadeInUp 0.2s ease-out'
              }}>
                {tool === 'origin' && 'Clique no mapa para definir a ORIGEM'}
                {tool === 'dest' && 'Clique no mapa para definir o DESTINO'}
                {tool === 'pin' && 'Clique para adicionar marcadores numerados'}
              </div>
            )}
          </div>
        )}

        {/* Floating Stats Badge */}
        <div style={{
          position: 'absolute',
          top: mode === 'planning' ? 100 : 20,
          left: 20,
          zIndex: 1000,
          backgroundColor: '#fff',
          color: '#000',
          padding: '10px 18px',
          borderRadius: 18,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D9FF00', boxShadow: '0 0 8px #D9FF00' }} />
          <span style={{ fontSize: 11, fontWeight: 900, color: '#64748B', letterSpacing: '0.05em' }}>ROTAS DE HOJE</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>{vehicles.length}</span>
        </div>

        <MapContainer 
          center={BRAZIL_CENTER} 
          zoom={BRAZIL_ZOOM} 
          className="zaptro-grayscale-map"
          style={{ height: '100%', width: '100%' }} 
          scrollWheelZoom
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickBridge tool={tool} onPick={handlePick} />
          <CustomMapControls fitPositions={fitPositions} />
          <FitBounds positions={fitPositions} />

          {origin && (
            <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
              <Popup><strong>Origem</strong></Popup>
            </Marker>
          )}
          {dest && (
            <Marker position={[dest.lat, dest.lng]} icon={destIcon}>
              <Popup><strong>Destino</strong></Popup>
            </Marker>
          )}
          
          {mode === 'tracking' && driverPos && (
            <Marker position={[driverPos.lat, driverPos.lng]} icon={ZAPTRO_MAP_DRIVER_ICON}>
              <Popup><strong>Posição Atual</strong></Popup>
            </Marker>
          )}

          {/* REAL-TIME FLEET MARKERS */}
          {vehicles.map((v) => (
            <Marker 
              key={v.id} 
              position={[v.lat, v.lng]} 
              icon={ZAPTRO_MAP_VEHICLE_ICON(v.type || 'truck', v.status)}
              eventHandlers={{
                click: () => {
                  if (onVehicleClick) onVehicleClick(v.id);
                }
              }}
            >
              <Popup>
                <div style={{ padding: '4px', minWidth: 160 }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase' }}>
                    MONITORAMENTO ZAPTRO
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#000', marginBottom: 2 }}>
                    {v.driverName || 'Motorista'}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    {v.label}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    marginTop: '10px',
                    fontSize: '10px',
                    fontWeight: 900,
                    color: v.status === 'moving' ? '#10B981' : '#64748B',
                    padding: '6px 10px',
                    background: v.status === 'moving' ? '#ecfdf5' : '#f1f5f9',
                    borderRadius: 8
                  }}>
                    <div style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      backgroundColor: v.status === 'moving' ? '#10B981' : '#64748B',
                      animation: v.status === 'moving' ? 'pulse 2s infinite' : 'none'
                    }} />
                    {v.status === 'moving' ? 'EM MOVIMENTO' : 'PARADO'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {freePins.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={freeIcon(p.n)}>
              <Popup>Marcador {p.n}</Popup>
            </Marker>
          ))}

          {route && (
            <>
              <Polyline
                positions={route.positions}
                color={ZAPTRO_MAP_ROUTE_COLORS.shadow}
                weight={10}
                opacity={0.15}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                positions={route.positions}
                color={ZAPTRO_MAP_ROUTE_COLORS.main}
                weight={5}
                opacity={1}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                positions={route.positions}
                color={ZAPTRO_MAP_ROUTE_COLORS.accent}
                weight={2}
                opacity={0.8}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}
        </MapContainer>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};


function overlayBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.1)',
    background: active ? '#000' : 'transparent',
    color: active ? '#D9FF00' : '#000',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };
}

export default OpenStreetRouteMap;
