import React, { useState, useEffect } from 'react';
import { 
  Mail, Phone, MapPin, Shield, 
  Lock, Camera, Save, Check, Key,
  ExternalLink, Globe, Layout, Bell,
  ChevronRight, Edit3, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const UserProfileSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passwordData, setPasswordData] = useState({
     current: '',
     new: '',
     confirm: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || user?.email || '',
        phone: (profile as any).metadata?.phone || '',
        address: (profile as any).metadata?.address || '',
        role: profile.role || '',
        username: (profile as any).username || `@${profile.full_name?.toLowerCase().replace(/\s/g, '')}${Math.floor(Math.random() * 1000)}`
      });
    }
  }, [profile, user]);

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          metadata: {
            ...((profile as any).metadata || {}),
            phone: formData.phone,
            address: formData.address
          }
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      // Tentar atualizar o usuário no auth se necessário (apenas se email mudasse, mas aqui mudamos profile)
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        // Recarregar a página para atualizar o contexto global
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
     if (passwordData.new !== passwordData.confirm) {
        alert('As senhas não coincidem.');
        return;
     }
     setLoading(true);
     try {
        const { error } = await supabase.auth.updateUser({ 
            password: passwordData.new 
        });
        if (error) throw error;
        alert('Senha atualizada com sucesso!');
        setPasswordData({ current: '', new: '', confirm: '' });
     } catch (err: any) {
        alert(err.message);
     } finally {
        setLoading(false);
     }
  };

  return (
    <div style={styles.pageWrapper} className="animate-fade-in">
      {/* Background Banner Area */}
      <div style={styles.banner}>
        <div style={styles.bannerContent}>
           <h1 style={styles.greeting}>Olá, {formData.full_name.split(' ')[0]}!</h1>
           <p style={styles.bannerSub}>Gerencie tudo que importa em um só lugar: informações pessoais, configurações, privacidade e segurança. Mais controle e tranquilidade para você.</p>
        </div>
        <div style={styles.bannerIllustration}>
           <img src="https://cdni.iconscout.com/illustration/premium/thumb/man-working-on-laptop-illustration-download-in-svg-png-gif-file-formats--person-work-corporate-business-and-activity-pack-activity-illustrations-5813636.png" style={{ height: '180px' }} />
        </div>
      </div>

      <div style={styles.contentContainer}>
        {/* Profile Card Header */}
        <div style={styles.mainAvatarBox}>
           <div style={styles.avatarLarge}>
              {formData.full_name?.[0]}
              <button style={styles.camBtn}><Camera size={14} /></button>
           </div>
        </div>

        {/* Section: Informações Pessoais */}
        <div style={styles.sectionCard}>
           <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Informações pessoais</h2>
              <button style={styles.editLink} onClick={handleSaveProfile} disabled={loading}>
                {loading ? 'Salvando...' : saveSuccess ? 'Salvo!' : <><Edit3 size={14} /> Editar</>}
              </button>
           </div>
           
           <div style={styles.dataGrid}>
              <div style={styles.dataRow}>
                 <label style={styles.dataLabel}>Nome social (público)</label>
                 <input 
                    style={styles.dataInput} 
                    value={formData.full_name} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                 />
              </div>
              <div style={styles.dataRow}>
                 <label style={styles.dataLabel}>Nome completo</label>
                 <span style={styles.dataValue}>{formData.full_name}</span>
              </div>
              <div style={styles.dataRow}>
                 <label style={styles.dataLabel}>E-mail</label>
                 <span style={styles.dataValue}>{formData.email}</span>
              </div>
              <div style={styles.dataRow}>
                 <label style={styles.dataLabel}>Usuário</label>
                 <span style={styles.dataValue}>{formData.username}</span>
              </div>
           </div>
        </div>

        {/* Section: Perfil Público */}
        <div style={styles.sectionCard}>
           <div style={styles.avatarMiniBox}>
              <div style={styles.avatarMini}>{(formData.full_name[0] || '').toUpperCase()}{(formData.full_name.split(' ')[1]?.[0] || '').toUpperCase()}</div>
           </div>
           <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Perfil público</h2>
              <button style={styles.editLink}><Edit3 size={14} /> Editar</button>
           </div>
           <p style={styles.sectionDesc}>Como você quer se apresentar na página dos seus produtos.</p>
           
           <div style={styles.dataGrid}>
              <div style={styles.dataRow}>
                 <label style={styles.dataLabel}>Nome público</label>
                 <span style={styles.dataValue}>{formData.full_name}</span>
              </div>
              <div style={styles.dataRow}>
                 <label style={styles.dataLabel}>Site</label>
                 <a href="#" style={styles.dataLink}>http://logta.com.br/{formData.username.replace('@', '')}</a>
              </div>
              <div style={styles.dataRow}>
                 <label style={styles.dataLabel}>Redes sociais</label>
                 <div style={styles.socialGroup}>
                    <Globe size={16} color="var(--text-muted)" />
                    <ExternalLink size={16} color="var(--text-muted)" />
                 </div>
              </div>
           </div>
        </div>

        {/* Section: Configurações */}
        <div style={styles.sectionCard}>
           <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Configurações</h2>
              <button style={styles.editLink}><Edit3 size={14} /> Editar</button>
           </div>
           <p style={styles.sectionDesc}>Configurações de idioma e fuso horário.</p>
           
           <div style={styles.dataGrid}>
              <div style={styles.dataRow}>
                 <label style={styles.dataLabel}>Idioma</label>
                 <span style={styles.dataValue}>Português (Brasil)</span>
              </div>
              <div style={styles.dataRow}>
                 <label style={styles.dataLabel}>Fuso Horário</label>
                 <span style={styles.dataValue}>(-03:00) Fuso horário de Brasília - America/Sao Paulo</span>
              </div>
           </div>
        </div>

        {/* Section: Privacidade e Segurança */}
        <div style={styles.sectionCard}>
           <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Privacidade e segurança</h2>
              <button style={styles.securityBtn} onClick={() => alert('Em breve: Verificação em duas etapas.')}>
                 <Shield size={14} /> Acessar
              </button>
           </div>
           <p style={styles.sectionDesc}>Altere a sua senha, encerre as sessões abertas em outros dispositivos e tenha acesso aos dados de sua conta na Logta.</p>
           
           <div style={{ marginTop: '24px' }}>
              <div style={styles.formGroup}>
                 <label style={styles.label}>Nova Senha</label>
                 <input 
                    type="password" 
                    style={styles.formInput} 
                    value={passwordData.new}
                    onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                 />
              </div>
              <button style={styles.actionBtn} onClick={handleUpdatePassword} disabled={loading}>
                 <Key size={16} /> Atualizar Senha de Acesso
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: { minHeight: '100vh', backgroundColor: '#f4f4f4' },
  banner: { 
    height: '240px', 
    background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)', 
    padding: '40px 60px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    position: 'relative' as const
  },
  bannerContent: { maxWidth: '600px' },
  greeting: { fontSize: '32px', fontWeight: '600', color: '#1E293B', marginBottom: '12px' },
  bannerSub: { fontSize: '15px', color: '#475569', lineHeight: '1.6' },
  bannerIllustration: { display: 'flex', alignItems: 'center' },
  
  contentContainer: { maxWidth: '900px', margin: '-40px auto 100px auto', padding: '0 20px', position: 'relative' as const, zIndex: 10 },
  
  mainAvatarBox: { marginBottom: '24px' },
  avatarLarge: { 
    width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#334155', border: '6px solid white',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: 'white', fontWeight: '600', position: 'relative' as const
  },
  camBtn: { position: 'absolute' as const, bottom: '0', right: '0', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  
  sectionCard: { backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '32px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  cardTitle: { fontSize: '20px', fontWeight: '600', color: '#0F172A' },
  editLink: { display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #E2E8F0', backgroundColor: 'transparent', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: '#64748B', fontWeight: '700', cursor: 'pointer' },
  securityBtn: { display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #DBEAFE', backgroundColor: '#F0F9FF', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: '#D9FF00', fontWeight: '700', cursor: 'pointer' },
  
  sectionDesc: { fontSize: '14px', color: '#64748B', marginBottom: '24px' },
  
  dataGrid: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  dataRow: { display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center' },
  dataLabel: { fontSize: '13px', fontWeight: '700', color: '#64748B' },
  dataValue: { fontSize: '14px', fontWeight: '600', color: '#1E293B' },
  dataInput: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#1E293B', outline: 'none', backgroundColor: '#f4f4f4' },
  dataLink: { fontSize: '14px', fontWeight: '600', color: '#D9FF00', textDecoration: 'none' },
  
  avatarMiniBox: { marginBottom: '16px' },
  avatarMini: { width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#D9FF00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000', fontWeight: '600', fontSize: '20px' },
  
  socialGroup: { display: 'flex', gap: '16px' },
  
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748B', marginBottom: '8px' },
  formInput: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }
};

export default UserProfileSettings;
