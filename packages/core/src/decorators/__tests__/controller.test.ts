import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Controller } from '../controller.js';
import { MetadataManager } from '../metadata.js';
import { Get } from '../route.js';

describe('@Controller decorator', () => {
  it('marks a class as a Stratix controller', () => {
    @Controller()
    class TestController {}

    expect(MetadataManager.isController(TestController)).toBe(true);
  });

  it('stores controller options without route prefix compatibility', () => {
    @Controller({
      tags: ['Products'],
      description: 'Product management API'
    })
    class ProductController {}

    const metadata = MetadataManager.getControllerMetadata(ProductController);

    expect(metadata).toEqual({
      prefix: '',
      options: {
        tags: ['Products'],
        description: 'Product management API'
      }
    });
  });

  it('preserves route metadata declared on controller methods', () => {
    @Controller()
    class UserController {
      @Get('/users')
      list() {
        return [];
      }
    }

    expect(MetadataManager.isController(UserController)).toBe(true);
    expect(MetadataManager.getRouteMetadata(UserController)).toMatchObject([
      {
        method: 'GET',
        path: '/users',
        propertyKey: 'list'
      }
    ]);
  });

  it('does not treat regular classes as controllers', () => {
    class RegularClass {}

    expect(MetadataManager.isController(RegularClass)).toBe(false);
    expect(MetadataManager.getControllerMetadata(RegularClass)).toBeUndefined();
  });

  it('keeps controller metadata isolated per class', () => {
    @Controller({ category: 'users' })
    class UserController {}

    @Controller({ category: 'products' })
    class ProductController {}

    expect(MetadataManager.getControllerOptions(UserController).category).toBe(
      'users'
    );
    expect(
      MetadataManager.getControllerOptions(ProductController).category
    ).toBe('products');
  });
});
