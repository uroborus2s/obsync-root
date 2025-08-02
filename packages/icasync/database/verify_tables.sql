-- =====================================================
-- @stratix/icasync 数据表验证脚本
-- =====================================================
-- 文件名: verify_tables.sql
-- 创建时间: 2024-01-15
-- 描述: 验证 icasync 插件数据表是否正确创建
-- 用途: 在执行建表脚本后运行此脚本进行验证
-- =====================================================

-- 设置输出格式
\G

-- =====================================================
-- 1. 检查所有 icasync 相关表是否存在
-- =====================================================

SELECT 
    TABLE_NAME as '表名',
    TABLE_COMMENT as '表注释',
    ENGINE as '存储引擎',
    TABLE_COLLATION as '排序规则',
    CREATE_TIME as '创建时间'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%'
ORDER BY TABLE_NAME;

-- =====================================================
-- 2. 验证表结构 - icasync_calendar_mapping
-- =====================================================

SELECT '=== icasync_calendar_mapping 表结构验证 ===' as '';

DESCRIBE icasync_calendar_mapping;

SELECT '--- 索引信息 ---' as '';
SHOW INDEX FROM icasync_calendar_mapping;

-- =====================================================
-- 3. 验证表结构 - icasync_schedule_mapping
-- =====================================================

SELECT '=== icasync_schedule_mapping 表结构验证 ===' as '';

DESCRIBE icasync_schedule_mapping;

SELECT '--- 索引信息 ---' as '';
SHOW INDEX FROM icasync_schedule_mapping;

-- =====================================================
-- 4. 验证表结构 - icasync_user_view
-- =====================================================

SELECT '=== icasync_user_view 表结构验证 ===' as '';

DESCRIBE icasync_user_view;

SELECT '--- 索引信息 ---' as '';
SHOW INDEX FROM icasync_user_view;

-- =====================================================
-- 5. 验证表结构 - icasync_calendar_participants
-- =====================================================

SELECT '=== icasync_calendar_participants 表结构验证 ===' as '';

DESCRIBE icasync_calendar_participants;

SELECT '--- 索引信息 ---' as '';
SHOW INDEX FROM icasync_calendar_participants;

-- =====================================================
-- 6. 验证表结构 - icasync_sync_tasks
-- =====================================================

SELECT '=== icasync_sync_tasks 表结构验证 ===' as '';

DESCRIBE icasync_sync_tasks;

SELECT '--- 索引信息 ---' as '';
SHOW INDEX FROM icasync_sync_tasks;

-- =====================================================
-- 7. 验证约束和索引统计
-- =====================================================

SELECT '=== 约束和索引统计 ===' as '';

SELECT 
    TABLE_NAME as '表名',
    CONSTRAINT_NAME as '约束名',
    CONSTRAINT_TYPE as '约束类型'
FROM information_schema.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%'
ORDER BY TABLE_NAME, CONSTRAINT_TYPE;

-- =====================================================
-- 8. 验证字段统计
-- =====================================================

SELECT '=== 字段统计信息 ===' as '';

SELECT 
    TABLE_NAME as '表名',
    COUNT(*) as '字段数量',
    SUM(CASE WHEN IS_NULLABLE = 'NO' THEN 1 ELSE 0 END) as '必填字段数',
    SUM(CASE WHEN COLUMN_DEFAULT IS NOT NULL THEN 1 ELSE 0 END) as '有默认值字段数'
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%'
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;

-- =====================================================
-- 9. 验证 ENUM 字段值
-- =====================================================

SELECT '=== ENUM 字段验证 ===' as '';

SELECT 
    TABLE_NAME as '表名',
    COLUMN_NAME as '字段名',
    COLUMN_TYPE as '字段类型'
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%'
  AND DATA_TYPE = 'enum'
ORDER BY TABLE_NAME, COLUMN_NAME;

-- =====================================================
-- 10. 验证 JSON 字段
-- =====================================================

SELECT '=== JSON 字段验证 ===' as '';

SELECT 
    TABLE_NAME as '表名',
    COLUMN_NAME as '字段名',
    IS_NULLABLE as '可为空',
    COLUMN_DEFAULT as '默认值'
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%'
  AND DATA_TYPE = 'json'
ORDER BY TABLE_NAME, COLUMN_NAME;

-- =====================================================
-- 11. 验证时间戳字段
-- =====================================================

SELECT '=== 时间戳字段验证 ===' as '';

SELECT 
    TABLE_NAME as '表名',
    COLUMN_NAME as '字段名',
    COLUMN_DEFAULT as '默认值',
    EXTRA as '额外属性'
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%'
  AND DATA_TYPE = 'timestamp'
ORDER BY TABLE_NAME, COLUMN_NAME;

-- =====================================================
-- 12. 测试插入和查询（可选）
-- =====================================================

SELECT '=== 基础功能测试 ===' as '';

-- 测试 icasync_calendar_mapping 表
INSERT INTO icasync_calendar_mapping (kkh, xnxq, calendar_id, calendar_name) 
VALUES ('TEST001', '2024-2025-1', 'cal_test_001', '测试课程日历');

SELECT '插入测试数据成功 - icasync_calendar_mapping' as '';

-- 查询测试
SELECT id, kkh, xnxq, calendar_id, sync_status, created_at 
FROM icasync_calendar_mapping 
WHERE kkh = 'TEST001';

-- 清理测试数据
DELETE FROM icasync_calendar_mapping WHERE kkh = 'TEST001';

SELECT '清理测试数据完成' as '';

-- =====================================================
-- 13. 验证完成总结
-- =====================================================

SELECT '=== 验证完成总结 ===' as '';

SELECT 
    COUNT(*) as '创建的表数量'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%';

SELECT 
    SUM(CASE WHEN CONSTRAINT_TYPE = 'PRIMARY KEY' THEN 1 ELSE 0 END) as '主键约束数',
    SUM(CASE WHEN CONSTRAINT_TYPE = 'UNIQUE' THEN 1 ELSE 0 END) as '唯一约束数'
FROM information_schema.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%';

SELECT 
    COUNT(*) as '总索引数'
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%';

-- =====================================================
-- 验证脚本执行完成
-- =====================================================

SELECT '
验证脚本执行完成！

预期结果：
- 5 个表创建成功
- 5 个主键约束
- 4 个唯一约束  
- 多个普通索引
- 所有字段类型正确
- 字符集为 utf8mb4
- 排序规则为 utf8mb4_unicode_ci

如果以上结果符合预期，说明数据表创建成功！
' as '执行结果';
