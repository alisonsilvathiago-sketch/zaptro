import type { SendEmailDeps } from '../sendgrid/sendEmail.js';
import type { MailJobPayload } from './mailJob.js';
import { runMailJob } from './mailJob.js';

export type MailQueue = {
  /** Enfileira envio com retries (memória ou Redis). */
  enqueue: (payload: MailJobPayload) => Promise<void>;
  /** Encerra workers (Redis). */
  close?: () => Promise<void>;
};

type MemoryTask = { payload: MailJobPayload; attempts: number };

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function createMemoryQueue(deps: SendEmailDeps): MailQueue {
  const fifo: MemoryTask[] = [];
  let active = false;

  const pump = async () => {
    if (active) return;
    active = true;
    while (fifo.length) {
      const task = fifo.shift()!;
      let attempt = 0;
      const max = 4;
      while (attempt < max) {
        attempt += 1;
        try {
          deps.logger.write({
            at: new Date().toISOString(),
            level: attempt > 1 ? 'retry' : 'queued',
            to: task.payload.to,
            subject: task.payload.subject,
            message: `memory_attempt_${attempt}`,
          });
          await runMailJob(deps, task.payload);
          break;
        } catch {
          if (attempt >= max) {
            deps.logger.write({
              at: new Date().toISOString(),
              level: 'error',
              to: task.payload.to,
              subject: task.payload.subject,
              message: 'memory_queue_exhausted',
            });
            break;
          }
          await sleep(Math.min(30_000, 800 * 2 ** (attempt - 1)));
        }
      }
    }
    active = false;
    if (fifo.length) void pump();
  };

  return {
    enqueue: async (payload) => {
      fifo.push({ payload, attempts: 0 });
      void pump();
    },
  };
}

export async function createMailQueue(deps: SendEmailDeps, redisUrl: string): Promise<MailQueue> {
  if (!redisUrl.trim()) {
    return createMemoryQueue(deps);
  }

  try {
    const { Queue, Worker } = await import('bullmq');
    const { Redis } = await import('ioredis');
    const conn = new Redis(redisUrl, { maxRetriesPerRequest: null });
    const q = new Queue<MailJobPayload>('zaptro-mail', { connection: conn });
    const worker = new Worker<MailJobPayload>(
      'zaptro-mail',
      async (job) => {
        await runMailJob(deps, job.data);
      },
      {
        connection: conn,
        concurrency: 3,
        limiter: { max: 25, duration: 60_000 },
      },
    );
    worker.on('failed', (job, err) => {
      deps.logger.write({
        at: new Date().toISOString(),
        level: 'error',
        to: job?.data?.to ?? '—',
        subject: job?.data?.subject,
        message: err?.message ?? String(err),
        meta: { bullJobId: job?.id },
      });
    });
    return {
      enqueue: async (payload) => {
        deps.logger.write({
          at: new Date().toISOString(),
          level: 'queued',
          to: payload.to,
          subject: payload.subject,
          message: 'bullmq',
        });
        await q.add('send', payload, {
          attempts: 4,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 500,
          removeOnFail: 200,
        });
      },
      close: async () => {
        await worker.close();
        await q.close();
        await conn.quit();
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[email] Redis/BullMQ unavailable, falling back to in-memory queue:', e);
    return createMemoryQueue(deps);
  }
}
