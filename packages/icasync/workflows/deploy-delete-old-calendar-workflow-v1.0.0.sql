-- ============================================================================
-- 删除上学期日历工作流 v1.0.0 部署脚本
-- 基于Stratix Tasks v3.0.0-enhanced架构，专门用于删除指定学期的旧日历
-- 独立运行，不依赖其他工作流
-- ============================================================================

-- 开始事务
START TRANSACTION;

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 设置变量
SET @workflow_name = 'delete-old-calendar-workflow' COLLATE utf8mb4_unicode_ci;
SET @workflow_version = '1.0.0' COLLATE utf8mb4_unicode_ci;
SET @workflow_category = 'icasync' COLLATE utf8mb4_unicode_ci;
SET @workflow_display_name = '删除上学期日历工作流' COLLATE utf8mb4_unicode_ci;

-- 删除旧版本（如果存在）
DELETE FROM workflow_definitions 
WHERE name = @workflow_name AND version = @workflow_version;

-- 插入删除上学期日历工作流定义
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
    '基于Stratix Tasks v3.0.0-enhanced架构的删除上学期日历工作流，根据学期号查询并删除旧日历数据',
    '{
        "id": "delete-old-calendar-workflow",
        "name": "删除上学期日历工作流",
        "description": "根据学期号查询并删除旧日历数据的独立工作流",
        "version": "1.0.0",
        "metadata": {
            "author": "system",
            "category": "icasync",
            "tags": ["cleanup", "calendar", "delete", "maintenance"]
        },
        "config": {
            "timeout": 1800000,
            "retries": 2,
            "retryDelay": 15000,
            "distributed": {
                "enabled": true,
                "assignmentStrategy": "load-balanced",
                "maxConcurrency": 10,
                "failoverStrategy": "automatic",
                "lockTimeout": 300000
            },
            "lockRenewal": {
                "enabled": true,
                "renewalInterval": 60000,
                "lockExtension": 300000,
                "maxRetryAttempts": 3
            }
        },
        "inputs": [
            {
                "name": "xnxq",
                "type": "string",
                "required": true,
                "description": "要删除的学年学期标识",
                "pattern": "^[0-9]{4}-[0-9]{4}-[12]$"
            },
            {
                "name": "batchSize",
                "type": "number",
                "default": 100,
                "description": "批处理大小，控制每批删除的日历数量"
            },
            {
                "name": "dryRun",
                "type": "boolean",
                "default": false,
                "description": "是否为试运行模式，仅查询不删除"
            }
        ],
        "outputs": [
            {
                "name": "totalErrors",
                "type": "number",
                "description": "删除过程中的错误数量"
            }
        ],
        "nodes": [
             {
                "nodeId": "delete-old-calendars-loop",
                "nodeName": "查询并删除旧日历",
                "nodeType": "loop",
                "loopType": "dynamic",
                "dependsOn": ["data-aggregation"],
                "executor": "fetchOldCalendarMappings",
                "inputData": {
                    "xnxq": "${xnxq}",
                    "includeInactive": true,
                    "orderBy": "created_at DESC",
                    "limit": 10000
                },
                "maxConcurrency": 8,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "assignmentStrategy": "locality",
                    "requiredCapabilities": ["fetchOldCalendarMappings"],
                    "childTaskDistribution": "round-robin",
                    "maxEnginesPerLoop": 5
                },
                "executorErrorHandling": {
                    "strategy": "retry",
                    "maxRetries": 2,
                    "retryDelay": 3000,
                    "onFailure": "continue"
                },
                "node": {
                    "nodeId": "delete-single-calendar",
                    "nodeName": "删除单个日历",
                    "nodeType": "simple",
                    "executor": "deleteSingleCalendar",
                    "inputData": {
                        "calendarId": "${calendarId}",
                        "kkh": "${kkh}",
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
            }
        ]
    }',
    @workflow_category,
    '["cleanup", "calendar", "delete", "maintenance"]',
    'active',
    true,
    1800,
    2,
    15,
    'system'
);

-- 提交事务
COMMIT;
