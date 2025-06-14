-- @stratix/queue 数据库迁移脚本
-- 版本：2.2 - 添加失败状态支持
-- 用途：为现有数据库添加失败任务处理功能

-- ============================================================================
-- 1. 为 queue_jobs 表添加错误信息字段
-- ============================================================================

-- 添加错误信息字段
ALTER TABLE queue_jobs 
ADD COLUMN error_message TEXT NULL COMMENT '错误消息',
ADD COLUMN error_stack TEXT NULL COMMENT '错误堆栈',
ADD COLUMN error_code VARCHAR(100) NULL COMMENT '错误代码',
ADD COLUMN failed_at TIMESTAMP NULL COMMENT '失败时间';

-- ============================================================================
-- 2. 更新状态约束，添加 'failed' 状态
-- ============================================================================

-- 删除旧的状态约束
ALTER TABLE queue_jobs DROP CONSTRAINT chk_queue_jobs_status;

-- 添加新的状态约束（包含 failed 状态）
ALTER TABLE queue_jobs 
ADD CONSTRAINT chk_queue_jobs_status 
CHECK (status IN ('waiting', 'executing', 'delayed', 'paused', 'failed'));

-- ============================================================================
-- 3. 更新表注释
-- ============================================================================

ALTER TABLE queue_jobs 
COMMENT = '队列任务运行时表，存储等待执行、正在执行、延迟执行和失败的任务';

-- ============================================================================
-- 4. 移除成功表的 metadata 字段（如果存在）
-- ============================================================================

-- 检查并删除 metadata 字段
SET @sql = (
    SELECT IF(
        COUNT(*) > 0,
        'ALTER TABLE queue_success DROP COLUMN metadata;',
        'SELECT "metadata column does not exist in queue_success table";'
    )
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'queue_success' 
    AND COLUMN_NAME = 'metadata'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- 5. 添加新的索引以优化失败任务查询
-- ============================================================================

-- 为失败任务查询添加索引
CREATE INDEX idx_queue_jobs_failed_status 
    ON queue_jobs (status, failed_at DESC) 
    WHERE status = 'failed';

-- 为错误代码查询添加索引
CREATE INDEX idx_queue_jobs_error_code 
    ON queue_jobs (error_code) 
    WHERE error_code IS NOT NULL;

-- ============================================================================
-- 6. 数据迁移完成提示
-- ============================================================================

SELECT 'Queue database migration completed successfully!' as message; 