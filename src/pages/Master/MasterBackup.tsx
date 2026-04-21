import React, { useState, useEffect } from 'react';
import { 
  Database, Shield, RefreshCw, 
  Search, Filter, Trash2, Download, 
  Terminal, History, DatabaseBackup, 
  AlertTriangle, CheckCircle2, Building2,
  HardDrive, Activity, HardDriveDownload
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError } from '../../lib/toast';

const MasterBackup: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalCount: 0,
    totalSize: 0,
    failedCount: 0
  });

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('backups')
      .select('*, companies(name), profiles(full_name)')
      .order('created_at', { ascending: false });

    if (error) {
      toastError('Erro ao carregar backups: ' + error.message);
    } else {
      setBackups(data || []);
      
      const totalSize = data?.reduce((acc, curr) => acc + (curr.file_size || 0), 0) || 0;
      const failed = data?.filter(b => b.status === 'FAILED').length || 0;
      
      setStats({
        totalCount: data?.length || 0,
        totalSize,
        failedCount: failed
      });
    }
    setLoading(false);
  };

  const handleManualBackup = async (companyId?: string) => {
    const confirmMsg = companyId 
      ? 'Deseja iniciar um backup imediato para esta empresa?' 
      : 'Deseja iniciar um backup global do sistema?';
    
    if (!confirm(confirmMsg)) return;

    try {
      const { data, error } = await supabase.functions.invoke('backup-engine', {
        body: { company_id: companyId, type: 'MANUAL' }
      });
      
      if (error) throw error;
      toastSuccess('Processo de backup iniciado em segundo plano!');
      fetchBackups();
    } catch (err: any) {
      toastError('Falha ao acionar motor: ' + err.message);
    }
  };

  const deleteBackup = async (id: string, path: string) => {
    if (!confirm('Excluir este arquivo de backup permanentemente?')) return;
    
    try {
      // 1. Remover do Storage
      await supabase.storage.from('backups').remove([path]);
      
      // 2. Remover do Banco
      const { error } = await supabase.from('backups').delete().eq('id', id);
      if (error) throw error;

      toastSuccess('Backup excluído com sucesso.');
      setBackups(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      toastError('Erro ao excluir: ' + err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filtered = backups.filter(b => 
    b.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
           <h1 style={styles.title}>Governança de Dados & Backups</h1>
           <p style={styles.subtitle}>Gerencie snapshots críticos e operações de recuperação de todo o ecossistema Logta.</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => handleManualBackup()}>
           <DatabaseBackup size={20} /> Backup Global Imediato
        </button>
      </header>

      {/* STATS ROW */}
      <div style={styles.statsGrid}>
         <div style={styles.statCard}>
            <div style={styles.statIcon}><Database size={24} color="var(--primary)" /></div>
            <div>
               <p style={styles.statLabel}>Total Armazenado</p>
               <h3 style={styles.statValue}>{formatSize(stats.totalSize)}</h3>
            </div>
         </div>
         <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: '#eff6ff'}}><Activity size={24} color="#3b82f6" /></div>
            <div>
               <p style={styles.statLabel}>Snapshots Ativos</p>
               <h3 style={styles.statValue}>{stats.totalCount}</h3>
            </div>
         </div>
         <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: stats.failedCount > 0 ? '#fef2f2' : '#f0fdf4'}}>
               {stats.failedCount > 0 ? <AlertTriangle size={24} color="#ef4444" /> : <Shield size={24} color="#10b981" />}
            </div>
            <div>
               <p style={styles.statLabel}>Integridade do Sistema</p>
               <h3 style={{...styles.statValue, color: stats.failedCount > 0 ? '#ef4444' : '#10b981'}}>
                  {stats.failedCount > 0 ? `${stats.failedCount} Falhas` : '100% Protegido'}
               </h3>
            </div>
         </div>
      </div>

      {/* BACKUPS TABLE */}
      <div style={styles.mainCard}>
         <div style={styles.cardHeader}>
            <div style={styles.searchWrap}>
               <Search size={18} color="#94a3b8" />
               <input 
                 style={styles.searchInput} 
                 placeholder="Buscar por empresa ou tipo de backup..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            <button style={styles.refreshBtn} onClick={fetchBackups}><RefreshCw size={18} /></button>
         </div>

         <div style={styles.tableWrap}>
            <table style={styles.table}>
               <thead>
                  <tr>
                     <th style={styles.th}>Data / Hora</th>
                     <th style={styles.th}>Empresa</th>
                     <th style={styles.th}>Tipo</th>
                     <th style={styles.th}>Tamanho</th>
                     <th style={styles.th}>Status</th>
                     <th style={styles.th}>Ações</th>
                  </tr>
               </thead>
               <tbody>
                  {filtered.map(b => (
                    <tr key={b.id} style={styles.tr}>
                       <td style={styles.td}>
                          <div style={styles.dateTime}>
                             <Clock size={14} color="#94a3b8" />
                             {new Date(b.created_at).toLocaleString()}
                          </div>
                       </td>
                       <td style={styles.td}>
                          <div style={styles.companyCell}>
                             <Building2 size={16} color="var(--primary)" />
                             {b.companies?.name || 'LOGTA CORE'}
                          </div>
                       </td>
                       <td style={styles.td}>
                          <span style={{...styles.typeBadge, backgroundColor: b.type === 'AUTO' ? '#f1f5f9' : '#e0f2fe', color: b.type === 'AUTO' ? '#64748b' : '#0284c7'}}>
                             {b.type}
                          </span>
                       </td>
                       <td style={styles.td}>{formatSize(b.file_size)}</td>
                       <td style={styles.td}>
                          <div style={{...styles.statusTag, color: b.status === 'SUCCESS' ? '#10b981' : '#ef4444'}}>
                             {b.status === 'SUCCESS' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                             {b.status}
                          </div>
                       </td>
                       <td style={styles.td}>
                          <div style={styles.actions}>
                             <button style={styles.actionBtn} title="Baixar Snapshot"><Download size={16} /></button>
                             <button style={styles.actionBtn} title="Log de Restauração"><History size={16} /></button>
                             <button style={{...styles.actionBtn, color: '#ef4444'}} onClick={() => deleteBackup(b.id, b.storage_path)} title="Excluir"><Trash2 size={16} /></button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
            {filtered.length === 0 && <div style={styles.empty}>Nenhum snapshot localizado.</div>}
         </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '28px', fontWeight: '950', color: '#111827', margin: 0, letterSpacing: '-1px' },
  subtitle: { fontSize: '16px', color: '#6b7280', margin: '8px 0 0 0' },
  primaryBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' },
  statIcon: { width: '56px', height: '56px', borderRadius: '18px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '13px', fontWeight: '800', color: '#64748b', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  statValue: { fontSize: '24px', fontWeight: '950', color: '#111827', margin: '4px 0 0 0', letterSpacing: '-0.5px' },

  mainCard: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  cardHeader: { padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fcfcfd' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '16px', width: '400px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', fontWeight: '700', color: '#111827', width: '100%' },
  refreshBtn: { width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' },

  tableWrap: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '20px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '1px', borderBottom: '1px solid #f1f5f9' },
  tr: { borderBottom: '1px solid #f8fafc', transition: 'background-color 0.2s' },
  td: { padding: '20px 32px', fontSize: '14px', color: '#334155', fontWeight: '700' },
  dateTime: { display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' },
  companyCell: { display: 'flex', alignItems: 'center', gap: '10px', color: '#111827', fontWeight: '800' },
  typeBadge: { padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900' },
  statusTag: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800' },
  actions: { display: 'flex', gap: '8px' },
  actionBtn: { width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' },
  empty: { padding: '60px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '16px', fontWeight: '700' }
};

export default MasterBackup;
