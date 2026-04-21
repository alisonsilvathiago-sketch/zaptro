import { isLogtaErpPath, isZaptroProductPath } from './domains';
import { ZAPTRO_ROUTES } from '../constants/zaptroRoutes';

/**
 * Rotas que exigem **entitlement** do produto Logta SaaS (ERP), excluindo:
 * - Zaptro (WhatsApp / painel Zaptro)
 * - Academy (`/treinamentos`)
 * - Área MASTER (`/master-admin`, `/master/*`)
 *
 * Usado pelo `ProtectedRoute` em conjunto com `profileHasLogtaErpAccess`.
 */
export function pathRequiresLogtaSaaSEntitlement(pathname: string): boolean {
  const p = pathname.split('?')[0];
  if (isZaptroProductPath(p)) return false;
  if (p.startsWith('/treinamentos')) return false;
  if (p.startsWith('/master-admin') || p.startsWith('/master/')) return false;
  if (p === ZAPTRO_ROUTES.PROFILE) return false;
  if (p === '/suspensao' || p === '/assinatura') return false;
  return isLogtaErpPath(p);
}
