import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../domain/errors/app-error.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.id;
  let error: AppError;

  if (err instanceof AppError) {
    error = err;
  } else if (err instanceof ZodError) {
    error = AppError.validation('Request validation failed', err.flatten());
  } else if (err instanceof multer.MulterError) {
    error =
      err.code === 'LIMIT_FILE_SIZE'
        ? AppError.payloadTooLarge('Uploaded file exceeds the size limit')
        : AppError.badRequest(err.message);
  } else if (err instanceof SyntaxError) {
    error = AppError.badRequest('Malformed JSON body');
  } else {
    error = new AppError('An unexpected error occurred', {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      isOperational: false,
      details: err instanceof Error ? err.message : err,
    });
  }

  logger.error(
    {
      err,
      requestId,
      method: req.method,
      path: req.originalUrl,
      code: error.code,
      statusCode: error.statusCode,
    },
    error.message,
  );

  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.isOperational ? error.details : undefined,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
};
