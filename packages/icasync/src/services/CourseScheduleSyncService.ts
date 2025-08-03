// @stratix/icasync 课表同步服务
// 负责课表数据的同步逻辑，遵循 Stratix 框架的分层架构原则

import { Logger } from '@stratix/core';
import type { IWorkflowAdapter } from '@stratix/tasks';
import type { ICourseRawRepository } from '../repositories/CourseRawRepository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { ISyncTaskRepository } from '../repositories/SyncTaskRepository.js';
import type {
  CourseRaw,
  JuheRenwu,
  SyncTaskRecord
} from '../types/database.js';
import type { SyncConfig, SyncResult } from '../types/sync.js';
import { SyncStatus, SyncType } from '../types/sync.js';
/**
 * 课表同步服务接口
 */
export interface ICourseScheduleSyncService {
  /**
   * 执行全量同步
   * @param xnxq 学年学期
   * @param config 同步配置
   * @returns 同步结果
   */
  executeFullSync(xnxq: string, config?: SyncConfig): Promise<SyncResult>;

  /**
   * 执行增量同步
   * @param xnxq 学年学期
   * @param config 同步配置
   * @returns 同步结果
   */
  executeIncrementalSync(
    xnxq: string,
    config?: SyncConfig
  ): Promise<SyncResult>;

  /**
   * 聚合课程原始数据
   * @param xnxq 学年学期
   * @returns 聚合结果
   */
  aggregateCourseData(
    xnxq: string
  ): Promise<{ success: boolean; count: number; error?: string }>;

  /**
   * 获取同步任务状态
   * @param taskId 任务ID
   * @returns 任务状态
   */
  getSyncTaskStatus(taskId: string): Promise<SyncTaskRecord | null>;

  /**
   * 取消同步任务
   * @param taskId 任务ID
   * @returns 是否成功
   */
  cancelSyncTask(taskId: string): Promise<boolean>;
}

/**
 * 课表同步服务实现
 *
 * 使用 Awilix 12.0.5 的函数参数注入特性
 * 遵循 Stratix 框架的分层架构：Service 层不直接引用 Adapter
 */
export default class CourseScheduleSyncService
  implements ICourseScheduleSyncService
{
  constructor(
    private readonly juheRenwuRepository: IJuheRenwuRepository,
    private readonly courseRawRepository: ICourseRawRepository,
    private readonly syncTaskRepository: ISyncTaskRepository,
    private readonly logger: Logger,
    private readonly tasksWorkflow: IWorkflowAdapter
  ) {}

  /**
   * 执行全量同步
   */
  async executeFullSync(
    xnxq: string,
    config?: SyncConfig
  ): Promise<SyncResult> {
    const startTime = new Date();
    const syncConfig: SyncConfig = {
      type: SyncType.FULL,
      batchSize: 100,
      timeout: 300000, // 5分钟
      parallel: true,
      maxConcurrency: 5,
      retryCount: 3,
      retryDelay: 5000,
      ...config
    };

    // 创建同步任务记录
    const createResult = await this.syncTaskRepository.create({
      task_type: 'full_sync',
      xnxq,
      status: 'pending',
      progress: 0,
      total_items: 0,
      processed_items: 0,
      failed_items: 0,
      metadata: JSON.stringify({ config: syncConfig })
    });

    if (!createResult.success) {
      throw new Error(`创建同步任务失败: ${createResult.error}`);
    }

    const taskId = createResult.data.id;

    try {
      // 更新任务状态为运行中
      await this.syncTaskRepository.updateNullable(taskId, {
        status: 'running',
        start_time: startTime
      });

      // 第一步：数据聚合
      const aggregationResult = await this.aggregateCourseData(xnxq);
      if (!aggregationResult.success) {
        throw new Error(`数据聚合失败: ${aggregationResult.error}`);
      }

      // 更新总项目数
      await this.syncTaskRepository.updateNullable(taskId, {
        total_items: aggregationResult.count,
        progress: 50 // 聚合完成，进度50%
      });

      // 第二步：执行同步逻辑
      // 注意：这里不直接调用 Adapter，而是通过事件或其他机制通知外部系统
      const syncResult = await this.performFullSyncLogic(xnxq, syncConfig);

      const endTime = new Date();
      await this.syncTaskRepository.updateNullable(taskId, {
        status: 'completed',
        end_time: endTime,
        progress: 100,
        processed_items: syncResult.processedCount,
        result_summary: JSON.stringify(syncResult)
      });

      return {
        status: SyncStatus.COMPLETED,
        startTime,
        endTime,
        processedCount: syncResult.processedCount || 0,
        successCount: syncResult.successCount || 0,
        failedCount: syncResult.failedCount || 0
      };
    } catch (error) {
      const endTime = new Date();
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.syncTaskRepository.updateNullable(taskId, {
        status: 'failed',
        end_time: endTime,
        error_message: errorMessage
      });

      return {
        status: SyncStatus.FAILED,
        startTime,
        endTime,
        processedCount: 0,
        successCount: 0,
        failedCount: 1,
        errors: [errorMessage]
      };
    }
  }

  /**
   * 执行增量同步
   */
  async executeIncrementalSync(
    xnxq: string,
    config?: SyncConfig
  ): Promise<SyncResult> {
    const startTime = new Date();
    const syncConfig: SyncConfig = {
      type: SyncType.INCREMENTAL,
      batchSize: 50,
      timeout: 180000, // 3分钟
      parallel: true,
      maxConcurrency: 3,
      retryCount: 3,
      retryDelay: 3000,
      ...config
    };

    const createResult = await this.syncTaskRepository.create({
      task_type: 'incremental_sync',
      xnxq,
      status: 'pending',
      progress: 0,
      total_items: 0,
      processed_items: 0,
      failed_items: 0,
      metadata: JSON.stringify({ config: syncConfig })
    });

    if (!createResult.success) {
      throw new Error(`创建增量同步任务失败: ${createResult.error}`);
    }

    const taskId = createResult.data.id;

    try {
      await this.syncTaskRepository.updateNullable(taskId, {
        status: 'running',
        start_time: startTime
      });

      // 获取未处理的增量数据
      const unprocessedData = await this.getUnprocessedIncrementalData(xnxq);

      await this.syncTaskRepository.updateNullable(taskId, {
        total_items: unprocessedData.length,
        progress: 10
      });

      // 执行增量同步逻辑
      const syncResult = await this.performIncrementalSyncLogic(
        xnxq,
        unprocessedData,
        syncConfig
      );

      const endTime = new Date();
      await this.syncTaskRepository.updateNullable(taskId, {
        status: 'completed',
        end_time: endTime,
        progress: 100,
        processed_items: syncResult.processedCount,
        result_summary: JSON.stringify(syncResult)
      });

      return {
        status: SyncStatus.COMPLETED,
        startTime,
        endTime,
        processedCount: syncResult.processedCount || 0,
        successCount: syncResult.successCount || 0,
        failedCount: syncResult.failedCount || 0
      };
    } catch (error) {
      const endTime = new Date();
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.syncTaskRepository.updateNullable(taskId, {
        status: 'failed',
        end_time: endTime,
        error_message: errorMessage
      });

      return {
        status: SyncStatus.FAILED,
        startTime,
        endTime,
        processedCount: 0,
        successCount: 0,
        failedCount: 1,
        errors: [errorMessage]
      };
    }
  }

  /**
   * 聚合课程原始数据 - 使用原生 SQL 聚合查询
   * Service 层专注于业务逻辑编排和错误处理
   */
  async aggregateCourseData(
    xnxq: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      this.logger.info('开始聚合课程数据', { xnxq });

      // 使用 Repository 层的原生 SQL 聚合方法
      const aggregationResult =
        await this.courseRawRepository.aggregateCourseDataWithSql(
          xnxq,
          this.juheRenwuRepository
        );

      if (aggregationResult.success) {
        const { count, aggregatedData } = aggregationResult.data;

        this.logger.info('课程数据聚合成功', {
          xnxq,
          aggregatedCount: count,
          totalRecords: aggregatedData.length
        });

        return {
          success: true,
          count
        };
      } else {
        // 如果原生 SQL 聚合失败，降级到应用层聚合
        this.logger.warn('原生 SQL 聚合失败，降级到应用层聚合', {
          xnxq,
          error: aggregationResult.error
        });

        return await this.aggregateCourseDataFallback(xnxq);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('聚合课程数据失败', { xnxq, error: errorMessage });
      return { success: false, count: 0, error: errorMessage };
    }
  }

  /**
   * 降级方法：使用原有的应用层聚合逻辑
   */
  private async aggregateCourseDataFallback(
    xnxq: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      // 获取未处理的课程数据
      const result = await this.courseRawRepository.findByXnxq(xnxq);
      if (!result.success) {
        return { success: false, count: 0, error: String(result.error) };
      }

      // 过滤出未处理的数据（gx_zt 为 null）
      const rawCourses = result.data.filter((item) => item.gx_zt === null);

      if (rawCourses.length === 0) {
        return { success: true, count: 0 };
      }

      // 使用原生 JavaScript 进行数据聚合
      const groupedCourses = new Map<string, CourseRaw[]>();

      // 按 kkh, rq, sjd 分组
      for (const course of rawCourses) {
        const key = `${course.kkh}_${course.rq?.substring(0, 10)}_${this.getTimeSlot(course.jc || 1)}`;
        if (!groupedCourses.has(key)) {
          groupedCourses.set(key, []);
        }
        groupedCourses.get(key)!.push(course);
      }

      // 聚合每组数据
      const aggregatedData = Array.from(groupedCourses.values()).map(
        (courses) => this.aggregateCourseGroup(courses)
      );

      // 批量插入聚合数据
      let insertedCount = 0;
      for (const data of aggregatedData) {
        const result = await this.juheRenwuRepository.create(data as any);
        if (result.success) {
          insertedCount++;
        }
      }

      return { success: true, count: insertedCount };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, count: 0, error: errorMessage };
    }
  }

  /**
   * 获取同步任务状态
   */
  async getSyncTaskStatus(taskId: string): Promise<SyncTaskRecord | null> {
    const result = await this.syncTaskRepository.findByIdNullable(
      parseInt(taskId)
    );
    return result.success ? result.data : null;
  }

  /**
   * 取消同步任务
   */
  async cancelSyncTask(taskId: string): Promise<boolean> {
    try {
      const result = await this.syncTaskRepository.updateNullable(
        parseInt(taskId),
        {
          status: 'cancelled',
          end_time: new Date()
        }
      );
      return result.success && result.data !== null;
    } catch {
      return false;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 执行全量同步逻辑（使用 @stratix/tasks 工作流）
   */
  private async performFullSyncLogic(
    xnxq: string,
    config: SyncConfig
  ): Promise<any> {
    try {
      this.logger.info(`开始执行全量同步工作流，学年学期: ${xnxq}`);

      // 1. 创建全量同步工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        {
          name: `全量同步-${xnxq}`,
          description: `学年学期 ${xnxq} 的课表全量同步工作流`,
          version: '1.0.0',
          nodes: [
            {
              id: 'data-aggregation',
              type: 'task',
              name: 'data-aggregation',
              executor: 'course_data_aggregation',
              config: { xnxq, operation: 'aggregate' }
            },
            {
              id: 'calendar-creation',
              type: 'task',
              name: 'calendar-creation',
              executor: 'calendar_management',
              config: { xnxq, operation: 'create_calendars' },
              dependsOn: ['data-aggregation']
            },
            {
              id: 'participant-management',
              type: 'task',
              name: 'participant-management',
              executor: 'participant_management',
              config: { xnxq, operation: 'add_participants' },
              dependsOn: ['calendar-creation']
            },
            {
              id: 'schedule-creation',
              type: 'task',
              name: 'schedule-creation',
              executor: 'schedule_management',
              config: { xnxq, operation: 'create_schedules' },
              dependsOn: ['participant-management']
            }
          ],
          config: {
            timeout: `${config.timeout || 300000}ms`,
            retryPolicy: {
              maxAttempts: config.retryCount || 3,
              backoff: 'exponential',
              delay: '1s'
            },
            errorHandling: 'fail-fast',
            concurrency: config.maxConcurrency || 3
          }
        },
        { xnxq },
        {
          timeout: config.timeout || 300000,
          maxConcurrency: config.maxConcurrency || 3,
          contextData: { config }
        }
      );

      if (!workflowResult.success) {
        throw new Error(`创建工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`工作流创建成功，ID: ${workflowId}`);

      // 2. 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行工作流失败: ${executeResult.error}`);
      }

      // 3. 监控工作流执行状态
      const finalStatus = await this.monitorWorkflowExecution(
        workflowId,
        config.timeout || 300000
      );

      this.logger.info(
        `全量同步工作流执行完成，结果: ${JSON.stringify(finalStatus)}`
      );

      return finalStatus;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`全量同步工作流执行失败: ${errorMessage}`);

      return {
        processedCount: 0,
        successCount: 0,
        failedCount: 1,
        error: errorMessage
      };
    }
  }

  /**
   * 执行增量同步逻辑（使用 @stratix/tasks 工作流）
   */
  private async performIncrementalSyncLogic(
    xnxq: string,
    data: any[],
    config: SyncConfig
  ): Promise<any> {
    try {
      this.logger.info(
        `开始执行增量同步工作流，学年学期: ${xnxq}，数据量: ${data.length}`
      );

      // 1. 创建增量同步工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        {
          name: `增量同步-${xnxq}`,
          description: `学年学期 ${xnxq} 的课表增量同步工作流`,
          version: '1.0.0',
          nodes: [
            {
              id: 'data-validation',
              type: 'task',
              name: 'data-validation',
              executor: 'course_data_validation',
              config: { xnxq, data, operation: 'validate' }
            },
            {
              id: 'incremental-update',
              type: 'task',
              name: 'incremental-update',
              executor: 'incremental_update',
              config: { xnxq, data, operation: 'update' },
              dependsOn: ['data-validation']
            },
            {
              id: 'schedule-sync',
              type: 'task',
              name: 'schedule-sync',
              executor: 'schedule_sync',
              config: { xnxq, data, operation: 'sync_schedules' },
              dependsOn: ['incremental-update']
            }
          ],
          config: {
            timeout: `${config.timeout || 180000}ms`,
            retryPolicy: {
              maxAttempts: config.retryCount || 3,
              backoff: 'exponential',
              delay: '1s'
            },
            errorHandling: 'fail-fast',
            concurrency: config.maxConcurrency || 3
          }
        },
        { xnxq, data },
        {
          timeout: config.timeout || 180000,
          maxConcurrency: config.maxConcurrency || 3,
          contextData: { config }
        }
      );

      if (!workflowResult.success) {
        throw new Error(`创建增量同步工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`增量同步工作流创建成功，ID: ${workflowId}`);

      // 2. 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行增量同步工作流失败: ${executeResult.error}`);
      }

      // 3. 监控工作流执行状态
      const finalStatus = await this.monitorWorkflowExecution(
        workflowId,
        config.timeout || 180000
      );

      this.logger.info(
        `增量同步工作流执行完成，结果: ${JSON.stringify(finalStatus)}`
      );

      return finalStatus;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`增量同步工作流执行失败: ${errorMessage}`);

      return {
        processedCount: data.length,
        successCount: 0,
        failedCount: data.length,
        error: errorMessage
      };
    }
  }

  /**
   * 获取未处理的增量数据
   */
  private async getUnprocessedIncrementalData(xnxq: string): Promise<any[]> {
    const result = await this.courseRawRepository.findByXnxq(xnxq);
    if (!result.success) return [];

    // 过滤出未处理的数据（gx_zt 为 null）
    return result.data.filter((item) => item.gx_zt === null);
  }

  /**
   * 获取时间段（上午/下午）
   */
  private getTimeSlot(jc: number): string {
    // 1-5节为上午，6-10节为下午，11-12节为晚上
    if (jc <= 5) return '上午';
    if (jc <= 10) return '下午';
    return '晚上';
  }

  /**
   * 聚合课程组数据
   */
  private aggregateCourseGroup(courses: CourseRaw[]): Partial<JuheRenwu> {
    const first = courses[0];
    const jcList = courses
      .map((c) => c.jc)
      .filter(Boolean)
      .sort((a, b) => a! - b!);
    const startJc = jcList[0] || 1;
    const endJc = jcList[jcList.length - 1] || 1;

    // 使用 startJc 和 endJc 来计算时间段
    const timeSlot = this.getTimeSlot(startJc);

    return {
      xnxq: first.xnxq,
      kkh: first.kkh,
      kcmc: first.kcmc,
      rq: first.rq,
      sjd: timeSlot,
      // 注意：这里使用 room 字段映射到上课地点
      lq: first.room, // 楼区
      gx_zt: '0' // 未处理状态
    };
  }

  /**
   * 监控工作流执行状态
   */
  private async monitorWorkflowExecution(
    workflowId: string,
    timeout: number
  ): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2秒轮询一次

    while (Date.now() - startTime < timeout) {
      try {
        // 获取工作流状态
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
        if (status === 'completed') {
          return {
            processedCount: 1,
            successCount: 1,
            failedCount: 0,
            status: 'completed'
          };
        }

        // 检查工作流是否失败
        if (status === 'failed' || status === 'cancelled') {
          return {
            processedCount: 1,
            successCount: 0,
            failedCount: 1,
            status: status,
            error: `工作流执行失败，状态: ${status}`
          };
        }

        // 等待下次轮询
        await this.sleep(pollInterval);
      } catch (error) {
        this.logger.error(`监控工作流执行时发生错误: ${error}`);
        await this.sleep(pollInterval);
      }
    }

    // 超时处理
    this.logger.warn(`工作流 ${workflowId} 监控超时`);
    return {
      processedCount: 0,
      successCount: 0,
      failedCount: 1,
      status: 'timeout',
      error: '工作流执行超时'
    };
  }

  /**
   * 睡眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
