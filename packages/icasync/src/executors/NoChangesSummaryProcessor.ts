// @stratix/icasync 无变更汇总处理器
// 记录无变更的同步结果

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';

export interface NoChangesSummaryConfig {
  xnxq: string;
  syncType: string;
  lastSyncTimestamp?: string;
  updateSyncTimestamp?: boolean;
}

export interface NoChangesSummaryResult {
  success: boolean;
  hasChanges: false;
  message: string;
  lastSyncTimestamp?: string;
  syncTimestampUpdated: boolean;
  duration: number;
}

@Executor({
  name: 'noChangesSummary',
  description: '无变更汇总处理器',
  version: '3.0.0',
  tags: ['no-changes', 'summary', 'incremental', 'v3.0'],
  category: 'icasync'
})
export default class NoChangesSummaryProcessor implements TaskExecutor {
  readonly name = 'noChangesSummary';
  readonly description = '无变更汇总处理器';
  readonly version = '3.0.0';

  constructor(private logger: Logger) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as NoChangesSummaryConfig;

    try {
      if (!config.xnxq) {
        return { success: false, error: '参数不完整' };
      }

      const result: NoChangesSummaryResult = {
        success: true,
        hasChanges: false,
        message: `学期 ${config.xnxq} 没有检测到需要同步的变更`,
        lastSyncTimestamp: config.lastSyncTimestamp,
        syncTimestampUpdated: config.updateSyncTimestamp || false,
        duration: Date.now() - startTime
      };

      this.logger.info('无变更汇总完成', {
        xnxq: config.xnxq,
        syncType: config.syncType,
        message: result.message
      });

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    return 'healthy';
  }
}