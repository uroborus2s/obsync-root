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
  `course_unit_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '开课单位代码',
  `course_unit` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '开课单位名称',
  `teaching_class_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '教学班代码',
  `need_checkin` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否需要签到：1=需要，0=不需要',
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


ALTER TABLE icasync.icalink_course_checkin_stats
ADD COLUMN `course_unit_id` VARCHAR(20) DEFAULT NULL COMMENT '开课单位代码',
ADD COLUMN `course_unit` VARCHAR(200) DEFAULT NULL COMMENT '开课单位名称',
ADD COLUMN `teaching_class_code` VARCHAR(100) NOT NULL COMMENT '教学班代码';