// @stratix/core 即时注册模式测试
// 测试重构后的 discoverAndProcessModules 方法的即时注册功能

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import { createContainer, asClass, type AwilixContainer } from 'awilix';
import { discoverAndProcessModules } from '../module-discovery.js';
import { withRegisterAutoDI } from '../auto-di-plugin.js';
import type { AutoDIConfig } from '../utils.js';

// 测试用的装饰器
import { Controller, Get, Executor } from '../../decorators/index.js';

// 测试控制器
@Controller('/test')
class TestController {
  @Get('/hello')
  async hello() {
    return { message: 'Hello from immediate registration!' };
  }

  @Get('/world')
  async world() {
    return { message: 'World from immediate registration!' };
  }
}

// 测试执行器
@Executor({
  name: 'testExecutor',
  description: 'Test executor for immediate registration'
})
class TestExecutor {
  name = 'testExecutor';

  async execute(task: any) {
    return { result: 'executed', task };
  }
}

// 测试生命周期服务
class LifecycleService {
  async onReady() {
    console.log('LifecycleService ready');
  }

  async onClose() {
    console.log('LifecycleService closing');
  }
}

// 普通服务
class RegularService {
  getName() {
    return 'RegularService';
  }
}

describe('Immediate Registration Mode', () => {
  let app: FastifyInstance;
  let container: AwilixContainer;
  let mockTasksPlugin: any;

  beforeEach(async () => {
    app = fastify({ logger: false });
    container = createContainer();

    // 模拟 tasks 插件
    mockTasksPlugin = {
      registeredExecutors: new Map(),
      registerTaskExecutor: vi.fn((name: string, executor: any) => {
        mockTasksPlugin.registeredExecutors.set(name, executor);
      })
    };

    // 装饰 Fastify 实例
    app.decorate('diContainer', container);
    app.decorate('registerTaskExecutor', mockTasksPlugin.registerTaskExecutor);
    app.decorate('hasDecorator', (name: string) => {
      return name === 'registerTaskExecutor';
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('discoverAndProcessModules with immediate registration', () => {
    beforeEach(() => {
      // 注册测试模块到容器
      container.register({
        testController: asClass(TestController),
        testExecutor: asClass(TestExecutor),
        lifecycleService: asClass(LifecycleService),
        regularService: asClass(RegularService)
      });
    });

    it('should immediately register routes during discovery', async () => {
      const result = await discoverAndProcessModules(
        container,
        app,
        undefined,
        true
      );

      // 验证统计信息
      expect(result.statistics.controllerModules).toBe(1);
      expect(result.routeConfigs).toHaveLength(1);
      expect(result.routeConfigs[0].routeMethods).toHaveLength(2);

      // 验证路由已经注册到 Fastify
      const routes = app.printRoutes();
      expect(routes).toContain('/test/hello');
      expect(routes).toContain('/test/world');

      // 验证路由可以正常工作
      const response1 = await app.inject({
        method: 'GET',
        url: '/test/hello'
      });
      expect(response1.statusCode).toBe(200);
      expect(JSON.parse(response1.payload)).toEqual({
        message: 'Hello from immediate registration!'
      });

      const response2 = await app.inject({
        method: 'GET',
        url: '/test/world'
      });
      expect(response2.statusCode).toBe(200);
      expect(JSON.parse(response2.payload)).toEqual({
        message: 'World from immediate registration!'
      });
    });

    it('should immediately register executors during discovery', async () => {
      const result = await discoverAndProcessModules(
        container,
        app,
        undefined,
        true
      );

      // 验证统计信息
      expect(result.statistics.executorModules).toBe(1);
      expect(result.executorConfigs).toHaveLength(1);

      // 验证执行器已经注册到 tasks 插件
      expect(mockTasksPlugin.registerTaskExecutor).toHaveBeenCalledWith(
        'testExecutor',
        expect.any(Object)
      );
      expect(mockTasksPlugin.registeredExecutors.has('testExecutor')).toBe(true);

      // 验证注册的执行器实例
      const registeredExecutor = mockTasksPlugin.registeredExecutors.get('testExecutor');
      expect(registeredExecutor).toBeDefined();
      expect(registeredExecutor.name).toBe('testExecutor');
      expect(typeof registeredExecutor.execute).toBe('function');
    });

    it('should handle lifecycle services correctly', async () => {
      const mockLifecycleManager = {
        scanAndRegisterService: vi.fn()
      };

      const result = await discoverAndProcessModules(
        container,
        app,
        mockLifecycleManager,
        true
      );

      // 验证统计信息
      expect(result.statistics.lifecycleModules).toBe(1);
      expect(result.lifecycleConfigs).toHaveLength(1);

      // 验证生命周期服务已注册到管理器
      expect(mockLifecycleManager.scanAndRegisterService).toHaveBeenCalledWith(
        'lifecycleService',
        expect.any(Object)
      );
    });

    it('should work without fastify instance (fallback mode)', async () => {
      const result = await discoverAndProcessModules(
        container,
        undefined, // 没有 fastify 实例
        undefined,
        true
      );

      // 验证统计信息
      expect(result.statistics.controllerModules).toBe(1);
      expect(result.statistics.executorModules).toBe(1);
      expect(result.routeConfigs).toHaveLength(1);
      expect(result.executorConfigs).toHaveLength(1);

      // 验证没有立即注册（因为没有 fastify 实例）
      expect(mockTasksPlugin.registerTaskExecutor).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully during immediate registration', async () => {
      // 模拟路由注册失败
      const originalRoute = app.route;
      app.route = vi.fn().mockImplementation(() => {
        throw new Error('Route registration failed');
      });

      const result = await discoverAndProcessModules(
        container,
        app,
        undefined,
        true
      );

      // 验证错误被捕获
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Route registration failed');

      // 恢复原始方法
      app.route = originalRoute;
    });
  });

  describe('Integration with withRegisterAutoDI', () => {
    it('should work with the complete withRegisterAutoDI flow', async () => {
      const testPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
          fastify.get('/plugin-route', async () => ({ message: 'Plugin route' }));
        },
        {
          discovery: {
            patterns: [] // 使用空模式，手动注册测试类
          },
          routing: {
            enabled: true,
            prefix: '',
            validation: false
          },
          debug: true
        }
      );

      // 手动注册测试类到容器
      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          testController: asClass(TestController),
          testExecutor: asClass(TestExecutor)
        });
      });

      await app.register(testPlugin);

      // 验证路由已注册
      const routes = app.printRoutes();
      expect(routes).toContain('/test/hello');
      expect(routes).toContain('/test/world');
      expect(routes).toContain('/plugin-route');

      // 验证执行器已注册
      expect(mockTasksPlugin.registeredExecutors.has('testExecutor')).toBe(true);

      // 验证路由功能
      const response = await app.inject({
        method: 'GET',
        url: '/test/hello'
      });
      expect(response.statusCode).toBe(200);
    });
  });
});
