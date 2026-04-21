/**
 * Administrador da empresa no Zaptro (quem comprou / dono da conta) ou MASTER da plataforma.
 * Comparação case-insensitive para bater com valores vindos do banco.
 */
export function isZaptroTenantAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'ADMIN' || r === 'MASTER' || r.startsWith('MASTER_');
}

/** Configurações do tenant (WhatsApp, equipe, automações): só ADMIN / MASTER. */
export function canAccessZaptroTenantSettings(role?: string | null): boolean {
  return isZaptroTenantAdminRole(role);
}

/**
 * Permissão granular (concedida pelo administrador no perfil). ADMIN/MASTER ignoram a lista.
 */
export function hasZaptroGranularPermission(
  role: string | null | undefined,
  permissions: string[] | null | undefined,
  key: string
): boolean {
  if (isZaptroTenantAdminRole(role)) return true;
  /** `null` / `undefined` = legado (antes da coluna ou sem lista): mantém acesso total ao painel. */
  if (permissions == null) return true;
  return permissions.includes(key);
}

/** Rótulo curto para exibir no cabeçalho (não confundir com “sempre ADMIN”). */
export function zaptroRoleShortLabel(role?: string | null): string {
  if (!role?.trim()) return 'Sem papel';
  const r = role.toUpperCase();
  if (r === 'ADMIN') return 'ADMIN';
  if (r.startsWith('MASTER')) return 'MASTER';
  if (r === 'GERENTE') return 'GERENTE';
  if (r === 'COMERCIAL') return 'COMERCIAL';
  if (r === 'ATENDIMENTO') return 'ATENDIMENTO';
  if (r === 'MOTORISTA') return 'MOTORISTA';
  return r.length <= 12 ? r : `${r.slice(0, 11)}…`;
}

/** Primeira transportadora (sem company_id): só quem compra/é ADMIN (ou MASTER). Papel vazio = recuperação até primeiro vínculo. */
export function canBootstrapZaptroCompany(role?: string | null): boolean {
  if (!role?.trim()) return true;
  return isZaptroTenantAdminRole(role);
}

/** Alterar vitrine (UPDATE): só ADMIN / MASTER (não colaborador). Papel vazio permite até corrigir cadastro. */
export function canEditZaptroCompanyVitrine(role?: string | null): boolean {
  if (!role?.trim()) return true;
  return isZaptroTenantAdminRole(role);
}
