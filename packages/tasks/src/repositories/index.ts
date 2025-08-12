/**
 * Tasks插件仓储层导出
 *
 * 导出所有Repository类和相关接口
 */

// 基础仓储类
export { BaseTasksRepository } from './base/BaseTasksRepository.js';

// 工作流定义仓储
export { default as WorkflowDefinitionRepository } from './WorkflowDefinitionRepository.js';
export type { IWorkflowDefinitionRepository } from './WorkflowDefinitionRepository.js';

// 工作流实例仓储
export { default as WorkflowInstanceRepository } from './WorkflowInstanceRepository.js';
export type {
  IWorkflowInstanceRepository,
  WorkflowInstanceQueryOptions
} from './WorkflowInstanceRepository.js';

// 工作流任务节点仓储（新）
export { default as WorkflowTaskNodeRepository } from './WorkflowTaskNodeRepository.js';
export type {
  IWorkflowTaskNodeRepository,
  TaskNodeQueryOptions,
  TaskNodeStatus,
  TaskNodeType
} from './WorkflowTaskNodeRepository.js';

// 工作流执行日志仓储（新）
export { default as WorkflowExecutionLogRepository } from './WorkflowExecutionLogRepository.js';
export type {
  IWorkflowExecutionLogRepository,
  LogLevel,
  LogQueryOptions
} from './WorkflowExecutionLogRepository.js';

// 分布式锁仓储
export { default as LockRepository } from './LockRepository.js';
export type {
  ILockRepository,
  LockRecord,
  LockRecordUpdate,
  NewLockRecord
} from './LockRepository.js';

// 工作流引擎实例仓储（新）
export { default as WorkflowEngineInstanceRepository } from './WorkflowEngineInstanceRepository.js';
export type {
  EngineInstanceStatus,
  IWorkflowEngineInstanceRepository,
  LoadInfo
} from './WorkflowEngineInstanceRepository.js';

// 工作流分配记录仓储（新）
export { default as WorkflowAssignmentRepository } from './WorkflowAssignmentRepository.js';
export type {
  AssignmentStatus,
  IWorkflowAssignmentRepository
} from './WorkflowAssignmentRepository.js';

// 工作流节点分配记录仓储（新）
export { default as WorkflowNodeAssignmentRepository } from './WorkflowNodeAssignmentRepository.js';
export type {
  IWorkflowNodeAssignmentRepository,
  NodeAssignmentStatus
} from './WorkflowNodeAssignmentRepository.js';

// 工作流故障转移事件仓储（新）
export { default as WorkflowFailoverEventRepository } from './WorkflowFailoverEventRepository.js';
export type {
  FailoverStatus,
  IWorkflowFailoverEventRepository
} from './WorkflowFailoverEventRepository.js';

// 工作流调度仓储（新）
export { default as WorkflowScheduleRepository } from './WorkflowScheduleRepository.js';
export type { IWorkflowScheduleRepository } from './WorkflowScheduleRepository.js';

// 向后兼容的导出（保持旧的命名）
export { default as TaskNodeRepository } from './WorkflowTaskNodeRepository.js';
export type { IWorkflowTaskNodeRepository as ITaskNodeRepository } from './WorkflowTaskNodeRepository.js';

export { default as ExecutionLogRepository } from './WorkflowExecutionLogRepository.js';
export type { IWorkflowExecutionLogRepository as IExecutionLogRepository } from './WorkflowExecutionLogRepository.js';

// 重新导出数据库类型
export type {
  ExecutionLog,
  NewExecutionLog,
  NewTaskNode,
  NewWorkflowAssignment,
  NewWorkflowDefinitionTable,
  NewWorkflowEngineInstance,
  NewWorkflowExecutionLog,
  NewWorkflowFailoverEvent,
  NewWorkflowInstanceTable,
  NewWorkflowLock,
  NewWorkflowNodeAssignment,
  NewWorkflowSchedule,
  NewWorkflowTaskNode,
  // 向后兼容的类型别名
  TaskNode,
  TaskNodeUpdate,
  // 数据库接口
  TasksDatabase,
  // 工作流分配记录相关
  WorkflowAssignment,
  WorkflowAssignmentUpdate,
  // 工作流定义相关 - 数据库表类型
  WorkflowDefinitionTable,
  WorkflowDefinitionTableUpdate,
  // 工作流引擎实例相关
  WorkflowEngineInstance,
  WorkflowEngineInstanceUpdate,
  // 工作流执行日志相关
  WorkflowExecutionLog,
  WorkflowExecutionLogUpdate,
  // 工作流故障转移事件相关
  WorkflowFailoverEvent,
  WorkflowFailoverEventUpdate,
  // 工作流实例相关 - 数据库表类型
  WorkflowInstanceTable,
  WorkflowInstanceTableUpdate,
  // 工作流锁相关
  WorkflowLock,
  WorkflowLockUpdate,
  // 工作流节点分配记录相关
  WorkflowNodeAssignment,
  WorkflowNodeAssignmentUpdate,
  // 工作流调度相关
  WorkflowSchedule,
  WorkflowScheduleUpdate,
  // 工作流任务节点相关
  WorkflowTaskNode,
  WorkflowTaskNodeUpdate
} from '../types/database.js';
