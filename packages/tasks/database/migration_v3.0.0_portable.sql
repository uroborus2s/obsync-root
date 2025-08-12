-- =====================================================
-- Stratix Tasks Plugin Database Migration v3.0.0 (Portable Version)
-- 可移植的分布式工作流引擎数据库初始化脚本
--
-- 版本: 3.0.0-portable
-- 创建时间: 2024-01-01
-- 描述: 支持分布式执行的工作流引擎数据库结构（去除数据库特定功能）
-- 兼容性: MySQL 5.7+, PostgreSQL 10+, SQLite 3.25+
-- =====================================================

-- 开始事务
START TRANSACTION;

-- 设置字符集和存储引擎
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 第一步：删除现有表（注意外键依赖顺序）
-- =====================================================

-- 删除日志和监控相关表
DROP TABLE IF EXISTS workflow_execution_logs;

-- 删除分布式执行相关表
DROP TABLE IF EXISTS workflow_failover_events;
DROP TABLE IF EXISTS workflow_node_assignments;
DROP TABLE IF EXISTS workflow_assignments;
DROP TABLE IF EXISTS workflow_engine_instances;
DROP TABLE IF EXISTS workflow_locks;

-- 删除调度相关表
DROP TABLE IF EXISTS workflow_schedules;

-- 删除核心业务表
DROP TABLE IF EXISTS workflow_task_nodes;
DROP TABLE IF EXISTS workflow_instances;
DROP TABLE IF EXISTS workflow_definitions;

-- =====================================================
-- 第二步：创建核心工作流表
-- =====================================================

-- 工作流定义表
CREATE TABLE workflow_definitions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '工作流定义ID',
    name VARCHAR(255) NOT NULL COMMENT '工作流名称',
    version VARCHAR(50) NOT NULL COMMENT '版本号',
    display_name VARCHAR(255) NULL COMMENT '显示名称',
    description TEXT NULL COMMENT '描述',
    definition JSON NOT NULL COMMENT '工作流定义JSON',
    category VARCHAR(100) NULL COMMENT '分类',
    tags JSON NULL COMMENT '标签列表',
    status ENUM('draft', 'active', 'deprecated', 'archived') NOT NULL DEFAULT 'draft' COMMENT '状态',
    is_active BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否为活跃版本',
    timeout_seconds INT NULL COMMENT '超时时间（秒）',
    max_retries INT NOT NULL DEFAULT 3 COMMENT '最大重试次数',
    retry_delay_seconds INT NOT NULL DEFAULT 60 COMMENT '重试延迟（秒）',
    created_by VARCHAR(255) NULL COMMENT '创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    UNIQUE KEY uk_name_version (name, version) COMMENT '名称版本唯一索引',
    KEY idx_name (name) COMMENT '名称索引',
    KEY idx_status (status) COMMENT '状态索引',
    KEY idx_category (category) COMMENT '分类索引',
    KEY idx_is_active (is_active) COMMENT '活跃状态索引',
    KEY idx_created_at (created_at) COMMENT '创建时间索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流定义表';

-- 工作流实例表
CREATE TABLE workflow_instances (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '工作流实例ID',
    workflow_definition_id BIGINT NOT NULL COMMENT '工作流定义ID',
    name VARCHAR(255) NOT NULL COMMENT '实例名称',
    external_id VARCHAR(255) NULL COMMENT '外部ID',
    status ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'timeout') NOT NULL DEFAULT 'pending' COMMENT '状态',
    input_data JSON NULL COMMENT '输入数据',
    output_data JSON NULL COMMENT '输出数据',
    context_data JSON NULL COMMENT '上下文数据',
    
    -- 添加专门的业务键字段，替代虚拟列
    business_key VARCHAR(255) NULL COMMENT '业务键，从input_data.businessKey提取',
    mutex_key VARCHAR(255) NULL COMMENT '互斥键，从context_data.mutexKey提取',
    
    started_at TIMESTAMP NULL COMMENT '开始时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    paused_at TIMESTAMP NULL COMMENT '暂停时间',
    error_message TEXT NULL COMMENT '错误信息',
    error_details JSON NULL COMMENT '错误详情',
    retry_count INT NOT NULL DEFAULT 0 COMMENT '重试次数',
    max_retries INT NOT NULL DEFAULT 3 COMMENT '最大重试次数',
    priority INT NOT NULL DEFAULT 0 COMMENT '优先级',
    scheduled_at TIMESTAMP NULL COMMENT '计划执行时间',
    current_node_id VARCHAR(255) NULL COMMENT '当前节点ID',
    completed_nodes JSON NULL COMMENT '已完成节点列表',
    failed_nodes JSON NULL COMMENT '失败节点列表',
    lock_owner VARCHAR(255) NULL COMMENT '锁拥有者',
    lock_acquired_at TIMESTAMP NULL COMMENT '锁获取时间',
    last_heartbeat TIMESTAMP NULL COMMENT '最后心跳时间',
    assigned_engine_id VARCHAR(255) NULL COMMENT '分配的引擎实例ID',
    assignment_strategy VARCHAR(50) NULL COMMENT '分配策略',
    created_by VARCHAR(255) NULL COMMENT '创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    KEY idx_workflow_definition_id (workflow_definition_id) COMMENT '工作流定义ID索引',
    UNIQUE KEY uk_external_id (external_id) COMMENT '外部ID唯一索引',
    KEY idx_status (status) COMMENT '状态索引',
    KEY idx_business_key (business_key) COMMENT '业务键索引',
    KEY idx_mutex_key (mutex_key) COMMENT '互斥键索引',
    KEY idx_scheduled_at (scheduled_at) COMMENT '计划执行时间索引',
    KEY idx_priority (priority) COMMENT '优先级索引',
    KEY idx_lock_owner (lock_owner) COMMENT '锁拥有者索引',
    KEY idx_assigned_engine_id (assigned_engine_id) COMMENT '分配引擎索引',
    KEY idx_created_at (created_at) COMMENT '创建时间索引',
    KEY idx_status_priority (status, priority) COMMENT '状态优先级复合索引',
    KEY idx_last_heartbeat (last_heartbeat) COMMENT '最后心跳时间索引',
    KEY idx_current_node_id (current_node_id) COMMENT '当前节点ID索引',
    KEY idx_running_heartbeat (status, last_heartbeat) COMMENT '运行状态心跳复合索引',

    -- 外键
    FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流实例表';

-- 工作流任务节点表
CREATE TABLE workflow_task_nodes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '任务节点ID',
    workflow_instance_id BIGINT NOT NULL COMMENT '工作流实例ID',
    node_id VARCHAR(255) NOT NULL COMMENT '节点ID',
    node_name VARCHAR(255) NOT NULL COMMENT '节点名称',
    node_type ENUM('task', 'loop', 'parallel', 'condition', 'subprocess', 'start', 'end') NOT NULL COMMENT '节点类型',
    executor VARCHAR(255) NULL COMMENT '执行器名称',
    executor_config JSON NULL COMMENT '执行器配置',
    status ENUM('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态',
    input_data JSON NULL COMMENT '输入数据',
    output_data JSON NULL COMMENT '输出数据',
    error_message TEXT NULL COMMENT '错误信息',
    error_details JSON NULL COMMENT '错误详情',
    started_at TIMESTAMP NULL COMMENT '开始时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    duration_ms INT NULL COMMENT '执行时长（毫秒）',
    retry_count INT NOT NULL DEFAULT 0 COMMENT '重试次数',
    max_retries INT NOT NULL DEFAULT 3 COMMENT '最大重试次数',
    depends_on JSON NULL COMMENT '依赖节点列表',
    parent_node_id BIGINT NULL COMMENT '父节点ID（用于循环、并行等）',
    parallel_group_id VARCHAR(255) NULL COMMENT '并行组ID',
    parallel_index INT NULL COMMENT '并行索引',
    is_dynamic_task BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否为动态任务',
    dynamic_source_data JSON NULL COMMENT '动态任务源数据',
    assigned_engine_id VARCHAR(255) NULL COMMENT '分配的引擎实例ID',
    assignment_strategy VARCHAR(50) NULL COMMENT '分配策略',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    KEY idx_workflow_instance_id (workflow_instance_id) COMMENT '工作流实例ID索引',
    KEY idx_node_id (node_id) COMMENT '节点ID索引',
    KEY idx_status (status) COMMENT '状态索引',
    KEY idx_node_type (node_type) COMMENT '节点类型索引',
    KEY idx_executor (executor) COMMENT '执行器索引',
    KEY idx_parent_node_id (parent_node_id) COMMENT '父节点ID索引',
    KEY idx_parallel_group_id (parallel_group_id) COMMENT '并行组ID索引',
    KEY idx_assigned_engine_id (assigned_engine_id) COMMENT '分配引擎索引',
    KEY idx_created_at (created_at) COMMENT '创建时间索引',
    KEY idx_workflow_node (workflow_instance_id, node_id) COMMENT '工作流节点复合索引',
    KEY idx_status_started (status, started_at) COMMENT '状态开始时间复合索引',

    -- 外键
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_node_id) REFERENCES workflow_task_nodes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流任务节点表';

-- =====================================================
-- 第三步：创建分布式执行相关表
-- =====================================================

-- 分布式锁表
CREATE TABLE workflow_locks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '锁ID',
    lock_key VARCHAR(255) NOT NULL COMMENT '锁键，格式：workflow:123 或 node:123:task1',
    owner VARCHAR(255) NOT NULL COMMENT '锁拥有者（引擎实例ID）',
    lock_type ENUM('workflow', 'node', 'resource') NOT NULL DEFAULT 'workflow' COMMENT '锁类型',
    expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '过期时间',
    lock_data JSON NULL COMMENT '锁附加数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    UNIQUE KEY uk_lock_key (lock_key) COMMENT '锁键唯一索引',
    KEY idx_owner (owner) COMMENT '拥有者索引',
    KEY idx_expires_at (expires_at) COMMENT '过期时间索引，用于清理',
    KEY idx_lock_type (lock_type) COMMENT '锁类型索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分布式锁表';

-- 工作流引擎实例表
CREATE TABLE workflow_engine_instances (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '实例记录ID',
    instance_id VARCHAR(255) NOT NULL COMMENT '实例ID',
    hostname VARCHAR(255) NOT NULL COMMENT '主机名',
    process_id INT NOT NULL COMMENT '进程ID',
    status ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active' COMMENT '实例状态',
    load_info JSON NOT NULL COMMENT '负载信息：{activeWorkflows, cpuUsage, memoryUsage}',
    supported_executors JSON NOT NULL COMMENT '支持的执行器列表',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '启动时间',
    last_heartbeat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后心跳时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    UNIQUE KEY uk_instance_id (instance_id) COMMENT '实例ID唯一索引',
    KEY idx_status (status) COMMENT '状态索引',
    KEY idx_last_heartbeat (last_heartbeat) COMMENT '心跳时间索引，用于故障检测',
    KEY idx_hostname (hostname) COMMENT '主机名索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流引擎实例表';

-- 工作流分配记录表
CREATE TABLE workflow_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '分配记录ID',
    workflow_instance_id BIGINT NOT NULL COMMENT '工作流实例ID',
    assigned_engine_id VARCHAR(255) NOT NULL COMMENT '分配的引擎实例ID',
    assignment_strategy VARCHAR(50) NOT NULL COMMENT '分配策略',
    assignment_reason TEXT NULL COMMENT '分配原因',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    status ENUM('assigned', 'running', 'completed', 'failed', 'transferred') NOT NULL DEFAULT 'assigned' COMMENT '分配状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    KEY idx_workflow_instance_id (workflow_instance_id) COMMENT '工作流实例ID索引',
    KEY idx_assigned_engine_id (assigned_engine_id) COMMENT '分配引擎索引',
    KEY idx_status (status) COMMENT '状态索引',
    KEY idx_assigned_at (assigned_at) COMMENT '分配时间索引',

    -- 外键
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流分配记录表';

-- 工作流节点分配记录表
CREATE TABLE workflow_node_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '分配记录ID',
    workflow_instance_id BIGINT NOT NULL COMMENT '工作流实例ID',
    node_id VARCHAR(255) NOT NULL COMMENT '节点ID',
    task_node_id BIGINT NULL COMMENT '任务节点记录ID',
    assigned_engine_id VARCHAR(255) NOT NULL COMMENT '分配的引擎实例ID',
    required_capabilities JSON NULL COMMENT '所需能力列表',
    assignment_strategy VARCHAR(50) NOT NULL COMMENT '分配策略',
    estimated_duration INT NULL COMMENT '预计执行时长（秒）',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
    started_at TIMESTAMP NULL COMMENT '开始执行时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    status ENUM('assigned', 'running', 'completed', 'failed', 'transferred') NOT NULL DEFAULT 'assigned' COMMENT '分配状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    KEY idx_workflow_instance_id (workflow_instance_id) COMMENT '工作流实例ID索引',
    KEY idx_node_id (node_id) COMMENT '节点ID索引',
    KEY idx_task_node_id (task_node_id) COMMENT '任务节点ID索引',
    KEY idx_assigned_engine_id (assigned_engine_id) COMMENT '分配引擎索引',
    KEY idx_status (status) COMMENT '状态索引',
    KEY idx_assigned_at (assigned_at) COMMENT '分配时间索引',

    -- 外键
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (task_node_id) REFERENCES workflow_task_nodes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流节点分配记录表';

-- 工作流故障转移事件表
CREATE TABLE workflow_failover_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '事件ID',
    event_id VARCHAR(255) NOT NULL COMMENT '事件唯一标识',
    failed_engine_id VARCHAR(255) NOT NULL COMMENT '故障引擎实例ID',
    takeover_engine_id VARCHAR(255) NOT NULL COMMENT '接管引擎实例ID',
    affected_workflows JSON NOT NULL COMMENT '受影响的工作流实例列表',
    affected_nodes JSON NOT NULL COMMENT '受影响的节点列表',
    failover_reason TEXT NOT NULL COMMENT '故障转移原因',
    failover_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '故障转移时间',
    recovery_completed_at TIMESTAMP NULL COMMENT '恢复完成时间',
    status ENUM('initiated', 'in_progress', 'completed', 'failed') NOT NULL DEFAULT 'initiated' COMMENT '转移状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    UNIQUE KEY uk_event_id (event_id) COMMENT '事件ID唯一索引',
    KEY idx_failed_engine_id (failed_engine_id) COMMENT '故障引擎索引',
    KEY idx_takeover_engine_id (takeover_engine_id) COMMENT '接管引擎索引',
    KEY idx_failover_at (failover_at) COMMENT '故障转移时间索引',
    KEY idx_status (status) COMMENT '状态索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流故障转移事件表';

-- 工作流执行日志表
CREATE TABLE workflow_execution_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    workflow_instance_id BIGINT NULL COMMENT '工作流实例ID',
    task_node_id BIGINT NULL COMMENT '任务节点ID',
    node_id VARCHAR(255) NULL COMMENT '节点ID',
    level ENUM('debug', 'info', 'warn', 'error') NOT NULL DEFAULT 'info' COMMENT '日志级别',
    message TEXT NOT NULL COMMENT '日志消息',
    details JSON NULL COMMENT '详细信息',
    engine_instance_id VARCHAR(255) NULL COMMENT '引擎实例ID',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '时间戳',

    -- 索引
    KEY idx_workflow_instance_id (workflow_instance_id) COMMENT '工作流实例ID索引',
    KEY idx_task_node_id (task_node_id) COMMENT '任务节点ID索引',
    KEY idx_level (level) COMMENT '日志级别索引',
    KEY idx_timestamp (timestamp) COMMENT '时间戳索引',
    KEY idx_engine_instance_id (engine_instance_id) COMMENT '引擎实例ID索引',

    -- 外键
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (task_node_id) REFERENCES workflow_task_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流执行日志表';

-- 工作流调度表
CREATE TABLE workflow_schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '调度ID',
    workflow_definition_id BIGINT NOT NULL COMMENT '工作流定义ID',
    name VARCHAR(255) NOT NULL COMMENT '调度名称',
    cron_expression VARCHAR(255) NULL COMMENT 'Cron表达式',
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC' COMMENT '时区',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    next_run_at DATETIME NULL COMMENT '下次运行时间',
    last_run_at DATETIME NULL COMMENT '上次运行时间',
    max_instances INT NOT NULL DEFAULT 1 COMMENT '最大并发实例数',
    input_data JSON NULL COMMENT '输入数据',
    created_by VARCHAR(255) NULL COMMENT '创建者',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    INDEX idx_workflow_schedules_definition_id (workflow_definition_id),
    INDEX idx_workflow_schedules_enabled (is_enabled),
    INDEX idx_workflow_schedules_next_run (next_run_at),
    INDEX idx_workflow_schedules_name (name),

    -- 外键约束
    CONSTRAINT fk_workflow_schedules_definition
        FOREIGN KEY (workflow_definition_id)
        REFERENCES workflow_definitions(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流调度表';

-- =====================================================
-- 第四步：恢复外键检查和提交事务
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

-- 提交事务
COMMIT;

-- 显示创建的表
SHOW TABLES LIKE 'workflow%';

-- 迁移完成
SELECT 'Database Migration v3.0.0-portable completed successfully!' as status,
       NOW() as completed_at,
       'Portable distributed workflow engine database structure initialized' as description;
