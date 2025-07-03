/**
 * @stratix/queue 任务执行服务
 */

import type { IStratixApp, Logger } from '@stratix/core';
import { EventEmitter } from 'node:events';
import { DEFAULT_QUEUE_CONFIG } from '../config/default-config.js';
import { EventDrivenMemoryQueue } from '../core/memory-queue.js';
import type { QueueJobRepository } from '../repositories/index.js';
import { DatabaseJobStream } from '../streams/database-job-stream.js';
import type {
  JobExecutionResult,
  JobExecutor,
  QueueJob
} from '../types/index.js';

/**
 * 执行状态
 */
interface ExecutionState {
  isRunning: boolean;
  isPaused: boolean;
  activeJobs: Map<
    string,
    {
      job: QueueJob;
      executor: JobExecutor;
      startTime: Date;
      timeoutHandle?: NodeJS.Timeout;
    }
  >;
  concurrencyLimit: number;
  maxConcurrency: number;
  parallelEnabled: boolean;
  batchSize: number;
  taskInterval: number;
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  lastTaskStartTime: number;
}

/**
 * 任务执行服务
 * 负责从队列管理器获取任务并分发给合适的执行器执行
 */
export class JobExecutionService extends EventEmitter {
  private state: ExecutionState;
  private isProcessingLoop: boolean = false; // 标记是否有处理循环在运行

  constructor(
    private jobRepository: QueueJobRepository,
    private log: Logger,
    private app: IStratixApp,
    private drivenMemoryQueue: EventDrivenMemoryQueue,
    private databaseJobStream: DatabaseJobStream
  ) {
    super();

    this.state = {
      isRunning: false,
      isPaused: false,
      activeJobs: new Map(),
      concurrencyLimit: 1,
      maxConcurrency: 10,
      parallelEnabled: true,
      batchSize: 5,
      taskInterval: 50,
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      lastTaskStartTime: 0
    };

    // 设置事件监听：当数据库加载新任务时，自动重启处理循环
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听数据库流的任务加载事件
    this.databaseJobStream.on('jobs:added', (event) => {
      this.log.debug(
        { jobCount: event.jobs.length },
        '检测到新任务加载，检查是否需要重启处理循环'
      );

      // 如果当前没有处理循环在运行且服务正在运行，则启动处理循环
      if (
        !this.isProcessingLoop &&
        this.state.isRunning &&
        !this.state.isPaused
      ) {
        this.log.info('自动重启处理循环以处理新加载的任务');
        this.startProcessingLoop();
      }
    });

    // 监听内存队列的长度变化
    this.drivenMemoryQueue.on('length:changed', (event) => {
      // 如果队列长度从0变为大于0，且当前没有处理循环在运行，则启动处理循环
      if (
        event.length > 0 &&
        !this.isProcessingLoop &&
        this.state.isRunning &&
        !this.state.isPaused
      ) {
        this.log.debug(
          { newLength: event.length },
          '队列中有新任务，检查是否需要启动处理循环'
        );
        this.startProcessingLoop();
      }
    });
  }

  /**
   * 初始化执行服务配置
   * 设置并行处理的默认配置
   */
  private initializeConfig(): void {
    // 使用配置文件中的默认并行处理配置 - 默认并行3个任务
    const jobConfig = DEFAULT_QUEUE_CONFIG.jobProcessing;
    const parallelConfig = jobConfig.parallel;

    this.state.concurrencyLimit = jobConfig.concurrency;
    this.state.parallelEnabled = parallelConfig.enabled;
    this.state.maxConcurrency = parallelConfig.maxConcurrency;
    this.state.batchSize = parallelConfig.batchSize;
    this.state.taskInterval = parallelConfig.taskInterval;

    this.log.info(
      {
        concurrencyLimit: this.state.concurrencyLimit,
        parallelEnabled: this.state.parallelEnabled,
        maxConcurrency: this.state.maxConcurrency,
        batchSize: this.state.batchSize,
        taskInterval: this.state.taskInterval
      },
      '任务执行配置已初始化 - 从配置文件加载，默认并行3个任务'
    );
  }

  /**
   * 更新并发配置
   */
  public updateConcurrencyConfig(config: {
    concurrency?: number;
    parallelEnabled?: boolean;
    maxConcurrency?: number;
    batchSize?: number;
    taskInterval?: number;
  }): void {
    if (config.concurrency !== undefined) {
      this.state.concurrencyLimit = Math.max(1, config.concurrency);
    }

    if (config.parallelEnabled !== undefined) {
      this.state.parallelEnabled = config.parallelEnabled;
    }

    if (config.maxConcurrency !== undefined) {
      this.state.maxConcurrency = Math.max(1, config.maxConcurrency);
    }

    if (config.batchSize !== undefined) {
      this.state.batchSize = Math.max(1, config.batchSize);
    }

    if (config.taskInterval !== undefined) {
      this.state.taskInterval = Math.max(0, config.taskInterval);
    }

    this.log.info(
      {
        concurrencyLimit: this.state.concurrencyLimit,
        parallelEnabled: this.state.parallelEnabled,
        maxConcurrency: this.state.maxConcurrency,
        batchSize: this.state.batchSize,
        taskInterval: this.state.taskInterval
      },
      '并发配置已更新'
    );
  }

  /**
   * 启动执行服务
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      this.log.warn('执行服务已经在运行');
      return;
    }

    // 初始化配置
    this.initializeConfig();

    this.state.isRunning = true;
    this.state.isPaused = false;

    const mode = this.state.parallelEnabled ? '并行执行模式' : '串行执行模式';

    this.log.info(
      {
        concurrencyLimit: this.state.concurrencyLimit,
        parallelEnabled: this.state.parallelEnabled,
        maxConcurrency: this.state.maxConcurrency,
        mode
      },
      '任务执行服务已启动，等待数据库加载完成后开始处理'
    );

    // 不立即启动处理循环，等待队列管理器通知有任务时再启动
    // 通过事件监听在有任务时自动启动处理循环
  }

  /**
   * 获取执行状态
   */
  getState(): Readonly<ExecutionState> {
    return {
      ...this.state,
      activeJobs: new Map(this.state.activeJobs)
    };
  }

  /**
   * 获取执行统计
   */
  getStatistics(): {
    isRunning: boolean;
    isPaused: boolean;
    isProcessingLoop: boolean;
    activeJobsCount: number;
    concurrencyLimit: number;
    parallelEnabled: boolean;
    maxConcurrency: number;
    batchSize: number;
    taskInterval: number;
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
    successRate: number;
  } {
    const successRate =
      this.state.totalProcessed > 0
        ? this.state.totalSuccessful / this.state.totalProcessed
        : 0;

    return {
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      isProcessingLoop: this.isProcessingLoop,
      activeJobsCount: this.state.activeJobs.size,
      concurrencyLimit: this.state.concurrencyLimit,
      parallelEnabled: this.state.parallelEnabled,
      maxConcurrency: this.state.maxConcurrency,
      batchSize: this.state.batchSize,
      taskInterval: this.state.taskInterval,
      totalProcessed: this.state.totalProcessed,
      totalSuccessful: this.state.totalSuccessful,
      totalFailed: this.state.totalFailed,
      successRate
    };
  }

  /**
   * 启动处理循环 - 连续执行模式
   */
  public startProcessingLoop(): void {
    // 如果已经有处理循环在运行，则不重复启动
    if (this.isProcessingLoop) {
      this.log.debug('处理循环已在运行，跳过启动');
      return;
    }

    this.isProcessingLoop = true;
    this.log.debug('启动连续处理循环');

    // 使用 setImmediate 启动异步处理循环
    setImmediate(() => {
      this.runContinuousProcessingLoop()
        .catch((error) => {
          this.log.error({ error }, '处理循环发生错误');
        })
        .finally(() => {
          this.isProcessingLoop = false;
        });
    });
  }

  /**
   * 连续处理循环 - 支持并行处理
   */
  private async runContinuousProcessingLoop(): Promise<void> {
    try {
      const mode = this.state.parallelEnabled ? '并行' : '串行';
      this.log.debug(`开始${mode}处理循环`);

      while (
        this.isProcessingLoop &&
        this.state.isRunning &&
        !this.state.isPaused
      ) {
        let hasProcessedJobs = false;

        if (this.state.parallelEnabled) {
          // 并行处理模式
          hasProcessedJobs = await this.runParallelProcessing();
        } else {
          // 串行处理模式（原有逻辑）
          hasProcessedJobs = await this.runSerialProcessing();
        }

        // 如果队列为空且没有活跃任务，尝试从数据库加载数据
        if (
          !hasProcessedJobs &&
          this.drivenMemoryQueue.isEmpty &&
          this.state.activeJobs.size === 0
        ) {
          this.log.debug('队列为空且无活跃任务，尝试从数据库加载数据');

          try {
            // 直接调用数据库流加载数据，使用'empty_queue'触发器
            await this.databaseJobStream.triggerBatchLoad('empty_queue');

            // 加载后检查是否有新任务
            if (this.drivenMemoryQueue.isEmpty) {
              this.log.debug(
                '数据库中也没有待处理任务，暂停处理循环等待新任务'
              );
              // 停止当前处理循环，等待有新任务时重新启动
              this.stopProcessingLoop();
              break;
            }
          } catch (error) {
            this.log.error({ error }, '从数据库加载数据失败，暂停处理循环');
            // 加载失败时也停止循环，避免空转
            this.stopProcessingLoop();
            break;
          }
        }

        // 短暂让出控制权，避免阻塞事件循环
        await this.delay(50);
      }
    } catch (error) {
      this.log.error({ error }, '连续处理循环发生错误');
    } finally {
      this.isProcessingLoop = false;
      this.log.debug('连续处理循环已结束');
    }
  }

  /**
   * 并行处理逻辑
   * @returns 是否处理了任务
   */
  private async runParallelProcessing(): Promise<boolean> {
    // 检查当前活跃任务数量是否已达到并发限制
    const currentActiveJobs = this.state.activeJobs.size;
    const availableSlots = Math.min(
      this.state.concurrencyLimit - currentActiveJobs,
      this.state.maxConcurrency - currentActiveJobs
    );

    if (availableSlots <= 0) {
      // 已达到并发限制，等待一段时间
      await this.delay(100);
      return false;
    }

    // 批量获取任务
    const jobsToProcess = this.drivenMemoryQueue.shiftBatch(
      Math.min(availableSlots, this.state.batchSize)
    );

    if (jobsToProcess.length === 0) {
      // 队列为空，返回false表示没有处理任务
      return false;
    }

    this.log.debug(
      {
        jobCount: jobsToProcess.length,
        availableSlots,
        activeJobs: currentActiveJobs,
        concurrencyLimit: this.state.concurrencyLimit
      },
      '开始并行处理任务批次'
    );

    // 并行启动任务（不等待完成）
    const taskPromises = jobsToProcess.map(async (job, index) => {
      // 根据配置添加任务间隔
      if (index > 0 && this.state.taskInterval > 0) {
        await this.delay(this.state.taskInterval * index);
      }

      // 检查是否需要控制任务启动频率
      const now = Date.now();
      if (
        this.state.lastTaskStartTime > 0 &&
        now - this.state.lastTaskStartTime < this.state.taskInterval
      ) {
        const waitTime =
          this.state.taskInterval - (now - this.state.lastTaskStartTime);
        await this.delay(waitTime);
      }

      this.state.lastTaskStartTime = Date.now();

      // 执行任务
      return this.executeJob(job);
    });

    // 可以选择等待所有任务完成，也可以不等待（真正的并行）
    // 这里不等待，让任务在后台运行
    Promise.allSettled(taskPromises).catch((error) => {
      this.log.error({ error }, '并行任务批次执行出错');
    });

    return true; // 返回true表示处理了任务
  }

  /**
   * 串行处理逻辑（原有逻辑）
   * @returns 是否处理了任务
   */
  private async runSerialProcessing(): Promise<boolean> {
    // 检查是否有活跃任务（确保串行执行）
    if (this.state.activeJobs.size > 0) {
      // 有活跃任务时，短暂等待
      await this.delay(50);
      return false;
    }

    // 从队列管理器获取下一个任务
    const job = this.drivenMemoryQueue.shift();
    if (!job) {
      // 队列为空，返回false表示没有处理任务
      return false;
    }

    // 执行任务
    await this.executeJob(job);

    // 短暂让出控制权，避免阻塞事件循环
    await this.delay(10);

    return true; // 返回true表示处理了任务
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 处理下一个任务（串行执行）
   * 注意：在连续处理模式下，此方法主要用于外部手动触发
   */
  private async processNextJob(): Promise<void> {
    try {
      // 检查是否有活跃任务（确保串行执行）
      if (this.state.activeJobs.size > 0) {
        return;
      }

      // 从队列管理器获取下一个任务
      const job = this.drivenMemoryQueue.shift();
      if (!job) {
        this.log.debug('队列为空，没有可处理的任务');
        return;
      }

      // 执行任务
      await this.executeJob(job);
    } catch (error) {
      this.log.error({ error }, '处理任务时发生错误');
    }
  }

  /**
   * 停止处理循环
   */
  private stopProcessingLoop(): void {
    if (this.isProcessingLoop) {
      this.isProcessingLoop = false;
      this.log.debug('任务处理循环已停止');
    }
  }

  /**
   * 执行单个任务
   */
  private async executeJob(job: QueueJob): Promise<void> {
    const executor = this.app.tryResolve(job.executor_name);
    if (!executor) {
      const error = new Error(`执行器 '${job.executor_name}' 未找到`);
      this.handleJobFailure(job, error);
      return;
    }

    // 检查任务是否可以执行
    if (!job.canExecute()) {
      this.log.debug({ jobId: job.id, status: job.status }, '任务当前不能执行');
      return;
    }

    // 添加到活跃任务列表
    const startTime = new Date();
    const activeJob: {
      job: QueueJob;
      executor: JobExecutor;
      startTime: Date;
      timeoutHandle?: NodeJS.Timeout;
    } = {
      job,
      executor,
      startTime
    };

    // 设置超时处理
    if (executor.config?.timeout) {
      activeJob.timeoutHandle = setTimeout(() => {
        this.handleJobTimeout(job, executor.config!.timeout!);
      }, executor.config.timeout);
    }

    this.state.activeJobs.set(job.id, activeJob);

    try {
      // 更新任务状态为执行中
      await this.jobRepository.updateStatus({
        jobId: job.id,
        status: 'executing',
        startedAt: startTime
      });

      this.log.info(
        {
          jobId: job.id,
          executorName: executor.name,
          queueName: job.queue_name
        },
        '开始执行任务'
      );

      this.emit('job:started', { job, executor });

      // 执行任务
      const result = await executor.execute(job);
      const executionTime = Date.now() - startTime.getTime();

      // 清理活跃任务
      this.cleanupActiveJob(job.id);

      // 处理执行结果
      if (result.success) {
        await this.handleJobSuccess(job, result, executionTime);
      } else {
        const error = result.error
          ? result.error instanceof Error
            ? result.error
            : new Error(result.error.message)
          : new Error('任务执行失败');
        await this.handleJobFailure(job, error);
      }

      // 在连续处理模式下，任务完成后由处理循环自动继续，无需手动触发
    } catch (error) {
      // 清理活跃任务
      this.cleanupActiveJob(job.id);

      // 处理执行错误
      await this.handleJobFailure(job, error as Error);

      // 更新执行器统计
      const executionTime = Date.now() - startTime.getTime();

      // 在连续处理模式下，任务失败后由处理循环自动继续，无需手动触发
    }
  }

  /**
   * 处理任务成功
   */
  private async handleJobSuccess(
    job: QueueJob,
    result: JobExecutionResult,
    executionTime: number
  ): Promise<void> {
    try {
      // 移动任务到成功表
      this.jobRepository.moveToSuccess(job, executionTime);

      this.state.totalProcessed++;
      this.state.totalSuccessful++;

      this.log.info(
        {
          jobId: job.id,
          executionTime,
          queueName: job.queue_name
        },
        '任务执行成功'
      );

      this.emit('job:completed', { job, result });

      // 🔥 新增：任务成功后直接检查队列水位并加载数据
      this.checkQueueAndLoadData('success');
    } catch (error) {
      this.log.error(
        {
          jobId: job.id,
          error
        },
        '处理任务成功结果时发生错误'
      );
    }
  }

  /**
   * 处理任务失败
   */
  private async handleJobFailure(job: QueueJob, error: Error): Promise<void> {
    try {
      const shouldRetry = job.attempts < job.max_attempts;

      if (shouldRetry) {
        // 重新设置任务状态为等待，增加重试次数
        await this.jobRepository.updateStatus({
          jobId: job.id,
          status: 'waiting'
        });

        this.log.warn(
          {
            jobId: job.id,
            attempt: job.attempts + 1,
            maxAttempts: job.max_attempts,
            error: error.message
          },
          '任务执行失败，将重试'
        );
      } else {
        // 标记任务为失败状态（保留在queue_jobs表中便于重试）
        await this.jobRepository.markAsFailed(job, {
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        });

        this.state.totalProcessed++;
        this.state.totalFailed++;

        this.log.error(
          {
            jobId: job.id,
            attempts: job.attempts,
            maxAttempts: job.max_attempts,
            error: error.message
          },
          '任务执行失败，已标记为失败状态'
        );

        // 🔥 新增：任务失败后直接检查队列水位并加载数据
        this.checkQueueAndLoadData('failure');
      }
      // 标记任务为失败状态（保留在queue_jobs表中便于重试）
      await this.jobRepository.markAsFailed(job, {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      });

      this.state.totalProcessed++;
      this.state.totalFailed++;

      this.log.error(
        {
          jobId: job.id,
          attempts: job.attempts,
          maxAttempts: job.max_attempts,
          error: error.message
        },
        '任务执行失败，已标记为失败状态'
      );

      // 🔥 新增：任务失败后直接检查队列水位并加载数据
      this.checkQueueAndLoadData('failure');
    } catch (repositoryError) {
      this.log.error(
        {
          jobId: job.id,
          originalError: error.message,
          repositoryError
        },
        '处理任务失败时发生错误'
      );
    }
  }

  /**
   * 处理任务超时
   */
  private async handleJobTimeout(
    job: QueueJob,
    timeoutMs: number
  ): Promise<void> {
    this.log.warn(
      {
        jobId: job.id,
        timeoutMs,
        executorName: job.executor_name
      },
      '任务执行超时'
    );

    this.emit('job:timeout', { job, timeoutMs });

    // 清理活跃任务
    this.cleanupActiveJob(job.id);

    // 处理为失败
    const timeoutError = new Error(`任务执行超时 (${timeoutMs}ms)`);
    await this.handleJobFailure(job, timeoutError);
  }

  /**
   * 清理活跃任务
   */
  private cleanupActiveJob(jobId: string): void {
    const activeJob = this.state.activeJobs.get(jobId);
    if (activeJob) {
      // 清理超时定时器
      if (activeJob.timeoutHandle) {
        clearTimeout(activeJob.timeoutHandle);
      }

      // 从活跃任务列表移除
      this.state.activeJobs.delete(jobId);
    }
  }

  /**
   * 直接检查队列水位并加载数据
   * 当任务完成（成功或失败）后调用
   */
  private checkQueueAndLoadData(trigger: 'success' | 'failure'): void {
    try {
      // 获取队列统计信息
      const currentQueueLength = this.drivenMemoryQueue.length;
      const stats = this.drivenMemoryQueue.getStatistics();
      const lowWaterMark = stats.waterMarks.low;

      this.log.debug(
        {
          trigger,
          currentQueueLength,
          lowWaterMark,
          activeJobsCount: this.state.activeJobs.size
        },
        '任务完成后检查队列水位'
      );

      if (currentQueueLength < lowWaterMark) {
        this.log.info(
          {
            trigger,
            currentQueueLength,
            lowThreshold: lowWaterMark
          },
          '🔄 队列水位较低，直接触发数据库加载'
        );

        // 直接调用数据库加载，使用异步避免阻塞
        setImmediate(() => {
          this.loadDataFromDatabase(trigger).catch((error) => {
            this.log.error({ error, trigger }, '任务完成后触发数据库加载失败');
          });
        });
      } else {
        this.log.debug(
          {
            trigger,
            currentQueueLength,
            lowWaterMark
          },
          '✅ 队列水位正常，无需加载数据'
        );
      }
    } catch (error) {
      this.log.error({ error, trigger }, '检查队列水位时发生错误');
    }
  }

  /**
   * 从数据库加载数据到内存队列
   */
  private async loadDataFromDatabase(
    trigger: 'success' | 'failure'
  ): Promise<void> {
    try {
      // 获取当前队列统计
      await this.databaseJobStream.triggerBatchLoad('job_processed' as any);
    } catch (error: any) {
      this.log.error({ error }, '❌ 触发批量加载失败');
      throw error;
    }
  }

  /**
   * 等待所有活跃任务完成
   */
  private async waitForActiveJobs(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (this.state.activeJobs.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        this.log.warn(
          { activeJobsCount: this.state.activeJobs.size },
          '等待活跃任务完成超时，强制停止'
        );

        // 强制清理所有活跃任务
        for (const [jobId] of this.state.activeJobs) {
          this.cleanupActiveJob(jobId);
        }
        break;
      }

      // 等待100ms后再检查
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * 销毁执行服务
   */
  async destroy(): Promise<void> {
    // 停止处理循环
    this.stopProcessingLoop();

    // 等待活跃任务完成
    await this.waitForActiveJobs(5000);

    // 清理事件监听器
    this.databaseJobStream.removeAllListeners('jobs:added');
    this.drivenMemoryQueue.removeAllListeners('length:changed');

    this.log.info('任务执行服务已销毁');
  }
}
