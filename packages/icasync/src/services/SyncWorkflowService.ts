// @stratix/icasync 同步工作流服务
// 负责协调整个课表同步流程，基于@stratix/tasks实现任务树管理

import { Logger } from '@stratix/core';
import type { IWorkflowAdapter, WorkflowDefinition } from '@stratix/tasks';
import type { ICalendarSyncService } from './CalendarSyncService.js';
import type { ICourseAggregationService } from './CourseAggregationService.js';
import type { ICourseScheduleSyncService } from './CourseScheduleSyncService.js';

/**
 * 同步工作流配置
 */
export interface SyncWorkflowConfig {
  /** 学年学期 */
  xnxq: string;
  /** 同步类型 */
  syncType: 'full' | 'incremental';
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 是否并行执行 */
  parallel?: boolean;
}

/**
 * 工作流执行结果
 */
export interface WorkflowExecutionResult {
  /** 工作流ID */
  workflowId: string;
  /** 执行状态 */
  status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 总任务数 */
  totalTasks: number;
  /** 完成任务数 */
  completedTasks: number;
  /** 失败任务数 */
  failedTasks: number;
  /** 错误信息 */
  errors: string[];
  /** 详细结果 */
  details?: Record<string, any>;
}

/**
 * 同步工作流服务接口
 */
export interface ISyncWorkflowService {
  /**
   * 执行全量同步工作流
   */
  executeFullSyncWorkflow(
    config: SyncWorkflowConfig
  ): Promise<WorkflowExecutionResult>;

  /**
   * 执行增量同步工作流
   */
  executeIncrementalSyncWorkflow(
    config: SyncWorkflowConfig
  ): Promise<WorkflowExecutionResult>;

  /**
   * 执行日历创建工作流
   */
  executeCalendarCreationWorkflow(
    kkhList: string[],
    xnxq: string,
    config?: Partial<SyncWorkflowConfig>
  ): Promise<WorkflowExecutionResult>;

  /**
   * 执行日历删除工作流
   */
  executeCalendarDeletionWorkflow(
    kkhList: string[],
    config?: Partial<SyncWorkflowConfig>
  ): Promise<WorkflowExecutionResult>;

  /**
   * 获取工作流执行状态
   */
  getWorkflowStatus(workflowId: string): Promise<any>;

  /**
   * 取消工作流执行
   */
  cancelWorkflow(workflowId: string): Promise<boolean>;
}

/**
 * 同步工作流服务实现
 *
 * 基于@stratix/tasks实现复杂的任务树管理和执行
 */
export class SyncWorkflowService implements ISyncWorkflowService {
  constructor(
    private readonly courseAggregationService: ICourseAggregationService,
    private readonly calendarSyncService: ICalendarSyncService,
    private readonly courseScheduleSyncService: ICourseScheduleSyncService,
    private readonly logger: Logger,
    private readonly tasksWorkflow: IWorkflowAdapter
  ) {}

  /**
   * 执行全量同步工作流
   */
  async executeFullSyncWorkflow(
    config: SyncWorkflowConfig
  ): Promise<WorkflowExecutionResult> {
    const startTime = new Date();
    this.logger.info(`开始执行全量同步工作流，学年学期: ${config.xnxq}`);

    try {
      // 1. 创建全量同步工作流定义
      const workflowDefinition: WorkflowDefinition = {
        name: `全量同步-${config.xnxq}-${Date.now()}`,
        description: `学年学期 ${config.xnxq} 的课表全量同步工作流`,
        tasks: [
          {
            name: 'course-data-aggregation',
            type: 'course_aggregation',
            config: {
              xnxq: config.xnxq,
              operation: 'full_aggregation_with_clear',
              batchSize: config.batchSize || 100
            }
          },
          {
            name: 'calendar-creation-batch',
            type: 'calendar_creation',
            config: {
              xnxq: config.xnxq,
              operation: 'create_calendars_batch',
              batchSize: config.batchSize || 10
            },
            dependsOn: ['course-data-aggregation']
          },
          {
            name: 'participant-management-batch',
            type: 'participant_management',
            config: {
              xnxq: config.xnxq,
              operation: 'add_participants_batch',
              batchSize: config.batchSize || 50
            },
            dependsOn: ['calendar-creation-batch']
          },
          {
            name: 'schedule-creation-batch',
            type: 'schedule_creation',
            config: {
              xnxq: config.xnxq,
              operation: 'create_schedules_batch',
              batchSize: config.batchSize || 20
            },
            dependsOn: ['participant-management-batch']
          }
        ],
        options: {
          parallel: config.parallel || false,
          timeout: config.timeout || 1800000, // 30分钟
          retries: config.retryCount || 3
        }
      };

      // 2. 创建并执行工作流
      const workflowResult =
        await this.tasksWorkflow.createWorkflow(workflowDefinition);
      if (!workflowResult.success) {
        throw new Error(`创建工作流失败: ${workflowResult.error}`);
      }

      const workflowId = workflowResult.data!.id;
      this.logger.info(`全量同步工作流创建成功，ID: ${workflowId}`);

      // 3. 执行工作流
      const executeResult = await this.tasksWorkflow.executeWorkflow(
        workflowId,
        {
          timeout: config.timeout || 1800000,
          context: { config }
        }
      );

      if (!executeResult.success) {
        throw new Error(`执行工作流失败: ${executeResult.error}`);
      }

      // 4. 监控工作流执行
      const finalResult = await this.monitorWorkflowExecution(
        workflowId,
        config.timeout || 1800000
      );

      const endTime = new Date();
      this.logger.info(
        `全量同步工作流执行完成，耗时: ${endTime.getTime() - startTime.getTime()}ms`
      );

      return {
        workflowId,
        status: finalResult.status,
        startTime,
        endTime,
        totalTasks: finalResult.totalTasks || 0,
        completedTasks: finalResult.completedTasks || 0,
        failedTasks: finalResult.failedTasks || 0,
        errors: finalResult.errors || [],
        details: finalResult.details
      };
    } catch (error) {
      const endTime = new Date();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`全量同步工作流执行失败: ${errorMessage}`);

      return {
        workflowId: '',
        status: 'failed',
        startTime,
        endTime,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 1,
        errors: [errorMessage]
      };
    }
  }

  /**
   * 执行增量同步工作流
   */
  async executeIncrementalSyncWorkflow(
    config: SyncWorkflowConfig
  ): Promise<WorkflowExecutionResult> {
    const startTime = new Date();
    this.logger.info(`开始执行增量同步工作流，学年学期: ${config.xnxq}`);

    try {
      // 1. 创建增量同步工作流定义
      const workflowDefinition: WorkflowDefinition = {
        name: `增量同步-${config.xnxq}-${Date.now()}`,
        description: `学年学期 ${config.xnxq} 的课表增量同步工作流`,
        tasks: [
          {
            name: 'incremental-data-detection',
            type: 'data_detection',
            config: {
              xnxq: config.xnxq,
              operation: 'detect_changes'
            }
          },
          {
            name: 'schedule-deletion',
            type: 'schedule_deletion',
            config: {
              xnxq: config.xnxq,
              operation: 'delete_changed_schedules'
            },
            dependsOn: ['incremental-data-detection']
          },
          {
            name: 'incremental-aggregation',
            type: 'incremental_aggregation',
            config: {
              xnxq: config.xnxq,
              operation: 'aggregate_changes',
              batchSize: config.batchSize || 50
            },
            dependsOn: ['schedule-deletion']
          },
          {
            name: 'calendar-update',
            type: 'calendar_update',
            config: {
              xnxq: config.xnxq,
              operation: 'update_calendars',
              batchSize: config.batchSize || 10
            },
            dependsOn: ['incremental-aggregation']
          },
          {
            name: 'participant-sync',
            type: 'participant_sync',
            config: {
              xnxq: config.xnxq,
              operation: 'sync_participants',
              batchSize: config.batchSize || 30
            },
            dependsOn: ['calendar-update']
          },
          {
            name: 'schedule-recreation',
            type: 'schedule_recreation',
            config: {
              xnxq: config.xnxq,
              operation: 'recreate_schedules',
              batchSize: config.batchSize || 20
            },
            dependsOn: ['participant-sync']
          }
        ],
        options: {
          parallel: config.parallel || true,
          timeout: config.timeout || 900000, // 15分钟
          retries: config.retryCount || 3
        }
      };

      // 2. 创建并执行工作流
      const workflowResult =
        await this.tasksWorkflow.createWorkflow(workflowDefinition);
      if (!workflowResult.success) {
        throw new Error(`创建增量同步工作流失败: ${workflowResult.error}`);
      }

      const workflowId = workflowResult.data!.id;
      this.logger.info(`增量同步工作流创建成功，ID: ${workflowId}`);

      // 3. 执行工作流
      const executeResult = await this.tasksWorkflow.executeWorkflow(
        workflowId,
        {
          timeout: config.timeout || 900000,
          context: { config }
        }
      );

      if (!executeResult.success) {
        throw new Error(`执行增量同步工作流失败: ${executeResult.error}`);
      }

      // 4. 监控工作流执行
      const finalResult = await this.monitorWorkflowExecution(
        workflowId,
        config.timeout || 900000
      );

      const endTime = new Date();
      this.logger.info(
        `增量同步工作流执行完成，耗时: ${endTime.getTime() - startTime.getTime()}ms`
      );

      return {
        workflowId,
        status: finalResult.status,
        startTime,
        endTime,
        totalTasks: finalResult.totalTasks || 0,
        completedTasks: finalResult.completedTasks || 0,
        failedTasks: finalResult.failedTasks || 0,
        errors: finalResult.errors || [],
        details: finalResult.details
      };
    } catch (error) {
      const endTime = new Date();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`增量同步工作流执行失败: ${errorMessage}`);

      return {
        workflowId: '',
        status: 'failed',
        startTime,
        endTime,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 1,
        errors: [errorMessage]
      };
    }
  }

  // 其他方法的实现将在后续添加...
  async executeCalendarCreationWorkflow(): Promise<WorkflowExecutionResult> {
    throw new Error('Not implemented');
  }
  async executeCalendarDeletionWorkflow(): Promise<WorkflowExecutionResult> {
    throw new Error('Not implemented');
  }
  async getWorkflowStatus(): Promise<any> {
    throw new Error('Not implemented');
  }
  async cancelWorkflow(): Promise<boolean> {
    throw new Error('Not implemented');
  }

  /**
   * 监控工作流执行状态
   */
  private async monitorWorkflowExecution(
    workflowId: string,
    timeout: number
  ): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 3000; // 3秒轮询一次

    while (Date.now() - startTime < timeout) {
      try {
        const statusResult =
          await this.tasksWorkflow.getWorkflowStatus(workflowId);

        if (!statusResult.success) {
          this.logger.warn(`获取工作流状态失败: ${statusResult.error}`);
          await this.sleep(pollInterval);
          continue;
        }

        const status = statusResult.data!;
        this.logger.debug(
          `工作流 ${workflowId} 状态: ${status.status}, 进度: ${status.progress || 0}%`
        );

        // 检查工作流是否完成
        if (['completed', 'failed', 'cancelled'].includes(status.status)) {
          return {
            status: status.status,
            totalTasks: status.totalTasks || 0,
            completedTasks: status.completedTasks || 0,
            failedTasks: status.failedTasks || 0,
            errors: status.error ? [status.error] : [],
            details: status
          };
        }

        await this.sleep(pollInterval);
      } catch (error) {
        this.logger.error(`监控工作流执行时发生错误: ${error}`);
        await this.sleep(pollInterval);
      }
    }

    // 超时处理
    this.logger.warn(`工作流 ${workflowId} 监控超时`);
    return {
      status: 'timeout',
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 1,
      errors: ['工作流执行超时']
    };
  }

  /**
   * 睡眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
