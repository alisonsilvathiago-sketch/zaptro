import React, { useState, useEffect } from 'react';
import { 
  Palette, Building2, Upload, Save, Check, 
  Layout, Type, Image as ImageIcon, Globe,
  RefreshCw, MousePointer2, Smartphone, Monitor,
  Link as LinkIcon, ShieldCheck
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';
import { toastSuccess, toastError, toastLoading, toastDismiss } from '../lib/toast';

const Settings: React.FC = () => {
  const { company, fetchCompanyData } = useTenant();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'white-label' | 'perfil' | 'dominio'>('white-label');
  const [loading, setLoading] = useState(false);
  
  // States para Previews
  const [previewLogo, setPreviewLogo] = useState<string | null>(company?.logo_url || null);
  const [previewFavicon, setPreviewFavicon] = useState<string | null>(company?.favicon_url || null);

  const [settings, setSettings] = useState({
    name: company?.name || '',
    slug: (company as any)?.slug || '',
    subdomain: company?.subdomain || '',
    primary_color: company?.primary_color || '#D9FF00',
    secondary_color: company?.secondary_color || '#A78BFA',
    menu_color: company?.menu_color || '#FFFFFF',
    bg_color: company?.bg_color || '#f4f4f4',
    button_radius: company?.button_radius || '12px',
    menu_name: company?.menu_name || 'Logta Business'
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;

    setLoading(true);
    toastLoading('Sincronizando identidade visual...');

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: settings.name,
          slug: settings.slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          subdomain: settings.subdomain.toLowerCase().replace(/[^a-z0-9]/g, ''),
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          menu_color: settings.menu_color,
          bg_color: settings.bg_color,
          button_radius: settings.button_radius,
          menu_name: settings.menu_name,
          logo_url: previewLogo,
          favicon_url: previewFavicon
        })
        .eq('id', profile.company_id);

      if (error) throw error;

      await fetchCompanyData(); // Atualiza o contexto global
      toastDismiss();
      toastSuccess('White Label atualizado em tempo real!');
    } catch (err: any) {
      console.error(err);
      toastDismiss();
      toastError(err.message || 'Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file || !profile?.company_id) return;

    // Preview local imediato
    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === 'logo') setPreviewLogo(reader.result as string);
      else setPreviewFavicon(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload real para o Storage
    const toastId = toastLoading(`Enviando ${target}...`);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${target}_${profile.company_id}_${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { data, error } = await supabase.storage
        .from('logta-files')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('logta-files')
        .getPublicUrl(filePath);

      if (target === 'logo') setPreviewLogo(publicUrl);
      else setPreviewFavicon(publicUrl);

      toastDismiss(toastId);
      toastSuccess(`${target === 'logo' ? 'Logo' : 'Favicon'} processado com sucesso!`);
    } catch (err: any) {
      toastDismiss(toastId);
      console.error('Erro no upload Storage:', err);
      toastError(`Falha no servidor de arquivos: ${err.message}`);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.headerPremium}>
        <div style={styles.headerTitleArea}>
          <div style={styles.headerBadge}>PLATAFORMA WHITE LABEL</div>
          <h1 style={styles.title}>Branding & Experiência</h1>
        </div>
        
        <div className="mobile-scroll" style={styles.tabNavCompact}>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'white-label' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('white-label')}>
            <Palette size={18} /> <span>Design</span>
          </button>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'dominio' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('dominio')}>
            <Globe size={18} /> <span>Acesso Custom</span>
          </button>
          <button style={{...styles.tabBtnCompact, ...(activeTab === 'perfil' ? styles.tabBtnActive : {})}} onClick={() => setActiveTab('perfil')}>
            <Building2 size={18} /> <span>Empresa</span>
          </button>
        </div>
      </header>

      {activeTab === 'white-label' && (
        <form onSubmit={handleSave} style={styles.content}>
          <div style={styles.grid}>
            {/* Seção 1: Identidade Visual */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}><ImageIcon size={20} color="var(--primary)" /> Logotipos e Ícones</h3>
              
              <div style={styles.logoSection}>
                 <label style={styles.label}>Logotipo Principal (Dashboard & Login)</label>
                 <div style={styles.logoUploadArea}>
                    {previewLogo ? (
                      <img src={previewLogo} alt="Logo" style={styles.logoPreview} />
                    ) : (
                      <div style={styles.logoPlaceholder}><ImageIcon size={32} /></div>
                    )}
                    <div style={styles.uploadControls}>
                       <input type="file" id="logo-upload" hidden onChange={e => handleFileUpload(e, 'logo')} />
                       <label htmlFor="logo-upload" style={styles.uploadBtn}><Upload size={14} /> Trocar Logo</label>
                       <p style={styles.uSub}>SVG ou PNG (512x512px recomendado)</p>
                    </div>
                 </div>
              </div>

              <div style={{...styles.logoSection, marginTop: '24px'}}>
                 <label style={styles.label}>Ícone da Guia (Favicon)</label>
                 <div style={styles.logoUploadArea}>
                    {previewFavicon ? (
                      <img src={previewFavicon} alt="Favicon" style={{...styles.logoPreview, width: '40px', height: '40px'}} />
                    ) : (
                      <div style={{...styles.logoPlaceholder, width: '40px', height: '40px'}}><Globe size={18} /></div>
                    )}
                    <div style={styles.uploadControls}>
                       <input type="file" id="favicon-upload" hidden onChange={e => handleFileUpload(e, 'favicon')} />
                       <label htmlFor="favicon-upload" style={{...styles.uploadBtn, padding: '8px 12px'}}><Upload size={14} /> Favicon</label>
                    </div>
                 </div>
              </div>
            </div>

            {/* Seção 2: Esquema de Cores */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}><Palette size={20} color="var(--primary)" /> Paleta Nexio</h3>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Cor Primária</label>
                  <div style={styles.colorPickerContainer}>
                    <input type="color" style={styles.colorInput} value={settings.primary_color} onChange={e => setSettings({...settings, primary_color: e.target.value})} />
                    <input style={styles.input} value={settings.primary_color} readOnly />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Cor Secundária</label>
                  <div style={styles.colorPickerContainer}>
                    <input type="color" style={styles.colorInput} value={settings.secondary_color} onChange={e => setSettings({...settings, secondary_color: e.target.value})} />
                    <input style={styles.input} value={settings.secondary_color} readOnly />
                  </div>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                   <label style={styles.label}>Menu Lateral</label>
                   <input type="color" style={{...styles.colorInput, width: '100%'}} value={settings.menu_color} onChange={e => setSettings({...settings, menu_color: e.target.value})} />
                </div>
                <div style={styles.formGroup}>
                   <label style={styles.label}>Background App</label>
                   <input type="color" style={{...styles.colorInput, width: '100%'}} value={settings.bg_color} onChange={e => setSettings({...settings, bg_color: e.target.value})} />
                </div>
              </div>

              <div style={styles.formGroup}>
                 <label style={styles.label}>Arredondamento UI</label>
                 <div style={styles.radiusTabs}>
                    {['4px', '12px', '24px'].map(r => (
                       <div 
                         key={r} 
                         style={{...styles.radiusTab, ...(settings.button_radius === r ? styles.radiusTabActive : {})}} 
                         onClick={() => setSettings({...settings, button_radius: r})}
                       >
                          {r === '4px' ? 'Sharp' : r === '12px' ? 'Nexio' : 'Apple'}
                       </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* Preview Integrado */}
            <div style={{...styles.card, gridColumn: 'span 2'}}>
               <h3 style={styles.cardTitle}><Monitor size={20} /> Preview da Experiência</h3>
               <div style={{...styles.fullPreview, backgroundColor: settings.bg_color}}>
                  <div style={{...styles.pSide, backgroundColor: settings.menu_color}}>
                     <div style={{...styles.pLogo, backgroundColor: settings.primary_color}} />
                     <div style={styles.pMenuLine} />
                     <div style={styles.pMenuLine} />
                  </div>
                  <div style={styles.pMain}>
                     <div style={{...styles.pHeader, borderBottom: `1px solid var(--border)`}}>
                        <span style={{fontWeight: '900', color: 'var(--text-main)', fontSize: '14px'}}>{settings.menu_name}</span>
                     </div>
                     <div style={styles.pContent}>
                        <div style={{...styles.pButton, backgroundColor: settings.primary_color, borderRadius: settings.button_radius}}>Botão Primário</div>
                        <div style={{...styles.pButton, border: `1px solid ${settings.secondary_color}`, color: settings.secondary_color, borderRadius: settings.button_radius, backgroundColor: 'transparent'}}>Botão Secundário</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <div style={styles.saveSection}>
             <button type="submit" style={styles.saveBtn} disabled={loading}>
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
                Publicar Identidade
             </button>
          </div>
        </form>
      )}

      {activeTab === 'dominio' && (
        <form onSubmit={handleSave} style={styles.content}>
           <div style={styles.card}>
              <h3 style={styles.cardTitle}><LinkIcon size={20} color="var(--primary)" /> URLs de Acesso Exclusivas</h3>
              <p style={styles.uSub}>Defina como seus colaboradores acessarão a plataforma com sua marca.</p>
              
              <div style={{...styles.formGroup, marginTop: '32px'}}>
                 <label style={styles.label}>Subdomínio Personalizado (Vantajoso)</label>
                 <div style={styles.urlBox}>
                    <input 
                      style={styles.urlInput} 
                      value={settings.subdomain}
                      onChange={e => setSettings({...settings, subdomain: e.target.value})}
                      placeholder="empresa"
                    />
                    <span style={styles.urlDomain}>.logta.com.br</span>
                 </div>
                 <p style={styles.hint}>Exemplo: {settings.subdomain || 'empresa'}.logta.com.br</p>
              </div>

              <div style={{...styles.formGroup, marginTop: '24px'}}>
                 <label style={styles.label}>Slug da URL (Fallback)</label>
                 <div style={styles.urlBox}>
                    <span style={styles.urlDomain}>logta.com.br/empresa/</span>
                    <input 
                      style={styles.urlInput} 
                      value={settings.slug}
                      onChange={e => setSettings({...settings, slug: e.target.value})}
                      placeholder="minha-unidade"
                    />
                 </div>
              </div>

              <div style={styles.infoBox}>
                 <ShieldCheck size={20} color="var(--primary)" />
                 <div>
                    <h4 style={{fontSize: '14px', fontWeight: '800'}}>Segurança de Acesso</h4>
                    <p style={styles.uSub}>Ao ativar um domínio customizado, apenas usuários vinculados ao ID da sua empresa poderão realizar login por estas URLs.</p>
                 </div>
              </div>
           </div>
           
           <div style={styles.saveSection}>
             <button type="submit" style={styles.saveBtn} disabled={loading}>
                <Check size={20} /> Salvar Configurações de Acesso
             </button>
           </div>
        </form>
      )}

      {activeTab === 'perfil' && (
        <div style={{textAlign: 'center', padding: '100px', backgroundColor: 'white', borderRadius: '32px', border: '1px solid var(--border)'}}>
           <Layout size={64} color="var(--primary-light)" style={{marginBottom: '20px'}} />
           <h2>Dados Cadastrais</h2>
           <p style={styles.uSub}>O CNPJ e razão social da empresa devem ser editados via ticket de suporte.</p>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '32px', backgroundColor: 'var(--bg-app)', minHeight: '100vh' },
  headerPremium: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap' as const, gap: '24px' },
  headerTitleArea: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  headerBadge: { display: 'inline-block', width: 'fit-content', padding: '4px 12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '30px', fontSize: '10px', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1px' },
  tabNavCompact: { display: 'flex', gap: '8px', backgroundColor: 'rgba(241, 245, 249, 0.5)', padding: '6px', borderRadius: '18px', border: '1px solid var(--border)', overflowX: 'auto' as const, scrollbarWidth: 'none' as const },
  tabBtnCompact: { 
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', 
    padding: '10px 16px', borderRadius: '14px', border: 'none', backgroundColor: 'transparent', 
    fontWeight: '700', color: '#94A3B8', cursor: 'pointer', transition: 'all 0.2s', 
    minWidth: '80px', fontSize: '11px' 
  },
  tabBtnActive: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' },

  content: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' },
  card: { backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  cardTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  formGroup: { marginBottom: '20px', display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  label: { fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' },
  input: { padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', backgroundColor: 'var(--bg-app)' },
  
  logoSection: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  logoUploadArea: { display: 'flex', alignItems: 'center', gap: '20px' },
  logoPreview: { width: '80px', height: '80px', borderRadius: '16px', objectFit: 'contain' as const, backgroundColor: '#ebebeb', border: '1px solid var(--border)' },
  logoPlaceholder: { width: '80px', height: '80px', borderRadius: '16px', backgroundColor: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
  uploadControls: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  uploadBtn: { padding: '8px 16px', backgroundColor: '#ebebeb', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  uSub: { fontSize: '11px', color: 'var(--text-muted)' },
  
  colorPickerContainer: { display: 'flex', gap: '10px' },
  colorInput: { width: '44px', height: '44px', border: 'none', borderRadius: '12px', cursor: 'pointer', padding: 0, backgroundColor: 'transparent' },
  
  radiusTabs: { display: 'flex', gap: '8px', backgroundColor: 'var(--bg-app)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border)' },
  radiusTab: { flex: 1, padding: '8px', textAlign: 'center' as const, fontSize: '12px', fontWeight: '700', cursor: 'pointer', borderRadius: '10px', color: 'var(--text-muted)' },
  radiusTabActive: { backgroundColor: 'white', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' },

  fullPreview: { width: '100%', height: '240px', borderRadius: '24px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' },
  pSide: { width: '80px', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  pLogo: { width: '40px', height: '40px', borderRadius: '12px' },
  pMenuLine: { height: '4px', width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '10px' },
  pMain: { flex: 1, display: 'flex', flexDirection: 'column' as const },
  pHeader: { height: '56px', backgroundColor: 'white', padding: '0 24px', display: 'flex', alignItems: 'center' },
  pContent: { flex: 1, padding: '32px', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center' },
  pButton: { padding: '12px 24px', color: 'white', fontSize: '12px', fontWeight: '800' },

  urlBox: { display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-app)', borderRadius: '14px', border: '2px solid var(--border)', overflow: 'hidden', transition: 'border 0.2s' },
  urlInput: { border: 'none', outline: 'none', padding: '16px', backgroundColor: 'transparent', flex: 1, fontSize: '16px', fontWeight: '700', textAlign: 'right' as const, color: 'var(--primary)' },
  urlDomain: { padding: '16px', backgroundColor: 'rgba(0,0,0,0.02)', color: 'var(--text-muted)', fontWeight: '600', fontSize: '16px', borderLeft: '1px solid var(--border)' },
  hint: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', marginLeft: '4px' },
  infoBox: { marginTop: '40px', padding: '24px', backgroundColor: 'var(--primary-light)', borderRadius: '24px', border: '1px solid var(--primary)', display: 'flex', gap: '20px', alignItems: 'flex-start' },

  saveSection: { marginTop: '12px', display: 'flex', justifyContent: 'flex-end' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 48px', backgroundColor: 'var(--text-main)', color: 'white', borderRadius: '16px', fontWeight: '800', cursor: 'pointer', border: 'none', fontSize: '16px', transition: 'transform 0.2s' }
};

export default Settings;
