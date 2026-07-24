import fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import { ERROR_ENVELOPE_SCHEMA } from '../../contracts/index.js';
import { BadRequestError, NotFoundError } from '../../errors/index.js';
import { getLogger } from '../../logger/index.js';
import { setupErrorHandling } from '../error-handling.js';

describe('Global Error Handling', () => {
  const ajv = new Ajv({ strict: false, validateFormats: false });
  const validateErrorEnvelope = ajv.compile(ERROR_ENVELOPE_SCHEMA);

  const applyErrorHandling = (app: ReturnType<typeof fastify>) => {
    setupErrorHandling(app, {
      logger: getLogger(),
      getRequestId: () => undefined
    });
  };

  it('should handle HttpError correctly', async () => {
    const app = fastify();

    applyErrorHandling(app);

    app.get('/error', async () => {
      throw new BadRequestError('Invalid input', { field: 'username' });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/error'
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('Invalid input');
    expect(body.error.details).toEqual({ field: 'username' });
    expect(validateErrorEnvelope(body)).toBe(true);
  });

  it('should handle NotFoundError correctly', async () => {
    const app = fastify();

    applyErrorHandling(app);

    app.get('/not-found', async () => {
      throw new NotFoundError('Resource not found');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/not-found'
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(validateErrorEnvelope(body)).toBe(true);
  });

  it('should return the unified error envelope for Fastify validation errors', async () => {
    const app = fastify();

    applyErrorHandling(app);

    app.get(
      '/items',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['page'],
            properties: {
              page: { type: 'integer' }
            }
          }
        }
      },
      async () => ({ ok: true })
    );

    const response = await app.inject({
      method: 'GET',
      url: '/items?page=bad'
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation Error',
      statusCode: 400,
      path: '/items?page=bad'
    });
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(validateErrorEnvelope(body)).toBe(true);
  });

  it('should handle unknown errors as 500', async () => {
    const app = fastify();

    applyErrorHandling(app);

    app.get('/unknown', async () => {
      throw new Error('Something went wrong');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/unknown'
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('Internal Server Error');
    expect(validateErrorEnvelope(body)).toBe(true);
  });
});
