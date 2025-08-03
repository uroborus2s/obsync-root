// 统一模块处理器测试
// 测试统一模块处理器的功能

import { asClass, createContainer } from 'awilix';
import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Controller } from '../../decorators/controller.js';
import { Executor } from '../../decorators/executor.js';
import { Get } from '../../decorators/route.js';
import { ConventionBasedLifecycleManager } from '../lifecycle-manager.js';
import type { ModuleClassificationResult } from '../module-discovery.js';
import type { PluginContainerContext } from '../service-discovery.js';
import {
  processModulesUnified,
  processSingleModule
} from '../unified-module-processor.js';
import type { AutoDIConfig } from '../utils.js';

// 测试用的类
@Controller()
class TestController {
  @Get('/test')
  testMethod() {
    return 'test';
  }

  onReady() {
    return 'controller ready';
  }
}

@Executor('testExecutor')
class TestExecutor {
  name = 'testExecutor';

  async execute() {
    return { success: true };
  }

  onClose() {
    return 'executor closing';
  }
}

@Controller()
@Executor('hybridExecutor')
class HybridControllerExecutor {
  name = 'hybridExecutor';

  @Get('/hybrid')
  hybridMethod() {
    return 'hybrid';
  }

  async execute() {
    return { success: true };
  }

  onReady() {
    return 'hybrid ready';
  }
}

class RegularService {
  getName() {
    return 'regular';
  }

  onListen() {
    return 'service listening';
  }
}

describe('Unified Module Processor', () => {
  let mockFastify: any;
  let container: any;
  let pluginContext: PluginContainerContext<any>;
  let config: AutoDIConfig;
  let moduleClassification: ModuleClassificationResult;

  beforeEach(() => {
    // 模拟 Fastify 实例
    mockFastify = {
      hasDecorator: vi.fn().mockReturnValue(true),
      registerTaskExecutor: vi.fn(),
      registerExecutorDomain: vi.fn(),
      addHook: vi.fn()
    };

    // 创建容器
    container = createContainer();
    container.register({
      testController: asClass(TestController),
      testExecutor: asClass(TestExecutor),
      hybridModule: asClass(HybridControllerExecutor),
      regularService: asClass(RegularService)
    });

    // 创建生命周期管理器
    const lifecycleManager = new ConventionBasedLifecycleManager(false);

    // 模拟插件上下文
    pluginContext = {
      internalContainer: container,
      rootContainer: container,
      options: {},
      lifecycleManager,
      patterns: ['**/*.ts'],
      basePath: '/test',
      autoDIConfig: {} as AutoDIConfig,
      debugEnabled: false
    };

    // 模拟配置
    config = {
      discovery: { patterns: ['**/*.ts'] },
      routing: { enabled: true },
      lifecycle: { enabled: true },
      services: { enabled: true },
      debug: false
    };

    // 模拟模块分类结果
    moduleClassification = {
      allModules: [
        {
          name: 'testController',
          instance: new TestController(),
          constructor: TestController,
          isClass: true,
          isController: true,
          isExecutor: false,
          hasRoutes: true,
          hasLifecycleMethods: true,
          lifecycleMethods: ['onReady']
        },
        {
          name: 'testExecutor',
          instance: new TestExecutor(),
          constructor: TestExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false,
          hasLifecycleMethods: true,
          lifecycleMethods: ['onClose']
        },
        {
          name: 'hybridModule',
          instance: new HybridControllerExecutor(),
          constructor: HybridControllerExecutor,
          isClass: true,
          isController: true,
          isExecutor: true,
          hasRoutes: true,
          hasLifecycleMethods: true,
          lifecycleMethods: ['onReady']
        },
        {
          name: 'regularService',
          instance: new RegularService(),
          constructor: RegularService,
          isClass: true,
          isController: false,
          isExecutor: false,
          hasRoutes: false,
          hasLifecycleMethods: true,
          lifecycleMethods: ['onListen']
        }
      ],
      classModules: [],
      controllerModules: [],
      executorModules: [],
      routeModules: [],
      lifecycleModules: []
    };

    // 填充分类数组
    moduleClassification.classModules = moduleClassification.allModules.filter(
      (m) => m.isClass
    );
    moduleClassification.controllerModules =
      moduleClassification.allModules.filter((m) => m.isController);
    moduleClassification.executorModules =
      moduleClassification.allModules.filter((m) => m.isExecutor);
    moduleClassification.routeModules = moduleClassification.allModules.filter(
      (m) => m.hasRoutes
    );
    moduleClassification.lifecycleModules =
      moduleClassification.allModules.filter((m) => m.hasLifecycleMethods);
  });

  describe('processModulesUnified', () => {
    it('should process all module types in unified loop', async () => {
      const result = await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        false
      );

      // 验证处理结果
      expect(result.summary.totalModulesProcessed).toBe(4);
      expect(result.summary.processingTimeMs).toBeGreaterThan(0);

      // 验证生命周期处理
      expect(result.lifecycle.hooksRegistered).toBeGreaterThan(0);
      expect(result.lifecycle.servicesProcessed).toBe(4); // 所有模块都有生命周期方法

      // 验证路由处理
      expect(result.routing.controllersProcessed).toBe(2); // TestController + HybridControllerExecutor
      expect(result.routing.routesRegistered).toBeGreaterThan(0);

      // 验证执行器处理
      expect(result.executor.registered).toBe(2); // TestExecutor + HybridControllerExecutor
      expect(result.executor.executors).toContain('testExecutor');
      expect(result.executor.executors).toContain('hybridExecutor');

      // 验证 Fastify 方法被调用
      expect(mockFastify.addHook).toHaveBeenCalled();
      expect(mockFastify.registerTaskExecutor).toHaveBeenCalledTimes(2);
    });

    it('should handle disabled features gracefully', async () => {
      const disabledConfig = {
        ...config,
        lifecycle: { enabled: false },
        routing: { enabled: false }
      };

      const result = await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        disabledConfig,
        false
      );

      // 生命周期应该被跳过
      expect(result.lifecycle.hooksRegistered).toBe(0);
      expect(result.lifecycle.servicesProcessed).toBe(0);

      // 路由应该被跳过
      expect(result.routing.controllersProcessed).toBe(0);

      // 执行器仍然应该被处理
      expect(result.executor.registered).toBe(2);
    });

    it('should process lifecycle modules efficiently', async () => {
      const result = await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        true // 启用调试模式
      );

      // 验证生命周期模块被正确处理
      expect(result.lifecycle.servicesProcessed).toBe(4);
      expect(result.lifecycle.hooksRegistered).toBeGreaterThan(0);

      // 验证 addHook 被调用
      expect(mockFastify.addHook).toHaveBeenCalled();

      // 验证不同的生命周期方法被注册
      const hookCalls = mockFastify.addHook.mock.calls;
      const registeredHooks = hookCalls.map((call) => call[0]);

      // 应该包含我们模拟的生命周期方法
      expect(registeredHooks).toContain('onReady');
      expect(registeredHooks).toContain('onClose');
      expect(registeredHooks).toContain('onListen');
    });

    it('should work with debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        true // 启用调试模式
      );

      expect(result.summary.totalModulesProcessed).toBe(4);
      // 在调试模式下应该有日志输出
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle empty module classification', async () => {
      const emptyClassification: ModuleClassificationResult = {
        allModules: [],
        classModules: [],
        controllerModules: [],
        executorModules: [],
        routeModules: [],
        lifecycleModules: []
      };

      const result = await processModulesUnified(
        mockFastify,
        emptyClassification,
        pluginContext,
        config,
        false
      );

      expect(result.summary.totalModulesProcessed).toBe(0);
      expect(result.lifecycle.hooksRegistered).toBeGreaterThanOrEqual(0);
      expect(result.routing.controllersProcessed).toBe(0);
      expect(result.executor.registered).toBe(0);
    });

    it('should handle processing errors gracefully', async () => {
      // 模拟执行器注册失败
      mockFastify.registerTaskExecutor.mockImplementation(() => {
        throw new Error('Registration failed');
      });

      const result = await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        false
      );

      // 应该记录失败但不抛出异常
      expect(result.executor.failed).toBeGreaterThan(0);
      expect(result.executor.registered).toBe(0);
    });
  });

  describe('processSingleModule', () => {
    it('should process individual module', async () => {
      const moduleInfo = moduleClassification.allModules[0];
      const context = {
        fastify: mockFastify,
        pluginContext,
        config,
        debugEnabled: false
      };

      // 应该不抛出异常
      await expect(
        processSingleModule(moduleInfo, context)
      ).resolves.not.toThrow();
    });

    it('should work with debug mode', async () => {
      const consoleSpy = vi
        .spyOn(console, 'debug')
        .mockImplementation(() => {});

      const moduleInfo = moduleClassification.allModules[0];
      const context = {
        fastify: mockFastify,
        pluginContext,
        config,
        debugEnabled: true
      };

      await processSingleModule(moduleInfo, context);

      // 在调试模式下应该有调试日志
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and efficiency', () => {
    it('should complete processing within reasonable time', async () => {
      const startTime = Date.now();

      const result = await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        false
      );

      const actualTime = Date.now() - startTime;
      const reportedTime = result.summary.processingTimeMs;

      // 处理时间应该在合理范围内
      expect(actualTime).toBeLessThan(1000); // 少于1秒
      expect(reportedTime).toBeLessThanOrEqual(actualTime);
      expect(reportedTime).toBeGreaterThan(0);
    });

    it('should avoid redundant container traversals', async () => {
      // 这个测试验证我们只遍历一次模块分类结果
      // 而不是多次遍历容器
      const containerResolveSpy = vi.spyOn(container, 'resolve');

      await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        false
      );

      // 容器的 resolve 方法不应该被频繁调用
      // 因为我们使用的是预分类的模块结果
      expect(containerResolveSpy.mock.calls.length).toBeLessThan(10);

      containerResolveSpy.mockRestore();
    });
  });
});
