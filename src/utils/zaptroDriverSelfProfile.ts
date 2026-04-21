const STORAGE_KEY = 'zaptro_driver_self_v1';

export type ZaptroDriverSelfProfile = {
  displayName: string;
  phone: string;
  vehicle: string;
  /** data URL ou URL https — opcional */
  avatarUrl: string | null;
  deliveries: number;
  routes: number;
};

function defaults(): ZaptroDriverSelfProfile {
  return {
    displayName: '',
    phone: '',
    vehicle: '',
    avatarUrl: null,
    deliveries: 24,
    routes: 5,
  };
}

export function readZaptroDriverSelfProfile(): ZaptroDriverSelfProfile {
  if (typeof window === 'undefined') return defaults();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const j = JSON.parse(raw) as Partial<ZaptroDriverSelfProfile>;
    return {
      ...defaults(),
      ...j,
      avatarUrl: typeof j.avatarUrl === 'string' ? j.avatarUrl : null,
    };
  } catch {
    return defaults();
  }
}

export function writeZaptroDriverSelfProfile(p: ZaptroDriverSelfProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/** Redimensiona imagem para avatar (guardar em localStorage). */
export function zaptroProfileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase() || '·';
}

export async function zaptroCompressImageToDataUrl(file: File, maxEdge = 160, quality = 0.82): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const w = bitmap.width;
  const h = bitmap.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  bitmap.close();
  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}
