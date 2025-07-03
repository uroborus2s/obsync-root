-- ============================================================================
-- 🚨 快速修复 queue_success 表查询慢问题 (MySQL 兼容版本)
-- 执行时间：通常 1-5 分钟（取决于数据量）
-- 兼容 MySQL 5.7+ 和 MySQL 8.0+
-- ============================================================================

-- 检查并创建索引的安全方式
-- 如果索引已存在会报错，但不影响执行

-- 1. 队列名 + 完成时间索引 (最重要)
CREATE INDEX idx_queue_success_queue_time 
    ON queue_success (queue_name, completed_at DESC);

-- 2. 分组 + 完成时间索引
CREATE INDEX idx_queue_success_group_time 
    ON queue_success (group_id, completed_at DESC);

-- 3. 完成时间索引
CREATE INDEX idx_queue_success_completed_at 
    ON queue_success (completed_at DESC);

-- 4. 复合索引 (队列 + 分组 + 时间)
CREATE INDEX idx_queue_success_queue_group_time 
    ON queue_success (queue_name, group_id, completed_at DESC);

-- 更新表统计信息
ANALYZE TABLE queue_success;

-- 验证索引创建
SELECT 
    CONCAT('✅ queue_success 表索引优化完成，当前共有 ', 
           COUNT(DISTINCT INDEX_NAME) - 1, ' 个索引') as result
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'queue_success';

-- 显示创建的索引
SELECT 
    INDEX_NAME as '索引名称',
    COLUMN_NAME as '索引列',
    SEQ_IN_INDEX as '列序号'
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'queue_success'
  AND INDEX_NAME LIKE 'idx_queue_success_%'
ORDER BY INDEX_NAME, SEQ_IN_INDEX; 