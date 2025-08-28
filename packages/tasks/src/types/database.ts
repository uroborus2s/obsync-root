/**
 * Tasks插件数据库类型定义
 *
 * 定义所有数据库表的类型，用于Kysely ORM
 * 版本: v3.0.0-refactored
 */

import type { WorkflowDefinitionData } from './workflow.js';

/**
 * 工作流定义表
 */
export interface WorkflowDefinitionsTable {
  id: number;
  name: string;
  version: string;
  display_name: string | null;
  description: string | null;
  /** 工作流定义结构（JSON类型，具体结构见 WorkflowDefinitionStructure） */
  definition: WorkflowDefinitionData;
  category: string | null;
  /** 标签数组（JSON类型） */
  tags: string[] | null;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  is_active: boolean;
  timeout_seconds: number | null;
  max_retries: number;
  retry_delay_seconds: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * 工作流实例表
 */
export interface WorkflowInstancesTable {
  id: number;
  workflow_definition_id: number;
  name: string;
  external_id: string | null;
  status:
    | 'pending'
    | 'running'
    | 'interrupted'
    | 'completed'
    | 'failed'
    | 'cancelled';
  instance_type: string;
  input_data: any | null; // JSON类型
  output_data: any | null; // JSON类型
  context_data: any | null; // JSON类型

  // 业务键字段，用于业务实例锁检查
  business_key: string | null;
  mutex_key: string | null;

  // 执行时间相关
  started_at: Date | null;
  completed_at: Date | null;
  interrupted_at: Date | null;

  // 错误信息
  error_message: string | null;
  error_details: any | null; // JSON类型

  // 重试配置
  retry_count: number;
  max_retries: number;

  // 当前执行状态
  current_node_id: string | null;
  checkpoint_data: any | null; // JSON类型

  // 创建信息
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * 节点实例表（统一后的结构）
 */
export interface WorkflowNodeInstancesTable {
  // === 实例标识 ===
  id: number;
  workflow_instance_id: number;

  // === 节点标识 ===
  node_id: string;
  node_name: string;
  node_description: string | null; // 新增：节点描述
  node_type: 'simple' | 'task' | 'loop' | 'parallel' | 'subprocess'; // 扩展：支持 task 类型

  // === 执行配置 ===
  executor: string | null;
  input_data: any | null; // JSON类型 - 统一的输入数据源
  timeout_seconds: number | null; // 新增：超时时间
  max_retries: number;
  retry_delay_seconds: number | null; // 新增：重试延迟
  execution_condition: string | null; // 新增：条件表达式

  // === 执行状态 ===
  status: 'pending' | 'running' | 'completed' | 'failed' | 'failed_retry';
  started_at: Date | null;
  completed_at: Date | null;
  duration_ms: number | null;

  // === 执行结果 ===
  output_data: any | null; // JSON类型
  error_message: string | null;
  error_details: any | null; // JSON类型

  // === 重试控制 ===
  retry_count: number;

  // === 层次结构（用于循环、并行等复杂节点） ===
  parent_node_id: number | null;
  child_index: number | null;

  // === 循环节点特有字段 ===
  loop_progress: any | null; // JSON类型
  loop_total_count: number | null;
  loop_completed_count: number;

  // === 并行节点特有字段 ===
  parallel_group_id: string | null;
  parallel_index: number | null;

  // === 审计字段 ===
  created_at: Date;
  updated_at: Date;
}

/**
 * 执行锁表
 */
export interface WorkflowExecutionLocksTable {
  id: number;
  lock_key: string;
  lock_type: 'workflow' | 'instance';
  owner: string;
  expires_at: Date;
  lock_data: any | null; // JSON类型
  created_at: Date;
  updated_at: Date;
}

/**
 * 工作流执行日志表
 */
export interface WorkflowExecutionLogsTable {
  id: number;
  workflow_instance_id: number | null;
  node_instance_id: number | null;
  node_id: string | null;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details: any | null; // JSON类型
  timestamp: Date;
}

/**
 * 定时任务配置表 (重构为执行器模式)
 */
export interface WorkflowSchedulesTable {
  id: number;
  name: string;
  executor_name: string;
  workflow_definition_id: number | null; // 兼容性保留
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  input_data: any | null; // JSON类型 - 统一的输入数据源
  context_data: any | null; // JSON类型
  business_key: string | null;
  mutex_key: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * 定时任务执行历史表
 */
export interface WorkflowScheduleExecutionsTable {
  id: number;
  schedule_id: number;
  workflow_instance_id: number | null;
  status: 'success' | 'failed' | 'timeout' | 'running';
  started_at: Date;
  completed_at: Date | null;
  duration_ms: number | null;
  error_message: string | null;
  trigger_time: Date;
  created_at: Date;
}

/**
 * Tasks数据库接口
 */
export interface TasksDatabase {
  workflow_definitions: WorkflowDefinitionsTable;
  workflow_instances: WorkflowInstancesTable;
  workflow_node_instances: WorkflowNodeInstancesTable;
  workflow_execution_locks: WorkflowExecutionLocksTable;
  workflow_execution_logs: WorkflowExecutionLogsTable;
  workflow_schedules: WorkflowSchedulesTable;
  workflow_schedule_executions: WorkflowScheduleExecutionsTable;
}

// 导出便捷类型别名 - 使用明确的数据库表类型名称避免与业务接口冲突
export type WorkflowDefinitionTable = WorkflowDefinitionsTable;
export type NewWorkflowDefinitionTable = Omit<
  WorkflowDefinitionsTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowDefinitionTableUpdate = Partial<
  Omit<WorkflowDefinitionsTable, 'id' | 'created_at'>
>;

export type WorkflowInstanceTable = WorkflowInstancesTable;
export type NewWorkflowInstanceTable = Omit<
  WorkflowInstancesTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowInstanceTableUpdate = Partial<
  Omit<WorkflowInstancesTable, 'id' | 'created_at'>
>;

export type WorkflowNodeInstance = WorkflowNodeInstancesTable;
export type NewWorkflowNodeInstance = Omit<
  WorkflowNodeInstancesTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowNodeInstanceUpdate = Partial<
  Omit<WorkflowNodeInstancesTable, 'id' | 'created_at'>
>;

export type WorkflowExecutionLock = WorkflowExecutionLocksTable;
export type NewWorkflowExecutionLock = Omit<
  WorkflowExecutionLocksTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowExecutionLockUpdate = Partial<
  Omit<WorkflowExecutionLocksTable, 'id' | 'created_at'>
>;

export type WorkflowExecutionLog = WorkflowExecutionLogsTable;
export type NewWorkflowExecutionLog = Omit<WorkflowExecutionLogsTable, 'id'>;
export type WorkflowExecutionLogUpdate = Partial<
  Omit<WorkflowExecutionLogsTable, 'id'>
>;

export type WorkflowSchedule = WorkflowSchedulesTable;
export type NewWorkflowSchedule = Omit<
  WorkflowSchedulesTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowScheduleUpdate = Partial<
  Omit<WorkflowSchedulesTable, 'id' | 'created_at'>
>;

export type WorkflowScheduleExecution = WorkflowScheduleExecutionsTable;
export type NewWorkflowScheduleExecution = Omit<
  WorkflowScheduleExecutionsTable,
  'id' | 'created_at'
>;
export type WorkflowScheduleExecutionUpdate = Partial<
  Omit<WorkflowScheduleExecutionsTable, 'id' | 'created_at'>
>;

// 向后兼容的类型别名
export type NodeInstance = WorkflowNodeInstance;
export type NewNodeInstance = NewWorkflowNodeInstance;
export type NodeInstanceUpdate = WorkflowNodeInstanceUpdate;
export type ExecutionLog = WorkflowExecutionLog;
export type NewExecutionLog = NewWorkflowExecutionLog;

/**
 * 仓储操作结果类型
 */
export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorDetails?: any;
}
