/**
 * @stratix/tasks 核心类型定义
 *
 * 定义工作流任务管理系统的所有核心类型和接口
 */

// 从各模块导出非冲突的类型
export * from './task.js';

// 从 workflow.js 导出所有类型（主要的工作流类型）
export * from './workflow.js';

// 从 executor.js 选择性导出，避免与 workflow.js 冲突
export type {
  BuiltInExecutorType,
  EmailExecutorConfig,
  ExecutionContext,
  ExecutionResult,
  ExecutorFactory,
  ExecutorRegistry,
  ValidationResult as ExecutorValidationResult,
  HealthStatus,
  HttpExecutorConfig,
  ScriptExecutorConfig,
  TaskExecutor
} from './executor.js';

// 从 scheduler.js 选择性导出，避免冲突
export type {
  SchedulerConfig,
  SchedulerStats,
  SchedulerStatus,
  SchedulingStrategy
} from './scheduler.js';

// 从service.js单独导出以避免冲突
export {
  BaseQueryOptions,
  BatchOperationResult,
  ErrorCode,
  ErrorCodes,
  OperationContext,
  ServiceResult,
  ValidationResult as ServiceValidationResult,
  ValidationError,
  ValidationWarning
} from './service.js';

// 从common.js导出类型，避免与service.js冲突
export type {
  ApiResponse,
  BusinessError,
  Cache,
  ConfigProvider,
  ErrorType,
  EventData,
  EventListener,
  EventPublisher,
  EventType,
  Lock,
  QueryOptions,
  StateTransition
} from './common.js';

// 重新定义以避免冲突的类型
export type {
  PaginatedResult as CommonPaginatedResult,
  PaginationOptions as CommonPaginationOptions,
  SortOptions as CommonSortOptions
} from './common.js';

// 重新导出常用类型的联合类型
export type {
  IWorkflowAdapter,
  MonitoringConfig,
  NodeDefinition,
  WorkflowAdapterResult,
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowInstance,
  WorkflowStatus
} from './workflow.js';
