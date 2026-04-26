import express from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import { createEmailLogger } from './logging/emailLog.js';
import { createMailQueue } from './queue/createMailQueue.js';
import { registerMailRoutes } from './routes/mailRoutes.js';

async function main() {
  const cfg = loadConfig();
  const logger = createEmailLogger(cfg.logDir);
  const sendDeps = {
    apiKey: cfg.sendgridApiKey,
    defaultFrom: { email: cfg.fromEmail, name: cfg.fromName },
    logger,
  };
  const queue = await createMailQueue(sendDeps, cfg.redisUrl);

  const app = express();
  app.use(
    cors({
      origin: true,
      maxAge: 86400,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Zaptro-Internal-Secret'],
    }),
  );
  app.use(express.json({ limit: '600kb' }));

  registerMailRoutes(app, cfg, logger, queue);

  app.listen(cfg.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[zaptro-mail-api] listening on http://localhost:${cfg.port}`);
  });

  const shutdown = async () => {
    await queue.close?.();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
