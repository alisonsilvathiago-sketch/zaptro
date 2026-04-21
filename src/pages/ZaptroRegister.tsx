import React, { useState } from 'react';
import { 
  Building2, User, Mail, Lock, Phone, 
  MapPin, CheckCircle, ArrowRight, Eye, EyeOff,
  ArrowLeft, Loader2, Zap, Sparkles,
  Globe, ShieldCheck, Camera, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { mirrorCompanyRowForProfilesFk } from '../utils/zaptroCompaniesFkMirror';
import { formatZaptroDbErrorForToast, isMissingWhatsappCompaniesError } from '../utils/zaptroSchemaErrors';
import { ZAPTRO_HERO_SPLIT_PANEL_CLASS, zaptroHeroSplitPanelCss } from '../utils/zaptroMarketingHeroBackground';
import ZaptroHeroParticleCanvas from '../components/Zaptro/ZaptroHeroParticleCanvas';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { getZaptroPostLoginLandingUrl } from '../utils/domains';

export const ZapRay = ({ size = 24, color = "#D9FF00", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={color} />
  </svg>
);

const ZaptroRegister: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', password: '',
    company_name: '', phone: '', address: '', website: '',
    segment: 'Transporte & Logística', description: '',
    hours: 'Seg - Sex: 08:00 às 18:00', logo: null as any
  });

  const stepMessages = [
    "MAPEANDO PROTOCOLOS DE IDENTIDADE",
    "CRIPTOGRAFANDO ACESSO MASTER",
    "CONFIGURANDO INFRAESTRUTURA LOGÍSTICA",
    "GEOLOCALIZANDO HUB OPERACIONAL",
    "ESTRUTURANDO SEGMENTO DE MERCADO",
    "VINCULANDO BRANDING DA MARCA",
    "SINCRONIZANDO IDENTIDADE VISUAL",
    "ESTABELECENDO CONEXÃO FINAL"
  ];

  const steps = [
    { label: 'Como podemos te chamar?', fields: [{ key: 'first_name', placeholder: 'Primeiro nome', icon: <User size={18}/> }, { key: 'last_name', placeholder: 'Sobrenome', icon: <User size={18}/> }] },
    { label: 'E-mail e Segurança', fields: [{ key: 'email', placeholder: 'E-mail corporativo', icon: <Mail size={18}/> }, { key: 'password', placeholder: 'Senha de acesso', icon: <Lock size={18}/> }] },
    { label: 'Sua Transportadora', fields: [{ key: 'company_name', placeholder: 'Nome Fantasia', icon: <Building2 size={18}/> }, { key: 'phone', placeholder: 'WhatsApp Comercial', icon: <Phone size={18}/> }] },
    { label: 'Localização Sede', fields: [{ key: 'address', placeholder: 'Endereço Completo', icon: <MapPin size={18}/> }, { key: 'website', placeholder: 'Site Institucional', icon: <Globe size={18}/> }] },
    { label: 'Segmento Operacional', fields: [{ key: 'segment', type: 'select', options: ['Transporte & Logística', 'E-commerce', 'Indústria', 'Serviços'] }, { key: 'hours', placeholder: 'Horário de Operação', icon: <ShieldCheck size={18}/> }] },
    { label: 'Biografia da Marca', fields: [{ key: 'description', placeholder: 'Resumo da operação...', type: 'textarea' }] },
    { label: 'Sua Identidade', type: 'file' },
    { label: 'Conexão Final', type: 'qrcode' }
  ];

  const handleFinalActivation = async () => {
    setLoading(true);
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabaseZaptro.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.first_name} ${formData.last_name}`,
            role: 'ADMIN'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Falha ao criar credenciais de acesso.");

      // 2. Criar a empresa (Logística Hub) — id explícito: a coluna pode não ter DEFAULT no Postgres legado
      const companyId = crypto.randomUUID();
      const { data: companyData, error: companyError } = await supabaseZaptro
        .from('whatsapp_companies')
        .insert([{
          id: companyId,
          name: formData.company_name,
          phone: formData.phone,
          address: formData.address,
          website: formData.website,
          category: formData.segment,
          description: formData.description,
          opening_hours: formData.hours,
          status: 'pending_setup'
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      await mirrorCompanyRowForProfilesFk(supabaseZaptro, companyId, formData.company_name.trim());

      // 3. Garantir perfil com ADMIN + empresa (upsert: trigger pode ter criado linha sem role/company)
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      const { error: profileError } = await supabaseZaptro.from('profiles').upsert(
        {
          id: authData.user.id,
          email: formData.email,
          full_name: fullName || 'Administrador',
          role: 'ADMIN',
          company_id: companyData.id,
        },
        { onConflict: 'id' }
      );

      if (profileError) throw profileError;

      // 4. Sucesso!
      setCompleted(true);
      notifyZaptro('success', 'ATIVADO COM SUCESSO', 'Conectando ao núcleo master...');

      // If email confirmation is enabled, redirect to login.
      if (!authData.session) {
        notifyZaptro(
          'info',
          'Confirme seu e-mail',
          'Enviamos um link de confirmação. Abra a caixa de entrada e depois entre em /login para acessar o Zaptro.'
        );
        setTimeout(() => navigate('/login'), 4000);
        return;
      }

      setTimeout(() => window.location.assign(getZaptroPostLoginLandingUrl({ welcome: 'true' })), 2000);

    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err ?? '');
      let hint: string;
      if (raw.includes('already registered') || raw.includes('User already')) {
        hint = 'Este e-mail já tem cadastro. Vá em /login e entre com sua senha, ou use outro e-mail em /registrar.';
      } else if (isMissingWhatsappCompaniesError(err)) {
        hint = formatZaptroDbErrorForToast(err, raw);
      } else {
        hint = raw || 'Revise os dados da etapa anterior e tente novamente.';
      }
      notifyZaptro('error', 'Cadastro não concluído', hint);
      setStep(1); // Volta para e-mail/senha caso dê erro
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (loading) return;
    const stepDef = steps[step] as { fields?: { key: string; placeholder?: string }[]; type?: string };

    if (stepDef.fields) {
      for (const f of stepDef.fields) {
        const raw = (formData as Record<string, string>)[f.key];
        const str = typeof raw === 'string' ? raw.trim() : '';
        if (!str) {
          notifyZaptro(
            'warning',
            'Falta preencher um campo',
            `Complete “${f.placeholder || f.key}” nesta etapa e toque em Próximo de novo.`
          );
          return;
        }
        if (f.key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
          notifyZaptro('warning', 'E-mail inválido', 'Use um formato válido, por exemplo contato@suaempresa.com.br.');
          return;
        }
        if (f.key === 'password' && str.length < 6) {
          notifyZaptro('warning', 'Senha curta demais', 'Use pelo menos 6 caracteres. Depois você pode trocar em Configurações.');
          return;
        }
      }
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      void handleFinalActivation();
    }
  };

  return (
    <ZaptroLayout hideSidebar hideTopbar>
      <div style={{...styles.page, backgroundColor: 'transparent'}}>
        <div style={styles.leftSide} className={`hide-mobile ${ZAPTRO_HERO_SPLIT_PANEL_CLASS}`}>
           <ZaptroHeroParticleCanvas grid={30} />
           <div style={styles.logoTop}><ZapRay size={22} /><span style={{ color: '#0a0a0a', fontSize: '20px' }}>ZAPTRO</span></div>
           <div style={styles.phraseContainer}>
              <div style={styles.phraseTag}>IA ENGINE INTEGRATION</div>
              <div key={step} style={styles.dynamicPhrase}>{stepMessages[step]}</div>
              <div style={styles.progressBar}><div style={styles.progressFill} /></div>
           </div>
        </div>

        <div style={styles.rightSide} className="rightSide">
           <div style={styles.formContainer}>
              {completed ? (
                <div style={styles.successView}>
                   <div className="ray-pulse"><ZapRay size={160} color="#D9FF00" /></div>
                   <h2 style={styles.successTitle}>ZAPTRO CONNECT</h2>
                   <p style={styles.successText}>Malha operacional estabelecida. Bem-vindo ao comando.</p>
                </div>
              ) : (
                <div key={step}>
                   <h1 style={styles.cardTitle}>{steps[step].label}</h1>
                   <div style={styles.inputStack}>
                      {steps[step].type === 'file' ? (
                         <div style={styles.fileDrop}>
                            {logoPreview ? (<div style={styles.logoCircleWrapper}><img src={logoPreview} style={styles.logoPreviewCircle} alt="P" /><div style={styles.logoBadge}><Camera size={14} color="#000" /></div></div>) : (<div style={styles.fileIconBox}><Camera size={32} color="#000" /></div>)}
                            <input type="file" style={styles.hiddenFile} onChange={(e) => {
                               const f = e.target.files?.[0];
                               if(f){ setFormData({...formData, logo: f}); const r = new FileReader(); r.onloadend = () => setLogoPreview(r.result as string); r.readAsDataURL(f); }
                            }} />
                            <span style={styles.fileLabel}>{formData.logo ? 'LOGOTIPO VINCULADO' : 'CARREGAR LOGOTIPO DA TRANSPORTADORA'}</span>
                         </div>
                      ) : steps[step].type === 'qrcode' ? (
                         <div style={styles.qrArea}>
                            <div style={styles.qrShell}><div style={styles.qrInner}><div style={styles.qrScanLine} /></div></div>
                            <p style={styles.qrHelp}>
                              Ao finalizar, você entra como <strong>administrador</strong> desta conta. Vincule o WhatsApp comercial por
                              aqui (um número por vez). Se depois trocar de chip, desconecte em Configurações e escaneie outro QR — a
                              assinatura segue no mesmo login.
                            </p>
                         </div>
                      ) : (steps[step].fields?.map((f: any) => (
                         <div key={f.key} style={styles.inputWrapper}>
                            {f.type === 'select' ? (<select style={styles.select} value={(formData as any)[f.key]} onChange={e => setFormData({...formData, [f.key]: e.target.value})}>{f.options.map((o: string) => <option key={o}>{o}</option>)}</select>) : 
                             f.type === 'textarea' ? (<textarea placeholder={f.placeholder} style={styles.textarea} value={(formData as any)[f.key]} onChange={e => setFormData({...formData, [f.key]: e.target.value})} />) : (
                               <div style={styles.fieldGroup}>
                                  <div style={styles.fieldIcon}>{f.icon}</div>
                                  <input type={f.key === 'password' && !showPassword ? 'password' : 'text'} placeholder={f.placeholder} style={styles.input} value={(formData as any)[f.key]} onChange={e => setFormData({...formData, [f.key]: e.target.value})} />
                                  {f.key === 'password' && <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>{showPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}</button>}
                               </div>
                             )}
                         </div>
                      )))}
                   </div>
                   <div style={styles.footerActions}>
                      <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={step === 0 || loading} style={{...styles.backBtn, opacity: step === 0 || loading ? 0.3 : 1}}><ArrowLeft size={16} /> VOLTAR</button>
                      <button onClick={handleNext} style={styles.nextBtn}>{loading ? <Loader2 size={24} className="spin" /> : (step === steps.length - 1 ? 'ATIVAR ZAPTRO' : 'PRÓXIMO')}{!loading && <ArrowRight size={20} />}</button>
                   </div>
                </div>
              )}
           </div>
        </div>
        <style>{`
          ${zaptroHeroSplitPanelCss()}
          @keyframes moveProgress { 0% { width: 0; } 100% { width: 100%; } }
          @keyframes qrScanLine { from { top: 0; } to { top: 180px; } }
          .spin { animation: rotate 1s linear infinite; }
          @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .ray-pulse { animation: pulse 2s infinite; }
          @keyframes pulse { 0% { filter: drop-shadow(0 0 0px #D9FF00); } 50% { filter: drop-shadow(0 0 30px #D9FF00); } 100% { filter: drop-shadow(0 0 0px #D9FF00); } }
          @media (max-width: 1024px) { .hide-mobile { display: none !important; } .rightSide { border-radius: 0 !important; } }
        `}</style>
      </div>
    </ZaptroLayout>
  );
};

const styles: Record<string, any> = {
  page: { width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', backgroundColor: '#000', fontFamily: 'Inter, sans-serif' },
  leftSide: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoTop: { position: 'absolute', top: '40px', left: '50px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '950', zIndex: 2 },
  phraseContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px', width: '90%', zIndex: 2 },
  phraseTag: { fontSize: '9px', fontWeight: '950', color: 'rgba(10,10,10,0.45)', letterSpacing: '4px' },
  dynamicPhrase: { fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: '950', color: '#0a0a0a', letterSpacing: '-2px', lineHeight: 0.9, textTransform: 'uppercase', maxWidth: '450px' },
  progressBar: { width: '100px', height: '3px', backgroundColor: 'rgba(217,255,0,0.1)', borderRadius: '2px', overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', backgroundColor: '#D9FF00', animation: 'moveProgress 2s linear infinite' },
  rightSide: { flex: 1, backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '120px 0 0 120px' },
  formContainer: { width: '90%', maxWidth: '380px', zIndex: 10 },
  cardTitle: { fontSize: '30px', fontWeight: '950', color: '#000', margin: '0 0 32px 0', letterSpacing: '-1px', textAlign: 'center', textTransform: 'uppercase' },
  inputStack: { display: 'flex', flexDirection: 'column', gap: '14px' },
  fieldGroup: { display: 'flex', alignItems: 'center', border: '1px solid #d4d4d8', borderRadius: '16px', backgroundColor: '#FFFFFF', position: 'relative' },
  fieldIcon: { paddingLeft: '18px', display: 'flex', alignItems: 'center', color: '#000' },
  input: { flex: 1, padding: '18px', background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', fontWeight: '700', color: '#000' },
  eyeBtn: { position: 'absolute', right: '15px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  textarea: { width: '100%', padding: '18px', backgroundColor: '#FFFFFF', border: '1px solid #d4d4d8', borderRadius: '16px', outline: 'none', fontSize: '15px', fontWeight: '700', minHeight: '100px', resize: 'none' },
  select: { width: '100%', padding: '18px', backgroundColor: '#FFFFFF', border: '1px solid #d4d4d8', borderRadius: '16px', outline: 'none', fontSize: '15px', fontWeight: '700', appearance: 'none' },
  footerActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '40px' },
  backBtn: { background: 'none', border: 'none', color: '#000', fontSize: '12px', fontWeight: '950', cursor: 'pointer' },
  nextBtn: { padding: '18px 45px', backgroundColor: '#000', color: '#D9FF00', borderRadius: '18px', fontSize: '15px', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' },
  fileDrop: { border: '2px dashed #000', borderRadius: '25px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', position: 'relative' },
  hiddenFile: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
  fileLabel: { fontSize: '12px', fontWeight: '950', color: '#000', textAlign: 'center' },
  qrArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' },
  qrShell: { padding: '15px', backgroundColor: '#f8f8f8', borderRadius: '25px', border: '1px solid #d4d4d8' },
  qrInner: { width: '180px', height: '180px', background: 'url(https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ZAPTRO-FLOW-DEMO) center/contain no-repeat', position: 'relative', overflow: 'hidden' },
  qrScanLine: { position: 'absolute', width: '100%', height: '2.5px', backgroundColor: '#D9FF00', animation: 'qrScanLine 2s linear infinite' },
  qrHelp: { fontSize: '13px', color: '#64748B', fontWeight: '600' },
  successView: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  successTitle: { fontSize: '38px', fontWeight: '950', color: '#000', margin: '20px 0 10px 0' },
  successText: { fontSize: '15px', color: '#64748B', fontWeight: '600' },
  logoCircleWrapper: { position: 'relative' },
  logoPreviewCircle: { width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e4e4e7' },
  fileIconBox: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};

export default ZaptroRegister;
