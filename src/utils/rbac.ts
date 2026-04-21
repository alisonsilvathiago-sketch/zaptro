import type { UserRole } from '../types';

export const getHomePathForRole = (role?: UserRole): string => {
  switch (role) {
    case 'MASTER_ADMIN':
      return '/master-admin';
    case 'ADMIN':
      return '/dashboard';
    case 'CRM':
    case 'COMERCIAL':
      return '/crm';
    case 'RH':
      return '/rh';
    case 'LOGISTICA':
      return '/logistica';
    case 'FINANCEIRO':
      return '/financeiro';
    case 'MOTORISTA':
      return '/motorista/portal';
    case 'ESTOQUE':
    case 'ALMOXARIFADO':
      return '/estoque';
    case 'TREINAMENTOS':
      return '/treinamentos';
    default:
      return '/';
  }
};
