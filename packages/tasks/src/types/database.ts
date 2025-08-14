/**
 * Tasks插件数据库类型定义
 *
 * 定义所有数据库表的类型，用于Kysely ORM
 * 版本: v3.0.0-refactored
 */

/**
 * 工作流定义表
 */
export interface WorkflowDefinitionsTable {
  id: number;
  name: string;
  version: string;
  display_name: string | null;
  description: string | null;
  definition: any; // JSON类型
  category: string | null;
  tags: any | null; // JSON数组
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
 * 节点实例表
 */
export interface WorkflowNodeInstancesTable {
  id: number;
  workflow_instance_id: number;
  node_id: string;
  node_name: string;
  node_type: 'simple' | 'loop' | 'parallel' | 'subprocess';
  executor: string | null;
  executor_config: any | null; // JSON类型
  status: 'pending' | 'running' | 'completed' | 'failed' | 'failed_retry';

  // 输入输出数据
  input_data: any | null; // JSON类型
  output_data: any | null; // JSON类型

  // 错误信息
  error_message: string | null;
  error_details: any | null; // JSON类型

  // 执行时间
  started_at: Date | null;
  completed_at: Date | null;
  duration_ms: number | null;

  // 重试配置
  retry_count: number;
  max_retries: number;

  // 层次结构（用于循环、并行等复杂节点）
  parent_node_id: number | null;
  child_index: number | null;

  // 循环节点特有字段
  loop_progress: any | null; // JSON类型
  loop_total_count: number | null;
  loop_completed_count: number;

  // 并行节点特有字段
  parallel_group_id: string | null;
  parallel_index: number | null;

  // 创建信息
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
 * Tasks数据库接口
 */
export interface TasksDatabase {
  workflow_definitions: WorkflowDefinitionsTable;
  workflow_instances: WorkflowInstancesTable;
  workflow_node_instances: WorkflowNodeInstancesTable;
  workflow_execution_locks: WorkflowExecutionLocksTable;
  workflow_execution_logs: WorkflowExecutionLogsTable;
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
