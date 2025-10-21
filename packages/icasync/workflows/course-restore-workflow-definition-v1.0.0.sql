-- ============================================================================
-- 课表恢复工作流 v1.0.0 部署脚本
-- 基于Stratix Tasks v3.0.0-enhanced架构，支持根据用户类型和学号/工号恢复课表权限
-- 包含课程数据获取和权限恢复两个主要步骤
-- ============================================================================

-- 开始事务
START TRANSACTION;

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 设置变量
SET @workflow_name = 'course-restore-workflow' COLLATE utf8mb4_unicode_ci;
SET @workflow_version = '1.0.0' COLLATE utf8mb4_unicode_ci;
SET @workflow_category = 'icasync' COLLATE utf8mb4_unicode_ci;
SET @workflow_display_name = '课表恢复工作流' COLLATE utf8mb4_unicode_ci;

-- 删除旧版本（如果存在）
DELETE FROM workflow_definitions
WHERE name = @workflow_name AND version = @workflow_version;

-- 插入课表恢复工作流定义
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
    '基于Stratix Tasks v3.0.0-enhanced架构的课表恢复工作流，支持根据用户类型（教师/学生）和学号/工号恢复用户的课表权限',
    '{
        "id": "course-restore-workflow",
        "name": "课表恢复工作流",
        "description": "根据用户类型和学号/工号恢复课表权限的工作流",
        "version": "1.0.0",
        "metadata": {
            "author": "system",
            "category": "icasync",
            "tags": ["restore", "permission", "course", "calendar"]
        },
        "config": {
            "timeout": 1800000,
            "retries": 2,
            "retryDelay": 5000,
            "distributed": {
                "enabled": true,
                "assignmentStrategy": "round_robin",
                "maxConcurrency": 5,
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
        "inputSchema": {
            "type": "object",
            "properties": {
                "userType": {
                    "type": "string",
                    "enum": ["student", "teacher"],
                    "description": "用户类型：student（学生）或 teacher（教师）"
                },
                "xgh": {
                    "type": "string",
                    "description": "学号或工号"
                },
                "xnxq": {
                    "type": "string",
                    "description": "学年学期（可选）"
                },
                "dryRun": {
                    "type": "boolean",
                    "default": false,
                    "description": "是否为测试运行模式"
                }
            },
            "required": ["userType", "xgh"]
        },
        "outputSchema": {
            "type": "object",
            "properties": {
                "userType": {
                    "type": "string"
                },
                "xgh": {
                    "type": "string"
                },
                "totalCourses": {
                    "type": "number"
                },
                "successCount": {
                    "type": "number"
                },
                "failureCount": {
                    "type": "number"
                },
                "results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "kkh": {"type": "string"},
                            "calendarId": {"type": "string"},
                            "success": {"type": "boolean"},
                            "error": {"type": "string"}
                        }
                    }
                },
                "executionSummary": {
                    "type": "object",
                    "properties": {
                        "totalProcessed": {"type": "number"},
                        "successfulRestores": {"type": "number"},
                        "failedRestores": {"type": "number"},
                        "executionTime": {"type": "number"}
                    }
                }
            }
        },
        "nodes": [
            {
                "nodeId": "restore-course-permissions-loop",
                "nodeName": "恢复课表权限循环",
                "nodeType": "loop",
                "loopType": "dynamic",
                "dependsOn": [],
                "executor": "fetchCourseDataExecutor",
                "inputData": {
                    "userType": "${userType}",
                    "xgh": "${xgh}",
                    "xnxq": "${xnxq}",
                    "dryRun": "${dryRun}"
                },
                "sourceExpression": "data.courses",
                "maxConcurrency": 5,
                "errorHandling": "continue",
                "joinType": "all",
                "distributed": {
                    "enabled": true,
                    "assignmentStrategy": "load-balanced",
                    "childTaskDistribution": "load-balanced",
                    "maxEnginesPerLoop": 3
                },
                "executorErrorHandling": {
                    "strategy": "retry",
                    "maxRetries": 2,
                    "retryDelay": 3000,
                    "onFailure": "continue"
                },
                "node": {
                    "nodeId": "restore-single-course-permission",
                    "nodeName": "恢复单个课程权限",
                    "nodeType": "simple",
                    "executor": "restoreCalendarPermissionExecutor",
                    "inputData": {
                        "xgh": "${xgh}",
                        "kkh": "${kkh}",
                        "dryRun": "${dryRun}"
                    },
                    "timeoutSeconds": 300,
                    "errorHandling": {
                        "strategy": "retry",
                        "maxRetries": 3,
                        "retryDelay": 2000,
                        "onFailure": "continue"
                    }
                }
            }
        ],
        "errorHandling": {
            "globalStrategy": "continue",
            "onFailure": "log_and_continue",
            "notificationChannels": ["system_log"]
        },
        "monitoring": {
            "enabled": true,
            "metrics": ["execution_time", "success_rate", "error_rate"],
            "alerts": {
                "highErrorRate": {
                    "threshold": 0.3,
                    "action": "notify"
                },
                "longExecution": {
                    "threshold": 1800000,
                    "action": "notify"
                }
            }
        },
        "scheduling": {
            "enabled": false,
            "timezone": "Asia/Shanghai"
        },
        "distributed": {
            "enabled": true,
            "assignmentStrategy": "round_robin",
            "requiredCapabilities": ["icasync", "wps_api"]
        }
    }',
    @workflow_category,
    '["restore", "permission", "course", "calendar"]',
    'active',
    true,
    1800,
    2,
    5,
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

-- 验证JSON格式正确性
SELECT
    name,
    version,
    JSON_VALID(definition) as is_valid_json,
    CASE
        WHEN JSON_VALID(definition) = 1 THEN '✅ JSON格式正确'
        ELSE '❌ JSON格式错误'
    END as json_status
FROM workflow_definitions
WHERE name = @workflow_name AND version = @workflow_version;

-- 验证节点配置
SELECT
    name,
    version,
    JSON_EXTRACT(definition, '$.nodes[0].nodeType') as first_node_type,
    JSON_EXTRACT(definition, '$.nodes[0].executor') as first_executor,
    JSON_EXTRACT(definition, '$.nodes[0].node.executor') as loop_child_executor
FROM workflow_definitions
WHERE name = @workflow_name AND version = @workflow_version;

SELECT CONCAT('✅ 成功部署工作流定义: ', @workflow_name, ' v', @workflow_version) AS deployment_result;
