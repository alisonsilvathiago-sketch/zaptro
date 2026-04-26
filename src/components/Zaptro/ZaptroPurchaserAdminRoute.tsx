import React from 'react';
import ZaptroPagePermissionRoute from './ZaptroPagePermissionRoute';

type Props = {
  children: React.ReactNode;
  /** Colaborador com este id em `profiles.permissions` acede (ADMIN/MASTER ignoram). */
  pageId?: string;
  /** Basta uma das permissões (ex.: `/configuracao`). */
  anyOf?: string[];
};

/**
 * Rotas que eram só do dono (ADMIN): agora aceitam colaboradores quando `pageId` / `anyOf` forem passados.
 * Sem esses props, mantém o comportamento antigo (só ADMIN/MASTER).
 */
const ZaptroPurchaserAdminRoute: React.FC<Props> = ({ children, pageId, anyOf }) => {
  return (
    <ZaptroPagePermissionRoute pageId={pageId} anyOf={anyOf}>
      {children}
    </ZaptroPagePermissionRoute>
  );
};

export default ZaptroPurchaserAdminRoute;
