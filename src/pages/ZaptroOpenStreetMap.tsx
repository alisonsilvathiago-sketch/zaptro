import React from 'react';
import { MapPin } from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import OpenStreetRouteMap from '../components/OpenStreetRouteMap';
import { useZaptroTheme } from '../context/ZaptroThemeContext';

/**
 * Mapa OpenStreetMap + Leaflet com rota rodoviária real (OSRM).
 * Entrada no menu lateral: «Mapa» (/mapa).
 */
const ZaptroOpenStreetMap: React.FC = () => {
  const { palette } = useZaptroTheme();

  return (
    <ZaptroLayout>
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          margin: '0 auto',
          padding: '8px 0 48px',
          boxSizing: 'border-box',
        }}
      >
        <header style={{ marginBottom: 24 }}>
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: '0.12em',
              color: palette.textMuted,
            }}
          >
            FERRAMENTA
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <MapPin size={28} color={palette.text} strokeWidth={2.2} />
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 950,
                letterSpacing: '-0.03em',
                color: palette.text,
              }}
            >
              Mapa OpenStreetMap
            </h1>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 14, fontWeight: 600, color: palette.textMuted, maxWidth: 640, lineHeight: 1.5 }}>
            Visualização centrada no Brasil. Escolhe origem e destino, traça rota real em estrada (motor OSRM gratuito). Podes ainda
            adicionar marcadores livres. Sem Google Maps.
          </p>
        </header>

        <OpenStreetRouteMap height="min(70vh, 580px)" />
      </div>
    </ZaptroLayout>
  );
};

export default ZaptroOpenStreetMap;
