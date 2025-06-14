/*
 Navicat Premium Dump SQL

 Source Server         : 吉林财经大学
 Source Server Type    : MySQL
 Source Server Version : 80042 (8.0.42-0ubuntu0.24.04.1)
 Source Host           : 120.46.26.206:3306
 Source Schema         : syncdb

 Target Server Type    : MySQL
 Target Server Version : 80042 (8.0.42-0ubuntu0.24.04.1)
 File Encoding         : 65001

 Date: 08/06/2025 19:12:21
*/
SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for completed_tasks
-- ----------------------------
DROP TABLE IF EXISTS `completed_tasks`;
CREATE TABLE `completed_tasks` (
  `id` varchar(36) COLLATE utf8_unicode_ci NOT NULL COMMENT '任务ID',
  `parent_id` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '父任务ID',
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT '任务名称',
  `description` text COLLATE utf8_unicode_ci COMMENT '任务描述',
  `task_type` varchar(100) COLLATE utf8_unicode_ci NOT NULL COMMENT '任务类型',
  `status` enum('success','failed','cancelled','completed') COLLATE utf8_unicode_ci NOT NULL COMMENT '最终状态',
  `priority` int NOT NULL DEFAULT '0' COMMENT '优先级',
  `progress` decimal(5,2) NOT NULL DEFAULT '100.00' COMMENT '最终进度',
  `executor_name` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '执行器名称',
  `metadata` text COLLATE utf8_unicode_ci COMMENT '任务元数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  `started_at` timestamp NULL DEFAULT NULL COMMENT '开始时间',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_task_type` (`task_type`),
  KEY `idx_priority` (`priority`),
  KEY `idx_executor_name` (`executor_name`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_completed_at` (`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='完成任务表（备份）';

-- ----------------------------
-- Records of completed_tasks
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for cookies
-- ----------------------------
DROP TABLE IF EXISTS `cookies`;
CREATE TABLE `cookies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cookie` varchar(2000) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mtime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of cookies
-- ----------------------------
BEGIN;
INSERT INTO `cookies` (`id`, `cookie`, `ctime`, `mtime`) VALUES (1, 'wpsqing_autoLoginV1=1; uzone=CN-HN; ulocale=zh-CN; Hm_lvt_e243ca344b189eb8b5f26f5ddd19dbe7=1714988750; _ku=1; exp=259200; nexp=129600; cid=600146276; cv=kOhUCuNBgoJGnn6j9p5DIcJTiyA12Uga707tZUdVecvEl1zEkhYj8tbCe58OyTph2HZftw.37PxONEjshD; kso_sid=TKS-f0T3z4XjfM9ul4W50poTTKS7TroIK5LBaekKW1Gq6Q78oYeW0Mfkrh_3K7IHbCa9_86BO9I937SA6L8IsDsICRycOF-kxoAgIKTAFe39SrkwR86pN8RCOfIFJQr0S7Sf6S9WzNo-6DLnGVReJ_n_KLHW3lOcvlkRtgs_3WRMRJhKCvLj5KuIKw.v33ky0rsqWLgbYoDrZZt8WewNDGgA6y0YldPslVVZvN9SMjGEldbG3nsl6gvnpOMhODq8OL573NbgEJLHRyTpw; uid=1522749574; wps_sid=V02SsYhnhkjYzLU7pKTGgqsgAIrrd6M00aa4c682005ac35086; tfstk=f7KnV8gRAe7Cz2zGIVSIzHD3Ep0tdJs5CQERwgCr71519_HBeFVyFL_yvLIeUaRvHpCdp6dGqL9P8pp-FQAM2H6Paa5PbGWlUTO5OuNt51R_yeQRe0qk3M7WJ_CdZgvWiAhxDmpBdgsqMjnxj3_G6iNPUaPRQRWlMdpD-mpBdRlyunVtD7xaI6YPaQ7FbcWC_kzyauJZITW8T_5eaAvN1TZFaw7rbcW5L9SP4QJZITMggy5B4HKZ9USDw_5uPz6l-sJiluESy9FA_pk7qu-MSwfqq1qz4hXHCNSlUo0RgE1dkwRZXkjkQTAGkec0xQvyhU7MqWkpgLRBjMsmyvspAp8Vznl7zpSGtG-eo8ryIMfFSHQQtff2Ad-fbNnqnd-69ptMe8oPBICwdHSo0xshY6SGC3h_Y_YwzHQCVWllNhvwYUjyGPzqSYZ5QYKaPz_FCOfxwRaniRgjHSMiIry58O6FMADgPz_FCObnIA44FwW1KS1..; csrf=pYfez27kSNzPE5KyBX3naYYerZ45zKXH; plusua=UExVU1VBLzEuMCAod2ViLXBsdXM6Y2hyb21lXzEzMS4wLjAuMDsgV2luZG93cyAxMDpXaW5kb3dzIDEwOyBPVFEzWVdFek4yRTVabVJrWW1ZME9RPT06QXBwbGVXZWJLaXQgNTM3LjM2KSBBcHBsZVdlYktpdC81MzcuMzY=', '2024-11-26 23:27:15', '2024-11-26 23:27:15');
COMMIT;

-- ----------------------------
-- Table structure for icalink_attendance_records
-- ----------------------------
DROP TABLE IF EXISTS `icalink_attendance_records`;
CREATE TABLE `icalink_attendance_records` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '主键ID',
  `kkh` varchar(60) COLLATE utf8_unicode_ci NOT NULL COMMENT '开课号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci NOT NULL COMMENT '学年学期',
  `rq` date NOT NULL COMMENT '日期',
  `jc_s` varchar(50) COLLATE utf8_unicode_ci NOT NULL COMMENT '节次串',
  `kcmc` varchar(200) COLLATE utf8_unicode_ci NOT NULL COMMENT '课程名称',
  `total_count` int NOT NULL DEFAULT '0' COMMENT '总人数',
  `checkin_count` int NOT NULL DEFAULT '0' COMMENT '签到人数',
  `absent_count` int NOT NULL DEFAULT '0' COMMENT '旷课人数',
  `leave_count` int NOT NULL DEFAULT '0' COMMENT '请假人数',
  `checkin_url` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '签到URL',
  `checkin_token` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '签到令牌',
  `status` enum('active','closed') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `auto_close_time` datetime DEFAULT NULL COMMENT '自动关闭时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_kkh_rq` (`kkh`,`rq`),
  KEY `idx_xnxq_rq` (`xnxq`,`rq`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='考勤记录表';

-- ----------------------------
-- Records of icalink_attendance_records
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for icalink_leave_applications
-- ----------------------------
DROP TABLE IF EXISTS `icalink_leave_applications`;
CREATE TABLE `icalink_leave_applications` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '主键ID',
  `student_id` varchar(40) COLLATE utf8_unicode_ci NOT NULL COMMENT '学生学号',
  `student_name` varchar(200) COLLATE utf8_unicode_ci NOT NULL COMMENT '学生姓名',
  `kkh` varchar(60) COLLATE utf8_unicode_ci NOT NULL COMMENT '开课号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci NOT NULL COMMENT '学年学期',
  `course_name` varchar(200) COLLATE utf8_unicode_ci NOT NULL COMMENT '课程名称',
  `class_date` date NOT NULL COMMENT '上课日期',
  `class_time` varchar(50) COLLATE utf8_unicode_ci NOT NULL COMMENT '上课时间',
  `class_location` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '上课地点',
  `teacher_id` varchar(40) COLLATE utf8_unicode_ci NOT NULL COMMENT '任课教师工号',
  `teacher_name` varchar(200) COLLATE utf8_unicode_ci NOT NULL COMMENT '任课教师姓名',
  `leave_type` enum('sick','personal','emergency','other') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'sick' COMMENT '请假类型：sick病假，personal事假，emergency紧急事假，other其他',
  `leave_date` date NOT NULL COMMENT '请假日期',
  `leave_reason` text COLLATE utf8_unicode_ci NOT NULL COMMENT '请假原因',
  `application_time` datetime NOT NULL COMMENT '申请时间',
  `status` enum('pending','approved','rejected') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '申请状态：pending待审批，approved已批准，rejected已拒绝',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_kkh_xnxq` (`kkh`,`xnxq`),
  KEY `idx_status` (`status`),
  KEY `idx_class_date` (`class_date`),
  KEY `idx_application_time` (`application_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='请假申请表';

-- ----------------------------
-- Records of icalink_leave_applications
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for icalink_leave_approvals
-- ----------------------------
DROP TABLE IF EXISTS `icalink_leave_approvals`;
CREATE TABLE `icalink_leave_approvals` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '主键ID',
  `application_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '请假申请ID',
  `approver_id` varchar(40) COLLATE utf8_unicode_ci NOT NULL COMMENT '审批人工号',
  `approver_name` varchar(200) COLLATE utf8_unicode_ci NOT NULL COMMENT '审批人姓名',
  `approval_result` enum('approved','rejected') COLLATE utf8_unicode_ci NOT NULL COMMENT '审批结果：approved批准，rejected拒绝',
  `approval_comment` text COLLATE utf8_unicode_ci COMMENT '审批意见',
  `approval_time` datetime NOT NULL COMMENT '审批时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_approver_id` (`approver_id`),
  KEY `idx_approval_time` (`approval_time`),
  CONSTRAINT `fk_leave_approvals_application` FOREIGN KEY (`application_id`) REFERENCES `icalink_leave_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='审批记录表';

-- ----------------------------
-- Records of icalink_leave_approvals
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for icalink_leave_attachments
-- ----------------------------
DROP TABLE IF EXISTS `icalink_leave_attachments`;
CREATE TABLE `icalink_leave_attachments` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '主键ID',
  `application_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '请假申请ID',
  `file_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT '文件名',
  `file_path` varchar(500) COLLATE utf8_unicode_ci NOT NULL COMMENT '文件路径',
  `file_size` bigint DEFAULT NULL COMMENT '文件大小(字节)',
  `file_type` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '文件类型',
  `upload_time` datetime NOT NULL COMMENT '上传时间',
  PRIMARY KEY (`id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_upload_time` (`upload_time`),
  CONSTRAINT `fk_leave_attachments_application` FOREIGN KEY (`application_id`) REFERENCES `icalink_leave_applications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='请假附件表';

-- ----------------------------
-- Records of icalink_leave_attachments
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for icalink_schedule_mapping
-- ----------------------------
DROP TABLE IF EXISTS `icalink_schedule_mapping`;
CREATE TABLE `icalink_schedule_mapping` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '主键ID',
  `kkh` varchar(60) COLLATE utf8_unicode_ci NOT NULL COMMENT '开课号',
  `xnxq` varchar(20) COLLATE utf8_unicode_ci NOT NULL COMMENT '学年学期',
  `rq` date NOT NULL COMMENT '日期',
  `sjd` enum('am','pm') COLLATE utf8_unicode_ci NOT NULL COMMENT '时间段',
  `wps_calendar_id` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'WPS日历ID',
  `wps_event_id` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'WPS日程ID',
  `participant_type` enum('teacher','student') COLLATE utf8_unicode_ci NOT NULL COMMENT '参与者类型',
  `participant_id` varchar(40) COLLATE utf8_unicode_ci NOT NULL COMMENT '参与者ID(工号或学号)',
  `sync_status` enum('pending','success','failed') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '同步状态',
  `error_message` text COLLATE utf8_unicode_ci COMMENT '错误信息',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_schedule_participant` (`kkh`,`rq`,`sjd`,`participant_type`,`participant_id`),
  KEY `idx_kkh_rq_sjd` (`kkh`,`rq`,`sjd`),
  KEY `idx_wps_event_id` (`wps_event_id`),
  KEY `idx_participant` (`participant_type`,`participant_id`),
  KEY `idx_sync_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='日程映射表';

-- ----------------------------
-- Records of icalink_schedule_mapping
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for icalink_student_attendance
-- ----------------------------
DROP TABLE IF EXISTS `icalink_student_attendance`;
CREATE TABLE `icalink_student_attendance` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '主键ID',
  `attendance_record_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '考勤记录ID',
  `xh` varchar(40) COLLATE utf8_unicode_ci NOT NULL COMMENT '学号',
  `xm` varchar(200) COLLATE utf8_unicode_ci NOT NULL COMMENT '学生姓名',
  `status` enum('present','absent','leave') COLLATE utf8_unicode_ci NOT NULL COMMENT '签到状态',
  `checkin_time` datetime DEFAULT NULL COMMENT '签到时间',
  `leave_reason` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '请假原因',
  `ip_address` varchar(45) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '签到IP地址',
  `user_agent` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_attendance_record_id` (`attendance_record_id`),
  KEY `idx_xh` (`xh`),
  KEY `idx_status` (`status`),
  KEY `idx_checkin_time` (`checkin_time`),
  CONSTRAINT `fk_student_attendance_record` FOREIGN KEY (`attendance_record_id`) REFERENCES `icalink_attendance_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='学生签到记录表';

-- ----------------------------
-- Records of icalink_student_attendance
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for icalink_sync_config
-- ----------------------------
DROP TABLE IF EXISTS `icalink_sync_config`;
CREATE TABLE `icalink_sync_config` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `config_key` varchar(100) COLLATE utf8_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` text COLLATE utf8_unicode_ci COMMENT '配置值',
  `description` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '描述',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否激活',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='同步配置表';


-- ----------------------------
-- Table structure for icalink_sync_logs
-- ----------------------------
DROP TABLE IF EXISTS `icalink_sync_logs`;
CREATE TABLE `icalink_sync_logs` (
  `id` varchar(32) COLLATE utf8_unicode_ci NOT NULL COMMENT '主键ID',
  `task_id` varchar(32) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '任务ID',
  `sync_type` enum('full','incremental') COLLATE utf8_unicode_ci NOT NULL COMMENT '同步类型',
  `operation` enum('create','update','delete') COLLATE utf8_unicode_ci NOT NULL COMMENT '操作类型',
  `target_table` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '目标表',
  `record_id` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '记录ID',
  `status` enum('success','failed','pending') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '状态',
  `message` varchar(1000) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '消息',
  `error_details` text COLLATE utf8_unicode_ci COMMENT '错误详情',
  `execution_time` int DEFAULT NULL COMMENT '执行时间(毫秒)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_sync_type` (`sync_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='同步日志表';


-- ----------------------------
-- Table structure for information_lessons
-- ----------------------------
DROP TABLE IF EXISTS `information_lessons`;
CREATE TABLE `information_lessons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kkh` varchar(60) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `xnxq` varchar(20) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `jxz` int DEFAULT NULL,
  `zc` int DEFAULT NULL,
  `jc` int DEFAULT NULL,
  `lq` varchar(200) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `room` varchar(200) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `lc` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `xq` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `ghs` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `lx` varchar(10) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `bz` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `rq` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `st` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `ed` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `sj` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `zt` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `kcbh` varchar(20) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `kcmc` varchar(200) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `bjdm` varchar(200) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `bjmc` varchar(200) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `stacked` enum('Y','N') CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT 'N',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mtime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=37867 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


-- ----------------------------
-- Table structure for juhe_renwu
-- ----------------------------
DROP TABLE IF EXISTS `juhe_renwu`;
CREATE TABLE `juhe_renwu` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int DEFAULT NULL COMMENT '教学周',
  `zc` int DEFAULT NULL COMMENT '周次',
  `rq` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '日期',
  `kcmc` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `sfdk` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '是否打卡（是否生成学生日历）',
  `jc_s` varchar(256) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '节次合并',
  `room_s` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '上课教室合并（一般都是同一教室）',
  `gh_s` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '教师组号，推送教师课表日历的依据',
  `xm_s` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '教师组姓名，推送学生课表日历直接取此',
  `lq` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '教学楼',
  `sj_f` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `sj_t` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sjd` varchar(2) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '' COMMENT '时间段（1-4为am，4-10为pm）',
  `gx_sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '更新时间，给杨经理用',
  `gx_zt` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '更新状态，给杨经理用(0未处理，1教师日历已经推送，2学生日历已经推送，3软删除未处理，4软删除处理完毕',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;


-- ----------------------------
-- Table structure for juhe_renwu_copy1
-- ----------------------------
DROP TABLE IF EXISTS `juhe_renwu_copy1`;
CREATE TABLE `juhe_renwu_copy1` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int DEFAULT NULL COMMENT '教学周',
  `zc` int DEFAULT NULL COMMENT '周次',
  `rq` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '日期',
  `kcmc` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `sfdk` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '是否打卡（是否生成学生日历）',
  `jc_s` varchar(256) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '节次合并',
  `room_s` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '上课教室合并（一般都是同一教室）',
  `gh_s` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '教师组号，推送教师课表日历的依据',
  `xm_s` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '教师组姓名，推送学生课表日历直接取此',
  `lq` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '教学楼',
  `sj_f` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `sj_t` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sjd` varchar(2) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '' COMMENT '时间段（1-4为am，4-10为pm）',
  `gx_sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '更新时间，给杨经理用',
  `gx_zt` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '更新状态，给杨经理用(0未处理，1教师日历已经推送，2学生日历已经推送，3软删除未处理，4软删除处理完毕',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=27291 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;


-- ----------------------------
-- Table structure for lesson_forms
-- ----------------------------
DROP TABLE IF EXISTS `lesson_forms`;
CREATE TABLE `lesson_forms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `form_id` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `jxz` int DEFAULT NULL,
  `zc` int DEFAULT NULL,
  `jc` int DEFAULT NULL,
  `lq` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `room` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `lc` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xq` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `rq` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `st` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `ed` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `bjdm` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `bjmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `kcbh` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `kcmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `status` enum('deleted','expired','notExpired') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `share_id` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lesson_forms_rq_st` (`kkh`,`rq`,`st`)
) ENGINE=InnoDB AUTO_INCREMENT=54801 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

DROP TABLE IF EXISTS `location`;
CREATE TABLE `location` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lng` decimal(9,6) NOT NULL,
  `lat` decimal(9,6) NOT NULL,
  `address` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `lq` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `xq` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

DROP TABLE IF EXISTS `out_jsxx`;
CREATE TABLE `out_jsxx` (
  `id` varchar(32) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `xm` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `gh` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `ssdwdm` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `ssdwmc` varchar(90) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zgxw` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zgxl` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zc` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xb` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `sjh` varchar(11) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `email` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `ykth` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;


DROP TABLE IF EXISTS `out_jw_kc`;
CREATE TABLE `out_jw_kc` (
  `kcbh` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `kcmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `ywkcm` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '英文课程名',
  `dwdm` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课单位代码',
  `dwmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课单位名称',
  `yzdm` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '授课语种代码',
  `yz` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '授课语种',
  `xf` decimal(10,2) DEFAULT NULL COMMENT '学分',
  `xs` int DEFAULT NULL COMMENT '学时',
  `xs_ll` int DEFAULT NULL COMMENT '课堂讲授学时',
  `xs_sy` int DEFAULT NULL COMMENT '实验学时',
  `xs_qt` int DEFAULT NULL COMMENT '其他学时',
  `kczt` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程状态代码',
  `bz` varchar(1500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '备注',
  `sffankc` int DEFAULT NULL COMMENT '是否方案内课程',
  `sfbx` int DEFAULT NULL COMMENT '是否必修',
  `sfxx` int DEFAULT NULL COMMENT '是否限选',
  `sfxgxk` varchar(1) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '是否校公选课',
  `xgxklbdm` varchar(4) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '校公选课类别代码',
  `xgxklbmc` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '校公选课类别名称',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  UNIQUE KEY `kcbh` (`kcbh`) USING BTREE,
  KEY `idx_out_jw_kc_kcbh` (`kcbh`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='t_课程表';

-- ----------------------------
-- Table structure for out_jw_kcb_js
-- ----------------------------
DROP TABLE IF EXISTS `out_jw_kcb_js`;
CREATE TABLE `out_jw_kcb_js` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `gh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '工号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `kcbh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `jss` int DEFAULT NULL COMMENT '教学班授课教师数',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='u_教师课程表';

DROP TABLE IF EXISTS `out_jw_kcb_js_copy1`;
CREATE TABLE `out_jw_kcb_js_copy1` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `gh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '工号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `kcbh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `jss` int DEFAULT NULL COMMENT '教学班授课教师数',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='u_教师课程表';

DROP TABLE IF EXISTS `out_jw_kcb_md`;
CREATE TABLE `out_jw_kcb_md` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `mdbh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '名单编号',
  `mdmc` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '名单名称',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='u_课程打卡名单';

DROP TABLE IF EXISTS `out_jw_kcb_md_copy1`;
CREATE TABLE `out_jw_kcb_md_copy1` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `mdbh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '名单编号',
  `mdmc` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '名单名称',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='u_课程打卡名单';

DROP TABLE IF EXISTS `out_jw_kcb_xs`;
CREATE TABLE `out_jw_kcb_xs` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学生编号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `kcbh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `pyfadm` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '培养方案代码',
  `xsyd` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学生异动标识',
  `xgxklbdm` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '校公选课类别代码',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  KEY `idx_out_jw_kcb_xs_kkh_xh_kcbh` (`kkh`,`xh`,`kcbh`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='u_学生课程表';

DROP TABLE IF EXISTS `out_tydb_cj`;
CREATE TABLE `out_tydb_cj` (
  `zjh` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xmbh` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `cj_cs` decimal(10,2) DEFAULT NULL,
  `cssj` datetime DEFAULT NULL,
  `xnxq` varchar(12) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xmmc` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `dw` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xh` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xm` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xbdm` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xb` varchar(4) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `mzdm` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `csrq` date DEFAULT NULL,
  `syd` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `nj` int DEFAULT NULL,
  `dwdm` varchar(4) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `dwmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `bjdm` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `bjmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `nj_lb` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `nj_lb2` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `cj` decimal(10,2) DEFAULT NULL,
  `cjbz` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `qz` decimal(10,2) DEFAULT NULL,
  `qz_cj` decimal(10,2) DEFAULT NULL,
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='u_体育达标_成绩';

DROP TABLE IF EXISTS `out_tydb_zcj`;
CREATE TABLE `out_tydb_zcj` (
  `zjh` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xnxq` varchar(12) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xh` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xm` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xbdm` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xb` varchar(4) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `mzdm` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `csrq` date DEFAULT NULL,
  `syd` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `nj` int DEFAULT NULL,
  `dwdm` varchar(4) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `dwmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `bjdm` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `bjmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `nj_lb` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `nj_lb2` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zcj` decimal(32,2) DEFAULT NULL,
  `cjdj` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='u_体育达标_总成绩';

DROP TABLE IF EXISTS `out_xsxx`;
CREATE TABLE `out_xsxx` (
  `id` varchar(32) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `xm` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xh` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xydm` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xymc` varchar(90) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zydm` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zymc` varchar(90) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `bjdm` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `bjmc` varchar(90) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xb` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `mz` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `sfzh` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `sjh` varchar(11) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `sznj` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `rxnf` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `email` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `lx` int DEFAULT '1' COMMENT '类型 1本科生 2研究生',
  `update_time` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `ykth` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_out_xsxx_xh_bjdm` (`xh`,`bjdm`,`bjmc`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

DROP TABLE IF EXISTS `queue_failures`;
CREATE TABLE `queue_failures` (
  `id` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `queue_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `group_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `job_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `executor_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `payload` text NOT NULL,
  `error_message` text COLLATE utf8_unicode_ci,
  `error_stack` text COLLATE utf8_unicode_ci,
  `error_code` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='队列任务失败表，存储执行失败的任务记录';

DROP TABLE IF EXISTS `queue_groups`;
CREATE TABLE `queue_groups` (
  `id` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `queue_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `group_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'active',
  `total_jobs` int NOT NULL DEFAULT '0',
  `completed_jobs` int NOT NULL DEFAULT '0',
  `failed_jobs` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `metadata` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_queue_groups_name_id` (`queue_name`,`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='队列分组状态表，存储队列分组的状态信息';

DROP TABLE IF EXISTS `queue_job_logs`;
CREATE TABLE `queue_job_logs` (
  `id` varchar(255) NOT NULL,
  `jobId` varchar(255) NOT NULL,
  `queueName` varchar(255) NOT NULL,
  `jobType` varchar(255) NOT NULL,
  `data` text NOT NULL,
  `finalStatus` varchar(50) NOT NULL,
  `result` text,
  `failedReason` text,
  `attempts` int NOT NULL,
  `priority` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processedAt` timestamp NULL DEFAULT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `processingTime` int NOT NULL,
  `archivedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_queue_job_logs_queue_completed` (`queueName`,`completedAt`),
  KEY `idx_queue_job_logs_job_id` (`jobId`),
  KEY `idx_queue_job_logs_job_type` (`queueName`,`jobType`),
  KEY `idx_queue_job_logs_archived` (`archivedAt`),
  KEY `idx_queue_job_logs_status` (`queueName`,`finalStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

DROP TABLE IF EXISTS `queue_jobs`;
CREATE TABLE `queue_jobs` (
  `id` varchar(255) NOT NULL,
  `queueName` varchar(255) NOT NULL,
  `jobType` varchar(255) NOT NULL,
  `data` text NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'waiting',
  `priority` int NOT NULL DEFAULT '5',
  `attempts` int NOT NULL DEFAULT '0',
  `maxAttempts` int NOT NULL DEFAULT '3',
  `delay` int DEFAULT NULL,
  `nextRetryAt` timestamp NULL DEFAULT NULL,
  `scheduledAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAtMicroseconds` varchar(50) NOT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `lockedAt` timestamp NULL DEFAULT NULL,
  `lockedBy` varchar(255) DEFAULT NULL,
  `lockedUntil` timestamp NULL DEFAULT NULL,
  `processedAt` timestamp NULL DEFAULT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `failedAt` timestamp NULL DEFAULT NULL,
  `failedReason` text,
  `result` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


DROP TABLE IF EXISTS `queue_metadata`;
CREATE TABLE `queue_metadata` (
  `queueName` varchar(255) NOT NULL,
  `configJson` text NOT NULL,
  `processorsJson` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `metadata` text,
  PRIMARY KEY (`queueName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

DROP TABLE IF EXISTS `queue_metrics`;
CREATE TABLE `queue_metrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `queue_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `instance_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `memory_queue_length` int NOT NULL DEFAULT '0',
  `watermark_level` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `is_backpressure_active` tinyint(1) NOT NULL DEFAULT '0',
  `has_active_stream` tinyint(1) NOT NULL DEFAULT '0',
  `is_processing` tinyint(1) NOT NULL DEFAULT '0',
  `total_processed` int NOT NULL DEFAULT '0',
  `total_failed` int NOT NULL DEFAULT '0',
  `average_processing_time` decimal(10,2) DEFAULT NULL,
  `backpressure_activations` int NOT NULL DEFAULT '0',
  `total_backpressure_time` bigint NOT NULL DEFAULT '0',
  `stream_start_count` int NOT NULL DEFAULT '0',
  `stream_pause_count` int NOT NULL DEFAULT '0',
  `average_stream_duration` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_metrics_queue_instance` (`queue_name`,`instance_id`),
  KEY `idx_metrics_queue_name` (`queue_name`),
  KEY `idx_metrics_watermark` (`watermark_level`),
  KEY `idx_metrics_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='队列指标表，存储队列的实时状态和性能指标';


DROP TABLE IF EXISTS `queue_success`;
CREATE TABLE `queue_success` (
  `id` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `queue_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `group_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `job_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `executor_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `payload` text NOT NULL,
  `result` text DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '1',
  `execution_time` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `metadata` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='队列任务成功表，存储执行成功的任务记录';

-- ----------------------------
-- Records of queue_success
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for running_tasks
-- ----------------------------
DROP TABLE IF EXISTS `running_tasks`;
CREATE TABLE `running_tasks` (
  `id` varchar(36) COLLATE utf8_unicode_ci NOT NULL COMMENT '任务ID',
  `parent_id` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '父任务ID',
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT '任务名称',
  `description` text COLLATE utf8_unicode_ci COMMENT '任务描述',
  `task_type` varchar(100) COLLATE utf8_unicode_ci NOT NULL COMMENT '任务类型',
  `status` enum('pending','running','paused') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '任务状态',
  `priority` int NOT NULL DEFAULT '0' COMMENT '优先级',
  `progress` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT '进度百分比(0-100)',
  `executor_name` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT '执行器名称',
  `metadata` text DEFAULT NULL COMMENT '任务元数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `started_at` timestamp NULL DEFAULT NULL COMMENT '开始时间',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间（预留）',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_task_type` (`task_type`),
  KEY `idx_priority` (`priority`),
  KEY `idx_executor_name` (`executor_name`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_started_at` (`started_at`),
  CONSTRAINT `fk_running_tasks_parent` FOREIGN KEY (`parent_id`) REFERENCES `running_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='运行中任务表';



-- ----------------------------
-- Table structure for shared_contexts
-- ----------------------------
DROP TABLE IF EXISTS `shared_contexts`;
CREATE TABLE `shared_contexts` (
  `id` varchar(255) COLLATE utf8_unicode_ci NOT NULL COMMENT '唯一标识符',
  `root_task_id` varchar(36) COLLATE utf8_unicode_ci NOT NULL COMMENT '根任务ID',
  `data` text COLLATE utf8_unicode_ci NOT NULL COMMENT 'JSON序列化的共享数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号',
  `checksum` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'SHA256校验和',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_root_task_id` (`root_task_id`),
  KEY `idx_root_task_id` (`root_task_id`),
  KEY `idx_updated_at` (`updated_at`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_shared_contexts_root_task` FOREIGN KEY (`root_task_id`) REFERENCES `running_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='任务树共享上下文存储表';

-- ----------------------------
-- Records of shared_contexts
-- ----------------------------

-- ----------------------------
-- Table structure for tasks
-- ----------------------------
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` varchar(255) NOT NULL,
  `parent_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `type` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `progress` int NOT NULL DEFAULT '0',
  `executor_name` varchar(255) DEFAULT NULL,
  `executor_config` text,
  `metadata` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_parent_id` (`parent_id`),
  KEY `idx_tasks_status` (`status`),
  KEY `idx_tasks_type` (`type`),
  KEY `idx_tasks_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


DROP TABLE IF EXISTS `u_jw_kcb_cur`;
CREATE TABLE `u_jw_kcb_cur` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int DEFAULT NULL COMMENT '教学周（1-20）',
  `zc` int DEFAULT NULL COMMENT '周次（星期1-星期日）',
  `jc` int DEFAULT NULL COMMENT '节次（1-10）',
  `lq` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼群',
  `room` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '房间',
  `xq` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '校区',
  `ghs` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '工号组',
  `lc` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼层',
  `rq` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '日期',
  `st` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `ed` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '来源库时间',
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '来源库状态标识（add、update、delete）',
  `gx_sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '目标库更新时间',
  `gx_zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '目标库更新状态',
  `kcmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `xms` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '教师姓名组',
  `sfdk` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '是否打卡(打卡，不打卡)，有些课程仅为占位给老师提醒，学生不打卡，无学生日历',
  KEY `idx_combined` (`kkh`,`rq`,`st`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='本学期课程表';

DROP TABLE IF EXISTS `u_jw_kcb_cur_20250411`;
CREATE TABLE `u_jw_kcb_cur_20250411` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int DEFAULT NULL COMMENT '教学周',
  `zc` int DEFAULT NULL COMMENT '周次',
  `jc` int DEFAULT NULL COMMENT '节次',
  `lq` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼群',
  `room` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '房间',
  `xq` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '校区',
  `ghs` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '工号组',
  `lx` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '类型',
  `bz` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '备注',
  `lc` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼层',
  `rq` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '日期',
  `st` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `ed` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '状态库时间标识',
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '状态库状态标识，因为是软删除，只有add和update',
  `kcmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `xhs` varchar(10000) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学号组',
  KEY `idx_combined` (`kkh`,`rq`,`st`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='本学期课程表';

DROP TABLE IF EXISTS `u_jw_kcb_cur_20250530`;
CREATE TABLE `u_jw_kcb_cur_20250530` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int DEFAULT NULL COMMENT '教学周（1-20）',
  `zc` int DEFAULT NULL COMMENT '周次（星期1-星期日）',
  `jc` int DEFAULT NULL COMMENT '节次（1-10）',
  `lq` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼群',
  `room` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '房间',
  `xq` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '校区',
  `ghs` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '工号组',
  `lc` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼层',
  `rq` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '日期',
  `st` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `ed` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '来源库时间',
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '来源库状态标识（add、update、delete）',
  `gx_sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '目标库更新时间',
  `gx_zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '目标库更新状态',
  `kcmc` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程名称',
  `xms` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '教师姓名组',
  `sfdk` varchar(2) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '是否打卡(打卡，不打卡)，有些课程仅为占位给老师提醒，学生不打卡，无学生日历',
  KEY `idx_combined` (`kkh`,`rq`,`st`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='本学期课程表';


DROP TABLE IF EXISTS `out_jw_kcb_xs_copy1`;
CREATE TABLE `out_jw_kcb_xs_copy1` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学生编号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `kcbh` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '课程编号',
  `pyfadm` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '培养方案代码',
  `xsyd` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学生异动标识',
  `xgxklbdm` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '校公选课类别代码',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  KEY `idx_out_jw_kcb_xs_kkh_xh_kcbh` (`kkh`,`xh`,`kcbh`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='u_学生课程表';

DROP TABLE IF EXISTS `u_jw_kcb_cur_copy1`;
CREATE TABLE `u_jw_kcb_cur_copy1` (
  `TU_INCR_ID` int NOT NULL AUTO_INCREMENT,
  `SOURSE` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `CREATE_DATE` datetime DEFAULT NULL,
  `UPDATE_DATE` datetime DEFAULT NULL,
  `DATA_ZT` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课教学班号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int DEFAULT NULL COMMENT '教学周(一学期20教学周）',
  `zc` int DEFAULT NULL COMMENT '周次(一周7天）',
  `jc` int DEFAULT NULL COMMENT '节次(一天10节）',
  `lq` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼群(目前4个教学楼)',
  `room` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '房间',
  `lc` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼层',
  `xq` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '校区',
  `ghs` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '工号组（老师的工号，有可能多个老师上一门课）',
  `lx` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '类型',
  `bz` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '备注',
  `rq` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '日期(根据学年学期和教学周+周次推算出来）',
  `st` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '节开始时间',
  `ed` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '节结束时间',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '状态变化时间戳(什么时间状态发生变化)',
  `zt` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '状态(add,update,del)',
  PRIMARY KEY (`TU_INCR_ID`) USING BTREE
) ENGINE=MyISAM AUTO_INCREMENT=52032 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='本学期课程表';


DROP TABLE IF EXISTS `u_jw_kcb_cur_copy2025226`;
CREATE TABLE `u_jw_kcb_cur_copy2025226` (
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开课号',
  `xnxq` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '学年学期',
  `jxz` int DEFAULT NULL COMMENT '教学周',
  `zc` int DEFAULT NULL COMMENT '周次',
  `jc` int DEFAULT NULL COMMENT '节次',
  `lq` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼群',
  `room` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '房间',
  `xq` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '校区',
  `ghs` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '工号组',
  `lx` varchar(10) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '类型',
  `bz` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '备注',
  `lc` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '楼层',
  `rq` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '日期',
  `st` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '开始时间',
  `ed` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '结束时间',
  `sj` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '状态库时间标识',
  `zt` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '状态库状态标识，因为是软删除，只有add和update',
  KEY `idx_combined` (`kkh`,`rq`,`st`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci COMMENT='本学期课程表';

DROP TABLE IF EXISTS `user_calendar`;
CREATE TABLE `user_calendar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wpsId` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xgh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `name` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `calendar_id` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `status` enum('normal') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mtime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=12375 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

DROP TABLE IF EXISTS `user_lessons`;
CREATE TABLE `user_lessons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kkh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `rq` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `st` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `ed` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `xgh` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `calendar_id` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `event_id` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `status` enum('deleted','expired','notExpired') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mtime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=2300915 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
