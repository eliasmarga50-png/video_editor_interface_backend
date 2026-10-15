import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../domain/errors/app-error.js';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      next(AppError.validation('Request validation failed', parsed.error.flatten()));
      return;
    }
    req[source] = parsed.data as never;
    next();
  };
}
