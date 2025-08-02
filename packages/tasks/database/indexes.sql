-- @stratix/tasks 工作流引擎索引优化
-- 针对高频查询场景的索引设计和优化建议

-- ============================================================================
-- 1. 复合索引 - 针对常见查询模式
-- ============================================================================

-- 工作流实例状态查询优化
CREATE INDEX idx_workflow_instances_status_created ON workflow_instances (status, created_at DESC);
CREATE INDEX idx_workflow_instances_definition_status ON workflow_instances (definition_id, status, created_at DESC);

-- 任务实例状态查询优化
CREATE INDEX idx_task_instances_workflow_status ON task_instances (workflow_instance_id, status, execution_order);
CREATE INDEX idx_task_instances_status_scheduled ON task_instances (status, scheduled_at);

-- 执行历史查询优化
CREATE INDEX idx_execution_history_workflow_event ON execution_history (workflow_instance_id, event_type, created_at DESC);
CREATE INDEX idx_execution_history_task_event ON execution_history (task_instance_id, event_type, created_at DESC);

-- 调度查询优化
CREATE INDEX idx_workflow_schedules_active_next_run ON workflow_schedules (is_active, next_run_at);
CREATE INDEX idx_workflow_schedules_trigger_active ON workflow_schedules (trigger_type, is_active, next_run_at);

-- 性能指标查询优化
CREATE INDEX idx_performance_metrics_type_date ON performance_metrics (metric_type, date_day, entity_id);
CREATE INDEX idx_performance_metrics_entity_hour ON performance_metrics (entity_id, date_hour DESC);

-- ============================================================================
-- 2. 分区表建议 - 针对大数据量场景
-- ============================================================================

-- 执行历史表按月分区（MySQL 8.0+）
-- ALTER TABLE execution_history 
-- PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
--     PARTITION p202401 VALUES LESS THAN (202402),
--     PARTITION p202402 VALUES LESS THAN (202403),
--     PARTITION p202403 VALUES LESS THAN (202404),
--     -- 继续添加分区...
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- 性能指标表按日期分区
-- ALTER TABLE performance_metrics 
-- PARTITION BY RANGE (TO_DAYS(date_day)) (
--     PARTITION p_2024_01 VALUES LESS THAN (TO_DAYS('2024-02-01')),
--     PARTITION p_2024_02 VALUES LESS THAN (TO_DAYS('2024-03-01')),
--     -- 继续添加分区...
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- ============================================================================
-- 3. 查询优化视图
-- ============================================================================

-- 工作流实例详情视图
CREATE VIEW v_workflow_instance_details AS
SELECT 
    wi.id,
    wi.definition_id,
    wd.name as definition_name,
    wd.version as definition_version,
    wi.status,
    wi.priority,
    wi.started_at,
    wi.completed_at,
    wi.created_at,
    wi.correlation_id,
    -- 任务统计
    (SELECT COUNT(*) FROM task_instances ti WHERE ti.workflow_instance_id = wi.id) as total_tasks,
    (SELECT COUNT(*) FROM task_instances ti WHERE ti.workflow_instance_id = wi.id AND ti.status = 'completed') as completed_tasks,
    (SELECT COUNT(*) FROM task_instances ti WHERE ti.workflow_instance_id = wi.id AND ti.status = 'failed') as failed_tasks,
    -- 执行时长
    CASE 
        WHEN wi.completed_at IS NOT NULL AND wi.started_at IS NOT NULL 
        THEN TIMESTAMPDIFF(MICROSECOND, wi.started_at, wi.completed_at) / 1000
        ELSE NULL 
    END as duration_ms
FROM workflow_instances wi
LEFT JOIN workflow_definitions wd ON wi.definition_id = wd.id;

-- 任务执行统计视图
CREATE VIEW v_task_execution_stats AS
SELECT 
    ti.workflow_instance_id,
    ti.task_definition_id,
    ti.name as task_name,
    ti.type as task_type,
    ti.status,
    ti.executor_name,
    ti.started_at,
    ti.completed_at,
    ti.retry_count,
    -- 执行时长
    CASE 
        WHEN ti.completed_at IS NOT NULL AND ti.started_at IS NOT NULL 
        THEN TIMESTAMPDIFF(MICROSECOND, ti.started_at, ti.completed_at) / 1000
        ELSE NULL 
    END as duration_ms,
    -- 是否超时
    CASE 
        WHEN ti.timeout_at IS NOT NULL AND ti.completed_at > ti.timeout_at 
        THEN TRUE 
        ELSE FALSE 
    END as is_timeout
FROM task_instances ti;

-- 工作流性能统计视图
CREATE VIEW v_workflow_performance_stats AS
SELECT 
    wd.id as definition_id,
    wd.name as definition_name,
    wd.version,
    -- 执行统计
    COUNT(wi.id) as total_executions,
    SUM(CASE WHEN wi.status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
    SUM(CASE WHEN wi.status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
    SUM(CASE WHEN wi.status IN ('running', 'pending') THEN 1 ELSE 0 END) as active_executions,
    -- 成功率
    ROUND(
        SUM(CASE WHEN wi.status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(wi.id), 
        2
    ) as success_rate,
    -- 平均执行时间
    AVG(
        CASE 
            WHEN wi.completed_at IS NOT NULL AND wi.started_at IS NOT NULL 
            THEN TIMESTAMPDIFF(MICROSECOND, wi.started_at, wi.completed_at) / 1000
            ELSE NULL 
        END
    ) as avg_duration_ms,
    -- 最近执行时间
    MAX(wi.created_at) as last_execution_at
FROM workflow_definitions wd
LEFT JOIN workflow_instances wi ON wd.id = wi.definition_id
WHERE wd.is_active = TRUE
GROUP BY wd.id, wd.name, wd.version;

-- ============================================================================
-- 4. 数据清理和归档建议
-- ============================================================================

-- 清理过期执行历史的存储过程
DELIMITER //
CREATE PROCEDURE CleanupExecutionHistory(IN retention_days INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE batch_size INT DEFAULT 1000;
    DECLARE deleted_count INT DEFAULT 0;
    
    -- 删除超过保留期的执行历史
    REPEAT
        DELETE FROM execution_history 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL retention_days DAY)
        LIMIT batch_size;
        
        SET deleted_count = ROW_COUNT();
        
        -- 避免长时间锁表
        SELECT SLEEP(0.1);
        
    UNTIL deleted_count < batch_size END REPEAT;
    
    SELECT CONCAT('Cleaned up execution history older than ', retention_days, ' days') as result;
END //
DELIMITER ;

-- 归档完成的工作流实例的存储过程
DELIMITER //
CREATE PROCEDURE ArchiveCompletedWorkflows(IN retention_days INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE batch_size INT DEFAULT 100;
    DECLARE archived_count INT DEFAULT 0;
    
    -- 创建归档表（如果不存在）
    CREATE TABLE IF NOT EXISTS workflow_instances_archive LIKE workflow_instances;
    CREATE TABLE IF NOT EXISTS task_instances_archive LIKE task_instances;
    
    -- 归档完成的工作流实例
    INSERT INTO workflow_instances_archive
    SELECT * FROM workflow_instances 
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < DATE_SUB(NOW(), INTERVAL retention_days DAY)
    LIMIT batch_size;
    
    SET archived_count = ROW_COUNT();
    
    IF archived_count > 0 THEN
        -- 归档相关的任务实例
        INSERT INTO task_instances_archive
        SELECT ti.* FROM task_instances ti
        INNER JOIN workflow_instances wi ON ti.workflow_instance_id = wi.id
        WHERE wi.status IN ('completed', 'failed', 'cancelled')
        AND wi.completed_at < DATE_SUB(NOW(), INTERVAL retention_days DAY);
        
        -- 删除原始数据
        DELETE wi, ti FROM workflow_instances wi
        LEFT JOIN task_instances ti ON ti.workflow_instance_id = wi.id
        WHERE wi.status IN ('completed', 'failed', 'cancelled')
        AND wi.completed_at < DATE_SUB(NOW(), INTERVAL retention_days DAY);
    END IF;
    
    SELECT CONCAT('Archived ', archived_count, ' completed workflows older than ', retention_days, ' days') as result;
END //
DELIMITER ;

-- ============================================================================
-- 5. 监控和告警查询
-- ============================================================================

-- 查找长时间运行的工作流
CREATE VIEW v_long_running_workflows AS
SELECT 
    wi.id,
    wi.definition_id,
    wd.name as definition_name,
    wi.status,
    wi.started_at,
    TIMESTAMPDIFF(MINUTE, wi.started_at, NOW()) as running_minutes,
    wi.correlation_id
FROM workflow_instances wi
LEFT JOIN workflow_definitions wd ON wi.definition_id = wd.id
WHERE wi.status = 'running'
AND wi.started_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY wi.started_at ASC;

-- 查找失败率高的工作流定义
CREATE VIEW v_high_failure_rate_workflows AS
SELECT 
    wd.id as definition_id,
    wd.name as definition_name,
    COUNT(wi.id) as total_executions,
    SUM(CASE WHEN wi.status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
    ROUND(
        SUM(CASE WHEN wi.status = 'failed' THEN 1 ELSE 0 END) * 100.0 / COUNT(wi.id), 
        2
    ) as failure_rate
FROM workflow_definitions wd
LEFT JOIN workflow_instances wi ON wd.id = wi.definition_id
WHERE wi.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY wd.id, wd.name
HAVING COUNT(wi.id) >= 10 AND failure_rate > 20
ORDER BY failure_rate DESC;

-- 查找资源消耗异常的任务
CREATE VIEW v_resource_intensive_tasks AS
SELECT 
    ti.id,
    ti.workflow_instance_id,
    ti.name as task_name,
    ti.executor_name,
    TIMESTAMPDIFF(MICROSECOND, ti.started_at, ti.completed_at) / 1000 as duration_ms,
    pm.memory_usage_mb,
    pm.cpu_usage_percent
FROM task_instances ti
LEFT JOIN performance_metrics pm ON ti.id = pm.entity_id AND pm.metric_type = 'task'
WHERE ti.completed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
AND (
    TIMESTAMPDIFF(MICROSECOND, ti.started_at, ti.completed_at) / 1000 > 300000 -- 超过5分钟
    OR pm.memory_usage_mb > 1024 -- 超过1GB内存
    OR pm.cpu_usage_percent > 80 -- CPU使用率超过80%
)
ORDER BY duration_ms DESC;
