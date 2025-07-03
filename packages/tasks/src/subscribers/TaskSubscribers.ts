/**
 * 新任务系统的订阅器
 * 实现模块化的事件处理，支持数据库同步、缓存管理、日志记录等功能
 */

import { Logger } from '@stratix/core';
import { CompletedTaskRepository } from '../repositories/CompletedTaskRepository.js';
import { RunningTaskRepository } from '../repositories/RunningTaskRepository.js';
import { TaskStatus } from '../types/task.types.js';

/**
 * 事件数据接口
 */
interface TaskEventData {
  taskId: string;
  timestamp: Date;
  reason?: string;
}

interface TaskStatusChangedEvent extends TaskEventData {
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
}

interface TaskProgressUpdatedEvent extends TaskEventData {
  progress: number;
  previousProgress?: number;
}

interface TaskCreatedEvent extends TaskEventData {
  taskData: any;
}

interface TaskCompletedEvent extends TaskEventData {
  result?: any;
  finalStatus: TaskStatus;
}

/**
 * 订阅器基础接口
 */
interface ITaskSubscriber {
  name: string;
  initialize(): void;
  cleanup(): void;
}

/**
 * 数据库同步订阅器
 * 负责将内存中的状态变更同步到数据库
 */
export class DatabaseSyncSubscriber implements ITaskSubscriber {
  name = 'DatabaseSyncSubscriber';

  constructor(
    private readonly runningTaskRepo: RunningTaskRepository,
    private readonly completedTaskRepo: CompletedTaskRepository,
    private readonly log: Logger,
    private readonly eventBus: any
  ) {}

  initialize(): void {
    // 订阅状态变更事件
    this.eventBus.on(
      'task:status:changed',
      this.handleStatusChanged.bind(this)
    );

    // 订阅进度更新事件
    this.eventBus.on(
      'task:progress:updated',
      this.handleProgressUpdated.bind(this)
    );

    // 订阅任务完成事件
    this.eventBus.on('task:completed', this.handleTaskCompleted.bind(this));

    this.log.info('数据库同步订阅器已初始化');
  }

  cleanup(): void {
    this.eventBus.off('task:status:changed', this.handleStatusChanged);
    this.eventBus.off('task:progress:updated', this.handleProgressUpdated);
    this.eventBus.off('task:completed', this.handleTaskCompleted);

    this.log.info('数据库同步订阅器已清理');
  }

  private async handleStatusChanged(
    event: TaskStatusChangedEvent
  ): Promise<void> {
    try {
      const { taskId, toStatus } = event;

      await this.runningTaskRepo.updateStatus(taskId, toStatus);

      this.log.debug(
        {
          taskId,
          fromStatus: event.fromStatus,
          toStatus,
          reason: event.reason
        },
        '任务状态已同步到数据库'
      );

      // 如果任务完成，移动到已完成表
      if (this.isCompletedStatus(toStatus)) {
        await this.moveToCompletedTable(taskId, toStatus);
      }
    } catch (error) {
      this.log.error(
        {
          taskId: event.taskId,
          error: error instanceof Error ? error.message : String(error)
        },
        '数据库状态同步失败'
      );
    }
  }

  private async handleProgressUpdated(
    event: TaskProgressUpdatedEvent
  ): Promise<void> {
    try {
      const { taskId, progress } = event;

      // 先获取当前任务状态，然后更新进度
      const currentTask = await this.runningTaskRepo.findById(taskId);
      if (currentTask) {
        await this.runningTaskRepo.updateStatus(
          taskId,
          currentTask.status as TaskStatus,
          progress
        );
      }

      this.log.debug(
        { taskId, progress, reason: event.reason },
        '任务进度已同步到数据库'
      );
    } catch (error) {
      this.log.error(
        {
          taskId: event.taskId,
          error: error instanceof Error ? error.message : String(error)
        },
        '数据库进度同步失败'
      );
    }
  }

  private async handleTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    try {
      const { taskId, finalStatus, result } = event;

      // 移动到已完成表
      await this.moveToCompletedTable(taskId, finalStatus, result);

      this.log.info(
        { taskId, finalStatus, reason: event.reason },
        '任务已移动到完成表'
      );
    } catch (error) {
      this.log.error(
        {
          taskId: event.taskId,
          error: error instanceof Error ? error.message : String(error)
        },
        '任务完成处理失败'
      );
    }
  }

  private isCompletedStatus(status: TaskStatus): boolean {
    return [
      TaskStatus.SUCCESS,
      TaskStatus.FAILED,
      TaskStatus.CANCELLED
    ].includes(status);
  }

  private async moveToCompletedTable(
    taskId: string,
    finalStatus: TaskStatus,
    result?: any
  ): Promise<void> {
    try {
      // 从运行表获取任务数据
      const runningTask = await this.runningTaskRepo.findById(taskId);
      if (!runningTask) {
        this.log.warn({ taskId }, '未找到运行中的任务，无法移动到完成表');
        return;
      }

      // 使用backupTaskTree方法创建完成任务记录
      const completedTask = {
        ...runningTask,
        status: finalStatus,
        progress: 100, // 完成的任务进度设为100
        result: result ? JSON.stringify(result) : null,
        completed_at: new Date()
      };

      await this.completedTaskRepo.backupTaskTree([completedTask]);

      // 从运行表删除
      await this.runningTaskRepo.deleteTask(taskId);

      this.log.debug({ taskId, finalStatus }, '任务已从运行表移动到完成表');
    } catch (error) {
      this.log.error({ taskId, finalStatus, error }, '移动任务到完成表失败');
      throw error;
    }
  }
}

/**
 * 性能监控订阅器
 * 负责记录任务执行性能指标
 */
export class PerformanceMonitorSubscriber implements ITaskSubscriber {
  name = 'PerformanceMonitorSubscriber';

  private taskStartTimes = new Map<string, Date>();
  private performanceStats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0
  };

  constructor(
    private readonly log: Logger,
    private readonly eventBus: any
  ) {}

  initialize(): void {
    this.eventBus.on(
      'task:status:changed',
      this.handleStatusChanged.bind(this)
    );
    this.eventBus.on('task:created', this.handleTaskCreated.bind(this));
    this.eventBus.on('task:completed', this.handleTaskCompleted.bind(this));

    this.log.info('性能监控订阅器已初始化');
  }

  cleanup(): void {
    this.eventBus.off('task:status:changed', this.handleStatusChanged);
    this.eventBus.off('task:created', this.handleTaskCreated);
    this.eventBus.off('task:completed', this.handleTaskCompleted);

    this.log.info('性能监控订阅器已清理');
  }

  private handleTaskCreated(event: TaskCreatedEvent): void {
    this.performanceStats.totalTasks++;
    this.log.debug({ taskId: event.taskId }, '任务创建计数已更新');
  }

  private handleStatusChanged(event: TaskStatusChangedEvent): void {
    const { taskId, fromStatus, toStatus } = event;

    // 记录任务开始时间
    if (toStatus === TaskStatus.RUNNING && fromStatus !== TaskStatus.PAUSED) {
      this.taskStartTimes.set(taskId, new Date());
      this.log.debug({ taskId }, '记录任务开始时间');
    }

    // 记录任务完成时间并计算执行时长
    if (this.isCompletedStatus(toStatus)) {
      const startTime = this.taskStartTimes.get(taskId);
      if (startTime) {
        const executionTime = Date.now() - startTime.getTime();
        this.updateExecutionStats(taskId, executionTime, toStatus);
        this.taskStartTimes.delete(taskId);
      }
    }
  }

  private handleTaskCompleted(event: TaskCompletedEvent): void {
    this.performanceStats.completedTasks++;

    if (event.finalStatus === TaskStatus.FAILED) {
      this.performanceStats.failedTasks++;
    }

    this.log.debug(
      { taskId: event.taskId, finalStatus: event.finalStatus },
      '任务完成统计已更新'
    );
  }

  private updateExecutionStats(
    taskId: string,
    executionTime: number,
    finalStatus: TaskStatus
  ): void {
    this.performanceStats.totalExecutionTime += executionTime;
    this.performanceStats.averageExecutionTime =
      this.performanceStats.totalExecutionTime /
      this.performanceStats.completedTasks;

    this.log.info(
      {
        taskId,
        executionTime: `${executionTime}ms`,
        finalStatus,
        averageTime: `${Math.round(this.performanceStats.averageExecutionTime)}ms`
      },
      '任务执行性能已记录'
    );
  }

  private isCompletedStatus(status: TaskStatus): boolean {
    return [
      TaskStatus.SUCCESS,
      TaskStatus.FAILED,
      TaskStatus.CANCELLED
    ].includes(status);
  }

  getPerformanceStats() {
    return { ...this.performanceStats };
  }

  resetStats(): void {
    this.performanceStats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
    this.taskStartTimes.clear();
    this.log.info('性能统计已重置');
  }
}

/**
 * 缓存管理订阅器
 * 负责优化缓存策略和清理不必要的缓存
 */
export class CacheManagementSubscriber implements ITaskSubscriber {
  name = 'CacheManagementSubscriber';

  constructor(
    private readonly log: Logger,
    private readonly eventBus: any,
    private readonly taskService: any // NewTaskService的实例
  ) {}

  initialize(): void {
    this.eventBus.on('task:completed', this.handleTaskCompleted.bind(this));

    // 定期清理缓存
    this.startPeriodicCleanup();

    this.log.info('缓存管理订阅器已初始化');
  }

  cleanup(): void {
    this.eventBus.off('task:completed', this.handleTaskCompleted);
    this.log.info('缓存管理订阅器已清理');
  }

  private handleTaskCompleted(event: TaskCompletedEvent): void {
    // 任务完成后，可以考虑从缓存中移除（因为不再需要频繁访问）
    // 但要保留一段时间以备查询需要
    setTimeout(() => {
      this.considerCacheEviction(event.taskId);
    }, 30000); // 30秒后考虑清理
  }

  private considerCacheEviction(taskId: string): void {
    // 这里可以实现更复杂的缓存淘汰策略
    // 例如：检查任务是否有子任务正在运行，如果没有则可以清理
    this.log.debug({ taskId }, '考虑清理已完成任务的缓存');
  }

  private startPeriodicCleanup(): void {
    // 每5分钟检查一次缓存状态
    setInterval(
      () => {
        const stats = this.taskService.getCacheStats();
        this.log.debug(stats, '当前缓存状态');

        // 如果缓存使用率过高，可以主动触发清理
        if (stats.cache.size > stats.cache.maxSize * 0.8) {
          this.log.info('缓存使用率较高，建议监控缓存淘汰情况');
        }
      },
      5 * 60 * 1000
    );
  }
}

/**
 * 依赖任务订阅器
 * 处理任务间的依赖关系
 */
export class TaskDependencySubscriber implements ITaskSubscriber {
  name = 'TaskDependencySubscriber';

  constructor(
    private readonly log: Logger,
    private readonly eventBus: any,
    private readonly taskService: any
  ) {}

  initialize(): void {
    this.eventBus.on(
      'task:status:changed',
      this.handleStatusChanged.bind(this)
    );
    this.log.info('任务依赖订阅器已初始化');
  }

  cleanup(): void {
    this.eventBus.off('task:status:changed', this.handleStatusChanged);
    this.log.info('任务依赖订阅器已清理');
  }

  private async handleStatusChanged(
    event: TaskStatusChangedEvent
  ): Promise<void> {
    const { taskId, toStatus } = event;

    try {
      // 如果任务完成，检查是否有依赖此任务的其他任务需要启动
      if (toStatus === TaskStatus.SUCCESS) {
        await this.checkDependentTasks(taskId);
      }

      // 如果任务失败，可能需要处理依赖任务的失败逻辑
      if (toStatus === TaskStatus.FAILED) {
        await this.handleDependentTaskFailure(taskId);
      }
    } catch (error) {
      this.log.error({ taskId, error }, '处理任务依赖关系时发生错误');
    }
  }

  private async checkDependentTasks(completedTaskId: string): Promise<void> {
    // TODO: 实现依赖任务检查逻辑
    // 这里需要根据具体的依赖关系设计来实现
    this.log.debug({ completedTaskId }, '检查依赖任务');
  }

  private async handleDependentTaskFailure(
    failedTaskId: string
  ): Promise<void> {
    // TODO: 实现依赖任务失败处理逻辑
    this.log.debug({ failedTaskId }, '处理依赖任务失败');
  }
}

/**
 * 订阅器管理器
 * 统一管理所有订阅器的生命周期
 */
export class SubscriberManager {
  private subscribers: ITaskSubscriber[] = [];

  constructor(private readonly log: Logger) {}

  addSubscriber(subscriber: ITaskSubscriber): void {
    this.subscribers.push(subscriber);
    subscriber.initialize();
    this.log.info({ subscriberName: subscriber.name }, '订阅器已添加并初始化');
  }

  removeSubscriber(subscriberName: string): void {
    const index = this.subscribers.findIndex(
      (sub) => sub.name === subscriberName
    );
    if (index > -1) {
      const subscriber = this.subscribers[index];
      subscriber.cleanup();
      this.subscribers.splice(index, 1);
      this.log.info({ subscriberName }, '订阅器已移除并清理');
    }
  }

  cleanup(): void {
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber.cleanup();
      } catch (error) {
        this.log.error(
          { subscriberName: subscriber.name, error },
          '订阅器清理时发生错误'
        );
      }
    });
    this.subscribers = [];
    this.log.info('所有订阅器已清理');
  }

  getSubscribers(): string[] {
    return this.subscribers.map((sub) => sub.name);
  }
}
