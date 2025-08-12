-- ============================================================================
-- 全量同步工作流 v3.0.0 部署脚本
-- 基于分布式工作流引擎架构，支持分布式执行、断点续传、故障转移
-- ============================================================================

-- 开始事务
START TRANSACTION;

-- 设置变量
SET @workflow_name = 'full-sync-multi-loop-workflow' COLLATE utf8mb4_unicode_ci;
SET @workflow_version = '3.0.0' COLLATE utf8mb4_unicode_ci;
SET @workflow_category = 'icasync' COLLATE utf8mb4_unicode_ci;
SET @workflow_display_name = '全量同步工作流（分布式版）';

-- 删除旧版本（如果存在）
DELETE FROM workflow_definitions 
WHERE name = @workflow_name AND version = @workflow_version;

-- 插入新的工作流定义
INSERT INTO workflow_definitions (
    name,
    version,
    display_name,
    description,
    definition,
    category,
    tags,
    status,
    is_active,
    timeout_seconds,
    max_retries,
    retry_delay_seconds,
    created_by
) VALUES (
    @workflow_name,
    @workflow_version,
    @workflow_display_name,
    '基于分布式架构的全量同步工作流，支持日历、参与者、日程的独立并行处理，具备断点续传和故障转移能力',
    '{
        "id": "full-sync-multi-loop-workflow",
        "name": "全量同步工作流（分布式版）",
        "description": "基于分布式架构的全量同步工作流，支持日历、参与者、日程的独立并行处理",
        "version": "3.0.0",
        "metadata": {
            "author": "system",
            "category": "icasync",
            "tags": ["sync", "calendar", "distributed", "parallel"]
        },
        "config": {
            "timeout": 7200000,
            "retries": 3,
            "retryDelay": 60000,
            "distributed": {
                "enabled": true,
                "assignmentStrategy": "load-balanced",
                "maxConcurrency": 20,
                "failoverStrategy": "automatic",
                "lockTimeout": 300000
            },
            "monitoring": {
                "enabled": true,
                "metricsInterval": 30000,
                "logLevel": "info",
                "customMetrics": {
                    "processedCalendars": "nodes.*.output.processedCount",
                    "errorRate": "nodes.*.output.errorCount,nodes.*.output.totalCount"
                }
            },
            "recovery": {
                "enabled": true,
                "checkpointInterval": 60000,
                "maxRecoveryAttempts": 3,
                "recoveryStrategy": "from-last-checkpoint"
            }
        },
        "inputs": [
            {
                "name": "xnxq",
                "type": "string",
                "required": true,
                "description": "学年学期标识",
                "pattern": "^[0-9]{4}-[0-9]{4}-[12]$"
            },
            {
                "name": "forceSync",
                "type": "boolean",
                "default": false,
                "description": "是否强制同步"
            },
            {
                "name": "batchSize",
                "type": "number",
                "default": 1000,
                "description": "批处理大小"
            }
        ],
        "outputs": [
            {
                "name": "syncReport",
                "type": "object",
                "description": "同步结果报告"
            },
            {
                "name": "processedCalendars",
                "type": "number",
                "description": "处理的日历数量"
            },
            {
                "name": "totalErrors",
                "type": "number",
                "description": "错误总数"
            }
        ],
        "nodes": [
            {
                "id": "data-aggregation",
                "name": "数据聚合准备",
                "type": "task",
                "executor": "dataAggregationProcessor",
                "config": {
                    "xnxq": "${xnxq}",
                    "forceSync": "${forceSync}",
                    "syncType": "full",
                    "batchSize": "${batchSize}"
                },
                "distributed": {
                    "assignmentStrategy": "capability",
                    "requiredCapabilities": ["dataAggregationProcessor"]
                },
                "errorHandling": {
                    "strategy": "retry",
                    "maxRetries": 3,
                    "retryDelay": 5000,
                    "onFailure": "stop"
                },
                "monitoring": {
                    "trackDuration": true,
                    "trackMemoryUsage": true
                }
            },
            {
                "id": "fetch-old-calendars",
                "name": "查询待删除的旧日历",
                "type": "task",
                "executor": "fetchOldCalendarMappings",
                "dependsOn": ["data-aggregation"],
                "config": {
                    "xnxq": "${xnxq}",
                    "includeInactive": true,
                    "orderBy": "created_at DESC",
                    "limit": 10000
                },
                "distributed": {
                    "assignmentStrategy": "locality",
                    "requiredCapabilities": ["fetchOldCalendarMappings"]
                },
                "errorHandling": {
                    "strategy": "retry",
                    "maxRetries": 2,
                    "retryDelay": 3000,
                    "onFailure": "continue"
                }
            },
            {
                "id": "parallel-delete-old-calendars",
                "name": "动态并行删除旧日历",
                "type": "loop",
                "loopType": "dynamic",
                "dependsOn": ["fetch-old-calendars"],
                "sourceExpression": "nodes.fetch-old-calendars.output.calendarsToDelete",
                "maxConcurrency": 8,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "childTaskDistribution": "round-robin",
                    "maxEnginesPerLoop": 5
                },
                "nodes": [
                    {
                        "id": "delete-single-calendar",
                        "name": "删除单个日历",
                        "type": "task",
                        "executor": "deleteSingleCalendar",
                        "config": {
                            "calendarId": "${$item.calendarId}",
                            "kkh": "${$item.kkh}",
                            "xnxq": "${xnxq}",
                            "deleteMode": "complete",
                            "cleanupMapping": true
                        },
                        "distributed": {
                            "assignmentStrategy": "capability",
                            "requiredCapabilities": ["deleteSingleCalendar"]
                        },
                        "errorHandling": {
                            "strategy": "retry",
                            "maxRetries": 2,
                            "retryDelay": 2000,
                            "onFailure": "continue"
                        }
                    }
                ]
            },
            {
                "id": "fetch-sync-sources",
                "name": "获取同步日历数据",
                "type": "task",
                "executor": "fetchSyncSources",
                "dependsOn": ["parallel-delete-old-calendars"],
                "config": {
                    "xnxq": "${xnxq}",
                    "includeCalendars": true,
                    "includeUsers": true,
                    "includeSchedules": true,
                    "groupBy": "calendar",
                    "maxGroups": 1000
                },
                "distributed": {
                    "assignmentStrategy": "load-balanced",
                    "requiredCapabilities": ["fetchSyncSources"]
                },
                "errorHandling": {
                    "strategy": "retry",
                    "maxRetries": 3,
                    "retryDelay": 5000,
                    "onFailure": "stop"
                }
            },
            {
                "id": "parallel-calendar-groups",
                "name": "并行处理日历组",
                "type": "loop",
                "loopType": "dynamic",
                "dependsOn": ["fetch-sync-sources"],
                "sourceExpression": "nodes.fetch-sync-sources.output.calendarGroups",
                "maxConcurrency": 5,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "childTaskDistribution": "load-balanced",
                    "maxEnginesPerLoop": 10
                },
                "nodes": [
                    {
                        "id": "process-calendar-group",
                        "name": "处理单个日历组",
                        "type": "subprocess",
                        "workflowName": "calendar-group-sync-workflow",
                        "version": "3.0.0",
                        "inputMapping": {
                            "calendarGroup": "$item",
                            "calendarInfo": "$item.calendar",
                            "participants": "$item.participants",
                            "schedules": "$item.schedules",
                            "xnxq": "${input.xnxq}",
                            "forceSync": "${input.forceSync}"
                        },
                        "outputMapping": {
                            "calendarId": "output.calendarResult.calendarId",
                            "participantStats": "output.participantLoopResults",
                            "scheduleStats": "output.scheduleLoopResults",
                            "totalProcessed": "output.summary.totalProcessed",
                            "success": "output.summary.success"
                        },
                        "distributed": {
                            "inheritParentStrategy": false,
                            "assignmentStrategy": "affinity"
                        },
                        "timeout": 1800000,
                        "errorHandling": {
                            "strategy": "retry",
                            "maxRetries": 2,
                            "retryDelay": 10000,
                            "onFailure": "continue"
                        }
                    }
                ]
            },
            {
                "id": "final-sync-report",
                "name": "生成最终同步报告",
                "type": "task",
                "executor": "generateFinalSyncReport",
                "dependsOn": ["parallel-calendar-groups"],
                "config": {
                    "xnxq": "${xnxq}",
                    "calendarGroupResults": "${nodes.parallel-calendar-groups.output}",
                    "reportFormat": "comprehensive",
                    "includeStatistics": true,
                    "includeErrors": true,
                    "includePerformanceMetrics": true,
                    "exportToFile": true,
                    "notifyOnCompletion": true
                },
                "distributed": {
                    "assignmentStrategy": "locality",
                    "requiredCapabilities": ["generateFinalSyncReport"]
                },
                "errorHandling": {
                    "strategy": "retry",
                    "maxRetries": 2,
                    "retryDelay": 5000,
                    "onFailure": "continue"
                }
            }
        ]
    }',
    @workflow_category,
    '["sync", "calendar", "distributed", "parallel", "v3"]',
    'active',
    true,
    7200,
    3,
    60,
    'system'
);

-- 插入子工作流定义：日历组同步工作流
INSERT INTO workflow_definitions (
    name,
    version,
    display_name,
    description,
    definition,
    category,
    tags,
    status,
    is_active,
    timeout_seconds,
    max_retries,
    retry_delay_seconds,
    created_by
) VALUES (
    'calendar-group-sync-workflow',
    '3.0.0',
    '日历组同步子工作流',
    '处理单个日历组的多循环并行同步，包括参与者、日程、权限、附件的处理',
    '{
        "id": "calendar-group-sync-workflow",
        "name": "日历组同步子工作流",
        "description": "处理单个日历组的多循环并行同步",
        "version": "3.0.0",
        "config": {
            "timeout": 1800000,
            "retries": 2,
            "retryDelay": 10000,
            "distributed": {
                "enabled": true,
                "assignmentStrategy": "affinity",
                "maxConcurrency": 15
            },
            "recovery": {
                "enabled": true,
                "checkpointInterval": 30000
            }
        },
        "inputs": [
            {
                "name": "calendarGroup",
                "type": "object",
                "required": true,
                "description": "日历组数据"
            },
            {
                "name": "calendarInfo",
                "type": "object",
                "required": true,
                "description": "日历信息"
            },
            {
                "name": "participants",
                "type": "array",
                "required": true,
                "description": "参与者列表"
            },
            {
                "name": "schedules",
                "type": "array",
                "required": true,
                "description": "日程列表"
            },
            {
                "name": "xnxq",
                "type": "string",
                "required": true,
                "description": "学年学期"
            },
            {
                "name": "forceSync",
                "type": "boolean",
                "default": false,
                "description": "是否强制同步"
            }
        ],
        "outputs": [
            {
                "name": "calendarResult",
                "type": "object",
                "description": "日历创建结果"
            },
            {
                "name": "participantLoopResults",
                "type": "array",
                "description": "参与者处理结果"
            },
            {
                "name": "scheduleLoopResults",
                "type": "array",
                "description": "日程处理结果"
            },
            {
                "name": "summary",
                "type": "object",
                "description": "处理汇总"
            }
        ],
        "nodes": [
            {
                "id": "create-calendar",
                "name": "创建或更新日历",
                "type": "task",
                "executor": "createOrUpdateCalendar",
                "config": {
                    "kkh": "${input.calendarInfo.kkh}",
                    "name": "${input.calendarInfo.name}",
                    "xnxq": "${input.xnxq}",
                    "forceUpdate": "${input.forceSync}",
                    "calendarData": "${input.calendarInfo}"
                },
                "distributed": {
                    "assignmentStrategy": "capability",
                    "requiredCapabilities": ["createOrUpdateCalendar"]
                },
                "errorHandling": {
                    "strategy": "retry",
                    "maxRetries": 3,
                    "retryDelay": 5000,
                    "onFailure": "stop"
                }
            },
            {
                "id": "process-participants",
                "name": "批量处理参与者",
                "type": "loop",
                "loopType": "dynamic",
                "dependsOn": ["create-calendar"],
                "sourceExpression": "input.participants",
                "maxConcurrency": 15,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "childTaskDistribution": "round-robin"
                },
                "nodes": [
                    {
                        "id": "add-participant",
                        "name": "添加参与者",
                        "type": "task",
                        "executor": "addParticipant",
                        "config": {
                            "calendarId": "${nodes.create-calendar.output.calendarId}",
                            "participantData": "${$item}",
                            "role": "${$item.role }",
                            "permissions": "${$item.permissions}"
                        },
                        "distributed": {
                            "assignmentStrategy": "capability",
                            "requiredCapabilities": ["addParticipant"]
                        },
                        "errorHandling": {
                            "strategy": "retry",
                            "maxRetries": 2,
                            "retryDelay": 2000,
                            "onFailure": "continue"
                        }
                    }
                ]
            },
            {
                "id": "process-schedules",
                "name": "批量处理日程",
                "type": "loop",
                "loopType": "dynamic",
                "dependsOn": ["create-calendar"],
                "sourceExpression": "input.schedules",
                "maxConcurrency": 12,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "childTaskDistribution": "load-balanced"
                },
                "nodes": [
                    {
                        "id": "add-schedule",
                        "name": "添加日程",
                        "type": "task",
                        "executor": "addSchedule",
                        "config": {
                            "calendarId": "${nodes.create-calendar.output.calendarId}",
                            "scheduleData": "${$item}",
                            "conflictResolution": "merge",
                            "notifyParticipants": false
                        },
                        "distributed": {
                            "assignmentStrategy": "capability",
                            "requiredCapabilities": ["addSchedule"]
                        },
                        "errorHandling": {
                            "strategy": "retry",
                            "maxRetries": 2,
                            "retryDelay": 3000,
                            "onFailure": "continue"
                        }
                    }
                ]
            },
            {
                "id": "calendar-group-summary",
                "name": "日历组同步汇总",
                "type": "task",
                "executor": "calendarGroupSyncSummary",
                "dependsOn": ["process-participants", "process-schedules"],
                "config": {
                    "calendarId": "${nodes.create-calendar.output.calendarId}",
                    "calendarKkh": "${input.calendarInfo.kkh}",
                    "participantResults": "${nodes.process-participants.output}",
                    "scheduleResults": "${nodes.process-schedules.output}",
                    "generateDetailedReport": true
                },
                "distributed": {
                    "assignmentStrategy": "affinity",
                    "requiredCapabilities": ["calendarGroupSyncSummary"]
                },
                "errorHandling": {
                    "strategy": "retry",
                    "maxRetries": 2,
                    "retryDelay": 3000,
                    "onFailure": "continue"
                }
            }
        ]
    }',
    @workflow_category,
    '["sync", "calendar", "subprocess", "distributed"]',
    'active',
    true,
    1800,
    2,
    10,
    'system'
);
-- 提交事务
COMMIT;
-- ============================================================================
-- 验证部署结果
-- ============================================================================

-- 验证主工作流插入结果
SELECT
    id,
    name,
    version,
    display_name,
    status,
    is_active,
    timeout_seconds,
    max_retries,
    JSON_LENGTH(definition, '$.nodes') as main_nodes_count,
    JSON_EXTRACT(definition, '$.config.distributed.enabled') as distributed_enabled,
    JSON_EXTRACT(definition, '$.config.recovery.enabled') as recovery_enabled,
    created_at
FROM workflow_definitions
WHERE name = @workflow_name AND version = @workflow_version
ORDER BY created_at DESC
LIMIT 1;

-- 验证子工作流插入结果
SELECT
    id,
    name,
    version,
    display_name,
    status,
    is_active,
    JSON_LENGTH(definition, '$.nodes') as sub_nodes_count,
    JSON_EXTRACT(definition, '$.config.distributed.enabled') as distributed_enabled,
    created_at
FROM workflow_definitions
WHERE name = 'calendar-group-sync-workflow' AND version = '3.0.0'
ORDER BY created_at DESC
LIMIT 1;

-- 验证JSON结构完整性
SELECT
    name,
    version,
    CASE
        WHEN JSON_VALID(definition) = 1 THEN 'VALID'
        ELSE 'INVALID'
    END as definition_validity,
    CASE
        WHEN JSON_EXTRACT(definition, '$.config.distributed.enabled') = true
         AND JSON_EXTRACT(definition, '$.config.recovery.enabled') = true
        THEN 'V3_FEATURES_ENABLED'
        ELSE 'V3_FEATURES_MISSING'
    END as v3_features_status,
    CASE
        WHEN JSON_LENGTH(definition, '$.nodes') > 0
        THEN CONCAT('NODES_COUNT: ', JSON_LENGTH(definition, '$.nodes'))
        ELSE 'NO_NODES'
    END as nodes_status
FROM workflow_definitions
WHERE name IN (@workflow_name, 'calendar-group-sync-workflow')
  AND version = '3.0.0'
ORDER BY name;

-- 验证分布式配置
SELECT
    name,
    version,
    JSON_EXTRACT(definition, '$.config.distributed.assignmentStrategy') as assignment_strategy,
    JSON_EXTRACT(definition, '$.config.distributed.maxConcurrency') as max_concurrency,
    JSON_EXTRACT(definition, '$.config.monitoring.enabled') as monitoring_enabled,
    JSON_EXTRACT(definition, '$.config.recovery.checkpointInterval') as checkpoint_interval
FROM workflow_definitions
WHERE name IN (@workflow_name, 'calendar-group-sync-workflow')
  AND version = '3.0.0'
ORDER BY name;

-- 使用子查询替代CTE来统计节点类型（兼容MySQL 5.7+）
SELECT
    workflow_name,
    version,
    'total' as node_type,
    total_nodes as node_count
FROM (
    SELECT
        name as workflow_name,
        version,
        JSON_LENGTH(JSON_EXTRACT(definition, '$.nodes')) as total_nodes,
        definition
    FROM workflow_definitions
    WHERE name IN (@workflow_name, 'calendar-group-sync-workflow')
      AND version = '3.0.0'
) as node_analysis
UNION ALL
SELECT
    workflow_name,
    version,
    'task' as node_type,
    ROUND((CHAR_LENGTH(definition) - CHAR_LENGTH(REPLACE(definition, '"type":"task"', ''))) / CHAR_LENGTH('"type":"task"')) as node_count
FROM (
    SELECT
        name as workflow_name,
        version,
        definition
    FROM workflow_definitions
    WHERE name IN (@workflow_name, 'calendar-group-sync-workflow')
      AND version = '3.0.0'
) as node_analysis
UNION ALL
SELECT
    workflow_name,
    version,
    'loop' as node_type,
    ROUND((CHAR_LENGTH(definition) - CHAR_LENGTH(REPLACE(definition, '"type":"loop"', ''))) / CHAR_LENGTH('"type":"loop"')) as node_count
FROM (
    SELECT
        name as workflow_name,
        version,
        definition
    FROM workflow_definitions
    WHERE name IN (@workflow_name, 'calendar-group-sync-workflow')
      AND version = '3.0.0'
) as node_analysis
UNION ALL
SELECT
    workflow_name,
    version,
    'subprocess' as node_type,
    ROUND((CHAR_LENGTH(definition) - CHAR_LENGTH(REPLACE(definition, '"type":"subprocess"', ''))) / CHAR_LENGTH('"type":"subprocess"')) as node_count
FROM (
    SELECT
        name as workflow_name,
        version,
        definition
    FROM workflow_definitions
    WHERE name IN (@workflow_name, 'calendar-group-sync-workflow')
      AND version = '3.0.0'
) as node_analysis
ORDER BY workflow_name,
         CASE node_type
             WHEN 'total' THEN 1
             WHEN 'task' THEN 2
             WHEN 'loop' THEN 3
             WHEN 'subprocess' THEN 4
         END;

-- 验证执行器配置
SELECT
    name,
    version,
    JSON_EXTRACT(definition, '$.nodes[0].executor') as first_executor,
    JSON_EXTRACT(definition, '$.nodes[0].distributed.requiredCapabilities') as first_capabilities,
    JSON_EXTRACT(definition, '$.nodes[0].errorHandling.strategy') as first_error_strategy
FROM workflow_definitions
WHERE name IN (@workflow_name, 'calendar-group-sync-workflow')
  AND version = '3.0.0'
ORDER BY name;

-- 检查是否有语法错误
SELECT
    name,
    version,
    CASE
        WHEN JSON_EXTRACT(definition, '$.nodes[*].type') IS NOT NULL THEN 'SYNTAX_OK'
        ELSE 'SYNTAX_ERROR'
    END as syntax_check,
    CASE
        WHEN JSON_SEARCH(definition, 'one', 'subWorkflow') IS NOT NULL THEN 'OLD_SUBPROCESS_FORMAT'
        WHEN JSON_SEARCH(definition, 'one', 'subprocess') IS NOT NULL THEN 'NEW_SUBPROCESS_FORMAT'
        ELSE 'NO_SUBPROCESS'
    END as subprocess_format_check
FROM workflow_definitions
WHERE name IN (@workflow_name, 'calendar-group-sync-workflow')
  AND version = '3.0.0'
ORDER BY name;

-- 显示部署完成信息
SELECT
    'Workflow Definition v3.0.0 Deployment Completed!' as status,
    NOW() as completed_at,
    COUNT(*) as deployed_workflows
FROM workflow_definitions
WHERE version = '3.0.0'
  AND name IN (@workflow_name, 'calendar-group-sync-workflow');
