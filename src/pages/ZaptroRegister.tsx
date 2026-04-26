import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Globe,
  ShieldCheck,
  Camera,
  Clock,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { mirrorCompanyRowForProfilesFk } from '../utils/zaptroCompaniesFkMirror';
import { formatZaptroDbErrorForToast, isMissingWhatsappCompaniesError } from '../utils/zaptroSchemaErrors';
import { ZAPTRO_HERO_SPLIT_PANEL_CLASS, zaptroHeroSplitPanelCss } from '../utils/zaptroMarketingHeroBackground';
import ZaptroHeroParticleCanvas from '../components/Zaptro/ZaptroHeroParticleCanvas';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import { ZaptroWhatsappQrConnectPanel } from '../components/Zaptro/ZaptroWhatsappQrConnectPanel';
import { getZaptroPostLoginLandingUrl } from '../utils/domains';
import { fireTransactionalEmailNonBlocking } from '../lib/fireTransactionalEmail';

const DRAFT_STORAGE_KEY = 'zaptro_onboarding_draft_v1';
const TOTAL_STEPS = 7;

const SEGMENT_OPTIONS = ['Transporte', 'Logística', 'E-commerce', 'Indústria', 'Serviços'] as const;

type SegmentOption = (typeof SEGMENT_OPTIONS)[number];

type FormDataState = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  company_name: string;
  trade_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  cep: string;
  website: string;
  segment: SegmentOption;
  hours_days: string;
  hours_start: string;
  hours_end: string;
  description: string;
  logo: File | null;
};

function readStoredDraft(): { step: number; formData: Partial<FormDataState> } | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { step?: number; formData?: Partial<FormDataState> };
    const s = typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step < TOTAL_STEPS ? parsed.step : 0;
    const fd = parsed.formData && typeof parsed.formData === 'object' ? parsed.formData : {};
    return { step: s, formData: fd };
  } catch {
    return null;
  }
}

const defaultFormData = (): FormDataState => ({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  company_name: '',
  trade_name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  cep: '',
  website: '',
  segment: 'Transporte',
  hours_days: 'Segunda a sexta',
  hours_start: '08:00',
  hours_end: '18:00',
  description: '',
  logo: null,
});

export const ZapRay = ({ size = 24, color = 'rgba(217, 255, 0, 1)', style = {} }: { size?: number; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={color} />
  </svg>
);

const ZaptroRegister: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(() => readStoredDraft()?.step ?? 0);
  const [loading, setLoading] = useState(false);
  /** Após `signUp` com sessão: id da empresa para o mesmo fluxo de QR que em Configurações. */
  const [postRegCompanyId, setPostRegCompanyId] = useState<string | null>(null);
  const registrationLockRef = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataState>(() => {
    const d = readStoredDraft();
    return { ...defaultFormData(), ...(d?.formData ?? {}), logo: null };
  });

  const stepMeta = useMemo(
    () => [
      {
        title: 'Crie sua conta',
        leftLine: 'Comece sua jornada com o essencial.',
        kind: 'account' as const,
      },
      {
        title: 'Sobre sua empresa',
        leftLine: 'Conhecer sua operação é o primeiro passo.',
        kind: 'company' as const,
      },
      {
        title: 'Localização da sede',
        leftLine: 'Sua base é o centro da sua malha.',
        kind: 'location' as const,
      },
      {
        title: 'Qual o seu segmento?',
        leftLine: 'Zaptro feito sob medida para você.',
        kind: 'segment' as const,
      },
      {
        title: 'Horário de funcionamento',
        leftLine: 'Disponibilidade total para seus clientes.',
        kind: 'hours' as const,
      },
      {
        title: 'Sobre sua marca',
        leftLine: 'Identidade que gera autoridade.',
        kind: 'brand' as const,
      },
      {
        title: 'Conecte seu WhatsApp',
        leftLine: 'Falta pouco para automatizar tudo.',
        kind: 'connect' as const,
      },
    ],
    []
  );

  const progressPct = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        const { logo: _omit, ...rest } = formData;
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            step,
            formData: rest,
          })
        );
      } catch {
        /* quota / private mode */
      }
    }, 450);
    return () => window.clearTimeout(handle);
  }, [formData, step]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const validateStep = useCallback(
    (s: number): boolean => {
      const fd = formData;
      switch (s) {
        case 0: {
          if (!fd.first_name.trim() || !fd.last_name.trim()) {
            notifyZaptro('warning', 'Campos obrigatórios', 'Preencha nome e sobrenome para continuar.');
            return false;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email.trim())) {
            notifyZaptro('warning', 'E-mail inválido', 'Use um formato válido, por exemplo contato@suaempresa.com.br.');
            return false;
          }
          if (fd.password.length < 6) {
            notifyZaptro('warning', 'Senha curta demais', 'Use pelo menos 6 caracteres.');
            return false;
          }
          return true;
        }
        case 1: {
          if (!fd.company_name.trim()) {
            notifyZaptro('warning', 'Nome da transportadora', 'Informe o nome da sua empresa.');
            return false;
          }
          if (!fd.phone.trim()) {
            notifyZaptro('warning', 'WhatsApp', 'Informe um WhatsApp comercial com DDD.');
            return false;
          }
          return true;
        }
        case 2: {
          if (!fd.address.trim() || !fd.city.trim() || !fd.state.trim() || !fd.cep.trim()) {
            notifyZaptro('warning', 'Endereço incompleto', 'Preencha endereço, cidade, estado e CEP.');
            return false;
          }
          return true;
        }
        case 3:
          return true;
        case 4: {
          if (!fd.hours_days.trim() || !fd.hours_start.trim() || !fd.hours_end.trim()) {
            notifyZaptro('warning', 'Horário', 'Informe dias e horários de funcionamento.');
            return false;
          }
          return true;
        }
        case 5: {
          if (fd.description.trim().length < 12) {
            notifyZaptro('warning', 'Sobre sua marca', 'Escreva uma breve descrição (mínimo 12 caracteres).');
            return false;
          }
          return true;
        }
        case 6:
          return true;
        default:
          return true;
      }
    },
    [formData]
  );

  const composedAddress = useMemo(() => {
    const lines = [formData.address.trim(), `${formData.city.trim()} / ${formData.state.trim()}`.trim(), `CEP ${formData.cep.trim()}`];
    return lines.filter(Boolean).join('\n');
  }, [formData.address, formData.city, formData.state, formData.cep]);

  const composedOpeningHours = useMemo(
    () => `${formData.hours_days.trim()}: ${formData.hours_start.trim()} às ${formData.hours_end.trim()}`,
    [formData.hours_days, formData.hours_start, formData.hours_end]
  );

  const handleWaConnected = useCallback(() => {
    notifyZaptro('success', 'WhatsApp ligado', 'A abrir o painel…');
    window.setTimeout(() => {
      window.location.assign(getZaptroPostLoginLandingUrl({ welcome: 'true' }));
    }, 2400);
  }, []);

  const handleFinalActivation = useCallback(async () => {
    if (registrationLockRef.current) return;
    registrationLockRef.current = true;
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabaseZaptro.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.first_name} ${formData.last_name}`.trim(),
            role: 'ADMIN',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar credenciais de acesso.');

      const companyId = crypto.randomUUID();
      const displayName = formData.company_name.trim();
      const trade = formData.trade_name.trim() || displayName;

      const { data: companyData, error: companyError } = await supabaseZaptro
        .from('whatsapp_companies')
        .insert([
          {
            id: companyId,
            name: displayName,
            menu_name: trade,
            phone: formData.phone.trim(),
            address: composedAddress,
            website: formData.website.trim() || null,
            category: formData.segment,
            description: formData.description.trim(),
            opening_hours: composedOpeningHours,
            status: 'pending_setup',
          },
        ])
        .select()
        .single();

      if (companyError) throw companyError;

      await mirrorCompanyRowForProfilesFk(supabaseZaptro, companyId, displayName);

      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      const { error: profileError } = await supabaseZaptro.from('profiles').upsert(
        {
          id: authData.user.id,
          email: formData.email.trim(),
          full_name: fullName || 'Administrador',
          role: 'ADMIN',
          company_id: companyData.id,
        },
        { onConflict: 'id' }
      );

      if (profileError) throw profileError;

      clearDraft();
      notifyZaptro('success', 'Conta criada', 'A gerar o código do WhatsApp…');

      if (authData.session) {
        const landing = getZaptroPostLoginLandingUrl({ welcome: 'true' });
        fireTransactionalEmailNonBlocking(supabaseZaptro, {
          kind: 'welcome',
          to: formData.email.trim().toLowerCase(),
          companyId: companyData.id,
          variables: {
            userName: fullName || 'Administrador',
            ctaUrl: landing,
            ctaLabel: 'Abrir painel Zaptro',
          },
        });
        fireTransactionalEmailNonBlocking(supabaseZaptro, {
          kind: 'account_confirmation',
          to: formData.email.trim().toLowerCase(),
          companyId: companyData.id,
          variables: {
            userName: fullName || 'Administrador',
            ctaUrl: landing,
            ctaLabel: 'Confirmar e continuar',
          },
        });
        setPostRegCompanyId(companyData.id);
        return;
      }

      if (!authData.session) {
        notifyZaptro(
          'info',
          'Confirme seu e-mail',
          'Enviamos um link de confirmação. Depois entre em /login para acessar o Zaptro.'
        );
        setTimeout(() => navigate('/login'), 4000);
        return;
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err ?? '');
      let hint: string;
      if (raw.includes('already registered') || raw.includes('User already')) {
        hint = 'Este e-mail já tem cadastro. Use /login ou outro e-mail.';
      } else if (isMissingWhatsappCompaniesError(err)) {
        hint = formatZaptroDbErrorForToast(err, raw);
      } else {
        hint = raw || 'Revise os dados e tente novamente.';
      }
      notifyZaptro('error', 'Cadastro não concluído', hint);
      setStep(0);
      registrationLockRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [
    clearDraft,
    composedAddress,
    composedOpeningHours,
    formData.company_name,
    formData.description,
    formData.email,
    formData.first_name,
    formData.last_name,
    formData.password,
    formData.phone,
    formData.segment,
    formData.trade_name,
    formData.website,
    navigate,
  ]);

  const handleNext = () => {
    if (loading) return;
    if (postRegCompanyId) return;
    if (!validateStep(step)) return;
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      void handleFinalActivation();
    }
  };

  const goToDashboardSkipWa = useCallback(() => {
    window.location.assign(getZaptroPostLoginLandingUrl({ welcome: 'true' }));
  }, []);

  const greeting =
    formData.first_name.trim().length > 0
      ? `Vamos configurar sua empresa, ${formData.first_name.trim().split(/\s+/)[0]}.`
      : 'Vamos configurar sua empresa com calma.';

  const meta = stepMeta[step];

  const renderFields = () => {
    switch (meta.kind) {
      case 'account':
        return (
          <>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><User size={18} /></div>
              <input
                type="text"
                placeholder="Nome"
                style={styles.input}
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><User size={18} /></div>
              <input
                type="text"
                placeholder="Sobrenome"
                style={styles.input}
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><Mail size={18} /></div>
              <input
                type="email"
                placeholder="E-mail"
                style={styles.input}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><Lock size={18} /></div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                style={styles.input}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </>
        );
      case 'company':
        return (
          <>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><Building2 size={18} /></div>
              <input
                type="text"
                placeholder="Nome da transportadora"
                style={styles.input}
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><Building2 size={18} /></div>
              <input
                type="text"
                placeholder="Nome fantasia (opcional)"
                style={styles.input}
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
              />
            </div>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><Phone size={18} /></div>
              <input
                type="tel"
                placeholder="WhatsApp comercial (com DDD)"
                style={styles.input}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </>
        );
      case 'location':
        return (
          <>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><MapPin size={18} /></div>
              <input
                type="text"
                placeholder="Endereço completo"
                style={styles.input}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div style={styles.twoCol}>
              <div style={styles.inputWrapper}>
                <div style={styles.fieldIcon}><MapPin size={18} /></div>
                <input
                  type="text"
                  placeholder="Cidade"
                  style={styles.input}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div style={styles.inputWrapper}>
                <div style={styles.fieldIcon}><MapPin size={18} /></div>
                <input
                  type="text"
                  placeholder="UF"
                  style={styles.input}
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><ShieldCheck size={18} /></div>
              <input
                type="text"
                placeholder="CEP"
                style={styles.input}
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
              />
            </div>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><Globe size={18} /></div>
              <input
                type="url"
                placeholder="Site institucional (opcional)"
                style={styles.input}
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </>
        );
      case 'segment':
        return (
          <div style={styles.segmentGrid}>
            {SEGMENT_OPTIONS.map((opt) => {
              const active = formData.segment === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFormData({ ...formData, segment: opt })}
                  style={{
                    ...styles.segmentCard,
                    borderColor: active ? 'rgba(217, 255, 0, 1)' : '#e4e4e7',
                    backgroundColor: active ? 'rgba(217, 255, 0, 0.14)' : '#fff',
                    boxShadow: active ? '0 0 0 1px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#0a0a0a' }}>{opt}</span>
                  {active ? (
                    <span style={styles.segmentCheck}>
                      <Check size={14} color="#000" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        );
      case 'hours':
        return (
          <>
            <div style={styles.inputWrapper}>
              <div style={styles.fieldIcon}><Clock size={18} /></div>
              <input
                type="text"
                placeholder="Dias (ex.: Segunda a sexta)"
                style={styles.input}
                value={formData.hours_days}
                onChange={(e) => setFormData({ ...formData, hours_days: e.target.value })}
              />
            </div>
            <div style={styles.twoCol}>
              <div style={styles.inputWrapper}>
                <div style={styles.fieldIcon}><Clock size={18} /></div>
                <input
                  type="time"
                  style={styles.input}
                  value={formData.hours_start}
                  onChange={(e) => setFormData({ ...formData, hours_start: e.target.value })}
                />
              </div>
              <div style={styles.inputWrapper}>
                <div style={styles.fieldIcon}><Clock size={18} /></div>
                <input
                  type="time"
                  style={styles.input}
                  value={formData.hours_end}
                  onChange={(e) => setFormData({ ...formData, hours_end: e.target.value })}
                />
              </div>
            </div>
            <p style={styles.hintMuted}>Início e término do expediente comercial.</p>
          </>
        );
      case 'brand':
        return (
          <>
            <textarea
              placeholder="Biografia ou descrição da empresa"
              style={styles.textarea}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div style={styles.fileDrop}>
              {logoPreview ? (
                <div style={styles.logoCircleWrapper}>
                  <img src={logoPreview} style={styles.logoPreviewCircle} alt="" />
                  <div style={styles.logoBadge}>
                    <Camera size={14} color="#000" />
                  </div>
                </div>
              ) : (
                <div style={styles.fileIconBox}>
                  <Camera size={32} color="#000" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                style={styles.hiddenFile}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFormData({ ...formData, logo: f });
                    const r = new FileReader();
                    r.onloadend = () => setLogoPreview(r.result as string);
                    r.readAsDataURL(f);
                  }
                }}
              />
              <span style={styles.fileLabel}>{formData.logo ? 'Logo selecionado' : 'Adicionar logo ou foto'}</span>
            </div>
          </>
        );
      case 'connect':
        return (
          <div style={styles.qrArea}>
            <p style={styles.connectLead}>
              Use o mesmo fluxo da página de Configuração: o código é gerado no servidor e aparece abaixo. Depois de
              escanear, confirmamos a ligação e abrimos o painel automaticamente.
            </p>
            <ZaptroWhatsappQrConnectPanel
              key={postRegCompanyId ?? 'awaiting-account'}
              companyId={postRegCompanyId}
              autoStartWhenReady={!!postRegCompanyId}
              compact
              onConnected={handleWaConnected}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="zaptro-register-root" style={styles.page}>
      <div className="zaptro-register-card" style={styles.registerCard}>
        {/* Left Side: Premium Mesh Hero */}
        <div className={`zaptro-register-hero hide-mobile ${ZAPTRO_HERO_SPLIT_PANEL_CLASS}`} style={styles.cardLeft}>
          <div className="zaptro-register-mesh" style={styles.meshContainer} aria-hidden>
            <div style={{ ...styles.meshBlob, top: '-8%', right: '-22%', backgroundColor: '#D9FF00', width: '92%', height: '88%', opacity: 0.55, filter: 'blur(120px)' }} />
            <div style={{ ...styles.meshBlob, bottom: '-25%', right: '-18%', backgroundColor: '#FFFFFF', width: '58%', height: '55%', opacity: 0.42, filter: 'blur(100px)' }} />
            <div style={{ ...styles.meshBlob, top: '-15%', left: '-20%', backgroundColor: '#000000', width: '75%', height: '70%', opacity: 0.5, filter: 'blur(80px)' }} />
          </div>
          
          <div style={styles.cardLeftContent}>
            <div style={styles.cardLogo}>
              <ZapRay size={32} color="#D9FF00" />
              <span style={{ fontSize: 28, fontWeight: 700, color: '#FFF', letterSpacing: '-1.5px' }}>ZAPTRO</span>
            </div>

            <div style={styles.phraseContainer}>
               <p style={styles.phraseTag}>Onboarding Premium</p>
               <h2 key={step} style={styles.dynamicPhrase}>
                 {meta.leftLine}
               </h2>
               <div style={styles.progressContainer}>
                 <div style={styles.stepInfo}>
                   Etapa {step + 1} de {TOTAL_STEPS}
                 </div>
                 <div style={styles.progressTrack}>
                   <div style={{ ...styles.progressFillStatic, width: `${progressPct}%` }} />
                 </div>
               </div>
            </div>
            <div /> {/* Spacer */}
          </div>
        </div>

        {/* Right Side: Step Form */}
        <div className="zaptro-register-form-col" style={styles.cardRight}>
          <div style={styles.formWrapper}>
            <div style={styles.mobileHeader} className="show-mobile-only">
               <ZapRay size={24} color="#000" />
               <div style={styles.mobileProgress}>
                 <span style={styles.stepPillMobile}>Etapa {step + 1} / {TOTAL_STEPS}</span>
                 <div style={styles.progressTrackMobile}>
                   <div style={{ ...styles.progressFillStatic, width: `${progressPct}%` }} />
                 </div>
               </div>
            </div>

            <div style={styles.stepHeader}>
               {step >= 1 ? <p style={styles.greeting}>{greeting}</p> : null}
               <h1 style={styles.cardTitle}>{meta.title}</h1>
               <p style={styles.stepDesc}>Preencha as informações abaixo para configurar sua experiência premium.</p>
            </div>

            <div style={styles.formContainer}>
               <div style={styles.inputStack}>
                 {renderFields()}
               </div>

               {step === TOTAL_STEPS - 1 && postRegCompanyId ? (
                 <div style={styles.skipWaWrap}>
                   <button type="button" onClick={goToDashboardSkipWa} style={styles.skipWaBtn}>
                     Ir para o painel e conectar depois
                   </button>
                 </div>
               ) : (
                 <div style={styles.footerActions}>
                   <button
                     type="button"
                     onClick={() => setStep((s) => Math.max(0, s - 1))}
                     disabled={step === 0 || loading || !!postRegCompanyId}
                     style={{
                       ...styles.backBtn,
                       opacity: step === 0 || loading || !!postRegCompanyId ? 0 : 1,
                       pointerEvents: step === 0 || loading || !!postRegCompanyId ? 'none' : 'auto',
                     }}
                   >
                     <ArrowLeft size={16} /> Voltar
                   </button>
                   <button type="button" onClick={handleNext} style={styles.nextBtn} disabled={loading || !!postRegCompanyId}>
                     {loading ? (
                       <Loader2 size={20} className="spin" />
                     ) : step === TOTAL_STEPS - 1 ? (
                       'Finalizar Cadastro'
                     ) : (
                       'Continuar'
                     )}
                     {!loading && !postRegCompanyId && <ArrowRight size={18} />}
                   </button>
                 </div>
               )}
               <p style={styles.autosaveNote}>Seu progresso é salvo automaticamente.</p>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        ${zaptroHeroSplitPanelCss()}
        @media (max-width: 1024px) {
          .hide-mobile { display: none !important; }
          .show-mobile-only { display: flex !important; }
          .zaptro-register-card { flex-direction: column !important; }
          .zaptro-register-form-col { width: 100% !important; padding: 40px 24px !important; }
        }
        @media (min-width: 1025px) {
          .show-mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};

function FieldRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={styles.fieldGroup}>
      <div style={styles.fieldIcon}>{icon}</div>
      {children}
    </div>
  );
}

const styles: Record<string, any> = {
  page: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  registerCard: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#FFF',
    overflow: 'hidden',
    position: 'relative',
  },
  cardLeft: {
    flex: '1 1 45%',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: '60px',
    backgroundColor: '#000',
  },
  meshContainer: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#000',
    isolation: 'isolate' as const,
    backgroundImage: [
      'radial-gradient(ellipse 78% 65% at 94% 94%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.12) 22%, transparent 46%)',
      'radial-gradient(ellipse 105% 92% at 74% 36%, rgba(217, 255, 0, 0.62) 0%, rgba(0, 0, 0, 0.22) 34%, rgba(0, 0, 0, 0.06) 52%, transparent 68%)',
      'radial-gradient(ellipse 90% 75% at 6% 10%, #000 0%, rgba(0, 0, 0, 0.55) 42%, transparent 68%)',
      'radial-gradient(ellipse 80% 70% at 0% 100%, #000 0%, transparent 55%)',
    ].join(', '),
    overflow: 'hidden',
    zIndex: 0,
  },
  meshBlob: { position: 'absolute', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 },
  cardLeftContent: { position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  cardLogo: { display: 'flex', alignItems: 'center', gap: '12px' },
  phraseContainer: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' },
  phraseTag: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' },
  dynamicPhrase: {
    color: '#FFF',
    fontSize: 'clamp(32px, 3.5vw, 44px)',
    fontWeight: 700,
    lineHeight: 1.1,
    margin: 0,
    letterSpacing: '-1.5px',
    textShadow: '0 2px 28px rgba(0,0,0,0.85)',
  },
  progressContainer: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' },
  stepInfo: { fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)' },
  progressTrack: { width: '100%', maxWidth: 300, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, overflow: 'hidden' },
  progressFillStatic: { height: '100%', backgroundColor: '#D9FF00', borderRadius: 999, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' },
  cardRight: {
    flex: '1 1 55%',
    backgroundColor: '#FFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 60px',
    overflowY: 'auto',
  },
  formWrapper: { width: '100%', maxWidth: '420px' },
  mobileHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  mobileProgress: { display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  stepPillMobile: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' },
  progressTrackMobile: { width: 80, height: 4, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' },
  stepHeader: { marginBottom: 32 },
  greeting: { fontSize: 13, fontWeight: 700, color: '#64748b', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.02em' },
  cardTitle: { fontSize: 28, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-1px' },
  stepDesc: { fontSize: 14, color: '#64748b', fontWeight: 600, lineHeight: 1.5 },
  formContainer: { display: 'flex', flexDirection: 'column', gap: '24px' },
  inputStack: { display: 'flex', flexDirection: 'column', gap: '16px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  fieldIcon: { position: 'absolute', left: '16px', color: '#94a3b8', display: 'flex', alignItems: 'center' },
  input: {
    width: '100%',
    padding: '14px 16px 14px 44px',
    borderRadius: '14px',
    border: '1.5px solid #E2E8F0',
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: '#FFF',
  },
  textarea: {
    width: '100%',
    padding: '16px',
    borderRadius: '14px',
    border: '1.5px solid #E2E8F0',
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
    outline: 'none',
    minHeight: 120,
    resize: 'vertical',
    fontFamily: 'inherit',
    backgroundColor: '#FFF',
  },
  eyeBtn: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  footerActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', gap: 16 },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'color 0.2s ease',
  },
  nextBtn: {
    flex: 1,
    padding: '16px 24px',
    backgroundColor: '#0f172a',
    color: '#D9FF00',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'transform 0.1s ease',
  },
  segmentGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  segmentCard: {
    position: 'relative',
    borderRadius: 14,
    border: '1.5px solid #E2E8F0',
    padding: '20px 16px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    backgroundColor: '#FFF',
  },
  segmentCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#D9FF00',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  fileDrop: {
    border: '2px dashed #E2E8F0',
    borderRadius: '14px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    position: 'relative',
    backgroundColor: '#f8fafc',
    transition: 'border-color 0.2s ease',
  },
  hiddenFile: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
  fileLabel: { fontSize: '13px', fontWeight: 700, color: '#0f172a' },
  fileIconBox: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' },
  logoPreviewCircle: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFF', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  logoBadge: { position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 999, backgroundColor: '#D9FF00', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFF' },
  qrArea: { display: 'flex', flexDirection: 'column', gap: '20px' },
  connectLead: { fontSize: 13, color: '#64748b', fontWeight: 600, lineHeight: 1.6, textAlign: 'center', margin: 0 },
  autosaveNote: { marginTop: 8, fontSize: 11, color: '#94a3b8', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  hintMuted: { margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 600 },
  skipWaWrap: { display: 'flex', justifyContent: 'center' },
  skipWaBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#64748b', textDecoration: 'underline', padding: '8px' },
};

export default ZaptroRegister;
