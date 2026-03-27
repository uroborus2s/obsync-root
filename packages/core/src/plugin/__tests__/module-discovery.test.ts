// 模块发现测试
// 测试模块发现和分类功能

import { asClass, asFunction, asValue, createContainer } from 'awilix';
import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Controller } from '../../decorators/controller.js';
import { Executor } from '../../decorators/executor.js';
import { Get } from '../../decorators/route.js';
import {
  discoverAndClassifyModules,
  getModulesByType,
  isModuleOfType
} from '../module-discovery.js';

// 测试用的类
@Controller()
class TestController {
  @Get('/test')
  testMethod() {
    return 'test';
  }
}

@Executor('testExecutor')
class TestExecutor {
  name = 'testExecutor';
  async execute() {
    return { success: true };
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
}

class RegularService {
  getName() {
    return 'regular';
  }

  onReady() {
    return 'service ready';
  }

  onClose() {
    return 'service closing';
  }
}

function regularFunction() {
  return 'function';
}

describe('Module Discovery', () => {
  let container: any;

  beforeEach(() => {
    container = createContainer();
  });

  describe('discoverAndClassifyModules', () => {
    it('should discover and classify all module types', () => {
      // 注册不同类型的模块
      container.register({
        testController: asClass(TestController),
        testExecutor: asClass(TestExecutor),
        hybridModule: asClass(HybridControllerExecutor),
        regularService: asClass(RegularService),
        configValue: asValue({ key: 'value' }),
        functionService: asFunction(regularFunction)
      });

      const result = discoverAndClassifyModules(container, false);

      expect(result.allModules.length).toBeGreaterThan(0);
      expect(result.classModules.length).toBeGreaterThan(0);
      expect(result.controllerModules.length).toBeGreaterThan(0);
      expect(result.executorModules.length).toBeGreaterThan(0);
      expect(result.lifecycleModules.length).toBeGreaterThan(0);

      // 验证控制器模块
      const controllerModule = result.controllerModules.find(
        (m) => m.name === 'testController'
      );
      expect(controllerModule).toBeDefined();
      expect(controllerModule?.isController).toBe(true);
      expect(controllerModule?.hasRoutes).toBe(true);

      // 验证执行器模块
      const executorModule = result.executorModules.find(
        (m) => m.name === 'testExecutor'
      );
      expect(executorModule).toBeDefined();
      expect(executorModule?.isExecutor).toBe(true);

      // 验证混合模块
      const hybridModule = result.allModules.find(
        (m) => m.name === 'hybridModule'
      );
      expect(hybridModule).toBeDefined();
      expect(hybridModule?.isController).toBe(true);
      expect(hybridModule?.isExecutor).toBe(true);
      expect(hybridModule?.hasRoutes).toBe(true);

      // 验证生命周期模块
      const regularServiceModule = result.allModules.find(
        (m) => m.name === 'regularService'
      );
      expect(regularServiceModule).toBeDefined();
      expect(regularServiceModule?.hasLifecycleMethods).toBe(true);
      expect(regularServiceModule?.lifecycleMethods).toContain('onReady');
      expect(regularServiceModule?.lifecycleMethods).toContain('onClose');

      // 验证生命周期模块分类
      const lifecycleModule = result.lifecycleModules.find(
        (m) => m.name === 'regularService'
      );
      expect(lifecycleModule).toBeDefined();
    });

    it('should skip built-in services', () => {
      container.register({
        config: asValue({ test: true }),
        logger: asValue(console),
        pluginConfig: asValue({}),
        lifecycleManager: asValue({}),
        testService: asClass(RegularService)
      });

      const result = discoverAndClassifyModules(container, false);

      // 内置服务应该被跳过
      const moduleNames = result.allModules.map((m) => m.name);
      expect(moduleNames).not.toContain('config');
      expect(moduleNames).not.toContain('logger');
      expect(moduleNames).not.toContain('pluginConfig');
      expect(moduleNames).not.toContain('lifecycleManager');
      expect(moduleNames).toContain('testService');
    });

    it('should handle invalid registrations gracefully', () => {
      container.register({
        validService: asClass(RegularService),
        invalidService: null as any
      });

      // 模拟一个无效的注册
      container.registrations.brokenService = {
        resolve: () => {
          throw new Error('Broken service');
        }
      };

      const result = discoverAndClassifyModules(container, false);

      // 应该只包含有效的服务
      const moduleNames = result.allModules.map((m) => m.name);
      expect(moduleNames).toContain('validService');
      expect(moduleNames).not.toContain('invalidService');
      expect(moduleNames).not.toContain('brokenService');
    });

    it('should work with debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      container.register({
        testService: asClass(RegularService)
      });

      const result = discoverAndClassifyModules(container, true);

      expect(result.allModules.length).toBeGreaterThan(0);
      // 在调试模式下应该有日志输出
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getModulesByType', () => {
    beforeEach(() => {
      container.register({
        testController: asClass(TestController),
        testExecutor: asClass(TestExecutor),
        regularService: asClass(RegularService)
      });
    });

    it('should return class modules', () => {
      const classModules = getModulesByType(container, 'class', false);
      expect(classModules.length).toBeGreaterThan(0);
      expect(classModules.every((m) => m.isClass)).toBe(true);
    });

    it('should return controller modules', () => {
      const controllerModules = getModulesByType(
        container,
        'controller',
        false
      );
      expect(controllerModules.length).toBeGreaterThan(0);
      expect(controllerModules.every((m) => m.isController)).toBe(true);
    });

    it('should return executor modules', () => {
      const executorModules = getModulesByType(container, 'executor', false);
      expect(executorModules.length).toBeGreaterThan(0);
      expect(executorModules.every((m) => m.isExecutor)).toBe(true);
    });

    it('should return route modules', () => {
      const routeModules = getModulesByType(container, 'route', false);
      expect(routeModules.length).toBeGreaterThan(0);
      expect(routeModules.every((m) => m.hasRoutes)).toBe(true);
    });

    it('should return lifecycle modules', () => {
      const lifecycleModules = getModulesByType(container, 'lifecycle', false);
      expect(lifecycleModules.length).toBeGreaterThan(0);
      expect(lifecycleModules.every((m) => m.hasLifecycleMethods)).toBe(true);
    });

    it('should return empty array for invalid type', () => {
      const invalidModules = getModulesByType(
        container,
        'invalid' as any,
        false
      );
      expect(invalidModules).toEqual([]);
    });
  });

  describe('isModuleOfType', () => {
    it('should correctly identify module types', () => {
      const moduleInfo = {
        name: 'test',
        instance: {},
        isClass: true,
        isController: true,
        isExecutor: false,
        hasRoutes: true,
        hasLifecycleMethods: true,
        lifecycleMethods: ['onReady', 'onClose']
      };

      expect(isModuleOfType(moduleInfo, 'class')).toBe(true);
      expect(isModuleOfType(moduleInfo, 'controller')).toBe(true);
      expect(isModuleOfType(moduleInfo, 'executor')).toBe(false);
      expect(isModuleOfType(moduleInfo, 'route')).toBe(true);
      expect(isModuleOfType(moduleInfo, 'lifecycle')).toBe(true);
    });

    it('should return false for invalid type', () => {
      const moduleInfo = {
        name: 'test',
        instance: {},
        isClass: true,
        isController: false,
        isExecutor: false,
        hasRoutes: false,
        hasLifecycleMethods: false,
        lifecycleMethods: []
      };

      expect(isModuleOfType(moduleInfo, 'invalid' as any)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty container', () => {
      const result = discoverAndClassifyModules(container, false);

      expect(result.allModules).toEqual([]);
      expect(result.classModules).toEqual([]);
      expect(result.controllerModules).toEqual([]);
      expect(result.executorModules).toEqual([]);
      expect(result.routeModules).toEqual([]);
      expect(result.lifecycleModules).toEqual([]);
    });

    it('should handle modules without constructor', () => {
      const plainObject = { name: 'plain' };
      container.register({
        plainObject: asValue(plainObject)
      });

      const result = discoverAndClassifyModules(container, false);

      const plainModule = result.allModules.find(
        (m) => m.name === 'plainObject'
      );
      expect(plainModule).toBeDefined();
      expect(plainModule?.isClass).toBe(false);
      expect(plainModule?.constructor).toBeUndefined();
    });

    it('should handle function registrations', () => {
      container.register({
        functionService: asFunction(() => ({ name: 'function' }))
      });

      const result = discoverAndClassifyModules(container, false);

      const functionModule = result.allModules.find(
        (m) => m.name === 'functionService'
      );
      expect(functionModule).toBeDefined();
      expect(functionModule?.isClass).toBe(false);
    });

    it('should detect lifecycle methods correctly', () => {
      class ServiceWithLifecycle {
        onReady() {
          return 'ready';
        }
        onListen() {
          return 'listening';
        }
        onClose() {
          return 'closing';
        }
        regularMethod() {
          return 'regular';
        }
      }

      class ServiceWithoutLifecycle {
        regularMethod() {
          return 'regular';
        }
      }

      container.register({
        serviceWithLifecycle: asClass(ServiceWithLifecycle),
        serviceWithoutLifecycle: asClass(ServiceWithoutLifecycle)
      });

      const result = discoverAndClassifyModules(container, false);

      // 验证有生命周期方法的服务
      const withLifecycle = result.allModules.find(
        (m) => m.name === 'serviceWithLifecycle'
      );
      expect(withLifecycle).toBeDefined();
      expect(withLifecycle?.hasLifecycleMethods).toBe(true);
      expect(withLifecycle?.lifecycleMethods).toContain('onReady');
      expect(withLifecycle?.lifecycleMethods).toContain('onListen');
      expect(withLifecycle?.lifecycleMethods).toContain('onClose');
      expect(withLifecycle?.lifecycleMethods).not.toContain('regularMethod');

      // 验证没有生命周期方法的服务
      const withoutLifecycle = result.allModules.find(
        (m) => m.name === 'serviceWithoutLifecycle'
      );
      expect(withoutLifecycle).toBeDefined();
      expect(withoutLifecycle?.hasLifecycleMethods).toBe(false);
      expect(withoutLifecycle?.lifecycleMethods).toEqual([]);

      // 验证生命周期模块分类
      expect(result.lifecycleModules).toContainEqual(
        expect.objectContaining({ name: 'serviceWithLifecycle' })
      );
      expect(result.lifecycleModules).not.toContainEqual(
        expect.objectContaining({ name: 'serviceWithoutLifecycle' })
      );
    });
  });
});
