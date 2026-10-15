import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../domain/errors/app-error.js';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(AppError.rateLimited('Too many requests. Please retry shortly.'));
  },
});

export const generationRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.max(5, Math.floor(env.RATE_LIMIT_MAX / 4)),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(AppError.rateLimited('Video generation rate limit exceeded.'));
  },
});
