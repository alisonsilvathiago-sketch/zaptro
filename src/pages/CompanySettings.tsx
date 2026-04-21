import React, { useState, useEffect } from 'react';
import { 
  Building2, Palette, Image as ImageIcon, Save, Globe, 
  Phone, Mail, MapPin, ExternalLink, ShieldCheck, Check,
  FileText, User, Layout, Box
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';

const CompanySettings: React.FC = () => {
  const { company, setCompany } = useTenant();
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    responsible: '',
    segment: 'TRANSPORTE_GERAL',
    primary_color: '#6366F1',
    secondary_color: '#A855F7',
    logo_url: '',
    icon_url: '',
    subdomain: '',
    custom_domain: '',
    phone: '',
    email: '',
    address: '',
    plan: 'Premium Multi-Tenant'
  });
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        cnpj: (company as any).cnpj || '',
        responsible: (company as any).responsible || '',
        segment: (company as any).segment || 'TRANSPORTE_GERAL',
        primary_color: company.primary_color || '#6366F1',
        secondary_color: company.secondary_color || '#A855F7',
        logo_url: company.logo_url || '',
        icon_url: (company as any).icon_url || '',
        subdomain: company.subdomain || '',
        custom_domain: (company as any).custom_domain || '',
        phone: (company as any).phone || '',
        email: (company as any).email || '',
        address: (company as any).address || '',
        plan: (company as any).plan || 'Premium Multi-Tenant'
      });
    }
  }, [company]);

  // Real-time preview of colors
  useEffect(() => {
    if (formData.primary_color) {
        const root = document.documentElement;
        root.style.setProperty('--primary', formData.primary_color);
        root.style.setProperty('--primary-light', `${formData.primary_color}1a`);
    }
  }, [formData.primary_color]);

  const handleSave = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          cnpj: formData.cnpj,
          responsible: formData.responsible,
          segment: formData.segment,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          logo_url: formData.logo_url,
          icon_url: formData.icon_url,
          subdomain: formData.subdomain,
          custom_domain: formData.custom_domain,
          phone: formData.phone,
          email: formData.email,
          address: formData.address
        })
        .eq('id', company.id)
        .select()
        .single();

      if (error) throw error;
      if (data && setCompany) setCompany(data);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações da empresa.');
    } finally {
      setLoading(false);
    }
  };

  if (profile && profile.role !== 'ADMIN' && profile.role !== 'MASTER_ADMIN') {
    return <Navigate to="/perfil" replace />;
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Minha Empresa</h1>
          <p style={styles.subtitle}>Gerencie a identidade visual, dados contratuais e APIs da organização.</p>
        </div>
        <button 
          style={{
            ...styles.primaryBtn,
            backgroundColor: saveSuccess ? '#10B981' : 'var(--primary)',
          }} 
          onClick={handleSave} 
          disabled={loading}
        >
          {loading ? 'Salvando...' : saveSuccess ? <><Check size={18} /> Salvo!</> : <><Save size={18} /> Salvar Alterações</>}
        </button>
      </header>

      {/* Tabs Layout solicitado */}
      <div style={styles.tabsContainer}>
        <button style={{...styles.tabBtn, borderBottomColor: activeTab === 'geral' ? 'var(--primary)' : 'transparent', color: activeTab === 'geral' ? 'var(--primary)' : 'var(--text-muted)'}} onClick={() => setActiveTab('geral')}>Geral</button>
        <button style={{...styles.tabBtn, borderBottomColor: activeTab === 'white' ? 'var(--primary)' : 'transparent', color: activeTab === 'white' ? 'var(--primary)' : 'var(--text-muted)'}} onClick={() => setActiveTab('white')}>White Label</button>
        <button style={{...styles.tabBtn, borderBottomColor: activeTab === 'api' ? 'var(--primary)' : 'transparent', color: activeTab === 'api' ? 'var(--primary)' : 'var(--text-muted)'}} onClick={() => setActiveTab('api')}>APIs & Webhooks</button>
      </div>

      <div style={styles.contentArea}>
        {activeTab === 'geral' && (
          <div style={styles.grid}>
             <div style={styles.card}>
                <div style={styles.sectionHeader}>
                  <Building2 size={20} color="var(--primary)" />
                  <h3 style={styles.sectionTitle}>Dados da Organização</h3>
                </div>
                <div style={styles.formGrid}>
                   <div style={styles.formGroup}>
                      <label style={styles.label}>Nome Comercial</label>
                      <input style={styles.input} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                   </div>
                   <div style={styles.formGroup}>
                      <label style={styles.label}>CNPJ</label>
                      <input style={styles.input} value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: e.target.value })} />
                   </div>
                </div>
             </div>
             <div style={styles.card}>
                 <div style={styles.sectionHeader}><ShieldCheck size={20} color="var(--primary)" /> <h3 style={styles.sectionTitle}>Plano Contratado</h3></div>
                 <h2 style={{fontSize: '24px', fontWeight: '800', color: 'var(--primary)'}}>{formData.plan}</h2>
             </div>
          </div>
        )}

        {activeTab === 'white' && (
          <div style={styles.grid}>
             <div style={styles.card}>
                <div style={styles.sectionHeader}><Palette size={20} color="var(--primary)" /> <h3 style={styles.sectionTitle}>Cores e Identidade</h3></div>
                <div style={styles.colorRow}>
                   <div style={styles.formGroup}><label style={styles.label}>Cor Primária</label><input type="color" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})} /></div>
                   <div style={styles.formGroup}><label style={styles.label}>Cor Secundária</label><input type="color" value={formData.secondary_color} onChange={e => setFormData({...formData, secondary_color: e.target.value})} /></div>
                </div>
             </div>
             <div style={styles.card}>
                <div style={styles.sectionHeader}><ImageIcon size={20} color="var(--primary)" /> <h3 style={styles.sectionTitle}>Links de Branding</h3></div>
                <div style={styles.formGroup}><label style={styles.label}>Logo URL</label><input style={styles.input} value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} /></div>
             </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div style={styles.grid}>
             <div style={styles.card}>
                <div style={styles.sectionHeader}><Globe size={20} color="var(--primary)" /> <h3 style={styles.sectionTitle}>Integrações Externas</h3></div>
                <div style={styles.formGroup}>
                   <label style={styles.label}>API de Rastreamento (Key)</label>
                   <input style={styles.input} type="password" placeholder="sk_live_..." />
                </div>
                <div style={styles.formGroup}>
                   <label style={styles.label}>Webhook URL (Events)</label>
                   <input style={styles.input} placeholder="https://api.suaempresa.com/hooks" />
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  title: { fontSize: '28px', fontWeight: '800', color: 'var(--text-main)' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', border: 'none', borderRadius: '14px', color: 'white', fontWeight: '700', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px' },
  leftCol: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  card: { backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-premium)' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  sectionTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  formGroup: { marginBottom: '20px' },
  label: { fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', display: 'block' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', fontSize: '14px' },
  iconInput: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)' },
  inputNoBorder: { border: 'none', outline: 'none', flex: 1, backgroundColor: 'transparent', color: 'var(--text-main)', fontSize: '14px' },
  assetsGrid: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '24px' },
  assetBox: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  logoPreview: { height: '80px', borderRadius: '16px', backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '800' },
  iconPreview: { width: '80px', height: '80px', borderRadius: '16px', backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '20px', fontWeight: '800' },
  colorRow: { display: 'flex', gap: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' },
  rightCol: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  tabsContainer: { display: 'flex', gap: '32px', borderBottom: '1px solid var(--border)', marginBottom: '32px', padding: '0 8px' },
  tabBtn: { padding: '16px 8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '700', borderBottom: '3px solid transparent', transition: 'all 0.2s', color: 'var(--text-muted)' },
  contentArea: { minHeight: '400px' }
};

export default CompanySettings;
