import React, { useState, useEffect } from 'react';
import { 
  Truck, Search, Filter, Plus, Clock, MapPin, 
  User, CheckCircle2, AlertCircle, MoreVertical,
  Navigation, Package, Calendar, Phone, Share2,
  Activity, ArrowUpRight, BarChart, Bell, Loader2, X, Save, RefreshCw,
  ExternalLink, Copy, History as HistoryIcon, UserCircle, Map, Globe
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { supabase } from '../lib/supabase';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { fireTransactionalEmailNonBlocking } from '../lib/fireTransactionalEmail';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import LogtaModal from '../components/Modal';

const ZaptroLogistics: React.FC = () => {
  const { profile, user } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [shipmentHistory, setShipmentHistory] = useState<any[]>([]);

  const [newShipment, setNewShipment] = useState({
    order_id: '', client_name: '', destination: '', status: 'coleta', driver_id: '', nf_number: ''
  });

  const fetchData = async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: ships } = await supabase
        .from('whatsapp_shipments')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      
      const { data: drvs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('organization_id', profile.company_id);
        
      if (ships) setShipments(ships);
      if (drvs) setDrivers(drvs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [profile?.company_id]);

  const copyTrackingLink = (code: string) => {
    const url = `${window.location.origin}/rastreio?code=${code}`;
    navigator.clipboard.writeText(url);
    notifyZaptro('success', 'LINK COPIADO', 'Link de rastreio pronto para envio ao cliente.');
  };

  const handleCreateShipment = async () => {
    if (!newShipment.order_id || !newShipment.client_name) {
      notifyZaptro('error', 'Campos obrigatórios', 'Preencha ID do pedido e Cliente.');
      return;
    }

    try {
      const trackingCode = `ZP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const { error } = await supabase
        .from('whatsapp_shipments')
        .insert({
          company_id: profile?.company_id,
          tracking_code: trackingCode,
          customer_name: newShipment.client_name,
          destination: newShipment.destination,
          current_status: 'pending',
          driver_id: newShipment.driver_id || null,
          tracking_token: trackingCode // Usamos o código como token para simplificar
        });

      if (error) throw error;

      const notifyTo = (profile?.email || user?.email || '').trim().toLowerCase();
      if (notifyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyTo) && profile?.company_id) {
        fireTransactionalEmailNonBlocking(supabaseZaptro, {
          kind: 'cargo_created',
          to: notifyTo,
          companyId: profile.company_id,
          variables: {
            userName: profile.full_name || 'Equipa',
            trackingCode,
            clientName: newShipment.client_name,
            destination: newShipment.destination || '—',
            ctaUrl: `${window.location.origin}/rastreio?code=${encodeURIComponent(trackingCode)}`,
            ctaLabel: 'Abrir rastreio',
          },
        });
      }

      notifyZaptro('success', 'CARGA LANÇADA', `Código de rastreio: ${trackingCode}`);
      setIsAdding(false);
      fetchData();
    } catch (err: any) {
      notifyZaptro('error', 'Falha ao salvar', err.message);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'in_transit': return { bg: '#F0F9FF', text: '#0369A1', label: 'EM ROTA' };
      case 'pending': return { bg: '#FBFBFC', text: '#64748B', label: 'PENDENTE' };
      case 'delivered': return { bg: '#F0FDF4', text: '#15803D', label: 'ENTREGUE' };
      default: return { bg: '#FBFBFC', text: '#94A3B8', label: status.toUpperCase() };
    }
  };

  return (
    <ZaptroLayout>
      <div style={styles.container}>
        <header style={styles.header}>
           <div>
              <h1 style={styles.title}>Painel de Logística</h1>
              <p style={styles.subtitle}>Gerenciamento de entregas e malha de rastreio em tempo real.</p>
           </div>
           <button style={styles.primaryBtn} onClick={() => setIsAdding(true)}>
              <Plus size={20} /> NOVA ENTREGA
           </button>
        </header>

        <div style={styles.tableCard}>
           <table style={styles.table}>
              <thead>
                 <tr style={styles.thRow}>
                    <th style={styles.th}>CARGA / RASTREIO</th>
                    <th style={styles.th}>CLIENTE / DESTINO</th>
                    <th style={styles.th}>STATUS OPERACIONAL</th>
                    <th style={{...styles.th, textAlign: 'right'}}>AÇÕES</th>
                 </tr>
              </thead>
              <tbody>
                 {shipments.map(s => {
                   const style = getStatusStyle(s.current_status);
                   return (
                     <tr key={s.id} style={styles.tr}>
                        <td style={styles.td}>
                           <div style={styles.idCell}>
                              <div style={styles.iconCircle}><Package size={18} /></div>
                              <div>
                                 <strong style={styles.mainText}>{s.tracking_code}</strong>
                                 <span style={styles.subText}>Criado em: {new Date(s.created_at).toLocaleDateString()}</span>
                              </div>
                           </div>
                        </td>
                        <td style={styles.td}>
                           <strong style={styles.mainText}>{s.customer_name}</strong>
                           <span style={styles.subText}><MapPin size={10} /> {s.destination}</span>
                        </td>
                        <td style={styles.td}>
                           <div style={{...styles.badge, backgroundColor: style.bg, color: style.text}}>
                              <div style={{...styles.badgeDot, backgroundColor: style.text}} />
                              {style.label}
                           </div>
                        </td>
                        <td style={{...styles.td, textAlign: 'right'}}>
                           <div style={styles.actionRow}>
                              <button style={styles.iconBtn} onClick={() => setSelectedShipment(s)} title="Ver Detalhes"><HistoryIcon size={16} /></button>
                              <button style={styles.iconBtn} onClick={() => copyTrackingLink(s.tracking_code)} title="Copiar Link de Rastreio"><Share2 size={16} /></button>
                              <button style={styles.waBtn}><Navigation size={16} /></button>
                           </div>
                        </td>
                     </tr>
                   );
                 })}
              </tbody>
           </table>
        </div>
      </div>

      {/* MODAL NOVA CARGA */}
      <LogtaModal isOpen={isAdding} onClose={() => setIsAdding(false)} title="LANÇAR NOVA ENTREGA" width="550px">
         <div style={styles.addForm}>
            <div style={styles.inputStack}>
               <label style={styles.fLabel}>CLIENTE / DESTINATÁRIO</label>
               <input 
                style={styles.fInput} 
                placeholder="Nome do cliente final" 
                value={newShipment.client_name}
                onChange={e => setNewShipment({...newShipment, client_name: e.target.value})}
               />

               <label style={styles.fLabel}>DESTINO (CIDADE / ESTADO)</label>
               <input 
                style={styles.fInput} 
                placeholder="Ex: São Paulo, SP" 
                value={newShipment.destination}
                onChange={e => setNewShipment({...newShipment, destination: e.target.value})}
               />

               <label style={styles.fLabel}>MOTORISTA RESPONSÁVEL</label>
               <select 
                style={styles.fSelect}
                value={newShipment.driver_id}
                onChange={e => setNewShipment({...newShipment, driver_id: e.target.value})}
               >
                 <option value="">Selecione um motorista...</option>
                 {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
               </select>
            </div>
            <button style={styles.fActionBtn} onClick={handleCreateShipment}>GERAR CÓDIGO E INICIAR</button>
         </div>
      </LogtaModal>
    </ZaptroLayout>
  );
};

const styles: Record<string, any> = {
  container: { backgroundColor: '#FFFFFF' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '50px' },
  title: { fontSize: '38px', fontWeight: '700', color: '#000', margin: 0, letterSpacing: '-2px' },
  subtitle: { fontSize: '15px', color: '#94A3B8', fontWeight: '600', margin: '6px 0 0 0' },
  primaryBtn: { backgroundColor: '#000', color: '#D9FF00', border: 'none', padding: '18px 30px', borderRadius: '18px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' },
  
  statsBar: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px', marginBottom: '50px' },
  statCard: { backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '35px', border: '1px solid #EBEBEC', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: ZAPTRO_SHADOW.md },
  statIcon: { width: '52px', height: '52px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { margin: '0 0 4px 0', fontSize: '12px', fontWeight: '700', color: '#000000', letterSpacing: '1px' },
  statVal: { margin: 0, fontSize: '26px', fontWeight: '700', color: '#000' },

  tableCard: { backgroundColor: '#FFFFFF', borderRadius: '40px', border: '1px solid #EBEBEC', overflow: 'hidden', boxShadow: ZAPTRO_SHADOW.lg },
  toolbar: { padding: '25px 40px', borderBottom: '1px solid #EBEBEC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#FBFBFC', padding: '14px 25px', borderRadius: '20px', width: '450px', border: '1px solid #EBEBEC' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', fontWeight: '700', width: '100%', color: '#000' },
  filters: { display: 'flex', gap: '12px' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '10px', border: 'none', backgroundColor: '#FBFBFC', color: '#000', padding: '12px 20px', borderRadius: '16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },

  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { backgroundColor: '#FBFBFC' },
  th: { padding: '22px 40px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#000000', letterSpacing: '1.5px' },
  tr: { borderBottom: '1px solid #EBEBEC', transition: '0.2s' },
  td: { padding: '24px 40px' },

  idCell: { display: 'flex', alignItems: 'center', gap: '18px' },
  iconCircle: { width: '42px', height: '42px', borderRadius: '14px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D9FF00' },
  mainText: { display: 'block', fontSize: '15px', fontWeight: '700', color: '#000' },
  subText: { fontSize: '11px', color: '#94A3B8', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' },
  driverCell: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatarMini: { width: '30px', height: '30px', borderRadius: '10px', backgroundColor: '#000', color: '#D9FF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' },
  badgeDot: { width: '6px', height: '6px', borderRadius: '50%' },
  actionRow: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  iconBtn: { width: '40px', height: '40px', borderRadius: '14px', border: 'none', backgroundColor: '#FBFBFC', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  waBtn: { width: '40px', height: '40px', borderRadius: '14px', border: 'none', backgroundColor: '#EEFCEF', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  modalContent: { padding: '10px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' },
  pTag: { padding: '4px 8px', backgroundColor: '#000', color: '#D9FF00', borderRadius: '6px', fontSize: '9px', fontWeight: '700', display: 'inline-block', marginBottom: '10px' },
  pTitle: { fontSize: '32px', fontWeight: '700', margin: 0, letterSpacing: '-1.5px' },
  pSub: { fontSize: '14px', color: '#94A3B8', fontWeight: '700' },
  sLabel: { fontSize: '10px', fontWeight: '700', color: '#000000', display: 'block', marginBottom: '6px' },
  sVal: { fontSize: '16px', fontWeight: '700' },

  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' },
  infoCard: { padding: '24px', backgroundColor: '#FBFBFC', borderRadius: '24px', display: 'flex', gap: '18px', alignItems: 'center' },
  infoIconBox: { width: '44px', height: '44px', borderRadius: '15px', backgroundColor: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EBEBEC' },
  iLabel: { display: 'block', fontSize: '10px', fontWeight: '700', color: '#000000', marginBottom: '4px' },
  iVal: { fontSize: '14px', fontWeight: '700', margin: 0 },

  timelineBox: { padding: '30px', backgroundColor: '#FBFBFC', borderRadius: '28px' },
  tTitle: { fontSize: '14px', fontWeight: '700', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' },
  timeline: { borderLeft: '2px solid #d4d4d8', marginLeft: '10px', paddingLeft: '35px', display: 'flex', flexDirection: 'column', gap: '30px' },
  tItem: { position: 'relative' },
  tDotActive: { position: 'absolute', left: '-42px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#D9FF00', border: '2px solid #d4d4d8' },
  tDot: { position: 'absolute', left: '-40.5px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#94A3B8' },
  tLine: { position: 'absolute', left: '-36.5px', top: '20px', height: '100%', width: '0' },

  addForm: { padding: '10px' },
  inputStack: { display: 'flex', flexDirection: 'column', gap: '20px' },
  fLabel: { fontSize: '11px', fontWeight: '700', color: '#000000', letterSpacing: '1px' },
  fInput: { padding: '16px 20px', borderRadius: '18px', border: '1px solid #EBEBEC', fontSize: '15px', fontWeight: '750', outline: 'none' },
  fSelect: { padding: '16px 20px', borderRadius: '18px', border: '1px solid #EBEBEC', fontSize: '15px', fontWeight: '700', outline: 'none', appearance: 'none' },
  fActionBtn: { width: '100%', marginTop: '40px', padding: '20px', backgroundColor: '#000', color: '#D9FF00', borderRadius: '20px', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }
};

export default ZaptroLogistics;
