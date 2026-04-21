import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isZaptroTenantAdminRole, hasZaptroGranularPermission } from '../../utils/zaptroPermissions';
import { ZAPTRO_ROUTES } from '../../constants/zaptroRoutes';
import {
  ZAPTRO_COLLABORATOR_PAGE_ORDER,
  zaptroPageIdToPrimaryPath,
} from '../../utils/zaptroPagePermissionMap';
import Loading from '../Loading';

type Props = {
  children: React.ReactNode;
  /** Uma permissão basta (ex.: `equipe`). */
  pageId?: string;
  /** Qualquer uma das permissões (ex.: secções de `/configuracao`). */
  anyOf?: string[];
};

function firstNavigableZaptroPath(
  role: string | null | undefined,
  permissions: string[] | null | undefined,
  isMaster: boolean
): string {
  if (isMaster || isZaptroTenantAdminRole(role)) return ZAPTRO_ROUTES.DASHBOARD;
  for (const id of ZAPTRO_COLLABORATOR_PAGE_ORDER) {
    if (hasZaptroGranularPermission(role, permissions, id)) return zaptroPageIdToPrimaryPath(id);
  }
  return ZAPTRO_ROUTES.PROFILE;
}

/**
 * Protege uma rota Zaptro por `profiles.permissions` (ADMIN/MASTER ignoram).
 * Sem `pageId` nem `anyOf`, nega acesso a quem não é ADMIN/MASTER (comportamento legado de “só dono”).
 */
const ZaptroPagePermissionRoute: React.FC<Props> = ({ children, pageId, anyOf }) => {
  const { profile, isLoading, isMaster } = useAuth();

  const redirectTo = useMemo(
    () => firstNavigableZaptroPath(profile?.role, profile?.permissions, isMaster),
    [profile?.role, profile?.permissions, isMaster],
  );

  if (isLoading) {
    return <Loading message="Verificando permissões…" />;
  }

  if (isMaster || isZaptroTenantAdminRole(profile?.role)) {
    return <>{children}</>;
  }

  if (pageId && hasZaptroGranularPermission(profile?.role, profile?.permissions, pageId)) {
    return <>{children}</>;
  }

  if (anyOf?.length && anyOf.some((k) => hasZaptroGranularPermission(profile?.role, profile?.permissions, k))) {
    return <>{children}</>;
  }

  if (!pageId && (!anyOf || anyOf.length === 0)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Navigate to={redirectTo} replace />;
};

export default ZaptroPagePermissionRoute;
