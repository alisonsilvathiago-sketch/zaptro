/**
 * Preferências e efeitos de alerta para novas mensagens WhatsApp (Zaptro inbox).
 * Som: Web Audio (sem ficheiro). Desktop: `Notification` API quando permitido.
 */

const LS_SOUND = 'zaptro_wa_notif_sound_v1';
const LS_DESKTOP = 'zaptro_wa_notif_desktop_v1';

export function readWaNotifSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(LS_SOUND);
  if (v === null) return true;
  return v === '1';
}

export function setWaNotifSoundEnabled(on: boolean): void {
  localStorage.setItem(LS_SOUND, on ? '1' : '0');
}

/** Se o utilizador quer tentar notificações do browser (além do som). */
export function readWaNotifDesktopDesired(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(LS_DESKTOP);
  if (v === null) return true;
  return v === '1';
}

export function setWaNotifDesktopDesired(on: boolean): void {
  localStorage.setItem(LS_DESKTOP, on ? '1' : '0');
}

let lastSoundAt = 0;
const SOUND_DEBOUNCE_MS = 450;

/** Sinal curto tipo “ding” (respeita `readWaNotifSoundEnabled`). */
export function playWaIncomingMessageSound(): void {
  if (typeof window === 'undefined') return;
  if (!readWaNotifSoundEnabled()) return;
  const now = Date.now();
  if (now - lastSoundAt < SOUND_DEBOUNCE_MS) return;
  lastSoundAt = now;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.12);
    osc.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
    osc.onended = () => {
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}

export function getWaBrowserNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

export async function requestWaBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

const NOTIF_ICON_PATH = '/zaptro-mark.svg';

export function showWaDesktopNotificationIfAllowed(params: {
  title: string;
  body: string;
  tag?: string;
}): void {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (!readWaNotifDesktopDesired()) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(params.title, {
      body: params.body.slice(0, 200),
      tag: params.tag ?? 'zaptro-wa-msg',
      icon: NOTIF_ICON_PATH,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/** Mostrar aviso estilo WhatsApp: bloqueado no browser, ainda não permitido, ou desativado nas preferências Zaptro. */
export function getWaNotificationBannerKind(): 'denied' | 'default' | 'disabled_in_app' | null {
  if (typeof window === 'undefined') return null;
  const p = getWaBrowserNotificationPermission();
  if (p === 'denied') return 'denied';
  if (!readWaNotifDesktopDesired()) return 'disabled_in_app';
  if (p === 'default') return 'default';
  return null;
}
