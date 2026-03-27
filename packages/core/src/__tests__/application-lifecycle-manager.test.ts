// ApplicationLifecycleManager 修复验证测试
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplicationLifecycleManager } from '../lifecycle/application-lifecycle-manager.js';
import type { LifecycleHooks } from '../types/config.js';

// 模拟 Fastify 实例
const mockFastify = {
  addHook: vi.fn(),
  setErrorHandler: vi.fn(),
  errorHandler: null
} as any;

describe('ApplicationLifecycleManager 修复验证', () => {
  let manager: ApplicationLifecycleManager;

  beforeEach(() => {
    manager = new ApplicationLifecycleManager(true);
    vi.clearAllMocks();
  });

  it('应该正确处理不同类型的生命周期钩子参数', async () => {
    const executionOrder: string[] = [];

    const hooks: LifecycleHooks = {
      beforeStart: async () => {
        executionOrder.push('beforeStart');
      },
      afterStart: async (fastify) => {
        executionOrder.push('afterStart');
        expect(fastify).toBeDefined();
      },
      onReady: async (fastify) => {
        executionOrder.push('onReady');
        expect(fastify).toBeDefined();
      },
      onClose: async () => {
        executionOrder.push('onClose');
      },
      onError: async (error) => {
        executionOrder.push(`onError:${error.message}`);
      }
    };

    manager.registerHooks(hooks);

    // 测试各个阶段的执行
    const beforeStartResult = await manager.executeBeforeStart();
    expect(beforeStartResult.success).toBe(true);
    expect(beforeStartResult.phase).toBe('beforeStart');

    const afterStartResult = await manager.executeAfterStart(mockFastify);
    expect(afterStartResult.success).toBe(true);
    expect(afterStartResult.phase).toBe('afterStart');

    const onReadyResult = await manager.executeOnReady(mockFastify);
    expect(onReadyResult.success).toBe(true);
    expect(onReadyResult.phase).toBe('onReady');

    const onCloseResult = await manager.executeOnClose();
    expect(onCloseResult.success).toBe(true);
    expect(onCloseResult.phase).toBe('onClose');

    const onErrorResult = await manager.executeOnError(new Error('test'));
    expect(onErrorResult.success).toBe(true);
    expect(onErrorResult.phase).toBe('onError');

    expect(executionOrder).toEqual([
      'beforeStart',
      'afterStart',
      'onReady',
      'onClose',
      'onError:test'
    ]);
  });

  it('应该正确处理空钩子的情况', async () => {
    // 不注册任何钩子
    const result = await manager.executeBeforeStart();
    
    expect(result.success).toBe(true);
    expect(result.duration).toBe(0);
    expect(result.phase).toBe('beforeStart');
  });

  it('应该正确处理钩子执行失败的情况', async () => {
    const hooks: LifecycleHooks = {
      beforeStart: async () => {
        throw new Error('beforeStart failed');
      }
    };

    manager.registerHooks(hooks);

    const result = await manager.executeBeforeStart();
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('beforeStart failed');
    expect(result.phase).toBe('beforeStart');
    expect(result.duration).toBeGreaterThan(0);
  });

  it('应该正确注册 Fastify 钩子', () => {
    const hooks: LifecycleHooks = {
      onReady: async () => {},
      onClose: async () => {},
      onError: async () => {}
    };

    manager.registerHooks(hooks);
    manager.registerFastifyHooks(mockFastify);

    expect(mockFastify.addHook).toHaveBeenCalledWith('onReady', expect.any(Function));
    expect(mockFastify.addHook).toHaveBeenCalledWith('onClose', expect.any(Function));
    expect(mockFastify.setErrorHandler).toHaveBeenCalledWith(expect.any(Function));
  });

  it('应该正确报告已注册的钩子', () => {
    expect(manager.hasHooks()).toBe(false);
    expect(manager.getRegisteredHooks()).toEqual([]);

    const hooks: LifecycleHooks = {
      beforeStart: async () => {},
      onReady: async () => {}
    };

    manager.registerHooks(hooks);

    expect(manager.hasHooks()).toBe(true);
    expect(manager.getRegisteredHooks()).toEqual(['beforeStart', 'onReady']);
  });

  it('应该正确清理资源', () => {
    const hooks: LifecycleHooks = {
      beforeStart: async () => {}
    };

    manager.registerHooks(hooks);
    expect(manager.hasHooks()).toBe(true);

    manager.dispose();
    expect(manager.hasHooks()).toBe(false);
  });

  it('setFastifyInstance 方法应该正常工作（兼容性）', () => {
    // 这个方法现在只是为了兼容性，不应该抛出错误
    expect(() => {
      manager.setFastifyInstance(mockFastify);
    }).not.toThrow();
  });
});
