/**
 * @stratix/tasks 核心类型定义
 *
 * 定义工作流任务管理系统的所有核心类型和接口
 */

// 导出所有类型模块
export * from './common.js';
export * from './executor.js';
export * from './scheduler.js';
export * from './task.js';
export * from './workflow.js';

// 重新导出常用类型的联合类型
export type {
  IWorkflowAdapter,
  MonitoringConfig,
  NodeDefinition,
  SchedulerConfig,
  WorkflowAdapterResult,
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowInstance,
  WorkflowStatus
} from './workflow.js';
