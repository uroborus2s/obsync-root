-- =====================================================
-- @wps/app-icalink 修复请假申请外键约束
-- 临时移除外键约束，允许在没有签到记录的情况下创建请假申请
-- 创建时间: 2025-08-30
-- 版本: 1.0.1
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 移除请假申请表的外键约束
ALTER TABLE `icalink_leave_applications`
DROP FOREIGN KEY `fk_leave_applications_attendance_record`;

-- 修改 attendance_record_id 字段为可空
ALTER TABLE `icalink_leave_applications`
MODIFY COLUMN `attendance_record_id` bigint(20) NULL COMMENT '关联签到记录ID(可为空)';

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 修复说明：
-- 1. 移除了请假申请表的外键约束
-- 2. 将 attendance_record_id 字段改为可空
-- 3. 这样允许学生在没有签到记录的情况下直接申请请假
-- =====================================================