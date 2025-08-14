-- =====================================================
-- Stratix Tasks Plugin Database Migration v3.0.0 (Refactored)
-- 基于函数式编程模式的工作流引擎数据库初始化脚本
--
-- 版本: 3.0.0-refactored
-- 创建时间: 2024-08-13
-- 描述: 简化的工作流引擎数据库结构，支持工作流定义与实例分离、动态节点生成、中断恢复机制
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

-- 删除执行日志表
DROP TABLE IF EXISTS workflow_execution_logs;

-- 删除节点实例表
DROP TABLE IF EXISTS workflow_node_instances;

-- 删除工作流实例表
DROP TABLE IF EXISTS workflow_instances;

-- 删除工作流定义表
DROP TABLE IF EXISTS workflow_definitions;

-- 删除执行锁表
DROP TABLE IF EXISTS workflow_execution_locks;

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
    status ENUM('pending', 'running', 'interrupted', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待执行，running-执行中，interrupted-中断，completed-完成，failed-失败，cancelled-取消',
    instance_type VARCHAR(100) NOT NULL COMMENT '实例类型，用于实例锁检查',
    input_data JSON NULL COMMENT '输入数据',
    output_data JSON NULL COMMENT '输出数据',
    context_data JSON NULL COMMENT '上下文数据',

    -- 业务键字段，用于业务实例锁检查
    business_key VARCHAR(255) NULL COMMENT '业务键，从input_data.businessKey提取',
    mutex_key VARCHAR(255) NULL COMMENT '互斥键，从context_data.mutexKey提取',

    -- 执行时间相关
    started_at TIMESTAMP NULL COMMENT '开始时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    interrupted_at TIMESTAMP NULL COMMENT '中断时间',

    -- 错误信息
    error_message TEXT NULL COMMENT '错误信息',
    error_details JSON NULL COMMENT '错误详情',

    -- 重试配置
    retry_count INT NOT NULL DEFAULT 0 COMMENT '重试次数',
    max_retries INT NOT NULL DEFAULT 3 COMMENT '最大重试次数',

    -- 当前执行状态
    current_node_id VARCHAR(255) NULL COMMENT '当前执行节点ID',
    checkpoint_data JSON NULL COMMENT '检查点数据',

    -- 创建信息
    created_by VARCHAR(255) NULL COMMENT '创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    KEY idx_workflow_definition_id (workflow_definition_id) COMMENT '工作流定义ID索引',
    UNIQUE KEY uk_external_id (external_id) COMMENT '外部ID唯一索引',
    KEY idx_status (status) COMMENT '状态索引',
    KEY idx_instance_type (instance_type) COMMENT '实例类型索引',
    KEY idx_business_key (business_key) COMMENT '业务键索引',
    KEY idx_mutex_key (mutex_key) COMMENT '互斥键索引',
    KEY idx_current_node_id (current_node_id) COMMENT '当前节点ID索引',
    KEY idx_created_at (created_at) COMMENT '创建时间索引',
    KEY idx_status_type (status, instance_type) COMMENT '状态类型复合索引',

    -- 外键
    FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流实例表';

-- 节点实例表
CREATE TABLE workflow_node_instances (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '节点实例ID',
    workflow_instance_id BIGINT NOT NULL COMMENT '工作流实例ID',
    node_id VARCHAR(255) NOT NULL COMMENT '节点ID（来自定义）',
    node_name VARCHAR(255) NOT NULL COMMENT '节点名称',
    node_type ENUM('simple', 'loop', 'parallel', 'subprocess') NOT NULL COMMENT '节点类型：simple-简单操作，loop-循环，parallel-并行，subprocess-子流程',
    executor VARCHAR(255) NULL COMMENT '执行器名称',
    executor_config JSON NULL COMMENT '执行器配置',
    status ENUM('pending', 'running', 'completed', 'failed', 'failed_retry') NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待执行，running-执行中，completed-成功，failed-失败，failed_retry-失败待重试',

    -- 输入输出数据
    input_data JSON NULL COMMENT '输入数据',
    output_data JSON NULL COMMENT '输出数据',

    -- 错误信息
    error_message TEXT NULL COMMENT '错误信息',
    error_details JSON NULL COMMENT '错误详情',

    -- 执行时间
    started_at TIMESTAMP NULL COMMENT '开始时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    duration_ms INT NULL COMMENT '执行时长（毫秒）',

    -- 重试配置
    retry_count INT NOT NULL DEFAULT 0 COMMENT '重试次数',
    max_retries INT NOT NULL DEFAULT 3 COMMENT '最大重试次数',

    -- 层次结构（用于循环、并行等复杂节点）
    parent_node_id BIGINT NULL COMMENT '父节点ID',
    child_index INT NULL COMMENT '子节点索引',

    -- 循环节点特有字段
    loop_progress JSON NULL COMMENT '循环进度状态',
    loop_total_count INT NULL COMMENT '循环总数',
    loop_completed_count INT NOT NULL DEFAULT 0 COMMENT '循环完成数',

    -- 并行节点特有字段
    parallel_group_id VARCHAR(255) NULL COMMENT '并行组ID',
    parallel_index INT NULL COMMENT '并行索引',

    -- 创建信息
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
    KEY idx_created_at (created_at) COMMENT '创建时间索引',
    KEY idx_workflow_node (workflow_instance_id, node_id) COMMENT '工作流节点复合索引',
    KEY idx_status_started (status, started_at) COMMENT '状态开始时间复合索引',
    UNIQUE KEY uk_workflow_node_unique (workflow_instance_id, node_id, parent_node_id, child_index) COMMENT '工作流节点唯一索引',

    -- 外键
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_node_id) REFERENCES workflow_node_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='节点实例表';

-- =====================================================
-- 第三步：创建执行锁表
-- =====================================================

-- 执行锁表
CREATE TABLE workflow_execution_locks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '锁ID',
    lock_key VARCHAR(255) NOT NULL COMMENT '锁键，格式：workflow:instance_id',
    lock_type ENUM('workflow', 'instance') NOT NULL DEFAULT 'workflow' COMMENT '锁类型',
    owner VARCHAR(255) NOT NULL COMMENT '锁拥有者（进程ID或实例ID）',
    expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
    lock_data JSON NULL COMMENT '锁附加数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 索引
    UNIQUE KEY uk_lock_key (lock_key) COMMENT '锁键唯一索引',
    KEY idx_owner (owner) COMMENT '拥有者索引',
    KEY idx_expires_at (expires_at) COMMENT '过期时间索引，用于清理',
    KEY idx_lock_type (lock_type) COMMENT '锁类型索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='执行锁表';

-- =====================================================
-- 第四步：创建执行日志表（可选）
-- =====================================================

-- 工作流执行日志表
CREATE TABLE workflow_execution_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    workflow_instance_id BIGINT NULL COMMENT '工作流实例ID',
    node_instance_id BIGINT NULL COMMENT '节点实例ID',
    node_id VARCHAR(255) NULL COMMENT '节点ID',
    level ENUM('debug', 'info', 'warn', 'error') NOT NULL DEFAULT 'info' COMMENT '日志级别',
    message TEXT NOT NULL COMMENT '日志消息',
    details JSON NULL COMMENT '详细信息',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '时间戳',

    -- 索引
    KEY idx_workflow_instance_id (workflow_instance_id) COMMENT '工作流实例ID索引',
    KEY idx_node_instance_id (node_instance_id) COMMENT '节点实例ID索引',
    KEY idx_level (level) COMMENT '日志级别索引',
    KEY idx_timestamp (timestamp) COMMENT '时间戳索引',

    -- 外键
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (node_instance_id) REFERENCES workflow_node_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流执行日志表';

-- =====================================================
-- 第五步：恢复外键检查和提交事务
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

-- 提交事务
COMMIT;

-- 显示创建的表
SHOW TABLES LIKE 'workflow%';

-- 迁移完成
SELECT 'Database Migration v3.0.0-refactored completed successfully!' as status,
       NOW() as completed_at,
       'Refactored workflow engine database structure initialized' as description;
