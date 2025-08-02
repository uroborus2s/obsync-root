// 控制器装饰器测试
// 测试控制器装饰器的功能

import { describe, it, expect, beforeEach } from 'vitest'
import 'reflect-metadata'
import { Controller, isController, getControllerMetadata } from '../controller.js'
import { Get, Post } from '../route.js'

describe('@Controller decorator', () => {
  beforeEach(() => {
    // 清理元数据
    Reflect.deleteMetadata('controller', TestController)
    Reflect.deleteMetadata('routes', TestController)
  })

  describe('basic functionality', () => {
    it('should mark class as controller', () => {
      @Controller()
      class TestController {}

      expect(isController(TestController)).toBe(true)
    })

    it('should store controller metadata', () => {
      @Controller('/api/users')
      class UserController {}

      const metadata = getControllerMetadata(UserController)
      expect(metadata).toBeDefined()
      expect(metadata?.prefix).toBe('/api/users')
    })

    it('should work without prefix', () => {
      @Controller()
      class SimpleController {}

      const metadata = getControllerMetadata(SimpleController)
      expect(metadata).toBeDefined()
      expect(metadata?.prefix).toBeUndefined()
    })

    it('should store controller options', () => {
      @Controller('/api/products', {
        tags: ['Products'],
        description: 'Product management API'
      })
      class ProductController {}

      const metadata = getControllerMetadata(ProductController)
      expect(metadata?.tags).toEqual(['Products'])
      expect(metadata?.description).toBe('Product management API')
    })
  })

  describe('with route decorators', () => {
    it('should work with route decorators', () => {
      @Controller('/api/users')
      class UserController {
        @Get('/')
        getUsers() {
          return { users: [] }
        }

        @Post('/')
        createUser() {
          return { success: true }
        }
      }

      expect(isController(UserController)).toBe(true)
      const metadata = getControllerMetadata(UserController)
      expect(metadata?.prefix).toBe('/api/users')
    })

    it('should preserve route metadata', () => {
      @Controller('/api/posts')
      class PostController {
        @Get('/:id')
        getPost() {
          return { post: {} }
        }
      }

      const routes = Reflect.getMetadata('routes', PostController) || []
      expect(routes).toHaveLength(1)
      expect(routes[0].method).toBe('GET')
      expect(routes[0].path).toBe('/:id')
    })
  })

  describe('inheritance', () => {
    it('should work with class inheritance', () => {
      @Controller('/api/base')
      class BaseController {
        @Get('/health')
        health() {
          return { status: 'ok' }
        }
      }

      @Controller('/api/extended')
      class ExtendedController extends BaseController {
        @Get('/info')
        info() {
          return { info: 'extended' }
        }
      }

      expect(isController(BaseController)).toBe(true)
      expect(isController(ExtendedController)).toBe(true)

      const baseMetadata = getControllerMetadata(BaseController)
      const extendedMetadata = getControllerMetadata(ExtendedController)

      expect(baseMetadata?.prefix).toBe('/api/base')
      expect(extendedMetadata?.prefix).toBe('/api/extended')
    })
  })

  describe('error handling', () => {
    it('should handle non-class targets', () => {
      const notAClass = {}
      expect(isController(notAClass)).toBe(false)
    })

    it('should handle undefined targets', () => {
      expect(isController(undefined)).toBe(false)
      expect(isController(null)).toBe(false)
    })

    it('should return undefined for non-controller classes', () => {
      class RegularClass {}
      
      expect(isController(RegularClass)).toBe(false)
      expect(getControllerMetadata(RegularClass)).toBeUndefined()
    })
  })

  describe('multiple controllers', () => {
    it('should handle multiple controllers independently', () => {
      @Controller('/api/users')
      class UserController {}

      @Controller('/api/products')
      class ProductController {}

      expect(isController(UserController)).toBe(true)
      expect(isController(ProductController)).toBe(true)

      const userMetadata = getControllerMetadata(UserController)
      const productMetadata = getControllerMetadata(ProductController)

      expect(userMetadata?.prefix).toBe('/api/users')
      expect(productMetadata?.prefix).toBe('/api/products')
    })
  })

  describe('prefix normalization', () => {
    it('should handle various prefix formats', () => {
      @Controller('api/users')
      class Controller1 {}

      @Controller('/api/users/')
      class Controller2 {}

      @Controller('/')
      class Controller3 {}

      const metadata1 = getControllerMetadata(Controller1)
      const metadata2 = getControllerMetadata(Controller2)
      const metadata3 = getControllerMetadata(Controller3)

      expect(metadata1?.prefix).toBe('api/users')
      expect(metadata2?.prefix).toBe('/api/users/')
      expect(metadata3?.prefix).toBe('/')
    })
  })

  describe('metadata persistence', () => {
    it('should persist metadata across multiple accesses', () => {
      @Controller('/api/test')
      class TestController {}

      const metadata1 = getControllerMetadata(TestController)
      const metadata2 = getControllerMetadata(TestController)

      expect(metadata1).toBe(metadata2)
      expect(metadata1?.prefix).toBe('/api/test')
    })

    it('should not interfere with other metadata', () => {
      @Controller('/api/test')
      class TestController {
        @Get('/')
        test() {}
      }

      // 添加自定义元数据
      Reflect.defineMetadata('custom', 'value', TestController)

      expect(isController(TestController)).toBe(true)
      expect(Reflect.getMetadata('custom', TestController)).toBe('value')
    })
  })
})

// 测试用的控制器类
@Controller('/api/test')
class TestController {
  @Get('/')
  test() {
    return { message: 'test' }
  }
}
