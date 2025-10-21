-- Stratix Migration Script
-- Target: @wps/app-icalink
-- Version: 2
-- Description: Add tables and columns for anti-cheating and statistics features.

--
-- Table structure for table `icalink_verification_windows`
--
CREATE TABLE `icalink_verification_windows` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `window_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID，用于API调用和关联',
  `course_id` bigint(20) NOT NULL COMMENT '关联课程ID',
  `external_id` varchar(100) NOT NULL COMMENT '关联外部ID',
  `verification_round` int(11) NOT NULL DEFAULT 1 COMMENT '验证轮次',
  `open_time` datetime NOT NULL COMMENT '窗口开启时间',
  `close_time` datetime NOT NULL COMMENT '窗口关闭时间',
  `opened_by` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '开启人ID（教师工号）',
  `status` enum('open','closed','cancelled','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open' COMMENT '窗口状态(closed:教师手动关闭, cancelled:被新验证覆盖, expired:超时自动关闭)',
  `duration_minutes` int(11) NOT NULL DEFAULT 3 COMMENT '持续时长（分钟）',
  `expected_checkin_count` int(11) NOT NULL DEFAULT 0 COMMENT '预期签到人数',
  `actual_checkin_count` int(11) NOT NULL DEFAULT 0 COMMENT '实际签到人数',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_window_id` (`window_id`),
  KEY `idx_course_status` (`course_id`, `status`),
  KEY `idx_external_id` (`external_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='验证签到窗口表';

--
-- Table structure for table `icalink_course_checkin_stats`
--
CREATE TABLE `icalink_course_checkin_stats` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `stat_date` date NOT NULL COMMENT '统计日期',
  `course_id` bigint(20) NOT NULL COMMENT '课程ID (课节ID)',
  `external_id` varchar(100) NOT NULL COMMENT '关联外部ID',
  `course_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '课程代码 (关联教学班)',
  `course_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '课程名称',
  `class_location` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上课地址(教学楼+教室)',
  `teacher_name` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '教师姓名',
  `teacher_codes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '教师工号列表(逗号分隔)',
  `semester` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学年学期',
  `teaching_week` int(11) NOT NULL COMMENT '教学周(来自juhe_renwu.jxz)',
  `week_day` int(11) NOT NULL COMMENT '周次-星期几(来自juhe_renwu.zc)',
  `time_period` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '时间段(am/pm)',
  `periods` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '节次',
  `start_time` datetime NOT NULL COMMENT '开始时间(RFC3339格式)',
  `end_time` datetime NOT NULL COMMENT '结束时间(RFC3339格式)',
  `total_should_attend` int(11) NOT NULL DEFAULT 0 COMMENT '应到人数',
  `present_count` int(11) NOT NULL DEFAULT 0 COMMENT '实到人数',
  `absent_count` int(11) NOT NULL DEFAULT 0 COMMENT '缺勤人数',
  `truant_count` int(11) NOT NULL DEFAULT 0 COMMENT '旷课人数',
  `leave_count` int(11) NOT NULL DEFAULT 0 COMMENT '请假人数',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date_course` (`stat_date`, `course_id`),
  KEY `idx_course_code` (`course_code`),
  KEY `idx_external_id` (`external_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程签到统计历史表';

--
-- Table structure for table `icalink_absent_student_relations`
--
CREATE TABLE `icalink_absent_student_relations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `course_stats_id` bigint(20) NOT NULL COMMENT '关联课程统计ID',
  `course_id` bigint(20) NOT NULL COMMENT '课程ID (课节ID)',
  `external_id` varchar(100) NOT NULL COMMENT '关联外部ID',
  `course_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '课程代码 (关联教学班)',
  `course_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '课程名称',
  `student_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '学院名称',
  `class_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '班级名称',
  `major_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '专业名称',
  `absence_type` enum('absent','truant','leave','leave_pending') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '缺勤类型',
  `stat_date` date NOT NULL,
  `semester` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学年学期',
  `teaching_week` int(11) NOT NULL COMMENT '教学周(来自juhe_renwu.jxz)',
  `week_day` int(11) NOT NULL COMMENT '周次-星期几(来自juhe_renwu.zc)',
  `periods` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '节次',
  `time_period` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '时间段(am/pm)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_course_stats` (`course_stats_id`),
  KEY `idx_external_id` (`external_id`),
  KEY `idx_student_external_id` (`student_id`, `external_id`),
  KEY `idx_student_queries` (`student_id`, `course_code`, `absence_type`),
  KEY `idx_teacher_queries` (`course_code`, `stat_date`),
  CONSTRAINT `fk_relations_stats` FOREIGN KEY (`course_stats_id`) REFERENCES `icalink_course_checkin_stats` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='历史缺勤人员关联表';

--
-- Table structure for table `icalink_attendance_records_history`
--
CREATE TABLE `icalink_attendance_records_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `attendance_course_id` bigint(20) NOT NULL COMMENT '关联课程ID',
  `student_id` varchar(100) NOT NULL COMMENT '学生ID',
  `student_name` varchar(200) NOT NULL COMMENT '学生姓名',
  `class_name` varchar(200) DEFAULT NULL COMMENT '班级名称',
  `major_name` varchar(200) DEFAULT NULL COMMENT '专业名称',
  `status` enum('not_started','present','absent','leave','pending_approval','leave_pending','late','truant') NOT NULL DEFAULT 'not_started' COMMENT '签到状态 (v7 新增 truant)',
  `checkin_time` datetime DEFAULT NULL COMMENT '签到时间',
  `checkin_location` varchar(500) DEFAULT NULL COMMENT '签到位置描述',
  `checkin_latitude` decimal(10,7) DEFAULT NULL COMMENT '签到纬度',
  `checkin_longitude` decimal(10,7) DEFAULT NULL COMMENT '签到经度',
  `checkin_accuracy` int(11) DEFAULT NULL COMMENT '位置精度(米)',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '签到IP地址',
  `user_agent` varchar(1000) DEFAULT NULL COMMENT '用户代理信息',
  `is_late` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否迟到',
  `late_minutes` int(11) DEFAULT NULL COMMENT '迟到分钟数',
  `remark` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建人',
  `updated_by` varchar(100) DEFAULT NULL COMMENT '更新人',
  `metadata` json DEFAULT NULL COMMENT '扩展元数据',
  `last_checkin_source` enum('regular','window','manual') DEFAULT NULL COMMENT '最后签到来源',
  `last_checkin_reason` varchar(255) DEFAULT NULL COMMENT '最后签到原因说明',
  `manual_override_by` varchar(100) DEFAULT NULL COMMENT '手动补卡人（教师ID）',
  `manual_override_time` datetime DEFAULT NULL COMMENT '手动补卡时间',
  `manual_override_reason` varchar(500) DEFAULT NULL COMMENT '手动补卡原因说明',
  `auto_marked_at` datetime DEFAULT NULL COMMENT '系统自动标记时间',
  `window_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联的验证签到窗口ID',
  PRIMARY KEY (`id`),
  KEY `idx_course_student_hist` (`attendance_course_id`,`student_id`),
  KEY `idx_student_id_hist` (`student_id`),
  KEY `idx_status_hist` (`status`),
  KEY `idx_checkin_time_hist` (`checkin_time`),
  KEY `idx_created_at_hist` (`created_at`),
  KEY `idx_window_id_hist` (`window_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生签到记录历史归档表';


--
-- Alter table `icalink_attendance_records`
--
ALTER TABLE `icalink_attendance_records`
  MODIFY `status` enum('not_started','present','absent','leave','pending_approval','leave_pending','late','truant') NOT NULL DEFAULT 'not_started' COMMENT '签到状态 (v7 新增 truant)',
  ADD `last_checkin_source` enum('regular','window','manual') DEFAULT NULL COMMENT '最后签到来源' AFTER `metadata`,
  ADD `last_checkin_reason` VARCHAR(255) DEFAULT NULL COMMENT '最后签到原因说明' AFTER `last_checkin_source`,
  ADD `manual_override_by` varchar(100) DEFAULT NULL COMMENT '手动补卡人（教师ID）' AFTER `last_checkin_reason`,
  ADD `manual_override_time` datetime DEFAULT NULL COMMENT '手动补卡时间' AFTER `manual_override_by`,
  ADD `manual_override_reason` varchar(500) DEFAULT NULL COMMENT '手动补卡原因说明' AFTER `manual_override_time`,
  ADD `auto_marked_at` DATETIME DEFAULT NULL COMMENT '系统自动标记时间' AFTER `manual_override_reason`,
  ADD `window_id` CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联的验证签到窗口ID' AFTER `auto_marked_at`,
  ADD INDEX `idx_window_id` (`window_id`),