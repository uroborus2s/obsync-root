// @stratix/icasync 增量同步汇总处理器
// 汇总增量同步结果

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';

export interface IncrementalSummaryConfig {
  xnxq: string;
  syncType: string;
  changes: any[];
  parallelResults: any[];
  updateSyncTimestamp?: boolean;
}

export interface IncrementalSummaryResult {
  success: boolean;
  processedCount: number;
  successCount: number;
  errorCount: number;
  syncTimestampUpdated: boolean;
  duration: number;
}

@Executor({
  name: 'incrementalSummary',
  description: '增量同步汇总处理器',
  version: '3.0.0',
  tags: ['incremental', 'summary', 'sync', 'v3.0'],
  category: 'icasync'
})
export default class IncrementalSummaryProcessor implements TaskExecutor {
  readonly name = 'incrementalSummary';
  readonly description = '增量同步汇总处理器';
  readonly version = '3.0.0';

  constructor(private logger: Logger) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as IncrementalSummaryConfig;

    try {
      if (!config.xnxq) {
        return { success: false, error: '参数不完整' };
      }

      const parallelResults = config.parallelResults || [];
      const successCount = parallelResults.filter((r: any) => r.success).length;
      
      const result: IncrementalSummaryResult = {
        success: true,
        processedCount: parallelResults.length,
        successCount,
        errorCount: parallelResults.length - successCount,
        syncTimestampUpdated: config.updateSyncTimestamp || false,
        duration: Date.now() - startTime
      };

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