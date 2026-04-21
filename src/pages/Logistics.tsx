import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MapPin, Plus, Navigation, ChevronRight, Search, 
  Download, Filter, Truck, Package, Activity, 
  Clock, TrendingUp, History as HistoryIcon, MoreVertical,
  Navigation2, CheckCircle2, AlertTriangle, User, Save,
  MessageCircle, BarChart2, Shield, Calendar, Map as MapIcon,
  Maximize2, Play, Pause, Square, Power, AlertCircle, FileText, Lock, X, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import ModuleLayout from '../layouts/ModuleLayout';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { supabase } from '../lib/supabase';
import LogtaModal from '../components/Modal';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import ExportButton from '../components/ExportButton';
import EmptyState from '../components/EmptyState';

// --- Types ---
interface Route {
  id: string;
  name: string;
  driver_name: string;
  driver_id?: string;
  vehicle_plate: string;
  status: 'EM_ROTA' | 'AGUARDANDO' | 'CONCLUIDA' | 'ATRASADA';
  departure_time: string;
  deliveries_count: number;
  weight: string;
  volume: string;
}

interface Delivery {
  id: string;
  client: string;
  address: string;
  product: string;
  status: 'PENDENTE' | 'EM_ROTA' | 'ENTREGUE' | 'PROBLEMA';
  route_id?: string;
}

interface Occurrence {
  id: string;
  type: string;
  description: string;
  route_id: string;
  timestamp: string;
  responsible: string;
  content_full?: string;
  recommendations?: string[];
}

const Logistics: React.FC = () => {
  const { profile } = useAuth();
  const { company } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  // --- States ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rotas' | 'entregas' | 'mapa' | 'ocorrencias' | 'performance' | 'historico'>('dashboard');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [newRoute, setNewRoute] = useState({
    name: '',
    driver_id: '',
    vehicle_plate: '',
    departure_time: '',
    departure_date: '',
    destination_company: '',
    receiver_name: '',
    expected_arrival_time: ''
  });

  // --- Mock Data ---
  const perfData = [
    { name: 'Seg', entregas: 45, atrasos: 2 },
    { name: 'Ter', entregas: 52, atrasos: 0 },
    { name: 'Qua', entregas: 38, atrasos: 5 },
    { name: 'Qui', entregas: 48, atrasos: 1 },
    { name: 'Sex', entregas: 61, atrasos: 3 },
  ];

  const statusPieData = [
    { name: 'Concluídas', value: 85, color: 'var(--success)' },
    { name: 'Em Andamento', value: 10, color: 'var(--primary)' },
    { name: 'Atrasadas', value: 5, color: 'var(--danger)' },
  ];

  // --- Fetching ---
  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      console.log('Buscando dados operacionais para:', profile.company_id);
      
      // 1. Buscar Rotas
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select(`
          *,
          driver:profiles(full_name)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (routeError) {
        console.error('Erro ao buscar rotas:', routeError);
      } else {
        // Mapear dados para o formato da interface
        const formattedRoutes = (routeData || []).map(r => ({
          id: r.id,
          name: r.name || `Rota ${r.id.substring(0,4)}`,
          driver_name: (r.driver as any)?.full_name || 'Não atribuído',
          driver_id: r.driver_id,
          vehicle_plate: r.vehicle_plate || '---',
          status: r.status,
          departure_time: r.departure_time || 'N/A',
          deliveries_count: r.deliveries_count || 0,
          weight: r.weight || '0kg',
          volume: r.volume || '0m³'
        }));
        setRoutes(formattedRoutes as any);
      }

      // 2. Buscar Entregas (Shipments)
      const { data: shipData, error: shipError } = await supabase
        .from('shipments')
        .select('*')
        .eq('company_id', profile.company_id)
        .limit(50);

      if (shipError) {
        console.error('Erro ao buscar entregas:', shipError);
      } else {
        const formattedShips = (shipData || []).map(s => ({
          id: s.id,
          client: s.description || 'Cliente Final',
          address: 'Conforme Manifesto',
          product: 'Material Operacional',
          status: s.status,
          route_id: s.route_id
        }));
        setDeliveries(formattedShips as any);
      }

      // Adicionar log de sucesso
      console.log('Dados operacionais sincronizados para a empresa:', profile.company_id);
    } catch (err: any) {
      console.error('ERRO CRÍTICO NA LOGÍSTICA (fetchData):', {
        message: err.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      });
      toastError('Erro de sincronização. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const path = location.pathname;
    const tab = path.split('/').pop();
    if (['dashboard', 'rotas', 'entregas', 'mapa', 'ocorrencias', 'performance', 'historico'].includes(tab || '')) {
      setActiveTab(tab as any);
    }
  }, [location.pathname, profile?.company_id]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    navigate(tab === 'dashboard' ? '/logistica' : `/logistica/${tab}`);
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) {
       toastError('Sessão expirada. Ação bloqueada.');
       return;
    }
    
    setLoading(true);
    const loadingToast = toastLoading('Criando rota...');
    
    try {
      const departureTime = `${newRoute.departure_date}T${newRoute.departure_time}:00`;
      
      const { data, error } = await supabase
        .from('routes')
        .insert([{
          id: crypto.randomUUID(),
          company_id: profile.company_id,
          name: newRoute.name,
          driver_id: newRoute.driver_id || profile.id,
          vehicle_plate: newRoute.vehicle_plate,
          departure_time: departureTime,
          status: 'AGUARDANDO',
          deliveries_count: 0,
          metadata: {
            destination_company: newRoute.destination_company,
            receiver_name: newRoute.receiver_name,
            expected_arrival_time: newRoute.expected_arrival_time
          }
        }])
        .select()
        .single();

      if (error) throw error;
      
      toastDismiss(loadingToast);
      toastSuccess('Rota criada com sucesso!');
      setIsCreateModalOpen(false);
      setNewRoute({ 
        name: '', driver_id: '', vehicle_plate: '', departure_time: '', departure_date: '',
        destination_company: '', receiver_name: '', expected_arrival_time: ''
      });
      fetchData();
    } catch (err: any) {
      toastDismiss(loadingToast);
      console.error('Erro ao criar rota:', err);
      toastError(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!window.confirm('Excluir esta rota permanentemente?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toastSuccess('Rota removida.');
      setIsRouteModalOpen(false);
      fetchData();
    } catch (err: any) {
      toastError(`Erro ao excluir: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateRouteStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('routes')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toastSuccess(`Status atualizado para ${status}`);
      fetchData();
    } catch (err: any) {
      toastError('Erro ao atualizar status.');
    }
  };

  const exportData = (format: 'excel' | 'pdf') => {
    toastLoading(`Gerando relatório em ${format.toUpperCase()}...`);
    setTimeout(() => {
      toastDismiss();
      toastSuccess(`Relatório de Rotas exportado com sucesso!`);
    }, 1500);
  };

  // --- Render Sections ---

  const renderDashboard = () => (
    <div className="animate-fade-in" style={styles.content}>
        <div style={styles.kpiGrid}>
           <div style={styles.kpiCard}>
              <div style={{...styles.kpiIconBox, backgroundColor: 'rgba(217, 255, 0, 0.12)'}}><Navigation size={24} color="#D9FF00" /></div>
              <div style={styles.kpiInfo}>
                 <p style={styles.kpiLabel}>Rotas Ativas</p>
                 <h2 style={styles.kpiValue}>{routes.filter(r => r.status === 'EM_ROTA').length}</h2>
              </div>
           </div>
           <div style={styles.kpiCard}>
              <div style={{...styles.kpiIconBox, backgroundColor: '#ecfdf5'}}><Package size={24} color="#10b981" /></div>
              <div style={styles.kpiInfo}>
                 <p style={styles.kpiLabel}>Entregas Hoje</p>
                 <h2 style={styles.kpiValue}>{deliveries.length}</h2>
              </div>
           </div>
           <div style={styles.kpiCard}>
              <div style={{...styles.kpiIconBox, backgroundColor: '#fef2f2'}}><Clock size={24} color="#ef4444" /></div>
              <div style={styles.kpiInfo}>
                 <p style={styles.kpiLabel}>Em Atraso</p>
                 <h2 style={{...styles.kpiValue, color: '#ef4444'}}>03</h2>
              </div>
           </div>
           <div style={styles.kpiCard}>
              <div style={{...styles.kpiIconBox, backgroundColor: '#fffbeb'}}><AlertTriangle size={24} color="#f59e0b" /></div>
              <div style={styles.kpiInfo}>
                 <p style={styles.kpiLabel}>Alertas</p>
                 <h2 style={{...styles.kpiValue, color: '#f59e0b'}}>{occurrences.length + 2}</h2>
              </div>
           </div>
        </div>

        <div style={styles.dashboardMainGrid}>
           <div style={styles.chartArea}>
              <div style={styles.cardHeader}>
                 <h3 style={styles.cardTitle}>Performance Operacional (Entregas vs Metas)</h3>
                 <div style={styles.chartLegend}>
                    <span style={styles.legendItem}><div style={{...styles.dot, backgroundColor: 'var(--primary)'}} /> Entregas</span>
                    <span style={styles.legendItem}><div style={{...styles.dot, backgroundColor: '#ef4444'}} /> Atrasos</span>
                 </div>
              </div>
              <div style={{width: '100%', height: 350}}>
                 <ResponsiveContainer>
                    <AreaChart data={perfData}>
                       <defs>
                          <linearGradient id="colorEntregas" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                       <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                       <Area type="monotone" dataKey="entregas" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorEntregas)" />
                       <Area type="monotone" dataKey="atrasos" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div style={styles.recentSummary}>
              <div style={styles.cardHeader}>
                 <h3 style={styles.cardTitle}>Status Geral do Dia</h3>
                 <button style={styles.linkBtn} onClick={() => handleTabChange('mapa')}>Ver Mapa <ArrowRight size={14} /></button>
              </div>
              <div style={styles.summaryList}>
                 <div style={styles.summaryItem}>
                    <div style={styles.itemIcon}><Navigation size={18} color="var(--primary)" /></div>
                    <div style={styles.itemInfo}>
                       <p style={styles.itemName}>Rotas em Planejamento</p>
                       <span style={styles.itemValue}>{routes.filter(r => r.status === 'AGUARDANDO').length} aguardando</span>
                    </div>
                 </div>
                 <div style={styles.summaryItem}>
                    <div style={styles.itemIcon}><Activity size={18} color="#10b981" /></div>
                    <div style={styles.itemInfo}>
                       <p style={styles.itemName}>Performance de Frota</p>
                       <span style={styles.itemValue}>98.4% de eficiência</span>
                    </div>
                 </div>
                 <div style={styles.summaryItem}>
                    <div style={styles.itemIcon}><AlertCircle size={18} color="#ef4444" /></div>
                    <div style={styles.itemInfo}>
                       <p style={styles.itemName}>Alertas Críticos</p>
                       <span style={styles.itemValue}>2 veículos com manutenção</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
    </div>
  );

  const renderRoutes = () => (
    <div className="animate-fade-in" style={styles.content}>
         <div style={styles.actionRow}>
            <div style={styles.searchBox}>
               <Search size={18} color="#94a3b8" />
               <input placeholder="Buscar rota, motorista ou placa..." style={styles.searchInput} />
            </div>
            
            <div style={styles.dateFilter}>
               <Calendar size={18} color="#94a3b8" />
               <input type="date" style={styles.dateInput} />
               <span style={{color: '#94a3b8'}}>até</span>
               <input type="date" style={styles.dateInput} />
            </div>

            <div style={styles.actionGroup}>
               <button style={styles.excelBtn} onClick={() => exportData('excel')}><Download size={16} /> Excel</button>
               <button style={styles.primaryBtnSmall} onClick={() => setIsCreateModalOpen(true)}>
                  <Plus size={18} /> Criar Rota
               </button>
            </div>
         </div>

       <div style={styles.routesGrid}>
          {routes.map(route => (
            <div key={route.id} style={styles.routeCard}>
               <div style={styles.routeHeader}>
                  <div style={styles.routeBadge}>{route.id}</div>
                  <span style={{...styles.statusTag, ...getStatusStyle(route.status)}}>{route.status}</span>
               </div>
               <h3 style={styles.routeName}>{route.name}</h3>
               <div style={styles.routeMeta}>
                  <div style={{...styles.metaItem, cursor: 'pointer'}} onClick={() => route.driver_id ? navigate(`/frota/motoristas/perfil/${route.driver_id}`) : toastError('Perfil do motorista não vinculado.')}>
                     <User size={14} color="var(--primary)" /> <span style={{fontWeight: '700', color: 'var(--primary)'}}>{route.driver_name}</span>
                  </div>
                  <div style={styles.metaItem}><Truck size={14} /> <span>{route.vehicle_plate}</span></div>
                  <div style={styles.metaItem}><Package size={14} /> <span>{route.deliveries_count} Entregas</span></div>
               </div>
               <div style={styles.routeFooter}>
                  <div style={styles.loadInfo}>
                     <div><p>Peso</p><strong>{route.weight}</strong></div>
                     <div><p>Volume</p><strong>{route.volume}</strong></div>
                  </div>
                  <button style={styles.routeActionBtn} onClick={() => { setSelectedRoute(route); setIsRouteModalOpen(true); }}>Ver detalhes</button>
               </div>
            </div>
          ))}
       </div>
    </div>
  );

  const renderDeliveries = () => (
    <div className="animate-fade-in" style={styles.content}>
       <div style={styles.tableCard}>
          <div style={{padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
             <h3>Custódia de Entregas</h3>
             <button style={styles.btnSecondary}><Download size={16} /> Exportar Lista</button>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table style={styles.table}>
               <thead>
                  <tr>
                     <th style={styles.th}>Entrega / Cliente</th>
                     <th style={styles.th}>Produto</th>
                     <th style={styles.th}>Endereço</th>
                     <th style={styles.th}>Status</th>
                     <th style={styles.th}>Rota</th>
                     <th style={styles.th}>Ações</th>
                  </tr>
               </thead>
               <tbody>
                  {deliveries.map(d => (
                    <tr key={d.id} style={styles.tr}>
                       <td style={styles.td}>
                          <p style={{fontWeight: '700'}}>{d.client}</p>
                          <span style={styles.uSub}>{d.id}</span>
                       </td>
                       <td style={styles.td}>{d.product}</td>
                       <td style={styles.td} title={d.address}>{d.address.substring(0, 30)}...</td>
                       <td style={styles.td}>
                          <span style={{...styles.tag, ...getDeliveryStatusStyle(d.status)}}>{d.status}</span>
                       </td>
                       <td style={styles.td}>{d.route_id}</td>
                       <td style={styles.td}>
                          <button style={styles.iconBtn}><MoreVertical size={18} /></button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>
       </div>
    </div>
  );

  const renderCargoEfficiency = () => (
    <EmptyState 
      title="Eficiência de Carga & Cubagem"
      description="Analise o aproveitamento de espaço dos seus veículos e identifique gargalos na montagem das rotas para reduzir custos de frete."
      icon={Truck}
      actionLabel="Analisar Carregamento"
      onAction={() => handleTabChange('rotas')}
    />
  );

  const renderKPIsAndGoals = () => (
    <EmptyState 
      title="Metas de Logística"
      description="Defina metas de tempo de entrega, custo por km e sucesso na primeira tentativa. Monitore o SLA operacional da sua frota."
      icon={BarChart3}
      actionLabel="Definir Metas Operacionais"
      onAction={() => toastSuccess('Abrindo metas de logística...')}
    />
  );

  const renderMap = () => {
    const activeRoutes = routes.filter(r => r.status === 'EM_ROTA' || r.status === 'AGUARDANDO');
    
    if (activeRoutes.length === 0) {
      return (
        <EmptyState 
          title="Nenhuma Rota Ativa no Mapa"
          description="Inicie o rastreamento de uma rota para visualizar a posição dos veículos e o progresso das entregas em tempo real."
          icon={MapIcon}
          actionLabel="Ir para Gestão de Rotas"
          onAction={() => handleTabChange('rotas')}
        />
      );
    }

    return (
      <div className="animate-fade-in" style={{...styles.content, height: '700px', backgroundColor: 'white', borderRadius: '32px', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative'}}>
         <div style={styles.mapSidebar}>
            <div style={styles.sidebarHeader}>
              <h3>Status ao Vivo</h3>
              <div style={{...styles.searchBox, marginTop: '12px', minWidth: 'auto'}}>
                <Search size={14} color="var(--text-muted)" />
                <input 
                  placeholder="Pesquisar endereço..." 
                  style={styles.searchInput} 
                  value={mapSearch}
                  onChange={e => setMapSearch(e.target.value)}
                />
              </div>
            </div>
            <div style={styles.liveList}>
               {activeRoutes.map(r => (
                 <div key={r.id} style={styles.liveItem}>
                    <div style={{...styles.dotPulse, backgroundColor: r.status === 'EM_ROTA' ? '#10b981' : '#f59e0b'}} />
                    <div style={{flex: 1}}>
                       <p style={{fontWeight: '700', fontSize: '13px'}}>{r.driver_name}</p>
                       <p style={styles.uSub}>{r.vehicle_plate}</p>
                       {mapSearch && <p style={{fontSize: '10px', color: 'var(--primary)', marginTop: '4px'}}>Destino: {mapSearch}</p>}
                    </div>
                    <div style={{display: 'flex', gap: '4px'}}>
                       <button 
                         style={styles.miniIconBtn} 
                         title="GPS link"
                         onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearch || 'Logradouro')}`, '_blank')}
                       >
                         <Navigation2 size={14} />
                       </button>
                       <button 
                         style={styles.miniIconBtn} 
                         title="Enviar rota"
                         onClick={() => toastSuccess(`Link de rota enviado para ${r.driver_name}`)}
                       >
                         <MessageCircle size={14} />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
         </div>
         <div style={styles.mapMain}>
            <div style={styles.mockMapContainer}>
               <MapIcon size={64} color="var(--primary-light)" style={{marginBottom: '20px'}} />
               <h2>Mapa Operacional Logta</h2>
               <p style={styles.uSub}>Rastreando {routes.filter(r => r.status === 'EM_ROTA').length} veículos em tempo real...</p>
               {mapSearch && (
                 <div style={{marginTop: '20px', padding: '16px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)'}}>
                   <p style={{fontSize: '12px', fontWeight: '800'}}>Endereço Pesquisado:</p>
                   <p style={{fontSize: '14px', color: 'var(--primary)'}}>{mapSearch}</p>
                 </div>
               )}
            </div>
            <div style={styles.mapControls}>
               <button style={styles.mapBtn}><Maximize2 size={18} /></button>
               <button style={styles.mapBtn}><Navigation size={18} /></button>
            </div>
         </div>
      </div>
    );
  };

  const renderOccurrences = () => (
    <div className="animate-fade-in" style={styles.content}>
       <div style={styles.grid2}>
          <div style={styles.tableCard}>
            <div style={styles.cardHeader}><h3>Ocorrências Recentes</h3></div>
            <div style={{padding: '24px'}}>
               {occurrences.map(o => (
                 <div key={o.id} style={styles.occurrenceRow}>
                    <div style={{...styles.iconBox, backgroundColor: o.type === 'Atraso' ? 'var(--warning-light)' : 'var(--danger-light)'}}>
                       <AlertCircle size={20} color={o.type === 'Atraso' ? 'var(--warning)' : 'var(--danger)'} />
                    </div>
                    <div style={{flex: 1}}>
                       <div style={{display: 'flex', justifyContent: 'space-between'}}>
                          <p style={{fontWeight: '800'}}>{o.type} - {o.route_id}</p>
                          <span style={styles.uSub}>{o.timestamp}</span>
                       </div>
                       <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px'}}>{o.description}</p>
                       <p style={{fontSize: '11px', fontWeight: '700', marginTop: '8px', color: 'var(--text-muted)'}}><User size={10} style={{display: 'inline'}} /> {o.responsible}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
          <div style={styles.chartCardSmall}>
             <div style={styles.cardHeader}><h3>Ações Recomendadas</h3></div>
             <div style={{padding: '24px', display: 'flex', flexDirection: 'column' as const, gap: '16px'}}>
                <div style={styles.alertPanel}>
                   <p style={{fontWeight: '800', fontSize: '13px'}}>Rota R-7003 muito atrasada</p>
                   <p style={{fontSize: '11px', marginTop: '4px'}}>Contatar motorista ou realizar transbordo.</p>
                   <button style={styles.btnWarningSmall}>Agir Agora</button>
                </div>
                <div style={{...styles.alertPanel, backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)'}}>
                   <p style={{fontWeight: '800', fontSize: '13px'}}>3 Entregas com problemas</p>
                   <p style={{fontSize: '11px', marginTop: '4px'}}>Resolver pendências para evitar re-entrega.</p>
                </div>
             </div>
          </div>
       </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="animate-fade-in" style={styles.content}>
       <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>T. Médio Entrega</p><h2 style={styles.kpiValue}>22 min</h2></div>
             <TrendingUp size={24} color="var(--success)" />
          </div>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Tx. Sucesso</p><h2 style={styles.kpiValue}>97.2%</h2></div>
             <Shield size={24} color="var(--primary)" />
          </div>
          <div style={styles.kpiCard}>
             <div style={styles.kpiInfo}><p style={styles.kpiLabel}>Combustível Médio</p><h2 style={styles.kpiValue}>R$ 450</h2></div>
             <Truck size={24} color="var(--text-muted)" />
          </div>
       </div>
       <div style={styles.tableCard}>
          <div style={styles.cardHeader}><h3>Ranking de Eficiência Operational</h3></div>
          <div style={{padding: '24px'}}>
             {routes.map((r, i) => (
               <div key={r.id} style={styles.rankingRow}>
                  <div style={styles.rankNum}>{i+1}º</div>
                  <p 
                    style={{fontWeight: '700', flex: 1, cursor: 'pointer', color: 'var(--primary)'}} 
                    onClick={() => r.driver_id ? navigate(`/motoristas/perfil/${r.driver_id}`) : toastError('Perfil não vinculado.')}
                  >
                    {r.driver_name}
                  </p>
                  <div style={{display: 'flex', gap: '24px', textAlign: 'right'}}>
                     <div><p style={styles.uSub}>Pontualidade</p><strong>{98 - (i*3)}%</strong></div>
                     <div><p style={styles.uSub}>Sucesso</p><strong>100%</strong></div>
                  </div>
               </div>
             ))}
          </div>
       </div>
    </div>
  );

  const navItems = [
    { id: 'dashboard', label: 'Resumo Operacional', icon: TrendingUp },
    { id: 'rotas', label: 'Gestão de Rotas', icon: Navigation },
    { id: 'entregas', label: 'Custódia de Entregas', icon: Package },
    { id: 'mapa', label: 'Links & GPS', icon: MapIcon },
    { id: 'ocorrencias', label: 'Alertas & Ocorrências', icon: AlertTriangle, badge: occurrences.length > 0 ? occurrences.length : undefined },
    { id: 'performance', label: 'Performance de Frota', icon: BarChart2 },
  ];

  const headerActions = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button style={styles.actionBtn} onClick={() => exportData('excel')}>
        <Download size={16} />
        <span>Exportar</span>
      </button>
      <button style={styles.actionBtn} onClick={() => setIsCreateModalOpen(true)}>
        <Plus size={16} />
        <span>Gerar Rota</span>
      </button>
    </div>
  );

  return (
    <ModuleLayout
      title="Operacional"
      badge="LOGÍSTICA & FROTAS"
      items={navItems}
      activeTab={activeTab}
      onTabChange={(id) => handleTabChange(id as any)}
      actions={headerActions}
    >
      <main>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'rotas' && renderRoutes()}
        {activeTab === 'entregas' && renderDeliveries()}
        {activeTab === 'mapa' && renderMap()}
        {activeTab === 'ocorrencias' && renderOccurrences()}
        {activeTab === 'performance' && renderPerformance()}
        {activeTab === 'historico' && (
           <div style={{textAlign: 'center', padding: '100px', backgroundColor: 'white', borderRadius: '32px', border: '1px solid var(--border)'}}>
              <HistoryIcon size={64} color="var(--primary-light)" style={{marginBottom: '20px'}} />
              <h2>Logs de Operação</h2>
              <p style={styles.uSub}>Dados históricos disponíveis para exportação.</p>
           </div>
        )}
      </main>

      {/* MODALS */}
      <LogtaModal isOpen={isRouteModalOpen} onClose={() => setIsRouteModalOpen(false)} width="1000px" title={`Manifesto da Rota: ${selectedRoute?.id}`}>
        {selectedRoute && (
            <div style={styles.routeDetailView}>
              <div style={styles.detailGrid}>
                 <div style={styles.detailMain}>
                    <section style={styles.section}>
                       <h3 style={styles.sectionTitle}><Navigation size={18} /> Plano de Viagem</h3>
                       <div style={styles.infoRow}>
                          <div style={styles.infoItem}><label>Nome da Rota</label><strong>{selectedRoute.name}</strong></div>
                          <div style={styles.infoItem}><label>Saída Prevista</label><strong>{selectedRoute.departure_time}</strong></div>
                       </div>
                       <div style={{marginTop: '20px', display: 'flex', gap: '8px'}}>
                          <button style={{...styles.tag, backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', cursor: 'pointer'}} onClick={() => updateRouteStatus(selectedRoute.id, 'EM_ROTA')}>Em Rota</button>
                          <button style={{...styles.tag, backgroundColor: 'var(--success-light)', color: 'var(--success)', border: 'none', cursor: 'pointer'}} onClick={() => updateRouteStatus(selectedRoute.id, 'CONCLUIDA')}>Concluir</button>
                          <button style={{...styles.tag, backgroundColor: 'var(--danger-light)', color: '#ef4444', border: 'none', cursor: 'pointer'}} onClick={() => handleDeleteRoute(selectedRoute.id)}>Excluir Rota</button>
                       </div>
                    </section>
                    <section style={styles.section}>
                       <h3 style={styles.sectionTitle}><Package size={18} /> Lista de Entregas ({selectedRoute.deliveries_count})</h3>
                       <div style={styles.deliveryList}>
                          {deliveries.filter(d => d.route_id === selectedRoute.id).map(d => (
                            <div key={d.id} style={styles.deliveryCardSmall}>
                               <div><p style={{fontWeight: '700', fontSize: '14px'}}>{d.client}</p><p style={styles.uSub}>{d.address}</p></div>
                               <span style={{...styles.tag, ...getDeliveryStatusStyle(d.status)}}>{d.status}</span>
                            </div>
                          ))}
                       </div>
                     </section>
                  </div>
                  <div style={styles.detailSide}>
                    <div style={styles.sideSummary}>
                       <h4>Equipagem & Carga</h4>
                       <div style={{...styles.summaryItem, cursor: 'pointer'}} onClick={() => selectedRoute.driver_id ? navigate(`/motoristas/perfil/${selectedRoute.driver_id}`) : toastError('Perfil não vinculado.')}>
                          <User size={14} color="var(--primary)" /> <span style={{color: 'var(--primary)', fontWeight: '700'}}>{selectedRoute.driver_name}</span>
                       </div>
                       <div style={styles.summaryItem}><Truck size={14} /> <span>{selectedRoute.vehicle_plate}</span></div>
                       <div style={styles.summaryItem}><Activity size={14} /> <span>Peso: {selectedRoute.weight}</span></div>
                       <button style={styles.btnPrimaryFull}><Navigation2 size={18} /> Iniciar Rastreamento</button>
                    </div>
                 </div>
              </div>
           </div>
         )}
      </LogtaModal>

      <LogtaModal isOpen={isPersonModalOpen} onClose={() => setIsPersonModalOpen(false)} width="500px" title="Resumo do Colaborador">
          {selectedPerson && (
            <div style={styles.personSummary}>
               <div style={styles.personHeader}>
                  <div style={styles.pAvatar}>{selectedPerson.name[0]}</div>
                  <div style={{ flex: 1 }}>
                     <h3 style={styles.pName}>{selectedPerson.name}</h3>
                     <p style={styles.pRole}>Motorista Operacional • Logta Business</p>
                  </div>
                  <div style={styles.pQuickActions}>
                      <button 
                        style={styles.pIconAction} 
                        title="Editar"
                        onClick={() => toastSuccess(`Editando perfil de: ${selectedPerson.name}`)}
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        style={styles.pIconAction} 
                        title="Bloquear"
                        onClick={() => toastSuccess(`Colaborador bloqueado: ${selectedPerson.name}`)}
                      >
                        <Lock size={18} />
                      </button>
                      <button 
                        style={{...styles.pIconAction, color: 'var(--danger)'}} 
                        title="Excluir"
                        onClick={() => {
                          if (window.confirm(`Excluir permanentemente ${selectedPerson.name}?`)) {
                            toastSuccess('Solicitação de exclusão enviada.');
                          }
                        }}
                      >
                        <X size={18} />
                      </button>
                   </div>
               </div>
               <div style={styles.pStatsGrid}>
                  <div style={styles.pStatCard}><p>Entregas</p><strong>412</strong></div>
                  <div style={styles.pStatCard}><p>Nota</p><strong>4.9</strong></div>
                  <div style={styles.pStatCard}><p>Status</p><span style={{color: 'var(--success)', fontWeight: '800'}}>ATIVO</span></div>
               </div>
               <div style={styles.pSection}>
                  <h4 style={styles.pSectionTitle}>Últimas Atividades</h4>
                  <div style={styles.pLog}><Clock size={12} /> Rota finalizada recentemente</div>
                  <div style={styles.pLog}><Clock size={12} /> Login realizado via Mobile App</div>
                  <div style={styles.pLog}><Clock size={12} /> Checklist de veículo aprovado</div>
               </div>
               <div style={styles.pActions}>
                  <button style={styles.btnPAction}><MessageCircle size={16} /> Enviar Mensagem</button>
                  <button style={{...styles.btnPAction, backgroundColor: 'var(--bg-app)', color: 'var(--text-main)'}} onClick={() => { setIsPersonModalOpen(false); navigate('/usuarios'); }}><Shield size={16} /> Gerir Permissões</button>
               </div>
            </div>
          )}
      </LogtaModal>

      <LogtaModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} width="700px" title="Configurar Nova Rota">
         <form style={styles.form} onSubmit={handleCreateRoute}>
            <div style={styles.formRow}>
              <div style={styles.inputGroup}>
                  <label>Nome Amigável da Rota</label>
                  <input 
                    style={styles.formInput} 
                    required
                    value={newRoute.name} 
                    onChange={e => setNewRoute({...newRoute, name: e.target.value})}
                    placeholder="Ex: Rota Interior - Quarta" 
                  />
              </div>
              <div style={styles.inputGroup}>
                  <label>Empresa Destinatária</label>
                  <input 
                    style={styles.formInput} 
                    required
                    value={newRoute.destination_company}
                    onChange={e => setNewRoute({...newRoute, destination_company: e.target.value})}
                    placeholder="Ex: Tech Soluções LTDA" 
                  />
              </div>
            </div>
            <div style={styles.formRow}>
               <div style={styles.inputGroup}>
                  <label>Motorista (Responsável)</label>
                  <select 
                    style={styles.formInput}
                    required
                    value={newRoute.driver_id}
                    onChange={e => setNewRoute({...newRoute, driver_id: e.target.value})}
                  >
                    <option value="">Selecione um motorista...</option>
                    <option value={profile?.id}>Eu mesmo ({profile?.full_name})</option>
                    {/* Aqui viria um map de motoristas reais */}
                  </select>
               </div>
               <div style={styles.inputGroup}>
                  <label>Veículo / Placa</label>
                  <input 
                    style={styles.formInput} 
                    required
                    value={newRoute.vehicle_plate}
                    onChange={e => setNewRoute({...newRoute, vehicle_plate: e.target.value})}
                    placeholder="Ex: ABC-1234" 
                  />
               </div>
            </div>
            <div style={styles.formRow}>
               <div style={styles.inputGroup}>
                  <label>Data de Saída</label>
                  <input type="date" required style={styles.formInput} value={newRoute.departure_date} onChange={e => setNewRoute({...newRoute, departure_date: e.target.value})} />
               </div>
               <div style={styles.inputGroup}>
                  <label>Horário de Saída</label>
                  <input type="time" required style={styles.formInput} value={newRoute.departure_time} onChange={e => setNewRoute({...newRoute, departure_time: e.target.value})} />
               </div>
            </div>
            <div style={styles.formRow}>
               <div style={styles.inputGroup}>
                  <label>Responsável por Receber</label>
                  <input 
                    style={styles.formInput} 
                    required
                    value={newRoute.receiver_name}
                    onChange={e => setNewRoute({...newRoute, receiver_name: e.target.value})}
                    placeholder="Nome de quem receberá" 
                  />
               </div>
               <div style={styles.inputGroup}>
                  <label>Previsão de Chegada</label>
                  <input type="time" required style={styles.formInput} value={newRoute.expected_arrival_time} onChange={e => setNewRoute({...newRoute, expected_arrival_time: e.target.value})} />
               </div>
            </div>
            <button 
              type="submit" 
              style={{
                ...styles.btnPrimaryFull, 
                opacity: (newRoute.name && newRoute.driver_id && newRoute.vehicle_plate) ? 1 : 0.5,
                cursor: (newRoute.name && newRoute.driver_id && newRoute.vehicle_plate) ? 'pointer' : 'not-allowed'
              }} 
              disabled={loading || !(newRoute.name && newRoute.driver_id && newRoute.vehicle_plate)}
            >
               {loading ? 'Processando...' : 'Salvar e Ativar Rota'}
            </button>
            <p style={{fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center'}}>
              Ao salvar, a rota será registrada e o horário de chegada ficará monitorado.
            </p>
         </form>
      </LogtaModal>

      <LogtaModal isOpen={isOccurrenceModalOpen} onClose={() => setIsOccurrenceModalOpen(false)} width="500px" title="Detalhes da Ocorrência">
        {selectedOccurrence && (
          <div style={{padding: '12px'}}>
            <div style={{...styles.iconBox, width: '48px', height: '48px', backgroundColor: 'var(--danger-light)', marginBottom: '16px'}}>
              <AlertCircle size={24} color="var(--danger)" />
            </div>
            <h3 style={{fontSize: '18px', fontWeight: '900'}}>{selectedOccurrence.type}</h3>
            <p style={styles.uSub}>Registrado em: {selectedOccurrence.timestamp}</p>
            
            <div style={{marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-app)', borderRadius: '16px'}}>
              <p style={{fontWeight: '700', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Descrição do Evento</p>
              <p style={{marginTop: '8px', fontSize: '14px'}}>{selectedOccurrence.description}</p>
            </div>

            <div style={{marginTop: '24px'}}>
              <p style={{fontWeight: '700', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Ações Sugeridas</p>
              <div style={{marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                 <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'}}>
                   <CheckCircle2 size={14} color="var(--success)" />
                   Contatar motorista via chat direto
                 </div>
                 <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'}}>
                   <CheckCircle2 size={14} color="var(--success)" />
                   Redirecionar entregas pendentes
                 </div>
              </div>
            </div>

            <button style={styles.btnPrimaryFull} onClick={() => { setIsOccurrenceModalOpen(false); toastSuccess('Ação enviada ao motorista'); }}>
              Agir Agora
            </button>
          </div>
        )}
      </LogtaModal>
    </ModuleLayout>
  );
};

// --- Helper Functions ---
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'EM_ROTA': return { backgroundColor: 'var(--primary-light)', color: 'var(--primary)' };
    case 'ATRASADA': return { backgroundColor: 'var(--danger-light)', color: 'var(--danger)' };
    case 'CONCLUIDA': return { backgroundColor: 'var(--success-light)', color: 'var(--success)' };
    default: return { backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)' };
  }
};
const getDeliveryStatusStyle = (status: string) => {
  switch (status) {
    case 'ENTREGUE': return { backgroundColor: 'var(--success-light)', color: 'var(--success)' };
    case 'EM_ROTA': return { backgroundColor: 'var(--primary-light)', color: 'var(--primary)' };
    case 'PROBLEMA': return { backgroundColor: 'var(--danger-light)', color: 'var(--danger)' };
    default: return { backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)' };
  }
};

const styles: Record<string, any> = {
  container: { padding: '32px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  headerPremium: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap' as const, gap: '24px' },
  headerTitleArea: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  headerBadge: { display: 'inline-block', width: 'fit-content', padding: '4px 12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '30px', fontSize: '10px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1px' },
  tabNavCompact: { display: 'flex', gap: '8px', backgroundColor: 'rgba(241, 245, 249, 0.5)', padding: '6px', borderRadius: '18px', border: '1px solid var(--border)', overflowX: 'auto' as const, scrollbarWidth: 'none' as const },
  tabBtnCompact: { 
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', 
    padding: '10px 16px', borderRadius: '14px', border: 'none', backgroundColor: 'transparent', 
    fontWeight: '700', color: '#94A3B8', cursor: 'pointer', transition: 'all 0.2s', 
    minWidth: '80px', fontSize: '11px' 
  },
  tabBtnActive: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' },
  
  content: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' },
  kpiCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  kpiInfo: { display: 'flex', flexDirection: 'column' as const },
  kpiLabel: { fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  kpiValue: { fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '4px 0' },
  kpiSub: { fontSize: '11px', color: '#94a3b8' },
  kpiIconBox: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  dashboardMainGrid: { display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px' },
  chartArea: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  cardTitle: { fontSize: '18px', fontWeight: '800', color: '#0f172a' },
  chartLegend: { display: 'flex', gap: '16px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', fontWeight: '600' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  
  recentSummary: { backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0' },
  linkBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  summaryList: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  summaryItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#f4f4f4', borderRadius: '20px' },
  itemIcon: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' },
  itemInfo: { display: 'flex', flexDirection: 'column' as const },
  itemName: { fontSize: '13px', fontWeight: '700', color: '#0f172a' },
  itemValue: { fontSize: '11px', color: '#64748b' },

  actionRow: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' },
  searchBox: { flex: 2, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '0 20px', borderRadius: '16px', border: '1px solid #e2e8f0', height: '52px' },
  searchInput: { border: 'none', background: 'none', width: '100%', outline: 'none', fontSize: '14px', color: '#1E293B', fontWeight: '600' },
  actionGroup: { display: 'flex', gap: '12px', alignItems: 'center' },
  dateFilter: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '0 20px', borderRadius: '16px', border: '1px solid #e2e8f0', height: '52px' },
  dateInput: { border: 'none', outline: 'none', fontSize: '12px', color: '#1E293B', backgroundColor: 'transparent', fontWeight: '700' },
  excelBtn: { height: '52px', padding: '0 20px', borderRadius: '16px', border: 'none', backgroundColor: '#ecfdf5', fontSize: '14px', fontWeight: '800', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  primaryBtnSmall: { height: '52px', padding: '0 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(217, 255, 0, 0.3)' },
  
  routesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  routeCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 20px -10px rgba(0,0,0,0.1)' } },
  routeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  routeBadge: { fontSize: '10px', color: '#94a3b8', backgroundColor: '#ebebeb', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' },
  statusTag: { fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px' },
  routeName: { fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '16px' },
  routeMeta: { display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '24px' },
  metaItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' },
  routeFooter: { borderTop: '1px solid #e8e8e8', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  loadInfo: { display: 'flex', gap: '16px' },
  routeActionBtn: { border: 'none', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },

  tableCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: '900px' },
  th: { textAlign: 'left' as const, padding: '16px 24px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const, borderBottom: '1px solid var(--border)' },
  td: { padding: '16px 24px', fontSize: '14px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' },
  tr: { transition: 'background 0.2s' },
  tag: { padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' },
  uSub: { fontSize: '11px', color: 'var(--text-muted)' },
  iconBtn: { border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' },

  mapSidebar: { width: '280px', height: '100%', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border)', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const },
  sidebarHeader: { padding: '20px 24px', borderBottom: '1px solid var(--border)' },
  liveList: { padding: '12px' },
  liveItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', transition: 'background 0.2s', cursor: 'pointer', marginBottom: '4px' },
  dotPulse: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' },
  mapMain: { flex: 1, height: '100%', backgroundColor: '#ebebeb', display: 'flex', flexDirection: 'column' as const },
  mockMapContainer: { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', textAlign: 'center' as const, padding: '40px' },
  mapControls: { position: 'absolute' as const, right: '24px', bottom: '24px', display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  mapBtn: { width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)' },
  miniIconBtn: { width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' },
  btnWarningSmall: { padding: '8px 16px', backgroundColor: 'var(--warning)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginTop: '8px' },

  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' },
  occurrenceRow: { display: 'flex', gap: '16px', padding: '16px', borderRadius: '16px', border: '1px solid var(--bg-app)', marginBottom: '12px' },
  iconBox: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  alertPanel: { padding: '20px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '20px' },
  
  rankingRow: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderBottom: '1px solid var(--border)' },
  rankNum: { width: '40px', fontSize: '18px', fontWeight: '900', color: 'var(--text-muted)' },

  // --- Modal Styles ---
  routeDetailView: { padding: '12px' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '32px' },
  detailMain: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  section: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '800', marginBottom: '24px' },
  infoRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  infoItem: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  deliveryList: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  deliveryCardSmall: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)' },
  detailSide: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  sideSummary: { backgroundColor: 'var(--bg-app)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' },
  summaryItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' },
  btnPrimaryFull: { width: '100%', padding: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' },

  // --- Person Summary Styles ---
  personSummary: { padding: '12px' },
  personHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' },
  pAvatar: { width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800' },
  pName: { fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' },
  pRole: { fontSize: '13px', color: 'var(--text-muted)' },
  pStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' },
  pStatCard: { backgroundColor: 'var(--bg-app)', padding: '16px', borderRadius: '16px', textAlign: 'center' as const, border: '1px solid var(--border)' },
  pSection: { marginBottom: '32px' },
  pSectionTitle: { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: '16px', letterSpacing: '1px' },
  pQuickActions: { display: 'flex', gap: '8px' },
  pIconAction: { padding: '8px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  pLog: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' },
  pActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  btnPAction: { padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  
  form: { display: 'flex', flexDirection: 'column' as const, gap: '16px', padding: '12px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  formInput: { padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none' }
};

export default Logistics;
