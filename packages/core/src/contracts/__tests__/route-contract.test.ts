import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Controller } from '../../decorators/controller.js';
import { Get, Post } from '../../decorators/route.js';
import {
  generateOpenApiDocument,
  getControllerRouteContracts,
  validateRouteContracts
} from '../route-contract.js';

describe('route contracts', () => {
  it('extracts route schemas as first-class route contracts', () => {
    @Controller({ tags: ['Users'] })
    class UserController {
      @Get('/users/:id', {
        schema: {
          summary: 'Get user',
          params: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' }
            }
          },
          response: {
            200: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string' }
              }
            }
          }
        }
      })
      getUser() {}
    }

    const [contract] = getControllerRouteContracts(UserController);

    expect(contract).toMatchObject({
      controllerName: 'UserController',
      handlerName: 'getUser',
      method: 'GET',
      path: '/users/:id',
      openApiPath: '/users/{id}',
      tags: ['Users']
    });
    expect(contract.schema?.params?.properties?.id).toEqual({ type: 'string' });
    expect(contract.schema?.response?.[200]?.properties?.id).toEqual({
      type: 'string'
    });
  });

  it('generates an OpenAPI document from route contracts', () => {
    @Controller({ tags: ['Users'] })
    class UserController {
      @Post('/users', {
        schema: {
          body: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' }
            }
          },
          response: {
            201: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        }
      })
      createUser() {}
    }

    const document = generateOpenApiDocument(
      getControllerRouteContracts(UserController),
      {
        title: 'User API',
        version: '1.0.0'
      }
    );

    expect(document.openapi).toBe('3.1.0');
    expect(document.info).toEqual({ title: 'User API', version: '1.0.0' });
    expect(document.paths['/users'].post.requestBody).toMatchObject({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name']
          }
        }
      }
    });
    expect(document.paths['/users'].post.responses['201']).toMatchObject({
      description: '201 response',
      content: {
        'application/json': {
          schema: {
            type: 'object'
          }
        }
      }
    });
  });

  it('reports contract diagnostics for routes without schemas or responses', () => {
    @Controller()
    class UnsafeController {
      @Get('/unsafe')
      unsafe() {}
    }

    const diagnostics = validateRouteContracts(
      getControllerRouteContracts(UnsafeController),
      {
        requireSchema: true,
        requireResponseSchema: true
      }
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'ROUTE_SCHEMA_MISSING',
      'ROUTE_RESPONSE_SCHEMA_MISSING'
    ]);
    expect(diagnostics[0]).toMatchObject({
      severity: 'error',
      method: 'GET',
      path: '/unsafe',
      handlerName: 'unsafe'
    });
  });
});
