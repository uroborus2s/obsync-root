import { Logger } from '@stratix/core';
import type { IWorkflowInstanceRepository } from '../repositories/WorkflowInstanceRepository.js';
import { WorkflowInstance } from '../types/workflow.js';
import DatabaseLockService from './DatabaseLockService.js';
import type { IWorkflowDefinitionService } from './WorkflowDefinitionService.js';
import type { WorkflowEngine } from './WorkflowEngineService.js';

/**
 * 工作流定义查询参数
 */
export interface WorkflowDefinitionQuery {
  /** 工作流名称 */
  name: string;
  /** 版本号 */
  version: string;
}

/**
 * 工作流互斥控制服务
 *
 * 确保同类型的同步工作流实例不会同时运行
 */
export default class WorkflowMutexService {
  constructor(
    private readonly databaseLockService: DatabaseLockService, // 改为使用数据库锁
    private readonly logger: Logger,
    private readonly workflowEngineService: WorkflowEngine,
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly workflowDefinitionService: IWorkflowDefinitionService
  ) {}

  /**
   * 尝试创建互斥的工作流实例
   */
  async createMutexWorkflow(
    workflowQuery: WorkflowDefinitionQuery,
    inputs: Record<string, any>,
    mutexKey: string,
    _options?: any
  ): Promise<{
    success: boolean;
    instance?: WorkflowInstance;
    error?: string;
    conflictingInstance?: WorkflowInstance;
  }> {
    const lockKey = this.getMutexLockKey(mutexKey);
    const owner = `create-${process.pid}-${Date.now()}`;

    try {
      // 1. 根据 name 和 version 获取完整的工作流定义
      this.logger.debug('获取工作流定义', {
        name: workflowQuery.name,
        version: workflowQuery.version
      });

      // 如果版本是 "latest"，则获取活跃版本，否则获取指定版本
      const definitionResult =
        workflowQuery.version === 'latest'
          ? await this.workflowDefinitionService.getDefinition(
              workflowQuery.name
            )
          : await this.workflowDefinitionService.getDefinition(
              workflowQuery.name,
              workflowQuery.version
            );

      if (!definitionResult.success || !definitionResult.data) {
        const versionInfo =
          workflowQuery.version === 'latest'
            ? '(活跃版本)'
            : `v${workflowQuery.version}`;
        return {
          success: false,
          error: `工作流定义不存在: ${workflowQuery.name} ${versionInfo}`
        };
      }

      const workflowDefinition = definitionResult.data;

      // 验证工作流定义的完整性
      if (!workflowDefinition.name || !workflowDefinition.version) {
        return {
          success: false,
          error: `工作流定义数据不完整: 缺少必要的 name 或 version 字段`
        };
      }

      if (!workflowDefinition.nodes || workflowDefinition.nodes.length === 0) {
        return {
          success: false,
          error: `工作流定义无效: ${workflowDefinition.name} v${workflowDefinition.version} 没有定义任何节点`
        };
      }

      this.logger.info('成功获取工作流定义', {
        name: workflowDefinition.name,
        version: workflowDefinition.version,
        nodeCount: workflowDefinition.nodes.length,
        hasInputs: !!workflowDefinition.inputs?.length,
        hasOutputs: !!workflowDefinition.outputs?.length,
        category: workflowDefinition.category,
        tags: workflowDefinition.tags
      });

      // 2. 尝试获取互斥锁
      const lockAcquired = await this.databaseLockService.acquireLock(
        lockKey,
        300000, // 5分钟锁定时间
        owner
      );

      if (!lockAcquired) {
        // 检查是否有冲突的实例
        await this.findConflictingInstance(mutexKey);
        return {
          success: false,
          error: '存在冲突的工作流实例，无法创建新实例'
        } as const;
      }

      // 3. 检查是否已有运行中的同类型实例
      const runningInstance = await this.findRunningMutexInstance(mutexKey);
      if (runningInstance) {
        await this.databaseLockService.releaseLock(lockKey, owner);
        return {
          success: false,
          error: '已存在运行中的同类型工作流实例',
          conflictingInstance: runningInstance
        };
      }

      // 4. 创建工作流实例
      const instance = await this.workflowEngineService.startWorkflow(
        workflowDefinition,
        inputs
      );

      if (!instance) {
        await this.databaseLockService.releaseLock(lockKey, owner);
        return {
          success: false,
          error: '创建工作流实例失败：实例为空'
        };
      }

      // 4. 注册互斥信息到实例上下文
      // 更新实例的上下文数据以包含互斥信息
      if (instance.contextData) {
        instance.contextData.mutexKey = mutexKey;
        instance.contextData.mutexOwner = owner;
      } else {
        instance.contextData = {
          mutexKey,
          mutexOwner: owner
        };
      }

      await this.registerMutexInstance(mutexKey, instance.id.toString());

      this.logger.info('互斥工作流实例创建成功', {
        instanceId: instance.id,
        mutexKey,
        name: instance.name
      });

      return {
        success: true,
        instance
      };
    } catch (error) {
      // 确保释放锁
      await this.databaseLockService.releaseLock(lockKey, owner);

      this.logger.error('创建互斥工作流实例失败', {
        workflowName: workflowQuery.name,
        workflowVersion: workflowQuery.version,
        mutexKey,
        error
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 查找运行中的互斥实例
   */
  private async findRunningMutexInstance(
    mutexKey: string
  ): Promise<WorkflowInstance | null> {
    try {
      const runningInstancesResult =
        await this.workflowInstanceRepository.findByStatus('running');

      if (!runningInstancesResult.success) {
        return null;
      }

      // 查找匹配互斥键的实例
      const instances = runningInstancesResult.data || [];
      for (const instance of instances) {
        // 解析上下文数据
        let contextData: any = {};
        if (instance.context_data) {
          try {
            contextData =
              typeof instance.context_data === 'string'
                ? JSON.parse(instance.context_data)
                : instance.context_data;
          } catch (error) {
            this.logger.warn('Failed to parse context data', {
              instanceId: instance.id,
              error
            });
          }
        }

        const contextMutexKey = contextData?.mutexKey;
        if (contextMutexKey === mutexKey) {
          // 转换为WorkflowInstance类型
          return {
            id: instance.id,
            workflowDefinitionId: instance.workflow_definition_id,
            name: instance.name,
            externalId: instance.external_id,
            status: instance.status,
            inputData: instance.input_data
              ? JSON.parse(instance.input_data)
              : {},
            outputData: instance.output_data
              ? JSON.parse(instance.output_data)
              : undefined,
            contextData: contextData,
            startedAt: instance.started_at,
            completedAt: instance.completed_at,
            pausedAt: instance.paused_at,
            errorMessage: instance.error_message,
            errorDetails: instance.error_details
              ? JSON.parse(instance.error_details)
              : undefined,
            retryCount: instance.retry_count,
            maxRetries: instance.max_retries,
            priority: instance.priority,
            scheduledAt: instance.scheduled_at,
            currentNodeId: instance.current_node_id,
            completedNodes: instance.completed_nodes
              ? JSON.parse(instance.completed_nodes)
              : undefined,
            failedNodes: instance.failed_nodes
              ? JSON.parse(instance.failed_nodes)
              : undefined,
            lockOwner: instance.lock_owner,
            lockAcquiredAt: instance.lock_acquired_at,
            lastHeartbeat: instance.last_heartbeat,
            businessKey: instance.business_key,
            mutexKey: instance.mutex_key,
            assignedEngineId: instance.assigned_engine_id,
            assignmentStrategy: instance.assignment_strategy,
            createdAt: instance.created_at,
            updatedAt: instance.updated_at,
            createdBy: instance.created_by
          } as WorkflowInstance;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('查找运行中互斥实例失败', { mutexKey, error });
      return null;
    }
  }

  /**
   * 查找冲突的实例
   */
  private async findConflictingInstance(
    mutexKey: string
  ): Promise<WorkflowInstance | null> {
    // 实现逻辑与 findRunningMutexInstance 类似
    return this.findRunningMutexInstance(mutexKey);
  }

  /**
   * 注册互斥实例
   */
  private async registerMutexInstance(
    mutexKey: string,
    instanceId: string
  ): Promise<void> {
    // 可以将互斥信息存储到数据库中，便于快速查询
    // 这里简化实现，仅记录日志
    this.logger.debug('注册互斥实例', { mutexKey, instanceId });
  }

  /**
   * 释放互斥锁rt/
   */
  async releaseMutexLock(mutexKey: string, instanceId: string): Promise<void> {
    const lockKey = this.getMutexLockKey(mutexKey);

    try {
      await this.databaseLockService.releaseLock(lockKey);
      this.logger.info('互斥锁已释放', { mutexKey, instanceId });
    } catch (error) {
      this.logger.error('释放互斥锁失败', { mutexKey, instanceId, error });
    }
  }

  /**
   * 获取互斥锁键
   */
  private getMutexLockKey(mutexKey: string): string {
    return `mutex:${mutexKey}`;
  }
}
