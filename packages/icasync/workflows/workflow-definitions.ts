// @stratix/icasync 工作流定义
// 基于@stratix/tasks标准工作流DSL设计，使用重构后的执行器架构

import type { WorkflowDefinition } from '@stratix/tasks';

/**
 * 全量同步工作流定义
 *
 * 执行顺序：
 * 1. 数据聚合 (dataAggregationProcessor) ✅ 已重构
 * 2. 日历创建 (calendarCreationProcessor) ✅ 已重构
 * 3. 参与者管理 (participantManagementProcessor) ⚠️ 部分重构
 * 4. 日程创建 (scheduleCreationProcessor) ❌ 待重构
 * 5. 状态更新 (statusUpdateProcessor) ❌ 待重构
 * 6. 同步完成 (syncCompletionProcessor) ❌ 待重构
 */
export const FULL_SYNC_WORKFLOW: WorkflowDefinition = {
  name: 'icasync-full-sync',
  version: '2.0.0', // 版本升级，反映架构重构
  description: '课表全量同步工作流 - 基于Service层架构的完整学期课表同步流程',

  inputs: [
    {
      name: 'xnxq',
      type: 'string',
      required: true,
      description: '学年学期，格式：YYYY-YYYY-N（如：2024-2025-1）',
      validation: {
        pattern: '^\\d{4}-\\d{4}-[12]$',
        message: '学年学期格式不正确，应为：YYYY-YYYY-N'
      }
    },
    {
      name: 'batchSize',
      type: 'number',
      required: false,
      default: 100,
      description: '批处理大小，控制每批处理的记录数',
      validation: {
        min: 10,
        max: 1000,
        message: '批处理大小必须在10-1000之间'
      }
    },
    {
      name: 'maxConcurrency',
      type: 'number',
      required: false,
      default: 10,
      description: '最大并发数，控制并行执行的任务数',
      validation: {
        min: 1,
        max: 50,
        message: '最大并发数必须在1-50之间'
      }
    },
    {
      name: 'timeout',
      type: 'string',
      required: false,
      default: '45m',
      description: '任务超时时间，增加到45分钟以适应大数据量'
    },
    {
      name: 'clearExisting',
      type: 'boolean',
      required: false,
      default: true,
      description: '是否清理现有数据后重新同步（全量同步推荐开启）'
    },
    {
      name: 'createAttendanceRecords',
      type: 'boolean',
      required: false,
      default: false,
      description: '是否创建打卡记录（实验课、实习课等）'
    },
    {
      name: 'sendNotification',
      type: 'boolean',
      required: false,
      default: true,
      description: '是否发送完成通知'
    }
  ],

  outputs: [
    {
      name: 'syncSummary',
      type: 'object',
      description: '同步结果摘要，包含各阶段的详细统计'
    },
    {
      name: 'processedCount',
      type: 'number',
      description: '处理的记录总数'
    },
    {
      name: 'createdCalendars',
      type: 'number',
      description: '创建的日历数量'
    },
    {
      name: 'addedParticipants',
      type: 'number',
      description: '添加的参与者数量'
    },
    {
      name: 'createdSchedules',
      type: 'number',
      description: '创建的日程数量'
    },
    {
      name: 'errorCount',
      type: 'number',
      description: '错误记录数'
    },
    {
      name: 'duration',
      type: 'number',
      description: '总执行时长（毫秒）'
    },
    {
      name: 'reportUrl',
      type: 'string',
      description: '同步报告URL（如果生成）'
    }
  ],

  nodes: [
    {
      id: 'data-aggregation',
      name: '数据聚合',
      type: 'executor',
      executor: 'dataAggregationProcessor', // ✅ 已重构完成
      config: {
        xnxq: '${inputs.xnxq}',
        batchSize: '${inputs.batchSize}',
        clearExisting: '${inputs.clearExisting}',
        useNativeSQL: true,
        incrementalMode: false
      },
      timeout: '${inputs.timeout}',
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        delay: '30s'
      },
      onFailure: 'fail-workflow'
    },
    {
      id: 'calendar-creation',
      name: '日历创建',
      type: 'executor',
      executor: 'calendarCreationProcessor', // ✅ 已重构完成
      dependsOn: ['data-aggregation'],
      config: {
        xnxq: '${inputs.xnxq}',
        batchSize: '${inputs.batchSize}',
        maxConcurrency: '${inputs.maxConcurrency}',
        timeout: 30000,
        retryCount: 3
      },
      timeout: '${inputs.timeout}',
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        delay: '1m'
      },
      onFailure: 'continue' // 日历创建失败不影响后续流程
    },
    {
      id: 'participant-management',
      name: '参与者管理',
      type: 'executor',
      executor: 'participantManagementProcessor', // ⚠️ 部分重构，需要完善Service层方法
      dependsOn: ['calendar-creation'],
      config: {
        xnxq: '${inputs.xnxq}',
        batchSize: 100,
        maxConcurrency: '${inputs.maxConcurrency}',
        timeout: 30000
      },
      timeout: '${inputs.timeout}',
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        delay: '30s'
      },
      onFailure: 'continue'
    },
    {
      id: 'schedule-creation',
      name: '日程创建',
      type: 'executor',
      executor: 'scheduleCreationProcessor', // ❌ 待重构，当前仍使用DatabaseAPI
      dependsOn: ['participant-management'],
      config: {
        xnxq: '${inputs.xnxq}',
        batchSize: 200,
        maxConcurrency: 8,
        createAttendanceRecords: '${inputs.createAttendanceRecords}',
        timeout: 45000
      },
      timeout: '${inputs.timeout}',
      retry: {
        maxAttempts: 2,
        backoff: 'exponential',
        delay: '1m'
      },
      onFailure: 'continue'
    },
    {
      id: 'status-update',
      name: '状态更新',
      type: 'executor',
      executor: 'statusUpdateProcessor', // ❌ 待重构，当前仍使用DatabaseAPI
      dependsOn: ['schedule-creation'],
      config: {
        xnxq: '${inputs.xnxq}',
        markAsCompleted: true,
        updateTimestamp: true
      },
      timeout: '10m',
      retry: {
        maxAttempts: 3,
        backoff: 'linear',
        delay: '10s'
      },
      onFailure: 'continue'
    },
    {
      id: 'sync-completion',
      name: '同步完成',
      type: 'executor',
      executor: 'syncCompletionProcessor', // ❌ 待重构，当前仍使用DatabaseAPI
      dependsOn: ['status-update'],
      config: {
        xnxq: '${inputs.xnxq}',
        generateReport: true,
        sendNotification: '${inputs.sendNotification}',
        cleanupTempData: true,
        updateLastSyncTime: true
      },
      timeout: '15m',
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        delay: '30s'
      },
      onFailure: 'continue' // 完成处理失败不影响主流程
    }
  ],

  // 工作流级别的错误处理
  onFailure: {
    cleanup: true,
    notification: true,
    rollback: false // 课表同步通常不需要回滚
  },

  // 工作流级别的超时设置
  timeout: '2h', // 整个工作流最多2小时

  // 并发控制
  concurrency: {
    maxParallel: 1, // 全量同步串行执行
    resourceLimits: {
      memory: '2GB',
      cpu: '2'
    }
  },

  // 监控和告警
  monitoring: {
    metrics: ['duration', 'success_rate', 'error_count'],
    alerts: [
      {
        condition: 'duration > 7200000', // 超过2小时
        severity: 'warning',
        message: '全量同步执行时间过长'
      },
      {
        condition: 'error_count > 100',
        severity: 'error',
        message: '同步过程中错误过多'
      }
    ]
  }
};

/**
 * 增量同步工作流定义
 *
 * 执行顺序：
 * 1. 变更检测 (changeDetectionProcessor) ❌ 待重构
 * 2. 数据聚合 (dataAggregationProcessor) ✅ 已重构
 * 3. 日历创建 (calendarCreationProcessor) ✅ 已重构
 * 4. 参与者管理 (participantManagementProcessor) ⚠️ 部分重构
 * 5. 日程创建 (scheduleCreationProcessor) ❌ 待重构
 * 6. 状态更新 (statusUpdateProcessor) ❌ 待重构
 * 7. 同步完成 (syncCompletionProcessor) ❌ 待重构
 */
export const INCREMENTAL_SYNC_WORKFLOW: WorkflowDefinition = {
  name: 'icasync-incremental-sync',
  version: '2.0.0',
  description: '课表增量同步工作流 - 基于变更检测的高效同步流程',

  inputs: [
    {
      name: 'xnxq',
      type: 'string',
      required: true,
      description: '学年学期，格式：YYYY-YYYY-N（如：2024-2025-1）',
      validation: {
        pattern: '^\\d{4}-\\d{4}-[12]$',
        message: '学年学期格式不正确，应为：YYYY-YYYY-N'
      }
    },
    {
      name: 'timeWindow',
      type: 'number',
      required: false,
      default: 24,
      description: '变更检测时间窗口（小时），检测最近N小时内的变更',
      validation: {
        min: 1,
        max: 168,
        message: '时间窗口必须在1-168小时之间'
      }
    },
    {
      name: 'batchSize',
      type: 'number',
      required: false,
      default: 50,
      description: '批处理大小，增量同步使用较小的批次',
      validation: {
        min: 10,
        max: 500,
        message: '批处理大小必须在10-500之间'
      }
    },
    {
      name: 'maxConcurrency',
      type: 'number',
      required: false,
      default: 5,
      description: '最大并发数，增量同步使用较低的并发',
      validation: {
        min: 1,
        max: 20,
        message: '最大并发数必须在1-20之间'
      }
    },
    {
      name: 'timeout',
      type: 'string',
      required: false,
      default: '20m',
      description: '任务超时时间，增量同步通常较快'
    },
    {
      name: 'generateChangeReport',
      type: 'boolean',
      required: false,
      default: true,
      description: '是否生成变更报告'
    },
    {
      name: 'sendNotification',
      type: 'boolean',
      required: false,
      default: false,
      description: '是否发送完成通知（增量同步默认不发送）'
    }
  ],

  outputs: [
    {
      name: 'changesSummary',
      type: 'object',
      description: '变更检测摘要'
    },
    {
      name: 'totalChanges',
      type: 'number',
      description: '检测到的总变更数'
    },
    {
      name: 'processedChanges',
      type: 'number',
      description: '处理的变更数'
    },
    {
      name: 'syncSummary',
      type: 'object',
      description: '同步结果摘要'
    },
    {
      name: 'duration',
      type: 'number',
      description: '总执行时长（毫秒）'
    },
    {
      name: 'changeReportUrl',
      type: 'string',
      description: '变更报告URL（如果生成）'
    }
  ],

  nodes: [
    {
      id: 'change-detection',
      name: '变更检测',
      type: 'executor',
      executor: 'changeDetectionProcessor', // ❌ 待重构，当前仍使用DatabaseAPI
      config: {
        xnxq: '${inputs.xnxq}',
        detectChanges: true,
        compareWithExisting: true,
        generateChangeReport: '${inputs.generateChangeReport}',
        timeWindow: '${inputs.timeWindow}'
      },
      timeout: '${inputs.timeout}',
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        delay: '10s'
      },
      onFailure: 'fail-workflow' // 变更检测失败则终止流程
    },
    {
      id: 'incremental-aggregation',
      name: '增量数据聚合',
      type: 'executor',
      executor: 'dataAggregationProcessor', // ✅ 已重构完成
      dependsOn: ['change-detection'],
      condition: '${nodes.change-detection.outputs.totalChanges} > 0', // 有变更才执行
      config: {
        xnxq: '${inputs.xnxq}',
        batchSize: '${inputs.batchSize}',
        clearExisting: false, // 增量模式不清理现有数据
        useNativeSQL: true,
        incrementalMode: true
      },
      timeout: '${inputs.timeout}',
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        delay: '15s'
      },
      onFailure: 'fail-workflow'
    },
    {
      id: 'incremental-calendar-creation',
      name: '增量日历创建',
      type: 'executor',
      executor: 'calendarCreationProcessor', // ✅ 已重构完成
      dependsOn: ['incremental-aggregation'],
      config: {
        xnxq: '${inputs.xnxq}',
        batchSize: '${inputs.batchSize}',
        maxConcurrency: '${inputs.maxConcurrency}',
        timeout: 20000,
        retryCount: 2
      },
      timeout: '${inputs.timeout}',
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        delay: '30s'
      },
      onFailure: 'continue'
    },
    {
      id: 'incremental-participant-management',
      name: '增量参与者管理',
      type: 'executor',
      executor: 'participantManagementProcessor', // ⚠️ 部分重构
      dependsOn: ['incremental-calendar-creation'],
      config: {
        xnxq: '${inputs.xnxq}',
        batchSize: '${inputs.batchSize}',
        maxConcurrency: '${inputs.maxConcurrency}',
        timeout: 20000
      },
      timeout: '${inputs.timeout}',
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        delay: '20s'
      },
      onFailure: 'continue'
    },
    {
      id: 'incremental-schedule-creation',
      name: '增量日程创建',
      type: 'executor',
      executor: 'scheduleCreationProcessor', // ❌ 待重构
      dependsOn: ['incremental-participant-management'],
      config: {
        xnxq: '${inputs.xnxq}',
        batchSize: '${inputs.batchSize}',
        maxConcurrency: '${inputs.maxConcurrency}',
        createAttendanceRecords: false, // 增量同步通常不创建打卡记录
        timeout: 30000
      },
      timeout: '${inputs.timeout}',
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        delay: '30s'
      },
      onFailure: 'continue'
    },
    {
      id: 'incremental-status-update',
      name: '增量状态更新',
      type: 'executor',
      executor: 'statusUpdateProcessor', // ❌ 待重构
      dependsOn: ['incremental-schedule-creation'],
      config: {
        xnxq: '${inputs.xnxq}',
        markAsCompleted: true,
        updateTimestamp: true
      },
      timeout: '5m',
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        delay: '5s'
      },
      onFailure: 'continue'
    },
    {
      id: 'incremental-completion',
      name: '增量同步完成',
      type: 'executor',
      executor: 'syncCompletionProcessor', // ❌ 待重构
      dependsOn: ['incremental-status-update'],
      config: {
        xnxq: '${inputs.xnxq}',
        generateReport: '${inputs.generateChangeReport}',
        sendNotification: '${inputs.sendNotification}',
        cleanupTempData: false, // 增量同步不清理临时数据
        updateLastSyncTime: true,
        incrementalMode: true
      },
      timeout: '10m',
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        delay: '15s'
      },
      onFailure: 'continue'
    }
  ],

  // 工作流级别的错误处理
  onFailure: {
    cleanup: false, // 增量同步失败不清理数据
    notification: true,
    rollback: false
  },

  // 工作流级别的超时设置
  timeout: '1h', // 增量同步最多1小时

  // 并发控制
  concurrency: {
    maxParallel: 2, // 增量同步允许部分并行
    resourceLimits: {
      memory: '1GB',
      cpu: '1'
    }
  },

  // 监控和告警
  monitoring: {
    metrics: ['duration', 'success_rate', 'change_count'],
    alerts: [
      {
        condition: 'duration > 3600000', // 超过1小时
        severity: 'warning',
        message: '增量同步执行时间过长'
      },
      {
        condition: 'change_count > 1000',
        severity: 'info',
        message: '检测到大量变更，建议考虑全量同步'
      }
    ]
  }
};
