import { StratixError } from './stratix-error.js';

/**
 * Base class for HTTP errors.
 * These errors will be automatically mapped to appropriate HTTP status codes.
 */
export class HttpError extends StratixError {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number, code: string = 'HTTP_ERROR', details?: unknown) {
    super(message, code, details);
    this.statusCode = statusCode;
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad Request', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Not Found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string = 'Internal Server Error', details?: unknown) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}
