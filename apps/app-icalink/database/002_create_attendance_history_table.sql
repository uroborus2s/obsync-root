-- =====================================================
-- @wps/app-icalink 考勤历史记录表
-- 用于存储历史课程的考勤记录（当天之前的课程）
-- 创建时间: 2025-01-25
-- 版本: 1.0.0
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 学生签到历史记录表 (icalink_attendance_records_history)
-- 存储历史课程的签到记录，与 icalink_attendance_records 表结构完全相同
-- =====================================================

DROP TABLE IF EXISTS `icalink_attendance_records_history`;

CREATE TABLE `icalink_attendance_records_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `attendance_course_id` bigint(20) NOT NULL COMMENT '关联签到课程ID(icasync_attendance_courses.id)',
  `student_id` varchar(100) NOT NULL COMMENT '学生ID(out_xsxx.xh)',
  `student_name` varchar(200) NOT NULL COMMENT '学生姓名',
  `class_name` varchar(200) COMMENT '班级名称',
  `major_name` varchar(200) COMMENT '专业名称',
  `status` enum('not_started','present','absent','leave','pending_approval','leave_pending','late') NOT NULL DEFAULT 'not_started' COMMENT '签到状态',
  `checkin_time` datetime NULL COMMENT '签到时间',
  `checkin_location` varchar(500) COMMENT '签到位置描述',
  `checkin_latitude` decimal(10,7) NULL COMMENT '签到纬度',
  `checkin_longitude` decimal(10,7) NULL COMMENT '签到经度',
  `checkin_accuracy` int(11) NULL COMMENT '位置精度(米)',
  `ip_address` varchar(45) COMMENT '签到IP地址',
  `user_agent` varchar(1000) COMMENT '用户代理信息',
  `is_late` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否迟到',
  `late_minutes` int(11) NULL COMMENT '迟到分钟数',
  `remark` text COMMENT '备注信息',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) COMMENT '创建人',
  `updated_by` varchar(100) COMMENT '更新人',
  `metadata` json DEFAULT NULL COMMENT '扩展元数据',
  `archived_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '归档时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_course_student` (`attendance_course_id`, `student_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`),
  KEY `idx_checkin_time` (`checkin_time`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_archived_at` (`archived_at`),
  KEY `idx_student_status` (`student_id`, `status`),
  KEY `idx_course_status` (`attendance_course_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='学生签到历史记录表-存储历史课程的签到数据';

SET FOREIGN_KEY_CHECKS = 1;

