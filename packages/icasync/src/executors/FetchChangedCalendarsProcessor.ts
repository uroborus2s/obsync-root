// @stratix/icasync 获取变更日历处理器
// 基于变更检测结果获取需要增量同步的日历列表

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';

export interface FetchChangedCalendarsConfig {
  xnxq: string;
  changes: any[];
  includeRelated?: boolean;
}

export interface ChangedCalendar {
  kkh: string;
  changeType: string;
  lastModified: string;
}

export interface FetchChangedCalendarsResult {
  changedCalendars: ChangedCalendar[];
  totalCount: number;
  duration: number;
}

@Executor({
  name: 'fetchChangedCalendars',
  description: '获取变更的日历列表处理器',
  version: '3.0.0',
  tags: ['fetch', 'changed', 'calendar', 'incremental', 'v3.0'],
  category: 'icasync'
})
export default class FetchChangedCalendarsProcessor implements TaskExecutor {
  readonly name = 'fetchChangedCalendars';
  readonly description = '获取变更的日历列表处理器';
  readonly version = '3.0.0';

  constructor(private logger: Logger) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FetchChangedCalendarsConfig;

    try {
      if (!config.xnxq || !config.changes) {
        return { success: false, error: '参数不完整' };
      }

      const changedCalendars: ChangedCalendar[] = config.changes.map((change: any) => ({
        kkh: change.kkh,
        changeType: change.changeType,
        lastModified: change.timestamp
      }));

      const result: FetchChangedCalendarsResult = {
        changedCalendars,
        totalCount: changedCalendars.length,
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