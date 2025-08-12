// @stratix/icasync 最终结果汇总处理器
// 汇总增量同步的最终结果

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';

export interface FinalSummaryConfig {
  xnxq: string;
  syncType: string;
  branchResults: {
    hasChanges?: any;
    noChanges?: any;
  };
}

export interface FinalSummaryResult {
  success: boolean;
  xnxq: string;
  syncType: string;
  hasChanges: boolean;
  finalStatus: 'completed' | 'no-changes' | 'partial' | 'failed';
  summary: string;
  processedCount: number;
  successCount: number;
  errorCount: number;
  duration: number;
}

@Executor({
  name: 'finalSummary',
  description: '最终结果汇总处理器',
  version: '3.0.0',
  tags: ['final', 'summary', 'incremental', 'v3.0'],
  category: 'icasync'
})
export default class FinalSummaryProcessor implements TaskExecutor {
  readonly name = 'finalSummary';
  readonly description = '最终结果汇总处理器';
  readonly version = '3.0.0';

  constructor(private logger: Logger) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FinalSummaryConfig;

    try {
      if (!config.xnxq) {
        return { success: false, error: '参数不完整' };
      }

      const branchResults = config.branchResults || {};
      const hasChangesResult = branchResults.hasChanges;
      const noChangesResult = branchResults.noChanges;

      let finalStatus: 'completed' | 'no-changes' | 'partial' | 'failed';
      let hasChanges = false;
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;
      let summary = '';

      if (hasChangesResult) {
        hasChanges = true;
        processedCount = hasChangesResult.processedCount || 0;
        successCount = hasChangesResult.successCount || 0;
        errorCount = hasChangesResult.errorCount || 0;
        
        if (successCount === processedCount) {
          finalStatus = 'completed';
          summary = `增量同步完成：成功处理 ${successCount} 个变更`;
        } else if (successCount > 0) {
          finalStatus = 'partial';
          summary = `增量同步部分完成：成功 ${successCount}，失败 ${errorCount}`;
        } else {
          finalStatus = 'failed';
          summary = `增量同步失败：${errorCount} 个变更处理失败`;
        }
      } else if (noChangesResult) {
        hasChanges = false;
        finalStatus = 'no-changes';
        summary = noChangesResult.message || '没有检测到需要同步的变更';
      } else {
        finalStatus = 'failed';
        summary = '增量同步流程异常';
      }

      const result: FinalSummaryResult = {
        success: finalStatus !== 'failed',
        xnxq: config.xnxq,
        syncType: config.syncType,
        hasChanges,
        finalStatus,
        summary,
        processedCount,
        successCount,
        errorCount,
        duration: Date.now() - startTime
      };

      this.logger.info('最终结果汇总完成', {
        xnxq: config.xnxq,
        syncType: config.syncType,
        finalStatus,
        hasChanges,
        processedCount,
        successCount,
        errorCount,
        summary
      });

      return { success: result.success, data: result };
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