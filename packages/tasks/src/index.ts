/**
 * @stratix/tasks 主入口文件 v2.0.0
 * 重构后的任务系统
 */

// 导出插件
export { wrapTasksPlugin as default } from './plugin.js';

// 导出实体层
export { TaskNode } from './entity/taskNode.js';
export type {
  TaskData,
  TaskNodePlaceholder,
  TaskStatusChangeEvent,
  TaskStatusSyncCallback,
  TaskStatusSyncEvent,
  TriggerType
} from './entity/types.js';

// 导出任务状态类型和执行器类型
export type { TaskExecutor } from './entity/executor.types.js';
export { TaskStatus, TaskStatusUtils } from './types/task.types.js';

// 导出新的仓储层
export {
  CompletedTaskRepository,
  RunningTaskRepository,
  TaskMigrationRepository
} from './repositories/index.js';
export type {
  CompletedTaskEntity,
  ExecutorUsageStats,
  ExtendedDatabase,
  QueryOptions,
  RunningTaskEntity,
  TaskStats
} from './repositories/types.js';

// 导出服务层
export { TaskTreeService } from './services/index.js';
export { QueryService } from './services/queryService.js';
export type { TaskQueryConditions } from './services/queryService.js';
export { TaskService } from './services/taskService.js';
export type { ITaskService } from './services/taskService.js';
export type {
  ITaskTreeService,
  TaskQueryOptions,
  TaskRecoveryResult,
  TaskStateChangeResult,
  TaskTreeStatistics,
  TaskTreeView
} from './services/types.js';

// 导出类型
export type {
  CreateTaskParams,
  TaskBase,
  TaskExecutorConfig,
  TaskMetadata,
  TaskType
} from './types/index.js';
