import type { FastifyError, FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { createErrorEnvelope } from '../contracts/error-envelope.js';
import { HttpError, StratixError } from '../errors/index.js';

type FastifyHandledError = Partial<FastifyError> & {
  validation?: unknown;
  code?: string;
  statusCode?: number;
  message?: string;
  details?: unknown;
  serialization?: unknown;
};

export interface ErrorHandlingBootstrapOptions {
  logger?: Logger;
  getRequestId: (request: unknown) => string | undefined;
}

export function setupErrorHandling(
  fastify: FastifyInstance,
  options: ErrorHandlingBootstrapOptions
): void {
  const { getRequestId, logger } = options;

  fastify.setErrorHandler(async (error, request, reply) => {
    const handledError = error as FastifyHandledError;

    if (reply.sent) {
      logger?.error(
        { err: error },
        'Response already sent, but an error occurred'
      );
      return;
    }

    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal Server Error';
    let details: unknown = undefined;

    if (error instanceof HttpError) {
      statusCode = error.statusCode;
      errorCode = error.code;
      message = error.message;
      details = error.details;
    } else if (error instanceof StratixError) {
      statusCode = 500;
      errorCode = error.code;
      message = error.message;
      details = error.details;
    } else if (handledError.validation) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = 'Validation Error';
      details = handledError.validation;
    } else if (isResponseValidationError(handledError)) {
      statusCode = 500;
      errorCode = 'RESPONSE_VALIDATION_ERROR';
      message = 'Response Validation Error';
      details = {
        code: handledError.code,
        message: handledError.message
      };
    } else if (handledError.statusCode) {
      statusCode = handledError.statusCode;
      errorCode = handledError.code || 'HTTP_ERROR';
      message = handledError.message || message;
    }

    if (statusCode >= 500) {
      logger?.error({ err: error }, 'Unhandled error');
    } else {
      logger?.warn(`Handled error (${statusCode}): ${message}`);
    }

    const response = createErrorEnvelope({
      code: errorCode,
      message,
      statusCode,
      details,
      path: request.url,
      requestId: getRequestId(request)
    });

    return reply.status(statusCode).send(response);
  });

  fastify.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send(
      createErrorEnvelope({
        code: 'NOT_FOUND',
        message: 'Route not found',
        statusCode: 404,
        path: request.url,
        requestId: getRequestId(request)
      })
    );
  });
}

function isResponseValidationError(error: FastifyHandledError): boolean {
  if (error.serialization) {
    return true;
  }

  if (
    error.code === 'FST_ERR_FAILED_ERROR_SERIALIZATION' ||
    error.code === 'FST_ERR_SCH_SERIALIZATION_BUILD'
  ) {
    return true;
  }

  return (
    typeof error.message === 'string' &&
    error.message.toLowerCase().includes('response') &&
    error.message.toLowerCase().includes('schema')
  );
}
