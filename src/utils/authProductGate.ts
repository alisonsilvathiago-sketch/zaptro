import type { Profile } from '../types';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';

type AccessSlice =
  | Pick<Profile, 'role' | 'company_id'>
  | any;

const isMaster = (role?: string) =>
  !!role && (role.toUpperCase() === 'MASTER' || role.startsWith('MASTER_') || role.toUpperCase() === 'ADMIN');

/**
 * Produto Zaptro: instância WhatsApp / painel WaaS.
 * 🚀 MODO SIMPLIFICADO: Se for ADMIN ou MASTER, tem acesso total.
 */
export const profileHasZaptroProductAccess = (p: AccessSlice): boolean => {
  if (!p) return false;
  // Se for ADMIN da empresa ou Master Admin, libera acesso total
  if (isMaster(p.role) || p.role === 'ADMIN') return true;
  return true; // Liberando geral para desenvolvimento inicial
};

export const profileHasLogtaErpAccess = (p: AccessSlice): boolean => {
  return true; // Liberando para desenvolvimento
};

export const profileHasLogtaSaasProductAccess = profileHasLogtaErpAccess;

export const profileHasAcademyAccess = (p: AccessSlice): boolean => true;

export const profileHasWhiteLabelPermission = (p: AccessSlice, companyPlan?: string): boolean => {
  return true; // Liberando para desenvolvimento
};

export function resolveBestProductHomePath(p: AccessSlice): string {
  if (!p) return '/login';
  return '/dashboard';
}
