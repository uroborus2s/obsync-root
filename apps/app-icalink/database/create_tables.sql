-- ============================================
-- 同步进度表
-- ============================================
CREATE TABLE IF NOT EXISTS `sync_progress` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `task_name` VARCHAR(100) NOT NULL COMMENT '任务名称，如 absent_student_relations_sync',
  `file_id` VARCHAR(50) NOT NULL COMMENT 'WPS 文件 ID',
  `sheet_id` INT NOT NULL COMMENT 'WPS Sheet ID',
  `status` VARCHAR(20) NOT NULL COMMENT '同步状态：not_started, in_progress, completed, failed, paused',
  `total_count` INT NOT NULL DEFAULT 0 COMMENT '总记录数',
  `synced_count` INT NOT NULL DEFAULT 0 COMMENT '已同步记录数',
  `current_offset` INT NOT NULL DEFAULT 0 COMMENT '当前偏移量',
  `batch_size` INT NOT NULL DEFAULT 100 COMMENT '批次大小',
  `started_at` TIMESTAMP NULL DEFAULT NULL COMMENT '开始时间',
  `completed_at` TIMESTAMP NULL DEFAULT NULL COMMENT '完成时间',
  `last_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  `error_message` TEXT NULL COMMENT '错误信息',
  `failure_count` INT NOT NULL DEFAULT 0 COMMENT '失败次数',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_task_name` (`task_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步进度表-记录各种同步任务的进度信息';

-- ============================================
-- WPS 多维表字段映射表
-- ============================================
CREATE TABLE IF NOT EXISTS `wps_field_mapping` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `file_id` VARCHAR(50) NOT NULL COMMENT 'WPS 文件 ID',
  `sheet_id` INT NOT NULL COMMENT 'WPS Sheet ID',
  `wps_field_id` VARCHAR(50) NOT NULL COMMENT 'WPS 字段 ID',
  `wps_field_name` VARCHAR(100) NOT NULL COMMENT 'WPS 字段名称（中文）',
  `wps_field_type` VARCHAR(50) NOT NULL COMMENT 'WPS 字段类型：Text, Number, Date, SingleSelect 等',
  `db_field_name` VARCHAR(100) NOT NULL COMMENT '数据库字段名称',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用：1-启用，0-禁用',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序顺序',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_file_sheet_wps_field` (`file_id`, `sheet_id`, `wps_field_id`),
  UNIQUE KEY `idx_file_sheet_db_field` (`file_id`, `sheet_id`, `db_field_name`),
  KEY `idx_file_sheet` (`file_id`, `sheet_id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WPS多维表字段映射表-存储WPS字段与数据库字段的映射关系';

-- ============================================
-- 插入初始字段映射数据（可选）
-- ============================================
-- 注意：这些数据需要在首次调用 getSchemas 获取 WPS 字段 ID 后再插入
-- 以下是示例数据结构，实际的 wps_field_id 需要从 API 获取

-- INSERT INTO `wps_field_mapping` 
-- (`file_id`, `sheet_id`, `wps_field_id`, `wps_field_name`, `wps_field_type`, `db_field_name`, `sort_order`)
-- VALUES
-- ('459309344199', 1, 'field_id_from_api', 'ID', 'Number', 'id', 1),
-- ('459309344199', 1, 'field_id_from_api', '课程统计ID', 'Number', 'course_stats_id', 2),
-- ('459309344199', 1, 'field_id_from_api', '课程ID', 'Number', 'course_id', 3),
-- ('459309344199', 1, 'field_id_from_api', '课程代码', 'Text', 'course_code', 4),
-- ('459309344199', 1, 'field_id_from_api', '课程名称', 'Text', 'course_name', 5),
-- ('459309344199', 1, 'field_id_from_api', '学号', 'Text', 'student_id', 6),
-- ('459309344199', 1, 'field_id_from_api', '学生姓名', 'Text', 'student_name', 7),
-- ('459309344199', 1, 'field_id_from_api', '学院', 'Text', 'school_name', 8),
-- ('459309344199', 1, 'field_id_from_api', '班级', 'Text', 'class_name', 9),
-- ('459309344199', 1, 'field_id_from_api', '专业', 'Text', 'major_name', 10),
-- ('459309344199', 1, 'field_id_from_api', '缺勤类型', 'SingleSelect', 'absence_type', 11),
-- ('459309344199', 1, 'field_id_from_api', '统计日期', 'Date', 'stat_date', 12),
-- ('459309344199', 1, 'field_id_from_api', '学期', 'Text', 'semester', 13),
-- ('459309344199', 1, 'field_id_from_api', '教学周', 'Number', 'teaching_week', 14),
-- ('459309344199', 1, 'field_id_from_api', '星期', 'SingleSelect', 'week_day', 15),
-- ('459309344199', 1, 'field_id_from_api', '节次', 'Text', 'periods', 16),
-- ('459309344199', 1, 'field_id_from_api', '时间段', 'SingleSelect', 'time_period', 17),
-- ('459309344199', 1, 'field_id_from_api', '创建时间', 'Date', 'created_at', 18),
-- ('459309344199', 1, 'field_id_from_api', '更新时间', 'Date', 'updated_at', 19);

