/**
 * 工作流相关类型定义
 * 基于 packages/tasks/src/controllers/ 的接口定义
 * 与tasks库保持一致
 */

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 工作流节点类型
 */
export type WorkflowNodeType =
  | 'start'
  | 'end'
  | 'task'
  | 'condition'
  | 'parallel'
  | 'merge'
  | 'script'
  | 'http'
  | 'timer'
  | 'delay'
  | 'webhook'

/**
 * 工作流节点定义
 */
export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  name: string
  description?: string
  config?: Record<string, any>
  position?: { x: number; y: number }
}

/**
 * 工作流边定义
 */
export interface WorkflowEdge {
  id: string
  source: string
  target: string
  condition?: string
  label?: string
}

/**
 * 工作流定义 - 与tasks库WorkflowDefinition保持一致
 */
export interface WorkflowDefinition {
  id?: number
  name: string
  description?: string
  version: string
  nodes: any[]
  inputs?: any[]
  outputs?: any[]
  config?: Record<string, any>
  tags?: string[]
  category?: string
  status?: 'draft' | 'active' | 'deprecated' | 'archived'
  enabled?: boolean
  definition?: {
    nodes?: WorkflowNode[]
    edges?: WorkflowEdge[]
    inputs?: any[]
    outputs?: any[]
  }
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * 工作流实例 - 与tasks库WorkflowInstance保持一致
 */
export interface WorkflowInstance {
  id: number
  workflowDefinitionId: number
  name: string
  externalId?: string
  status: WorkflowStatus
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  contextData?: Record<string, any>
  businessKey?: string
  mutexKey?: string
  startedAt?: string
  completedAt?: string
  pausedAt?: string
  errorMessage?: string
  errorDetails?: Record<string, any>
  retryCount?: number
  maxRetries?: number
  priority?: number
  scheduledAt?: string
  currentNodeId?: string
  currentNode?: string // 兼容性别名
  completedNodes?: string[]
  failedNodes?: string[]
  executionPath?: string[] // 执行路径
  lockOwner?: string
  workflowDefinition?: WorkflowDefinition // 关联的工作流定义
  lockAcquiredAt?: string
  lockExpiresAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * 工作流执行日志 - 与tasks库ExecutionLog保持一致
 */
export interface WorkflowExecutionLog {
  id: number
  workflowInstanceId: number
  taskNodeId?: number
  nodeId?: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  details?: Record<string, any>
  engineInstanceId?: string
  timestamp: string
  createdAt: string
}

/**
 * 分页响应 - 与tasks库保持一致
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * API 响应格式 - 与tasks库保持一致
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  timestamp: string
  requestId?: string
}

/**
 * 创建工作流定义请求 - 与tasks库保持一致
 */
export interface CreateWorkflowDefinitionRequest {
  name: string
  description?: string
  version: string
  nodes: any[]
  inputs?: any[]
  outputs?: any[]
  config?: Record<string, any>
  tags?: string[]
  category?: string
  createdBy?: string
}

/**
 * 更新工作流定义请求 - 与tasks库保持一致
 */
export interface UpdateWorkflowDefinitionRequest {
  description?: string
  nodes?: any[]
  inputs?: any[]
  outputs?: any[]
  config?: Record<string, any>
  tags?: string[]
  category?: string
  enabled?: boolean
}

/**
 * 创建工作流实例请求 - 与tasks库保持一致
 */
export interface CreateWorkflowInstanceRequest {
  workflowDefinitionId: number
  name: string
  externalId?: string
  inputData?: Record<string, any>
  businessKey?: string
  mutexKey?: string
  priority?: number
  scheduledAt?: string
}

/**
 * 工作流实例查询参数 - 与tasks库保持一致
 */
export interface WorkflowInstanceQueryParams {
  page?: number
  pageSize?: number
  workflowDefinitionId?: number
  status?: WorkflowStatus
  businessKey?: string
  mutexKey?: string
  priority?: number
  startTime?: string
  endTime?: string
  search?: string
  workflowDefinitionName?: string
  sortBy?: 'id' | 'name' | 'status' | 'priority' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  // 新增：是否按流程分组
  groupByWorkflow?: boolean
  // 新增：是否只返回根实例（external_id为空）
  rootInstancesOnly?: boolean
}

/**
 * 流程分组查询参数
 */
export interface WorkflowGroupQueryParams {
  page?: number
  pageSize?: number
  status?: WorkflowStatus
  search?: string
  workflowDefinitionName?: string
  sortBy?: 'name' | 'instanceCount' | 'latestActivity' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 执行日志查询参数 - 与tasks库保持一致
 */
export interface ExecutionLogQueryParams {
  page?: number
  pageSize?: number
  workflowInstanceId?: number
  taskNodeId?: number
  nodeId?: string
  level?: 'debug' | 'info' | 'warn' | 'error'
  engineInstanceId?: string
  startTime?: string
  endTime?: string
  keyword?: string
  sortBy?: 'id' | 'timestamp' | 'level'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 工作流定义查询参数 - 与tasks库保持一致
 */
export interface WorkflowDefinitionQueryParams {
  page?: number
  pageSize?: number
  status?: 'draft' | 'active' | 'deprecated' | 'archived'
  category?: string
  search?: string
  tags?: string
  createdBy?: string
  isActive?: boolean
  sortBy?: 'name' | 'version' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 系统健康检查响应
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  components: Record<string, 'up' | 'down'>
  metrics: {
    activeWorkflows: number
    pendingWorkflows: number
    failedWorkflows: number
    totalWorkflows: number
    uptime: number
    cpuUsage: number
    memoryUsage: number
  }
}

/**
 * 工作流统计信息
 */
export interface WorkflowStats {
  totalDefinitions: number
  activeDefinitions: number
  totalInstances: number
  runningInstances: number
  completedInstances: number
  failedInstances: number
  successRate: number
  avgExecutionTime: number
  lastUpdated: string
}

/**
 * 工作流定时任务
 */
export interface WorkflowSchedule {
  id: number
  workflowDefinitionId: number
  name: string
  cronExpression: string
  timezone: string
  isEnabled: boolean
  nextRunAt: string | null
  lastRunAt: string | null
  maxInstances: number
  inputData: Record<string, any> | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  workflowDefinition?: {
    id: number
    name: string
    version: number
  }
}

/**
 * 工作流状态颜色映射
 */
export const workflowStatusColors = {
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
}

/**
 * 工作流状态中文标签
 */
export const workflowStatusLabels = {
  pending: '等待中',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
}

/**
 * 流程分组项 - 用于流程级别的聚合显示
 */
export interface WorkflowGroup {
  /** 工作流定义ID */
  workflowDefinitionId: number
  /** 工作流定义名称 */
  workflowDefinitionName: string
  /** 工作流定义描述 */
  workflowDefinitionDescription?: string
  /** 工作流定义版本 */
  workflowDefinitionVersion?: string
  /** 该流程下的根实例数量 */
  rootInstanceCount: number
  /** 该流程下的总实例数量（包括子实例） */
  totalInstanceCount: number
  /** 运行中的实例数量 */
  runningInstanceCount: number
  /** 已完成的实例数量 */
  completedInstanceCount: number
  /** 失败的实例数量 */
  failedInstanceCount: number
  /** 最新活动时间 */
  latestActivity?: string
  /** 最新实例状态 */
  latestInstanceStatus?: WorkflowStatus
  /** 根实例列表（当展开时） */
  rootInstances?: WorkflowInstance[]
  /** 是否已展开 */
  expanded?: boolean
}

/**
 * 流程分组响应
 */
export interface WorkflowGroupResponse {
  groups: WorkflowGroup[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
