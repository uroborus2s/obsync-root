// @stratix/icasync 全量同步适配器
// 简单封装 ICourseScheduleSyncService.executeFullSync

import type { AwilixContainer, Logger } from '@stratix/core';
import type { ICourseScheduleSyncService } from '../services/CourseScheduleSyncService.js';
import { SyncType, type SyncResult } from '../types/sync.js';

/**
 * 全量同步配置
 */
export interface FullSyncConfig {
  readonly xnxq: string;
  readonly batchSize?: number;
  readonly timeout?: number;
}

/**
 * 全量同步适配器
 * 注册名称：fullSync
 * 简单封装 ICourseScheduleSyncService.executeFullSync
 */
export default class FullSyncAdapter {
  static adapterName = 'fullSync';

  private courseScheduleSyncService: ICourseScheduleSyncService;
  private logger: Logger;

  constructor(container: AwilixContainer) {
    this.courseScheduleSyncService = container.resolve(
      'courseScheduleSyncService'
    );
    this.logger = container.resolve('logger');
  }

  /**
   * 执行全量同步
   */
  async executeFullSync(config: FullSyncConfig): Promise<SyncResult> {
    console.log(`[FullSyncAdapter] Starting full sync for ${config.xnxq}`);

    const syncConfig = {
      type: SyncType.FULL,
      batchSize: config.batchSize || 100,
      timeout: config.timeout || 30000
    };

    const result = await this.courseScheduleSyncService.executeFullSync(
      config.xnxq,
      syncConfig
    );

    this.logger.info(
      `[FullSyncAdapter] Full sync completed: ${result.processedCount} items processed`
    );

    return result;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    return (
      this.courseScheduleSyncService !== null &&
      this.courseScheduleSyncService !== undefined
    );
  }
}
