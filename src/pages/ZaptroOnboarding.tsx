import React, { useState, useEffect } from 'react';
import { 
  QrCode, Smartphone, CheckCircle, Loader2, 
  RefreshCw, MessageSquare, Zap, ShieldCheck,
  ArrowRight, HelpCircle, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { evolutionApi } from '../lib/evolution';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { toastSuccess, toastError } from '../lib/toast';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';

import ZaptroLayout from '../components/Zaptro/ZaptroLayout';

const ZaptroOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [step, setStep] = useState(1);
  const [instance, setInstance] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initOnboarding = async () => {
      if (!profile?.company_id) return;
      const { data } = await supabaseZaptro.from('whatsapp_instances').select('*').eq('company_id', profile.company_id).single();
      if (data) {
        setInstance(data);
        setStep(2);
        checkStatus(data.instance_id);
      }
    };
    initOnboarding();
  }, [profile?.company_id]);

  const checkStatus = async (id: string) => {
    try {
      const resp = await evolutionApi.getConnectionStatus(id);
      if (resp.instance?.state === 'open') {
        setStatus('connected');
        toastSuccess('WhatsApp Conectado!');
        setTimeout(() => navigate('/inicio'), 2500);
      } else {
        setStatus('disconnected');
        if (resp.qrcode?.base64) setQrCode(resp.qrcode.base64);
      }
    } catch (err) {
      setStatus('error');
    }
  };

  useEffect(() => {
    let interval: any;
    if (instance && status !== 'connected') {
      interval = setInterval(() => checkStatus(instance.instance_id), 5000);
    }
    return () => clearInterval(interval);
  }, [instance, status]);

  const handleStartConnection = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const instanceName = `zaptro_${profile.company_id.slice(0, 8)}`;
      const result = await evolutionApi.createInstance(profile.company_id, instanceName);
      
      const { data, error } = await supabaseZaptro
        .from('whatsapp_instances')
        .insert([{
          company_id: profile.company_id,
          instance_id: instanceName,
          token: result.hash,
          provider: 'evolution',
          status: 'disconnected'
        }])
        .select()
        .single();

      if (error) throw error;
      setInstance(data);
      setStep(2);
    } catch (err: any) {
      toastError('Erro ao iniciar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ZaptroLayout hideSidebar hideTopbar>
      <div style={{...styles.page, backgroundColor: 'transparent'}}>
        <style>{`
          @keyframes pulseQr {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(204, 255, 0, 0.4); }
            50% { transform: scale(1.02); box-shadow: 0 0 40px rgba(204, 255, 0, 0.2); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(204, 255, 0, 0.4); }
          }
          @keyframes blink {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes slideUp {
            from { transform: translateY(40px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes checkPop {
            0% { transform: scale(0) rotate(-45deg); opacity: 0; }
            70% { transform: scale(1.2) rotate(10deg); opacity: 1; }
            100% { transform: scale(1) rotate(0); opacity: 1; }
          }
          .qr-pulse { animation: pulseQr 3s infinite ease-in-out; }
          .status-blink { animation: blink 1.5s infinite ease-in-out; }
          .success-check { animation: checkPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .glass-container { backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.8); }
        `}</style>

        <div style={styles.onboardingCard}>
          <header style={styles.header}>
             <div style={styles.logoBox}>
                <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M65 10L25 55H50L35 90L75 45H50L65 10Z" fill="#CCFF00" stroke="#CCFF00" strokeWidth="5" strokeLinejoin="round"/>
                </svg>
             </div>
             <h1 style={styles.logoText}>Zaptro</h1>
          </header>

          {step === 1 ? (
            <div style={{...styles.content, animation: 'slideUp 0.5s ease'}}>
               <div style={styles.heroBadge}>PASSO 1 DE 2 — CONFIGURAÇÃO</div>
               <h2 style={styles.title}>Ative seu WhatsApp White Label</h2>
               <p style={styles.desc}>
                  Bem-vindo ao Zaptro, <strong>{profile?.full_name}</strong>!<br/>
                  Conecte seu number para automatizar seus atendimentos e escalar sua operação.
               </p>
               
               <div style={styles.featureList}>
                  <div style={styles.featureItem}><CheckCircle size={18} color="#CCFF00" /> <span>Multi-agentes simultâneos</span></div>
                  <div style={styles.featureItem}><CheckCircle size={18} color="#CCFF00" /> <span>Chatbot Inteligente</span></div>
                  <div style={styles.featureItem}><CheckCircle size={18} color="#CCFF00" /> <span>Integração Evolution API</span></div>
               </div>

               <button style={styles.primaryBtn} onClick={handleStartConnection} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : 'Próxima Etapa'} <ArrowRight size={18} />
               </button>
            </div>
          ) : (
            <div style={{...styles.content, animation: 'slideUp 0.5s ease'}}>
               <div style={styles.heroBadge}>PASSO 2 DE 2 — CONEXÃO FINAL</div>
               <h2 style={styles.title}>Escaneie o QR Code</h2>
               <p style={styles.desc}>Abra o WhatsApp no seu celular, vá em <b>Aparelhos Conectados</b> e aponte para a tela.</p>

               <div style={styles.qrContainer}>
                  {status === 'connected' ? (
                    <div style={{textAlign: 'center'}}>
                       <div className="success-check">
                          <CheckCircle size={80} color="#10B981" />
                       </div>
                       <h3 style={{...styles.title, fontSize: '24px', marginTop: '24px'}}>Conectado!</h3>
                       <p style={{...styles.desc, color: '#10B981', fontWeight: '600'}}>Tudo pronto! Seu sistema está ativo 🚀</p>
                    </div>
                  ) : qrCode ? (
                    <div style={styles.qrWrapper} className="qr-pulse">
                       <img src={qrCode} alt="WhatsApp QR" style={styles.qrImage} />
                       <div style={styles.qrOverlay} className={status === 'connecting' ? 'visible' : ''}>
                          <Loader2 className="animate-spin" color="#CCFF00" size={40} />
                       </div>
                    </div>
                  ) : (
                    <div style={{textAlign: 'center'}}>
                       <Loader2 className="animate-spin" size={48} color="#CCFF00" />
                       <p style={{marginTop: '20px', fontWeight: '700', color: '#0F172A', letterSpacing: '-0.5px'}}>Iniciando Motor Zaptro...</p>
                    </div>
                  )}
               </div>

               <div style={styles.statusFooter}>
                  <div style={styles.statusRow}>
                     <div style={{...styles.statusDot, backgroundColor: status === 'connected' ? '#10B981' : '#F59E0B'}} className="status-blink" />
                     <span style={{fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: status === 'connected' ? '#10B981' : '#F59E0B'}}>
                        {status === 'connected' ? 'SISTEMA ONLINE' : 'AGUARDANDO LEITURA...'}
                     </span>
                  </div>
                  {status !== 'connected' && (
                    <button style={styles.refreshBtn} onClick={() => checkStatus(instance.instance_id)}>
                       <RefreshCw size={14} /> Atualizar QR
                    </button>
                  )}
               </div>
            </div>
          )}

          <footer style={styles.footer}>
             <button style={styles.footerLink}><HelpCircle size={14} /> Suporte</button>
             <button style={{...styles.footerLink, color: '#EF4444'}} onClick={signOut}><LogOut size={14} /> Sair</button>
          </footer>
        </div>
      </div>
    </ZaptroLayout>
  );
};

const styles: Record<string, any> = {
  page: { width: '100vw', height: '100vh', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  onboardingCard: { 
    width: '100%', maxWidth: '520px', backgroundColor: 'white', borderRadius: '54px', 
    boxShadow: ZAPTRO_SHADOW.overlay, padding: '60px', position: 'relative'
  },
  header: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' },
  logoBox: { width: '44px', height: '44px', backgroundColor: '#0F172A', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: '26px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-1.8px' },
  
  content: { display: 'flex', flexDirection: 'column', gap: '24px' },
  heroBadge: { backgroundColor: '#CCFF0015', color: '#0F172A', fontSize: '10px', fontWeight: '700', padding: '6px 14px', borderRadius: '20px', width: 'fit-content', letterSpacing: '1px' },
  title: { fontSize: '32px', fontWeight: '700', color: '#0F172A', margin: 0, lineHeight: '1.1', letterSpacing: '-1.8px' },
  desc: { fontSize: '16px', color: '#64748B', lineHeight: '1.6', margin: 0, fontWeight: '500' },
  
  featureList: { display: 'flex', flexDirection: 'column', gap: '14px', margin: '8px 0' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: '600', color: '#0F172A' },
  
  primaryBtn: { 
    marginTop: '12px', backgroundColor: '#0F172A', color: 'white', border: 'none', 
    padding: '20px', borderRadius: '24px', fontSize: '16px', fontWeight: '700', 
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
    boxShadow: ZAPTRO_SHADOW.md
  },
  
  qrContainer: { 
    margin: '32px 0', backgroundColor: '#FBFBFC', borderRadius: '48px', border: '2px dashed #EBEBEC', 
    minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
  },
  qrWrapper: { 
    position: 'relative', padding: '24px', backgroundColor: 'white', borderRadius: '40px', 
    border: '1px solid #EBEBEC', boxShadow: ZAPTRO_SHADOW.lg 
  },
  qrImage: { width: '220px', height: '220px', display: 'block' },
  qrOverlay: { position: 'absolute', inset: 0, display: 'none', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '40px' },
  
  statusFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  statusDot: { width: '10px', height: '10px', borderRadius: '50%', boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)' },
  refreshBtn: { border: 'none', background: 'transparent', color: '#94A3B8', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  
  footer: { marginTop: '48px', borderTop: '1px solid #e8e8e8', paddingTop: '24px', display: 'flex', justifyContent: 'space-between' },
  footerLink: { border: 'none', background: 'transparent', color: '#94A3B8', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }
};

export default ZaptroOnboarding;
