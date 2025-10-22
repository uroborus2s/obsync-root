/**
 * 分批同步与断点续传示例
 * 
 * 本文件展示如何使用 WriteSheetService 的分批同步和断点续传功能
 */

import type { Logger } from '@stratix/core';
import type { WpsDBSheetAdapter } from '@stratix/was-v7';
import type AbsentStudentRelationRepository from '../src/repositories/AbsentStudentRelationRepository.js';
import WriteSheetService from '../src/services/wirteSheetService.js';
import type { SyncSummary, SyncProgress } from '../src/types/sync-progress.js';

// ============================================================================
// 示例 1: 基本使用 - 从头开始同步
// ============================================================================

async function example1_basicSync(
  logger: Logger,
  wasV7ApiDbsheet: WpsDBSheetAdapter,
  repo: AbsentStudentRelationRepository
) {
  console.log('\n=== 示例 1: 基本使用 - 从头开始同步 ===\n');

  // 创建服务实例
  const service = new WriteSheetService(logger, wasV7ApiDbsheet, repo, {
    batchSize: 100,
    fileId: '459309344199',
    sheetId: 1
  });

  // 从头开始同步
  const summary: SyncSummary = await service.triggerSync(false);

  // 输出结果
  console.log('同步完成！');
  console.log(`- 总记录数: ${summary.totalCount}`);
  console.log(`- 成功同步: ${summary.syncedCount}`);
  console.log(`- 失败数量: ${summary.failedCount}`);
  console.log(`- 总批次数: ${summary.totalBatches}`);
  console.log(`- 成功批次: ${summary.successBatches}`);
  console.log(`- 失败批次: ${summary.failedBatches}`);
  console.log(`- 耗时: ${summary.duration}ms`);

  if (summary.errors.length > 0) {
    console.log('错误信息:');
    summary.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
}

// ============================================================================
// 示例 2: 断点续传 - 从上次中断位置继续
// ============================================================================

async function example2_resumeSync(
  logger: Logger,
  wasV7ApiDbsheet: WpsDBSheetAdapter,
  repo: AbsentStudentRelationRepository
) {
  console.log('\n=== 示例 2: 断点续传 - 从上次中断位置继续 ===\n');

  const service = new WriteSheetService(logger, wasV7ApiDbsheet, repo);

  // 第一次同步（假设中断了）
  console.log('开始第一次同步...');
  try {
    await service.triggerSync(false);
  } catch (error) {
    console.log('同步中断！');
  }

  // 检查进度
  const progress = service.getSyncProgress();
  if (progress) {
    console.log(`\n当前进度: ${progress.syncedCount}/${progress.totalCount} 条记录`);
    console.log(`当前偏移量: ${progress.currentOffset}`);
  }

  // 从上次位置继续
  console.log('\n从上次位置继续同步...');
  const summary = await service.triggerSync(true);

  console.log(`\n本次同步完成: ${summary.syncedCount} 条记录`);
}

// ============================================================================
// 示例 3: 监控同步进度
// ============================================================================

async function example3_monitorProgress(
  logger: Logger,
  wasV7ApiDbsheet: WpsDBSheetAdapter,
  repo: AbsentStudentRelationRepository
) {
  console.log('\n=== 示例 3: 监控同步进度 ===\n');

  const service = new WriteSheetService(logger, wasV7ApiDbsheet, repo);

  // 启动同步（不等待完成）
  const syncPromise = service.triggerSync(false);

  // 定期检查进度
  const progressInterval = setInterval(() => {
    const progress: SyncProgress | null = service.getSyncProgress();

    if (progress) {
      const percentage = Math.round(
        (progress.syncedCount / progress.totalCount) * 100
      );

      console.log(
        `进度: ${progress.syncedCount}/${progress.totalCount} (${percentage}%) - 状态: ${progress.status}`
      );

      // 如果完成或失败，停止监控
      if (progress.status === 'completed' || progress.status === 'failed') {
        clearInterval(progressInterval);
        console.log('\n同步结束！');
      }
    }
  }, 1000); // 每秒检查一次

  // 等待同步完成
  const summary = await syncPromise;

  // 清除定时器
  clearInterval(progressInterval);

  console.log(`\n最终结果: ${summary.success ? '成功' : '失败'}`);
}

// ============================================================================
// 示例 4: 失败重试机制
// ============================================================================

async function example4_retryOnFailure(
  logger: Logger,
  wasV7ApiDbsheet: WpsDBSheetAdapter,
  repo: AbsentStudentRelationRepository
) {
  console.log('\n=== 示例 4: 失败重试机制 ===\n');

  const service = new WriteSheetService(logger, wasV7ApiDbsheet, repo);

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    console.log(`\n第 ${attempt} 次尝试...`);

    try {
      // 第一次从头开始，后续使用断点续传
      const summary = await service.triggerSync(attempt > 1);

      if (summary.success) {
        console.log('✅ 同步成功！');
        break;
      } else if (summary.failedBatches > 0) {
        console.log(
          `⚠️ 部分失败: ${summary.failedBatches}/${summary.totalBatches} 批次失败`
        );

        if (attempt < maxRetries) {
          console.log('等待 5 秒后重试...');
          await delay(5000);
        }
      }
    } catch (error) {
      console.error(`❌ 第 ${attempt} 次尝试失败:`, error);

      if (attempt < maxRetries) {
        console.log('等待 5 秒后重试...');
        await delay(5000);
      }
    }
  }

  if (attempt >= maxRetries) {
    console.error('❌ 达到最大重试次数，同步失败');
  }
}

// ============================================================================
// 示例 5: 定时同步
// ============================================================================

async function example5_scheduledSync(
  logger: Logger,
  wasV7ApiDbsheet: WpsDBSheetAdapter,
  repo: AbsentStudentRelationRepository
) {
  console.log('\n=== 示例 5: 定时同步 ===\n');

  const service = new WriteSheetService(logger, wasV7ApiDbsheet, repo);

  // 每小时同步一次
  const syncInterval = setInterval(
    async () => {
      console.log(`\n[${new Date().toISOString()}] 开始定时同步...`);

      try {
        const summary = await service.triggerSync(false);

        if (summary.success) {
          console.log(
            `✅ 定时同步成功: ${summary.syncedCount}/${summary.totalCount} 条记录`
          );
        } else {
          console.error(
            `❌ 定时同步失败: ${summary.failedBatches}/${summary.totalBatches} 批次失败`
          );
        }
      } catch (error) {
        console.error('❌ 定时同步异常:', error);
      }
    },
    3600000 // 1 小时 = 3600000 毫秒
  );

  // 注意：在实际应用中，需要在适当的时候清除定时器
  // clearInterval(syncInterval);

  console.log('定时同步已启动，每小时执行一次');
}

// ============================================================================
// 示例 6: 自定义批量大小
// ============================================================================

async function example6_customBatchSize(
  logger: Logger,
  wasV7ApiDbsheet: WpsDBSheetAdapter,
  repo: AbsentStudentRelationRepository
) {
  console.log('\n=== 示例 6: 自定义批量大小 ===\n');

  // 小批量（适合网络不稳定的情况）
  const smallBatchService = new WriteSheetService(
    logger,
    wasV7ApiDbsheet,
    repo,
    {
      batchSize: 50
    }
  );

  console.log('使用小批量（50 条/批）同步...');
  const summary1 = await smallBatchService.triggerSync(false);
  console.log(`总批次: ${summary1.totalBatches}`);

  // 大批量（适合网络稳定的情况）
  const largeBatchService = new WriteSheetService(
    logger,
    wasV7ApiDbsheet,
    repo,
    {
      batchSize: 200
    }
  );

  console.log('\n使用大批量（200 条/批）同步...');
  const summary2 = await largeBatchService.triggerSync(false);
  console.log(`总批次: ${summary2.totalBatches}`);
}

// ============================================================================
// 示例 7: 重置进度
// ============================================================================

async function example7_resetProgress(
  logger: Logger,
  wasV7ApiDbsheet: WpsDBSheetAdapter,
  repo: AbsentStudentRelationRepository
) {
  console.log('\n=== 示例 7: 重置进度 ===\n');

  const service = new WriteSheetService(logger, wasV7ApiDbsheet, repo);

  // 开始同步
  console.log('开始同步...');
  try {
    await service.triggerSync(false);
  } catch (error) {
    console.log('同步中断');
  }

  // 查看进度
  let progress = service.getSyncProgress();
  console.log(`\n当前进度: ${progress?.syncedCount}/${progress?.totalCount}`);

  // 重置进度
  console.log('\n重置进度...');
  service.resetSyncProgress();

  // 再次查看进度
  progress = service.getSyncProgress();
  console.log(`重置后进度: ${progress ? '有进度' : '无进度'}`);

  // 重新同步（从头开始）
  console.log('\n重新同步（从头开始）...');
  const summary = await service.triggerSync(false);
  console.log(`同步完成: ${summary.syncedCount} 条记录`);
}

// ============================================================================
// 示例 8: 在 Controller 中使用
// ============================================================================

/**
 * 同步控制器示例
 * 
 * 在实际应用中，可以创建一个 Controller 来提供 HTTP API
 */
class SyncController {
  constructor(private writeSheetService: WriteSheetService) {}

  /**
   * 开始同步
   * GET /api/sync/start
   */
  async startSync() {
    try {
      const summary = await this.writeSheetService.triggerSync(false);

      return {
        success: true,
        message: `同步完成: ${summary.syncedCount}/${summary.totalCount} 条记录`,
        data: summary
      };
    } catch (error: any) {
      return {
        success: false,
        message: `同步失败: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * 继续同步
   * GET /api/sync/resume
   */
  async resumeSync() {
    try {
      const summary = await this.writeSheetService.triggerSync(true);

      return {
        success: true,
        message: `继续同步完成: ${summary.syncedCount} 条记录`,
        data: summary
      };
    } catch (error: any) {
      return {
        success: false,
        message: `继续同步失败: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * 获取进度
   * GET /api/sync/progress
   */
  async getProgress() {
    const progress = this.writeSheetService.getSyncProgress();

    if (!progress) {
      return {
        success: true,
        message: '没有正在进行的同步任务',
        data: null
      };
    }

    const percentage = Math.round(
      (progress.syncedCount / progress.totalCount) * 100
    );

    return {
      success: true,
      message: `同步进度: ${percentage}%`,
      data: {
        ...progress,
        percentage
      }
    };
  }

  /**
   * 重置进度
   * POST /api/sync/reset
   */
  async resetProgress() {
    this.writeSheetService.resetSyncProgress();

    return {
      success: true,
      message: '进度已重置',
      data: null
    };
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// 导出示例函数
// ============================================================================

export {
  example1_basicSync,
  example2_resumeSync,
  example3_monitorProgress,
  example4_retryOnFailure,
  example5_scheduledSync,
  example6_customBatchSize,
  example7_resetProgress,
  SyncController
};

// ============================================================================
// 使用说明
// ============================================================================

/**
 * 如何运行这些示例：
 * 
 * 1. 导入所需的依赖：
 *    import { example1_basicSync } from './examples/batch-sync-example.js';
 * 
 * 2. 准备依赖项：
 *    const logger = container.resolve<Logger>('logger');
 *    const wasV7ApiDbsheet = container.resolve<WpsDBSheetAdapter>('wasV7ApiDbsheet');
 *    const repo = container.resolve<AbsentStudentRelationRepository>('absentStudentRelationRepository');
 * 
 * 3. 运行示例：
 *    await example1_basicSync(logger, wasV7ApiDbsheet, repo);
 * 
 * 或者在 Controller 中使用：
 * 
 * @Controller('/api/sync')
 * export class MySyncController {
 *   constructor(private writeSheetService: WriteSheetService) {}
 * 
 *   @Get('/start')
 *   async start() {
 *     return await this.writeSheetService.triggerSync(false);
 *   }
 * }
 */

