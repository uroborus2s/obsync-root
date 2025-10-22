/**
 * WriteSheetService 使用示例
 *
 * 本示例展示如何使用 WriteSheetService 将缺勤学生关系数据同步到 WPS 多维表
 */

import type { Logger } from '@stratix/core';
import WriteSheetService from '../src/services/wirteSheetService.js';

/**
 * 示例 1: 手动触发同步
 */
export async function manualSyncExample(
  writeSheetService: WriteSheetService,
  logger: Logger
) {
  logger.info('=== 手动触发同步示例 ===');

  try {
    // 调用 triggerSync 方法手动触发同步
    const result = await writeSheetService.triggerSync();

    if (result.success) {
      logger.info(`✅ 同步成功！共同步 ${result.count} 条记录`);
    } else {
      logger.error(`❌ 同步失败：${result.message}`);
    }

    return result;
  } catch (error) {
    logger.error('同步过程中发生错误', error);
    throw error;
  }
}

/**
 * 示例 2: 在 Controller 中使用
 */
export class WriteSheetController {
  constructor(
    private readonly logger: Logger,
    private readonly writeSheetService: WriteSheetService
  ) {}

  /**
   * POST /api/sync-absent-records
   * 手动触发缺勤记录同步
   */
  async syncAbsentRecords(): Promise<{
    success: boolean;
    message: string;
    count: number;
  }> {
    this.logger.info('收到手动同步请求');

    try {
      const result = await this.writeSheetService.triggerSync();

      this.logger.info('同步完成', result);

      return result;
    } catch (error) {
      this.logger.error('同步失败', error);

      return {
        success: false,
        message: error instanceof Error ? error.message : '同步失败',
        count: 0
      };
    }
  }
}

/**
 * 示例 3: 定时任务中使用
 */
export class AbsentRecordSyncExecutor {
  constructor(
    private readonly logger: Logger,
    private readonly writeSheetService: WriteSheetService
  ) {}

  /**
   * 定时任务执行方法
   * 例如：每天凌晨 2 点执行一次同步
   */
  async execute(): Promise<void> {
    this.logger.info('开始执行定时同步任务');

    try {
      const result = await this.writeSheetService.triggerSync();

      if (result.success) {
        this.logger.info(`✅ 定时同步任务完成，共同步 ${result.count} 条记录`);
      } else {
        this.logger.error(`❌ 定时同步任务失败：${result.message}`);
      }
    } catch (error) {
      this.logger.error('定时同步任务执行失败', error);
      throw error;
    }
  }
}

/**
 * 示例 4: 带错误重试的同步
 */
export async function syncWithRetry(
  writeSheetService: WriteSheetService,
  logger: Logger,
  maxRetries: number = 3
): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  logger.info(`=== 带重试的同步示例（最多重试 ${maxRetries} 次）===`);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`第 ${attempt} 次尝试同步...`);

      const result = await writeSheetService.triggerSync();

      if (result.success) {
        logger.info(`✅ 第 ${attempt} 次尝试成功！`);
        return result;
      } else {
        logger.warn(`第 ${attempt} 次尝试失败：${result.message}`);
        lastError = new Error(result.message);
      }
    } catch (error) {
      logger.error(`第 ${attempt} 次尝试发生错误`, error);
      lastError = error instanceof Error ? error : new Error('未知错误');
    }

    // 如果不是最后一次尝试，等待一段时间后重试
    if (attempt < maxRetries) {
      const waitTime = attempt * 1000; // 递增等待时间
      logger.info(`等待 ${waitTime}ms 后重试...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // 所有重试都失败
  logger.error(`❌ 所有 ${maxRetries} 次尝试都失败了`);

  return {
    success: false,
    message: lastError?.message || '同步失败',
    count: 0
  };
}

/**
 * 示例 5: 监控同步状态
 */
export class SyncMonitor {
  private syncHistory: Array<{
    timestamp: Date;
    success: boolean;
    count: number;
    message: string;
  }> = [];

  constructor(
    private readonly logger: Logger,
    private readonly writeSheetService: WriteSheetService
  ) {}

  /**
   * 执行同步并记录历史
   */
  async syncWithMonitoring(): Promise<void> {
    const startTime = new Date();
    this.logger.info('开始监控同步任务');

    try {
      const result = await this.writeSheetService.triggerSync();

      // 记录同步历史
      this.syncHistory.push({
        timestamp: startTime,
        success: result.success,
        count: result.count,
        message: result.message
      });

      // 输出统计信息
      this.logStatistics();
    } catch (error) {
      this.logger.error('同步监控失败', error);

      // 记录失败历史
      this.syncHistory.push({
        timestamp: startTime,
        success: false,
        count: 0,
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 输出统计信息
   */
  private logStatistics(): void {
    const totalSyncs = this.syncHistory.length;
    const successfulSyncs = this.syncHistory.filter((h) => h.success).length;
    const failedSyncs = totalSyncs - successfulSyncs;
    const totalRecords = this.syncHistory.reduce((sum, h) => sum + h.count, 0);

    this.logger.info('=== 同步统计信息 ===');
    this.logger.info(`总同步次数: ${totalSyncs}`);
    this.logger.info(`成功次数: ${successfulSyncs}`);
    this.logger.info(`失败次数: ${failedSyncs}`);
    this.logger.info(`总记录数: ${totalRecords}`);
    this.logger.info(
      `成功率: ${((successfulSyncs / totalSyncs) * 100).toFixed(2)}%`
    );
  }

  /**
   * 获取同步历史
   */
  getSyncHistory() {
    return this.syncHistory;
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.syncHistory = [];
    this.logger.info('同步历史已清除');
  }
}

/**
 * 示例 6: 完整的使用流程
 */
export async function completeExample(
  writeSheetService: WriteSheetService,
  logger: Logger
) {
  logger.info('=== 完整使用流程示例 ===');

  // 1. 创建监控器
  const monitor = new SyncMonitor(logger, writeSheetService);

  // 2. 执行带监控的同步
  await monitor.syncWithMonitoring();

  // 3. 查看同步历史
  const history = monitor.getSyncHistory();
  logger.info('同步历史:', history);

  // 4. 如果失败，尝试重试
  const lastSync = history[history.length - 1];
  if (!lastSync.success) {
    logger.info('上次同步失败，尝试重试...');
    await syncWithRetry(writeSheetService, logger, 3);
  }

  // 5. 输出最终统计
  logger.info('=== 最终统计 ===');
  const finalHistory = monitor.getSyncHistory();
  logger.info(`总同步次数: ${finalHistory.length}`);
  logger.info(`成功次数: ${finalHistory.filter((h) => h.success).length}`);
}

/**
 * 运行所有示例
 */
export async function runAllExamples(
  writeSheetService: WriteSheetService,
  logger: Logger
) {
  logger.info('🚀 开始运行所有示例...\n');

  try {
    // 示例 1: 手动触发同步
    await manualSyncExample(writeSheetService, logger);
    logger.info('');

    // 示例 4: 带重试的同步
    await syncWithRetry(writeSheetService, logger, 3);
    logger.info('');

    // 示例 6: 完整流程
    await completeExample(writeSheetService, logger);
    logger.info('');

    logger.info('✅ 所有示例运行完成！');
  } catch (error) {
    logger.error('❌ 示例运行失败', error);
    throw error;
  }
}
