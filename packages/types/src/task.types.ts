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
  COMPLETED = 'completed',
}

/**
 * 运行中任务接口
 */
export interface RunningTask {
  /** 任务ID */
  id: string
  /** 父任务ID */
  parent_id: string | null
  /** 任务名称 */
  name: string
  /** 任务描述 */
  description: string | null
  /** 任务类型 */
  task_type: string
  /** 任务状态 */
  status: TaskStatus
  /** 优先级 */
  priority: number
  /** 进度百分比(0-100) */
  progress: number
  /** 执行器名称 */
  executor_name: string | null
  /** 任务元数据 */
  metadata: Record<string, unknown> | null
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
  /** 开始时间 */
  started_at: string | null
  /** 完成时间 */
  completed_at: string | null
  /** 子任务列表 */
  children?: RunningTask[]
}

/**
 * 完成任务接口
 */
export interface CompletedTask {
  /** 任务ID */
  id: string
  /** 父任务ID */
  parent_id: string | null
  /** 任务名称 */
  name: string
  /** 任务描述 */
  description: string | null
  /** 任务类型 */
  task_type: string
  /** 最终状态 */
  status: TaskStatus
  /** 优先级 */
  priority: number
  /** 最终进度 */
  progress: number
  /** 执行器名称 */
  executor_name: string | null
  /** 任务元数据 */
  metadata: Record<string, unknown> | null
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
  /** 开始时间 */
  started_at: string | null
  /** 完成时间 */
  completed_at: string
}

/**
 * 任务统计信息
 */
export interface TaskStats {
  /** 总数 */
  total: number
  /** 等待中 */
  pending: number
  /** 运行中 */
  running: number
  /** 暂停 */
  paused: number
  /** 成功 */
  success: number
  /** 失败 */
  failed: number
}

/**
 * 任务配置接口
 */
export interface TaskConfig {
  /** 任务类型 */
  task_type: string
  /** 执行策略 */
  execution_strategy?: 'immediate' | 'scheduled' | 'manual'
  /** 重试次数 */
  retry_count?: number
  /** 超时时间(秒) */
  timeout?: number
  /** 同步范围 */
  sync_scope?: {
    /** 学年学期 */
    xnxq?: string
    /** 开课号 */
    kkh?: string[]
    /** 日期范围 */
    date_range?: {
      start: string
      end: string
    }
  }
  /** 调度配置 */
  schedule_config?: {
    /** cron表达式 */
    cron?: string
    /** 时区 */
    timezone?: string
  }
}

/**
 * 任务创建请求
 */
export interface CreateTaskRequest {
  /** 任务名称 */
  name: string
  /** 任务描述 */
  description?: string
  /** 任务类型 */
  task_type: string
  /** 优先级 */
  priority?: number
  /** 执行器名称 */
  executor_name?: string
  /** 任务元数据 */
  metadata?: Record<string, unknown>
  /** 任务配置 */
  config?: TaskConfig
}

/**
 * 任务更新请求
 */
export interface UpdateTaskRequest {
  /** 任务名称 */
  name?: string
  /** 任务描述 */
  description?: string
  /** 任务状态 */
  status?: TaskStatus
  /** 优先级 */
  priority?: number
  /** 进度 */
  progress?: number
  /** 任务元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 任务查询参数
 */
export interface TaskQueryParams {
  /** 任务状态 */
  status?: TaskStatus[]
  /** 任务类型 */
  task_type?: string[]
  /** 执行器名称 */
  executor_name?: string
  /** 创建时间范围 */
  created_from?: string
  created_to?: string
  /** 页码 */
  page?: number
  /** 每页大小 */
  page_size?: number
  /** 排序字段 */
  sort_by?: string
  /** 排序顺序 */
  sort_order?: 'asc' | 'desc'
  /** 是否包含子任务 */
  include_children?: boolean
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[]
  /** 总数 */
  total: number
  /** 当前页 */
  page: number
  /** 每页大小 */
  page_size: number
  /** 总页数 */
  total_pages: number
  /** 是否有下一页 */
  has_next: boolean
  /** 是否有上一页 */
  has_prev: boolean
}
