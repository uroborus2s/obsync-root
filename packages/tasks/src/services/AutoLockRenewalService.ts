/**
 * 自动锁续期服务
 *
 * 为长时间运行的工作流提供自动锁续期功能
 * 版本: v3.0.0-enhanced
 */

import type { AwilixContainer, Logger } from '@stratix/core';
import { RESOLVER } from '@stratix/core';
import type { IExecutionLockService } from '../interfaces/services.js';
import type { ServiceResult } from '../types/business.js';

/**
 * 自动续期配置
 */
export interface AutoRenewalConfig {
  /** 是否启用自动续期 */
  enabled?: boolean;
  /** 续期间隔（毫秒），默认60秒 */
  renewalInterval?: number;
  /** 每次续期延长的时间（毫秒），默认5分钟 */
  lockExtension?: number;
  /** 最大续期重试次数 */
  maxRetryAttempts?: number;
  /** 续期失败后的重试间隔（毫秒） */
  retryInterval?: number;
}

/**
 * 续期任务信息
 */
interface RenewalTask {
  instanceId: number;
  owner: string;
  timer: NodeJS.Timeout;
  retryCount: number;
  startTime: Date;
  lastRenewalTime: Date;
  isActive: boolean; // 新增：标记任务是否活跃
}

/**
 * 自动锁续期服务实现
 */
export default class AutoLockRenewalService {
  private renewalTasks = new Map<string, RenewalTask>();
  private isShuttingDown = false;

  /**
   * Stratix框架依赖注入配置
   */
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      const config = container.resolve('config') as any;

      // 优先从插件配置获取，然后回退到全局配置
      const renewalConfig = config.lockRenewal || {};

      return {
        options: {
          enabled: renewalConfig.enabled ?? true,
          renewalInterval: renewalConfig.renewalInterval ?? 60000, // 1分钟（锁超时时间的20%）
          lockExtension: renewalConfig.lockExtension ?? 300000, // 5分钟（重新延长锁时间）
          maxRetryAttempts: renewalConfig.maxRetryAttempts ?? 3, // 最大重试3次
          retryInterval: renewalConfig.retryInterval ?? 10000 // 10秒重试间隔
        }
      };
    }
  };

  constructor(
    private readonly executionLockService: IExecutionLockService,
    private readonly logger: Logger,
    private readonly options: AutoRenewalConfig
  ) {}

  /**
   * 启动自动续期
   */
  async startAutoRenewal(
    instanceId: number,
    owner: string
  ): Promise<ServiceResult<boolean>> {
    try {
      if (!this.options.enabled) {
        this.logger.debug('Auto lock renewal is disabled');
        return { success: true, data: false };
      }

      const lockKey = this.getLockKey(instanceId);

      // 避免重复启动
      if (this.renewalTasks.has(lockKey)) {
        this.logger.debug('Auto renewal already started for workflow', {
          instanceId,
          owner
        });
        return { success: true, data: true };
      }

      // 创建续期任务
      const task = this.createRenewalTask(instanceId, owner);
      this.renewalTasks.set(lockKey, task);

      this.logger.info('Auto lock renewal started', {
        instanceId,
        owner,
        renewalInterval: this.options.renewalInterval,
        lockExtension: this.options.lockExtension
      });

      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to start auto lock renewal', {
        error,
        instanceId,
        owner
      });
      return {
        success: false,
        error: 'Failed to start auto lock renewal',
        errorDetails: error
      };
    }
  }

  /**
   * 停止自动续期
   */
  async stopAutoRenewal(instanceId: number): Promise<ServiceResult<boolean>> {
    try {
      const lockKey = this.getLockKey(instanceId);
      const task = this.renewalTasks.get(lockKey);

      if (!task) {
        this.logger.debug('No auto renewal task found for workflow', {
          instanceId
        });
        return { success: true, data: false };
      }

      // 停止任务并清理定时器
      task.isActive = false;
      clearTimeout(task.timer);
      this.renewalTasks.delete(lockKey);

      const duration = Date.now() - task.startTime.getTime();
      this.logger.info('Auto lock renewal stopped', {
        instanceId,
        owner: task.owner,
        duration,
        totalRenewals: Math.floor(duration / this.options.renewalInterval!)
      });

      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to stop auto lock renewal', {
        error,
        instanceId
      });
      return {
        success: false,
        error: 'Failed to stop auto lock renewal',
        errorDetails: error
      };
    }
  }

  /**
   * 停止所有自动续期任务
   */
  async stopAllRenewals(): Promise<ServiceResult<number>> {
    try {
      this.isShuttingDown = true;
      const taskCount = this.renewalTasks.size;

      for (const [, task] of this.renewalTasks) {
        task.isActive = false;
        clearTimeout(task.timer);
      }

      this.renewalTasks.clear();

      this.logger.info('All auto lock renewals stopped', { taskCount });

      return { success: true, data: taskCount };
    } catch (error) {
      this.logger.error('Failed to stop all auto lock renewals', { error });
      return {
        success: false,
        error: 'Failed to stop all auto lock renewals',
        errorDetails: error
      };
    }
  }

  /**
   * 获取续期统计信息
   */
  getRenewalStats(): {
    activeTasks: number;
    tasks: Array<{
      instanceId: number;
      owner: string;
      startTime: Date;
      lastRenewalTime: Date;
      retryCount: number;
      duration: number;
    }>;
  } {
    const now = new Date();
    const tasks = Array.from(this.renewalTasks.values()).map((task) => ({
      instanceId: task.instanceId,
      owner: task.owner,
      startTime: task.startTime,
      lastRenewalTime: task.lastRenewalTime,
      retryCount: task.retryCount,
      duration: now.getTime() - task.startTime.getTime()
    }));

    return {
      activeTasks: this.renewalTasks.size,
      tasks
    };
  }

  /**
   * 创建续期任务 - 使用setTimeout实现精确定时
   */
  private createRenewalTask(instanceId: number, owner: string): RenewalTask {
    const now = new Date();

    const task: RenewalTask = {
      instanceId,
      owner,
      timer: null as any, // 临时设置，下面会赋值
      retryCount: 0,
      startTime: now,
      lastRenewalTime: now,
      isActive: true
    };

    // 使用递归setTimeout替代setInterval，确保精确定时
    const scheduleNextRenewal = () => {
      if (this.isShuttingDown || !task.isActive) {
        return;
      }

      task.timer = setTimeout(async () => {
        if (this.isShuttingDown || !task.isActive) {
          return;
        }

        try {
          await this.performRenewal(instanceId, owner);

          // 续期成功后，调度下次续期
          if (task.isActive && !this.isShuttingDown) {
            scheduleNextRenewal();
          }
        } catch (error) {
          this.logger.error('Error in renewal task, will retry', {
            instanceId,
            owner,
            error
          });

          // 即使出错也要继续调度，让performRenewal处理重试逻辑
          if (task.isActive && !this.isShuttingDown) {
            scheduleNextRenewal();
          }
        }
      }, this.options.renewalInterval);
    };

    // 启动第一次调度
    scheduleNextRenewal();

    return task;
  }

  /**
   * 执行续期操作
   */
  private async performRenewal(
    instanceId: number,
    owner: string
  ): Promise<void> {
    const lockKey = this.getLockKey(instanceId);
    const task = this.renewalTasks.get(lockKey);

    if (!task || !task.isActive) {
      this.logger.debug('Renewal task not found or inactive', {
        instanceId,
        owner
      });
      return;
    }

    try {
      this.logger.debug('Performing lock renewal', { instanceId, owner });

      const result = await this.executionLockService.renewWorkflowLock(
        instanceId,
        owner,
        this.options.lockExtension
      );

      if (result.success) {
        // 续期成功，重置重试计数
        task.retryCount = 0;
        task.lastRenewalTime = new Date();

        this.logger.debug('Workflow lock renewed successfully', {
          instanceId,
          owner
        });
      } else {
        // 续期失败，增加重试计数
        task.retryCount++;

        this.logger.warn('Failed to renew workflow lock', {
          instanceId,
          owner,
          retryCount: task.retryCount,
          maxRetryAttempts: this.options.maxRetryAttempts,
          error: result.error
        });

        // 检查是否超过最大重试次数
        if (task.retryCount >= this.options.maxRetryAttempts!) {
          this.logger.error(
            'Max retry attempts reached, stopping auto renewal',
            {
              instanceId,
              owner,
              retryCount: task.retryCount
            }
          );

          // 停止自动续期
          await this.stopAutoRenewal(instanceId);
        }
        // 注意：不再在这里进行重试，重试由外层的setTimeout递归调用处理
      }
    } catch (error) {
      task.retryCount++;

      this.logger.error('Error during lock renewal', {
        instanceId,
        owner,
        retryCount: task.retryCount,
        error
      });

      // 检查是否超过最大重试次数
      if (task.retryCount >= this.options.maxRetryAttempts!) {
        this.logger.error(
          'Max retry attempts reached due to error, stopping auto renewal',
          {
            instanceId,
            owner,
            retryCount: task.retryCount
          }
        );

        await this.stopAutoRenewal(instanceId);
      }
    }
  }

  /**
   * 生成锁键
   */
  private getLockKey(instanceId: number): string {
    return `workflow:${instanceId}`;
  }

  /**
   * 服务关闭时的清理工作
   */
  async onClose(): Promise<void> {
    this.logger.info('Auto lock renewal service shutting down');
    await this.stopAllRenewals();
  }
}
