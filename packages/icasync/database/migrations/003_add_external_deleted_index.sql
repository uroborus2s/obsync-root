-- =====================================================
-- @stratix/icasync 数据库迁移脚本
-- =====================================================
-- 文件名: 003_add_external_deleted_index.sql
-- 创建时间: 2025-09-26
-- 描述: 为 icasync_attendance_courses 表添加 external_id + deleted_at 复合索引
-- 版本: 1.0.2
-- 依赖: MySQL 5.7+
-- =====================================================

-- 设置字符集和排序规则
SET NAMES utf8mb4;

-- =====================================================
-- 检查索引是否已存在
-- =====================================================

-- 检查 idx_external_deleted 索引是否已存在
SELECT COUNT(*) as index_exists
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name = 'icasync_attendance_courses' 
  AND index_name = 'idx_external_deleted';

-- =====================================================
-- 添加复合索引
-- =====================================================

-- 为 external_id + deleted_at 字段添加复合索引
-- 这个索引将显著提升基于 external_id 查询且需要过滤软删除记录的性能
ALTER TABLE `icasync_attendance_courses` 
ADD INDEX `idx_external_deleted` (`external_id`, `deleted_at`);

-- =====================================================
-- 验证索引创建结果
-- =====================================================

-- 验证新索引是否创建成功
SELECT 
    INDEX_NAME as '索引名称',
    COLUMN_NAME as '列名',
    SEQ_IN_INDEX as '列序号',
    CARDINALITY as '基数',
    INDEX_TYPE as '索引类型'
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name = 'icasync_attendance_courses' 
  AND index_name = 'idx_external_deleted'
ORDER BY SEQ_IN_INDEX;

-- =====================================================
-- 性能分析
-- =====================================================

-- 分析复合索引的效果
EXPLAIN SELECT * 
FROM `icasync_attendance_courses` 
WHERE external_id = 'test_external_id' 
  AND deleted_at IS NULL;

-- =====================================================
-- 执行完成提示
-- =====================================================

-- idx_external_deleted 复合索引添加完成
-- 
-- 索引详情:
-- - 索引名称: idx_external_deleted
-- - 索引字段: external_id, deleted_at
-- - 索引类型: BTREE (默认)
-- 
-- 性能提升场景:
-- - WHERE external_id = ? AND deleted_at IS NULL
-- - WHERE external_id = ? AND deleted_at IS NOT NULL
-- - WHERE external_id IN (?, ?, ?) AND deleted_at IS NULL
-- - ORDER BY external_id, deleted_at
-- 
-- 执行时间: 预计 < 5 秒 (取决于表数据量)
