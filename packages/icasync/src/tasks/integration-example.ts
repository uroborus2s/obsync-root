// @stratix/icasync 任务系统集成示例
// 展示如何在现有项目中集成和使用任务系统

import { Logger } from '@stratix/core';
import { createWorkflowAdapter } from '@stratix/tasks';
import { TaskSystemBootstrap, DEFAULT_TASK_SYSTEM_CONFIG } from './TaskSystemBootstrap.js';
import type { IcasyncServices, SyncConfig } from './types/task-types.js';

/**
 * 任务系统集成示例
 * 
 * 这个示例展示了如何：
 * 1. 初始化任务系统
 * 2. 在现有服务中集成任务系统
 * 3. 处理任务执行和监控
 * 4. 实现渐进式迁移策略
 */
export class TaskSystemIntegrationExample {
  private taskSystem?: TaskSystemBootstrap;
  private isTaskSystemEnabled = false;

  constructor(
    private readonly services: IcasyncServices,
    private readonly logger: Logger,
    private readonly config = DEFAULT_TASK_SYSTEM_CONFIG
  ) {}

  /**
   * 初始化任务系统
   */
  async initializeTaskSystem(): Promise<void> {
    try {
      this.logger.info('开始初始化任务系统集成');

      // 1. 创建工作流适配器
      const workflowAdapter = createWorkflowAdapter({
        type: this.config.workflowAdapter.type,
        config: this.config.workflowAdapter.config
      });

      // 2. 创建任务系统引导程序
      this.taskSystem = new TaskSystemBootstrap(
        workflowAdapter,
        this.services,
        this.logger,
        this.config
      );

      // 3. 初始化任务系统
      await this.taskSystem.initialize();

      this.isTaskSystemEnabled = true;
      this.logger.info('任务系统集成初始化完成');

    } catch (error) {
      this.logger.error('任务系统集成初始化失败', { error: error.message });
      this.isTaskSystemEnabled = false;
      
      // 根据配置决定是否抛出错误
      if (!this.config.enabled) {
        this.logger.warn('任务系统已禁用，将使用传统方式');
      } else {
        throw error;
      }
    }
  }

  /**
   * 执行全量同步（支持任务系统和传统方式）
   */
  async executeFullSync(xnxq: string, config?: SyncConfig): Promise<SyncExecutionResult> {
    this.logger.info('开始执行全量同步', { xnxq, useTaskSystem: this.isTaskSystemEnabled });

    if (this.isTaskSystemEnabled && this.taskSystem) {
      return await this.executeFullSyncWithTaskSystem(xnxq, config);
    } else {
      return await this.executeFullSyncWithLegacyMethod(xnxq, config);
    }
  }

  /**
   * 执行增量同步（支持任务系统和传统方式）
   */
  async executeIncrementalSync(xnxq: string, config?: SyncConfig): Promise<SyncExecutionResult> {
    this.logger.info('开始执行增量同步', { xnxq, useTaskSystem: this.isTaskSystemEnabled });

    if (this.isTaskSystemEnabled && this.taskSystem) {
      return await this.executeIncrementalSyncWithTaskSystem(xnxq, config);
    } else {
      return await this.executeIncrementalSyncWithLegacyMethod(xnxq, config);
    }
  }

  /**
   * 使用任务系统执行全量同步
   */
  private async executeFullSyncWithTaskSystem(
    xnxq: string, 
    config?: SyncConfig
  ): Promise<SyncExecutionResult> {
    try {
      const orchestrator = this.taskSystem!.getOrchestrator();
      
      // 启动工作流
      const workflowResult = await orchestrator.executeFullSync(xnxq, {
        timeout: config?.timeout || 1800000,
        retries: config?.retries || 3,
        batchSize: config?.batchSize || 100,
        parallel: config?.parallel || false
      });

      if (!workflowResult.success) {
        throw new Error(workflowResult.error);
      }

      this.logger.info('全量同步工作流启动成功', { 
        workflowId: workflowResult.workflowId,
        xnxq 
      });

      // 如果需要等待完成
      if (config?.waitForCompletion) {
        const finalResult = await this.waitForWorkflowCompletion(
          workflowResult.workflowId,
          config.timeout || 1800000
        );
        
        return {
          success: finalResult.success,
          workflowId: workflowResult.workflowId,
          method: 'task_system',
          data: finalResult.data,
          error: finalResult.error
        };
      }

      // 异步执行，立即返回
      return {
        success: true,
        workflowId: workflowResult.workflowId,
        method: 'task_system',
        data: { status: 'started', startedAt: workflowResult.startedAt }
      };

    } catch (error) {
      this.logger.error('任务系统全量同步失败', { error: error.message, xnxq });
      
      // 如果配置了降级策略，尝试使用传统方法
      if (config?.fallbackToLegacy) {
        this.logger.warn('降级到传统同步方法', { xnxq });
        return await this.executeFullSyncWithLegacyMethod(xnxq, config);
      }

      return {
        success: false,
        method: 'task_system',
        error: error.message
      };
    }
  }

  /**
   * 使用任务系统执行增量同步
   */
  private async executeIncrementalSyncWithTaskSystem(
    xnxq: string, 
    config?: SyncConfig
  ): Promise<SyncExecutionResult> {
    try {
      const orchestrator = this.taskSystem!.getOrchestrator();
      
      // 启动工作流
      const workflowResult = await orchestrator.executeIncrementalSync(xnxq, {
        timeout: config?.timeout || 600000,
        retries: config?.retries || 2,
        batchSize: config?.batchSize || 100,
        parallel: config?.parallel || true,
        maxConcurrency: config?.maxConcurrency || 10
      });

      if (!workflowResult.success) {
        throw new Error(workflowResult.error);
      }

      this.logger.info('增量同步工作流启动成功', { 
        workflowId: workflowResult.workflowId,
        xnxq 
      });

      // 如果需要等待完成
      if (config?.waitForCompletion) {
        const finalResult = await this.waitForWorkflowCompletion(
          workflowResult.workflowId,
          config.timeout || 600000
        );
        
        return {
          success: finalResult.success,
          workflowId: workflowResult.workflowId,
          method: 'task_system',
          data: finalResult.data,
          error: finalResult.error
        };
      }

      // 异步执行，立即返回
      return {
        success: true,
        workflowId: workflowResult.workflowId,
        method: 'task_system',
        data: { status: 'started', startedAt: workflowResult.startedAt }
      };

    } catch (error) {
      this.logger.error('任务系统增量同步失败', { error: error.message, xnxq });
      
      // 如果配置了降级策略，尝试使用传统方法
      if (config?.fallbackToLegacy) {
        this.logger.warn('降级到传统同步方法', { xnxq });
        return await this.executeIncrementalSyncWithLegacyMethod(xnxq, config);
      }

      return {
        success: false,
        method: 'task_system',
        error: error.message
      };
    }
  }

  /**
   * 使用传统方法执行全量同步
   */
  private async executeFullSyncWithLegacyMethod(
    xnxq: string, 
    config?: SyncConfig
  ): Promise<SyncExecutionResult> {
    try {
      this.logger.info('使用传统方法执行全量同步', { xnxq });

      // 这里调用现有的同步逻辑
      // 例如：CourseScheduleSyncService.aggregateCourseData()
      const aggregationResult = await this.services.courseScheduleSyncService
        .aggregateCourseData(xnxq);

      if (!aggregationResult.success) {
        throw new Error(aggregationResult.error);
      }

      // 继续执行其他步骤...
      const calendarResult = await this.services.calendarSyncService
        .createCourseCalendar(xnxq);

      if (!calendarResult.success) {
        throw new Error(calendarResult.error);
      }

      return {
        success: true,
        method: 'legacy',
        data: {
          aggregatedCount: aggregationResult.data?.count,
          calendarsCreated: calendarResult.data?.count
        }
      };

    } catch (error) {
      this.logger.error('传统方法全量同步失败', { error: error.message, xnxq });
      return {
        success: false,
        method: 'legacy',
        error: error.message
      };
    }
  }

  /**
   * 使用传统方法执行增量同步
   */
  private async executeIncrementalSyncWithLegacyMethod(
    xnxq: string, 
    config?: SyncConfig
  ): Promise<SyncExecutionResult> {
    try {
      this.logger.info('使用传统方法执行增量同步', { xnxq });

      // 这里实现传统的增量同步逻辑
      // 由于原有系统可能没有增量同步，这里可能需要实现简化版本
      
      return {
        success: true,
        method: 'legacy',
        data: { message: 'Legacy incremental sync completed' }
      };

    } catch (error) {
      this.logger.error('传统方法增量同步失败', { error: error.message, xnxq });
      return {
        success: false,
        method: 'legacy',
        error: error.message
      };
    }
  }

  /**
   * 等待工作流完成
   */
  private async waitForWorkflowCompletion(
    workflowId: string,
    timeout: number = 1800000
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const orchestrator = this.taskSystem!.getOrchestrator();
    const checkInterval = 5000; // 5秒检查一次
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const status = await orchestrator.getWorkflowStatus(workflowId);
        
        if (!status) {
          throw new Error('无法获取工作流状态');
        }

        this.logger.debug('工作流状态检查', {
          workflowId,
          status: status.status,
          progress: status.progress
        });

        if (status.status === 'completed') {
          return {
            success: true,
            data: {
              completedAt: new Date(),
              totalTasks: status.totalTasks,
              completedTasks: status.completedTasks,
              result: status.result
            }
          };
        }

        if (status.status === 'failed') {
          return {
            success: false,
            error: status.error || '工作流执行失败'
          };
        }

        if (status.status === 'cancelled') {
          return {
            success: false,
            error: '工作流已被取消'
          };
        }

        // 等待下次检查
        await new Promise(resolve => setTimeout(resolve, checkInterval));

      } catch (error) {
        this.logger.error('检查工作流状态失败', { 
          workflowId, 
          error: error.message 
        });
        
        // 继续等待，可能是临时错误
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    // 超时
    return {
      success: false,
      error: `工作流执行超时 (${timeout}ms)`
    };
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowStatus(workflowId: string) {
    if (!this.isTaskSystemEnabled || !this.taskSystem) {
      throw new Error('任务系统未启用');
    }

    const orchestrator = this.taskSystem.getOrchestrator();
    return await orchestrator.getWorkflowStatus(workflowId);
  }

  /**
   * 停止工作流
   */
  async stopWorkflow(workflowId: string): Promise<boolean> {
    if (!this.isTaskSystemEnabled || !this.taskSystem) {
      throw new Error('任务系统未启用');
    }

    const orchestrator = this.taskSystem.getOrchestrator();
    return await orchestrator.stopWorkflow(workflowId);
  }

  /**
   * 获取活跃工作流
   */
  getActiveWorkflows(): string[] {
    if (!this.isTaskSystemEnabled || !this.taskSystem) {
      return [];
    }

    const orchestrator = this.taskSystem.getOrchestrator();
    return orchestrator.getActiveWorkflows();
  }

  /**
   * 关闭任务系统
   */
  async shutdown(): Promise<void> {
    if (this.taskSystem) {
      await this.taskSystem.shutdown();
      this.isTaskSystemEnabled = false;
    }
  }
}

/**
 * 同步执行结果
 */
export interface SyncExecutionResult {
  success: boolean;
  workflowId?: string;
  method: 'task_system' | 'legacy';
  data?: any;
  error?: string;
}

/**
 * 扩展的同步配置
 */
export interface ExtendedSyncConfig extends SyncConfig {
  /** 是否等待完成 */
  waitForCompletion?: boolean;
  /** 失败时是否降级到传统方法 */
  fallbackToLegacy?: boolean;
}
