import path from 'node:path';

export function loadConfig() {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const port = Number(process.env.PORT || 8787);
  const logDir = process.env.EMAIL_LOG_DIR || path.join(process.cwd(), 'logs');
  return {
    port,
    sendgridApiKey: sendgridKey || '',
    sendgridConfigured: Boolean(sendgridKey && sendgridKey.length > 10),
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@zaptro.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'Zaptro',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    internalSecret: process.env.ZAPTRO_INTERNAL_EMAIL_SECRET || '',
    redisUrl: process.env.REDIS_URL || '',
    logDir,
    publicResetRpm: Number(process.env.ZAPTRO_PUBLIC_RESET_RPM || 20),
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
