import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, Filter, Download, ArrowUpRight, 
  ChevronRight, Phone, MessageSquare, Calendar,
  FileSpreadsheet, FileText, User, MoreHorizontal,
  TrendingUp, Star, Loader2, ArrowLeft
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { zaptroClientProfilePath, ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import ZaptroKpiMetricCard from '../components/Zaptro/ZaptroKpiMetricCard';
import { exportToExcel } from '../lib/exportToExcel';
import { ZaptroLeadsTab } from './ZaptroLeadsTab';

/** Linhas fictícias (mesmo formato que `whatsapp_conversations`) para pré-visualizar a lista e KPIs. */
export function getZaptroDemoClientById(id: string): any | null {
  return buildDemoClients().find((c) => c.id === id) ?? null;
}

function buildDemoClients(): any[] {
  return [];
}

const ZaptroClients: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'clients' | 'leads'>(
    location.pathname.includes('/leads') ? 'leads' : 'clients'
  );
  
  // Sync activeTab when URL changes (e.g. back button)
  useEffect(() => {
    if (location.pathname.includes('/leads')) {
      setActiveTab('leads');
    } else {
      setActiveTab('clients');
    }
  }, [location.pathname]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  /** Lista preenchida com exemplos (sem empresa ou base vazia / erro). */
  const [isPreview, setIsPreview] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    if (!profile?.company_id) {
      setClients(buildDemoClients());
      setIsPreview(true);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabaseZaptro
        .from('whatsapp_conversations')
        .select('*, whatsapp_messages(*)')
        .eq('company_id', profile.company_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const uniqueClients = Array.from(new Map(data?.map((item) => [item.sender_number, item])).values());
      if (!uniqueClients.length) {
        setClients(buildDemoClients());
        setIsPreview(true);
      } else {
        setClients(uniqueClients);
        setIsPreview(false);
      }
    } catch (err: any) {
      setClients(buildDemoClients());
      setIsPreview(true);
      notifyZaptro(
        'warning',
        'Modo demonstração',
        err.message
          ? `Não foi possível carregar do servidor (${err.message}). A mostrar contactos fictícios para testar o layout.`
          : 'A mostrar contactos fictícios para testar o layout.'
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  const handleExportExcel = () => {
    if (!filteredClients.length) {
      notifyZaptro('info', 'Sem dados', 'Nenhum cliente encontrado com o filtro atual.');
      return;
    }
    exportToExcel(
      filteredClients.map((c) => ({
        'Nome / Empresa': c.sender_name || '—',
        'WhatsApp': c.sender_number || '—',
        'Status': c.status === 'open' ? 'Em atendimento' : 'Finalizado',
        'Último contato': c.updated_at ? new Date(c.updated_at).toLocaleString('pt-BR') : '—',
        'Mensagens': c.whatsapp_messages?.length || 0,
      })),
      'clientes_zaptro',
    );
    notifyZaptro('success', 'Excel gerado!', `${filteredClients.length} clientes exportados.`);
  };

  const filteredClients = clients.filter(
    (c) =>
      (c.sender_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      String(c.sender_number || '').includes(searchTerm)
  );

  const kpis = [
    { label: 'Total Base', value: clients.length, icon: Users },
    { label: 'Ativos 24h', value: clients.filter(c => new Date(c.updated_at) > new Date(Date.now() - 86400000)).length, icon: TrendingUp },
    { label: 'Taxa Retenção', value: '88%', icon: Star },
  ];

  return (
    <ZaptroLayout>
      <style>{`
        @keyframes zaptroClientsSpin { to { transform: rotate(360deg); } }
        .zaptro-clients-spin { animation: zaptroClientsSpin 0.9s linear infinite; }
      `}</style>
      <div style={styles.container}>
        <header style={styles.header}>
           <div style={styles.headerInfo}>
              <h1 style={styles.title}>Clientes & CRM</h1>
              <p style={styles.subtitle}>Gestão estratégica de todos os contatos atendidos pela sua central.</p>
              {isPreview && (
                <p
                  style={{
                    margin: '12px 0 0',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 0,
                    lineHeight: 1.3,
                    color: 'rgba(33, 33, 33, 1)',
                    backgroundColor: 'rgba(217, 255, 0, 0.33)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    padding: '9px 7px',
                    borderRadius: 8,
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  Pré-visualização: contactos fictícios para veres o layout da tabela e dos indicadores. Com conversas
                  reais no projeto, esta lista passa a mostrar os teus clientes automaticamente.
                </p>
              )}
           </div>
           <div style={styles.actions}>
              <button style={styles.exportBtn} onClick={handleExportExcel}>
                 <FileSpreadsheet size={16} /> Exportar Excel
                 {filteredClients.length > 0 && (
                   <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 999, padding: '1px 8px', fontSize: 11 }}>
                     {filteredClients.length}
                   </span>
                 )}
              </button>
           </div>
        </header>

        {/* CRM DASHBOARD MINI */}
        <div style={styles.kpiGrid}>
           {kpis.map((k) => (
             <ZaptroKpiMetricCard
               key={k.label}
               icon={k.icon}
               title={k.label}
               value={k.value}
             />
           ))}
        </div>

        {/* Tab Switcher Premium - Standard Black Style */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, marginTop: 12 }}>
          <button
            onClick={() => {
              setActiveTab('clients');
              navigate(ZAPTRO_ROUTES.CLIENTS);
            }}
            style={{
              padding: '8px 18px',
              borderRadius: 14,
              backgroundColor: activeTab === 'clients' ? '#000' : 'transparent',
              color: activeTab === 'clients' ? '#D9FF00' : '#64748B',
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Clientes Base
          </button>
          <button
            onClick={() => {
              setActiveTab('leads');
              navigate('/clientes/leads');
            }}
            style={{
              padding: '8px 18px',
              borderRadius: 14,
              backgroundColor: activeTab === 'leads' ? '#000' : 'transparent',
              color: activeTab === 'leads' ? '#D9FF00' : '#64748B',
              fontWeight: 700,
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Leads & Oportunidades
          </button>
        </div>

        {activeTab === 'clients' ? (
          <div style={styles.listSection}>
            <div style={styles.toolbar}>
              <div style={styles.searchBox}>
                  <Search size={18} color="#94A3B8" />
                  <input 
                    placeholder="Buscar por nome ou WhatsApp..." 
                    style={styles.searchInput} 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
              <button
                type="button"
                style={styles.filterBtn}
                onClick={() =>
                  notifyZaptro('info', 'Filtros avançados', 'Use a busca acima por nome ou número. Filtros por status chegam em breve.')
                }
              >
                <Filter size={16} /> Filtrar Base
              </button>
            </div>

            {loading ? (
              <div style={styles.loadingArea}><Loader2 className="zaptro-clients-spin" size={32} color="#000" /></div>
            ) : (
              <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                      <tr style={styles.thead}>
                          <th style={styles.th}>CLIENTE</th>
                          <th style={styles.th}>STATUS</th>
                          <th style={styles.th}>ÚLTIMO CONTATO</th>
                          <th style={styles.th}>INTERAÇÕES</th>
                          <th style={styles.th}>AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!filteredClients.length ? (
                        <tr>
                          <td colSpan={5} style={{ ...styles.td, textAlign: 'center', padding: 48, color: '#64748B', fontWeight: 700 }}>
                            Nenhum contacto corresponde à busca. Limpa o filtro ou altera o termo.
                          </td>
                        </tr>
                      ) : (
                      filteredClients.map(c => (
                        <tr key={c.id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={styles.clientCell}>
                                  <div style={styles.avatar}>{c.sender_name?.[0] || <User size={14}/>}</div>
                                  <div style={styles.clientInfo}>
                                    <span style={styles.clientName}>{c.sender_name || 'Cliente S/ Nome'}</span>
                                    <span style={styles.clientPhone}>{c.sender_number}</span>
                                  </div>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span style={{...styles.statBadge, backgroundColor: c.status === 'open' ? '#EEFCEF' : '#F1F5F9', color: c.status === 'open' ? '#10B981' : '#64748B'}}>
                                  {c.status === 'open' ? 'EM ATENDIMENTO' : 'FINALIZADO'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.dateCell}>
                                  <Calendar size={14} color="#94A3B8" />
                                  <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.interactionCell}>
                                  <MessageSquare size={14} color="#D9FF00" />
                                  <span>{c.whatsapp_messages?.length || 0} msgs</span>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <button
                                style={styles.viewBtn}
                                type="button"
                                onClick={() => navigate(zaptroClientProfilePath(String(c.id)))}
                              >
                                  Ver Perfil <ChevronRight size={16} />
                              </button>
                            </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <ZaptroLeadsTab />
        )}
      </div>
    </ZaptroLayout>
  );
};

const styles: Record<string, any> = {
  container: { display: 'flex', flexDirection: 'column', gap: '40px', width: '100%', maxWidth: 1360, margin: '0 auto', boxSizing: 'border-box', padding: '0 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 },
  headerInfo: { flex: 1, minWidth: 0 },
  actions: { flexShrink: 0 },
  title: { fontSize: '32px', fontWeight: '700', color: '#000', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: '#64748B', fontWeight: '500', margin: '4px 0 0 0' },
  
  exportBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' },

  listSection: { display: 'flex', flexDirection: 'column', gap: '24px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', gap: '16px' },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#FBFBFC', padding: '14px 20px', borderRadius: '18px', border: '1px solid #EBEBEC' },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: '600', color: '#000', width: '100%' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', backgroundColor: '#FBFBFC', border: '1px solid #EBEBEC', borderRadius: '18px', fontSize: '13px', fontWeight: '600', color: '#000000' },

  tableCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #EBEBEC', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { backgroundColor: '#FBFBFC', borderBottom: '1px solid #EBEBEC' },
  th: { padding: '20px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' },
  tr: { borderBottom: '1px solid #EBEBEC' },
  td: { padding: '20px 24px' },
  
  clientCell: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatar: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#000', color: '#D9FF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' },
  clientName: { display: 'block', fontSize: '14px', fontWeight: '700', color: '#000' },
  clientPhone: { display: 'block', fontSize: '12px', color: '#94A3B8', fontWeight: '600' },
  
  statBadge: { padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.02em' },
  dateCell: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#475569' },
  interactionCell: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#475569' },
  
  viewBtn: { padding: '10px 16px', backgroundColor: '#FBFBFC', color: '#000', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  
  loadingArea: { padding: '100px', textAlign: 'center' }
};

export default ZaptroClients;
