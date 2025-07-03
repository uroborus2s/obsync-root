-- =====================================================
-- 任务系统数据库迁移脚本
-- 功能：为 running_tasks 和 completed_tasks 表添加子任务计数字段
-- 版本：v1.0.0
-- 日期：2025-01-09
-- =====================================================

-- 设置字符集和SQL模式
SET NAMES utf8mb4;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

-- 开始事务
START TRANSACTION;

-- =====================================================
-- 1. 为 running_tasks 表添加字段
-- =====================================================

-- 检查并添加 total_children 字段
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'running_tasks' 
   AND COLUMN_NAME = 'total_children') = 0,
  'ALTER TABLE running_tasks ADD COLUMN total_children int NOT NULL DEFAULT 0 COMMENT "总计子任务数量" AFTER progress',
  'SELECT "total_children field already exists in running_tasks" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 completed_children 字段
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'running_tasks' 
   AND COLUMN_NAME = 'completed_children') = 0,
  'ALTER TABLE running_tasks ADD COLUMN completed_children int NOT NULL DEFAULT 0 COMMENT "已完成子任务数量" AFTER total_children',
  'SELECT "completed_children field already exists in running_tasks" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. 为 completed_tasks 表添加字段
-- =====================================================

-- 检查并添加 total_children 字段
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'completed_tasks' 
   AND COLUMN_NAME = 'total_children') = 0,
  'ALTER TABLE completed_tasks ADD COLUMN total_children int NOT NULL DEFAULT 0 COMMENT "总计子任务数量" AFTER progress',
  'SELECT "total_children field already exists in completed_tasks" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 completed_children 字段
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'completed_tasks' 
   AND COLUMN_NAME = 'completed_children') = 0,
  'ALTER TABLE completed_tasks ADD COLUMN completed_children int NOT NULL DEFAULT 0 COMMENT "已完成子任务数量" AFTER total_children',
  'SELECT "completed_children field already exists in completed_tasks" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. 数据迁移和初始化
-- =====================================================

-- 为现有任务计算并更新 total_children 字段
UPDATE running_tasks r1 
SET total_children = (
    SELECT COUNT(*) 
    FROM running_tasks r2 
    WHERE r2.parent_id = r1.id
)
WHERE r1.id IN (
    SELECT DISTINCT parent_id 
    FROM running_tasks 
    WHERE parent_id IS NOT NULL
);

-- 为现有任务计算并更新 completed_children 字段
-- 注意：由于 running_tasks 表中的任务都还在运行中，completed_children 保持为 0
-- 实际的 completed_children 会在任务完成并迁移到 completed_tasks 时更新

-- 为 completed_tasks 表的现有数据计算字段值
UPDATE completed_tasks c1 
SET total_children = (
    SELECT COUNT(*) 
    FROM completed_tasks c2 
    WHERE c2.parent_id = c1.id
)
WHERE c1.id IN (
    SELECT DISTINCT parent_id 
    FROM completed_tasks 
    WHERE parent_id IS NOT NULL
);

-- 为 completed_tasks 表计算已完成子任务数量
-- 由于在 completed_tasks 中的都是已完成任务，所以 completed_children = total_children
UPDATE completed_tasks 
SET completed_children = total_children 
WHERE total_children > 0;

-- =====================================================
-- 4. 添加索引优化查询性能
-- =====================================================

-- 为 running_tasks 表添加复合索引
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'running_tasks' 
   AND INDEX_NAME = 'idx_children_progress') = 0,
  'ALTER TABLE running_tasks ADD INDEX idx_children_progress (total_children, completed_children, progress)',
  'SELECT "idx_children_progress already exists in running_tasks" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为 completed_tasks 表添加复合索引
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'completed_tasks' 
   AND INDEX_NAME = 'idx_children_progress') = 0,
  'ALTER TABLE completed_tasks ADD INDEX idx_children_progress (total_children, completed_children, progress)',
  'SELECT "idx_children_progress already exists in completed_tasks" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 5. 验证迁移结果
-- =====================================================

-- 验证字段创建
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN ('running_tasks', 'completed_tasks')
  AND COLUMN_NAME IN ('total_children', 'completed_children')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- 验证数据统计
SELECT 
    'running_tasks' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN total_children > 0 THEN 1 END) as records_with_children,
    MAX(total_children) as max_children,
    AVG(total_children) as avg_children
FROM running_tasks
UNION ALL
SELECT 
    'completed_tasks' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN total_children > 0 THEN 1 END) as records_with_children,
    MAX(total_children) as max_children,
    AVG(total_children) as avg_children
FROM completed_tasks;

-- 验证索引创建
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN ('running_tasks', 'completed_tasks')
  AND INDEX_NAME = 'idx_children_progress'
GROUP BY TABLE_NAME, INDEX_NAME;

-- 提交事务
COMMIT;

-- 输出完成信息
SELECT 
    '数据库迁移完成' as status,
    '已为 running_tasks 和 completed_tasks 表添加子任务计数字段' as description,
    NOW() as completed_at;

-- =====================================================
-- 迁移脚本使用说明
-- =====================================================
/*
使用方法：
1. 备份数据库：mysqldump -u username -p database_name > backup.sql
2. 执行迁移：mysql -u username -p database_name < migration_add_children_fields.sql
3. 验证结果：检查新字段是否正确添加，数据是否正确初始化

注意事项：
1. 此脚本是幂等的，可以安全地重复执行
2. 脚本会自动检查字段是否已存在，避免重复添加
3. 现有数据会自动计算并填充新字段值
4. 添加了性能优化索引

回滚方法（如果需要）：
ALTER TABLE running_tasks DROP COLUMN completed_children;
ALTER TABLE running_tasks DROP COLUMN total_children;
ALTER TABLE completed_tasks DROP COLUMN completed_children;
ALTER TABLE completed_tasks DROP COLUMN total_children;
*/ 