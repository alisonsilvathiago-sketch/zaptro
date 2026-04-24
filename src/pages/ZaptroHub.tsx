import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Settings, Users, Share2, 
  Shield, Building, MapPin, Globe, Zap,
  CheckCircle2, AlertCircle, ExternalLink, 
  User, Check, Search, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getContext } from '../utils/domains';
import WhatsAppChat from './WhatsAppChat';
import { supabase } from '../lib/supabase';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';

import ZaptroLayout from '../components/Zaptro/ZaptroLayout';

const ZaptroHub: React.FC = () => {
  const { profile, isMaster, isAdmin, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'permissions' | 'launcher'>(isAdmin ? 'permissions' : 'launcher');
  const [team, setTeam] = useState<any[]>([]);
  const isStandalone = getContext() === 'WHATSAPP';

  // Cores Contextuais (Logta vs Zaptro Standalone)
  const theme = {
    bg: isStandalone ? '#051c0f' : '#FFFFFF',
    card: isStandalone ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
    text: isStandalone ? '#ffffff' : '#1e293b',
    subText: isStandalone ? '#9dffc8' : '#64748b',
    primary: '#D2FF00',
    border: isStandalone ? 'rgba(210, 255, 0, 0.1)' : '#e2e8f0',
    inputBg: isStandalone ? 'rgba(0,0,0,0.2)' : '#f1f5f9',
    buttonText: '#000000'
  };

  useEffect(() => {
    const fetchTeam = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id);
      if (data) setTeam(data);
    };
    fetchTeam();
  }, [profile?.company_id]);

  const handleToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'autorizado' ? 'recusado' : 'autorizado';
    setTeam(prev => prev.map(p => p.id === id ? { ...p, status_zaptro: newStatus } : p));
    try {
      await supabase.from('profiles').update({ status_zaptro: newStatus }).eq('id', id);
    } catch (e) {
       console.error(e);
       setTeam(prev => prev.map(p => p.id === id ? { ...p, status_zaptro: currentStatus } : p));
    }
  };

  const tabs = [
    ...(isAdmin ? [{ id: 'permissions', label: 'Gestão de Acesso', icon: Shield }] : []),
    { id: 'launcher', label: 'Portal Zaptro', icon: Zap },
  ];

  const launchZaptro = () => {
    // 🚀 Lança a plataforma em nova aba (Apenas via clique, evitando bloqueio de pop-up)
    const baseUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}/inicio`;
    window.open(baseUrl, '_blank');
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'permissions':
        return (
          <div style={{...styles.card, backgroundColor: theme.card, borderColor: theme.border}}>
            <h2 style={{...styles.cardTitle, color: theme.text}}>Portaria de Acesso Zaptro</h2>
            <p style={{...styles.cardSub, color: theme.subText}}>Controle quem tem autorização para abrir o sistema de mensagens em nova aba.</p>
            
            <div style={styles.userList}>
               {team.map((member, i) => (
                 <div key={i} style={{...styles.pItem, borderBottom: `1px solid ${theme.border}`}}>
                    <div style={styles.pInfo}>
                       <span style={{...styles.pName, color: theme.text}}>{member.full_name}</span>
                       <span style={{...styles.pDesc, color: theme.subText}}>{member.role} • {member.status_zaptro === 'autorizado' ? 'Ativo' : 'Bloqueado'}</span>
                    </div>
                    <div 
                      onClick={() => handleToggle(member.id, member.status_zaptro)}
                      style={{...styles.pToggle, backgroundColor: member.status_zaptro === 'autorizado' ? theme.primary : '#cbd5e1'}}
                    >
                       <div style={{...styles.pDot, marginLeft: member.status_zaptro === 'autorizado' ? '20px' : '2px'}} />
                    </div>
                 </div>
               ))}
            </div>
            <p style={{fontSize: '11px', opacity: 0.5, marginTop: '20px'}}>* As alterações são sincronizadas instantaneamente com o banco de dados.</p>
          </div>
        );

      case 'launcher':
        return (
          <div style={{...styles.card, backgroundColor: theme.card, textAlign: 'center', padding: '64px 32px'}}>
             <div style={{...styles.logoBox, margin: '0 auto 24px', width: '72px', height: '72px', backgroundColor: 'rgba(210, 255, 0, 0.1)'}}>
                <Zap size={36} color={theme.primary} fill={theme.primary} />
             </div>
             <h2 style={{...styles.cardTitle, color: theme.text}}>Zaptro Pro Connect</h2>
             <p style={{...styles.cardSub, color: theme.subText, maxWidth: '400px', margin: '0 auto 32px'}}>
               Tudo pronto! Sua conta está vinculada ao seu ecossistema. Clique abaixo para abrir sua central de atendimento em uma aba externa dedicada.
             </p>

             <button 
               onClick={launchZaptro}
               style={{...styles.btnSave, backgroundColor: theme.primary, color: '#000', padding: '18px 48px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 auto'}}
             >
               Lançar Plataforma Externa <ExternalLink size={20} />
             </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ZaptroLayout>
      <div style={{...styles.container, padding: 0}}>
        {isStandalone && <div style={styles.gridOverlay} />}
        
        {/* Header Hub */}
        <div style={styles.header}>
          <div style={styles.brandInfo}>
            <div style={{...styles.logoBox, backgroundColor: isStandalone ? 'rgba(210, 255, 0, 0.1)' : '#fff'}}>
              <Zap size={28} color={theme.primary} fill={theme.primary} />
            </div>
            <div>
              <h1 style={{...styles.title, color: theme.text}}>Zaptro <span style={{color: theme.primary}}>Connect</span></h1>
              <p style={{...styles.subtitle, color: theme.subText}}>Gestão Centralizada de WhatsApp para Transportadoras</p>
            </div>
          </div>
        </div>

        {/* Internal Tabs Navigation */}
        <div style={{...styles.tabNav, borderBottomColor: theme.border}}>
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                ...styles.tabBtn,
                color: activeTab === tab.id ? theme.primary : theme.subText,
                borderBottom: activeTab === tab.id ? `2px solid ${theme.primary}` : '2px solid transparent'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Rendering */}
        <div style={styles.content}>
          {renderContent()}
        </div>
      </div>
    </ZaptroLayout>
  );
};

const styles: Record<string, any> = {
  container: { padding: '30px', minHeight: '100vh', position: 'relative', transition: 'all 0.3s ease' },
  gridOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `linear-gradient(rgba(210, 255, 0, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(210, 255, 0, 0.02) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' },
  header: { marginBottom: '32px', position: 'relative', zIndex: 2 },
  brandInfo: { display: 'flex', alignItems: 'center', gap: '20px' },
  logoBox: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: ZAPTRO_SHADOW.sm },
  title: { fontSize: '28px', fontWeight: '700', margin: 0, letterSpacing: '-1px' },
  subtitle: { fontSize: '14px', margin: '4px 0 0 0', opacity: 0.8 },
  
  tabNav: { display: 'flex', gap: '8px', borderBottom: '1px solid', marginBottom: '24px', position: 'relative', zIndex: 2 },
  tabBtn: { padding: '12px 24px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '700', transition: 'all 0.2s', marginBottom: '-1px' },
  
  content: { position: 'relative', zIndex: 2 },
  card: { borderRadius: '24px', padding: '40px', border: '1px solid', boxShadow: ZAPTRO_SHADOW.lg },
  cardTitle: { fontSize: '22px', fontWeight: '700', marginBottom: '8px' },
  cardSub: { fontSize: '14px', marginBottom: '32px', opacity: 0.7 },
  
  userList: { display: 'flex', flexDirection: 'column', marginBottom: '32px' },
  pItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' },
  pInfo: { display: 'flex', flexDirection: 'column' },
  pName: { fontWeight: '700', fontSize: '16px' },
  pDesc: { fontSize: '13px', opacity: 0.6 },
  pToggle: { width: '40px', height: '22px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', padding: '0 2px' },
  pDot: { width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: ZAPTRO_SHADOW.xs, transition: 'all 0.2s' },
  
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: '600', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' },
  input: { padding: '16px', border: '1px solid', borderRadius: '14px', outline: 'none', fontSize: '15px' },
  
  statusBanner: { padding: '24px', borderRadius: '20px', border: '1px solid', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' },
  statusInfo: { flex: 1 },
  statusTitle: { display: 'block', fontWeight: '700', fontSize: '17px' },
  statusDesc: { display: 'block', fontSize: '13px' },
  statusBadge: { padding: '6px 12px', fontWeight: '700', fontSize: '10px', borderRadius: '30px' },
  
  apiBox: { marginBottom: '32px' },
  tokenRow: { display: 'flex', gap: '12px', marginTop: '12px' },
  btnCopy: { padding: '0 20px', backgroundColor: 'transparent', border: '1px solid rgba(124, 124, 124, 0.2)', borderRadius: '14px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  
  btnSave: { padding: '18px 40px', border: 'none', borderRadius: '18px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', boxShadow: ZAPTRO_SHADOW.md },
};

export default ZaptroHub;
