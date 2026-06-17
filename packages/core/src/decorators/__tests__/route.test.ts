import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { MetadataManager } from '../metadata.js';
import { Delete, Get, Head, Options, Patch, Post, Put } from '../route.js';

describe('Route decorators', () => {
  it('registers all supported HTTP method metadata', () => {
    class TestController {
      @Get('/items')
      list() {}

      @Post('/items')
      create() {}

      @Put('/items/:id')
      update() {}

      @Delete('/items/:id')
      remove() {}

      @Patch('/items/:id')
      patch() {}

      @Head('/items')
      head() {}

      @Options('/items')
      options() {}
    }

    const routes = MetadataManager.getRouteMetadata(TestController);

    expect(routes.map((route) => route.method)).toEqual([
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'HEAD',
      'OPTIONS'
    ]);
    expect(routes.map((route) => route.propertyKey)).toEqual([
      'list',
      'create',
      'update',
      'remove',
      'patch',
      'head',
      'options'
    ]);
  });

  it('stores Fastify route options', () => {
    class TestController {
      @Get('/items', {
        schema: {
          querystring: {
            type: 'object',
            properties: {
              page: { type: 'integer' }
            }
          }
        }
      })
      list() {}
    }

    const [route] = MetadataManager.getRouteMetadata(TestController);

    expect(route.options?.schema?.querystring?.properties?.page).toEqual({
      type: 'integer'
    });
  });

  it('normalizes route paths to a leading slash', () => {
    class TestController {
      @Get('items')
      withoutSlash() {}

      @Get('/items/')
      withSlash() {}

      @Get('')
      empty() {}

      @Get()
      omitted() {}
    }

    const routes = MetadataManager.getRouteMetadata(TestController);

    expect(routes.map((route) => route.path)).toEqual([
      '/items',
      '/items/',
      '/',
      '/'
    ]);
  });

  it('keeps route metadata isolated per class', () => {
    class BaseController {
      @Get('/health')
      health() {}
    }

    class ExtendedController extends BaseController {
      @Get('/info')
      info() {}
    }

    expect(MetadataManager.getRouteMetadata(BaseController)).toMatchObject([
      { method: 'GET', path: '/health' }
    ]);
    expect(MetadataManager.getRouteMetadata(ExtendedController)).toMatchObject([
      { method: 'GET', path: '/info' }
    ]);
  });

  it('rejects invalid decorator targets', () => {
    expect(() =>
      Get('/broken')({}, 'notAMethod', { value: 'not-a-function' } as any)
    ).toThrow('@GET can only be applied to methods');
  });
});
