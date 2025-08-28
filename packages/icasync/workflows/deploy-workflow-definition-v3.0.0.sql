-- ============================================================================
-- 全量同步工作流 v3.0.0-enhanced 部署脚本
-- 基于Stratix Tasks v3.0.0-enhanced架构，支持定时任务、自动锁续期、增强监控
-- 兼容新的数据库表结构和节点类型定义
-- ============================================================================

-- 开始事务
START TRANSACTION;

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 设置变量
SET @workflow_name = 'full-sync-multi-loop-workflow' COLLATE utf8mb4_unicode_ci;
SET @workflow_version = '3.0.0' COLLATE utf8mb4_unicode_ci;
SET @workflow_category = 'icasync' COLLATE utf8mb4_unicode_ci;
SET @workflow_display_name = '全量同步工作流' COLLATE utf8mb4_unicode_ci;

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
    '基于Stratix Tasks v3.0.0-enhanced架构的全量同步工作流，支持定时任务、自动锁续期、增强监控，具备断点续传和故障转移能力',
    '{
        "id": "full-sync-multi-loop-workflow",
        "name": "全量同步工作流",
        "description": "基于Stratix Tasks v3.0.0-enhanced架构的全量同步工作流，支持定时任务、自动锁续期、增强监控",
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
            "lockRenewal": {
                "enabled": true,
                "renewalInterval": 60000,
                "lockExtension": 300000,
                "maxRetryAttempts": 3
            },
            "scheduler": {
                "enabled": true,
                "defaultTimezone": "Asia/Shanghai",
                "maxConcurrency": 10
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
                "nodeId": "data-aggregation",
                "nodeName": "数据聚合准备",
                "nodeType": "simple",
                "executor": "dataAggregationProcessor",
                "inputData": {
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
                "nodeId": "process-calendar-groups-loop",
                "nodeName": "获取并处理日历组",
                "nodeType": "loop",
                "loopType": "dynamic",
                "dependsOn": ["data-aggregation"],
                "executor": "fetchSyncSources",
                "inputData": {
                    "xnxq": "${xnxq}",
                    "includeCalendars": true,
                    "includeUsers": true,
                    "includeSchedules": true,
                    "groupBy": "calendar",
                    "maxGroups": 1000
                },
                "sourceExpression": "output.calendarGroups",
                "maxConcurrency": 5,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "assignmentStrategy": "load-balanced",
                    "requiredCapabilities": ["fetchSyncSources"],
                    "childTaskDistribution": "load-balanced",
                    "maxEnginesPerLoop": 10
                },
                "executorErrorHandling": {
                    "strategy": "retry",
                    "maxRetries": 3,
                    "retryDelay": 5000,
                    "onFailure": "stop"
                },
                "node": {
                    "nodeId": "process-calendar-group",
                    "nodeName": "处理单个日历组",
                    "nodeType": "subprocess",
                    "workflowName": "calendar-group-sync-workflow",
                    "version": "3.0.0",
                    "inputData": {
                        "kkh": "${kkh}",
                        "kcmc": "${kcmc}",
                        "xnxq": "${xnxq}",
                        "forceSync": "${forceSync}"
                    },
                    "timeoutSeconds": 1800,
                    "errorHandling": {
                        "strategy": "retry",
                        "maxRetries": 2,
                        "retryDelay": 10000,
                        "onFailure": "continue"
                    }
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
            "retryDelay": 10000
        },
        "inputs": [
            {
                "name": "kkh",
                "type": "string",
                "required": true,
                "description": "开课号"
            },
            {
                "name": "kcmc",
                "type": "string",
                "required": true,
                "description": "课程名称"
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
                "nodeId": "create-calendar",
                "nodeName": "创建或更新日历",
                "nodeType": "simple",
                "executor": "createOrUpdateCalendar",
                "inputData": {
                    "kkh": "${kkh}",
                    "kcmc": "${kcmc}",
                    "xnxq": "${xnxq}",
                    "forceUpdate": "${forceSync}"
                },
                "errorHandling": {
                    "strategy": "retry",
                    "maxRetries": 3,
                    "retryDelay": 5000,
                    "onFailure": "stop"
                }
            },
            {
                "nodeId": "process-participants",
                "nodeName": "批量处理参与者",
                "nodeType": "loop",
                "loopType": "dynamic",
                "dependsOn": ["create-calendar"],
                "executor": "fetchParticipants",
                "inputData": {
                    "kkh": "${kkh}",
                    "xnxq": "${xnxq}"
                },
                "maxConcurrency": 15,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "childTaskDistribution": "round-robin"
                },
                "node": {
                    "nodeId": "add-participant",
                    "nodeName": "添加参与者",
                    "nodeType": "simple",
                    "executor": "addParticipants",
                    "inputData": {
                        "permissions": "${permissions}",
                        "kkh": "${kkh}",
                        "xnxq": "${xnxq}"
                    },
                    "errorHandling": {
                        "strategy": "retry",
                        "maxRetries": 2,
                        "retryDelay": 2000,
                        "onFailure": "continue"
                    }
                }
            },
            {
                "nodeId": "process-schedules",
                "nodeName": "批量处理日程",
                "nodeType": "loop",
                "loopType": "dynamic",
                "dependsOn": ["create-calendar"],
                "executor": "fetchSchedules",
                "maxConcurrency": 12,
                "errorHandling": "continue",
                "joinType": "all",
                "inputData": {
                    "kkh": "${kkh}",
                    "xnxq": "${xnxq}"
                },
                "node": {
                    "nodeId": "add-schedule",
                    "nodeName": "添加日程",
                    "nodeType": "simple",
                    "executor": "addSchedule",
                    "inputData": {
                        "kkh": "${kkh}",
                        "schedules": "${schedules}",
                        "xnxq": "${xnxq}"
                    },
                    "errorHandling": {
                        "strategy": "retry",
                        "maxRetries": 2,
                        "retryDelay": 3000,
                        "onFailure": "continue"
                    }
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
    created_at
FROM workflow_definitions
WHERE name = 'calendar-group-sync-workflow' AND version = '3.0.0-enhanced'
ORDER BY created_at DESC
LIMIT 1;


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
      AND version = '3.0.0-enhanced'
) as node_analysis
UNION ALL
SELECT
    workflow_name,
    version,
    'simple' as node_type,
    ROUND((CHAR_LENGTH(definition) - CHAR_LENGTH(REPLACE(definition, '"nodeType":"simple"', ''))) / CHAR_LENGTH('"nodeType":"simple"')) as node_count
FROM (
    SELECT
        name as workflow_name,
        version,
        definition
    FROM workflow_definitions
    WHERE name IN (@workflow_name, 'calendar-group-sync-workflow')
      AND version = '3.0.0-enhanced'
) as node_analysis
UNION ALL
SELECT
    workflow_name,
    version,
    'loop' as node_type,
    ROUND((CHAR_LENGTH(definition) - CHAR_LENGTH(REPLACE(definition, '"nodeType":"loop"', ''))) / CHAR_LENGTH('"nodeType":"loop"')) as node_count
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
    ROUND((CHAR_LENGTH(definition) - CHAR_LENGTH(REPLACE(definition, '"nodeType":"subprocess"', ''))) / CHAR_LENGTH('"nodeType":"subprocess"')) as node_count
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
             WHEN 'simple' THEN 2
             WHEN 'loop' THEN 3
             WHEN 'subprocess' THEN 4
         END;
