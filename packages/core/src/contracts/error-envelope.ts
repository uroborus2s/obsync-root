export type ErrorEnvelopeSchema = Record<string, unknown>;

export interface ErrorEnvelopeError {
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: unknown;
  path?: string;
  requestId?: string;
}

export interface ErrorEnvelope {
  error: ErrorEnvelopeError;
}

export interface CreateErrorEnvelopeOptions {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
  path?: string;
  requestId?: string;
  timestamp?: Date | string;
}

export const ERROR_ENVELOPE_SCHEMA: ErrorEnvelopeSchema = {
  type: 'object',
  required: ['error'],
  additionalProperties: false,
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'statusCode', 'timestamp'],
      additionalProperties: false,
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        statusCode: {
          type: 'integer',
          minimum: 100,
          maximum: 599
        },
        timestamp: {
          type: 'string',
          format: 'date-time'
        },
        details: {},
        path: { type: 'string' },
        requestId: { type: 'string' }
      }
    }
  }
};

function normalizeTimestamp(timestamp: Date | string | undefined): string {
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  return timestamp || new Date().toISOString();
}

export function createErrorEnvelope(
  options: CreateErrorEnvelopeOptions
): ErrorEnvelope {
  const error: ErrorEnvelopeError = {
    code: options.code,
    message: options.message,
    statusCode: options.statusCode,
    timestamp: normalizeTimestamp(options.timestamp)
  };

  if (options.details !== undefined) {
    error.details = options.details;
  }

  if (options.path) {
    error.path = options.path;
  }

  if (options.requestId) {
    error.requestId = options.requestId;
  }

  return { error };
}
