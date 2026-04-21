export type AppModule = 'EQUIPE' | 'FINANCEIRO' | 'CRM' | 'API' | 'PLANOS' | 'EMPRESAS' | 'crm' | 'financeiro' | 'rh' | 'logistica' | 'estoque' | 'treinamentos' | 'auditoria';
export type AppAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'MANAGE' | 'view' | 'create' | 'edit' | 'delete';

export const hasPermission = (profile: any, module: AppModule, action: AppAction = 'view') => {
  if (!profile) return false;
  
  const role = profile.role || '';
  
  // Super Admin Master e Admin da Empresa têm bypass total (Controle Total)
  if (role === 'MASTER_SUPER_ADMIN' || (role === 'MASTER_ADMIN' && !profile?.metadata?.master_perms) || role === 'ADMIN') {
    return true;
  }

  // Se for um papel MASTER secundário, verifica na matriz master_perms
  if (role.startsWith('MASTER_')) {
    const masterPerms = profile?.metadata?.master_perms || {};
    // Verifica tanto em maiúsculo quanto minúsculo para segurança
    const key = `${module}:${action}`.toUpperCase();
    if (masterPerms[key] === true) return true;
    
    // Se for apenas VIEW, e tiver qualquer permissão no módulo, libera
    if (action === 'view' || action === 'VIEW') {
       return Object.keys(masterPerms).some(k => k.startsWith(`${module.toUpperCase()}:`));
    }
  }

  // --- Lógica Legada / Tenant ---
  const permissions = profile?.metadata?.permissions || {};
  if (action === 'view' || action === 'VIEW') {
    const modules = profile?.metadata?.modules || {};
    if (modules[module.toLowerCase()] === true) return true;
  }

  const legacyKey = `${module.toLowerCase()}:${action.toLowerCase()}`;
  return permissions[legacyKey] === true;
};
