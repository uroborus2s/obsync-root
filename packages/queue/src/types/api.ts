/**
 * @stratix/queue API类型定义
 * 提供队列操作和任务处理相关的核心接口定义
 */

import {
  EventsOptions,
  Job,
  JobOptions,
  JobStatus,
  ProcessorOptions,
  QueueOptions,
  QueueProcessor,
  RepeatOptions
} from './plugin.js';

// 队列状态
export interface QueueStatus {
  isPaused: boolean;
  jobCounts: JobCounts;
}

// 队列指标
export interface QueueMetrics {
  throughput: number;
  latency: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// 队列管理器选项
export interface QueueManagerOptions {
  driver?: string;
  prefix?: string;
  defaultJobOptions?: JobOptions;
  driverOptions?: any;
  processor?: ProcessorOptions;
  events?: EventsOptions;
  bullmq?: any;
}

// 队列健康状态
export interface QueueHealth {
  driver: boolean;
  queues: Record<string, boolean>;
  healthy: boolean;
}

// 任务数量统计
export interface JobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

// 队列事件枚举
export enum QueueEvent {
  ADDED = 'added',
  WAITING = 'waiting',
  ACTIVE = 'active',
  STALLED = 'stalled',
  PROGRESS = 'progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
  RESUMED = 'resumed',
  CLEANED = 'cleaned',
  DRAINED = 'drained',
  REMOVED = 'removed',
  ERROR = 'error'
}

// 导出队列API接口类型
export interface Queue {
  readonly name: string;
  add<T = any, R = any>(
    name: string,
    data?: T,
    options?: JobOptions
  ): Promise<Job<T, R>>;
  addBulk<T = any, R = any>(
    jobs: Array<{ name: string; data?: T; opts?: JobOptions }>
  ): Promise<Job<T, R>[]>;
  addDelayed<T = any, R = any>(
    name: string,
    data: T,
    delay: number,
    options?: JobOptions
  ): Promise<Job<T, R>>;
  addRepeatableJob<T = any, R = any>(
    name: string,
    data: T,
    repeatOptions: RepeatOptions,
    jobOptions?: JobOptions
  ): Promise<Job<T, R>>;
  process<T = any, R = any>(
    processor: QueueProcessor<T, R> | Record<string, QueueProcessor<T, R>>
  ): void;
  getJob<T = any, R = any>(jobId: string): Promise<Job<T, R> | null>;
  getJobs(
    status: JobStatus | JobStatus[],
    start?: number,
    end?: number,
    asc?: boolean
  ): Promise<Job[]>;
  getJobCounts(): Promise<JobCounts>;
  removeJob(jobId: string): Promise<boolean>;
  removeJobs(pattern: string): Promise<number>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  isPaused(): Promise<boolean>;
  empty(): Promise<void>;
  waitUntilIdle(): Promise<void>;
  close(): Promise<void>;
  getStatus(): Promise<QueueStatus>;
  getMetrics(): Promise<QueueMetrics>;
  on(event: QueueEvent | string, handler: (...args: any[]) => void): void;
  off(event: QueueEvent | string, handler: (...args: any[]) => void): void;
}

// 队列管理器
export interface QueueManager {
  createQueue(name: string, options?: QueueOptions): Queue;
  getQueue(name: string): Queue;
  hasQueue(name: string): boolean;
  getAllQueues(): Queue[];
  removeQueue(name: string): Promise<boolean>;
  closeAll(): Promise<void>;
  gracefulShutdown(timeout?: number): Promise<void>;
  checkHealth(): Promise<QueueHealth>;
}
