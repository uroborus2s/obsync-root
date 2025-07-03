-- ============================================================================
-- ✅ 最简单的 queue_success 表索引优化脚本
-- 兼容所有 MySQL 版本（5.5+）
-- 如果索引已存在会显示错误信息，但不影响其他索引的创建
-- ============================================================================

-- 1. 队列名 + 完成时间索引 (最重要 - 解决90%查询慢问题)
CREATE INDEX idx_queue_success_queue_time 
ON queue_success (queue_name, completed_at DESC);

-- 2. 分组 + 完成时间索引 (分组统计优化)
CREATE INDEX idx_queue_success_group_time 
ON queue_success (group_id, completed_at DESC);

-- 3. 完成时间索引 (时间范围查询优化)
CREATE INDEX idx_queue_success_completed_at 
ON queue_success (completed_at DESC);

-- 4. 复合索引 (队列 + 分组 + 时间)
CREATE INDEX idx_queue_success_queue_group_time 
ON queue_success (queue_name, group_id, completed_at DESC);

-- 更新表统计信息，让 MySQL 优化器使用新索引
ANALYZE TABLE queue_success;

-- 查看创建的索引
SHOW INDEX FROM queue_success; 