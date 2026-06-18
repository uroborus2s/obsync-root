// 统一模块处理器测试
// 测试统一模块处理器的功能

import { asClass, createContainer } from 'awilix';
import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Controller } from '../../decorators/controller.js';
import { Get } from '../../decorators/route.js';
import { ConventionBasedLifecycleManager } from '../lifecycle-manager.js';
import type { ModuleClassificationResult } from '../module-discovery.js';
import type { PluginContainerContext } from '../service-discovery.js';
import {
  processModulesUnified,
  processSingleModule
} from '../unified-module-processor.js';
import type { AutoDIConfig } from '../utils.js';

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

@Controller()
class HybridController {
  @Get('/hybrid')
  hybridMethod() {
    return 'hybrid';
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
    mockFastify = {
      hasDecorator: vi.fn().mockReturnValue(true),
      addHook: vi.fn(),
      log: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }
    };

    container = createContainer();
    container.register({
      testController: asClass(TestController),
      hybridModule: asClass(HybridController),
      regularService: asClass(RegularService)
    });

    const lifecycleManager = new ConventionBasedLifecycleManager(false);

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

    config = {
      discovery: { patterns: ['**/*.ts'] },
      routing: { enabled: true },
      lifecycle: { enabled: true },
      services: { enabled: true },
      debug: false
    };

    moduleClassification = {
      allModules: [
        {
          name: 'testController',
          instance: new TestController(),
          constructor: TestController,
          isClass: true,
          isController: true,
          hasRoutes: true,
          hasLifecycleMethods: true,
          lifecycleMethods: ['onReady']
        },
        {
          name: 'hybridModule',
          instance: new HybridController(),
          constructor: HybridController,
          isClass: true,
          isController: true,
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
          hasRoutes: false,
          hasLifecycleMethods: true,
          lifecycleMethods: ['onListen']
        }
      ],
      classModules: [],
      controllerModules: [],
      routeModules: [],
      lifecycleModules: []
    };

    moduleClassification.classModules = moduleClassification.allModules.filter(
      (moduleInfo) => moduleInfo.isClass
    );
    moduleClassification.controllerModules =
      moduleClassification.allModules.filter((moduleInfo) => moduleInfo.isController);
    moduleClassification.routeModules = moduleClassification.allModules.filter(
      (moduleInfo) => moduleInfo.hasRoutes
    );
    moduleClassification.lifecycleModules =
      moduleClassification.allModules.filter((moduleInfo) => moduleInfo.hasLifecycleMethods);
  });

  describe('processModulesUnified', () => {
    it('processes routing and lifecycle modules without executor results', async () => {
      const result = await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        false
      );

      expect(result.summary.totalModulesProcessed).toBe(3);
      expect(result.summary.processingTimeMs).toBeGreaterThanOrEqual(0);

      expect(result.lifecycle.hooksRegistered).toBeGreaterThan(0);
      expect(result.lifecycle.servicesProcessed).toBe(3);

      expect(result.routing.controllersProcessed).toBe(2);
      expect(result.routing.routesRegistered).toBeGreaterThan(0);

      expect(result).not.toHaveProperty('executor');
      expect(mockFastify.addHook).toHaveBeenCalled();
      expect(mockFastify).not.toHaveProperty('registerTaskExecutor');
      expect(mockFastify).not.toHaveProperty('registerExecutorDomain');
    });

    it('handles disabled features gracefully', async () => {
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

      expect(result.lifecycle.hooksRegistered).toBe(0);
      expect(result.lifecycle.servicesProcessed).toBe(0);
      expect(result.routing.controllersProcessed).toBe(0);
      expect(result).not.toHaveProperty('executor');
    });

    it('processes lifecycle modules efficiently', async () => {
      const result = await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        true
      );

      expect(result.lifecycle.servicesProcessed).toBe(3);
      expect(result.lifecycle.hooksRegistered).toBeGreaterThan(0);

      const hookCalls = mockFastify.addHook.mock.calls;
      const registeredHooks = hookCalls.map((call) => call[0]);

      expect(registeredHooks).toContain('onReady');
      expect(registeredHooks).toContain('onListen');
    });

    it('works with debug mode', async () => {
      const result = await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        true
      );

      expect(result.summary.totalModulesProcessed).toBe(3);
      expect(result).not.toHaveProperty('executor');
    });

    it('handles empty module classification', async () => {
      const emptyClassification: ModuleClassificationResult = {
        allModules: [],
        classModules: [],
        controllerModules: [],
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
      expect(result).not.toHaveProperty('executor');
    });
  });

  describe('processSingleModule', () => {
    it('processes individual module without task-executor metadata', async () => {
      const moduleInfo = moduleClassification.allModules[0];
      const context = {
        fastify: mockFastify,
        pluginContext,
        config,
        debugEnabled: false
      };

      await expect(
        processSingleModule(moduleInfo, context)
      ).resolves.not.toThrow();
    });
  });

  describe('Performance and efficiency', () => {
    it('completes processing within reasonable time', async () => {
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

      expect(actualTime).toBeLessThan(1000);
      expect(reportedTime).toBeLessThanOrEqual(actualTime);
      expect(reportedTime).toBeGreaterThanOrEqual(0);
    });

    it('avoids redundant container traversals', async () => {
      const containerResolveSpy = vi.spyOn(container, 'resolve');

      await processModulesUnified(
        mockFastify,
        moduleClassification,
        pluginContext,
        config,
        false
      );

      expect(containerResolveSpy.mock.calls.length).toBeLessThan(10);

      containerResolveSpy.mockRestore();
    });
  });
});
