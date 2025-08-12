/**
 * 自动工作流恢复服务
 * 基于 Stratix 框架生命周期和分层架构设计
 * 遵循方法名约定，实现自动恢复机制
 */

import { AwilixContainer, RESOLVER, type Logger } from '@stratix/core';
import { TasksPluginOptions } from 'src/index.js';
import type { IWorkflowInstanceRepository } from '../repositories/WorkflowInstanceRepository.js';
import type { IWorkflowTaskNodeRepository } from '../repositories/WorkflowTaskNodeRepository.js';
import type { WorkflowInstancesTable } from '../types/database.js';
import type { WorkflowInstance } from '../types/workflow.js';

import type DatabaseLockService from './DatabaseLockService.js';
import type { IDistributedScheduler } from './DistributedScheduler.js';
import type { IWorkflowInstanceService } from './WorkflowInstanceService.js';

export interface AutoRecoveryConfig {
  /** 是否启用恢复服务 */
  enabled: boolean;
  /** 检查间隔（毫秒） */
  checkInterval: number;
  /** 最大恢复尝试次数 */
  maxRecoveryAttempts: number;
  /** 恢复超时时间（毫秒） */
  recoveryTimeout: number;
  /** 故障检测超时（毫秒） */
  failureDetectionTimeout: number;
  /** 是否启用自动故障转移 */
  enableAutoFailover: boolean;
  /** 启动延迟（毫秒） */
  startupDelay: number;
  /** 是否启用重试机制 */
  retryOnFailure: boolean;
}

export interface RecoveryMetrics {
  /** 总恢复尝试次数 */
  totalRecoveryAttempts: number;
  /** 成功恢复次数 */
  successfulRecoveries: number;
  /** 失败恢复次数 */
  failedRecoveries: number;
  /** 故障转移次数 */
  failoverCount: number;
  /** 动态循环恢复次数 */
  dynamicLoopRecoveries: number;
  /** 最后恢复时间 */
  lastRecoveryTime?: Date;
  /** 平均恢复时间（毫秒） */
  averageRecoveryTime: number;
  /** 服务运行状态 */
  isRunning: boolean;
}

/**
 * 自动工作流恢复服务
 * 遵循 Stratix 框架的方法名约定和分层架构原则
 */
export default class AutoRecoveryService {
  private recoveryTimer?: NodeJS.Timeout | null;
  private isRunning = false;
  private metrics: RecoveryMetrics = {
    totalRecoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    failoverCount: 0,
    dynamicLoopRecoveries: 0,
    averageRecoveryTime: 0,
    isRunning: false
  };

  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      // 从插件配置中提取恢复配置
      const config = container.resolve('config') as TasksPluginOptions;
      const userConfig = config.recovery || ({} as Partial<AutoRecoveryConfig>);

      // 提供完整的默认配置
      const options: AutoRecoveryConfig = {
        enabled: userConfig.enabled ?? true,
        checkInterval: userConfig.checkInterval || 60000,
        maxRecoveryAttempts: userConfig.maxRecoveryAttempts || 3,
        recoveryTimeout: userConfig.recoveryTimeout || 120000,
        failureDetectionTimeout: userConfig.failureDetectionTimeout || 90000,
        enableAutoFailover: userConfig.enableAutoFailover ?? false,
        startupDelay: userConfig.startupDelay || 5000,
        retryOnFailure: userConfig.retryOnFailure ?? true
      };

      return { options };
    }
  };

  constructor(
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly taskNodeRepository: IWorkflowTaskNodeRepository,
    private readonly workflowInstanceService: IWorkflowInstanceService,
    private readonly databaseLockService: DatabaseLockService,
    private readonly distributedScheduler: IDistributedScheduler,
    private readonly logger: Logger,
    private readonly options: AutoRecoveryConfig
  ) {
    this.logger.info('自动工作流恢复服务已创建', {
      enabled: this.options.enabled,
      checkInterval: this.options.checkInterval,
      enableAutoFailover: this.options.enableAutoFailover
    });
  }

  /**
   * 🔑 框架会自动调用此方法（方法名约定）
   * 当 Fastify 触发 onReady 钩子时执行
   */
  async onReady(): Promise<void> {
    if (!this.options.enabled) {
      this.logger.info('自动工作流恢复服务已禁用，跳过启动');
      return;
    }

    this.logger.info('🚀 onReady: 准备启动自动工作流恢复服务');

    // 使用延迟启动，确保所有依赖服务完全就绪
    setTimeout(async () => {
      try {
        await this.initializeRecoveryService();
      } catch (error) {
        this.logger.error('自动工作流恢复服务启动失败', { error });

        if (this.options.retryOnFailure) {
          this.scheduleRetryStart();
        }
      }
    }, this.options.startupDelay);
  }

  /**
   * 🔑 框架会自动调用此方法（方法名约定）
   * 当 Fastify 触发 onClose 钩子时执行
   */
  async onClose(): Promise<void> {
    this.logger.info('🛑 onClose: 开始关闭自动工作流恢复服务');

    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    this.isRunning = false;
    this.metrics.isRunning = false;

    this.logger.info('✅ 自动工作流恢复服务已关闭', {
      finalMetrics: this.metrics
    });
  }

  /**
   * 🔑 框架会自动调用此方法（方法名约定）
   * 当 Fastify 开始监听时执行（可选）
   */
  async onListen(): Promise<void> {
    this.logger.info('🎧 onListen: 自动恢复服务监听状态检查', {
      recoveryServiceRunning: this.isRunning,
      nextCheckIn: this.options.checkInterval + 'ms',
      autoFailoverEnabled: this.options.enableAutoFailover
    });
  }

  /**
   * 🔑 框架会自动调用此方法（方法名约定）
   * 在服务关闭前执行清理（可选）
   */
  async preClose(): Promise<void> {
    this.logger.info('🔄 preClose: 自动恢复服务关闭前清理');

    // 等待正在进行的恢复操作完成
    if (this.isRunning) {
      this.logger.info('等待正在进行的自动恢复操作完成...');
      // 这里可以添加等待当前恢复周期完成的逻辑
    }
  }

  /**
   * 初始化恢复服务
   */
  private async initializeRecoveryService(): Promise<void> {
    this.logger.info('启动自动工作流恢复服务', {
      checkInterval: this.options.checkInterval,
      maxRecoveryAttempts: this.options.maxRecoveryAttempts,
      enableAutoFailover: this.options.enableAutoFailover,
      supportsDynamicLoop: true
    });

    // 验证依赖服务
    await this.validateDependencies();

    // 启动定时恢复检查
    this.recoveryTimer = setInterval(async () => {
      try {
        await this.performRecoveryCheck();
      } catch (error) {
        this.logger.error('自动恢复检查异常', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.options.checkInterval);

    this.isRunning = true;
    this.metrics.isRunning = true;

    // 执行一次初始检查
    await this.performRecoveryCheck();

    this.logger.info('✅ 自动工作流恢复服务启动完成');
  }

  /**
   * 执行恢复检查
   * 包含基本工作流实例和动态循环节点的恢复
   */
  private async performRecoveryCheck(): Promise<void> {
    const startTime = Date.now();
    this.logger.debug('开始执行自动恢复检查', {
      timestamp: new Date().toISOString()
    });

    try {
      // 1. 检测引擎故障并执行故障转移
      if (this.options.enableAutoFailover) {
        const failoverEvents =
          await this.distributedScheduler.detectFailuresAndFailover();
        if (failoverEvents.length > 0) {
          this.metrics.failoverCount += failoverEvents.length;
          this.logger.info('执行了故障转移', {
            failoverCount: failoverEvents.length,
            events: failoverEvents
          });
        }
      }

      // 2. 查找需要恢复的工作流实例
      const interruptedInstances = await this.findInterruptedInstances();

      // 3. 查找中断的动态循环节点
      const interruptedDynamicLoops = await this.findInterruptedDynamicLoops();

      const totalInterrupted =
        interruptedInstances.length + interruptedDynamicLoops.length;

      if (totalInterrupted === 0) {
        this.logger.debug('未发现需要恢复的项目');
        return;
      }

      this.logger.info('🔍 发现需要恢复的项目', {
        interruptedWorkflows: interruptedInstances.length,
        interruptedDynamicLoops: interruptedDynamicLoops.length,
        total: totalInterrupted
      });

      // 4. 并发执行恢复
      const recoveryPromises = [
        ...interruptedInstances.map((instance) =>
          this.recoverSingleInstance(instance)
        ),
        ...interruptedDynamicLoops.map((loopInfo) =>
          this.recoverDynamicLoopNode(loopInfo)
        )
      ];

      const results = await Promise.allSettled(recoveryPromises);
      this.updateRecoveryStats(results);
    } catch (error) {
      this.logger.error('自动恢复检查失败', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      const duration = Date.now() - startTime;
      this.updateAverageRecoveryTime(duration);
    }
  }

  /**
   * 映射数据库记录到工作流实例
   */
  private mapTableToWorkflowInstance = (
    tableRow: WorkflowInstancesTable
  ): WorkflowInstance => {
    const result: WorkflowInstance = {
      id: tableRow.id,
      workflowDefinitionId: tableRow.workflow_definition_id,
      name: tableRow.name,
      status: tableRow.status as any,
      retryCount: tableRow.retry_count,
      maxRetries: tableRow.max_retries,
      priority: tableRow.priority,
      createdAt: tableRow.created_at,
      updatedAt: tableRow.updated_at
    };

    // 添加可选字段
    if (tableRow.external_id) result.externalId = tableRow.external_id;
    if (tableRow.input_data) result.inputData = tableRow.input_data;
    if (tableRow.output_data) result.outputData = tableRow.output_data;
    if (tableRow.context_data) result.contextData = tableRow.context_data;
    if (tableRow.business_key) result.businessKey = tableRow.business_key;
    if (tableRow.mutex_key) result.mutexKey = tableRow.mutex_key;
    if (tableRow.started_at) result.startedAt = tableRow.started_at;
    if (tableRow.completed_at) result.completedAt = tableRow.completed_at;
    if (tableRow.paused_at) result.pausedAt = tableRow.paused_at;
    if (tableRow.error_message) result.errorMessage = tableRow.error_message;
    if (tableRow.error_details) result.errorDetails = tableRow.error_details;
    if (tableRow.scheduled_at) result.scheduledAt = tableRow.scheduled_at;
    if (tableRow.current_node_id)
      result.currentNodeId = tableRow.current_node_id;
    if (tableRow.completed_nodes)
      result.completedNodes = tableRow.completed_nodes;
    if (tableRow.failed_nodes) result.failedNodes = tableRow.failed_nodes;
    if (tableRow.lock_owner) result.lockOwner = tableRow.lock_owner;
    if (tableRow.lock_acquired_at)
      result.lockAcquiredAt = tableRow.lock_acquired_at;
    if (tableRow.last_heartbeat) result.lastHeartbeat = tableRow.last_heartbeat;
    if (tableRow.assigned_engine_id)
      result.assignedEngineId = tableRow.assigned_engine_id;
    if (tableRow.assignment_strategy)
      result.assignmentStrategy = tableRow.assignment_strategy;
    if (tableRow.created_by) result.createdBy = tableRow.created_by;

    return result;
  };

  /**
   * 查找中断的工作流实例
   * 遵循分层架构：调用仓储层而非适配器层
   */
  private async findInterruptedInstances(): Promise<WorkflowInstance[]> {
    try {
      // 使用仓储层的专用方法查找中断的实例
      const timeoutThreshold = new Date(
        Date.now() - this.options.failureDetectionTimeout
      );

      const result =
        await this.workflowInstanceRepository.findInterruptedInstances({
          heartbeatTimeout: timeoutThreshold,
          statuses: ['running'],
          limit: 50 // 限制每次处理的数量
        });

      if (!result.success) {
        this.logger.error('查询中断实例失败', { error: result.error });
        return [];
      }

      return (result.data || []).map(this.mapTableToWorkflowInstance);
    } catch (error) {
      this.logger.error('查找中断实例失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * 恢复单个工作流实例
   * 遵循分层架构：调用服务层而非适配器层
   */
  private async recoverSingleInstance(
    instance: WorkflowInstance
  ): Promise<void> {
    const instanceId = instance.id;
    const lockKey = `recovery:workflow:${instanceId}`;
    const owner = `enhanced_recovery_${Date.now()}`;

    this.metrics.totalRecoveryAttempts++;

    try {
      // 获取分布式锁
      const lockAcquired = await this.databaseLockService.acquireLock(
        lockKey,
        this.options.recoveryTimeout,
        owner
      );

      if (!lockAcquired) {
        this.logger.debug('无法获取实例锁，可能正在其他节点恢复', {
          instanceId
        });
        return;
      }

      this.logger.info('🔧 开始恢复工作流实例', {
        instanceId,
        name: instance.name,
        status: instance.status
      });

      // 通过服务层执行恢复（符合分层架构）
      const recoveryResult =
        await this.workflowInstanceService.updateInstanceStatus(
          instanceId,
          'pending' // 重置为待执行状态
        );

      if (recoveryResult.success) {
        this.metrics.successfulRecoveries++;
        this.metrics.lastRecoveryTime = new Date();

        this.logger.info('✅ 工作流实例恢复成功', {
          instanceId,
          name: instance.name
        });
      } else {
        this.metrics.failedRecoveries++;

        this.logger.error('❌ 工作流实例恢复失败', {
          instanceId,
          name: instance.name,
          error: recoveryResult.error
        });
      }
    } catch (error) {
      this.metrics.failedRecoveries++;

      this.logger.error('❌ 恢复工作流实例异常', {
        instanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      // 释放锁
      try {
        await this.databaseLockService.releaseLock(lockKey, owner);
      } catch (error) {
        this.logger.warn('释放恢复锁失败', {
          lockKey,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * 验证依赖服务
   */
  private async validateDependencies(): Promise<void> {
    try {
      // 检查仓储层连接
      const statsResult = await this.workflowInstanceRepository.getStatistics();
      if (!statsResult.success) {
        throw new Error(`仓储层连接检查失败: ${statsResult.error}`);
      }

      // 检查锁服务
      const testLockKey = `test-auto-recovery-${Date.now()}`;
      const lockResult = await this.databaseLockService.acquireLock(
        testLockKey,
        1000,
        'test'
      );
      if (lockResult) {
        await this.databaseLockService.releaseLock(testLockKey, 'test');
      }

      // 检查工作流实例服务
      const serviceHealthCheck =
        await this.workflowInstanceService.getInstanceStatistics();
      if (!serviceHealthCheck.success) {
        this.logger.warn('工作流实例服务健康检查警告', {
          error: serviceHealthCheck.error
        });
      }

      this.logger.info('✅ 自动恢复服务依赖验证通过');
    } catch (error) {
      this.logger.error('❌ 自动恢复服务依赖验证失败', { error });
      throw error;
    }
  }

  /**
   * 查找中断的动态循环节点
   */
  private async findInterruptedDynamicLoops(): Promise<
    DynamicLoopRecoveryInfo[]
  > {
    try {
      // 查找运行中的循环和并行节点
      const result = await this.taskNodeRepository.findByStatus(['running'], {
        pagination: { page: 1, limit: 25 } // 限制动态循环检查数量
      });

      if (!result.success) {
        this.logger.error('查询中断的动态循环失败', { error: result.error });
        return [];
      }

      const candidates = result.data || [];
      const interruptedLoops: DynamicLoopRecoveryInfo[] = [];

      // 检查每个运行中的节点是否为循环/并行节点且已中断
      for (const node of candidates) {
        if (
          (node.node_type === 'loop' || node.node_type === 'parallel') &&
          (await this.isDynamicLoopInterrupted(node))
        ) {
          interruptedLoops.push({
            parentId: node.id,
            workflowInstanceId: node.workflow_instance_id,
            parentNodeId: node.node_id,
            nodeType: node.node_type,
            lastUpdate: node.updated_at
          });
        }
      }

      return interruptedLoops;
    } catch (error) {
      this.logger.error('查找中断的动态循环失败', { error });
      return [];
    }
  }

  /**
   * 检查动态循环是否中断
   */
  private async isDynamicLoopInterrupted(loop: any): Promise<boolean> {
    try {
      // 检查节点锁
      const lockKey = `workflow:node:${loop.workflowInstanceId}:${loop.parentNodeId}`;
      const hasLock = await this.databaseLockService.hasLock(lockKey);

      if (hasLock) {
        return false; // 有锁说明正在运行
      }

      // 检查更新时间
      const lastUpdate = new Date(loop.lastUpdate);
      const now = new Date();
      const timeDiff = now.getTime() - lastUpdate.getTime();

      // 超过配置的故障检测时间认为中断
      return timeDiff > this.options.failureDetectionTimeout;
    } catch (error) {
      this.logger.error('检查动态循环中断状态失败', { error });
      return false;
    }
  }

  /**
   * 恢复动态循环节点
   */
  private async recoverDynamicLoopNode(
    loopInfo: DynamicLoopRecoveryInfo
  ): Promise<void> {
    const lockKey = `workflow:dynamic-loop-recovery:${loopInfo.workflowInstanceId}:${loopInfo.parentNodeId}`;
    const owner = `auto-loop-recovery-${process.pid}-${Date.now()}`;

    try {
      // 获取恢复锁
      const lockAcquired = await this.databaseLockService.acquireLock(
        lockKey,
        60000,
        owner
      );
      if (!lockAcquired) {
        this.logger.debug('无法获取动态循环恢复锁', {
          workflowInstanceId: loopInfo.workflowInstanceId,
          parentNodeId: loopInfo.parentNodeId
        });
        return;
      }

      this.logger.info('🔄 开始恢复动态循环节点', {
        workflowInstanceId: loopInfo.workflowInstanceId,
        parentNodeId: loopInfo.parentNodeId,
        nodeType: loopInfo.nodeType
      });

      // 重置动态循环节点状态（通过仓储层）
      const updateResult = await this.taskNodeRepository.updateNullable(
        loopInfo.parentId,
        {
          status: 'pending',
          assigned_engine_id: null,
          updated_at: new Date()
        }
      );

      if (!updateResult.success) {
        throw new Error(`更新动态循环节点状态失败: ${updateResult.error}`);
      }

      this.metrics.dynamicLoopRecoveries++;
      this.logger.info('✅ 动态循环节点恢复成功', {
        workflowInstanceId: loopInfo.workflowInstanceId,
        parentNodeId: loopInfo.parentNodeId
      });
    } catch (error) {
      this.logger.error('❌ 动态循环节点恢复失败', {
        workflowInstanceId: loopInfo.workflowInstanceId,
        parentNodeId: loopInfo.parentNodeId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      // 释放锁
      try {
        await this.databaseLockService.releaseLock(lockKey, owner);
      } catch (releaseError) {
        this.logger.warn('释放动态循环恢复锁失败', { releaseError });
      }
    }
  }

  /**
   * 更新恢复统计
   */
  private updateRecoveryStats(results: PromiseSettledResult<void>[]): void {
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    this.metrics.totalRecoveryAttempts += results.length;
    this.metrics.successfulRecoveries += successful;
    this.metrics.failedRecoveries += failed;

    this.logger.info('🎯 自动恢复操作完成', {
      currentRound: { total: results.length, successful, failed },
      totalStats: this.metrics
    });
  }

  /**
   * 重试启动恢复服务
   */
  private scheduleRetryStart(): void {
    const retryDelay = 30000; // 30秒后重试
    setTimeout(async () => {
      try {
        this.logger.info('🔄 重试启动自动工作流恢复服务');
        await this.initializeRecoveryService();
      } catch (error) {
        this.logger.error('❌ 重试启动自动工作流恢复服务仍失败', { error });
      }
    }, retryDelay);
  }

  /**
   * 更新平均恢复时间
   */
  private updateAverageRecoveryTime(duration: number): void {
    const totalAttempts = this.metrics.totalRecoveryAttempts;
    if (totalAttempts === 1) {
      this.metrics.averageRecoveryTime = duration;
    } else {
      this.metrics.averageRecoveryTime =
        (this.metrics.averageRecoveryTime * (totalAttempts - 1) + duration) /
        totalAttempts;
    }
  }

  /**
   * 获取恢复指标
   */
  getMetrics(): RecoveryMetrics {
    return {
      ...this.metrics,
      isRunning: this.isRunning
    };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      failoverCount: 0,
      dynamicLoopRecoveries: 0,
      averageRecoveryTime: 0,
      isRunning: this.isRunning
    };
    this.logger.info('自动恢复服务指标已重置');
  }

  /**
   * 获取服务运行状态
   */
  getStatus(): {
    isRunning: boolean;
    config: AutoRecoveryConfig;
    metrics: RecoveryMetrics;
    uptime?: number;
  } {
    const uptime = this.metrics.lastRecoveryTime
      ? Date.now() - this.metrics.lastRecoveryTime.getTime()
      : undefined;

    return {
      isRunning: this.isRunning,
      config: this.options,
      metrics: this.getMetrics(),
      ...(uptime !== undefined && { uptime })
    };
  }
}

// 动态循环恢复信息接口
interface DynamicLoopRecoveryInfo {
  parentId: number;
  workflowInstanceId: number;
  parentNodeId: string;
  nodeType: string;
  lastUpdate: Date;
}
/**
 * 默认自动恢复配置
 */
export const defaultAutoRecoveryConfig: AutoRecoveryConfig = {
  enabled: true,
  checkInterval: 60000, // 60秒
  maxRecoveryAttempts: 3,
  recoveryTimeout: 300000, // 5分钟
  failureDetectionTimeout: 90000, // 90秒
  enableAutoFailover: true,
  startupDelay: 15000, // 15秒启动延迟
  retryOnFailure: true
};
