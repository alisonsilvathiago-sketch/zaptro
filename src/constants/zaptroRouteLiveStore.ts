/**
 * Estado de execução de rota em tempo real (demo local até WebSocket / Supabase).
 * Motorista grava; página pública `/acompanhar/:token` lê o mesmo `token`.
 */
import type { RouteExecutionStatus } from './zaptroRouteExecution';

/** Chave `localStorage` — útil para `storage` entre abas. */
export const ZAPTRO_ROUTE_LIVE_STORAGE_KEY = 'zaptro_route_live_v1';

const KEY = ZAPTRO_ROUTE_LIVE_STORAGE_KEY;

const LOCATION_TRAIL_MAX = 150;

export type RouteLiveTrailPoint = {
  lat: number;
  lng: number;
  at: string;
};

export type RouteLiveBucket = {
  status: RouteExecutionStatus;
  updatedAt: string;
  lastLat?: number;
  lastLng?: number;
  lastLocAt?: string;
  /** Pontos GPS gravados ao longo do tempo (demo local) — desenha o percurso no rastreio público. */
  locationTrail?: RouteLiveTrailPoint[];
  /** Pedido «Solicitar contacto com cliente» — visto pela operação no link público como aviso. */
  contactRequestedAt?: string | null;
  /** Motorista reportou problema. */
  issueReportedAt?: string | null;
  /** Nome da transportadora (Minha empresa / `whatsapp_companies.name`) — link público `/acompanhar`. */
  publicCompanyName?: string;
  /** Plano premium de marca no link público (espelha `RouteExecutionSnapshot`). */
  publicTrackPremiumBranding?: boolean;
  publicHeaderLogoUrl?: string | null;
  /** Quando a rota estiver associada a um registo em `whatsapp_drivers` (futuro / integração). */
  fleetDriverId?: string | null;
  /** Dados do motorista (preenchidos no link `/rota/:token`) — visíveis em `/rotas` e rastreio. */
  driverDisplayName?: string | null;
  driverAvatarUrl?: string | null;
  driverPhone?: string | null;
  driverVehicle?: string | null;
  /** Contadores locais até integração com backend. */
  driverStatsDeliveries?: number;
  driverStatsRoutes?: number;
};

function normToken(token: string) {
  return decodeURIComponent(token).trim();
}

export function readAllRouteLive(): Record<string, RouteLiveBucket> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Record<string, RouteLiveBucket>;
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

export function readRouteLive(token: string): RouteLiveBucket | null {
  const t = normToken(token);
  return readAllRouteLive()[t] ?? null;
}

function writeAll(map: Record<string, RouteLiveBucket>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

function appendTrailPoint(
  prevTrail: RouteLiveTrailPoint[] | undefined,
  lat: number,
  lng: number,
  at: string,
): RouteLiveTrailPoint[] {
  const next = prevTrail?.length ? [...prevTrail] : [];
  const last = next[next.length - 1];
  if (last && last.lat === lat && last.lng === lng) return next;
  next.push({ lat, lng, at });
  if (next.length > LOCATION_TRAIL_MAX) next.splice(0, next.length - LOCATION_TRAIL_MAX);
  return next;
}

/** Mescla estado da rota e notifica outras abas / página pública no mesmo browser. */
export function patchRouteLive(token: string, patch: Partial<RouteLiveBucket>): RouteLiveBucket {
  const t = normToken(token);
  const map = { ...readAllRouteLive() };
  const prev: RouteLiveBucket = map[t] || {
    status: 'assigned',
    updatedAt: new Date().toISOString(),
  };
  const next: RouteLiveBucket = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (typeof patch.lastLat === 'number' && typeof patch.lastLng === 'number') {
    const at =
      typeof patch.lastLocAt === 'string' && patch.lastLocAt.trim()
        ? patch.lastLocAt
        : typeof next.lastLocAt === 'string' && next.lastLocAt.trim()
          ? next.lastLocAt
          : next.updatedAt;
    next.locationTrail = appendTrailPoint(prev.locationTrail, patch.lastLat, patch.lastLng, at);
  }
  map[t] = next;
  writeAll(map);
  try {
    window.dispatchEvent(new CustomEvent('zaptro-route-live', { detail: { token: t } }));
  } catch {
    /* ignore */
  }
  return next;
}

/** Remove o bucket do token (ex.: rota criada por engano). Dispara `zaptro-route-live`. */
export function deleteRouteLiveToken(token: string): void {
  const t = normToken(token);
  const map = { ...readAllRouteLive() };
  if (map[t]) {
    delete map[t];
    writeAll(map);
  }
  try {
    window.dispatchEvent(new CustomEvent('zaptro-route-live', { detail: { token: t } }));
  } catch {
    /* ignore */
  }
}
