import type { Express, Request } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { AppConfig } from '../config.js';
import type { createEmailLogger } from '../logging/emailLog.js';
import { isValidEmail, normalizeEmail } from '../sendgrid/validateEmail.js';
import { fetchProfileForUser, verifySupabaseJwt } from '../auth/supabaseProfile.js';
import type { ZaptroProfileRow } from '../auth/supabaseProfile.js';
import {
  buildTransactionalEmail,
  type TemplateVars,
  type TransactionalKind,
} from '../templates/index.js';
import type { MailQueue } from '../queue/createMailQueue.js';
import type { MailJobPayload } from '../queue/mailJob.js';

const KIND_VALUES = [
  'welcome',
  'account_confirmation',
  'password_reset_notice',
  'payment_approved',
  'cargo_created',
  'delivery_started',
  'delivery_completed',
  'route_notification',
  'delivery_status',
] as const satisfies readonly TransactionalKind[];

const brandingSchema = z
  .object({
    fromEmail: z.string().email().optional(),
    fromName: z.string().max(120).optional(),
    companyName: z.string().max(200).optional(),
    signatureHtml: z.string().max(4000).optional(),
  })
  .strict()
  .optional();

const transactionalBody = z.object({
  kind: z.enum(KIND_VALUES),
  to: z.string().email(),
  companyId: z.string().uuid().optional(),
  variables: z.record(z.union([z.string(), z.number(), z.null()])).optional(),
  branding: brandingSchema,
});

const bulkBody = z.object({
  jobs: z.array(transactionalBody).min(1).max(50),
});

const rawBody = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(500_000),
  text: z.string().max(50_000).optional(),
  from: z
    .object({ email: z.string().email(), name: z.string().max(120).optional() })
    .optional(),
});

const publicResetBody = z.object({
  email: z.string().email(),
});

function getBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim();
}

function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

async function resolveCompanyDisplayName(
  cfg: AppConfig,
  accessToken: string,
  profile: ZaptroProfileRow | null,
  branding?: z.infer<typeof brandingSchema>,
): Promise<string> {
  if (branding?.companyName?.trim()) return branding.companyName.trim();
  if (!profile?.company_id || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return 'Zaptro';
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data } = await sb.from('whatsapp_companies').select('name').eq('id', profile.company_id).maybeSingle();
  const n = (data as { name?: string } | null)?.name?.trim();
  return n || 'Zaptro';
}

export function registerMailRoutes(
  app: Express,
  cfg: AppConfig,
  logger: ReturnType<typeof createEmailLogger>,
  queue: MailQueue,
) {
  const resetBuckets = new Map<string, { count: number; windowStart: number }>();

  function rateLimitPublicReset(ip: string): boolean {
    const now = Date.now();
    const windowMs = 60_000;
    const b = resetBuckets.get(ip);
    if (!b || now - b.windowStart > windowMs) {
      resetBuckets.set(ip, { count: 1, windowStart: now });
      return true;
    }
    if (b.count >= cfg.publicResetRpm) return false;
    b.count += 1;
    return true;
  }

  async function enqueueTransactional(
    accessToken: string,
    body: z.infer<typeof transactionalBody>,
  ): Promise<void> {
    const profile = await fetchProfileForUser(cfg.supabaseUrl, cfg.supabaseAnonKey, accessToken);
    if (body.companyId && profile?.company_id && body.companyId !== profile.company_id) {
      throw Object.assign(new Error('company_mismatch'), { status: 403 });
    }

    const { data: authData, error: userErr } = await verifySupabaseJwt(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey,
      accessToken,
    );
    if (userErr || !authData.user) {
      throw Object.assign(new Error('invalid_token'), { status: 401 });
    }

    const companyName = await resolveCompanyDisplayName(cfg, accessToken, profile, body.branding);

    const vars: TemplateVars = {
      ...(body.variables ?? {}),
      userName: body.variables?.userName ?? profile?.full_name ?? authData.user.email ?? 'Cliente',
    };

    const { subject, html, text } = buildTransactionalEmail(
      body.kind,
      companyName,
      vars,
      body.branding?.signatureHtml,
    );

    const from =
      body.branding?.fromEmail && isValidEmail(body.branding.fromEmail)
        ? { email: normalizeEmail(body.branding.fromEmail), name: body.branding.fromName }
        : undefined;

    const payload: MailJobPayload = { to: normalizeEmail(body.to), subject, html, text, from };
    await queue.enqueue(payload);
  }

  app.post('/v1/transactional', async (req, res) => {
    const parsed = transactionalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const token = getBearer(req);
    if (!token) {
      res.status(401).json({ error: 'missing_bearer' });
      return;
    }
    const { data, error } = await verifySupabaseJwt(cfg.supabaseUrl, cfg.supabaseAnonKey, token);
    if (error || !data.user) {
      res.status(401).json({ error: 'invalid_token' });
      return;
    }
    try {
      await enqueueTransactional(token, parsed.data);
      res.status(202).json({ ok: true, queued: true });
    } catch (e: unknown) {
      const status = e && typeof e === 'object' && 'status' in e ? Number((e as { status: number }).status) : 500;
      const msg = e instanceof Error ? e.message : String(e);
      if (status === 403) {
        res.status(403).json({ error: msg });
        return;
      }
      logger.write({
        at: new Date().toISOString(),
        level: 'error',
        to: parsed.data.to,
        message: msg,
      });
      res.status(500).json({ error: 'enqueue_failed' });
    }
  });

  app.post('/v1/transactional/bulk', async (req, res) => {
    const token = getBearer(req);
    if (!token) {
      res.status(401).json({ error: 'missing_bearer' });
      return;
    }
    const { data, error } = await verifySupabaseJwt(cfg.supabaseUrl, cfg.supabaseAnonKey, token);
    if (error || !data.user) {
      res.status(401).json({ error: 'invalid_token' });
      return;
    }
    const parsed = bulkBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    try {
      for (const job of parsed.data.jobs) {
        await enqueueTransactional(token, job);
      }
      res.status(202).json({ ok: true, queued: true, count: parsed.data.jobs.length });
    } catch (e: unknown) {
      const status = e && typeof e === 'object' && 'status' in e ? Number((e as { status: number }).status) : 500;
      const msg = e instanceof Error ? e.message : String(e);
      if (status === 403) {
        res.status(403).json({ error: msg });
        return;
      }
      res.status(500).json({ error: 'enqueue_failed', message: msg });
    }
  });

  app.post('/v1/public/password-reset-notice', async (req, res) => {
    const parsed = publicResetBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const ip = clientIp(req);
    if (!rateLimitPublicReset(ip)) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }
    const email = normalizeEmail(parsed.data.email);
    const { subject, html, text } = buildTransactionalEmail('password_reset_notice', 'Zaptro', {}, undefined);
    await queue.enqueue({ to: email, subject, html, text });
    res.status(202).json({ ok: true });
  });

  app.post('/v1/internal/raw', (req, res) => {
    const secret = req.headers['x-zaptro-internal-secret'];
    if (!cfg.internalSecret || secret !== cfg.internalSecret) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const parsed = rawBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    void queue.enqueue({
      to: normalizeEmail(parsed.data.to),
      subject: parsed.data.subject,
      html: parsed.data.html,
      text: parsed.data.text,
      from: parsed.data.from,
    });
    res.status(202).json({ ok: true, queued: true });
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      sendgrid: cfg.sendgridConfigured,
      supabaseAuth: Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey),
      redis: Boolean(cfg.redisUrl),
    });
  });
}
