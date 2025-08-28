-- =====================================================
-- @stratix/icasync 数据库表结构创建脚本
-- =====================================================
-- 文件名: 001_create_icasync_tables.sql
-- 创建时间: 2024-01-15
-- 描述: 创建 icasync 插件所需的所有数据表
-- 版本: 1.0.0
-- 依赖: MySQL 5.7+
-- =====================================================

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 课程日历映射表 (icasync_calendar_mapping)
-- 用于存储课程（kkh）与 WPS 日历 ID 的映射关系
-- =====================================================

DROP TABLE IF EXISTS `icasync_calendar_mapping`;

CREATE TABLE `icasync_calendar_mapping` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `kkh` varchar(60) NOT NULL COMMENT '开课号',
  `xnxq` varchar(20) NOT NULL COMMENT '学年学期',
  `calendar_id` varchar(100) NOT NULL COMMENT 'WPS日历ID',
  `calendar_name` varchar(200) DEFAULT NULL COMMENT '日历名称',
  `is_deleted` boolean NOT NULL DEFAULT FALSE COMMENT '软删除标志',
  `deleted_at` datetime NULL COMMENT '删除时间',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  PRIMARY KEY (`id`),
  KEY `idx_calendar_id` (`calendar_id`),
  KEY `idx_is_deleted` (`is_deleted`),
  KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程日历映射表';

-- =====================================================
-- 2. 日程映射表 (icasync_schedule_mapping)
-- 用于存储聚合任务（juhe_renwu）与 WPS 日程 ID 的映射关系
-- =====================================================

DROP TABLE IF EXISTS `icasync_schedule_mapping`;

CREATE TABLE `icasync_schedule_mapping` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `juhe_renwu_id` int(11) NOT NULL COMMENT '聚合任务ID',
  `kkh` varchar(60) NOT NULL COMMENT '开课号',
  `calendar_id` varchar(100) NOT NULL COMMENT 'WPS日历ID',
  `schedule_id` varchar(100) NOT NULL COMMENT 'WPS日程ID',
  `schedule_summary` varchar(500) DEFAULT NULL COMMENT '日程标题',
  `sync_status` enum('pending','syncing','completed','failed','deleted') DEFAULT 'pending' COMMENT '同步状态',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_juhe_renwu_id` (`juhe_renwu_id`),
  KEY `idx_kkh` (`kkh`),
  KEY `idx_calendar_id` (`calendar_id`),
  KEY `idx_schedule_id` (`schedule_id`),
  KEY `idx_sync_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日程映射表';

-- =====================================================
-- 4. 日历参与者映射表 (icasync_calendar_participants)
-- 用于存储日历参与者关系
-- =====================================================

DROP TABLE IF EXISTS `icasync_calendar_participants`;

-- =====================================================
-- 5. 同步任务记录表 (icasync_sync_tasks)
-- 用于记录同步任务的执行历史和状态
-- =====================================================

DROP TABLE IF EXISTS `icasync_sync_tasks`;

-- =====================================================
-- 6. 签到课程表 (icasync_attendance_courses)
-- 用于存储需要签到的课程信息，关联juhe_renwu表
-- =====================================================

DROP TABLE IF EXISTS `icasync_attendance_courses`;

CREATE TABLE `icasync_attendance_courses` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `juhe_renwu_id` int(11) NOT NULL COMMENT '关联聚合任务ID',
  `external_id` varchar(200) NOT NULL COMMENT '关联外部ID',
  `course_code` varchar(60) NOT NULL COMMENT '课程代码',
  `course_name` varchar(500) NOT NULL COMMENT '课程名称',
  `semester` varchar(20) NOT NULL COMMENT '学年学期',
  `teaching_week` int(11) NOT NULL COMMENT '教学周(来自juhe_renwu.jxz)',
  `week_day` int(11) NOT NULL COMMENT '周次-星期几(来自juhe_renwu.zc)',
  `teacher_codes` varchar(500) COMMENT '教师工号列表(逗号分隔)',
  `teacher_names` varchar(500) COMMENT '教师姓名列表',
  `class_location` varchar(1000) COMMENT '上课地址(教学楼+教室)',
  `start_time` datetime NOT NULL COMMENT '开始时间(RFC3339格式)',
  `end_time` datetime NOT NULL COMMENT '结束时间(RFC3339格式)',
  `periods` varchar(256) COMMENT '节次',
  `time_period` varchar(2) NOT NULL COMMENT '时间段(am/pm)',
  `attendance_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用签到',
  `attendance_start_offset` int(11) DEFAULT 0 COMMENT '签到开始时间偏移(分钟)',
  `attendance_end_offset` int(11) DEFAULT 15 COMMENT '签到结束时间偏移(分钟)',
  `late_threshold` int(11) DEFAULT 10 COMMENT '迟到阈值(分钟)',
  `auto_absent_after` int(11) DEFAULT 60 COMMENT '自动标记缺勤时间(分钟)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(50) COMMENT '创建人',
  `updated_by` varchar(50) COMMENT '更新人',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间',
  `deleted_by` varchar(50) DEFAULT NULL COMMENT '删除者',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  PRIMARY KEY (`id`),
  KEY `idx_course_code_semester` (`course_code`, `semester`),
  KEY `idx_semester_enabled` (`semester`, `attendance_enabled`),
  KEY `idx_teaching_week` (`teaching_week`),
  KEY `idx_week_day` (`week_day`),
  KEY `idx_teacher_codes` (`teacher_codes`(255)),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_semester_deleted` (`semester`, `deleted_at`),
  KEY `idx_course_semester_deleted` (`course_code`, `semester`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='签到课程表-存储需要签到的课程信息';

-- =====================================================
-- 恢复外键检查
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 执行完成提示
-- =====================================================

-- 所有 @stratix/icasync 数据表创建完成
-- 包含以下 6 个表：
-- 1. icasync_calendar_mapping - 课程日历映射表
-- 2. icasync_schedule_mapping - 日程映射表
-- 3. icasync_attendance_courses - 签到课程表
--
-- 执行时间: 预计 < 2 秒
-- 适用版本: MySQL 5.7+
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
