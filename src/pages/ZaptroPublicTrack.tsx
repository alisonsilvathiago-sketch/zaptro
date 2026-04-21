import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Package, Truck, CheckCircle2, Building2, AlertTriangle, Phone, Zap } from 'lucide-react';
import {
  ROUTE_STATUS_LABEL,
  type RouteExecutionSnapshot,
  type RouteExecutionStatus,
} from '../constants/zaptroRouteExecution';
import {
  readRouteLive,
  ZAPTRO_ROUTE_LIVE_STORAGE_KEY,
  type RouteLiveBucket,
  type RouteLiveTrailPoint,
} from '../constants/zaptroRouteLiveStore';

const LIME = '#D9FF00';

/** Superfície neutra (chips / mapa) — cinza quente, um pouco mais escuro que o slate `#e2e8f0`. */
const PUBLIC_TRACK_NEUTRAL_SURFACE = '#f4f4f4';

/** Converte trilha GPS em coordenadas SVG (plano local; suficiente para percursos curtos). */
function trailPolylinePoints(trail: RouteLiveTrailPoint[]): React.ReactNode {
  if (trail.length === 0) return null;
  const lats = trail.map((t) => t.lat);
  const lngs = trail.map((t) => t.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padLat = Math.max((maxLat - minLat) * 0.12, 0.0004);
  const padLng = Math.max((maxLng - minLng) * 0.12, 0.0004);
  const loLat = minLat - padLat;
  const hiLat = maxLat + padLat;
  const loLng = minLng - padLng;
  const hiLng = maxLng + padLng;
  const denomLat = hiLat - loLat || 1;
  const denomLng = hiLng - loLng || 1;
  const w = 400;
  const h = 220;
  const pad = 14;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const toXY = (p: RouteLiveTrailPoint) => {
    const x = pad + ((p.lng - loLng) / denomLng) * innerW;
    const y = pad + (1 - (p.lat - loLat) / denomLat) * innerH;
    return { x, y };
  };
  const pts = trail.map(toXY);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <>
      {trail.length > 1 ? (
        <path
          d={d}
          fill="none"
          stroke={LIME}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.95}
        />
      ) : null}
      {pts.map((p, i) => (
        <circle
          key={`${trail[i].at}-${i}`}
          cx={p.x}
          cy={p.y}
          r={i === pts.length - 1 ? 6 : 3.5}
          fill={i === pts.length - 1 ? '#0f172a' : LIME}
          stroke="#fff"
          strokeWidth={1.5}
        />
      ))}
      {trail.length === 1 && last ? (
        <text x={last.x + 10} y={last.y - 8} fontSize={11} fontWeight={700} fill="#64748b">
          Última posição
        </text>
      ) : null}
    </>
  );
}

function resolveCarrierDisplayName(snap: RouteExecutionSnapshot): string {
  const short = snap.carrierShortName?.trim();
  if (short) return short;
  const stripped = snap.companyName.replace(/^\s*Zaptro\s*·\s*/i, '').trim();
  return stripped || snap.companyName;
}

function demoPublicSnapshot(token: string): RouteExecutionSnapshot {
  return {
    token,
    companyName: 'Zaptro · Transportadora demo',
    carrierShortName: 'Transportadora demo',
    publicTrackPremiumBranding: false,
    publicHeaderLogoUrl: null,
    deliveryLabel: `Acompanhar ${token.length > 6 ? token.slice(0, 8) : token}`,
    customerName: 'A sua encomenda',
    deliveryAddress: 'Av. Paulista, 1578 — Bela Vista, São Paulo · SP',
    driverDisplayName: 'Motorista atribuído',
    status: 'assigned',
    updatedAt: new Date().toISOString(),
  };
}

function mergeLive(snap: RouteExecutionSnapshot, live: RouteLiveBucket | null): RouteExecutionSnapshot {
  if (!live) return snap;
  const pubName = live.publicCompanyName?.trim();
  return {
    ...snap,
    status: live.status,
    updatedAt: live.updatedAt || snap.updatedAt,
    ...(pubName
      ? {
          companyName: `Zaptro · ${pubName}`,
          carrierShortName: pubName,
        }
      : {}),
    ...(typeof live.publicTrackPremiumBranding === 'boolean'
      ? { publicTrackPremiumBranding: live.publicTrackPremiumBranding }
      : {}),
    ...(live.publicHeaderLogoUrl !== undefined ? { publicHeaderLogoUrl: live.publicHeaderLogoUrl } : {}),
  };
}

/**
 * Link público do **cliente** — só leitura: estado, empresa, motorista (quando existir backend).
 * Não expõe ações de operação nem chat com motorista.
 */
const ZaptroPublicTrack: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const decoded = useMemo(() => decodeURIComponent(token) || 'demo', [token]);
  const baseSnap = useMemo(() => demoPublicSnapshot(decoded), [decoded]);

  const [live, setLive] = useState<RouteLiveBucket | null>(() => readRouteLive(decoded));

  const refreshLive = useCallback(() => {
    setLive(readRouteLive(decoded));
  }, [decoded]);

  useEffect(() => {
    refreshLive();
  }, [refreshLive]);

  useEffect(() => {
    const onLive = () => {
      refreshLive();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === ZAPTRO_ROUTE_LIVE_STORAGE_KEY) refreshLive();
    };
    window.addEventListener('zaptro-route-live', onLive);
    window.addEventListener('storage', onStorage);
    const t = window.setInterval(refreshLive, 2000);
    return () => {
      window.removeEventListener('zaptro-route-live', onLive);
      window.removeEventListener('storage', onStorage);
      window.clearInterval(t);
    };
  }, [decoded, refreshLive]);

  /** Evita `#root` / `body` brancos à volta da coluna centrada. */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;
    const prevBodyBgColor = body.style.backgroundColor;
    const prevRootBg = root?.style.background ?? '';
    const prevRootMinH = root?.style.minHeight ?? '';
    const prevRootColor = root?.style.color ?? '';
    html.style.background = PUBLIC_TRACK_NEUTRAL_SURFACE;
    body.style.background = PUBLIC_TRACK_NEUTRAL_SURFACE;
    body.style.backgroundColor = PUBLIC_TRACK_NEUTRAL_SURFACE;
    if (root) {
      root.style.background = PUBLIC_TRACK_NEUTRAL_SURFACE;
      root.style.minHeight = '100dvh';
      root.style.color = '';
    }
    return () => {
      html.style.background = prevHtmlBg;
      body.style.background = prevBodyBg;
      body.style.backgroundColor = prevBodyBgColor;
      if (root) {
        root.style.background = prevRootBg;
        root.style.minHeight = prevRootMinH;
        root.style.color = prevRootColor;
      }
    };
  }, []);

  const snap = mergeLive(baseSnap, live);
  const status: RouteExecutionStatus = snap.status;
  const carrierTitle = resolveCarrierDisplayName(snap);
  const premiumBranding = snap.publicTrackPremiumBranding === true;
  const headerLogoUrl = snap.publicHeaderLogoUrl?.trim();

  const steps: { key: RouteExecutionStatus; label: string }[] = [
    { key: 'assigned', label: 'Preparado' },
    { key: 'started', label: 'Em rota' },
    { key: 'arrived', label: 'Chegou' },
    { key: 'delivered', label: 'Entregue' },
  ];

  const idx = steps.findIndex((s) => s.key === status);
  const activeIdx = idx === -1 ? (status === 'delivered' ? 3 : status === 'issue' ? 1 : 0) : idx;

  const mapsUrl =
    live?.lastLat != null && live?.lastLng != null
      ? `https://www.google.com/maps?q=${live.lastLat},${live.lastLng}`
      : null;

  const displayTrail = useMemo((): RouteLiveTrailPoint[] => {
    if (!live) return [];
    const t = live.locationTrail;
    if (t && t.length > 0) return t;
    if (live.lastLat != null && live.lastLng != null) {
      return [{ lat: live.lastLat, lng: live.lastLng, at: live.lastLocAt || live.updatedAt }];
    }
    return [];
  }, [live]);

  const fmtTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div style={pageShell}>
      <div style={pageInner}>
      <header style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 950, letterSpacing: '0.2em', color: '#a1a1aa' }}>RASTREIO</p>
        <h1
          style={{
            margin: '10px 0 0',
            fontSize: 32,
            fontWeight: 950,
            color: '#0f172a',
            letterSpacing: '-0.04em',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            lineHeight: 1.15,
            minHeight: 40,
          }}
        >
          {premiumBranding && headerLogoUrl ? (
            <img
              src={headerLogoUrl}
              alt={carrierTitle}
              style={{ maxHeight: 44, maxWidth: 'min(100%, 280px)', width: 'auto', objectFit: 'contain' }}
            />
          ) : (
            carrierTitle
          )}
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: '#a1a1aa', fontWeight: 600 }}>{snap.deliveryLabel}</p>
      </header>

      {status === 'issue' || live?.issueReportedAt ? (
        <section
          style={{
            ...card,
            marginBottom: 16,
            borderColor: 'rgba(248,113,113,0.45)',
            backgroundColor: '#fff1f2',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertTriangle size={22} color="#b91c1c" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 950, color: '#991b1b' }}>Problema na entrega</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, color: '#7f1d1d', lineHeight: 1.45 }}>
                O motorista reportou um problema. A operação foi alertada — em produção isto dispara também WhatsApp interno.
              </p>
              {live?.issueReportedAt ? (
                <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>Registado: {fmtTime(live.issueReportedAt)}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {live?.contactRequestedAt ? (
        <section
          style={{
            ...card,
            marginBottom: 16,
            borderColor: 'rgba(217, 255, 0, 0.35)',
            backgroundColor: 'rgba(217, 255, 0, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Phone size={22} color="#D9FF00" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 950, color: '#1e40af' }}>Pedido de contacto com o cliente</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, color: '#000000', lineHeight: 1.45 }}>
                O motorista pediu apoio para falar com o cliente. A operação deve verificar e ligar se necessário.
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 700, color: '#D9FF00' }}>Pedido: {fmtTime(live.contactRequestedAt)}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Building2 size={20} color="#0f172a" />
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 950, color: '#94a3b8', letterSpacing: '0.08em' }}>MOTORISTA</p>
            <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 950, color: '#0f172a' }}>{snap.driverDisplayName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <MapPin size={20} color={LIME} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#334155', lineHeight: 1.45 }}>{snap.deliveryAddress}</p>
        </div>
      </section>

      {mapsUrl ? (
        <section style={card}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 950, color: '#64748b', letterSpacing: '0.1em' }}>ÚLTIMA POSIÇÃO</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 15,
              fontWeight: 950,
              color: '#0f172a',
            }}
          >
            <MapPin size={18} color={LIME} />
            Abrir no Google Maps
          </a>
          {live?.lastLocAt ? (
            <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Actualizado: {fmtTime(live.lastLocAt)}</p>
          ) : null}
        </section>
      ) : null}

      <section style={card}>
        <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 950, color: '#64748b', letterSpacing: '0.1em' }}>ESTADO ATUAL</p>
        <div style={{ fontSize: 20, fontWeight: 950, color: '#0f172a', marginBottom: 20 }}>{ROUTE_STATUS_LABEL[status]}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          {steps.map((s, i) => {
            const done = i <= activeIdx;
            return (
              <div key={s.key} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    margin: '0 auto 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? LIME : PUBLIC_TRACK_NEUTRAL_SURFACE,
                  }}
                >
                  {i === steps.length - 1 ? (
                    <CheckCircle2 size={20} color={done ? '#000' : '#94a3b8'} />
                  ) : (
                    <Truck size={20} color={done ? '#000' : '#94a3b8'} />
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: 900, color: done ? '#0f172a' : '#94a3b8' }}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <p style={{ margin: '18px 0 0', fontSize: 12, fontWeight: 600, color: '#94a3b8', lineHeight: 1.5 }}>
          Neste ambiente de demonstração, o estado e a posição vêm do mesmo browser em que o motorista usa o link da rota (mesmo token). Em produção, isto viria do servidor.
        </p>
      </section>

      <section style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Package size={22} color="#0f172a" />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#475569', lineHeight: 1.45 }}>
          Atualizações por WhatsApp são enviadas automaticamente quando o motorista muda o estado (saiu, chegou, entregue).
        </p>
      </section>

      {displayTrail.length > 0 ? (
        <section style={card}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 950, color: '#64748b', letterSpacing: '0.1em' }}>
            PERCURSO
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#64748b', lineHeight: 1.45 }}>
            Linha aproximada das posições partilhadas pelo motorista. Cada ponto mostra quando passou por ali (neste
            ambiente os dados ficam neste browser).
          </p>
          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              backgroundColor: PUBLIC_TRACK_NEUTRAL_SURFACE,
              marginBottom: 14,
            }}
          >
            <svg viewBox="0 0 400 220" width="100%" height="220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa esquemático do percurso">
              <rect width="400" height="220" fill="#ebebeb" />
              {trailPolylinePoints(displayTrail)}
            </svg>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 200, overflowY: 'auto' }}>
            {[...displayTrail]
              .reverse()
              .slice(0, 14)
              .map((pt, i) => (
                <li
                  key={`${pt.at}-${pt.lat}-${pt.lng}-${i}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 0',
                    borderTop: i === 0 ? 'none' : '1px solid #e2e8f0',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#475569',
                  }}
                >
                  <span style={{ color: '#94a3b8', fontWeight: 700, flexShrink: 0 }}>{fmtTime(pt.at)}</span>
                  <span style={{ textAlign: 'right', lineHeight: 1.35 }}>
                    {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                  </span>
                </li>
              ))}
          </ul>
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                marginTop: 12,
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 950,
                color: '#0f172a',
              }}
            >
              <MapPin size={18} color={LIME} />
              Abrir última posição no Google Maps
            </a>
          ) : null}
        </section>
      ) : null}

      {!premiumBranding ? (
        <section
          style={{
            ...card,
            padding: 0,
            overflow: 'hidden',
            borderColor: 'rgba(217,255,0,0.35)',
            marginTop: 99,
            marginBottom: 31,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '18px 16px 16px',
              borderBottom: '1px solid rgba(226,232,240,0.9)',
              backgroundColor: PUBLIC_TRACK_NEUTRAL_SURFACE,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <div
                title="Zaptro"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#000000',
                  border: `2px solid ${LIME}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Zap size={24} color={LIME} strokeWidth={2.4} aria-hidden />
              </div>
            </div>
            <Link
              to="/"
              style={{
                fontSize: 20,
                fontWeight: 950,
                color: '#000000',
                letterSpacing: '-0.03em',
                textDecoration: 'none',
              }}
            >
              Zaptro
            </Link>
          </div>
          <div
            style={{
              textAlign: 'center',
              padding: '26px 20px 28px',
              backgroundColor: PUBLIC_TRACK_NEUTRAL_SURFACE,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 950,
                color: '#0f172a',
                lineHeight: 1.2,
                letterSpacing: '-0.03em',
              }}
            >
              Do Zap ao fechamento
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 14, fontWeight: 600, color: '#64748b', lineHeight: 1.5 }}>
              Uma transportadora, um comando.
            </p>
          </div>
        </section>
      ) : null}
      </div>
    </div>
  );
};

const pageShell: React.CSSProperties = {
  minHeight: '100dvh',
  width: '100%',
  boxSizing: 'border-box',
  background: PUBLIC_TRACK_NEUTRAL_SURFACE,
};

const pageInner: React.CSSProperties = {
  maxWidth: 520,
  margin: '0 auto',
  padding: '24px 18px 40px',
  boxSizing: 'border-box',
};

const card: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 22,
  padding: 20,
  marginBottom: 16,
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 30px rgba(15,23,42,0.06)',
};

export default ZaptroPublicTrack;
