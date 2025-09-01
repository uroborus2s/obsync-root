/**
 * Tasks工作流适配器实现
 *
 * 提供对外部插件或应用的统一接口
 * 版本: v3.0.0-refactored
 */

import type { AwilixContainer, Logger } from '@stratix/core';
import type {
  ScheduleInfo,
  WorkflowStats,
  WorkflowStatusInfo
} from '../interfaces/adapters.js';
import type {
  ITasksWorkflowAdapter,
  IWorkflowDefinitionService,
  IWorkflowExecutionService,
  IWorkflowInstanceService
} from '../interfaces/index.js';
import type {
  PaginationOptions,
  QueryFilters,
  ServiceResult,
  WorkflowInstance,
  WorkflowOptions
} from '../types/business.js';
import type { WorkflowDefinitionTable } from '../types/database.js';
import type { ScheduleConfig } from '../types/schedule.types.js';

/**
 * Tasks工作流适配器实现
 *
 * 适配器只能调用服务层，不能直接访问仓储层
 */
export class TasksWorkflowAdapter implements ITasksWorkflowAdapter {
  /**
   * 适配器名称标识
   */
  static adapterName = 'workflow';

  private readonly workflowExecutionService: IWorkflowExecutionService;
  private readonly workflowInstanceService: IWorkflowInstanceService;
  private readonly workflowDefinitionService: IWorkflowDefinitionService;
  private readonly logger: Logger;

  constructor(container: AwilixContainer) {
    this.workflowExecutionService = container.resolve(
      'workflowExecutionService'
    );
    this.workflowInstanceService = container.resolve('workflowInstanceService');
    this.workflowDefinitionService = container.resolve(
      'workflowDefinitionService'
    );
    this.logger = container.resolve('logger');
  }

  /**
   * 创建定时器任务
   */
  async createSchedule(
    workflowDefinitionId: number,
    scheduleConfig: ScheduleConfig
  ): Promise<ServiceResult<ScheduleInfo>> {
    try {
      this.logger.info('Creating schedule', {
        workflowDefinitionId,
        scheduleConfig
      });

      // 验证工作流定义是否存在
      const definitionResult =
        await this.workflowDefinitionService.getById(workflowDefinitionId);
      if (!definitionResult.success) {
        return {
          success: false,
          error: `Workflow definition not found: ${workflowDefinitionId}`,
          errorDetails: definitionResult.error
        };
      }

      // 验证Cron表达式
      if (!this.isValidCronExpression(scheduleConfig.cronExpression)) {
        return {
          success: false,
          error: `Invalid cron expression: ${scheduleConfig.cronExpression}`
        };
      }

      // 创建定时器任务记录
      const scheduleInfo: ScheduleInfo = {
        id: Date.now(), // 在实际实现中应该使用数据库自增ID
        name: scheduleConfig.name,
        workflowDefinitionId,
        cronExpression: scheduleConfig.cronExpression,
        timezone: scheduleConfig.timezone || 'UTC',
        enabled: scheduleConfig.enabled ?? true,
        nextRunAt: this.calculateNextRunTime(scheduleConfig.cronExpression),
        lastRunAt: undefined,
        maxInstances: scheduleConfig.maxInstances || 1,
        inputData: scheduleConfig.inputData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 如果启用，注册到调度器
      if (scheduleInfo.enabled) {
        this.registerScheduleJob(scheduleInfo);
      }

      return {
        success: true,
        data: scheduleInfo
      };
    } catch (error) {
      this.logger.error('Failed to create schedule', {
        error,
        workflowDefinitionId,
        scheduleConfig
      });
      return {
        success: false,
        error: 'Failed to create schedule',
        errorDetails: error
      };
    }
  }

  /**
   * 修改定时器任务
   */
  async updateSchedule(
    scheduleId: number,
    updates: Partial<ScheduleConfig>
  ): Promise<ServiceResult<ScheduleInfo>> {
    try {
      this.logger.info('Updating schedule', { scheduleId, updates });

      // TODO: 实现定时器任务更新逻辑

      return {
        success: false,
        error: 'Schedule update not implemented yet'
      };
    } catch (error) {
      this.logger.error('Failed to update schedule', {
        error,
        scheduleId,
        updates
      });
      return {
        success: false,
        error: 'Failed to update schedule',
        errorDetails: error
      };
    }
  }

  /**
   * 删除定时器任务
   */
  async deleteSchedule(scheduleId: number): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Deleting schedule', { scheduleId });

      // TODO: 实现定时器任务删除逻辑

      return {
        success: false,
        error: 'Schedule deletion not implemented yet'
      };
    } catch (error) {
      this.logger.error('Failed to delete schedule', { error, scheduleId });
      return {
        success: false,
        error: 'Failed to delete schedule',
        errorDetails: error
      };
    }
  }

  /**
   * 启用/禁用定时器任务
   */
  async toggleSchedule(
    scheduleId: number,
    enabled: boolean
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Toggling schedule', { scheduleId, enabled });

      // TODO: 实现定时器任务启用/禁用逻辑

      return {
        success: false,
        error: 'Schedule toggle not implemented yet'
      };
    } catch (error) {
      this.logger.error('Failed to toggle schedule', {
        error,
        scheduleId,
        enabled
      });
      return {
        success: false,
        error: 'Failed to toggle schedule',
        errorDetails: error
      };
    }
  }

  /**
   * 获取定时器任务列表
   */
  async getSchedules(
    workflowDefinitionId?: number,
    pagination?: PaginationOptions
  ): Promise<ServiceResult<ScheduleInfo[]>> {
    try {
      this.logger.info('Getting schedules', {
        workflowDefinitionId,
        pagination
      });

      // TODO: 实现定时器任务列表查询逻辑

      return {
        success: true,
        data: []
      };
    } catch (error) {
      this.logger.error('Failed to get schedules', {
        error,
        workflowDefinitionId,
        pagination
      });
      return {
        success: false,
        error: 'Failed to get schedules',
        errorDetails: error
      };
    }
  }

  /**
   * 手动启动工作流（创建工作流实例）
   *
   * 轻量级代理方法，直接委托给 WorkflowExecutionService
   *
   * @param workflowDefinition 完整的工作流定义对象（从数据库查询获得）
   * @param options 工作流选项
   */
  async startWorkflow(
    workflowDefinition: WorkflowDefinitionTable,
    options?: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>> {
    try {
      this.logger.info('Adapter: Starting workflow', {
        workflowDefinitionId: workflowDefinition.id,
        workflowName: workflowDefinition.name,
        workflowVersion: workflowDefinition.version
      });

      // 🎯 直接委托给 Service 层，避免重复业务逻辑
      return await this.workflowExecutionService.startWorkflow(
        workflowDefinition,
        options || {}
      );
    } catch (error) {
      this.logger.error('Adapter: Failed to start workflow', {
        error,
        workflowDefinitionId: workflowDefinition.id,
        workflowName: workflowDefinition.name
      });
      return {
        success: false,
        error: 'Failed to start workflow',
        errorDetails: error
      };
    }
  }

  /**
   * 手动启动工作流（通过工作流名称）
   */
  async startWorkflowByName(
    workflowName: string,
    options?: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>> {
    try {
      this.logger.info('Starting workflow by name', { workflowName, options });

      // 如果指定了版本，使用精确查找；否则使用活跃版本
      let definitionResult;
      if (options?.workflowVersion) {
        definitionResult =
          await this.workflowDefinitionService.getByNameAndVersion(
            workflowName,
            options.workflowVersion
          );
      } else {
        definitionResult =
          await this.workflowDefinitionService.getActiveByName(workflowName);
      }

      if (!definitionResult.success) {
        return {
          success: false,
          error: `Workflow definition not found: ${workflowName}${options?.workflowVersion ? `@${options.workflowVersion}` : ' (active)'}`,
          errorDetails: definitionResult.error
        };
      }

      const definition = definitionResult.data!;

      // 启动工作流 - 传入完整的工作流定义对象
      return await this.startWorkflow(definition, options);
    } catch (error) {
      this.logger.error('Failed to start workflow by name', {
        error,
        workflowName,
        options
      });
      return {
        success: false,
        error: 'Failed to start workflow by name',
        errorDetails: error
      };
    }
  }

  /**
   * 恢复中断的工作流
   */
  async resumeWorkflow(instanceId: number): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Resuming workflow', { instanceId });

      const resumeResult =
        await this.workflowExecutionService.resumeWorkflow(instanceId);

      return {
        success: resumeResult.success,
        data: resumeResult.success,
        error: resumeResult.error,
        errorDetails: resumeResult.errorDetails
      };
    } catch (error) {
      this.logger.error('Failed to resume workflow', { error, instanceId });
      return {
        success: false,
        error: 'Failed to resume workflow',
        errorDetails: error
      };
    }
  }

  /**
   * 停止工作流执行
   */
  async stopWorkflow(
    instanceId: number,
    reason?: string
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Stopping workflow', { instanceId, reason });

      return await this.workflowExecutionService.stopWorkflow(
        instanceId,
        reason
      );
    } catch (error) {
      this.logger.error('Failed to stop workflow', {
        error,
        instanceId,
        reason
      });
      return {
        success: false,
        error: 'Failed to stop workflow',
        errorDetails: error
      };
    }
  }

  /**
   * 取消工作流执行
   */
  async cancelWorkflow(
    instanceId: number,
    reason?: string
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Cancelling workflow', { instanceId, reason });

      // 更新工作流状态为取消
      const updateResult = await this.workflowInstanceService.updateStatus(
        instanceId,
        'cancelled',
        reason || 'Workflow cancelled by user'
      );

      return {
        success: updateResult.success,
        data: updateResult.success,
        error: updateResult.error,
        errorDetails: updateResult.errorDetails
      };
    } catch (error) {
      this.logger.error('Failed to cancel workflow', {
        error,
        instanceId,
        reason
      });
      return {
        success: false,
        error: 'Failed to cancel workflow',
        errorDetails: error
      };
    }
  }

  /**
   * 获取工作流实例状态
   */
  async getWorkflowStatus(
    instanceId: number
  ): Promise<ServiceResult<WorkflowStatusInfo>> {
    try {
      this.logger.info('Getting workflow status', { instanceId });

      const statusResult =
        await this.workflowExecutionService.getWorkflowStatus(instanceId);
      if (!statusResult.success) {
        return statusResult as ServiceResult<WorkflowStatusInfo>;
      }

      const status = statusResult.data!;
      const statusInfo: WorkflowStatusInfo = {
        instanceId: status.instanceId,
        workflowName: 'Unknown', // TODO: 从定义中获取工作流名称
        instanceName: 'Unknown', // TODO: 从实例中获取实例名称
        status: status.status,
        currentNodeId: status.currentNodeId,
        progress: this.calculateProgress(status), // TODO: 实现进度计算
        startedAt: status.startedAt,
        completedAt: status.completedAt,
        errorMessage: status.errorMessage,
        retryCount: status.retryCount,
        maxRetries: status.maxRetries
      };

      return {
        success: true,
        data: statusInfo
      };
    } catch (error) {
      this.logger.error('Failed to get workflow status', { error, instanceId });
      return {
        success: false,
        error: 'Failed to get workflow status',
        errorDetails: error
      };
    }
  }

  /**
   * 获取工作流实例详情
   */
  async getWorkflowInstance(
    instanceId: number
  ): Promise<ServiceResult<WorkflowInstance>> {
    try {
      this.logger.info('Getting workflow instance', { instanceId });

      return await this.workflowInstanceService.getById(instanceId);
    } catch (error) {
      this.logger.error('Failed to get workflow instance', {
        error,
        instanceId
      });
      return {
        success: false,
        error: 'Failed to get workflow instance',
        errorDetails: error
      };
    }
  }

  /**
   * 查询工作流实例列表
   */
  async getWorkflowInstances(
    filters?: QueryFilters,
    pagination?: PaginationOptions
  ): Promise<ServiceResult<WorkflowInstance[]>> {
    try {
      this.logger.info('Getting workflow instances', { filters, pagination });

      const result = await this.workflowInstanceService.findMany(
        filters,
        pagination
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorDetails: result.errorDetails
        };
      }

      // 从分页结果中提取items数组
      return {
        success: true,
        data: result.data?.items || []
      };
    } catch (error) {
      this.logger.error('Failed to get workflow instances', {
        error,
        filters,
        pagination
      });
      return {
        success: false,
        error: 'Failed to get workflow instances',
        errorDetails: error
      };
    }
  }

  /**
   * 获取工作流执行统计
   */
  async getWorkflowStats(
    workflowDefinitionId?: number,
    timeRange?: { start: Date; end: Date }
  ): Promise<ServiceResult<WorkflowStats>> {
    try {
      this.logger.info('Getting workflow stats', {
        workflowDefinitionId,
        timeRange
      });

      // TODO: 实现统计查询逻辑
      const stats: WorkflowStats = {
        totalInstances: 0,
        runningInstances: 0,
        completedInstances: 0,
        failedInstances: 0,
        interruptedInstances: 0,
        averageExecutionTime: 0,
        successRate: 0
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error('Failed to get workflow stats', {
        error,
        workflowDefinitionId,
        timeRange
      });
      return {
        success: false,
        error: 'Failed to get workflow stats',
        errorDetails: error
      };
    }
  }

  /**
   * 获取中断的工作流实例列表
   */
  async getInterruptedWorkflows(): Promise<ServiceResult<WorkflowInstance[]>> {
    try {
      this.logger.info('Getting interrupted workflows');

      return await this.workflowInstanceService.findInterruptedInstances();
    } catch (error) {
      this.logger.error('Failed to get interrupted workflows', { error });
      return {
        success: false,
        error: 'Failed to get interrupted workflows',
        errorDetails: error
      };
    }
  }

  /**
   * 批量恢复中断的工作流
   */
  async batchResumeWorkflows(
    instanceIds: number[]
  ): Promise<ServiceResult<{ success: number; failed: number }>> {
    try {
      this.logger.info('Batch resuming workflows', { instanceIds });

      let successCount = 0;
      let failedCount = 0;

      for (const instanceId of instanceIds) {
        const resumeResult = await this.resumeWorkflow(instanceId);
        if (resumeResult.success) {
          successCount++;
        } else {
          failedCount++;
        }
      }

      return {
        success: true,
        data: { success: successCount, failed: failedCount }
      };
    } catch (error) {
      this.logger.error('Failed to batch resume workflows', {
        error,
        instanceIds
      });
      return {
        success: false,
        error: 'Failed to batch resume workflows',
        errorDetails: error
      };
    }
  }

  /**
   * 清理过期的工作流实例
   */
  async cleanupExpiredInstances(
    beforeDate: Date
  ): Promise<ServiceResult<number>> {
    try {
      this.logger.info('Cleaning up expired instances', { beforeDate });

      // TODO: 实现过期实例清理逻辑

      return {
        success: true,
        data: 0
      };
    } catch (error) {
      this.logger.error('Failed to cleanup expired instances', {
        error,
        beforeDate
      });
      return {
        success: false,
        error: 'Failed to cleanup expired instances',
        errorDetails: error
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<
    ServiceResult<{ status: 'healthy' | 'unhealthy'; details?: any }>
  > {
    try {
      this.logger.info('Performing health check');

      // TODO: 实现健康检查逻辑
      // 检查数据库连接、服务状态等

      return {
        success: true,
        data: { status: 'healthy' }
      };
    } catch (error) {
      this.logger.error('Health check failed', { error });
      return {
        success: false,
        error: 'Health check failed',
        errorDetails: error
      };
    }
  }

  // 私有辅助方法

  /**
   * 验证Cron表达式
   */
  private isValidCronExpression(cronExpression: string): boolean {
    // 简单的Cron表达式验证（5个字段）
    const cronRegex =
      /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
    return cronRegex.test(cronExpression);
  }

  /**
   * 计算下次运行时间
   */
  private calculateNextRunTime(cronExpression: string): Date | undefined {
    // 简化实现：返回下一分钟
    // 实际实现中应该使用cron-parser库
    // 这里使用cronExpression参数来避免未使用警告
    if (!this.isValidCronExpression(cronExpression)) {
      return undefined;
    }

    const nextRun = new Date();
    nextRun.setMinutes(nextRun.getMinutes() + 1);
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);
    return nextRun;
  }

  /**
   * 注册定时任务到调度器
   */
  private registerScheduleJob(scheduleInfo: ScheduleInfo): void {
    // 简化实现：记录日志
    // 实际实现中应该注册到node-cron或其他调度器
    this.logger.info('Schedule job registered', {
      scheduleId: scheduleInfo.id,
      cronExpression: scheduleInfo.cronExpression,
      nextRunAt: scheduleInfo.nextRunAt
    });
  }

  /**
   * 计算工作流进度
   */
  private calculateProgress(status: any): number | undefined {
    // 简化的进度计算
    if (status.status === 'completed') return 100;
    if (status.status === 'failed' || status.status === 'cancelled') return 0;
    if (status.status === 'running') return 50; // 假设运行中为50%
    return 0;
  }
}

/**
 * 默认导出
 */
export default TasksWorkflowAdapter;
