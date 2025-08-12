/**
 * 工作流引擎
 *
 * 负责工作流的执行、状态管理和生命周期控制
 */

import type { Logger } from '@stratix/core';
import * as executorRegistry from '../registerTask.js';
import WorkflowDefinitionRepository from '../repositories/WorkflowDefinitionRepository.js';
import WorkflowInstanceRepository from '../repositories/WorkflowInstanceRepository.js';
import WorkflowTaskNodeRepository from '../repositories/WorkflowTaskNodeRepository.js';
import type {
  NewTaskNode,
  NewWorkflowInstanceTable,
  TaskNodeUpdate,
  WorkflowDefinitionTable,
  WorkflowInstancesTable,
  WorkflowTaskNode
} from '../types/database.js';
import type {
  DynamicParallelResult,
  LoopNodeDefinition,
  NodeDefinition,
  SubWorkflowDefinition,
  TaskNodeDefinition,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStatus
} from '../types/workflow.js';
import ConcurrencyControlManager from './ConcurrencyControlManager.js';
import type { IDistributedLockManager } from './DistributedLockManager.js';
import type { IDistributedScheduler } from './DistributedScheduler.js';
import ErrorHandler from './ErrorHandler.js';
import type { IWorkflowLockManager } from './WorkflowLockManager.js';

/**
 * 服务结果类型
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * 将数据库行转换为WorkflowInstance对象
 */
function mapTableToWorkflowInstance(
  tableRow: WorkflowInstancesTable
): WorkflowInstance {
  const result: WorkflowInstance = {
    id: tableRow.id,
    workflowDefinitionId: tableRow.workflow_definition_id,
    name: tableRow.name,
    status: tableRow.status as WorkflowStatus,
    retryCount: tableRow.retry_count,
    maxRetries: tableRow.max_retries,
    priority: tableRow.priority,
    createdAt: tableRow.created_at,
    updatedAt: tableRow.updated_at
  };

  // 添加可选字段
  if (tableRow.external_id) {
    result.externalId = tableRow.external_id;
  }
  if (tableRow.input_data) {
    result.inputData = tableRow.input_data;
  }
  if (tableRow.output_data) {
    result.outputData = tableRow.output_data;
  }
  if (tableRow.context_data) {
    result.contextData = tableRow.context_data;
  }
  if (tableRow.business_key) {
    result.businessKey = tableRow.business_key;
  }
  if (tableRow.mutex_key) {
    result.mutexKey = tableRow.mutex_key;
  }
  if (tableRow.started_at) {
    result.startedAt = tableRow.started_at;
  }
  if (tableRow.completed_at) {
    result.completedAt = tableRow.completed_at;
  }
  if (tableRow.paused_at) {
    result.pausedAt = tableRow.paused_at;
  }
  if (tableRow.error_message) {
    result.errorMessage = tableRow.error_message;
  }
  if (tableRow.error_details) {
    result.errorDetails = tableRow.error_details;
  }
  if (tableRow.scheduled_at) {
    result.scheduledAt = tableRow.scheduled_at;
  }
  if (tableRow.current_node_id) {
    result.currentNodeId = tableRow.current_node_id;
  }
  if (tableRow.completed_nodes) {
    result.completedNodes = tableRow.completed_nodes;
  }
  if (tableRow.failed_nodes) {
    result.failedNodes = tableRow.failed_nodes;
  }
  if (tableRow.lock_owner) {
    result.lockOwner = tableRow.lock_owner;
  }
  if (tableRow.lock_acquired_at) {
    result.lockAcquiredAt = tableRow.lock_acquired_at;
  }
  if (tableRow.last_heartbeat) {
    result.lastHeartbeat = tableRow.last_heartbeat;
  }
  if (tableRow.assigned_engine_id) {
    result.assignedEngineId = tableRow.assigned_engine_id;
  }
  if (tableRow.assignment_strategy) {
    result.assignmentStrategy = tableRow.assignment_strategy;
  }
  if (tableRow.created_by) {
    result.createdBy = tableRow.created_by;
  }

  return result;
}

/**
 * 工作流引擎接口
 */
export interface WorkflowEngine {
  /**
   * 启动工作流实例
   * @param definition 工作流定义
   * @param inputs 输入数据
   * @returns 工作流实例
   */
  startWorkflow(
    definition: WorkflowDefinition,
    inputs: any
  ): Promise<WorkflowInstance>;

  /**
   * 恢复工作流执行
   * @param instanceId 实例ID
   */
  resumeWorkflow(instanceId: string): Promise<void>;

  /**
   * 暂停工作流
   * @param instanceId 实例ID
   */
  pauseWorkflow(instanceId: string): Promise<void>;

  /**
   * 取消工作流
   * @param instanceId 实例ID
   */
  cancelWorkflow(instanceId: string): Promise<void>;

  /**
   * 获取执行状态
   * @param instanceId 实例ID
   * @returns 工作流状态
   */
  getWorkflowStatus(instanceId: string): Promise<WorkflowStatus>;
}

/**
 * 执行上下文 - 重构为数据库驱动模式
 */
interface ExecutionContext {
  instance: WorkflowInstance;
  definition: WorkflowDefinition;
  executorRegistry: typeof executorRegistry;
  currentNode?: NodeDefinition;
  // 工作流变量存储，用于节点间数据传递
  variables: Record<string, any>;
}

/**
 * 节点输入数据构建结果
 */
interface NodeInputData {
  /** 解析后的配置数据 */
  config: Record<string, any>;
  /** 依赖节点的输出数据 */
  dependencies: Record<string, any>;
  /** 工作流输入参数 */
  workflowInputs: Record<string, any>;
}

// 移除未使用的 DependencyCheckResult 接口

/**
 * 节点执行结果
 */
interface NodeExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时长 */
  duration?: number;
}

/**
 * 工作流引擎实现
 */
export default class WorkflowEngineService implements WorkflowEngine {
  private readonly executionContexts = new Map<string, ExecutionContext>();
  private readonly contextAccessTimes = new Map<string, Date>(); // 记录上下文最后访问时间
  private readonly workflowSlotIds = new Map<string, string>(); // 工作流ID -> 槽位ID映射
  private readonly instanceId: string;
  private heartbeatTimer?: NodeJS.Timeout;
  private memoryCleanupTimer?: NodeJS.Timeout | undefined;
  private readonly heartbeatInterval = 30000; // 30秒心跳间隔
  private readonly memoryCleanupInterval = 300000; // 5分钟清理间隔
  private readonly contextMaxIdleTime = 3600000; // 1小时最大空闲时间
  private isShuttingDown = false;
  private isReady = false;

  constructor(
    private logger: Logger,
    private workflowInstanceRepository: WorkflowInstanceRepository,
    private workflowTaskNodeRepository: WorkflowTaskNodeRepository,
    private workflowDefinitionRepository: WorkflowDefinitionRepository,
    private distributedLockManager: IDistributedLockManager,
    private distributedScheduler: IDistributedScheduler,
    private workflowLockManager: IWorkflowLockManager,
    private errorHandler: ErrorHandler,
    private concurrencyControlManager: ConcurrencyControlManager
  ) {
    this.instanceId = `engine_${process.pid}_${Date.now()}`;
    // 移除构造函数中的服务启动逻辑，将在onReady中启动
  }

  /**
   * Stratix框架生命周期钩子：服务就绪
   */
  async onReady(): Promise<void> {
    this.logger.info('工作流引擎开始初始化', { instanceId: this.instanceId });

    try {
      // 1. 启动锁续期管理器
      if (this.workflowLockManager) {
        await this.workflowLockManager.startRenewalProcess();
        this.logger.debug('锁续期管理器启动成功');
      }

      // 2. 注册到分布式调度器并启动心跳
      if (this.distributedScheduler) {
        await this.registerEngineInstance();
        this.startHeartbeat();
        this.logger.debug('分布式调度器注册成功');
      }

      // 3. 启动内存清理定时器
      this.startMemoryCleanup();
      this.logger.debug('内存清理定时器启动成功');

      this.isReady = true;
      this.logger.info('工作流引擎初始化完成', { instanceId: this.instanceId });
    } catch (error) {
      this.logger.error('工作流引擎初始化失败', {
        instanceId: this.instanceId,
        error
      });
      throw error;
    }
  }

  /**
   * Stratix框架生命周期钩子：准备关闭
   */
  async preClose(): Promise<void> {
    this.logger.info('工作流引擎开始准备关闭', { instanceId: this.instanceId });

    // 停止接收新的工作流
    this.isShuttingDown = true;

    // 等待当前执行的工作流达到安全点
    await this.waitForSafeShutdownPoint();
  }

  /**
   * Stratix框架生命周期钩子：服务关闭
   */
  async onClose(): Promise<void> {
    this.logger.info('工作流引擎开始关闭', { instanceId: this.instanceId });

    try {
      // 1. 停止心跳
      this.stopHeartbeat();

      // 2. 停止内存清理定时器
      this.stopMemoryCleanup();
      this.logger.debug('内存清理定时器停止成功');

      // 3. 停止锁续期管理器
      if (this.workflowLockManager) {
        await this.workflowLockManager.stopRenewalProcess();
        this.logger.debug('锁续期管理器停止成功');
      }

      // 4. 注销引擎实例
      if (this.distributedScheduler) {
        await this.distributedScheduler.unregisterEngine(this.instanceId);
        this.logger.debug('分布式调度器注销成功');
      }

      // 5. 等待活跃工作流完成或超时
      await this.waitForActiveWorkflowsToComplete(30000); // 30秒超时

      // 6. 清理执行上下文和访问时间记录
      this.executionContexts.clear();
      this.contextAccessTimes.clear();

      this.isReady = false;
      this.logger.info('工作流引擎关闭完成', { instanceId: this.instanceId });
    } catch (error) {
      this.logger.error('工作流引擎关闭失败', {
        instanceId: this.instanceId,
        error
      });
      throw error;
    }
  }

  /**
   * 等待安全关闭点
   */
  private async waitForSafeShutdownPoint(): Promise<void> {
    // 等待所有工作流到达安全点（如节点完成、暂停等）
    const maxWaitTime = 60000; // 最多等待1分钟
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const hasUnsafeWorkflows = Array.from(
        this.executionContexts.values()
      ).some((context) => !this.isWorkflowAtSafePoint(context));

      if (!hasUnsafeWorkflows) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
    }
  }

  /**
   * 检查工作流是否处于安全点
   */
  private isWorkflowAtSafePoint(context: ExecutionContext): boolean {
    // 工作流处于以下状态时认为是安全的：
    // - 已完成
    // - 已暂停
    // - 已失败
    // - 正在等待外部输入
    const safeStatuses = ['completed', 'paused', 'failed'];
    return safeStatuses.includes(context.instance.status);
  }

  /**
   * 等待活跃工作流完成
   */
  private async waitForActiveWorkflowsToComplete(
    timeoutMs: number
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.executionContexts.size === 0) {
        break;
      }

      // 检查是否有工作流仍在执行
      const activeWorkflows = Array.from(
        this.executionContexts.values()
      ).filter((context) => context.instance.status === 'running');

      if (activeWorkflows.length === 0) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 如果超时，强制停止剩余工作流
    if (this.executionContexts.size > 0) {
      this.logger.warn('强制停止剩余工作流', {
        remainingCount: this.executionContexts.size
      });

      for (const context of this.executionContexts.values()) {
        try {
          await this.updateWorkflowInstanceStatus(
            context.instance.id,
            'cancelled'
          );
        } catch (error) {
          this.logger.error('强制停止工作流失败', {
            instanceId: context.instance.id,
            error
          });
        }
      }
    }
  }

  /**
   * 注册引擎实例到分布式调度器
   */
  private async registerEngineInstance(): Promise<void> {
    if (!this.distributedScheduler) return;

    try {
      const engineInstance = {
        instanceId: this.instanceId,
        hostname: process.env.HOSTNAME || 'localhost',
        processId: process.pid,
        startedAt: new Date(),
        lastHeartbeat: new Date(),
        status: 'active' as const,
        load: this.getCurrentLoad(),
        supportedExecutors: this.getSupportedExecutors()
      };

      await this.distributedScheduler.registerEngine(engineInstance);
      this.logger.info('引擎实例注册成功', { instanceId: this.instanceId });
    } catch (error) {
      this.logger.error('引擎实例注册失败', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 启动心跳发送
   */
  private startHeartbeat(): void {
    if (!this.distributedScheduler) return;

    this.heartbeatTimer = setInterval(async () => {
      if (this.isShuttingDown || !this.distributedScheduler) return;

      try {
        const currentLoad = this.getCurrentLoad();
        await this.distributedScheduler.updateHeartbeat(
          this.instanceId,
          currentLoad
        );

        this.logger.debug('心跳发送成功', {
          instanceId: this.instanceId,
          load: currentLoad
        });
      } catch (error) {
        this.logger.error('心跳发送失败', {
          instanceId: this.instanceId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.heartbeatInterval);

    this.logger.info('心跳服务启动', {
      instanceId: this.instanceId,
      interval: this.heartbeatInterval
    });
  }

  /**
   * 停止心跳发送
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null as any;
      this.logger.info('心跳服务停止', { instanceId: this.instanceId });
    }
  }

  /**
   * 获取当前负载信息
   */
  private getCurrentLoad(): {
    activeWorkflows: number;
    cpuUsage: number;
    memoryUsage: number;
  } {
    return {
      activeWorkflows: this.executionContexts.size,
      cpuUsage: this.getCpuUsage(),
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * 获取CPU使用率
   */
  private getCpuUsage(): number {
    try {
      // 简单实现：基于进程CPU时间
      const usage = process.cpuUsage();
      const totalUsage = usage.user + usage.system;
      // 转换为百分比（这是一个简化实现）
      return Math.min(totalUsage / 1000000, 100); // 微秒转换为百分比
    } catch (error) {
      this.logger.warn('获取CPU使用率失败', { error });
      return 0;
    }
  }

  /**
   * 获取内存使用率
   */
  private getMemoryUsage(): number {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal + memUsage.external;
      const usedMemory = memUsage.heapUsed;
      return Math.round((usedMemory / totalMemory) * 100);
    } catch (error) {
      this.logger.warn('获取内存使用率失败', { error });
      return 0;
    }
  }

  /**
   * 获取支持的执行器列表
   */
  private getSupportedExecutors(): string[] {
    try {
      // TODO: 从执行器注册表动态获取
      // 当前返回硬编码列表，后续需要与执行器注册表集成
      return ['fetchOldCalendarMappings', 'deleteSingleCalendar'];
    } catch (error) {
      this.logger.warn('获取支持的执行器列表失败', { error });
      return [];
    }
  }

  /**
   * 优雅关闭引擎
   */
  async shutdown(): Promise<void> {
    this.logger.info('开始关闭工作流引擎', { instanceId: this.instanceId });

    this.isShuttingDown = true;

    // 停止心跳
    this.stopHeartbeat();

    // 注销引擎实例
    if (this.distributedScheduler) {
      try {
        await this.distributedScheduler.unregisterEngine(this.instanceId);
        this.logger.info('引擎实例注销成功', { instanceId: this.instanceId });
      } catch (error) {
        this.logger.error('引擎实例注销失败', {
          instanceId: this.instanceId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 等待当前执行的工作流完成（可选，根据需要实现）
    // await this.waitForActiveWorkflowsToComplete();

    this.logger.info('工作流引擎关闭完成', { instanceId: this.instanceId });
  }

  /**
   * 检查工作流是否可以在当前实例执行
   * @deprecated 暂未使用，为未来分布式功能预留
   */
  // @ts-ignore - 为未来分布式功能预留
  private async canExecuteWorkflow(
    workflowInstanceId: number
  ): Promise<boolean> {
    if (!this.distributedScheduler || !this.distributedLockManager) {
      return true; // 非分布式模式，直接执行
    }

    try {
      // 尝试分配工作流到当前实例
      const assignment =
        await this.distributedScheduler.assignWorkflow(workflowInstanceId);
      return assignment?.assignedEngineId === this.instanceId;
    } catch (error) {
      this.logger.error('工作流分配检查失败', {
        workflowInstanceId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 检查节点是否可以在当前实例执行
   * @deprecated 暂未使用，为未来分布式功能预留
   */
  // @ts-ignore - 为未来分布式功能预留
  private async canExecuteNode(
    workflowInstanceId: number,
    nodeId: string,
    requiredCapabilities?: string[]
  ): Promise<boolean> {
    if (!this.distributedScheduler || !this.distributedLockManager) {
      return true; // 非分布式模式，直接执行
    }

    try {
      // 尝试分配节点到当前实例
      const assignment = await this.distributedScheduler.assignNode(
        workflowInstanceId,
        nodeId,
        requiredCapabilities
      );
      return assignment?.assignedEngineId === this.instanceId;
    } catch (error) {
      this.logger.error('节点分配检查失败', {
        workflowInstanceId,
        nodeId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 启动工作流实例
   */
  async startWorkflow(
    definition: WorkflowDefinition,
    inputs: any
  ): Promise<WorkflowInstance> {
    // 检查服务是否已准备就绪
    if (!this.isReady) {
      throw new Error('工作流引擎尚未准备就绪，请等待初始化完成');
    }

    // 检查是否正在关闭
    if (this.isShuttingDown) {
      throw new Error('工作流引擎正在关闭，无法启动新的工作流');
    }

    this.logger.info(`Starting workflow: ${definition.name}`);

    // 验证工作流定义
    this.validateWorkflowDefinition(definition);

    // 验证输入参数
    this.validateInputs(definition, inputs);

    // 获取工作流定义ID
    const workflowDefinitionId = definition.id;
    if (!workflowDefinitionId) {
      throw new Error(
        `工作流定义缺少数据库ID，请确保工作流定义已保存到数据库: ${definition.name} v${definition.version}`
      );
    }

    // 创建工作流实例数据 - 确保所有字段都有正确的值
    const newInstanceData: NewWorkflowInstanceTable = {
      workflow_definition_id: workflowDefinitionId,
      name: definition.name,
      external_id: null,
      status: 'pending',
      input_data: inputs ? JSON.parse(JSON.stringify(inputs)) : null,
      output_data: null,
      context_data: {},
      business_key: null,
      mutex_key: null,
      started_at: null,
      completed_at: null,
      paused_at: null,
      error_message: null,
      error_details: null,
      retry_count: 0,
      max_retries: definition.config?.retryPolicy?.maxAttempts || 3,
      priority: definition.config?.priority || 0,
      scheduled_at: null,
      // v3.0.0 新增字段：断点续传和分布式锁支持
      current_node_id: null,
      completed_nodes: null,
      failed_nodes: null,
      lock_owner: null,
      lock_acquired_at: null,
      last_heartbeat: null,
      assigned_engine_id: null,
      assignment_strategy: null,
      created_by: null
    };

    // 保存到数据库 - 使用基础仓储方法
    const createResult =
      await this.workflowInstanceRepository.create(newInstanceData);
    if (!createResult.success) {
      throw new Error(
        `Failed to create workflow instance: ${createResult.error}`
      );
    }

    const instanceTableRow = createResult.data as WorkflowInstancesTable;
    const instance = mapTableToWorkflowInstance(instanceTableRow);

    // 创建执行上下文
    const context: ExecutionContext = {
      instance,
      definition,
      executorRegistry: executorRegistry,
      variables: inputs || {}
    };

    // 请求工作流执行槽位
    const workflowSlotId =
      await this.concurrencyControlManager.requestExecutionSlot(
        'workflow',
        instance.id.toString(),
        undefined,
        undefined,
        0 // 默认优先级
      );

    if (!workflowSlotId) {
      throw new Error('无法获取工作流执行槽位，系统繁忙');
    }

    // 保存槽位ID映射
    this.workflowSlotIds.set(instance.id.toString(), workflowSlotId);

    // 保存执行上下文到内存（用于当前执行）
    this.executionContexts.set(instance.id.toString(), context);
    this.contextAccessTimes.set(instance.id.toString(), new Date());

    // 获取工作流锁并启用自动续期
    if (this.distributedLockManager) {
      const lockKey = `workflow:${instance.id}`;
      const lockAcquired = await this.distributedLockManager.acquireLock(
        lockKey,
        this.instanceId,
        'workflow',
        300000 // 5分钟初始锁定时间
      );

      if (lockAcquired) {
        // 启用自动续期，每30秒续期一次
        await this.distributedLockManager.enableAutoRenewal(
          lockKey,
          this.instanceId,
          'workflow',
          30000 // 30秒续期间隔
        );

        this.logger.info('工作流锁获取成功并启用自动续期', {
          instanceId: instance.id,
          lockKey,
          owner: this.instanceId
        });
      } else {
        this.logger.warn('工作流锁获取失败，可能存在并发执行', {
          instanceId: instance.id,
          lockKey
        });
      }
    }

    // 开始执行
    await this.executeWorkflow(context);

    return instance;
  }

  /**
   * 恢复工作流执行
   */
  async resumeWorkflow(instanceId: string): Promise<void> {
    const context = this.executionContexts.get(instanceId);
    if (!context) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (context.instance.status !== 'paused') {
      throw new Error(
        `Cannot resume workflow in status: ${context.instance.status}`
      );
    }

    this.logger.info(`Resuming workflow: ${instanceId}`);
    context.instance.status = 'running';
    context.instance.updatedAt = new Date();

    await this.executeWorkflow(context);
  }

  /**
   * 暂停工作流
   */
  async pauseWorkflow(instanceId: string): Promise<void> {
    const context = this.executionContexts.get(instanceId);
    if (!context) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (context.instance.status !== 'running') {
      throw new Error(
        `Cannot pause workflow in status: ${context.instance.status}`
      );
    }

    this.logger.info(`Pausing workflow: ${instanceId}`);
    context.instance.status = 'paused';
    context.instance.pausedAt = new Date();
    context.instance.updatedAt = new Date();
  }

  /**
   * 取消工作流
   */
  async cancelWorkflow(instanceId: string): Promise<void> {
    const context = this.executionContexts.get(instanceId);
    if (!context) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    this.logger.info(`Cancelling workflow: ${instanceId}`);
    context.instance.status = 'cancelled';
    context.instance.updatedAt = new Date();

    // 清理执行上下文
    this.executionContexts.delete(instanceId);
  }

  /**
   * 获取执行状态
   */
  async getWorkflowStatus(instanceId: string): Promise<WorkflowStatus> {
    const result = await this.workflowInstanceRepository.findByIdNullable(
      Number(instanceId)
    );
    if (!result.success || !result.data) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    return result.data.status as WorkflowStatus;
  }

  /**
   * 构建节点依赖关系图
   */
  private buildNodeDependencyGraph(
    nodes: NodeDefinition[]
  ): Map<string, NodeDefinition> {
    const nodeMap = new Map<string, NodeDefinition>();

    // 构建节点映射
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    return nodeMap;
  }

  /**
   * 拓扑排序 - 确定节点执行顺序
   */
  private topologicalSort(
    nodeGraph: Map<string, NodeDefinition>
  ): NodeDefinition[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: NodeDefinition[] = [];

    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new Error(
          `Circular dependency detected involving node: ${nodeId}`
        );
      }

      if (visited.has(nodeId)) {
        return;
      }

      const node = nodeGraph.get(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      visiting.add(nodeId);

      // 先访问所有依赖节点
      if (node.dependsOn) {
        for (const depId of node.dependsOn) {
          visit(depId);
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      result.push(node);
    };

    // 访问所有节点
    for (const nodeId of nodeGraph.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    return result;
  }

  /**
   * 获取或创建任务节点记录
   *
   * @param workflowInstanceId 工作流实例ID
   * @param node 节点定义
   * @returns 完整的任务节点记录
   */
  private async getOrCreateTaskNode(
    workflowInstanceId: number,
    node: NodeDefinition
  ): Promise<WorkflowTaskNode> {
    try {
      // 先尝试查找现有记录
      const existingResult = await this.workflowTaskNodeRepository.findByNodeId(
        workflowInstanceId,
        node.id
      );

      if (existingResult.success && existingResult.data) {
        this.logger.debug(`Found existing task node: ${node.id}`, {
          taskNodeId: existingResult.data.id,
          status: existingResult.data.status,
          workflowInstanceId
        });
        return existingResult.data;
      }

      // 创建新的任务节点记录
      this.logger.debug(`Creating new task node: ${node.id}`, {
        workflowInstanceId,
        nodeType: node.type
      });

      const newTaskNode: NewTaskNode = {
        workflow_instance_id: workflowInstanceId,
        node_id: node.id,
        node_name: node.name || node.id,
        node_type: node.type === 'wait' ? 'task' : node.type,
        status: 'pending',
        input_data: null,
        output_data: null,
        parent_node_id: null,
        depends_on: node.dependsOn ? JSON.stringify(node.dependsOn) : null,
        parallel_group_id: null,
        parallel_index: null,
        is_dynamic_task: false,
        dynamic_source_data: null,
        started_at: null,
        completed_at: null,
        error_message: null,
        error_details: null,
        retry_count: 0,
        max_retries: 3,
        executor: (node as any).executor || null,
        executor_config: (node as any).config || null,
        assigned_engine_id: null,
        assignment_strategy: 'round_robin',
        duration_ms: null
      };

      const createResult =
        await this.workflowTaskNodeRepository.create(newTaskNode);

      if (!createResult.success) {
        this.logger.error(`Failed to create task node: ${node.id}`, {
          error: createResult.error,
          workflowInstanceId,
          nodeType: node.type
        });
        throw new Error(`Failed to create task node: ${createResult.error}`);
      }

      // MySQL 5.7下create方法不返回完整记录数据，需要获取insertId后查询
      const insertResult = createResult.data as any;
      const insertId = insertResult?.insertId || insertResult?.id;

      if (!insertId) {
        this.logger.error(
          `Create task node succeeded but no insertId returned: ${node.id}`,
          {
            workflowInstanceId,
            createResult: insertResult
          }
        );
        throw new Error(
          `Create task node succeeded but no insertId returned for node: ${node.id}`
        );
      }

      // 使用insertId查询完整的记录数据
      this.logger.debug(`Fetching created task node by ID: ${insertId}`, {
        nodeId: node.id,
        workflowInstanceId
      });

      const fetchResult =
        await this.workflowTaskNodeRepository.findByIdNullable(insertId);

      if (!fetchResult.success || !fetchResult.data) {
        this.logger.error(`Failed to fetch created task node: ${node.id}`, {
          insertId,
          workflowInstanceId,
          fetchError: fetchResult.success
            ? 'No data returned'
            : (fetchResult as any).error
        });
        throw new Error(`Failed to fetch created task node: ${node.id}`);
      }

      this.logger.debug(
        `Successfully created and fetched task node: ${node.id}`,
        {
          taskNodeId: fetchResult.data.id,
          workflowInstanceId,
          status: fetchResult.data.status
        }
      );

      return fetchResult.data;
    } catch (error) {
      this.logger.error(`Error in getOrCreateTaskNode for node: ${node.id}`, {
        error: error instanceof Error ? error.message : String(error),
        workflowInstanceId,
        nodeType: node.type
      });
      throw error;
    }
  }

  /**
   * 确保依赖节点全部完成
   */
  private async ensureDependenciesCompleted(
    workflowInstanceId: number,
    dependencies?: string[]
  ): Promise<void> {
    if (!dependencies || dependencies.length === 0) {
      return;
    }

    this.logger.info('检查依赖节点状态', {
      workflowInstanceId,
      dependencies
    });

    // 检查所有依赖节点的状态
    for (const depNodeId of dependencies) {
      const depNodeResult = await this.workflowTaskNodeRepository.findByNodeId(
        workflowInstanceId,
        depNodeId
      );

      if (!depNodeResult.success || !depNodeResult.data) {
        throw new Error(`Dependency node not found: ${depNodeId}`);
      }

      const depNode = depNodeResult.data;
      if (depNode.status !== 'completed') {
        throw new Error(
          `Dependency node ${depNodeId} is not completed, current status: ${depNode.status}`
        );
      }
    }

    this.logger.info('所有依赖节点已完成', {
      workflowInstanceId,
      dependencies
    });
  }

  /**
   * 从数据库构建节点输入数据
   */
  private async buildNodeInputFromDatabase(
    workflowInstanceId: number,
    node: NodeDefinition
  ): Promise<NodeInputData> {
    const result: NodeInputData = {
      config: {},
      dependencies: {},
      workflowInputs: {}
    };

    // 获取工作流输入参数
    const workflowResult =
      await this.workflowInstanceRepository.findByIdNullable(
        workflowInstanceId
      );
    if (workflowResult.success && workflowResult.data) {
      result.workflowInputs = workflowResult.data.input_data || {};
    }

    // 获取依赖节点的输出数据
    if (node.dependsOn && node.dependsOn.length > 0) {
      for (const depNodeId of node.dependsOn) {
        const depNodeResult =
          await this.workflowTaskNodeRepository.findByNodeId(
            workflowInstanceId,
            depNodeId
          );

        if (depNodeResult.success && depNodeResult.data) {
          result.dependencies[depNodeId] = depNodeResult.data.output_data || {};
        }
      }
    }

    // 解析节点配置中的变量引用
    if ((node as any).config) {
      result.config = await this.resolveConfigVariablesFromDatabase(
        (node as any).config,
        result.workflowInputs,
        result.dependencies
      );
    }

    return result;
  }

  /**
   * 从数据库解析配置变量
   */
  private async resolveConfigVariablesFromDatabase(
    config: any,
    workflowInputs: Record<string, any>,
    dependencies: Record<string, any>
  ): Promise<any> {
    const resolved: any = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        // 解析字符串中的变量引用
        resolved[key] = this.evaluateExpressionFromDatabase(
          value,
          workflowInputs,
          dependencies
        );
      } else if (Array.isArray(value)) {
        // 递归处理数组
        resolved[key] = value.map((item) =>
          typeof item === 'string'
            ? this.evaluateExpressionFromDatabase(
                item,
                workflowInputs,
                dependencies
              )
            : typeof item === 'object' && item !== null
              ? this.resolveConfigVariablesFromDatabase(
                  item,
                  workflowInputs,
                  dependencies
                )
              : item
        );
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        resolved[key] = await this.resolveConfigVariablesFromDatabase(
          value,
          workflowInputs,
          dependencies
        );
      } else {
        // 其他类型直接复制
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * 从数据库数据评估表达式
   */
  private evaluateExpressionFromDatabase(
    expression: string,
    workflowInputs: Record<string, any>,
    dependencies: Record<string, any>
  ): any {
    try {
      // 构建变量上下文
      const variables: Record<string, any> = {
        ...workflowInputs,
        nodes: {}
      };

      // 添加依赖节点的输出数据
      for (const [nodeId, nodeOutput] of Object.entries(dependencies)) {
        (variables.nodes as Record<string, any>)[nodeId] = {
          output: nodeOutput
        };
      }

      // 使用现有的表达式评估逻辑
      return this.evaluateExpression(expression, variables);
    } catch (error) {
      this.logger.error(`表达式评估失败: ${expression}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return expression; // 返回原始表达式
    }
  }

  /**
   * 根据节点类型执行不同的处理逻辑
   */
  private async executeByNodeType(
    context: ExecutionContext,
    node: NodeDefinition,
    nodeInput: NodeInputData
  ): Promise<NodeExecutionResult> {
    switch (node.type) {
      case 'task':
        return await this.executeTaskNodeWithDatabase(
          context,
          node as TaskNodeDefinition,
          nodeInput
        );
      case 'loop':
        return await this.executeLoopNodeWithDatabase(
          context,
          node as LoopNodeDefinition,
          nodeInput
        );
      case 'parallel':
        return await this.executeParallelNodeWithDatabase(
          context,
          node,
          nodeInput
        );
      case 'condition':
        return await this.executeConditionNodeWithDatabase(
          context,
          node,
          nodeInput
        );
      case 'subprocess':
        return await this.executeSubWorkflowNodeWithDatabase(
          context,
          node,
          nodeInput
        );
      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  }

  /**
   * 执行子工作流节点（数据库驱动）
   */
  private async executeSubWorkflowNodeWithDatabase(
    context: ExecutionContext,
    node: NodeDefinition,
    nodeInput: NodeInputData
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`开始执行子工作流节点: ${node.id}`);

      const subWorkflowNode = node as any; // 临时类型转换
      const workflowName = subWorkflowNode.workflowName;
      const version = subWorkflowNode.version || 'latest';

      if (!workflowName) {
        throw new Error(
          `SubWorkflow node requires workflowName configuration: ${node.id}`
        );
      }

      // 获取子工作流定义
      const workflowDefResult =
        await this.workflowDefinitionRepository.findByNameAndVersion(
          workflowName,
          version
        );

      if (!workflowDefResult.success || !workflowDefResult.data) {
        throw new Error(
          `SubWorkflow definition not found: ${workflowName}@${version}`
        );
      }

      // 转换数据库表类型到业务接口类型
      const workflowDefinition = this.mapDatabaseToWorkflowDefinition(
        workflowDefResult.data
      );

      // 构建子工作流输入参数
      const subWorkflowInputs = await this.buildSubWorkflowInputs(
        subWorkflowNode,
        nodeInput
      );

      // 创建子工作流实例
      const subWorkflowInstance = await this.createSubWorkflowInstance(
        workflowDefinition,
        subWorkflowInputs,
        context.instance.id,
        node.id
      );

      // 递归执行子工作流
      const subWorkflowContext: ExecutionContext = {
        instance: subWorkflowInstance,
        definition: workflowDefinition, // 直接使用业务接口类型的定义
        executorRegistry: context.executorRegistry,
        variables: subWorkflowInputs || {}
      };

      await this.executeWorkflow(subWorkflowContext);

      // 获取子工作流执行结果
      const subWorkflowResult = await this.getSubWorkflowResult(
        subWorkflowInstance.id,
        subWorkflowNode.outputMapping
      );

      const duration = Date.now() - startTime;

      this.logger.info(`子工作流节点执行完成: ${node.id}`, {
        subWorkflowId: subWorkflowInstance.id,
        status: subWorkflowInstance.status,
        duration
      });

      const result: NodeExecutionResult = {
        success: subWorkflowInstance.status === 'completed',
        data: subWorkflowResult,
        duration
      };

      if (
        subWorkflowInstance.status === 'failed' &&
        subWorkflowInstance.errorMessage
      ) {
        result.error = subWorkflowInstance.errorMessage;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  /**
   * 构建子工作流输入参数
   */
  private async buildSubWorkflowInputs(
    subWorkflowNode: any,
    nodeInput: NodeInputData
  ): Promise<Record<string, any>> {
    let inputs: Record<string, any> = {};

    // 应用输入参数映射
    if (subWorkflowNode.inputMapping) {
      for (const [targetKey, sourceExpression] of Object.entries(
        subWorkflowNode.inputMapping
      )) {
        const mappedValue = this.evaluateExpressionFromDatabase(
          sourceExpression as string,
          nodeInput.workflowInputs,
          nodeInput.dependencies
        );
        inputs[targetKey] = mappedValue;
      }
    } else if (subWorkflowNode.inputs) {
      // 使用直接配置的输入参数
      for (const [key, value] of Object.entries(subWorkflowNode.inputs)) {
        if (typeof value === 'string') {
          inputs[key] = this.evaluateExpressionFromDatabase(
            value,
            nodeInput.workflowInputs,
            nodeInput.dependencies
          );
        } else {
          inputs[key] = value;
        }
      }
    } else {
      // 默认传递所有父工作流输入参数
      inputs = { ...nodeInput.workflowInputs };
    }

    return inputs;
  }

  /**
   * 映射数据库记录到工作流定义
   */
  private mapDatabaseToWorkflowDefinition(
    dbRecord: WorkflowDefinitionTable
  ): WorkflowDefinition {
    // 解析JSON定义字段
    const definitionData =
      typeof dbRecord.definition === 'string'
        ? JSON.parse(dbRecord.definition)
        : dbRecord.definition;

    const result: WorkflowDefinition = {
      id: dbRecord.id,
      name: dbRecord.name,
      version: dbRecord.version,
      nodes: definitionData?.nodes || []
    };

    // 只添加非空的可选字段
    if (dbRecord.description) {
      result.description = dbRecord.description;
    }
    if (definitionData?.inputs) {
      result.inputs = definitionData.inputs;
    }
    if (definitionData?.outputs) {
      result.outputs = definitionData.outputs;
    }
    if (definitionData?.config) {
      result.config = definitionData.config;
    }
    if (dbRecord.tags) {
      result.tags = Array.isArray(dbRecord.tags)
        ? dbRecord.tags
        : JSON.parse(dbRecord.tags as string);
    }
    if (dbRecord.category) {
      result.category = dbRecord.category;
    }
    if (dbRecord.created_by) {
      result.createdBy = dbRecord.created_by;
    }
    if (dbRecord.created_at) {
      result.createdAt = dbRecord.created_at;
    }
    if (dbRecord.updated_at) {
      result.updatedAt = dbRecord.updated_at;
    }

    return result;
  }

  /**
   * 创建子工作流实例
   */
  private async createSubWorkflowInstance(
    workflowDefinition: WorkflowDefinition,
    inputs: Record<string, any>,
    parentInstanceId: number,
    parentNodeId: string
  ): Promise<WorkflowInstance> {
    const newInstance: NewWorkflowInstanceTable = {
      workflow_definition_id: workflowDefinition.id!,
      name: `${workflowDefinition.name} - SubWorkflow`,
      external_id: `${parentInstanceId}_${parentNodeId}_${Date.now()}`,
      status: 'pending',
      input_data: inputs,
      output_data: null,
      context_data: {
        parentInstanceId,
        parentNodeId,
        isSubWorkflow: true
      },
      started_at: null,
      completed_at: null,
      paused_at: null,
      error_message: null,
      error_details: null,
      retry_count: 0,
      max_retries: 3,
      priority: 0,
      scheduled_at: new Date(),
      current_node_id: null,
      completed_nodes: null,
      failed_nodes: null,
      lock_owner: null,
      lock_acquired_at: null,
      last_heartbeat: null,
      business_key: null,
      mutex_key: null,
      assigned_engine_id: null,
      assignment_strategy: 'round_robin',
      created_by: null
    };

    const createResult =
      await this.workflowInstanceRepository.create(newInstance);
    if (!createResult.success) {
      throw new Error(
        `Failed to create sub-workflow instance: ${createResult.error}`
      );
    }

    // 转换数据库行为 WorkflowInstance 对象
    const instanceTableRow = createResult.data as WorkflowInstancesTable;
    return mapTableToWorkflowInstance(instanceTableRow);
  }

  /**
   * 获取子工作流执行结果
   */
  private async getSubWorkflowResult(
    subWorkflowInstanceId: number,
    outputMapping?: Record<string, string>
  ): Promise<Record<string, any>> {
    // 获取子工作流实例
    const instanceResult =
      await this.workflowInstanceRepository.findByIdNullable(
        subWorkflowInstanceId
      );
    if (!instanceResult.success || !instanceResult.data) {
      throw new Error(
        `SubWorkflow instance not found: ${subWorkflowInstanceId}`
      );
    }

    const instance = instanceResult.data;
    let result = instance.output_data || {};

    // 如果没有输出映射，返回所有输出数据
    if (!outputMapping) {
      return result;
    }

    // 应用输出参数映射
    const mappedResult: Record<string, any> = {};
    for (const [targetKey, sourceExpression] of Object.entries(outputMapping)) {
      // 构建子工作流的变量上下文
      const subWorkflowVariables = {
        ...instance.input_data,
        ...result
      };

      const mappedValue = this.evaluateExpressionFromDatabase(
        sourceExpression,
        subWorkflowVariables,
        {}
      );
      mappedResult[targetKey] = mappedValue;
    }

    return mappedResult;
  }

  /**
   * 执行任务节点（数据库驱动）
   */
  private async executeTaskNodeWithDatabase(
    context: ExecutionContext,
    node: TaskNodeDefinition,
    nodeInput: NodeInputData
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取执行器
      const executor = context.executorRegistry.getExecutor(node.executor);
      if (!executor) {
        throw new Error(`Executor not found: ${node.executor}`);
      }

      // 准备执行上下文
      const executionContext = {
        taskId: 0, // 临时ID，实际会在保存时更新
        workflowInstanceId: context.instance.id,
        config: nodeInput.config,
        inputs: { ...nodeInput.workflowInputs, ...nodeInput.dependencies },
        context: context.instance.contextData || {},
        logger: this.logger
      };

      // 执行任务
      const result = await executor.execute(executionContext);

      const duration = Date.now() - startTime;

      if (result.success) {
        return {
          success: true,
          data: result.data,
          duration
        };
      } else {
        return {
          success: false,
          error: result.error || 'Task execution failed',
          duration
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  /**
   * 执行循环节点（数据库驱动）
   */
  private async executeLoopNodeWithDatabase(
    context: ExecutionContext,
    node: LoopNodeDefinition,
    nodeInput: NodeInputData
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`开始执行循环节点: ${node.id}`, {
        loopType: node.loopType,
        workflowId: context.instance.id
      });

      let loopResults: any[] = [];

      switch (node.loopType) {
        case 'dynamic':
          loopResults = await this.executeDynamicLoopWithDatabase(
            context,
            node,
            nodeInput
          );
          break;
        case 'forEach':
          loopResults = await this.executeForEachLoopWithDatabase(
            context,
            node,
            nodeInput
          );
          break;
        case 'while':
          loopResults = await this.executeWhileLoopWithDatabase(
            context,
            node,
            nodeInput
          );
          break;
        case 'times':
          loopResults = await this.executeTimesLoopWithDatabase(
            context,
            node,
            nodeInput
          );
          break;
        default:
          throw new Error(`Unsupported loop type: ${node.loopType}`);
      }

      const duration = Date.now() - startTime;

      // 根据 joinType 策略聚合结果
      const finalResults = this.aggregateLoopResults(
        loopResults,
        node.joinType || 'all'
      );

      this.logger.info(`循环节点执行完成: ${node.id}`, {
        totalTasks: loopResults.length,
        successCount: loopResults.filter((r) => r.success).length,
        duration
      });

      return {
        success: true,
        data: {
          results: finalResults,
          totalCount: loopResults.length,
          successCount: loopResults.filter((r) => r.success).length,
          failedCount: loopResults.filter((r) => !r.success).length
        },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`循环节点执行失败: ${node.id}`, {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  /**
   * 执行动态循环（数据库驱动）
   */
  private async executeDynamicLoopWithDatabase(
    context: ExecutionContext,
    node: LoopNodeDefinition,
    nodeInput: NodeInputData
  ): Promise<any[]> {
    // 获取循环源数据
    const sourceData = await this.getLoopSourceDataFromDatabase(
      context.instance.id,
      node,
      nodeInput
    );

    if (!Array.isArray(sourceData) || sourceData.length === 0) {
      this.logger.warn(`动态循环源数据为空: ${node.id}`);
      return [];
    }

    this.logger.info(`动态循环开始，数据项数量: ${sourceData.length}`, {
      nodeId: node.id,
      maxConcurrency: node.maxConcurrency
    });

    // 创建子任务节点记录
    const childTasks = await this.createChildTaskNodes(
      context.instance.id,
      node,
      sourceData
    );

    // 执行并发控制的任务
    const results = await this.executeChildTasksWithConcurrency(
      context,
      node,
      childTasks,
      sourceData,
      node.maxConcurrency || 10
    );

    return results;
  }

  /**
   * 从数据库获取循环源数据
   */
  private async getLoopSourceDataFromDatabase(
    workflowInstanceId: number,
    node: LoopNodeDefinition,
    nodeInput: NodeInputData
  ): Promise<any[]> {
    try {
      // 优先使用 sourceExpression
      if (node.sourceExpression) {
        const sourceValue = this.evaluateExpressionFromDatabase(
          node.sourceExpression,
          nodeInput.workflowInputs,
          nodeInput.dependencies
        );

        if (Array.isArray(sourceValue)) {
          return sourceValue;
        }

        this.logger.warn(
          `Source expression result is not an array: ${node.sourceExpression}, got: ${typeof sourceValue}`
        );
      }

      // 其次使用 sourceNodeId
      if (node.sourceNodeId) {
        const sourceNodeResult =
          await this.workflowTaskNodeRepository.findByNodeId(
            workflowInstanceId,
            node.sourceNodeId
          );

        if (sourceNodeResult.success && sourceNodeResult.data) {
          const nodeOutput = sourceNodeResult.data.output_data;

          if (Array.isArray(nodeOutput)) {
            return nodeOutput;
          }

          // 尝试从节点输出中查找数组字段
          if (nodeOutput && typeof nodeOutput === 'object') {
            for (const [key, value] of Object.entries(nodeOutput)) {
              if (Array.isArray(value)) {
                this.logger.info(
                  `Using array field '${key}' from node ${node.sourceNodeId}`
                );
                return value;
              }
            }
          }
        }
      }

      throw new Error(
        `No valid source data found for dynamic loop: ${node.id}`
      );
    } catch (error) {
      this.logger.error('获取循环源数据失败', {
        nodeId: node.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * 创建子任务节点记录
   */
  private async createChildTaskNodes(
    workflowInstanceId: number,
    parentNode: LoopNodeDefinition,
    sourceData: any[]
  ): Promise<any[]> {
    const childTasks: any[] = [];

    // 获取父节点记录
    const parentTaskResult = await this.workflowTaskNodeRepository.findByNodeId(
      workflowInstanceId,
      parentNode.id
    );

    if (!parentTaskResult.success || !parentTaskResult.data) {
      throw new Error(`Parent node not found: ${parentNode.id}`);
    }

    const parentTaskId = parentTaskResult.data.id;

    // 为每个数据项创建子任务节点
    for (let index = 0; index < sourceData.length; index++) {
      const item = sourceData[index];
      const childNodeKey = `${parentNode.id}_child_${index}`;

      // 检查是否已存在子任务节点
      const existingChildResult =
        await this.workflowTaskNodeRepository.findByNodeId(
          workflowInstanceId,
          childNodeKey
        );

      let childTask;
      if (existingChildResult.success && existingChildResult.data) {
        childTask = existingChildResult.data;
      } else {
        // 创建新的子任务节点
        const newChildTask: NewTaskNode = {
          workflow_instance_id: workflowInstanceId,
          node_id: childNodeKey,
          node_name: `${parentNode.name || parentNode.id} - Item ${index}`,
          node_type: parentNode.taskTemplate?.type || 'task',
          status: 'pending',
          parent_node_id: parentTaskId,
          is_dynamic_task: true,
          dynamic_source_data: JSON.stringify(item),
          input_data: null,
          output_data: null,
          depends_on: null,
          parallel_group_id: `loop_${parentNode.id}`,
          parallel_index: index,
          started_at: null,
          completed_at: null,
          error_message: null,
          error_details: null,
          retry_count: 0,
          max_retries: 3,
          executor: (parentNode.taskTemplate as any)?.executor || null,
          executor_config: (parentNode.taskTemplate as any)?.config || null,
          assigned_engine_id: null,
          assignment_strategy: 'round_robin',
          duration_ms: null
        };

        const createResult =
          await this.workflowTaskNodeRepository.create(newChildTask);
        if (!createResult.success) {
          throw new Error(`Failed to create child task: ${createResult.error}`);
        }
        childTask = createResult.data;
      }

      childTasks.push(childTask);
    }

    return childTasks;
  }

  /**
   * 执行子任务（并发控制）
   */
  private async executeChildTasksWithConcurrency(
    context: ExecutionContext,
    parentNode: LoopNodeDefinition,
    childTasks: any[],
    sourceData: any[],
    maxConcurrency: number
  ): Promise<any[]> {
    const results: any[] = [];
    const semaphore = new Array(maxConcurrency).fill(null);
    let currentIndex = 0;

    const executeTask = async (taskIndex: number): Promise<void> => {
      if (taskIndex >= childTasks.length) return;

      const childTask = childTasks[taskIndex];
      const item = sourceData[taskIndex];

      try {
        // 检查任务是否已完成
        if (childTask.status === 'completed') {
          results[taskIndex] = {
            index: taskIndex,
            success: true,
            input: item,
            output: childTask.output_data,
            taskId: childTask.id
          };
          return;
        }

        // 更新任务状态为运行中
        await this.updateTaskNodeStatus(childTask.id, 'running', {
          started_at: new Date()
        });

        // 构建子任务的输入数据
        const childNodeInput = await this.buildChildTaskInput(
          context.instance.id,
          parentNode,
          item,
          taskIndex
        );

        // 执行子任务
        const taskResult = await this.executeChildTask(
          context,
          parentNode,
          childTask,
          childNodeInput
        );

        // 保存子任务结果
        await this.saveNodeOutput(childTask.id, taskResult);

        results[taskIndex] = {
          index: taskIndex,
          success: taskResult.success,
          input: item,
          output: taskResult.data,
          error: taskResult.error,
          taskId: childTask.id
        };
      } catch (error) {
        this.logger.error(`子任务执行失败: ${childTask.node_key}`, {
          error: error instanceof Error ? error.message : String(error)
        });

        // 更新任务状态为失败
        await this.updateTaskNodeStatus(childTask.id, 'failed', {
          error_message: error instanceof Error ? error.message : String(error),
          completed_at: new Date()
        });

        results[taskIndex] = {
          index: taskIndex,
          success: false,
          input: item,
          error: error instanceof Error ? error.message : String(error),
          taskId: childTask.id
        };

        // 根据错误处理策略决定是否继续
        if (parentNode.errorHandling === 'fail-fast') {
          throw error;
        }
      }
    };

    // 并发执行任务
    const executeNext = async (): Promise<void> => {
      while (currentIndex < childTasks.length) {
        const taskIndex = currentIndex++;
        await executeTask(taskIndex);
      }
    };

    // 启动并发执行
    const workers = semaphore.map(() => executeNext());
    await Promise.all(workers);

    return results;
  }

  /**
   * 构建子任务输入数据
   */
  private async buildChildTaskInput(
    workflowInstanceId: number,
    parentNode: LoopNodeDefinition,
    item: any,
    index: number
  ): Promise<NodeInputData> {
    // 获取工作流输入参数
    const workflowResult =
      await this.workflowInstanceRepository.findByIdNullable(
        workflowInstanceId
      );
    const workflowInputs =
      workflowResult.success && workflowResult.data
        ? workflowResult.data.input_data || {}
        : {};

    // 构建子任务的变量上下文
    const taskVariables = {
      ...workflowInputs,
      $item: item,
      $index: index,
      $parentNodeId: parentNode.id
    };

    // 解析任务模板配置
    const config = parentNode.taskTemplate?.config || {};
    const resolvedConfig = await this.resolveConfigVariablesFromDatabase(
      config,
      taskVariables,
      {}
    );

    return {
      config: resolvedConfig,
      dependencies: {},
      workflowInputs: taskVariables
    };
  }

  /**
   * 执行单个子任务
   *
   * 支持所有节点类型的递归执行，包括：
   * - task: 普通任务节点
   * - loop: 嵌套循环节点
   * - parallel: 并行执行节点
   * - condition: 条件分支节点
   * - subprocess: 子工作流节点
   */
  private async executeChildTask(
    context: ExecutionContext,
    parentNode: LoopNodeDefinition,
    _childTask: any,
    nodeInput: NodeInputData
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 检查任务模板是否存在
      if (!parentNode.taskTemplate) {
        throw new Error(
          `Task template is required for dynamic loop node: ${parentNode.id}`
        );
      }

      this.logger.debug(`执行动态循环子任务`, {
        parentNodeId: parentNode.id,
        childTaskType: parentNode.taskTemplate.type,
        childTaskId: parentNode.taskTemplate.id
      });

      // 使用统一的节点类型执行方法，支持所有节点类型的递归执行
      const result = await this.executeByNodeType(
        context,
        parentNode.taskTemplate,
        nodeInput
      );

      this.logger.debug(`动态循环子任务执行完成`, {
        parentNodeId: parentNode.id,
        childTaskId: parentNode.taskTemplate.id,
        success: result.success,
        duration: Date.now() - startTime
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(`动态循环子任务执行失败`, {
        parentNodeId: parentNode.id,
        childTaskType: parentNode.taskTemplate?.type,
        childTaskId: parentNode.taskTemplate?.id,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  /**
   * 聚合循环结果
   */
  private aggregateLoopResults(results: any[], joinType: string): any[] {
    switch (joinType) {
      case 'all':
        return results; // 返回所有结果
      case 'any':
        return results.filter((r) => r.success); // 返回所有成功的结果
      case 'first':
        const firstSuccess = results.find((r) => r.success);
        return firstSuccess ? [firstSuccess] : []; // 返回第一个成功的结果
      default:
        return results;
    }
  }

  /**
   * 执行 forEach 循环（数据库驱动）
   */
  private async executeForEachLoopWithDatabase(
    context: ExecutionContext,
    node: LoopNodeDefinition,
    nodeInput: NodeInputData
  ): Promise<any[]> {
    // forEach 循环类似于动态循环，但使用 collection 配置
    if (!node.collection) {
      throw new Error(
        `forEach loop requires collection configuration: ${node.id}`
      );
    }

    // 评估集合表达式
    const collectionData = this.evaluateExpressionFromDatabase(
      node.collection,
      nodeInput.workflowInputs,
      nodeInput.dependencies
    );

    if (!Array.isArray(collectionData)) {
      throw new Error(
        `Collection expression must evaluate to an array: ${node.collection}`
      );
    }

    // 使用动态循环的逻辑执行
    const modifiedNode = { ...node, sourceExpression: node.collection };
    return await this.executeDynamicLoopWithDatabase(
      context,
      modifiedNode,
      nodeInput
    );
  }

  /**
   * 执行 while 循环（数据库驱动）
   */
  private async executeWhileLoopWithDatabase(
    context: ExecutionContext,
    node: LoopNodeDefinition,
    nodeInput: NodeInputData
  ): Promise<any[]> {
    if (!node.condition) {
      throw new Error(
        `While loop requires condition configuration: ${node.id}`
      );
    }

    const results: any[] = [];
    let iteration = 0;
    const maxIterations = 1000; // 防止无限循环

    while (iteration < maxIterations) {
      // 评估循环条件
      const conditionResult = this.evaluateExpressionFromDatabase(
        node.condition,
        { ...nodeInput.workflowInputs, $iteration: iteration },
        nodeInput.dependencies
      );

      if (!conditionResult) {
        break;
      }

      // 执行循环体节点
      const iterationResult = await this.executeLoopBodyNodes(
        context,
        node,
        nodeInput,
        iteration
      );

      results.push(iterationResult);
      iteration++;
    }

    if (iteration >= maxIterations) {
      this.logger.warn(`While loop reached maximum iterations: ${node.id}`);
    }

    return results;
  }

  /**
   * 执行 times 循环（数据库驱动）
   */
  private async executeTimesLoopWithDatabase(
    context: ExecutionContext,
    node: LoopNodeDefinition,
    nodeInput: NodeInputData
  ): Promise<any[]> {
    if (!node.times || node.times <= 0) {
      throw new Error(
        `Times loop requires positive times configuration: ${node.id}`
      );
    }

    const results: any[] = [];

    for (let i = 0; i < node.times; i++) {
      // 执行循环体节点
      const iterationResult = await this.executeLoopBodyNodes(
        context,
        node,
        nodeInput,
        i
      );

      results.push(iterationResult);
    }

    return results;
  }

  /**
   * 执行循环体节点
   */
  private async executeLoopBodyNodes(
    context: ExecutionContext,
    parentNode: LoopNodeDefinition,
    nodeInput: NodeInputData,
    iteration: number
  ): Promise<any> {
    const iterationResults: any[] = [];

    // 为循环体中的每个节点创建子任务
    for (const bodyNode of parentNode.nodes) {
      const childNodeKey = `${parentNode.id}_${bodyNode.id}_${iteration}`;

      // 检查是否已存在子任务节点
      const existingChildResult =
        await this.workflowTaskNodeRepository.findByNodeId(
          context.instance.id,
          childNodeKey
        );

      let childTask;
      if (existingChildResult.success && existingChildResult.data) {
        childTask = existingChildResult.data;
      } else {
        // 创建新的子任务节点
        const parentTaskResult =
          await this.workflowTaskNodeRepository.findByNodeId(
            context.instance.id,
            parentNode.id
          );

        if (!parentTaskResult.success || !parentTaskResult.data) {
          throw new Error(`Parent node not found: ${parentNode.id}`);
        }

        const newChildTask: NewTaskNode = {
          workflow_instance_id: context.instance.id,
          node_id: childNodeKey,
          node_name: `${bodyNode.name || bodyNode.id} - Iteration ${iteration}`,
          node_type: bodyNode.type === 'wait' ? 'task' : bodyNode.type,
          status: 'pending',
          parent_node_id: parentTaskResult.data.id,
          is_dynamic_task: true,
          dynamic_source_data: JSON.stringify({ iteration }),
          input_data: null,
          output_data: null,
          depends_on: null,
          parallel_group_id: `loop_${parentNode.id}`,
          parallel_index: iteration,
          started_at: null,
          completed_at: null,
          error_message: null,
          error_details: null,
          retry_count: 0,
          max_retries: 3,
          executor: (bodyNode as any).executor || null,
          executor_config: (bodyNode as any).config || null,
          duration_ms: null,
          assigned_engine_id: null,
          assignment_strategy: null
        };

        const createResult =
          await this.workflowTaskNodeRepository.create(newChildTask);
        if (!createResult.success) {
          throw new Error(`Failed to create child task: ${createResult.error}`);
        }
        childTask = createResult.data;
      }

      // 构建子任务输入
      const childNodeInput = await this.buildLoopBodyNodeInput(
        context.instance.id,
        bodyNode,
        nodeInput,
        iteration
      );

      // 执行子任务
      const taskResult = await this.executeByNodeType(
        context,
        bodyNode,
        childNodeInput
      );

      // 保存子任务结果
      await this.saveNodeOutput(childTask.id, taskResult);

      iterationResults.push({
        nodeId: bodyNode.id,
        success: taskResult.success,
        output: taskResult.data,
        error: taskResult.error
      });
    }

    return {
      iteration,
      success: iterationResults.every((r) => r.success),
      results: iterationResults
    };
  }

  /**
   * 构建循环体节点输入数据
   */
  private async buildLoopBodyNodeInput(
    _workflowInstanceId: number,
    bodyNode: NodeDefinition,
    parentNodeInput: NodeInputData,
    iteration: number
  ): Promise<NodeInputData> {
    // 构建循环体节点的变量上下文
    const loopVariables = {
      ...parentNodeInput.workflowInputs,
      $iteration: iteration,
      $index: iteration
    };

    // 解析节点配置
    const config = (bodyNode as any).config || {};
    const resolvedConfig = await this.resolveConfigVariablesFromDatabase(
      config,
      loopVariables,
      parentNodeInput.dependencies
    );

    return {
      config: resolvedConfig,
      dependencies: parentNodeInput.dependencies,
      workflowInputs: loopVariables
    };
  }

  /**
   * 执行并行节点（数据库驱动）
   */
  private async executeParallelNodeWithDatabase(
    context: ExecutionContext,
    node: NodeDefinition,
    nodeInput: NodeInputData
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`开始执行并行节点: ${node.id}`);

      const parallelNode = node as any; // 临时类型转换
      const branches = parallelNode.branches || [];

      if (branches.length === 0) {
        return {
          success: true,
          data: { results: [] },
          duration: Date.now() - startTime
        };
      }

      // 为每个分支创建并行任务
      const branchPromises = branches.map(
        async (branch: any, branchIndex: number) => {
          return await this.executeParallelBranch(
            context,
            node,
            branch,
            branchIndex,
            nodeInput
          );
        }
      );

      // 等待所有分支完成
      const branchResults = await Promise.all(branchPromises);

      const duration = Date.now() - startTime;
      const successCount = branchResults.filter((r) => r.success).length;

      this.logger.info(`并行节点执行完成: ${node.id}`, {
        totalBranches: branches.length,
        successCount,
        duration
      });

      return {
        success: true,
        data: {
          results: branchResults,
          totalBranches: branches.length,
          successCount,
          failedCount: branches.length - successCount
        },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  /**
   * 执行并行分支
   */
  private async executeParallelBranch(
    context: ExecutionContext,
    parentNode: NodeDefinition,
    branch: any,
    branchIndex: number,
    nodeInput: NodeInputData
  ): Promise<any> {
    try {
      const branchResults: any[] = [];

      // 顺序执行分支内的节点
      for (const branchNode of branch.nodes || []) {
        const childNodeKey = `${parentNode.id}_branch_${branchIndex}_${branchNode.id}`;

        // 检查是否已存在子任务节点
        const existingChildResult =
          await this.workflowTaskNodeRepository.findByNodeId(
            context.instance.id,
            childNodeKey
          );

        let childTask;
        if (existingChildResult.success && existingChildResult.data) {
          childTask = existingChildResult.data;
        } else {
          // 创建新的子任务节点
          const parentTaskResult =
            await this.workflowTaskNodeRepository.findByNodeId(
              context.instance.id,
              parentNode.id
            );

          if (!parentTaskResult.success || !parentTaskResult.data) {
            throw new Error(`Parent node not found: ${parentNode.id}`);
          }

          const newChildTask: NewTaskNode = {
            workflow_instance_id: context.instance.id,
            node_id: childNodeKey,
            node_name: `${branchNode.name || branchNode.id} - Branch ${branchIndex}`,
            node_type: branchNode.type,
            status: 'pending',
            parent_node_id: parentTaskResult.data.id,
            is_dynamic_task: true,
            dynamic_source_data: JSON.stringify({ branchIndex }),
            input_data: null,
            output_data: null,
            depends_on: null,
            parallel_group_id: `parallel_${parentNode.id}`,
            parallel_index: branchIndex,
            started_at: null,
            completed_at: null,
            error_message: null,
            error_details: null,
            retry_count: 0,
            max_retries: 3,
            executor: (branchNode as any).executor || null,
            executor_config: (branchNode as any).config || null,
            duration_ms: null,
            assigned_engine_id: null,
            assignment_strategy: null
          };

          const createResult =
            await this.workflowTaskNodeRepository.create(newChildTask);
          if (!createResult.success) {
            throw new Error(
              `Failed to create child task: ${createResult.error}`
            );
          }
          childTask = createResult.data;
        }

        // 构建分支节点输入
        const branchNodeInput = await this.buildBranchNodeInput(
          context.instance.id,
          branchNode,
          nodeInput,
          branchIndex
        );

        // 执行分支节点
        const taskResult = await this.executeByNodeType(
          context,
          branchNode,
          branchNodeInput
        );

        // 保存分支节点结果
        await this.saveNodeOutput(childTask.id, taskResult);

        branchResults.push({
          nodeId: branchNode.id,
          success: taskResult.success,
          output: taskResult.data,
          error: taskResult.error
        });
      }

      return {
        branchIndex,
        success: branchResults.every((r) => r.success),
        results: branchResults
      };
    } catch (error) {
      return {
        branchIndex,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 构建分支节点输入数据
   */
  private async buildBranchNodeInput(
    _workflowInstanceId: number,
    branchNode: NodeDefinition,
    parentNodeInput: NodeInputData,
    branchIndex: number
  ): Promise<NodeInputData> {
    // 构建分支节点的变量上下文
    const branchVariables = {
      ...parentNodeInput.workflowInputs,
      $branchIndex: branchIndex
    };

    // 解析节点配置
    const config = (branchNode as any).config || {};
    const resolvedConfig = await this.resolveConfigVariablesFromDatabase(
      config,
      branchVariables,
      parentNodeInput.dependencies
    );

    return {
      config: resolvedConfig,
      dependencies: parentNodeInput.dependencies,
      workflowInputs: branchVariables
    };
  }

  /**
   * 执行条件节点（数据库驱动）
   */
  private async executeConditionNodeWithDatabase(
    context: ExecutionContext,
    node: NodeDefinition,
    nodeInput: NodeInputData
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`开始执行条件节点: ${node.id}`);

      const conditionNode = node as any; // 临时类型转换
      const condition = conditionNode.condition;

      if (!condition) {
        throw new Error(
          `Condition node requires condition configuration: ${node.id}`
        );
      }

      // 评估条件
      const conditionResult = this.evaluateExpressionFromDatabase(
        condition,
        nodeInput.workflowInputs,
        nodeInput.dependencies
      );

      this.logger.info(`条件评估结果: ${node.id} = ${conditionResult}`);

      // 根据条件结果选择执行分支
      const branchToExecute = conditionResult
        ? conditionNode.branches?.true
        : conditionNode.branches?.false;

      if (!branchToExecute || branchToExecute.length === 0) {
        const duration = Date.now() - startTime;
        return {
          success: true,
          data: {
            conditionResult,
            branchExecuted: conditionResult ? 'true' : 'false',
            results: []
          },
          duration
        };
      }

      // 执行选中的分支
      const branchResults: any[] = [];
      for (const branchNode of branchToExecute) {
        const childNodeKey = `${node.id}_${conditionResult ? 'true' : 'false'}_${branchNode.id}`;

        // 检查是否已存在子任务节点
        const existingChildResult =
          await this.workflowTaskNodeRepository.findByNodeId(
            context.instance.id,
            childNodeKey
          );

        let childTask;
        if (existingChildResult.success && existingChildResult.data) {
          childTask = existingChildResult.data;
        } else {
          // 创建新的子任务节点
          const parentTaskResult =
            await this.workflowTaskNodeRepository.findByNodeId(
              context.instance.id,
              node.id
            );

          if (!parentTaskResult.success || !parentTaskResult.data) {
            throw new Error(`Parent node not found: ${node.id}`);
          }

          const newChildTask: NewTaskNode = {
            workflow_instance_id: context.instance.id,
            node_id: childNodeKey,
            node_name: `${branchNode.name || branchNode.id} - ${conditionResult ? 'True' : 'False'} Branch`,
            node_type: branchNode.type,
            status: 'pending',
            parent_node_id: parentTaskResult.data.id,
            is_dynamic_task: true,
            dynamic_source_data: JSON.stringify({ conditionResult }),
            input_data: null,
            output_data: null,
            depends_on: null,
            parallel_group_id: `condition_${node.id}`,
            parallel_index: null,
            started_at: null,
            completed_at: null,
            error_message: null,
            error_details: null,
            retry_count: 0,
            max_retries: 3,
            executor: (branchNode as any).executor || null,
            executor_config: (branchNode as any).config || null,
            duration_ms: null,
            assigned_engine_id: null,
            assignment_strategy: null
          };

          const createResult =
            await this.workflowTaskNodeRepository.create(newChildTask);
          if (!createResult.success) {
            throw new Error(
              `Failed to create child task: ${createResult.error}`
            );
          }
          childTask = createResult.data;
        }

        // 构建条件分支节点输入
        const conditionNodeInput = await this.buildConditionNodeInput(
          context.instance.id,
          branchNode,
          nodeInput,
          conditionResult
        );

        // 执行条件分支节点
        const taskResult = await this.executeByNodeType(
          context,
          branchNode,
          conditionNodeInput
        );

        // 保存条件分支节点结果
        await this.saveNodeOutput(childTask.id, taskResult);

        branchResults.push({
          nodeId: branchNode.id,
          success: taskResult.success,
          output: taskResult.data,
          error: taskResult.error
        });
      }

      const duration = Date.now() - startTime;
      const successCount = branchResults.filter((r) => r.success).length;

      this.logger.info(`条件节点执行完成: ${node.id}`, {
        conditionResult,
        branchExecuted: conditionResult ? 'true' : 'false',
        successCount,
        duration
      });

      return {
        success: true,
        data: {
          conditionResult,
          branchExecuted: conditionResult ? 'true' : 'false',
          results: branchResults,
          successCount,
          failedCount: branchResults.length - successCount
        },
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  /**
   * 构建条件分支节点输入数据
   */
  private async buildConditionNodeInput(
    _workflowInstanceId: number,
    branchNode: NodeDefinition,
    parentNodeInput: NodeInputData,
    conditionResult: boolean
  ): Promise<NodeInputData> {
    // 构建条件分支节点的变量上下文
    const conditionVariables = {
      ...parentNodeInput.workflowInputs,
      $conditionResult: conditionResult
    };

    // 解析节点配置
    const config = (branchNode as any).config || {};
    const resolvedConfig = await this.resolveConfigVariablesFromDatabase(
      config,
      conditionVariables,
      parentNodeInput.dependencies
    );

    return {
      config: resolvedConfig,
      dependencies: parentNodeInput.dependencies,
      workflowInputs: conditionVariables
    };
  }

  /**
   * 保存节点输出到数据库
   */
  private async saveNodeOutput(
    taskNodeId: number,
    nodeOutput: NodeExecutionResult
  ): Promise<void> {
    const updateData: any = {
      output_data: nodeOutput.data,
      completed_at: new Date(),
      updated_at: new Date()
    };

    if (nodeOutput.success) {
      updateData.status = 'completed';
    } else {
      updateData.status = 'failed';
      updateData.error_message = nodeOutput.error;
    }

    const updateResult = await this.workflowTaskNodeRepository.updateNullable(
      taskNodeId,
      updateData
    );
    if (!updateResult.success) {
      throw new Error(`Failed to save node output: ${updateResult.error}`);
    }
  }

  /**
   * 数据库驱动的节点执行方法
   */
  private async executeNodeWithDatabaseDriven(
    context: ExecutionContext,
    node: NodeDefinition
  ): Promise<void> {
    this.logger.info(`开始执行节点: ${node.id}`, {
      nodeType: node.type,
      workflowId: context.instance.id
    });

    try {
      // 1. 检查或创建节点记录
      const taskNode = await this.getOrCreateTaskNode(
        context.instance.id,
        node
      );

      // 2. 如果节点已完成，跳过执行
      if (taskNode.status === 'completed') {
        this.logger.info(`节点已完成，跳过执行: ${node.id}`);
        return;
      }

      // 3. 同步检查依赖节点是否全部完成（阻塞等待）
      await this.ensureDependenciesCompleted(
        context.instance.id,
        node.dependsOn
      );

      // 4. 从数据库获取依赖节点的输出作为当前节点的输入
      const nodeInput = await this.buildNodeInputFromDatabase(
        context.instance.id,
        node
      );

      // 5. 根据节点类型执行不同的处理逻辑
      const nodeOutput = await this.executeByNodeType(context, node, nodeInput);

      // 6. 将输出保存到数据库并更新节点状态
      await this.saveNodeOutput(taskNode.id, nodeOutput);

      this.logger.info(`节点执行完成: ${node.id}`);
    } catch (error) {
      this.logger.error(`节点执行失败: ${node.id}`, {
        error: error instanceof Error ? error.message : String(error)
      });

      // 更新节点状态为失败
      const taskNodeResult = await this.workflowTaskNodeRepository.findByNodeId(
        context.instance.id,
        node.id
      );

      if (taskNodeResult.success && taskNodeResult.data) {
        await this.updateTaskNodeStatus(taskNodeResult.data.id, 'failed', {
          error_message: error instanceof Error ? error.message : String(error),
          completed_at: new Date()
        });
      }

      throw error;
    }
  }

  /**
   * 执行工作流
   */
  private async executeWorkflow(context: ExecutionContext): Promise<void> {
    try {
      // 更新状态为运行中
      await this.updateWorkflowInstanceStatus(context.instance.id, 'running', {
        started_at: new Date()
      });

      context.instance.status = 'running';
      context.instance.startedAt = new Date();
      context.instance.updatedAt = new Date();

      // 构建节点依赖关系图
      const nodeGraph = this.buildNodeDependencyGraph(context.definition.nodes);

      // 按拓扑排序执行节点
      const executionOrder = this.topologicalSort(nodeGraph);

      this.logger.info('工作流节点执行顺序', {
        workflowId: context.instance.id,
        executionOrder: executionOrder.map((node) => node.id)
      });

      // 按依赖顺序执行节点
      for (const node of executionOrder) {
        // 检查当前状态，如果不是运行状态则停止执行
        if (context.instance.status !== 'running') {
          break;
        }

        await this.executeNodeWithDatabaseDriven(context, node);
      }

      // 如果没有被暂停或取消，标记为完成
      if (context.instance.status === 'running') {
        await this.updateWorkflowInstanceStatus(
          context.instance.id,
          'completed',
          { completed_at: new Date() }
        );

        context.instance.status = 'completed';
        context.instance.completedAt = new Date();
        context.instance.updatedAt = new Date();

        this.logger.info(`Workflow completed: ${context.instance.id}`);

        // 释放工作流锁
        await this.releaseWorkflowLock(context.instance.id);

        // 释放工作流执行槽位
        const workflowSlotId = this.workflowSlotIds.get(
          context.instance.id.toString()
        );
        if (workflowSlotId) {
          await this.concurrencyControlManager.releaseExecutionSlot(
            workflowSlotId
          );
          this.workflowSlotIds.delete(context.instance.id.toString());
        }
      }
    } catch (error) {
      this.logger.error(
        `Workflow execution failed: ${context.instance.id}`,
        error
      );

      // 使用增强的错误处理器分析错误
      const errorAnalysis = this.errorHandler.analyzeError(error, {
        instanceId: context.instance.id,
        workflowName: context.definition.name,
        retryCount: context.instance.retryCount
      });

      const errorMessage = errorAnalysis.enhancedError.message;

      // 更新状态为失败
      await this.updateWorkflowInstanceStatus(context.instance.id, 'failed', {
        error_message: errorMessage,
        error_details: JSON.stringify({
          ...errorAnalysis.enhancedError,
          originalError: error instanceof Error ? error.message : String(error)
        })
      });

      context.instance.status = 'failed';
      context.instance.errorMessage = errorMessage;
      context.instance.errorDetails = errorAnalysis.enhancedError;
      context.instance.updatedAt = new Date();

      // 检查是否需要重试（使用增强的重试策略）
      if (
        errorAnalysis.shouldRetry &&
        context.instance.retryCount < context.instance.maxRetries
      ) {
        context.instance.retryCount++;
        this.logger.info(
          `Retrying workflow: ${context.instance.id} (attempt ${context.instance.retryCount})`,
          {
            errorType: errorAnalysis.enhancedError.type,
            severity: errorAnalysis.enhancedError.severity,
            retryDelay: errorAnalysis.retryDelay
          }
        );

        // 使用计算出的重试延迟
        setTimeout(() => {
          this.executeWorkflow(context).catch((err) => {
            this.logger.error(
              `Retry failed for workflow: ${context.instance.id}`,
              err
            );
          });
        }, errorAnalysis.retryDelay);
      } else {
        // 不重试或达到最大重试次数，释放锁和槽位
        await this.releaseWorkflowLock(context.instance.id);

        // 释放工作流执行槽位
        const workflowSlotId = this.workflowSlotIds.get(
          context.instance.id.toString()
        );
        if (workflowSlotId) {
          await this.concurrencyControlManager.releaseExecutionSlot(
            workflowSlotId
          );
          this.workflowSlotIds.delete(context.instance.id.toString());
        }

        // 检查是否需要升级
        if (errorAnalysis.escalate) {
          this.logger.error('工作流错误需要升级处理', {
            instanceId: context.instance.id,
            errorType: errorAnalysis.enhancedError.type,
            severity: errorAnalysis.enhancedError.severity,
            retryCount: context.instance.retryCount
          });
        }
      }
    } finally {
      // 清理执行上下文和访问时间记录
      const instanceIdStr = context.instance.id.toString();
      this.executionContexts.delete(instanceIdStr);
      this.contextAccessTimes.delete(instanceIdStr);
      this.workflowSlotIds.delete(instanceIdStr);
    }
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    context: ExecutionContext,
    node: NodeDefinition
  ): Promise<void> {
    this.logger.info(`Executing node: ${node.id} (${node.type})`);

    context.currentNode = node;

    // 检查执行条件
    if (
      node.condition &&
      !this.evaluateCondition(node.condition, context.variables)
    ) {
      this.logger.info(
        `Skipping node ${node.id} due to condition: ${node.condition}`
      );
      return;
    }

    switch (node.type) {
      case 'task':
        await this.executeTaskNode(context, node as TaskNodeDefinition);
        break;
      case 'parallel':
        await this.executeParallelNode(context, node);
        break;
      case 'condition':
        await this.executeConditionNode(context, node);
        break;
      case 'loop':
        await this.executeLoopNode(context, node);
        break;
      default:
        this.logger.warn(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * 执行并行节点
   */
  private async executeParallelNode(
    context: ExecutionContext,
    node: NodeDefinition
  ): Promise<void> {
    this.logger.info(`Executing parallel node: ${node.id}`);

    // 获取并行分支
    const branches = (node as any).branches || [];
    if (branches.length === 0) {
      this.logger.warn(`No branches found for parallel node: ${node.id}`);
      return;
    }

    try {
      // 并行执行所有分支
      const branchPromises = branches.map(
        async (branch: NodeDefinition[], branchIndex: number) => {
          this.logger.info(
            `Starting parallel branch ${branchIndex} for node: ${node.id}`
          );

          // 为每个分支创建独立的变量作用域
          const branchContext = {
            ...context,
            variables: { ...context.variables }
          };

          // 顺序执行分支内的节点
          for (const branchNode of branch) {
            // 检查工作流状态
            if (context.instance.status !== 'running') {
              this.logger.info(
                `Workflow stopped, cancelling branch ${branchIndex}`
              );
              break;
            }

            await this.executeNode(branchContext, branchNode);
          }

          this.logger.info(
            `Completed parallel branch ${branchIndex} for node: ${node.id}`
          );
          return branchContext.variables;
        }
      );

      // 等待所有分支完成
      const branchResults = await Promise.all(branchPromises);

      // 合并分支结果到主上下文
      branchResults.forEach((branchVars, index) => {
        // 将分支结果存储到特定的命名空间
        context.variables[`branches.${node.id}.${index}`] = branchVars;
      });

      this.logger.info(`Parallel node completed: ${node.id}`);
    } catch (error) {
      this.logger.error(`Parallel node execution failed: ${node.id}`, error);
      throw error;
    }
  }

  /**
   * 执行条件节点
   */
  private async executeConditionNode(
    context: ExecutionContext,
    node: NodeDefinition
  ): Promise<void> {
    this.logger.info(`Executing condition node: ${node.id}`);

    const conditionNode = node as any;
    const condition = conditionNode.condition;

    if (!condition) {
      this.logger.warn(`No condition specified for condition node: ${node.id}`);
      return;
    }

    try {
      // 评估条件
      const conditionResult = this.evaluateCondition(
        condition,
        context.variables
      );
      this.logger.info(
        `Condition result for node ${node.id}: ${conditionResult}`
      );

      // 根据条件结果选择执行分支
      const branches = conditionNode.branches;
      const branchToExecute = conditionResult ? branches.true : branches.false;

      if (branchToExecute && Array.isArray(branchToExecute)) {
        this.logger.info(
          `Executing ${conditionResult ? 'true' : 'false'} branch for node: ${node.id}`
        );

        // 顺序执行分支内的节点
        for (const branchNode of branchToExecute) {
          // 检查工作流状态
          if (context.instance.status !== 'running') {
            this.logger.info(
              `Workflow stopped, cancelling condition branch execution`
            );
            break;
          }

          await this.executeNode(context, branchNode);
        }
      } else {
        this.logger.info(
          `No ${conditionResult ? 'true' : 'false'} branch defined for condition node: ${node.id}`
        );
      }

      this.logger.info(`Condition node completed: ${node.id}`);
    } catch (error) {
      this.logger.error(`Condition node execution failed: ${node.id}`, error);
      throw error;
    }
  }

  /**
   * 执行循环节点
   */
  private async executeLoopNode(
    context: ExecutionContext,
    node: NodeDefinition
  ): Promise<void> {
    this.logger.info(`Executing loop node: ${node.id}`);

    const loopNode = node as LoopNodeDefinition;
    const loopType = loopNode.loopType || 'while';
    const maxIterations = (loopNode as any).maxIterations || 1000; // 防止无限循环

    try {
      const iterationResults: any[] = [];

      switch (loopType) {
        case 'dynamic':
          await this.executeDynamicParallelLoop(
            context,
            loopNode,
            iterationResults
          );
          break;

        case 'while':
          await this.executeWhileLoop(
            context,
            loopNode,
            maxIterations,
            iterationResults
          );
          break;

        case 'times':
          await this.executeForLoop(context, loopNode, iterationResults);
          break;

        case 'forEach':
          await this.executeForEachLoop(context, loopNode, iterationResults);
          break;

        default:
          throw new Error(`Unsupported loop type: ${loopType}`);
      }

      // 将循环结果存储到上下文
      context.variables[`loops.${node.id}.results`] = iterationResults;
      context.variables[`loops.${node.id}.count`] = iterationResults.length;

      this.logger.info(
        `Loop node completed: ${node.id}, iterations: ${iterationResults.length}`
      );
    } catch (error) {
      this.logger.error(`Loop node execution failed: ${node.id}`, error);
      throw error;
    }
  }

  /**
   * 执行 while 循环
   */
  private async executeWhileLoop(
    context: ExecutionContext,
    loopNode: any,
    maxIterations: number,
    iterationResults: any[]
  ): Promise<void> {
    let iteration = 0;

    while (iteration < maxIterations) {
      // 检查工作流状态
      if (context.instance.status !== 'running') {
        this.logger.info(`Workflow stopped, breaking while loop`);
        break;
      }

      // 评估循环条件
      const condition = loopNode.condition;
      if (!condition || !this.evaluateCondition(condition, context.variables)) {
        this.logger.info(`While loop condition false, breaking loop`);
        break;
      }

      // 执行循环体
      const iterationContext = {
        ...context,
        variables: {
          ...context.variables,
          $iteration: iteration,
          $loopId: loopNode.id
        }
      };

      await this.executeLoopBody(iterationContext, loopNode.body);
      iterationResults.push(iterationContext.variables);

      iteration++;
    }

    if (iteration >= maxIterations) {
      this.logger.warn(`While loop reached max iterations: ${maxIterations}`);
    }
  }

  /**
   * 执行 for 循环
   */
  private async executeForLoop(
    context: ExecutionContext,
    loopNode: any,
    iterationResults: any[]
  ): Promise<void> {
    const start = loopNode.start || 0;
    const end = loopNode.end || 0;
    const step = loopNode.step || 1;

    for (let i = start; i < end; i += step) {
      // 检查工作流状态
      if (context.instance.status !== 'running') {
        this.logger.info(`Workflow stopped, breaking for loop`);
        break;
      }

      // 执行循环体
      const iterationContext = {
        ...context,
        variables: {
          ...context.variables,
          $iteration: i,
          $loopId: loopNode.id,
          $index: i
        }
      };

      await this.executeLoopBody(iterationContext, loopNode.body);
      iterationResults.push(iterationContext.variables);
    }
  }

  /**
   * 执行 forEach 循环
   */
  private async executeForEachLoop(
    context: ExecutionContext,
    loopNode: any,
    iterationResults: any[]
  ): Promise<void> {
    const arrayPath = loopNode.arrayPath;
    if (!arrayPath) {
      throw new Error(`forEach loop requires arrayPath`);
    }

    // 获取要遍历的数组
    const array = this.getValueFromPath(arrayPath, context.variables);
    if (!Array.isArray(array)) {
      throw new Error(`Value at ${arrayPath} is not an array`);
    }

    for (let index = 0; index < array.length; index++) {
      // 检查工作流状态
      if (context.instance.status !== 'running') {
        this.logger.info(`Workflow stopped, breaking forEach loop`);
        break;
      }

      const item = array[index];

      // 执行循环体
      const iterationContext = {
        ...context,
        variables: {
          ...context.variables,
          $iteration: index,
          $loopId: loopNode.id,
          $index: index,
          $item: item
        }
      };

      await this.executeLoopBody(iterationContext, loopNode.body);
      iterationResults.push(iterationContext.variables);
    }
  }

  /**
   * 执行循环体
   */
  private async executeLoopBody(
    context: ExecutionContext,
    body: NodeDefinition[]
  ): Promise<void> {
    if (!body || !Array.isArray(body)) {
      return;
    }

    for (const bodyNode of body) {
      await this.executeNode(context, bodyNode);
    }
  }

  /**
   * 执行任务节点
   */
  private async executeTaskNode(
    context: ExecutionContext,
    node: TaskNodeDefinition
  ): Promise<void> {
    let taskNodeId: number | null = null;

    try {
      // 1. 创建或获取任务节点记录
      taskNodeId = await this.createOrGetTaskNode(context, node);

      // 2. 更新节点状态为运行中
      await this.updateTaskNodeStatus(taskNodeId, 'running', {
        started_at: new Date()
      });

      // 3. 获取执行器
      const executor = context.executorRegistry.getExecutor(node.executor);
      if (!executor) {
        throw new Error(`Executor not found: ${node.executor}`);
      }

      // 4. 解析配置中的变量
      const resolvedConfig = this.resolveConfigVariables(
        node.config || {},
        context.variables
      );

      // 5. 准备执行上下文
      const executionContext = {
        taskId: taskNodeId,
        workflowInstanceId: context.instance.id,
        config: resolvedConfig,
        inputs: context.variables,
        context: context.instance.contextData || {},
        logger: this.logger
      };

      // 6. 执行任务
      const result = await executor.execute(executionContext);

      if (result.success) {
        // 7. 更新变量
        if (result.data) {
          context.variables[`nodes.${node.id}.output`] = result.data;
        }

        // 8. 保存节点执行结果并标记为完成
        await this.updateTaskNodeStatus(taskNodeId, 'completed', {
          output_data: result.data,
          completed_at: new Date()
        });

        this.logger.info(`Task node completed: ${node.id}`);
      } else {
        // 9. 任务执行失败
        await this.updateTaskNodeStatus(taskNodeId, 'failed', {
          error_message: result.error || 'Task execution failed',
          completed_at: new Date()
        });
        throw new Error(result.error || 'Task execution failed');
      }
    } catch (error) {
      // 10. 处理异常情况
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (taskNodeId) {
        await this.updateTaskNodeStatus(taskNodeId, 'failed', {
          error_message: errorMessage,
          error_details: error,
          completed_at: new Date()
        });
      }

      this.logger.error(`Task node failed: ${node.id}`, error);
      throw error;
    }
  }

  /**
   * 验证工作流定义
   */
  private validateWorkflowDefinition(definition: WorkflowDefinition): void {
    if (!definition.name) {
      throw new Error('Workflow name is required');
    }

    if (!definition.nodes || definition.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // 验证节点ID唯一性
    const nodeIds = new Set<string>();
    for (const node of definition.nodes) {
      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }
  }

  /**
   * 验证输入参数
   */
  private validateInputs(definition: WorkflowDefinition, inputs: any): void {
    if (!definition.inputs) {
      return;
    }

    for (const inputDef of definition.inputs) {
      if (inputDef.required && !(inputDef.name in inputs)) {
        throw new Error(`Required input missing: ${inputDef.name}`);
      }
    }
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(
    condition: string,
    variables: Record<string, any>
  ): boolean {
    try {
      // 简单的条件评估实现
      // 在实际项目中应该使用更安全的表达式引擎
      const func = new Function(
        'variables',
        `with(variables) { return ${condition}; }`
      );
      return Boolean(func(variables));
    } catch (error) {
      this.logger.error(`Condition evaluation failed: ${condition}`, error);
      return false;
    }
  }

  /**
   * 更新工作流实例状态
   */
  private async updateWorkflowInstanceStatus(
    instanceId: number,
    status: WorkflowStatus,
    additionalData?: any
  ): Promise<void> {
    try {
      const updateResult = await this.workflowInstanceRepository.updateStatus(
        instanceId,
        status,
        additionalData
      );

      if (!updateResult.success) {
        this.logger.error(`Failed to update workflow instance status`, {
          instanceId,
          status,
          error: updateResult.error
        });
      } else {
        this.logger.debug(`Updated workflow instance status`, {
          instanceId,
          status,
          additionalData
        });
      }
    } catch (error) {
      this.logger.error(`Error updating workflow instance status`, {
        instanceId,
        status,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 从路径获取值 - 支持点号路径和JSONPath
   */
  private getValueFromPath(path: string, variables: Record<string, any>): any {
    // 如果路径还包含${}，先清理掉
    let cleanPath = path;
    if (path.includes('${') && path.includes('}')) {
      const match = path.match(/^\$\{([^}]+)\}$/);
      if (match) {
        cleanPath = match[1];
        this.logger.debug(`Cleaned path from "${path}" to "${cleanPath}"`);
      }
    }

    try {
      this.logger.debug(`Getting value from path: "${cleanPath}"`, {
        originalPath: path,
        availableVariables: Object.keys(variables),
        variablesContent: variables
      });

      // 检查是否是JSONPath表达式（以$开头）
      if (cleanPath.startsWith('$')) {
        // 简化处理：如果是$开头的路径，暂时返回undefined
        // 后续可以实现简单的JSONPath解析
        this.logger.debug(`JSONPath expression not supported: ${cleanPath}`);
        return undefined;
      }

      // 首先检查是否是简单的变量名（直接存在于variables中）
      if (cleanPath in variables) {
        const value = variables[cleanPath];
        this.logger.debug(
          `Found direct variable "${cleanPath}" = ${JSON.stringify(value)} (type: ${typeof value})`
        );
        return value;
      }

      // 支持点号分隔的路径，如 'user.profile.name'
      const keys = cleanPath.split('.');

      // 如果只有一个键且不在variables中，返回undefined
      if (keys.length === 1) {
        this.logger.debug(
          `Single key "${cleanPath}" not found in variables. Available: ${Object.keys(variables).join(', ')}`
        );
        return undefined;
      }

      // 处理嵌套路径
      let value = variables;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (value && typeof value === 'object' && key in value) {
          value = value[key];
          this.logger.debug(
            `Path step ${i + 1}/${keys.length}: "${key}" -> ${JSON.stringify(value)}`
          );
        } else {
          this.logger.debug(
            `Path step ${i + 1}/${keys.length}: "${key}" not found in ${JSON.stringify(Object.keys(value || {}))}`
          );
          return undefined;
        }
      }

      this.logger.debug(
        `Final nested path result for "${cleanPath}": ${JSON.stringify(value)}`
      );
      return value;
    } catch (error) {
      this.logger.error(
        `Failed to get value from path: ${path} (cleaned: ${cleanPath})`,
        {
          error: error instanceof Error ? error.message : String(error),
          availableVariables: Object.keys(variables)
        }
      );
      return undefined;
    }
  }

  /**
   * 解析配置对象中的变量
   */
  private resolveConfigVariables(
    config: Record<string, any>,
    variables: Record<string, any>
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        // 解析字符串中的变量
        resolved[key] = this.evaluateExpression(value, variables);
      } else if (Array.isArray(value)) {
        // 递归处理数组
        resolved[key] = value.map((item) =>
          typeof item === 'string'
            ? this.evaluateExpression(item, variables)
            : typeof item === 'object' && item !== null
              ? this.resolveConfigVariables(item, variables)
              : item
        );
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        resolved[key] = this.resolveConfigVariables(value, variables);
      } else {
        // 其他类型直接复制
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * 增强的表达式评估器 - 支持变量替换和复杂表达式
   */
  private evaluateExpression(
    expression: string,
    variables: Record<string, any>
  ): any {
    try {
      this.logger.debug(`Evaluating expression: ${expression}`, {
        availableVariables: Object.keys(variables)
      });

      // JSONPath 表达式
      if (expression.startsWith('$')) {
        const result = this.getValueFromPath(expression, variables);
        this.logger.debug(`JSONPath result: ${result}`);
        return result;
      }

      // 模板字符串替换，如 '${nodes.task1.output.userId}'
      if (expression.includes('${')) {
        // 如果整个表达式都是一个模板变量，直接返回原始值类型
        const singleTemplateMatch = expression.match(/^\$\{([^}]+)\}$/);
        if (singleTemplateMatch) {
          const path = singleTemplateMatch[1];
          this.logger.debug(
            `Evaluating single template variable: ${expression} -> path: ${path}`
          );
          const result = this.getValueFromPath(path, variables);
          this.logger.debug(
            `Template result: ${result} (type: ${typeof result})`
          );
          return result;
        }

        // 处理复合模板字符串
        let result = expression;
        const templateRegex = /\$\{([^}]+)\}/g;
        let match;
        const replacements = [];

        while ((match = templateRegex.exec(expression)) !== null) {
          const path = match[1];
          const value = this.getValueFromPath(path, variables);
          replacements.push({ match: match[0], path, value });
        }

        this.logger.debug(`Template replacements:`, replacements);

        for (const replacement of replacements) {
          result = result.replace(
            replacement.match,
            String(replacement.value ?? '')
          );
        }

        this.logger.debug(`Template final result: ${result}`);
        return result;
      }

      // 对于普通字符串（不包含模板变量），直接返回原值
      return expression;
    } catch (error) {
      this.logger.error(`Failed to evaluate expression: ${expression}`, {
        error: error instanceof Error ? error.message : String(error),
        availableVariables: Object.keys(variables)
      });
      return undefined;
    }
  }

  /**
   * 执行动态并行循环
   */
  private async executeDynamicParallelLoop(
    context: ExecutionContext,
    loopNode: LoopNodeDefinition,
    iterationResults: any[]
  ): Promise<void> {
    this.logger.info(`Executing dynamic parallel loop: ${loopNode.id}`);

    // 验证动态并行配置
    if (!loopNode.taskTemplate && !loopNode.subWorkflow) {
      throw new Error(
        `Dynamic parallel loop requires either taskTemplate or subWorkflow: ${loopNode.id}`
      );
    }

    if (loopNode.taskTemplate && loopNode.subWorkflow) {
      throw new Error(
        `Dynamic parallel loop cannot have both taskTemplate and subWorkflow: ${loopNode.id}`
      );
    }

    // 获取源数据
    const sourceData = this.getSourceDataForDynamicLoop(context, loopNode);
    if (!Array.isArray(sourceData)) {
      throw new Error(
        `Dynamic parallel source must be an array, got: ${typeof sourceData}`
      );
    }

    if (sourceData.length === 0) {
      this.logger.info(
        `Dynamic parallel loop has no items to process: ${loopNode.id}`
      );
      return;
    }

    this.logger.info(
      `Dynamic parallel loop processing ${sourceData.length} items: ${loopNode.id}`
    );

    const maxConcurrency = loopNode.maxConcurrency || 10;
    const errorHandling = loopNode.errorHandling || 'fail-fast';
    const joinType = loopNode.joinType || 'all';

    try {
      let results: DynamicParallelResult[];

      if (loopNode.taskTemplate) {
        // 使用任务模板执行
        results = await this.executeParallelTasks(
          context,
          sourceData,
          loopNode.taskTemplate,
          maxConcurrency,
          errorHandling
        );
      } else if (loopNode.subWorkflow) {
        // 使用子工作流执行
        results = await this.executeParallelSubWorkflows(
          context,
          sourceData,
          loopNode.subWorkflow,
          maxConcurrency,
          errorHandling
        );
      } else {
        throw new Error(
          `Invalid dynamic parallel configuration: ${loopNode.id}`
        );
      }

      // 根据汇聚策略处理结果
      const finalResults = this.handleJoinResults(results, joinType);
      iterationResults.push(...finalResults);

      this.logger.info(
        `Dynamic parallel loop completed: ${loopNode.id}, processed: ${sourceData.length}, successful: ${results.filter((r) => r.success).length}`
      );
    } catch (error) {
      this.logger.error(`Dynamic parallel loop failed: ${loopNode.id}`, error);
      throw error;
    }
  }

  /**
   * 获取动态循环的源数据
   */
  private getSourceDataForDynamicLoop(
    context: ExecutionContext,
    loopNode: LoopNodeDefinition
  ): any[] {
    // 优先使用 sourceExpression
    if (loopNode.sourceExpression) {
      const sourceValue = this.evaluateExpression(
        loopNode.sourceExpression,
        context.variables
      );
      if (Array.isArray(sourceValue)) {
        return sourceValue;
      }
      this.logger.warn(
        `Source expression result is not an array: ${loopNode.sourceExpression}, got: ${typeof sourceValue}`
      );
    }

    // 其次使用 sourceNodeId
    if (loopNode.sourceNodeId) {
      const nodeOutput =
        context.variables[`nodes.${loopNode.sourceNodeId}.output`];
      if (Array.isArray(nodeOutput)) {
        return nodeOutput;
      }

      // 尝试从节点输出中查找数组字段
      if (nodeOutput && typeof nodeOutput === 'object') {
        for (const [key, value] of Object.entries(nodeOutput)) {
          if (Array.isArray(value)) {
            this.logger.info(
              `Using array field '${key}' from node ${loopNode.sourceNodeId}`
            );
            return value;
          }
        }
      }

      this.logger.warn(
        `Node output is not an array: ${loopNode.sourceNodeId}, got: ${typeof nodeOutput}`
      );
    }

    throw new Error(
      `No valid source data found for dynamic parallel loop: ${loopNode.id}`
    );
  }

  /**
   * 执行并行任务
   */
  private async executeParallelTasks(
    context: ExecutionContext,
    sourceData: any[],
    taskTemplate: TaskNodeDefinition,
    maxConcurrency: number,
    errorHandling: 'fail-fast' | 'continue' | 'ignore'
  ): Promise<DynamicParallelResult[]> {
    const results: DynamicParallelResult[] = [];
    let currentIndex = 0;

    // 创建任务执行函数
    const executeTask = async (
      item: any,
      index: number
    ): Promise<DynamicParallelResult> => {
      const startTime = new Date();

      try {
        // 创建任务执行上下文（先创建，用于配置解析）
        const taskVariables = {
          ...context.variables,
          $item: item,
          $index: index,
          $dynamicTaskId: `${taskTemplate.id}_dynamic_${index}`
        };

        // 解析任务模板配置中的变量
        const resolvedConfig = this.resolveConfigVariables(
          {
            ...taskTemplate.config,
            dynamicInput: item,
            dynamicIndex: index
          },
          taskVariables
        );

        // 创建动态任务节点
        const dynamicTask: TaskNodeDefinition = {
          ...taskTemplate,
          id: `${taskTemplate.id}_dynamic_${index}`,
          config: resolvedConfig
        };

        // 创建任务执行上下文
        const taskContext = {
          ...context,
          variables: taskVariables
        };

        // 为动态任务创建节点记录（包含并行信息）
        await this.createDynamicTaskNode(context, dynamicTask, index);

        // 执行任务
        await this.executeTaskNode(taskContext, dynamicTask);

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        return {
          index,
          input: item,
          output: (taskContext.variables as any)[
            `nodes.${dynamicTask.id}.output`
          ],
          success: true,
          duration,
          startTime,
          endTime
        };
      } catch (error) {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        return {
          index,
          input: item,
          success: false,
          error: errorMessage,
          duration,
          startTime,
          endTime
        };
      }
    };

    // 并发执行控制
    const executeWithConcurrency = async (): Promise<void> => {
      const promises: Promise<void>[] = [];
      let hasFailures = false;

      for (let i = 0; i < Math.min(maxConcurrency, sourceData.length); i++) {
        promises.push(
          (async () => {
            while (currentIndex < sourceData.length && !hasFailures) {
              // 检查工作流状态
              if (context.instance.status !== 'running') {
                this.logger.info(
                  'Workflow stopped, cancelling dynamic parallel tasks'
                );
                return;
              }

              const taskIndex = currentIndex++;
              if (taskIndex >= sourceData.length) break;

              const item = sourceData[taskIndex];

              try {
                const result = await executeTask(item, taskIndex);
                results[taskIndex] = result;

                // 错误处理策略
                if (!result.success) {
                  this.logger.warn(
                    `Dynamic parallel task ${taskIndex} failed: ${result.error}`
                  );

                  switch (errorHandling) {
                    case 'fail-fast':
                      hasFailures = true;
                      throw new Error(
                        `Task ${taskIndex} failed: ${result.error}`
                      );

                    case 'continue':
                      // 继续执行其他任务，但记录失败
                      this.logger.info(
                        `Continuing execution despite task ${taskIndex} failure`
                      );
                      break;

                    case 'ignore':
                      // 忽略失败，不记录警告
                      break;

                    default:
                      this.logger.warn(
                        `Unknown error handling strategy: ${errorHandling}`
                      );
                  }
                } else {
                  this.logger.debug(
                    `Dynamic parallel task ${taskIndex} completed successfully`
                  );
                }
              } catch (error) {
                // 任务执行过程中的异常
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                this.logger.error(
                  `Exception in dynamic parallel task ${taskIndex}: ${errorMessage}`
                );

                results[taskIndex] = {
                  index: taskIndex,
                  input: item,
                  success: false,
                  error: errorMessage,
                  startTime: new Date(),
                  endTime: new Date()
                };

                if (errorHandling === 'fail-fast') {
                  hasFailures = true;
                  throw error;
                }
              }
            }
          })()
        );
      }

      try {
        await Promise.all(promises);
      } catch (error) {
        if (errorHandling === 'fail-fast') {
          // 对于fail-fast策略，停止所有剩余任务
          this.logger.error(
            'Stopping all dynamic parallel tasks due to failure'
          );
          throw error;
        }
      }
    };

    await executeWithConcurrency();

    // 确保结果数组完整并生成错误报告
    this.ensureCompleteResults(results, sourceData);
    this.logExecutionSummary(results, taskTemplate.id, errorHandling);

    return results;
  }

  /**
   * 确保结果数组完整性
   */
  private ensureCompleteResults(
    results: DynamicParallelResult[],
    sourceData: any[]
  ): void {
    while (results.length < sourceData.length) {
      const missingIndex = results.length;
      results.push({
        index: missingIndex,
        input: sourceData[missingIndex],
        success: false,
        error: 'Task was not executed due to early termination'
      });
    }
  }

  /**
   * 记录执行摘要
   */
  private logExecutionSummary(
    results: DynamicParallelResult[],
    nodeId: string,
    errorHandling: string
  ): void {
    const totalTasks = results.length;
    const successfulTasks = results.filter((r) => r.success).length;
    const failedTasks = totalTasks - successfulTasks;

    const avgDuration =
      results
        .filter((r) => r.duration !== undefined)
        .reduce((sum, r) => sum + (r.duration || 0), 0) / totalTasks;

    this.logger.info(`Dynamic parallel execution summary for ${nodeId}:`, {
      totalTasks,
      successfulTasks,
      failedTasks,
      successRate: `${((successfulTasks / totalTasks) * 100).toFixed(1)}%`,
      averageDuration: `${avgDuration.toFixed(0)}ms`,
      errorHandling
    });

    if (failedTasks > 0) {
      const failedIndexes = results
        .filter((r) => !r.success)
        .map((r) => r.index)
        .slice(0, 10); // 只显示前10个失败的索引

      this.logger.warn(
        `Failed task indexes (showing first 10): ${failedIndexes.join(', ')}`
      );

      if (failedTasks > 10) {
        this.logger.warn(`... and ${failedTasks - 10} more failed tasks`);
      }
    }
  }

  /**
   * 处理汇聚结果
   */
  private handleJoinResults(
    results: DynamicParallelResult[],
    joinType: 'all' | 'any' | 'first'
  ): DynamicParallelResult[] {
    switch (joinType) {
      case 'all':
        return results; // 返回所有结果

      case 'any':
        // 返回所有成功的结果
        return results.filter((r) => r.success);

      case 'first':
        // 返回第一个成功的结果
        const firstSuccess = results.find((r) => r.success);
        return firstSuccess ? [firstSuccess] : [];

      default:
        return results;
    }
  }

  /**
   * 创建或获取任务节点记录
   */
  private async createOrGetTaskNode(
    context: ExecutionContext,
    node: TaskNodeDefinition
  ): Promise<number> {
    try {
      // 首先尝试查找现有节点
      const existingNodeResult =
        await this.workflowTaskNodeRepository.findByNodeId(
          context.instance.id,
          node.id
        );

      if (existingNodeResult.success && existingNodeResult.data) {
        // 节点已存在，返回其ID
        this.logger.debug(`Found existing task node: ${node.id}`, {
          nodeId: existingNodeResult.data.id,
          status: existingNodeResult.data.status
        });
        return existingNodeResult.data.id;
      }

      // 节点不存在，创建新节点
      const newNodeData: NewTaskNode = {
        workflow_instance_id: context.instance.id,
        node_id: node.id,
        node_name: node.name || node.id,
        node_type: 'task',
        executor: node.executor,
        executor_config: node.config || {},
        status: 'pending',
        input_data: context.variables,
        output_data: null,
        parent_node_id: null,
        depends_on: [],
        parallel_group_id: null,
        parallel_index: null,
        is_dynamic_task: false,
        dynamic_source_data: null,
        started_at: null,
        completed_at: null,
        error_message: null,
        error_details: null,
        retry_count: 0,
        max_retries: (node.config?.retries as number) || 3,
        duration_ms: null,
        assigned_engine_id: null,
        assignment_strategy: null
      };

      const createResult =
        await this.workflowTaskNodeRepository.create(newNodeData);
      if (!createResult.success) {
        throw new Error(`Failed to create task node: ${createResult.error}`);
      }

      const nodeId = createResult.data.id;
      this.logger.debug(`Created new task node: ${node.id}`, { nodeId });
      return nodeId;
    } catch (error) {
      this.logger.error(`Failed to create or get task node: ${node.id}`, error);
      throw error;
    }
  }

  /**
   * 更新任务节点状态
   */
  private async updateTaskNodeStatus(
    nodeId: number,
    status:
      | 'pending'
      | 'running'
      | 'completed'
      | 'failed'
      | 'skipped'
      | 'cancelled',
    additionalData?: Partial<TaskNodeUpdate>
  ): Promise<void> {
    try {
      const updateResult = await this.workflowTaskNodeRepository.updateStatus(
        nodeId,
        status,
        additionalData
      );

      if (!updateResult.success) {
        this.logger.error(`Failed to update task node status`, {
          nodeId,
          status,
          error: updateResult.error
        });
      } else {
        this.logger.debug(`Updated task node status`, {
          nodeId,
          status,
          additionalData
        });
      }
    } catch (error) {
      this.logger.error(`Error updating task node status`, {
        nodeId,
        status,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 创建动态任务节点（用于并行任务）
   */
  private async createDynamicTaskNode(
    context: ExecutionContext,
    dynamicTask: TaskNodeDefinition,
    parallelIndex: number,
    parallelGroupId?: string
  ): Promise<number> {
    try {
      // 首先尝试查找现有节点
      const existingNodeResult =
        await this.workflowTaskNodeRepository.findByNodeId(
          context.instance.id,
          dynamicTask.id
        );

      if (existingNodeResult.success && existingNodeResult.data) {
        // 节点已存在，返回其ID
        this.logger.debug(
          `Found existing dynamic task node: ${dynamicTask.id}`,
          {
            nodeId: existingNodeResult.data.id,
            status: existingNodeResult.data.status
          }
        );
        return existingNodeResult.data.id;
      }

      // 节点不存在，创建新的动态节点
      const newNodeData: NewTaskNode = {
        workflow_instance_id: context.instance.id,
        node_id: dynamicTask.id,
        node_name: dynamicTask.name || dynamicTask.id,
        node_type: 'task',
        executor: dynamicTask.executor,
        executor_config: dynamicTask.config || {},
        status: 'pending',
        input_data: context.variables,
        output_data: null,
        parent_node_id: null,
        depends_on: [],
        parallel_group_id: parallelGroupId || `dynamic_${Date.now()}`,
        parallel_index: parallelIndex,
        is_dynamic_task: true,
        dynamic_source_data: context.variables,
        started_at: null,
        completed_at: null,
        error_message: null,
        error_details: null,
        retry_count: 0,
        max_retries: (dynamicTask.config?.retries as number) || 3,
        duration_ms: null,
        assigned_engine_id: null,
        assignment_strategy: null
      };

      const createResult =
        await this.workflowTaskNodeRepository.create(newNodeData);
      if (!createResult.success) {
        throw new Error(
          `Failed to create dynamic task node: ${createResult.error}`
        );
      }

      const nodeId = createResult.data.id;
      this.logger.debug(`Created new dynamic task node: ${dynamicTask.id}`, {
        nodeId,
        parallelIndex,
        parallelGroupId: newNodeData.parallel_group_id
      });
      return nodeId;
    } catch (error) {
      this.logger.error(
        `Failed to create dynamic task node: ${dynamicTask.id}`,
        error
      );
      throw error;
    }
  }

  /**
   * 执行并行子工作流
   */
  private async executeParallelSubWorkflows(
    context: ExecutionContext,
    sourceData: any[],
    subWorkflow: SubWorkflowDefinition,
    maxConcurrency: number,
    errorHandling: 'fail-fast' | 'continue' | 'ignore'
  ): Promise<DynamicParallelResult[]> {
    const results: DynamicParallelResult[] = [];
    let currentIndex = 0;

    // 创建子工作流执行函数
    const executeSubWorkflow = async (
      item: any,
      index: number
    ): Promise<DynamicParallelResult> => {
      const startTime = new Date();

      try {
        // 创建子工作流执行上下文
        const subWorkflowVariables: Record<string, any> = {
          ...context.variables,
          $item: item,
          $index: index,
          $subWorkflowId: `${subWorkflow.name || 'subworkflow'}_${index}`
        };

        // 应用输入参数映射
        if (subWorkflow.inputMapping) {
          for (const [targetKey, sourceExpression] of Object.entries(
            subWorkflow.inputMapping
          )) {
            const mappedValue = this.evaluateExpression(
              sourceExpression as string,
              subWorkflowVariables
            );
            subWorkflowVariables[targetKey] = mappedValue;
          }
        }

        // 创建子工作流执行上下文
        const subWorkflowContext: ExecutionContext = {
          ...context,
          variables: subWorkflowVariables
        };

        // 执行子工作流的所有节点
        await this.executeSubWorkflowNodes(
          subWorkflowContext,
          subWorkflow.nodes
        );

        // 应用输出参数映射
        let outputData: any = subWorkflowContext.variables;
        if (subWorkflow.outputMapping) {
          outputData = {};
          for (const [targetKey, sourceExpression] of Object.entries(
            subWorkflow.outputMapping
          )) {
            const mappedValue = this.evaluateExpression(
              sourceExpression as string,
              subWorkflowContext.variables
            );
            outputData[targetKey] = mappedValue;
          }
        }

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        return {
          index,
          input: item,
          success: true,
          output: outputData,
          duration,
          startTime,
          endTime
        };
      } catch (error) {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.error(`Sub-workflow execution failed for item ${index}`, {
          item,
          error: errorMessage,
          duration
        });

        return {
          index,
          input: item,
          success: false,
          error: errorMessage,
          duration,
          startTime,
          endTime
        };
      }
    };

    // 并发控制执行
    const executeWithConcurrency = async (): Promise<void> => {
      const executing: Promise<void>[] = [];

      for (const item of sourceData) {
        const index = currentIndex++;

        const executePromise = executeSubWorkflow(item, index).then(
          (result) => {
            results[index] = result;

            if (!result.success && errorHandling === 'fail-fast') {
              throw new Error(
                `Sub-workflow failed for item ${index}: ${result.error}`
              );
            }
          }
        );

        executing.push(executePromise);

        // 控制并发数
        if (executing.length >= maxConcurrency) {
          await Promise.race(executing);
          // 移除已完成的Promise
          for (let i = executing.length - 1; i >= 0; i--) {
            if (
              (await Promise.race([
                executing[i],
                Promise.resolve('pending')
              ])) !== 'pending'
            ) {
              executing.splice(i, 1);
            }
          }
        }
      }

      // 等待所有剩余任务完成
      await Promise.all(executing);
    };

    await executeWithConcurrency();

    // 确保结果数组完整并生成错误报告
    this.ensureCompleteResults(results, sourceData);
    this.logExecutionSummary(
      results,
      subWorkflow.name || 'subworkflow',
      errorHandling
    );

    return results;
  }

  /**
   * 执行子工作流节点（支持多个并行循环）
   */
  private async executeSubWorkflowNodes(
    context: ExecutionContext,
    nodes: NodeDefinition[]
  ): Promise<void> {
    // 构建节点依赖图和分析并行执行能力
    const nodeMap = new Map<string, NodeDefinition>();
    const dependencyMap = new Map<string, string[]>();
    const reverseDependencyMap = new Map<string, string[]>();
    const completedNodes = new Set<string>();
    const runningNodes = new Set<string>();

    // 初始化节点映射和依赖关系
    for (const node of nodes) {
      nodeMap.set(node.id, node);
      const dependencies = node.dependsOn || [];
      dependencyMap.set(node.id, dependencies);

      // 构建反向依赖映射
      for (const depId of dependencies) {
        if (!reverseDependencyMap.has(depId)) {
          reverseDependencyMap.set(depId, []);
        }
        reverseDependencyMap.get(depId)!.push(node.id);
      }
    }

    // 获取可以立即执行的节点（无依赖的节点）
    const getReadyNodes = (): string[] => {
      const readyNodes: string[] = [];
      for (const [nodeId, dependencies] of dependencyMap.entries()) {
        if (
          !completedNodes.has(nodeId) &&
          !runningNodes.has(nodeId) &&
          dependencies.every((depId) => completedNodes.has(depId))
        ) {
          readyNodes.push(nodeId);
        }
      }
      return readyNodes;
    };

    // 执行单个节点
    const executeNode = async (nodeId: string): Promise<void> => {
      const node = nodeMap.get(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      runningNodes.add(nodeId);

      try {
        this.logger.debug(`Starting sub-workflow node: ${nodeId}`, {
          nodeType: node.type,
          dependencies: dependencyMap.get(nodeId)
        });

        // 执行当前节点
        await this.executeNode(context, node);

        this.logger.debug(`Completed sub-workflow node: ${nodeId}`);
      } catch (error) {
        this.logger.error(`Sub-workflow node failed: ${nodeId}`, error);
        throw error;
      } finally {
        runningNodes.delete(nodeId);
        completedNodes.add(nodeId);
      }
    };

    // 并行执行引擎
    const executeParallelNodes = async (): Promise<void> => {
      const maxConcurrency = 10; // 子工作流内部最大并发数
      const executing: Promise<void>[] = [];

      while (completedNodes.size < nodes.length) {
        // 获取当前可以执行的节点
        const readyNodes = getReadyNodes();

        if (readyNodes.length === 0 && executing.length === 0) {
          // 检查是否存在循环依赖
          const remainingNodes = nodes
            .filter((node) => !completedNodes.has(node.id))
            .map((node) => node.id);

          if (remainingNodes.length > 0) {
            throw new Error(
              `Circular dependency detected or unresolvable dependencies in sub-workflow. Remaining nodes: ${remainingNodes.join(', ')}`
            );
          }
          break;
        }

        // 启动新的节点执行
        for (const nodeId of readyNodes) {
          if (executing.length < maxConcurrency) {
            const executePromise = executeNode(nodeId);
            executing.push(executePromise);
          } else {
            break; // 达到并发限制
          }
        }

        // 等待至少一个节点完成
        if (executing.length > 0) {
          await Promise.race(executing);

          // 移除已完成的Promise
          for (let i = executing.length - 1; i >= 0; i--) {
            try {
              const result = await Promise.race([
                executing[i],
                Promise.resolve('pending')
              ]);
              if (result !== 'pending') {
                executing.splice(i, 1);
              }
            } catch (error) {
              // 移除失败的Promise
              executing.splice(i, 1);
              throw error;
            }
          }
        }
      }

      // 等待所有剩余任务完成
      if (executing.length > 0) {
        await Promise.all(executing);
      }
    };

    // 开始并行执行
    await executeParallelNodes();

    this.logger.info(`Sub-workflow completed: ${nodes.length} nodes executed`, {
      completedNodes: Array.from(completedNodes),
      totalDuration: Date.now()
    });
  }

  /**
   * 从数据库恢复节点结果
   * @deprecated 暂未使用，为未来断点续传功能预留
   */
  // @ts-ignore - 为未来断点续传功能预留
  private async loadNodeResults(context: ExecutionContext): Promise<void> {
    try {
      const nodesResult =
        await this.workflowTaskNodeRepository.findByWorkflowInstanceId(
          context.instance.id
        );

      if (nodesResult.success && nodesResult.data) {
        for (const node of nodesResult.data) {
          if (node.status === 'completed' && node.output_data) {
            // 恢复节点输出到变量中
            context.variables[`nodes.${node.node_id}.output`] =
              node.output_data;
            this.logger.debug(`Node result loaded: ${node.node_id}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to load node results', error);
    }
  }

  /**
   * 释放工作流锁
   */
  private async releaseWorkflowLock(instanceId: number): Promise<void> {
    if (!this.distributedLockManager) {
      return;
    }

    try {
      const lockKey = `workflow:${instanceId}`;

      // 禁用自动续期
      await this.distributedLockManager.disableAutoRenewal(
        lockKey,
        this.instanceId
      );

      // 释放锁
      const released = await this.distributedLockManager.releaseLock(
        lockKey,
        this.instanceId
      );

      if (released) {
        this.logger.info('工作流锁释放成功', {
          instanceId,
          lockKey,
          owner: this.instanceId
        });
      } else {
        this.logger.warn('工作流锁释放失败，可能锁已过期或不属于当前实例', {
          instanceId,
          lockKey,
          owner: this.instanceId
        });
      }
    } catch (error) {
      this.logger.error('释放工作流锁异常', {
        instanceId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 启动内存清理定时器
   */
  private startMemoryCleanup(): void {
    this.memoryCleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.memoryCleanupInterval);

    this.logger.debug('内存清理定时器已启动', {
      interval: this.memoryCleanupInterval,
      maxIdleTime: this.contextMaxIdleTime
    });
  }

  /**
   * 停止内存清理定时器
   */
  private stopMemoryCleanup(): void {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
      this.memoryCleanupTimer = undefined;
      this.logger.debug('内存清理定时器已停止');
    }
  }

  /**
   * 执行内存清理
   */
  private async performMemoryCleanup(): Promise<void> {
    try {
      const now = new Date();
      const cleanupCandidates: string[] = [];

      // 查找超过最大空闲时间的上下文
      for (const [
        instanceId,
        lastAccessTime
      ] of this.contextAccessTimes.entries()) {
        const idleTime = now.getTime() - lastAccessTime.getTime();

        if (idleTime > this.contextMaxIdleTime) {
          // 检查工作流状态，只清理已完成、失败或取消的工作流
          const context = this.executionContexts.get(instanceId);
          if (context && this.isWorkflowInFinalState(context.instance.status)) {
            cleanupCandidates.push(instanceId);
          }
        }
      }

      // 执行清理
      for (const instanceId of cleanupCandidates) {
        const context = this.executionContexts.get(instanceId);
        if (context) {
          // 释放工作流锁
          await this.releaseWorkflowLock(context.instance.id);

          // 清理上下文
          this.executionContexts.delete(instanceId);
          this.contextAccessTimes.delete(instanceId);

          this.logger.info('清理空闲工作流上下文', {
            instanceId,
            status: context.instance.status,
            lastAccess: this.contextAccessTimes.get(instanceId)
          });
        }
      }

      // 记录内存使用情况
      if (cleanupCandidates.length > 0) {
        this.logger.info('内存清理完成', {
          cleanedCount: cleanupCandidates.length,
          remainingContexts: this.executionContexts.size,
          memoryUsage: process.memoryUsage()
        });
      }
    } catch (error) {
      this.logger.error('内存清理异常', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 检查工作流是否处于最终状态
   */
  private isWorkflowInFinalState(status: WorkflowStatus): boolean {
    return ['completed', 'failed', 'cancelled', 'timeout'].includes(status);
  }
}
