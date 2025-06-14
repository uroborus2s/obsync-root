/**
 * @stratix/queue 零配置队列服务
 * 提供快捷的任务管理方法，支持添加任务、暂停任务、启动任务、分组管理等
 */

import type { Logger } from '@stratix/core';
import { EventDrivenMemoryQueue } from '../core/memory-queue.js';
import { QueueManager } from '../managers/queue-manager.js';
import { QueueMonitor } from '../monitoring/queue-monitor.js';
import {
  QueueGroupRepository,
  QueueJobRepository
} from '../repositories/index.js';
import { DatabaseJobStream } from '../streams/database-job-stream.js';
import type { CreateJobInput, CreateJobsBatchInput } from '../types/index.js';
import { GroupManagementService, JobExecutionService } from './index.js';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 简化的任务输入
 */
export interface SimpleJobInput {
  /** 任务名称 */
  name: string;
  /** 执行器名称 */
  executor: string;
  /** 任务载荷 */
  payload: any;
  /** 分组ID（可选） */
  groupId?: string;
  /** 优先级（可选，默认0） */
  priority?: number;
  /** 最大重试次数（可选，默认3） */
  maxAttempts?: number;
  /** 延迟执行时间（可选） */
  delayUntil?: Date;
  /** 元数据（可选） */
  metadata?: Record<string, any>;
}

/**
 * 批量任务输入
 */
export interface BatchJobInput {
  /** 分组ID */
  groupId: string;
  /** 任务列表 */
  jobs: Omit<SimpleJobInput, 'groupId'>[];
}

/**
 * 服务配置选项
 */
export interface GroupServiceOptions {
  /** 队列名称（默认：'default'） */
  queueName?: string;
  /** 并发数（默认：1，串行执行） */
  concurrency?: number;
  /** 任务超时时间（默认：30秒） */
  timeout?: number;
  /** 是否启用详细日志（默认：false） */
  enableDetailedLogging?: boolean;
  /** 是否启用监控（默认：false） */
  enableMonitoring?: boolean;
  /** 是否启用分组管理（默认：true） */
  enableGroupManagement?: boolean;
  /** 处理间隔（默认：1000ms） */
  processingInterval?: number;
}

/**
 * 任务状态
 */
export interface TaskStatus {
  id: string;
  name: string;
  status: 'waiting' | 'running' | 'completed' | 'failed' | 'paused';
  groupId?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * 分组状态
 */
export interface GroupStatus {
  groupId: string;
  queueName: string;
  status: 'active' | 'paused';
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 服务统计信息
 */
export interface ServiceStats {
  /** 队列长度 */
  queueLength: number;
  /** 活跃任务数 */
  activeJobs: number;
  /** 总处理任务数 */
  totalProcessed: number;
  /** 成功任务数 */
  successfulJobs: number;
  /** 失败任务数 */
  failedJobs: number;
  /** 成功率 */
  successRate: number;
}

// ============================================================================
// 零配置队列服务
// ============================================================================

/**
 * 零配置队列服务
 * 提供简单易用的队列管理接口
 */
export class QueueService {
  private monitor?: QueueMonitor;

  private isInitialized = true;
  private isStarted = false;
  private queueName: string = 'default';

  constructor(
    private log: Logger,
    private jobRepository: QueueJobRepository,
    private groupRepository: QueueGroupRepository,
    private queueManager: QueueManager,
    private jobExecutionService: JobExecutionService,
    private groupManagementService: GroupManagementService,
    private databaseJobStream: DatabaseJobStream,
    private drivenMemoryQueue: EventDrivenMemoryQueue
  ) {
    this.databaseJobStream.on('stream:batch-loaded', async (event) => {
      this.log.debug(
        {
          eventId: event.eventId,
          queueName: event.queueName,
          totalBatches: event.totalBatches,
          totalJobs: event.totalJobs
        },
        '收到数据加载完成事件'
      );
      this.jobExecutionService.startProcessingLoop();
    });
  }

  public setMonitor(monitor: QueueMonitor) {
    this.monitor = monitor;
  }
  /**
   * 启动服务
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    this.log.info('🚀 启动队列服务...');

    try {
      // 启动核心服务
      await this.queueManager.start();
      await this.jobExecutionService.start();

      if (this.groupManagementService) {
        await this.groupManagementService.start();
      }

      if (this.monitor) {
        await this.monitor.start();
      }

      // 🔥 启动时初始化数据库流并触发首次数据加载
      await this.databaseJobStream.initialize();

      // 检查是否需要加载初始数据
      if (this.drivenMemoryQueue.length === 0) {
        this.log.info('队列为空，触发初始数据加载');
        await this.databaseJobStream.triggerBatchLoad('empty_queue');
      }

      this.isStarted = true;
      this.log.info('✅ 队列服务已启动');
    } catch (error) {
      this.log.error({ error }, '❌ 启动队列服务失败');
      throw error;
    }
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.log.info('🛑 停止队列服务...');

    try {
      // 按相反顺序停止服务
      if (this.monitor) {
        await this.monitor.stop();
      }

      if (this.groupManagementService) {
        await this.groupManagementService.stop();
      }

      this.queueManager.stop();

      this.isStarted = false;
      this.log.info('✅ 队列服务已停止');
    } catch (error) {
      this.log.error({ error }, '❌ 停止队列服务失败');
      throw error;
    }
  }

  // ============================================================================
  // 任务管理
  // ============================================================================

  /**
   * 添加单个任务
   */
  async addTask(task: SimpleJobInput): Promise<string> {
    const jobInput: CreateJobInput = {
      queueName: this.queueName,
      groupId: task.groupId,
      jobName: task.name,
      executorName: task.executor,
      payload: task.payload,
      priority: task.priority,
      maxAttempts: task.maxAttempts,
      delayUntil: task.delayUntil,
      metadata: task.metadata
    };

    const job = await this.jobRepository.create(jobInput);

    this.log.info(`➕ 任务已添加: ${task.name} (ID: ${job.id})`);

    // 🔥 新增：添加任务后，检查队列是否需要加载任务
    this.triggerQueueCheckIfNeeded();

    return job.id;
  }

  /**
   * 批量添加任务
   */
  async addTasks(tasks: SimpleJobInput[]): Promise<string[]> {
    const jobInputs: CreateJobsBatchInput = {
      queueName: this.queueName,
      jobs: tasks.map((task) => ({
        jobName: task.name,
        executorName: task.executor,
        payload: task.payload,
        priority: task.priority,
        maxAttempts: task.maxAttempts,
        delayUntil: task.delayUntil,
        metadata: task.metadata
      }))
    };

    const jobs = await this.jobRepository.createBatch(jobInputs);
    const jobIds = jobs.map((job) => job.id);

    this.log.info(`➕ 批量任务已添加: ${tasks.length} 个任务`);
    return jobIds;
  }

  /**
   * 添加分组任务
   */
  async addGroupTasks(input: BatchJobInput): Promise<string[]> {
    const jobInputs: CreateJobsBatchInput = {
      queueName: this.queueName,
      groupId: input.groupId,
      jobs: input.jobs.map((task) => ({
        jobName: task.name,
        executorName: task.executor,
        payload: task.payload,
        priority: task.priority,
        maxAttempts: task.maxAttempts,
        delayUntil: task.delayUntil,
        metadata: task.metadata
      }))
    };

    const jobs = await this.jobRepository.createBatch(jobInputs);
    const jobIds = jobs.map((job) => job.id);

    this.log.info(
      `➕ 分组任务已添加: ${input.groupId} (${input.jobs.length} 个任务)`
    );
    return jobIds;
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    const job = await this.jobRepository.findById(taskId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.job_name,
      status: job.status as any, // 类型转换
      groupId: job.group_id || undefined,
      attempts: job.attempts,
      maxAttempts: job.max_attempts,
      createdAt: job.created_at,
      startedAt: job.started_at || undefined,
      completedAt: job.updated_at,
      error: ['failed', 'error'].includes(job.status)
        ? '任务执行失败'
        : undefined
    };
  }

  // ============================================================================
  // 分组管理
  // ============================================================================

  /**
   * 暂停分组
   */
  async pauseGroup(groupId: string): Promise<void> {
    if (!this.groupManagementService) {
      throw new Error('分组管理未启用');
    }

    await this.groupManagementService.pauseGroup(this.queueName, groupId);
    this.log.info(`⏸️ 分组已暂停: ${groupId}`);
  }

  /**
   * 恢复分组
   */
  async resumeGroup(groupId: string): Promise<void> {
    if (!this.groupManagementService) {
      throw new Error('分组管理未启用');
    }

    await this.groupManagementService.resumeGroup(this.queueName, groupId);
    this.log.info(`▶️ 分组已恢复: ${groupId}`);
  }

  /**
   * 获取分组状态
   */
  async getGroupStatus(groupId: string): Promise<GroupStatus | null> {
    if (!this.groupManagementService) {
      throw new Error('分组管理未启用');
    }

    const group = await this.groupRepository.findByGroupId(
      this.queueName,
      groupId
    );
    if (!group) {
      return null;
    }

    return {
      groupId: group.group_id,
      queueName: group.queue_name,
      status: group.status,
      totalJobs: group.total_jobs,
      pendingJobs: 0, // 简化实现
      runningJobs: 0, // 简化实现
      completedJobs: group.completed_jobs,
      failedJobs: group.failed_jobs,
      createdAt: group.created_at,
      updatedAt: group.updated_at
    };
  }

  /**
   * 获取所有分组状态
   */
  async getAllGroupStatuses(): Promise<GroupStatus[]> {
    if (!this.groupManagementService) {
      throw new Error('分组管理未启用');
    }

    const groups = await this.groupRepository.findByQueue(this.queueName);

    return groups.map((group) => ({
      groupId: group.group_id,
      queueName: group.queue_name,
      status: group.status,
      totalJobs: group.total_jobs,
      pendingJobs: 0, // 简化实现
      runningJobs: 0, // 简化实现
      completedJobs: group.completed_jobs,
      failedJobs: group.failed_jobs,
      createdAt: group.created_at,
      updatedAt: group.updated_at
    }));
  }

  // ============================================================================
  // 统计和监控
  // ============================================================================

  /**
   * 获取服务统计信息
   */
  getStats(): ServiceStats {
    if (!this.isInitialized) {
      return {
        queueLength: 0,
        activeJobs: 0,
        totalProcessed: 0,
        successfulJobs: 0,
        failedJobs: 0,
        successRate: 0
      };
    }

    const queueStats = this.queueManager.getStatistics();
    const execStats = this.jobExecutionService.getStatistics();

    return {
      queueLength: queueStats.memoryQueue.length,
      activeJobs: execStats.activeJobsCount,
      totalProcessed: execStats.totalProcessed,
      successfulJobs: execStats.totalSuccessful,
      failedJobs: execStats.totalFailed,
      successRate: execStats.successRate
    };
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    if (!this.isInitialized) {
      return 0;
    }
    return this.queueManager.getStatistics().memoryQueue.length;
  }

  /**
   * 获取活跃任务数
   */
  getActiveJobsCount(): number {
    if (!this.isInitialized) {
      return 0;
    }
    return this.jobExecutionService.getStatistics().activeJobsCount;
  }

  /**
   * 检查服务是否健康
   */
  isHealthy(): boolean {
    return this.isInitialized && this.isStarted;
  }

  // ============================================================================
  // 便捷方法
  // ============================================================================

  /**
   * 等待所有任务完成
   */
  async waitForCompletion(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const stats = this.getStats();
      if (stats.queueLength === 0 && stats.activeJobs === 0) {
        return true;
      }

      // 等待100ms后再检查
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.drivenMemoryQueue.clear();
    this.log.info('队列已清空');
  }

  /**
   * 获取失败的任务列表
   */
  async getFailedTasks(
    limit: number = 100,
    offset: number = 0
  ): Promise<TaskStatus[]> {
    try {
      const failedJobs = await this.jobRepository.getFailedJobs(
        this.queueName,
        limit,
        offset
      );

      return failedJobs.map((job) => ({
        id: job.id,
        name: job.job_name,
        status: 'failed' as const,
        groupId: job.group_id || undefined,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        createdAt: job.created_at,
        startedAt: job.started_at || undefined,
        completedAt: undefined,
        error: job.error_message || undefined
      }));
    } catch (error) {
      this.log.error({ error }, '获取失败任务列表失败');
      return [];
    }
  }

  /**
   * 重试失败的任务
   */
  async retryFailedTask(taskId: string): Promise<boolean> {
    try {
      const retriedJob = await this.jobRepository.retryFailedJob(taskId);
      if (retriedJob) {
        this.log.info({ taskId }, '失败任务已重置为等待状态');
        // 触发队列检查，可能需要加载数据
        this.triggerQueueCheckIfNeeded();
        return true;
      } else {
        this.log.warn({ taskId }, '任务重试失败，可能任务不存在或状态不正确');
        return false;
      }
    } catch (error) {
      this.log.error({ error, taskId }, '重试失败任务时发生错误');
      return false;
    }
  }

  /**
   * 批量重试失败的任务
   */
  async retryFailedTasks(
    taskIds: string[]
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const taskId of taskIds) {
      const result = await this.retryFailedTask(taskId);
      if (result) {
        success.push(taskId);
      } else {
        failed.push(taskId);
      }
    }

    this.log.info(
      { successCount: success.length, failedCount: failed.length },
      '批量重试失败任务完成'
    );

    return { success, failed };
  }

  /**
   * 获取失败任务统计
   */
  async getFailedTasksStats(): Promise<{
    total: number;
    byExecutor: Record<string, number>;
    byGroup: Record<string, number>;
  }> {
    try {
      // 这里可以添加更详细的统计查询
      const failedJobs = await this.jobRepository.getFailedJobs(
        this.queueName,
        1000
      );

      const byExecutor: Record<string, number> = {};
      const byGroup: Record<string, number> = {};

      failedJobs.forEach((job) => {
        // 按执行器统计
        byExecutor[job.executor_name] =
          (byExecutor[job.executor_name] || 0) + 1;

        // 按分组统计
        const groupId = job.group_id || 'no-group';
        byGroup[groupId] = (byGroup[groupId] || 0) + 1;
      });

      return {
        total: failedJobs.length,
        byExecutor,
        byGroup
      };
    } catch (error) {
      this.log.error({ error }, '获取失败任务统计失败');
      return { total: 0, byExecutor: {}, byGroup: {} };
    }
  }

  /**
   * 检查队列状态并在需要时触发任务加载
   */
  private triggerQueueCheckIfNeeded(): void {
    if (!this.isInitialized || !this.isStarted) {
      return;
    }

    // 获取JobExecutionService的统计信息
    const executionStats = this.jobExecutionService.getStatistics();

    // 判断是否有任务循环在运行或有活跃任务正在执行
    const isProcessingInProgress =
      executionStats.isProcessingLoop || executionStats.activeJobsCount > 0;

    if (isProcessingInProgress) {
      this.log.debug(
        {
          isProcessingLoop: executionStats.isProcessingLoop,
          activeJobsCount: executionStats.activeJobsCount,
          queueLength: this.drivenMemoryQueue.length
        },
        '任务执行循环进行中，跳过从数据库加载数据'
      );
      return;
    }

    // 只有在队列为空且没有任务循环运行时才触发数据加载
    if (this.drivenMemoryQueue.isEmpty) {
      this.log.debug(
        {
          queueLength: this.drivenMemoryQueue.length,
          isProcessingLoop: executionStats.isProcessingLoop,
          activeJobsCount: executionStats.activeJobsCount
        },
        '队列为空且无任务执行，触发数据库加载'
      );

      this.databaseJobStream.triggerBatchLoad('job_added').catch((error) => {
        this.log.error(
          { error },
          '触发队列检查失败，队列可能会在下次水位检查时自动处理'
        );
      });
    } else {
      this.log.debug(
        {
          queueLength: this.drivenMemoryQueue.length,
          remainingCapacity: this.drivenMemoryQueue.remainingWaterMark
        },
        '队列非空，无需加载数据'
      );
    }
  }
}
