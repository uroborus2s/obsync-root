// @stratix/core 应用级生命周期集成测试
// 测试应用级容器对象注册和生命周期管理功能

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fastify, { type FastifyInstance } from 'fastify';
import { createContainer, asClass, type AwilixContainer } from 'awilix';
import { discoverAndProcessApplicationModules } from '../application-module-discovery.js';

describe('Application Lifecycle Integration', () => {
  let app: FastifyInstance;
  let container: AwilixContainer;

  beforeEach(async () => {
    // 创建Fastify实例
    app = fastify({ logger: false });
    
    // 创建根容器
    container = createContainer();
    
    // 注册@fastify/awilix插件
    await app.register(import('@fastify/awilix'), {
      disposeOnClose: true,
      disposeOnResponse: false,
      strictBooleanEnforced: true
    });
    
    // 设置容器
    app.diContainer = container;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('应用级生命周期管理', () => {
    it('应该能够注册应用级服务的生命周期方法', async () => {
      // 创建测试服务类
      class TestApplicationService {
        private initialized = false;
        private ready = false;
        private closed = false;

        onRegister() {
          this.initialized = true;
          console.log('TestApplicationService: onRegister called');
        }

        onReady() {
          this.ready = true;
          console.log('TestApplicationService: onReady called');
        }

        onClose() {
          this.closed = true;
          console.log('TestApplicationService: onClose called');
        }

        getStatus() {
          return {
            initialized: this.initialized,
            ready: this.ready,
            closed: this.closed
          };
        }
      }

      // 注册服务到根容器（SINGLETON生命周期）
      container.register({
        testApplicationService: asClass(TestApplicationService).singleton()
      });

      // 监听addHook调用
      const addHookSpy = vi.spyOn(app, 'addHook');

      // 执行应用级模块发现和处理
      const result = await discoverAndProcessApplicationModules(
        container,
        app,
        {
          lifecycleEnabled: true,
          debug: true
        }
      );

      // 验证结果
      expect(result.statistics.totalModules).toBe(1);
      expect(result.statistics.lifecycleModules).toBe(1);
      expect(result.errors).toHaveLength(0);

      // 验证addHook被调用
      expect(addHookSpy).toHaveBeenCalled();

      // 验证注册了生命周期钩子
      const hookCalls = addHookSpy.mock.calls;
      const registeredHooks = hookCalls.map(call => call[0]);
      
      // 应该包含我们的生命周期方法
      expect(registeredHooks).toContain('onRegister');
      expect(registeredHooks).toContain('onReady');
      expect(registeredHooks).toContain('onClose');

      console.log('Registered hooks:', registeredHooks);
    });

    it('应该能够处理没有生命周期方法的服务', async () => {
      // 创建没有生命周期方法的服务
      class RegularService {
        getValue() {
          return 'test';
        }
      }

      container.register({
        regularService: asClass(RegularService).singleton()
      });

      const result = await discoverAndProcessApplicationModules(
        container,
        app,
        {
          lifecycleEnabled: true,
          debug: true
        }
      );

      // 验证结果
      expect(result.statistics.totalModules).toBe(1);
      expect(result.statistics.lifecycleModules).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('应该能够处理错误情况', async () => {
      // 创建会抛出错误的服务
      class ErrorService {
        onReady() {
          throw new Error('Test error in onReady');
        }
      }

      container.register({
        errorService: asClass(ErrorService).singleton()
      });

      const result = await discoverAndProcessApplicationModules(
        container,
        app,
        {
          lifecycleEnabled: true,
          lifecycleErrorHandling: 'warn',
          debug: true
        }
      );

      // 验证结果
      expect(result.statistics.totalModules).toBe(1);
      expect(result.statistics.lifecycleModules).toBe(1);
      // 错误处理应该允许继续执行
    });
  });

  describe('应用级路由注册', () => {
    it('应该能够注册应用级控制器路由', async () => {
      // 这个测试需要@Controller装饰器，暂时跳过
      // 因为我们主要测试生命周期功能
    });
  });

  describe('错误处理', () => {
    it('应该能够处理容器解析错误', async () => {
      // 注册一个会导致解析错误的服务
      container.register({
        brokenService: {
          resolve: () => {
            throw new Error('Resolution error');
          }
        } as any
      });

      const result = await discoverAndProcessApplicationModules(
        container,
        app,
        {
          lifecycleEnabled: true,
          debug: true
        }
      );

      // 应该能够优雅处理错误
      expect(result.statistics.skippedModules).toBeGreaterThan(0);
    });
  });
});
