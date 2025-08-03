// @stratix/icasync 同步完成处理器
// 负责同步完成后的报告生成、通知发送等，完全基于 Service 层架构

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ISyncWorkflowService } from '../services/SyncWorkflowService.js';

/**
 * 同步完成配置接口
 */
export interface SyncCompletionConfig {
  xnxq: string; // 学年学期
  generateReport?: boolean; // 是否生成报告
  sendNotification?: boolean; // 是否发送通知
  cleanupTempData?: boolean; // 是否清理临时数据
  updateLastSyncTime?: boolean; // 是否更新最后同步时间
  incrementalMode?: boolean; // 是否增量模式
  recipients?: string[]; // 通知接收者
}

/**
 * 同步完成结果接口
 */
export interface SyncCompletionResult {
  reportGenerated: boolean; // 是否生成报告
  notificationSent: boolean; // 是否发送通知
  tempDataCleaned: boolean; // 是否清理临时数据
  lastSyncTimeUpdated: boolean; // 是否更新最后同步时间
  historyRecorded: boolean; // 是否记录历史
  duration: number; // 执行时长(ms)
  reportData?: any; // 报告数据
  errors?: string[]; // 错误信息列表
}

/**
 * 同步完成处理器
 *
 * 功能：
 * 1. 通过 SyncWorkflowService 生成同步报告
 * 2. 发送完成通知
 * 3. 清理临时数据
 * 4. 更新最后同步时间
 * 5. 记录同步历史
 */
@Executor({
  name: 'syncCompletionProcessor',
  description: '同步完成处理器 - 基于Service层架构处理同步完成后的工作',
  version: '2.0.0',
  tags: ['sync', 'completion', 'report', 'notification', 'refactored'],
  category: 'icasync'
})
export default class SyncCompletionProcessor implements TaskExecutor {
  readonly name = 'syncCompletionProcessor';
  readonly description = '同步完成处理器';
  readonly version = '2.0.0';

  constructor(
    private syncWorkflowService: ISyncWorkflowService,
    private logger: Logger
  ) {}

  /**
   * 执行同步完成任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as SyncCompletionConfig;

    this.logger.info('开始执行同步完成任务', {
      xnxq: config.xnxq,
      generateReport: config.generateReport,
      sendNotification: config.sendNotification,
      cleanupTempData: config.cleanupTempData,
      incrementalMode: config.incrementalMode
    });

    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 执行同步完成处理
      const result = await this.performSyncCompletion(config);

      result.duration = Date.now() - startTime;

      this.logger.info('同步完成任务执行完成', {
        xnxq: config.xnxq,
        reportGenerated: result.reportGenerated,
        notificationSent: result.notificationSent,
        tempDataCleaned: result.tempDataCleaned,
        duration: result.duration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('同步完成任务失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          reportGenerated: false,
          notificationSent: false,
          tempDataCleaned: false,
          lastSyncTimeUpdated: false,
          historyRecorded: false,
          duration,
          errors: [error instanceof Error ? error.message : String(error)]
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: SyncCompletionConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    return { valid: true };
  }

  /**
   * 执行同步完成处理
   */
  private async performSyncCompletion(
    config: SyncCompletionConfig
  ): Promise<SyncCompletionResult> {
    const result: SyncCompletionResult = {
      reportGenerated: false,
      notificationSent: false,
      tempDataCleaned: false,
      lastSyncTimeUpdated: false,
      historyRecorded: false,
      duration: 0,
      errors: []
    };

    try {
      const syncType = config.incrementalMode ? 'incremental' : 'full';

      // 1. 生成同步报告
      if (config.generateReport !== false) {
        this.logger.info('开始生成同步报告', { xnxq: config.xnxq, syncType });

        try {
          const reportData = await this.syncWorkflowService.generateSyncReport(
            config.xnxq,
            syncType,
            config.incrementalMode
          );

          result.reportGenerated = true;
          result.reportData = reportData;

          this.logger.info('同步报告生成成功', {
            xnxq: config.xnxq,
            syncType: reportData.syncType,
            generatedAt: reportData.generatedAt
          });

          // 2. 发送完成通知
          if (config.sendNotification !== false) {
            this.logger.info('开始发送完成通知', { xnxq: config.xnxq });

            try {
              const notificationSent =
                await this.syncWorkflowService.sendCompletionNotification(
                  reportData,
                  config.recipients
                );

              result.notificationSent = notificationSent;

              if (notificationSent) {
                this.logger.info('完成通知发送成功', { xnxq: config.xnxq });
              } else {
                result.errors?.push('完成通知发送失败');
              }
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              result.errors?.push(`发送通知失败: ${errorMsg}`);
              this.logger.error('发送完成通知失败', {
                xnxq: config.xnxq,
                error: errorMsg
              });
            }
          }

          // 5. 记录同步历史
          try {
            const historyRecorded =
              await this.syncWorkflowService.recordSyncHistory(reportData);
            result.historyRecorded = historyRecorded;

            if (historyRecorded) {
              this.logger.info('同步历史记录成功', { xnxq: config.xnxq });
            } else {
              result.errors?.push('同步历史记录失败');
            }
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            result.errors?.push(`记录同步历史失败: ${errorMsg}`);
            this.logger.error('记录同步历史失败', {
              xnxq: config.xnxq,
              error: errorMsg
            });
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors?.push(`生成报告失败: ${errorMsg}`);
          this.logger.error('生成同步报告失败', {
            xnxq: config.xnxq,
            error: errorMsg
          });
        }
      }

      // 3. 清理临时数据
      if (config.cleanupTempData !== false) {
        this.logger.info('开始清理临时数据', { xnxq: config.xnxq });

        try {
          const cleanupResult = await this.syncWorkflowService.cleanupTempData(
            config.xnxq
          );
          result.tempDataCleaned = true;

          this.logger.info('临时数据清理成功', {
            xnxq: config.xnxq,
            cleanedTables: cleanupResult.cleanedTables,
            cleanedRecords: cleanupResult.cleanedRecords
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors?.push(`清理临时数据失败: ${errorMsg}`);
          this.logger.error('清理临时数据失败', {
            xnxq: config.xnxq,
            error: errorMsg
          });
        }
      }

      // 4. 更新最后同步时间
      if (config.updateLastSyncTime !== false) {
        this.logger.info('开始更新最后同步时间', {
          xnxq: config.xnxq,
          syncType
        });

        try {
          const timeUpdated = await this.syncWorkflowService.updateLastSyncTime(
            config.xnxq,
            syncType
          );

          result.lastSyncTimeUpdated = timeUpdated;

          if (timeUpdated) {
            this.logger.info('最后同步时间更新成功', { xnxq: config.xnxq });
          } else {
            result.errors?.push('最后同步时间更新失败');
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors?.push(`更新最后同步时间失败: ${errorMsg}`);
          this.logger.error('更新最后同步时间失败', {
            xnxq: config.xnxq,
            error: errorMsg
          });
        }
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('同步完成处理过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      result.errors?.push(errorMsg);
      return result;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查 SyncWorkflowService 是否可用
      if (!this.syncWorkflowService) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      this.logger.error('健康检查失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'unhealthy';
    }
  }
}
