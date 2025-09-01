-- =====================================================
-- @wps/app-icalink 修改请假申请表结构
-- 删除不必要的必填字段，简化表结构
-- 创建时间: 2025-08-30
-- 版本: 1.0.2
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 删除不必要的必填字段
ALTER TABLE `icalink_leave_applications`
DROP COLUMN `class_date`,
DROP COLUMN `class_time`,
DROP COLUMN `class_location`;

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 修改说明：
-- 1. 删除了 class_date 字段（上课日期）
-- 2. 删除了 class_time 字段（上课时间）  
-- 3. 删除了 class_location 字段（上课地点）
-- 4. 这些信息可以通过关联的课程表获取，无需在请假表中重复存储
-- =====================================================