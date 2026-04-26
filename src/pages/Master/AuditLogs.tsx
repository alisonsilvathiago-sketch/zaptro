import React, { useState, useEffect } from 'react';
import { 
  History, Search, Filter, Download, 
  User, Building2, Zap, AlertCircle, 
  CheckCircle2, Info, Clock, ExternalLink, Shield,
  Activity, ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface AuditLog {
  id: string;
  action: string;
  module: string;
  details: string;
  metadata: any;
  company_id: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string };
}

const AuditLogs: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [mode, setMode] = useState<'COMPANY' | 'MASTER'>(profile?.role === 'MASTER_ADMIN' ? 'MASTER' : 'COMPANY');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, profiles:user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (mode === 'COMPANY') {
        if (!profile?.company_id) return;
        query = query.eq('company_id', profile.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [profile, mode]);

  const getSeverityStyle = (sev: string) => {
    switch(sev) {
      case 'CRITICAL': return { color: '#ef4444', bg: '#fef2f2', icon: <AlertCircle size={14} /> };
      case 'HIGH': return { color: '#f97316', bg: '#fff7ed', icon: <Zap size={14} /> };
      case 'MEDIUM': return { color: '#eab308', bg: '#fefce8', icon: <Info size={14} /> };
      default: return { color: '#D9FF00', bg: 'rgba(217, 255, 0, 0.12)', icon: <CheckCircle2 size={14} /> };
    }
  };

  const getLogDisplay = (log: AuditLog) => {
    return {
      action: log.action,
      details: log.details,
      user: log.profiles?.full_name || 'Sistema',
      type: log.module || 'Geral',
      severity: log.metadata?.type === 'EMERGENCY' ? 'CRITICAL' : 'INFO'
    };
  };

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.entity?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <div style={styles.bread}>AUDITORIA GLOBAL {mode === 'MASTER' ? '> MASTER HQ' : '> TENANT'}</div>
          <h1 style={styles.title}>Trilha de Auditoria</h1>
          <p style={styles.subtitle}>Rastreabilidade total das ações realizadas pelos operadores.</p>
        </div>
        <div style={styles.headerActions}>
           {profile?.role === 'MASTER_ADMIN' && (
             <div style={styles.tabSwitch}>
                <button 
                  style={{...styles.tabBtn, ...(mode === 'COMPANY' ? styles.tabActive : {})}}
                  onClick={() => setMode('COMPANY')}
                >
                  <Building2 size={14} /> Empresa
                </button>
                <button 
                  style={{...styles.tabBtn, ...(mode === 'MASTER' ? styles.tabActive : {})}}
                  onClick={() => setMode('MASTER')}
                >
                  <Shield size={14} /> Master HQ
                </button>
             </div>
           )}
           <button style={styles.secondaryBtn} onClick={fetchLogs} disabled={loading}>
             <History size={16} className={loading ? 'animate-spin' : ''} />
             {loading ? 'Sincronizando...' : 'Sincronizar Logs'}
           </button>
        </div>
      </header>

      <div style={styles.filterRow}>
         <div style={styles.searchBox}>
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Localizar evento por ação, entidade ou UUID..." 
              style={styles.searchInput} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div style={styles.tabSwitch}>
            <button style={styles.tabBtn}>Hoje</button>
            <button style={styles.tabBtn}>7 Dias</button>
            <button style={styles.tabBtn}>Todos</button>
         </div>
         <button style={styles.filterBtn}><Filter size={18} /> Filtro Detalhado</button>
      </div>

      <div style={styles.logCard}>
        <div style={styles.cardHeader}>
           <div style={styles.headerTitleGroup}>
              <Activity size={18} color="var(--primary)" />
              <h3 style={styles.cardTitle}>Stream de Eventos {mode === 'MASTER' ? 'HQ' : 'da Empresa'}</h3>
           </div>
           <div style={styles.liveTag}><div style={styles.liveDot} /> Monitoramento em Tempo Real</div>
        </div>
        
        <div style={styles.logList}>
           {loading && logs.length === 0 ? (
             <div style={styles.emptyState}>
               <History size={40} className="animate-spin" color="#e2e8f0" />
               <p>Carregando trilha de auditoria...</p>
             </div>
           ) : filteredLogs.length === 0 ? (
             <div style={styles.emptyState}>
               <Search size={40} color="#e2e8f0" />
               <p>Nenhum evento registrado nesta visão.</p>
             </div>
           ) : filteredLogs.map(log => {
              const display = getLogDisplay(log);
              const style = getSeverityStyle(display.severity);
              return (
                 <div key={log.id} style={styles.logItem}>
                    <div style={{...styles.severityIndicator, backgroundColor: style.bg, color: style.color}}>
                       {style.icon}
                       {display.severity}
                    </div>
                    
                    <div style={styles.logMain}>
                        <div style={styles.logAction}>
                           {display.details}
                           {mode === 'MASTER' && <span style={styles.hqBadge}>MASTER VISION</span>}
                        </div>
                        <div style={styles.logMeta}>
                           <div style={styles.metaItem}><User size={12} /> {display.user}</div>
                           <div style={styles.metaItem}><Clock size={12} /> {new Date(log.created_at).toLocaleString('pt-BR')}</div>
                           <div style={styles.metaItem}><Shield size={12} /> Ação: {display.action}</div>
                        </div>
                    </div>

                     <div style={styles.logType}>
                        <span style={styles.typeBadge}>{display.type}</span>
                        {log.metadata && <button style={styles.detailsBtn} onClick={() => setSelectedLog(log)}><ArrowRight size={14} /> Detalhes</button>}
                     </div>
                 </div>
              );
           })}
        </div>

        {/* DIFF VIEWER MODAL */}
        {selectedLog && (
          <div style={styles.diffOverlay} onClick={() => setSelectedLog(null)}>
             <div style={styles.diffModal} onClick={e => e.stopPropagation()}>
                <header style={styles.diffHeader}>
                   <div>
                      <h3 style={styles.diffTitle}>Análise de Alteração (Diff)</h3>
                      <p style={styles.diffSubtitle}>ID do Registro: {selectedLog.entity_id}</p>
                   </div>
                   <button style={styles.closeBtn} onClick={() => setSelectedLog(null)}>Fechar</button>
                </header>
                <div style={styles.diffBody}>
                   <div style={{...styles.diffSect, gridColumn: 'span 2'}}>
                      <label style={styles.diffLabel}>Metadados do Evento (JSON)</label>
                      <pre style={styles.codeBlock}>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// CSS-in-JS Styles (Mantendo o padrão profissional Logta/Nexio)
const styles: any = {
  container: { padding: '0', backgroundColor: 'transparent', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  bread: { fontSize: '10px', fontWeight: '700', color: '#D9FF00', marginBottom: '4px', opacity: 0.6 },
  title: { fontSize: '28px', fontWeight: '700', color: '#000000', letterSpacing: '-1.5px', margin: 0 },
  subtitle: { color: '#64748b', fontSize: '15px', fontWeight: '500' },
  headerActions: { display: 'flex', gap: '16px', alignItems: 'center' },
  secondaryBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#000000', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  
  tabSwitch: { display: 'flex', backgroundColor: '#ebebeb', padding: '4px', borderRadius: '12px', gap: '4px' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '6px', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: '#64748b', cursor: 'pointer', backgroundColor: 'transparent', transition: 'all 0.2s' },
  tabActive: { backgroundColor: 'white', color: '#D9FF00', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  
  filterRow: { display: 'flex', gap: '16px', marginBottom: '32px' },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '14px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
  searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontWeight: '600', color: '#1e293b' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  
  logCard: { backgroundColor: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' },
  cardHeader: { padding: '24px 32px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitleGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  cardTitle: { fontSize: '18px', fontWeight: '700', color: '#000000', margin: 0 },
  liveTag: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '600', color: '#10b981', backgroundColor: '#ecfdf5', padding: '8px 16px', borderRadius: '20px' },
  liveDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)' },
  
  logList: { padding: '0' },
  logItem: { display: 'flex', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid #e8e8e8', gap: '24px', transition: 'background 0.2s' },
  severityIndicator: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' as const, width: '100px', justifyContent: 'center' },
  logMain: { flex: 1 },
  logAction: { fontSize: '16px', fontWeight: '600', color: '#000000', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' },
  hqBadge: { fontSize: '9px', backgroundColor: '#D9FF00', color: '#000000', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' },
  logMeta: { display: 'flex', gap: '20px' },
  metaItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: '600' },
  detailsText: { fontSize: '13px', color: '#64748b', marginTop: '10px', lineHeight: '1.5', backgroundColor: '#f4f4f4', padding: '12px', borderRadius: '12px', border: '1px solid #e8e8e8' },
  logType: { display: 'flex', alignItems: 'center', gap: '16px' },
  typeBadge: { fontSize: '10px', fontWeight: '700', color: '#64748b', backgroundColor: '#ebebeb', padding: '6px 12px', borderRadius: '8px', letterSpacing: '0.5px' },
  detailsBtn: { border: 'none', backgroundColor: '#f4f4f4', color: '#94a3b8', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  emptyState: { padding: '80px', textAlign: 'center', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '16px', color: '#cbd5e1', fontWeight: '700' },
  
  // Diff View
  diffOverlay: { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' },
  diffModal: { backgroundColor: 'white', width: '100%', maxWidth: '1000px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  diffHeader: { padding: '24px 32px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  diffTitle: { fontSize: '18px', fontWeight: '700', color: '#000000', margin: 0 },
  diffSubtitle: { fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' },
  closeBtn: { padding: '8px 16px', backgroundColor: '#f4f4f4', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  diffBody: { padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxHeight: '70vh', overflowY: 'auto' as const },
  diffSect: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  diffLabel: { fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' as const },
  codeBlock: { backgroundColor: '#f4f4f4', padding: '16px', borderRadius: '12px', fontSize: '12px', color: '#475569', overflowX: 'auto' as const, borderLeft: '4px solid #e2e8f0', margin: 0 }
};

export default AuditLogs;
