import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Package, MapPin, Clock, CheckCircle2, 
  AlertCircle, Truck, Calendar, Map as MapIcon,
  ShieldCheck, ArrowLeft, Loader2, Globe
} from 'lucide-react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';

const ZaptroTrackingPublic: React.FC = () => {
  const { token } = useParams<{token: string}>();
  const [shipment, setShipment] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]); // Tracking History
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracking = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const { data, error: shipError } = await supabaseZaptro
          .from('whatsapp_shipments')
          .select('*')
          .eq('tracking_token', token)
          .single();

        if (shipError || !data) {
          setError('Link inválido ou carga não encontrada.');
          return;
        }

        let companyName: string | undefined;
        if (data.company_id) {
          const { data: comp } = await supabaseZaptro
            .from('whatsapp_companies')
            .select('name')
            .eq('id', data.company_id)
            .maybeSingle();
          companyName = comp?.name;
        }
        const dataWithCompany = { ...data, company: companyName ? { name: companyName } : null };

        // Verifica expiração (24h após entrega)
        if (data.status === 'entregue' && data.delivered_at) {
          const deliveredDate = new Date(data.delivered_at);
          const limitDate = new Date(deliveredDate.getTime() + 24 * 60 * 60 * 1000);
          if (new Date() > limitDate) {
            setError('Este link de rastreio expirou após 24h da entrega.');
            return;
          }
        }

        setShipment(dataWithCompany);

        const { data: histData } = await supabaseZaptro
          .from('whatsapp_shipment_history')
          .select('*')
          .eq('shipment_id', data.id)
          .order('created_at', { ascending: false });

        setHistory(histData || []);
      } catch (err: any) {
        setError('Erro ao carregar rastreio.');
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
  }, [token]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'em_rota': return { color: '#4F46E5', label: 'Emapa Rota', icon: Truck };
      case 'coleta': return { color: '#64748B', label: 'Em Coleta', icon: Package };
      case 'entregue': return { color: '#10B981', label: 'Entregue', icon: CheckCircle2 };
      case 'atraso': return { color: '#EF4444', label: 'Atraso', icon: AlertCircle };
      default: return { color: '#94A3B8', label: 'Pendente', icon: Clock };
    }
  };

  if (loading) return (
    <div style={styles.fullPage}><Loader2 className="animate-spin" size={48} color="#CCFF00" /></div>
  );

  if (error) return (
    <div style={styles.fullPage}>
       <AlertCircle size={64} color="#EF4444" style={{marginBottom: '24px'}} />
       <h1 style={styles.errorTitle}>Ops! Algo deu errado.</h1>
       <p style={styles.errorText}>{error}</p>
       <button style={styles.backBtn} onClick={() => window.location.href = '/'}>Voltar ao Início</button>
    </div>
  );

  const statusStyle = getStatusStyle(shipment.status);

  return (
    <div style={styles.page}>
       <header style={styles.header}>
          <div style={styles.brand}>
             <div style={styles.logoBox}><Package size={20} color="#0F172A" /></div>
             <span style={styles.brandName}>Rastreio Zaptro</span>
          </div>
          <div style={styles.companyInfo}>
             Transportadora: <strong>{shipment.company?.name || 'Zaptro Cloud'}</strong>

          </div>
       </header>

       <main style={styles.content}>
          <div style={styles.mainCard}>
             <div style={styles.trackingHeader}>
                <div>
                   <span style={styles.orderLabel}>NÚMERO DO PEDIDO</span>
                   <h2 style={styles.orderId}>{shipment.order_id}</h2>
                </div>
                <div style={{...styles.statusBadge, backgroundColor: statusStyle.color + '10', color: statusStyle.color}}>
                   <statusStyle.icon size={16} />
                   {statusStyle.label.toUpperCase()}
                </div>
             </div>

             <div style={styles.progressArea}>
                <div style={styles.progressBar}>
                   <div style={{...styles.progressFill, width: shipment.status === 'entregue' ? '100%' : shipment.status === 'em_rota' ? '65%' : '20%', backgroundColor: statusStyle.color}} />
                </div>
                <div style={styles.progressSteps}>
                   <div style={styles.step}><span>Coleta</span></div>
                   <div style={styles.step}><span style={{textAlign: 'center'}}>Em Rota</span></div>
                   <div style={styles.step}><span style={{textAlign: 'right'}}>Entregue</span></div>
                </div>
             </div>

             <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                   <MapPin size={18} color="#94A3B8" />
                   <div>
                      <span style={styles.detailLabel}>Destino Final</span>
                      <strong style={styles.detailValue}>{shipment.destination}</strong>
                   </div>
                </div>
                <div style={styles.detailItem}>
                   <Clock size={18} color="#94A3B8" />
                   <div>
                      <span style={styles.detailLabel}>Última Atualização</span>
                      <strong style={styles.detailValue}>{new Date(shipment.updated_at).toLocaleString('pt-BR')}</strong>
                   </div>
                </div>
             </div>
          </div>

          <div style={styles.historyArea}>
             <h3 style={styles.sectionTitle}>Histórico de Eventos</h3>
             <div style={styles.timeline}>
                {history.length > 0 ? history.map((h, i) => (
                  <div key={h.id} style={styles.timelineItem}>
                     <div style={styles.timelinePoint}>
                        <div style={{...styles.pointInner, backgroundColor: i === 0 ? '#CCFF00' : '#E2E8F0'}} />
                        {i < history.length - 1 && <div style={styles.timelineLine} />}
                     </div>
                     <div style={styles.timelineContent}>
                        <div style={styles.timelineMeta}>
                           <span style={styles.timelineStatus}>{h.status}</span>
                           <span style={styles.timelineTime}>{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        {h.notes && <p style={styles.timelineNotes}>{h.notes}</p>}
                     </div>
                  </div>
                )) : (
                  <div style={styles.emptyTimeline}>
                     Iniciando processamento da carga...
                  </div>
                )}
             </div>
          </div>
       </main>

       <footer style={styles.footer}>
          <div style={styles.secureBadge}>
             <ShieldCheck size={14} color="#10B981" />
             <span>Rastreamento Seguro via Zaptro Logistics</span>
          </div>
          <p style={styles.footerNote}>Este link expira automaticamente após a entrega por motivos de segurança.</p>
       </footer>
    </div>
  );
};

const styles: Record<string, any> = {
  fullPage: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', backgroundColor: '#FFFFFF', padding: '20px' },
  page: { minHeight: '100vh', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'Inter, sans-serif' },
  header: { padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1000px', margin: '0 auto' },
  brand: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoBox: { width: '40px', height: '40px', backgroundColor: '#CCFF00', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: '18px', fontWeight: '950', letterSpacing: '-0.5px' },
  companyInfo: { fontSize: '13px', color: '#64748B' },

  content: { maxWidth: '1000px', margin: '0 auto', padding: '0 40px 80px' },
  mainCard: { backgroundColor: 'white', borderRadius: '40px', border: '1px solid #F1F5F9', padding: '48px', marginBottom: '32px', boxShadow: ZAPTRO_SHADOW.lg },
  trackingHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' },
  orderLabel: { fontSize: '11px', fontWeight: '950', color: '#000000', letterSpacing: '1px' },
  orderId: { fontSize: '32px', fontWeight: '950', margin: '4px 0 0 0', letterSpacing: '-1.5px' },
  statusBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '14px', fontSize: '13px', fontWeight: '950' },

  progressArea: { marginBottom: '48px' },
  progressBar: { height: '12px', backgroundColor: '#F1F5F9', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' },
  progressFill: { height: '100%', transition: '1s cubic-bezier(0.4, 0, 0.2, 1)' },
  progressSteps: { display: 'flex', justifyContent: 'space-between' },
  step: { flex: 1, fontSize: '12px', fontWeight: '900', color: '#000000' },

  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' },
  detailItem: { display: 'flex', gap: '16px', alignItems: 'center' },
  detailLabel: { fontSize: '11px', fontWeight: '900', color: '#000000', textTransform: 'uppercase', display: 'block' },
  detailValue: { fontSize: '16px', fontWeight: '800', color: '#0F172A' },

  historyArea: { backgroundColor: 'white', borderRadius: '40px', border: '1px solid #F1F5F9', padding: '48px', boxShadow: ZAPTRO_SHADOW.lg },
  sectionTitle: { fontSize: '20px', fontWeight: '950', marginBottom: '32px', letterSpacing: '-0.5px' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '0px' },
  timelineItem: { display: 'flex', gap: '24px' },
  timelinePoint: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px' },
  pointInner: { width: '12px', height: '12px', borderRadius: '50%', zIndex: 2 },
  timelineLine: { width: '2px', flex: 1, backgroundColor: '#F1F5F9', margin: '4px 0' },
  timelineContent: { paddingBottom: '32px', flex: 1 },
  timelineMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  timelineStatus: { fontSize: '15px', fontWeight: '900', color: '#0F172A' },
  timelineTime: { fontSize: '12px', color: '#94A3B8', fontWeight: '600' },
  timelineNotes: { fontSize: '13px', color: '#64748B', fontWeight: '500', margin: 0 },
  emptyTimeline: { textAlign: 'center', color: '#94A3B8', fontSize: '14px', fontWeight: '600' },

  footer: { textAlign: 'center', padding: '40px' },
  secureBadge: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#EEFCEF', color: '#10B981', borderRadius: '12px', fontSize: '11px', fontWeight: '950', marginBottom: '12px' },
  footerNote: { fontSize: '12px', color: '#94A3B8', fontWeight: '500' },

  errorTitle: { fontSize: '24px', fontWeight: '950', margin: '0 0 12px 0' },
  errorText: { fontSize: '16px', color: '#64748B', margin: '0 0 32px 0' },
  backBtn: { padding: '16px 32px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '950', cursor: 'pointer' }
};

export default ZaptroTrackingPublic;
