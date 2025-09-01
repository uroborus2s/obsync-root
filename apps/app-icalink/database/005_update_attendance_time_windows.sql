-- =====================================================
-- @wps/app-icalink 优化签到和请假时间判断逻辑
-- =====================================================
-- 文件名: 005_update_attendance_time_windows.sql
-- 创建时间: 2025-01-25
-- 描述: 优化签到时间窗口，调整请假和撤回时间判断
-- 版本: 1.0.0
-- 依赖: MySQL 5.7+
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 更新系统配置 - 签到时间窗口
-- =====================================================

-- 更新签到开始时间偏移：从-15分钟改为-10分钟（上课前10分钟）
UPDATE `icalink_system_configs` 
SET `config_value` = '-10', 
    `description` = '签到开始时间偏移(分钟)，负数表示课程开始前，优化为上课前10分钟',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `config_key` = 'attendance.checkin_window_start';

-- 更新签到结束时间偏移：从30分钟改为10分钟（上课后10分钟）
UPDATE `icalink_system_configs` 
SET `config_value` = '10', 
    `description` = '签到结束时间偏移(分钟)，正数表示课程开始后，优化为上课后10分钟',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `config_key` = 'attendance.checkin_window_end';

-- =====================================================
-- 2. 更新现有课程的签到时间窗口设置
-- =====================================================

-- 更新所有现有课程的签到开始时间偏移
UPDATE `icasync_attendance_courses` 
SET `attendance_start_offset` = -10,
    `updated_at` = CURRENT_TIMESTAMP
WHERE `attendance_start_offset` IS NULL 
   OR `attendance_start_offset` = -15 
   OR `attendance_start_offset` = 0;

-- 更新所有现有课程的签到结束时间偏移
UPDATE `icasync_attendance_courses` 
SET `attendance_end_offset` = 10,
    `updated_at` = CURRENT_TIMESTAMP
WHERE `attendance_end_offset` IS NULL 
   OR `attendance_end_offset` = 30 
   OR `attendance_end_offset` = 15;

-- =====================================================
-- 3. 添加优化说明配置
-- =====================================================

-- 插入时间窗口优化说明
INSERT INTO `icalink_system_configs` (`config_key`, `config_value`, `config_type`, `config_group`, `description`, `is_system`, `created_by`) 
VALUES 
('attendance.time_window_optimization', 'true', 'boolean', 'attendance', '签到时间窗口已优化：签到时间改为上课前10分钟到上课后10分钟，请假和撤回时间改为上课前', 1, 'system')
ON DUPLICATE KEY UPDATE 
`config_value` = 'true',
`description` = '签到时间窗口已优化：签到时间改为上课前10分钟到上课后10分钟，请假和撤回时间改为上课前',
`updated_at` = CURRENT_TIMESTAMP;

-- =====================================================
-- 4. 验证更新结果
-- =====================================================

-- 查看更新后的系统配置
SELECT config_key, config_value, description 
FROM `icalink_system_configs` 
WHERE config_key IN ('attendance.checkin_window_start', 'attendance.checkin_window_end', 'attendance.time_window_optimization');

-- 查看更新后的课程配置统计
SELECT 
    COUNT(*) as total_courses,
    COUNT(CASE WHEN attendance_start_offset = -10 THEN 1 END) as start_offset_updated,
    COUNT(CASE WHEN attendance_end_offset = 10 THEN 1 END) as end_offset_updated
FROM `icasync_attendance_courses` 
WHERE deleted_at IS NULL;

-- =====================================================
-- 恢复外键检查
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 执行完成提示
-- =====================================================

-- 签到和请假时间判断逻辑优化完成
-- 主要变更：
-- 1. 签到时间窗口：上课前10分钟到上课后10分钟
-- 2. 请假时间：上课前（前端和后端已实现）
-- 3. 撤回时间：上课前（后端已实现）
-- 4. 更新了所有相关的默认配置和现有数据
--
-- 执行时间: 预计 < 5 秒
-- 适用版本: MySQL 5.7+
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
