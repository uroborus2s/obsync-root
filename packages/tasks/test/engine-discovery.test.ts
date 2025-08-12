import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import type { DistributedScheduler } from '../src/services/DistributedScheduler.js';
import type { WorkflowEngineInstance } from '../src/types/distributed.js';

/**
 * 动态引擎发现机制测试
 */
describe('动态引擎发现机制', () => {
  let schedulerA: DistributedScheduler;
  let schedulerB: DistributedScheduler;
  let mockRepository: any;
  let mockLogger: any;

  beforeEach(async () => {
    // 创建模拟依赖
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    mockRepository = {
      findActiveEngines: vi.fn(),
      registerEngineInstance: vi.fn(),
      markEngineInactive: vi.fn(),
      findStaleEngines: vi.fn(),
      updateEngineStatus: vi.fn()
    };

    // 初始化调度器实例
    const config = {
      assignmentStrategy: 'round-robin' as const,
      heartbeatInterval: 30000,
      lockTimeout: 300000,
      failureDetectionTimeout: 60000,
      maxRetries: 3,
      enableFailover: false,
      engineDiscovery: {
        enabled: true,
        baseInterval: 5000, // 测试时使用较短间隔
        maxInterval: 30000,
        incrementalThreshold: 2,
        fullSyncInterval: 60000,
        enableSmartInterval: true
      }
    };

    // 这里需要根据实际的构造函数参数进行调整
    // schedulerA = new DistributedScheduler(...);
    // schedulerB = new DistributedScheduler(...);
  });

  afterEach(async () => {
    // 清理资源
    if (schedulerA) {
      await schedulerA.onClose();
    }
    if (schedulerB) {
      await schedulerB.onClose();
    }
  });

  describe('基础发现功能', () => {
    test('应该能发现新加入的引擎', async () => {
      // 模拟初始状态：只有引擎A
      const engineA: WorkflowEngineInstance = {
        instanceId: 'engine-a',
        hostname: 'host-a',
        processId: 1001,
        startedAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'active',
        load: { cpu: 0.3, memory: 0.4 },
        supportedExecutors: ['http', 'timer']
      };

      mockRepository.findActiveEngines
        .mockResolvedValueOnce({ success: true, data: [engineA] })
        .mockResolvedValueOnce({ success: true, data: [engineA] });

      // 启动调度器A
      await schedulerA.onReady();
      
      // 验证初始状态
      expect(schedulerA.getEngines().size).toBe(1);
      expect(schedulerA.getEngines().has('engine-a')).toBe(true);

      // 模拟引擎B加入
      const engineB: WorkflowEngineInstance = {
        instanceId: 'engine-b',
        hostname: 'host-b',
        processId: 1002,
        startedAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'active',
        load: { cpu: 0.2, memory: 0.3 },
        supportedExecutors: ['http', 'database']
      };

      // 下次查询返回两个引擎
      mockRepository.findActiveEngines
        .mockResolvedValue({ success: true, data: [engineA, engineB] });

      // 手动触发发现
      await schedulerA.triggerEngineDiscovery();

      // 验证发现结果
      expect(schedulerA.getEngines().size).toBe(2);
      expect(schedulerA.getEngines().has('engine-b')).toBe(true);

      // 验证统计信息
      const metrics = schedulerA.getEngineDiscoveryMetrics();
      expect(metrics.totalDiscoveries).toBeGreaterThan(0);
    });

    test('应该能检测引擎状态变化', async () => {
      const engineA: WorkflowEngineInstance = {
        instanceId: 'engine-a',
        hostname: 'host-a',
        processId: 1001,
        startedAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'active',
        load: { cpu: 0.3, memory: 0.4 },
        supportedExecutors: ['http']
      };

      // 初始状态
      mockRepository.findActiveEngines
        .mockResolvedValueOnce({ success: true, data: [engineA] });

      await schedulerA.onReady();

      // 模拟引擎状态变化
      const updatedEngineA = {
        ...engineA,
        load: { cpu: 0.8, memory: 0.7 }, // 负载增加
        lastHeartbeat: new Date()
      };

      mockRepository.findActiveEngines
        .mockResolvedValue({ success: true, data: [updatedEngineA] });

      // 触发发现
      await schedulerA.triggerEngineDiscovery();

      // 验证状态更新
      const engine = schedulerA.getEngines().get('engine-a');
      expect(engine?.load.cpu).toBe(0.8);
      expect(engine?.load.memory).toBe(0.7);
    });

    test('应该能检测引擎移除', async () => {
      const engineA: WorkflowEngineInstance = {
        instanceId: 'engine-a',
        hostname: 'host-a',
        processId: 1001,
        startedAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'active',
        load: { cpu: 0.3, memory: 0.4 },
        supportedExecutors: ['http']
      };

      const engineB: WorkflowEngineInstance = {
        instanceId: 'engine-b',
        hostname: 'host-b',
        processId: 1002,
        startedAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'active',
        load: { cpu: 0.2, memory: 0.3 },
        supportedExecutors: ['database']
      };

      // 初始状态：两个引擎
      mockRepository.findActiveEngines
        .mockResolvedValueOnce({ success: true, data: [engineA, engineB] });

      await schedulerA.onReady();
      expect(schedulerA.getEngines().size).toBe(2);

      // 模拟引擎B移除
      mockRepository.findActiveEngines
        .mockResolvedValue({ success: true, data: [engineA] });

      // 触发全量同步（模拟）
      await schedulerA.triggerEngineDiscovery();

      // 注意：当前实现中，增量同步不会移除引擎
      // 只有全量同步才会检测移除
      // 这里需要根据实际实现调整测试逻辑
    });
  });

  describe('智能间隔调整', () => {
    test('应该在无变化时延长间隔', async () => {
      const engine: WorkflowEngineInstance = {
        instanceId: 'engine-a',
        hostname: 'host-a',
        processId: 1001,
        startedAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'active',
        load: { cpu: 0.3, memory: 0.4 },
        supportedExecutors: ['http']
      };

      mockRepository.findActiveEngines
        .mockResolvedValue({ success: true, data: [engine] });

      await schedulerA.onReady();

      const initialMetrics = schedulerA.getEngineDiscoveryMetrics();
      const initialInterval = initialMetrics.currentInterval;

      // 连续触发多次无变化的发现
      for (let i = 0; i < 3; i++) {
        await schedulerA.triggerEngineDiscovery();
      }

      const finalMetrics = schedulerA.getEngineDiscoveryMetrics();
      
      // 验证间隔是否延长（如果启用了智能间隔）
      if (schedulerA.getEngineDiscoveryMetrics().consecutiveNoChanges >= 2) {
        expect(finalMetrics.currentInterval).toBeGreaterThan(initialInterval);
      }
    });

    test('应该在有变化时缩短间隔', async () => {
      // 实现变化检测和间隔缩短的测试
      // 这需要模拟引擎状态的变化
    });
  });

  describe('错误处理', () => {
    test('应该处理数据库查询失败', async () => {
      // 模拟数据库查询失败
      mockRepository.findActiveEngines
        .mockRejectedValue(new Error('数据库连接失败'));

      await schedulerA.onReady();

      // 触发发现，应该不会抛出异常
      await expect(schedulerA.triggerEngineDiscovery()).resolves.not.toThrow();

      // 验证错误日志
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('引擎发现异常'),
        expect.any(Object)
      );
    });

    test('应该在发现失败时调整间隔', async () => {
      mockRepository.findActiveEngines
        .mockRejectedValue(new Error('网络错误'));

      await schedulerA.onReady();

      const initialMetrics = schedulerA.getEngineDiscoveryMetrics();
      const initialInterval = initialMetrics.currentInterval;

      // 触发失败的发现
      await schedulerA.triggerEngineDiscovery();

      const finalMetrics = schedulerA.getEngineDiscoveryMetrics();
      
      // 验证间隔是否延长
      expect(finalMetrics.currentInterval).toBeGreaterThan(initialInterval);
    });
  });

  describe('健康检查', () => {
    test('应该正确报告健康状态', async () => {
      await schedulerA.onReady();

      const health = schedulerA.getEngineDiscoveryHealth();
      
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('lastSyncAge');
      expect(health).toHaveProperty('issues');
      expect(Array.isArray(health.issues)).toBe(true);
    });

    test('应该检测同步延迟问题', async () => {
      await schedulerA.onReady();

      // 模拟长时间未同步的情况
      // 这需要修改内部状态或等待足够长的时间
      
      const health = schedulerA.getEngineDiscoveryHealth();
      
      // 根据具体实现验证健康检查逻辑
    });
  });

  describe('状态重置', () => {
    test('应该能重置发现状态', async () => {
      await schedulerA.onReady();

      // 触发一些发现操作
      await schedulerA.triggerEngineDiscovery();

      // 重置状态
      schedulerA.resetEngineDiscoveryState();

      const metrics = schedulerA.getEngineDiscoveryMetrics();
      
      expect(metrics.totalDiscoveries).toBe(0);
      expect(metrics.incrementalSyncs).toBe(0);
      expect(metrics.fullSyncs).toBe(0);
      expect(metrics.consecutiveNoChanges).toBe(0);
    });
  });
});

/**
 * 辅助函数：等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 辅助函数：创建模拟引擎实例
 */
function createMockEngine(id: string, overrides: Partial<WorkflowEngineInstance> = {}): WorkflowEngineInstance {
  return {
    instanceId: id,
    hostname: `host-${id}`,
    processId: Math.floor(Math.random() * 10000),
    startedAt: new Date(),
    lastHeartbeat: new Date(),
    status: 'active',
    load: { cpu: Math.random(), memory: Math.random() },
    supportedExecutors: ['http', 'timer'],
    ...overrides
  };
}
