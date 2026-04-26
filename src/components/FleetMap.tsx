import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, Navigation, User, Package, Clock, Shield, Activity } from 'lucide-react';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { useNavigate } from 'react-router-dom';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { readRouteLive } from '../constants/zaptroRouteLiveStore';
import { ZAPTRO_MAP_ROUTE_HANDOFF_KEY, type ZaptroMapRouteHandoffPayload } from '../constants/zaptroMapRouteHandoff';

// Corrigindo ícones padrão do Leaflet no React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

import { 
  ZAPTRO_MAP_ORIGIN_ICON, 
  ZAPTRO_MAP_DEST_ICON, 
  ZAPTRO_MAP_DRIVER_ICON,
  ZAPTRO_MAP_VEHICLE_ICON,
  ZAPTRO_MAP_ROUTE_COLORS 
} from '../constants/zaptroMapStyles';

const DefaultIcon = ZAPTRO_MAP_DRIVER_ICON;
L.Marker.prototype.options.icon = DefaultIcon;

function CustomMapControls() {
  const map = useMap();
  
  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleFit = () => {
    map.setView([-23.5505, -46.6333], 13);
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

interface FleetMapProps {
  routes?: Array<{
    id: string;
    token: string;
    label: string;
    lat?: number;
    lng?: number;
    status: string;
  }>;
}

const FleetMap: React.FC<FleetMapProps> = ({ routes = [] }) => {
  const { palette } = useZaptroTheme();
  const isDark = palette.mode === 'dark';
  const navigate = useNavigate();
  
  // Combine internal mock for "fleet" (vehicles) with external "routes" (shipments)
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    // Keep some mock vehicles for visual fullness
    const mockVehicles = [
      { id: 'v1', name: 'Caminhão 01', lat: -23.5505, lng: -46.6333, status: 'moving', driver: 'João Silva', speed: '65 km/h', type: 'truck' },
      { id: 'v2', name: 'Caminhão 04', lat: -23.5600, lng: -46.6500, status: 'stopped', driver: 'Maria Santos', speed: '0 km/h', type: 'van' },
    ];
    setVehicles(mockVehicles);
  }, []);

  // Map real routes to markers
  const activeMarkers = useMemo(() => {
    return routes.map(r => {
      const live = readRouteLive(r.token);
      return {
        ...r,
        lat: live?.lastLat ?? -23.5505 + (Math.random() - 0.5) * 0.1, // Fallback to random SP if no GPS yet
        lng: live?.lastLng ?? -46.6333 + (Math.random() - 0.5) * 0.1,
        liveStatus: live?.status || 'assigned'
      };
    });
  }, [routes]);

  const tile = isDark
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
    <div style={styles.mapWrap}>
      <div
        className={`zaptro-dashboard-map-bw ${isDark ? 'zaptro-dashboard-map-bw--dark' : 'zaptro-dashboard-map-bw--light'}`}
        style={{ height: '100%', width: '100%' }}
      >
        <MapContainer
          center={[-23.5505, -46.6333] as any}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer attribution={tile.attribution} url={tile.url} />
          <CustomMapControls />

        {/* VEÍCULOS MOCK */}
        {vehicles.map(vehicle => (
          <Marker 
            key={vehicle.id} 
            position={[vehicle.lat, vehicle.lng] as any} 
            icon={ZAPTRO_MAP_VEHICLE_ICON(vehicle.type || 'truck', vehicle.status === 'moving' ? 'moving' : 'stopped')}
          >
            <Popup>
              <div style={styles.popup}>
                <div style={styles.popupHeader}>
                   <Truck size={16} color="var(--primary)" />
                   <h4 style={styles.pTitle}>{vehicle.name}</h4>
                </div>
                <div style={styles.pBody}>
                   <p style={styles.pText}><User size={12} /> {vehicle.driver}</p>
                   <p style={styles.pText}><Navigation size={12} /> Velocidade: <strong>{vehicle.speed}</strong></p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ROTAS REAIS (REAL-TIME) */}
        {activeMarkers.map(route => (
          <Marker 
            key={route.id} 
            position={[route.lat, route.lng] as any} 
            icon={ZAPTRO_MAP_DEST_ICON}
          >
            <Popup>
              <div style={styles.popup}>
                <div style={{...styles.popupHeader, color: '#f59e0b'}}>
                   <Package size={16} />
                   <h4 style={styles.pTitle}>{route.label}</h4>
                </div>
                <div style={styles.pBody}>
                   <p style={styles.pText}><Clock size={12} /> Token: {route.token}</p>
                   <p style={styles.pText}><Activity size={12} /> Status: <strong>{route.liveStatus}</strong></p>
                   <button
                     style={styles.pBtn}
                     onClick={() => navigate(`${ZAPTRO_ROUTES.ROUTES}?token=${route.token}`)}
                   >
                     Ver Detalhes Operacionais
                   </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        </MapContainer>
      </div>

      {/* FLOATING LEGEND */}
      <div style={styles.floatingPanel}>
         <h4 style={styles.panelTitle}>Monitoramento Live</h4>
         <div style={styles.panelRow}>
            <div style={{...styles.dot, backgroundColor: '#D9FF00'}} />
            <span>Veículos (Frota)</span>
         </div>
         <div style={styles.panelRow}>
            <div style={{...styles.dot, backgroundColor: '#f59e0b'}} />
            <span>Rotas Operacionais ({activeMarkers.length})</span>
         </div>
      </div>
    </div>
  );
};

const styles = {
  mapWrap: { height: '100%', width: '100%', borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' as const },
  popup: { minWidth: '180px', display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  popupHeader: { display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e8e8e8', paddingBottom: '8px' },
  pTitle: { fontSize: '14px', fontWeight: '700', color: '#000000', margin: 0 },
  pBody: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  pText: { fontSize: '11px', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' },
  pStatus: { fontSize: '10px', fontWeight: '600', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' as const, marginTop: '4px' },
  pBtn: { marginTop: '8px', width: '100%', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },

  floatingPanel: { position: 'absolute' as const, top: '20px', right: '20px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' as const, gap: '10px', border: '1px solid white' },
  panelTitle: { fontSize: '12px', fontWeight: '700', color: '#000000', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  panelRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: '#475569' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' }
};

export default FleetMap;
