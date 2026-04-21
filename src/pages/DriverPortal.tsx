import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, Navigation, Package, CheckCircle2, 
  Map as MapIcon, ChevronRight, Phone, 
  Clock, AlertTriangle, MapPin, Search,
  Power, PowerOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import { createAuditLog } from '../utils/audit';

const DriverPortal: React.FC = () => {
  const { profile } = useAuth();
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJourneyStarted, setIsJourneyStarted] = useState(false);
  
  // GPS Ativo durante a jornada
  const geo = useGeolocation(isJourneyStarted);

  const fetchDriverRoute = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    const { data: routeData } = await supabase
      .from('routes')
      .select('*')
      .eq('driver_id', profile.id)
      .eq('status', 'EM_ANDAMENTO')
      .single();

    if (routeData) {
      setActiveRoute(routeData);
      setIsJourneyStarted(true);

      const { data: shipmentData } = await supabase
        .from('shipments')
        .select('*, clients(name, phone, address)')
        .eq('route_id', routeData.id)
        .order('created_at', { ascending: true });

      setShipments(shipmentData || []);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void fetchDriverRoute();
  }, [fetchDriverRoute]);

  const startJourney = async () => {
    if (!profile?.id) return;
    setIsJourneyStarted(true);
    
    // Log de Auditoria
    await createAuditLog({
      company_id: profile.company_id!,
      user_id: profile.id,
      module: 'LOGISTICA',
      action: 'LOGIN',
      details: `Motorista ${profile.full_name} iniciou jornada de trabalho.`
    });

    toastSuccess('Jornada iniciada! GPS Ativo.');
    
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  };

  const reportEmergency = async () => {
    if (!profile?.id) return;
    const msg = window.prompt('Descreva o problema (Ex: Pneu furado, Motor ferveu):');
    if (!msg) return;

    const tid = toastLoading('Enviando alerta para central...');
    
    await createAuditLog({
      company_id: profile.company_id!,
      user_id: profile.id,
      module: 'LOGISTICA',
      action: 'UPDATE',
      details: `SOS MOTORISTA: ${profile.full_name} reportou: ${msg}`,
      metadata: { type: 'EMERGENCY', message: msg, location: geo }
    });

    toastDismiss(tid);
    toastSuccess('Alerta enviado! Fique calmo, o operacional já foi notificado.');
  };

  if (loading) return <div style={styles.loader}>Sincronizando sua Rota...</div>;

  return (
    <div style={styles.container}>
      {/* MOBILE HEADER */}
      <header style={styles.header}>
         <div style={styles.driverInfo}>
            <div style={styles.avatar}>{profile?.full_name?.[0]}</div>
            <div>
               <h3 style={styles.welcome}>Olá, {profile?.full_name?.split(' ')[0]}</h3>
               <p style={styles.subText}>{isJourneyStarted ? `📡 GPS: ${geo.latitude?.[0] ?? '--'},${geo.longitude?.[0] ?? '--'}` : '⚪ Aguardando Início'}</p>
            </div>
         </div>
         <div style={styles.statusBadge}>
            <Truck size={18} />
         </div>
      </header>

      {/* JOURNEY CONTROL */}
      {!isJourneyStarted ? (
        <div style={styles.startHero}>
           <div style={styles.startIcon}><Power size={48} color="white" /></div>
           <h2 style={styles.heroTitle}>Pronto para rodar?</h2>
           <p style={styles.heroText}>Inicie sua jornada para começar a receber as rotas do dia.</p>
           <button style={styles.startBtn} onClick={startJourney}>Iniciar Minha Jornada</button>
        </div>
      ) : (
        <div style={styles.activeArea}>
           {/* KPI MINI */}
            <div style={styles.kpiRow}>
               <div style={styles.kpiBox}>
                  <span style={styles.kLabel}>Entregas</span>
                  <span style={styles.kValue}>{shipments.filter(s => s.status === 'ENTREGUE').length} / {shipments.length}</span>
               </div>
               <div style={{...styles.kpiBox, backgroundColor: '#fef2f2', border: '1px solid #fee2e2'}} onClick={reportEmergency}>
                  <span style={{...styles.kLabel, color: '#ef4444'}}>SOS Emergência</span>
                  <span style={{...styles.kValue, color: '#ef4444'}}>Reportar Painel</span>
               </div>
            </div>

           <h3 style={styles.sectionTitle}>Seu Romaneio Digital</h3>
           
           <div style={styles.shipmentList}>
              {shipments.length === 0 ? (
                <div style={styles.emptyState}>Nenhuma carga atribuída no momento.</div>
              ) : (
                shipments.map(shipment => (
                  <div key={shipment.id} style={styles.shipCard} onClick={() => window.location.href = `/motorista/entrega/${shipment.id}`}>
                     <div style={styles.shipMain}>
                        <div style={{...styles.statusDot, backgroundColor: shipment.status === 'ENTREGUE' ? '#10b981' : '#f59e0b'}} />
                         <div style={{flex: 1}}>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                               <h4 style={styles.clientName}>{shipment.clients?.name}</h4>
                               <span style={{fontSize: '10px', fontWeight: '800', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px'}}>ETA: 14:30h</span>
                            </div>
                            <p style={styles.addressText}><MapPin size={12} /> {shipment.clients?.address}</p>
                         </div>
                        <ChevronRight size={20} color="#cbd5e1" />
                     </div>
                     <div style={styles.shipFooter}>
                        <div style={styles.weightTag}><Package size={12} /> {shipment.weight}kg</div>
                        <span style={styles.statusText}>{shipment.status}</span>
                     </div>
                  </div>
                ))
              )}
           </div>

           <button style={styles.endJourneyBtn} onClick={async () => {
              if (profile?.id) {
                await createAuditLog({
                  company_id: profile.company_id!,
                  user_id: profile.id,
                  module: 'LOGISTICA',
                  action: 'LOGOUT',
                  details: `Motorista ${profile.full_name} finalizou jornada.`
                });
              }
              setIsJourneyStarted(false);
              toastSuccess('Jornada finalizada!');
           }}>
              <PowerOff size={18} /> Finalizar Minha Jornada
           </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#F8FAFC', paddingBottom: '40px' },
  loader: { padding: '100px', textAlign: 'center' as const, color: 'var(--primary)', fontWeight: '900' },
  header: { backgroundColor: 'white', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', position: 'sticky' as const, top: 0, zIndex: 10 },
  driverInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '44px', height: '44px', borderRadius: '14px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '900' },
  welcome: { fontSize: '16px', fontWeight: '900', color: '#111827', margin: 0 },
  subText: { fontSize: '12px', color: '#64748b', margin: 0 },
  statusBadge: { width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' },

  startHero: { padding: '60px 24px', textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '20px' },
  startIcon: { width: '96px', height: '96px', borderRadius: '32px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.4)' },
  heroTitle: { fontSize: '24px', fontWeight: '950', color: '#111827', margin: 0 },
  heroText: { fontSize: '15px', color: '#64748b', margin: 0, maxWidth: '280px' },
  startBtn: { width: '100%', maxWidth: '280px', padding: '18px', borderRadius: '20px', backgroundColor: '#10b981', color: 'white', border: 'none', fontWeight: '900', fontSize: '16px', cursor: 'pointer', marginTop: '20px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)' },

  activeArea: { padding: '24px' },
  kpiRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' },
  kpiBox: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  kLabel: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' as const },
  kValue: { fontSize: '18px', fontWeight: '950', color: '#111827' },

  sectionTitle: { fontSize: '14px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '16px' },
  shipmentList: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  shipCard: { backgroundColor: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  shipMain: { display: 'flex', alignItems: 'center', gap: '16px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  clientName: { fontSize: '15px', fontWeight: '900', color: '#111827', margin: 0 },
  addressText: { fontSize: '12px', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' },
  shipFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' },
  weightTag: { fontSize: '11px', fontWeight: '800', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' },
  statusText: { fontSize: '11px', fontWeight: '900', color: 'var(--primary)' },
  
  emptyState: { textAlign: 'center' as const, padding: '40px', color: '#94a3b8', fontWeight: '700' },
  endJourneyBtn: { marginTop: '40px', width: '100%', background: 'none', border: '1px solid #fee2e2', padding: '16px', borderRadius: '20px', color: '#ef4444', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }
};

export default DriverPortal;
