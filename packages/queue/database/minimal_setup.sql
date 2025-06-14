-- @stratix/queue 精简数据库初始化脚本
-- 版本：2.1 - 清理未使用对象
-- 用途：创建队列系统必需的数据库结构

-- ============================================================================
-- 核心队列表结构
-- ============================================================================

-- 1. 运行时队列表 (queue_jobs)
-- 存储等待执行、正在执行和延迟执行的任务
CREATE TABLE IF NOT EXISTS queue_jobs (
    -- 基础字段
    id VARCHAR(200) PRIMARY KEY,                    -- 任务ID (UUID)
    queue_name VARCHAR(255) NOT NULL,              -- 队列名称
    group_id VARCHAR(255),                         -- 分组ID（可选，用于分组控制）
    job_name VARCHAR(255) NOT NULL,                -- 任务名称/类型
    executor_name VARCHAR(255) NOT NULL,           -- 执行器名称，用于指定处理该任务的执行器
    
    -- 任务数据
    payload JSON NOT NULL,                         -- 任务负载数据
    result JSON,                                   -- 任务执行结果（执行中可能有中间结果）
    
    -- 状态管理
    status VARCHAR(50) NOT NULL DEFAULT 'waiting', -- 任务状态：waiting, executing, delayed, paused, failed
    priority INT NOT NULL DEFAULT 0,               -- 优先级（数字越大优先级越高）
    
    -- 重试机制
    attempts INT NOT NULL DEFAULT 0,               -- 已尝试次数
    max_attempts INT NOT NULL DEFAULT 3,           -- 最大尝试次数
    
    -- 时间管理
    delay_until TIMESTAMP NULL,                    -- 延迟执行时间
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- 更新时间
    started_at TIMESTAMP NULL,                     -- 开始执行时间
    
    -- 任务锁定机制
    locked_at TIMESTAMP NULL,                      -- 锁定时间
    locked_by VARCHAR(255) NULL,                   -- 锁定实例ID
    locked_until TIMESTAMP NULL,                   -- 锁定过期时间
    
    -- 扩展字段
    metadata JSON,                                 -- 元数据，存储额外信息
    
    -- 错误信息（失败任务使用）
    error_message TEXT,                            -- 错误消息
    error_stack TEXT,                              -- 错误堆栈
    error_code VARCHAR(100),                       -- 错误代码
    failed_at TIMESTAMP NULL,                      -- 失败时间
    
    -- 约束
    CONSTRAINT chk_queue_jobs_status CHECK (status IN ('waiting', 'executing', 'delayed', 'paused', 'failed')),
    CONSTRAINT chk_queue_jobs_priority CHECK (priority >= 0),
    CONSTRAINT chk_queue_jobs_attempts CHECK (attempts >= 0),
    CONSTRAINT chk_queue_jobs_max_attempts CHECK (max_attempts > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='队列任务运行时表，存储等待执行、正在执行、延迟执行和失败的任务';

-- 2. 成功任务表 (queue_success)
-- 存储执行成功的任务记录
CREATE TABLE IF NOT EXISTS queue_success (
    -- 基础字段
    id VARCHAR(200) PRIMARY KEY,                    -- 任务ID
    queue_name VARCHAR(255) NOT NULL,              -- 队列名称
    group_id VARCHAR(255),                         -- 分组ID
    job_name VARCHAR(255) NOT NULL,                -- 任务名称/类型
    executor_name VARCHAR(255) NOT NULL,           -- 执行器名称
    
    -- 任务数据
    payload JSON NOT NULL,                         -- 任务负载数据
    result JSON,                                   -- 任务执行结果
    
    -- 执行信息
    attempts INT NOT NULL DEFAULT 1,               -- 实际尝试次数
    execution_time INT,                            -- 执行时长（毫秒）
    
    -- 时间记录
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 任务创建时间
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 开始执行时间
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP -- 完成时间
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='队列任务成功表，存储执行成功的任务记录';

-- 3. 失败任务表 (queue_failures)
-- 存储执行失败的任务记录
CREATE TABLE IF NOT EXISTS queue_failures (
    -- 基础字段
    id VARCHAR(200) PRIMARY KEY,                    -- 任务ID
    queue_name VARCHAR(255) NOT NULL,              -- 队列名称
    group_id VARCHAR(255),                         -- 分组ID
    job_name VARCHAR(255) NOT NULL,                -- 任务名称/类型
    executor_name VARCHAR(255) NOT NULL,           -- 执行器名称
    
    -- 任务数据
    payload JSON NOT NULL,                         -- 任务负载数据
    
    -- 错误信息
    error_message TEXT,                            -- 错误消息
    error_stack TEXT,                              -- 错误堆栈
    error_code VARCHAR(100),                       -- 错误代码
    
    -- 执行信息
    attempts INT NOT NULL DEFAULT 1,               -- 实际尝试次数
    
    -- 时间记录
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 任务创建时间
    started_at TIMESTAMP NULL,                     -- 开始执行时间
    failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 失败时间
    
    -- 扩展字段
    metadata JSON                                  -- 元数据
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='队列任务失败表，存储执行失败的任务记录';

-- 4. 队列分组状态表 (queue_groups)
-- 存储队列分组的状态信息
CREATE TABLE IF NOT EXISTS queue_groups (
    -- 基础字段
    id VARCHAR(200) PRIMARY KEY,                    -- 分组ID
    queue_name VARCHAR(255) NOT NULL,              -- 队列名称
    group_id VARCHAR(255) NOT NULL,                -- 分组标识
    
    -- 状态管理
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- 分组状态：active, paused
    
    -- 统计信息
    total_jobs INT NOT NULL DEFAULT 0,             -- 总任务数
    completed_jobs INT NOT NULL DEFAULT 0,         -- 已完成任务数
    failed_jobs INT NOT NULL DEFAULT 0,            -- 失败任务数
    
    -- 时间记录
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 扩展字段
    metadata JSON,
    
    -- 约束
    CONSTRAINT chk_queue_groups_status CHECK (status IN ('active', 'paused')),
    CONSTRAINT uk_queue_groups_name_id UNIQUE (queue_name, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='队列分组状态表，存储队列分组的状态信息';

-- 5. 队列指标表 (queue_metrics)
-- 存储队列的实时状态和性能指标
CREATE TABLE IF NOT EXISTS queue_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    queue_name VARCHAR(255) NOT NULL,              -- 队列名称
    instance_id VARCHAR(255) NOT NULL,             -- 实例ID
    
    -- 队列状态指标
    memory_queue_length INT NOT NULL DEFAULT 0,    -- 内存队列长度
    watermark_level VARCHAR(20) NOT NULL,          -- 水位级别：empty, low, normal, high, critical
    is_backpressure_active BOOLEAN NOT NULL DEFAULT FALSE, -- 是否激活背压
    has_active_stream BOOLEAN NOT NULL DEFAULT FALSE,      -- 是否有活跃数据流
    is_processing BOOLEAN NOT NULL DEFAULT FALSE,          -- 是否正在处理
    
    -- 处理统计
    total_processed INT NOT NULL DEFAULT 0,        -- 总处理数
    total_failed INT NOT NULL DEFAULT 0,           -- 总失败数
    average_processing_time DECIMAL(10,2),         -- 平均处理时间(ms)
    
    -- 背压统计
    backpressure_activations INT NOT NULL DEFAULT 0,       -- 背压激活次数
    total_backpressure_time BIGINT NOT NULL DEFAULT 0,     -- 总背压时间(ms)
    
    -- 流统计
    stream_start_count INT NOT NULL DEFAULT 0,     -- 流启动次数
    stream_pause_count INT NOT NULL DEFAULT 0,     -- 流暂停次数
    average_stream_duration DECIMAL(10,2),         -- 平均流持续时间(ms)
    
    -- 时间戳
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_metrics_queue_instance (queue_name, instance_id),
    INDEX idx_metrics_queue_name (queue_name),
    INDEX idx_metrics_watermark (watermark_level),
    INDEX idx_metrics_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='队列指标表，存储队列的实时状态和性能指标';

-- ============================================================================
-- 核心表索引优化
-- ============================================================================

-- queue_jobs 表索引
CREATE INDEX idx_queue_jobs_queue_status_priority 
    ON queue_jobs (queue_name, status, priority DESC, created_at ASC);

CREATE INDEX idx_queue_jobs_group_id 
    ON queue_jobs (group_id);

CREATE INDEX idx_queue_jobs_executor_name 
    ON queue_jobs (executor_name);

CREATE INDEX idx_queue_jobs_delay_until 
    ON queue_jobs (delay_until);

CREATE INDEX idx_queue_jobs_created_at 
    ON queue_jobs (created_at);

-- 事件驱动查询优化索引
CREATE INDEX idx_queue_jobs_batch_load 
    ON queue_jobs (status, priority DESC, created_at ASC, queue_name);

CREATE INDEX idx_queue_jobs_status_count 
    ON queue_jobs (queue_name, status);

CREATE INDEX idx_queue_jobs_pending_count 
    ON queue_jobs (queue_name, status, delay_until);

-- queue_success 表索引
CREATE INDEX idx_queue_success_queue_completed 
    ON queue_success (queue_name, completed_at DESC);

CREATE INDEX idx_queue_success_executor_name 
    ON queue_success (executor_name);

CREATE INDEX idx_queue_success_group_id 
    ON queue_success (group_id);

-- queue_failures 表索引
CREATE INDEX idx_queue_failures_queue_failed 
    ON queue_failures (queue_name, failed_at DESC);

CREATE INDEX idx_queue_failures_executor_name 
    ON queue_failures (executor_name);

CREATE INDEX idx_queue_failures_group_id 
    ON queue_failures (group_id);

-- queue_groups 表索引
CREATE INDEX idx_queue_groups_queue_name 
    ON queue_groups (queue_name);

CREATE INDEX idx_queue_groups_status 
    ON queue_groups (status);

-- ============================================================================
-- 初始化完成
-- ============================================================================

-- 显示初始化完成信息
SELECT 
    '✅ @stratix/queue 精简队列系统数据库初始化完成' as status,
    '版本: 2.1 - 清理未使用对象' as version,
    NOW() as initialized_at; 