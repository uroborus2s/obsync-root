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
  | 'cancelled'; // 已取消

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
 * 循环节点定义
 */
export interface LoopNodeDefinition extends BaseNodeDefinition {
  type: 'loop';
  /** 循环类型 */
  loopType: 'forEach' | 'while' | 'times';
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
  /** 循环体节点 */
  nodes: NodeDefinition[];
  /** 是否并行执行 */
  parallel?: boolean;
  /** 最大并发数 */
  maxConcurrency?: number;
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
 * 重试配置
 */
export interface RetryConfig {
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
  retryPolicy?: RetryConfig;
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
  name?: string;
  /** 外部ID */
  externalId?: string;
  /** 执行状态 */
  status: WorkflowStatus;
  /** 输入数据 */
  inputData: Record<string, any>;
  /** 输出数据 */
  outputData?: Record<string, any>;
  /** 上下文数据 */
  contextData: Record<string, any>;
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
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 创建者 */
  createdBy?: string;
}

/**
 * 工作流适配器结果类型
 */
export interface WorkflowAdapterResult<T = any> {
  /** 操作是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误详情 */
  errorDetails?: any;
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
 * 工作流适配器接口
 *
 * 提供统一的工作流管理接口，支持创建、执行、监控和控制工作流实例
 */
export interface IWorkflowAdapter {
  /**
   * 创建工作流实例
   * @param definition 工作流定义
   * @param inputs 输入数据
   * @param options 执行选项
   * @returns 创建结果，包含工作流实例信息
   */
  createWorkflow(
    definition: WorkflowDefinition,
    inputs?: Record<string, any>,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;

  /**
   * 执行工作流实例
   * @param instanceId 工作流实例ID
   * @param options 执行选项
   * @returns 执行结果
   */
  executeWorkflow(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;

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
   * 获取工作流状态
   * @param instanceId 工作流实例ID
   * @returns 工作流状态信息
   */
  getWorkflowStatus(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowStatus>>;

  /**
   * 获取工作流实例详情
   * @param instanceId 工作流实例ID
   * @returns 工作流实例详情
   */
  getWorkflowInstance(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;

  /**
   * 列出工作流实例
   * @param filters 过滤条件
   * @returns 工作流实例列表
   */
  listWorkflowInstances(filters?: {
    status?: WorkflowStatus;
    name?: string;
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<WorkflowAdapterResult<WorkflowInstance[]>>;

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
