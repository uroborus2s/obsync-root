// @stratix/icasync 同步相关类型定义

/**
 * 同步状态枚举
 */
export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped' // 因冲突或其他原因跳过执行
}

/**
 * 同步类型枚举
 */
export enum SyncType {
  FULL = 'full', // 全量同步
  INCREMENTAL = 'incremental', // 增量同步
  USER = 'user', // 用户同步
  COURSE = 'course' // 课程同步
}

/**
 * 同步结果
 */
export interface SyncResult {
  /** 同步状态 */
  status: SyncStatus;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 处理的记录数 */
  processedCount: number;
  /** 成功的记录数 */
  successCount: number;
  /** 失败的记录数 */
  failedCount: number;
  /** 错误信息 */
  errors?: string[];
  /** 详细信息 */
  details?: Record<string, any>;
}

/**
 * 同步配置
 */
export interface SyncConfig {
  /** 同步类型 */
  type: SyncType;
  /** 批次大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否并行处理 */
  parallel?: boolean;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * 同步任务
 */
export interface SyncTask {
  /** 任务ID */
  id: string;
  /** 任务类型 */
  type: SyncType;
  /** 任务状态 */
  status: SyncStatus;
  /** 配置 */
  config: SyncConfig;
  /** 结果 */
  result?: SyncResult;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 用户同步状态
 */
export interface UserSyncStatus {
  /** 用户代码 */
  userCode: string;
  /** 用户类型 */
  userType: 'student' | 'teacher';
  /** 同步状态 */
  status: SyncStatus;
  /** 最后同步时间 */
  lastSyncTime?: Date;
  /** 错误信息 */
  error?: string;
}

/**
 * 同步摘要
 */
export interface SyncSummary {
  /** 总数 */
  total: number;
  /** 待处理 */
  pending: number;
  /** 进行中 */
  inProgress: number;
  /** 已完成 */
  completed: number;
  /** 失败 */
  failed: number;
  /** 已取消 */
  cancelled: number;
}
