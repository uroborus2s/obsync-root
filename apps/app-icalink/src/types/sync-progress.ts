/**
 * 同步进度相关类型定义
 */

/**
 * 同步状态枚举
 */
export enum SyncStatus {
  /** 未开始 */
  NOT_STARTED = 'not_started',
  /** 同步中 */
  IN_PROGRESS = 'in_progress',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 失败 */
  FAILED = 'failed',
  /** 已暂停 */
  PAUSED = 'paused'
}

/**
 * 同步进度信息
 */
export interface SyncProgress {
  /** WPS 文件 ID */
  fileId: string;

  /** WPS Sheet ID */
  sheetId: number;

  /** 同步状态 */
  status: SyncStatus;

  /** 总记录数 */
  totalCount: number;

  /** 已同步记录数 */
  syncedCount: number;

  /** 当前偏移量（下次从这里开始） */
  currentOffset: number;

  /** 批次大小 */
  batchSize: number;

  /** 开始时间 */
  startedAt?: Date;

  /** 完成时间 */
  completedAt?: Date;

  /** 最后更新时间 */
  lastUpdatedAt?: Date;

  /** 错误信息 */
  errorMessage?: string;

  /** 失败次数 */
  failureCount?: number;
}

/**
 * 批次同步结果
 */
export interface BatchSyncResult {
  /** 是否成功 */
  success: boolean;

  /** 本批次同步的记录数 */
  count: number;

  /** 本批次的偏移量 */
  offset: number;

  /** 错误信息 */
  error?: string;
}

/**
 * 同步摘要
 */
export interface SyncSummary {
  /** 是否成功 */
  success: boolean;

  /** 总记录数 */
  totalCount: number;

  /** 成功同步数 */
  syncedCount: number;

  /** 失败数 */
  failedCount: number;

  /** 总批次数 */
  totalBatches: number;

  /** 成功批次数 */
  successBatches: number;

  /** 失败批次数 */
  failedBatches: number;

  /** 开始时间 */
  startedAt: Date;

  /** 完成时间 */
  completedAt: Date;

  /** 耗时（毫秒） */
  duration: number;

  /** 错误信息列表 */
  errors: string[];
}

