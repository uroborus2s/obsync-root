-- icalink插件数据库初始化脚本
-- 创建课表同步相关的表结构

-- 考勤记录表
CREATE TABLE IF NOT EXISTS `icalink_attendance_records` (
  `id` varchar(200) NOT NULL COMMENT '主键ID',
  `kkh` varchar(60) NOT NULL COMMENT '开课号',
  `xnxq` varchar(20) NOT NULL COMMENT '学年学期',
  `jxz` int DEFAULT NULL COMMENT '教学周',
  `zc` int DEFAULT NULL COMMENT '周次',
  `rq` date NOT NULL COMMENT '日期',
  `jc_s` varchar(50) NOT NULL COMMENT '节次串',
  `kcmc` varchar(200) NOT NULL COMMENT '课程名称',
  `sj_f` varchar(20) NOT NULL COMMENT '开始时间',
  `sj_t` varchar(20) NOT NULL COMMENT '结束时间',
  `sjd` enum('am','pm') NOT NULL COMMENT '时间段',
  `total_count` int NOT NULL DEFAULT '0' COMMENT '总人数',
  `checkin_count` int NOT NULL DEFAULT '0' COMMENT '签到人数',
  `absent_count` int NOT NULL DEFAULT '0' COMMENT '旷课人数',
  `leave_count` int NOT NULL DEFAULT '0' COMMENT '请假人数',
  `checkin_url` varchar(500) DEFAULT NULL COMMENT '签到URL',
  `leave_url` varchar(500) DEFAULT NULL COMMENT '请假URL',
  `checkin_token` varchar(100) DEFAULT NULL COMMENT '签到令牌',
  `status` enum('active','closed') NOT NULL DEFAULT 'active' COMMENT '状态',
  `auto_start_time` varchar(50) DEFAULT NULL COMMENT '自动开始时间',
  `auto_close_time` varchar(50) DEFAULT NULL COMMENT '自动关闭时间',
  `lq` varchar(100) DEFAULT NULL COMMENT '楼群或相关标识',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_kkh_rq` (`kkh`, `rq`),
  KEY `idx_xnxq_rq` (`xnxq`, `rq`),
  KEY `idx_jxz` (`jxz`),
  KEY `idx_zc` (`zc`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_lq` (`lq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤记录表';

-- 学生签到记录表
CREATE TABLE IF NOT EXISTS `icalink_student_attendance` (
  `id` varchar(200) NOT NULL COMMENT '主键ID',
  `attendance_record_id` varchar(200) NOT NULL COMMENT '考勤记录ID',
  `xh` varchar(40) NOT NULL COMMENT '学号',
  `xm` varchar(200) NOT NULL COMMENT '学生姓名',
  `status` enum('present','leave','absent','pending_approval','leave_pending','leave_rejected') NOT NULL COMMENT '签到状态',
  `checkin_time` datetime DEFAULT NULL COMMENT '签到时间',
  `location_id` varchar(200) DEFAULT NULL COMMENT '签到地点记录id',
  `leave_reason` varchar(2000) DEFAULT NULL COMMENT '请假原因',
  `leave_type` enum('sick','personal','emergency','other') NOT NULL DEFAULT 'sick' COMMENT '请假类型：sick病假，personal事假，emergency紧急事假，other其他',
  `leave_time` datetime DEFAULT NULL COMMENT '请假时间',
  `approver_id` varchar(100) DEFAULT NULL COMMENT '审批人ID(教师工号)',
  `approver_name` varchar(200) DEFAULT NULL COMMENT '审批人姓名',
  `approved_time` datetime DEFAULT NULL COMMENT '审批时间',
  `latitude` decimal(10,8) DEFAULT NULL COMMENT '纬度',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT '经度',
  `accuracy` decimal(8,2) DEFAULT NULL COMMENT '定位精度(米)',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '签到IP地址',
  `user_agent` varchar(500) DEFAULT NULL COMMENT '用户代理',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_attendance_record_id` (`attendance_record_id`),
  KEY `idx_xh` (`xh`),
  KEY `idx_status` (`status`),
  KEY `idx_checkin_time` (`checkin_time`),
  KEY `idx_approver_id` (`approver_id`),
  KEY `idx_approved_time` (`approved_time`),
  KEY `idx_location` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生签到记录表';

-- 日程映射表
CREATE TABLE IF NOT EXISTS `icalink_schedule_mapping` (
  `id` varchar(32) NOT NULL COMMENT '主键ID',
  `kkh` varchar(60) NOT NULL COMMENT '开课号',
  `xnxq` varchar(20) NOT NULL COMMENT '学年学期',
  `rq` date NOT NULL COMMENT '日期',
  `sjd` enum('am','pm') NOT NULL COMMENT '时间段',
  `wps_calendar_id` varchar(100) DEFAULT NULL COMMENT 'WPS日历ID',
  `wps_event_id` varchar(100) DEFAULT NULL COMMENT 'WPS日程ID',
  `participant_type` enum('teacher','student') NOT NULL COMMENT '参与者类型',
  `participant_id` varchar(40) NOT NULL COMMENT '参与者ID(工号或学号)',
  `sync_status` enum('pending','success','failed') NOT NULL DEFAULT 'pending' COMMENT '同步状态',
  `error_message` text DEFAULT NULL COMMENT '错误信息',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_schedule_participant` (`kkh`, `rq`, `sjd`, `participant_type`, `participant_id`),
  KEY `idx_kkh_rq_sjd` (`kkh`, `rq`, `sjd`),
  KEY `idx_wps_event_id` (`wps_event_id`),
  KEY `idx_participant` (`participant_type`, `participant_id`),
  KEY `idx_sync_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日程映射表';

-- 同步日志表
CREATE TABLE IF NOT EXISTS `icalink_sync_logs` (
  `id` varchar(32) NOT NULL COMMENT '主键ID',
  `task_id` varchar(32) DEFAULT NULL COMMENT '任务ID',
  `sync_type` enum('full','incremental') NOT NULL COMMENT '同步类型',
  `operation` enum('create','update','delete') NOT NULL COMMENT '操作类型',
  `target_table` varchar(100) DEFAULT NULL COMMENT '目标表',
  `record_id` varchar(100) DEFAULT NULL COMMENT '记录ID',
  `status` enum('success','failed','pending') NOT NULL DEFAULT 'pending' COMMENT '状态',
  `message` varchar(1000) DEFAULT NULL COMMENT '消息',
  `error_details` text DEFAULT NULL COMMENT '错误详情',
  `execution_time` int DEFAULT NULL COMMENT '执行时间(毫秒)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_sync_type` (`sync_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步日志表';

-- 同步配置表
CREATE TABLE IF NOT EXISTS `icalink_sync_config` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text DEFAULT NULL COMMENT '配置值',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否激活',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步配置表';

-- ==================== 请假审批流程相关表 ====================

-- 请假申请表
CREATE TABLE IF NOT EXISTS `icalink_leave_applications` (
  `id` varchar(32) NOT NULL COMMENT '主键ID',
  `student_id` varchar(40) NOT NULL COMMENT '学生学号',
  `student_name` varchar(200) NOT NULL COMMENT '学生姓名',
  `student_attendance_record_id` varchar(32) NOT NULL COMMENT '关联学生考勤记录ID',
  `kkh` varchar(60) NOT NULL COMMENT '开课号',
  `xnxq` varchar(20) NOT NULL COMMENT '学年学期',
  `course_name` varchar(200) NOT NULL COMMENT '课程名称',
  `class_date` date NOT NULL COMMENT '上课日期',
  `class_time` varchar(50) NOT NULL COMMENT '上课时间',
  `class_location` varchar(200) DEFAULT NULL COMMENT '上课地点',
  `teacher_id` varchar(100) NOT NULL COMMENT '任课教师工号',
  `teacher_name` varchar(200) NOT NULL COMMENT '任课教师姓名',
  `leave_type` enum('sick','personal','emergency','other') NOT NULL DEFAULT 'sick' COMMENT '请假类型：sick病假，personal事假，emergency紧急事假，other其他',
  `leave_date` date NOT NULL COMMENT '请假日期',
  `leave_reason` text NOT NULL COMMENT '请假原因',
  `application_time` datetime NOT NULL COMMENT '申请时间',
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT '申请状态：pending待审批，approved已批准，rejected已拒绝',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_kkh_xnxq` (`kkh`, `xnxq`),
  KEY `idx_status` (`status`),
  KEY `idx_class_date` (`class_date`),
  KEY `idx_application_time` (`application_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='请假申请表';

-- 请假附件表
CREATE TABLE IF NOT EXISTS `icalink_leave_attachments` (
  `id` varchar(200) NOT NULL COMMENT '主键ID',
  `application_id` varchar(200) NOT NULL COMMENT '请假申请ID',
  `file_name` varchar(255) NOT NULL COMMENT '文件名',
  `file_path` varchar(500) DEFAULT NULL COMMENT '文件路径(可选，用于文件系统存储)',
  `file_content` LONGBLOB DEFAULT NULL COMMENT '文件内容(二进制数据，用于数据库存储)',
  `file_size` bigint DEFAULT NULL COMMENT '文件大小(字节)',
  `file_type` varchar(100) DEFAULT NULL COMMENT '文件类型',
  `storage_type` enum('file','database') NOT NULL DEFAULT 'database' COMMENT '存储类型：file文件系统存储，database数据库存储',
  `upload_time` datetime NOT NULL COMMENT '上传时间',
  PRIMARY KEY (`id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_upload_time` (`upload_time`),
  KEY `idx_storage_type` (`storage_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='请假附件表';

-- 审批记录表
CREATE TABLE IF NOT EXISTS `icalink_leave_approvals` (
  `id` varchar(200) NOT NULL COMMENT '主键ID',
  `application_id` varchar(200) NOT NULL COMMENT '请假申请ID',
  `approver_id` varchar(40) NOT NULL COMMENT '审批人工号',
  `approver_name` varchar(200) NOT NULL COMMENT '审批人姓名',
  `approval_result` enum('pending','approved','rejected','cancelled') NOT NULL COMMENT '审批结果：approved批准，rejected拒绝',
  `approval_comment` text DEFAULT NULL COMMENT '审批意见',
  `approval_time` datetime DEFAULT NULL COMMENT '审批时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_approver_id` (`approver_id`),
  KEY `idx_approval_time` (`approval_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批记录表';

-- 插入默认配置（使用 INSERT IGNORE 避免重复插入）
INSERT IGNORE INTO `icalink_sync_config` (`config_key`, `config_value`, `description`) VALUES
('sync.batch_size', '50', '批处理大小'),
('sync.retry_attempts', '3', '重试次数'),
('sync.retry_delay', '5000', '重试延迟(毫秒)'),
('sync.enable_auto_sync', 'true', '是否启用自动同步'),
('attendance.checkin_window', '30', '签到时间窗口(分钟)'),
('attendance.enable_leave', 'true', '是否启用请假功能'),
('attendance.auto_close_after', '2', '自动关闭考勤时间(小时)'),
('wps.calendar_name_template', '课表-{semester}', 'WPS日历名称模板'),
('wps.schedule_description_template', '课程：{course}\n教师：{teachers}\n教室：{rooms}\n节次：{periods}', 'WPS日程描述模板'),
('leave.auto_approve_hours', '24', '请假申请自动审批时间(小时)'),
('leave.max_attachment_size', '10485760', '请假附件最大大小(字节，默认10MB)'),
('leave.allowed_file_types', 'jpg,jpeg,png,pdf,doc,docx', '允许的附件文件类型'); 