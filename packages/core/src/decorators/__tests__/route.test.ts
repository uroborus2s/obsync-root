// 路由装饰器测试
// 测试路由装饰器的功能

import { describe, it, expect, beforeEach } from 'vitest'
import 'reflect-metadata'
import { Get, Post, Put, Delete, Patch, Head, Options, getRouteMetadata } from '../route.js'
import { Controller } from '../controller.js'

describe('Route decorators', () => {
  beforeEach(() => {
    // 清理元数据
    Reflect.deleteMetadata('routes', TestController)
  })

  describe('@Get decorator', () => {
    it('should register GET route', () => {
      class TestController {
        @Get('/users')
        getUsers() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes).toHaveLength(1)
      expect(routes[0].method).toBe('GET')
      expect(routes[0].path).toBe('/users')
      expect(routes[0].propertyKey).toBe('getUsers')
    })

    it('should work without path', () => {
      class TestController {
        @Get()
        index() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes).toHaveLength(1)
      expect(routes[0].method).toBe('GET')
      expect(routes[0].path).toBe('/')
    })

    it('should accept route options', () => {
      class TestController {
        @Get('/users', {
          schema: {
            response: {
              200: { type: 'array' }
            }
          }
        })
        getUsers() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].options?.schema?.response?.[200]).toEqual({ type: 'array' })
    })
  })

  describe('@Post decorator', () => {
    it('should register POST route', () => {
      class TestController {
        @Post('/users')
        createUser() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].method).toBe('POST')
      expect(routes[0].path).toBe('/users')
    })

    it('should handle request body schema', () => {
      class TestController {
        @Post('/users', {
          schema: {
            body: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              }
            }
          }
        })
        createUser() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].options?.schema?.body?.type).toBe('object')
    })
  })

  describe('@Put decorator', () => {
    it('should register PUT route', () => {
      class TestController {
        @Put('/users/:id')
        updateUser() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].method).toBe('PUT')
      expect(routes[0].path).toBe('/users/:id')
    })
  })

  describe('@Delete decorator', () => {
    it('should register DELETE route', () => {
      class TestController {
        @Delete('/users/:id')
        deleteUser() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].method).toBe('DELETE')
      expect(routes[0].path).toBe('/users/:id')
    })
  })

  describe('@Patch decorator', () => {
    it('should register PATCH route', () => {
      class TestController {
        @Patch('/users/:id')
        patchUser() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].method).toBe('PATCH')
      expect(routes[0].path).toBe('/users/:id')
    })
  })

  describe('@Head decorator', () => {
    it('should register HEAD route', () => {
      class TestController {
        @Head('/users')
        headUsers() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].method).toBe('HEAD')
      expect(routes[0].path).toBe('/users')
    })
  })

  describe('@Options decorator', () => {
    it('should register OPTIONS route', () => {
      class TestController {
        @Options('/users')
        optionsUsers() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].method).toBe('OPTIONS')
      expect(routes[0].path).toBe('/users')
    })
  })

  describe('multiple routes', () => {
    it('should handle multiple routes on same class', () => {
      class TestController {
        @Get('/users')
        getUsers() {}

        @Post('/users')
        createUser() {}

        @Get('/users/:id')
        getUser() {}

        @Put('/users/:id')
        updateUser() {}

        @Delete('/users/:id')
        deleteUser() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes).toHaveLength(5)

      const methods = routes.map(r => r.method)
      expect(methods).toContain('GET')
      expect(methods).toContain('POST')
      expect(methods).toContain('PUT')
      expect(methods).toContain('DELETE')

      const getPaths = routes.filter(r => r.method === 'GET').map(r => r.path)
      expect(getPaths).toContain('/users')
      expect(getPaths).toContain('/users/:id')
    })

    it('should preserve route order', () => {
      class TestController {
        @Get('/first')
        first() {}

        @Post('/second')
        second() {}

        @Put('/third')
        third() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].path).toBe('/first')
      expect(routes[1].path).toBe('/second')
      expect(routes[2].path).toBe('/third')
    })
  })

  describe('with controller decorator', () => {
    it('should work with controller decorator', () => {
      @Controller('/api')
      class ApiController {
        @Get('/users')
        getUsers() {}

        @Post('/users')
        createUser() {}
      }

      const routes = getRouteMetadata(ApiController)
      expect(routes).toHaveLength(2)
      expect(routes[0].method).toBe('GET')
      expect(routes[1].method).toBe('POST')
    })
  })

  describe('route options', () => {
    it('should handle complex route options', () => {
      class TestController {
        @Get('/users', {
          schema: {
            querystring: {
              type: 'object',
              properties: {
                page: { type: 'integer', minimum: 1 },
                limit: { type: 'integer', minimum: 1, maximum: 100 }
              }
            },
            response: {
              200: {
                type: 'object',
                properties: {
                  users: { type: 'array' },
                  total: { type: 'integer' }
                }
              }
            }
          },
          preHandler: [],
          config: {
            rateLimit: {
              max: 100,
              timeWindow: '1 minute'
            }
          }
        })
        getUsers() {}
      }

      const routes = getRouteMetadata(TestController)
      const route = routes[0]
      
      expect(route.options?.schema?.querystring?.properties?.page?.type).toBe('integer')
      expect(route.options?.schema?.response?.[200]?.properties?.users?.type).toBe('array')
      expect(route.options?.config?.rateLimit?.max).toBe(100)
    })

    it('should handle middleware in options', () => {
      const middleware1 = () => {}
      const middleware2 = () => {}

      class TestController {
        @Post('/users', {
          preHandler: [middleware1, middleware2]
        })
        createUser() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].options?.preHandler).toEqual([middleware1, middleware2])
    })
  })

  describe('inheritance', () => {
    it('should handle route inheritance', () => {
      class BaseController {
        @Get('/health')
        health() {}
      }

      class ExtendedController extends BaseController {
        @Get('/info')
        info() {}
      }

      const baseRoutes = getRouteMetadata(BaseController)
      const extendedRoutes = getRouteMetadata(ExtendedController)

      expect(baseRoutes).toHaveLength(1)
      expect(baseRoutes[0].path).toBe('/health')

      expect(extendedRoutes).toHaveLength(1)
      expect(extendedRoutes[0].path).toBe('/info')
    })
  })

  describe('error handling', () => {
    it('should handle invalid targets', () => {
      const notAClass = {}
      expect(getRouteMetadata(notAClass)).toEqual([])
    })

    it('should handle classes without routes', () => {
      class EmptyController {}
      expect(getRouteMetadata(EmptyController)).toEqual([])
    })
  })

  describe('path normalization', () => {
    it('should handle various path formats', () => {
      class TestController {
        @Get('users')
        method1() {}

        @Get('/users/')
        method2() {}

        @Get('')
        method3() {}

        @Get()
        method4() {}
      }

      const routes = getRouteMetadata(TestController)
      expect(routes[0].path).toBe('users')
      expect(routes[1].path).toBe('/users/')
      expect(routes[2].path).toBe('')
      expect(routes[3].path).toBe('/')
    })
  })
})

// 测试用的控制器类
class TestController {
  @Get('/test')
  test() {
    return { message: 'test' }
  }
}
