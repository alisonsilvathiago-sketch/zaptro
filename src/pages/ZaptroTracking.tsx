import React, { useState } from 'react';
import { 
  Search, 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { supabaseZaptro } from '../lib/supabase-zaptro';

const ZaptroTracking: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [shipment, setShipment] = useState<any>(null);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    
    setLoading(true);
    setError(null);
    setShipment(null);

    try {
      const { data: ship, error: shipErr } = await supabaseZaptro
        .from('whatsapp_shipments')
        .select('*, whatsapp_shipment_occurrences(*)')
        .or(`tracking_code.eq.${code.toUpperCase()},customer_document.eq.${code}`)
        .maybeSingle();

      if (shipErr || !ship) {
        setError('Pedido não encontrado. Verifique o código ou documento e tente novamente.');
      } else {
        setShipment(ship);
        setOccurrences((ship.whatsapp_shipment_occurrences || []).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
    } catch (err) {
      setError('Ocorreu um erro na busca. Tente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    const steps = ['pending', 'loaded', 'in_transit', 'delivered'];
    const idx = steps.indexOf(status);
    return idx === -1 ? 0 : idx;
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logoArea}>
          <div style={styles.iconBox}>
             <ZapIcon size={24} color="#D9FF00" fill="#D9FF00" />
          </div>
          <h1 style={styles.logoText}>ZAPTRO <span style={{ color: '#D9FF00' }}>TRACKING</span></h1>
        </div>
        <p style={styles.headerSub}>Rastreamento de cargas e encomendas em tempo real.</p>
      </header>

      <main style={styles.main}>
        <section style={styles.searchSection}>
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <div style={styles.inputWrapper}>
              <Search size={20} color="#94a3b8" style={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Código de rastreio ou CPF/CNPJ" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={styles.input}
              />
            </div>
            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? 'BUSCANDO...' : 'RASTREAR AGORA'}
            </button>
          </form>
        </section>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {shipment && (
          <div style={styles.resultArea}>
            <div style={styles.statusCard}>
              <div style={styles.statusHeader}>
                <div>
                  <h2 style={styles.trackingTitle}>Pedido #{shipment.tracking_code}</h2>
                  <p style={styles.trackingSub}>{shipment.customer_name}</p>
                </div>
                <div style={styles.badge}>
                  {shipment.current_status === 'delivered' ? 'ENTREGUE' : 'EM TRÂNSITO'}
                </div>
              </div>

              <div style={styles.progressContainer}>
                {[
                  { label: 'Pendente', icon: Package },
                  { label: 'Coletado', icon: ShieldCheck },
                  { label: 'Em Rota', icon: Truck },
                  { label: 'Entregue', icon: CheckCircle2 }
                ].map((step, i) => {
                  const active = getStatusStep(shipment.current_status) >= i;
                  return (
                    <div key={i} style={styles.stepItem}>
                      <div style={{...styles.stepIcon, backgroundColor: active ? '#D9FF00' : '#1e293b'}}>
                         <step.icon size={18} color={active ? '#000' : '#475569'} />
                      </div>
                      <span style={{...styles.stepLabel, color: active ? '#f8fafc' : '#475569'}}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.timelineArea}>
               <h3 style={styles.timelineTitle}><Clock size={16} /> HISTÓRICO DE MOVIMENTAÇÃO</h3>
               <div style={styles.timelineList}>
                 {occurrences.length > 0 ? occurrences.map((occ, i) => (
                   <div key={occ.id} style={styles.timelineItem}>
                      <div style={styles.timelineDot}>
                         <div style={{...styles.dotInner, backgroundColor: i === 0 ? '#D9FF00' : '#334155'}} />
                         {i !== occurrences.length - 1 && <div style={styles.dotLine} />}
                      </div>
                      <div style={styles.timelineContent}>
                         <div style={styles.timelineHeader}>
                            <span style={styles.timelineStatus}>{occ.type.toUpperCase()}</span>
                            <span style={styles.timelineDate}>{new Date(occ.created_at).toLocaleDateString('pt-BR')} às {new Date(occ.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                         <p style={styles.timelineDesc}>{occ.description}</p>
                         {occ.location_name && (
                           <div style={styles.timelineLoc}>
                             <MapPin size={12} /> {occ.location_name}
                           </div>
                         )}
                      </div>
                   </div>
                 )) : (
                   <p style={styles.emptyTimeline}>Aguardando primeira movimentação da transportadora.</p>
                 )}
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const ZapIcon = ({ size = 24, color = "#FFF", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#f8fafc',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(217, 255, 0, 0.1)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 900,
    letterSpacing: '1px',
    margin: 0,
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  main: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  searchSection: {
    backgroundColor: '#111111',
    padding: '24px',
    borderRadius: '24px',
    border: '1px solid #1e293b',
    marginBottom: '32px',
  },
  searchForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  inputWrapper: {
    position: 'relative' as const,
    flex: 1,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  input: {
    width: '100%',
    backgroundColor: '#0a0a0a',
    border: '1px solid #334155',
    borderRadius: '14px',
    padding: '16px 16px 16px 48px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
  },
  btn: {
    backgroundColor: '#D9FF00',
    color: '#000',
    border: 'none',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#f87171',
    padding: '16px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    marginBottom: '20px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  resultArea: {
    animation: 'fadeIn 0.5s ease',
  },
  statusCard: {
    backgroundColor: '#111111',
    borderRadius: '24px',
    padding: '24px',
    border: '1px solid #1e293b',
    marginBottom: '24px',
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  },
  trackingTitle: {
    fontSize: '20px',
    fontWeight: 800,
    margin: '0 0 4px 0',
  },
  trackingSub: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: 0,
  },
  badge: {
    backgroundColor: 'rgba(217, 255, 0, 0.1)',
    color: '#D9FF00',
    padding: '6px 12px',
    borderRadius: '99px',
    fontSize: '12px',
    fontWeight: 800,
    border: '1px solid rgba(217, 255, 0, 0.3)',
  },
  progressContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  stepIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'center' as const,
  },
  timelineArea: {
    backgroundColor: '#111111',
    borderRadius: '24px',
    padding: '24px',
    border: '1px solid #1e293b',
  },
  timelineTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  timelineItem: {
    display: 'flex',
    gap: '20px',
  },
  timelineDot: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '12px',
  },
  dotInner: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  dotLine: {
    width: '2px',
    flex: 1,
    backgroundColor: '#1e293b',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: '24px',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  timelineStatus: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#f8fafc',
  },
  timelineDate: {
    fontSize: '12px',
    color: '#64748b',
  },
  timelineDesc: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 8px 0',
    lineHeight: 1.5,
  },
  timelineLoc: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#1e293b',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#cbd5e1',
  },
  emptyTimeline: {
    textAlign: 'center' as const,
    color: '#475569',
    fontSize: '14px',
    padding: '20px 0',
  }
};

export default ZaptroTracking;
