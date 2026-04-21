import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, Edit2, Trash2, 
  Shield, ShieldCheck, ShieldAlert,
  Mail, Phone, Clock, MoreVertical,
  Key, RefreshCw, Filter, Activity,
  Database, Globe, Ban, CheckCircle2,
  X, Save, Lock, Layout, Users, Settings,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import LogtaModal from '../../components/Modal';

interface StaffMember {
  id: string;
  profile_id: string;
  tier: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'SUPPORT';
  department: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  profile: {
    full_name: string;
    email: string;
  };
  permissions?: any[];
}

const MasterStaff: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    recentLogs: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('master_staff')
        .select(`
          *,
          profile:profile_id (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
      
      setStats({
        total: data?.length || 0,
        active: data?.filter(s => s.status === 'ativo').length || 0,
        recentLogs: 124 // Mocked for now until logs table is populated via triggers
      });
    } catch (err) {
      toastError('Erro ao carregar equipe master.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [newMember, setNewMember] = useState({ identifier: '', tier: 'SUPPORT', department: 'GERAL' });
  const [permissions, setPermissions] = useState<any>({});

  const handleCreateMember = async () => {
    if (!newMember.identifier) return toastError('Informe o UUID ou E-mail.');
    
    setLoading(true);
    try {
      // 1. Encontrar o perfil (por e-mail ou UUID)
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .or(`email.eq.${newMember.identifier},id.eq.${newMember.identifier}`)
        .single();

      if (pError || !profile) throw new Error('Perfil não encontrado.');

      // 2. Adicionar ao staff master
      const { data: staffData, error: sError } = await supabase
        .from('master_staff')
        .insert({
          profile_id: profile.id,
          tier: newMember.tier,
          department: newMember.department,
          status: 'ativo'
        })
        .select()
        .single();

      if (sError) throw sError;

      // 3. Atualizar role para MASTER_ADMIN se necessário
      if (profile.role !== 'MASTER_ADMIN') {
        await supabase.from('profiles').update({ role: 'MASTER_ADMIN' }).eq('id', profile.id);
      }

      toastSuccess(`${profile.full_name} integrado ao time Master!`);
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toastError(err.message || 'Erro ao adicionar membro.');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async (staffId: string) => {
    const { data, error } = await supabase
      .from('master_permissions')
      .select('*')
      .eq('staff_id', staffId);
    
    if (!error && data) {
      const permMap: any = {};
      data.forEach(p => {
        if (!permMap[p.module]) permMap[p.module] = {};
        permMap[p.module][p.action] = p.allowed;
      });
      setPermissions(permMap);
    } else {
      setPermissions({});
    }
  };

  const handlePermissionToggle = (module: string, action: string) => {
    setPermissions((prev: any) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module]?.[action]
      }
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedMember) return;
    const toastId = toastLoading('Atualizando permissões...');
    try {
      const permsToSave: any[] = [];
      Object.keys(permissions).forEach(module => {
        Object.keys(permissions[module]).forEach(action => {
          permsToSave.push({
            staff_id: selectedMember.id,
            module,
            action,
            allowed: permissions[module][action]
          });
        });
      });

      const { error } = await supabase
        .from('master_permissions')
        .upsert(permsToSave, { onConflict: 'staff_id,module,action' });

      if (error) throw error;
      toastSuccess('Matriz de permissões atualizada!');
      setIsPermModalOpen(false);
    } catch (err) {
      toastError('Erro ao salvar permissões.');
    } finally {
       toastDismiss(toastId);
    }
  };

  const handleEditPermissions = async (member: StaffMember) => {
    setSelectedMember(member);
    await loadPermissions(member.id);
    setIsPermModalOpen(true);
  };

  const handleToggleStatus = async (member: StaffMember) => {
    const newStatus = member.status === 'ativo' ? 'inativo' : 'ativo';
    const { error } = await supabase
      .from('master_staff')
      .update({ status: newStatus })
      .eq('id', member.id);
    
    if (!error) {
      toastSuccess(`Status de ${member.profile.full_name} atualizado!`);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover o acesso deste membro permanentemente?')) return;
    const { error } = await supabase.from('master_staff').delete().eq('id', id);
    if (!error) {
      toastSuccess('Membro removido da equipe master.');
      fetchData();
    }
  };

  const filteredStaff = staff.filter(s => 
    s.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.profile?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <div style={styles.bread}>HOME &gt; MASTER HQ</div>
          <h1 style={styles.title}>Orquestração de Time (HQ)</h1>
          <p style={styles.subtitle}>Gerencie os arquitetos e operadores da sua infraestrutura global.</p>
        </div>
        <div style={styles.headerActions}>
           <button style={styles.refreshBtn} onClick={fetchData}>
              <RefreshCw size={18} />
           </button>
           <button style={styles.performanceBtn} onClick={() => window.location.href = '/master/performance'}>
              <BarChart3 size={18} /> Ver Performance
           </button>
           <button style={styles.addBtn} onClick={() => setIsModalOpen(true)}>
              <UserPlus size={18} /> Novo Membro Master
           </button>
        </div>
      </header>

      {/* DASHBOARD STAFF */}
      <div style={styles.statsGrid}>
         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#f5f3ff', color: '#7c3aed'}}><ShieldCheck size={20} /></div>
               <span style={styles.statLabel}>Total HQ</span>
            </div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statFooter}>Colaboradores internos</div>
         </div>
         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#ecfdf5', color: '#10b981'}}><Activity size={20} /></div>
               <span style={styles.statLabel}>Membros Ativos</span>
            </div>
            <div style={styles.statValue}>{stats.active}</div>
            <div style={styles.statFooter}>Em operação agora</div>
         </div>
         <div style={styles.statCard}>
            <div style={styles.statHeader}>
               <div style={{...styles.statIcon, backgroundColor: '#eff6ff', color: '#2563eb'}}><Key size={20} /></div>
               <span style={styles.statLabel}>Audit Trail (24h)</span>
            </div>
            <div style={styles.statValue}>{stats.recentLogs}</div>
            <div style={styles.statFooter}>Ações monitoradas</div>
         </div>
      </div>

      <div style={styles.mainCard}>
         <div style={styles.cardHeader}>
            <div style={styles.searchBox}>
               <Search size={18} color="#94a3b8" />
               <input 
                  type="text" 
                  placeholder="Localizar no time master..." 
                  style={styles.searchInput} 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            <button style={styles.filterBtn}><Filter size={18} /> Filtro Granular</button>
         </div>

         <div style={styles.staffWrapper}>
            <table style={styles.table}>
               <thead>
                  <tr style={styles.thead}>
                     <th style={styles.th}>MEMBRO DA EQUIPE</th>
                     <th style={styles.th}>TIER / ACESSO</th>
                     <th style={styles.th}>DEPARTAMENTO</th>
                     <th style={styles.th}>STATUS</th>
                     <th style={{...styles.th, textAlign: 'right'}}>AÇÕES E PERMISSÕES</th>
                  </tr>
               </thead>
               <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{padding: '60px', textAlign: 'center', color: '#94a3b8'}}>Arquitetando visualização...</td></tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr><td colSpan={5} style={{padding: '60px', textAlign: 'center', color: '#94a3b8'}}>Nenhum membro encontrado.</td></tr>
                  ) : filteredStaff.map(member => (
                     <tr key={member.id} style={styles.tr}>
                        <td style={styles.td}>
                           <div style={styles.memberCell}>
                              <div style={styles.avatar}>{member.profile?.full_name[0]}</div>
                              <div>
                                 <strong style={styles.memberName}>{member.profile?.full_name}</strong>
                                 <p style={styles.memberEmail}>{member.profile?.email}</p>
                              </div>
                           </div>
                        </td>
                        <td style={styles.td}>
                           <div style={styles.roleContainer}>
                              <Shield size={14} color="#7c3aed" />
                              <span style={styles.roleBadge}>{member.tier}</span>
                           </div>
                        </td>
                        <td style={styles.td}>
                           <span style={styles.departmentText}>{member.department || 'Operações'}</span>
                        </td>
                        <td style={styles.td}>
                           <div style={{...styles.statusBox, cursor: 'pointer'}} onClick={() => handleToggleStatus(member)}>
                              <div style={{
                                 ...styles.statusDot, 
                                 backgroundColor: member.status === 'ativo' ? '#10b981' : '#ef4444',
                                 boxShadow: member.status === 'ativo' ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none'
                              }} />
                              <span style={{
                                 color: member.status === 'ativo' ? '#10b981' : '#ef4444',
                                 fontWeight: '800',
                                 textTransform: 'uppercase'
                              }}>{member.status}</span>
                           </div>
                        </td>
                        <td style={styles.td}>
                           <div style={styles.actions}>
                              <button style={styles.iconBtn} title="Editar Permissões" onClick={() => handleEditPermissions(member)}>
                                <Key size={16} />
                              </button>
                              <button style={{...styles.iconBtn, color: '#ef4444'}} title="Remover" onClick={() => handleDelete(member.id)}>
                                <Trash2 size={16} />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* MODAL: NOVO MEMBRO */}
      <LogtaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} width="500px" title="Integrar novo Arquiteto Master">
         <div style={styles.form}>
            <div style={styles.inputGroup}>
               <label style={styles.labelForm}>UUID do Perfil ou E-mail</label>
               <input 
                  style={styles.input} 
                  placeholder="Vínculo com Auth Existente" 
                  value={newMember.identifier}
                  onChange={e => setNewMember({...newMember, identifier: e.target.value})}
               />
               <p style={styles.hintText}>O usuário já deve possuir conta no sistema.</p>
            </div>
            <div style={styles.row}>
              <div style={styles.inputGroup}>
                 <label style={styles.labelForm}>Tier de Acesso</label>
                 <select 
                    style={styles.input}
                    value={newMember.tier}
                    onChange={e => setNewMember({...newMember, tier: e.target.value as any})}
                 >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OPERATOR">Operador</option>
                    <option value="SUPPORT">Suporte</option>
                 </select>
              </div>
              <div style={styles.inputGroup}>
                 <label style={styles.labelForm}>Departamento</label>
                 <select 
                    style={styles.input}
                    value={newMember.department}
                    onChange={e => setNewMember({...newMember, department: e.target.value})}
                 >
                    <option value="GERAL">Geral</option>
                    <option value="FINANCEIRO">Financeiro</option>
                    <option value="SUPORTE">Suporte</option>
                    <option value="DEV">Desenvolvimento</option>
                 </select>
              </div>
            </div>
            <button style={styles.submitBtn} onClick={handleCreateMember} disabled={loading}>
               {loading ? 'Processando...' : 'Ativar Acesso Corporativo 💎'}
            </button>
         </div>
      </LogtaModal>

      {/* MODAL: MATRIZ DE PERMISSÕES */}
      <LogtaModal isOpen={isPermModalOpen} onClose={() => setIsPermModalOpen(false)} width="650px" title={`Permissões: ${selectedMember?.profile.full_name}`}>
         <div style={styles.permContainer}>
            <div style={styles.permHeader}>
               <Lock size={18} color="#7c3aed" />
               <span style={styles.permTitle}>Configuração de Acesso por Módulo</span>
            </div>
            
            <div style={styles.matrixList}>
               {['EQUIPE', 'FINANCEIRO', 'CRM', 'API', 'PLANOS', 'EMPRESAS'].map(module => (
                 <div key={module} style={styles.moduleRow}>
                    <div style={styles.moduleName}>
                      <strong>{module} MASTER</strong>
                      <span>Acesso à área de {module.toLowerCase()}</span>
                    </div>
                    <div style={styles.actionGrid}>
                       {['VIEW', 'EDIT', 'DELETE'].map(action => (
                         <div key={action} style={styles.actionCheck}>
                            <input 
                              type="checkbox" 
                              id={`${module}-${action}`} 
                              checked={permissions[module]?.[action] || false}
                              onChange={() => handlePermissionToggle(module, action)}
                            />
                            <label htmlFor={`${module}-${action}`}>{action}</label>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>

            <div style={styles.permFooter}>
               <button style={styles.cancelBtn} onClick={() => setIsPermModalOpen(false)}>Cancelar</button>
               <button style={styles.savePermBtn} onClick={handleSavePermissions}>
                 <Save size={16} /> Salvar Configurações
               </button>
            </div>
         </div>
      </LogtaModal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '0', backgroundColor: 'transparent', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  bread: { fontSize: '10px', fontWeight: '900', color: '#7c3aed', marginBottom: '4px', opacity: 0.6 },
  title: { fontSize: '28px', fontWeight: '950', color: '#111827', letterSpacing: '-1.5px', margin: 0 },
  subtitle: { color: '#64748b', fontSize: '15px', fontWeight: '500' },
  headerActions: { display: 'flex', gap: '12px' },
  refreshBtn: { width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', color: '#64748b' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.2)' },
  performanceBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', color: '#111827' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' },
  statHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  statIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  statValue: { fontSize: '28px', fontWeight: '950', color: '#1e293b', marginBottom: '4px' },
  statFooter: { fontSize: '11px', color: '#94a3b8', fontWeight: '600' },

  mainCard: { backgroundColor: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' },
  cardHeader: { padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8fafc', padding: '12px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', width: '400px' },
  searchInput: { border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '14px', fontWeight: '600', width: '100%', color: '#1e293b' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' },

  table: { width: '100%', borderCollapse: 'collapse' as const },
  thead: { backgroundColor: '#f9fafb', textAlign: 'left' as const },
  th: { padding: '16px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
  td: { padding: '16px 32px' },
  memberCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  memberName: { fontSize: '15px', fontWeight: '800', color: '#1e293b' },
  memberEmail: { fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: '500' },
  avatar: { width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px' },
  roleContainer: { display: 'flex', alignItems: 'center', gap: '6px' },
  roleBadge: { fontSize: '11px', fontWeight: '800', color: '#7c3aed', letterSpacing: '0.5px' },
  departmentText: { fontSize: '13px', color: '#64748b', fontWeight: '700' },
  statusBox: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  actions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  iconBtn: { padding: '10px', border: 'none', backgroundColor: '#f8fafc', borderRadius: '10px', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' },

  form: { padding: '10px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  labelForm: { fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '1px' },
  input: { padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '700', outline: 'none', fontSize: '14px' },
  hintText: { fontSize: '10px', color: '#94a3b8', fontWeight: '600' },
  submitBtn: { padding: '18px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', marginTop: '12px', boxShadow: '0 10px 20px -5px rgba(124, 58, 237, 0.3)' },

  permContainer: { padding: '10px' },
  permHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' },
  permTitle: { fontSize: '16px', fontWeight: '900', color: '#1e293b' },
  matrixList: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  moduleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' },
  moduleName: { display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  actionGrid: { display: 'flex', gap: '20px' },
  actionCheck: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#64748b' },
  permFooter: { marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  cancelBtn: { padding: '12px 24px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' },
  savePermBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }
};

export default MasterStaff;
