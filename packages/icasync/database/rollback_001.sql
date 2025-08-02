-- =====================================================
-- @stratix/icasync 数据库回滚脚本
-- =====================================================
-- 文件名: rollback_001.sql
-- 创建时间: 2024-01-15
-- 描述: 回滚 001_create_icasync_tables.sql 的变更
-- 版本: 1.0.0
-- 警告: 此操作将删除所有 icasync 相关表和数据，请谨慎执行！
-- =====================================================

-- 设置安全模式（可选，防止误操作）
-- SET SQL_SAFE_UPDATES = 1;

-- =====================================================
-- 确认操作提示
-- =====================================================

SELECT '
警告：即将删除所有 @stratix/icasync 相关数据表！

此操作将删除以下表：
1. icasync_sync_tasks - 同步任务记录表
2. icasync_calendar_participants - 日历参与者映射表  
3. icasync_user_view - 用户视图表
4. icasync_schedule_mapping - 日程映射表
5. icasync_calendar_mapping - 课程日历映射表

所有数据将永久丢失，无法恢复！

如果确认要继续，请执行后续的 DROP TABLE 语句。
如果不确定，请立即停止执行此脚本。
' as '重要提示';

-- =====================================================
-- 检查当前表状态
-- =====================================================

SELECT '=== 当前 icasync 表状态 ===' as '';

SELECT 
    TABLE_NAME as '表名',
    TABLE_ROWS as '估计行数',
    DATA_LENGTH as '数据大小(字节)',
    CREATE_TIME as '创建时间'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%'
ORDER BY TABLE_NAME;

-- =====================================================
-- 备份提醒（重要！）
-- =====================================================

SELECT '
重要提醒：在执行删除操作前，建议先备份数据！

备份命令示例：
mysqldump -h <host> -u <username> -p <database_name> \
  icasync_calendar_mapping \
  icasync_schedule_mapping \
  icasync_user_view \
  icasync_calendar_participants \
  icasync_sync_tasks \
  > icasync_backup_$(date +%Y%m%d_%H%M%S).sql

或者备份整个数据库：
mysqldump -h <host> -u <username> -p <database_name> > full_backup_$(date +%Y%m%d_%H%M%S).sql
' as '备份提醒';

-- =====================================================
-- 禁用外键检查（如果有外键约束）
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 按依赖关系顺序删除表
-- 注意：按照依赖关系的逆序删除，避免外键约束错误
-- =====================================================

-- 1. 删除同步任务记录表（最上层，无依赖）
DROP TABLE IF EXISTS `icasync_sync_tasks`;
SELECT 'icasync_sync_tasks 表已删除' as '删除状态';

-- 2. 删除日历参与者映射表（依赖日历）
DROP TABLE IF EXISTS `icasync_calendar_participants`;
SELECT 'icasync_calendar_participants 表已删除' as '删除状态';

-- 3. 删除用户视图表（独立表）
DROP TABLE IF EXISTS `icasync_user_view`;
SELECT 'icasync_user_view 表已删除' as '删除状态';

-- 4. 删除日程映射表（依赖日历）
DROP TABLE IF EXISTS `icasync_schedule_mapping`;
SELECT 'icasync_schedule_mapping 表已删除' as '删除状态';

-- 5. 删除课程日历映射表（基础表）
DROP TABLE IF EXISTS `icasync_calendar_mapping`;
SELECT 'icasync_calendar_mapping 表已删除' as '删除状态';

-- =====================================================
-- 恢复外键检查
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 验证删除结果
-- =====================================================

SELECT '=== 删除结果验证 ===' as '';

SELECT 
    COUNT(*) as '剩余icasync表数量'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%';

-- 如果还有剩余表，显示详情
SELECT 
    TABLE_NAME as '未删除的表'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE 'icasync_%';

-- =====================================================
-- 清理相关权限（如果有）
-- =====================================================

-- 注意：如果有专门为 icasync 表创建的用户权限，可能需要手动清理
-- 这里只是提醒，具体命令需要根据实际情况调整

SELECT '
权限清理提醒：
如果为 icasync 表创建了专门的数据库用户或权限，
请手动检查并清理相关权限设置。

检查权限命令：
SHOW GRANTS FOR ''username''@''host'';

撤销权限命令示例：
REVOKE ALL PRIVILEGES ON database_name.icasync_* FROM ''username''@''host'';
' as '权限清理提醒';

-- =====================================================
-- 回滚完成总结
-- =====================================================

SELECT '
=== 回滚操作完成 ===

已删除的表：
✓ icasync_sync_tasks
✓ icasync_calendar_participants  
✓ icasync_user_view
✓ icasync_schedule_mapping
✓ icasync_calendar_mapping

后续操作建议：
1. 检查应用程序配置，确保不再引用这些表
2. 清理相关的数据库连接配置
3. 如果需要重新创建，请执行 001_create_icasync_tables.sql
4. 如果有备份数据需要恢复，请使用备份文件

注意事项：
- 所有 icasync 相关数据已永久删除
- 如果应用程序正在运行，可能需要重启
- 建议在测试环境先验证回滚效果

回滚脚本执行完成！
' as '回滚总结';

-- =====================================================
-- 执行完成时间戳
-- =====================================================

SELECT 
    NOW() as '回滚完成时间',
    USER() as '执行用户',
    DATABASE() as '目标数据库';
