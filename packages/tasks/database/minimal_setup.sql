-- =====================================================
-- @stratix/tasks 最小化数据库设置脚本
-- 只包含实际使用的表结构，移除未使用的视图和存储过程
-- =====================================================

-- 设置字符集
SET NAMES utf8mb4;

-- 运行中任务表
CREATE TABLE IF NOT EXISTS `running_tasks` (
  `id` varchar(200) NOT NULL COMMENT '任务ID',
  `parent_id` varchar(200) DEFAULT NULL COMMENT '父任务ID',
  `name` varchar(1000) NOT NULL COMMENT '任务名称',
  `description` text COMMENT '任务描述',
  `task_type` varchar(100) NOT NULL COMMENT '任务类型',
  `status` enum('pending','running','paused','success','failed','cancelled','completed') NOT NULL DEFAULT 'pending' COMMENT '任务状态',
  `priority` int NOT NULL DEFAULT '0' COMMENT '优先级',
  `progress` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT '进度百分比(0-100)',
  `executor_name` varchar(100) DEFAULT NULL COMMENT '执行器名称',
  `metadata` json DEFAULT NULL COMMENT '任务元数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `started_at` timestamp NULL DEFAULT NULL COMMENT '开始时间',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间（预留）',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_task_type` (`task_type`),
  KEY `idx_executor_name` (`executor_name`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_running_tasks_parent` FOREIGN KEY (`parent_id`) REFERENCES `running_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='运行中任务表';

-- 完成任务表
CREATE TABLE IF NOT EXISTS `completed_tasks` (
  `id` varchar(200) NOT NULL COMMENT '任务ID',
  `parent_id` varchar(200) DEFAULT NULL COMMENT '父任务ID',
  `name` varchar(1000) NOT NULL COMMENT '任务名称',
  `description` text COMMENT '任务描述',
  `task_type` varchar(100) NOT NULL COMMENT '任务类型',
  `status` enum('pending','running','paused','success','failed','cancelled','completed') NOT NULL DEFAULT 'pending' COMMENT '任务状态',
  `priority` int NOT NULL DEFAULT '0' COMMENT '优先级',
  `progress` decimal(5,2) NOT NULL DEFAULT '100.00' COMMENT '最终进度',
  `executor_name` varchar(100) DEFAULT NULL COMMENT '执行器名称',
  `metadata` json DEFAULT NULL COMMENT '任务元数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  `started_at` timestamp NULL DEFAULT NULL COMMENT '开始时间',
  `completed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '完成时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_task_type` (`task_type`),
  KEY `idx_executor_name` (`executor_name`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_completed_at` (`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='完成任务表';

-- 共享上下文表
CREATE TABLE IF NOT EXISTS `shared_contexts` (
  `id` varchar(255) NOT NULL COMMENT '唯一标识符',
  `root_task_id` varchar(200) NOT NULL COMMENT '根任务ID',
  `data` json NOT NULL COMMENT 'JSON格式的共享数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号',
  `checksum` varchar(64) DEFAULT NULL COMMENT 'SHA256校验和',
  PRIMARY KEY (`id`),
  KEY `idx_root_task_id` (`root_task_id`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务树共享上下文表';

-- 验证表创建
SELECT 
  TABLE_NAME,
  TABLE_COMMENT,
  CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN ('running_tasks', 'completed_tasks', 'shared_contexts')
ORDER BY TABLE_NAME;

SELECT '最小化数据库设置完成 - 只包含核心表结构' as status, NOW() as completed_at; 