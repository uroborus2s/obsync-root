-- =====================================================
-- @wps/app-icalink 考勤系统数据库表结构
-- 基于 MySQL 5.7+ 兼容设计
-- 创建时间: 2025-01-25
-- 版本: 1.0.0
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 学生签到记录表 (icalink_attendance_records)
-- 存储学生的具体签到记录，关联icasync_attendance_courses表
-- =====================================================

DROP TABLE IF EXISTS `icalink_attendance_records`;

CREATE TABLE `icalink_attendance_records` (
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_course_student` (`attendance_course_id`, `student_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`),
  KEY `idx_checkin_time` (`checkin_time`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_student_status` (`student_id`, `status`),
  KEY `idx_course_status` (`attendance_course_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='学生签到记录表-存储具体的签到数据';

-- =====================================================
-- 2. 请假申请表 (icalink_leave_applications)
-- 存储学生的请假申请信息
-- =====================================================

DROP TABLE IF EXISTS `icalink_leave_applications`;

CREATE TABLE `icalink_leave_applications` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `attendance_record_id` bigint(20) NOT NULL COMMENT '关联签到记录ID',
  `student_id` varchar(100) NOT NULL COMMENT '学生ID',
  `student_name` varchar(200) NOT NULL COMMENT '学生姓名',
  `course_id` varchar(100) NOT NULL COMMENT '课程ID(kkh)',
  `course_name` varchar(500) NOT NULL COMMENT '课程名称',
  `class_date` date NOT NULL COMMENT '上课日期',
  `class_time` varchar(50) NOT NULL COMMENT '上课时间',
  `class_location` varchar(500) COMMENT '上课地点',
  `teacher_id` varchar(100) NOT NULL COMMENT '授课教师ID',
  `teacher_name` varchar(200) NOT NULL COMMENT '授课教师姓名',
  `leave_type` enum('sick','personal','emergency','other') NOT NULL DEFAULT 'personal' COMMENT '请假类型',
  `leave_reason` text NOT NULL COMMENT '请假原因',
  `status` enum('leave_pending','leave','leave_rejected','cancelled') NOT NULL DEFAULT 'leave_pending' COMMENT '申请状态',
  `application_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `approval_time` datetime NULL COMMENT '审批时间',
  `approval_comment` text COMMENT '审批意见',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) COMMENT '创建人',
  `updated_by` varchar(100) COMMENT '更新人',
  `metadata` json DEFAULT NULL COMMENT '扩展元数据',
  PRIMARY KEY (`id`),
  KEY `idx_attendance_record` (`attendance_record_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_status` (`status`),
  KEY `idx_application_time` (`application_time`),
  KEY `idx_class_date` (`class_date`),
  KEY `idx_student_status` (`student_id`, `status`),
  KEY `idx_teacher_status` (`teacher_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='请假申请表-存储学生请假申请信息';

-- =====================================================
-- 3. 请假申请图片附件表 (icalink_leave_attachments)
-- 存储请假申请的图片附件信息，仅支持图片格式，内容直接保存在数据库
-- =====================================================

DROP TABLE IF EXISTS `icalink_leave_attachments`;

CREATE TABLE `icalink_leave_attachments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `leave_application_id` bigint(20) NOT NULL COMMENT '关联请假申请ID',
  `image_name` varchar(500) NOT NULL COMMENT '图片文件名',
  `image_size` bigint(20) NOT NULL COMMENT '图片大小(字节)',
  `image_type` enum('image/jpeg','image/png','image/gif','image/webp') NOT NULL COMMENT '图片类型(仅支持常见图片格式)',
  `image_extension` varchar(10) NOT NULL COMMENT '图片扩展名(.jpg,.png,.gif,.webp)',
  `image_content` longblob NOT NULL COMMENT '图片内容(Base64编码存储)',
  `image_width` int(11) COMMENT '图片宽度(像素)',
  `image_height` int(11) COMMENT '图片高度(像素)',
  `thumbnail_content` mediumblob COMMENT '缩略图内容(Base64编码)',
  `upload_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) COMMENT '创建人',
  `metadata` json DEFAULT NULL COMMENT '扩展元数据',
  PRIMARY KEY (`id`),
  KEY `idx_leave_application` (`leave_application_id`),
  KEY `idx_upload_time` (`upload_time`),
  KEY `idx_image_type` (`image_type`),
  KEY `idx_image_size` (`image_size`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='请假申请图片附件表-仅支持图片格式，内容直接存储在数据库中';

-- =====================================================
-- 4. 请假审批记录表 (icalink_leave_approvals)
-- 存储请假申请的审批流程记录
-- =====================================================

DROP TABLE IF EXISTS `icalink_leave_approvals`;

CREATE TABLE `icalink_leave_approvals` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `leave_application_id` bigint(20) NOT NULL COMMENT '关联请假申请ID',
  `approver_id` varchar(100) NOT NULL COMMENT '审批人ID(教师工号)',
  `approver_name` varchar(200) NOT NULL COMMENT '审批人姓名',
  `approver_department` varchar(200) COMMENT '审批人部门',
  `approval_result` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending' COMMENT '审批结果',
  `approval_comment` text COMMENT '审批意见',
  `approval_time` datetime NULL COMMENT '审批时间',
  `approval_order` int(11) NOT NULL DEFAULT 1 COMMENT '审批顺序',
  `is_final_approver` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否最终审批人',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) COMMENT '创建人',
  `updated_by` varchar(100) COMMENT '更新人',
  `metadata` json DEFAULT NULL COMMENT '扩展元数据',
  PRIMARY KEY (`id`),
  KEY `idx_leave_application` (`leave_application_id`),
  KEY `idx_approver_id` (`approver_id`),
  KEY `idx_approval_result` (`approval_result`),
  KEY `idx_approval_time` (`approval_time`),
  KEY `idx_approval_order` (`approval_order`),
  KEY `idx_approver_result` (`approver_id`, `approval_result`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='请假审批记录表-存储审批流程和结果';

-- =====================================================
-- 5. 系统配置表 (icalink_system_configs)
-- 存储系统级配置参数
-- =====================================================

DROP TABLE IF EXISTS `icalink_system_configs`;

CREATE TABLE `icalink_system_configs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `config_key` varchar(200) NOT NULL COMMENT '配置键',
  `config_value` text COMMENT '配置值',
  `config_type` enum('string','number','boolean','json','array') NOT NULL DEFAULT 'string' COMMENT '配置类型',
  `config_group` varchar(100) NOT NULL DEFAULT 'default' COMMENT '配置分组',
  `description` varchar(1000) COMMENT '配置描述',
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否系统配置',
  `is_encrypted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否加密存储',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) COMMENT '创建人',
  `updated_by` varchar(100) COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_config_group` (`config_group`),
  KEY `idx_is_system` (`is_system`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='系统配置表-存储系统级配置参数';

-- =====================================================
-- 添加外键约束
-- =====================================================

-- 请假申请表外键约束
ALTER TABLE `icalink_leave_applications`
ADD CONSTRAINT `fk_leave_applications_attendance_record`
FOREIGN KEY (`attendance_record_id`) REFERENCES `icalink_attendance_records` (`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- 请假申请图片附件表外键约束
ALTER TABLE `icalink_leave_attachments`
ADD CONSTRAINT `fk_leave_attachments_application`
FOREIGN KEY (`leave_application_id`) REFERENCES `icalink_leave_applications` (`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- 请假审批记录表外键约束
ALTER TABLE `icalink_leave_approvals`
ADD CONSTRAINT `fk_leave_approvals_application`
FOREIGN KEY (`leave_application_id`) REFERENCES `icalink_leave_applications` (`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- 恢复外键检查
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 执行完成提示
-- =====================================================

-- 所有 @wps/app-icalink 考勤系统数据表创建完成
-- 包含以下 5 个核心表：
-- 1. icalink_attendance_records - 学生签到记录表
-- 2. icalink_leave_applications - 请假申请表
-- 3. icalink_leave_attachments - 请假申请附件表
-- 4. icalink_leave_approvals - 请假审批记录表
-- 5. icalink_system_configs - 系统配置表
--
-- 执行时间: 预计 < 3 秒
-- 适用版本: MySQL 5.7+
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
