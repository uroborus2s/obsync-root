/**
 * 工作流相关类型定义
 */

import type { Schema } from 'ajv';

/**
 * 工作流状态枚举
 */
export type WorkflowStatus =
  | 'pending' // 等待执行
  | 'running' // 正在执行
  | 'paused' // 已暂停
  | 'completed' // 已完成
  | 'failed' // 执行失败
  | 'cancelled' // 已取消
  | 'timeout'; // 执行超时

/**
 * 错误类型分类
 */
export type ErrorType =
  | 'NETWORK_ERROR' // 网络错误
  | 'TIMEOUT_ERROR' // 超时错误
  | 'VALIDATION_ERROR' // 验证错误
  | 'RESOURCE_ERROR' // 资源错误（内存、磁盘等）
  | 'DEPENDENCY_ERROR' // 依赖服务错误
  | 'BUSINESS_ERROR' // 业务逻辑错误
  | 'SYSTEM_ERROR' // 系统错误
  | 'UNKNOWN_ERROR'; // 未知错误

/**
 * 错误严重程度
 */
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * 重试策略类型
 */
export type RetryStrategy =
  | 'EXPONENTIAL_BACKOFF' // 指数退避
  | 'LINEAR_BACKOFF' // 线性退避
  | 'FIXED_INTERVAL' // 固定间隔
  | 'IMMEDIATE' // 立即重试
  | 'NO_RETRY'; // 不重试

/**
 * 增强的错误信息
 */
export interface EnhancedError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
  retryStrategy?: RetryStrategy;
  maxRetries?: number;
  context?: Record<string, any>;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  strategy: RetryStrategy;
  maxRetries: number;
  baseDelay: number; // 基础延迟（毫秒）
  maxDelay: number; // 最大延迟（毫秒）
  multiplier: number; // 退避倍数
  jitter: boolean; // 是否添加随机抖动
}

/**
 * 错误处理策略
 */
export interface ErrorHandlingStrategy {
  errorType: ErrorType;
  retryConfig: RetryConfig;
  escalationThreshold: number; // 升级阈值
  notificationEnabled: boolean; // 是否启用通知
}

/**
 * 节点类型枚举
 */
export type NodeType =
  | 'task' // 任务节点
  | 'parallel' // 并行节点
  | 'condition' // 条件节点
  | 'loop' // 循环节点
  | 'subprocess' // 子流程节点
  | 'wait' // 等待节点
  | 'webhook' // Webhook节点
  | 'timer'; // 定时器节点

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  /** 数据库ID（从数据库获取时存在） */
  id?: number;
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 版本号 */
  version: string;
  /** 输入参数定义 */
  inputs?: InputDefinition[];
  /** 输出参数定义 */
  outputs?: OutputDefinition[];
  /** 流程节点 */
  nodes: NodeDefinition[];
  /** 工作流配置 */
  config?: WorkflowConfig;
  /** 标签 */
  tags?: string[];
  /** 分类 */
  category?: string;
  /** 创建者 */
  createdBy?: string;
  /** 创建时间 */
  createdAt?: Date;
  /** 更新时间 */
  updatedAt?: Date;
}

/**
 * 输入参数定义
 */
export interface InputDefinition {
  /** 参数名称 */
  name: string;
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  default?: any;
  /** 验证规则 */
  validation?: string;
  /** 枚举值 */
  enum?: any[];
  /** 参数描述 */
  description?: string;
  /** JSON Schema */
  schema?: Schema;
}

/**
 * 输出参数定义
 */
export interface OutputDefinition {
  /** 参数名称 */
  name: string;
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 参数描述 */
  description?: string;
  /** 数据源表达式 */
  source: string;
}

/**
 * 节点定义基类
 */
export interface BaseNodeDefinition {
  /** 节点类型 */
  type: NodeType;
  /** 节点ID */
  id: string;
  /** 节点名称 */
  name: string;
  /** 节点描述 */
  description?: string;
  /** 依赖的节点ID */
  dependsOn?: string[];
  /** 执行条件表达式 */
  condition?: string;
  /** 超时时间 */
  timeout?: string;
  /** 重试配置 */
  retry?: RetryConfig;
  subNodeDefinition?: BaseNodeDefinition[];
}

/**
 * 任务节点定义
 */
export interface TaskNodeDefinition extends BaseNodeDefinition {
  type: 'task';
  /** 执行器名称 */
  executor: string;
  /** 执行器配置 */
  config: Record<string, any>;
}

/**
 * 并行节点定义
 */
export interface ParallelNodeDefinition extends BaseNodeDefinition {
  type: 'parallel';
  /** 并行分支 */
  branches: ParallelBranch[];
  /** 汇聚类型 */
  joinType: 'all' | 'any' | 'first';
  /** 最大并发数 */
  maxConcurrency?: number;
}

/**
 * 条件节点定义
 */
export interface ConditionNodeDefinition extends BaseNodeDefinition {
  type: 'condition';
  /** 条件表达式 */
  condition: string;
  /** 分支定义 */
  branches: {
    true: NodeDefinition[];
    false?: NodeDefinition[];
  };
}

/**
 * 子工作流定义
 */
export interface SubWorkflowDefinition {
  /** 子工作流名称 */
  name?: string;
  /** 子工作流描述 */
  description?: string;
  /** 子工作流节点 */
  nodes: NodeDefinition[];
  /** 子工作流配置 */
  config?: WorkflowConfig;
  /** 输入参数映射 */
  inputMapping?: Record<string, string>;
  /** 输出参数映射 */
  outputMapping?: Record<string, string>;
}

/**
 * 循环节点定义
 */
export interface LoopNodeDefinition extends BaseNodeDefinition {
  type: 'loop';
  /** 循环类型 */
  loopType: 'forEach' | 'while' | 'times' | 'dynamic';
  /** 集合表达式（forEach） */
  collection?: string;
  /** 条件表达式（while） */
  condition?: string;
  /** 循环次数（times） */
  times?: number;
  /** 项变量名 */
  itemVariable?: string;
  /** 索引变量名 */
  indexVariable?: string;
  /** 循环体节点 (dynamic类型时可为空数组) */
  nodes: NodeDefinition[];
  /** 是否并行执行 */
  parallel?: boolean;
  /** 最大并发数 */
  maxConcurrency?: number;

  // 动态并行配置
  /** 动态数据源表达式 (用于 dynamic 类型) */
  sourceExpression?: string;
  /** 源任务节点ID (用于 dynamic 类型) */
  sourceNodeId?: string;
  /** 动态并行任务模板 (用于 dynamic 类型，与 subWorkflow 互斥) */
  taskTemplate?: TaskNodeDefinition;
  /** 动态并行子工作流定义 (用于 dynamic 类型，与 taskTemplate 互斥) */
  subWorkflow?: SubWorkflowDefinition;
  /** 动态并行的汇聚策略 */
  joinType?: 'all' | 'any' | 'first';
  /** 单个动态任务失败时的处理策略 */
  errorHandling?: 'fail-fast' | 'continue' | 'ignore';
}

/**
 * 子流程节点定义
 */
export interface SubprocessNodeDefinition extends BaseNodeDefinition {
  type: 'subprocess';
  /** 工作流名称 */
  workflowName: string;
  /** 工作流版本 */
  version?: string;
  /** 输入参数 */
  inputs: Record<string, any>;
  /** 是否等待完成 */
  waitForCompletion?: boolean;
}

/**
 * 等待节点定义
 */
export interface WaitNodeDefinition extends BaseNodeDefinition {
  type: 'wait';
  /** 等待类型 */
  waitType: 'event' | 'time' | 'condition';
  /** 事件名称 */
  event?: string;
  /** 等待时长 */
  duration?: string;
  /** 条件表达式 */
  condition?: string;
  /** 超时动作 */
  timeoutAction?: 'fail' | 'continue' | 'retry';
}

/**
 * 节点定义联合类型
 */
export type NodeDefinition =
  | TaskNodeDefinition
  | ParallelNodeDefinition
  | ConditionNodeDefinition
  | LoopNodeDefinition
  | SubprocessNodeDefinition
  | WaitNodeDefinition;

/**
 * 并行分支
 */
export interface ParallelBranch {
  /** 分支ID */
  id: string;
  /** 分支名称 */
  name?: string;
  /** 分支节点 */
  nodes: NodeDefinition[];
}

/**
 * 工作流重试配置（用于工作流定义）
 */
export interface WorkflowRetryConfig {
  /** 最大重试次数 */
  maxAttempts: number;
  /** 退避策略 */
  backoff: 'fixed' | 'linear' | 'exponential';
  /** 延迟时间 */
  delay?: string;
  /** 最大延迟时间 */
  maxDelay?: string;
  /** 重试条件 */
  retryIf?: string;
}

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  /** 超时时间 */
  timeout?: string;
  /** 重试策略 */
  retryPolicy?: WorkflowRetryConfig;
  /** 错误处理策略 */
  errorHandling?: 'fail-fast' | 'continue' | 'rollback';
  /** 并发数限制 */
  concurrency?: number;
  /** 优先级 */
  priority?: number;
  /** 是否持久化中间结果 */
  persistIntermediateResults?: boolean;
}

/**
 * 工作流实例
 */
export interface WorkflowInstance {
  /** 实例ID */
  id: number;
  /** 工作流定义ID */
  workflowDefinitionId: number;
  /** 实例名称 */
  name: string;
  /** 外部ID */
  externalId?: string;
  /** 执行状态 */
  status: WorkflowStatus;
  /** 输入数据 */
  inputData?: Record<string, any>;
  /** 输出数据 */
  outputData?: Record<string, any>;
  /** 上下文数据 */
  contextData?: Record<string, any>;

  // v3.0.0 新增字段：业务键和互斥键
  /** 业务键 - 用于业务逻辑关联 */
  businessKey?: string;
  /** 互斥键 - 用于防止重复执行 */
  mutexKey?: string;

  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 暂停时间 */
  pausedAt?: Date;
  /** 错误信息 */
  errorMessage?: string;
  /** 错误详情 */
  errorDetails?: any;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 优先级 */
  priority: number;
  /** 调度时间 */
  scheduledAt?: Date;

  // v3.0.0 新增字段：断点续传和分布式锁支持
  /** 当前执行到的节点ID */
  currentNodeId?: string;
  /** 已完成的节点列表 */
  completedNodes?: any;
  /** 失败的节点列表 */
  failedNodes?: any;
  /** 锁拥有者标识 */
  lockOwner?: string;
  /** 锁获取时间 */
  lockAcquiredAt?: Date;
  /** 最后心跳时间 */
  lastHeartbeat?: Date;

  // v3.0.0 新增字段：分布式执行支持
  /** 分配的引擎ID */
  assignedEngineId?: string;
  /** 分配策略 */
  assignmentStrategy?: string;

  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 创建者 */
  createdBy?: string;
}

/**
 * 统一的Adapter响应结果类型
 */
export interface WorkflowAdapterResult<T = any> {
  /** 操作是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
  /** 错误详情 */
  errorDetails?: any;
  /** 响应时间戳 */
  timestamp: string;
  /** 请求ID */
  requestId?: string;
}

/**
 * WorkflowAdapterResult 工具类
 *
 * 提供统一的适配层结果创建方法，确保所有结果都包含必需的字段
 */
export class WorkflowAdapterResultHelper {
  /**
   * 创建成功结果
   */
  static success<T>(data?: T, requestId?: string): WorkflowAdapterResult<T> {
    const result: WorkflowAdapterResult<T> = {
      success: true,
      timestamp: new Date().toISOString()
    };

    if (data !== undefined) {
      result.data = data;
    }

    if (requestId !== undefined) {
      result.requestId = requestId;
    }

    return result;
  }

  /**
   * 创建失败结果
   */
  static failure<T>(
    error: string,
    errorCode?: string,
    errorDetails?: any,
    requestId?: string
  ): WorkflowAdapterResult<T> {
    const result: WorkflowAdapterResult<T> = {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };

    if (errorCode !== undefined) {
      result.errorCode = errorCode;
    }

    if (errorDetails !== undefined) {
      result.errorDetails = errorDetails;
    }

    if (requestId !== undefined) {
      result.requestId = requestId;
    }

    return result;
  }

  /**
   * 从ServiceResult转换为WorkflowAdapterResult
   */
  static fromServiceResult<T>(
    serviceResult: {
      success: boolean;
      data?: T;
      error?: string;
      errorCode?: string;
      errorDetails?: any;
    },
    requestId?: string
  ): WorkflowAdapterResult<T> {
    if (serviceResult.success) {
      return this.success(serviceResult.data, requestId);
    } else {
      return this.failure(
        serviceResult.error || '操作失败',
        serviceResult.errorCode,
        serviceResult.errorDetails,
        requestId
      );
    }
  }

  /**
   * 生成请求ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * 分页查询结果
 */
export interface PaginatedResult<T> {
  /** 数据项 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页大小 */
  pageSize: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
}

/**
 * 工作流定义创建输入
 */
export interface WorkflowDefinitionInput {
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 版本号 */
  version?: string;
  /** 流程节点 */
  nodes: NodeDefinition[];
  /** 输入参数定义 */
  inputs?: InputDefinition[];
  /** 输出参数定义 */
  outputs?: OutputDefinition[];
  /** 工作流配置 */
  config?: WorkflowConfig;
  /** 标签 */
  tags?: string[];
  /** 分类 */
  category?: string;
}

/**
 * 工作流启动选项
 */
export interface WorkflowStartOptions {
  /** 优先级 (1-10，数字越高优先级越高) */
  priority?: number;
  /** 外部业务ID */
  externalId?: string;
  /** 业务键（用于去重） */
  businessKey?: string;
  /** 互斥键（用于串行执行） */
  mutexKey?: string;
  /** 标签 */
  tags?: string[];
  /** 上下文数据 */
  contextData?: Record<string, any>;
  /** 计划执行时间 */
  scheduledAt?: Date;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试策略 */
  retryPolicy?: RetryConfig;
}

/**
 * 工作流实例查询过滤条件
 */
export interface WorkflowInstanceFilters {
  /** 工作流定义ID */
  definitionId?: string;
  /** 实例状态 */
  status?: WorkflowStatus | WorkflowStatus[];
  /** 实例名称（模糊匹配） */
  name?: string;
  /** 外部业务ID */
  externalId?: string;
  /** 业务键 */
  businessKey?: string;
  /** 创建者 */
  createdBy?: string;
  /** 标签 */
  tags?: string[];
  /** 创建时间范围 */
  createdAt?: {
    from?: Date;
    to?: Date;
  };
  /** 分页参数 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
}

/**
 * 工作流定义查询过滤条件
 */
export interface WorkflowDefinitionFilters {
  /** 名称（模糊匹配） */
  name?: string;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 是否启用 */
  enabled?: boolean;
  /** 创建者 */
  createdBy?: string;
  /** 分页参数 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
}

/**
 * 工作流进度信息
 */
export interface WorkflowProgress {
  /** 实例ID */
  instanceId: string;
  /** 总节点数 */
  totalNodes: number;
  /** 已完成节点数 */
  completedNodes: number;
  /** 失败节点数 */
  failedNodes: number;
  /** 运行中节点数 */
  runningNodes: number;
  /** 等待节点数 */
  pendingNodes: number;
  /** 进度百分比 */
  progressPercent: number;
  /** 预计完成时间 */
  estimatedCompletion?: Date;
  /** 当前执行节点 */
  currentNode?: string;
  /** 执行路径 */
  executionPath: string[];
}

/**
 * 执行日志查询选项
 */
export interface LogQueryOptions {
  /** 节点ID过滤 */
  nodeId?: string;
  /** 日志级别过滤 */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** 时间范围 */
  timeRange?: {
    from?: Date;
    to?: Date;
  };
  /** 分页参数 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
}

/**
 * 执行日志
 */
export interface ExecutionLog {
  /** 日志ID */
  id: string;
  /** 工作流实例ID */
  instanceId: string;
  /** 节点ID */
  nodeId?: string;
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 日志消息 */
  message: string;
  /** 日志详情 */
  details?: any;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 工作流定时调度配置
 */
export interface WorkflowSchedule {
  /** 调度ID */
  id: string;
  /** 工作流定义ID */
  definitionId: string;
  /** 调度名称 */
  name: string;
  /** 调度描述 */
  description?: string;
  /** Cron表达式 */
  cronExpression: string;
  /** 是否启用 */
  enabled: boolean;
  /** 输入数据模板 */
  inputTemplate?: Record<string, any>;
  /** 下次执行时间 */
  nextRunTime?: Date;
  /** 最后执行时间 */
  lastRunTime?: Date;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 定时调度创建输入
 */
export interface WorkflowScheduleInput {
  /** 工作流定义ID */
  definitionId: string;
  /** 调度名称 */
  name: string;
  /** 调度描述 */
  description?: string;
  /** Cron表达式 */
  cronExpression: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 输入数据模板 */
  inputTemplate?: Record<string, any>;
}

/**
 * 定时调度查询过滤条件
 */
export interface ScheduleFilters {
  /** 工作流定义ID */
  definitionId?: string;
  /** 名称（模糊匹配） */
  name?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 分页参数 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
}

/**
 * 系统性能指标
 */
export interface SystemMetrics {
  /** 活跃工作流数量 */
  activeWorkflows: number;
  /** 已完成工作流数量 */
  completedWorkflows: number;
  /** 失败工作流数量 */
  failedWorkflows: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 吞吐量（每分钟处理数） */
  throughput: number;
  /** 错误率 */
  errorRate: number;
  /** 资源使用情况 */
  resourceUsage: {
    cpu: number;
    memory: number;
    database: number;
  };
  /** 分布式状态（如果启用） */
  distributedStatus?: {
    activeEngines: number;
    totalCapacity: number;
    loadDistribution: Record<string, number>;
  };
}

/**
 * 工作流指标
 */
export interface WorkflowMetrics {
  /** 工作流定义ID */
  definitionId?: string;
  /** 执行统计 */
  executionStats: {
    total: number;
    successful: number;
    failed: number;
    cancelled: number;
  };
  /** 性能统计 */
  performanceStats: {
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
  };
  /** 错误统计 */
  errorStats: Record<string, number>;
}

/**
 * 执行器信息
 */
export interface ExecutorInfo {
  /** 执行器名称 */
  name: string;
  /** 执行器描述 */
  description?: string;
  /** 执行器版本 */
  version?: string;
  /** 是否可用 */
  available: boolean;
  /** 支持的配置参数 */
  configSchema?: any;
}

/**
 * 时间范围
 */
export interface TimeRange {
  /** 开始时间 */
  from: Date;
  /** 结束时间 */
  to: Date;
}

/**
 * Stratix错误代码枚举
 */
export enum StratixTasksErrorCode {
  // 工作流定义相关错误
  DEFINITION_NOT_FOUND = 'DEFINITION_NOT_FOUND',
  DEFINITION_VALIDATION_FAILED = 'DEFINITION_VALIDATION_FAILED',
  DUPLICATE_DEFINITION_NAME = 'DUPLICATE_DEFINITION_NAME',
  DEFINITION_IN_USE = 'DEFINITION_IN_USE',

  // 工作流实例相关错误
  INSTANCE_NOT_FOUND = 'INSTANCE_NOT_FOUND',
  INSTANCE_STATE_INVALID = 'INSTANCE_STATE_INVALID',
  INSTANCE_EXECUTION_FAILED = 'INSTANCE_EXECUTION_FAILED',
  INSTANCE_TIMEOUT = 'INSTANCE_TIMEOUT',

  // 输入验证错误
  INVALID_INPUT_DATA = 'INVALID_INPUT_DATA',
  REQUIRED_INPUT_MISSING = 'REQUIRED_INPUT_MISSING',

  // 执行器相关错误
  EXECUTOR_NOT_FOUND = 'EXECUTOR_NOT_FOUND',
  EXECUTOR_EXECUTION_FAILED = 'EXECUTOR_EXECUTION_FAILED',

  // 调度相关错误
  SCHEDULE_NOT_FOUND = 'SCHEDULE_NOT_FOUND',
  INVALID_CRON_EXPRESSION = 'INVALID_CRON_EXPRESSION',

  // 系统相关错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // 分布式相关错误
  LOCK_ACQUISITION_FAILED = 'LOCK_ACQUISITION_FAILED',
  ENGINE_NOT_AVAILABLE = 'ENGINE_NOT_AVAILABLE',
  COORDINATION_ERROR = 'COORDINATION_ERROR'
}

/**
 * 工作流执行选项
 */
export interface WorkflowExecutionOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 是否并行执行 */
  parallel?: boolean;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 优先级 */
  priority?: number;
  /** 外部ID */
  externalId?: string;
  /** 上下文数据 */
  contextData?: Record<string, any>;
}

/**
 * 基础工作流适配器接口
 *
 * 提供基本的工作流操作功能，用于内部实现
 */
export interface IWorkflowAdapter {
  /**
   * 创建工作流实例
   * @param definition 工作流定义或引用
   * @param inputs 输入参数
   * @param options 执行选项
   * @returns 创建的工作流实例
   */
  createWorkflow(
    definition: WorkflowDefinition | { name: string; version?: string },
    inputs?: Record<string, any>,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;

  /**
   * 执行工作流实例
   * @param instanceId 工作流实例ID
   * @returns 执行结果
   */
  executeWorkflow(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;

  /**
   * 暂停工作流
   * @param instanceId 工作流实例ID
   * @returns 暂停结果
   */
  pauseWorkflow(instanceId: string): Promise<WorkflowAdapterResult<boolean>>;

  /**
   * 恢复工作流
   * @param instanceId 工作流实例ID
   * @returns 恢复结果
   */
  resumeWorkflow(instanceId: string): Promise<WorkflowAdapterResult<boolean>>;

  /**
   * 取消工作流
   * @param instanceId 工作流实例ID
   * @returns 取消结果
   */
  cancelWorkflow(instanceId: string): Promise<WorkflowAdapterResult<boolean>>;

  /**
   * 获取工作流状态
   * @param instanceId 工作流实例ID
   * @returns 工作流状态
   */
  getWorkflowStatus(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowStatus>>;

  /**
   * 获取工作流实例
   * @param instanceId 工作流实例ID
   * @returns 工作流实例
   */
  getWorkflowInstance(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;

  /**
   * 列出工作流实例
   * @param filters 过滤条件
   * @returns 工作流实例列表
   */
  listWorkflowInstances(
    filters?: any
  ): Promise<WorkflowAdapterResult<WorkflowInstance[]>>;

  /**
   * 删除工作流实例
   * @param instanceId 工作流实例ID
   * @returns 删除结果
   */
  deleteWorkflowInstance(
    instanceId: string
  ): Promise<WorkflowAdapterResult<boolean>>;
}

/**
 * Stratix Tasks插件统一Adapter接口
 *
 * 基于Stratix框架Adapter层规范设计的工作流管理接口
 * 提供工作流定义管理、实例控制、定时调度、监控日志等完整功能
 *
 * 设计原则：
 * - SINGLETON生命周期
 * - 统一错误处理和响应格式
 * - 简化外部接口，隐藏内部复杂性
 * - 通过依赖注入容器解析内部服务
 */
export interface IStratixTasksAdapter {
  // ==================== 工作流定义管理 ====================

  /**
   * 创建工作流定义
   * @param definition 工作流定义输入
   * @returns 创建的工作流定义
   */
  createWorkflowDefinition(
    definition: WorkflowDefinitionInput
  ): Promise<WorkflowAdapterResult<WorkflowDefinition>>;

  /**
   * 更新工作流定义
   * @param id 工作流定义ID
   * @param definition 更新的工作流定义数据
   * @returns 更新的工作流定义
   */
  updateWorkflowDefinition(
    id: string,
    definition: Partial<WorkflowDefinitionInput>
  ): Promise<WorkflowAdapterResult<WorkflowDefinition>>;

  /**
   * 删除工作流定义
   * @param id 工作流定义ID
   * @returns 删除结果
   */
  deleteWorkflowDefinition(id: string): Promise<WorkflowAdapterResult<boolean>>;

  /**
   * 获取工作流定义详情
   * @param id 工作流定义ID
   * @returns 工作流定义详情
   */
  getWorkflowDefinition(
    id: string
  ): Promise<WorkflowAdapterResult<WorkflowDefinition>>;

  /**
   * 查询工作流定义列表
   * @param filters 查询过滤条件
   * @returns 工作流定义分页列表
   */
  listWorkflowDefinitions(
    filters?: WorkflowDefinitionFilters
  ): Promise<WorkflowAdapterResult<PaginatedResult<WorkflowDefinition>>>;

  // ==================== 工作流实例控制 ====================

  /**
   * 启动工作流实例
   * @param definitionId 工作流定义ID（数据库ID或name@version格式）
   * @param inputs 工作流输入参数
   * @param options 启动选项
   * @returns 启动的工作流实例
   */
  startWorkflow(
    definitionId: string,
    inputs: Record<string, any>,
    options?: WorkflowStartOptions
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;

  /**
   * 创建互斥工作流实例
   * 如果指定的mutexKey已有运行中的实例，则返回冲突信息而不创建新实例
   * @param definitionId 工作流定义ID
   * @param inputs 工作流输入参数
   * @param mutexKey 互斥键
   * @param options 启动选项
   * @returns 创建结果或冲突信息
   */
  startMutexWorkflow(
    definitionId: string,
    inputs: Record<string, any>,
    mutexKey: string,
    options?: WorkflowStartOptions
  ): Promise<
    WorkflowAdapterResult<{
      instance?: WorkflowInstance;
      conflictingInstance?: WorkflowInstance;
    }>
  >;

  /**
   * 暂停工作流执行
   * @param instanceId 工作流实例ID
   * @returns 暂停结果
   */
  pauseWorkflow(instanceId: string): Promise<WorkflowAdapterResult<boolean>>;

  /**
   * 恢复工作流执行
   * @param instanceId 工作流实例ID
   * @returns 恢复结果
   */
  resumeWorkflow(instanceId: string): Promise<WorkflowAdapterResult<boolean>>;

  /**
   * 取消工作流执行
   * @param instanceId 工作流实例ID
   * @returns 取消结果
   */
  cancelWorkflow(instanceId: string): Promise<WorkflowAdapterResult<boolean>>;

  /**
   * 终止工作流执行（强制停止，不可恢复）
   * @param instanceId 工作流实例ID
   * @returns 终止结果
   */
  terminateWorkflow(
    instanceId: string
  ): Promise<WorkflowAdapterResult<boolean>>;

  // ==================== 工作流状态查询 ====================

  /**
   * 获取工作流实例详情
   * @param instanceId 工作流实例ID
   * @returns 工作流实例详情
   */
  getWorkflowInstance(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;

  /**
   * 查询工作流实例列表
   * @param filters 查询过滤条件
   * @returns 工作流实例分页列表
   */
  listWorkflowInstances(
    filters?: WorkflowInstanceFilters
  ): Promise<WorkflowAdapterResult<PaginatedResult<WorkflowInstance>>>;

  /**
   * 获取工作流执行状态
   * @param instanceId 工作流实例ID
   * @returns 工作流状态
   */
  getWorkflowStatus(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowStatus>>;

  /**
   * 获取工作流执行进度
   * @param instanceId 工作流实例ID
   * @returns 工作流进度信息
   */
  getWorkflowProgress(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowProgress>>;

  /**
   * 删除工作流实例
   * @param instanceId 工作流实例ID
   * @returns 删除结果
   */
  deleteWorkflowInstance(
    instanceId: string
  ): Promise<WorkflowAdapterResult<boolean>>;

  // ==================== 定时任务配置 ====================

  /**
   * 创建定时调度
   * @param schedule 调度配置
   * @returns 创建的调度配置
   */
  createSchedule(
    schedule: WorkflowScheduleInput
  ): Promise<WorkflowAdapterResult<WorkflowSchedule>>;

  /**
   * 更新定时调度
   * @param scheduleId 调度ID
   * @param schedule 更新的调度配置
   * @returns 更新的调度配置
   */
  updateSchedule(
    scheduleId: string,
    schedule: Partial<WorkflowScheduleInput>
  ): Promise<WorkflowAdapterResult<WorkflowSchedule>>;

  /**
   * 删除定时调度
   * @param scheduleId 调度ID
   * @returns 删除结果
   */
  deleteSchedule(scheduleId: string): Promise<WorkflowAdapterResult<boolean>>;

  /**
   * 启用/禁用定时调度
   * @param scheduleId 调度ID
   * @param enabled 是否启用
   * @returns 更新结果
   */
  toggleSchedule(
    scheduleId: string,
    enabled: boolean
  ): Promise<WorkflowAdapterResult<boolean>>;

  /**
   * 查询定时调度列表
   * @param filters 查询过滤条件
   * @returns 调度配置分页列表
   */
  listSchedules(
    filters?: ScheduleFilters
  ): Promise<WorkflowAdapterResult<PaginatedResult<WorkflowSchedule>>>;

  // ==================== 监控和日志 ====================

  /**
   * 获取工作流执行日志
   * @param instanceId 工作流实例ID
   * @param options 查询选项
   * @returns 执行日志分页列表
   */
  getExecutionLogs(
    instanceId: string,
    options?: LogQueryOptions
  ): Promise<WorkflowAdapterResult<PaginatedResult<ExecutionLog>>>;

  /**
   * 获取系统性能指标
   * @param timeRange 时间范围（可选）
   * @returns 系统性能指标
   */
  getSystemMetrics(
    timeRange?: TimeRange
  ): Promise<WorkflowAdapterResult<SystemMetrics>>;

  /**
   * 获取工作流性能指标
   * @param definitionId 工作流定义ID（可选，不传则获取全部）
   * @param timeRange 时间范围（可选）
   * @returns 工作流性能指标
   */
  getWorkflowMetrics(
    definitionId?: string,
    timeRange?: TimeRange
  ): Promise<WorkflowAdapterResult<WorkflowMetrics>>;

  // ==================== 执行器管理 ====================

  /**
   * 获取已注册的执行器列表
   * @returns 执行器信息列表
   */
  listExecutors(): Promise<WorkflowAdapterResult<ExecutorInfo[]>>;

  /**
   * 获取执行器详情
   * @param executorName 执行器名称
   * @returns 执行器详细信息
   */
  getExecutorInfo(
    executorName: string
  ): Promise<WorkflowAdapterResult<ExecutorInfo>>;

  // ==================== 系统管理 ====================

  /**
   * 健康检查
   * @returns 系统健康状态
   */
  healthCheck(): Promise<
    WorkflowAdapterResult<{
      status: 'healthy' | 'unhealthy';
      version: string;
      uptime: number;
      components: Record<string, 'up' | 'down'>;
    }>
  >;

  /**
   * 获取系统信息
   * @returns 系统基本信息
   */
  getSystemInfo(): Promise<
    WorkflowAdapterResult<{
      version: string;
      environment: string;
      features: string[];
      limits: {
        maxConcurrentWorkflows: number;
        maxWorkflowDefinitions: number;
      };
    }>
  >;

  // ==================== 故障恢复和分布式支持 ====================

  /**
   * 查找中断的工作流实例
   * @param filters 查询过滤条件
   * @returns 中断的工作流实例列表
   */
  findInterruptedWorkflows(filters: {
    heartbeatTimeout: Date;
    statuses: WorkflowStatus[];
    limit?: number;
  }): Promise<WorkflowAdapterResult<WorkflowInstance[]>>;
}

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 调度间隔 */
  interval: number;
  /** 最大并发数 */
  maxConcurrency: number;
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 指标收集间隔 */
  metricsInterval: number;
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 动态并行任务执行结果
 */
export interface DynamicParallelResult {
  /** 任务索引 */
  index: number;
  /** 输入数据 */
  input: any;
  /** 执行结果 */
  output?: any;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  duration?: number;
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
}
