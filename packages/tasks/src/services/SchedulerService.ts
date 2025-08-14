/**
 * 调度器服务实现
 *
 * 实现定时任务和定时扫描功能
 * 版本: v3.0.0-refactored
 */

import type { AwilixContainer, Logger } from '@stratix/core';
import { RESOLVER } from '@stratix/core';
import type {
  IWorkflowExecutionService,
  IWorkflowInstanceService
} from '../interfaces/index.js';
import type { ServiceResult } from '../types/business.js';

/**
 * 调度器配置接口
 */
export interface SchedulerConfig {
  /** 是否启用调度器 */
  enabled?: boolean;
  /** 定时扫描间隔（毫秒） */
  scanInterval?: number;
  /** 最大并发任务数 */
  maxConcurrency?: number;
  /** 中断恢复检查间隔（毫秒） */
  recoveryCheckInterval?: number;
}

/**
 * 调度器服务实现
 */
export default class SchedulerService {
  private scanTimer?: NodeJS.Timeout;
  private recoveryTimer?: NodeJS.Timeout;
  private isRunning = false;

  /**
   * Stratix框架依赖注入配置
   */
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      const config = container.resolve('config') as any;
      const schedulerConfig = config.scheduler || {};

      return {
        options: schedulerConfig
      };
    }
  };

  constructor(
    private readonly workflowExecutionService: IWorkflowExecutionService,
    private readonly workflowInstanceService: IWorkflowInstanceService,
    private readonly logger: Logger,
    private readonly options: SchedulerConfig
  ) {}

  /**
   * 启动调度器
   */
  async start(): Promise<ServiceResult<boolean>> {
    try {
      if (this.isRunning) {
        return {
          success: false,
          error: 'Scheduler is already running'
        };
      }

      if (!this.options.enabled) {
        this.logger.info('Scheduler is disabled');
        return {
          success: true,
          data: true
        };
      }

      this.logger.info('Starting scheduler service', { config: this.options });

      // 启动定时扫描
      this.startPeriodicScan();

      // 启动中断恢复检查
      this.startRecoveryCheck();

      this.isRunning = true;

      this.logger.info('Scheduler service started successfully');

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('Failed to start scheduler service', { error });
      return {
        success: false,
        error: 'Failed to start scheduler service',
        errorDetails: error
      };
    }
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<ServiceResult<boolean>> {
    try {
      if (!this.isRunning) {
        return {
          success: false,
          error: 'Scheduler is not running'
        };
      }

      this.logger.info('Stopping scheduler service');

      // 清除定时器
      if (this.scanTimer) {
        clearInterval(this.scanTimer);
        this.scanTimer = undefined;
      }

      if (this.recoveryTimer) {
        clearInterval(this.recoveryTimer);
        this.recoveryTimer = undefined;
      }

      this.isRunning = false;

      this.logger.info('Scheduler service stopped successfully');

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('Failed to stop scheduler service', { error });
      return {
        success: false,
        error: 'Failed to stop scheduler service',
        errorDetails: error
      };
    }
  }

  /**
   * 启动定时扫描
   */
  private startPeriodicScan(): void {
    this.scanTimer = setInterval(async () => {
      try {
        await this.performPeriodicScan();
      } catch (error) {
        this.logger.error('Error in periodic scan', { error });
      }
    }, this.options.scanInterval);

    this.logger.info('Periodic scan started', {
      interval: this.options.scanInterval
    });
  }

  /**
   * 启动中断恢复检查
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
   * 执行定时扫描
   *
   * 扫描需要执行的定时任务
   */
  private async performPeriodicScan(): Promise<void> {
    this.logger.debug('Performing periodic scan');

    try {
      // TODO: 实现定时任务扫描逻辑
      // 1. 查询所有启用的定时任务
      // 2. 检查是否到达执行时间
      // 3. 创建新的工作流实例

      // 示例实现：
      // const schedules = await this.getActiveSchedules();
      // for (const schedule of schedules) {
      //   if (this.shouldExecuteSchedule(schedule)) {
      //     await this.executeScheduledWorkflow(schedule);
      //   }
      // }

      this.logger.debug('Periodic scan completed');
    } catch (error) {
      this.logger.error('Error in periodic scan', { error });
    }
  }

  /**
   * 执行中断恢复检查
   *
   * 检测中断的工作流实例并尝试恢复
   */
  private async performRecoveryCheck(): Promise<void> {
    this.logger.debug('Performing recovery check');

    try {
      // 获取中断的工作流实例 - 使用服务层而不是直接使用Adapter层
      const interruptedResult =
        await this.workflowInstanceService.findInterruptedInstances();

      if (!interruptedResult.success) {
        this.logger.warn('Failed to get interrupted workflows', {
          error: interruptedResult.error
        });
        return;
      }

      const interruptedWorkflows = interruptedResult.data || [];

      if (interruptedWorkflows.length === 0) {
        this.logger.debug('No interrupted workflows found');
        return;
      }

      this.logger.info('Found interrupted workflows', {
        count: interruptedWorkflows.length
      });

      // 批量恢复中断的工作流 - 使用服务层方法
      const instanceIds = interruptedWorkflows.map(
        (workflow: any) => workflow.id
      );

      // 逐个恢复工作流实例
      let successCount = 0;
      let failedCount = 0;

      for (const instanceId of instanceIds) {
        try {
          const resumeResult =
            await this.workflowExecutionService.resumeWorkflow(instanceId);
          if (resumeResult.success) {
            successCount++;
          } else {
            failedCount++;
            this.logger.warn('Failed to resume workflow', {
              instanceId,
              error: resumeResult.error
            });
          }
        } catch (error) {
          failedCount++;
          this.logger.error('Error resuming workflow', {
            instanceId,
            error
          });
        }
      }

      const batchResumeResult = {
        success: true,
        data: { success: successCount, failed: failedCount }
      };

      this.logger.info('Batch resume completed', {
        total: instanceIds.length,
        success: batchResumeResult.data?.success || 0,
        failed: batchResumeResult.data?.failed || 0
      });
    } catch (error) {
      this.logger.error('Error in recovery check', { error });
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    isRunning: boolean;
    config: SchedulerConfig;
    uptime?: number;
  } {
    return {
      isRunning: this.isRunning,
      config: this.options,
      uptime: this.isRunning ? Date.now() : undefined
    };
  }

  /**
   * 手动触发扫描
   */
  async triggerScan(): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Manual scan triggered');
      await this.performPeriodicScan();
      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('Manual scan failed', { error });
      return {
        success: false,
        error: 'Manual scan failed',
        errorDetails: error
      };
    }
  }

  /**
   * 手动触发恢复检查
   */
  async triggerRecoveryCheck(): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Manual recovery check triggered');
      await this.performRecoveryCheck();
      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('Manual recovery check failed', { error });
      return {
        success: false,
        error: 'Manual recovery check failed',
        errorDetails: error
      };
    }
  }
}
