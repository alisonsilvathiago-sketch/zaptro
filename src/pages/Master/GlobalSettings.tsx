import React, { useState } from 'react';
import { 
  Settings, Shield, Share2, Globe, 
  Database, Bell, Lock, Zap, Save,
  Server, Cpu, HardDrive, Layout,
  Smartphone, Eye, EyeOff, RefreshCw,
  AlertTriangle, CheckCircle2, MoreVertical,
  Activity, Search, Trash2, Cloud, Terminal,
  ShieldCheck, Palette, FileText, Mail
} from 'lucide-react';
import { toastSuccess } from '../../lib/toast';

const GlobalSettings: React.FC = () => {
  const [showKeys, setShowKeys] = useState(false);
  const [activeTab, setActiveTab] = useState<'INFRA' | 'MESSAGING' | 'SECURITY'>('INFRA');

  return (
    <div style={styles.container} className="animate-fade-in">
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Orquestração Global Logta</h1>
          <p style={styles.subtitle}>Gerenciamento de infraestrutura, segurança e identidade visual da plataforma SaaS.</p>
        </div>
        <div style={styles.headerActions}>
           <button style={styles.refreshBtn} onClick={() => toastSuccess('Configurações recarregadas!')}><RefreshCw size={18} /></button>
           <button style={styles.saveBtn} onClick={() => toastSuccess('Alterações globais propagadas!')}>
              <Save size={18} /> Propagar Alterações
           </button>
        </div>
      </header>

      {/* INFRASTRUCTURE MONITORING BAR */}
      <div style={styles.infraBar}>
         <div style={styles.infraItem}>
            <Cloud size={18} color="var(--primary)" />
            <div style={styles.infraInfo}>
               <span style={styles.infraLabel}>Cluster Supabase</span>
               <span style={styles.infraValue}>99.9% Uptime</span>
            </div>
         </div>
         <div style={styles.infraItem}>
            <Cpu size={18} color="#f59e0b" />
            <div style={styles.infraInfo}>
               <span style={styles.infraLabel}>Carga de CPU</span>
               <span style={styles.infraValue}>24% Avg</span>
            </div>
         </div>
         <div style={styles.infraItem}>
            <Database size={18} color="#2563eb" />
            <div style={styles.infraInfo}>
               <span style={styles.infraLabel}>Storage (S3)</span>
               <span style={styles.infraValue}>4.2TB / 10TB</span>
            </div>
         </div>
         <div style={styles.infraItem}>
            <Activity size={18} color="#10b981" />
            <div style={styles.infraInfo}>
               <span style={styles.infraLabel}>Sessões Ativas</span>
               <span style={styles.infraValue}>1,420</span>
            </div>
         </div>
      </div>

      {/* TAB NAVIGATION */}
      <div style={styles.tabNav}>
         <button 
           style={{...styles.navBtn, ...(activeTab === 'INFRA' ? styles.navActive : {})}}
           onClick={() => setActiveTab('INFRA')}
         >
           <Server size={18} /> Infraestrutura & Branding
         </button>
         <button 
           style={{...styles.navBtn, ...(activeTab === 'MESSAGING' ? styles.navActive : {})}}
           onClick={() => setActiveTab('MESSAGING')}
         >
           <Smartphone size={18} /> Hub de Mensageria (WA)
         </button>
         <button 
           style={{...styles.navBtn, ...(activeTab === 'SECURITY' ? styles.navActive : {})}}
           onClick={() => setActiveTab('SECURITY')}
         >
           <Lock size={18} /> Segurança Avançada
         </button>
      </div>

      {activeTab === 'INFRA' && (
        <div style={styles.settingsGrid}>
         {/* SEGURANÇA E ACESSO MASTER */}
         <div style={styles.settingsCard}>
            <header style={styles.cardHeader}>
               <div style={styles.cardIconBox}><ShieldCheck size={20} color="#7c3aed" /></div>
               <div>
                  <h3 style={styles.cardTitle}>Segurança & Firewall Master</h3>
                  <p style={styles.cardSub}>Proteção da infraestrutura central e acesso mestre.</p>
               </div>
            </header>
            <div style={styles.cardBody}>
               <div style={styles.settingRow}>
                  <div>
                     <p style={styles.sLabel}>Autenticação MFA Obrigatória</p>
                     <p style={styles.sDesc}>Exigir segundo fator para todos os Master Admins.</p>
                  </div>
                  <div style={styles.toggle}><div style={styles.toggleDotActive} /></div>
               </div>
               <div style={styles.settingRow}>
                  <div>
                     <p style={styles.sLabel}>Bloqueio Automático Inadimplência</p>
                     <p style={styles.sDesc}>Bloquear instâncias filhas com faturas VENCIDAS (D+7).</p>
                  </div>
                  <div style={styles.toggle}><div style={styles.toggleDotActive} /></div>
               </div>
               <div style={styles.settingRow}>
                  <div>
                     <p style={styles.sLabel}>Restrição de IP por Membro</p>
                     <p style={styles.sDesc}>Limitar acesso master a IPs específicos.</p>
                  </div>
                  <div style={styles.toggle}><div style={styles.toggleDot} /></div>
               </div>
            </div>
         </div>

         {/* WHITE-LABEL & IDENTITY */}
         <div style={styles.settingsCard}>
            <header style={styles.cardHeader}>
               <div style={styles.cardIconBox}><Palette size={20} color="#10b981" /></div>
               <div>
                  <h3 style={styles.cardTitle}>Global Branding (Identity)</h3>
                  <p style={styles.cardSub}>Customização visual padrão para novas instâncias.</p>
               </div>
            </header>
            <div style={styles.cardBody}>
               <div style={styles.brandingPreview}>
                  <div style={styles.bLogoBox}>L</div>
                  <div style={styles.bInfo}>
                     <p style={styles.bLabel}>Logta SaaS Framework</p>
                     <p style={styles.bSub}>ID de Branding: #LX-2026</p>
                  </div>
               </div>
               <div style={styles.colorGrid}>
                  <div style={styles.colorItem}>
                     <div style={{...styles.colorCirc, backgroundColor: '#7c3aed'}} />
                     <span>Primária</span>
                  </div>
                  <div style={styles.colorItem}>
                     <div style={{...styles.colorCirc, backgroundColor: '#1e1b4b'}} />
                     <span>Deep Purple</span>
                  </div>
                  <div style={styles.colorItem}>
                     <div style={{...styles.colorCirc, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0'}} />
                     <span>Background</span>
                  </div>
               </div>
               <button style={styles.secondaryBtn}>Customizar Assets de Cliente →</button>
            </div>
         </div>

         {/* INTEGRAÇÕES DE CORE (GATEWAYS) */}
         <div style={{...styles.settingsCard, gridColumn: 'span 2'}}>
            <header style={styles.cardHeader}>
               <div style={styles.cardIconBox}><Terminal size={20} color="#2563eb" /></div>
               <div>
                  <h3 style={styles.cardTitle}>Credenciais de Infraestrutura & Gateways</h3>
                  <p style={styles.cardSub}>Chaves mestras utilizadas pela plataforma (Ocultas por segurança).</p>
               </div>
            </header>
            <div style={styles.keysGrid}>
               <div style={styles.keyItem}>
                  <div style={styles.kLabel}>
                     <span>ASAAS PRODUCTION KEY</span>
                     <button style={styles.eyeBtn} onClick={() => setShowKeys(!showKeys)}>
                        {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                     </button>
                  </div>
                  <input 
                     type={showKeys ? 'text' : 'password'} 
                     value="ak_prod_8829_logta_x9928374857" 
                     style={styles.keyInput} 
                     readOnly 
                  />
               </div>
               <div style={styles.keyItem}>
                  <div style={styles.kLabel}>
                     <span>STRIPE SECRET ENGINE</span>
                     <button style={styles.eyeBtn} onClick={() => setShowKeys(!showKeys)}>
                        {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                     </button>
                  </div>
                  <input 
                     type={showKeys ? 'text' : 'password'} 
                     value="sk_test_51Mz9928374857Yh189" 
                     style={styles.keyInput} 
                     readOnly 
                  />
               </div>
               <div style={styles.keyItem}>
                  <div style={styles.kLabel}>
                     <span>Z-API MASTER TOKEN</span>
                  </div>
                  <input 
                     type="password" 
                     value="z_token_••••••••••••••••" 
                     style={styles.keyInput} 
                     readOnly 
                  />
               </div>
               <div style={styles.keyItem}>
                  <div style={styles.kLabel}>
                     <span>AWS S3 CLUSTER ID</span>
                  </div>
                  <input 
                     type="text" 
                     value="us-east-1-logta-prod" 
                     style={styles.keyInput} 
                     readOnly 
                  />
               </div>
            </div>
         </div>

         {/* NOTIFICAÇÕES E EMAILS */}
         <div style={styles.settingsCard}>
            <header style={styles.cardHeader}>
               <div style={styles.cardIconBox}><Mail size={20} color="#f59e0b" /></div>
               <div>
                  <h3 style={styles.cardTitle}>Global Email Engine</h3>
                  <p style={styles.cardSub}>Modelos e SMTP padrão para comunicações master.</p>
               </div>
            </header>
            <div style={styles.cardBody}>
               <div style={styles.settingRow}>
                  <p style={styles.sLabel}>SMTP Relay Service</p>
                  <span style={styles.sValue}>SendGrid Active</span>
               </div>
               <div style={styles.settingRow}>
                  <p style={styles.sLabel}>Email de Suporte Padrão</p>
                  <span style={styles.sValue}>suporte@logta.app</span>
               </div>
               <button style={styles.secondaryBtn}>Editar Templates de Email →</button>
            </div>
         </div>

         {/* MANUTENÇÃO E LOGS */}
         <div style={styles.settingsCard}>
            <header style={styles.cardHeader}>
               <div style={styles.cardIconBox}><Activity size={20} color="#64748b" /></div>
               <div>
                  <h3 style={styles.cardTitle}>Manutenção & Sistema</h3>
                  <p style={styles.cardSub}>Estado operacional e logs críticos do núcleo.</p>
               </div>
            </header>
            <div style={styles.cardBody}>
               <div style={styles.settingRow}>
                  <p style={styles.sLabel}>Modo Manutenção (Global)</p>
                  <div style={styles.toggle}><div style={styles.toggleDot} /></div>
               </div>
                <div style={styles.mStatsRow}>
                   <div style={styles.mStatItem}>
                      <span style={styles.mStatLabel}>Logs/min</span>
                      <span style={styles.mStatValue}>420</span>
                   </div>
                </div>
                <button style={{...styles.secondaryBtn, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)'}}>
                   <Trash2 size={14} /> Limpar Cache Global
                </button>
             </div>
          </div>
       </div>
    )}

      {activeTab === 'MESSAGING' && (
        <div style={styles.settingsGrid}>
           <div style={{...styles.settingsCard, gridColumn: 'span 2'}}>
              <header style={styles.cardHeader}>
                 <div style={styles.cardIconBox}><Smartphone size={20} color="#7c3aed" /></div>
                 <div>
                    <h3 style={styles.cardTitle}>Gestão de Templates Globais (WhatsApp)</h3>
                    <p style={styles.cardSub}>Modelos de mensagens transacionais para automação de frota.</p>
                 </div>
              </header>
              <div style={styles.waGrid}>
                 {[
                   { id: 1, name: 'ROUTE_START', type: 'Motorista', trigger: 'Início de Rota' },
                   { id: 2, name: 'DELIVERY_CONFIRMATION', type: 'Cliente', trigger: 'Entrega Concluída' },
                   { id: 3, name: 'PICKUP_ALERT', type: 'Fornecedor', trigger: 'Carga Pronta' }
                 ].map(t => (
                   <div key={t.id} style={styles.waItem}>
                      <div style={styles.waTag}>{t.type}</div>
                      <h4 style={styles.waItemTitle}>{t.name}</h4>
                      <p style={styles.waItemDesc}>Disparo gatilhado em: **{t.trigger}**</p>
                      <button style={styles.waEditBtn}>Configurar Template</button>
                   </div>
                 ))}
              </div>
           </div>

           <div style={styles.settingsCard}>
              <header style={styles.cardHeader}>
                 <div style={styles.cardIconBox}><Zap size={20} color="#f59e0b" /></div>
                 <div>
                    <h3 style={styles.cardTitle}>Configurações de Gateway</h3>
                    <p style={styles.cardSub}>Status do motor de mensageria central.</p>
                 </div>
              </header>
              <div style={styles.cardBody}>
                 <div style={styles.settingRow}>
                    <p style={styles.sLabel}>Evolution API Cluster</p>
                    <span style={{...styles.liveTag, color: '#10b981', backgroundColor: '#ecfdf5'}}>ONLINE</span>
                 </div>
                 <div style={styles.settingRow}>
                    <p style={styles.sLabel}>Master Instance ID</p>
                    <span style={styles.sValue}>logta_wa_master_hq</span>
                 </div>
                 <button style={styles.secondaryBtn}><RefreshCw size={14} /> Reiniciar Gateway</button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'SECURITY' && (
        <div style={styles.settingsGrid}>
           {/* Placeholder for future security controls */}
           <div style={{...styles.settingsCard, gridColumn: 'span 2', padding: '100px', textAlign: 'center'}}>
              <Lock size={48} color="#cbd5e1" style={{marginBottom: '20px'}} />
              <h3 style={styles.cardTitle}>Módulo de Segurança Robusta</h3>
              <p style={styles.cardSub}>Controles de acesso, logs de segurança e auditoria forense.</p>
           </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, any> = {
  container: { padding: '0', backgroundColor: 'transparent', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-1.5px' },
  subtitle: { color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500' },
  headerActions: { display: 'flex', gap: '12px' },
  refreshBtn: { width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-muted)' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' },
  
  infraBar: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid var(--border)' },
  infraItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '0 16px', borderRight: '1px solid #e2e8f0', '&:last-child': { borderRight: 'none' } },
  infraInfo: { display: 'flex', flexDirection: 'column' as const },
  infraLabel: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const },
  infraValue: { fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' },

  tabNav: { display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: '1px solid var(--border)', padding: '0 8px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 0', border: 'none', background: 'none', fontSize: '15px', fontWeight: '800', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative' as const, transition: 'all 0.2s' },
  navActive: { color: 'var(--primary)', '&::after': { content: '""', position: 'absolute' as const, bottom: '-1px', left: 0, right: 0, height: '2px', backgroundColor: 'var(--primary)', borderRadius: '2px' } },

  settingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', paddingBottom: '40px' },
  settingsCard: { backgroundColor: 'white', padding: '32px', borderRadius: '28px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' as const },
  cardHeader: { display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '32px' },
  cardIconBox: { width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: '18px', fontWeight: '900', color: 'var(--primary)', margin: 0 },
  cardSub: { fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' },
  cardBody: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  
  settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f8fafc' },
  sLabel: { fontSize: '14px', fontWeight: '800', color: 'var(--primary)', margin: 0 },
  sDesc: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', margin: 0 },
  sValue: { fontSize: '13px', fontWeight: '800', color: 'var(--primary)' },

  toggle: { width: '48px', height: '26px', backgroundColor: '#e2e8f0', borderRadius: '30px', padding: '3px', cursor: 'pointer', transition: 'all 0.3s' },
  toggleDot: { width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%', boxShadow: 'var(--shadow-sm)' },
  toggleDotActive: { width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%', marginLeft: '22px', border: '4px solid #10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)' },

  brandingPreview: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px' },
  bLogoBox: { width: '44px', height: '44px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', fontSize: '20px' },
  bInfo: { display: 'flex', flexDirection: 'column' as const },
  bLabel: { fontSize: '14px', fontWeight: '800', color: 'var(--primary)', margin: 0 },
  bSub: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' },
  colorGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  colorItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' },
  colorCirc: { width: '20px', height: '20px', borderRadius: '50%' },

  keysGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' },
  keyItem: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  kLabel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '0.05em' },
  eyeBtn: { border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)' },
  keyInput: { padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '700', color: 'var(--primary)', outline: 'none' },

  mStatsRow: { display: 'flex', gap: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px' },
  mStatItem: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  mStatLabel: { fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' as const },
  mStatValue: { fontSize: '16px', fontWeight: '900', color: 'var(--primary)' },

  secondaryBtn: { padding: '14px', border: '1px solid var(--border)', backgroundColor: 'white', borderRadius: '14px', fontSize: '13px', fontWeight: '800', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' },
  
  // WA Messaging
  waGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' },
  waItem: { backgroundColor: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  waTag: { fontSize: '9px', fontWeight: '900', color: '#7c3aed', backgroundColor: '#f5f3ff', padding: '4px 10px', borderRadius: '6px', alignSelf: 'flex-start' },
  waItemTitle: { fontSize: '16px', fontWeight: '900', color: 'var(--primary)', margin: 0 },
  waItemDesc: { fontSize: '12px', color: 'var(--text-muted)', margin: 0 },
  waEditBtn: { marginTop: '12px', padding: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: '800', color: 'var(--primary)', cursor: 'pointer' },
  liveTag: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', borderRadius: '20px', padding: '4px 12px' }
};

export default GlobalSettings;
