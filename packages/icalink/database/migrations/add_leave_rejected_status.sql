-- 为icalink_student_attendance表的status字段添加leave_rejected状态
-- 执行时间：2024-01-XX

-- 修改status字段的枚举值，添加leave_rejected状态
ALTER TABLE `icalink_student_attendance` 
MODIFY COLUMN `status` enum('present','leave','absent','pending_approval','leave_pending','leave_rejected') NOT NULL COMMENT '签到状态';

-- 添加索引优化查询性能（如果不存在）
-- 由于status字段已有索引，这里不需要重复添加

-- 验证修改结果
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = DATABASE() 
-- AND TABLE_NAME = 'icalink_student_attendance' 
-- AND COLUMN_NAME = 'status'; 