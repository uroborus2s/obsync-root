/**
 * Tasks插件业务类型定义
 *
 * 定义工作流业务逻辑相关的类型
 * 版本: v3.0.0-refactored
 */

/**
 * 工作流选项
 */
export interface WorkflowOptions {
  /** 业务键，用于业务实例锁检查 */
  businessKey?: string;
  /** 互斥键，用于互斥锁检查 */
  mutexKey?: string;
  /** 输入数据 */
  inputData?: any;
  /** 上下文数据 */
  contextData?: any;
  /** 检查点函数 */
  checkpointFunctions?: Record<string, (context: any) => Promise<boolean>>;
  /** 是否恢复中断的实例 */
  resume?: boolean;
  /** 工作流名称（与version一起使用时，优先于definitionsId） */
  workflowName?: string;
  /** 工作流版本（与workflowName一起使用） */
  workflowVersion?: string;
  /** 是否使用活跃版本（当只提供workflowName时） */
  useActiveVersion?: boolean;
}

/**
 * 工作流实例状态
 */
export type WorkflowInstanceStatus =
  | 'pending' // 待执行
  | 'running' // 执行中
  | 'interrupted' // 中断
  | 'completed' // 完成
  | 'failed' // 失败
  | 'cancelled'; // 取消

/**
 * 执行结果
 */
export interface ExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 错误详情 */
  errorDetails?: any;
  /** 执行时长（毫秒） */
  duration?: number;
}

/**
 * 工作流实例
 */
export interface WorkflowInstance {
  id: number;
  workflowDefinitionId: number;
  name: string;
  externalId?: string;
  status: WorkflowInstanceStatus;
  instanceType: string;
  inputData?: any;
  outputData?: any;
  contextData?: any;
  businessKey?: string;
  mutexKey?: string;
  startedAt?: Date;
  completedAt?: Date;
  interruptedAt?: Date;
  errorMessage?: string;
  errorDetails?: any;
  retryCount: number;
  maxRetries: number;
  currentNodeId?: string;
  checkpointData?: any;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工作流定义
 */

/**
 * 循环进度状态
 */
export interface LoopProgress {
  /** 循环状态：creating-创建中，executing-执行中，completed-完成 */
  status: 'creating' | 'executing' | 'completed';
  /** 总数 */
  totalCount: number;
  /** 已完成数 */
  completedCount: number;
  /** 失败数 */
  failedCount: number;
  /** 当前批次索引 */
  currentBatchIndex?: number;
  /** 批次大小 */
  batchSize?: number;
}

/**
 * 服务结果包装器
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorDetails?: any;
}

/**
 * 分页查询参数
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 查询过滤器
 */
export interface QueryFilters {
  status?: WorkflowInstanceStatus | WorkflowInstanceStatus[];
  instanceType?: string;
  businessKey?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * 通用查询选项
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页结果类型
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 工作流实例查询选项
 */
export interface WorkflowInstanceQueryOptions extends QueryOptions {
  includeCompleted?: boolean;
  includeFailed?: boolean;
  priority?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 统一的工作流实例过滤器
 */
export interface UnifiedWorkflowInstanceFilters {
  // 基础过滤
  status?: WorkflowInstanceStatus | WorkflowInstanceStatus[];
  workflowDefinitionId?: number;
  name?: string;
  externalId?: string;
  businessKey?: string;
  createdBy?: string;
  assignedEngineId?: string;
  instanceType?: string;

  // 时间范围过滤
  createdAt?: { from?: Date; to?: Date };
  startedAt?: { from?: Date; to?: Date };
  completedAt?: { from?: Date; to?: Date };

  // 标签和优先级
  tags?: string[];
  priority?: number;

  // 分页和排序
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
