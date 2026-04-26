import type { Profile } from '../types';

/** Foto do usuário logado: URL no banco tem prioridade; depois cache do upload no perfil (mesmo navegador). */
export function resolveSessionAvatarUrl(profile: Pick<Profile, 'avatar_url'> | null | undefined): string | null {
  const fromDb = profile?.avatar_url?.trim();
  if (fromDb) return fromDb;
  try {
    const ls = localStorage.getItem('zaptro_profile_avatar_url')?.trim();
    return ls || null;
  } catch {
    return null;
  }
}

/** Foto de qualquer linha de perfil (ex.: lista de equipe). */
export function resolveRowAvatarUrl(row: { avatar_url?: string | null } | null | undefined): string | null {
  const u = row?.avatar_url?.trim();
  return u || null;
}

/** Na lista da empresa: o próprio usuário logado usa DB + cache local; os demais só URL do banco. */
export function resolveMemberAvatarUrl(
  m: { id: string; avatar_url?: string | null },
  selfId: string | null | undefined,
  sessionProfile: Pick<Profile, 'avatar_url'> | null | undefined
): string | null {
  if (sessionProfile && selfId && m.id === selfId) {
    return resolveSessionAvatarUrl(sessionProfile);
  }
  return resolveRowAvatarUrl(m);
}
