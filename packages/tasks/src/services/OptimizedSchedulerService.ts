/**
 * 优化的调度器服务实现 - 直接方法调用+精确定时器
 *
 * 使用直接方法调用和cron-parser，替换循环扫描为精确定时
 * 版本: v3.2.0-direct-call
 */

import type { AwilixContainer, Logger } from '@stratix/core';
import { RESOLVER } from '@stratix/core';
import { CronExpressionParser } from 'cron-parser';
import type {
  IScheduleExecutionRepository,
  IScheduleRepository,
  ISchedulerService
} from '../interfaces/schedule.interfaces.js';
import { getExecutor } from '../registerTask.js';
import { ServiceResult } from '../types/index.js';
import type {
  Schedule,
  ScheduleConfig,
  SchedulerStatus
} from '../types/schedule.types.js';
/**
 * 调度任务接口
 */
interface ScheduledTask {
  id: number;
  schedule: Schedule;
  nextRunTime: Date;
  timer?: NodeJS.Timeout;
}

/**
 * 优化调度器配置
 */
interface OptimizedSchedulerOptions {
  enabled: boolean;
  maxConcurrency: number;
  recoveryCheckInterval: number;
}

/**
 * 优化的调度器服务 - 直接方法调用实现
 *
 * 核心特性：
 * - 使用setTimeout替代setInterval，精确定时
 * - 使用直接方法调用处理任务变更，避免事件驱动的复杂性
 * - 使用cron-parser正确解析cron表达式
 * - 保持现有接口完全兼容
 * - 原子性操作，避免竞态条件
 */
export default class OptimizedSchedulerService implements ISchedulerService {
  private scheduledTasks = new Map<number, ScheduledTask>();
  private recoveryTimer?: NodeJS.Timeout;
  private isRunning = false;
  private runningTasks = new Set<number>();

  /**
   * Stratix框架依赖注入配置
   */
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      const config = container.resolve('config') as any;
      const schedulerConfig = config.scheduler || {};

      return {
        options: {
          enabled: schedulerConfig.enabled ?? true,
          maxConcurrency: schedulerConfig.maxConcurrency ?? 10,
          recoveryCheckInterval: schedulerConfig.recoveryCheckInterval ?? 600000 // 10分钟
        }
      };
    }
  };

  constructor(
    private readonly scheduleRepository: IScheduleRepository,
    private readonly scheduleExecutionRepository: IScheduleExecutionRepository,
    private readonly logger: Logger,
    private readonly options: OptimizedSchedulerOptions
  ) {}

  /**
   * 启动优化调度器
   */
  async onReady(): Promise<ServiceResult<boolean>> {
    try {
      if (this.isRunning) {
        return { success: false, error: 'Scheduler is already running' };
      }

      if (!this.options.enabled) {
        this.logger.info('⚡ Optimized scheduler is disabled');
        return { success: true, data: true };
      }

      this.logger.info(
        '⚡ Starting optimized direct-call scheduler (no more 30s scanning!)'
      );

      // 加载现有任务
      await this.loadExistingTasks();

      // 启动恢复检查
      this.startRecoveryCheck();

      this.isRunning = true;

      this.logger.info('✅ Optimized scheduler service started successfully', {
        scheduledTasks: this.scheduledTasks.size,
        architecture: 'direct-call + precise timers'
      });

      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to start optimized scheduler service', {
        error
      });
      return {
        success: false,
        error: 'Failed to start scheduler',
        errorDetails: error
      };
    }
  }

  /**
   * 停止优化调度器
   */
  async onClose(): Promise<ServiceResult<boolean>> {
    try {
      if (!this.isRunning) {
        return { success: false, error: 'Scheduler is not running' };
      }

      this.logger.info('Stopping optimized scheduler service');

      // 清除所有定时器
      for (const task of this.scheduledTasks.values()) {
        if (task.timer) {
          clearTimeout(task.timer);
        }
      }
      this.scheduledTasks.clear();

      // 停止恢复检查
      if (this.recoveryTimer) {
        clearInterval(this.recoveryTimer);
        this.recoveryTimer = undefined;
      }

      this.isRunning = false;

      this.logger.info('Optimized scheduler service stopped successfully');
      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to stop scheduler', { error });
      return {
        success: false,
        error: 'Failed to stop scheduler',
        errorDetails: error
      };
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): SchedulerStatus {
    const nextTask = Array.from(this.scheduledTasks.values()).sort(
      (a, b) => a.nextRunTime.getTime() - b.nextRunTime.getTime()
    )[0];

    return {
      isRunning: this.isRunning,
      runningTasks: this.runningTasks.size,
      totalSchedules: this.scheduledTasks.size,
      enabledSchedules: this.scheduledTasks.size,
      nextScanAt: nextTask?.nextRunTime
    };
  }

  /**
   * 手动触发扫描
   */
  async triggerScan(): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Manual scan triggered - reloading tasks');
      await this.reloadSchedules();
      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to trigger scan', { error });
      return {
        success: false,
        error: 'Failed to trigger scan',
        errorDetails: error
      };
    }
  }

  /**
   * 重新加载定时任务配置
   */
  async reloadSchedules(): Promise<ServiceResult<boolean>> {
    try {
      // 清除现有任务
      for (const task of this.scheduledTasks.values()) {
        if (task.timer) {
          clearTimeout(task.timer);
        }
      }
      this.scheduledTasks.clear();

      // 重新加载
      await this.loadExistingTasks();

      this.logger.info('Schedules reloaded successfully', {
        scheduledTasks: this.scheduledTasks.size
      });

      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to reload schedules', { error });
      return {
        success: false,
        error: 'Failed to reload schedules',
        errorDetails: error
      };
    }
  }

  /**
   * 暂停调度器
   */
  async pause(): Promise<ServiceResult<boolean>> {
    try {
      for (const task of this.scheduledTasks.values()) {
        if (task.timer) {
          clearTimeout(task.timer);
          task.timer = undefined;
        }
      }
      this.logger.info('Scheduler paused');
      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to pause scheduler', { error });
      return {
        success: false,
        error: 'Failed to pause scheduler',
        errorDetails: error
      };
    }
  }

  /**
   * 恢复调度器
   */
  async resume(): Promise<ServiceResult<boolean>> {
    try {
      for (const task of this.scheduledTasks.values()) {
        this.scheduleTask(task);
      }
      this.logger.info('Scheduler resumed');
      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to resume scheduler', { error });
      return {
        success: false,
        error: 'Failed to resume scheduler',
        errorDetails: error
      };
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 加载现有任务 - 增强的自动恢复机制
   */
  private async loadExistingTasks(): Promise<void> {
    try {
      this.logger.info('Loading existing schedules from database...');

      const result = await this.scheduleRepository.findWithPagination({
        enabled: true,
        pageSize: 1000
      });

      if (!result.success) {
        throw new Error(`Failed to load schedules: ${result.error}`);
      }

      const schedules = result.data?.items || [];
      let loadedCount = 0;
      let skippedCount = 0;
      const errors: Array<{ scheduleId: number; error: string }> = [];

      for (const schedule of schedules) {
        try {
          // 验证执行器是否存在
          const executor = getExecutor(schedule.executorName);
          if (!executor) {
            this.logger.warn('Executor not found for schedule, skipping', {
              scheduleId: schedule.id,
              executorName: schedule.executorName
            });
            skippedCount++;
            errors.push({
              scheduleId: schedule.id,
              error: `Executor not found: ${schedule.executorName}`
            });
            continue;
          }

          // 计算下次执行时间
          const nextRunTime = this.calculateNextRunTime(
            schedule.cronExpression,
            schedule.timezone
          );
          if (!nextRunTime) {
            this.logger.warn('Invalid cron expression for schedule, skipping', {
              scheduleId: schedule.id,
              cronExpression: schedule.cronExpression
            });
            skippedCount++;
            errors.push({
              scheduleId: schedule.id,
              error: `Invalid cron expression: ${schedule.cronExpression}`
            });
            continue;
          }

          // 创建调度任务
          const task: ScheduledTask = {
            id: schedule.id,
            schedule,
            nextRunTime
          };

          this.scheduledTasks.set(schedule.id, task);
          this.scheduleTask(task);
          loadedCount++;

          this.logger.debug('Schedule loaded successfully', {
            scheduleId: schedule.id,
            name: schedule.name,
            executorName: schedule.executorName,
            nextRunTime
          });
        } catch (error) {
          this.logger.error('Failed to load individual schedule', {
            scheduleId: schedule.id,
            error
          });
          skippedCount++;
          errors.push({
            scheduleId: schedule.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.logger.info('Schedule loading completed', {
        totalSchedules: schedules.length,
        loadedCount,
        skippedCount,
        scheduledTasks: this.scheduledTasks.size,
        errors: errors.length > 0 ? errors : undefined
      });

      // 如果有错误但不是全部失败，记录警告而不是抛出异常
      if (errors.length > 0 && loadedCount > 0) {
        this.logger.warn(
          'Some schedules failed to load but service will continue',
          {
            errorCount: errors.length,
            successCount: loadedCount
          }
        );
      } else if (errors.length > 0 && loadedCount === 0) {
        throw new Error(
          `All schedules failed to load. First error: ${errors[0]?.error}`
        );
      }
    } catch (error) {
      this.logger.error('Failed to load existing tasks', { error });
      throw error;
    }
  }

  /**
   * 调度单个任务 - 使用精确setTimeout
   */
  private scheduleTask(task: ScheduledTask): void {
    // 清除现有定时器
    if (task.timer) {
      clearTimeout(task.timer);
    }

    const delay = Math.max(0, task.nextRunTime.getTime() - Date.now());

    task.timer = setTimeout(async () => {
      await this.executeTask(task);
    }, delay);

    this.logger.debug('Task scheduled with precise timer', {
      taskId: task.id,
      nextRunTime: task.nextRunTime,
      delay
    });
  }

  /**
   * 执行任务
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    if (this.runningTasks.size >= this.options.maxConcurrency) {
      this.logger.warn('Max concurrency reached, rescheduling task', {
        taskId: task.id
      });
      // 重新调度到1分钟后
      task.nextRunTime = new Date(Date.now() + 60000);
      this.scheduleTask(task);
      return;
    }

    this.runningTasks.add(task.id);

    try {
      await this.executeScheduledTask(task.schedule);

      // 计算下次执行时间
      const nextRunTime = this.calculateNextRunTime(
        task.schedule.cronExpression,
        task.schedule.timezone
      );

      if (nextRunTime && task.schedule.enabled) {
        task.nextRunTime = nextRunTime;
        this.scheduleTask(task);

        // 注意：不再在数据库中存储运行时状态，只在内存中管理调度
      } else {
        // 任务不再需要调度，从队列中移除
        this.scheduledTasks.delete(task.id);
      }
    } catch (error) {
      this.logger.error('Task execution failed', {
        taskId: task.id,
        error
      });

      // 注意：不再在数据库中存储运行时状态，失败信息记录在执行历史中
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  /**
   * 执行单个定时任务 - 使用执行器模式
   */
  private async executeScheduledTask(schedule: Schedule): Promise<void> {
    const executionId = `schedule-${schedule.id}-${Date.now()}`;

    try {
      this.logger.info('Executing scheduled task', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        executorName: schedule.executorName,
        executionId
      });

      // 1. 创建执行记录
      const execution = await this.scheduleExecutionRepository.create({
        schedule_id: schedule.id,
        status: 'running' as any,
        started_at: new Date(),
        trigger_time: new Date()
      });

      if (!execution.success) {
        throw new Error(
          `Failed to create execution record: ${execution.error}`
        );
      }

      // 2. 获取任务执行器
      const executor = getExecutor(schedule.executorName);
      if (!executor) {
        throw new Error(`Task executor not found: ${schedule.executorName}`);
      }

      // 3. 准备执行上下文
      const executionContext = {
        workflowInstance: {
          id: 0, // 定时任务没有工作流实例
          workflowDefinitionId: 0,
          name: `schedule-workflow-${schedule.id}`,
          status: 'running' as const,
          instanceType: 'schedule' as const,
          inputData: schedule.inputData || {},
          contextData: {
            ...schedule.contextData,
            scheduleId: schedule.id,
            executionId,
            triggeredBy: 'optimized-scheduler',
            businessKey: schedule.businessKey,
            mutexKey: schedule.mutexKey
          },
          retryCount: 0,
          maxRetries: 3,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        nodeInstance: {
          id: schedule.id,
          workflowInstanceId: 0,
          nodeId: `schedule-${schedule.id}`,
          nodeName: schedule.name,
          nodeType: 'simple' as const,
          status: 'running' as const,
          executor: schedule.executorName,
          inputData: schedule.inputData || {},
          retryCount: 0,
          maxRetries: 3,
          loopCompletedCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        nodeDefinition: {
          nodeId: `schedule-${schedule.id}`,
          nodeName: schedule.name,
          nodeType: 'simple' as const,
          executor: schedule.executorName,
          maxRetries: 3,
          inputData: schedule.inputData || {}
        },
        config: schedule.inputData || {}
      };

      // 4. 执行任务
      const executionResult = await executor.execute(executionContext);

      // 5. 更新执行记录
      const completedAt = new Date();
      const durationMs =
        completedAt.getTime() - execution.data!.startedAt.getTime();

      if (executionResult.success) {
        await this.scheduleExecutionRepository.update(execution.data!.id, {
          status: 'success' as any,
          completed_at: completedAt,
          duration_ms: durationMs
        });

        this.logger.info('Scheduled task executed successfully', {
          scheduleId: schedule.id,
          executorName: schedule.executorName,
          executionId,
          durationMs,
          result: executionResult.data
        });
      } else {
        await this.scheduleExecutionRepository.update(execution.data!.id, {
          status: 'failed' as any,
          completed_at: completedAt,
          duration_ms: durationMs,
          error_message: executionResult.error
        });

        throw new Error(`Task execution failed: ${executionResult.error}`);
      }
    } catch (error) {
      this.logger.error('Error in scheduled task execution', {
        scheduleId: schedule.id,
        executorName: schedule.executorName,
        executionId,
        error
      });
      throw error;
    }
  }

  /**
   * 计算下次执行时间 - 使用cron-parser
   */
  private calculateNextRunTime(
    cronExpression: string,
    timezone: string = 'UTC'
  ): Date | null {
    try {
      const interval = CronExpressionParser.parse(cronExpression, {
        tz: timezone,
        currentDate: new Date()
      });

      return interval.next().toDate();
    } catch (error) {
      this.logger.error('Failed to calculate next run time', {
        cronExpression,
        timezone,
        error
      });
      return null;
    }
  }

  /**
   * 启动恢复检查
   */
  private startRecoveryCheck(): void {
    this.recoveryTimer = setInterval(async () => {
      try {
        await this.performRecoveryCheck();
      } catch (error) {
        this.logger.error('Error in recovery check', { error });
      }
    }, this.options.recoveryCheckInterval);

    this.logger.info('Recovery check started', {
      interval: this.options.recoveryCheckInterval
    });
  }

  /**
   * 执行恢复检查
   */
  private async performRecoveryCheck(): Promise<void> {
    try {
      this.logger.debug('Performing recovery check');

      // 检查是否有任务丢失
      const result = await this.scheduleRepository.findWithPagination({
        enabled: true,
        pageSize: 1000
      });

      if (result.success) {
        const schedules = result.data?.items || [];

        for (const schedule of schedules) {
          if (!this.scheduledTasks.has(schedule.id)) {
            // 发现丢失的任务，重新添加
            this.logger.info('Recovered missing task', {
              scheduleId: schedule.id
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in recovery check', { error });
    }
  }

  // ==================== 公共接口 ====================

  /**
   * 创建并添加定时任务 - 同时保存到数据库和内存调度器
   */
  async createSchedule(
    config: ScheduleConfig
  ): Promise<ServiceResult<Schedule>> {
    try {
      this.logger.info('Creating new schedule', {
        name: config.name,
        executorName: config.executorName,
        cronExpression: config.cronExpression
      });

      // 1. 验证执行器是否存在
      const executor = getExecutor(config.executorName);
      if (!executor) {
        return {
          success: false,
          error: `Task executor not found: ${config.executorName}`
        };
      }

      // 2. 验证cron表达式
      const nextRunTime = this.calculateNextRunTime(
        config.cronExpression,
        config.timezone || 'UTC'
      );
      if (!nextRunTime) {
        return {
          success: false,
          error: `Invalid cron expression: ${config.cronExpression}`
        };
      }

      // 3. 保存到数据库
      const scheduleData = {
        name: config.name,
        executor_name: config.executorName,
        workflow_definition_id: config.workflowDefinitionId,
        cron_expression: config.cronExpression,
        timezone: config.timezone || 'UTC',
        enabled: config.enabled ?? true,
        // 合并executorConfig到input_data中
        input_data: {
          ...config.inputData,
          ...(config.executorConfig || {})
        },
        context_data: config.contextData,
        business_key: config.businessKey,
        mutex_key: config.mutexKey,
        created_by: config.createdBy
      };

      const createResult = await this.scheduleRepository.create(scheduleData);
      if (!createResult.success) {
        return {
          success: false,
          error: `Failed to save schedule to database: ${createResult.error?.message || 'Unknown error'}`,
          errorDetails: createResult.error
        };
      }

      const schedule = createResult.data!;

      // 4. 立即添加到内存调度器
      this.addScheduleToMemory(schedule);

      this.logger.info('Schedule created and added to scheduler', {
        scheduleId: schedule.id,
        name: schedule.name,
        nextRunTime
      });

      return {
        success: true,
        data: schedule
      };
    } catch (error) {
      this.logger.error('Failed to create schedule', {
        config,
        error
      });
      return {
        success: false,
        error: 'Failed to create schedule',
        errorDetails: error
      };
    }
  }

  /**
   * 添加已存在的任务到调度队列 (内部使用)
   */
  addScheduleToMemory(schedule: Schedule): void {
    try {
      // 验证执行器是否存在
      const executor = getExecutor(schedule.executorName);
      if (!executor) {
        this.logger.warn('Executor not found for schedule, skipping', {
          scheduleId: schedule.id,
          executorName: schedule.executorName
        });
        return;
      }

      // 计算下次执行时间
      const nextRunTime = this.calculateNextRunTime(
        schedule.cronExpression,
        schedule.timezone
      );
      if (!nextRunTime) {
        this.logger.warn('Invalid cron expression for schedule, skipping', {
          scheduleId: schedule.id,
          cronExpression: schedule.cronExpression
        });
        return;
      }

      // 创建调度任务
      const task: ScheduledTask = {
        id: schedule.id,
        schedule,
        nextRunTime
      };

      this.scheduledTasks.set(schedule.id, task);
      this.scheduleTask(task);

      this.logger.info('Schedule added to memory scheduler', {
        scheduleId: schedule.id,
        name: schedule.name,
        nextRunTime
      });
    } catch (error) {
      this.logger.error('Failed to add schedule to memory', {
        scheduleId: schedule.id,
        error
      });
    }
  }

  /**
   * 添加任务到调度队列 (向后兼容)
   */
  addSchedule(schedule: Schedule): void {
    this.addScheduleToMemory(schedule);
  }

  /**
   * 更新调度队列中的任务
   */
  updateSchedule(schedule: Schedule): void {
    try {
      // 先删除旧的任务
      this.deleteSchedule(schedule.id);

      // 如果任务仍然启用，重新添加
      if (schedule.enabled) {
        this.addScheduleToMemory(schedule);
      }

      this.logger.info('Schedule updated in memory scheduler', {
        scheduleId: schedule.id,
        name: schedule.name,
        enabled: schedule.enabled
      });
    } catch (error) {
      this.logger.error('Failed to update schedule in memory', {
        scheduleId: schedule.id,
        error
      });
    }
  }

  /**
   * 从调度队列中删除任务
   */
  deleteSchedule(scheduleId: number): void {
    try {
      const task = this.scheduledTasks.get(scheduleId);
      if (task) {
        // 清除定时器
        if (task.timer) {
          clearTimeout(task.timer);
        }

        // 从调度队列中移除
        this.scheduledTasks.delete(scheduleId);

        // 从运行任务集合中移除（如果正在运行）
        this.runningTasks.delete(scheduleId);

        this.logger.info('Schedule deleted from memory scheduler', {
          scheduleId,
          name: task.schedule.name
        });
      } else {
        this.logger.debug('Schedule not found in memory scheduler', {
          scheduleId
        });
      }
    } catch (error) {
      this.logger.error('Failed to delete schedule from memory', {
        scheduleId,
        error
      });
    }
  }
}
