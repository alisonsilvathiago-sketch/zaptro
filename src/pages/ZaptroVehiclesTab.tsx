import React, { useState } from 'react';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { Search, Plus, Truck, Edit2, Trash2, Navigation, User, RefreshCw, X } from 'lucide-react';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';

export const ZaptroVehiclesTab: React.FC = () => {
  const { palette } = useZaptroTheme();
  const d = palette.mode === 'dark';
  const border = palette.sidebarBorder;
  const surface = d ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const surface2 = d ? 'rgba(255,255,255,0.06)' : palette.searchBg;

  // Mock data for UI demonstration
  const [vehicles, setVehicles] = useState([
    { id: 'v1', plate: 'ABC-1234', type: 'Caminhão', model: 'Volvo FH', brand: 'Volvo', year: '2022', status: 'disponivel', driver: 'João Silva' },
    { id: 'v2', plate: 'XYZ-9876', type: 'Van', model: 'Sprinter', brand: 'Mercedes', year: '2023', status: 'em_rota', driver: 'Alison Silva' },
    { id: 'v3', plate: 'DEF-5678', type: 'Carro', model: 'Fiorino', brand: 'Fiat', year: '2020', status: 'inativo', driver: null }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = vehicles.filter(v => v.plate.toLowerCase().includes(searchTerm.toLowerCase()) || v.model.toLowerCase().includes(searchTerm.toLowerCase()));

  const getStatusColor = (s: string) => {
    if (s === 'disponivel') return '#22c55e';
    if (s === 'em_rota') return '#eab308';
    return '#ef4444';
  };

  const getStatusLabel = (s: string) => {
    if (s === 'disponivel') return 'Disponível';
    if (s === 'em_rota') return 'Em rota';
    return 'Inativo';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flex: '1 1 320px', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 12, backgroundColor: surface2, padding: '12px 18px', borderRadius: 16, border: `1px solid ${border}` }}>
            <Search size={18} color={palette.textMuted} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar placa, modelo..."
              style={{ border: 'none', outline: 'none', fontSize: 14, fontWeight: 700, width: '100%', color: palette.text, backgroundColor: 'transparent', fontFamily: 'inherit' }}
            />
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 16, backgroundColor: palette.lime, color: '#000', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Plus size={18} strokeWidth={2.5} /> Novo Veículo
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
        {filtered.map(v => (
          <div key={v.id} style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 22, padding: 22, boxShadow: d ? 'none' : ZAPTRO_SHADOW.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: d ? 'rgba(217,255,0,0.1)' : '#EEFCEF', border: `1px solid ${d ? 'rgba(217,255,0,0.2)' : border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={22} color={palette.lime} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: palette.text, letterSpacing: '-0.02em' }}>{v.plate}</h4>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: palette.textMuted }}>{v.brand} {v.model} ({v.year})</p>
                </div>
              </div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: getStatusColor(v.status) }} title={getStatusLabel(v.status)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18, paddingLeft: 60 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '4px 8px', borderRadius: 6, backgroundColor: surface2, fontSize: 10, fontWeight: 700, color: palette.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {v.type}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: palette.textMuted }}>{getStatusLabel(v.status)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={14} color={palette.textMuted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: v.driver ? palette.text : palette.textMuted }}>
                  {v.driver || 'Sem motorista vinculado'}
                </span>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button title="Ver rota atual" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => notifyZaptro('info', 'Em breve', 'Integração de rota ao vivo do veículo')}>
                <Navigation size={16} />
              </button>
              <button title="Trocar motorista" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => notifyZaptro('info', 'Em breve', 'Vincular motorista')}>
                <RefreshCw size={16} />
              </button>
              <button title="Editar veículo" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setShowModal(true)}>
                <Edit2 size={16} />
              </button>
              <button title="Desativar" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${border}`, backgroundColor: surface2, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => notifyZaptro('info', 'Em breve', 'Desativar veículo')}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo Veículo */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, backgroundColor: d ? 'rgba(0,0,0,0.65)' : 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: 'min(500px, 100%)', backgroundColor: surface, borderRadius: 22, border: `1px solid ${border}`, padding: 28, boxShadow: ZAPTRO_SHADOW.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: palette.text, letterSpacing: '-0.02em' }}>Cadastrar Veículo</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: palette.textMuted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: palette.text, letterSpacing: '0.12em', marginBottom: 8 }}>PLACA</label>
                  <input placeholder="ABC-1234" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.text, fontWeight: 600, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: palette.text, letterSpacing: '0.12em', marginBottom: 8 }}>TIPO</label>
                  <select style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.text, fontWeight: 600, boxSizing: 'border-box', WebkitAppearance: 'none' }}>
                    <option>Caminhão</option>
                    <option>Van</option>
                    <option>Carro</option>
                    <option>Moto</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: palette.text, letterSpacing: '0.12em', marginBottom: 8 }}>MARCA</label>
                  <input placeholder="Ex: Mercedes" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.text, fontWeight: 600, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: palette.text, letterSpacing: '0.12em', marginBottom: 8 }}>MODELO</label>
                  <input placeholder="Ex: Sprinter" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.text, fontWeight: 600, boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: palette.text, letterSpacing: '0.12em', marginBottom: 8 }}>VÍNCULO DE MOTORISTA</label>
                <select style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${border}`, backgroundColor: surface2, color: palette.text, fontWeight: 600, boxSizing: 'border-box', WebkitAppearance: 'none' }}>
                  <option>Sem vínculo no momento</option>
                  <option>Alison Silva</option>
                  <option>João Santos</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${border}`, backgroundColor: 'transparent', color: palette.text, fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={() => { notifyZaptro('success', 'Salvo', 'Veículo guardado localmente (mock)'); setShowModal(false); }} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', backgroundColor: palette.lime, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
                  Salvar Veículo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
