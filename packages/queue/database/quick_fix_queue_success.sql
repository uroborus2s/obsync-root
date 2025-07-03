-- ============================================================================
-- 🚨 快速修复 queue_success 表查询慢问题
-- 执行时间：通常 1-5 分钟（取决于数据量）
-- 注意：如果索引已存在会报错，但不影响后续执行
-- ============================================================================

-- 创建核心索引（立即生效）
CREATE INDEX idx_queue_success_queue_time 
    ON queue_success (queue_name, completed_at DESC);

CREATE INDEX idx_queue_success_group_time 
    ON queue_success (group_id, completed_at DESC);

CREATE INDEX idx_queue_success_completed_at 
    ON queue_success (completed_at DESC);

CREATE INDEX idx_queue_success_queue_group_time 
    ON queue_success (queue_name, group_id, completed_at DESC);

-- 更新表统计信息
ANALYZE TABLE queue_success;

-- 验证索引创建
SELECT 
    CONCAT('✅ queue_success 表索引优化完成，共创建 ', 
           COUNT(DISTINCT INDEX_NAME) - 1, ' 个索引') as result
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'queue_success'; 