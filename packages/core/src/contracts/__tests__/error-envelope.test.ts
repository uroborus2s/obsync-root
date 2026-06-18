import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import {
  ERROR_ENVELOPE_SCHEMA,
  createErrorEnvelope
} from '../error-envelope.js';

describe('error envelope contract', () => {
  it('creates the standard error envelope used by runtime and contract tests', () => {
    const envelope = createErrorEnvelope({
      code: 'VALIDATION_ERROR',
      message: 'Validation Error',
      statusCode: 400,
      details: [{ instancePath: '/query/page', message: 'must be integer' }],
      path: '/users?page=bad',
      requestId: 'req-1',
      timestamp: new Date('2026-06-18T00:00:00.000Z')
    });

    expect(envelope).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation Error',
        statusCode: 400,
        details: [{ instancePath: '/query/page', message: 'must be integer' }],
        path: '/users?page=bad',
        requestId: 'req-1',
        timestamp: '2026-06-18T00:00:00.000Z'
      }
    });

    const ajv = new Ajv({ strict: false, validateFormats: false });
    expect(ajv.validate(ERROR_ENVELOPE_SCHEMA, envelope)).toBe(true);
  });

  it('omits optional envelope fields when they are not available', () => {
    const envelope = createErrorEnvelope({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal Server Error',
      statusCode: 500,
      timestamp: '2026-06-18T00:00:00.000Z'
    });

    expect(envelope).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
        statusCode: 500,
        timestamp: '2026-06-18T00:00:00.000Z'
      }
    });
  });
});
