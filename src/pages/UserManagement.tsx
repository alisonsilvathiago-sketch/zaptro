import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, UserPlus, Shield, 
  Mail, BadgeCheck, X, AlertCircle, Ban, Key,
  ShieldCheck, Info, Truck, Heart, DollarSign,
  Briefcase, Package, GraduationCap, Eye, Users, History as HistoryIcon,
  MessageSquare, Settings, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { getContext } from '../utils/domains';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import LogtaModal from '../components/Modal';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import type { Profile, UserRole } from '../types';

const UserManagement: React.FC = () => {
  const context = getContext();
  const isZaptro = context === 'WHATSAPP';
  const db = isZaptro ? supabaseZaptro : supabase;
  
  const navigate = useNavigate();
  const { profile: adminProfile, signOut } = useAuth();
  const { company } = useTenant();
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  // REDIRECIONAMENTO SE TENTAR ACESSAR LOGTA DENTRO DE ZAPTRO (Proteção Adicional)
  useEffect(() => {
    if (isZaptro && !adminProfile?.metadata?.modules?.whatsapp && adminProfile?.role !== 'ADMIN') {
        // Se estiver no domínio Zaptro mas sem acesso autorizado, volta pra Home
        toastError('Acesso não autorizado ao módulo Zaptro.');
        navigate('/');
    }
  }, [isZaptro, adminProfile]);

  const initialFormState = {
    full_name: '',
    email: '',
    password: '',
    role: (isZaptro ? 'ATENDENTE' : 'LOGISTICA') as any,
    modules: isZaptro ? {
      chat: true,
      historico: false,
      configuracoes: false,
      relatorios: false
    } : {
      logistica: true,
      rh: false,
      financeiro: false,
      crm: false,
      estoque: false,
      treinamentos: false
    }
  };

  const [formData, setFormData] = useState(initialFormState);

  // Modules based on Context (Strict Isolation)
  const availableModules = isZaptro ? [
    { id: 'chat', label: 'Chat em Tempo Real', icon: MessageSquare },
    { id: 'historico', label: 'Histórico de Conversas', icon: HistoryIcon },
    { id: 'configuracoes', label: 'Configurações Técnicas', icon: Settings },
    { id: 'relatorios', label: 'Relatórios Operacionais', icon: Activity },
  ] : [
    { id: 'logistica', label: 'Logística', icon: Truck },
    { id: 'rh', label: 'Recursos Humanos', icon: Heart },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'crm', label: 'CRM / Comercial', icon: Briefcase },
    { id: 'estoque', label: 'Controle de Estoque', icon: Package },
    { id: 'treinamentos', label: 'Treinamentos', icon: GraduationCap },
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const isMaster = adminProfile?.role === 'MASTER_ADMIN';
      let query = db.from('profiles').select('*');

      if (!isMaster) {
        query = query.eq('company_id', adminProfile?.company_id);
      }

      const { data, error } = await query.order('full_name', { ascending: true });
      if (!error) setUsers(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [adminProfile?.company_id]);

  const toggleModule = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      modules: { ...prev.modules, [moduleId]: !(prev.modules as any)[moduleId] }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toastLoading(selectedUser ? 'Atualizando...' : 'Criando...');
    
    try {
      const payload = {
        company_id: adminProfile?.company_id,
        full_name: formData.full_name,
        role: formData.role,
        metadata: { 
          email: formData.email,
          modules: formData.modules,
          updated_at: new Date().toISOString()
        }
      };

      const { error } = selectedUser 
        ? await db.from('profiles').update(payload).eq('id', selectedUser.id)
        : await db.from('profiles').insert([{ id: window.crypto.randomUUID(), ...payload }]);

      if (error) throw error;
      
      toastDismiss(toastId);
      toastSuccess('Usuário salvo com sucesso!');
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toastDismiss(toastId);
      toastError(`Falha: ${err.message}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== 'EXCLUIR') {
      toastError('Digite a palavra EXCLUIR para confirmar.');
      return;
    }
    if (!selectedUser) return;

    try {
      const { error } = await db.from('profiles').delete().eq('id', selectedUser.id);
      if (error) throw error;
      toastSuccess('Usuário removido permanentemente.');
      setIsDeleteModalOpen(false);
      setIsSummaryOpen(false);
      setDeleteConfirmation('');
      fetchUsers();
    } catch (err) { toastError('Não foi possível excluir.'); }
  };

  const content = (
    <div style={styles.container}>
      <header style={styles.zaptroHeader}>
         <div style={styles.headerInfo}>
            <h1 style={styles.title}>Gestão de Time Zaptro</h1>
            <p style={styles.subtitle}>Gerencie os acessos e permissões da sua equipe de atendimento.</p>
         </div>
         <button style={styles.primaryBtn} onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}>
            <UserPlus size={18} /> Novo Colaborador
         </button>
      </header>

      <div style={styles.tableCard}>
         <div style={styles.cardToolbar}>
            <div style={styles.search}>
               <Search size={18} color="#94A3B8" />
               <input placeholder="Buscar por nome ou cargo..." style={styles.searchInput} onChange={e => setSearchTerm(e.target.value)} />
            </div>
         </div>

         <table style={styles.table}>
            <thead>
               <tr style={styles.thRow}>
                  <th style={styles.th}>COLABORADOR</th>
                  <th style={styles.th}>FUNÇÃO</th>
                  <th style={styles.th}>ACESSOS</th>
                  <th style={{...styles.th, textAlign: 'right'}}>AÇÕES</th>
               </tr>
            </thead>
            <tbody>
               {users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
                 <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>
                       <div style={styles.userCell}>
                          <div style={styles.avatar}>{user.full_name?.[0]}</div>
                          <div>
                             <strong style={styles.uName}>{user.full_name}</strong>
                             <span style={styles.uEmail}>{user.metadata?.email || user.email}</span>
                          </div>
                       </div>
                    </td>
                    <td style={styles.td}>
                       <span style={styles.roleTag}>{user.role}</span>
                    </td>
                    <td style={styles.td}>
                       <div style={styles.modulesStrip}>
                          {availableModules.map(m => (
                            <div key={m.id} style={{
                                opacity: user.metadata?.modules?.[m.id] ? 1 : 0.2,
                                color: user.metadata?.modules?.[m.id] ? '#0F172A' : '#94A3B8'
                            }}>
                               <m.icon size={16} />
                            </div>
                          ))}
                       </div>
                    </td>
                    <td style={{...styles.td, textAlign: 'right'}}>
                       <div style={styles.actionRow}>
                          <button style={styles.iconBtn} onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}><Edit2 size={16} /></button>
                          <button style={{...styles.iconBtn, color: '#EF4444'}} onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); }}><Trash2 size={16} /></button>
                       </div>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* MODAL SALVAR / EDITAR */}
      <LogtaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedUser ? "Editar Colaborador" : "Cadastrar Colaborador Zaptro"}
        width="600px"
      >
        <form onSubmit={handleSave} style={styles.form}>
           <div style={styles.inputGroup}>
              <label style={styles.label}>Nome Completo</label>
              <input style={styles.input} required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
           </div>
           <div style={styles.inputGroup}>
              <label style={styles.label}>E-mail de Acesso</label>
              <input style={styles.input} type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
           </div>
           
           <div style={styles.inputGroup}>
              <label style={styles.label}>Função no Zaptro</label>
              <select style={styles.input} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                 {isZaptro ? (
                   <>
                     <option value="ADMIN">Administrador (Total)</option>
                     <option value="SUPERVISOR">Supervisor (Equipe)</option>
                     <option value="ATENDENTE">Atendente (Personalizado)</option>
                   </>
                 ) : (
                   <>
                     <option value="LOGISTICA">Logística</option>
                     <option value="FINANCEIRO">Financeiro</option>
                     <option value="RH">RH</option>
                     <option value="ADMIN">Admin</option>
                   </>
                 )}
              </select>
           </div>

           <div style={styles.modulesBlock}>
              <label style={styles.label}>Níveis de Permissão</label>
              <div style={styles.modulesGrid}>
                 {availableModules.map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => toggleModule(m.id)}
                      style={{
                        ...styles.mCard,
                        borderColor: (formData.modules as any)[m.id] ? '#CCFF00' : '#F1F5F9',
                        backgroundColor: (formData.modules as any)[m.id] ? '#CCFF0008' : '#FFF'
                      }}
                    >
                       <m.icon size={20} color={(formData.modules as any)[m.id] ? '#0F172A' : '#94A3B8'} />
                       <span style={{fontSize: '11px', fontWeight: '600', textAlign: 'center'}}>{m.label}</span>
                    </div>
                 ))}
              </div>
           </div>

           <button type="submit" style={styles.saveBtn} disabled={saving}>{saving ? 'Salvando...' : 'Confirmar Cadastro'}</button>
        </form>
      </LogtaModal>

      {/* MODAL DE EXCLUSÃO PADRÃO ZAPTRO */}
      <LogtaModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="⚠️ ATENÇÃO: Ação irreversível" 
        width="450px"
      >
        <div style={styles.deleteArea}>
           <div style={styles.deleteIcon}><AlertCircle size={48} color="#EF4444" /></div>
           <h3 style={styles.deleteTitle}>Confirmação de Exclusão</h3>
           <p style={styles.deleteText}>
              Você está prestes a remover o acesso de <strong>{selectedUser?.full_name}</strong>. 
              Esta ação não pode ser desfeita.
           </p>
           <div style={styles.confirmBox}>
              <label style={styles.confirmLabel}>Para confirmar, digite abaixo <strong>EXCLUIR</strong>:</label>
              <input 
                style={styles.confirmInput} 
                placeholder="EXCLUIR" 
                value={deleteConfirmation} 
                onChange={e => setDeleteConfirmation(e.target.value.toUpperCase())}
              />
           </div>
           <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
              <button 
                style={{...styles.deleteBtn, opacity: deleteConfirmation === 'EXCLUIR' ? 1 : 0.5}} 
                onClick={handleDelete}
                disabled={deleteConfirmation !== 'EXCLUIR'}
              >
                 Sim, EXCLUIR agora
              </button>
           </div>
        </div>
      </LogtaModal>
    </div>
  );

  return isZaptro ? <ZaptroLayout>{content}</ZaptroLayout> : content;
};

const styles: Record<string, any> = {
  container: { padding: '0px' },
  zaptroHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  title: { fontSize: '32px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-1.5px' },
  subtitle: { fontSize: '16px', color: '#64748B', fontWeight: '500', margin: 0 },
  primaryBtn: { backgroundColor: '#0F172A', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  
  tableCard: { backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e8e8e8', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' },
  cardToolbar: { padding: '24px', borderBottom: '1px solid #e8e8e8' },
  search: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f4f4f4', padding: '12px 20px', borderRadius: '14px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontWeight: '700', fontSize: '14px' },
  
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { backgroundColor: '#f4f4f4', borderBottom: '1px solid #e8e8e8' },
  th: { padding: '16px 32px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '1px' },
  tr: { borderBottom: '1px solid #e8e8e8', transition: '0.2s' },
  td: { padding: '20px 32px' },
  
  userCell: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatar: { width: '40px', height: '40px', borderRadius: '14px', backgroundColor: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#0F172A', fontSize: '16px' },
  uName: { display: 'block', fontSize: '15px', fontWeight: '700', color: '#0F172A' },
  uEmail: { fontSize: '12px', color: '#94A3B8' },
  roleTag: { padding: '6px 14px', backgroundColor: '#ebebeb', borderRadius: '10px', fontSize: '11px', fontWeight: '700', color: '#64748B' },
  modulesStrip: { display: 'flex', gap: '12px' },
  actionRow: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  iconBtn: { width: '36px', height: '36px', borderRadius: '12px', border: 'none', backgroundColor: '#f4f4f4', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#64748B' },
  input: { padding: '14px', borderRadius: '14px', border: '1.5px solid #e8e8e8', fontSize: '14px', fontWeight: '700', outline: 'none' },
  modulesBlock: { marginTop: '12px' },
  modulesGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '12px' },
  mCard: { padding: '20px 10px', border: '2.5px solid #e8e8e8', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.2s' },
  saveBtn: { marginTop: '12px', padding: '18px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' },

  // DELETE MODAL
  deleteArea: { textAlign: 'center', padding: '20px 10px' },
  deleteIcon: { marginBottom: '24px' },
  deleteTitle: { fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: '0 0 12px 0' },
  deleteText: { fontSize: '15px', color: '#64748B', lineHeight: '1.6', marginBottom: '32px' },
  confirmBox: { textAlign: 'left', backgroundColor: '#FFF5F5', padding: '20px', borderRadius: '20px', border: '1px solid #FFDCDC', marginBottom: '32px' },
  confirmLabel: { fontSize: '12px', color: '#EF4444', fontWeight: '700', marginBottom: '12px', display: 'block' },
  confirmInput: { width: '100%', padding: '14px', borderRadius: '12px', border: '2.5px solid #FFDCDC', fontSize: '18px', fontWeight: '700', textAlign: 'center', color: '#EF4444', outline: 'none' },
  modalActions: { display: 'flex', gap: '12px' },
  cancelBtn: { flex: 1, padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#ebebeb', color: '#64748B', fontWeight: '700', cursor: 'pointer' },
  deleteBtn: { flex: 1, padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#EF4444', color: 'white', fontWeight: '700', cursor: 'pointer' }
};

export default UserManagement;
