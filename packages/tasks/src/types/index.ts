// @stratix/tasks 核心类型定义
// 定义工作流引擎的所有核心接口和类型

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled'
}

/**
 * 任务类型枚举
 */
export enum TaskType {
  EXECUTOR = 'executor',
  CONDITION = 'condition',
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential',
  SUB_WORKFLOW = 'sub_workflow'
}

/**
 * 触发器类型枚举
 */
export enum TriggerType {
  CRON = 'cron',
  INTERVAL = 'interval',
  EVENT = 'event',
  MANUAL = 'manual'
}

/**
 * 退避策略枚举
 */
export enum BackoffStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential'
}

/**
 * 重试策略接口
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  delay?: number;
  maxDelay?: number;
  retryableErrors?: string[];
}

/**
 * 条件表达式类型
 */
export type ConditionExpression = string;

/**
 * 任务定义接口
 */
export interface TaskDefinition {
  id: string;
  name: string;
  type: TaskType;
  executor?: string;
  dependencies?: string[];
  condition?: ConditionExpression;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  parameters?: Record<string, any>;
  onError?: ErrorHandlingConfig;
  
  // 并行任务特有属性
  tasks?: TaskDefinition[];
  concurrency?: number;
  
  // 条件任务特有属性
  onTrue?: string[];
  onFalse?: string[];
  
  // 子工作流特有属性
  workflowId?: string;
  input?: Record<string, any>;
  
  // 依赖类型
  dependencyType?: 'all' | 'any';
}

/**
 * 触发器定义接口
 */
export interface TriggerDefinition {
  type: TriggerType;
  config: TriggerConfig;
}

/**
 * 触发器配置联合类型
 */
export type TriggerConfig = CronTriggerConfig | IntervalTriggerConfig | EventTriggerConfig | ManualTriggerConfig;

/**
 * Cron触发器配置
 */
export interface CronTriggerConfig {
  cron: string;
  timezone?: string;
}

/**
 * 间隔触发器配置
 */
export interface IntervalTriggerConfig {
  interval: number; // 毫秒
  immediate?: boolean;
}

/**
 * 事件触发器配置
 */
export interface EventTriggerConfig {
  eventType: string;
  filter?: Record<string, any>;
}

/**
 * 手动触发器配置
 */
export interface ManualTriggerConfig {
  // 手动触发无需特殊配置
}

/**
 * 错误处理配置
 */
export interface ErrorHandlingConfig {
  strategy: 'retry' | 'skip' | 'fail' | 'compensate' | 'continue';
  maxFailures?: number;
  compensationTask?: string;
  continueOnFailure?: boolean;
  notifyOnFailure?: boolean;
}

/**
 * 工作流定义接口
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  tasks: TaskDefinition[];
  triggers?: TriggerDefinition[];
  variables?: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  onError?: ErrorHandlingConfig;
  tags?: string[];
  category?: string;
  
  // 调试配置
  debug?: {
    enabled: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    logTasks?: boolean;
    logVariables?: boolean;
  };
}

/**
 * 工作流实例接口
 */
export interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionVersion: string;
  name?: string;
  status: WorkflowStatus;
  priority: number;
  
  // 数据字段
  input?: Record<string, any>;
  output?: Record<string, any>;
  context?: Record<string, any>;
  variables?: Record<string, any>;
  
  // 时间字段
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeoutAt?: Date;
  
  // 错误信息
  error?: WorkflowError;
  
  // 重试信息
  retryCount: number;
  maxRetries: number;
  
  // 元数据
  triggeredBy?: string;
  parentInstanceId?: string;
  correlationId?: string;
  
  // 进度信息
  progress?: WorkflowProgress;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 任务实例接口
 */
export interface TaskInstance {
  id: string;
  workflowInstanceId: string;
  taskDefinitionId: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  
  // 执行信息
  executorName?: string;
  executionOrder?: number;
  
  // 数据字段
  input?: Record<string, any>;
  output?: Record<string, any>;
  parameters?: Record<string, any>;
  
  // 时间字段
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeoutAt?: Date;
  
  // 错误信息
  error?: TaskError;
  
  // 重试信息
  retryCount: number;
  maxRetries: number;
  
  // 依赖关系
  dependencies?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工作流进度信息
 */
export interface WorkflowProgress {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  percentage: number;
  currentTask?: {
    id: string;
    name: string;
    status: TaskStatus;
    progress?: number;
  };
}

/**
 * 工作流错误信息
 */
export interface WorkflowError {
  message: string;
  code: string;
  details?: any;
  stack?: string;
  timestamp: Date;
}

/**
 * 任务错误信息
 */
export interface TaskError {
  message: string;
  code: string;
  details?: any;
  stack?: string;
  retryable: boolean;
  timestamp: Date;
}

/**
 * 执行上下文接口
 */
export interface ExecutionContext {
  // 基本信息
  workflowInstanceId: string;
  taskInstanceId: string;
  taskDefinition: TaskDefinition;
  
  // 数据访问
  input: Record<string, any>;
  variables: Record<string, any>;
  
  // 工具方法
  logger: Logger;
  signal: AbortSignal;
  
  // 状态管理
  reportProgress(percentage: number): void;
  setVariable(key: string, value: any): void;
  getVariable(key: string): any;
  
  // 检查点支持
  saveCheckpoint(data: any): Promise<void>;
  loadCheckpoint(): Promise<any>;
  
  // 状态检查
  isPaused(): boolean;
  isCancelled(): boolean;
  isDebugMode(): boolean;
  
  // 调试支持
  debug(message: string, data?: any): void;
  waitForDebugger(): Promise<void>;
  
  // 时间信息
  startTime: number;
}

/**
 * 日志接口
 */
export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

/**
 * 任务执行结果
 */
export interface TaskResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    retryable?: boolean;
    details?: any;
  };
  metadata?: {
    executionTime?: number;
    memoryUsage?: number;
    fromCache?: boolean;
    [key: string]: any;
  };
}

/**
 * 任务执行器接口
 */
export interface TaskExecutor<TInput = any, TOutput = any> {
  name: string;
  execute(input: TInput, context: ExecutionContext): Promise<TaskResult<TOutput>>;
}

/**
 * 工作流引擎接口
 */
export interface WorkflowEngine {
  // 工作流管理
  startWorkflow(definitionId: string, input?: any, options?: StartWorkflowOptions): Promise<WorkflowInstance>;
  resumeWorkflow(instanceId: string): Promise<WorkflowInstance>;
  pauseWorkflow(instanceId: string): Promise<void>;
  cancelWorkflow(instanceId: string): Promise<void>;
  retryWorkflow(instanceId: string, options?: RetryWorkflowOptions): Promise<WorkflowInstance>;
  
  // 状态查询
  getWorkflowStatus(instanceId: string): Promise<WorkflowStatus>;
  getInstance(instanceId: string): Promise<WorkflowInstance | null>;
  getTasks(workflowInstanceId: string): Promise<TaskInstance[]>;
  
  // 等待完成
  waitForCompletion(instanceId: string, timeout?: number): Promise<WorkflowInstance>;
  
  // 事件监听
  onStatusChange(instanceId: string, callback: (status: WorkflowStatus, instance: WorkflowInstance) => void): void;
  onTaskCompleted(instanceId: string, callback: (task: TaskInstance) => void): void;
}

/**
 * 启动工作流选项
 */
export interface StartWorkflowOptions {
  name?: string;
  priority?: number;
  scheduledAt?: Date;
  correlationId?: string;
  timeout?: number;
  variables?: Record<string, any>;
}

/**
 * 重试工作流选项
 */
export interface RetryWorkflowOptions {
  retryFailedTasks?: boolean;
  resetVariables?: boolean;
  fromTask?: string;
}
