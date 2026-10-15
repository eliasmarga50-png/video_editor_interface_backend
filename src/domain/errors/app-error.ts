export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly isOperational: boolean;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: ErrorCode;
      isOperational?: boolean;
      details?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, { statusCode: 400, code: 'BAD_REQUEST', details });
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(message, { statusCode: 422, code: 'VALIDATION_ERROR', details });
  }

  static notFound(message: string): AppError {
    return new AppError(message, { statusCode: 404, code: 'NOT_FOUND' });
  }

  static payloadTooLarge(message: string): AppError {
    return new AppError(message, { statusCode: 413, code: 'PAYLOAD_TOO_LARGE' });
  }

  static unsupportedMedia(message: string): AppError {
    return new AppError(message, { statusCode: 415, code: 'UNSUPPORTED_MEDIA' });
  }

  static rateLimited(message: string): AppError {
    return new AppError(message, { statusCode: 429, code: 'RATE_LIMITED' });
  }

  static upstream(message: string, details?: unknown, statusCode = 502): AppError {
    return new AppError(message, { statusCode, code: 'UPSTREAM_ERROR', details });
  }

  static timeout(message: string): AppError {
    return new AppError(message, { statusCode: 504, code: 'TIMEOUT' });
  }
}
