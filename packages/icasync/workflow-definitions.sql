-- @stratix/icasync 工作流定义 SQL 插入语句
-- 执行以下 SQL 语句将工作流定义写入数据库

-- 工作流 1: 全量同步工作流
INSERT INTO workflow_definitions (
  name, 
  description, 
  version, 
  definition, 
  config, 
  status, 
  is_active, 
  tags, 
  category, 
  created_by, 
  updated_by,
  created_at,
  updated_at
) VALUES (
  'icasync-full-sync',
  '课表全量同步工作流 - 完整的学期课表同步流程',
  '1.0.0',
  '{"name":"icasync-full-sync","description":"课表全量同步工作流 - 完整的学期课表同步流程","version":"1.0.0","category":"icasync","tags":["sync","full","course","calendar"],"inputs":[{"name":"xnxq","type":"string","required":true,"description":"学年学期，如：2024-2025-2"},{"name":"batchSize","type":"number","required":false,"default":100,"description":"批处理大小"},{"name":"maxConcurrency","type":"number","required":false,"default":10,"description":"最大并发数"}],"outputs":[{"name":"syncResult","type":"object","description":"同步结果统计","source":"{{ nodes.sync-completion.output.result }}"}],"nodes":[{"type":"task","id":"data-aggregation","name":"数据聚合","description":"读取u_jw_kcb_cur表未处理任务，聚合并写入juhe_renwu表","executor":"dataAggregationProcessor","config":{"xnxq":"{{ inputs.xnxq }}","batchSize":"{{ inputs.batchSize }}","useNativeSQL":true,"clearExisting":true},"timeout":"10m","retry":{"maxAttempts":3,"backoff":"exponential","delay":"30s"}},{"type":"parallel","id":"calendar-creation-parallel","name":"并行创建日历","description":"根据kkh批量创建课程日历","dependsOn":["data-aggregation"],"branches":[{"id":"calendar-creation-branch","name":"日历创建分支","nodes":[{"type":"task","id":"calendar-creation","name":"创建日历","description":"批量创建课程日历，写入icasync_calendar_mapping表","executor":"calendarCreationProcessor","config":{"xnxq":"{{ inputs.xnxq }}","batchSize":"{{ inputs.batchSize }}","maxConcurrency":"{{ inputs.maxConcurrency }}"},"timeout":"20m","retry":{"maxAttempts":3,"backoff":"exponential","delay":"1m"}}]}],"joinType":"all","maxConcurrency":5},{"type":"parallel","id":"participant-management-parallel","name":"并行参与者管理","description":"批量添加日历参与者","dependsOn":["calendar-creation-parallel"],"branches":[{"id":"participant-addition-branch","name":"参与者添加分支","nodes":[{"type":"task","id":"participant-addition","name":"添加参与者","description":"调用wasV7ApiCalendar的batchCreateCalendarPermissionsLimit添加参与者","executor":"participantManagementProcessor","config":{"xnxq":"{{ inputs.xnxq }}","batchSize":"{{ inputs.batchSize }}","maxConcurrency":"{{ inputs.maxConcurrency }}"},"timeout":"15m","retry":{"maxAttempts":2,"backoff":"exponential","delay":"30s"}}]}],"joinType":"all","maxConcurrency":10},{"type":"parallel","id":"schedule-creation-parallel","name":"并行日程创建","description":"批量创建课程日程","dependsOn":["participant-management-parallel"],"branches":[{"id":"schedule-creation-branch","name":"日程创建分支","nodes":[{"type":"task","id":"schedule-creation","name":"创建日程","description":"调用wasV7ApiCalendar的batchCreateSchedules批量创建日程","executor":"scheduleCreationProcessor","config":{"xnxq":"{{ inputs.xnxq }}","batchSize":"{{ inputs.batchSize }}","maxConcurrency":"{{ inputs.maxConcurrency }}","createAttendanceRecords":true},"timeout":"30m","retry":{"maxAttempts":3,"backoff":"exponential","delay":"1m"}}]}],"joinType":"all","maxConcurrency":8},{"type":"task","id":"status-update","name":"状态更新","description":"更新juhe_renwu表和u_jw_kcb_cur表的状态","executor":"statusUpdateProcessor","dependsOn":["schedule-creation-parallel"],"config":{"xnxq":"{{ inputs.xnxq }}","markAsCompleted":true,"updateTimestamp":true},"timeout":"5m","retry":{"maxAttempts":2,"backoff":"linear","delay":"30s"}},{"type":"task","id":"sync-completion","name":"同步完成","description":"生成同步报告并发送通知","executor":"syncCompletionProcessor","dependsOn":["status-update"],"config":{"xnxq":"{{ inputs.xnxq }}","generateReport":true,"sendNotification":true,"cleanupTempData":true},"timeout":"3m","retry":{"maxAttempts":1,"backoff":"fixed","delay":"10s"}}],"config":{"timeout":"60m","retryPolicy":{"maxAttempts":2,"backoff":"exponential","delay":"1m"},"errorHandling":"fail-fast","concurrency":10,"priority":1,"persistIntermediateResults":true}}',
  '{"timeout":"60m","retryPolicy":{"maxAttempts":2,"backoff":"exponential","delay":"1m"},"errorHandling":"fail-fast","concurrency":10,"priority":1,"persistIntermediateResults":true}',
  'active',
  true,
  '["sync","full","course","calendar"]',
  'icasync',
  'icasync-system',
  'icasync-system',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  definition = VALUES(definition),
  config = VALUES(config),
  status = VALUES(status),
  is_active = VALUES(is_active),
  tags = VALUES(tags),
  category = VALUES(category),
  updated_by = VALUES(updated_by),
  updated_at = NOW();

-- 工作流 2: 增量同步工作流
INSERT INTO workflow_definitions (
  name, 
  description, 
  version, 
  definition, 
  config, 
  status, 
  is_active, 
  tags, 
  category, 
  created_by, 
  updated_by,
  created_at,
  updated_at
) VALUES (
  'icasync-incremental-sync',
  '检测变更并增量同步到WPS日历',
  '1.0.0',
  '{"name":"icasync-incremental-sync","description":"检测变更并增量同步到WPS日历","version":"1.0.0","category":"icasync","tags":["sync","incremental","course","calendar"],"inputs":[{"name":"xnxq","type":"string","required":true,"description":"学年学期，如：2024-2025-2"},{"name":"batchSize","type":"number","required":false,"default":50,"description":"批处理大小"}],"outputs":[{"name":"incrementalResult","type":"object","description":"增量同步结果统计","source":"{{ nodes.incremental-completion.output.result }}"}],"nodes":[{"type":"task","id":"change-detection","name":"变更检测","description":"检测课程数据变更","executor":"changeDetectionProcessor","config":{"xnxq":"{{ inputs.xnxq }}","detectChanges":true,"compareWithExisting":true,"generateChangeReport":true},"timeout":"5m","retry":{"maxAttempts":2,"backoff":"linear","delay":"30s"}},{"type":"task","id":"incremental-aggregation","name":"增量聚合","description":"增量聚合变更的数据","executor":"dataAggregationProcessor","dependsOn":["change-detection"],"config":{"xnxq":"{{ inputs.xnxq }}","incrementalMode":true,"batchSize":"{{ inputs.batchSize }}","useNativeSQL":true},"timeout":"8m","retry":{"maxAttempts":3,"backoff":"exponential","delay":"1m"}},{"type":"task","id":"incremental-completion","name":"增量同步完成","description":"生成增量同步报告","executor":"syncCompletionProcessor","dependsOn":["incremental-aggregation"],"config":{"xnxq":"{{ inputs.xnxq }}","incrementalMode":true,"generateChangeReport":true,"sendNotification":true,"updateLastSyncTime":true},"timeout":"2m","retry":{"maxAttempts":1,"backoff":"fixed","delay":"10s"}}],"config":{"timeout":"30m","retryPolicy":{"maxAttempts":2,"backoff":"exponential","delay":"30s"},"errorHandling":"continue","concurrency":5,"priority":2,"persistIntermediateResults":true}}',
  '{"timeout":"30m","retryPolicy":{"maxAttempts":2,"backoff":"exponential","delay":"30s"},"errorHandling":"continue","concurrency":5,"priority":2,"persistIntermediateResults":true}',
  'active',
  true,
  '["sync","incremental","course","calendar"]',
  'icasync',
  'icasync-system',
  'icasync-system',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  definition = VALUES(definition),
  config = VALUES(config),
  status = VALUES(status),
  is_active = VALUES(is_active),
  tags = VALUES(tags),
  category = VALUES(category),
  updated_by = VALUES(updated_by),
  updated_at = NOW();
