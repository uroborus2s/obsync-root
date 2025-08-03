-- @stratix/tasks 数据库索引设计 (MySQL 5.7)
-- 优化查询性能的索引策略

-- ============================================================================
-- 1. 流程定义表索引
-- ============================================================================

-- 基础查询索引
CREATE INDEX idx_workflow_definitions_name ON workflow_definitions(name);
CREATE INDEX idx_workflow_definitions_status ON workflow_definitions(status);
CREATE INDEX idx_workflow_definitions_category ON workflow_definitions(category);
CREATE INDEX idx_workflow_definitions_created_at ON workflow_definitions(created_at);

-- 复合索引
CREATE INDEX idx_workflow_definitions_name_status ON workflow_definitions(name, status);
CREATE INDEX idx_workflow_definitions_active_version ON workflow_definitions(name, version, is_active);

-- JSON字段索引 (MySQL 5.7支持虚拟列索引)
-- 为JSON字段创建虚拟列以支持索引
ALTER TABLE workflow_definitions
ADD COLUMN definition_type VARCHAR(100) AS (JSON_UNQUOTE(JSON_EXTRACT(definition, '$.type'))) VIRTUAL,
ADD INDEX idx_workflow_definitions_definition_type (definition_type);

-- 标签搜索索引 (使用全文索引)
ALTER TABLE workflow_definitions
ADD COLUMN tags_text TEXT AS (JSON_UNQUOTE(JSON_EXTRACT(tags, '$'))) VIRTUAL,
ADD FULLTEXT INDEX idx_workflow_definitions_tags_fulltext (tags_text);

-- ============================================================================
-- 2. 流程实例表索引
-- ============================================================================

-- 基础查询索引
CREATE INDEX idx_workflow_instances_definition_id ON workflow_instances(workflow_definition_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_external_id ON workflow_instances(external_id);
CREATE INDEX idx_workflow_instances_created_by ON workflow_instances(created_by);

-- 时间相关索引
CREATE INDEX idx_workflow_instances_created_at ON workflow_instances(created_at);
CREATE INDEX idx_workflow_instances_started_at ON workflow_instances(started_at);
CREATE INDEX idx_workflow_instances_completed_at ON workflow_instances(completed_at);
CREATE INDEX idx_workflow_instances_scheduled_at ON workflow_instances(scheduled_at);

-- 复合索引
CREATE INDEX idx_workflow_instances_status_priority ON workflow_instances(status, priority DESC);
CREATE INDEX idx_workflow_instances_definition_status ON workflow_instances(workflow_definition_id, status);
CREATE INDEX idx_workflow_instances_status_created ON workflow_instances(status, created_at);

-- 调度查询优化 (MySQL不支持部分索引，使用复合索引)
CREATE INDEX idx_workflow_instances_pending_scheduled ON workflow_instances(status, scheduled_at);

-- 运行中实例查询
CREATE INDEX idx_workflow_instances_running_status ON workflow_instances(status, started_at);

-- JSON字段虚拟列索引
ALTER TABLE workflow_instances
ADD COLUMN input_type VARCHAR(100) AS (JSON_UNQUOTE(JSON_EXTRACT(input_data, '$.type'))) VIRTUAL,
ADD INDEX idx_workflow_instances_input_type (input_type);

-- ============================================================================
-- 3. 任务节点表索引
-- ============================================================================

-- 基础查询索引
CREATE INDEX idx_task_nodes_workflow_instance_id ON task_nodes(workflow_instance_id);
CREATE INDEX idx_task_nodes_node_key ON task_nodes(node_key);
CREATE INDEX idx_task_nodes_node_type ON task_nodes(node_type);
CREATE INDEX idx_task_nodes_status ON task_nodes(status);
CREATE INDEX idx_task_nodes_executor_name ON task_nodes(executor_name);
CREATE INDEX idx_task_nodes_parent_node_id ON task_nodes(parent_node_id);

-- 并行执行相关索引
CREATE INDEX idx_task_nodes_parallel_group ON task_nodes(parallel_group_id, parallel_index);

-- 时间相关索引
CREATE INDEX idx_task_nodes_created_at ON task_nodes(created_at);
CREATE INDEX idx_task_nodes_started_at ON task_nodes(started_at);
CREATE INDEX idx_task_nodes_completed_at ON task_nodes(completed_at);

-- 复合索引
CREATE INDEX idx_task_nodes_workflow_status ON task_nodes(workflow_instance_id, status);
CREATE INDEX idx_task_nodes_workflow_type ON task_nodes(workflow_instance_id, node_type);
CREATE INDEX idx_task_nodes_status_executor ON task_nodes(status, executor_name);

-- 待执行任务查询 (MySQL使用复合索引替代部分索引)
CREATE INDEX idx_task_nodes_pending ON task_nodes(status, workflow_instance_id, created_at);

-- 运行中任务查询
CREATE INDEX idx_task_nodes_running ON task_nodes(status, started_at);

-- JSON字段虚拟列索引
ALTER TABLE task_nodes
ADD COLUMN executor_type VARCHAR(100) AS (JSON_UNQUOTE(JSON_EXTRACT(executor_config, '$.type'))) VIRTUAL,
ADD INDEX idx_task_nodes_executor_type (executor_type);

-- ============================================================================
-- 4. 执行记录表索引
-- ============================================================================

-- 基础查询索引
CREATE INDEX idx_execution_logs_workflow_instance_id ON execution_logs(workflow_instance_id);
CREATE INDEX idx_execution_logs_task_node_id ON execution_logs(task_node_id);
CREATE INDEX idx_execution_logs_log_level ON execution_logs(log_level);
CREATE INDEX idx_execution_logs_execution_phase ON execution_logs(execution_phase);
CREATE INDEX idx_execution_logs_executor_name ON execution_logs(executor_name);

-- 时间相关索引
CREATE INDEX idx_execution_logs_timestamp ON execution_logs(timestamp);

-- 复合索引
CREATE INDEX idx_execution_logs_workflow_timestamp ON execution_logs(workflow_instance_id, timestamp DESC);
CREATE INDEX idx_execution_logs_task_timestamp ON execution_logs(task_node_id, timestamp DESC);
CREATE INDEX idx_execution_logs_level_timestamp ON execution_logs(log_level, timestamp DESC);

-- 错误日志查询优化 (MySQL使用复合索引)
CREATE INDEX idx_execution_logs_errors ON execution_logs(log_level, timestamp DESC);

-- ============================================================================
-- 5. 执行器注册表索引
-- ============================================================================

-- 基础查询索引
CREATE INDEX idx_executor_registry_name ON executor_registry(name);
CREATE INDEX idx_executor_registry_plugin_name ON executor_registry(plugin_name);
CREATE INDEX idx_executor_registry_is_active ON executor_registry(is_active);

-- 复合索引
CREATE INDEX idx_executor_registry_plugin_active ON executor_registry(plugin_name, is_active);

-- ============================================================================
-- 6. 工作流调度表索引
-- ============================================================================

-- 基础查询索引
CREATE INDEX idx_workflow_schedules_definition_id ON workflow_schedules(workflow_definition_id);
CREATE INDEX idx_workflow_schedules_is_enabled ON workflow_schedules(is_enabled);
CREATE INDEX idx_workflow_schedules_next_run_at ON workflow_schedules(next_run_at);
CREATE INDEX idx_workflow_schedules_last_run_at ON workflow_schedules(last_run_at);

-- 复合索引 (MySQL使用复合索引替代部分索引)
CREATE INDEX idx_workflow_schedules_enabled_next_run ON workflow_schedules(is_enabled, next_run_at);

-- ============================================================================
-- 7. MySQL特定优化建议
-- ============================================================================

-- 1. 定期清理历史数据
-- 2. 使用OPTIMIZE TABLE维护表结构
-- 3. 监控慢查询日志 (slow_query_log)
-- 4. 根据实际查询模式调整索引策略
-- 5. 考虑使用MySQL的分区表功能处理大数据量

-- 分区表示例 (execution_logs按时间分区)
-- ALTER TABLE execution_logs PARTITION BY RANGE (TO_DAYS(timestamp)) (
--     PARTITION p202401 VALUES LESS THAN (TO_DAYS('2024-02-01')),
--     PARTITION p202402 VALUES LESS THAN (TO_DAYS('2024-03-01')),
--     PARTITION p202403 VALUES LESS THAN (TO_DAYS('2024-04-01')),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- JSON字段查询优化提示：
-- 1. 使用虚拟列为常用JSON路径创建索引
-- 2. 避免在WHERE子句中直接使用JSON_EXTRACT，优先使用虚拟列
-- 3. 对于复杂JSON查询，考虑将数据反规范化到单独列中
