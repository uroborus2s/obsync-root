/**
 * 分布式调度器
 *
 * 负责工作流和节点的分布式调度和负载均衡
 */

import { AwilixContainer, RESOLVER, type Logger } from '@stratix/core';
import { TasksPluginOptions } from 'src/index.js';
import type { IDistributedSchedulerRepository } from '../repositories/DistributedSchedulerRepository.js';
import type {
  DistributedSchedulingConfig,
  EngineDiscoveryConfig,
  EngineDiscoveryMetrics,
  FailoverEvent,
  NodeAssignment,
  WorkflowAssignment,
  WorkflowEngineInstance
} from '../types/distributed.js';
import type { IDistributedLockManager } from './DistributedLockManager.js';

/**
 * 分布式调度器接口
 */
export interface IDistributedScheduler {
  /**
   * 注册引擎实例
   */
  registerEngine(instance: WorkflowEngineInstance): Promise<void>;

  /**
   * 注销引擎实例
   */
  unregisterEngine(instanceId: string): Promise<void>;

  /**
   * 更新引擎心跳
   */
  updateHeartbeat(
    instanceId: string,
    load: WorkflowEngineInstance['load']
  ): Promise<void>;

  /**
   * 分配工作流执行
   */
  assignWorkflow(
    workflowInstanceId: number
  ): Promise<WorkflowAssignment | null>;

  /**
   * 分配节点执行
   */
  assignNode(
    workflowInstanceId: number,
    nodeId: string,
    requiredCapabilities?: string[]
  ): Promise<NodeAssignment | null>;

  /**
   * 检测故障并执行故障转移
   */
  detectFailuresAndFailover(): Promise<FailoverEvent[]>;

  /**
   * 获取活跃引擎列表
   */
  getActiveEngines(): Promise<WorkflowEngineInstance[]>;

  /**
   * 从数据库恢复引擎状态
   */
  loadEnginesFromDatabase(): Promise<void>;

  /**
   * 清理过期的引擎实例
   */
  cleanupStaleEngines(): Promise<number>;

  /**
   * 启动动态引擎发现
   */
  startEngineDiscovery(): void;

  /**
   * 停止动态引擎发现
   */
  stopEngineDiscovery(): void;

  /**
   * 手动触发引擎发现
   */
  triggerEngineDiscovery(): Promise<void>;

  /**
   * 获取引擎发现统计信息
   */
  getEngineDiscoveryMetrics(): EngineDiscoveryMetrics;
}

/**
 * 分布式调度器实现
 */
export default class DistributedScheduler implements IDistributedScheduler {
  private readonly engines = new Map<string, WorkflowEngineInstance>();
  private heartbeatTimer?: NodeJS.Timeout | undefined;
  private cleanupTimer?: NodeJS.Timeout | undefined;
  private readonly cleanupInterval = 300000; // 5分钟清理间隔
  private currentInstanceId = '';

  // 引擎发现相关属性
  private engineDiscoveryTimer?: NodeJS.Timeout | undefined;
  private lastSyncTimestamp: Date = new Date(0);
  private lastFullSyncTimestamp: Date = new Date(0);
  private currentDiscoveryInterval: number = 60000; // 默认60秒
  private consecutiveNoChanges: number = 0;
  private discoveryMetrics: EngineDiscoveryMetrics = {
    totalDiscoveries: 0,
    incrementalSyncs: 0,
    fullSyncs: 0,
    lastSyncAt: new Date(0),
    currentInterval: 60000,
    consecutiveNoChanges: 0
  };
  private readonly discoveryConfig: EngineDiscoveryConfig;

  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      // 从插件配置中提取分布式调度配置
      const config = container.resolve('config') as TasksPluginOptions;
      const userConfig =
        config.distributed || ({} as Partial<DistributedSchedulingConfig>);

      // 提供完整的默认配置，只提取DistributedSchedulingConfig需要的字段
      const options: DistributedSchedulingConfig = {
        assignmentStrategy: userConfig.assignmentStrategy || 'round-robin',
        heartbeatInterval: userConfig.heartbeatInterval || 30000,
        lockTimeout: userConfig.lockTimeout || 300000,
        failureDetectionTimeout: userConfig.failureDetectionTimeout || 60000,
        maxRetries: userConfig.maxRetries || 3,
        enableFailover: userConfig.enableFailover || false,
        engineDiscovery: {
          enabled: userConfig.engineDiscovery?.enabled ?? true,
          baseInterval: userConfig.engineDiscovery?.baseInterval || 60000,
          maxInterval: userConfig.engineDiscovery?.maxInterval || 300000,
          incrementalThreshold:
            userConfig.engineDiscovery?.incrementalThreshold || 3,
          fullSyncInterval:
            userConfig.engineDiscovery?.fullSyncInterval || 1800000, // 30分钟
          enableSmartInterval:
            userConfig.engineDiscovery?.enableSmartInterval ?? true
        }
      };

      return { options };
    }
  };

  constructor(
    private readonly distributedLockManager: IDistributedLockManager,
    private readonly logger: Logger,
    private readonly options: DistributedSchedulingConfig,
    private readonly distributedSchedulerRepository: IDistributedSchedulerRepository
  ) {
    // 初始化引擎发现配置
    this.discoveryConfig = this.options.engineDiscovery || {
      enabled: true,
      baseInterval: 60000,
      maxInterval: 300000,
      incrementalThreshold: 3,
      fullSyncInterval: 1800000,
      enableSmartInterval: true
    };

    // 初始化发现间隔
    this.currentDiscoveryInterval = this.discoveryConfig.baseInterval;
    this.discoveryMetrics.currentInterval = this.currentDiscoveryInterval;
  }

  /**
   * Stratix框架生命周期钩子：服务就绪
   */
  async onReady(): Promise<void> {
    this.logger.info('分布式调度器开始初始化');

    try {
      // 1. 从数据库加载现有引擎
      await this.loadEnginesFromDatabase();

      // 2. 启动心跳监控
      this.startHeartbeatMonitoring();

      // 3. 启动引擎清理定时器
      this.startEngineCleanup();

      // 4. 启动动态引擎发现
      if (this.discoveryConfig.enabled) {
        this.startEngineDiscovery();
        this.logger.info('动态引擎发现已启动', {
          baseInterval: this.discoveryConfig.baseInterval,
          maxInterval: this.discoveryConfig.maxInterval
        });
      }

      this.logger.info('分布式调度器初始化完成');
    } catch (error) {
      this.logger.error('分布式调度器初始化失败', { error });
      throw error;
    }
  }

  /**
   * Stratix框架生命周期钩子：服务关闭
   */
  async onClose(): Promise<void> {
    this.logger.info('分布式调度器开始关闭');

    try {
      // 1. 停止心跳监控
      this.stopHeartbeatMonitoring();

      // 2. 停止引擎清理定时器
      this.stopEngineCleanup();

      // 3. 停止动态引擎发现
      this.stopEngineDiscovery();

      // 4. 标记当前引擎为非活跃
      await this.distributedSchedulerRepository.markEngineInactive(
        this.currentInstanceId
      );

      // 5. 清理内存状态
      this.engines.clear();

      this.logger.info('分布式调度器关闭完成');
    } catch (error) {
      this.logger.error('分布式调度器关闭失败', { error });
      throw error;
    }
  }

  /**
   * 从数据库加载引擎
   */
  async loadEnginesFromDatabase(): Promise<void> {
    try {
      const result =
        await this.distributedSchedulerRepository.findActiveEngines();

      if (result.success) {
        for (const engine of result.data) {
          this.engines.set(engine.instanceId, engine);
        }

        this.logger.info('从数据库加载引擎完成', {
          engineCount: result.data.length
        });
      } else {
        this.logger.warn('从数据库加载引擎失败', { error: result.error });
      }
    } catch (error) {
      this.logger.error('从数据库加载引擎异常', { error });
    }
  }

  /**
   * 注册引擎实例
   */
  async registerEngine(instance: WorkflowEngineInstance): Promise<void> {
    try {
      // 1. 内存注册
      this.engines.set(instance.instanceId, instance);

      // 2. 数据库持久化
      const result =
        await this.distributedSchedulerRepository.registerEngineInstance(
          instance
        );

      if (!result.success) {
        // 回滚内存注册
        this.engines.delete(instance.instanceId);
        throw new Error(`引擎注册失败: ${result.error}`);
      }
      this.currentInstanceId = instance.instanceId;

      this.logger.info('引擎实例注册成功', {
        instanceId: instance.instanceId,
        hostname: instance.hostname,
        supportedExecutors: instance.supportedExecutors
      });
    } catch (error) {
      this.logger.error('引擎实例注册失败', {
        instanceId: instance.instanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 注销引擎实例
   */
  async unregisterEngine(instanceId: string): Promise<void> {
    try {
      const engine = this.engines.get(instanceId);
      if (engine) {
        // 标记引擎为非活跃状态
        engine.status = 'inactive';

        // 从内存中移除
        this.engines.delete(instanceId);

        this.logger.info('引擎实例注销成功', {
          instanceId,
          hostname: engine.hostname
        });
      } else {
        this.logger.warn('尝试注销不存在的引擎实例', { instanceId });
      }
    } catch (error) {
      this.logger.error('引擎实例注销失败', {
        instanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 更新引擎心跳
   */
  async updateHeartbeat(
    instanceId: string,
    load: WorkflowEngineInstance['load']
  ): Promise<void> {
    try {
      // 1. 更新内存状态
      const engine = this.engines.get(instanceId);
      if (engine) {
        engine.lastHeartbeat = new Date();
        engine.load = load;
        engine.status = 'active';
      }

      // 2. 更新数据库
      await this.distributedSchedulerRepository.updateEngineHeartbeat(
        instanceId,
        load
      );
    } catch (error) {
      this.logger.error('更新引擎心跳失败', { instanceId, error });
      throw error;
    }
  }

  /**
   * 分配工作流执行
   */
  async assignWorkflow(
    workflowInstanceId: number
  ): Promise<WorkflowAssignment | null> {
    try {
      // 获取工作流锁
      const lockKey = `workflow:${workflowInstanceId}`;
      const lockAcquired = await this.distributedLockManager.acquireLock(
        lockKey,
        this.currentInstanceId,
        'workflow',
        this.options.lockTimeout
      );

      if (!lockAcquired) {
        this.logger.debug('工作流已被其他实例锁定', { workflowInstanceId });
        return null;
      }

      // 选择最佳引擎实例
      const selectedEngine = await this.selectBestEngine();
      if (!selectedEngine) {
        await this.distributedLockManager.releaseLock(
          lockKey,
          this.currentInstanceId
        );
        this.logger.warn('没有可用的引擎实例', { workflowInstanceId });
        return null;
      }

      const assignment: WorkflowAssignment = {
        workflowInstanceId,
        assignedEngineId: selectedEngine.instanceId,
        assignedAt: new Date(),
        assignmentReason: `Selected by ${this.options.assignmentStrategy} strategy`
      };

      this.logger.info('工作流分配成功', assignment);
      return assignment;
    } catch (error) {
      this.logger.error('工作流分配失败', {
        workflowInstanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * 分配节点执行
   */
  async assignNode(
    workflowInstanceId: number,
    nodeId: string,
    requiredCapabilities?: string[]
  ): Promise<NodeAssignment | null> {
    try {
      // 获取节点锁
      const lockKey = `node:${workflowInstanceId}:${nodeId}`;
      const lockAcquired = await this.distributedLockManager.acquireLock(
        lockKey,
        this.currentInstanceId,
        'node',
        this.options.lockTimeout
      );

      if (!lockAcquired) {
        this.logger.debug('节点已被其他实例锁定', {
          workflowInstanceId,
          nodeId
        });
        return null;
      }

      // 选择具备所需能力的引擎实例
      const selectedEngine =
        await this.selectEngineByCapability(requiredCapabilities);
      if (!selectedEngine) {
        await this.distributedLockManager.releaseLock(
          lockKey,
          this.currentInstanceId
        );
        this.logger.warn('没有具备所需能力的引擎实例', {
          workflowInstanceId,
          nodeId,
          requiredCapabilities
        });
        return null;
      }

      const assignment: NodeAssignment = {
        nodeId,
        workflowInstanceId,
        assignedEngineId: selectedEngine.instanceId,
        assignedAt: new Date()
      };

      this.logger.info('节点分配成功', assignment);
      return assignment;
    } catch (error) {
      this.logger.error('节点分配失败', {
        workflowInstanceId,
        nodeId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * 检测故障并执行故障转移
   */
  async detectFailuresAndFailover(): Promise<FailoverEvent[]> {
    const failoverEvents: FailoverEvent[] = [];
    const now = new Date();
    const failureThreshold = new Date(
      now.getTime() - this.options.failureDetectionTimeout
    );

    try {
      for (const [instanceId, engine] of this.engines.entries()) {
        if (
          engine.lastHeartbeat < failureThreshold &&
          engine.status === 'active'
        ) {
          this.logger.warn('检测到引擎实例故障', {
            instanceId,
            lastHeartbeat: engine.lastHeartbeat,
            threshold: failureThreshold
          });

          const failoverEvent = await this.handleEngineFailure(instanceId);
          if (failoverEvent) {
            failoverEvents.push(failoverEvent);
          }
        }
      }
    } catch (error) {
      this.logger.error('故障检测异常', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return failoverEvents;
  }

  /**
   * 获取活跃引擎列表
   */
  async getActiveEngines(): Promise<WorkflowEngineInstance[]> {
    return Array.from(this.engines.values()).filter(
      (engine) => engine.status === 'active'
    );
  }

  /**
   * 选择最佳引擎实例
   */
  private async selectBestEngine(): Promise<WorkflowEngineInstance | null> {
    const activeEngines = await this.getActiveEngines();
    if (activeEngines.length === 0) {
      return null;
    }

    switch (this.options.assignmentStrategy) {
      case 'round-robin':
        return this.selectByRoundRobin(activeEngines);
      case 'load-balanced':
        return this.selectByLoadBalance(activeEngines);
      case 'affinity':
        return this.selectByAffinity(activeEngines);
      case 'capability':
        return this.selectByCapability(activeEngines);
      case 'locality':
        return this.selectByLocality(activeEngines);
      default:
        return activeEngines[0];
    }
  }

  /**
   * 轮询选择
   */
  private selectByRoundRobin(
    engines: WorkflowEngineInstance[]
  ): WorkflowEngineInstance {
    // 简单实现：基于时间戳取模
    const index = Date.now() % engines.length;
    return engines[index];
  }

  /**
   * 负载均衡选择
   */
  private selectByLoadBalance(
    engines: WorkflowEngineInstance[]
  ): WorkflowEngineInstance {
    return engines.reduce((best, current) => {
      const bestLoad = best.load.activeWorkflows + best.load.cpuUsage;
      const currentLoad = current.load.activeWorkflows + current.load.cpuUsage;
      return currentLoad < bestLoad ? current : best;
    });
  }

  /**
   * 亲和性选择（优先选择当前实例）
   */
  private selectByAffinity(
    engines: WorkflowEngineInstance[]
  ): WorkflowEngineInstance {
    const currentEngine = engines.find(
      (e) => e.instanceId === this.currentInstanceId
    );
    return currentEngine || engines[0];
  }

  /**
   * 能力匹配选择
   */
  private selectByCapability(
    engines: WorkflowEngineInstance[]
  ): WorkflowEngineInstance {
    // 选择支持最多执行器的实例
    return engines.reduce((best, current) => {
      return current.supportedExecutors.length > best.supportedExecutors.length
        ? current
        : best;
    });
  }

  /**
   * 本地优先选择
   */
  private selectByLocality(
    engines: WorkflowEngineInstance[]
  ): WorkflowEngineInstance {
    const currentEngine = engines.find(
      (e) => e.instanceId === this.currentInstanceId
    );
    if (currentEngine) {
      return currentEngine;
    }

    // 选择同主机的实例
    const currentHostname = process.env.HOSTNAME || 'localhost';
    const localEngine = engines.find((e) => e.hostname === currentHostname);
    return localEngine || engines[0];
  }

  /**
   * 根据能力选择引擎
   */
  private async selectEngineByCapability(
    requiredCapabilities?: string[]
  ): Promise<WorkflowEngineInstance | null> {
    const activeEngines = await this.getActiveEngines();

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return this.selectBestEngine();
    }

    const capableEngines = activeEngines.filter((engine) =>
      requiredCapabilities.every((capability) =>
        engine.supportedExecutors.includes(capability)
      )
    );

    if (capableEngines.length === 0) {
      return null;
    }

    return this.selectByLoadBalance(capableEngines);
  }

  /**
   * 处理引擎故障
   */
  private async handleEngineFailure(
    failedInstanceId: string
  ): Promise<FailoverEvent | null> {
    try {
      const failedEngine = this.engines.get(failedInstanceId);
      if (!failedEngine) {
        return null;
      }

      this.logger.warn('开始处理引擎故障', { failedInstanceId });

      // 1. 查询故障引擎正在执行的工作流
      const affectedWorkflows =
        await this.getAffectedWorkflows(failedInstanceId);
      const affectedNodes = await this.getAffectedNodes(failedInstanceId);

      this.logger.info('发现受影响的工作流', {
        failedInstanceId,
        workflowCount: affectedWorkflows.length,
        nodeCount: affectedNodes.length
      });

      // 2. 选择接管的引擎实例
      const takeoverEngine = await this.selectBestEngine();
      if (!takeoverEngine) {
        this.logger.error('没有可用的引擎实例进行故障转移', {
          failedInstanceId,
          affectedWorkflows: affectedWorkflows.length
        });
        return null;
      }

      // 3. 执行实际的故障转移
      const transferResult = await this.transferWorkflowsToEngine(
        affectedWorkflows,
        affectedNodes,
        takeoverEngine.instanceId
      );

      // 4. 标记故障引擎为非活跃状态
      failedEngine.status = 'inactive';

      // 5. 创建故障转移事件
      const failoverEvent: FailoverEvent = {
        eventId: `failover_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        failedEngineId: failedInstanceId,
        takeoverEngineId: takeoverEngine.instanceId,
        affectedWorkflows,
        affectedNodes,
        failoverAt: new Date(),
        failoverReason: 'Engine heartbeat timeout'
      };

      this.logger.info('故障转移执行完成', {
        ...failoverEvent,
        transferSuccess: transferResult.success,
        transferredWorkflows: transferResult.transferredWorkflows,
        failedTransfers: transferResult.failedTransfers
      });

      return failoverEvent;
    } catch (error) {
      this.logger.error('故障转移处理异常', {
        failedInstanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * 启动心跳监控
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.detectFailuresAndFailover();
        await this.distributedLockManager.cleanupExpiredLocks();
      } catch (error) {
        this.logger.error('心跳监控异常', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * 停止心跳监控
   */
  public stopHeartbeatMonitoring(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * 获取受故障引擎影响的工作流
   */
  private async getAffectedWorkflows(
    failedInstanceId: string
  ): Promise<number[]> {
    try {
      // 使用Repository层查询分配给故障引擎的运行中工作流
      const result =
        await this.distributedSchedulerRepository.findWorkflowsByEngineId(
          failedInstanceId
        );

      if (result.success && result.data) {
        return result.data.map((workflow: any) => workflow.id);
      }

      return [];
    } catch (error) {
      this.logger.error('查询受影响工作流失败', {
        failedInstanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * 获取受故障引擎影响的节点
   */
  private async getAffectedNodes(failedInstanceId: string): Promise<string[]> {
    try {
      // 使用Repository层查询故障引擎正在执行的节点
      const result =
        await this.distributedSchedulerRepository.findNodesByEngineId(
          failedInstanceId
        );

      if (result.success && result.data) {
        return result.data;
      }

      return [];
    } catch (error) {
      this.logger.error('查询受影响节点失败', {
        failedInstanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * 将工作流转移到新引擎
   */
  private async transferWorkflowsToEngine(
    workflowIds: number[],
    nodeIds: string[],
    targetEngineId: string
  ): Promise<{
    success: boolean;
    transferredWorkflows: number;
    failedTransfers: number;
  }> {
    let transferredWorkflows = 0;
    let failedTransfers = 0;

    this.logger.info('开始转移工作流', {
      workflowCount: workflowIds.length,
      targetEngineId
    });

    // 使用Repository层转移工作流实例
    try {
      const transferResult =
        await this.distributedSchedulerRepository.transferWorkflowsToEngine(
          workflowIds,
          targetEngineId
        );

      if (transferResult.success) {
        transferredWorkflows = transferResult.data;
        this.logger.debug('工作流批量转移成功', {
          transferredCount: transferredWorkflows,
          targetEngineId
        });
      } else {
        failedTransfers = workflowIds.length;
        this.logger.error('工作流批量转移失败', {
          workflowIds,
          targetEngineId,
          error: transferResult.error
        });
      }
    } catch (error) {
      failedTransfers = workflowIds.length;
      this.logger.error('工作流转移异常', {
        workflowIds,
        targetEngineId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // 使用Repository层重置运行中节点状态
    try {
      const resetResult =
        await this.distributedSchedulerRepository.resetNodeStatus(nodeIds);

      if (resetResult.success) {
        this.logger.debug('节点状态批量重置成功', {
          resetCount: resetResult.data,
          nodeCount: nodeIds.length
        });
      } else {
        this.logger.error('节点状态批量重置失败', {
          nodeIds,
          error: resetResult.error
        });
      }
    } catch (error) {
      this.logger.error('节点状态重置异常', {
        nodeIds,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    const success = failedTransfers === 0;

    this.logger.info('工作流转移完成', {
      transferredWorkflows,
      failedTransfers,
      success,
      targetEngineId
    });

    return {
      success,
      transferredWorkflows,
      failedTransfers
    };
  }

  /**
   * 清理过期的引擎实例
   */
  async cleanupStaleEngines(): Promise<number> {
    try {
      const timeoutMinutes = Math.ceil(
        this.options.failureDetectionTimeout / 60000
      );
      const result =
        await this.distributedSchedulerRepository.findStaleEngines(
          timeoutMinutes
        );

      if (!result.success) {
        this.logger.error('查找过期引擎失败', { error: result.error });
        return 0;
      }

      const staleEngines = result.data || [];
      let cleanedCount = 0;

      for (const engine of staleEngines) {
        try {
          // 从内存中移除
          this.engines.delete(engine.instance_id);

          // 更新数据库状态为非活跃
          await this.distributedSchedulerRepository.updateEngineStatus(
            engine.instance_id,
            'inactive'
          );

          cleanedCount++;

          this.logger.info('清理过期引擎', {
            instanceId: engine.instance_id,
            hostname: engine.hostname,
            lastHeartbeat: engine.last_heartbeat
          });
        } catch (error) {
          this.logger.error('清理引擎失败', {
            instanceId: engine.instance_id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (cleanedCount > 0) {
        this.logger.info('引擎清理完成', {
          cleanedCount,
          remainingEngines: this.engines.size
        });
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error('清理过期引擎异常', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * 启动引擎清理定时器
   */
  private startEngineCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.performEngineCleanup();
    }, this.cleanupInterval);

    this.logger.debug('引擎清理定时器已启动', {
      interval: this.cleanupInterval
    });
  }

  /**
   * 停止引擎清理定时器
   */
  private stopEngineCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      this.logger.debug('引擎清理定时器已停止');
    }
  }

  /**
   * 执行引擎清理
   */
  private async performEngineCleanup(): Promise<void> {
    try {
      // 清理过期的引擎实例
      const cleanedCount = await this.cleanupStaleEngines();

      if (cleanedCount > 0) {
        this.logger.info('定期引擎清理完成', {
          cleanedCount,
          remainingEngines: this.engines.size
        });
      }
    } catch (error) {
      this.logger.error('定期引擎清理异常', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 启动动态引擎发现
   */
  startEngineDiscovery(): void {
    if (this.engineDiscoveryTimer) {
      this.logger.warn('引擎发现定时器已在运行');
      return;
    }

    this.engineDiscoveryTimer = setInterval(async () => {
      await this.performEngineDiscovery();
    }, this.currentDiscoveryInterval);

    this.logger.info('引擎发现定时器已启动', {
      interval: this.currentDiscoveryInterval,
      config: this.discoveryConfig
    });
  }

  /**
   * 停止动态引擎发现
   */
  stopEngineDiscovery(): void {
    if (this.engineDiscoveryTimer) {
      clearInterval(this.engineDiscoveryTimer);
      this.engineDiscoveryTimer = undefined;
      this.logger.info('引擎发现定时器已停止');
    }
  }

  /**
   * 手动触发引擎发现
   */
  async triggerEngineDiscovery(): Promise<void> {
    this.logger.info('手动触发引擎发现');
    await this.performEngineDiscovery();
  }

  /**
   * 获取引擎发现统计信息
   */
  getEngineDiscoveryMetrics(): EngineDiscoveryMetrics {
    return { ...this.discoveryMetrics };
  }

  /**
   * 获取引擎发现健康状态
   */
  getEngineDiscoveryHealth(): {
    isHealthy: boolean;
    lastSyncAge: number;
    issues: string[];
  } {
    const now = Date.now();
    const lastSyncAge = now - this.discoveryMetrics.lastSyncAt.getTime();
    const issues: string[] = [];

    // 检查同步延迟
    if (lastSyncAge > this.currentDiscoveryInterval * 2) {
      issues.push(`同步延迟过长: ${Math.round(lastSyncAge / 1000)}秒`);
    }

    // 检查连续无变化次数
    if (
      this.consecutiveNoChanges >
      this.discoveryConfig.incrementalThreshold * 2
    ) {
      issues.push(`连续无变化次数过多: ${this.consecutiveNoChanges}`);
    }

    // 检查发现间隔是否达到最大值
    if (this.currentDiscoveryInterval >= this.discoveryConfig.maxInterval) {
      issues.push('发现间隔已达到最大值');
    }

    return {
      isHealthy: issues.length === 0,
      lastSyncAge,
      issues
    };
  }

  /**
   * 重置引擎发现状态
   */
  resetEngineDiscoveryState(): void {
    this.consecutiveNoChanges = 0;
    this.currentDiscoveryInterval = this.discoveryConfig.baseInterval;
    this.lastSyncTimestamp = new Date(0);
    this.lastFullSyncTimestamp = new Date(0);

    // 重置统计信息
    this.discoveryMetrics = {
      totalDiscoveries: 0,
      incrementalSyncs: 0,
      fullSyncs: 0,
      lastSyncAt: new Date(0),
      currentInterval: this.currentDiscoveryInterval,
      consecutiveNoChanges: 0
    };

    this.logger.info('引擎发现状态已重置');
  }

  /**
   * 执行引擎发现
   */
  private async performEngineDiscovery(): Promise<void> {
    const startTime = Date.now();

    try {
      const now = new Date();
      const shouldPerformFullSync = this.shouldPerformFullSync(now);

      let discoveredEngines: WorkflowEngineInstance[] = [];
      let syncType: 'incremental' | 'full_sync' = 'incremental';

      this.logger.debug('开始引擎发现', {
        syncType: shouldPerformFullSync ? 'full_sync' : 'incremental',
        currentEngineCount: this.engines.size,
        consecutiveNoChanges: this.consecutiveNoChanges
      });

      if (shouldPerformFullSync) {
        // 执行全量同步
        discoveredEngines = await this.performFullSync();
        syncType = 'full_sync';
        this.lastFullSyncTimestamp = now;
        this.discoveryMetrics.fullSyncs++;
      } else {
        // 执行增量同步
        discoveredEngines = await this.performIncrementalSync();
        syncType = 'incremental';
        this.discoveryMetrics.incrementalSyncs++;
      }

      // 处理发现的引擎
      const changes = await this.processDiscoveredEngines(
        discoveredEngines,
        syncType
      );

      // 更新统计信息
      this.updateDiscoveryMetrics(now, changes);

      // 调整发现间隔
      this.adjustDiscoveryInterval(changes > 0);
      const duration = Date.now() - startTime;

      if (changes > 0) {
        this.logger.info('引擎发现完成', {
          syncType,
          discoveredCount: discoveredEngines.length,
          changes,
          currentEngineCount: this.engines.size,
          duration: `${duration}ms`
        });
      } else {
        this.logger.debug('引擎发现完成，无变化', {
          syncType,
          discoveredCount: discoveredEngines.length,
          consecutiveNoChanges: this.consecutiveNoChanges,
          duration: `${duration}ms`
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('引擎发现异常', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`,
        currentEngineCount: this.engines.size
      });

      // 发现失败时，适当延长下次检查间隔
      this.handleDiscoveryFailure();
    }
  }

  /**
   * 判断是否应该执行全量同步
   */
  private shouldPerformFullSync(now: Date): boolean {
    const timeSinceLastFullSync =
      now.getTime() - this.lastFullSyncTimestamp.getTime();
    return timeSinceLastFullSync >= this.discoveryConfig.fullSyncInterval;
  }

  /**
   * 执行全量同步
   */
  private async performFullSync(): Promise<WorkflowEngineInstance[]> {
    this.logger.debug('执行全量引擎同步');

    const result =
      await this.distributedSchedulerRepository.findActiveEngines();

    if (result.success) {
      return result.data;
    } else {
      this.logger.error('全量同步失败', { error: result.error });
      return [];
    }
  }

  /**
   * 执行增量同步
   */
  private async performIncrementalSync(): Promise<WorkflowEngineInstance[]> {
    this.logger.debug('执行增量引擎同步', {
      lastSyncTimestamp: this.lastSyncTimestamp
    });

    // 暂时使用全量查询，后续可以优化为增量查询
    // TODO: 在Repository中实现findEnginesUpdatedSince方法
    const result =
      await this.distributedSchedulerRepository.findActiveEngines();

    if (result.success) {
      return result.data;
    } else {
      this.logger.error('增量同步失败', { error: result.error });
      return [];
    }
  }

  /**
   * 处理发现的引擎
   */
  private async processDiscoveredEngines(
    discoveredEngines: WorkflowEngineInstance[],
    syncType: 'incremental' | 'full_sync'
  ): Promise<number> {
    let changeCount = 0;
    const currentEngineIds = new Set(this.engines.keys());
    const discoveredEngineIds = new Set(
      discoveredEngines.map((e) => e.instanceId)
    );

    // 处理新增和更新的引擎
    for (const engine of discoveredEngines) {
      const existingEngine = this.engines.get(engine.instanceId);

      if (!existingEngine) {
        // 新引擎
        this.engines.set(engine.instanceId, engine);
        changeCount++;

        this.logger.info('发现新引擎', {
          instanceId: engine.instanceId,
          hostname: engine.hostname,
          syncType
        });

        // 触发引擎发现事件
        this.emitEngineDiscoveryEvent('engine_added', engine, syncType);
      } else if (this.hasEngineChanged(existingEngine, engine)) {
        // 引擎更新
        this.engines.set(engine.instanceId, engine);
        changeCount++;

        this.logger.debug('引擎信息更新', {
          instanceId: engine.instanceId,
          syncType
        });

        this.emitEngineDiscoveryEvent('engine_updated', engine, syncType);
      }
    }

    // 处理移除的引擎（仅在全量同步时）
    if (syncType === 'full_sync') {
      for (const engineId of currentEngineIds) {
        if (!discoveredEngineIds.has(engineId)) {
          const removedEngine = this.engines.get(engineId);
          if (removedEngine) {
            this.engines.delete(engineId);
            changeCount++;

            this.logger.info('引擎已移除', {
              instanceId: engineId,
              syncType
            });

            this.emitEngineDiscoveryEvent(
              'engine_removed',
              removedEngine,
              syncType
            );
          }
        }
      }
    }

    return changeCount;
  }

  /**
   * 检查引擎是否发生变化
   */
  private hasEngineChanged(
    existing: WorkflowEngineInstance,
    discovered: WorkflowEngineInstance
  ): boolean {
    return (
      existing.status !== discovered.status ||
      existing.lastHeartbeat.getTime() !== discovered.lastHeartbeat.getTime() ||
      JSON.stringify(existing.load) !== JSON.stringify(discovered.load) ||
      JSON.stringify(existing.supportedExecutors) !==
        JSON.stringify(discovered.supportedExecutors)
    );
  }

  /**
   * 触发引擎发现事件
   */
  private emitEngineDiscoveryEvent(
    type: 'engine_added' | 'engine_updated' | 'engine_removed',
    engine: WorkflowEngineInstance,
    discoveryMethod: 'incremental' | 'full_sync' | 'manual'
  ): void {
    // 这里可以扩展为事件发射器模式
    this.logger.debug('引擎发现事件', {
      type,
      instanceId: engine.instanceId,
      discoveryMethod
    });
  }

  /**
   * 更新发现统计信息
   */
  private updateDiscoveryMetrics(now: Date, changeCount: number): void {
    this.discoveryMetrics.lastSyncAt = now;
    this.discoveryMetrics.totalDiscoveries += changeCount;
    this.discoveryMetrics.currentInterval = this.currentDiscoveryInterval;

    if (changeCount === 0) {
      this.consecutiveNoChanges++;
    } else {
      this.consecutiveNoChanges = 0;
    }

    this.discoveryMetrics.consecutiveNoChanges = this.consecutiveNoChanges;
    this.lastSyncTimestamp = now;
  }

  /**
   * 调整发现间隔
   */
  private adjustDiscoveryInterval(hasChanges: boolean): void {
    if (!this.discoveryConfig.enableSmartInterval) {
      return;
    }

    if (hasChanges) {
      // 有变化时，缩短间隔以更快发现后续变化
      this.currentDiscoveryInterval = Math.max(
        this.discoveryConfig.baseInterval,
        this.currentDiscoveryInterval * 0.8
      );
    } else if (
      this.consecutiveNoChanges >= this.discoveryConfig.incrementalThreshold
    ) {
      // 连续无变化时，延长间隔以减少资源消耗
      this.currentDiscoveryInterval = Math.min(
        this.discoveryConfig.maxInterval,
        this.currentDiscoveryInterval * 1.5
      );
    }

    // 更新定时器间隔
    if (
      this.engineDiscoveryTimer &&
      this.discoveryMetrics.currentInterval !== this.currentDiscoveryInterval
    ) {
      this.stopEngineDiscovery();
      this.startEngineDiscovery();

      this.logger.debug('调整引擎发现间隔', {
        oldInterval: this.discoveryMetrics.currentInterval,
        newInterval: this.currentDiscoveryInterval,
        consecutiveNoChanges: this.consecutiveNoChanges
      });
    }
  }

  /**
   * 处理发现失败
   */
  private handleDiscoveryFailure(): void {
    // 发现失败时，延长检查间隔以减少对数据库的压力
    this.currentDiscoveryInterval = Math.min(
      this.discoveryConfig.maxInterval,
      this.currentDiscoveryInterval * 2
    );

    // 重启定时器
    if (this.engineDiscoveryTimer) {
      this.stopEngineDiscovery();
      this.startEngineDiscovery();
    }

    this.logger.warn('引擎发现失败，延长检查间隔', {
      newInterval: this.currentDiscoveryInterval
    });
  }
}
