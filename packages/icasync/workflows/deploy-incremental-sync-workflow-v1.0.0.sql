-- ============================================================================
-- 增量同步工作流 v1.0.0 部署脚本
-- 基于Stratix Tasks v3.0.0-enhanced架构，专门用于处理课程表的增量同步
-- 包含数据标记、删除过期日程、数据聚合、新增日程四个主要步骤
-- ============================================================================

-- 开始事务
START TRANSACTION;

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 设置变量
SET @workflow_name = 'incremental-sync-workflow' COLLATE utf8mb4_unicode_ci;
SET @workflow_version = '1.0.0' COLLATE utf8mb4_unicode_ci;
SET @workflow_category = 'icasync' COLLATE utf8mb4_unicode_ci;
SET @workflow_display_name = '增量同步工作流' COLLATE utf8mb4_unicode_ci;

-- 删除旧版本（如果存在）
DELETE FROM workflow_definitions 
WHERE name = @workflow_name AND version = @workflow_version;

-- 插入主工作流定义
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
    '基于Stratix Tasks架构的增量同步工作流，用于处理课程表的增量数据变更同步',
    '{
        "id": "incremental-sync-workflow",
        "name": "增量同步工作流",
        "description": "处理课程表增量数据变更的完整同步流程",
        "version": "1.0.0",
        "metadata": {
            "author": "system",
            "category": "icasync",
            "tags": ["incremental", "sync", "calendar", "distributed"]
        },
        "config": {
            "timeout": 3600000,
            "retries": 3,
            "retryDelay": 30000,
            "distributed": {
                "enabled": true,
                "assignmentStrategy": "load-balanced",
                "maxConcurrency": 10,
                "failoverStrategy": "automatic",
                "lockTimeout": 180000
            },
            "lockRenewal": {
                "enabled": true,
                "renewalInterval": 30000,
                "lockExtension": 180000,
                "maxRetryAttempts": 3
            },
            "monitoring": {
                "enabled": true,
                "metricsInterval": 15000,
                "logLevel": "info"
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
                "name": "dryRun",
                "type": "boolean",
                "default": false,
                "description": "是否仅测试运行"
            },
            {
                "name": "batchSize",
                "type": "number",
                "default": 100,
                "description": "批处理大小"
            }
        ],
        "outputs": [
            {
                "name": "incrementalSyncReport",
                "type": "object",
                "description": "增量同步结果报告"
            },
            {
                "name": "processedChanges",
                "type": "number",
                "description": "处理的变更数量"
            },
            {
                "name": "totalErrors",
                "type": "number",
                "description": "错误总数"
            }
        ],
        "nodes": [
            {
                "nodeId": "mark-incremental-data",
                "nodeName": "标记增量数据",
                "nodeType": "simple",
                "executor": "markIncrementalDataProcessor",
                "inputData": {
                    "xnxq": "${xnxq}",
                    "dryRun": "${dryRun}"
                },
                "distributed": {
                    "assignmentStrategy": "capability",
                    "requiredCapabilities": ["markIncrementalDataProcessor"]
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
                "nodeId": "delete-expired-schedules-loop",
                "nodeName": "删除过期日程循环",
                "nodeType": "loop",
                "loopType": "dynamic",
                "dependsOn": ["mark-incremental-data"],
                "executor": "fetchMarkedJuheRenwuProcessor",
                "inputData": {
                    "xnxq": "${xnxq}",
                    "status": "4",
                    "includeScheduleInfo": true
                },
                "sourceExpression": "output.markedRecords",
                "maxConcurrency": 3,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "assignmentStrategy": "load-balanced",
                    "childTaskDistribution": "load-balanced",
                    "maxEnginesPerLoop": 5
                },
                "executorErrorHandling": {
                    "strategy": "retry",
                    "maxRetries": 2,
                    "retryDelay": 3000,
                    "onFailure": "continue"
                },
                "node": {
                    "nodeId": "delete-single-schedule",
                    "nodeName": "删除单个日程",
                    "nodeType": "simple",
                    "executor": "deleteSingleScheduleProcessor",
                    "inputData": {
                        "juheRenwuId": "${id}",
                        "kkh": "${kkh}",
                        "rq": "${rq}",
                        "startTime": "${start_time}",
                        "endTime": "${end_time}",
                        "courseName": "${course_name}",
                        "dryRun": "${dryRun}"
                    },
                    "timeoutSeconds": 300,
                    "errorHandling": {
                        "strategy": "retry",
                        "maxRetries": 2,
                        "retryDelay": 5000,
                        "onFailure": "continue"
                    }
                }
            },
            {
                "nodeId": "aggregate-incremental-data",
                "nodeName": "聚合增量数据",
                "nodeType": "simple",
                "dependsOn": ["delete-expired-schedules-loop"],
                "executor": "incrementalDataAggregationProcessor",
                "inputData": {
                    "xnxq": "${xnxq}",
                    "syncType": "incremental",
                    "batchSize": "${batchSize}"
                },
                "errorHandling": {
                    "strategy": "retry",
                    "maxRetries": 3,
                    "retryDelay": 10000,
                    "onFailure": "stop"
                },
                "monitoring": {
                    "trackDuration": true,
                    "trackMemoryUsage": true
                }
            },
            {
                "nodeId": "create-new-schedules-loop",
                "nodeName": "创建新日程循环",
                "nodeType": "loop",
                "loopType": "dynamic",
                "dependsOn": ["aggregate-incremental-data"],
                "executor": "fetchUnprocessedJuheRenwuRecords",
                "inputData": {
                    "xnxq": "${xnxq}",
                    "includeCalendarInfo": true,
                    "includeParticipants": true,
                    "maxRecords": 1000
                },
                "sourceExpression": "output.unprocessedRecords",
                "maxConcurrency": 5,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "assignmentStrategy": "load-balanced",
                    "childTaskDistribution": "round-robin",
                    "maxEnginesPerLoop": 8
                },
                "executorErrorHandling": {
                    "strategy": "retry",
                    "maxRetries": 2,
                    "retryDelay": 3000,
                    "onFailure": "continue"
                },
                "node": {
                    "nodeId": "create-single-schedule",
                    "nodeName": "创建单个日程",
                    "nodeType": "simple",
                    "executor": "createSingleScheduleProcessor",
                    "inputData": {
                        "juheRenwuId": "${id}",
                        "kkh": "${kkh}",
                        "rq": "${rq}",
                        "startTime": "${start_time}",
                        "endTime": "${end_time}",
                        "courseName": "${course_name}",
                        "location": "${location}",
                        "teacherNames": "${teacher_names}",
                        "summary": "${summary}",
                        "description": "${description}",
                        "reminders":15,
                        "participants": "${participants}",
                        "dryRun": "${dryRun}"
                    },
                    "timeoutSeconds": 600,
                    "errorHandling": {
                        "strategy": "retry",
                        "maxRetries": 2,
                        "retryDelay": 5000,
                        "onFailure": "continue"
                    }
                }
            },
            {
                "nodeId": "remove-calendar-permissions-loop",
                "nodeName": "删除日历权限参与者循环",
                "nodeType": "loop",
                "loopType": "dynamic",
                "dependsOn": ["create-new-schedules-loop"],
                "executor": "fetchCalendarPermissionsToRemove",
                "inputData": {
                    "xnxq": "${xnxq}",
                    "includeParticipantInfo": true,
                    "maxRecords": 500
                },
                "sourceExpression": "output.permissionsToRemove",
                "maxConcurrency": 3,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "assignmentStrategy": "load-balanced",
                    "childTaskDistribution": "load-balanced",
                    "maxEnginesPerLoop": 5
                },
                "executorErrorHandling": {
                    "strategy": "retry",
                    "maxRetries": 2,
                    "retryDelay": 3000,
                    "onFailure": "continue"
                },
                "node": {
                    "nodeId": "remove-single-calendar-permission",
                    "nodeName": "删除单个日历下的权限",
                    "nodeType": "simple",
                    "executor": "removeSingleCalendarPermissionProcessor",
                    "inputData": {
                        "kkh": "${kkh}",
                        "userList": "${merged_user_list}",
                        "dryRun": "${dryRun}"
                    },
                    "timeoutSeconds": 300,
                    "errorHandling": {
                        "strategy": "retry",
                        "maxRetries": 2,
                        "retryDelay": 5000,
                        "onFailure": "continue"
                    }
                }
            },
            {
                "nodeId": "add-calendar-permissions-loop",
                "nodeName": "添加日历权限循环",
                "nodeType": "loop",
                "loopType": "dynamic",
                "dependsOn": ["remove-calendar-permissions-loop"],
                "executor": "fetchCalendarPermissionsToAdd",
                "inputData": {
                    "xnxq": "${xnxq}",
                    "includeParticipantInfo": true,
                    "maxRecords": 500
                },
                "sourceExpression": "output.permissionsToAdd",
                "maxConcurrency": 3,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "assignmentStrategy": "load-balanced",
                    "childTaskDistribution": "load-balanced",
                    "maxEnginesPerLoop": 5
                },
                "executorErrorHandling": {
                    "strategy": "retry",
                    "maxRetries": 2,
                    "retryDelay": 3000,
                    "onFailure": "continue"
                },
                "node": {
                    "nodeId": "add-single-calendar-permission",
                    "nodeName": "添加单个日历权限",
                    "nodeType": "simple",
                    "executor": "addSingleCalendarPermissionProcessor",
                    "inputData": {
                        "kkh": "${kkh}",
                        "usersList": "${merged_user_lists}",
                        "dryRun": "${dryRun}"
                    },
                    "timeoutSeconds": 300,
                    "errorHandling": {
                        "strategy": "retry",
                        "maxRetries": 2,
                        "retryDelay": 5000,
                        "onFailure": "continue"
                    }
                }
            }
        ]
    }',
    @workflow_category,
    '["incremental", "sync", "calendar", "distributed", "v1"]',
    'active',
    true,
    3600,
    3,
    30,
    'system'
);

-- 提交事务
COMMIT;

-- ============================================================================
-- 验证部署结果
-- ============================================================================

-- 验证工作流插入结果
SELECT
    id,
    name,
    version,
    display_name,
    status,
    is_active,
    timeout_seconds,
    max_retries,
    JSON_LENGTH(definition, '$.nodes') as nodes_count,
    created_at
FROM workflow_definitions
WHERE name = @workflow_name AND version = @workflow_version
ORDER BY created_at DESC
LIMIT 1;

-- 统计节点类型
SELECT
    name as workflow_name,
    version,
    'total' as node_type,
    JSON_LENGTH(JSON_EXTRACT(definition, '$.nodes')) as node_count
FROM workflow_definitions
WHERE name = @workflow_name AND version = @workflow_version
UNION ALL
SELECT
    name as workflow_name,
    version,
    'simple' as node_type,
    ROUND((CHAR_LENGTH(definition) - CHAR_LENGTH(REPLACE(definition, '"nodeType":"simple"', ''))) / CHAR_LENGTH('"nodeType":"simple"')) as node_count
FROM workflow_definitions
WHERE name = @workflow_name AND version = @workflow_version
UNION ALL
SELECT
    name as workflow_name,
    version,
    'loop' as node_type,
    ROUND((CHAR_LENGTH(definition) - CHAR_LENGTH(REPLACE(definition, '"nodeType":"loop"', ''))) / CHAR_LENGTH('"nodeType":"loop"')) as node_count
FROM workflow_definitions
WHERE name = @workflow_name AND version = @workflow_version
ORDER BY workflow_name,
         CASE node_type
             WHEN 'total' THEN 1
             WHEN 'simple' THEN 2
             WHEN 'loop' THEN 3
         END;