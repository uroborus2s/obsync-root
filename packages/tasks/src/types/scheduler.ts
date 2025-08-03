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
  | 'fifo'        // 先进先出
  | 'priority'    // 优先级调度
  | 'fair'        // 公平调度
  | 'deadline';   // 截止时间调度

/**
 * 任务调度器接口
 */
export interface TaskScheduler {
  /**
   * 启动调度器
   * @param config 调度器配置
   */
  start(config: SchedulerConfig): Promise<void>;
  
  /**
   * 停止调度器
   */
  stop(): Promise<void>;
  
  /**
   * 调度任务
   * @param task 任务节点
   */
  scheduleTask(task: any): Promise<void>;
  
  /**
   * 取消任务调度
   * @param taskId 任务ID
   */
  cancelTask(taskId: string): Promise<void>;
  
  /**
   * 获取调度器状态
   */
  getStatus(): SchedulerStatus;
  
  /**
   * 获取调度统计
   */
  getStats(): SchedulerStats;
}

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
 * 任务队列接口
 */
export interface TaskQueue {
  /**
   * 添加任务到队列
   * @param task 任务
   */
  enqueue(task: any): Promise<void>;
  
  /**
   * 从队列中取出任务
   * @returns 任务或null
   */
  dequeue(): Promise<any | null>;
  
  /**
   * 获取队列大小
   */
  size(): number;
  
  /**
   * 清空队列
   */
  clear(): Promise<void>;
  
  /**
   * 检查队列是否为空
   */
  isEmpty(): boolean;
}

/**
 * 优先级任务队列接口
 */
export interface PriorityTaskQueue extends TaskQueue {
  /**
   * 添加带优先级的任务
   * @param task 任务
   * @param priority 优先级
   */
  enqueueWithPriority(task: any, priority: number): Promise<void>;
  
  /**
   * 获取最高优先级任务
   */
  dequeueHighestPriority(): Promise<any | null>;
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

/**
 * Cron调度器接口
 */
export interface CronScheduler {
  /**
   * 添加调度任务
   * @param schedule 调度配置
   */
  addSchedule(schedule: WorkflowSchedule): Promise<void>;
  
  /**
   * 移除调度任务
   * @param scheduleId 调度ID
   */
  removeSchedule(scheduleId: string): Promise<void>;
  
  /**
   * 更新调度任务
   * @param scheduleId 调度ID
   * @param updates 更新数据
   */
  updateSchedule(scheduleId: string, updates: Partial<WorkflowSchedule>): Promise<void>;
  
  /**
   * 启动调度器
   */
  start(): Promise<void>;
  
  /**
   * 停止调度器
   */
  stop(): Promise<void>;
  
  /**
   * 获取所有调度任务
   */
  getSchedules(): Promise<WorkflowSchedule[]>;
}
