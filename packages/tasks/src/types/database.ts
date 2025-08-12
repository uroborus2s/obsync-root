/**
 * Tasks插件数据库类型定义
 *
 * 定义所有数据库表的类型，用于Kysely ORM
 * 版本: v3.0.0-portable
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
    | 'paused'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'timeout';
  input_data: any | null; // JSON类型
  output_data: any | null; // JSON类型
  context_data: any | null; // JSON类型

  // 添加专门的业务键字段，替代虚拟列
  business_key: string | null;
  mutex_key: string | null;

  started_at: Date | null;
  completed_at: Date | null;
  paused_at: Date | null;
  error_message: string | null;
  error_details: any | null; // JSON类型
  retry_count: number;
  max_retries: number;
  priority: number;
  scheduled_at: Date | null;
  current_node_id: string | null;
  completed_nodes: any | null; // JSON类型
  failed_nodes: any | null; // JSON类型
  lock_owner: string | null;
  lock_acquired_at: Date | null;
  last_heartbeat: Date | null;
  assigned_engine_id: string | null;
  assignment_strategy: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * 工作流任务节点表
 */
export interface WorkflowTaskNodesTable {
  id: number;
  workflow_instance_id: number;
  node_id: string;
  node_name: string;
  node_type:
    | 'task'
    | 'loop'
    | 'parallel'
    | 'condition'
    | 'subprocess'
    | 'start'
    | 'end';
  executor: string | null;
  executor_config: any | null; // JSON类型
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'skipped'
    | 'cancelled';
  input_data: any | null; // JSON类型
  output_data: any | null; // JSON类型
  error_message: string | null;
  error_details: any | null; // JSON类型
  started_at: Date | null;
  completed_at: Date | null;
  duration_ms: number | null;
  retry_count: number;
  max_retries: number;
  depends_on: any | null; // JSON数组
  parent_node_id: number | null;
  parallel_group_id: string | null;
  parallel_index: number | null;
  is_dynamic_task: boolean;
  dynamic_source_data: any | null; // JSON类型
  assigned_engine_id: string | null;
  assignment_strategy: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * 工作流执行日志表
 */
export interface WorkflowExecutionLogsTable {
  id: number;
  workflow_instance_id: number | null;
  task_node_id: number | null;
  node_id: string | null;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details: any | null; // JSON类型
  engine_instance_id: string | null;
  timestamp: Date;
}

/**
 * 分布式锁表
 */
export interface WorkflowLocksTable {
  id: number;
  lock_key: string;
  owner: string;
  lock_type: 'workflow' | 'node' | 'resource';
  expires_at: Date;
  lock_data: any | null; // JSON类型
  created_at: Date;
  updated_at: Date;
}

/**
 * 工作流引擎实例表
 */
export interface WorkflowEngineInstancesTable {
  id: number;
  instance_id: string;
  hostname: string;
  process_id: number;
  status: 'active' | 'inactive' | 'maintenance';
  load_info: any; // JSON类型：{activeWorkflows, cpuUsage, memoryUsage}
  supported_executors: any; // JSON类型：支持的执行器列表
  started_at: Date;
  last_heartbeat: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * 工作流分配记录表
 */
export interface WorkflowAssignmentsTable {
  id: number;
  workflow_instance_id: number;
  assigned_engine_id: string;
  assignment_strategy: string;
  assignment_reason: string | null;
  assigned_at: Date;
  completed_at: Date | null;
  status: 'assigned' | 'running' | 'completed' | 'failed' | 'transferred';
  created_at: Date;
  updated_at: Date;
}

/**
 * 工作流节点分配记录表
 */
export interface WorkflowNodeAssignmentsTable {
  id: number;
  workflow_instance_id: number;
  node_id: string;
  task_node_id: number | null;
  assigned_engine_id: string;
  required_capabilities: any | null; // JSON类型
  assignment_strategy: string;
  estimated_duration: number | null;
  assigned_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  status: 'assigned' | 'running' | 'completed' | 'failed' | 'transferred';
  created_at: Date;
  updated_at: Date;
}

/**
 * 工作流故障转移事件表
 */
export interface WorkflowFailoverEventsTable {
  id: number;
  event_id: string;
  failed_engine_id: string;
  takeover_engine_id: string;
  affected_workflows: any; // JSON类型：受影响的工作流实例列表
  affected_nodes: any; // JSON类型：受影响的节点列表
  failover_reason: string;
  failover_at: Date;
  recovery_completed_at: Date | null;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
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
  max_instances: number;
  input_data: any | null; // JSON类型
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Tasks数据库接口
 */
export interface TasksDatabase {
  workflow_definitions: WorkflowDefinitionsTable;
  workflow_instances: WorkflowInstancesTable;
  workflow_task_nodes: WorkflowTaskNodesTable;
  workflow_locks: WorkflowLocksTable;
  workflow_engine_instances: WorkflowEngineInstancesTable;
  workflow_assignments: WorkflowAssignmentsTable;
  workflow_node_assignments: WorkflowNodeAssignmentsTable;
  workflow_failover_events: WorkflowFailoverEventsTable;
  workflow_execution_logs: WorkflowExecutionLogsTable;
  workflow_schedules: WorkflowSchedulesTable;
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

export type WorkflowTaskNode = WorkflowTaskNodesTable;
export type NewWorkflowTaskNode = Omit<
  WorkflowTaskNodesTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowTaskNodeUpdate = Partial<
  Omit<WorkflowTaskNodesTable, 'id' | 'created_at'>
>;

export type WorkflowExecutionLog = WorkflowExecutionLogsTable;
export type NewWorkflowExecutionLog = Omit<WorkflowExecutionLogsTable, 'id'>;
export type WorkflowExecutionLogUpdate = Partial<
  Omit<WorkflowExecutionLogsTable, 'id'>
>;

export type WorkflowLock = WorkflowLocksTable;
export type NewWorkflowLock = Omit<
  WorkflowLocksTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowLockUpdate = Partial<
  Omit<WorkflowLocksTable, 'id' | 'created_at'>
>;

export type WorkflowEngineInstance = WorkflowEngineInstancesTable;
export type NewWorkflowEngineInstance = Omit<
  WorkflowEngineInstancesTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowEngineInstanceUpdate = Partial<
  Omit<WorkflowEngineInstancesTable, 'id' | 'created_at'>
>;

export type WorkflowAssignment = WorkflowAssignmentsTable;
export type NewWorkflowAssignment = Omit<
  WorkflowAssignmentsTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowAssignmentUpdate = Partial<
  Omit<WorkflowAssignmentsTable, 'id' | 'created_at'>
>;

export type WorkflowNodeAssignment = WorkflowNodeAssignmentsTable;
export type NewWorkflowNodeAssignment = Omit<
  WorkflowNodeAssignmentsTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowNodeAssignmentUpdate = Partial<
  Omit<WorkflowNodeAssignmentsTable, 'id' | 'created_at'>
>;

export type WorkflowFailoverEvent = WorkflowFailoverEventsTable;
export type NewWorkflowFailoverEvent = Omit<
  WorkflowFailoverEventsTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowFailoverEventUpdate = Partial<
  Omit<WorkflowFailoverEventsTable, 'id' | 'created_at'>
>;

export type WorkflowSchedule = WorkflowSchedulesTable;
export type NewWorkflowSchedule = Omit<
  WorkflowSchedulesTable,
  'id' | 'created_at' | 'updated_at'
>;
export type WorkflowScheduleUpdate = Partial<
  Omit<WorkflowSchedulesTable, 'id' | 'created_at'>
>;

// 向后兼容的类型别名
export type TaskNode = WorkflowTaskNode;
export type NewTaskNode = NewWorkflowTaskNode;
export type TaskNodeUpdate = WorkflowTaskNodeUpdate;
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
