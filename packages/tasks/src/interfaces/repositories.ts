/**
 * 仓储层接口定义
 *
 * 基于接口倒置原则设计的仓储层接口
 * 版本: v3.0.0-refactored
 */

import type { DatabaseResult } from '@stratix/database';
import type {
  PaginatedResult,
  PaginationOptions,
  QueryOptions,
  UnifiedWorkflowInstanceFilters,
  WorkflowInstanceQueryOptions,
  WorkflowInstanceStatus
} from '../types/business.js';
import type {
  NewWorkflowDefinitionTable,
  NewWorkflowExecutionLog,
  NewWorkflowInstanceTable,
  NewWorkflowNodeInstance,
  WorkflowDefinitionTable,
  WorkflowDefinitionTableUpdate,
  WorkflowExecutionLock,
  WorkflowExecutionLog,
  WorkflowInstanceTable,
  WorkflowInstanceTableUpdate,
  WorkflowNodeInstance,
  WorkflowNodeInstanceUpdate
} from '../types/database.js';
import type { NodeInstanceStatus } from '../types/unified-node.js';

/**
 * 工作流定义仓储接口
 */
export interface IWorkflowDefinitionRepository {
  /**
   * 根据ID查找工作流定义
   */
  findById(id: number): Promise<DatabaseResult<WorkflowDefinitionTable | null>>;

  /**
   * 根据名称和版本查找工作流定义
   */
  findByNameAndVersion(
    name: string,
    version: string
  ): Promise<DatabaseResult<WorkflowDefinitionTable>>;

  /**
   * 查找活跃的工作流定义
   */
  findActiveByName(
    name: string
  ): Promise<DatabaseResult<WorkflowDefinitionTable>>;

  /**
   * 创建工作流定义
   */
  create(
    definition: NewWorkflowDefinitionTable
  ): Promise<DatabaseResult<WorkflowDefinitionTable>>;

  /**
   * 更新工作流定义
   */
  update(
    id: number,
    updates: WorkflowDefinitionTableUpdate
  ): Promise<DatabaseResult<WorkflowDefinitionTable | null>>;

  /**
   * 删除工作流定义
   */
  delete(id: number): Promise<DatabaseResult<boolean>>;

  /**
   * 查询工作流定义列表
   */
  findMany(
    filters?: {
      status?: string;
      category?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<PaginatedResult<WorkflowDefinitionTable>>>;
}

/**
 * 工作流实例仓储接口
 */
export interface IWorkflowInstanceRepository {
  /**
   * 根据ID查找工作流实例（可为null）
   */
  findByIdNullable(
    id: number
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>>;

  /**
   * 根据外部ID查找工作流实例
   */
  findByExternalId(
    externalId: string
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>>;

  /**
   * 根据工作流定义ID查找实例
   */
  findByWorkflowDefinitionId(
    workflowDefinitionId: number,
    options?: WorkflowInstanceQueryOptions
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 根据状态查找工作流实例
   */
  findByStatus(
    status: WorkflowInstanceStatus | WorkflowInstanceStatus[],
    options?: WorkflowInstanceQueryOptions
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 查找需要调度的工作流实例
   */
  findScheduledInstances(
    limit?: number
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 查找中断的工作流实例
   */
  findInterruptedInstances(options?: {
    heartbeatTimeout?: Date;
    statuses?: WorkflowInstanceStatus[];
    limit?: number;
  }): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 根据业务键查找工作流实例
   */
  findByBusinessKey(
    businessKey: string
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>>;

  /**
   * 根据互斥键查找工作流实例
   */
  findByMutexKey(
    mutexKey: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 根据互斥键模式查找工作流实例
   */
  findByMutexKeyPattern(
    mutexKeyPattern: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 根据分配的引擎ID查找工作流实例
   */
  findByAssignedEngine(
    engineId: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 查找需要心跳检查的工作流实例
   */
  findStaleInstances(
    timeoutMinutes: number
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 查找长时间运行的工作流实例
   */
  findLongRunningInstances(
    thresholdMinutes: number,
    options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 检查实例锁 - 根据实例类型检查是否有运行中或中断的实例
   */
  checkInstanceLock(
    instanceType: string,
    excludeStatuses?: string[]
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 检查业务实例锁 - 根据业务键检查是否有已执行的实例
   */
  checkBusinessInstanceLock(
    businessKey: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 基于工作流名称的实例锁检查
   */
  checkInstanceLockByWorkflowName(
    workflowName: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>>;

  /**
   * 使用统一过滤器查找工作流实例
   */
  findWithFilters(
    filters: UnifiedWorkflowInstanceFilters
  ): Promise<DatabaseResult<PaginatedResult<WorkflowInstanceTable>>>;

  /**
   * 创建工作流实例
   */
  create(
    instance: NewWorkflowInstanceTable
  ): Promise<DatabaseResult<WorkflowInstanceTable>>;

  /**
   * 更新工作流实例
   */
  updateWorkflowInstance(
    id: number,
    updates: WorkflowInstanceTableUpdate
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>>;

  /**
   * 删除工作流实例
   */
  deleteWorkflowInstance(id: number): Promise<DatabaseResult<boolean>>;

  /**
   * 更新工作流状态
   */
  updateStatus(
    id: number,
    status: WorkflowInstanceStatus,
    additionalData?: Partial<WorkflowInstanceTableUpdate>
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>>;

  /**
   * 批量更新状态
   */
  batchUpdateStatus(
    ids: number[],
    status: WorkflowInstanceStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 更新当前节点
   */
  updateCurrentNode(
    id: number,
    nodeId: string,
    checkpointData?: any
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 获取统计信息
   */
  getStatistics(): Promise<
    DatabaseResult<{
      totalCount: number;
      runningCount: number;
      completedCount: number;
      failedCount: number;
      pausedCount: number;
    }>
  >;
}

/**
 * 节点实例仓储接口
 */
export interface INodeInstanceRepository {
  /**
   * 根据ID查找节点实例
   */
  findById(id: number): Promise<DatabaseResult<WorkflowNodeInstance | null>>;

  /**
   * 根据工作流实例ID和节点ID查找节点实例
   * 返回null表示节点不存在，这是正常情况
   */
  findByWorkflowAndNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowNodeInstance | null>>;

  /**
   * 创建节点实例
   */
  create(
    nodeInstance: NewWorkflowNodeInstance
  ): Promise<DatabaseResult<WorkflowNodeInstance>>;

  /**
   * 批量创建节点实例
   */
  createMany(
    nodeInstances: NewWorkflowNodeInstance[]
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>>;

  /**
   * 更新节点实例
   */
  updateNodeInstance(
    id: number,
    updates: WorkflowNodeInstanceUpdate
  ): Promise<DatabaseResult<WorkflowNodeInstance | null>>;

  /**
   * 删除节点实例
   */
  delete(id: number): Promise<DatabaseResult<boolean>>;

  /**
   * 查找工作流实例的所有节点实例
   */
  findByWorkflowInstanceId(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>>;

  /**
   * 查找父节点的所有子节点实例
   */
  findChildNodes(
    parentNodeId: number
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>>;

  /**
   * 查找未执行的子节点实例
   */
  findPendingChildNodes(
    parentNodeId: number
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>>;

  /**
   * 更新节点状态
   */
  updateStatus(
    id: number,
    status: NodeInstanceStatus,
    errorMessage?: string,
    errorDetails?: any
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 更新循环进度
   */
  updateLoopProgress(
    id: number,
    progress: any,
    completedCount: number
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 事务支持方法
   */

  /**
   * 根据状态查找节点实例
   */
  findByStatus(
    workflowInstanceId: number,
    status: NodeInstanceStatus | NodeInstanceStatus[]
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>>;
}

/**
 * 执行锁仓储接口
 */
export interface IExecutionLockRepository {
  /**
   * 尝试获取锁
   */
  acquireLock(
    lockKey: string,
    owner: string,
    expiresAt: Date,
    lockType?: 'workflow' | 'instance',
    lockData?: any
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 释放锁
   */
  releaseLock(lockKey: string, owner: string): Promise<DatabaseResult<boolean>>;

  /**
   * 续期锁
   */
  renewLock(
    lockKey: string,
    owner: string,
    expiresAt: Date
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 检查锁是否存在
   */
  checkLock(
    lockKey: string
  ): Promise<DatabaseResult<WorkflowExecutionLock | null>>;

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): Promise<DatabaseResult<number>>;

  /**
   * 强制释放锁
   */
  forceReleaseLock(lockKey: string): Promise<DatabaseResult<boolean>>;

  /**
   * 根据所有者获取锁列表
   */
  getLocksByOwner(
    owner: string
  ): Promise<DatabaseResult<WorkflowExecutionLock[]>>;

  /**
   * 释放指定所有者的所有锁
   */
  releaseAllLocksByOwner(owner: string): Promise<DatabaseResult<number>>;

  /**
   * 检查锁是否被指定所有者持有
   */
  isLockOwnedBy(
    lockKey: string,
    owner: string
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 获取所有活跃锁
   */
  getActiveLocks(): Promise<DatabaseResult<WorkflowExecutionLock[]>>;
}

/**
 * 执行日志仓储接口
 */
export interface IExecutionLogRepository {
  /**
   * 创建执行日志
   */
  create(
    log: NewWorkflowExecutionLog
  ): Promise<DatabaseResult<WorkflowExecutionLog>>;

  /**
   * 批量创建执行日志
   */
  createMany(
    logs: NewWorkflowExecutionLog[]
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 根据工作流实例ID查找日志
   */
  findByWorkflowInstanceId(
    workflowInstanceId: number,
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 根据节点实例ID查找日志
   */
  findByNodeInstanceId(
    nodeInstanceId: number,
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 根据日志级别查找日志
   */
  findByLevel(
    level: 'debug' | 'info' | 'warn' | 'error',
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 根据ID查找日志
   */
  findLogById(id: number): Promise<DatabaseResult<WorkflowExecutionLog>>;

  /**
   * 查找所有日志
   */
  findAllLogs(
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 获取日志统计信息
   */
  getLogStats(): Promise<
    DatabaseResult<{
      total: number;
      byLevel: Record<string, number>;
      recentCount: number;
    }>
  >;

  /**
   * 删除过期日志
   */
  deleteExpiredLogs(beforeDate: Date): Promise<DatabaseResult<number>>;
}
