import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { 
  Globe, Building2, Users, Layers, 
  CreditCard, Terminal, ShieldCheck, 
  Bell, Palette, Database, Save, 
  RefreshCw, GraduationCap 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../../lib/toast';
import MasterStaff from './MasterStaff';
import MasterLMS from './MasterLMS';
import MasterPlans from './MasterPlans';
import ApiManagement from './ApiManagement';
import AuditLogs from './AuditLogs';

const MasterSettings: React.FC = () => {
  const { profile } = useAuth();
  const { configs: globalConfigs, refreshConfigs } = useSystemConfig();
  const [activeTab, setActiveTab] = useState('geral');
  const [loading, setLoading] = useState(false);
  
  // Local states for form management
  const [platformName, setPlatformName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [allowRegistration, setAllowRegistration] = useState(true);

  // Sync local state when global configs load
  useEffect(() => {
    if (globalConfigs) {
      setPlatformName(globalConfigs.platformName);
      setSupportEmail(globalConfigs.supportEmail);
      setPrimaryColor(globalConfigs.primaryColor);
      setAllowRegistration(globalConfigs.allowRegistration);
    }
  }, [globalConfigs]);

  const handleSaveAll = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const tid = toastLoading('Sincronizando cérebro da plataforma...');

    try {
      const configEntries = [
        { key: 'PLATFORM_NAME', value: platformName },
        { key: 'SUPPORT_EMAIL', value: supportEmail },
        { key: 'PRIMARY_COLOR', value: primaryColor },
        { key: 'ALLOW_REGISTRATION', value: allowRegistration.toString() }
      ];

      // Upsert configs
      for (const entry of configEntries) {
        if (!entry.value) continue;
        const { error } = await supabase
          .from('system_configs')
          .upsert({ key: entry.key, value: entry.value }, { onConflict: 'key' });
        if (error) throw error;
      }

      // Record Audit Log
      await supabase.from('master_audit_logs').insert({
        actor_id: profile.id,
        target_type: 'SYSTEM',
        action: 'UPDATE_CONFIGS',
        details: `Configurações globais atualizadas: Nome=${platformName}, Cor=${primaryColor}`,
        metadata: { platformName, primaryColor, supportEmail }
      });

      // Refresh global context to apply changes instantly (White Label)
      await refreshConfigs();
      
      toastDismiss(tid);
      toastSuccess('Configurações Globais Propagadas! 🚀');
    } catch (err: any) {
      toastDismiss(tid);
      toastError('Erro ao atualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: <Globe size={18} /> },
    { id: 'empresas', label: 'Empresas', icon: <Building2 size={18} /> },
    { id: 'usuarios', label: 'Equipe Master', icon: <Users size={18} /> },
    { id: 'planos', label: 'Planos & Ofertas', icon: <Layers size={18} /> },
    { id: 'financeiro', label: 'Faturamento Mestre', icon: <CreditCard size={18} /> },
    { id: 'apis', label: 'Central de APIs', icon: <Terminal size={18} /> },
    { id: 'lms', label: 'Hub de Treinamentos', icon: <GraduationCap size={18} /> },
    { id: 'seguranca', label: 'Segurança & Logs', icon: <ShieldCheck size={18} /> },
    { id: 'notificacoes', label: 'Notificações', icon: <Bell size={18} /> },
    { id: 'personalizacao', label: 'Personalização', icon: <Palette size={18} /> },
    { id: 'sistema', label: 'Status do Núcleo', icon: <Database size={18} /> },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'geral': return (
        <GeralTab 
          name={platformName} setName={setPlatformName} 
          email={supportEmail} setEmail={setSupportEmail}
          reg={allowRegistration} setReg={setAllowRegistration}
        />
      );
      case 'empresas': return <div style={styles.tabPlaceholder}><Building2 size={48} /><p>Redirecionando para <br/><strong>Gestão de Empresas</strong>...</p></div>;
      case 'usuarios': return <MasterStaff />;
      case 'planos': return <MasterPlans />;
      case 'apis': return <ApiManagement />;
      case 'lms': return <MasterLMS />;
      case 'seguranca': return <AuditLogs />;
      case 'personalizacao': return (
        <PersonalizacaoTab 
          color={primaryColor} setColor={setPrimaryColor} 
        />
      );
      case 'financeiro': return <div style={styles.tabPlaceholder}>Gestão de Faturamento Integrada.</div>;
      default: return <div style={styles.tabPlaceholder}>Módulo em desenvolvimento.</div>;
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <div style={styles.badge}>MASTER HQ • CENTRAL DE ORQUESTRAÇÃO</div>
          <h1 style={styles.title}>Cérebro da Plataforma</h1>
          <p style={styles.subtitle}>Controle absoluto sobre regras de negócio, infraestrutura e identidade.</p>
        </div>
        <div style={styles.headerActions}>
           <button style={styles.refreshBtn} onClick={refreshConfigs} disabled={loading}><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
           <button style={styles.saveBtn} onClick={handleSaveAll} disabled={loading}>
              <Save size={18} /> {loading ? 'Propagando...' : 'Propagar Alterações'}
           </button>
        </div>
      </header>

      <div style={styles.layout}>
        {/* SIDEBAR TABS */}
        <nav style={styles.sidebar}>
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {})
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* CONTENT AREA */}
        <main style={styles.content}>
           {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTES DE ABAS ---

const GeralTab = ({ name, setName, email, setEmail, reg, setReg }: any) => {
  return (
    <div style={styles.tabContent}>
       <h3 style={styles.tabTitle}>Configurações de Identidade Global</h3>
       <div style={styles.fGrid}>
          <div style={styles.fGroup}>
             <label style={styles.fLabel}>Nome da Plataforma (Logta SaaS)</label>
             <input style={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Logta Enterprise" />
          </div>
          <div style={styles.fGroup}>
             <label style={styles.fLabel}>E-mail de Suporte ao Cliente</label>
             <input style={styles.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="suporte@seuapp.com" />
          </div>
          <div style={styles.fGroup}>
             <label style={styles.fLabel}>Domínio Principal</label>
             <input style={styles.input} placeholder="logta.com.br" readOnly />
          </div>
          <div style={styles.fGroup}>
             <label style={styles.fLabel}>Permitir Novos Registros (Landing)</label>
             <select style={styles.input} value={reg.toString()} onChange={e => setReg(e.target.value === 'true')}>
                <option value="true">Ativado</option>
                <option value="false">Desativado (Invite Only)</option>
             </select>
          </div>
       </div>
    </div>
  );
};

const PersonalizacaoTab = ({ color, setColor }: any) => {
  return (
    <div style={styles.tabContent}>
       <h3 style={styles.tabTitle}>Branding & White Label Base</h3>
       <p style={styles.tabSub}>Essas cores definem a experiência padrão de novos clientes até que eles personalizem seus próprios painéis.</p>
       
       <div style={styles.brandingGrid}>
          <div style={styles.colorCard}>
             <div style={{...styles.colorPreview, backgroundColor: color || '#7c3aed'}} />
             <div>
                <p style={styles.colorName}>Cor Primária</p>
                <input 
                  type="color" 
                  value={color || '#7c3aed'} 
                  onChange={e => setColor(e.target.value)} 
                  style={{...styles.input, padding: '2px', height: '32px', width: '60px', marginTop: '8px'}}
                />
             </div>
          </div>
          <div style={styles.logoCard}>
             <div style={styles.logoPreview}>L</div>
             <button style={styles.secondaryBtn}>Upload Nova Logo (Storage)</button>
          </div>
       </div>
    </div>
  );
};

// --- ESTILOS ---

const styles: Record<string, any> = {
  container: { padding: '0', minHeight: '100vh', backgroundColor: 'transparent' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  badge: { fontSize: '10px', fontWeight: '950', color: 'var(--primary)', letterSpacing: '1px', marginBottom: '8px', opacity: 0.8 },
  title: { fontSize: '32px', fontWeight: '950', color: '#111827', letterSpacing: '-1.5px', margin: 0 },
  subtitle: { fontSize: '15px', color: '#6b7280', fontWeight: '500' },
  headerActions: { display: 'flex', gap: '12px' },
  refreshBtn: { width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', color: '#64748b' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' },

  layout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: '40px', alignItems: 'flex-start' },
  sidebar: { display: 'flex', flexDirection: 'column' as const, gap: '6px', backgroundColor: 'white', padding: '12px', borderRadius: '24px', border: '1px solid #e2e8f0' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', border: 'none', backgroundColor: 'transparent', borderRadius: '14px', fontSize: '14px', fontWeight: '700', color: '#64748b', cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.2s' },
  tabBtnActive: { backgroundColor: '#f5f3ff', color: 'var(--primary)' },

  content: { backgroundColor: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '600px' },
  tabContent: { animation: 'slideIn 0.3s ease-out' },
  tabTitle: { fontSize: '20px', fontWeight: '900', color: '#111827', marginBottom: '8px' },
  tabSub: { fontSize: '14px', color: '#6b7280', marginBottom: '32px' },
  tabPlaceholder: { height: '400px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '16px', textAlign: 'center' as const },

  fGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  fGroup: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  fLabel: { fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' as const },
  input: { padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '700', outline: 'none' },

  brandingGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  colorCard: { padding: '24px', backgroundColor: '#f8fafc', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e2e8f0' },
  colorPreview: { width: '48px', height: '48px', borderRadius: '12px' },
  colorName: { fontSize: '14px', fontWeight: '800', margin: 0 },
  logoCard: { padding: '24px', backgroundColor: '#f8fafc', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #e2e8f0' },
  logoPreview: { width: '48px', height: '48px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '20px' },
  secondaryBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }
};

export default MasterSettings;
