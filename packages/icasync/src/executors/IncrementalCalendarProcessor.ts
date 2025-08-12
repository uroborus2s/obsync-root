// @stratix/icasync 增量日历处理器
// 处理单个日历的增量同步

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ICalendarSyncService } from '../services/CalendarSyncService.js';

export interface IncrementalCalendarConfig {
  xnxq: string;
  kkh: string;
  changeType: string;
  lastModified: string;
  syncSteps: string[];
}

export interface IncrementalCalendarResult {
  success: boolean;
  kkh: string;
  processed: boolean;
  changes: any[];
  duration: number;
}

@Executor({
  name: 'incrementalCalendarProcessor',
  description: '增量日历处理器',
  version: '3.0.0',
  tags: ['incremental', 'calendar', 'sync', 'v3.0'],
  category: 'icasync'
})
export default class IncrementalCalendarProcessor implements TaskExecutor {
  readonly name = 'incrementalCalendarProcessor';
  readonly description = '增量日历处理器';
  readonly version = '3.0.0';

  constructor(
    private calendarSyncService: ICalendarSyncService,
    private logger: Logger
  ) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as IncrementalCalendarConfig;

    try {
      if (!config.xnxq || !config.kkh) {
        return { success: false, error: '参数不完整' };
      }

      // 执行增量同步
      const syncResult = await this.calendarSyncService.createCourseCalendar(
        config.kkh,
        config.xnxq,
        { batchSize: 1 }
      );

      const result: IncrementalCalendarResult = {
        success: syncResult.successCount > 0,
        kkh: config.kkh,
        processed: true,
        changes: [],
        duration: Date.now() - startTime
      };

      return { success: result.success, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    return this.calendarSyncService ? 'healthy' : 'unhealthy';
  }
}