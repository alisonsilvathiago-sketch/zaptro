/** Handoff leve Mapa OSM → página Rotas (toast único ao abrir `/rotas`). */
export const ZAPTRO_MAP_ROUTE_HANDOFF_KEY = 'zaptro_map_route_handoff_v1';

export type ZaptroMapRouteHandoffPayload = {
  driverId: string;
  driverName: string;
  distanceKm: number;
  durationMin: number;
  createdAt: string;
};
