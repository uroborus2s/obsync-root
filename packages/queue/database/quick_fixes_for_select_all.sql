-- ============================================================================
-- 🚀 快速修复 SELECT * 查询慢的解决方案
-- ============================================================================

-- 方案1：分页查询最新数据（推荐）
-- 查看最近的1000条记录
SELECT * FROM queue_success 
ORDER BY completed_at DESC 
LIMIT 1000;

-- 方案2：只查询关键字段（性能最好）
SELECT 
    id,
    queue_name,
    group_id, 
    job_name,
    executor_name,
    attempts,
    execution_time,
    created_at,
    completed_at
FROM queue_success 
ORDER BY completed_at DESC
LIMIT 1000;

-- 方案3：按时间范围查询
-- 查询最近7天的数据
SELECT * FROM queue_success 
WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY completed_at DESC;

-- 方案4：统计信息查询（了解数据概况）
SELECT 
    COUNT(*) as '总记录数',
    MIN(completed_at) as '最早时间',
    MAX(completed_at) as '最新时间',
    COUNT(DISTINCT queue_name) as '队列数量',
    AVG(execution_time) as '平均执行时间ms'
FROM queue_success;

-- 方案5：按队列分组查询
SELECT 
    queue_name,
    COUNT(*) as '任务数量',
    AVG(execution_time) as '平均耗时ms',
    MAX(completed_at) as '最后执行时间'
FROM queue_success 
GROUP BY queue_name
ORDER BY COUNT(*) DESC;

-- 立即执行的优化操作
-- 更新表统计信息
ANALYZE TABLE queue_success;

-- 检查表状态
SHOW TABLE STATUS LIKE 'queue_success';

-- 如果需要导出所有数据到文件（避免网络传输）
-- SELECT * FROM queue_success INTO OUTFILE '/tmp/queue_success_export.csv'
-- FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n'; 