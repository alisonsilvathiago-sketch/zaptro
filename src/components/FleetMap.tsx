import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, MapPin, Navigation, User, Package, Clock, Shield } from 'lucide-react';

// Corrigindo ícones padrão do Leaflet no React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const FleetMap: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    // Mock de veículos em movimento
    const mockVehicles = [
      { id: 1, name: 'Caminhão 01', lat: -23.5505, lng: -46.6333, status: 'moving', driver: 'João Silva', speed: '65 km/h' },
      { id: 2, name: 'Caminhão 04', lat: -23.5600, lng: -46.6500, status: 'stopped', driver: 'Maria Santos', speed: '0 km/h' },
    ];
    
    // Mock de remessas pendentes/em rota
    const mockShipments = [
      { id: 101, client: 'Indústria ABC', lat: -23.5700, lng: -46.6600, status: 'DELIVERY_PENDING' },
      { id: 102, client: 'Mercado Central', lat: -23.5400, lng: -46.6200, status: 'DELIVERY_PENDING' },
    ];

    setVehicles(mockVehicles);
    setShipments(mockShipments);
  }, []);

  return (
    <div style={styles.mapWrap}>
      <MapContainer 
        center={[-23.5505, -46.6333] as any} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* VEÍCULOS */}
        {vehicles.map(vehicle => (
          <Marker key={vehicle.id} position={[vehicle.lat, vehicle.lng] as any}>
            <Popup>
              <div style={styles.popup}>
                <div style={styles.popupHeader}>
                   <Truck size={16} color="var(--primary)" />
                   <h4 style={styles.pTitle}>{vehicle.name}</h4>
                </div>
                <div style={styles.pBody}>
                   <p style={styles.pText}><User size={12} /> {vehicle.driver}</p>
                   <p style={styles.pText}><Navigation size={12} /> Velocidade: <strong>{vehicle.speed}</strong></p>
                   <div style={{...styles.pStatus, backgroundColor: vehicle.status === 'moving' ? '#dcfce7' : '#fee2e2', color: vehicle.status === 'moving' ? '#166534' : '#991b1b'}}>
                      {vehicle.status === 'moving' ? 'Em Movimento' : 'Parado'}
                   </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ENTREGAS */}
        {shipments.map(shipment => (
          <Marker key={shipment.id} position={[shipment.lat, shipment.lng] as any}>
            <Popup>
              <div style={styles.popup}>
                <div style={{...styles.popupHeader, color: '#f59e0b'}}>
                   <Package size={16} />
                   <h4 style={styles.pTitle}>Entrega: {shipment.client}</h4>
                </div>
                <div style={styles.pBody}>
                   <p style={styles.pText}><Clock size={12} /> Previsão: Hoje, 15:30</p>
                   <p style={styles.pText}><Shield size={12} /> Carga Segurada</p>
                   <button style={styles.pBtn}>Ver Detalhes do Pedido</button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* FLOATING LEGEND */}
      <div style={styles.floatingPanel}>
         <h4 style={styles.panelTitle}>Monitoramento Ativo</h4>
         <div style={styles.panelRow}>
            <div style={{...styles.dot, backgroundColor: '#3b82f6'}} />
            <span>Veículos Ativos (45)</span>
         </div>
         <div style={styles.panelRow}>
            <div style={{...styles.dot, backgroundColor: '#f59e0b'}} />
            <span>Entregas Pendentes (12)</span>
         </div>
      </div>
    </div>
  );
};

const styles = {
  mapWrap: { height: '100%', width: '100%', borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' as const },
  popup: { minWidth: '180px', display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  popupHeader: { display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' },
  pTitle: { fontSize: '14px', fontWeight: '900', color: '#111827', margin: 0 },
  pBody: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  pText: { fontSize: '11px', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' },
  pStatus: { fontSize: '10px', fontWeight: '800', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' as const, marginTop: '4px' },
  pBtn: { marginTop: '8px', width: '100%', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },

  floatingPanel: { position: 'absolute' as const, top: '20px', right: '20px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000, display: 'flex', flexDirection: 'column' as const, gap: '10px', border: '1px solid white' },
  panelTitle: { fontSize: '12px', fontWeight: '900', color: '#111827', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  panelRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: '#475569' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' }
};

export default FleetMap;
