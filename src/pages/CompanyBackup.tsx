import React, { useState, useEffect } from 'react';
import { 
  Database, Shield, RefreshCw, 
  Trash2, Download, History, 
  DatabaseBackup, AlertTriangle, 
  CheckCircle2, Clock, RotateCcw,
  ShieldCheck, Info, FileJson,
  Layers, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../lib/toast';

const CompanyBackup: React.FC = () => {
  const { profile } = useAuth();
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const companyId = profile?.company_id;

  useEffect(() => {
    if (companyId) fetchBackups();
  }, [companyId]);

  const fetchBackups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('backups')
      .select('*, profiles(full_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      toastError('Erro ao carregar backups: ' + error.message);
    } else {
      setBackups(data || []);
    }
    setLoading(false);
  };

  const handleCreateBackup = async () => {
    if (!companyId) return;
    setIsProcessing(true);
    toastSuccess('Preparando snapshot lúdico da empresa...');

    try {
      const { data, error } = await supabase.functions.invoke('backup-engine', {
        body: { 
          company_id: companyId, 
          type: 'MANUAL', 
          created_by: profile?.id 
        }
      });
      
      if (error) throw error;
      toastSuccess('Backup concluído e armazenado com sucesso!');
      fetchBackups();
    } catch (err: any) {
      toastError('Falha ao gerar backup: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async (backupId: string, versionDate: string) => {
    const confirmRestore = confirm(
      `ATENÇÃO: Você está prestes a restaurar os dados para o estado de ${versionDate}.\n\n` +
      `Isso irá SOBRESCREVER as informações atuais. Deseja prosseguir com a recuperação?`
    );

    if (!confirmRestore) return;

    setIsProcessing(true);
    toastSuccess('Iniciando motor de restauração atômica...');

    try {
      const { data, error } = await supabase.functions.invoke('restore-engine', {
        body: { 
          backup_id: backupId, 
          company_id: companyId,
          profile_id: profile?.id
        }
      });
      
      if (error) throw error;
      toastSuccess('Dados restaurados com sucesso! O sistema será recarregado.');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      toastError('Erro Crítico na Restauração: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <div style={styles.loading}>Sincronizando snapshots de segurança...</div>;

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div style={styles.headerInfo}>
           <div style={styles.badge}><ShieldCheck size={14} /> Dados Protegidos</div>
           <h1 style={styles.title}>Segurança & Backups</h1>
           <p style={styles.subtitle}>Gerencie suas versões de dados e restaure informações essenciais com um clique.</p>
        </div>
        <button 
          style={{...styles.primaryBtn, opacity: isProcessing ? 0.7 : 1}} 
          onClick={handleCreateBackup} 
          disabled={isProcessing}
        >
           {isProcessing ? <RefreshCw size={20} className="animate-spin" /> : <DatabaseBackup size={20} />}
           {isProcessing ? 'Processando...' : 'Backup Manual Agora'}
        </button>
      </header>

      <div style={styles.contentGrid}>
         {/* LEFT: INFO CARD */}
         <div style={styles.infoCard}>
            <div style={styles.infoIcon}><Lock size={32} color="var(--primary)" /></div>
            <h3 style={styles.infoTitle}>Como funciona o Logta Safe?</h3>
            <p style={styles.infoText}>
               Seu sistema realiza backups automáticos diários. Você também pode criar versões manuais antes de grandes alterações para garantir que sempre possa voltar atrás se necessário.
            </p>
            <div style={styles.infoSpecs}>
               <div style={styles.specItem}><Layers size={16} /> 100% dos Módulos</div>
               <div style={styles.specItem}><RotateCcw size={16} /> Restauração Atômica</div>
               <div style={styles.specItem}><History size={16} /> Últimas 7 Versões</div>
            </div>
         </div>

         {/* RIGHT: LIST */}
         <div style={styles.listCard}>
            <div style={styles.cardHeader}>
               <h2 style={styles.cardTitle}>Histórico de Versões Disponíveis</h2>
               <button style={styles.refreshBtn} onClick={fetchBackups}><RefreshCw size={18} /></button>
            </div>

            <div style={styles.backupList}>
               {backups.map(b => (
                 <div key={b.id} style={styles.backupItem}>
                    <div style={styles.itemDate}>
                       <Clock size={16} color="#94a3b8" />
                       <div style={styles.dateInfo}>
                          <span style={styles.dateText}>{new Date(b.created_at).toLocaleDateString()}</span>
                          <span style={styles.timeText}>{new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                    </div>

                    <div style={styles.itemMeta}>
                       <span style={{...styles.typeBadge, backgroundColor: b.type === 'AUTO' ? '#f1f5f9' : '#e0f2fe', color: b.type === 'AUTO' ? '#64748b' : '#0284c7'}}>
                          {b.type === 'AUTO' ? 'Automático' : 'Manual'}
                       </span>
                       <span style={styles.sizeText}>{formatSize(b.file_size)}</span>
                    </div>

                    <div style={styles.itemActions}>
                       <button 
                          style={styles.restoreBtn} 
                          onClick={() => handleRestore(b.id, new Date(b.created_at).toLocaleString())}
                          disabled={isProcessing}
                        >
                          <History size={14} /> Restaurar esta versão
                       </button>
                    </div>
                 </div>
               ))}
               {backups.length === 0 && (
                 <div style={styles.emptyState}>
                    <Database size={48} color="#e2e8f0" />
                    <p>Nenhuma versão de segurança disponível no momento.</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', display: 'flex', flexDirection: 'column' as const, gap: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerInfo: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  badge: { backgroundColor: '#f0fdf4', color: '#10b981', padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  title: { fontSize: '32px', fontWeight: '950', color: '#111827', margin: 0, letterSpacing: '-1.2px' },
  subtitle: { fontSize: '16px', color: '#6b7280', margin: 0, maxWidth: '600px' },
  primaryBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '18px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 8px 16px rgba(124, 58, 237, 0.2)', transition: 'transform 0.2s', fontSize: '15px' },
  
  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' },
  
  infoCard: { backgroundColor: '#f8fafc', padding: '40px', borderRadius: '32px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  infoIcon: { marginBottom: '8px' },
  infoTitle: { fontSize: '20px', fontWeight: '900', color: '#111827', margin: 0 },
  infoText: { fontSize: '15px', color: '#64748b', lineHeight: '1.6', margin: 0 },
  infoSpecs: { marginTop: '12px', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  specItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '800', color: '#334155' },

  listCard: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  cardHeader: { padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: '18px', fontWeight: '900', color: '#111827', margin: 0 },
  refreshBtn: { width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' },

  backupList: { display: 'flex', flexDirection: 'column' as const },
  backupItem: { padding: '24px 32px', borderBottom: '1px solid #f8fafc', display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 1.5fr auto', alignItems: 'center', gap: '24px', transition: 'background-color 0.2s' },
  itemDate: { display: 'flex', gap: '14px', alignItems: 'center' },
  dateInfo: { display: 'flex', flexDirection: 'column' as const },
  dateText: { fontSize: '15px', fontWeight: '800', color: '#111827' },
  timeText: { fontSize: '11px', fontWeight: '700', color: '#94a3b8' },
  itemMeta: { display: 'flex', alignItems: 'center', gap: '16px' },
  typeBadge: { padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' as const },
  sizeText: { fontSize: '13px', fontWeight: '800', color: '#64748b' },
  restoreBtn: { padding: '10px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#334155', fontSize: '13px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
  
  emptyState: { padding: '80px 40px', textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '16px', color: '#94a3b8' },
  loading: { padding: '100px', textAlign: 'center' as const, color: 'var(--primary)', fontWeight: '800' }
};

export default CompanyBackup;
