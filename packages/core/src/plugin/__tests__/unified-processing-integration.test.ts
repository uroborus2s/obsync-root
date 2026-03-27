// 统一模块处理集成测试
// 测试优化后的 withRegisterAutoDI 统一处理流程

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fastify from 'fastify';
import 'reflect-metadata';
import { withRegisterAutoDI } from '../auto-di-plugin.js';
import { Controller } from '../../decorators/controller.js';
import { Executor } from '../../decorators/executor.js';
import { Get, Post } from '../../decorators/route.js';

// 测试用的完整业务模块
@Controller()
class UserController {
  @Get('/users')
  getUsers() {
    return { users: [] };
  }

  @Post('/users')
  createUser() {
    return { success: true };
  }

  // 生命周期方法
  onReady() {
    console.log('UserController ready');
  }

  onClose() {
    console.log('UserController closing');
  }
}

@Executor({
  name: 'userProcessor',
  description: '用户数据处理器',
  version: '1.0.0'
})
class UserProcessorExecutor {
  name = 'userProcessor';

  async execute(context: any) {
    return {
      success: true,
      data: { processed: true }
    };
  }

  // 生命周期方法
  onReady() {
    console.log('UserProcessorExecutor ready');
  }
}

@Controller()
@Executor('orderManager')
class OrderManagerHybrid {
  name = 'orderManager';

  @Get('/orders')
  getOrders() {
    return { orders: [] };
  }

  async execute(context: any) {
    return {
      success: true,
      data: { orderProcessed: true }
    };
  }

  // 生命周期方法
  onReady() {
    console.log('OrderManagerHybrid ready');
  }

  onListen() {
    console.log('OrderManagerHybrid listening');
  }
}

class NotificationService {
  sendNotification(message: string) {
    return `Sent: ${message}`;
  }

  // 生命周期方法
  onReady() {
    console.log('NotificationService ready');
  }
}

describe('Unified Processing Integration', () => {
  let app: any;
  let mockTasksPlugin: any;

  beforeEach(async () => {
    app = fastify();

    // 模拟 @fastify/awilix 插件
    await app.register(async (fastify: any) => {
      const { createContainer } = await import('awilix');
      const container = createContainer();
      fastify.decorate('diContainer', container);
    });

    // 模拟 tasks 插件的装饰器
    mockTasksPlugin = {
      registeredExecutors: new Map(),
      registeredDomains: new Map(),
      hooksCalled: []
    };

    app.decorate('registerTaskExecutor', (name: string, executor: any) => {
      mockTasksPlugin.registeredExecutors.set(name, executor);
    });

    app.decorate('registerExecutorDomain', (domain: string, executors: Record<string, any>) => {
      mockTasksPlugin.registeredDomains.set(domain, executors);
    });

    // 监听生命周期钩子调用
    const originalAddHook = app.addHook.bind(app);
    app.addHook = vi.fn((hookName: string, handler: any) => {
      mockTasksPlugin.hooksCalled.push(hookName);
      return originalAddHook(hookName, handler);
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Complete unified processing flow', () => {
    it('should process all module types in single unified loop', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const businessPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 业务插件逻辑
          fastify.log.info('Business plugin loaded');
        },
        {
          discovery: {
            patterns: [] // 使用空模式，手动注册测试类
          },
          routing: {
            enabled: true,
            prefix: '/api'
          },
          lifecycle: {
            enabled: true,
            debug: true
          },
          debug: true
        }
      );

      // 手动注册测试类到容器
      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userController: asClass(UserController),
          userProcessorExecutor: asClass(UserProcessorExecutor),
          orderManagerHybrid: asClass(OrderManagerHybrid),
          notificationService: asClass(NotificationService)
        });
      });

      await app.register(businessPlugin);

      // 验证统一处理的结果

      // 1. 验证执行器注册
      expect(mockTasksPlugin.registeredExecutors.has('userProcessor')).toBe(true);
      expect(mockTasksPlugin.registeredExecutors.has('orderManager')).toBe(true);
      expect(mockTasksPlugin.registeredExecutors.size).toBe(2);

      // 2. 验证生命周期钩子注册
      expect(mockTasksPlugin.hooksCalled).toContain('onReady');
      expect(mockTasksPlugin.hooksCalled).toContain('onListen');
      expect(mockTasksPlugin.hooksCalled).toContain('onClose');

      // 3. 验证路由注册
      const routes = app.printRoutes();
      expect(routes).toContain('/api/users');
      expect(routes).toContain('/api/orders');

      // 4. 验证调试日志包含统一处理信息
      const unifiedProcessingLogs = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes?.('Unified module processing') || 
        call[0]?.includes?.('统一模块处理')
      );
      expect(unifiedProcessingLogs.length).toBeGreaterThan(0);

      // 5. 验证处理时间被记录
      const timingLogs = consoleSpy.mock.calls.filter(call => 
        call[1]?.processingTime || call[0]?.includes?.('processingTime')
      );
      expect(timingLogs.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('should maintain processing order and efficiency', async () => {
      const processingOrder: string[] = [];
      const originalLog = console.log;

      // 监听处理顺序
      console.log = vi.fn((...args) => {
        const message = args[0];
        if (typeof message === 'string') {
          if (message.includes('Module classification completed')) {
            processingOrder.push('classification');
          } else if (message.includes('Unified module processing')) {
            processingOrder.push('unified-processing');
          } else if (message.includes('Service adapters registered')) {
            processingOrder.push('service-adapters');
          }
        }
        originalLog(...args);
      });

      const businessPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          processingOrder.push('plugin-logic');
        },
        {
          discovery: { patterns: [] },
          debug: true
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userController: asClass(UserController),
          userProcessorExecutor: asClass(UserProcessorExecutor)
        });
        processingOrder.push('container-setup');
      });

      await app.register(businessPlugin);
      processingOrder.push('registration-complete');

      // 验证处理顺序
      expect(processingOrder).toEqual([
        'container-setup',
        'classification',
        'unified-processing',
        'service-adapters',
        'plugin-logic',
        'registration-complete'
      ]);

      console.log = originalLog;
    });

    it('should handle mixed module types efficiently', async () => {
      const performanceSpy = vi.spyOn(Date, 'now');
      let callCount = 0;
      performanceSpy.mockImplementation(() => {
        callCount++;
        return 1000 + callCount; // 模拟时间递增
      });

      const businessPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          discovery: { patterns: [] },
          debug: false
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userController: asClass(UserController),
          userProcessorExecutor: asClass(UserProcessorExecutor),
          orderManagerHybrid: asClass(OrderManagerHybrid),
          notificationService: asClass(NotificationService)
        });
      });

      await app.register(businessPlugin);

      // 验证混合类型模块都被正确处理
      expect(mockTasksPlugin.registeredExecutors.has('userProcessor')).toBe(true);
      expect(mockTasksPlugin.registeredExecutors.has('orderManager')).toBe(true);

      // 验证路由被注册
      const routes = app.printRoutes();
      expect(routes).toContain('/users');
      expect(routes).toContain('/orders');

      // 验证生命周期钩子被注册
      expect(mockTasksPlugin.hooksCalled.length).toBeGreaterThan(0);

      performanceSpy.mockRestore();
    });

    it('should provide comprehensive processing statistics', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const businessPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          discovery: { patterns: [] },
          debug: true
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userController: asClass(UserController),
          userProcessorExecutor: asClass(UserProcessorExecutor),
          orderManagerHybrid: asClass(OrderManagerHybrid),
          notificationService: asClass(NotificationService)
        });
      });

      await app.register(businessPlugin);

      // 查找包含统计信息的日志
      const statsLog = consoleSpy.mock.calls.find(call => 
        call[0]?.includes?.('Unified module processing summary')
      );

      expect(statsLog).toBeDefined();
      
      if (statsLog && statsLog[1]) {
        const stats = statsLog[1];
        expect(stats.processingTime).toBeDefined();
        expect(stats.totalModules).toBe(4);
        expect(stats.lifecycle).toBeDefined();
        expect(stats.routing).toBeDefined();
        expect(stats.executors).toBeDefined();
        expect(stats.executors.registered).toBe(2);
        expect(stats.executors.names).toContain('userProcessor');
        expect(stats.executors.names).toContain('orderManager');
      }

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully without breaking the flow', async () => {
      // 模拟执行器注册失败
      app.decorate('registerTaskExecutor', (name: string, executor: any) => {
        if (name === 'userProcessor') {
          throw new Error('Registration failed');
        }
        mockTasksPlugin.registeredExecutors.set(name, executor);
      });

      const businessPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑应该继续执行
        },
        {
          discovery: { patterns: [] },
          debug: false
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userController: asClass(UserController),
          userProcessorExecutor: asClass(UserProcessorExecutor),
          orderManagerHybrid: asClass(OrderManagerHybrid)
        });
      });

      // 应该不抛出异常
      await expect(app.register(businessPlugin)).resolves.not.toThrow();

      // 验证部分功能仍然工作
      expect(mockTasksPlugin.registeredExecutors.has('orderManager')).toBe(true);
      expect(mockTasksPlugin.registeredExecutors.has('userProcessor')).toBe(false);

      // 路由注册应该仍然工作
      const routes = app.printRoutes();
      expect(routes).toContain('/users');
      expect(routes).toContain('/orders');
    });
  });
});
