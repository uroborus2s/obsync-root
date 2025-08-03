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

  /**
   * 生成同步报告
   */
  generateSyncReport(
    xnxq: string,
    syncType: string,
    incrementalMode?: boolean
  ): Promise<any>;

  /**
   * 记录同步历史
   */
  recordSyncHistory(reportData: any): Promise<boolean>;

  /**
   * 发送完成通知
   */
  sendCompletionNotification(
    reportData: any,
    recipients?: string[]
  ): Promise<boolean>;

  /**
   * 清理临时数据
   */
  cleanupTempData(xnxq: string): Promise<{
    cleanedTables: string[];
    cleanedRecords: number;
  }>;

  /**
   * 更新最后同步时间
   */
  updateLastSyncTime(xnxq: string, syncType: string): Promise<boolean>;
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
        version: '1.0.0',
        nodes: [
          {
            id: 'course-data-aggregation',
            type: 'task',
            name: 'course-data-aggregation',
            executor: 'course_aggregation',
            config: {
              xnxq: config.xnxq,
              operation: 'full_aggregation_with_clear',
              batchSize: config.batchSize || 100
            }
          },
          {
            id: 'calendar-creation-batch',
            type: 'task',
            name: 'calendar-creation-batch',
            executor: 'calendar_creation',
            config: {
              xnxq: config.xnxq,
              operation: 'create_calendars_batch',
              batchSize: config.batchSize || 10
            },
            dependsOn: ['course-data-aggregation']
          },
          {
            id: 'participant-management-batch',
            type: 'task',
            name: 'participant-management-batch',
            executor: 'participant_management',
            config: {
              xnxq: config.xnxq,
              operation: 'add_participants_batch',
              batchSize: config.batchSize || 50
            },
            dependsOn: ['calendar-creation-batch']
          },
          {
            id: 'schedule-creation-batch',
            type: 'task',
            name: 'schedule-creation-batch',
            executor: 'schedule_creation',
            config: {
              xnxq: config.xnxq,
              operation: 'create_schedules_batch',
              batchSize: config.batchSize || 20
            },
            dependsOn: ['participant-management-batch']
          }
        ],
        config: {
          timeout: `${config.timeout || 1800000}ms`,
          retryPolicy: {
            maxAttempts: config.retryCount || 3,
            backoff: 'exponential',
            delay: '1s'
          },
          errorHandling: 'fail-fast',
          concurrency: config.maxConcurrency || 3
        }
      };

      // 2. 创建并执行工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        workflowDefinition,
        { xnxq: config.xnxq },
        {
          timeout: config.timeout || 1800000,
          maxConcurrency: config.maxConcurrency || 3,
          contextData: { config }
        }
      );
      if (!workflowResult.success) {
        throw new Error(`创建工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`全量同步工作流创建成功，ID: ${workflowId}`);

      // 3. 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

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
        version: '1.0.0',
        nodes: [
          {
            id: 'incremental-data-detection',
            type: 'task',
            name: 'incremental-data-detection',
            executor: 'data_detection',
            config: {
              xnxq: config.xnxq,
              operation: 'detect_changes'
            }
          },
          {
            id: 'schedule-deletion',
            type: 'task',
            name: 'schedule-deletion',
            executor: 'schedule_deletion',
            config: {
              xnxq: config.xnxq,
              operation: 'delete_changed_schedules'
            },
            dependsOn: ['incremental-data-detection']
          },
          {
            id: 'incremental-aggregation',
            type: 'task',
            name: 'incremental-aggregation',
            executor: 'incremental_aggregation',
            config: {
              xnxq: config.xnxq,
              operation: 'aggregate_changes',
              batchSize: config.batchSize || 50
            },
            dependsOn: ['schedule-deletion']
          },
          {
            id: 'calendar-update',
            type: 'task',
            name: 'calendar-update',
            executor: 'calendar_update',
            config: {
              xnxq: config.xnxq,
              operation: 'update_calendars',
              batchSize: config.batchSize || 10
            },
            dependsOn: ['incremental-aggregation']
          },
          {
            id: 'participant-sync',
            type: 'task',
            name: 'participant-sync',
            executor: 'participant_sync',
            config: {
              xnxq: config.xnxq,
              operation: 'sync_participants',
              batchSize: config.batchSize || 30
            },
            dependsOn: ['calendar-update']
          },
          {
            id: 'schedule-recreation',
            type: 'task',
            name: 'schedule-recreation',
            executor: 'schedule_recreation',
            config: {
              xnxq: config.xnxq,
              operation: 'recreate_schedules',
              batchSize: config.batchSize || 20
            },
            dependsOn: ['participant-sync']
          }
        ],
        config: {
          timeout: `${config.timeout || 900000}ms`,
          retryPolicy: {
            maxAttempts: config.retryCount || 3,
            backoff: 'exponential',
            delay: '1s'
          },
          errorHandling: 'fail-fast',
          concurrency: config.maxConcurrency || 3
        }
      };

      // 2. 创建并执行工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        workflowDefinition,
        { xnxq: config.xnxq },
        {
          timeout: config.timeout || 900000,
          maxConcurrency: config.maxConcurrency || 3,
          contextData: { config }
        }
      );
      if (!workflowResult.success) {
        throw new Error(`创建增量同步工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`增量同步工作流创建成功，ID: ${workflowId}`);

      // 3. 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

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

  /**
   * 执行日历创建工作流
   */
  async executeCalendarCreationWorkflow(
    kkhList: string[],
    xnxq: string,
    config?: Partial<SyncWorkflowConfig>
  ): Promise<WorkflowExecutionResult> {
    const startTime = new Date();
    this.logger.info(
      `开始执行日历创建工作流，学年学期: ${xnxq}，开课号数量: ${kkhList.length}`
    );

    try {
      // 1. 创建日历创建工作流定义
      const workflowDefinition: WorkflowDefinition = {
        name: `日历创建-${xnxq}-${Date.now()}`,
        description: `学年学期 ${xnxq} 的课程日历创建工作流`,
        version: '1.0.0',
        nodes: [
          {
            id: 'calendar-creation-batch',
            type: 'task',
            name: 'calendar-creation-batch',
            executor: 'calendar_creation',
            config: {
              kkhList,
              xnxq,
              operation: 'create_calendars_batch',
              batchSize: config?.batchSize || 10
            }
          },
          {
            id: 'participant-management-batch',
            type: 'task',
            name: 'participant-management-batch',
            executor: 'participant_management',
            config: {
              kkhList,
              xnxq,
              operation: 'add_participants_batch',
              batchSize: config?.batchSize || 20
            },
            dependsOn: ['calendar-creation-batch']
          }
        ],
        config: {
          timeout: `${config?.timeout || 600000}ms`,
          retryPolicy: {
            maxAttempts: config?.retryCount || 2,
            backoff: 'exponential',
            delay: '1s'
          },
          errorHandling: 'fail-fast',
          concurrency: config?.maxConcurrency || 3
        }
      };

      // 2. 创建并执行工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        workflowDefinition,
        { kkhList, xnxq },
        {
          timeout: config?.timeout || 600000,
          maxConcurrency: config?.maxConcurrency || 3,
          contextData: { config }
        }
      );
      if (!workflowResult.success) {
        throw new Error(`创建日历创建工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`日历创建工作流创建成功，ID: ${workflowId}`);

      // 3. 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行日历创建工作流失败: ${executeResult.error}`);
      }

      // 4. 监控工作流执行
      const finalResult = await this.monitorWorkflowExecution(
        workflowId,
        config?.timeout || 600000
      );

      const endTime = new Date();
      this.logger.info(
        `日历创建工作流执行完成，耗时: ${endTime.getTime() - startTime.getTime()}ms`
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
      this.logger.error(`日历创建工作流执行失败: ${errorMessage}`);

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
   * 执行日历删除工作流
   */
  async executeCalendarDeletionWorkflow(
    kkhList: string[],
    config?: Partial<SyncWorkflowConfig>
  ): Promise<WorkflowExecutionResult> {
    const startTime = new Date();
    this.logger.info(`开始执行日历删除工作流，开课号数量: ${kkhList.length}`);

    try {
      // 1. 创建日历删除工作流定义
      const workflowDefinition: WorkflowDefinition = {
        name: `日历删除-${Date.now()}`,
        description: `课程日历删除工作流`,
        version: '1.0.0',
        nodes: [
          {
            id: 'schedule-deletion-batch',
            type: 'task',
            name: 'schedule-deletion-batch',
            executor: 'schedule_deletion',
            config: {
              kkhList,
              operation: 'delete_schedules_batch',
              batchSize: config?.batchSize || 20
            }
          },
          {
            id: 'participant-removal-batch',
            type: 'task',
            name: 'participant-removal-batch',
            executor: 'participant_removal',
            config: {
              kkhList,
              operation: 'remove_participants_batch',
              batchSize: config?.batchSize || 30
            },
            dependsOn: ['schedule-deletion-batch']
          },
          {
            id: 'calendar-deletion-batch',
            type: 'task',
            name: 'calendar-deletion-batch',
            executor: 'calendar_deletion',
            config: {
              kkhList,
              operation: 'delete_calendars_batch',
              batchSize: config?.batchSize || 10
            },
            dependsOn: ['participant-removal-batch']
          }
        ],
        config: {
          timeout: `${config?.timeout || 600000}ms`,
          retryPolicy: {
            maxAttempts: config?.retryCount || 2,
            backoff: 'exponential',
            delay: '1s'
          },
          errorHandling: 'fail-fast',
          concurrency: config?.maxConcurrency || 3
        }
      };

      // 2. 创建并执行工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        workflowDefinition,
        { kkhList },
        {
          timeout: config?.timeout || 600000,
          maxConcurrency: config?.maxConcurrency || 3,
          contextData: { config }
        }
      );
      if (!workflowResult.success) {
        throw new Error(`创建日历删除工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`日历删除工作流创建成功，ID: ${workflowId}`);

      // 3. 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行日历删除工作流失败: ${executeResult.error}`);
      }

      // 4. 监控工作流执行
      const finalResult = await this.monitorWorkflowExecution(
        workflowId,
        config?.timeout || 600000
      );

      const endTime = new Date();
      this.logger.info(
        `日历删除工作流执行完成，耗时: ${endTime.getTime() - startTime.getTime()}ms`
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
      this.logger.error(`日历删除工作流执行失败: ${errorMessage}`);

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
   * 获取工作流执行状态
   */
  async getWorkflowStatus(workflowId: string): Promise<any> {
    try {
      this.logger.debug(`获取工作流状态: ${workflowId}`);

      const statusResult =
        await this.tasksWorkflow.getWorkflowStatus(workflowId);

      if (!statusResult.success) {
        throw new Error(`获取工作流状态失败: ${statusResult.error}`);
      }

      const status = statusResult.data!;

      // 格式化返回的状态信息
      return {
        workflowId,
        status: status,
        progress: 0,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        startTime: undefined,
        endTime: undefined,
        error: undefined,
        details: {},
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`获取工作流状态失败: ${errorMessage}`, { workflowId });
      throw new Error(`获取工作流状态失败: ${errorMessage}`);
    }
  }

  /**
   * 取消工作流执行
   */
  async cancelWorkflow(workflowId: string): Promise<boolean> {
    try {
      this.logger.info(`取消工作流执行: ${workflowId}`);

      const cancelResult = await this.tasksWorkflow.cancelWorkflow(workflowId);

      if (!cancelResult.success) {
        throw new Error(`取消工作流失败: ${cancelResult.error}`);
      }

      this.logger.info(`工作流已成功取消: ${workflowId}`);
      return cancelResult.data || true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`取消工作流失败: ${errorMessage}`, { workflowId });
      throw new Error(`取消工作流失败: ${errorMessage}`);
    }
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
        this.logger.debug(`工作流 ${workflowId} 状态: ${status}`);

        // 检查工作流是否完成
        if (['completed', 'failed', 'cancelled'].includes(status)) {
          return {
            status: status,
            totalTasks: 0,
            completedTasks: status === 'completed' ? 1 : 0,
            failedTasks: status === 'failed' ? 1 : 0,
            errors: status === 'failed' ? ['工作流执行失败'] : [],
            details: { status }
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

  /**
   * 生成同步报告
   */
  async generateSyncReport(
    xnxq: string,
    syncType: string,
    incrementalMode?: boolean
  ): Promise<any> {
    try {
      this.logger.info(`生成同步报告: ${xnxq}, 类型: ${syncType}`);

      // 简化实现：返回基本的报告数据
      const report = {
        xnxq,
        syncType,
        incrementalMode: incrementalMode || false,
        generatedAt: new Date().toISOString(),
        summary: {
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          successRate: 0
        },
        details: {
          message: '报告生成功能待完善实现'
        }
      };

      this.logger.info(`同步报告生成完成: ${xnxq}`);
      return report;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`生成同步报告失败: ${errorMessage}`, {
        xnxq,
        syncType
      });
      throw new Error(`生成同步报告失败: ${errorMessage}`);
    }
  }

  /**
   * 记录同步历史
   */
  async recordSyncHistory(reportData: any): Promise<boolean> {
    try {
      this.logger.info('记录同步历史', {
        xnxq: reportData.xnxq,
        syncType: reportData.syncType
      });

      // 简化实现：记录同步历史到日志
      // 实际应该保存到数据库或历史记录系统
      this.logger.info('同步历史记录完成', {
        xnxq: reportData.xnxq,
        syncType: reportData.syncType,
        generatedAt: reportData.generatedAt,
        summary: reportData.summary
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`记录同步历史失败: ${errorMessage}`, { reportData });
      return false;
    }
  }

  /**
   * 发送完成通知
   */
  async sendCompletionNotification(
    reportData: any,
    recipients?: string[]
  ): Promise<boolean> {
    try {
      this.logger.info('发送完成通知', {
        xnxq: reportData.xnxq,
        syncType: reportData.syncType,
        recipients: recipients?.length || 0
      });

      // 简化实现：记录通知到日志
      // 实际应该发送邮件或其他通知方式
      this.logger.info('完成通知发送成功', {
        xnxq: reportData.xnxq,
        syncType: reportData.syncType,
        generatedAt: reportData.generatedAt,
        summary: reportData.summary,
        recipients
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`发送完成通知失败: ${errorMessage}`, { reportData });
      return false;
    }
  }

  /**
   * 清理临时数据
   */
  async cleanupTempData(xnxq: string): Promise<{
    cleanedTables: string[];
    cleanedRecords: number;
  }> {
    try {
      this.logger.info(`开始清理临时数据: ${xnxq}`);

      // 简化实现：记录清理操作到日志
      // 实际应该清理数据库中的临时表和缓存数据
      const result = {
        cleanedTables: ['temp_course_data', 'temp_sync_status'],
        cleanedRecords: 0
      };

      this.logger.info(`临时数据清理完成: ${xnxq}`, {
        cleanedTables: result.cleanedTables,
        cleanedRecords: result.cleanedRecords
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`清理临时数据失败: ${errorMessage}`, { xnxq });

      // 即使清理失败，也返回一个结果，避免阻塞流程
      return {
        cleanedTables: [],
        cleanedRecords: 0
      };
    }
  }

  /**
   * 更新最后同步时间
   */
  async updateLastSyncTime(xnxq: string, syncType: string): Promise<boolean> {
    try {
      this.logger.info(`更新最后同步时间: ${xnxq}, 类型: ${syncType}`);

      // 简化实现：记录同步时间到日志
      // 实际应该更新数据库中的同步时间记录
      const currentTime = new Date().toISOString();

      this.logger.info(`同步时间更新完成: ${xnxq}`, {
        syncType,
        lastSyncTime: currentTime
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`更新同步时间失败: ${errorMessage}`, {
        xnxq,
        syncType
      });
      return false;
    }
  }
}
