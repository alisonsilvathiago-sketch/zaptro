import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Truck, Calendar, User, 
  Settings, Shield, Fuel, Gauge, 
  Wrench, Activity, AlertCircle, CheckCircle2,
  Clock, MapPin, ChevronRight, BarChart3,
  MessageSquare, FileText
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { useZaptroTheme } from '../context/ZaptroThemeContext';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { ZAPTRO_DEMO_VEHICLES } from '../constants/zaptroVehiclesDemo';
import type { ZaptroVehicleDemo } from '../constants/zaptroVehiclesDemo';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';

const ZaptroVehicleProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { palette } = useZaptroTheme();
  const isDark = palette.mode === 'dark';
  const border = palette.sidebarBorder;
  
  const [vehicle, setVehicle] = useState<ZaptroVehicleDemo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'maintenance' | 'history'>('info');

  useEffect(() => {
    // Simulating API fetch
    const timer = setTimeout(() => {
      const found = ZAPTRO_DEMO_VEHICLES.find(v => v.id === id);
      setVehicle(found || null);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [id]);

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'disponivel':
        return { label: 'DISPONÍVEL', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'em_rota':
        return { label: 'EM ROTA', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'manutencao':
        return { label: 'MANUTENÇÃO', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
      default:
        return { label: 'INATIVO', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' };
    }
  };

  const status = getStatusConfig(vehicle?.status);

  if (loading) {
    return (
      <ZaptroLayout>
        <div style={{ padding: 48, textAlign: 'center', color: palette.textMuted }}>
          <Activity className="animate-pulse" size={40} />
          <p style={{ marginTop: 12, fontWeight: 700 }}>Carregando dados do veículo...</p>
        </div>
      </ZaptroLayout>
    );
  }

  if (!vehicle) {
    return (
      <ZaptroLayout>
        <div style={{ padding: 48, textAlign: 'center' }}>
          <AlertCircle size={48} color="#EF4444" />
          <h2 style={{ color: palette.text, marginTop: 16 }}>Veículo não encontrado</h2>
          <button 
            onClick={() => navigate(ZAPTRO_ROUTES.DRIVERS)} // Fleet is inside Drivers tab
            style={{ marginTop: 24, padding: '12px 24px', backgroundColor: '#000', color: '#D9FF00', borderRadius: 14, border: 'none', fontWeight: 700, cursor: 'pointer' }}
          >
            Voltar para Frota
          </button>
        </div>
      </ZaptroLayout>
    );
  }

  return (
    <ZaptroLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px' }}>
        
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => navigate(ZAPTRO_ROUTES.DRIVERS)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 0',
            background: 'transparent',
            border: 'none',
            color: palette.textMuted,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            marginBottom: 20
          }}
        >
          <ArrowLeft size={18} /> Voltar para Frota
        </button>

        {/* Header Section - Premium Style */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          gap: 24, 
          flexWrap: 'wrap',
          marginBottom: 32 
        }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ 
              width: 100, 
              height: 100, 
              borderRadius: 28, 
              backgroundColor: '#000', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: ZAPTRO_SHADOW.lg
            }}>
              <Truck size={48} color="#D9FF00" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', color: palette.text }}>
                  {vehicle.plate}
                </h1>
                <span style={{ 
                  padding: '6px 14px', 
                  borderRadius: 99, 
                  backgroundColor: status.bg, 
                  color: status.color, 
                  fontSize: 11, 
                  fontWeight: 900,
                  letterSpacing: '0.05em'
                }}>
                  {status.label}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: palette.textMuted }}>
                {vehicle.brand} {vehicle.model} · {vehicle.year}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ 
              padding: '12px 20px', 
              borderRadius: 16, 
              border: `1px solid ${border}`, 
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', 
              color: palette.text, 
              fontWeight: 700, 
              fontSize: 14, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              cursor: 'pointer'
            }}>
              <Settings size={18} /> Editar Ativo
            </button>
            <button style={{ 
              padding: '12px 24px', 
              borderRadius: 16, 
              backgroundColor: '#000', 
              color: '#D9FF00', 
              border: 'none', 
              fontWeight: 700, 
              fontSize: 14, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              cursor: 'pointer'
            }}>
              <MapPin size={18} /> Ver no Mapa
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              padding: '8px 18px',
              borderRadius: 14,
              backgroundColor: activeTab === 'info' ? '#000' : 'transparent',
              color: activeTab === 'info' ? '#D9FF00' : palette.textMuted,
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Especificações
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            style={{
              padding: '8px 18px',
              borderRadius: 14,
              backgroundColor: activeTab === 'maintenance' ? '#000' : 'transparent',
              color: activeTab === 'maintenance' ? '#D9FF00' : palette.textMuted,
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Manutenções
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 18px',
              borderRadius: 14,
              backgroundColor: activeTab === 'history' ? '#000' : 'transparent',
              color: activeTab === 'history' ? '#D9FF00' : palette.textMuted,
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Histórico Operacional
          </button>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
          
          {/* Left Column - Details */}
          <div style={{ gridColumn: 'span 8' }}>
            
            {/* Quick Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 20, 
              marginBottom: 24 
            }}>
              <div style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', 
                border: `1px solid ${border}`, 
                borderRadius: 24, 
                padding: 24,
                boxShadow: ZAPTRO_SHADOW.xs
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Fuel size={18} color={palette.lime} />
                  <span style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, letterSpacing: '0.05em' }}>COMBUSTÍVEL</span>
                </div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: palette.text }}>{vehicle.fuelType || 'N/A'}</p>
              </div>
              <div style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', 
                border: `1px solid ${border}`, 
                borderRadius: 24, 
                padding: 24,
                boxShadow: ZAPTRO_SHADOW.xs
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Gauge size={18} color={palette.lime} />
                  <span style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, letterSpacing: '0.05em' }}>CAPACIDADE</span>
                </div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: palette.text }}>{vehicle.loadCapacity || 'N/A'}</p>
              </div>
              <div style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', 
                border: `1px solid ${border}`, 
                borderRadius: 24, 
                padding: 24,
                boxShadow: ZAPTRO_SHADOW.xs
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Shield size={18} color={palette.lime} />
                  <span style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, letterSpacing: '0.05em' }}>SEGURO</span>
                </div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: palette.text }}>ATIVO</p>
              </div>
            </div>

            {/* AI Summary Section - High Contrast Style */}
            <div style={{ 
              backgroundColor: '#000', 
              borderRadius: 28, 
              padding: 32, 
              color: '#fff',
              marginBottom: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#D9FF00', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                   <BarChart3 size={20} color="#000" style={{ margin: '0 auto' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>Resumo Inteligente do Ativo</h3>
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                Este veículo Volvo FH 540 está operando com <span style={{ color: '#D9FF00', fontWeight: 900 }}>98% de eficiência</span>. 
                A última revisão foi realizada há 120 dias. Próxima manutenção preventiva sugerida em 30 dias com foco no sistema de freios. 
                O consumo médio está 4% acima da frota, sugere-se conferir calibragem e modo de condução do motorista vinculado.
              </p>
            </div>

            {/* Content based on Active Tab */}
            <div style={{ 
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff', 
              border: `1px solid ${border}`, 
              borderRadius: 28, 
              padding: 32 
            }}>
              {activeTab === 'info' && (
                <div>
                  <h3 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 900, color: palette.text }}>Informações Técnicas</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                    <div>
                       <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8 }}>CATEGORIA</label>
                       <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{vehicle.type}</p>
                       <div style={{ height: 1, backgroundColor: border, margin: '16px 0' }} />
                       <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8 }}>MARCA / MODELO</label>
                       <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{vehicle.brand} {vehicle.model}</p>
                       <div style={{ height: 1, backgroundColor: border, margin: '16px 0' }} />
                       <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8 }}>ANO FABRICAÇÃO</label>
                       <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{vehicle.year}</p>
                    </div>
                    <div>
                       <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8 }}>MOTORISTA ATUAL</label>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? palette.searchBg : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <User size={16} />
                          </div>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{vehicle.driver || 'Não vinculado'}</p>
                       </div>
                       <div style={{ height: 1, backgroundColor: border, margin: '16px 0' }} />
                       <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8 }}>TIPO DE CARGA</label>
                       <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>Grãos, Cargas Pesadas</p>
                       <div style={{ height: 1, backgroundColor: border, margin: '16px 0' }} />
                       <label style={{ fontSize: 11, fontWeight: 900, color: palette.textMuted, display: 'block', marginBottom: 8 }}>LICENCIAMENTO</label>
                       <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#10B981' }}>OK · Vencimento 10/2024</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: palette.text }}>Plano de Manutenção</h3>
                    <button style={{ 
                      padding: '8px 16px', 
                      borderRadius: 12, 
                      backgroundColor: '#000', 
                      color: '#fff', 
                      border: 'none', 
                      fontSize: 12, 
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}>
                      Registrar Nova
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ 
                      padding: 20, 
                      borderRadius: 20, 
                      border: `1px solid ${border}`, 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle2 size={20} color="#10B981" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: palette.text }}>Troca de Óleo e Filtros</p>
                          <p style={{ margin: 0, fontSize: 13, color: palette.textMuted, fontWeight: 600 }}>Finalizado em 15/11/2023 · Oficina Volvo Autorizada</p>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: palette.text }}>R$ 2.450,00</p>
                    </div>
                    
                    <div style={{ 
                      padding: 20, 
                      borderRadius: 20, 
                      border: `1px solid ${border}`, 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock size={20} color="#F59E0B" />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: palette.text }}>Revisão do Sistema de Freios</p>
                          <p style={{ margin: 0, fontSize: 13, color: palette.textMuted, fontWeight: 600 }}>Agendado para 15/05/2024 · Próxima Parada</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 900, padding: '4px 10px', borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>PENDENTE</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                   <h3 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 900, color: palette.text }}>Timeline de Operações</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {[
                        { time: 'Hoje, 10:45', action: 'Início de Rota', desc: 'Viagem iniciada para Porto de Santos (SP)', type: 'start' },
                        { time: 'Ontem, 18:20', action: 'Fim de Jornada', desc: 'Veículo estacionado no Pátio 02', type: 'stop' },
                        { time: '22 Abr, 09:15', action: 'Abastecimento', desc: '450L Diesel S10 · Posto Graal', type: 'fuel' }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 20 }}>
                           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: palette.lime, border: '3px solid #000' }} />
                              {idx < 2 && <div style={{ width: 2, flex: 1, backgroundColor: border }} />}
                           </div>
                           <div style={{ paddingBottom: 32 }}>
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: palette.textMuted, letterSpacing: '0.05em' }}>{item.time.toUpperCase()}</p>
                              <p style={{ margin: '4px 0', fontSize: 15, fontWeight: 900, color: palette.text }}>{item.action}</p>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: palette.textMuted }}>{item.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar Info */}
          <div style={{ gridColumn: 'span 4' }}>
            
            {/* Driver Card */}
            <div style={{ 
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', 
              border: `1px solid ${border}`, 
              borderRadius: 28, 
              padding: 28,
              marginBottom: 24,
              boxShadow: ZAPTRO_SHADOW.sm
            }}>
              <h4 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 900, color: palette.text }}>Motorista Responsável</h4>
              {vehicle.driver ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: isDark ? 'rgba(217,255,0,0.1)' : '#EEFCEF', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                     <User size={24} color={palette.lime} style={{ margin: '0 auto' }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: palette.text }}>{vehicle.driver}</p>
                    <button style={{ 
                      margin: '4px 0 0', 
                      padding: 0, 
                      background: 'transparent', 
                      border: 'none', 
                      color: palette.lime, 
                      fontSize: 13, 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      Ver perfil <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <AlertCircle size={32} color={palette.textMuted} style={{ margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.textMuted }}>Sem motorista vinculado</p>
                  <button style={{ marginTop: 12, padding: '8px 16px', borderRadius: 12, backgroundColor: palette.lime, color: '#000', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Vincular Agora</button>
                </div>
              )}
            </div>

            {/* Compliance & Safety */}
            <div style={{ 
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', 
              border: `1px solid ${border}`, 
              borderRadius: 28, 
              padding: 28,
              boxShadow: ZAPTRO_SHADOW.sm
            }}>
              <h4 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 900, color: palette.text }}>Compliance & Segurança</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Shield size={16} color="#10B981" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>Seguro Carga</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#10B981' }}>ATIVO</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Wrench size={16} color="#10B981" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>Manutenção</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#10B981' }}>OK</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <FileText size={16} color="#10B981" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>Documentação</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#10B981' }}>OK</span>
                </div>
              </div>
              
              <div style={{ marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: 'rgba(217, 255, 0, 0.05)', border: `1px solid rgba(217, 255, 0, 0.2)` }}>
                 <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: palette.text, fontWeight: 600 }}>
                   Este veículo está <span style={{ fontWeight: 900 }}>100% regularizado</span> para trânsito nacional e internacional (Mercosul).
                 </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </ZaptroLayout>
  );
};

export default ZaptroVehicleProfile;
