import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Shipment } from '../types';

// Fix para ícones do Leaflet que as vezes somem no build do React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { 
  ZAPTRO_MAP_ORIGIN_ICON, 
  ZAPTRO_MAP_DEST_ICON, 
  ZAPTRO_MAP_DRIVER_ICON,
  ZAPTRO_MAP_ROUTE_COLORS 
} from '../constants/zaptroMapStyles';

const DefaultIcon = ZAPTRO_MAP_DRIVER_ICON;
L.Marker.prototype.options.icon = DefaultIcon;

interface RouteMapProps {
  stops: Shipment[];
  center?: [number, number];
}

// Componente para re-centralizar o mapa quando os pontos mudarem
const ChangeView: React.FC<{ coords: [number, number] }> = ({ coords }) => {
  const map = useMap();
  map.setView(coords, map.getZoom());
  return null;
};

const RouteMap: React.FC<RouteMapProps> = ({ stops, center = [-23.5505, -46.6333] }) => {
  // Coletar todas as coordenadas para a linha (Polyline) - Filtrar paradas sem coordenadas
  const validStops = stops.filter(s => s.lat !== null && s.lat !== undefined && s.lng !== null && s.lng !== undefined);
  const sortedCoords: [number, number][] = validStops.map(s => [s.lat, s.lng]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '300px', borderRadius: '16px', overflow: 'hidden' }}>
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Renderizar Marcadores para cada parada válida */}
        {validStops.map((stop, index) => (
          <Marker key={stop.id} position={[stop.lat, stop.lng]}>
            <Popup>
              <div style={{ padding: '4px' }}>
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Parada {index + 1}</strong>
                <span>{stop.client?.name || 'Cliente'}</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>{stop.description || 'Entrega agendada'}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Desenhar a linha que conecta as paradas */}
        {sortedCoords.length > 1 && (
          <Polyline
            positions={sortedCoords}
            color={ZAPTRO_MAP_ROUTE_COLORS.main}
            weight={6}
            opacity={1}
            lineCap="round"
            lineJoin="round"
          />
          <Polyline
            positions={sortedCoords}
            color={ZAPTRO_MAP_ROUTE_COLORS.accent}
            weight={3}
            opacity={0.8}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Centralizar no primeiro ponto se disponível */}
        {validStops.length > 0 && <ChangeView coords={[validStops[0].lat, validStops[0].lng]} />}
      </MapContainer>
    </div>
  );
};

export default RouteMap;
