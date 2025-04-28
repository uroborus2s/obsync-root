/**
 * @stratix/queue 插件类型定义
 * 提供插件配置和选项相关的接口定义
 */

// BullMQ特定配置
export interface BullMQOptions {
  connection?: any;
  [key: string]: any;
}

// 重试选项
export interface BackoffOptions {
  type: 'fixed' | 'exponential' | 'custom';
  delay: number;
  custom?: (attemptsMade: number) => number;
}

// 事件选项
export interface EventsOptions {
  enabled?: boolean;
  global?: boolean;
  log?: boolean;
}

// 内存队列驱动配置
export interface MemoryDriverOptions {
  maxJobs?: number;
  persistence?: boolean;
  persistenceInterval?: number;
}

// 插件配置选项
export interface QueuePluginOptions {
  driver?: 'bullmq' | 'memory' | string;
  prefix?: string;
  defaultJobOptions?: JobOptions;
  redis?: RedisOptions;
  bullmq?: BullMQOptions;
  memory?: MemoryDriverOptions;
  processor?: ProcessorOptions;
  events?: EventsOptions;
  queues?: Record<string, QueueDefinition>;
  defaultQueue?: string;
  useExistingRedis?: boolean;
  debug?: boolean;
}

// 重复任务选项
export interface RepeatOptions {
  cron?: string;
  every?: number;
  limit?: number;
  startDate?: Date | string | number;
  endDate?: Date | string | number;
  tz?: string;
}

// 任务选项接口
export interface JobOptions {
  jobId?: string;
  attempts?: number;
  delay?: number;
  timeout?: number;
  backoff?: BackoffOptions;
  priority?: number;
  lifo?: boolean;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  repeat?: RepeatOptions;
  dependencies?: string[];
  [key: string]: any;
}

// 处理器选项
export interface ProcessorOptions {
  concurrency?: number;
  sandboxed?: boolean;
  maxSandboxes?: number;
}

// 作业状态枚举
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused'
}

// 日志条目
export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
}

// 任务状态
export interface JobState {
  status: JobStatus;
  progress: number | object;
  data: any;
  attemptsMade: number;
  returnvalue: any;
  failedReason?: string;
  finishedOn?: number;
  processedOn?: number;
}

export interface Job<T = any, R = any> {
  readonly id: string;
  readonly name: string;
  readonly data: T;
  readonly returnvalue: R | null;
  readonly status: JobStatus;
  readonly attemptsMade: number;
  updateProgress(progress: number | object): Promise<void>;
  getProgress(): Promise<number | object>;
  retry(): Promise<void>;
  remove(): Promise<void>;
  moveToFailed(error: Error): Promise<void>;
  promote(): Promise<void>;
  discard(): Promise<void>;
  log(message: string): Promise<void>;
  getLogs(): Promise<LogEntry[]>;
  addDependency(jobId: string): Promise<void>;
  removeDependency(jobId: string): Promise<void>;
  getState(): Promise<JobState>;
  complete(result?: R): Promise<void>;
  fail(error: Error): Promise<void>;
  delay(delayMs: number): Promise<void>;
}

// 队列处理器类型
export type QueueProcessor<T = any, R = any> = (
  job: Job<T, R>
) => Promise<R> | R;

// 队列定义
export interface QueueDefinition {
  concurrency?: number;
  options?: any;
  processors?: Record<string, QueueProcessor>;
}

// 限流选项
export interface RateLimiterOptions {
  max: number;
  duration: number;
}

// 队列选项接口
export interface QueueOptions {
  prefix?: string;
  concurrency?: number;
  defaultJobOptions?: JobOptions;
  processor?: ProcessorOptions;
  limiter?: RateLimiterOptions;
  events?: EventsOptions;
  [key: string]: any;
}

// Redis连接选项
export interface RedisOptions {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  tls?: boolean | object;
  cluster?: Array<{ host: string; port: number }>;
  sentinels?: Array<{ host: string; port: number }>;
  sentinelMaster?: string;
  [key: string]: any;
}

// 任务事件枚举
export enum JobEvent {
  ACTIVE = 'active',
  PROGRESS = 'progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STALLED = 'stalled',
  DELAYED = 'delayed',
  REMOVED = 'removed',
  RETRY = 'retry'
}

// 默认队列选项
export const DEFAULT_QUEUE_OPTIONS: QueuePluginOptions = {
  driver: 'bullmq',
  prefix: '',
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false
  },
  processor: {
    concurrency: 1,
    sandboxed: false
  },
  events: {
    enabled: true,
    global: false,
    log: false
  }
};
