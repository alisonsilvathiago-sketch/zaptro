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
        leftLine: 'Vamos começar com o essencial.',
        kind: 'account' as const,
      },
      {
        title: 'Sobre sua empresa',
        leftLine: 'Queremos conhecer sua operação.',
        kind: 'company' as const,
      },
      {
        title: 'Localização da sede',
        leftLine: 'Onde fica a base da sua malha?',
        kind: 'location' as const,
      },
      {
        title: 'Qual o seu segmento?',
        leftLine: 'Personalize o Zaptro para o seu mercado.',
        kind: 'segment' as const,
      },
      {
        title: 'Horário de funcionamento',
        leftLine: 'Seus clientes saberão quando encontrar você.',
        kind: 'hours' as const,
      },
      {
        title: 'Sobre sua marca',
        leftLine: 'Uma boa história gera confiança.',
        kind: 'brand' as const,
      },
      {
        title: 'Conecte seu WhatsApp',
        leftLine: 'Falta pouco: conecte o canal oficial.',
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
            <FieldRow icon={<User size={18} />}>
              <input
                type="text"
                placeholder="Nome"
                style={styles.input}
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </FieldRow>
            <FieldRow icon={<User size={18} />}>
              <input
                type="text"
                placeholder="Sobrenome"
                style={styles.input}
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </FieldRow>
            <FieldRow icon={<Mail size={18} />}>
              <input
                type="email"
                placeholder="E-mail"
                style={styles.input}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FieldRow>
            <FieldRow icon={<Lock size={18} />}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                style={styles.input}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
              </button>
            </FieldRow>
          </>
        );
      case 'company':
        return (
          <>
            <FieldRow icon={<Building2 size={18} />}>
              <input
                type="text"
                placeholder="Nome da transportadora"
                style={styles.input}
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </FieldRow>
            <FieldRow icon={<Building2 size={18} />}>
              <input
                type="text"
                placeholder="Nome fantasia (opcional)"
                style={styles.input}
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
              />
            </FieldRow>
            <FieldRow icon={<Phone size={18} />}>
              <input
                type="tel"
                placeholder="WhatsApp comercial (com DDD)"
                style={styles.input}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FieldRow>
          </>
        );
      case 'location':
        return (
          <>
            <FieldRow icon={<MapPin size={18} />}>
              <input
                type="text"
                placeholder="Endereço completo"
                style={styles.input}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </FieldRow>
            <div style={styles.twoCol}>
              <FieldRow icon={<MapPin size={18} />}>
                <input
                  type="text"
                  placeholder="Cidade"
                  style={styles.input}
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </FieldRow>
              <FieldRow icon={<MapPin size={18} />}>
                <input
                  type="text"
                  placeholder="UF"
                  style={styles.input}
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                />
              </FieldRow>
            </div>
            <FieldRow icon={<ShieldCheck size={18} />}>
              <input
                type="text"
                placeholder="CEP"
                style={styles.input}
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
              />
            </FieldRow>
            <FieldRow icon={<Globe size={18} />}>
              <input
                type="url"
                placeholder="Site institucional (opcional)"
                style={styles.input}
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </FieldRow>
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
            <FieldRow icon={<Clock size={18} />}>
              <input
                type="text"
                placeholder="Dias (ex.: Segunda a sexta)"
                style={styles.input}
                value={formData.hours_days}
                onChange={(e) => setFormData({ ...formData, hours_days: e.target.value })}
              />
            </FieldRow>
            <div style={styles.twoCol}>
              <FieldRow icon={<Clock size={18} />}>
                <input
                  type="time"
                  style={styles.input}
                  value={formData.hours_start}
                  onChange={(e) => setFormData({ ...formData, hours_start: e.target.value })}
                />
              </FieldRow>
              <FieldRow icon={<Clock size={18} />}>
                <input
                  type="time"
                  style={styles.input}
                  value={formData.hours_end}
                  onChange={(e) => setFormData({ ...formData, hours_end: e.target.value })}
                />
              </FieldRow>
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
    <ZaptroLayout hideSidebar hideTopbar>
      <div style={{ ...styles.page, backgroundColor: 'transparent' }}>
        <div style={styles.leftSide} className={`hide-mobile ${ZAPTRO_HERO_SPLIT_PANEL_CLASS}`}>
          <ZaptroHeroParticleCanvas grid={30} />
          <div style={styles.logoTop}>
            <ZapRay size={22} />
            <span style={{ color: '#0a0a0a', fontSize: '20px', fontWeight: 700 }}>ZAPTRO</span>
          </div>
          <div style={styles.phraseContainer}>
            <div style={styles.phraseTag}>Onboarding guiado</div>
            <div key={step} style={styles.dynamicPhrase}>
              {meta.leftLine}
            </div>
            <div style={styles.stepPill}>
              Etapa {step + 1} de {TOTAL_STEPS}
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFillStatic, width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div style={styles.rightSide} className="rightSide">
          <div style={styles.formCard}>
            <div style={styles.formContainer}>
              <div key={step}>
                  <div style={styles.mobileProgress} className="show-mobile-only">
                    <span style={styles.stepPillMobile}>
                      Etapa {step + 1} / {TOTAL_STEPS}
                    </span>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFillStatic, width: `${progressPct}%` }} />
                    </div>
                  </div>
                  {step >= 1 ? <p style={styles.greeting}>{greeting}</p> : null}
                  <h1 style={styles.cardTitle}>{meta.title}</h1>
                  <div style={styles.inputStack}>{renderFields()}</div>
                  {step === TOTAL_STEPS - 1 && postRegCompanyId ? (
                    <div style={styles.skipWaWrap}>
                      <button type="button" onClick={goToDashboardSkipWa} style={styles.skipWaBtn}>
                        Ir para o painel e ligar o WhatsApp mais tarde
                      </button>
                    </div>
                  ) : (
                    <div style={styles.footerActions}>
                      <button
                        type="button"
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step === 0 || loading || (step === TOTAL_STEPS - 1 && postRegCompanyId !== null)}
                        style={{
                          ...styles.backBtn,
                          opacity: step === 0 || loading || (step === TOTAL_STEPS - 1 && postRegCompanyId !== null) ? 0.35 : 1,
                        }}
                      >
                        <ArrowLeft size={16} /> Voltar
                      </button>
                      <button type="button" onClick={handleNext} style={styles.nextBtn} disabled={loading || !!postRegCompanyId}>
                        {loading ? (
                          <Loader2 size={22} className="spin" />
                        ) : step === TOTAL_STEPS - 1 ? (
                          'Criar conta e gerar código'
                        ) : (
                          'Continuar'
                        )}
                        {!loading && !postRegCompanyId && <ArrowRight size={20} />}
                      </button>
                    </div>
                  )}
                  <p style={styles.autosaveNote}>Seu progresso é salvo automaticamente neste dispositivo.</p>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          ${zaptroHeroSplitPanelCss()}
          .spin { animation: rotate 1s linear infinite; }
          @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .ray-pulse { animation: pulse 2s infinite; }
          @keyframes pulse { 0% { filter: drop-shadow(0 0 0px rgba(217,255,0,0.4)); } 50% { filter: drop-shadow(0 0 24px rgba(217,255,0,0.55)); } 100% { filter: drop-shadow(0 0 0px rgba(217,255,0,0.4)); } }
          @media (max-width: 1024px) {
            .hide-mobile { display: none !important; }
            .rightSide { border-radius: 0 !important; }
            .show-mobile-only { display: flex !important; }
          }
          @media (min-width: 1025px) {
            .show-mobile-only { display: none !important; }
          }
        `}</style>
      </div>
    </ZaptroLayout>
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

const styles: Record<string, React.CSSProperties> = {
  page: { width: '100vw', minHeight: '100vh', display: 'flex', overflow: 'hidden', backgroundColor: '#000', fontFamily: 'Inter, sans-serif' },
  leftSide: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoTop: { position: 'absolute', top: '40px', left: '50px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 700, zIndex: 2 },
  phraseContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '16px',
    width: '88%',
    maxWidth: 420,
    zIndex: 2,
  },
  phraseTag: { fontSize: '10px', fontWeight: 600, color: 'rgba(10,10,10,0.5)', letterSpacing: '0.22em', textTransform: 'uppercase' },
  dynamicPhrase: {
    fontSize: 'clamp(22px, 3.2vw, 36px)',
    fontWeight: 700,
    color: '#0a0a0a',
    letterSpacing: '-0.04em',
    lineHeight: 1.15,
  },
  stepPill: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#0a0a0a',
    backgroundColor: 'rgba(255,255,255,0.55)',
    padding: '8px 14px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.06)',
  },
  progressTrack: {
    width: '100%',
    maxWidth: 280,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFillStatic: { height: '100%', backgroundColor: 'rgba(217, 255, 0, 1)', borderRadius: 999, transition: 'width 0.35s ease' },
  rightSide: {
    flex: 1,
    backgroundColor: '#f4f4f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '32px 20px',
    borderRadius: '120px 0 0 120px',
  },
  formCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#fff',
    borderRadius: 28,
    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0,0,0,0.04)',
    padding: '8px',
  },
  formContainer: { width: '100%', padding: '28px 24px 20px', boxSizing: 'border-box', zIndex: 10 },
  greeting: { margin: '0 0 8px 0', fontSize: 14, fontWeight: 650, color: '#52525b', textAlign: 'center' },
  cardTitle: { fontSize: '26px', fontWeight: 700, color: '#09090b', margin: '0 0 24px 0', letterSpacing: '-0.03em', textAlign: 'center' },
  inputStack: { display: 'flex', flexDirection: 'column', gap: '12px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  fieldGroup: { display: 'flex', alignItems: 'center', border: '1px solid #e4e4e7', borderRadius: '16px', backgroundColor: '#FFFFFF', position: 'relative', minHeight: 52 },
  fieldIcon: { paddingLeft: '14px', display: 'flex', alignItems: 'center', color: '#18181b', flexShrink: 0 },
  input: {
    flex: 1,
    padding: '14px 14px 14px 8px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    fontWeight: 650,
    color: '#09090b',
    minWidth: 0,
  },
  eyeBtn: { position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  textarea: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #e4e4e7',
    borderRadius: '16px',
    outline: 'none',
    fontSize: '15px',
    fontWeight: 650,
    minHeight: 120,
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  footerActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px', gap: 12 },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#27272a',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  nextBtn: {
    padding: '16px 28px',
    backgroundColor: '#09090b',
    color: 'rgba(217, 255, 0, 1)',
    borderRadius: '16px',
    fontSize: '15px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  fileDrop: {
    border: '2px dashed #d4d4d8',
    borderRadius: '20px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
    backgroundColor: '#fafafa',
  },
  hiddenFile: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
  fileLabel: { fontSize: '13px', fontWeight: 600, color: '#27272a', textAlign: 'center' },
  qrArea: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '16px' },
  connectLead: {
    margin: '0 0 4px 0',
    fontSize: 13,
    color: '#52525b',
    fontWeight: 600,
    lineHeight: 1.55,
    textAlign: 'center',
  },
  skipWaWrap: { marginTop: 20, display: 'flex', justifyContent: 'center' },
  skipWaBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: '#52525b',
    textDecoration: 'underline',
    padding: '8px 4px',
    fontFamily: 'inherit',
  },
  logoCircleWrapper: { position: 'relative' },
  logoPreviewCircle: { width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e4e4e7' },
  logoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(217, 255, 0, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fff',
  },
  fileIconBox: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: '#f4f4f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  segmentCard: {
    position: 'relative',
    borderRadius: 16,
    border: '1px solid #e4e4e7',
    padding: '16px 14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
  },
  segmentCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(217, 255, 0, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintMuted: { margin: 0, fontSize: 12, color: '#71717a', fontWeight: 600 },
  autosaveNote: { marginTop: 18, fontSize: 11, color: '#a1a1aa', textAlign: 'center', fontWeight: 600 },
  mobileProgress: { flexDirection: 'column', gap: 10, marginBottom: 16, alignItems: 'center' },
  stepPillMobile: { fontSize: 12, fontWeight: 600, color: '#52525b' },
};

export default ZaptroRegister;
