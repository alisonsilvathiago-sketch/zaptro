import type { SendEmailDeps } from '../sendgrid/sendEmail.js';
import { sendEmail } from '../sendgrid/sendEmail.js';

export type MailJobPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: { email: string; name?: string };
};

export async function runMailJob(deps: SendEmailDeps, payload: MailJobPayload) {
  const r = await sendEmail(deps, payload);
  if (!r.ok) {
    throw new Error(r.error);
  }
}
