import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  User, Building2, CreditCard,
  Shield, CheckCircle2, Camera,
  MapPin, Phone, Mail, Globe, Calendar, Save,
  Clock, Tag, Info, AlertTriangle, ExternalLink, Zap, Download
} from 'lucide-react';
import ZaptroLayout from '../components/Zaptro/ZaptroLayout';
import LogtaModal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { getContext, isZaptroProductPath } from '../utils/domains';
import { useTenant } from '../context/TenantContext';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import { ZAPTRO_SHADOW } from '../constants/zaptroShadows';
import { ZAPTRO_FIELD_BG, ZAPTRO_SECTION_BORDER, ZAPTRO_TITLE_COLOR } from '../constants/zaptroUi';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';
import { vitrineMissingFields } from '../utils/zaptroCompanyVitrine';
import { mirrorCompanyRowForProfilesFk } from '../utils/zaptroCompaniesFkMirror';
import {
  formatZaptroDbErrorForToast,
  getZaptroDbErrorRawText,
  isMissingWhatsappCompaniesError,
} from '../utils/zaptroSchemaErrors';
import {
  canBootstrapZaptroCompany,
  canEditZaptroCompanyVitrine,
  isZaptroTenantAdminRole,
  zaptroRoleShortLabel,
} from '../utils/zaptroPermissions';
import { getZaptroPlanVerifiedTier } from '../utils/zaptroPlanVerifiedSeal';
import { ZaptroPlanVerifiedSealBubble } from '../components/Zaptro/ZaptroPlanVerifiedSealBubble';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type BillingRow = { date: string; amount: string; method: string; status: string; ref: string };

function openPaymentReceiptPrint(args: {
  item: BillingRow;
  companyName: string;
  segment: string;
  companyLogoDataUrl: string | null;
}) {
  const { item, companyName, segment, companyLogoDataUrl } = args;
  const w = window.open('', '_blank');
  if (!w) {
    notifyZaptro('error', 'Pop-up bloqueado', 'Permita pop-ups para gerar o comprovante.');
    return;
  }
  const co = escapeHtml(companyName || 'Sua empresa');
  const seg = escapeHtml(segment);
  const logoBlock = companyLogoDataUrl
    ? `<img class="co-logo" src="${companyLogoDataUrl.replace(/"/g, '')}" alt="Logo da empresa" />`
    : `<div class="co-ph">${escapeHtml((companyName || 'E').charAt(0))}</div>`;
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Comprovante Zaptro</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 48px; color: #111; max-width: 720px; margin: 0 auto; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb; }
    .zaptro { font-size: 26px; font-weight: 950; letter-spacing: -0.04em; }
    .zaptro-sub { font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .co-logo { width: 72px; height: 72px; border-radius: 14px; object-fit: cover; border: 1px solid #e5e7eb; }
    .co-ph { width: 72px; height: 72px; border-radius: 14px; background: #f4f4f5; display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:950;color:#18181b;border:1px solid #e5e7eb;}
    h1 { font-size: 18px; margin: 28px 0 12px; font-weight: 950; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px 0; border-bottom: 1px solid #ebebec; font-size: 14px; }
    th { width: 34%; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    .val { font-weight: 800; font-size: 16px; }
    .muted { color: #64748b; font-size: 13px; line-height: 1.55; margin-top: 28px; }
  </style></head><body>
  <div class="top">
    <div>
      <div class="zaptro">ZAPTRO</div>
      <div class="zaptro-sub">Central transportadora — comprovante</div>
    </div>
    <div>${logoBlock}</div>
  </div>
  <p style="font-size:17px;font-weight:800;margin:0 0 8px;">${co}</p>
  <p class="muted" style="margin-top:0;">Segmento: <strong>${seg}</strong>. Solução Zaptro para operação e relacionamento com clientes no WhatsApp da transportadora.</p>
  <h1>Pagamento</h1>
  <table>
    <tr><th>Referência</th><td>${escapeHtml(item.ref)}</td></tr>
    <tr><th>Data</th><td>${escapeHtml(item.date)}</td></tr>
    <tr><th>Valor</th><td class="val">${escapeHtml(item.amount)}</td></tr>
    <tr><th>Forma de pagamento</th><td>${escapeHtml(item.method)}</td></tr>
    <tr><th>Status</th><td>${escapeHtml(item.status)}</td></tr>
  </table>
  <p class="muted">Para obter o PDF: no diálogo de impressão, escolha &quot;Salvar como PDF&quot;.</p>
  <script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
  </body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

const ZaptroProfile: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, refreshProfile, user } = useAuth();
  const profileDb = useMemo(
    () => (getContext() === 'WHATSAPP' || isZaptroProductPath(location.pathname) ? supabaseZaptro : supabase),
    [location.pathname]
  );
  const { company, fetchCompanyData } = useTenant();
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'billing'>('profile');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isChangingPayment, setIsChangingPayment] = useState(false);
  const [billingDetailIdx, setBillingDetailIdx] = useState<number | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  /** Erro técnico do PostgREST mostrado também no cartão da vitrine (evita só toast duplicado). */
  const [vitrineSchemaErrorRaw, setVitrineSchemaErrorRaw] = useState<string | null>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  /** Só a BD (evita foto de outra sessão / bypass no `localStorage`). */
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  const handleProcessPayment = (method: string) => {
    notifyZaptro('info', 'Processando...', `Estamos vinculando seu novo método (${method}) com a Central Master.`);
    
    setTimeout(() => {
       setIsChangingPayment(false);
       notifyZaptro('success', 'Pagamento Concluído', 'Sua mensalidade foi renovada e o comprovante já está no histórico! 🚀');
    }, 2000);
  };

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'billing' || tab === 'planos') setActiveTab('billing');
    else if (tab === 'company' || tab === 'empresa') setActiveTab('company');
    else setActiveTab('profile');
  }, [location.search]);

  const syncTabToUrl = (tab: 'profile' | 'company' | 'billing') => {
    const sp = new URLSearchParams(location.search);
    if (tab === 'profile') sp.delete('tab');
    else if (tab === 'company') sp.set('tab', 'empresa');
    else sp.set('tab', 'billing');
    const q = sp.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : '' }, { replace: true });
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Estado para Edição do Perfil Pessoal
  const [profileData, setProfileData] = useState({
    firstName: profile?.full_name?.split(' ')[0] || '',
    lastName: profile?.full_name?.split(' ').slice(1).join(' ') || '',
    email: profile?.email || ''
  });

  const [vitrineData, setVitrineData] = useState({
    name: '',
    phone: '',
    address: '',
    website: '',
    segment: 'Transporte & Logística',
    description: '',
    hours: 'Seg - Sex: 08:00 às 18:00',
    unit: 'Matriz (São Paulo)',
    logo: null as string | null
  });

  useEffect(() => {
    if (!company) return;
    setVitrineData((prev) => ({
      ...prev,
      name: company.name || prev.name,
      logo: company.logo_url?.trim() ? company.logo_url : null,
      phone: company.phone ?? prev.phone,
      address: company.address ?? prev.address,
      website: company.website ?? prev.website,
      segment: company.category || prev.segment,
      description:
        company.description ||
        prev.description ||
        'Especialistas em transporte de carga fracionada e logística inteligente.',
      hours: company.opening_hours || prev.hours,
    }));
  }, [company]);

  useEffect(() => {
    if (!profile) return;
    setProfileData({
      firstName: profile.full_name?.split(' ')[0] || '',
      lastName: profile.full_name?.split(' ').slice(1).join(' ') || '',
      email: profile.email || '',
    });
  }, [profile?.id, profile?.full_name, profile?.email]);

  useEffect(() => {
    if (!profile) return;
    const fromDb = profile.avatar_url?.trim();
    if (fromDb) {
      setProfileAvatarUrl(fromDb);
      try {
        localStorage.setItem('zaptro_profile_avatar_url', fromDb);
      } catch {
        /* ignore */
      }
    } else {
      setProfileAvatarUrl(null);
      try {
        localStorage.removeItem('zaptro_profile_avatar_url');
      } catch {
        /* ignore */
      }
    }
  }, [profile?.id, profile?.avatar_url]);

  const handleSaveProfile = async () => {
    if (!profileData.firstName || !profileData.lastName) {
      notifyZaptro('error', 'Campos Obrigatórios', 'Nome e Sobrenome são necessários.');
      return;
    }
    if (!profile?.id) {
      notifyZaptro('error', 'Sessão', 'Perfil não encontrado. Faça login novamente.');
      return;
    }
    const fullName = `${profileData.firstName.trim()} ${profileData.lastName.trim()}`.trim();
    const payload: { full_name: string; avatar_url?: string | null } = { full_name: fullName };
    if (profileAvatarUrl && profileAvatarUrl.length <= 200_000) {
      payload.avatar_url = profileAvatarUrl;
    }
    setSavingProfile(true);
    try {
      const { error } = await profileDb.from('profiles').update(payload).eq('id', profile.id);
      if (error) {
        notifyZaptro('error', 'Não foi possível salvar', error.message || 'Verifique permissões (RLS) e tente de novo.');
        return;
      }
      await refreshProfile();
      notifyZaptro('success', 'Perfil atualizado', 'Nome salvo no banco de dados.');
    } catch (e: any) {
      notifyZaptro('error', 'Erro', e?.message || 'Falha ao salvar.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!profile?.id) {
      notifyZaptro('error', 'Sessão', 'Faça login novamente.');
      return;
    }
    if (!vitrineData.name?.trim() || !vitrineData.phone?.trim() || !vitrineData.address?.trim()) {
      notifyZaptro('error', 'Campos obrigatórios', 'Preencha nome fantasia, telefone e endereço para salvar a vitrine.');
      return;
    }

    if (profile.company_id && !canEditZaptroCompanyVitrine(profile.role)) {
      notifyZaptro(
        'warning',
        'Sem permissão',
        `Seu papel é ${zaptroRoleShortLabel(profile.role)}. Só o administrador da conta (ADMIN) pode alterar a vitrine. Peça ao dono da conta para ajustar seu acesso.`
      );
      return;
    }

    if (!profile.company_id && !canBootstrapZaptroCompany(profile.role)) {
      notifyZaptro(
        'warning',
        'Sem permissão',
        `Seu papel é ${zaptroRoleShortLabel(profile.role)}. Só o administrador da conta (quem comprou / ADMIN) cadastra a primeira transportadora aqui. O dono da conta deve usar /registrar ou vincular sua empresa ao seu login.`
      );
      return;
    }

    const buildCompanyPayload = (): Record<string, unknown> => {
      const payload: Record<string, unknown> = {
        name: vitrineData.name.trim(),
        phone: vitrineData.phone.trim(),
        address: vitrineData.address.trim(),
        website: vitrineData.website.trim(),
        category: vitrineData.segment.trim(),
        description: vitrineData.description.trim() || vitrineData.name.trim(),
        opening_hours: vitrineData.hours.trim(),
      };
      if (vitrineData.logo && vitrineData.logo.length <= 400_000) {
        payload.logo_url = vitrineData.logo;
      }
      return payload;
    };

    setSavingCompany(true);
    setVitrineSchemaErrorRaw(null);

    try {
      const payload = buildCompanyPayload();
      
      let companyId = profile.company_id;
      
      if (!companyId) {
        // Primeiro cadastro
        const { data: created, error: cErr } = await supabaseZaptro
          .from('whatsapp_companies')
          .insert([{ id: crypto.randomUUID(), ...payload, status: 'active' }])
          .select('id')
          .single();

        if (cErr) throw cErr;
        companyId = created.id;

        await mirrorCompanyRowForProfilesFk(supabaseZaptro, companyId, vitrineData.name.trim());

        const profilePatch: Record<string, unknown> = { company_id: companyId };
        if (!String(profile.role || '').trim()) profilePatch.role = 'ADMIN';
        const { error: linkErr } = await profileDb.from('profiles').update(profilePatch).eq('id', profile.id);
        if (linkErr) {
          throw new Error(
            `${linkErr.message} — Se no Supabase o perfil ainda aponta só para \`companies\`, rode scripts/fix-zaptro-profiles-company-fk-to-whatsapp.sql ou mantenha o espelho em \`companies\`.`,
          );
        }

        notifyZaptro('success', 'Transportadora cadastrada', 'Sua vitrine foi salva e o perfil vinculado! 🚀');
        setVitrineSchemaErrorRaw(null);
        await refreshProfile?.();
        await fetchCompanyData?.(companyId);
        setTimeout(() => window.location.reload(), 800);
      } else {
        // Atualização simples
        const { error: uErr } = await supabaseZaptro
          .from('whatsapp_companies')
          .update(payload)
          .eq('id', companyId);

        if (uErr) throw uErr;
        
        notifyZaptro('success', 'Vitrine publicada', 'As informações da sua empresa foram atualizadas.');
        setVitrineSchemaErrorRaw(null);
        await fetchCompanyData?.(companyId);
        await refreshProfile?.();
      }
    } catch (e: unknown) {
      console.error('Erro no salvamento:', e);
      const missing = isMissingWhatsappCompaniesError(e);
      if (missing) {
        setVitrineSchemaErrorRaw(getZaptroDbErrorRawText(e));
      }
      notifyZaptro(
        'error',
        missing ? 'Supabase: falta tabela' : 'Ops!',
        formatZaptroDbErrorForToast(e, 'Falha ao salvar. Verifique sua conexão.'),
        missing ? { toastId: 'zaptro-whatsapp-companies-schema' } : undefined,
      );
    } finally {
      setSavingCompany(false);
    }


  };

  const vitrineMissing = useMemo(
    () => vitrineMissingFields(vitrineData, company?.logo_url),
    [vitrineData, company?.logo_url]
  );

  const isTenantPurchaserAdmin = useMemo(() => isZaptroTenantAdminRole(profile?.role), [profile?.role]);

  const profileNavItems = useMemo(() => {
    const items: { id: 'profile' | 'company' | 'billing'; label: string; icon: typeof User }[] = [
      { id: 'profile', label: 'Informações Pessoais', icon: User },
    ];
    if (isTenantPurchaserAdmin) {
      items.push({ id: 'company', label: 'Minha Empresa', icon: Building2 });
      items.push({ id: 'billing', label: 'Assinatura & Faturamento', icon: CreditCard });
    }
    return items;
  }, [isTenantPurchaserAdmin]);

  useEffect(() => {
    if (!isTenantPurchaserAdmin && (activeTab === 'billing' || activeTab === 'company')) {
      setActiveTab('profile');
    }
  }, [activeTab, isTenantPurchaserAdmin]);

  const vitrineLocked = !!profile?.company_id && !canEditZaptroCompanyVitrine(profile?.role);
  const vitrineNoBootstrap = !profile?.company_id && !canBootstrapZaptroCompany(profile?.role);
  const vitrineFormDisabled = vitrineLocked || vitrineNoBootstrap;

  const billingHistory: BillingRow[] = [
    { date: '10/04/2026', amount: 'R$ 147,00', method: 'Cartão • 4421', status: 'Pago', ref: 'ZT-2026-0410-8841' },
    { date: '10/03/2026', amount: 'R$ 147,00', method: 'Cartão • 4421', status: 'Pago', ref: 'ZT-2026-0310-7720' },
  ];

  const planVerifiedTier = useMemo(() => getZaptroPlanVerifiedTier(company), [company]);

  return (
    <ZaptroLayout>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Minha conta</h1>
          <p style={styles.subtitle}>
            Perfil pessoal, dados públicos da transportadora e assinatura — modelo de página Zaptro para partilhar com a equipa.
          </p>
          {isTenantPurchaserAdmin && (
            <div style={styles.modelUrlStrip} role="note">
              <span style={styles.modelUrlStripLabel}>URLs</span>
              <span style={styles.modelUrlStripText}>
                Canónica para enviar a clientes e staff: <strong>{ZAPTRO_ROUTES.PROFILE}</strong>
                {' · '}
                Legado (mesma página): <strong>{ZAPTRO_ROUTES.LEGACY_PROFILE}</strong>
                {' — '}
                use <strong>?tab=empresa</strong>, <strong>?tab=billing</strong> ou <strong>?tab=planos</strong> para abrir direto num separador.
              </span>
            </div>
          )}
        </header>

        <div style={{...styles.layout, gridTemplateColumns: isMobile ? '1fr' : '300px 1fr'}}>
           {/* Sidebar de Navegação */}
           <aside style={styles.profileNav}>
              <div style={isMobile ? styles.navGroupMobile : { ...styles.navGroup, ...styles.navGroupDesktop }}>
                 {profileNavItems.map((tab) => (
                   <button 
                     key={tab.id}
                     style={{
                       ...styles.navBtn, 
                       ...(activeTab === tab.id ? styles.navBtnActive : {}),
                       flex: isMobile ? 1 : 'none'
                     }}
                     onClick={() => {
                       setActiveTab(tab.id);
                       syncTabToUrl(tab.id);
                     }}
                   >
                      <tab.icon size={18} /> 
                      {!isMobile && <span>{tab.label}</span>}
                   </button>
                 ))}
              </div>

              {!isMobile && (
                <div style={styles.securitySeal}>
                   <Shield size={16} color="#10B981" />
                   <span>Conexão Segura SSL</span>
                </div>
              )}
           </aside>

           {/* Área de Conteúdo */}
           <main style={styles.content}>
              {activeTab === 'profile' && (
                <div style={styles.card}>
                   <div style={styles.profileHero}>
                      <input
                        ref={profileAvatarInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        aria-hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const url = reader.result as string;
                            setProfileAvatarUrl(url);
                            try {
                              localStorage.setItem('zaptro_profile_avatar_url', url);
                            } catch {
                              /* ignore */
                            }
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div
                          role="button"
                          tabIndex={0}
                          style={styles.avatarLarge}
                          onClick={() => profileAvatarInputRef.current?.click()}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              profileAvatarInputRef.current?.click();
                            }
                          }}
                          title="Alterar foto do perfil"
                        >
                          {profileAvatarUrl ? (
                            <img src={profileAvatarUrl} alt="" style={styles.avatarLargeImg} />
                          ) : (
                            <span style={{ lineHeight: 1 }}>{profileData.firstName?.[0] || profile?.full_name?.[0] || '?'}</span>
                          )}
                          <div style={styles.cameraIcon}>
                            <Camera size={14} />
                          </div>
                        </div>
                        {planVerifiedTier !== 'none' && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 4,
                              bottom: 8,
                              zIndex: 4,
                              pointerEvents: 'none',
                            }}
                          >
                            <ZaptroPlanVerifiedSealBubble tier={planVerifiedTier} size="md" />
                          </div>
                        )}
                      </div>
                      <div style={styles.heroText}>
                        <h2 style={styles.userName}>
                          {profileData.firstName} {profileData.lastName}
                        </h2>
                        <div style={styles.userRoleBadge}>
                          {planVerifiedTier !== 'none' ? (
                            <ZaptroPlanVerifiedSealBubble tier={planVerifiedTier} size="sm" />
                          ) : null}
                          <span>{profile?.role}</span>
                        </div>
                      </div>
                   </div>

                   <div style={styles.infoGrid}>
                      <div style={styles.infoField}>
                         <label style={styles.label}>Primeiro Nome</label>
                         <div style={styles.inputStack}>
                            <User size={16} color="#64748B" />
                            <input 
                              style={styles.input} 
                              value={profileData.firstName} 
                              onChange={e => setProfileData({...profileData, firstName: e.target.value})} 
                              placeholder="Seu nome"
                            />
                         </div>
                      </div>
                      <div style={styles.infoField}>
                         <label style={styles.label}>Sobrenome</label>
                         <div style={styles.inputStack}>
                            <User size={16} color="#64748B" />
                            <input 
                              style={styles.input} 
                              value={profileData.lastName} 
                              onChange={e => setProfileData({...profileData, lastName: e.target.value})} 
                              placeholder="Seu sobrenome"
                            />
                         </div>
                      </div>
                      <div style={styles.infoField}>
                         <label style={styles.label}>E-mail de Acesso</label>
                         <div style={styles.valBox}><Mail size={16} /> {profileData.email}</div>
                      </div>
                      <div style={styles.infoField}>
                         <label style={styles.label}>Colaborador ID</label>
                         <div style={styles.valBox}><Shield size={16} /> {profile?.id.substring(0,8).toUpperCase()}</div>
                      </div>
                   </div>
                   <div style={styles.profileActions}>
                      <button
                        type="button"
                        style={{ ...styles.submitBtn, opacity: savingProfile ? 0.75 : 1 }}
                        onClick={() => void handleSaveProfile()}
                        disabled={savingProfile}
                      >
                        {savingProfile ? 'Salvando…' : 'Salvar Perfil'}
                      </button>
                      <button style={styles.cancelBtn}>Cancelar</button>
                   </div>
                </div>
              )}

              {activeTab === 'company' && (
                <div style={styles.card}>
                   {vitrineSchemaErrorRaw && (
                     <div
                       style={{
                         ...styles.vitrineAlert,
                         marginBottom: 20,
                         borderColor: '#fecaca',
                         background: '#fef2f2',
                         flexDirection: 'column',
                         alignItems: 'stretch',
                       }}
                     >
                       <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                         <AlertTriangle size={22} color="#b91c1c" style={{ flexShrink: 0 }} />
                         <div>
                           <strong style={{ ...styles.vitrineAlertTitle, color: '#991b1b' }}>
                             Erro ao falar com o Supabase (tabela em falta)
                           </strong>
                           <p style={{ ...styles.vitrineAlertText, color: '#7f1d1d' }}>
                             Cria a tabela no projeto ligado ao app: no{' '}
                             <strong>Supabase → SQL Editor</strong>, executa o ficheiro{' '}
                             <code style={{ fontSize: 12, background: '#fee2e2', padding: '2px 6px', borderRadius: 6 }}>
                               logta/supabase/migrations/20260415100000_create_whatsapp_companies_zaptro.sql
                             </code>
                             , depois recarrega esta página.
                           </p>
                         </div>
                       </div>
                       <pre
                         style={{
                           margin: '12px 0 0',
                           padding: 12,
                           fontSize: 11,
                           fontWeight: 600,
                           color: '#450a0a',
                           background: '#fee2e2',
                           borderRadius: 12,
                           overflow: 'auto',
                           whiteSpace: 'pre-wrap',
                           wordBreak: 'break-word',
                         }}
                       >
                         {vitrineSchemaErrorRaw}
                       </pre>
                       <button
                         type="button"
                         onClick={() => setVitrineSchemaErrorRaw(null)}
                         style={{
                           marginTop: 12,
                           alignSelf: 'flex-end',
                           border: '1px solid #fecaca',
                           background: '#fff',
                           color: '#991b1b',
                           fontWeight: 800,
                           fontSize: 12,
                           padding: '8px 14px',
                           borderRadius: 10,
                           cursor: 'pointer',
                         }}
                       >
                         Fechar aviso
                       </button>
                     </div>
                   )}
                   {vitrineNoBootstrap && (
                     <div style={{ ...styles.vitrineAlert, marginBottom: 20, borderColor: '#fecaca', background: '#fff1f2' }}>
                       <AlertTriangle size={22} color="#b91c1c" style={{ flexShrink: 0 }} />
                       <div>
                         <strong style={styles.vitrineAlertTitle}>Sem permissão para cadastrar a empresa nesta tela</strong>
                         <p style={styles.vitrineAlertText}>
                           Seu perfil está como <strong>{zaptroRoleShortLabel(profile?.role)}</strong>. Só o{' '}
                           <strong>administrador da conta</strong> (quem comprou / role ADMIN) pode criar a primeira transportadora aqui.
                           Peça ao dono da conta no Zaptro ou conclua o fluxo em <strong>/registrar</strong> com o e-mail do comprador. Para
                           desenvolvimento, o script <strong>logta/scripts/seed-zaptro-test-admin.sql</strong> no Supabase define{' '}
                           <strong>teste@teste.com</strong> como ADMIN com empresa vinculada.
                         </p>
                       </div>
                     </div>
                   )}
                   {vitrineLocked && (
                     <div style={{ ...styles.vitrineAlert, marginBottom: 20, borderColor: '#bae6fd', background: '#f0f9ff' }}>
                       <Info size={22} color="#0369a1" style={{ flexShrink: 0 }} />
                       <div>
                         <strong style={{ ...styles.vitrineAlertTitle, color: '#0c4a6e' }}>Vitrine somente leitura</strong>
                         <p style={styles.vitrineAlertText}>
                           Seu papel é <strong>{zaptroRoleShortLabel(profile?.role)}</strong>. Apenas o{' '}
                           <strong>administrador da conta</strong> (ADMIN) pode alterar nome, telefone e logo públicos da transportadora.
                         </p>
                       </div>
                     </div>
                   )}
                   {vitrineMissing.length > 0 && (
                     <div style={styles.vitrineAlert}>
                       <AlertTriangle size={22} color="#B45309" style={{ flexShrink: 0 }} />
                       <div>
                         <strong style={styles.vitrineAlertTitle}>Complete o cadastro da empresa para conectar o WhatsApp</strong>
                         <p style={styles.vitrineAlertText}>
                           Enquanto a ficha pública não estiver completa, a conexão com o WhatsApp pode ficar bloqueada ou com dados
                           incompletos para o cliente. Preencha todos os campos abaixo e envie a <strong>logo</strong>, depois use{' '}
                           <strong>Salvar Vitrine</strong>.
                         </p>
                         <p style={styles.vitrineAlertMissing}>
                           <span style={{ fontWeight: 950 }}>Falta:</span> {vitrineMissing.join(' · ')}
                         </p>
                       </div>
                     </div>
                   )}
                   <div style={styles.identityStrip}>
                     <Mail size={18} color="#0369a1" style={{ flexShrink: 0 }} />
                     <div>
                       <strong style={{ color: '#0c4a6e' }}>Sua conta é o e-mail e a senha do login.</strong>
                       <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#334155', lineHeight: 1.55, fontWeight: 600 }}>
                         O plano fica vinculado a este acesso: <strong>{user?.email || profile?.email || '—'}</strong>. Pode trocar nome da
                         transportadora, CNPJ nos seus registros internos e o <strong>WhatsApp</strong> (um número por vez na conexão)
                         sem perder a assinatura — desconecte o aparelho em Configurações → Conexão e escaneie outro QR quando precisar.
                       </p>
                     </div>
                   </div>
                   {/* HEADER DA VITRINE */}
                   <div style={styles.vitrineHeader}>
                      <div style={styles.vitrineLogoArea}>
                         <input
                           ref={companyLogoInputRef}
                           type="file"
                           accept="image/*"
                           style={{ display: 'none' }}
                           aria-hidden
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
                             const reader = new FileReader();
                             reader.onload = () => {
                               setVitrineData((prev) => ({ ...prev, logo: reader.result as string }));
                             };
                             reader.readAsDataURL(file);
                             e.target.value = '';
                           }}
                         />
                         <div
                           role="button"
                           tabIndex={vitrineFormDisabled ? -1 : 0}
                           style={{
                             ...styles.companyLogoLarge,
                             opacity: vitrineFormDisabled ? 0.65 : 1,
                             pointerEvents: vitrineFormDisabled ? 'none' : 'auto',
                           }}
                           title="Enviar logo da empresa — aparece na vitrine pública e no espelho do WhatsApp"
                           onClick={() => {
                             if (vitrineFormDisabled) return;
                             companyLogoInputRef.current?.click();
                           }}
                           onKeyDown={(e) => {
                             if (vitrineFormDisabled) return;
                             if (e.key === 'Enter' || e.key === ' ') {
                               e.preventDefault();
                               companyLogoInputRef.current?.click();
                             }
                           }}
                         >
                           {vitrineData.logo ? (
                             <img src={vitrineData.logo} alt="" style={styles.companyLogoLargeImg} />
                           ) : (
                             <span style={{ lineHeight: 1 }}>{vitrineData.name?.[0] || '?'}</span>
                           )}
                           <div style={styles.cameraIcon}>
                             <Camera size={16} />
                           </div>
                         </div>
                         <div>
                            <h2 style={styles.userName}>{vitrineData.name || 'Nova Transportadora'}</h2>
                            <div style={styles.obsBadge} title="Papel real no banco de dados (não é sempre administrador)">
                              {zaptroRoleShortLabel(profile?.role)}
                            </div>
                         </div>
                      </div>
                      <button
                        type="button"
                        style={{ ...styles.saveBtnPill, opacity: savingCompany || vitrineFormDisabled ? 0.5 : 1 }}
                        onClick={() => void handleSaveCompany()}
                        disabled={savingCompany || vitrineFormDisabled}
                      >
                        <Save size={16} /> {savingCompany ? 'Salvando…' : 'Salvar Vitrine'}
                      </button>
                   </div>

                   <div style={styles.divider} />

                   {/* GRID DE INFORMAÇÕES BUSINESS */}
                   <div style={styles.infoGrid}>
                      <div style={styles.infoField}>
                         <label style={styles.label}>Nome Fantasia (Público)</label>
                         <div style={styles.inputStack}>
                            <Building2 size={16} color="#64748B" />
                            <input
                              disabled={vitrineFormDisabled}
                              style={styles.input}
                              value={vitrineData.name}
                              onChange={(e) => setVitrineData({ ...vitrineData, name: e.target.value })}
                              placeholder="Nome da sua transportadora"
                            />
                         </div>
                      </div>
                      <div style={styles.infoField}>
                         <label style={styles.label}>Telefone de Atendimento</label>
                         <div style={styles.inputStack}>
                            <Phone size={16} color="#64748B" />
                            <input
                              disabled={vitrineFormDisabled}
                              style={styles.input}
                              value={vitrineData.phone}
                              onChange={(e) => setVitrineData({ ...vitrineData, phone: e.target.value })}
                              placeholder="+55 (11) 98877-0000"
                            />
                         </div>
                      </div>
                      <div style={styles.infoFull}>
                         <label style={styles.label}>Endereço Completo</label>
                         <div style={styles.inputStack}>
                            <MapPin size={16} color="#64748B" />
                            <input
                              disabled={vitrineFormDisabled}
                              style={styles.input}
                              value={vitrineData.address}
                              onChange={(e) => setVitrineData({ ...vitrineData, address: e.target.value })}
                              placeholder="Av. Paulista, 1000 - São Paulo, SP"
                            />
                         </div>
                      </div>
                      <div style={styles.infoField}>
                         <label style={styles.label}>Sítio Web / Link</label>
                         <div style={styles.inputStack}>
                            <Globe size={16} color="#64748B" />
                            <input
                              disabled={vitrineFormDisabled}
                              style={styles.input}
                              value={vitrineData.website}
                              onChange={(e) => setVitrineData({ ...vitrineData, website: e.target.value })}
                              placeholder="www.suatransportadora.com.br"
                            />
                         </div>
                      </div>
                      <div style={styles.infoField}>
                         <label style={styles.label}>Segmento / Categoria</label>
                         <div style={styles.inputStack}>
                            <Tag size={16} color="#64748B" />
                            <select
                              disabled={vitrineFormDisabled}
                              style={styles.select}
                              value={vitrineData.segment}
                              onChange={(e) => setVitrineData({ ...vitrineData, segment: e.target.value })}
                            >
                               <option>Transporte & Logística</option>
                               <option>Automotivo</option>
                               <option>Educação</option>
                               <option>Finanças</option>
                               <option>Saúde</option>
                               <option>Serviços Profissionais</option>
                               <option>Varejo</option>
                            </select>
                         </div>
                      </div>
                      <div style={styles.infoField}>
                         <label style={styles.label}>Horário de Funcionamento</label>
                         <div style={styles.inputStack}>
                            <Clock size={16} color="#64748B" />
                            <input
                              disabled={vitrineFormDisabled}
                              style={styles.input}
                              value={vitrineData.hours}
                              onChange={(e) => setVitrineData({ ...vitrineData, hours: e.target.value })}
                              placeholder="Ex: Seg-Sex 08h às 18h"
                            />
                         </div>
                      </div>
                      <div style={styles.infoFull}>
                         <label style={styles.label}>Descrição da Empresa (Bio)</label>
                         <div style={styles.inputStackArea}>
                            <textarea
                              disabled={vitrineFormDisabled}
                              style={styles.textarea}
                              value={vitrineData.description}
                              onChange={(e) => setVitrineData({ ...vitrineData, description: e.target.value })}
                              placeholder="Fale um pouco sobre a sua competência logística..."
                            />
                         </div>
                      </div>
                   </div>

                   <div style={styles.vitrinePreview}>
                      <Info size={16} />
                      <span>
                        Aqui é o <strong>cadastro da transportadora</strong> (nome fantasia, telefone de atendimento, logo, etc.) que o
                        cliente enxerga na vitrine — <strong>independente do número do WhatsApp</strong> que você conecta por QR na tela
                        de Conexão. Trocou de chip? Desconecte o WhatsApp lá e escaneie de novo; mudou o nome da empresa ou o telefone de
                        contato? Edite aqui e use <strong>Salvar Vitrine</strong> (atualiza o banco pelo painel, sem SQL). Toque no quadro
                        amarelo para enviar ou trocar a <strong>logo</strong>.
                      </span>
                   </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div style={styles.card}>
                   {/* DYNAMIC PLAN BANNER */}
                   <div style={styles.planBannerAnimated}>
                      <div style={styles.planContent}>
                         <div style={styles.planBadge}>PLANO ATIVO</div>
                         <h3 style={styles.planTitle}>Zaptro Professional</h3>
                         <p style={styles.planSub}>O motor inteligente da sua central transportadora</p>
                         <div style={styles.priceTag}>R$ 147<span>/mês</span></div>
                      </div>
                      <div style={styles.planVisual}>
                         <div style={styles.aiWaveContainer}>
                            <div style={styles.aiWave} />
                            <div style={{...styles.aiWave, animationDelay: '-2s'}} />
                            <div style={{...styles.aiWave, animationDelay: '-4s'}} />
                         </div>
                      </div>
                   </div>

                   <div style={styles.billingSection}>
                      <div style={styles.sectionHeader}>
                         <h4 style={styles.sectionTitle}>Gestão de Pagamento</h4>
                         <span style={styles.masterSyncBadge}>
                            <Shield size={12} /> Sincronizado com Central Master
                         </span>
                      </div>

                      {!isChangingPayment ? (
                        <div style={styles.cardInfoBox}>
                           <div style={styles.cardVisual}>
                              <div style={styles.methodIconBox}>
                                 <CreditCard size={24} color="#0F172A" />
                              </div>
                              <div style={styles.cardDetails}>
                                 <span style={styles.cardNum}>•••• •••• •••• 4421</span>
                                 <span style={styles.cardExp}>Expira em 08/29</span>
                              </div>
                           </div>
                           <button style={styles.editBtn} onClick={() => setIsChangingPayment(true)}>Alterar Forma de Pagamento</button>
                        </div>
                      ) : (
                        <div style={styles.paymentSelector}>
                           <h5 style={styles.selectorTitle}>Escolha a nova forma de pagamento:</h5>
                           <div style={styles.paymentGrid}>
                              <button style={styles.paymentOption} onClick={() => handleProcessPayment('CARTÃO')}>
                                 <CreditCard size={20} />
                                 <span>Cartão de Crédito</span>
                              </button>
                              <button style={styles.paymentOption} onClick={() => handleProcessPayment('PIX')}>
                                 <Zap size={20} />
                                 <span>PIX (Instantâneo)</span>
                              </button>
                              <button style={styles.paymentOption} onClick={() => handleProcessPayment('BOLETO')}>
                                 <Mail size={20} />
                                 <span>Boleto Bancário</span>
                              </button>
                           </div>
                           <button style={styles.cancelLink} onClick={() => setIsChangingPayment(false)}>Manter forma atual</button>
                        </div>
                      )}

                      <div style={styles.historyBox}>
                         <h4 style={styles.sectionTitle}>Histórico de Cobrança</h4>
                         <div style={styles.historyList}>
                            {billingHistory.map((item, idx) => (
                               <div
                                 key={idx}
                                 role="button"
                                 tabIndex={0}
                                 style={styles.historyItem}
                                 onClick={() => setBillingDetailIdx(idx)}
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter' || e.key === ' ') {
                                     e.preventDefault();
                                     setBillingDetailIdx(idx);
                                   }
                                 }}
                               >
                                  <div style={styles.historyInfo}>
                                     <span style={styles.histDate}>{item.date}</span>
                                     <span style={styles.histMethod}>{item.method}</span>
                                  </div>
                                  <div style={styles.historyAmount}>
                                     <div style={styles.amountWrap}>
                                        <span style={styles.amountText}>{item.amount}</span>
                                        <div style={styles.statusPill}>PAGO</div>
                                     </div>
                                     <ExternalLink size={14} color="#94A3B8" aria-hidden />
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   <div style={styles.billingAlert}>
                      <Clock size={16} />
                      <span>Próxima renovação automática: <strong>10 de Maio de 2026</strong>.</span>
                   </div>
                </div>
              )}
           </main>
        </div>
      </div>

      <LogtaModal
        isOpen={billingDetailIdx !== null}
        onClose={() => setBillingDetailIdx(null)}
        title="Histórico de cobrança"
        width="560px"
      >
        {billingDetailIdx !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
              Cobrança selecionada: <strong style={{ color: '#0f172a' }}>{billingHistory[billingDetailIdx].date}</strong> —{' '}
              {billingHistory[billingDetailIdx].method}. Valor {billingHistory[billingDetailIdx].amount}, status{' '}
              {billingHistory[billingDetailIdx].status}.
            </p>
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 950, color: '#94a3b8', letterSpacing: '0.08em' }}>
                TODAS AS COBRANÇAS
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {billingHistory.map((row, i) => (
                  <div
                    key={row.ref}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: i === billingDetailIdx ? `1px solid ${ZAPTRO_SECTION_BORDER}` : `1px solid ${ZAPTRO_SECTION_BORDER}`,
                      backgroundColor: i === billingDetailIdx ? '#fafafa' : '#fff',
                      fontSize: '13px',
                      fontWeight: 800,
                    }}
                  >
                    <span>{row.date}</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>{row.method}</span>
                    <span>{row.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '14px 22px',
                borderRadius: '14px',
                border: '1px solid #27272a',
                background: '#18181b',
                color: '#fff',
                fontWeight: 950,
                fontSize: '14px',
                cursor: 'pointer',
                width: '100%',
              }}
              onClick={() => {
                const item = billingHistory[billingDetailIdx];
                openPaymentReceiptPrint({
                  item,
                  companyName: vitrineData.name || company?.name || '',
                  segment: vitrineData.segment,
                  companyLogoDataUrl: vitrineData.logo,
                });
              }}
            >
              <Download size={18} />
              Baixar comprovante (PDF)
            </button>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              O arquivo abre em nova aba com marca Zaptro, dados da empresa e o segmento. Use Imprimir → Salvar como PDF.
            </p>
          </div>
        )}
      </LogtaModal>
    </ZaptroLayout>
  );
};

const styles: Record<string, any> = {
  container: { padding: '0 0 40px 0', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  header: { marginBottom: '40px' },
  title: { fontSize: '32px', fontWeight: '950', color: '#000', margin: '0 0 8px 0', letterSpacing: '-1.5px' },
  subtitle: { fontSize: '15px', color: '#64748B', fontWeight: '600', lineHeight: 1.5, margin: 0 },
  modelUrlStrip: {
    marginTop: 20,
    padding: '14px 18px',
    borderRadius: 16,
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    backgroundColor: ZAPTRO_FIELD_BG,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: '12px 16px',
  },
  modelUrlStripLabel: {
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: '0.1em',
    color: '#64748b',
    flexShrink: 0,
    marginTop: 2,
  },
  modelUrlStripText: {
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    lineHeight: 1.55,
    flex: '1 1 280px',
    minWidth: 0,
  },
  
  layout: { display: 'grid', gap: '40px' },
  profileNav: { display: 'flex', flexDirection: 'column', gap: '32px' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '14px' },
  navGroupDesktop: { minHeight: '187px', justifyContent: 'flex-start' },
  navGroupMobile: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' },
  navBtn: { 
    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', 
    borderRadius: '16px', border: '1px solid transparent', backgroundColor: ZAPTRO_FIELD_BG,
    color: ZAPTRO_TITLE_COLOR, fontWeight: '900', fontSize: '14px', cursor: 'pointer', transition: '0.2s',
    textAlign: 'left'
  },
  navBtnActive: {
    backgroundColor: '#ffffff',
    color: '#000000',
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    boxShadow: ZAPTRO_SHADOW.sm,
  },
  securitySeal: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px', backgroundColor: '#EEFCEF', color: '#10B981', borderRadius: '14px', fontSize: '11px', fontWeight: '950' },
  
  content: { display: 'flex', flexDirection: 'column', gap: '24px' },
  card: { backgroundColor: 'white', padding: '48px', borderRadius: '40px', border: `1px solid ${ZAPTRO_SECTION_BORDER}`, boxShadow: ZAPTRO_SHADOW.sm },
  
  profileHero: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    marginBottom: '40px',
    paddingTop: 0,
    paddingBottom: 0,
  },
  avatarLarge: {
    width: '100px',
    height: '100px',
    borderRadius: '32px',
    backgroundColor: '#D9FF00',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    fontWeight: '950',
    position: 'relative',
    border: '2px solid #e4e4e7',
    boxSizing: 'border-box',
    overflow: 'hidden',
    cursor: 'pointer',
    flexShrink: 0,
    color: '#000',
  },
  avatarLargeImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '26px',
    display: 'block',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    width: '32px',
    height: '32px',
    backgroundColor: '#000',
    color: 'white',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid white',
    zIndex: 2,
    pointerEvents: 'none',
  },
  heroText: { display: 'flex', flexDirection: 'column', gap: '8px' },
  userName: { margin: 0, fontSize: '28px', fontWeight: '950', color: '#000', letterSpacing: '-1px' },
  userRoleBadge: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: ZAPTRO_FIELD_BG, borderRadius: '10px', fontSize: '12px', fontWeight: '900', color: '#000', width: 'fit-content' },
  
  vitrineHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  vitrineLogoArea: { display: 'flex', alignItems: 'center', gap: '24px' },
  companyLogoLarge: {
    width: '90px',
    height: '90px',
    borderRadius: '28px',
    backgroundColor: '#D9FF00',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: '950',
    position: 'relative',
    cursor: 'pointer',
    overflow: 'hidden',
    flexShrink: 0,
    border: 'none',
    padding: 0,
    fontFamily: 'inherit',
  },
  companyLogoLargeImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  obsBadge: { display: 'inline-flex', padding: '4px 10px', backgroundColor: ZAPTRO_FIELD_BG, borderRadius: '8px', fontSize: '11px', fontWeight: '900', color: '#000', marginTop: '6px' },
  saveBtnPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: ZAPTRO_FIELD_BG,
    color: '#000000',
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    borderRadius: '14px',
    fontWeight: '950',
    cursor: 'pointer',
    boxShadow: 'none',
  },
  
  divider: { height: '1px', backgroundColor: ZAPTRO_SECTION_BORDER, margin: '32px 0' },
  
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  infoFull: { gridColumn: '1 / -1' },
  infoField: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '950', color: ZAPTRO_TITLE_COLOR, textTransform: 'uppercase', letterSpacing: '1px' },
  inputStack: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '0 20px',
    minHeight: '52px',
    borderRadius: '16px',
    backgroundColor: ZAPTRO_FIELD_BG,
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    boxSizing: 'border-box',
  },
  inputStackArea: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '16px 20px',
    borderRadius: '20px',
    backgroundColor: ZAPTRO_FIELD_BG,
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    boxSizing: 'border-box',
  },
  input: { border: 'none', background: 'transparent', width: '100%', fontSize: '14px', fontWeight: '700', outline: 'none' },
  select: { border: 'none', background: 'transparent', width: '100%', fontSize: '14px', fontWeight: '800', outline: 'none' },
  textarea: { border: 'none', background: 'transparent', width: '100%', height: '120px', fontSize: '14px', fontWeight: '600', outline: 'none', resize: 'none' },
  valBox: {
    padding: '0 20px',
    minHeight: '52px',
    backgroundColor: ZAPTRO_FIELD_BG,
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    boxSizing: 'border-box',
  },
  profileActions: { display: 'flex', gap: '16px', marginTop: '40px' },
  submitBtn: { padding: '18px 48px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '18px', fontWeight: '950', fontSize: '14px', cursor: 'pointer' },
  cancelBtn: { padding: '18px 32px', backgroundColor: ZAPTRO_FIELD_BG, color: ZAPTRO_TITLE_COLOR, border: '1px solid #e4e4e7', borderRadius: '18px', fontWeight: '950', fontSize: '14px', cursor: 'pointer' },
  
  vitrineAlert: {
    display: 'flex',
    gap: '16px',
    padding: '20px 22px',
    marginBottom: '28px',
    borderRadius: '22px',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    alignItems: 'flex-start',
  },
  vitrineAlertTitle: { display: 'block', fontSize: '15px', fontWeight: 950, color: '#92400E', marginBottom: '8px' },
  vitrineAlertText: { margin: 0, fontSize: '13px', fontWeight: 600, color: '#A16207', lineHeight: 1.55 },
  vitrineAlertMissing: { margin: '12px 0 0', fontSize: '12px', fontWeight: 700, color: '#78350F', lineHeight: 1.45 },
  identityStrip: {
    marginBottom: '24px',
    padding: '16px 18px',
    borderRadius: '18px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  vitrinePreview: { marginTop: '40px', padding: '24px', backgroundColor: '#EEF2FF', borderRadius: '24px', color: '#4F46E5', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '16px' },

  // BANNER DE PLANO ANIMADO
  planBannerAnimated: { 
    padding: '48px', 
    backgroundColor: '#000', 
    borderRadius: '40px', 
    color: 'white', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '48px',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid #1E293B'
  },
  planContent: { position: 'relative', zIndex: 10 },
  planBadge: { display: 'inline-block', padding: '6px 12px', backgroundColor: 'rgba(217, 255, 0, 0.1)', color: '#D9FF00', borderRadius: '8px', fontSize: '10px', fontWeight: '950', marginBottom: '16px', letterSpacing: '1px' },
  planTitle: { margin: '0 0 8px 0', fontSize: '28px', fontWeight: '950', letterSpacing: '-1px' },
  planSub: { margin: 0, fontSize: '14px', color: '#94A3B8', fontWeight: '600' },
  priceTag: { fontSize: '32px', fontWeight: '950', marginTop: '24px', color: '#D9FF00' },
  planVisual: { position: 'absolute', right: '-100px', top: '-100px', width: '400px', height: '400px', opacity: 0.6 },
  aiWaveContainer: { position: 'relative', width: '100%', height: '100%' },
  aiWave: {
     position: 'absolute', width: '100%', height: '100%', 
     borderRadius: '50%', border: '2px solid #D9FF00', 
     animation: 'waveMove 6s linear infinite' 
  },

  billingSection: { display: 'flex', flexDirection: 'column', gap: '32px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: '15px', fontWeight: '950', color: '#0F172A', margin: 0 },
  masterSyncBadge: { fontSize: '10px', fontWeight: '950', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' },
  
  cardInfoBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', backgroundColor: ZAPTRO_FIELD_BG, borderRadius: '28px', border: `1px solid ${ZAPTRO_SECTION_BORDER}` },
  cardVisual: { display: 'flex', alignItems: 'center', gap: '24px' },
  methodIconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '18px',
    backgroundColor: '#ffffff',
    border: '1px solid #e4e4e7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: { display: 'flex', flexDirection: 'column', gap: '4px' },
  cardNum: { fontSize: '16px', fontWeight: '900', color: '#0F172A' },
  cardExp: { fontSize: '12px', fontWeight: '700', color: '#64748B' },
  editBtn: { padding: '14px 24px', backgroundColor: 'white', border: '1px solid #e4e4e7', borderRadius: '14px', fontSize: '13px', fontWeight: '950', cursor: 'pointer', transition: '0.2s' },

  // PAYMENT SELECTOR
  paymentSelector: { padding: '32px', backgroundColor: ZAPTRO_FIELD_BG, borderRadius: '28px', border: `1px solid ${ZAPTRO_SECTION_BORDER}`, animation: 'fadeIn 0.3s ease' },
  selectorTitle: { fontSize: '14px', fontWeight: '900', color: '#0F172A', marginBottom: '24px', margin: 0 },
  paymentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' },
  paymentOption: { 
     display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px',
     backgroundColor: 'white', border: '1px solid #e4e4e7', borderRadius: '20px',
     cursor: 'pointer', transition: '0.2s', fontWeight: '950', fontSize: '11px', textTransform: 'uppercase'
  },
  cancelLink: { border: 'none', background: 'transparent', color: '#64748B', fontSize: '12px', fontWeight: '800', marginTop: '20px', cursor: 'pointer', textDecoration: 'underline' },

  historyBox: { display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    backgroundColor: 'white',
    border: `1px solid ${ZAPTRO_SECTION_BORDER}`,
    borderRadius: '20px',
    cursor: 'pointer',
    transition: '0.15s ease',
  },
  historyInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  histDate: { fontSize: '15px', fontWeight: '900', color: '#0F172A' },
  histMethod: { fontSize: '11px', fontWeight: '700', color: '#94A3B8' },
  historyAmount: { display: 'flex', alignItems: 'center', gap: '20px' },
  amountWrap: { textAlign: 'right' },
  amountText: { fontSize: '15px', fontWeight: '950', color: '#000', display: 'block' },
  statusPill: { fontSize: '9px', fontWeight: '950', color: '#10B981', marginTop: '2px', textTransform: 'uppercase' },

  billingAlert: { marginTop: '48px', padding: '24px', backgroundColor: '#EEFCEF', borderRadius: '20px', color: '#10B981', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '14px' }
};

export default ZaptroProfile;

// Global Styles for Animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes waveMove {
      0% { transform: scale(0.5) translate(0, 0); opacity: 0; }
      50% { opacity: 0.5; }
      100% { transform: scale(1.8) translate(10%, -10%); opacity: 0; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}
