-- @stratix/tasks 初始数据库架构迁移
-- Migration: 001_initial_schema
-- Description: 创建工作流引擎的初始数据库架构
-- Created: 2025-08-02

-- ============================================================================
-- 迁移信息表
-- ============================================================================

-- 创建迁移记录表（如果不存在）
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 记录此次迁移
INSERT INTO schema_migrations (version, description, checksum) 
VALUES ('001', 'Initial workflow engine schema', SHA2('001_initial_schema', 256))
ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 1. 工作流定义相关表
-- ============================================================================

-- 工作流定义表
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id VARCHAR(255) PRIMARY KEY COMMENT '工作流定义唯一标识',
    name VARCHAR(255) NOT NULL COMMENT '工作流名称',
    version VARCHAR(50) NOT NULL COMMENT '版本号',
    description TEXT COMMENT '工作流描述',
    definition_json JSON NOT NULL COMMENT '工作流定义JSON',
    tags JSON COMMENT '标签数组',
    category VARCHAR(100) COMMENT '分类',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_by VARCHAR(255) COMMENT '创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY unique_name_version (name, version),
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流定义表';

-- 工作流定义变更历史表
CREATE TABLE IF NOT EXISTS workflow_definition_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    definition_id VARCHAR(255) NOT NULL COMMENT '工作流定义ID',
    version VARCHAR(50) NOT NULL COMMENT '版本号',
    change_type ENUM('created', 'updated', 'activated', 'deactivated', 'deleted') NOT NULL COMMENT '变更类型',
    definition_json JSON COMMENT '定义快照',
    change_reason TEXT COMMENT '变更原因',
    changed_by VARCHAR(255) COMMENT '变更者',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
    
    INDEX idx_definition_id (definition_id),
    INDEX idx_version (version),
    INDEX idx_change_type (change_type),
    INDEX idx_changed_at (changed_at),
    
    FOREIGN KEY (definition_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流定义变更历史表';

-- ============================================================================
-- 2. 工作流实例相关表
-- ============================================================================

-- 工作流实例表
CREATE TABLE IF NOT EXISTS workflow_instances (
    id VARCHAR(255) PRIMARY KEY COMMENT '工作流实例唯一标识',
    definition_id VARCHAR(255) NOT NULL COMMENT '工作流定义ID',
    definition_version VARCHAR(50) NOT NULL COMMENT '使用的定义版本',
    name VARCHAR(255) COMMENT '实例名称',
    status ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'timeout') NOT NULL DEFAULT 'pending' COMMENT '实例状态',
    priority INT DEFAULT 0 COMMENT '优先级',
    
    input_data JSON COMMENT '输入数据',
    output_data JSON COMMENT '输出数据',
    context_data JSON COMMENT '上下文数据',
    variables JSON COMMENT '工作流变量',
    
    scheduled_at TIMESTAMP COMMENT '计划执行时间',
    started_at TIMESTAMP COMMENT '开始执行时间',
    completed_at TIMESTAMP COMMENT '完成时间',
    timeout_at TIMESTAMP COMMENT '超时时间',
    
    error_message TEXT COMMENT '错误信息',
    error_stack TEXT COMMENT '错误堆栈',
    
    retry_count INT DEFAULT 0 COMMENT '重试次数',
    max_retries INT DEFAULT 0 COMMENT '最大重试次数',
    
    triggered_by VARCHAR(255) COMMENT '触发者',
    parent_instance_id VARCHAR(255) COMMENT '父实例ID（子工作流）',
    correlation_id VARCHAR(255) COMMENT '关联ID',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_definition_id (definition_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_started_at (started_at),
    INDEX idx_completed_at (completed_at),
    INDEX idx_correlation_id (correlation_id),
    INDEX idx_parent_instance_id (parent_instance_id),
    INDEX idx_created_at (created_at),
    INDEX idx_workflow_instances_status_created (status, created_at DESC),
    INDEX idx_workflow_instances_definition_status (definition_id, status, created_at DESC),
    
    FOREIGN KEY (definition_id) REFERENCES workflow_definitions(id),
    FOREIGN KEY (parent_instance_id) REFERENCES workflow_instances(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流实例表';

-- ============================================================================
-- 3. 任务实例相关表
-- ============================================================================

-- 任务实例表
CREATE TABLE IF NOT EXISTS task_instances (
    id VARCHAR(255) PRIMARY KEY COMMENT '任务实例唯一标识',
    workflow_instance_id VARCHAR(255) NOT NULL COMMENT '工作流实例ID',
    task_definition_id VARCHAR(255) NOT NULL COMMENT '任务定义ID',
    name VARCHAR(255) NOT NULL COMMENT '任务名称',
    type ENUM('executor', 'condition', 'parallel', 'sequential', 'sub_workflow') NOT NULL COMMENT '任务类型',
    status ENUM('pending', 'running', 'completed', 'failed', 'skipped', 'retrying', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '任务状态',
    
    executor_name VARCHAR(255) COMMENT '执行器名称',
    execution_order INT COMMENT '执行顺序',
    
    input_data JSON COMMENT '输入数据',
    output_data JSON COMMENT '输出数据',
    parameters JSON COMMENT '任务参数',
    
    scheduled_at TIMESTAMP COMMENT '计划执行时间',
    started_at TIMESTAMP COMMENT '开始执行时间',
    completed_at TIMESTAMP COMMENT '完成时间',
    timeout_at TIMESTAMP COMMENT '超时时间',
    
    error_message TEXT COMMENT '错误信息',
    error_stack TEXT COMMENT '错误堆栈',
    
    retry_count INT DEFAULT 0 COMMENT '重试次数',
    max_retries INT DEFAULT 0 COMMENT '最大重试次数',
    
    dependencies JSON COMMENT '依赖的任务ID数组',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_workflow_instance_id (workflow_instance_id),
    INDEX idx_task_definition_id (task_definition_id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_execution_order (execution_order),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_started_at (started_at),
    INDEX idx_completed_at (completed_at),
    INDEX idx_created_at (created_at),
    INDEX idx_task_instances_workflow_status (workflow_instance_id, status, execution_order),
    INDEX idx_task_instances_status_scheduled (status, scheduled_at),
    
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务实例表';

-- ============================================================================
-- 4. 执行历史和审计表
-- ============================================================================

-- 执行历史表
CREATE TABLE IF NOT EXISTS execution_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workflow_instance_id VARCHAR(255) NOT NULL COMMENT '工作流实例ID',
    task_instance_id VARCHAR(255) COMMENT '任务实例ID',
    event_type ENUM(
        'workflow_created', 'workflow_started', 'workflow_paused', 'workflow_resumed',
        'workflow_completed', 'workflow_failed', 'workflow_cancelled', 'workflow_timeout',
        'task_created', 'task_started', 'task_completed', 'task_failed', 
        'task_skipped', 'task_retrying', 'task_cancelled'
    ) NOT NULL COMMENT '事件类型',
    event_data JSON COMMENT '事件数据',
    message TEXT COMMENT '事件消息',
    duration_ms BIGINT COMMENT '执行时长（毫秒）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '事件时间',
    
    INDEX idx_workflow_instance_id (workflow_instance_id),
    INDEX idx_task_instance_id (task_instance_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at),
    INDEX idx_execution_history_workflow_event (workflow_instance_id, event_type, created_at DESC),
    INDEX idx_execution_history_task_event (task_instance_id, event_type, created_at DESC),
    
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (task_instance_id) REFERENCES task_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='执行历史表';

-- ============================================================================
-- 5. 调度和触发器表
-- ============================================================================

-- 工作流调度表
CREATE TABLE IF NOT EXISTS workflow_schedules (
    id VARCHAR(255) PRIMARY KEY COMMENT '调度唯一标识',
    definition_id VARCHAR(255) NOT NULL COMMENT '工作流定义ID',
    name VARCHAR(255) NOT NULL COMMENT '调度名称',
    trigger_type ENUM('cron', 'interval', 'event', 'manual') NOT NULL COMMENT '触发类型',
    trigger_config JSON NOT NULL COMMENT '触发配置',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    
    next_run_at TIMESTAMP COMMENT '下次执行时间',
    last_run_at TIMESTAMP COMMENT '上次执行时间',
    
    run_count INT DEFAULT 0 COMMENT '执行次数',
    success_count INT DEFAULT 0 COMMENT '成功次数',
    failure_count INT DEFAULT 0 COMMENT '失败次数',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_definition_id (definition_id),
    INDEX idx_trigger_type (trigger_type),
    INDEX idx_is_active (is_active),
    INDEX idx_next_run_at (next_run_at),
    INDEX idx_last_run_at (last_run_at),
    INDEX idx_workflow_schedules_active_next_run (is_active, next_run_at),
    INDEX idx_workflow_schedules_trigger_active (trigger_type, is_active, next_run_at),
    
    FOREIGN KEY (definition_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流调度表';

-- ============================================================================
-- 6. 性能监控和指标表
-- ============================================================================

-- 性能指标表
CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    metric_type ENUM('workflow', 'task', 'executor') NOT NULL COMMENT '指标类型',
    entity_id VARCHAR(255) NOT NULL COMMENT '实体ID',
    entity_name VARCHAR(255) COMMENT '实体名称',
    
    execution_time_ms BIGINT COMMENT '执行时间（毫秒）',
    memory_usage_mb DECIMAL(10,2) COMMENT '内存使用（MB）',
    cpu_usage_percent DECIMAL(5,2) COMMENT 'CPU使用率',
    
    success_rate DECIMAL(5,4) COMMENT '成功率',
    error_rate DECIMAL(5,4) COMMENT '错误率',
    throughput DECIMAL(10,2) COMMENT '吞吐量',
    
    date_hour DATETIME COMMENT '小时维度',
    date_day DATE COMMENT '日期维度',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_metric_type (metric_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_date_hour (date_hour),
    INDEX idx_date_day (date_day),
    INDEX idx_created_at (created_at),
    INDEX idx_performance_metrics_type_date (metric_type, date_day, entity_id),
    INDEX idx_performance_metrics_entity_hour (entity_id, date_hour DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='性能指标表';

-- ============================================================================
-- 迁移完成标记
-- ============================================================================

-- 更新迁移状态
UPDATE schema_migrations 
SET applied_at = CURRENT_TIMESTAMP 
WHERE version = '001';
