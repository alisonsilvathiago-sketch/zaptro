import fs from 'node:fs';
import path from 'node:path';

export type EmailLogLevel = 'sent' | 'error' | 'queued' | 'retry';

export type EmailLogEntry = {
  at: string;
  level: EmailLogLevel;
  to: string;
  subject?: string;
  template?: string;
  message?: string;
  meta?: Record<string, unknown>;
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function createEmailLogger(logDir: string) {
  const file = path.join(logDir, 'email-events.jsonl');

  return {
    write(entry: EmailLogEntry) {
      const line = JSON.stringify(entry) + '\n';
      // eslint-disable-next-line no-console
      console.log(`[email] ${entry.level} → ${entry.to}`, entry.subject || entry.message || '');
      try {
        ensureDir(logDir);
        fs.appendFileSync(file, line, 'utf8');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[email] log file write failed', e);
      }
    },
  };
}
