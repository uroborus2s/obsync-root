/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

/**
 * 任务类型
 */
export type TaskType =
  | 'sync'
  | 'attendance'
  | 'aggregate'
  | 'teacher-schedule'
  | 'student-schedule'
  | 'full-sync'
  | 'incremental-sync'
  | 'cleanup'
  | 'notification'
  | 'export'
  | 'import'
  | 'validation'
  | 'other'

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

/**
 * 基础任务数据
 */
export interface TaskBase {
  id: string
  name: string
  description?: string
  task_type: TaskType | string
  status: TaskStatus
  priority?: number
  progress: number
  executor_name?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  started_at?: string | null
  completed_at?: string | null
}

/**
 * 运行中的任务
 */
export interface RunningTask extends TaskBase {
  parent_id?: string | null
  children: RunningTask[]
}

/**
 * 已完成的任务
 */
export interface CompletedTask extends TaskBase {
  parent_id?: string | null
  completed_at: string
  duration?: number
  result?: unknown
  error?: string
}

/**
 * 任务统计信息
 */
export interface TaskStats {
  total: number
  running: number
  pending: number
  paused: number
  success: number
  failed: number
  cancelled: number
  timeout: number
  last_updated: string
}

/**
 * 任务查询参数
 */
export interface TaskQueryParams {
  status?: TaskStatus | TaskStatus[] | string | string[]
  task_type?: TaskType | TaskType[] | string | string[]
  executor_name?: string
  created_from?: string
  created_to?: string
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  include_children?: boolean
  includeChildren?: boolean
  includeAncestors?: boolean
  limit?: number
  offset?: number
}

/**
 * 任务树查询参数
 */
export interface TaskTreeQueryParams {
  /** 返回的最大深度，默认为1（只返回根节点） */
  maxDepth?: number
  /** 是否包含占位符节点，默认为true */
  includePlaceholders?: boolean
  /** 分页大小，默认为20 */
  limit?: number
  /** 分页偏移量，默认为0 */
  offset?: number
  /** 状态过滤 */
  status?: TaskStatus | TaskStatus[] | string | string[]
}

/**
 * 任务树节点
 */
export interface TaskTreeNode {
  id: string
  name: string
  description?: string
  type?: TaskType | string
  status: TaskStatus
  progress: number
  parentId?: string | null
  executorConfig?: {
    name: string
    params?: Record<string, unknown>
    timeout?: number
    retries?: number
    retryDelay?: number
  }
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  startedAt?: string | null
  completedAt?: string | null
  isPlaceholder: boolean
  childrenCount: number
  children?: TaskTreeNode[]
}

/**
 * 任务树响应
 */
export interface TaskTreeResponse {
  nodes: TaskTreeNode[]
  total: number
  maxDepth: number
  hasMore: boolean
}

/**
 * 任务执行器配置
 */
export interface TaskExecutorConfig {
  name: string
  params?: Record<string, unknown>
  timeout?: number
  retries?: number
  retryDelay?: number
}

/**
 * 任务元数据
 */
export interface TaskMetadata {
  [key: string]: unknown
  xnxq?: string
  kkh?: string
  teacher_id?: string
  student_id?: string
  batch_size?: number
  sync_type?: 'full' | 'incremental'
}

/**
 * 创建任务请求
 */
export interface CreateTaskRequest {
  name: string
  description?: string
  type: TaskType | string
  parentId?: string
  autoStart?: boolean
  executorConfig?: TaskExecutorConfig
  metadata?: TaskMetadata
}

/**
 * 更新任务请求
 */
export interface UpdateTaskRequest {
  name?: string
  description?: string
  status?: TaskStatus
  priority?: number
  metadata?: TaskMetadata
}

/**
 * 增量同步请求
 */
export interface IncrementalSyncRequest {
  /** 学年学期 */
  xnxq: string
  /** 批量处理大小 */
  batchSize?: number
  /** 是否并行处理 */
  parallel?: boolean
  /** 最大并发数 */
  maxConcurrency?: number
}

/**
 * 增量同步状态
 */
export interface IncrementalSyncStatus {
  /** 任务ID */
  taskId?: string
  /** 学年学期 */
  xnxq: string
  /** 同步状态 */
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
  /** 开始时间 */
  startTime?: string
  /** 结束时间 */
  endTime?: string
  /** 总任务数 */
  totalTasks?: number
  /** 已完成任务数 */
  completedTasks?: number
  /** 失败任务数 */
  failedTasks?: number
  /** 进度百分比 */
  progress?: number
  /** 错误信息 */
  error?: string
  /** 统计信息 */
  statistics?: {
    totalCourses: number
    processedCourses: number
    teacherTasks: number
    studentTasks: number
    attendanceTables: number
    errors: string[]
  }
}

/**
 * 任务操作结果
 */
export interface TaskOperationResult {
  success: boolean
  message?: string
  data?: unknown
}
