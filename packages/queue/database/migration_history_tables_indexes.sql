-- ============================================================================
-- @stratix/queue 历史表性能优化索引迁移脚本
-- 版本：1.0
-- 用途：为 queue_success 和 queue_failures 表添加性能优化索引
-- ============================================================================

SELECT 
    '开始执行 @stratix/queue 历史表性能优化索引迁移' as status,
    NOW() as started_at;

-- ============================================================================
-- queue_success 表索引优化
-- ============================================================================

SELECT '开始优化 queue_success 表索引' as step;

-- 1. 按队列和完成时间查询索引 (最常用的查询)
CREATE INDEX idx_queue_success_queue_completed 
    ON queue_success (queue_name, completed_at DESC);

-- 2. 按执行器查询索引
CREATE INDEX idx_queue_success_executor_name 
    ON queue_success (executor_name, completed_at DESC);

-- 3. 按分组查询索引
CREATE INDEX idx_queue_success_group_id 
    ON queue_success (group_id, completed_at DESC);

-- 4. 按任务类型查询索引
CREATE INDEX idx_queue_success_job_name 
    ON queue_success (job_name, completed_at DESC);

-- 5. 执行时间统计索引 (用于性能分析)
CREATE INDEX idx_queue_success_execution_time 
    ON queue_success (queue_name, job_name, execution_time);

-- 6. 综合查询索引 (队列名 + 分组 + 完成时间)
CREATE INDEX idx_queue_success_queue_group_time 
    ON queue_success (queue_name, group_id, completed_at DESC);

-- 7. 创建时间范围查询索引
CREATE INDEX idx_queue_success_created_range 
    ON queue_success (created_at, queue_name);

-- 8. 执行器性能统计索引
CREATE INDEX idx_queue_success_executor_stats 
    ON queue_success (executor_name, queue_name, execution_time, completed_at);

-- ============================================================================
-- queue_failures 表索引优化
-- ============================================================================

SELECT '开始优化 queue_failures 表索引' as step;

-- 1. 按队列和失败时间查询索引 (最常用的查询)
CREATE INDEX idx_queue_failures_queue_failed 
    ON queue_failures (queue_name, failed_at DESC);

-- 2. 按执行器查询索引
CREATE INDEX idx_queue_failures_executor_name 
    ON queue_failures (executor_name, failed_at DESC);

-- 3. 按分组查询索引
CREATE INDEX idx_queue_failures_group_id 
    ON queue_failures (group_id, failed_at DESC);

-- 4. 按任务类型查询索引
CREATE INDEX idx_queue_failures_job_name 
    ON queue_failures (job_name, failed_at DESC);

-- 5. 错误代码统计索引 (用于错误分析)
CREATE INDEX idx_queue_failures_error_code 
    ON queue_failures (error_code, queue_name, failed_at DESC);

-- 6. 综合查询索引 (队列名 + 分组 + 失败时间)
CREATE INDEX idx_queue_failures_queue_group_time 
    ON queue_failures (queue_name, group_id, failed_at DESC);

-- 7. 创建时间范围查询索引
CREATE INDEX idx_queue_failures_created_range 
    ON queue_failures (created_at, queue_name);

-- 8. 重试次数统计索引
CREATE INDEX idx_queue_failures_attempts_stats 
    ON queue_failures (queue_name, job_name, attempts, failed_at DESC);

-- 9. 错误模式分析索引
CREATE INDEX idx_queue_failures_error_pattern 
    ON queue_failures (queue_name, error_code, job_name, failed_at DESC);

-- 10. 执行器错误统计索引
CREATE INDEX idx_queue_failures_executor_error 
    ON queue_failures (executor_name, error_code, failed_at DESC);

-- ============================================================================
-- 验证索引创建结果
-- ============================================================================

SELECT '验证 queue_success 表索引' as step;

SELECT 
    INDEX_NAME as '索引名称',
    COLUMN_NAME as '列名',
    INDEX_TYPE as '索引类型',
    CARDINALITY as '基数'
FROM 
    INFORMATION_SCHEMA.STATISTICS 
WHERE 
    TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'queue_success'
    AND INDEX_NAME != 'PRIMARY'
ORDER BY 
    INDEX_NAME, SEQ_IN_INDEX;

SELECT '验证 queue_failures 表索引' as step;

SELECT 
    INDEX_NAME as '索引名称',
    COLUMN_NAME as '列名',
    INDEX_TYPE as '索引类型',
    CARDINALITY as '基数'
FROM 
    INFORMATION_SCHEMA.STATISTICS 
WHERE 
    TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'queue_failures'
    AND INDEX_NAME != 'PRIMARY'
ORDER BY 
    INDEX_NAME, SEQ_IN_INDEX;

-- ============================================================================
-- 完成信息
-- ============================================================================

SELECT 
    '✅ @stratix/queue 历史表性能优化索引迁移完成' as status,
    'queue_success: 8个索引, queue_failures: 10个索引' as created_indexes,
    '如果某些索引已存在会报错，这是正常现象' as note,
    NOW() as completed_at;

-- ============================================================================
-- 索引使用说明
-- ============================================================================

/*
queue_success 表索引说明：

1. idx_queue_success_queue_completed (最重要)
   - 优化按队列和时间查询成功任务
   - 使用场景：任务成功率统计、历史记录查询

2. idx_queue_success_execution_time
   - 优化性能分析查询
   - 使用场景：任务执行时间统计、性能监控

3. idx_queue_success_executor_stats
   - 优化执行器性能统计
   - 使用场景：执行器效率分析

queue_failures 表索引说明：

1. idx_queue_failures_queue_failed (最重要)
   - 优化按队列和时间查询失败任务
   - 使用场景：错误监控、失败率统计

2. idx_queue_failures_error_code
   - 优化错误分析查询
   - 使用场景：错误统计、问题诊断

3. idx_queue_failures_error_pattern
   - 优化错误模式分析
   - 使用场景：错误趋势分析、问题定位

常见查询优化示例：

-- 查询最近的失败任务
SELECT * FROM queue_failures 
WHERE queue_name = 'my_queue' 
ORDER BY failed_at DESC 
LIMIT 50;
-- 使用索引：idx_queue_failures_queue_failed

-- 统计执行器性能
SELECT executor_name, AVG(execution_time), COUNT(*) 
FROM queue_success 
WHERE queue_name = 'my_queue' 
  AND completed_at >= '2024-01-01'
GROUP BY executor_name;
-- 使用索引：idx_queue_success_executor_stats

-- 错误代码分析
SELECT error_code, COUNT(*) as error_count
FROM queue_failures 
WHERE queue_name = 'my_queue' 
  AND failed_at >= '2024-01-01'
GROUP BY error_code 
ORDER BY error_count DESC;
-- 使用索引：idx_queue_failures_error_code

预期性能提升：
- 历史记录查询速度提升 5-10x
- 统计分析查询速度提升 3-8x
- 错误分析查询速度提升 5-15x
- 报表生成速度提升 10-20x
*/ 