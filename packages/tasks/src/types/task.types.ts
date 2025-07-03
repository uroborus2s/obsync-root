/**
 * 任务相关类型定义
 */

/**
 * 任务状态枚举 - 统一版本
 */
export enum TaskStatus {
  /** 待执行 */
  PENDING = 'pending',
  /** 运行中 */
  RUNNING = 'running',
  /** 已暂停 */
  PAUSED = 'paused',
  /** 成功完成 */
  SUCCESS = 'success',
  /** 执行失败 */
  FAILED = 'failed',
  /** 已取消 */
  CANCELLED = 'cancelled',
  /** 已完成（通用状态，包含成功、失败、取消） */
  COMPLETED = 'completed'
}

/**
 * 任务类型枚举
 */
export enum TaskType {
  /** 目录任务（只能包含子任务） */
  DIRECTORY = 'directory',
  /** 叶子任务（可执行具体操作） */
  LEAF = 'leaf'
}

/**
 * 任务执行器配置
 */
export interface TaskExecutorConfig {
  /** 执行器名称 */
  name: string;
  /** 执行器参数 */
  params?: Record<string, any> | ((object: any) => Record<string, any>);
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试间隔（毫秒） */
  retryDelay?: number;
}

/**
 * 任务元数据
 */
export interface TaskMetadata {
  /** 创建者 */
  createdBy?: string;
  /** 标签 */
  tags?: string[];
  /** 优先级 */
  priority?: number;
  /** 当前重试次数 */
  currentRetries?: number;
  /** 最后重试时间 */
  lastRetryAt?: Date;
  /** 重试历史记录 */
  retryHistory?: Array<{
    attemptNumber: number;
    timestamp: Date;
    reason: string;
    error?: string;
  }>;
  /** 自定义属性 */
  [key: string]: any;
}

/**
 * 任务基础信息
 */
export interface TaskBase {
  /** 任务ID */
  id: string;
  /** 父任务ID */
  parentId?: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 任务类型 */
  type: TaskType;
  /** 任务状态 */
  status: TaskStatus;
  /** 进度百分比 (0-100) */
  progress: number;
  /** 执行器配置 */
  executorConfig?: TaskExecutorConfig;
  /** 任务元数据 */
  metadata?: TaskMetadata;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
}

/**
 * 任务创建参数
 */
export interface CreateTaskParams {
  /** 父任务ID */
  parentId?: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 任务类型 */
  type: TaskType;
  /** 执行器配置 */
  executorConfig?: TaskExecutorConfig;
  /** 任务元数据 */
  metadata?: TaskMetadata;
  /** 是否自动启动（仅对目录任务有效，默认true） */
  autoStart?: boolean;
  /** 初始状态（内部使用） */
  initialStatus?: TaskStatus;
}

/**
 * 任务更新参数
 */
export interface UpdateTaskParams {
  /** 父任务ID */
  parentId?: string;
  /** 任务名称 */
  name?: string;
  /** 任务描述 */
  description?: string;
  /** 执行器配置 */
  executorConfig?: TaskExecutorConfig;
  /** 任务元数据 */
  metadata?: TaskMetadata;
}

/**
 * 任务查询参数
 */
export interface TaskQueryParams {
  /** 父任务ID */
  parentId?: string;
  /** 任务状态 */
  status?: TaskStatus | TaskStatus[];
  /** 任务类型 */
  type?: TaskType;
  /** 标签过滤 */
  tags?: string[];
  /** 分页偏移 */
  offset?: number;
  /** 分页大小 */
  limit?: number;
  /** 排序字段 */
  orderBy?: string;
  /** 排序方向 */
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * 任务统计信息
 */
export interface TaskStats {
  /** 总任务数 */
  total: number;
  /** 待执行任务数 */
  pending: number;
  /** 运行中任务数 */
  running: number;
  /** 已暂停任务数 */
  paused: number;
  /** 已完成任务数 */
  completed: number;
  /** 失败任务数 */
  failed: number;
  /** 已停止任务数 */
  stopped: number;
  /** 平均执行时间（毫秒） */
  avgExecutionTime: number;
  /** 成功率 */
  successRate: number;
}

/**
 * 任务树节点
 */
export interface TaskTreeNode extends TaskBase {
  /** 子任务列表 */
  children: TaskTreeNode[];
  /** 层级深度 */
  depth: number;
  /** 路径（从根到当前节点的ID路径） */
  path: string[];
}

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 任务执行函数类型
 */
export type TaskExecutorFunction = (
  task: TaskBase,
  params?: Record<string, any>
) => Promise<TaskExecutionResult>;

/**
 * 任务执行器注册信息
 */
export interface TaskExecutorRegistration {
  /** 执行器名称 */
  name: string;
  /** 执行器函数 */
  executor: TaskExecutorFunction;
  /** 执行器描述 */
  description?: string;
  /** 默认配置 */
  defaultConfig?: Record<string, any>;
}

/**
 * 任务状态工具类 - 新需求相关方法
 */
export class TaskStatusUtils {
  /**
   * 检查是否可以添加子任务（只有pending和running状态可以）
   */
  static canAddChild(status: TaskStatus): boolean {
    return status === TaskStatus.PENDING || status === TaskStatus.RUNNING;
  }

  /**
   * 检查任务是否已完成
   */
  static isCompleted(status: TaskStatus): boolean {
    return [
      TaskStatus.SUCCESS,
      TaskStatus.FAILED,
      TaskStatus.CANCELLED,
      TaskStatus.COMPLETED
    ].includes(status);
  }

  /**
   * 检查任务是否成功完成
   */
  static isSuccess(status: TaskStatus): boolean {
    return status === TaskStatus.SUCCESS;
  }

  /**
   * 检查任务是否失败
   */
  static isFailed(status: TaskStatus): boolean {
    return status === TaskStatus.FAILED;
  }

  /**
   * 检查任务是否正在运行
   */
  static isRunning(status: TaskStatus): boolean {
    return status === TaskStatus.RUNNING;
  }

  /**
   * 检查任务是否可以启动
   */
  static canStart(status: TaskStatus): boolean {
    return [TaskStatus.PENDING, TaskStatus.PAUSED].includes(status);
  }

  /**
   * 检查任务是否可以暂停
   */
  static canPause(status: TaskStatus): boolean {
    return status === TaskStatus.RUNNING;
  }

  /**
   * 检查任务是否可以恢复
   */
  static canResume(status: TaskStatus): boolean {
    return status === TaskStatus.PAUSED;
  }

  /**
   * 检查任务是否可以取消
   */
  static canCancel(status: TaskStatus): boolean {
    return [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.PAUSED].includes(
      status
    );
  }

  /**
   * 检查任务是否可以重试
   */
  static canRetry(status: TaskStatus): boolean {
    return status === TaskStatus.FAILED;
  }
}

/**
 * 批量创建任务参数
 */
export interface BatchCreateTaskParams {
  /** 要创建的任务列表 */
  tasks: CreateTaskParams[];
  /** 批量创建选项 */
  options?: BatchCreateOptions;
}

/**
 * 批量创建选项
 */
export interface BatchCreateOptions {
  /** 是否在单个任务验证失败时继续处理其他任务，默认false（全部验证通过才创建） */
  continueOnError?: boolean;
  /** 是否验证父子关系，默认true */
  validateRelations?: boolean;
  /** 是否检查任务名称唯一性，默认true */
  validateUniqueness?: boolean;
  /** 批次大小限制，默认100 */
  batchSize?: number;
  /** 是否自动启动创建的任务，默认false */
  autoStart?: boolean;
}

/**
 * 批量创建结果
 */
export interface BatchCreateResult {
  /** 成功创建的任务列表 */
  success: TaskBase[];
  /** 创建失败的任务信息 */
  failed: Array<{
    /** 失败的任务参数 */
    task: CreateTaskParams;
    /** 失败原因 */
    error: string;
    /** 在批量列表中的索引 */
    index: number;
  }>;
  /** 总任务数 */
  total: number;
  /** 成功创建数量 */
  successCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 创建耗时（毫秒） */
  duration: number;
}

/**
 * 批量验证结果
 */
export interface BatchValidationResult {
  /** 是否全部验证通过 */
  valid: boolean;
  /** 验证错误列表 */
  errors: Array<{
    /** 任务索引 */
    index: number;
    /** 任务参数 */
    task: CreateTaskParams;
    /** 错误信息 */
    error: string;
    /** 错误类型 */
    errorType:
      | 'name'
      | 'type'
      | 'parent'
      | 'executor'
      | 'uniqueness'
      | 'circular';
  }>;
  /** 通过验证的任务数量 */
  validCount: number;
  /** 验证失败的任务数量 */
  invalidCount: number;
}
