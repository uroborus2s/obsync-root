-- ============================================================================
-- 🛡️ 安全创建 queue_success 表索引脚本
-- 会先检查索引是否存在，避免重复创建错误
-- ============================================================================

DELIMITER $$

-- 检查并创建索引的存储过程
CREATE PROCEDURE IF NOT EXISTS CreateIndexIfNotExists(
    IN idx_name VARCHAR(128),
    IN table_name VARCHAR(128), 
    IN idx_definition TEXT
)
BEGIN
    DECLARE idx_count INT DEFAULT 0;
    
    -- 检查索引是否已存在
    SELECT COUNT(*)
    INTO idx_count
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name
      AND INDEX_NAME = idx_name;
    
    -- 如果索引不存在则创建
    IF idx_count = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', idx_name, ' ON ', table_name, ' ', idx_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('✅ 已创建索引: ', idx_name) as result;
    ELSE
        SELECT CONCAT('⚠️  索引已存在: ', idx_name) as result;
    END IF;
END$$

DELIMITER ;

-- 执行索引创建
SELECT '🚀 开始安全创建 queue_success 表索引...' as status;

CALL CreateIndexIfNotExists(
    'idx_queue_success_queue_time',
    'queue_success', 
    '(queue_name, completed_at DESC)'
);

CALL CreateIndexIfNotExists(
    'idx_queue_success_group_time',
    'queue_success',
    '(group_id, completed_at DESC)'
);

CALL CreateIndexIfNotExists(
    'idx_queue_success_completed_at',
    'queue_success',
    '(completed_at DESC)'
);

CALL CreateIndexIfNotExists(
    'idx_queue_success_queue_group_time',
    'queue_success',
    '(queue_name, group_id, completed_at DESC)'
);

-- 清理存储过程
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;

-- 更新表统计信息
ANALYZE TABLE queue_success;

-- 显示最终结果
SELECT 
    '🎉 queue_success 表索引优化完成!' as status,
    CONCAT('当前共有 ', COUNT(DISTINCT INDEX_NAME) - 1, ' 个索引') as index_count
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'queue_success';

-- 显示所有索引详情
SELECT 
    '📊 当前索引列表:' as section;
    
SELECT 
    INDEX_NAME as '索引名称',
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as '索引列',
    INDEX_TYPE as '类型'
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'queue_success'
  AND INDEX_NAME != 'PRIMARY'
GROUP BY INDEX_NAME, INDEX_TYPE
ORDER BY INDEX_NAME; 