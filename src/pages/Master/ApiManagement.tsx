import React, { useState, useEffect } from 'react';
import { 
  Plus, RefreshCw, MessageSquare, CreditCard, Globe, 
  Mail, ShieldCheck, Layers, Settings, ArrowUpRight 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import LogtaModal from '../../components/Modal';

const ApiManagement: React.FC = () => {
  const [apis, setApis] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [newApi, setNewApi] = useState({
    name: '',
    type: 'PAGAMENTO',
    category: 'Financeiro',
    description: '',
    icon_name: 'Layers',
    base_url: '',
    doc_url: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: apisData } = await supabase.from('apis_master').select('*').order('name');
      const { data: connData } = await supabase.from('apis_company').select('*, companies(name)');
      setApis(apisData || []);
      setConnections(connData || []);
    } catch (err) {
      console.error('API Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateApi = async (e: React.FormEvent) => {
    e.preventDefault();
    const tid = toastLoading('Publicando gateway...');
    try {
      const { error } = await supabase.from('apis_master').insert([newApi]);
      if (error) throw error;
      fetchData();
      setIsAddModalOpen(false);
      toastSuccess('Catálogo global atualizado!');
    } catch (err: any) {
      toastError(err.message);
    } finally {
      toastDismiss(tid);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Hub Central de APIs</h1>
          <p style={styles.subtitle}>Gestão de catálogo global para integração das instâncias filhas.</p>
        </div>
        <div style={styles.headerActions}>
           <button style={styles.refreshBtn} onClick={fetchData}><RefreshCw size={18} /></button>
           <button style={styles.primaryBtn} onClick={() => setIsAddModalOpen(true)}>
             <Plus size={20} /> Adicionar ao Catálogo
           </button>
        </div>
      </header>

      <div style={styles.metricsGrid}>
         <div style={styles.metricCard}>
            <div style={{...styles.metricDot, backgroundColor: '#D9FF00'}} />
            <div style={styles.metricInfo}>
               <p style={styles.metricLabel}>Chamadas / 24h</p>
               <h3 style={styles.metricValue}>1.2M</h3>
            </div>
         </div>
         <div style={styles.metricCard}>
            <div style={{...styles.metricDot, backgroundColor: '#10b981'}} />
            <div style={styles.metricInfo}>
               <p style={styles.metricLabel}>Uptime Global</p>
               <h3 style={styles.metricValue}>99.98%</h3>
            </div>
         </div>
         <div style={styles.metricCard}>
            <div style={{...styles.metricDot, backgroundColor: '#D9FF00'}} />
            <div style={styles.metricInfo}>
               <p style={styles.metricLabel}>Conexões Ativas</p>
               <h3 style={styles.metricValue}>{connections.length}</h3>
            </div>
         </div>
         <div style={styles.metricCard}>
            <div style={{...styles.metricDot, backgroundColor: '#ef4444'}} />
            <div style={styles.metricInfo}>
               <p style={styles.metricLabel}>Erros Críticos</p>
               <h3 style={styles.metricValue}>0</h3>
            </div>
         </div>
      </div>

      <div style={styles.tableSection}>
        <div style={styles.tableHeader}><h3 style={styles.tableTitle}>Provedores Certificados</h3></div>
        <div style={{overflowX: 'auto'}}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>API / SERVIÇO</th>
                <th style={styles.th}>INSTÂNCIAS CONECTADAS</th>
                <th style={styles.th}>ENDPOINT BASE</th>
                <th style={styles.th}>STATUS</th>
                <th style={{...styles.th, textAlign: 'right'}}>OPÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {apis.map(api => {
                const conns = connections.filter(c => c.api_id === api.id);
                return (
                  <tr key={api.id} style={styles.tr}>
                    <td style={styles.td}>
                       <div style={styles.apiInfo}>
                          <div style={styles.apiIconBox}><ShieldCheck size={18} /></div>
                          <div>
                             <div style={styles.apiName}>{api.name}</div>
                             <div style={styles.apiDesc}>{api.category}</div>
                          </div>
                       </div>
                    </td>
                    <td style={styles.td}>
                       <div style={styles.connStack}>
                          {conns.length > 0 ? (
                            <>
                               {conns.slice(0, 3).map((c, i) => (
                                 <div key={i} style={styles.miniAvatar}>{c.companies?.name[0]}</div>
                               ))}
                               {conns.length > 3 && <span style={styles.moreConn}>+{conns.length - 3}</span>}
                            </>
                          ) : <span style={{fontSize: '11px', color: '#94a3b8'}}>Nenhuma</span>}
                       </div>
                    </td>
                    <td style={styles.td}>
                       <div style={styles.urlCell}>
                          <Globe size={12} color="#94a3b8" />
                          <code>{api.base_url?.substring(0, 20)}...</code>
                       </div>
                    </td>
                    <td style={styles.td}>
                       <div style={styles.statusTag}><div style={styles.statusDot} /> OPERACIONAL</div>
                    </td>
                    <td style={{...styles.td, textAlign: 'right'}}>
                       <div style={styles.rowActions}>
                          <button style={styles.rowBtn}><Settings size={16} /></button>
                          <button style={styles.rowBtn}><ArrowUpRight size={16} /></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <LogtaModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Novo Recurso Integrador Global" 
        width="600px"
      >
         <form style={styles.form} onSubmit={handleCreateApi}>
            <div style={styles.fGrid}>
               <div style={styles.fGroup}>
                  <label style={styles.label}>Nome do Provedor</label>
                  <input style={styles.input} required value={newApi.name} onChange={e => setNewApi({...newApi, name: e.target.value})} />
               </div>
               <div style={styles.fGroup}>
                  <label style={styles.label}>Categoria</label>
                  <select style={styles.input} value={newApi.category} onChange={e => setNewApi({...newApi, category: e.target.value})}>
                     {['Financeiro', 'RH', 'Logistica', 'Atendimento', 'Estoque', 'CRM'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
            </div>
            <div style={styles.fGroup}>
               <label style={styles.label}>URL da API</label>
               <input style={styles.input} value={newApi.base_url} onChange={e => setNewApi({...newApi, base_url: e.target.value})} />
            </div>
            <div style={styles.fGroup}>
               <label style={styles.label}>Descrição</label>
               <textarea style={styles.textarea} value={newApi.description} onChange={e => setNewApi({...newApi, description: e.target.value})} />
            </div>
            <button style={styles.submitBtn} type="submit">Publicar Gateway 🚀</button>
         </form>
      </LogtaModal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#000000', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', marginTop: '4px' },
  headerActions: { display: 'flex', gap: '12px' },
  refreshBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' },
  metricCard: { backgroundColor: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center' },
  metricDot: { width: '4px', height: '32px', borderRadius: '4px' },
  metricInfo: { flex: 1 },
  metricLabel: { fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  metricValue: { fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: 0 },
  tableSection: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  tableHeader: { padding: '24px', borderBottom: '1px solid #e8e8e8' },
  tableTitle: { fontSize: '16px', fontWeight: '700', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { backgroundColor: '#f9fafb', textAlign: 'left' },
  th: { padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #e8e8e8' },
  td: { padding: '16px 24px' },
  apiInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  apiIconBox: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(217, 255, 0, 0.18)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  apiName: { fontSize: '14px', fontWeight: '600' },
  apiDesc: { fontSize: '12px', color: '#94a3b8' },
  connStack: { display: 'flex', alignItems: 'center' },
  miniAvatar: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ebebeb', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--primary)', marginLeft: '-8px' },
  moreConn: { fontSize: '11px', fontWeight: '600', color: '#94a3b8', marginLeft: '8px' },
  urlCell: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#f4f4f4', borderRadius: '8px', width: 'fit-content' },
  statusTag: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: '#10b981' },
  statusDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' },
  rowActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  rowBtn: { padding: '8px', border: 'none', backgroundColor: '#f4f4f4', borderRadius: '8px', cursor: 'pointer' },
  form: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '20px' },
  fGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  fGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  input: { padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f4f4f4', fontWeight: '700', outline: 'none' },
  textarea: { padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f4f4f4', fontWeight: '700', minHeight: '100px', outline: 'none', resize: 'none' },
  submitBtn: { padding: '16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer' }
};

export default ApiManagement;
