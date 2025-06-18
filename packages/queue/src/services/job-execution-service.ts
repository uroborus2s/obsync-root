/**
 * @stratix/queue 任务执行服务
 */

import type { IStratixApp, Logger } from '@stratix/core';
import { EventEmitter } from 'node:events';
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
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
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
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0
    };
  }

  /**
   * 启动执行服务
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      this.log.warn('执行服务已经在运行');
      return;
    }

    this.state.isRunning = true;
    this.state.isPaused = false;

    this.log.info(
      {
        concurrencyLimit: this.state.concurrencyLimit,
        mode: '连续执行模式'
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
   * 连续处理循环 - 处理所有任务直到队列为空
   */
  private async runContinuousProcessingLoop(): Promise<void> {
    try {
      this.log.debug('开始连续处理循环');

      while (
        this.isProcessingLoop &&
        this.state.isRunning &&
        !this.state.isPaused
      ) {
        // 检查是否有活跃任务（确保串行执行）
        if (this.state.activeJobs.size > 0) {
          // 有活跃任务时，短暂等待
          await this.delay(50);
          continue;
        }

        // 从队列管理器获取下一个任务
        const job = this.drivenMemoryQueue.shift();
        if (!job) {
          // 队列为空，停止处理循环
          this.log.debug('队列为空，停止连续处理循环');
          break;
        }

        // 执行任务
        await this.executeJob(job);

        // 短暂让出控制权，避免阻塞事件循环
        await this.delay(10);
      }
    } catch (error) {
      this.log.error({ error }, '连续处理循环发生错误');
    } finally {
      this.isProcessingLoop = false;
      this.log.debug('连续处理循环已结束');
    }
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
      // const shouldRetry = job.attempts < job.max_attempts;

      // if (shouldRetry) {
      //   // 重新设置任务状态为等待，增加重试次数
      //   await this.jobRepository.updateStatus({
      //     jobId: job.id,
      //     status: 'waiting'
      //   });

      //   this.log.warn(
      //     {
      //       jobId: job.id,
      //       attempt: job.attempts + 1,
      //       maxAttempts: job.max_attempts,
      //       error: error.message
      //     },
      //     '任务执行失败，将重试'
      //   );
      // } else {
      //   // 标记任务为失败状态（保留在queue_jobs表中便于重试）
      //   await this.jobRepository.markAsFailed(job, {
      //     message: error.message,
      //     stack: error.stack,
      //     code: (error as any).code
      //   });

      //   this.state.totalProcessed++;
      //   this.state.totalFailed++;

      //   this.log.error(
      //     {
      //       jobId: job.id,
      //       attempts: job.attempts,
      //       maxAttempts: job.max_attempts,
      //       error: error.message
      //     },
      //     '任务执行失败，已标记为失败状态'
      //   );

      //   // 🔥 新增：任务失败后直接检查队列水位并加载数据
      //   this.checkQueueAndLoadData('failure');
      // }
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
    this.log.info('任务执行服务已销毁');
  }
}
