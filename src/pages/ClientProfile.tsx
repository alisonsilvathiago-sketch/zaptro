import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, MapPin, Globe, Calendar, 
  TrendingUp, Package, DollarSign, Clock, 
  ChevronLeft, Share2, MoreVertical, CheckCircle2,
  AlertTriangle, FileText, Download, Star, History, Square, Search, Filter, MessageSquare
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { supabase } from '../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import { useAuth } from '../context/AuthContext';

const styles: Record<string, any> = {
  container: { padding: '32px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '24px', fontSize: '14px' },
  
  heroSection: { 
    display: 'grid', gridTemplateColumns: 'min-content 1fr min-content', gap: '32px', 
    alignItems: 'center', marginBottom: '40px', backgroundColor: 'white', 
    padding: '40px', borderRadius: '32px', border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)'
  },
  avatarLarge: { 
    width: '120px', height: '120px', borderRadius: '40px', 
    backgroundColor: 'var(--primary-light)', color: 'var(--primary)', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    fontSize: '48px', fontWeight: '950', border: '4px solid white',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
  },
  heroInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  heroTitle: { fontSize: '32px', fontWeight: '950', color: 'var(--text-main)', margin: 0, letterSpacing: '-1.5px' },
  heroSubtitle: { fontSize: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' },
  badgeActive: { padding: '6px 16px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '30px', fontSize: '12px', fontWeight: '900' },
  
  actionGroup: { display: 'flex', gap: '12px' },
  btnAction: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },
  btnPrimary: { backgroundColor: 'var(--primary)', color: 'white', border: 'none' },

  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '32px' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '24px' },
  sideCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' },
  sideTitle: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' },
  infoItem: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' },

  contentArea: { display: 'flex', flexDirection: 'column', gap: '32px' },
  tabs: { 
    display: 'flex', gap: '8px', backgroundColor: '#ebebeb', 
    padding: '6px', borderRadius: '20px', marginBottom: '24px',
    width: 'fit-content', border: '1px solid var(--border)'
  },
  tab: { 
    padding: '10px 20px', border: 'none', borderRadius: '16px', 
    background: 'none', fontWeight: '800', fontSize: '13px', 
    color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
    display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' 
  },
  tabActive: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: 'var(--shadow-md)', transform: 'translateY(-1px)' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: '24px', fontWeight: '950', color: 'var(--text-main)', margin: '4px 0 0 0' },
  statLabel: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', margin: 0 },
  
  chartCard: { backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)' },
  
  historyList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  historyItem: { 
    display: 'grid', gridTemplateColumns: 'min-content 1fr min-content min-content', 
    gap: '24px', alignItems: 'center', padding: '20px', 
    backgroundColor: 'white', borderRadius: '20px', border: '1px solid var(--border)',
    transition: 'all 0.2s', cursor: 'pointer'
  },
  histIcon: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  histMain: { display: 'flex', flexDirection: 'column', gap: '4px' },
  histStatus: { padding: '6px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '950' }
};

const ClientProfile: React.FC = () => {
  const { profile } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'logistic' | 'docs'>('overview');
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const canSeeValues = ['ADMIN', 'MASTER_ADMIN', 'FINANCEIRO'].includes(profile?.role || '');

  useEffect(() => {
    const loadClient = async () => {
      setLoading(true);
      const { data } = await supabase.from('clients').select('*').eq('id', id).single();
      
      // Carregar Logs de Auditoria do Cliente
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*, profiles:user_id(full_name)')
        .eq('metadata->id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setAuditLogs(logs || []);

      if (data) setClient(data);
      else {
        // Fallback mock para demonstração
        setClient({
          id,
          name: 'Indústria Metalúrgica Precision S.A.',
          handle: '@precision_sa',
          cnpj: '12.345.678/0001-99',
          email: 'contato@precision.com.br',
          phone: '(11) 98765-4321',
          address: 'Av. Industrial, 450 - São Paulo, SP',
          website: 'www.precision.com.br',
          status: 'ACTIVE',
          since: '12/05/2023',
          totalSpent: 452800.00,
          pending: 12500.00,
          ordersCount: 142
        });
      }
      setLoading(false);
    };
    loadClient();
  }, [id, profile]);

  const formatCurrency = (val: number) => {
    if (!canSeeValues) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const chartData = [
    { name: 'Jan', value: 32000 },
    { name: 'Fev', value: 45000 },
    { name: 'Mar', value: 42000 },
    { name: 'Abr', value: 58000 },
    { name: 'Mai', value: 51200 },
    { name: 'Jun', value: 64000 },
  ];

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toastSuccess('Link do perfil copiado! O destinatário precisará estar logado para visualizar.');
  };

  if (loading) return <div style={styles.container}>Carregando inteligência do cliente...</div>;

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={() => navigate('/clientes')}>
        <ChevronLeft size={20} /> Voltar para Lista
      </button>

      {/* HERO SECTION */}
      <section style={styles.heroSection}>
        <div style={styles.avatarLarge}>
          {client?.name?.[0] || 'C'}
        </div>
        <div style={styles.heroInfo}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
             <h1 style={styles.heroTitle}>{client?.name}</h1>
             <span style={styles.badgeActive}>CLIENTE ATIVO</span>
          </div>
          <div style={styles.heroSubtitle}>
             <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Globe size={14} color="var(--primary)" /> {client?.handle || '@cliente_logta'}</span>
             <span style={{color: 'var(--border)'}}>|</span>
             <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Square size={14} color="var(--primary)" /> ID: {id?.slice(0, 8)}</span>
             <span style={{color: 'var(--border)'}}>|</span>
             <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Calendar size={14} color="var(--primary)" /> Parceiro desde {client?.since}</span>
          </div>
        </div>
        <div style={styles.actionGroup}>
           <button style={{...styles.btnAction, ...styles.btnPrimary}} onClick={handleShare}>
              <Share2 size={18} /> Compartilhar Perfil
           </button>
           <button style={styles.btnAction}>
              <MoreVertical size={18} />
           </button>
        </div>
      </section>

      <div style={styles.mainGrid}>
        {/* SIDEBAR */}
        <aside style={styles.sidebar}>
          <div style={styles.sideCard}>
            <p style={styles.sideTitle}>Informações de Contato</p>
            <div style={styles.infoItem}><Mail size={16} /> {client?.email}</div>
            <div style={styles.infoItem}><Phone size={16} /> {client?.phone}</div>
            <div style={styles.infoItem}><Globe size={16} /> {client?.website}</div>
            <div style={styles.infoItem}><MapPin size={16} /> {client?.address}</div>
          </div>

          <div style={styles.sideCard}>
            <p style={styles.sideTitle}>Métricas de Fidelidade</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
               <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}>
                  <span>NPS Médio</span>
                  <span style={{color: 'var(--success)', fontWeight: '900'}}>9.8/10</span>
               </div>
               <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}>
                  <span>Pontualidade Pag.</span>
                  <span style={{color: 'var(--success)', fontWeight: '900'}}>100%</span>
               </div>
               <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}>
                  <span>Retenção</span>
                  <span style={{color: 'var(--primary)', fontWeight: '900'}}>Premium</span>
               </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main style={styles.contentArea}>
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div><p style={styles.statLabel}>Volume Total (LTV)</p><h2 style={styles.statValue}>{formatCurrency(client?.totalSpent || 0)}</h2></div>
              <TrendingUp size={24} color="var(--primary)" />
            </div>
            <div style={styles.statCard}>
              <div><p style={styles.statLabel}>Pedidos Concluídos</p><h2 style={styles.statValue}>{client?.ordersCount}</h2></div>
              <Package size={24} color="#D9FF00" />
            </div>
            <div style={styles.statCard}>
              <div><p style={styles.statLabel}>Saldo Pendente</p><h2 style={{...styles.statValue, color: '#ef4444'}}>{formatCurrency(client?.pending || 0)}</h2></div>
              <DollarSign size={24} color="#ef4444" />
            </div>
          </div>

          <div style={styles.chartCard}>
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px'}}>
                <h3 style={{margin: 0, fontWeight: '900'}}>Evolução Mensal de Faturamento</h3>
                <div style={{display: 'flex', gap: '8px'}}>
                   <button style={{...styles.btnAction, padding: '8px 16px', fontSize: '11px'}}>Últimos 6 meses</button>
                   <button style={{...styles.btnAction, padding: '8px 16px', fontSize: '11px'}}><Download size={14} /> Dados</button>
                </div>
             </div>
             <div style={{height: '300px'}}>
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                      <YAxis hide />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div style={styles.tabs}>
            <button style={{...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {})}} onClick={() => setActiveTab('overview')}>
              <TrendingUp size={16} /> Dashboard Intelligence
            </button>
            <button style={{...styles.tab, ...(activeTab === 'finance' ? styles.tabActive : {})}} onClick={() => setActiveTab('finance')}>
              <DollarSign size={16} /> Gestão de Faturam.
            </button>
            <button style={{...styles.tab, ...(activeTab === 'logistic' ? styles.tabActive : {})}} onClick={() => setActiveTab('logistic')}>
              <Clock size={16} /> Operacional
            </button>
            <button style={{...styles.tab, ...(activeTab === 'docs' ? styles.tabActive : {})}} onClick={() => setActiveTab('docs')}>
              <FileText size={16} /> Documentos & Contratos
            </button>
            <button style={{...styles.tab, ...(activeTab === 'whatsapp' ? styles.tabActive : {})}} onClick={() => setActiveTab('whatsapp')}>
              <MessageSquare size={16} /> Histórico WhatsApp
            </button>
            <button style={{...styles.tab, ...(activeTab === 'logistic' ? styles.tabActive : {})}} onClick={() => setActiveTab('logistic')}>
              <Clock size={16} /> Operacional / Rotas
            </button>
          </div>

          <div style={{...styles.actionRow, marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center'}}>
             <div style={{flex: 1, position: 'relative'}}>
                <Search size={16} style={{position: 'absolute', left: '16px', top: '16px', color: '#94a3b8'}} />
                <input placeholder="Filtrar pedidos, produtos ou motoristas..." style={{...styles.btnAction, width: '100%', paddingLeft: '48px', height: '48px', textAlign: 'left'}} />
             </div>
             <div style={{display: 'flex', gap: '12px', height: '48px'}}>
                <div style={{...styles.btnAction, padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px'}}><Calendar size={18} /> Período</div>
                <div style={{...styles.btnAction, padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px'}}><Filter size={18} /> Filtros</div>
             </div>
          </div>

          <div className="animate-fade-in" style={styles.historyList}>
            {activeTab === 'overview' && [
              { id: '10254', date: '09/04/2026', items: '45x Bobinas de Aço', status: 'ENTREGUE', val: 'R$ 12.400', driver: 'Carlos Oliveira', vehicle: 'Volvo FH 540 (ABC-1234)', arrival: '14:35', notes: 'Entrega realizada sem avarias.' },
              { id: '10248', date: '07/04/2026', items: '12x Motores Elétricos', status: 'ENTREGUE', val: 'R$ 8.900', driver: 'Ricardo Lima', vehicle: 'Scania R450 (XYZ-9988)', arrival: '09:20', notes: 'Cliente solicitou descarga prioritária.' }
            ].map((item, idx) => (
              <div key={idx} style={{...styles.historyItem, gridTemplateColumns: 'min-content 1.5fr 1fr 1fr min-content', gap: '32px'}}>
                <div style={styles.histIcon}>
                   {item.status === 'ENTREGUE' ? <CheckCircle2 size={24} color="#10b981" /> : <AlertTriangle size={24} color="#ef4444" />}
                </div>
                <div style={styles.histMain}>
                   <h4 style={{margin: 0, fontSize: '15px', fontWeight: '800'}}>Pedido #{item.id} — {item.items}</h4>
                   <p style={{margin: 0, fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px'}}>
                      <span style={{fontWeight: '700', color: 'var(--primary)'}}>Motorista:</span> {item.driver} 
                      <span style={{margin: '0 8px', color: '#cbd5e1'}}>|</span>
                      <span style={{fontWeight: '700', color: 'var(--primary)'}}>Veículo:</span> {item.vehicle}
                   </p>
                </div>
                <div>
                   <p style={{margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '800'}}>CHEGADA / LOCAL</p>
                   <p style={{margin: 0, fontSize: '13px', fontWeight: '700', color: '#1e293b', marginTop: '4px'}}>{item.date} às {item.arrival}</p>
                </div>
                <div>
                   <p style={{margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '800'}}>VALOR PAGO</p>
                   <p style={{margin: 0, fontSize: '13px', fontWeight: '950', color: '#10b981', marginTop: '4px'}}>{formatCurrency(parseFloat(item.val.replace('R$ ', '').replace('.', '')))}</p>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <span style={{
                      ...styles.histStatus,
                      backgroundColor: item.status === 'ENTREGUE' ? '#ecfdf5' : '#fef2f2',
                      color: item.status === 'ENTREGUE' ? '#10b981' : '#ef4444',
                      textAlign: 'center'
                    }}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>

            {activeTab === 'finance' && (
               <div style={{padding: '40px', textAlign: 'center', color: 'var(--text-muted)'}}>
                  <DollarSign size={48} style={{marginBottom: '16px', opacity: 0.3}} />
                  <p>As faturas deste cliente estão sendo sincronizadas com o histórico bancário.</p>
               </div>
            )}
            
            {activeTab === 'whatsapp' && (
               <div style={styles.historyList}>
                  <div style={{...styles.featureCard, padding: '24px', backgroundColor: '#fcfcfc', border: '1px dashed var(--border)', borderRadius: '16px', marginBottom: '20px'}}>
                     <h4 style={{margin: 0, fontSize: '14px'}}>Sincronização com WhatsApp Intelligence</h4>
                     <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>Abaixo estão as últimas mensagens trocadas com este cliente via Zaptro.</p>
                  </div>
                  {/* Espaço para o histórico de chat filtrado por telefone */}
                  <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                     <div style={{padding: '20px', backgroundColor: '#f4f4f4', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px'}}>
                        <div style={{width: '32px', height: '32px', backgroundColor: 'var(--primary)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: '900'}}>Z</div>
                        <div>
                           <p style={{margin: 0, fontSize: '13px', fontWeight: '700'}}>Zaptro Automação</p>
                           <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#475569'}}>Contrato enviado e aguardando assinatura.</p>
                        </div>
                     </div>
                     <div style={{padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px', alignSelf: 'flex-start'}}>
                        <div style={{width: '32px', height: '32px', backgroundColor: '#E2E8F0', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900'}}>{client?.name?.[0]}</div>
                        <div>
                           <p style={{margin: 0, fontSize: '13px', fontWeight: '700'}}>{client?.name}</p>
                           <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#475569'}}>Ok, vou verificar e retorno.</p>
                        </div>
                     </div>
                  </div>
               </div>
            )}
            
            {activeTab === 'docs' && (
               <div style={styles.historyList}>
                  <div style={{...styles.statCard, marginBottom: '20px'}}>
                     <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                        <div style={{width: '40px', height: '40px', backgroundColor: '#fef2f2', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}><FileText color="#ef4444" size={20} /></div>
                        <div>
                           <p style={{margin: 0, fontSize: '14px', fontWeight: '800'}}>Contrato_Prestacao_Servicos.pdf</p>
                           <p style={{margin: 0, fontSize: '11px', color: '#94a3b8'}}>Assinado em 12/04/2026</p>
                        </div>
                     </div>
                     <button style={{...styles.btnAction, padding: '8px'}}><Download size={16} /></button>
                  </div>
                  <div style={styles.statCard}>
                     <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                        <div style={{width: '40px', height: '40px', backgroundColor: 'rgba(217, 255, 0, 0.12)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}><FileText color="#D9FF00" size={20} /></div>
                        <div>
                           <p style={{margin: 0, fontSize: '14px', fontWeight: '800'}}>Comprovante_Entrega_9921.jpg</p>
                           <p style={{margin: 0, fontSize: '11px', color: '#94a3b8'}}>Anexado via WhatsApp</p>
                        </div>
                     </div>
                     <button style={{...styles.btnAction, padding: '8px'}}><Download size={16} /></button>
                  </div>
               </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default ClientProfile;
