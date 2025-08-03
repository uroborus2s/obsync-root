-- @stratix/icasync 工作流持久化 SQL
-- 将工作流定义插入到 @stratix/tasks 数据库中
-- 执行前请确保 @stratix/tasks 数据库表结构已创建

-- =====================================================
-- 1. 全量同步工作流定义
-- =====================================================

INSERT INTO workflow_definitions (
  name,
  version,
  description,
  definition,
  status,
  created_at,
  updated_at,
  created_by,
  tags,
  category
) VALUES (
  'icasync-full-sync',
  '2.0.0',
  '课表全量同步工作流 - 基于Service层架构的完整学期课表同步流程',
  JSON_OBJECT(
    'name', 'icasync-full-sync',
    'version', '2.0.0',
    'description', '课表全量同步工作流 - 基于Service层架构的完整学期课表同步流程',
    'inputs', JSON_ARRAY(
      JSON_OBJECT(
        'name', 'xnxq',
        'type', 'string',
        'required', true,
        'description', '学年学期，格式：YYYY-YYYY-N（如：2024-2025-1）',
        'validation', JSON_OBJECT(
          'pattern', '^\\d{4}-\\d{4}-[12]$',
          'message', '学年学期格式不正确，应为：YYYY-YYYY-N'
        )
      ),
      JSON_OBJECT(
        'name', 'batchSize',
        'type', 'number',
        'required', false,
        'default', 100,
        'description', '批处理大小，控制每批处理的记录数',
        'validation', JSON_OBJECT(
          'min', 10,
          'max', 1000,
          'message', '批处理大小必须在10-1000之间'
        )
      ),
      JSON_OBJECT(
        'name', 'maxConcurrency',
        'type', 'number',
        'required', false,
        'default', 10,
        'description', '最大并发数，控制并行执行的任务数',
        'validation', JSON_OBJECT(
          'min', 1,
          'max', 50,
          'message', '最大并发数必须在1-50之间'
        )
      ),
      JSON_OBJECT(
        'name', 'timeout',
        'type', 'string',
        'required', false,
        'default', '45m',
        'description', '任务超时时间，增加到45分钟以适应大数据量'
      ),
      JSON_OBJECT(
        'name', 'clearExisting',
        'type', 'boolean',
        'required', false,
        'default', true,
        'description', '是否清理现有数据后重新同步（全量同步推荐开启）'
      ),
      JSON_OBJECT(
        'name', 'createAttendanceRecords',
        'type', 'boolean',
        'required', false,
        'default', false,
        'description', '是否创建打卡记录（实验课、实习课等）'
      ),
      JSON_OBJECT(
        'name', 'sendNotification',
        'type', 'boolean',
        'required', false,
        'default', true,
        'description', '是否发送完成通知'
      )
    ),
    'outputs', JSON_ARRAY(
      JSON_OBJECT('name', 'syncSummary', 'type', 'object', 'description', '同步结果摘要，包含各阶段的详细统计'),
      JSON_OBJECT('name', 'processedCount', 'type', 'number', 'description', '处理的记录总数'),
      JSON_OBJECT('name', 'createdCalendars', 'type', 'number', 'description', '创建的日历数量'),
      JSON_OBJECT('name', 'addedParticipants', 'type', 'number', 'description', '添加的参与者数量'),
      JSON_OBJECT('name', 'createdSchedules', 'type', 'number', 'description', '创建的日程数量'),
      JSON_OBJECT('name', 'errorCount', 'type', 'number', 'description', '错误记录数'),
      JSON_OBJECT('name', 'duration', 'type', 'number', 'description', '总执行时长（毫秒）'),
      JSON_OBJECT('name', 'reportUrl', 'type', 'string', 'description', '同步报告URL（如果生成）')
    ),
    'nodes', JSON_ARRAY(
      JSON_OBJECT(
        'id', 'data-aggregation',
        'name', '数据聚合',
        'type', 'executor',
        'executor', 'dataAggregationProcessor',
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'batchSize', '${inputs.batchSize}',
          'clearExisting', '${inputs.clearExisting}',
          'useNativeSQL', true,
          'incrementalMode', false
        ),
        'timeout', '${inputs.timeout}',
        'retry', JSON_OBJECT(
          'maxAttempts', 3,
          'backoff', 'exponential',
          'delay', '30s'
        ),
        'onFailure', 'fail-workflow'
      ),
      JSON_OBJECT(
        'id', 'calendar-creation',
        'name', '日历创建',
        'type', 'executor',
        'executor', 'calendarCreationProcessor',
        'dependsOn', JSON_ARRAY('data-aggregation'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'batchSize', '${inputs.batchSize}',
          'maxConcurrency', '${inputs.maxConcurrency}',
          'timeout', 30000,
          'retryCount', 3
        ),
        'timeout', '${inputs.timeout}',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'linear',
          'delay', '1m'
        ),
        'onFailure', 'continue'
      ),
      JSON_OBJECT(
        'id', 'participant-management',
        'name', '参与者管理',
        'type', 'executor',
        'executor', 'participantManagementProcessor',
        'dependsOn', JSON_ARRAY('calendar-creation'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'batchSize', 100,
          'maxConcurrency', '${inputs.maxConcurrency}',
          'timeout', 30000
        ),
        'timeout', '${inputs.timeout}',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'linear',
          'delay', '30s'
        ),
        'onFailure', 'continue'
      ),
      JSON_OBJECT(
        'id', 'schedule-creation',
        'name', '日程创建',
        'type', 'executor',
        'executor', 'scheduleCreationProcessor',
        'dependsOn', JSON_ARRAY('participant-management'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'batchSize', 200,
          'maxConcurrency', 8,
          'createAttendanceRecords', '${inputs.createAttendanceRecords}',
          'timeout', 45000
        ),
        'timeout', '${inputs.timeout}',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'exponential',
          'delay', '1m'
        ),
        'onFailure', 'continue'
      ),
      JSON_OBJECT(
        'id', 'status-update',
        'name', '状态更新',
        'type', 'executor',
        'executor', 'statusUpdateProcessor',
        'dependsOn', JSON_ARRAY('schedule-creation'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'markAsCompleted', true,
          'updateTimestamp', true
        ),
        'timeout', '10m',
        'retry', JSON_OBJECT(
          'maxAttempts', 3,
          'backoff', 'linear',
          'delay', '10s'
        ),
        'onFailure', 'continue'
      ),
      JSON_OBJECT(
        'id', 'sync-completion',
        'name', '同步完成',
        'type', 'executor',
        'executor', 'syncCompletionProcessor',
        'dependsOn', JSON_ARRAY('status-update'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'generateReport', true,
          'sendNotification', '${inputs.sendNotification}',
          'cleanupTempData', true,
          'updateLastSyncTime', true
        ),
        'timeout', '15m',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'linear',
          'delay', '30s'
        ),
        'onFailure', 'continue'
      )
    ),
    'onFailure', JSON_OBJECT(
      'cleanup', true,
      'notification', true,
      'rollback', false
    ),
    'timeout', '2h',
    'concurrency', JSON_OBJECT(
      'maxParallel', 1,
      'resourceLimits', JSON_OBJECT(
        'memory', '2GB',
        'cpu', '2'
      )
    ),
    'monitoring', JSON_OBJECT(
      'metrics', JSON_ARRAY('duration', 'success_rate', 'error_count'),
      'alerts', JSON_ARRAY(
        JSON_OBJECT(
          'condition', 'duration > 7200000',
          'severity', 'warning',
          'message', '全量同步执行时间过长'
        ),
        JSON_OBJECT(
          'condition', 'error_count > 100',
          'severity', 'error',
          'message', '同步过程中错误过多'
        )
      )
    )
  ),
  'active',
  NOW(),
  NOW(),
  'icasync-system',
  JSON_ARRAY('icasync', 'course-sync', 'full-sync', 'calendar', 'schedule'),
  'course-management'
) ON DUPLICATE KEY UPDATE
  definition = VALUES(definition),
  updated_at = NOW(),
  status = 'active';

-- =====================================================
-- 2. 增量同步工作流定义
-- =====================================================

INSERT INTO workflow_definitions (
  id,
  name,
  version,
  description,
  definition,
  status,
  created_at,
  updated_at,
  created_by,
  tags,
  category
) VALUES (
  'icasync-incremental-sync-v2',
  'icasync-incremental-sync',
  '2.0.0',
  '课表增量同步工作流 - 基于变更检测的高效同步流程',
  JSON_OBJECT(
    'name', 'icasync-incremental-sync',
    'version', '2.0.0',
    'description', '课表增量同步工作流 - 基于变更检测的高效同步流程',
    'inputs', JSON_ARRAY(
      JSON_OBJECT(
        'name', 'xnxq',
        'type', 'string',
        'required', true,
        'description', '学年学期，格式：YYYY-YYYY-N（如：2024-2025-1）',
        'validation', JSON_OBJECT(
          'pattern', '^\\d{4}-\\d{4}-[12]$',
          'message', '学年学期格式不正确，应为：YYYY-YYYY-N'
        )
      ),
      JSON_OBJECT(
        'name', 'timeWindow',
        'type', 'number',
        'required', false,
        'default', 24,
        'description', '变更检测时间窗口（小时），检测最近N小时内的变更',
        'validation', JSON_OBJECT(
          'min', 1,
          'max', 168,
          'message', '时间窗口必须在1-168小时之间'
        )
      ),
      JSON_OBJECT(
        'name', 'batchSize',
        'type', 'number',
        'required', false,
        'default', 50,
        'description', '批处理大小，增量同步使用较小的批次',
        'validation', JSON_OBJECT(
          'min', 10,
          'max', 500,
          'message', '批处理大小必须在10-500之间'
        )
      ),
      JSON_OBJECT(
        'name', 'maxConcurrency',
        'type', 'number',
        'required', false,
        'default', 5,
        'description', '最大并发数，增量同步使用较低的并发',
        'validation', JSON_OBJECT(
          'min', 1,
          'max', 20,
          'message', '最大并发数必须在1-20之间'
        )
      ),
      JSON_OBJECT(
        'name', 'timeout',
        'type', 'string',
        'required', false,
        'default', '20m',
        'description', '任务超时时间，增量同步通常较快'
      ),
      JSON_OBJECT(
        'name', 'generateChangeReport',
        'type', 'boolean',
        'required', false,
        'default', true,
        'description', '是否生成变更报告'
      ),
      JSON_OBJECT(
        'name', 'sendNotification',
        'type', 'boolean',
        'required', false,
        'default', false,
        'description', '是否发送完成通知（增量同步默认不发送）'
      )
    ),
    'outputs', JSON_ARRAY(
      JSON_OBJECT('name', 'changesSummary', 'type', 'object', 'description', '变更检测摘要'),
      JSON_OBJECT('name', 'totalChanges', 'type', 'number', 'description', '检测到的总变更数'),
      JSON_OBJECT('name', 'processedChanges', 'type', 'number', 'description', '处理的变更数'),
      JSON_OBJECT('name', 'syncSummary', 'type', 'object', 'description', '同步结果摘要'),
      JSON_OBJECT('name', 'duration', 'type', 'number', 'description', '总执行时长（毫秒）'),
      JSON_OBJECT('name', 'changeReportUrl', 'type', 'string', 'description', '变更报告URL（如果生成）')
    ),
    'nodes', JSON_ARRAY(
      JSON_OBJECT(
        'id', 'change-detection',
        'name', '变更检测',
        'type', 'executor',
        'executor', 'changeDetectionProcessor',
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'detectChanges', true,
          'compareWithExisting', true,
          'generateChangeReport', '${inputs.generateChangeReport}',
          'timeWindow', '${inputs.timeWindow}'
        ),
        'timeout', '${inputs.timeout}',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'linear',
          'delay', '10s'
        ),
        'onFailure', 'fail-workflow'
      ),
      JSON_OBJECT(
        'id', 'incremental-aggregation',
        'name', '增量数据聚合',
        'type', 'executor',
        'executor', 'dataAggregationProcessor',
        'dependsOn', JSON_ARRAY('change-detection'),
        'condition', '${nodes.change-detection.outputs.totalChanges} > 0',
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'batchSize', '${inputs.batchSize}',
          'clearExisting', false,
          'useNativeSQL', true,
          'incrementalMode', true
        ),
        'timeout', '${inputs.timeout}',
        'retry', JSON_OBJECT(
          'maxAttempts', 3,
          'backoff', 'exponential',
          'delay', '15s'
        ),
        'onFailure', 'fail-workflow'
      ),
      JSON_OBJECT(
        'id', 'incremental-calendar-creation',
        'name', '增量日历创建',
        'type', 'executor',
        'executor', 'calendarCreationProcessor',
        'dependsOn', JSON_ARRAY('incremental-aggregation'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'batchSize', '${inputs.batchSize}',
          'maxConcurrency', '${inputs.maxConcurrency}',
          'timeout', 20000,
          'retryCount', 2
        ),
        'timeout', '${inputs.timeout}',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'linear',
          'delay', '30s'
        ),
        'onFailure', 'continue'
      ),
      JSON_OBJECT(
        'id', 'incremental-participant-management',
        'name', '增量参与者管理',
        'type', 'executor',
        'executor', 'participantManagementProcessor',
        'dependsOn', JSON_ARRAY('incremental-calendar-creation'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'batchSize', '${inputs.batchSize}',
          'maxConcurrency', '${inputs.maxConcurrency}',
          'timeout', 20000
        ),
        'timeout', '${inputs.timeout}',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'linear',
          'delay', '20s'
        ),
        'onFailure', 'continue'
      ),
      JSON_OBJECT(
        'id', 'incremental-schedule-creation',
        'name', '增量日程创建',
        'type', 'executor',
        'executor', 'scheduleCreationProcessor',
        'dependsOn', JSON_ARRAY('incremental-participant-management'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'batchSize', '${inputs.batchSize}',
          'maxConcurrency', '${inputs.maxConcurrency}',
          'createAttendanceRecords', false,
          'timeout', 30000
        ),
        'timeout', '${inputs.timeout}',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'linear',
          'delay', '30s'
        ),
        'onFailure', 'continue'
      ),
      JSON_OBJECT(
        'id', 'incremental-status-update',
        'name', '增量状态更新',
        'type', 'executor',
        'executor', 'statusUpdateProcessor',
        'dependsOn', JSON_ARRAY('incremental-schedule-creation'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'markAsCompleted', true,
          'updateTimestamp', true
        ),
        'timeout', '5m',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'linear',
          'delay', '5s'
        ),
        'onFailure', 'continue'
      ),
      JSON_OBJECT(
        'id', 'incremental-completion',
        'name', '增量同步完成',
        'type', 'executor',
        'executor', 'syncCompletionProcessor',
        'dependsOn', JSON_ARRAY('incremental-status-update'),
        'config', JSON_OBJECT(
          'xnxq', '${inputs.xnxq}',
          'generateReport', '${inputs.generateChangeReport}',
          'sendNotification', '${inputs.sendNotification}',
          'cleanupTempData', false,
          'updateLastSyncTime', true,
          'incrementalMode', true
        ),
        'timeout', '10m',
        'retry', JSON_OBJECT(
          'maxAttempts', 2,
          'backoff', 'linear',
          'delay', '15s'
        ),
        'onFailure', 'continue'
      )
    ),
    'onFailure', JSON_OBJECT(
      'cleanup', false,
      'notification', true,
      'rollback', false
    ),
    'timeout', '1h',
    'concurrency', JSON_OBJECT(
      'maxParallel', 2,
      'resourceLimits', JSON_OBJECT(
        'memory', '1GB',
        'cpu', '1'
      )
    ),
    'monitoring', JSON_OBJECT(
      'metrics', JSON_ARRAY('duration', 'success_rate', 'change_count'),
      'alerts', JSON_ARRAY(
        JSON_OBJECT(
          'condition', 'duration > 3600000',
          'severity', 'warning',
          'message', '增量同步执行时间过长'
        ),
        JSON_OBJECT(
          'condition', 'change_count > 1000',
          'severity', 'info',
          'message', '检测到大量变更，建议考虑全量同步'
        )
      )
    )
  ),
  'active',
  NOW(),
  NOW(),
  'icasync-system',
  JSON_ARRAY('icasync', 'course-sync', 'incremental-sync', 'change-detection'),
  'course-management'
) ON DUPLICATE KEY UPDATE
  definition = VALUES(definition),
  updated_at = NOW(),
  status = 'active';

-- =====================================================
-- 3. 执行器注册
-- =====================================================

-- 注册已重构完成的执行器
INSERT INTO task_executors (
  id,
  name,
  version,
  description,
  status,
  config_schema,
  created_at,
  updated_at,
  tags,
  category
) VALUES
(
  'dataAggregationProcessor',
  'dataAggregationProcessor',
  '2.0.0',
  '数据聚合处理器 - 基于Service层架构聚合课程数据',
  'active',
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'xnxq', JSON_OBJECT('type', 'string', 'required', true, 'description', '学年学期'),
      'batchSize', JSON_OBJECT('type', 'number', 'default', 1000, 'min', 10, 'max', 10000),
      'clearExisting', JSON_OBJECT('type', 'boolean', 'default', false),
      'useNativeSQL', JSON_OBJECT('type', 'boolean', 'default', true),
      'incrementalMode', JSON_OBJECT('type', 'boolean', 'default', false)
    )
  ),
  NOW(),
  NOW(),
  JSON_ARRAY('icasync', 'data', 'aggregation', 'refactored'),
  'icasync'
),
(
  'calendarCreationProcessor',
  'calendarCreationProcessor',
  '2.0.0',
  '日历创建处理器 - 基于Service层架构批量创建课程日历',
  'active',
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'xnxq', JSON_OBJECT('type', 'string', 'required', true, 'description', '学年学期'),
      'batchSize', JSON_OBJECT('type', 'number', 'default', 50, 'min', 10, 'max', 1000),
      'maxConcurrency', JSON_OBJECT('type', 'number', 'default', 10, 'min', 1, 'max', 50),
      'timeout', JSON_OBJECT('type', 'number', 'default', 30000, 'min', 1000),
      'retryCount', JSON_OBJECT('type', 'number', 'default', 3, 'min', 0, 'max', 10)
    )
  ),
  NOW(),
  NOW(),
  JSON_ARRAY('icasync', 'calendar', 'creation', 'refactored'),
  'icasync'
),
(
  'participantManagementProcessor',
  'participantManagementProcessor',
  '1.5.0',
  '参与者管理处理器 - 部分重构，基于Service层架构添加日历参与者',
  'active',
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'xnxq', JSON_OBJECT('type', 'string', 'required', true, 'description', '学年学期'),
      'batchSize', JSON_OBJECT('type', 'number', 'default', 100, 'min', 10, 'max', 500),
      'maxConcurrency', JSON_OBJECT('type', 'number', 'default', 10, 'min', 1, 'max', 20),
      'timeout', JSON_OBJECT('type', 'number', 'default', 30000, 'min', 1000)
    )
  ),
  NOW(),
  NOW(),
  JSON_ARRAY('icasync', 'participant', 'management', 'partial-refactored'),
  'icasync'
);

-- 注册待重构的执行器（标记为需要更新）
INSERT INTO task_executors (
  id,
  name,
  version,
  description,
  status,
  config_schema,
  created_at,
  updated_at,
  tags,
  category
) VALUES
(
  'scheduleCreationProcessor',
  'scheduleCreationProcessor',
  '1.0.0',
  '日程创建处理器 - 待重构，当前仍使用DatabaseAPI',
  'deprecated', -- 标记为待重构
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'xnxq', JSON_OBJECT('type', 'string', 'required', true, 'description', '学年学期'),
      'batchSize', JSON_OBJECT('type', 'number', 'default', 200, 'min', 10, 'max', 1000),
      'maxConcurrency', JSON_OBJECT('type', 'number', 'default', 8, 'min', 1, 'max', 15),
      'createAttendanceRecords', JSON_OBJECT('type', 'boolean', 'default', false),
      'timeout', JSON_OBJECT('type', 'number', 'default', 45000, 'min', 1000)
    )
  ),
  NOW(),
  NOW(),
  JSON_ARRAY('icasync', 'schedule', 'creation', 'needs-refactoring'),
  'icasync'
),
(
  'statusUpdateProcessor',
  'statusUpdateProcessor',
  '1.0.0',
  '状态更新处理器 - 待重构，当前仍使用DatabaseAPI',
  'deprecated',
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'xnxq', JSON_OBJECT('type', 'string', 'required', true, 'description', '学年学期'),
      'markAsCompleted', JSON_OBJECT('type', 'boolean', 'default', true),
      'updateTimestamp', JSON_OBJECT('type', 'boolean', 'default', true)
    )
  ),
  NOW(),
  NOW(),
  JSON_ARRAY('icasync', 'status', 'update', 'needs-refactoring'),
  'icasync'
),
(
  'syncCompletionProcessor',
  'syncCompletionProcessor',
  '1.0.0',
  '同步完成处理器 - 待重构，当前仍使用DatabaseAPI',
  'deprecated',
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'xnxq', JSON_OBJECT('type', 'string', 'required', true, 'description', '学年学期'),
      'generateReport', JSON_OBJECT('type', 'boolean', 'default', true),
      'sendNotification', JSON_OBJECT('type', 'boolean', 'default', true),
      'cleanupTempData', JSON_OBJECT('type', 'boolean', 'default', true),
      'updateLastSyncTime', JSON_OBJECT('type', 'boolean', 'default', true),
      'incrementalMode', JSON_OBJECT('type', 'boolean', 'default', false)
    )
  ),
  NOW(),
  NOW(),
  JSON_ARRAY('icasync', 'sync', 'completion', 'needs-refactoring'),
  'icasync'
),
(
  'changeDetectionProcessor',
  'changeDetectionProcessor',
  '1.0.0',
  '变更检测处理器 - 待重构，当前仍使用DatabaseAPI',
  'deprecated',
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'xnxq', JSON_OBJECT('type', 'string', 'required', true, 'description', '学年学期'),
      'detectChanges', JSON_OBJECT('type', 'boolean', 'default', true),
      'compareWithExisting', JSON_OBJECT('type', 'boolean', 'default', true),
      'generateChangeReport', JSON_OBJECT('type', 'boolean', 'default', true),
      'timeWindow', JSON_OBJECT('type', 'number', 'default', 24, 'min', 1, 'max', 168)
    )
  ),
  NOW(),
  NOW(),
  JSON_ARRAY('icasync', 'change', 'detection', 'needs-refactoring'),
  'icasync'
)
ON DUPLICATE KEY UPDATE
  version = VALUES(version),
  description = VALUES(description),
  status = VALUES(status),
  config_schema = VALUES(config_schema),
  updated_at = NOW(),
  tags = VALUES(tags);
