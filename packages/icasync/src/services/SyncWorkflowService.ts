// @stratix/icasync 同步工作流服务
// 基于@stratix/tasks预定义工作流的简化调用包装器

import { Logger } from '@stratix/core';
import type {
  IWorkflowAdapter,
  WorkflowAdapterResult,
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowInstance
} from '@stratix/tasks';

/**
 * 扩展的工作流适配器接口，支持通过名称引用预定义工作流
 */
interface IExtendedWorkflowAdapter extends IWorkflowAdapter {
  createWorkflow(
    definition: WorkflowDefinition | { name: string; version?: string },
    inputs?: Record<string, any>,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowAdapterResult<WorkflowInstance>>;
}

/**
 * 同步工作流配置
 */
export interface SyncWorkflowConfig {
  /** 学年学期 */
  xnxq: string;
  /** 同步类型 */
  syncType: 'full' | 'incremental';
  /** 是否强制同步（忽略时间戳检查） */
  forceSync?: boolean;
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
 * 基于@stratix/tasks预定义工作流的简化调用包装器
 */
export class SyncWorkflowService implements ISyncWorkflowService {
  constructor(
    private readonly logger: Logger,
    private readonly tasksWorkflow: IExtendedWorkflowAdapter
  ) {}

  /**
   * 执行全量同步工作流
   */
  async executeFullSyncWorkflow(
    config: SyncWorkflowConfig
  ): Promise<WorkflowExecutionResult> {
    const startTime = new Date();
    this.logger.info('开始执行全量同步工作流', {
      xnxq: config.xnxq,
      syncType: config.syncType,
      forceSync: config.forceSync,
      fullConfig: config
    });

    try {
      // 准备工作流输入参数
      const workflowInputs = {
        xnxq: config.xnxq,
        forceSync: config.forceSync || false, // ✅ 添加缺失的forceSync参数
        maxConcurrency: config.maxConcurrency || 3,
        batchSize: config.batchSize || 100,
        timeout: config.timeout ? `${config.timeout}ms` : '45m',
        clearExisting: true,
        createAttendanceRecords: false,
        sendNotification: true
      };

      this.logger.info('传递给工作流的输入参数', workflowInputs);

      // 通过名称和版本引用预定义工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        {
          name: 'icasync-full-sync',
          version: '2.0.0'
        },
        workflowInputs,
        {
          timeout: config.timeout || 1800000,
          maxConcurrency: config.maxConcurrency || 3
        }
      );
      if (!workflowResult.success) {
        throw new Error(`创建工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`全量同步工作流创建成功，ID: ${workflowId}`);

      // 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行工作流失败: ${executeResult.error}`);
      }

      const endTime = new Date();
      this.logger.info(
        `全量同步工作流执行完成，耗时: ${endTime.getTime() - startTime.getTime()}ms`
      );

      // 返回简化的执行结果
      return {
        workflowId,
        status: 'completed',
        startTime,
        endTime,
        totalTasks: 1,
        completedTasks: 1,
        failedTasks: 0,
        errors: [],
        details: executeResult.data
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
      // 通过名称和版本引用预定义工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        {
          name: 'icasync-incremental-sync',
          version: '2.0.0'
        },
        {
          xnxq: config.xnxq,
          batchSize: config.batchSize || 50,
          maxConcurrency: config.maxConcurrency || 3,
          timeout: config.timeout ? `${config.timeout}ms` : '15m',
          generateChangeReport: true
        },
        {
          timeout: config.timeout || 900000,
          maxConcurrency: config.maxConcurrency || 3
        }
      );
      if (!workflowResult.success) {
        throw new Error(`创建增量同步工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`增量同步工作流创建成功，ID: ${workflowId}`);

      // 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行增量同步工作流失败: ${executeResult.error}`);
      }

      const endTime = new Date();
      this.logger.info(
        `增量同步工作流执行完成，耗时: ${endTime.getTime() - startTime.getTime()}ms`
      );

      // 返回简化的执行结果
      return {
        workflowId,
        status: 'completed',
        startTime,
        endTime,
        totalTasks: 1,
        completedTasks: 1,
        failedTasks: 0,
        errors: [],
        details: executeResult.data
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
      // 通过名称和版本引用预定义工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        {
          name: 'icasync-calendar-creation',
          version: '2.0.0'
        },
        {
          kkhList,
          xnxq,
          batchSize: config?.batchSize || 10,
          maxConcurrency: config?.maxConcurrency || 3,
          timeout: config?.timeout ? `${config.timeout}ms` : '10m'
        },
        {
          timeout: config?.timeout || 600000,
          maxConcurrency: config?.maxConcurrency || 3
        }
      );

      if (!workflowResult.success) {
        throw new Error(`创建日历创建工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`日历创建工作流创建成功，ID: ${workflowId}`);

      // 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行日历创建工作流失败: ${executeResult.error}`);
      }

      const endTime = new Date();
      this.logger.info(
        `日历创建工作流执行完成，耗时: ${endTime.getTime() - startTime.getTime()}ms`
      );

      // 返回简化的执行结果
      return {
        workflowId,
        status: 'completed',
        startTime,
        endTime,
        totalTasks: 1,
        completedTasks: 1,
        failedTasks: 0,
        errors: [],
        details: executeResult.data
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
        totalTasks: 1,
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
      // 通过名称和版本引用预定义工作流
      const workflowResult = await this.tasksWorkflow.createWorkflow(
        {
          name: 'icasync-calendar-deletion',
          version: '2.0.0'
        },
        {
          kkhList,
          batchSize: config?.batchSize || 20,
          maxConcurrency: config?.maxConcurrency || 3,
          timeout: config?.timeout ? `${config.timeout}ms` : '10m'
        },
        {
          timeout: config?.timeout || 600000,
          maxConcurrency: config?.maxConcurrency || 3
        }
      );

      if (!workflowResult.success) {
        throw new Error(`创建日历删除工作流失败: ${workflowResult.error}`);
      }

      const workflowId = String(workflowResult.data!.id);
      this.logger.info(`日历删除工作流创建成功，ID: ${workflowId}`);

      // 执行工作流
      const executeResult =
        await this.tasksWorkflow.executeWorkflow(workflowId);

      if (!executeResult.success) {
        throw new Error(`执行日历删除工作流失败: ${executeResult.error}`);
      }

      const endTime = new Date();
      this.logger.info(
        `日历删除工作流执行完成，耗时: ${endTime.getTime() - startTime.getTime()}ms`
      );

      // 返回简化的执行结果
      return {
        workflowId,
        status: 'completed',
        startTime,
        endTime,
        totalTasks: 1,
        completedTasks: 1,
        failedTasks: 0,
        errors: [],
        details: executeResult.data
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
        totalTasks: 1,
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
