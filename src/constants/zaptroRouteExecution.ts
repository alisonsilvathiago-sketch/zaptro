/**
 * Modelo operacional Zaptro — execução de rota (motorista ≠ atendimento).
 *
 * Camadas:
 * - Cliente: link público só leitura + WhatsApp automático.
 * - Operação: CRM / logística cria rota, define motorista, dispara fluxos.
 * - Motorista: link privado (token) — atualiza status e localização; não é canal comercial.
 */

export type RouteExecutionStatus =
  | 'draft'
  | 'assigned'
  | 'started'
  | 'arrived'
  | 'delivered'
  | 'issue';

/** Ordem para UI e automações. */
export const ROUTE_STATUS_ORDER: RouteExecutionStatus[] = [
  'draft',
  'assigned',
  'started',
  'arrived',
  'delivered',
  'issue',
];

export const ROUTE_STATUS_LABEL: Record<RouteExecutionStatus, string> = {
  draft: 'Rascunho',
  assigned: 'Motorista definido',
  started: 'Rota iniciada',
  arrived: 'No local de entrega',
  delivered: 'Entrega realizada',
  issue: 'Problema reportado',
};

/** Eventos para futura fila (WhatsApp / webhooks) — nomes estáveis para backend. */
export const DRIVER_AUTOMATION_EVENTS = {
  ROUTE_STARTED: 'zaptro.route.driver_started',
  DRIVER_ARRIVED: 'zaptro.route.driver_arrived',
  DELIVERED: 'zaptro.route.delivered',
  ISSUE_REPORTED: 'zaptro.route.issue_reported',
  LOCATION_SHARED: 'zaptro.route.location_shared',
  CONTACT_REQUESTED: 'zaptro.route.contact_requested',
} as const;

export function zaptroDriverRoutePath(token: string): string {
  return `/rota/${encodeURIComponent(token)}`;
}

export function zaptroPublicTrackPath(token: string): string {
  return `/acompanhar/${encodeURIComponent(token)}`;
}

export type RouteExecutionSnapshot = {
  token: string;
  companyName: string;
  /**
   * Nome curto da transportadora (sem prefixo «Zaptro ·»).
   * No link público **sem** plano premium de marca, o cabeçalho mostra só isto.
   */
  carrierShortName?: string;
  /**
   * OURO / MASTER (ou equivalente): cabeçalho público com **logo** da empresa em vez do texto combinado.
   * Em produção vem da empresa da rota; em demo pode simular-se.
   */
  publicTrackPremiumBranding?: boolean;
  /** URL HTTPS do logo para o cabeçalho premium (quando `publicTrackPremiumBranding`). */
  publicHeaderLogoUrl?: string | null;
  /** Nome amigável da entrega / referência interna */
  deliveryLabel: string;
  customerName: string;
  deliveryAddress: string;
  driverDisplayName: string;
  status: RouteExecutionStatus;
  /** ISO — última atualização conhecida */
  updatedAt: string;
};
