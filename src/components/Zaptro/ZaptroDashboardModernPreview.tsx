import React, { useId, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { resolveSessionAvatarUrl } from '../../utils/zaptroAvatar';
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Gift,
  Maximize2,
  Minus,
  Package,
  Phone,
  Plus,
  Route,
  Truck,
  Upload,
  Zap,
} from 'lucide-react';
import { useZaptroTheme } from '../../context/ZaptroThemeContext';
import DashboardMonochromeMap from './DashboardMonochromeMap';
import ZaptroKpiMetricCard from './ZaptroKpiMetricCard';
import { zaptroCardSurfaceStyle, zaptroIconOrbStyle } from '../../constants/zaptroCardSurface';
import { notifyZaptro } from './ZaptroNotificationSystem';

/** Mock — identidade preto + lime Zaptro (sem roxo: gráficos usam sempre `palette.lime`). */
const TEXT = '#000000';
const MUTED = '#6B7280';
const BLACK = '#000000';
const kpiBars = [
  { m: 'Jun', v: 12 },
  { m: 'Jul', v: 18 },
  { m: 'Ago', v: 14 },
  { m: 'Set', v: 22 },
];

const kpiWeightBars = [
  { i: 0, h: 40 },
  { i: 1, h: 65 },
  { i: 2, h: 35 },
  { i: 3, h: 80 },
  { i: 4, h: 50 },
];

const kpiDistanceLine = [
  { x: 0, y: 20 },
  { x: 1, y: 35 },
  { x: 2, y: 28 },
  { x: 3, y: 45 },
  { x: 4, y: 38 },
  { x: 5, y: 52 },
];

function ProgressRing({ pct, isDark, stroke }: { pct: number; isDark: boolean; stroke: string }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" aria-hidden>
      <circle cx="29" cy="29" r={r} fill="none" stroke={isDark ? '#334155' : '#e5e7eb'} strokeWidth={7} />
      <circle
        cx="29"
        cy="29"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={7}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 29 29)"
      />
    </svg>
  );
}

function ShipmentDonut({ isDark, accent }: { isDark: boolean; accent: string }) {
  const data = [
    { name: 'ok', value: 75, fill: accent },
    { name: 'nok', value: 25, fill: isDark ? '#0f172a' : '#000000' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 10, fontSize: 11, color: MUTED, fontWeight: 700 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: accent }} /> Taxa de sucesso
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: isDark ? '#94a3b8' : '#000000' }} /> Taxa sem sucesso
        </span>
      </div>
      <div style={{ width: 200, height: 200, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={68} outerRadius={92} paddingAngle={2} stroke="none">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 950, color: isDark ? '#f8fafc' : TEXT, letterSpacing: '-0.02em' }}>16th</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: subText(isDark), textTransform: 'uppercase' }}>March</span>
        </div>
      </div>
    </div>
  );
}

function subText(isDark: boolean) {
  return isDark ? '#94a3b8' : MUTED;
}

function formatDashHeaderDate(isoYmd: string): string {
  const [y, m, d] = isoYmd.split('-').map(Number);
  if (!y || !m || !d) return '—';
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

function todayIsoDate(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/**
 * Pré-visualização do painel Início — modelo logístico (dados fictícios).
 */
const ZaptroDashboardModernPreview: React.FC = () => {
  const areaGradId = useId().replace(/:/g, '');
  const { palette } = useZaptroTheme();
  const { profile } = useAuth();

  const sessionAvatarSrc = useMemo(() => resolveSessionAvatarUrl(profile), [profile]);
  const displayName = profile?.full_name?.trim() ?? '';
  const greetingLabel = displayName ? `Olá, ${displayName} 🚀` : 'Olá 🚀';

  const [dashDate, setDashDate] = useState(todayIsoDate);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isDark = palette.mode === 'dark';
  const text = isDark ? '#f8fafc' : TEXT;
  const sub = subText(isDark);
  /** Sempre a cor de marca do tema — evita roxo genérico do Recharts. */
  const accent = palette.lime;
  const barFillSoft = 'rgba(217, 255, 0, 0.5)';
  const c = () => zaptroCardSurfaceStyle(isDark);

  const kpis = useMemo(
    () => [
      {
        title: 'Encomendas este mês',
        value: '132',
        delta: '+25%',
        pos: true,
        icon: Gift,
        chart: 'bars' as const,
      },
      {
        title: 'Peso médio',
        value: '32lbs',
        delta: '+25%',
        pos: true,
        icon: Package,
        chart: 'vbars' as const,
      },
      {
        title: 'Distância média',
        value: '872mi',
        delta: '',
        icon: Route,
        chart: 'line' as const,
      },
    ],
    []
  );

  const invoiceSteps = useMemo(
    () => [
      { label: 'Inicial', active: false },
      { label: 'Preparação', active: false },
      { label: 'Chegada Assam', active: false },
      { label: 'Despachado', active: true },
      { label: 'A receber', active: false },
    ],
    []
  );

  const latestCustomers = useMemo(
    () => [
      { name: 'Jane Cooper', email: 'jane@example.com', amt: '$367', seed: 'jc' },
      { name: 'Robert Fox', email: 'robert@example.com', amt: '$3,467', seed: 'rf' },
      { name: 'Cameron Williamson', email: 'cameron@example.com', amt: '$892', seed: 'cw' },
    ],
    []
  );

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        backgroundColor: 'transparent',
        margin: 0,
        padding: '8px 8px 48px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1360, margin: '0 auto', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 36,
            flexWrap: 'wrap',
            minWidth: 0,
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0, flex: '1 1 280px' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 999,
                overflow: 'hidden',
                flexShrink: 0,
                border: isDark ? '2px solid rgba(255,255,255,0.14)' : '2px solid rgba(0,0,0,0.1)',
                backgroundColor: isDark ? '#000000' : '#0a0a0a',
                boxSizing: 'border-box',
              }}
            >
              {sessionAvatarSrc ? (
                <img
                  src={sessionAvatarSrc}
                  alt=""
                  width={76}
                  height={76}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accent,
                    fontWeight: 950,
                    fontSize: 28,
                    letterSpacing: '-0.02em',
                  }}
                  aria-hidden
                >
                  {(displayName || profile?.email || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 950,
                letterSpacing: '-0.04em',
                color: text,
                lineHeight: 1.12,
              }}
            >
              {greetingLabel}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
            <input
              ref={dateInputRef}
              type="date"
              value={dashDate}
              onChange={(e) => setDashDate(e.target.value)}
              aria-label="Escolher data de referência do painel"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                border: 0,
                opacity: 0,
              }}
            />
            <button
              type="button"
              onClick={() => {
                const el = dateInputRef.current;
                if (!el) return;
                if (typeof el.showPicker === 'function') {
                  try {
                    el.showPicker();
                  } catch {
                    el.click();
                  }
                } else {
                  el.click();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px',
                borderRadius: 999,
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f4f4f5',
                color: text,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            >
              <Calendar size={18} strokeWidth={2.2} color={sub} aria-hidden />
              {formatDashHeaderDate(dashDate)}
            </button>
            <button
              type="button"
              onClick={() =>
                notifyZaptro('info', 'Exportar', 'Pré-visualização: exportação do painel (PDF/Excel) será ligada ao backend em breve.')
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 999,
                border: 'none',
                background: '#000000',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            >
              <Upload size={18} strokeWidth={2.2} aria-hidden />
              Exportar
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: 16,
            marginBottom: 20,
          }}
        >
          {kpis.map((k) => {
            const KpiIcon = k.icon;
            return (
              <ZaptroKpiMetricCard
                key={k.title}
                icon={KpiIcon}
                title={k.title}
                value={k.value}
                delta={k.delta || undefined}
                deltaVariant={k.pos ? 'lime' : 'muted'}
                trailing={
                  <div style={{ width: '100%', height: 56 }}>
                    {k.chart === 'bars' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={kpiBars} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                          <Bar dataKey="v" fill={barFillSoft} stroke={accent} strokeWidth={0.5} radius={[3, 3, 0, 0]} maxBarSize={10} />
                          <XAxis dataKey="m" tick={{ fontSize: 8, fill: sub }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {k.chart === 'vbars' && (
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', gap: 3, paddingBottom: 2 }}>
                        {kpiWeightBars.map((b) => (
                          <div
                            key={b.i}
                            style={{
                              flex: 1,
                              height: `${b.h}%`,
                              borderRadius: 4,
                              background: b.i % 2 === 0 ? `${accent}44` : `${accent}cc`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {k.chart === 'line' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={kpiDistanceLine} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                              <stop offset="100%" stopColor={accent} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="y"
                            stroke={accent}
                            strokeWidth={2}
                            fill={`url(#${areaGradId})`}
                            dot={{ r: 3, fill: accent }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 18,
            alignItems: 'start',
          }}
        >
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ ...c(), padding: '22px 20px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 950, color: text }}>Informação da encomenda</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {[
                  { l: 'Comprimento', v: '12.2 m' },
                  { l: 'Largura', v: '2.4 m' },
                  { l: 'Altura', v: '2.9 m' },
                ].map((x) => (
                  <div
                    key={x.l}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 14,
                      background: isDark ? 'rgba(148,163,184,0.12)' : '#f3f4f6',
                      border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: sub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{x.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: text, marginTop: 2 }}>{x.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img
                  src="https://picsum.photos/seed/apollo-nox/96/96"
                  alt=""
                  width={52}
                  height={52}
                  style={{ borderRadius: 999, objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: text }}>Apollo Nox</div>
                  <div style={{ fontSize: 13, color: sub, marginTop: 2 }}>+1 (555) 482‑9011</div>
                </div>
                <button
                  type="button"
                  aria-label="Ligar"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    border: 'none',
                    background: '#000000',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  }}
                >
                  <Phone size={22} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div style={{ ...c(), padding: '22px 20px 18px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 950, color: text }}>Resumo do envio</h2>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: sub }}>Estado agregado da rota (demo)</p>
              <ShipmentDonut isDark={isDark} accent={accent} />
            </div>
          </div>

          {/* Center */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ ...c(), padding: '20px 20px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={zaptroIconOrbStyle({ size: 44, rounded: 'card' })}>
                    <Truck size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 950, color: text }}>Informação da encomenda</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: sub }}>Despachado · tempo estimado</p>
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'none',
                    color: accent,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Ver mais <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>

              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: isDark ? '#334155' : '#e5e7eb',
                  overflow: 'hidden',
                  marginBottom: 18,
                }}
              >
                <div style={{ width: '42%', height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${accent}, ${BLACK})` }} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Progresso
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: text }}>Despachado</span>
                    <span style={{ color: sub, fontSize: 12 }}>→</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: sub }}>Tempo estimado</span>
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 16,
                    background: isDark ? 'rgba(148,163,184,0.08)' : '#fafafa',
                    border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, color: text, marginBottom: 10 }}>Fatura #0472</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {invoiceSteps.map((s) => (
                      <div
                        key={s.label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 12,
                          color: s.active ? text : sub,
                          fontWeight: s.active ? 850 : 600,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: s.active ? accent : 'transparent',
                              border: `2px solid ${s.active ? accent : sub}`,
                            }}
                          />
                          {s.label}
                        </span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>22:07</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ProgressRing pct={25} isDark={isDark} stroke={accent} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: text }}>25% concluído</div>
                    <div style={{ fontSize: 11, color: sub }}>Estado global da encomenda</div>
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`,
                    background: isDark ? '#0f172a' : '#fff',
                    color: text,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Ver produtos
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            <div style={{ ...c(), padding: '18px 18px 16px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 950, color: text }}>Últimos clientes</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {latestCustomers.map((u) => (
                  <div
                    key={u.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: `1px solid ${isDark ? '#334155' : '#f3f4f6'}`,
                    }}
                  >
                    <img
                      src={`https://picsum.photos/seed/${u.seed}/80/80`}
                      alt=""
                      width={44}
                      height={44}
                      style={{ borderRadius: 999, objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: text }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: sub, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 950, color: text }}>{u.amt}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: map */}
          <div style={{ ...c(), padding: 0, overflow: 'hidden', minHeight: 560 }}>
            <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 950, color: text }}>Rotas de hoje</h2>
              <Zap size={18} color={accent} />
            </div>
            <div
              style={{
                position: 'relative',
                margin: '0 16px 16px',
                borderRadius: 22,
                minHeight: 440,
                overflow: 'hidden',
              }}
            >
              <DashboardMonochromeMap isDark={isDark} height={440} crmStorageId={profile?.company_id ?? 'local-demo'} />
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  pointerEvents: 'auto',
                }}
              >
                <button type="button" style={mapFab(isDark)} aria-label="Zoom in (visual)">
                  <Plus size={16} />
                </button>
                <button type="button" style={mapFab(isDark)} aria-label="Zoom out (visual)">
                  <Minus size={16} />
                </button>
                <button type="button" style={{ ...mapFab(isDark), marginTop: 4 }} aria-label="Ecrã completo (visual)">
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>
            <div
              style={{
                padding: '12px 20px 22px',
                borderTop: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                fontSize: 14,
                fontWeight: 900,
                color: text,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: sub, fontWeight: 700, fontSize: 13 }}>Distância</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                1.600 <span style={{ color: sub, fontWeight: 600 }}>/</span> 2.700 km
              </span>
            </div>
          </div>
        </div>

        <p style={{ margin: '24px 0 0', fontSize: 12, color: sub, textAlign: 'center', lineHeight: 1.5 }}>
          Para o painel Zaptro clássico: <code style={{ fontSize: 11 }}>ZAPTRO_DASHBOARD_MODERN_PREVIEW = false</code> em{' '}
          <code style={{ fontSize: 11 }}>ZaptroDashboard.tsx</code>.
        </p>
      </div>
    </div>
  );
}

function mapFab(isDark: boolean): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `1px solid ${isDark ? '#475569' : '#fff'}`,
    background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: TEXT,
  };
}

export default ZaptroDashboardModernPreview;
