// 双层生命周期架构测试
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplicationLifecycleManager } from '../lifecycle/application-lifecycle-manager.js';
import { LifecycleManager } from '../lifecycle/lifecycle-manager.js';
import { BeforeStart, AfterStart, OnReady, OnClose, OnError } from '../decorators/lifecycle.js';
import type { LifecycleHooks } from '../types/config.js';

// 模拟 Fastify 实例
const mockFastify = {
  addHook: vi.fn(),
  setErrorHandler: vi.fn(),
  errorHandler: null
} as any;

// 测试服务类
class TestDatabaseService {
  public executionOrder: string[] = [];

  @BeforeStart({ priority: 10 })
  async validateConfig(): Promise<void> {
    this.executionOrder.push('plugin-beforeStart');
  }

  @AfterStart({ priority: 5 })
  async initializeFactory(): Promise<void> {
    this.executionOrder.push('plugin-afterStart');
  }

  @OnReady({ priority: 8 })
  async preCreateConnections(): Promise<void> {
    this.executionOrder.push('plugin-onReady');
  }

  @OnClose({ priority: 3 })
  async closeConnections(): Promise<void> {
    this.executionOrder.push('plugin-onClose');
  }

  @OnError()
  async handleError(error: Error): Promise<void> {
    this.executionOrder.push(`plugin-onError:${error.message}`);
  }
}

describe('双层生命周期架构', () => {
  let applicationLifecycleManager: ApplicationLifecycleManager;
  let pluginLifecycleManager: LifecycleManager;
  let testService: TestDatabaseService;
  let executionOrder: string[];

  beforeEach(() => {
    // 重置执行顺序记录
    executionOrder = [];
    
    // 创建应用级生命周期管理器
    applicationLifecycleManager = new ApplicationLifecycleManager(true);
    
    // 创建插件级生命周期管理器
    pluginLifecycleManager = new LifecycleManager(true);
    testService = new TestDatabaseService();
    pluginLifecycleManager.registerService('testDatabaseService', TestDatabaseService, testService);
    
    // 重置 mock
    vi.clearAllMocks();
  });

  describe('应用级生命周期管理器', () => {
    it('应该正确注册和执行应用级生命周期钩子', async () => {
      const hooks: LifecycleHooks = {
        beforeStart: async () => {
          executionOrder.push('app-beforeStart');
        },
        afterStart: async (fastify) => {
          executionOrder.push('app-afterStart');
          expect(fastify).toBeDefined();
        },
        onReady: async (fastify) => {
          executionOrder.push('app-onReady');
          expect(fastify).toBeDefined();
        },
        onClose: async () => {
          executionOrder.push('app-onClose');
        },
        onError: async (error) => {
          executionOrder.push(`app-onError:${error.message}`);
        }
      };

      // 注册钩子
      applicationLifecycleManager.registerHooks(hooks);
      expect(applicationLifecycleManager.hasHooks()).toBe(true);
      expect(applicationLifecycleManager.getRegisteredHooks()).toEqual([
        'beforeStart', 'afterStart', 'onReady', 'onClose', 'onError'
      ]);

      // 执行各个阶段
      await applicationLifecycleManager.executeBeforeStart();
      await applicationLifecycleManager.executeAfterStart(mockFastify);
      await applicationLifecycleManager.executeOnReady(mockFastify);
      await applicationLifecycleManager.executeOnClose();
      await applicationLifecycleManager.executeOnError(new Error('test'));

      expect(executionOrder).toEqual([
        'app-beforeStart',
        'app-afterStart', 
        'app-onReady',
        'app-onClose',
        'app-onError:test'
      ]);
    });

    it('应该正确注册 Fastify 钩子', () => {
      const hooks: LifecycleHooks = {
        onReady: async () => {},
        onClose: async () => {},
        onError: async () => {}
      };

      applicationLifecycleManager.registerHooks(hooks);
      applicationLifecycleManager.registerFastifyHooks(mockFastify);

      // 验证 Fastify 钩子被正确注册
      expect(mockFastify.addHook).toHaveBeenCalledWith('onReady', expect.any(Function));
      expect(mockFastify.addHook).toHaveBeenCalledWith('onClose', expect.any(Function));
      expect(mockFastify.setErrorHandler).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('插件级生命周期管理器', () => {
    it('应该正确执行插件级生命周期方法', async () => {
      // 执行各个阶段
      await pluginLifecycleManager.executePhase('beforeStart');
      await pluginLifecycleManager.executePhase('afterStart');
      await pluginLifecycleManager.executePhase('onReady');
      await pluginLifecycleManager.executePhase('onClose');
      await pluginLifecycleManager.executePhase('onError', new Error('plugin-test'));

      expect(testService.executionOrder).toEqual([
        'plugin-beforeStart',
        'plugin-afterStart',
        'plugin-onReady', 
        'plugin-onClose',
        'plugin-onError:plugin-test'
      ]);
    });

    it('应该提供正确的生命周期统计信息', () => {
      const stats = pluginLifecycleManager.getLifecycleStats();
      
      expect(stats.totalServices).toBe(1);
      expect(stats.methodsByPhase).toEqual({
        beforeStart: 1,
        afterStart: 1,
        onReady: 1,
        onClose: 1,
        onError: 1
      });
    });
  });

  describe('双层架构集成', () => {
    it('应该按正确顺序执行双层生命周期', async () => {
      // 注册应用级钩子
      const appHooks: LifecycleHooks = {
        beforeStart: async () => {
          executionOrder.push('app-beforeStart');
        },
        afterStart: async () => {
          executionOrder.push('app-afterStart');
        },
        onReady: async () => {
          executionOrder.push('app-onReady');
        },
        onClose: async () => {
          executionOrder.push('app-onClose');
        }
      };

      applicationLifecycleManager.registerHooks(appHooks);

      // 模拟完整的启动流程
      // 1. 应用级 beforeStart
      await applicationLifecycleManager.executeBeforeStart();
      
      // 2. 插件级 beforeStart 和 afterStart（插件注册时）
      await pluginLifecycleManager.executePhase('beforeStart');
      await pluginLifecycleManager.executePhase('afterStart');
      
      // 3. 应用级 afterStart
      await applicationLifecycleManager.executeAfterStart(mockFastify);
      
      // 4. 应用级和插件级 onReady（并行或顺序）
      await applicationLifecycleManager.executeOnReady(mockFastify);
      await pluginLifecycleManager.executePhase('onReady');

      // 验证执行顺序
      const expectedOrder = [
        'app-beforeStart',           // 应用级 beforeStart
        'plugin-beforeStart',        // 插件级 beforeStart
        'plugin-afterStart',         // 插件级 afterStart
        'app-afterStart',            // 应用级 afterStart
        'app-onReady',               // 应用级 onReady
        'plugin-onReady'             // 插件级 onReady
      ];

      expect([...executionOrder, ...testService.executionOrder]).toEqual(expectedOrder);
    });

    it('应该正确处理关闭流程', async () => {
      // 注册应用级钩子
      const appHooks: LifecycleHooks = {
        onClose: async () => {
          executionOrder.push('app-onClose');
        }
      };

      applicationLifecycleManager.registerHooks(appHooks);

      // 模拟关闭流程
      await applicationLifecycleManager.executeOnClose();
      await pluginLifecycleManager.executePhase('onClose');

      expect([...executionOrder, ...testService.executionOrder]).toEqual([
        'app-onClose',
        'plugin-onClose'
      ]);
    });

    it('应该正确处理错误传播', async () => {
      // 注册应用级错误处理
      const appHooks: LifecycleHooks = {
        onError: async (error) => {
          executionOrder.push(`app-onError:${error.message}`);
        }
      };

      applicationLifecycleManager.registerHooks(appHooks);

      const testError = new Error('critical-error');

      // 模拟错误处理流程
      await applicationLifecycleManager.executeOnError(testError);
      await pluginLifecycleManager.executePhase('onError', testError);

      expect([...executionOrder, ...testService.executionOrder]).toEqual([
        'app-onError:critical-error',
        'plugin-onError:critical-error'
      ]);
    });
  });

  describe('错误处理和恢复', () => {
    it('应该正确处理应用级钩子执行失败', async () => {
      const failingHooks: LifecycleHooks = {
        beforeStart: async () => {
          throw new Error('app-beforeStart-failed');
        }
      };

      applicationLifecycleManager.registerHooks(failingHooks);

      const result = await applicationLifecycleManager.executeBeforeStart();
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('app-beforeStart-failed');
    });

    it('应该正确处理插件级生命周期方法失败', async () => {
      // 创建一个会失败的服务
      class FailingService {
        @OnReady()
        async failingMethod(): Promise<void> {
          throw new Error('plugin-onReady-failed');
        }
      }

      const failingService = new FailingService();
      pluginLifecycleManager.registerService('failingService', FailingService, failingService);

      const result = await pluginLifecycleManager.executePhase('onReady');
      
      expect(result.failureCount).toBe(1);
      expect(result.results.some(r => !r.success && r.error?.message === 'plugin-onReady-failed')).toBe(true);
    });
  });
});
