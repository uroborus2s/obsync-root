SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for out_jw_kcb_xs
-- 这是学生课程关联表，通过此表可以获取教学班
-- ----------------------------
DROP TABLE IF EXISTS `out_jw_kcb_xs`;
CREATE TABLE `out_jw_kcb_xs` (
  `kkh` varchar(60) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xh` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学生编号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `kcbh` varchar(40) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `pyfadm` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '培养方案代码',
  `xsyd` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '学生异动标识',
  `xgxklbdm` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '校公选课类别代码',
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  KEY `idx_out_jw_kcb_xs_kkh_xh_kcbh` (`kkh`,`xh`,`kcbh`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='u_学生课程表';

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------
-- Table structure for out_xsxx
-- 学生信息表
-- ----------------------------
DROP TABLE IF EXISTS `out_xsxx`;
CREATE TABLE `out_xsxx` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `xm` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xh` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xydm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xymc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zydm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zymc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `bjdm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `bjmc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xb` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `mz` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sfzh` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sjh` varchar(11) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sznj` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `rxnf` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `lx` int(11) DEFAULT '1' COMMENT '类型 1本科生 2研究生',
  `update_time` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `ykth` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_out_xsxx_xh_bjdm` (`xh`,`bjdm`,`bjmc`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Table structure for out_jsxx
-- 教师信息表
-- ----------------------------
DROP TABLE IF EXISTS `out_jsxx`;
CREATE TABLE `out_jsxx` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `xm` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `gh` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `ssdwdm` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `ssdwmc` varchar(90) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zgxw` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zgxl` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zc` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `xb` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sjh` varchar(11) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `ykth` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `sj` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


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
  `attendance_start_offset` int(11) DEFAULT -10 COMMENT '签到开始时间偏移(分钟)',
  `attendance_end_offset` int(11) DEFAULT 10 COMMENT '签到结束时间偏移(分钟)',
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

SET FOREIGN_KEY_CHECKS = 1;