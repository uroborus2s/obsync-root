/**
 * Tasks插件数据库类型定义
 *
 * 定义所有数据库表的类型，用于Kysely ORM
 */

/**
 * 工作流定义表
 */
export interface WorkflowDefinitionsTable {
  id: number;
  name: string;
  description: string | null;
  version: string;
  definition: any; // JSON类型
  config: any | null; // JSON类型
  status: string;
  is_active: boolean;
  tags: any | null; // JSON数组
  category: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 工作流实例表
 */
export interface WorkflowInstancesTable {
  id: number;
  workflow_definition_id: number;
  name: string | null;
  external_id: string | null;
  status: string;
  input_data: any | null; // JSON类型
  output_data: any | null; // JSON类型
  context_data: any | null; // JSON类型
  started_at: Date | null;
  completed_at: Date | null;
  paused_at: Date | null;
  error_message: string | null;
  error_details: any | null; // JSON类型
  retry_count: number;
  max_retries: number;
  priority: number;
  scheduled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * 任务节点表
 */
export interface TaskNodesTable {
  id: number;
  workflow_instance_id: number;
  node_key: string;
  node_name: string;
  node_type: string;
  executor_name: string | null;
  executor_config: any | null; // JSON类型
  status: string;
  input_data: any | null; // JSON类型
  output_data: any | null; // JSON类型
  parent_node_id: number | null;
  depends_on: any | null; // JSON数组
  parallel_group_id: string | null;
  parallel_index: number | null;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  error_details: any | null; // JSON类型
  retry_count: number;
  max_retries: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 执行日志表
 */
export interface ExecutionLogsTable {
  id: number;
  workflow_instance_id: number;
  task_node_id: number | null;
  log_level: string;
  message: string;
  details: any | null; // JSON类型
  executor_name: string | null;
  execution_phase: string | null;
  timestamp: Date;
}

/**
 * 工作流调度表
 */
export interface WorkflowSchedulesTable {
  id: number;
  workflow_definition_id: number;
  name: string;
  cron_expression: string | null;
  timezone: string;
  is_enabled: boolean;
  next_run_at: Date | null;
  last_run_at: Date | null;
  input_data: any | null; // JSON类型
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

/**
 * Tasks数据库接口
 */
export interface TasksDatabase {
  workflow_definitions: WorkflowDefinitionsTable;
  workflow_instances: WorkflowInstancesTable;
  task_nodes: TaskNodesTable;
  execution_logs: ExecutionLogsTable;
  workflow_schedules: WorkflowSchedulesTable;
}

// 导出便捷类型别名
export type WorkflowDefinition = WorkflowDefinitionsTable;
export type NewWorkflowDefinition = Omit<
  WorkflowDefinitionsTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowDefinitionUpdate = Partial<
  Omit<WorkflowDefinitionsTable, 'id' | 'created_at'>
>;

export type WorkflowInstance = WorkflowInstancesTable;
export type NewWorkflowInstance = Omit<
  WorkflowInstancesTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowInstanceUpdate = Partial<
  Omit<WorkflowInstancesTable, 'id' | 'created_at'>
>;

export type TaskNode = TaskNodesTable;
export type NewTaskNode = Omit<
  TaskNodesTable,
  'id' | 'created_at' | 'updated_at'
>;
export type TaskNodeUpdate = Partial<Omit<TaskNodesTable, 'id' | 'created_at'>>;

export type ExecutionLog = ExecutionLogsTable;
export type NewExecutionLog = Omit<ExecutionLogsTable, 'id'>;

export type WorkflowSchedule = WorkflowSchedulesTable;
export type NewWorkflowSchedule = Omit<
  WorkflowSchedulesTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowScheduleUpdate = Partial<
  Omit<WorkflowSchedulesTable, 'id' | 'created_at'>
>;

/**
 * 仓储操作结果类型
 */
export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorDetails?: any;
}
