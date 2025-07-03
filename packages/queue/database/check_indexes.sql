-- ============================================================================
-- 📊 检查 queue_success 表索引状态
-- ============================================================================

-- 查看表的基本信息
SELECT 
    table_name as '表名',
    table_rows as '大概行数',
    ROUND(data_length/1024/1024, 2) as '数据大小(MB)',
    ROUND(index_length/1024/1024, 2) as '索引大小(MB)'
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'queue_success';

-- 查看所有索引
SELECT 
    INDEX_NAME as '索引名称',
    COLUMN_NAME as '索引列',
    SEQ_IN_INDEX as '列序号',
    INDEX_TYPE as '索引类型',
    CARDINALITY as '基数估计'
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
  AND table_name = 'queue_success'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- 检查我们需要的核心索引是否存在
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
              AND table_name = 'queue_success' 
              AND index_name = 'idx_queue_success_queue_time'
        ) THEN '✅ 已存在' 
        ELSE '❌ 不存在' 
    END as 'idx_queue_success_queue_time',
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
              AND table_name = 'queue_success' 
              AND index_name = 'idx_queue_success_group_time'
        ) THEN '✅ 已存在' 
        ELSE '❌ 不存在' 
    END as 'idx_queue_success_group_time',
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
              AND table_name = 'queue_success' 
              AND index_name = 'idx_queue_success_completed_at'
        ) THEN '✅ 已存在' 
        ELSE '❌ 不存在' 
    END as 'idx_queue_success_completed_at',
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
              AND table_name = 'queue_success' 
              AND index_name = 'idx_queue_success_queue_group_time'
        ) THEN '✅ 已存在' 
        ELSE '❌ 不存在' 
    END as 'idx_queue_success_queue_group_time'; 