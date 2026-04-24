import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Mail, Building2, 
  CheckCircle, XCircle, Shield, MoreVertical,
  RefreshCw, Loader2, UserCheck, UserX, ExternalLink,
  ShieldCheck, ShieldAlert, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError } from '../../lib/toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  company_id: string | null;
  tem_zaptro: boolean;
  status_zaptro: string | null;
  company_name?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState<'all' | 'zaptro' | 'logta'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch profiles with company names using a single query
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id, email, full_name, role, company_id, 
          tem_zaptro, status_zaptro,
          companies ( name )
        `)
        .order('email', { ascending: true });

      if (error) throw error;

      const formatted = (profiles || []).map((p: any) => ({
        ...p,
        company_name: p.companies?.name || 'Sem Empresa'
      }));

      setUsers(formatted);
    } catch (err) {
      console.error('Error fetching users:', err);
      toastError('Falha ao carregar lista de usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleZaptro = async (userId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          tem_zaptro: !current,
          status_zaptro: !current ? 'autorizado' : 'pendente'
        })
        .eq('id', userId);

      if (error) throw error;
      toastSuccess(`Acesso Zaptro ${!current ? 'concedido' : 'removido'} com sucesso!`);
      fetchData();
    } catch (err) {
      toastError('Erro ao alterar permissão do produto');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterProduct === 'zaptro') return matchesSearch && u.tem_zaptro;
    if (filterProduct === 'logta') return matchesSearch && !u.tem_zaptro;
    return matchesSearch;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestão Unificada de Usuários</h1>
          <p style={styles.subtitle}>Controle de acesso e separação de produtos (Zaptro vs Logta).</p>
        </div>
        <div style={styles.headerActions}>
           <button style={styles.refreshBtn} onClick={fetchData} title="Atualizar">
             <RefreshCw size={18} />
           </button>
        </div>
      </header>

      {/* Stats Quick View */}
      <div style={styles.statsRow}>
         <div style={styles.statMini}>
            <span style={styles.statMiniLabel}>Total Usuários</span>
            <span style={styles.statMiniValue}>{users.length}</span>
         </div>
         <div style={styles.statMini}>
            <span style={styles.statMiniLabel}>Acesso Zaptro</span>
            <span style={{...styles.statMiniValue, color: '#10b981'}}>{users.filter(u => u.tem_zaptro).length}</span>
         </div>
         <div style={styles.statMini}>
            <span style={styles.statMiniLabel}>Acesso Logta Only</span>
            <span style={{...styles.statMiniValue, color: '#64748b'}}>{users.filter(u => !u.tem_zaptro).length}</span>
         </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Buscar por e-mail, nome ou empresa..." 
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={styles.filterGroup}>
           <button 
             style={{...styles.filterTab, ...(filterProduct === 'all' ? styles.activeFilter : {})}}
             onClick={() => setFilterProduct('all')}
           >Todos</button>
           <button 
             style={{...styles.filterTab, ...(filterProduct === 'zaptro' ? styles.activeFilter : {})}}
             onClick={() => setFilterProduct('zaptro')}
           ><Zap size={14} /> Zaptro</button>
           <button 
             style={{...styles.filterTab, ...(filterProduct === 'logta' ? styles.activeFilter : {})}}
             onClick={() => setFilterProduct('logta')}
           ><Shield size={14} /> Logta</button>
        </div>
      </div>

      <div style={styles.listCard}>
        {loading ? (
          <div style={styles.loadingBox}>
            <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            <span>Sincronizando base de usuários...</span>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                 <th style={styles.th}>USUÁRIO / IDENTIDADE</th>
                 <th style={styles.th}>VÍNCULO CORPORATIVO</th>
                 <th style={styles.th}>FUNÇÃO</th>
                 <th style={styles.th}>PRODUTO ZAPTRO</th>
                 <th style={styles.th}>AÇÕES MASTER</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} style={styles.emptyTd}>Nenhum usuário encontrado com os filtros aplicados.</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>
                     <div style={styles.userInfo}>
                        <div style={styles.avatar}>{(user.full_name || user.email)[0].toUpperCase()}</div>
                        <div>
                           <div style={styles.userName}>{user.full_name || 'Usuário sem nome'}</div>
                           <div style={styles.userEmail}><Mail size={12} /> {user.email}</div>
                        </div>
                     </div>
                  </td>
                  <td style={styles.td}>
                     <div style={styles.companyBadge}>
                        <Building2 size={14} />
                        <span>{user.company_name}</span>
                     </div>
                  </td>
                  <td style={styles.td}>
                     <span style={{
                        ...styles.roleBadge,
                        backgroundColor: user.role === 'ADMIN' ? '#fdf2f2' : user.role.startsWith('MASTER') ? 'rgba(217, 255, 0, 0.18)' : '#f1f5f9',
                        color: user.role === 'ADMIN' ? '#991b1b' : user.role.startsWith('MASTER') ? '#000000' : '#475569'

                     }}>
                        {user.role}
                     </span>
                  </td>
                  <td style={styles.td}>
                     <div 
                        style={{
                           ...styles.zaptroStatus,
                           backgroundColor: user.tem_zaptro ? '#ecfdf5' : '#f4f4f4',
                           color: user.tem_zaptro ? '#10b981' : '#94a3b8',
                           borderColor: user.tem_zaptro ? '#d1fae5' : '#e2e8f0',
                           cursor: 'pointer'
                        }}
                        onClick={() => toggleZaptro(user.id, user.tem_zaptro)}
                     >
                        {user.tem_zaptro ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                        <span>{user.tem_zaptro ? 'ACESSO LIBERADO' : 'SEM ACESSO'}</span>
                     </div>
                  </td>
                  <td style={styles.td}>
                     <div style={styles.actions}>
                        <button style={styles.actionBtn} title="Editar Perfil"><Shield size={16} /></button>
                        <button style={styles.actionBtn} title="Histórico de Acesso"><ExternalLink size={16} /></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '-1.5px' },
  subtitle: { color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500' },
  headerActions: { display: 'flex', gap: '12px' },
  refreshBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-muted)' },
  
  statsRow: { display: 'flex', gap: '20px', marginBottom: '32px' },
  statMini: { backgroundColor: 'white', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minWidth: '160px' },
  statMiniLabel: { fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  statMiniValue: { fontSize: '24px', fontWeight: '700', color: 'var(--primary)' },

  controls: { display: 'flex', gap: '16px', marginBottom: '24px' },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border)' },
  searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontWeight: '600' },
  
  filterGroup: { display: 'flex', backgroundColor: '#ebebeb', padding: '4px', borderRadius: '12px', gap: '4px' },
  filterTab: { padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', background: 'none' },
  activeFilter: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },

  listCard: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { backgroundColor: '#f4f4f4', borderBottom: '1px solid var(--border)' },
  th: { padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.2s' },
  td: { padding: '18px 24px' },
  emptyTd: { padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' },
  
  loadingBox: { padding: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: '#64748b', fontWeight: '700' },

  userInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' },
  userName: { fontSize: '14px', fontWeight: '600', color: 'var(--primary)' },
  userEmail: { fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' },

  companyBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#f4f4f4', borderRadius: '10px', color: '#475569', fontSize: '12px', fontWeight: '700', border: '1px solid #e2e8f0' },
  roleBadge: { padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' },
  
  zaptroStatus: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', border: '1px solid', width: 'fit-content' },
  
  actions: { display: 'flex', gap: '8px' },
  actionBtn: { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#94a3b8', cursor: 'pointer' }
};

export default UserManagement;
