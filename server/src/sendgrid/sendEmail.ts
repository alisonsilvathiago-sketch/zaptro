import sgMail from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/mail';
import { isValidEmail, normalizeEmail } from './validateEmail.js';
import type { createEmailLogger } from '../logging/emailLog.js';

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** White-label remetente (domínio deve estar verificado no SendGrid). */
  from?: { email: string; name?: string };
};

export type SendEmailDeps = {
  apiKey: string;
  defaultFrom: { email: string; name: string };
  logger: ReturnType<typeof createEmailLogger>;
};

export async function sendEmail(
  deps: SendEmailDeps,
  { to, subject, html, text, from }: SendEmailParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const addr = normalizeEmail(to);
  if (!isValidEmail(addr)) {
    deps.logger.write({
      at: new Date().toISOString(),
      level: 'error',
      to: addr,
      subject,
      message: 'invalid_recipient',
    });
    return { ok: false, error: 'invalid_recipient' };
  }

  if (!deps.apiKey) {
    deps.logger.write({
      at: new Date().toISOString(),
      level: 'error',
      to: addr,
      subject,
      message: 'sendgrid_not_configured',
    });
    return { ok: false, error: 'sendgrid_not_configured' };
  }

  sgMail.setApiKey(deps.apiKey);

  const fromEmail = from?.email?.trim() || deps.defaultFrom.email;
  const fromName = from?.name?.trim() || deps.defaultFrom.name;

  const msg: MailDataRequired = {
    to: addr,
    from: { email: fromEmail, name: fromName },
    subject,
    html,
    text: text ?? undefined,
  };

  try {
    await sgMail.send(msg);
    deps.logger.write({
      at: new Date().toISOString(),
      level: 'sent',
      to: addr,
      subject,
    });
    return { ok: true };
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'response' in err
        ? JSON.stringify((err as { response?: { body?: unknown } }).response?.body ?? err)
        : err instanceof Error
          ? err.message
          : String(err);
    deps.logger.write({
      at: new Date().toISOString(),
      level: 'error',
      to: addr,
      subject,
      message,
    });
    return { ok: false, error: message };
  }
}
