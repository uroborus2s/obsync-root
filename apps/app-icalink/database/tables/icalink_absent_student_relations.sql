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
  `school_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '学院ID',
  `major_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '专业ID',
  `class_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '班级ID',
  `grade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '年级',
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '性别',
  `people` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '民族',
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


ALTER TABLE icasync.icalink_absent_student_relations
add column `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '性别',
add column `people` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '民族';
add column `grade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '年级';


ALTER TABLE icasync.icalink_absent_student_relations
add column `grade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '年级';
