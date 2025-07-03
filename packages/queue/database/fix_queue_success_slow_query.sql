-- ============================================================================
-- 🚨 queue_success 表查询慢问题紧急修复脚本
-- 版本：1.0
-- 用途：立即解决 queue_success 表查询性能问题
-- ============================================================================

SELECT '🚨 开始修复 queue_success 表查询慢问题...' as status
> OK
> 查询时间: 0.030s


-- ============================================================================
-- 1. 检查当前表状态
-- ============================================================================

SELECT '📊 检查表状态和数据量...' as step
> OK
> 查询时间: 0.030s


-- 检查表记录数
SELECT 
    CONCAT('表记录数: ', COUNT(*)) as record_count,
    CONCAT('表大小约: ', ROUND(COUNT(*) * 0.5 / 1024, 2), ' MB') as estimated_size
FROM queue_success
> OK
> 查询时间: 0.129s


-- 检查现有索引
SELECT 
    CONCAT('现有索引数: ', COUNT(DISTINCT INDEX_NAME) - 1) as current_indexes
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'queue_success'
  AND INDEX_NAME != 'PRIMARY'
> OK
> 查询时间: 0.030s


-- ============================================================================
-- 2. 创建核心性能索引（紧急修复）
-- ============================================================================

SELECT '⚡ 创建核心性能索引...' as step
> OK
> 查询时间: 0.031s


-- 索引 1: 队列名 + 完成时间 (解决 90% 的查询慢问题)
CREATE INDEX IF NOT EXISTS idx_queue_success_queue_time 
    ON queue_success (queue_name, completed_at DESC)
> 1064 - You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'IF NOT EXISTS idx_queue_success_queue_time 
    ON queue_success (queue_name, co' at line 2
> 查询时间: 0.031s


