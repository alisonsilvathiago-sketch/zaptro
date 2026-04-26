import React, { useState } from 'react';
import {
  MapPin, Navigation, Truck, Clock, CheckCircle2, AlertCircle,
  Circle, Plus, Send, ChevronRight, Users, Route, Zap,
  BarChart3, X, MessageSquare
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import OpenStreetRouteMap from '../components/OpenStreetRouteMap';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { ZAPTRO_DEMO_VEHICLES } from '../constants/zaptroVehiclesDemo';

const LIME = '#D9FF00';

type RouteStatus = 'em_rota' | 'pendente' | 'concluido' | 'erro';

interface RouteCard {
  id: string;
  client: string;
  driver: string;
  origin: string;
  destination: string;
  km: string;
  eta: string;
  status: RouteStatus;
  time: string;
}

const MOCK_ROUTES: RouteCard[] = [
  { id: 'RT-0041', client: 'Silva Logística', driver: 'João Pereira', origin: 'São Paulo, SP', destination: 'Rio de Janeiro, RJ', km: '429 km', eta: '5h 20min', status: 'em_rota', time: '08:30' },
  { id: 'RT-0042', client: 'Norte Frete', driver: 'Carlos Lima', origin: 'Curitiba, PR', destination: 'Porto Alegre, RS', km: '336 km', eta: '4h 10min', status: 'pendente', time: '10:00' },
  { id: 'RT-0040', client: 'Mega Trans', driver: 'Ana Santos', origin: 'Belo Horizonte, MG', destination: 'Vitória, ES', km: '521 km', eta: '6h 45min', status: 'concluido', time: '06:00' },
  { id: 'RT-0039', client: 'Expresso Sul', driver: 'Pedro Costa', origin: 'Florianópolis, SC', destination: 'Joinville, SC', km: '180 km', eta: '2h 30min', status: 'erro', time: '07:15' },
];

const STATUS_CONFIG: Record<RouteStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  em_rota:  { label: 'Em rota',   color: '#f59e0b', bg: '#fef3c710', icon: Navigation },
  pendente: { label: 'Pendente',  color: '#94a3b8', bg: '#f1f5f910', icon: Circle },
  concluido:{ label: 'Concluído', color: '#10b981', bg: '#d1fae510', icon: CheckCircle2 },
  erro:     { label: 'Erro',      color: '#ef4444', bg: '#fee2e210', icon: AlertCircle },
};

const ZaptroOpenStreetMap: React.FC = () => {
  const { palette } = useZaptroTheme();
  const isDark = palette.mode === 'dark';
  const [activeTab, setActiveTab] = useState<'mapa' | 'rotas'>('mapa');
  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RouteStatus | 'all'>('all');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [client, setClient] = useState('');
  const [driver, setDriver] = useState('');

  const filtered = MOCK_ROUTES.filter(r => filterStatus === 'all' || r.status === filterStatus);

  const stats = {
    em_rota: MOCK_ROUTES.filter(r => r.status === 'em_rota').length,
    pendente: MOCK_ROUTES.filter(r => r.status === 'pendente').length,
    concluido: MOCK_ROUTES.filter(r => r.status === 'concluido').length,
    erro: MOCK_ROUTES.filter(r => r.status === 'erro').length,
  };

  const fleetForMap = ZAPTRO_DEMO_VEHICLES.map((v, i) => ({
    id: v.id,
    lat: -23.5505 + (i * 0.05), // Simulated coords around SP
    lng: -46.6333 + (i * 0.08),
    label: `${v.model} (${v.plate})`,
    status: v.status === 'em_rota' ? 'moving' as const : 'stopped' as const,
    type: (v.type.toLowerCase().includes('van') ? 'van' : v.type.toLowerCase().includes('caminhão') ? 'truck' : 'car') as any
  }));

  const cardBg = isDark ? '#1a1a1a' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const textColor = palette.text;
  const mutedColor = palette.textMuted;
  const panelBg = isDark ? '#111' : '#f8fafc';

  return (
    <ZaptroLayout contentFullWidth>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 0 }}>

        {/* ─── SIDEBAR ─────────────────────────────────── */}
        <aside style={{
          width: 340,
          minWidth: 300,
          maxWidth: 360,
          background: panelBg,
          borderRight: `1px solid ${border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '24px 24px 16px', borderBottom: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: LIME, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Route size={18} color="#000" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: textColor, letterSpacing: '-0.02em' }}>Central de Rotas</h1>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Controle Logístico</p>
                </div>
              </div>
              <button
                onClick={() => setNewRouteOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10, border: 'none',
                  background: LIME, color: '#000', fontWeight: 700, fontSize: 12,
                  cursor: 'pointer', letterSpacing: '-0.01em'
                }}
              >
                <Plus size={14} strokeWidth={3} /> Nova
              </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { key: 'em_rota', label: 'Em Rota', value: stats.em_rota },
                { key: 'pendente', label: 'Pendentes', value: stats.pendente },
                { key: 'concluido', label: 'Concluídas', value: stats.concluido },
                { key: 'erro', label: 'Com Erro', value: stats.erro },
              ] as const).map(({ key, label, value }) => {
                const cfg = STATUS_CONFIG[key];
                const active = filterStatus === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(active ? 'all' : key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: `1.5px solid ${active ? cfg.color : border}`,
                      background: active ? `${cfg.color}15` : cardBg,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color }}>{value}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: mutedColor, marginTop: 2 }}>{label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Route list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: mutedColor, fontSize: 13, fontWeight: 600 }}>
                Nenhuma rota encontrada.
              </div>
            )}
            {filtered.map((route) => {
              const cfg = STATUS_CONFIG[route.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={route.id}
                  style={{
                    borderRadius: 14, border: `1px solid ${border}`,
                    background: cardBg, padding: '14px 16px',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: textColor }}>{route.id}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: mutedColor }}>{route.client}</div>
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: `${cfg.color}20`, color: cfg.color
                    }}>
                      <Icon size={11} /> {cfg.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textColor, fontWeight: 600 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                      {route.origin}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textColor, fontWeight: 600 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                      {route.destination}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: mutedColor }}>
                        <Navigation size={11} /> {route.km}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: mutedColor }}>
                        <Clock size={11} /> {route.eta}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: mutedColor }}>
                      <Truck size={11} /> {route.driver}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button
                      onClick={() => notifyZaptro('success', 'WhatsApp', `Link da rota ${route.id} enviado para ${route.driver}.`)}
                      style={{
                        flex: 1, padding: '6px 0', border: `1px solid ${border}`,
                        borderRadius: 8, background: 'transparent', color: textColor,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}
                    >
                      <MessageSquare size={11} /> WhatsApp
                    </button>
                    <button
                      onClick={() => notifyZaptro('info', route.id, `Detalhes da rota ${route.id} carregados.`)}
                      style={{
                        flex: 1, padding: '6px 0', border: `1px solid ${LIME}`,
                        borderRadius: 8, background: `${LIME}20`, color: isDark ? LIME : '#5a6000',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}
                    >
                      <ChevronRight size={11} /> Detalhes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ─── MAP AREA ─────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* Map top bar */}
          <div style={{
            padding: '14px 20px', borderBottom: `1px solid ${border}`,
            background: isDark ? '#0d0d0d' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MapPin size={18} color={LIME.replace('#D9FF00', isDark ? '#D9FF00' : '#5a6000')} strokeWidth={2.5} />
              <span style={{ fontWeight: 700, fontSize: 14, color: textColor }}>Visualização em tempo real</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase',
                background: '#10b98115', padding: '3px 10px', borderRadius: 999
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                AO VIVO
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { icon: BarChart3, label: 'Estatísticas' },
                { icon: Users, label: 'Motoristas' },
                { icon: Zap, label: 'Despacho' },
              ] as const).map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => notifyZaptro('info', label, `Módulo "${label}" em desenvolvimento.`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`,
                    background: 'transparent', color: textColor, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* The Map */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <OpenStreetRouteMap height="100%" vehicles={fleetForMap} />
          </div>
        </div>
      </div>

      {/* ─── NEW ROUTE MODAL (lateral slide-in) ───────── */}
      {newRouteOpen && (
        <>
          <div
            onClick={() => setNewRouteOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
              zIndex: 1000, backdropFilter: 'blur(2px)'
            }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
            background: isDark ? '#111' : '#fff',
            borderLeft: `1px solid ${border}`,
            zIndex: 1001, display: 'flex', flexDirection: 'column',
            animation: 'slideFromRight 0.25s ease-out'
          }}>
            <style>{`
              @keyframes slideFromRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>

            {/* Header */}
            <div style={{ padding: '24px 28px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: textColor, letterSpacing: '-0.03em' }}>Nova Rota</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: mutedColor }}>Criar e despachar rota para motorista</p>
              </div>
              <button onClick={() => setNewRouteOpen(false)} style={{ border: 'none', background: 'transparent', color: mutedColor, cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {([
                { label: 'Origem', value: origin, set: setOrigin, placeholder: 'Ex: São Paulo, SP', icon: '🟢' },
                { label: 'Destino', value: destination, set: setDestination, placeholder: 'Ex: Rio de Janeiro, RJ', icon: '🔴' },
                { label: 'Cliente / Referência', value: client, set: setClient, placeholder: 'Ex: Silva Logística', icon: '🏢' },
                { label: 'Motorista', value: driver, set: setDriver, placeholder: 'Selecionar motorista...', icon: '🚛' },
              ]).map(({ label, value, set, placeholder, icon }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: mutedColor, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {icon} {label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    style={{
                      width: '100%', padding: '12px 16px',
                      borderRadius: 12, border: `1.5px solid ${border}`,
                      background: isDark ? '#1a1a1a' : '#f8fafc',
                      color: textColor, fontSize: 14, fontWeight: 600,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => (e.target.style.borderColor = LIME)}
                    onBlur={e => (e.target.style.borderColor = border)}
                  />
                </div>
              ))}

              {/* Route preview box (simulated) */}
              {origin && destination && (
                <div style={{
                  padding: 16, borderRadius: 14, border: `1.5px solid ${LIME}40`,
                  background: `${LIME}08`
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6000', marginBottom: 10, textTransform: 'uppercase' }}>📍 Resumo da Rota</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: mutedColor }}>Distância</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>~429 km</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: mutedColor }}>Tempo est.</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>5h 20min</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: mutedColor }}>Tipo</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>Rodoviário</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{ padding: '20px 28px', borderTop: `1px solid ${border}`, display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setNewRouteOpen(false);
                  notifyZaptro('success', 'Rota criada', 'Rota RT-0045 criada e enviada ao motorista.');
                }}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: 12, border: 'none',
                  background: LIME, color: '#000', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <Send size={16} strokeWidth={2.5} /> Criar & Enviar
              </button>
              <button
                onClick={() => setNewRouteOpen(false)}
                style={{
                  padding: '14px 18px', borderRadius: 12, border: `1.5px solid ${border}`,
                  background: 'transparent', color: mutedColor, fontWeight: 700, fontSize: 14, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </ZaptroLayout>
  );
};

export default ZaptroOpenStreetMap;
