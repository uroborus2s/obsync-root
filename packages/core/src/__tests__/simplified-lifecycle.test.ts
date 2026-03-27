// 简化生命周期系统测试
import { describe, it, expect, beforeEach } from 'vitest';
import { LifecycleManager } from '../lifecycle/lifecycle-manager.js';
import { BeforeStart, AfterStart, OnReady, OnClose, OnError } from '../decorators/lifecycle.js';

// 测试服务类
class TestService {
  public executionOrder: string[] = [];

  @BeforeStart({ priority: 10 })
  async beforeStartMethod(): Promise<void> {
    this.executionOrder.push('beforeStart');
  }

  @AfterStart({ priority: 5 })
  async afterStartMethod(): Promise<void> {
    this.executionOrder.push('afterStart');
  }

  @OnReady({ priority: 8 })
  async onReadyMethod(): Promise<void> {
    this.executionOrder.push('onReady');
  }

  @OnClose({ priority: 3 })
  async onCloseMethod(): Promise<void> {
    this.executionOrder.push('onClose');
  }

  @OnError()
  async onErrorMethod(error: Error): Promise<void> {
    this.executionOrder.push(`onError:${error.message}`);
  }
}

describe('简化的生命周期系统', () => {
  let lifecycleManager: LifecycleManager;
  let testService: TestService;

  beforeEach(() => {
    lifecycleManager = new LifecycleManager(true);
    testService = new TestService();
    lifecycleManager.registerService('testService', TestService, testService);
  });

  it('应该支持所有5个核心生命周期阶段', () => {
    const stats = lifecycleManager.getLifecycleStats();
    
    // 验证所有5个阶段都有方法注册
    expect(stats.methodsByPhase.beforeStart).toBe(1);
    expect(stats.methodsByPhase.afterStart).toBe(1);
    expect(stats.methodsByPhase.onReady).toBe(1);
    expect(stats.methodsByPhase.onClose).toBe(1);
    expect(stats.methodsByPhase.onError).toBe(1);
  });

  it('应该按正确顺序执行 beforeStart 阶段', async () => {
    const result = await lifecycleManager.executePhase('beforeStart');
    
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(testService.executionOrder).toContain('beforeStart');
  });

  it('应该按正确顺序执行 afterStart 阶段', async () => {
    const result = await lifecycleManager.executePhase('afterStart');
    
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(testService.executionOrder).toContain('afterStart');
  });

  it('应该按正确顺序执行 onReady 阶段', async () => {
    const result = await lifecycleManager.executePhase('onReady');
    
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(testService.executionOrder).toContain('onReady');
  });

  it('应该按正确顺序执行 onClose 阶段', async () => {
    const result = await lifecycleManager.executePhase('onClose');
    
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(testService.executionOrder).toContain('onClose');
  });

  it('应该正确处理 onError 阶段', async () => {
    const testError = new Error('test error');
    const result = await lifecycleManager.executePhase('onError', testError);
    
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(testService.executionOrder).toContain('onError:test error');
  });

  it('应该提供正确的生命周期统计信息', () => {
    const stats = lifecycleManager.getLifecycleStats();
    
    expect(stats.totalServices).toBe(1);
    expect(Object.keys(stats.methodsByPhase)).toEqual([
      'beforeStart',
      'afterStart', 
      'onReady',
      'onClose',
      'onError'
    ]);
  });

  it('应该正确处理服务的生命周期方法详情', () => {
    const serviceDetails = lifecycleManager.getServiceLifecycleMethods('testService');
    
    expect(serviceDetails.totalMethods).toBe(5);
    expect(serviceDetails.methodsByPhase.beforeStart).toEqual(['beforeStartMethod']);
    expect(serviceDetails.methodsByPhase.afterStart).toEqual(['afterStartMethod']);
    expect(serviceDetails.methodsByPhase.onReady).toEqual(['onReadyMethod']);
    expect(serviceDetails.methodsByPhase.onClose).toEqual(['onCloseMethod']);
    expect(serviceDetails.methodsByPhase.onError).toEqual(['onErrorMethod']);
  });
});
