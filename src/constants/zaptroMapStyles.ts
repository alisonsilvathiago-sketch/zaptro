import L from 'leaflet';

/**
 * Zaptro Premium Map Icons & Styles
 * Standardized across the entire platform.
 */

export const ZAPTRO_MAP_ORIGIN_ICON = L.divIcon({
  className: 'osrm-pin osrm-pin-origin',
  html: `
    <div style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)); transform: rotate(-45deg);">
      <svg width="42" height="42" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="10" width="40" height="60" rx="4" fill="#1a1a1a" />
        <rect x="33" y="13" width="34" height="18" rx="2" fill="#D9FF00" />
        <rect x="30" y="72" width="40" height="18" rx="4" fill="#1a1a1a" />
        <rect x="26" y="18" width="6" height="12" rx="2" fill="#000" />
        <rect x="68" y="18" width="6" height="12" rx="2" fill="#000" />
        <rect x="26" y="68" width="6" height="12" rx="2" fill="#000" />
        <rect x="68" y="68" width="6" height="12" rx="2" fill="#000" />
        <path d="M35 15 L65 15 L60 25 L40 25 Z" fill="rgba(255,255,255,0.2)" />
      </svg>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

export const ZAPTRO_MAP_DEST_ICON = L.divIcon({
  className: 'osrm-pin osrm-pin-dest',
  html: `
    <div style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); transform: rotate(135deg);">
      <svg width="42" height="42" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="10" width="40" height="60" rx="4" fill="#fff" stroke="#000" stroke-width="2" />
        <rect x="33" y="13" width="34" height="18" rx="2" fill="#000" />
        <rect x="30" y="72" width="40" height="18" rx="4" fill="#fff" stroke="#000" stroke-width="2" />
        <rect x="26" y="18" width="6" height="12" rx="2" fill="#333" />
        <rect x="68" y="18" width="6" height="12" rx="2" fill="#333" />
        <rect x="26" y="68" width="6" height="12" rx="2" fill="#333" />
        <rect x="68" y="68" width="6" height="12" rx="2" fill="#333" />
      </svg>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

export const ZAPTRO_MAP_DRIVER_ICON = L.divIcon({
  className: 'osrm-pin osrm-pin-driver',
  html: `
    <div style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5)); transform: scale(1.1);">
      <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="5" width="50" height="75" rx="6" fill="#000" />
        <rect x="30" y="10" width="40" height="22" rx="3" fill="#D9FF00" />
        <rect x="25" y="82" width="50" height="12" rx="4" fill="#000" />
        <rect x="20" y="15" width="8" height="15" rx="2" fill="#111" />
        <rect x="72" y="15" width="8" height="15" rx="2" fill="#111" />
        <rect x="20" y="70" width="8" height="15" rx="2" fill="#111" />
        <rect x="72" y="70" width="8" height="15" rx="2" fill="#111" />
        <path d="M32 12 L68 12 L63 25 L37 25 Z" fill="rgba(255,255,255,0.25)" />
      </svg>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

export const ZAPTRO_MAP_VEHICLE_ICON = (type: 'truck' | 'van' | 'car' = 'truck', status: 'moving' | 'stopped' = 'moving') => {
  const color = status === 'moving' ? '#D9FF00' : '#FFF';
  const shadow = status === 'moving' ? 'rgba(217, 255, 0, 0.6)' : 'rgba(0,0,0,0.2)';
  
  return L.divIcon({
    className: 'zaptro-vehicle-marker',
    html: `
      <div style="filter: drop-shadow(0 4px 12px ${shadow}); transform: scale(1.1); transition: all 0.3s ease;">
        <svg width="42" height="42" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <rect x="25" y="15" width="50" height="60" rx="8" fill="#000" />
          <rect x="30" y="20" width="40" height="22" rx="4" fill="${color}" />
          <rect x="25" y="70" width="50" height="10" rx="4" fill="#000" />
          <circle cx="35" cy="80" r="6" fill="#111" />
          <circle cx="65" cy="80" r="6" fill="#111" />
          <path d="M35 22 L65 22 L62 32 L38 32 Z" fill="rgba(255,255,255,0.25)" />
        </svg>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

export const ZAPTRO_MAP_ROUTE_COLORS = {
  main: '#000000',
  accent: '#D9FF00',
  traveled: '#000000', // Black line for tracking
  shadow: 'rgba(0,0,0,0.15)',
};

