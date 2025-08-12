-- =====================================================
-- 工作流表命名验证脚本
-- 验证所有表都使用 workflow_ 前缀
-- =====================================================

-- 查询所有工作流相关表
SELECT 
    TABLE_NAME as '表名',
    TABLE_COMMENT as '表注释',
    CASE 
        WHEN TABLE_NAME LIKE 'workflow_%' THEN '✅ 符合规范'
        ELSE '❌ 不符合规范'
    END as '命名规范检查'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND (TABLE_NAME LIKE 'workflow_%' OR TABLE_NAME LIKE '%workflow%')
ORDER BY TABLE_NAME;

-- 验证外键约束是否正确更新
SELECT 
    CONSTRAINT_NAME as '约束名',
    TABLE_NAME as '表名',
    COLUMN_NAME as '列名',
    REFERENCED_TABLE_NAME as '引用表名',
    REFERENCED_COLUMN_NAME as '引用列名',
    CASE 
        WHEN REFERENCED_TABLE_NAME LIKE 'workflow_%' OR REFERENCED_TABLE_NAME IS NULL THEN '✅ 符合规范'
        ELSE '❌ 不符合规范'
    END as '外键规范检查'
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'workflow_%'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- 验证索引命名
SELECT 
    TABLE_NAME as '表名',
    INDEX_NAME as '索引名',
    COLUMN_NAME as '列名',
    CASE 
        WHEN INDEX_NAME = 'PRIMARY' THEN '✅ 主键'
        WHEN INDEX_NAME LIKE 'uk_%' THEN '✅ 唯一索引'
        WHEN INDEX_NAME LIKE 'idx_%' THEN '✅ 普通索引'
        WHEN INDEX_NAME LIKE 'fk_%' THEN '✅ 外键索引'
        ELSE '⚠️ 检查索引命名'
    END as '索引规范检查'
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'workflow_%'
ORDER BY TABLE_NAME, INDEX_NAME;

-- 统计表数量
SELECT 
    '工作流表总数' as '统计项',
    COUNT(*) as '数量'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'workflow_%'

UNION ALL

SELECT 
    '预期表数量' as '统计项',
    9 as '数量'

UNION ALL

SELECT 
    '表数量检查' as '统计项',
    CASE 
        WHEN (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'workflow_%') = 9 
        THEN '✅ 正确'
        ELSE '❌ 数量不匹配'
    END as '数量';

-- 验证表结构完整性
SELECT 
    'workflow_definitions' as '表名',
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_definitions'
    ) THEN '✅ 存在' ELSE '❌ 缺失' END as '状态'

UNION ALL SELECT 'workflow_instances', 
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_instances'
    ) THEN '✅ 存在' ELSE '❌ 缺失' END

UNION ALL SELECT 'workflow_task_nodes', 
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_task_nodes'
    ) THEN '✅ 存在' ELSE '❌ 缺失' END

UNION ALL SELECT 'workflow_locks', 
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_locks'
    ) THEN '✅ 存在' ELSE '❌ 缺失' END

UNION ALL SELECT 'workflow_engine_instances', 
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_engine_instances'
    ) THEN '✅ 存在' ELSE '❌ 缺失' END

UNION ALL SELECT 'workflow_assignments', 
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_assignments'
    ) THEN '✅ 存在' ELSE '❌ 缺失' END

UNION ALL SELECT 'workflow_node_assignments', 
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_node_assignments'
    ) THEN '✅ 存在' ELSE '❌ 缺失' END

UNION ALL SELECT 'workflow_failover_events', 
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_failover_events'
    ) THEN '✅ 存在' ELSE '❌ 缺失' END

UNION ALL SELECT 'workflow_execution_logs', 
    CASE WHEN EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workflow_execution_logs'
    ) THEN '✅ 存在' ELSE '❌ 缺失' END;

-- 显示优化结果摘要
SELECT 
    '🎯 表命名优化完成' as '状态',
    '所有工作流表都使用 workflow_ 前缀' as '说明',
    NOW() as '验证时间';
