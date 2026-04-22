import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, MapPin, Navigation, Package, Phone, Truck, AlertTriangle, Sparkles } from 'lucide-react';
import {
  DRIVER_AUTOMATION_EVENTS,
  ROUTE_STATUS_LABEL,
  zaptroPublicTrackPath,
  type RouteExecutionSnapshot,
  type RouteExecutionStatus,
} from '../constants/zaptroRouteExecution';
import { patchRouteLive, readRouteLive, type RouteLiveBucket } from '../constants/zaptroRouteLiveStore';
import { notifyZaptro } from '../components/Zaptro/ZaptroNotificationSystem';
import {
  readZaptroDriverSelfProfile,
  writeZaptroDriverSelfProfile,
  zaptroCompressImageToDataUrl,
  zaptroProfileInitials,
  type ZaptroDriverSelfProfile,
} from '../utils/zaptroDriverSelfProfile';
import { supabaseZaptro } from '../lib/supabase-zaptro';
import { fireTransactionalEmailNonBlocking } from '../lib/fireTransactionalEmail';

const LIME = '#D9FF00';

const DRIVER_PAGE_BG = 'linear-gradient(180deg, #0a0a0a 0%, #111 40%, #0a0a0a 100%)';

/** Full viewport — evita faixas brancas do `body`/`#root` à volta da coluna de 520px. */
const pageShell: React.CSSProperties = {
  minHeight: '100dvh',
  width: '100%',
  boxSizing: 'border-box',
  background: DRIVER_PAGE_BG,
  color: '#f8fafc',
};

const pageInner: React.CSSProperties = {
  maxWidth: 520,
  margin: '0 auto',
  padding: '20px 18px 32px',
  boxSizing: 'border-box',
};

function demoSnapshot(token: string): RouteExecutionSnapshot {
  return {
    token,
    companyName: 'Zaptro · Transportadora demo',
    deliveryLabel: `Rota ${token.length > 6 ? token.slice(0, 8) : token}`,
    customerName: 'Cliente final (visível só para operação)',
    deliveryAddress: 'Av. Paulista, 1578 — Bela Vista, São Paulo · SP',
    driverDisplayName: 'Você (motorista)',
    status: 'assigned',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Link privado do motorista — **não** é atendimento nem CRM.
 * Mobile-first; token na URL substitui login pesado até existir backend.
 */
const ZaptroDriverRoute: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const decoded = useMemo(() => decodeURIComponent(token) || 'demo', [token]);
  const base = useMemo(() => demoSnapshot(decoded), [decoded]);
  const [status, setStatus] = useState<RouteExecutionStatus>(base.status);
  const [locActive, setLocActive] = useState(false);
  /** Espelha se existe `watchPosition` activo — não ler `watchRef` no render (ESLint react-hooks/refs). */
  const [gpsWatchActive, setGpsWatchActive] = useState(false);
  const [liveBucket, setLiveBucket] = useState<RouteLiveBucket | null>(() => readRouteLive(decoded));
  const [profile, setProfile] = useState<ZaptroDriverSelfProfile>(() => readZaptroDriverSelfProfile());
  const [coPhotoFail, setCoPhotoFail] = useState(false);
  const [drPhotoFail, setDrPhotoFail] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const watchRef = useRef<number | null>(null);
  const lastPersistRef = useRef(0);
  const routeNotifyEmailSentRef = useRef(false);

  const pushDriverProfileToLive = useCallback(
    (p: ZaptroDriverSelfProfile) => {
      patchRouteLive(decoded, {
        driverDisplayName: p.displayName.trim() || base.driverDisplayName,
        driverPhone: p.phone.trim() || null,
        driverVehicle: p.vehicle.trim() || null,
        driverAvatarUrl: p.avatarUrl,
        driverStatsDeliveries: p.deliveries,
        driverStatsRoutes: p.routes,
      });
      setLiveBucket(readRouteLive(decoded));
    },
    [decoded, base.driverDisplayName],
  );

  useEffect(() => {
    const live = readRouteLive(decoded);
    setLiveBucket(live);
    if (live?.status) setStatus(live.status);
  }, [decoded]);

  useEffect(() => {
    const h = () => {
      const live = readRouteLive(decoded);
      setLiveBucket(live);
      if (live?.status) setStatus(live.status);
    };
    window.addEventListener('zaptro-route-live', h);
    return () => window.removeEventListener('zaptro-route-live', h);
  }, [decoded]);

  useEffect(() => {
    const p = readZaptroDriverSelfProfile();
    setProfile(p);
    pushDriverProfileToLive(p);
  }, [decoded, pushDriverProfileToLive]);

  const saveDriverProfile = () => {
    try {
      writeZaptroDriverSelfProfile(profile);
    } catch {
      notifyZaptro('error', 'Perfil', 'Não foi possível guardar (imagem demasiado grande?). Reduza a foto ou remova a foto.');
      return;
    }
    pushDriverProfileToLive(profile);
    notifyZaptro('success', 'Perfil', 'Dados do motorista guardados neste aparelho e espelhados na lista de rotas.');
  };

  useEffect(() => {
    setCoPhotoFail(false);
    setDrPhotoFail(false);
  }, [liveBucket?.publicHeaderLogoUrl, profile.avatarUrl]);

  useEffect(() => {
    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
        setGpsWatchActive(false);
      }
    };
  }, []);

  /** Alinha `html` / `body` / `#root` ao fundo escuro desta rota (evita branco por trás do shell). */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;
    const prevBodyBgColor = body.style.backgroundColor;
    const prevRootBg = root?.style.background ?? '';
    const prevRootMinH = root?.style.minHeight ?? '';
    html.style.background = DRIVER_PAGE_BG;
    body.style.background = DRIVER_PAGE_BG;
    body.style.backgroundColor = '';
    if (root) {
      root.style.background = DRIVER_PAGE_BG;
      root.style.minHeight = '100dvh';
    }
    return () => {
      html.style.background = prevHtmlBg;
      body.style.background = prevBodyBg;
      body.style.backgroundColor = prevBodyBgColor;
      if (root) {
        root.style.background = prevRootBg;
        root.style.minHeight = prevRootMinH;
      }
    };
  }, []);

  const pushAutomation = (event: string, human: string) => {
    notifyZaptro('success', 'Automação (prévia)', `${human} Evento: ${event} — em produção dispara WhatsApp ao cliente.`);
  };

  const persistStatus = (next: RouteExecutionStatus, extra?: Partial<RouteLiveBucket>) => {
    patchRouteLive(decoded, { status: next, ...extra });
  };

  const setStep = (next: RouteExecutionStatus, event: string, msg: string) => {
    setStatus(next);
    persistStatus(next);
    pushAutomation(event, msg);

    const live = readRouteLive(decoded);
    const to = live?.opsNotifyEmail?.trim() ?? '';
    if (to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) && (next === 'started' || next === 'delivered')) {
      const trackUrl = `${window.location.origin}${zaptroPublicTrackPath(decoded)}`;
      const kind = next === 'started' ? 'delivery_started' : 'delivery_completed';
      fireTransactionalEmailNonBlocking(supabaseZaptro, {
        kind,
        to,
        variables: {
          userName: live?.publicCompanyName || 'Operação',
          message: msg,
          routeLabel: live?.publicCompanyName ? `${live.publicCompanyName} · ${decoded}` : decoded,
          ctaUrl: trackUrl,
          ctaLabel: 'Acompanhar entrega',
        },
      });
    }
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      notifyZaptro('warning', 'Localização', 'Geolocalização não disponível neste dispositivo.');
      return;
    }

    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setGpsWatchActive(false);
      setLocActive(false);
      routeNotifyEmailSentRef.current = false;
      notifyZaptro('info', 'Localização', 'Partilha em tempo real parada. O cliente deixa de receber novas coordenadas neste browser.');
      return;
    }

    if (!routeNotifyEmailSentRef.current) {
      routeNotifyEmailSentRef.current = true;
      const live = readRouteLive(decoded);
      const to = live?.opsNotifyEmail?.trim() ?? '';
      if (to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        const trackUrl = `${window.location.origin}${zaptroPublicTrackPath(decoded)}`;
        fireTransactionalEmailNonBlocking(supabaseZaptro, {
          kind: 'route_notification',
          to,
          variables: {
            userName: live?.publicCompanyName || 'Operação',
            message: 'A partilha de localização em tempo real foi activada para esta rota.',
            routeLabel: live?.publicCompanyName ? `${live.publicCompanyName} · ${decoded}` : decoded,
            ctaUrl: trackUrl,
            ctaLabel: 'Ver mapa público',
          },
        });
      }
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastPersistRef.current < 3500) return;
        lastPersistRef.current = now;
        patchRouteLive(decoded, {
          lastLat: pos.coords.latitude,
          lastLng: pos.coords.longitude,
          lastLocAt: new Date().toISOString(),
        });
        setLocActive(true);
      },
      () => {
        notifyZaptro('error', 'Localização', 'Permissão negada ou GPS indisponível.');
        if (watchRef.current != null) {
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
        setGpsWatchActive(false);
        setLocActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 20_000 }
    );

    setGpsWatchActive(true);
    setLocActive(true);
    pushAutomation(DRIVER_AUTOMATION_EVENTS.LOCATION_SHARED, 'Partilha de localização activa — o cliente vê coordenadas no link público (neste dispositivo).');
  };

  const requestCustomerContact = () => {
    patchRouteLive(decoded, { contactRequestedAt: new Date().toISOString() });
    pushAutomation(
      DRIVER_AUTOMATION_EVENTS.CONTACT_REQUESTED,
      'Pedido registado: a operação vê o alerta no rastreio público e pode ligar ao cliente por ti.'
    );
  };

  const reportIssue = () => {
    setStatus('issue');
    persistStatus('issue', { issueReportedAt: new Date().toISOString() });
    pushAutomation(DRIVER_AUTOMATION_EVENTS.ISSUE_REPORTED, 'Problema na entrega — estado actualizado para o cliente e para a equipa.');
    const live = readRouteLive(decoded);
    const to = live?.opsNotifyEmail?.trim() ?? '';
    if (to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      const trackUrl = `${window.location.origin}${zaptroPublicTrackPath(decoded)}`;
      fireTransactionalEmailNonBlocking(supabaseZaptro, {
        kind: 'delivery_status',
        to,
        variables: {
          userName: live?.publicCompanyName || 'Operação',
          status: 'Problema reportado',
          message: 'O motorista reportou um problema nesta entrega.',
          ctaUrl: trackUrl,
          ctaLabel: 'Ver rastreio',
        },
      });
    }
  };

  const btn = (active: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '16px 18px',
    borderRadius: 16,
    border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
    backgroundColor: active ? LIME : 'rgba(255,255,255,0.06)',
    color: active ? '#000' : '#f8fafc',
    fontWeight: 950,
    fontSize: 15,
    cursor: 'pointer',
    textAlign: 'center',
  });

  const canStart = status === 'assigned' || status === 'draft';
  const problemDisabled = status === 'delivered' || status === 'issue';

  const companyUrl = liveBucket?.publicHeaderLogoUrl?.trim() || null;
  const displayName = (profile.displayName.trim() || base.driverDisplayName).trim();
  const driverInitials = zaptroProfileInitials(displayName);
  const lastLat = liveBucket?.lastLat;
  const lastLng = liveBucket?.lastLng;
  const mapHref =
    lastLat != null && lastLng != null ? `https://www.google.com/maps?q=${lastLat},${lastLng}` : null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
  };

  const avatarShell = (side: 'company' | 'driver'): React.CSSProperties => ({
    width: 56,
    height: 56,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.12)',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: side === 'company' ? 'rgba(37,99,235,0.2)' : 'rgba(148,163,184,0.18)',
  });

  return (
    <div style={pageShell}>
      <div style={pageInner}>
      <header style={head}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={logo}>
            <Truck size={22} color="#000" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 950, letterSpacing: '0.14em', color: 'rgba(248,250,252,0.55)' }}>
              MOTORISTA · EXECUÇÃO DE ROTA
            </p>
            <h1 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 950, color: '#fff', letterSpacing: '-0.03em' }}>Zaptro</h1>
          </div>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 13, color: 'rgba(248,250,252,0.75)', lineHeight: 1.45, fontWeight: 600 }}>
          Este ecrã é só para <strong style={{ color: '#fff' }}>atualizar estado e posição</strong>. Dúvidas comerciais ficam na operação.
        </p>
      </header>

      <main style={main}>
        <section style={card}>
          <p style={eyebrow}>QUEM ESTÁ NESTA ROTA</p>
          <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 950, letterSpacing: '0.12em', color: 'rgba(248,250,252,0.45)' }}>EMPRESA</span>
              <div style={avatarShell('company')}>
                {companyUrl && !coPhotoFail ? (
                  <img
                    src={companyUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setCoPhotoFail(true)}
                  />
                ) : (
                  <Building2 size={26} color="#D9FF00" strokeWidth={2.2} />
                )}
              </div>
            </div>
            <div style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 950, letterSpacing: '0.12em', color: 'rgba(248,250,252,0.45)' }}>MOTORISTA</span>
              <div style={avatarShell('driver')}>
                {profile.avatarUrl && !drPhotoFail ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setDrPhotoFail(true)}
                  />
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 950, color: '#e2e8f0' }}>{driverInitials === '·' ? 'Mt' : driverInitials}</span>
                )}
              </div>
            </div>
          </div>
          <h2 style={{ margin: '14px 0 6px', fontSize: 20, fontWeight: 950, color: '#fff', letterSpacing: '-0.03em' }}>{displayName}</h2>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(248,250,252,0.78)', lineHeight: 1.45 }}>
            {profile.phone.trim() || '—'} · {profile.vehicle.trim() || 'Veículo não indicado'}
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14 }}>
            <MapPin size={18} color={LIME} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', color: 'rgba(248,250,252,0.45)' }}>MORADA DA ENTREGA</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: 'rgba(248,250,252,0.9)', lineHeight: 1.45 }}>{base.deliveryAddress}</p>
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, fontWeight: 600, color: 'rgba(248,250,252,0.55)', lineHeight: 1.45 }}>
            {mapHref ? (
              <>
                Onde estás (último GPS):{' '}
                <a href={mapHref} target="_blank" rel="noreferrer" style={{ color: LIME, fontWeight: 950 }}>
                  abrir no mapa
                </a>
              </>
            ) : (
              'Sem coordenadas GPS neste momento — usa “Partilhar localização” abaixo.'
            )}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <span
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                backgroundColor: 'rgba(217,255,0,0.12)',
                border: '1px solid rgba(217,255,0,0.35)',
                fontSize: 12,
                fontWeight: 950,
                color: LIME,
              }}
            >
              {profile.deliveries} entregas
            </span>
            <span
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 12,
                fontWeight: 950,
                color: '#e2e8f0',
              }}
            >
              {profile.routes} rotas
            </span>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.4)', lineHeight: 1.4 }}>
            Números locais até haver histórico na conta — altera em “Editar os meus dados”.
          </p>
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 950, fontSize: 13, color: LIME, listStyle: 'none' } as React.CSSProperties}>
              Editar os meus dados neste aparelho
            </summary>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 950, color: 'rgba(248,250,252,0.5)' }}>
                Nome
                <input
                  style={{ ...inputStyle, marginTop: 6 }}
                  value={profile.displayName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Ex.: João Silva"
                />
              </label>
              <label style={{ fontSize: 11, fontWeight: 950, color: 'rgba(248,250,252,0.5)' }}>
                Telemóvel
                <input
                  style={{ ...inputStyle, marginTop: 6 }}
                  value={profile.phone}
                  onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+351 …"
                />
              </label>
              <label style={{ fontSize: 11, fontWeight: 950, color: 'rgba(248,250,252,0.5)' }}>
                Veículo
                <input
                  style={{ ...inputStyle, marginTop: 6 }}
                  value={profile.vehicle}
                  onChange={(e) => setProfile((prev) => ({ ...prev, vehicle: e.target.value }))}
                  placeholder="Ex.: Van branca · AA-00-BB"
                />
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={{ fontSize: 11, fontWeight: 950, color: 'rgba(248,250,252,0.5)', flex: '1 1 120px' }}>
                  Entregas (contador local)
                  <input
                    type="number"
                    min={0}
                    style={{ ...inputStyle, marginTop: 6 }}
                    value={profile.deliveries}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, deliveries: Math.max(0, Number(e.target.value) || 0) }))
                    }
                  />
                </label>
                <label style={{ fontSize: 11, fontWeight: 950, color: 'rgba(248,250,252,0.5)', flex: '1 1 120px' }}>
                  Rotas (contador local)
                  <input
                    type="number"
                    min={0}
                    style={{ ...inputStyle, marginTop: 6 }}
                    value={profile.routes}
                    onChange={(e) => setProfile((prev) => ({ ...prev, routes: Math.max(0, Number(e.target.value) || 0) }))
                    }
                  />
                </label>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  style={{ ...btn(false), width: 'auto', padding: '12px 16px', fontSize: 13 }}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Escolher foto de perfil
                </button>
                {profile.avatarUrl ? (
                  <button
                    type="button"
                    style={{ ...btn(false), width: 'auto', padding: '12px 16px', fontSize: 13, opacity: 0.85 }}
                    onClick={() => setProfile((prev) => ({ ...prev, avatarUrl: null }))}
                  >
                    Remover foto
                  </button>
                ) : null}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  const url = await zaptroCompressImageToDataUrl(f);
                  if (url) setProfile((prev) => ({ ...prev, avatarUrl: url }));
                  else notifyZaptro('warning', 'Foto', 'Não foi possível ler a imagem.');
                }}
              />
              <button type="button" style={{ ...btn(true), marginTop: 4 }} onClick={saveDriverProfile}>
                Guardar e actualizar /rotas
              </button>
            </div>
          </details>
        </section>

        <section style={card}>
          <p style={eyebrow}>{base.companyName}</p>
          <h2 style={{ margin: '6px 0 8px', fontSize: 22, fontWeight: 950, color: '#fff', letterSpacing: '-0.04em' }}>{base.deliveryLabel}</h2>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <MapPin size={18} color={LIME} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(248,250,252,0.88)', lineHeight: 1.45 }}>{base.deliveryAddress}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Package size={16} color="rgba(248,250,252,0.55)" />
            <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(248,250,252,0.55)' }}>Cliente (referência interna)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>{base.customerName}</span>
          </div>
          <div style={statusPill}>
            <Navigation size={16} color="#000" />
            <span style={{ fontWeight: 950, color: '#000' }}>{ROUTE_STATUS_LABEL[status]}</span>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            disabled={!canStart}
            style={{ ...btn(status === 'started'), opacity: canStart ? 1 : 0.45 }}
            onClick={() => setStep('started', DRIVER_AUTOMATION_EVENTS.ROUTE_STARTED, 'Rota iniciada — cliente pode receber “saiu para entrega”.')}
          >
            Iniciar rota
          </button>
          <button
            type="button"
            disabled={status !== 'started'}
            style={{ ...btn(status === 'arrived'), opacity: status === 'started' ? 1 : 0.45 }}
            onClick={() => setStep('arrived', DRIVER_AUTOMATION_EVENTS.DRIVER_ARRIVED, 'Chegou ao local — cliente pode receber “motorista a chegar”.')}
          >
            Cheguei no local
          </button>
          <button
            type="button"
            disabled={status !== 'arrived'}
            style={{ ...btn(status === 'delivered'), opacity: status === 'arrived' ? 1 : 0.45 }}
            onClick={() => setStep('delivered', DRIVER_AUTOMATION_EVENTS.DELIVERED, 'Entrega concluída — cliente recebe confirmação.')}
          >
            Entrega realizada
          </button>
          <button
            type="button"
            disabled={problemDisabled}
            style={{
              ...btn(false),
              borderColor: 'rgba(248,113,113,0.45)',
              color: '#fecaca',
              opacity: problemDisabled ? 0.45 : 1,
            }}
            onClick={reportIssue}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AlertTriangle size={18} /> Problema na entrega
            </span>
          </button>
        </section>

        <section style={card}>
          <button type="button" style={{ ...btn(locActive), marginBottom: 12 }} onClick={shareLocation}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <MapPin size={20} /> {locActive && gpsWatchActive ? 'Parar partilha' : locActive ? 'Partilhar de novo' : 'Partilhar localização'}
            </span>
          </button>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(248,250,252,0.55)', lineHeight: 1.45 }}>
            {locActive && gpsWatchActive
              ? 'GPS activo: a posição actualiza-se no link público do cliente (mesmo token, neste browser).'
              : 'Toca para ligar o GPS em tempo real. Toca outra vez para parar. O cliente vê no /acompanhar/…'}
          </p>
        </section>

        <section style={card}>
          <button type="button" style={{ ...btn(false), marginBottom: 10 }} onClick={requestCustomerContact}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Phone size={18} /> Solicitar contacto com cliente
            </span>
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Sparkles size={16} color={LIME} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(248,250,252,0.65)', lineHeight: 1.45 }}>
              O pedido fica visível no <strong style={{ color: '#e2e8f0' }}>rastreio público</strong> para a operação ver. Não liga o teu número ao cliente automaticamente.
            </p>
          </div>
        </section>

        <footer style={{ marginTop: 8, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.35)' }}>
          Token: {decoded} · Estado guardado localmente para o cliente acompanhar
        </footer>
      </main>
      </div>
    </div>
  );
};

const head: React.CSSProperties = { marginBottom: 22 };

const logo: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  backgroundColor: LIME,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const main: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 18 };

const card: React.CSSProperties = {
  padding: 18,
  borderRadius: 22,
  border: '1px solid rgba(255,255,255,0.08)',
  backgroundColor: 'rgba(255,255,255,0.04)',
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: '0.12em',
  color: 'rgba(248,250,252,0.45)',
};

const statusPill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 999,
  backgroundColor: LIME,
  width: 'fit-content',
};

export default ZaptroDriverRoute;
