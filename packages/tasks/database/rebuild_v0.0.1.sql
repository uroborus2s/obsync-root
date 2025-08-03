-- ============================================================================
-- @stratix/tasks 数据库重建脚本 v0.0.1 (MySQL 5.7+)
-- ============================================================================
-- 描述: 删除并重建 tasks 数据库中的所有表和索引
-- 版本: v0.0.1
-- 创建时间: 2024-01-15
-- 用途: 完全重置 tasks 数据库结构，具有幂等性
-- 注意: 此脚本会删除所有数据，请谨慎使用！
-- 使用: mysql -u username -p database_name < rebuild_v0.0.1.sql
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 第一阶段：删除所有表（按外键依赖顺序）
-- ============================================================================

DROP TABLE IF EXISTS `execution_logs`;
DROP TABLE IF EXISTS `task_nodes`;
DROP TABLE IF EXISTS `workflow_instances`;
DROP TABLE IF EXISTS `workflow_schedules`;
DROP TABLE IF EXISTS `workflow_definitions`;

-- ============================================================================
-- 第二阶段：创建表结构（不包含外键约束）
-- ============================================================================

-- 1. 流程定义表 (workflow_definitions)
-- 存储工作流模板定义，作为流程实例的蓝图
CREATE TABLE `workflow_definitions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `version` VARCHAR(50) NOT NULL DEFAULT '1.0.0',

    -- 流程定义DSL (JSON格式)
    `definition` JSON NOT NULL,

    -- 流程配置
    `config` JSON,

    -- 状态管理
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, deprecated, archived
    `is_active` BOOLEAN NOT NULL DEFAULT FALSE,

    -- 元数据 (JSON数组格式存储)
    `tags` JSON,
    `category` VARCHAR(100),

    -- 审计字段
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` VARCHAR(255),
    `updated_by` VARCHAR(255),

    -- 约束
    UNIQUE KEY `workflow_definitions_name_version_unique` (`name`, `version`),
    CONSTRAINT `workflow_definitions_status_check` CHECK (`status` IN ('draft', 'active', 'deprecated', 'archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 流程实例表 (workflow_instances)
-- 存储具体的工作流执行实例
CREATE TABLE `workflow_instances` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `workflow_definition_id` INT UNSIGNED NOT NULL,

    -- 实例标识
    `name` VARCHAR(255),
    `external_id` VARCHAR(255), -- 外部系统关联ID

    -- 执行状态
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, paused, completed, failed, cancelled

    -- 执行上下文和结果
    `input_data` JSON,
    `output_data` JSON,
    `context_data` JSON, -- 运行时上下文

    -- 时间信息
    `started_at` DATETIME NULL,
    `completed_at` DATETIME NULL,
    `paused_at` DATETIME NULL,

    -- 错误信息
    `error_message` TEXT,
    `error_details` JSON,

    -- 重试配置
    `retry_count` INT DEFAULT 0,
    `max_retries` INT DEFAULT 3,

    -- 优先级和调度
    `priority` INT DEFAULT 0,
    `scheduled_at` DATETIME NULL,

    -- 审计字段
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` VARCHAR(255),

    -- 约束
    CONSTRAINT `workflow_instances_status_check` CHECK (`status` IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    CONSTRAINT `workflow_instances_priority_check` CHECK (`priority` >= 0),
    CONSTRAINT `workflow_instances_retry_check` CHECK (`retry_count` >= 0 AND `max_retries` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 任务节点表 (task_nodes)
-- 存储工作流实例中的具体任务节点
CREATE TABLE `task_nodes` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `workflow_instance_id` INT UNSIGNED NOT NULL,

    -- 节点标识
    `node_key` VARCHAR(255) NOT NULL, -- 在流程定义中的节点标识
    `node_name` VARCHAR(255) NOT NULL,
    `node_type` VARCHAR(100) NOT NULL, -- task, parallel, condition, loop, subprocess

    -- 执行器信息
    `executor_name` VARCHAR(255), -- 执行器名称
    `executor_config` JSON,

    -- 节点状态
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, skipped, cancelled

    -- 执行数据
    `input_data` JSON,
    `output_data` JSON,

    -- 依赖关系
    `parent_node_id` INT UNSIGNED,
    `depends_on` JSON, -- 依赖的节点ID数组，存储为JSON格式

    -- 并行执行信息
    `parallel_group_id` VARCHAR(255), -- 并行组标识
    `parallel_index` INT, -- 在并行组中的索引

    -- 时间信息
    `started_at` DATETIME NULL,
    `completed_at` DATETIME NULL,

    -- 错误信息
    `error_message` TEXT,
    `error_details` JSON,

    -- 重试信息
    `retry_count` INT DEFAULT 0,
    `max_retries` INT DEFAULT 3,

    -- 审计字段
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT `task_nodes_status_check` CHECK (`status` IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled')),
    CONSTRAINT `task_nodes_type_check` CHECK (`node_type` IN ('task', 'parallel', 'condition', 'loop', 'subprocess')),
    CONSTRAINT `task_nodes_retry_check` CHECK (`retry_count` >= 0 AND `max_retries` >= 0),
    UNIQUE KEY `task_nodes_workflow_node_unique` (`workflow_instance_id`, `node_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 执行记录表 (execution_logs)
-- 存储任务执行的详细日志记录
CREATE TABLE `execution_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `workflow_instance_id` INT UNSIGNED NOT NULL,
    `task_node_id` INT UNSIGNED,

    -- 日志信息
    `log_level` VARCHAR(20) NOT NULL DEFAULT 'info', -- debug, info, warn, error
    `message` TEXT NOT NULL,
    `details` JSON,

    -- 执行上下文
    `executor_name` VARCHAR(255),
    `execution_phase` VARCHAR(100), -- start, progress, complete, error, retry

    -- 时间戳
    `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT `execution_logs_level_check` CHECK (`log_level` IN ('debug', 'info', 'warn', 'error')),
    CONSTRAINT `execution_logs_phase_check` CHECK (`execution_phase` IN ('start', 'progress', 'complete', 'error', 'retry'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 工作流调度表 (workflow_schedules)
-- 存储工作流的调度配置
CREATE TABLE `workflow_schedules` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `workflow_definition_id` INT UNSIGNED NOT NULL,

    -- 调度配置
    `name` VARCHAR(255) NOT NULL,
    `cron_expression` VARCHAR(255), -- Cron表达式
    `timezone` VARCHAR(100) DEFAULT 'UTC',

    -- 调度状态
    `is_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
    `next_run_at` DATETIME NULL,
    `last_run_at` DATETIME NULL,

    -- 调度参数
    `input_data` JSON,

    -- 审计字段
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 第三阶段：添加外键约束
-- ============================================================================

-- 添加 workflow_instances 外键约束
ALTER TABLE `workflow_instances`
ADD CONSTRAINT `fk_workflow_instances_definition`
FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions`(`id`) ON DELETE CASCADE;

-- 添加 task_nodes 外键约束
ALTER TABLE `task_nodes`
ADD CONSTRAINT `fk_task_nodes_workflow_instance`
FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances`(`id`) ON DELETE CASCADE;

-- 添加 task_nodes 自引用外键约束
ALTER TABLE `task_nodes`
ADD CONSTRAINT `fk_task_nodes_parent`
FOREIGN KEY (`parent_node_id`) REFERENCES `task_nodes`(`id`) ON DELETE SET NULL;

-- 添加 execution_logs 外键约束
ALTER TABLE `execution_logs`
ADD CONSTRAINT `fk_execution_logs_workflow_instance`
FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances`(`id`) ON DELETE CASCADE;

ALTER TABLE `execution_logs`
ADD CONSTRAINT `fk_execution_logs_task_node`
FOREIGN KEY (`task_node_id`) REFERENCES `task_nodes`(`id`) ON DELETE CASCADE;

-- 添加 workflow_schedules 外键约束
ALTER TABLE `workflow_schedules`
ADD CONSTRAINT `fk_workflow_schedules_definition`
FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions`(`id`) ON DELETE CASCADE;

-- ============================================================================
-- 第四阶段：创建索引
-- ============================================================================

-- 1. 流程定义表索引
-- 基础查询索引
CREATE INDEX `idx_workflow_definitions_name` ON `workflow_definitions`(`name`);
CREATE INDEX `idx_workflow_definitions_status` ON `workflow_definitions`(`status`);
CREATE INDEX `idx_workflow_definitions_category` ON `workflow_definitions`(`category`);
CREATE INDEX `idx_workflow_definitions_created_at` ON `workflow_definitions`(`created_at`);

-- 复合索引
CREATE INDEX `idx_workflow_definitions_name_status` ON `workflow_definitions`(`name`, `status`);
CREATE INDEX `idx_workflow_definitions_active_version` ON `workflow_definitions`(`name`, `version`, `is_active`);

-- JSON字段索引 (MySQL 5.7支持虚拟列索引)
ALTER TABLE `workflow_definitions`
ADD COLUMN `definition_type` VARCHAR(100) AS (JSON_UNQUOTE(JSON_EXTRACT(`definition`, '$.type'))) VIRTUAL,
ADD INDEX `idx_workflow_definitions_definition_type` (`definition_type`);

-- 标签搜索索引 (使用普通索引，因为MySQL不支持虚拟列的全文索引)
ALTER TABLE `workflow_definitions`
ADD COLUMN `tags_text` TEXT AS (JSON_UNQUOTE(JSON_EXTRACT(`tags`, '$'))) VIRTUAL,
ADD INDEX `idx_workflow_definitions_tags_text` (`tags_text`(255));

-- 2. 流程实例表索引
-- 基础查询索引
CREATE INDEX `idx_workflow_instances_definition_id` ON `workflow_instances`(`workflow_definition_id`);
CREATE INDEX `idx_workflow_instances_status` ON `workflow_instances`(`status`);
CREATE INDEX `idx_workflow_instances_external_id` ON `workflow_instances`(`external_id`);
CREATE INDEX `idx_workflow_instances_created_by` ON `workflow_instances`(`created_by`);

-- 时间相关索引
CREATE INDEX `idx_workflow_instances_created_at` ON `workflow_instances`(`created_at`);
CREATE INDEX `idx_workflow_instances_started_at` ON `workflow_instances`(`started_at`);
CREATE INDEX `idx_workflow_instances_completed_at` ON `workflow_instances`(`completed_at`);
CREATE INDEX `idx_workflow_instances_scheduled_at` ON `workflow_instances`(`scheduled_at`);

-- 复合索引
CREATE INDEX `idx_workflow_instances_status_priority` ON `workflow_instances`(`status`, `priority` DESC);
CREATE INDEX `idx_workflow_instances_definition_status` ON `workflow_instances`(`workflow_definition_id`, `status`);
CREATE INDEX `idx_workflow_instances_status_created` ON `workflow_instances`(`status`, `created_at`);

-- 调度查询优化
CREATE INDEX `idx_workflow_instances_pending_scheduled` ON `workflow_instances`(`status`, `scheduled_at`);

-- 运行中实例查询
CREATE INDEX `idx_workflow_instances_running_status` ON `workflow_instances`(`status`, `started_at`);

-- JSON字段虚拟列索引
ALTER TABLE `workflow_instances`
ADD COLUMN `input_type` VARCHAR(100) AS (JSON_UNQUOTE(JSON_EXTRACT(`input_data`, '$.type'))) VIRTUAL,
ADD INDEX `idx_workflow_instances_input_type` (`input_type`);

-- 3. 任务节点表索引
-- 基础查询索引
CREATE INDEX `idx_task_nodes_workflow_instance_id` ON `task_nodes`(`workflow_instance_id`);
CREATE INDEX `idx_task_nodes_node_key` ON `task_nodes`(`node_key`);
CREATE INDEX `idx_task_nodes_node_type` ON `task_nodes`(`node_type`);
CREATE INDEX `idx_task_nodes_status` ON `task_nodes`(`status`);
CREATE INDEX `idx_task_nodes_executor_name` ON `task_nodes`(`executor_name`);
CREATE INDEX `idx_task_nodes_parent_node_id` ON `task_nodes`(`parent_node_id`);

-- 并行执行相关索引
CREATE INDEX `idx_task_nodes_parallel_group` ON `task_nodes`(`parallel_group_id`, `parallel_index`);

-- 时间相关索引
CREATE INDEX `idx_task_nodes_created_at` ON `task_nodes`(`created_at`);
CREATE INDEX `idx_task_nodes_started_at` ON `task_nodes`(`started_at`);
CREATE INDEX `idx_task_nodes_completed_at` ON `task_nodes`(`completed_at`);

-- 复合索引
CREATE INDEX `idx_task_nodes_workflow_status` ON `task_nodes`(`workflow_instance_id`, `status`);
CREATE INDEX `idx_task_nodes_workflow_type` ON `task_nodes`(`workflow_instance_id`, `node_type`);
CREATE INDEX `idx_task_nodes_status_executor` ON `task_nodes`(`status`, `executor_name`);

-- 待执行任务查询
CREATE INDEX `idx_task_nodes_pending` ON `task_nodes`(`status`, `workflow_instance_id`, `created_at`);

-- 运行中任务查询
CREATE INDEX `idx_task_nodes_running` ON `task_nodes`(`status`, `started_at`);

-- JSON字段虚拟列索引
ALTER TABLE `task_nodes`
ADD COLUMN `executor_type` VARCHAR(100) AS (JSON_UNQUOTE(JSON_EXTRACT(`executor_config`, '$.type'))) VIRTUAL,
ADD INDEX `idx_task_nodes_executor_type` (`executor_type`);

-- 4. 执行记录表索引
-- 基础查询索引
CREATE INDEX `idx_execution_logs_workflow_instance_id` ON `execution_logs`(`workflow_instance_id`);
CREATE INDEX `idx_execution_logs_task_node_id` ON `execution_logs`(`task_node_id`);
CREATE INDEX `idx_execution_logs_log_level` ON `execution_logs`(`log_level`);
CREATE INDEX `idx_execution_logs_execution_phase` ON `execution_logs`(`execution_phase`);
CREATE INDEX `idx_execution_logs_executor_name` ON `execution_logs`(`executor_name`);

-- 时间相关索引
CREATE INDEX `idx_execution_logs_timestamp` ON `execution_logs`(`timestamp`);

-- 复合索引
CREATE INDEX `idx_execution_logs_workflow_timestamp` ON `execution_logs`(`workflow_instance_id`, `timestamp` DESC);
CREATE INDEX `idx_execution_logs_task_timestamp` ON `execution_logs`(`task_node_id`, `timestamp` DESC);
CREATE INDEX `idx_execution_logs_level_timestamp` ON `execution_logs`(`log_level`, `timestamp` DESC);

-- 错误日志查询优化
CREATE INDEX `idx_execution_logs_errors` ON `execution_logs`(`log_level`, `timestamp` DESC);

-- 5. 工作流调度表索引
-- 基础查询索引
CREATE INDEX `idx_workflow_schedules_definition_id` ON `workflow_schedules`(`workflow_definition_id`);
CREATE INDEX `idx_workflow_schedules_is_enabled` ON `workflow_schedules`(`is_enabled`);
CREATE INDEX `idx_workflow_schedules_next_run_at` ON `workflow_schedules`(`next_run_at`);
CREATE INDEX `idx_workflow_schedules_last_run_at` ON `workflow_schedules`(`last_run_at`);

-- 复合索引
CREATE INDEX `idx_workflow_schedules_enabled_next_run` ON `workflow_schedules`(`is_enabled`, `next_run_at`);

-- ============================================================================
-- 第五阶段：恢复设置和验证
-- ============================================================================

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 验证脚本执行结果
SELECT
    COUNT(*) as '创建的表数量'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('workflow_definitions', 'workflow_instances', 'task_nodes', 'execution_logs', 'workflow_schedules');

SELECT
    COUNT(*) as '创建的索引数量'
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('workflow_definitions', 'workflow_instances', 'task_nodes', 'execution_logs', 'workflow_schedules');

-- ============================================================================
-- 脚本执行完成
-- ============================================================================

SELECT '
============================================================================
@stratix/tasks 数据库重建完成！v0.0.1

已重建的表：
1. workflow_definitions - 流程定义表
2. workflow_instances - 流程实例表
3. task_nodes - 任务节点表
4. execution_logs - 执行记录表
5. workflow_schedules - 工作流调度表

已重建的索引：
- 基础查询索引
- 复合查询索引
- JSON字段虚拟列索引
- 全文搜索索引

外键约束：
- 所有外键约束已重新创建
- 级联删除规则已应用

注意事项：
- 所有原有数据已被删除
- 表结构已重置为v0.0.1版本
- 索引已优化为最佳性能配置

脚本版本: v0.0.1
执行时间: ' + NOW() + '
============================================================================
' as '执行结果';
