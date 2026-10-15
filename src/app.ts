import cors from 'cors';
import express, { type Request } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestId } from './middleware/request-id.js';
import { v1Router } from './routes/v1/index.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as Request).id,
      customProps: (req) => ({ requestId: (req as Request).id }),
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((value) => value.trim()),
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', service: 'cineai-backend', env: env.NODE_ENV },
    });
  });

  app.use('/api/v1', v1Router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
