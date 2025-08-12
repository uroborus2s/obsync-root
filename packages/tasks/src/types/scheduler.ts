/**
 * 调度器相关类型定义
 */

/**
 * 调度器状态
 */
export type SchedulerStatus = 'stopped' | 'starting' | 'running' | 'stopping';

/**
 * 调度策略
 */
export type SchedulingStrategy =
  | 'fifo' // 先进先出
  | 'priority' // 优先级调度
  | 'fair' // 公平调度
  | 'deadline'; // 截止时间调度

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 调度间隔（毫秒） */
  interval: number;
  /** 最大并发任务数 */
  maxConcurrency: number;
  /** 调度策略 */
  strategy?: SchedulingStrategy;
  /** 任务超时时间（毫秒） */
  taskTimeout?: number;
  /** 队列大小限制 */
  queueSizeLimit?: number;
  /** 是否启用优先级调度 */
  enablePriority?: boolean;
}

/**
 * 调度器统计信息
 */
export interface SchedulerStats {
  /** 调度器状态 */
  status: SchedulerStatus;
  /** 队列中的任务数 */
  queuedTasks: number;
  /** 正在执行的任务数 */
  runningTasks: number;
  /** 已完成的任务数 */
  completedTasks: number;
  /** 失败的任务数 */
  failedTasks: number;
  /** 平均等待时间（毫秒） */
  averageWaitTime: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 吞吐量（任务/秒） */
  throughput: number;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 工作流调度配置
 */
export interface WorkflowSchedule {
  /** 调度ID */
  id: string;
  /** 工作流定义ID */
  workflowDefinitionId: string;
  /** 调度名称 */
  name: string;
  /** Cron表达式 */
  cronExpression?: string;
  /** 时区 */
  timezone: string;
  /** 是否启用 */
  isEnabled: boolean;
  /** 下次运行时间 */
  nextRunAt?: Date;
  /** 上次运行时间 */
  lastRunAt?: Date;
  /** 输入数据 */
  inputData: Record<string, any>;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 创建者 */
  createdBy?: string;
}
