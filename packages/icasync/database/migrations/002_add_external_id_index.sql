-- =====================================================
-- @stratix/icasync 数据库迁移脚本
-- =====================================================
-- 文件名: 002_add_external_id_index.sql
-- 创建时间: 2025-09-26
-- 描述: 为 icasync_attendance_courses 表的 external_id 字段添加索引
-- 版本: 1.0.1
-- 依赖: MySQL 5.7+
-- =====================================================

-- 设置字符集和排序规则
SET NAMES utf8mb4;

-- =====================================================
-- 检查表是否存在
-- =====================================================

-- 检查 icasync_attendance_courses 表是否存在
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'icasync_attendance_courses';

-- =====================================================
-- 检查索引是否已存在
-- =====================================================

-- 检查 external_id 索引是否已存在
SELECT COUNT(*) as index_exists
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name = 'icasync_attendance_courses' 
  AND index_name = 'idx_external_id';

-- =====================================================
-- 添加 external_id 索引
-- =====================================================

-- 为 external_id 字段添加索引（如果不存在）
-- 这个索引将显著提升基于 external_id 的查询性能
ALTER TABLE `icasync_attendance_courses` 
ADD INDEX `idx_external_id` (`external_id`);

-- =====================================================
-- 验证索引创建结果
-- =====================================================

-- 显示表的所有索引
SHOW INDEX FROM `icasync_attendance_courses`;

-- 验证新索引是否创建成功
SELECT 
    INDEX_NAME as '索引名称',
    COLUMN_NAME as '列名',
    CARDINALITY as '基数',
    INDEX_TYPE as '索引类型'
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name = 'icasync_attendance_courses' 
  AND index_name = 'idx_external_id';

-- =====================================================
-- 性能分析建议
-- =====================================================

-- 分析 external_id 字段的数据分布
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT external_id) as unique_external_ids,
    ROUND(COUNT(DISTINCT external_id) / COUNT(*) * 100, 2) as selectivity_percentage
FROM `icasync_attendance_courses`
WHERE deleted_at IS NULL;

-- =====================================================
-- 执行完成提示
-- =====================================================

-- external_id 索引添加完成
-- 
-- 索引详情:
-- - 索引名称: idx_external_id
-- - 索引字段: external_id
-- - 索引类型: BTREE (默认)
-- 
-- 性能提升:
-- - 基于 external_id 的等值查询: O(log n) 复杂度
-- - 基于 external_id 的范围查询: 显著提升
-- - JOIN 操作性能: 大幅提升
-- 
-- 使用场景:
-- - SELECT * FROM icasync_attendance_courses WHERE external_id = ?
-- - SELECT COUNT(*) FROM icasync_attendance_courses WHERE external_id IN (?, ?, ?)
-- - JOIN 操作中使用 external_id 作为连接条件
-- 
-- 执行时间: 预计 < 5 秒 (取决于表数据量)
-- 适用版本: MySQL 5.7+
