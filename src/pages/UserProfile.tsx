import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Briefcase, Calendar, FileText, ArrowLeft, 
  MapPin, Phone, Mail, Award, AlertTriangle, 
  Edit2, Trash2, CheckCircle2, Shield, Heart,
  TrendingUp, Star, Clock, Activity, Truck,
  Building, Globe, Landmark, Save, Camera, Plus, BarChart2,
  Lock, Settings, Eye, EyeOff, ShieldCheck, CreditCard, ChevronRight
} from 'lucide-react';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';

const UserProfileContent: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: loggedInProfile, refreshProfile } = useAuth();
  const { company: tenantCompany, refreshCompany } = useTenant();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'performance' | 'security'>('profile');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const effectiveId = id || loggedInProfile?.id;
  const isSelf = !id || id === loggedInProfile?.id;
  const isAdmin = loggedInProfile?.role === 'ADMIN' || loggedInProfile?.role === 'MASTER_ADMIN';

  // Categories for segments
  const companySegments = [
    'Transporte Rodoviário (Carga Geral)',
    'Transporte Frigorificado (Alimentos)',
    'Logística e Armazenagem',
    'Mudanças e Transportes Especiais',
    'Distribuição Urbana (Last Mile)',
    'Transporte de Grãos / Agronegócio',
    'E-commerce e Courier',
    'Serviços e Equipes de Campo'
  ];

  useEffect(() => {
    if (effectiveId) {
      fetchData();
    }
  }, [effectiveId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Profile
      const { data: pData, error: pError } = await supabaseZaptro
        .from('profiles')
        .select('*')
        .eq('id', effectiveId)
        .single();

      if (pData) setUserProfile(pData);

      // Fetch Company if Admin or if it's the current tenant
      if (isAdmin && pData?.company_id) {
        const { data: cData } = await supabaseZaptro
          .from('companies')
          .select('*')
          .eq('id', pData.company_id)
          .single();
        if (cData) setCompanyData(cData);
      } else if (!isAdmin && tenantCompany) {
        setCompanyData(tenantCompany);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    
    setSaving(true);
    const toastId = toastLoading('Atualizando perfil profissional...');
    
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const updates = {
        full_name: formData.get('full_name'),
        metadata: {
          ...(userProfile.metadata || {}),
          social_name: formData.get('social_name'),
          username: formData.get('username'),
          phone: formData.get('phone'),
          bio: formData.get('bio'),
        }
      };

      const { error } = await supabaseZaptro
        .from('profiles')
        .update(updates)
        .eq('id', userProfile.id);

      if (error) throw error;
      
      toastDismiss(toastId);
      toastSuccess('Dados atualizados com sucesso!');
      setIsEditing(false);
      fetchData();
      if (isSelf) refreshProfile(); 
    } catch (err: any) {
      toastDismiss(toastId);
      toastError('Erro ao atualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyData || !isAdmin) return;

    setSaving(true);
    const toastId = toastLoading('Salvando configurações da empresa...');
    
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const updates = {
        name: formData.get('name'),
        cnpj: formData.get('cnpj'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        website: formData.get('website'),
        segment: formData.get('segment'),
        bank_name: formData.get('bank_name'),
        bank_agency: formData.get('bank_agency'),
        bank_account: formData.get('bank_account')
      };

      const { error } = await supabaseZaptro
        .from('companies')
        .update(updates)
        .eq('id', companyData.id);

      if (error) throw error;
      
      toastDismiss(toastId);
      toastSuccess('Minha Empresa atualizada!');
      setIsEditing(false);
      fetchData();
      refreshCompany();
    } catch (err: any) {
      toastDismiss(toastId);
      toastError('Falha ao salvar empresa: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
       toastError('Senha deve ter no mínimo 6 caracteres.');
       return;
    }
    const toastId = toastLoading('Alterando credenciais...');
    try {
       const { error } = await supabaseZaptro.auth.updateUser({ password: newPassword });
       if (error) throw error;
       toastDismiss(toastId);
       toastSuccess('Senha alterada com sucesso!');
       setNewPassword('');
       setActiveTab('profile');
    } catch (err: any) {
       toastDismiss(toastId);
       toastError('Erro: ' + err.message);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    const toastId = toastLoading('Fazendo upload da foto...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.id}/${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabaseZaptro.storage
        .from('logta-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseZaptro.storage
        .from('logta-files')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabaseZaptro
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      toastDismiss(toastId);
      toastSuccess('Foto de perfil atualizada!');
      fetchData();
      if (isSelf) refreshProfile();
    } catch (err: any) {
      toastDismiss(toastId);
      toastError(`Erro no upload: ${err.message}`);
    }
  };

  const handleCompanyLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyData) return;

    const toastId = toastLoading('Enviando Logotipo...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyData.id}/${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabaseZaptro.storage
        .from('logta-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseZaptro.storage
        .from('logta-files')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabaseZaptro
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', companyData.id);

      if (updateError) throw updateError;

      toastDismiss(toastId);
      toastSuccess('Logotipo atualizado!');
      fetchData();
      refreshCompany();
    } catch (err: any) {
      toastDismiss(toastId);
      toastError(`Falha no upload do logo: ${err.message}`);
    }
  };

  if (loading) return <div style={styles.loading}>Sincronizando perfil seguro...</div>;
  if (!userProfile) return <div style={styles.loading}>Sessão inválida ou perfil ausente.</div>;

  const metadata = userProfile.metadata || {};

  return (
    <div style={styles.container}>
      {/* Hero Header Aesthetic */}
      <div style={styles.heroHeader}>
         <div style={styles.heroBg}>
            <div style={styles.heroContent}>
               <div style={styles.greetingArea}>
                  <h1 style={styles.greeting}>Olá, {metadata.social_name || userProfile.full_name.split(' ')[0]}!</h1>
                  <p style={styles.greetingSub}>Gerencie tudo o que importa em um só lugar: informações pessoais, configurações, privacidade e segurança. Mais controle e tranquilidade para você.</p>
               </div>
               <img 
                 src="https://img.freepik.com/premium-photo/3d-cartoon-style-character-holding-laptop-standing-front-colorful-geometry-background_1020697-39185.jpg" 
                 alt="Character" 
                 style={styles.heroIllustration} 
               />
            </div>
         </div>
      </div>

      <div style={styles.profileWrapper}>
         {/* Sidebar Tabs */}
         <div style={styles.tabsCol}>
             <div style={styles.userInfoMini}>
                <div style={{...styles.avatarMini, position: 'relative', overflow: 'hidden'}}>
                   {userProfile.avatar_url ? (
                      <img src={userProfile.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Avatar" />
                   ) : userProfile.full_name?.[0]}
                   <label style={styles.avatarLabel}>
                      <Camera size={14} color="white" />
                      <input type="file" hidden accept="image/*" onChange={(e) => handleAvatarUpload(e)} />
                   </label>
                </div>
                <div style={styles.userInfoText}>
                   <p style={styles.miniName}>{userProfile.full_name}</p>
                   <p style={styles.miniEmail}>{userProfile.email}</p>
                </div>
             </div>

            <nav style={styles.tabNav}>
               <button style={{...styles.tabBtn, ...(activeTab === 'profile' ? styles.tabActive : {})}} onClick={() => { setActiveTab('profile'); setIsEditing(false); }}>
                  <User size={18} /> Informações pessoais
               </button>
               {!isAdmin && (
                  <button style={{...styles.tabBtn, ...(activeTab === 'performance' ? styles.tabActive : {})}} onClick={() => { setActiveTab('performance'); setIsEditing(false); }}>
                     <TrendingUp size={18} /> Meu Desempenho & Ponto
                  </button>
               )}
               {isAdmin && (
                  <button style={{...styles.tabBtn, ...(activeTab === 'company' ? styles.tabActive : {})}} onClick={() => { setActiveTab('company'); setIsEditing(false); }}>
                     <Building size={18} /> Minha Empresa (Gestão)
                  </button>
               )}
               <button style={{...styles.tabBtn, ...(activeTab === 'security' ? styles.tabActive : {})}} onClick={() => { setActiveTab('security'); setIsEditing(false); }}>
                  <ShieldCheck size={18} /> Privacidade e segurança
               </button>
            </nav>
         </div>

         {/* Main Content Areas */}
         <div style={styles.contentCol}>
            {activeTab === 'profile' && (
               <div className="animate-fade-in" style={styles.cardSection}>
                  <div style={styles.sectionHeader}>
                     <h2 style={styles.sectionTitle}>Informações pessoais</h2>
                     {!isEditing ? (
                        <button style={styles.editIconBtn} onClick={() => setIsEditing(true)}><Edit2 size={16} /> Editar</button>
                     ) : (
                        <button style={styles.cancelLink} onClick={() => setIsEditing(false)}>Cancelar</button>
                     )}
                  </div>

                  <form onSubmit={handleUpdateProfile}>
                     <div style={styles.gridFields}>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>Nome social (público)</label>
                           {isEditing ? <input name="social_name" defaultValue={metadata.social_name} style={styles.input} /> : <p style={styles.fieldValue}>{metadata.social_name || userProfile.full_name.split(' ')[0]}</p>}
                        </div>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>Nome completo</label>
                           {isEditing ? <input name="full_name" defaultValue={userProfile.full_name} style={styles.input} /> : <p style={styles.fieldValue}>{userProfile.full_name}</p>}
                        </div>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>E-mail</label>
                           <p style={styles.fieldValue}>{userProfile.email} <span style={styles.lockInfo}><Lock size={12} /> Bloqueado para edição</span></p>
                        </div>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>Usuário</label>
                           {isEditing ? <input name="username" defaultValue={metadata.username} style={styles.input} placeholder="@usuario" /> : <p style={styles.fieldValue}>{metadata.username || '@' + userProfile.id.slice(0, 8)}</p>}
                        </div>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>WhatsApp / Telefone</label>
                           {isEditing ? <input name="phone" defaultValue={metadata.phone} style={styles.input} /> : <p style={styles.fieldValue}>{metadata.phone || 'Não cadastrado'}</p>}
                        </div>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>Cargo / Role</label>
                           <p style={styles.fieldValue}>{userProfile.role}</p>
                        </div>
                     </div>
                     {isEditing && (
                        <button type="submit" style={styles.saveBtnFull} disabled={saving}><Save size={18} /> Salvar Alterações</button>
                     )}
                  </form>
               </div>
            )}

            {activeTab === 'performance' && !isAdmin && (
               <div className="animate-fade-in" style={styles.cardSection}>
                  <h2 style={styles.sectionTitle}>Meu Desempenho & Saúde</h2>
                  <div style={styles.perfGrid}>
                     <div style={styles.perfCard}>
                        <Star size={24} color="#f59e0b" fill="#f59e0b" />
                        <div style={styles.perfInfo}>
                           <p style={styles.perfLabel}>Nota Profissional</p>
                           <h3 style={styles.perfValue}>4.8 / 5.0</h3>
                        </div>
                     </div>
                     <div style={styles.perfCard}>
                        <Heart size={24} color="#ef4444" fill="#ef4444" />
                        <div style={styles.perfInfo}>
                           <p style={styles.perfLabel}>Check-in Saúde</p>
                           <h3 style={styles.perfValue}>Excelente ✅</h3>
                        </div>
                     </div>
                  </div>

                  <div style={styles.historySection}>
                     <h4 style={styles.subTitle}>Histórico de Ponto (Últimos 7 dias)</h4>
                     <div style={styles.pontoList}>
                        {[1,2,3,4,5].map(i => (
                           <div key={i} style={styles.pontoRow}>
                              <Clock size={14} color="#64748b" />
                              <span style={{flex: 1}}>Data: 10/04/2026</span>
                              <span style={styles.pontoTime}>Entrada: 08:00</span>
                              <span style={styles.pontoTime}>Saída: 18:00</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div style={styles.notesSection}>
                     <h4 style={styles.subTitle}>Notas Estratégicas</h4>
                     <div style={styles.emptyNote}>Nenhuma nota ou ocorrência de conduta nos últimos 90 dias. Parabéns pelo seu comprometimento!</div>
                  </div>
               </div>
            )}

            {activeTab === 'company' && isAdmin && companyData && (
               <div className="animate-fade-in" style={styles.cardSection}>
                  <div style={styles.sectionHeader}>
                     <h2 style={styles.sectionTitle}>Minha Empresa</h2>
                     {!isEditing ? (
                        <button style={styles.editIconBtn} onClick={() => setIsEditing(true)}><Edit2 size={16} /> Editar</button>
                     ) : (
                        <button style={styles.cancelLink} onClick={() => setIsEditing(false)}>Cancelar</button>
                     )}
                  </div>

                  <div style={{display:'flex', gap:'20px', alignItems:'center', marginBottom:'32px', padding:'20px', backgroundColor:'#f8fafc', borderRadius:'24px', border:'1px solid #e2e8f0'}}>
                     <div style={{width:'80px', height:'80px', backgroundColor:'white', borderRadius:'16px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden'}}>
                        {companyData.logo_url ? <img src={companyData.logo_url} style={{width:'100%', height:'100%', objectFit:'contain'}} /> : <Building size={32} color="#94a3b8" />}
                        <label style={{...styles.avatarLabel, bottom:0, right:0, borderRadius:'4px'}}>
                           <Camera size={12} color="white" />
                           <input type="file" hidden accept="image/*" onChange={(e) => handleCompanyLogoUpload(e)} />
                        </label>
                     </div>
                     <div>
                        <h4 style={{margin:0, fontSize:'16px', fontWeight:'800'}}>{companyData.name}</h4>
                        <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'#64748b'}}>Identidade Visual da Empresa</p>
                     </div>
                  </div>

                  <form onSubmit={handleUpdateCompany}>
                     <div style={styles.gridFields}>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>Razão Social</label>
                           {isEditing ? <input name="name" defaultValue={companyData.name} style={styles.input} /> : <p style={styles.fieldValue}>{companyData.name}</p>}
                        </div>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>CNPJ</label>
                           {isEditing ? <input name="cnpj" defaultValue={companyData.cnpj} style={styles.input} /> : <p style={styles.fieldValue}>{companyData.cnpj}</p>}
                        </div>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>Segmento de Atuação</label>
                           {isEditing ? (
                              <select name="segment" defaultValue={companyData.segment} style={styles.input}>
                                 <option value="">Selecione um segmento...</option>
                                 {companySegments.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                           ) : <p style={styles.fieldValue}>{companyData.segment || 'Não definido'}</p>}
                        </div>
                        <div style={{...styles.fieldRow, gridColumn: 'span 2'}}>
                           <label style={styles.fieldLabel}>Endereço Matriz</label>
                           {isEditing ? <input name="address" defaultValue={companyData.address} style={styles.input} /> : <p style={styles.fieldValue}>{companyData.address}</p>}
                        </div>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>Nome do Banco</label>
                           {isEditing ? <input name="bank_name" defaultValue={companyData.bank_name} style={styles.input} /> : <p style={styles.fieldValue}>{companyData.bank_name || '---'}</p>}
                        </div>
                        <div style={styles.fieldRow}>
                           <label style={styles.fieldLabel}>Agência / Conta</label>
                           {isEditing ? <input name="bank_account" defaultValue={companyData.bank_account} style={styles.input} /> : <p style={styles.fieldValue}>{companyData.bank_account || '---'}</p>}
                        </div>
                     </div>
                     {isEditing && (
                        <button type="submit" style={styles.saveBtnFull} disabled={saving}><Save size={18} /> Salvar Dados Corporativos</button>
                     )}
                  </form>
               </div>
            )}

            {activeTab === 'security' && (
               <div className="animate-fade-in" style={styles.cardSection}>
                  <h2 style={styles.sectionTitle}>Privacidade e segurança</h2>
                  <p style={styles.sectionDesc}>Altere a sua senha e tenha acesso aos dados de sua conta no Logta Business.</p>
                  
                  <div style={styles.securityBox}>
                     <h4 style={styles.subTitle}>Alterar Senha</h4>
                     <div style={styles.passwordInputArea}>
                        <div style={styles.passWrapper}>
                           <input 
                              type={showPassword ? 'text' : 'password'} 
                              placeholder="Digite a nova senha..." 
                              style={styles.input} 
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                           />
                           <button style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                               {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                           </button>
                        </div>
                        <button style={styles.primaryBtnSmall} onClick={handleChangePassword}>Atualizar Senha</button>
                     </div>
                  </div>

                  <div style={styles.securityItem}>
                     <div style={styles.secInfo}>
                        <ShieldCheck size={20} color="#10b981" />
                        <div>
                           <p style={styles.secTitle}>Autenticação de Dois Fatores</p>
                           <p style={styles.secDesc}>Ativado para a sua proteção em todos os acessos.</p>
                        </div>
                     </div>
                     <ChevronRight size={18} color="#94a3b8" />
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: '700' },
  container: { paddingBottom: '100px', backgroundColor: '#F8FAFC', minHeight: '100vh' },
  
  heroHeader: { position: 'relative' as const, height: '240px', backgroundColor: '#DBEAFE', overflow: 'hidden' },
  heroBg: { 
     maxWidth: '1200px', margin: '0 auto', height: '100%', position: 'relative' as const,
     background: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.4) 0%, transparent 70%)'
  },
  heroContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', padding: '0 40px' },
  greetingArea: { maxWidth: '600px', zIndex: 2 },
  greeting: { fontSize: '36px', fontWeight: '950', color: '#0F172A', margin: 0, letterSpacing: '-1px' },
  greetingSub: { fontSize: '15px', color: '#475569', marginTop: '12px', lineHeight: '1.6' },
  heroIllustration: { height: '260px', position: 'absolute' as const, right: '0', bottom: '-20px', zIndex: 1, opacity: 0.9 },

  profileWrapper: { maxWidth: '1200px', margin: '-40px auto 0 auto', display: 'flex', gap: '32px', padding: '0 40px', position: 'relative' as const, zIndex: 10 },
  
  tabsCol: { width: '300px', display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  userInfoMini: { backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' },
  avatarMini: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#D9FF00', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900' },
  userInfoText: { flex: 1, overflow: 'hidden' },
  miniName: { fontSize: '14px', fontWeight: '800', color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  miniEmail: { fontSize: '12px', color: '#64748B', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  tabNav: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '16px', border: 'none', backgroundColor: 'white', border: '1px solid #E2E8F0', color: '#64748B', fontWeight: '700', fontSize: '14px', cursor: 'pointer', textAlign: 'left' as const, transition: '0.2s' },
  tabActive: { backgroundColor: '#F1F5F9', border: '2px solid #D9FF00', color: '#000' },

  contentCol: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  cardSection: { backgroundColor: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  sectionTitle: { fontSize: '24px', fontWeight: '950', color: '#0F172A', margin: 0 },
  editIconBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#000', fontWeight: '800', fontSize: '13px', cursor: 'pointer' },
  cancelLink: { color: '#ef4444', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: 'none', border: 'none' },

  gridFields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' },
  fieldRow: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  fieldLabel: { fontSize: '12px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  fieldValue: { fontSize: '15px', color: '#1E293B', fontWeight: '600', margin: 0 },
  lockInfo: { fontSize: '10px', color: '#94A3B8', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  input: { height: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '14px', outline: 'none', transition: '0.2s', '&:focus': { borderColor: '#D9FF00', backgroundColor: 'white' } },
  saveBtnFull: { height: '54px', width: '100%', marginTop: '40px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },

  perfGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' },
  perfCard: { display: 'flex', alignItems: 'center', gap: '20px', padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '24px', border: '1px solid #E2E8F0' },
  perfLabel: { fontSize: '12px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase' as const },
  perfValue: { fontSize: '20px', fontWeight: '900', color: '#0F172A', margin: 0 },

  historySection: { marginBottom: '40px' },
  subTitle: { fontSize: '16px', fontWeight: '900', color: '#0F172A', marginBottom: '20px' },
  pontoList: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  pontoRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '16px', fontSize: '13px', color: '#334155', fontWeight: '600' },
  pontoTime: { padding: '4px 10px', backgroundColor: '#DBEAFE', color: '#0F172A', borderRadius: '8px', fontWeight: '800' },

  notesSection: {},
  emptyNote: { textAlign: 'center' as const, padding: '40px', backgroundColor: '#F8FAFC', borderRadius: '24px', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '14px' },

  securityBox: { borderBottom: '1px solid #F1F5F9', paddingBottom: '32px', marginBottom: '32px' },
  passwordInputArea: { display: 'flex', gap: '16px', marginTop: '16px' },
  passWrapper: { flex: 1, position: 'relative' as const },
  eyeBtn: { position: 'absolute' as const, right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' },
  primaryBtnSmall: { padding: '0 24px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' },

  securityItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '24px', cursor: 'pointer' },
  secInfo: { display: 'flex', gap: '16px', alignItems: 'center' },
  secTitle: { fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 },
  secDesc: { fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' },
  sectionDesc: { fontSize: '14px', color: '#64748B', marginBottom: '32px' },
  avatarLabel: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#D9FF00',
    padding: '6px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: '0.2s',
    '&:hover': { transform: 'scale(1.1)' }
  }
};

const UserProfile: React.FC = () => (
   <ZaptroLayout>
      <UserProfileContent />
   </ZaptroLayout>
);

export default UserProfile;
