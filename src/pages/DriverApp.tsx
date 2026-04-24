import React, { useState, useEffect } from 'react';
import { 
  Package, MapPin, Navigation, CheckCircle2, 
  LogOut, Phone, MessageSquare, AlertTriangle, 
  ChevronRight, Loader2, Map as MapIcon, ExternalLink,
  Zap, Clock, ShieldCheck, Heart
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const DriverApp: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeShipments, setActiveShipments] = useState([
    { id: '1', customer: 'Supermercado Central', address: 'Rua das Flores, 123 - SP', status: 'PENDENTE', time: '14:30' },
    { id: '2', customer: 'Distribuidora Norte', address: 'Av. Brasil, 4400 - SP', status: 'PENDENTE', time: '16:00' }
  ]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1200);
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.zapPulse}><Zap size={40} color="#D9FF00" fill="#D9FF00" /></div>
        <p style={styles.loadingText}>Sincronizando Malha Zaptro...</p>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
         <div style={styles.topInfo}>
            <div style={styles.driverAvatar}>{profile?.full_name?.[0] || 'M'}</div>
            <div>
               <h2 style={styles.welcome}>Olá, {profile?.full_name?.split(' ')[0] || 'Operador'}</h2>
               <span style={styles.statusBadge}><div style={styles.dot} /> EM ROTA ATIVA</span>
            </div>
         </div>
         <button onClick={() => signOut()} style={styles.logoutBtn}><LogOut size={20} /></button>
      </header>

      <main style={styles.main}>
         <div style={styles.routeHeader}>
            <div style={styles.routeProgress}>
               <div style={styles.pLabel}>PROGRESSO DA ROTA</div>
               <h3 style={styles.pVal}>45% CONCLUÍDO</h3>
               <div style={styles.pBar}><div style={{...styles.pFill, width: '45%'}} /></div>
            </div>
         </div>

         <div style={styles.deliveryList}>
            <h4 style={styles.secTitle}>PRÓXIMAS PARADAS</h4>
            {activeShipments.map((s, idx) => (
              <div key={s.id} style={styles.deliveryCard}>
                 <div style={styles.cardHeader}>
                    <span style={styles.stopNum}>PARADA #{idx + 1}</span>
                    <span style={styles.stopTime}><Clock size={12} /> {s.time}</span>
                 </div>
                 <h3 style={styles.clientName}>{s.customer}</h3>
                 <div style={styles.addressBox}>
                    <MapPin size={16} color="#D9FF00" />
                    <span>{s.address}</span>
                 </div>
                 
                 <div style={styles.cardActions}>
                    <button style={styles.navBtn} onClick={() => window.open(`https://maps.google.com/?q=${s.address}`)}>
                       <Navigation size={18} /> GPS
                    </button>
                    <button style={styles.completeBtn}>FINALIZAR</button>
                 </div>
              </div>
            ))}
         </div>
      </main>

      {/* FOOTER ACTIONS */}
      <div style={styles.footer}>
         <button style={styles.emergencyBtn}><AlertTriangle size={24} /> <span>OCORRÊNCIA</span></button>
         <button style={styles.supportBtn}><MessageSquare size={24} /> <span>CENTRAL</span></button>
      </div>

      <style>{`
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

const styles: Record<string, any> = {
  appContainer: { backgroundColor: '#000000', minHeight: '100vh', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' },
  loadingScreen: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  zapPulse: { animation: 'pulse 1.5s infinite ease-in-out' },
  loadingText: { marginTop: '20px', color: '#D9FF00', fontWeight: '700', fontSize: '14px', letterSpacing: '1px' },

  header: { padding: '50px 25px 30px', backgroundColor: '#111', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  topInfo: { display: 'flex', alignItems: 'center', gap: '15px' },
  driverAvatar: { width: '50px', height: '50px', borderRadius: '15px', backgroundColor: '#D9FF00', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700' },
  welcome: { margin: 0, fontSize: '18px', fontWeight: '700' },
  statusBadge: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#10B981', fontWeight: '700', marginTop: '4px' },
  dot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' },
  logoutBtn: { background: 'transparent', border: '1px solid #333', color: '#666', padding: '10px', borderRadius: '12px', cursor: 'pointer' },

  main: { padding: '25px' },
  routeHeader: { backgroundColor: '#111', padding: '25px', borderRadius: '25px', border: '1px solid #222', marginBottom: '40px' },
  pLabel: { fontSize: '10px', color: '#94A3B8', fontWeight: '700', letterSpacing: '2px' },
  pVal: { fontSize: '20px', fontWeight: '700', color: '#D9FF00', margin: '10px 0' },
  pBar: { height: '6px', backgroundColor: '#222', borderRadius: '3px', overflow: 'hidden' },
  pFill: { height: '100%', backgroundColor: '#D9FF00' },

  secTitle: { fontSize: '12px', fontWeight: '700', color: '#666', letterSpacing: '2px', marginBottom: '20px' },
  deliveryCard: { backgroundColor: '#111', border: '1px solid #333', borderRadius: '30px', padding: '25px', marginBottom: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  stopNum: { fontSize: '11px', fontWeight: '700', color: '#D9FF00', backgroundColor: '#D9FF0020', padding: '4px 10px', borderRadius: '6px' },
  stopTime: { fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '5px' },
  clientName: { fontSize: '22px', fontWeight: '700', margin: '0 0 10px 0' },
  addressBox: { display: 'flex', gap: '10px', fontSize: '14px', color: '#94A3B8', lineHeight: 1.4, marginBottom: '25px' },

  cardActions: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' },
  navBtn: { padding: '15px', backgroundColor: '#222', border: 'none', borderRadius: '15px', color: '#FFF', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  completeBtn: { padding: '15px', backgroundColor: '#D9FF00', border: 'none', borderRadius: '15px', color: '#000', fontWeight: '700' },

  footer: { position: 'fixed', bottom: '0', left: '0', right: '0', padding: '25px', backgroundColor: '#000', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', borderTop: '1px solid #222' },
  emergencyBtn: { padding: '18px', backgroundColor: '#B91C1C20', color: '#EF4444', border: '1px solid #B91C1C', borderRadius: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  supportBtn: { padding: '18px', backgroundColor: '#111', color: '#FFF', border: '1px solid #333', borderRadius: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }
};

export default DriverApp;
