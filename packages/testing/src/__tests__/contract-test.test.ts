import { describe, expect, it } from 'vitest';
import type { RouteContract } from '@stratix/core';
import { ERROR_ENVELOPE_SCHEMA, createErrorEnvelope } from '@stratix/core';
import { contractTest, ContractTestError } from '../contract-test.js';

const userContract: RouteContract = {
  method: 'GET',
  path: '/users/:id',
  openApiPath: '/users/{id}',
  controllerName: 'UserController',
  handlerName: 'getUser',
  schema: {
    operationId: 'UserController_getUser',
    response: {
      200: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

function createApp(response: { statusCode: number; payload: unknown }) {
  return {
    async inject() {
      return {
        statusCode: response.statusCode,
        payload: JSON.stringify(response.payload)
      };
    }
  };
}

describe('contractTest', () => {
  it('passes when the response status and body match the route contract', async () => {
    await contractTest({
      app: createApp({
        statusCode: 200,
        payload: {
          success: true,
          data: { id: 'user-1' }
        }
      }),
      contracts: [userContract],
      cases: [
        {
          operationId: 'UserController_getUser',
          request: { method: 'GET', url: '/users/user-1' },
          expect: { status: 200 }
        }
      ],
      strict: {
        requireSchema: true,
        requireResponseSchema: true
      }
    });
  });

  it('fails with route context when the response status is unexpected', async () => {
    await expect(
      contractTest({
        app: createApp({
          statusCode: 500,
          payload: { success: false }
        }),
        contracts: [userContract],
        cases: [
          {
            operationId: 'UserController_getUser',
            request: { method: 'GET', url: '/users/user-1' },
            expect: { status: 200 }
          }
        ]
      })
    ).rejects.toThrow(/GET \/users\/:id.*expected status 200.*received 500/);
  });

  it('fails when the response body does not match the response schema', async () => {
    await expect(
      contractTest({
        app: createApp({
          statusCode: 200,
          payload: {
            success: true,
            data: {}
          }
        }),
        contracts: [userContract],
        cases: [
          {
            operationId: 'UserController_getUser',
            request: { method: 'GET', url: '/users/user-1' },
            expect: { status: 200 }
          }
        ]
      })
    ).rejects.toThrow(/response schema mismatch.*\/data.*must have required property 'id'/);
  });

  it('rejects missing response schema when strict mode requires it', async () => {
    await expect(
      contractTest({
        app: createApp({
          statusCode: 200,
          payload: { ok: true }
        }),
        contracts: [
          {
            ...userContract,
            schema: {
              operationId: 'UserController_getUser'
            }
          }
        ],
        cases: [
          {
            operationId: 'UserController_getUser',
            request: { method: 'GET', url: '/users/user-1' },
            expect: { status: 200 }
          }
        ],
        strict: {
          requireResponseSchema: true
        }
      })
    ).rejects.toThrow(ContractTestError);
  });

  it('validates error responses with the shared Stratix error envelope schema', async () => {
    await contractTest({
      app: createApp({
        statusCode: 404,
        payload: createErrorEnvelope({
          code: 'NOT_FOUND',
          message: 'Route not found',
          statusCode: 404,
          path: '/users/missing',
          timestamp: '2026-06-18T00:00:00.000Z'
        })
      }),
      contracts: [
        {
          ...userContract,
          schema: {
            operationId: 'UserController_getUser',
            response: {
              404: ERROR_ENVELOPE_SCHEMA
            }
          }
        }
      ],
      cases: [
        {
          operationId: 'UserController_getUser',
          request: { method: 'GET', url: '/users/missing' },
          expect: { status: 404 }
        }
      ],
      strict: {
        requireResponseSchema: true
      }
    });
  });
});
