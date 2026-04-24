import React, { useState, useEffect } from 'react';
import { 
  Shield, User, CheckCircle2, XCircle, ChevronRight, 
  Search, Save, AlertCircle, Info, Lock, Unlock,
  Truck, Heart, DollarSign, Briefcase, Package, GraduationCap, ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { toastSuccess, toastError } from '../lib/toast';

interface UserPermission {
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete';
  allowed: boolean;
}

const PermissionsPage: React.FC = () => {
  const { profile: adminProfile } = useAuth();
  const { company } = useTenant();
  
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [urlHandled, setUrlHandled] = useState(false); // Evita loop de redirecionamento

  // Estado das permissões do usuário selecionado
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});

  const modules = [
    { id: 'crm', label: 'CRM / Comercial', icon: Briefcase },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'rh', label: 'Recursos Humanos', icon: Heart },
    { id: 'logistica', label: 'Logística', icon: Truck },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'treinamentos', label: 'Academia Logta', icon: GraduationCap },
    { id: 'auditoria', label: 'Auditoria de Logs', icon: ShieldCheck },
  ];

  const actions = [
    { id: 'view', label: 'Visualizar', color: '#D9FF00' },
    { id: 'create', label: 'Criar / Adicionar', color: '#10b981' },
    { id: 'edit', label: 'Editar Registros', color: '#f59e0b' },
    { id: 'delete', label: 'Excluir / Deletar', color: '#ef4444' },
  ];

  const fetchUsers = async () => {
    if (!adminProfile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, metadata')
        .eq('company_id', adminProfile.company_id)
        .neq('role', 'ADMIN'); // Não edita permissões de outros admins por aqui (regra de segurança)

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminProfile]);

  useEffect(() => {
    // 1. Detecta user_id da URL (para vir do cadastro)
    const params = new URLSearchParams(window.location.search);
    const userIdFromUrl = params.get('user_id');
    
    if (userIdFromUrl && !urlHandled && users.length > 0) {
      const targetUser = users.find(u => u.id === userIdFromUrl);
      if (targetUser) {
        setSelectedUserId(userIdFromUrl);
        setUrlHandled(true);
      }
    }

    if (selectedUserId) {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        setUserPermissions(user.metadata?.permissions || {});
      }
    }
  }, [selectedUserId, users, urlHandled]);

  const togglePermission = (moduleId: string, actionId: string) => {
    const key = `${moduleId}:${actionId}`;
    setUserPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!selectedUserId || !adminProfile?.company_id) return;
    setSaving(true);
    
    try {
      // 1. Atualiza no metadata do usuário (para cache/performace do frontend)
      const user = users.find(u => u.id === selectedUserId);
      const updatedMetadata = {
        ...(user.metadata || {}),
        permissions: userPermissions,
        // Mantém a flag de módulos simplificada para compatibilidade com o sidebar
        modules: Object.keys(userPermissions)
          .filter(k => k.endsWith(':view') && userPermissions[k])
          .reduce((acc, current) => {
            acc[current.split(':')[0]] = true;
            return acc;
          }, {} as Record<string, boolean>)
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ metadata: updatedMetadata })
        .eq('id', selectedUserId);

      if (profileError) throw profileError;

      // 2. Sincroniza com a tabela user_permissions (RLS e Segurança de Banco)
      // Transformamos o Record<string, boolean> em linhas de tabela
      const permissionsToInsert = Object.entries(userPermissions).map(([key, allowed]) => {
        const [module, action] = key.split(':');
        return {
          user_id: selectedUserId,
          company_id: adminProfile.company_id,
          module,
          action,
          allowed
        };
      });

      if (permissionsToInsert.length > 0) {
        const { error: syncError } = await supabase
          .from('user_permissions')
          .upsert(permissionsToInsert, { onConflict: 'user_id,module,action' });
        
        if (syncError) console.error('Aviso: Perfil salvo mas erro na tabela de permissões:', syncError);
      }

      toastSuccess('Matriz de acessos sincronizada com sucesso!');
      fetchUsers(); // Refresh para atualizar a lista local com os novos metadados
    } catch (err: any) {
      toastError('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.headerPremium}>
        <div style={styles.headerTitleArea}>
          <div style={styles.headerBadge}>SISTEMA DE SEGURANÇA</div>
          <h1 style={styles.title}>Matriz de Permissões</h1>
        </div>
      </header>

      <div style={styles.layout}>
         {/* Sidebar de Usuários */}
         <aside style={styles.userList}>
            <div style={styles.searchBox}>
               <Search size={18} color="var(--text-muted)" />
               <input 
                placeholder="Filtrar colaboradores..." 
                style={styles.searchInput} 
                onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            
            <div style={styles.scrollArea}>
               {loading ? (
                 <div style={styles.loaderArea}>
                    <div className="animate-spin" style={styles.spinner} />
                    <p style={styles.loadingText}>Buscando equipe...</p>
                 </div>
               ) : filteredUsers.length === 0 ? (
                 <div style={styles.emptySidebar}>
                    <User size={32} color="var(--border)" />
                    <p>Nenhum colaborador encontrado.</p>
                 </div>
               ) : filteredUsers.map(user => (
                 <div 
                    key={user.id} 
                    onClick={() => setSelectedUserId(user.id)}
                    style={{
                      ...styles.userCard,
                      backgroundColor: selectedUserId === user.id ? 'var(--primary-light)' : 'white',
                      borderColor: selectedUserId === user.id ? 'var(--primary)' : 'var(--border)'
                    }}
                 >
                    <div style={{
                       ...styles.avatarMini,
                       backgroundColor: selectedUserId === user.id ? 'white' : 'var(--bg-app)',
                       color: selectedUserId === user.id ? 'var(--primary)' : 'var(--text-main)'
                    }}>
                       {user.full_name ? user.full_name[0].toUpperCase() : '?'}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                       <p style={{...styles.uName, color: selectedUserId === user.id ? 'var(--primary)' : 'var(--text-main)'}}>{user.full_name}</p>
                       <p style={styles.uSub}>{user.role}</p>
                    </div>
                    {selectedUserId === user.id && <ChevronRight size={16} color="var(--primary)" />}
                 </div>
               ))}
            </div>
         </aside>

         {/* Painel de Permissões */}
         <main style={styles.mainPanel}>
            {selectedUserId ? (
              <div className="animate-slide-up">
                 <div style={styles.panelHeader}>
                    <div style={styles.userDetailsLarge}>
                       <Shield size={32} color="var(--primary)" />
                       <div>
                          <h2 style={styles.panelTitle}>Configurando: {selectedUser?.full_name}</h2>
                          <p style={styles.panelSubtitle}>{selectedUser?.email}</p>
                       </div>
                    </div>
                    <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                       {saving ? 'Aplicando...' : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                 </div>

                 <div style={styles.matrixContainer}>
                    <div style={styles.matrixScroll}>
                       <table style={styles.matrixTable}>
                          <thead>
                             <tr>
                                <th style={styles.mThModule}>Módulo do Sistema</th>
                                {actions.map(act => (
                                  <th key={act.id} style={styles.mTh}>
                                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <div style={{ ...styles.colorDot, backgroundColor: act.color }} />
                                        {act.label}
                                     </div>
                                  </th>
                                ))}
                             </tr>
                          </thead>
                          <tbody>
                             {modules.map(mod => (
                               <tr key={mod.id} style={styles.mTr}>
                                  <td style={styles.mTdModule}>
                                     <div style={styles.moduleInfo}>
                                        <div style={styles.modIcon}><mod.icon size={16} /></div>
                                        <span>{mod.label}</span>
                                     </div>
                                  </td>
                                  {actions.map(act => {
                                    const isActive = userPermissions[`${mod.id}:${act.id}`];
                                    return (
                                      <td key={act.id} style={styles.mTd}>
                                         <div 
                                          style={{
                                            ...styles.checkbox,
                                            backgroundColor: isActive ? act.color : 'transparent',
                                            borderColor: isActive ? act.color : 'var(--border)'
                                          }}
                                          onClick={() => togglePermission(mod.id, act.id)}
                                         >
                                            {isActive ? <CheckCircle2 size={16} color="white" /> : <XCircle size={16} color="var(--border)" />}
                                         </div>
                                      </td>
                                    );
                                  })}
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 <div style={styles.infoFooter}>
                    <Info size={16} color="var(--primary)" />
                    <p>Ao salvar, o usuário será notificado e suas permissões serão atualizadas no próximo carregamento de página.</p>
                 </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                 <Lock size={64} color="var(--border)" />
                 <h3>Selecione um colaborador</h3>
                 <p>Escolha um membro da equipe ao lado para configurar seus acessos no sistema.</p>
              </div>
            )}
         </main>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '32px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  headerPremium: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap' as const, gap: '24px' },
  headerTitleArea: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  headerBadge: { display: 'inline-block', width: 'fit-content', padding: '4px 12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '30px', fontSize: '10px', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' },
  title: { fontSize: '28px', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '-1px' },
  
  layout: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px', height: 'calc(100vh - 200px)' },
  userList: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  searchBox: { padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' },
  searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '14px', backgroundColor: 'transparent' },
  scrollArea: { flex: 1, overflowY: 'auto' as const, padding: '12px' },
  userCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '14px', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '8px' },
  avatarMini: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' },
  uName: { fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' },
  uSub: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' as const, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  loadingText: { marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' },
  loaderArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  spinner: { width: '24px', height: '24px', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%' },
  emptySidebar: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '12px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' },

  mainPanel: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)', padding: '32px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column' as const },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  userDetailsLarge: { display: 'flex', alignItems: 'center', gap: '20px' },
  panelTitle: { fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' },
  panelSubtitle: { fontSize: '14px', color: 'var(--text-muted)' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  
  matrixContainer: { flex: 1, overflowY: 'auto' as const },
  matrixTable: { width: '100%', borderCollapse: 'collapse' as const },
  mThModule: { textAlign: 'left' as const, padding: '16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' as const, borderBottom: '2px solid var(--border)' },
  mTh: { padding: '16px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' as const, borderBottom: '2px solid var(--border)', textAlign: 'center' as const },
  mTr: { borderBottom: '1px solid var(--bg-app)', transition: 'background 0.2s' },
  mTdModule: { padding: '16px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' },
  mTd: { padding: '16px', textAlign: 'center' as const },
  moduleInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  modIcon: { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' },
  colorDot: { width: '6px', height: '6px', borderRadius: '50%' },
  checkbox: { width: '28px', height: '28px', borderRadius: '8px', border: '2px solid var(--border)', margin: '0 auto', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },

  infoFooter: { marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--bg-app)', padding: '16px', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px' },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-muted)' }
};

export default PermissionsPage;
