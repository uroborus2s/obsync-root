-- @stratix/tasks 数据库架构设计 (MySQL 5.7)
-- 工作流任务管理系统数据库表结构
-- 支持流程定义与实例分离、动态并行任务生成、中断恢复机制

-- ============================================================================
-- 1. 流程定义表 (workflow_definitions)
-- 存储工作流模板定义，作为流程实例的蓝图
-- ============================================================================
CREATE TABLE workflow_definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',

    -- 流程定义DSL (JSON格式)
    definition JSON NOT NULL,

    -- 流程配置
    config JSON,

    -- 状态管理
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, deprecated, archived
    is_active BOOLEAN NOT NULL DEFAULT FALSE,

    -- 元数据 (JSON数组格式存储)
    tags JSON,
    category VARCHAR(100),

    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    -- 约束
    UNIQUE KEY workflow_definitions_name_version_unique (name, version),
    CONSTRAINT workflow_definitions_status_check CHECK (status IN ('draft', 'active', 'deprecated', 'archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. 流程实例表 (workflow_instances)
-- 存储具体的工作流执行实例
-- ============================================================================
CREATE TABLE workflow_instances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workflow_definition_id INT NOT NULL,

    -- 实例标识
    name VARCHAR(255),
    external_id VARCHAR(255), -- 外部系统关联ID

    -- 执行状态
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, paused, completed, failed, cancelled

    -- 执行上下文和结果
    input_data JSON,
    output_data JSON,
    context_data JSON, -- 运行时上下文

    -- 时间信息
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    paused_at TIMESTAMP NULL,

    -- 错误信息
    error_message TEXT,
    error_details JSON,

    -- 重试配置
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,

    -- 优先级和调度
    priority INT DEFAULT 0,
    scheduled_at TIMESTAMP NULL,

    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    -- 约束
    CONSTRAINT workflow_instances_status_check CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    CONSTRAINT workflow_instances_priority_check CHECK (priority >= 0),
    CONSTRAINT workflow_instances_retry_check CHECK (retry_count >= 0 AND max_retries >= 0),

    -- 外键约束
    FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. 任务节点表 (task_nodes)
-- 存储工作流实例中的具体任务节点
-- ============================================================================
CREATE TABLE task_nodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workflow_instance_id INT NOT NULL,

    -- 节点标识
    node_key VARCHAR(255) NOT NULL, -- 在流程定义中的节点标识
    node_name VARCHAR(255) NOT NULL,
    node_type VARCHAR(100) NOT NULL, -- task, parallel, condition, loop, subprocess

    -- 执行器信息
    executor_name VARCHAR(255), -- 执行器名称
    executor_config JSON,

    -- 节点状态
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, skipped, cancelled

    -- 执行数据
    input_data JSON,
    output_data JSON,

    -- 依赖关系
    parent_node_id INT,
    depends_on JSON, -- 依赖的节点ID数组，存储为JSON格式

    -- 并行执行信息
    parallel_group_id VARCHAR(255), -- 并行组标识
    parallel_index INT, -- 在并行组中的索引

    -- 时间信息
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    -- 错误信息
    error_message TEXT,
    error_details JSON,

    -- 重试信息
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,

    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT task_nodes_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled')),
    CONSTRAINT task_nodes_type_check CHECK (node_type IN ('task', 'parallel', 'condition', 'loop', 'subprocess')),
    CONSTRAINT task_nodes_retry_check CHECK (retry_count >= 0 AND max_retries >= 0),
    UNIQUE KEY task_nodes_workflow_node_unique (workflow_instance_id, node_key),

    -- 外键约束
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_node_id) REFERENCES task_nodes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. 执行记录表 (execution_logs)
-- 存储任务执行的详细日志记录
-- ============================================================================
CREATE TABLE execution_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workflow_instance_id INT NOT NULL,
    task_node_id INT,

    -- 日志信息
    log_level VARCHAR(20) NOT NULL DEFAULT 'info', -- debug, info, warn, error
    message TEXT NOT NULL,
    details JSON,

    -- 执行上下文
    executor_name VARCHAR(255),
    execution_phase VARCHAR(100), -- start, progress, complete, error, retry

    -- 时间戳
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT execution_logs_level_check CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
    CONSTRAINT execution_logs_phase_check CHECK (execution_phase IN ('start', 'progress', 'complete', 'error', 'retry')),

    -- 外键约束
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (task_node_id) REFERENCES task_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. 工作流调度表 (workflow_schedules)
-- 存储工作流的调度配置
-- ============================================================================
CREATE TABLE workflow_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workflow_definition_id INT NOT NULL,

    -- 调度配置
    name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(255), -- Cron表达式
    timezone VARCHAR(100) DEFAULT 'UTC',

    -- 调度状态
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    next_run_at TIMESTAMP NULL,
    last_run_at TIMESTAMP NULL,

    -- 调度参数
    input_data JSON,

    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    -- 外键约束
    FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
