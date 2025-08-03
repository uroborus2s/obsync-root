// withRegisterAutoDI 执行器集成测试
// 测试优化后的 withRegisterAutoDI 函数的执行器处理功能

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fastify from 'fastify';
import 'reflect-metadata';
import { withRegisterAutoDI } from '../auto-di-plugin.js';
import { Controller } from '../../decorators/controller.js';
import { Executor } from '../../decorators/executor.js';
import { Get } from '../../decorators/route.js';

// 测试用的执行器类
@Executor({
  name: 'userCreator',
  description: '用户创建执行器',
  version: '1.0.0',
  tags: ['user', 'creation']
})
class UserCreatorExecutor {
  name = 'userCreator';

  async execute(context: any) {
    return {
      success: true,
      data: { userId: 123, name: 'Test User' }
    };
  }

  validateConfig(config: any) {
    return { valid: true };
  }
}

@Executor('emailSender')
class EmailSenderExecutor {
  name = 'emailSender';

  async execute(context: any) {
    return {
      success: true,
      data: { messageId: 'msg-123' }
    };
  }
}

@Controller()
class TestController {
  @Get('/test')
  testMethod() {
    return { message: 'test' };
  }
}

@Controller()
@Executor('hybridExecutor')
class HybridControllerExecutor {
  name = 'hybridExecutor';

  @Get('/hybrid')
  hybridMethod() {
    return { message: 'hybrid' };
  }

  async execute(context: any) {
    return {
      success: true,
      data: { type: 'hybrid' }
    };
  }
}

class RegularService {
  getName() {
    return 'regular';
  }
}

describe('withRegisterAutoDI Executor Integration', () => {
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
      registeredDomains: new Map()
    };

    app.decorate('registerTaskExecutor', (name: string, executor: any) => {
      mockTasksPlugin.registeredExecutors.set(name, executor);
    });

    app.decorate('registerExecutorDomain', (domain: string, executors: Record<string, any>) => {
      mockTasksPlugin.registeredDomains.set(domain, executors);
    });

    app.decorate('getTaskExecutor', async (name: string) => {
      return mockTasksPlugin.registeredExecutors.get(name);
    });

    app.decorate('listTaskExecutors', async () => {
      return Array.from(mockTasksPlugin.registeredExecutors.keys());
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Executor Discovery and Registration', () => {
    it('should discover and register executors automatically', async () => {
      const testPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          discovery: {
            patterns: [] // 使用空模式，手动注册测试类
          },
          debug: true
        }
      );

      // 手动注册测试类到容器
      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userCreatorExecutor: asClass(UserCreatorExecutor),
          emailSenderExecutor: asClass(EmailSenderExecutor),
          testController: asClass(TestController),
          regularService: asClass(RegularService)
        });
      });

      await app.register(testPlugin);

      // 验证执行器已被注册
      expect(mockTasksPlugin.registeredExecutors.has('userCreator')).toBe(true);
      expect(mockTasksPlugin.registeredExecutors.has('emailSender')).toBe(true);

      // 验证非执行器类没有被注册
      expect(mockTasksPlugin.registeredExecutors.has('testController')).toBe(false);
      expect(mockTasksPlugin.registeredExecutors.has('regularService')).toBe(false);

      // 验证执行器实例
      const userCreatorExecutor = mockTasksPlugin.registeredExecutors.get('userCreator');
      expect(userCreatorExecutor).toBeInstanceOf(UserCreatorExecutor);
      expect(userCreatorExecutor.name).toBe('userCreator');
    });

    it('should handle hybrid controller-executor classes', async () => {
      const testPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          discovery: {
            patterns: []
          },
          debug: false
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          hybridControllerExecutor: asClass(HybridControllerExecutor)
        });
      });

      await app.register(testPlugin);

      // 验证混合类既被注册为执行器，也被注册为控制器路由
      expect(mockTasksPlugin.registeredExecutors.has('hybridExecutor')).toBe(true);

      const hybridExecutor = mockTasksPlugin.registeredExecutors.get('hybridExecutor');
      expect(hybridExecutor).toBeInstanceOf(HybridControllerExecutor);
    });

    it('should skip registration when tasks plugin not available', async () => {
      // 移除 tasks 插件装饰器
      delete (app as any).registerTaskExecutor;

      const testPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          discovery: {
            patterns: []
          },
          debug: false
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userCreatorExecutor: asClass(UserCreatorExecutor)
        });
      });

      await app.register(testPlugin);

      // 验证没有执行器被注册
      expect(mockTasksPlugin.registeredExecutors.size).toBe(0);
    });

    it('should work with debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const testPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          discovery: {
            patterns: []
          },
          debug: true
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userCreatorExecutor: asClass(UserCreatorExecutor)
        });
      });

      await app.register(testPlugin);

      // 验证调试日志被输出
      expect(consoleSpy).toHaveBeenCalled();
      
      // 查找包含模块分类信息的日志
      const moduleClassificationLog = consoleSpy.mock.calls.find(call => 
        call[0]?.includes?.('Module classification completed')
      );
      expect(moduleClassificationLog).toBeDefined();

      // 查找包含执行器注册信息的日志
      const executorRegistrationLog = consoleSpy.mock.calls.find(call => 
        call[0]?.includes?.('Executor registration completed')
      );
      expect(executorRegistrationLog).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should handle executor registration failures gracefully', async () => {
      // 模拟注册失败
      app.decorate('registerTaskExecutor', (name: string, executor: any) => {
        if (name === 'userCreator') {
          throw new Error('Registration failed');
        }
        mockTasksPlugin.registeredExecutors.set(name, executor);
      });

      const testPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          discovery: {
            patterns: []
          },
          debug: false
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userCreatorExecutor: asClass(UserCreatorExecutor),
          emailSenderExecutor: asClass(EmailSenderExecutor)
        });
      });

      // 应该不会抛出异常
      await expect(app.register(testPlugin)).resolves.not.toThrow();

      // 验证部分执行器仍然被注册
      expect(mockTasksPlugin.registeredExecutors.has('userCreator')).toBe(false);
      expect(mockTasksPlugin.registeredExecutors.has('emailSender')).toBe(true);
    });
  });

  describe('Integration with existing features', () => {
    it('should work alongside controller registration', async () => {
      const testPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          // 插件逻辑
        },
        {
          discovery: {
            patterns: []
          },
          routing: {
            enabled: true
          },
          debug: false
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          testController: asClass(TestController),
          userCreatorExecutor: asClass(UserCreatorExecutor)
        });
      });

      await app.register(testPlugin);

      // 验证执行器被注册
      expect(mockTasksPlugin.registeredExecutors.has('userCreator')).toBe(true);

      // 验证路由也被注册（通过检查 Fastify 路由）
      const routes = app.printRoutes();
      expect(routes).toContain('/test');
    });

    it('should maintain proper execution order', async () => {
      const executionOrder: string[] = [];

      const testPlugin = withRegisterAutoDI(
        async (fastify, options) => {
          executionOrder.push('plugin-logic');
        },
        {
          discovery: {
            patterns: []
          },
          debug: false
        }
      );

      await app.register(async (fastify: any) => {
        const { asClass } = await import('awilix');
        fastify.diContainer.register({
          userCreatorExecutor: asClass(UserCreatorExecutor)
        });
        executionOrder.push('container-setup');
      });

      await app.register(testPlugin);
      executionOrder.push('registration-complete');

      // 验证执行顺序
      expect(executionOrder).toEqual([
        'container-setup',
        'plugin-logic',
        'registration-complete'
      ]);

      // 验证执行器在插件逻辑执行后被注册
      expect(mockTasksPlugin.registeredExecutors.has('userCreator')).toBe(true);
    });
  });
});
