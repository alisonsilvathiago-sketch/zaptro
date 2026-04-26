/**
 * Cliente da API de e-mail Zaptro (SendGrid no servidor).
 * Nunca envia API key do SendGrid — só JWT Supabase ou endpoints públicos limitados.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ZaptroTransactionalKind =
  | 'welcome'
  | 'account_confirmation'
  | 'password_reset_notice'
  | 'payment_approved'
  | 'cargo_created'
  | 'delivery_started'
  | 'delivery_completed'
  | 'route_notification'
  | 'delivery_status';

export type ZaptroMailBranding = {
  fromEmail?: string;
  fromName?: string;
  companyName?: string;
  signatureHtml?: string;
};

function mailApiBase(): string {
  const raw = (import.meta.env.VITE_ZAPTRO_MAIL_API_URL as string | undefined)?.trim() || '';
  return raw.replace(/\/$/, '');
}

function isConfigured(): boolean {
  return Boolean(mailApiBase());
}

export async function postZaptroTransactionalEmail(
  accessToken: string,
  body: {
    kind: ZaptroTransactionalKind;
    to: string;
    companyId?: string;
    variables?: Record<string, string | number | null>;
    branding?: ZaptroMailBranding;
  },
): Promise<{ ok: boolean; status: number; skipped?: boolean }> {
  const base = mailApiBase();
  if (!base) return { ok: true, status: 204, skipped: true };
  const r = await fetch(`${base}/v1/transactional`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status };
}

/** Aviso neutro após pedido de reset (rate limit no servidor). Não requer JWT. */
export async function postZaptroPasswordResetNotice(email: string): Promise<void> {
  const base = mailApiBase();
  if (!base || !EMAIL_RE.test(email.trim())) return;
  try {
    await fetch(`${base}/v1/public/password-reset-notice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  } catch {
    /* ignore */
  }
}

export function zaptroMailApiConfigured(): boolean {
  return isConfigured();
}
