import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, UserPlus, Shield, 
  Mail, BadgeCheck, X, AlertCircle, 
  ShieldCheck, Info, User, Key, Users, History as HistoryIcon,
  MessageSquare, Zap, Lock
} from 'lucide-react';
import { supabaseZaptro } from '../../lib/supabase-zaptro';
import { useAuth } from '../../context/AuthContext';
import LogtaModal from '../Modal';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import { ZAPTRO_FIELD_BG, ZAPTRO_TITLE_COLOR } from '../../constants/zaptroUi';
import { resolveMemberAvatarUrl } from '../../utils/zaptroAvatar';

const ZaptroUserManagement: React.FC = () => {
  const { profile: adminProfile, user: authUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const theme = {
    primary: '#CCFF00',
    primaryDark: '#B2E600',
    dark: '#0F172A',
    textMain: '#1E293B',
    textMuted: '#94A3B8',
    border: '#EBEBEC',
    bg: ZAPTRO_FIELD_BG,
  };

  const initialFormState = {
    full_name: '',
    email: '',
    password: '',
    role: 'ATENDENTE'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (selectedUser) {
      setFormData({
        full_name: selectedUser.full_name || '',
        email: selectedUser.metadata?.email || '',
        password: '',
        role: selectedUser.role || 'ATENDENTE'
      });
    } else {
      setFormData(initialFormState);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    if (!adminProfile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabaseZaptro
        .from('profiles')
        .select('*')
        .eq('company_id', adminProfile.company_id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      toastError('Erro ao carregar colaboradores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminProfile?.company_id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminProfile?.company_id) return;

    setSaving(true);
    const toastId = toastLoading(selectedUser ? 'Atualizando...' : 'Adicionando...');
    
    try {
      const payload = {
        company_id: adminProfile.company_id,
        full_name: formData.full_name,
        role: formData.role,
        metadata: {
          email: formData.email,
          temp_password: formData.password,
          source: 'ZAPTRO_PANEL'
        }
      };

      const { error } = selectedUser 
        ? await supabaseZaptro.from('profiles').update(payload).eq('id', selectedUser.id)
        : await supabaseZaptro.from('profiles').insert([{ id: window.crypto.randomUUID(), ...payload }]);

      if (error) throw error;

      toastDismiss(toastId);
      toastSuccess(selectedUser ? 'Colaborador atualizado!' : 'Colaborador adicionado ao Zaptro!');
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toastDismiss(toastId);
      toastError('Falha ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: any) => {
    if (!window.confirm(`Remover acesso de ${user.full_name} do Zaptro?`)) return;
    try {
      const { error } = await supabaseZaptro.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
      toastSuccess('Acesso removido.');
      fetchUsers();
    } catch (err) {
      toastError('Erro ao remover.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
           <h2 style={styles.title}>Equipe de Atendimento</h2>
           <p style={styles.subtitle}>Gerencie quem tem acesso ao painel de mensagens do Zaptro.</p>
        </div>
        <button style={styles.addBtn} onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}>
           <UserPlus size={18} /> Adicionar Atendente
        </button>
      </header>

      <div style={styles.searchBar}>
         <Search size={18} color={theme.textMuted} />
         <input 
           placeholder="Buscar por nome..." 
           style={styles.input} 
           value={searchTerm}
           onChange={e => setSearchTerm(e.target.value)}
         />
      </div>

      <div style={styles.tableWrapper}>
         <table style={styles.table}>
            <thead>
               <tr style={styles.tableHead}>
                  <th style={styles.th}>Colaborador</th>
                  <th style={styles.th}>Função</th>
                  <th style={styles.th}>Acessos</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Ações</th>
               </tr>
            </thead>
            <tbody>
               {filteredUsers.map(u => {
                 const av = resolveMemberAvatarUrl(
                   { id: u.id, avatar_url: u.avatar_url },
                   adminProfile?.id,
                   adminProfile ? { id: adminProfile.id, avatar_url: adminProfile.avatar_url } : null
                 );
                 return (
                 <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>
                       <div style={styles.userInfo}>
                          <div style={{ ...styles.avatar, backgroundColor: theme.primary + '20', color: theme.dark, padding: 0, overflow: 'hidden' }}>
                             {av ? (
                               <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                             ) : (
                               u.full_name?.[0]
                             )}
                          </div>
                          <div>
                             <strong style={styles.userName}>{u.full_name}</strong>
                             <span style={styles.userEmail}>{u.metadata?.email || 'N/A'}</span>
                          </div>
                       </div>
                    </td>
                    <td style={styles.td}>
                       <span style={{
                         ...styles.roleBadge, 
                         backgroundColor: u.role === 'ADMIN' ? theme.primary + '30' : '#F1F5F9'
                       }}>
                         {u.role}
                       </span>
                    </td>
                    <td style={styles.td}>
                       <div style={styles.accessIcons}>
                          <div style={styles.accessIcon} title="WhatsApp Chat"><MessageSquare size={14} /></div>
                          <div style={styles.accessIcon} title="Automação"><Zap size={14} /></div>
                       </div>
                    </td>
                    <td style={{...styles.td, textAlign: 'right'}}>
                       <div style={styles.actions}>
                          <button style={styles.iconBtn} onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}><Edit2 size={14} /></button>
                          <button style={{...styles.iconBtn, color: '#EF4444'}} onClick={() => handleDelete(u)}><Trash2 size={14} /></button>
                       </div>
                    </td>
                 </tr>
               );
               })}
            </tbody>
         </table>
      </div>

      <LogtaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedUser ? "Editar Atendente" : "Novo Atendente Zaptro"}
        width="500px"
      >
         <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.field}>
               <label style={styles.label}>Nome Completo</label>
               <input 
                 style={styles.formInput} 
                 required
                 value={formData.full_name}
                 onChange={e => setFormData({...formData, full_name: e.target.value})}
               />
            </div>
            <div style={styles.field}>
               <label style={styles.label}>E-mail de Acesso</label>
               <input 
                 style={styles.formInput} 
                 type="email"
                 required
                 value={formData.email}
                 onChange={e => setFormData({...formData, email: e.target.value})}
               />
            </div>
            {!selectedUser && (
              <div style={styles.field}>
                 <label style={styles.label}>Senha Temporária</label>
                 <input 
                   style={styles.formInput} 
                   type="password"
                   required
                   value={formData.password}
                   onChange={e => setFormData({...formData, password: e.target.value})}
                 />
              </div>
            )}
            <div style={styles.field}>
               <label style={styles.label}>Nível de Permissão</label>
               <select 
                 style={styles.formInput}
                 value={formData.role}
                 onChange={e => setFormData({...formData, role: e.target.value})}
               >
                  <option value="ATENDENTE">Atendente (Apenas Chat)</option>
                  <option value="SUPERVISOR">Supervisor (Chat + Relatórios)</option>
                  <option value="ADMIN">Administrador (Acesso Total)</option>
               </select>
            </div>

            <button type="submit" style={styles.saveBtn} disabled={saving}>
               {saving ? 'Gravando...' : 'Confirmar e Liberar Acesso'}
            </button>
         </form>
      </LogtaModal>
    </div>
  );
};

const styles: Record<string, any> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titleArea: { display: 'flex', flexDirection: 'column', gap: '4px' },
  title: { fontSize: '22px', fontWeight: '900', color: '#0F172A', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748B', fontWeight: '500' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#CCFF00', color: '#000', border: 'none', borderRadius: '14px', fontWeight: '900', cursor: 'pointer' },
  
  searchBar: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: ZAPTRO_FIELD_BG, borderRadius: '16px', padding: '12px 20px', border: '1px solid #EBEBEC' },
  input: { border: 'none', outline: 'none', fontSize: '15px', color: '#0F172A', width: '100%', fontWeight: '500' },
  
  tableWrapper: { backgroundColor: 'white', borderRadius: '24px', border: '1px solid #EBEBEC', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  tableHead: { backgroundColor: '#FBFBFC', borderBottom: '1px solid #EBEBEC' },
  th: { padding: '16px 24px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '900', color: ZAPTRO_TITLE_COLOR, textTransform: 'uppercase' as const, letterSpacing: '1px' },
  tr: { borderBottom: '1px solid #e8e8e8' },
  td: { padding: '16px 24px', fontSize: '14px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px' },
  userName: { display: 'block', color: '#0F172A', fontWeight: '800' },
  userEmail: { fontSize: '12px', color: '#94A3B8' },
  roleBadge: { padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', color: '#0F172A' },
  accessIcons: { display: 'flex', gap: '6px' },
  accessIcon: { width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#FBFBFC', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  iconBtn: { width: '34px', height: '34px', borderRadius: '10px', border: 'none', backgroundColor: '#FBFBFC', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '800', color: ZAPTRO_TITLE_COLOR },
  formInput: { padding: '14px', borderRadius: '12px', border: '1px solid #EBEBEC', outline: 'none', fontSize: '15px', fontWeight: '600', color: '#0F172A', backgroundColor: ZAPTRO_FIELD_BG },
  saveBtn: { padding: '16px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', marginTop: '12px' }
};

export default ZaptroUserManagement;
