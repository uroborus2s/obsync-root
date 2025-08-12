# 数据库迁移脚本 v3.0.0 说明文档

## 概述

`migration_v3.0.0.sql` 是 Stratix Tasks 插件的完整数据库初始化脚本，支持分布式工作流引擎的所有功能。该脚本将创建一个全新的数据库结构，支持分布式执行、故障转移、负载均衡等企业级特性。

## 脚本特性

- **完全重建**：删除所有现有表并重新创建
- **事务安全**：使用事务确保原子性操作
- **MySQL 8.0+ 兼容**：使用最新的 MySQL 特性
- **分布式支持**：完整的分布式执行架构
- **性能优化**：包含所有必要的索引和约束

## 数据表结构

### 核心工作流表

#### 1. workflow_definitions (工作流定义表)
- **用途**：存储工作流定义和版本信息
- **关键字段**：
  - `name`, `version`：工作流名称和版本
  - `definition`：JSON 格式的工作流定义
  - `status`：定义状态（draft, active, deprecated, archived）
  - `is_active`：是否为活跃版本

#### 2. workflow_instances (工作流实例表)
- **用途**：存储工作流执行实例
- **关键字段**：
  - `status`：实例状态（pending, running, paused, completed, failed, cancelled, timeout）
  - `input_data`, `output_data`：输入输出数据
  - `current_node_id`：当前执行节点（断点续传支持）
  - `completed_nodes`, `failed_nodes`：已完成和失败节点列表
  - `lock_owner`, `last_heartbeat`：分布式锁和心跳支持
  - `assigned_engine_id`：分配的引擎实例

#### 3. task_nodes (任务节点表)
- **用途**：存储工作流中的具体任务节点
- **关键字段**：
  - `node_type`：节点类型（task, loop, parallel, condition, subprocess）
  - `executor`：执行器名称
  - `parent_node_id`：父节点ID（支持嵌套结构）
  - `parallel_group_id`, `parallel_index`：并行执行支持
  - `is_dynamic_task`：动态任务标识
  - `assigned_engine_id`：分配的引擎实例

### 分布式执行表

#### 4. workflow_locks (分布式锁表)
- **用途**：管理分布式锁，防止重复执行
- **关键字段**：
  - `lock_key`：锁键（workflow:123, node:123:task1）
  - `owner`：锁拥有者（引擎实例ID）
  - `lock_type`：锁类型（workflow, node, resource）
  - `expires_at`：过期时间

#### 5. workflow_engine_instances (引擎实例表)
- **用途**：注册和管理工作流引擎实例
- **关键字段**：
  - `instance_id`：唯一实例标识
  - `hostname`, `process_id`：主机和进程信息
  - `status`：实例状态（active, inactive, maintenance）
  - `load_info`：负载信息（JSON格式）
  - `supported_executors`：支持的执行器列表
  - `last_heartbeat`：最后心跳时间

#### 6. workflow_assignments (工作流分配记录表)
- **用途**：记录工作流到引擎实例的分配
- **关键字段**：
  - `workflow_instance_id`：工作流实例ID
  - `assigned_engine_id`：分配的引擎实例
  - `assignment_strategy`：分配策略
  - `status`：分配状态

#### 7. node_assignments (节点分配记录表)
- **用途**：记录节点到引擎实例的分配
- **关键字段**：
  - `node_id`：节点ID
  - `required_capabilities`：所需能力
  - `estimated_duration`：预计执行时长

#### 8. failover_events (故障转移事件表)
- **用途**：记录故障转移事件
- **关键字段**：
  - `failed_engine_id`：故障引擎
  - `takeover_engine_id`：接管引擎
  - `affected_workflows`, `affected_nodes`：受影响的资源
  - `failover_reason`：故障原因

### 调度和日志表

#### 9. workflow_schedules (工作流调度表)
- **用途**：管理定时调度任务
- **关键字段**：
  - `cron_expression`：Cron 表达式
  - `timezone`：时区
  - `next_run_time`, `last_run_time`：执行时间
  - `max_instances`：最大并发实例数

#### 10. execution_logs (执行日志表)
- **用途**：记录执行过程中的日志
- **关键字段**：
  - `level`：日志级别（debug, info, warn, error）
  - `message`：日志消息
  - `details`：详细信息（JSON格式）
  - `engine_instance_id`：引擎实例ID

## 监控视图

### 1. v_distributed_execution_status
- **用途**：分布式执行状态监控
- **内容**：工作流执行状态、节点完成情况、涉及的引擎数量

### 2. v_engine_load_status
- **用途**：引擎负载监控
- **内容**：引擎状态、负载信息、分配的工作流和节点数量、心跳状态

### 3. v_lock_status
- **用途**：锁状态监控
- **内容**：锁的状态、过期时间、拥有者信息

## 存储过程

### 1. GetRecoverableInstances
- **用途**：获取可恢复的工作流实例
- **参数**：心跳超时时间（默认300秒）

### 2. UpdateWorkflowHeartbeat
- **用途**：更新工作流心跳
- **参数**：实例ID、拥有者ID

### 3. CleanupExpiredLocks
- **用途**：清理过期锁
- **返回**：清理的锁数量

### 4. DetectFailedEngines
- **用途**：检测故障引擎并释放其锁
- **参数**：心跳超时秒数

### 5. GetWorkflowExecutionStats
- **用途**：获取工作流执行统计
- **参数**：开始日期、结束日期

## 虚拟列和索引优化

### 虚拟列
- `mutex_key`：从 context_data 中提取的互斥键
- `input_business_key`：从 input_data 中提取的业务键

### 关键索引
- 状态和优先级复合索引
- 心跳时间索引（故障检测）
- 分配引擎索引（分布式查询）
- JSON 字段虚拟列索引

## 约束条件

### 状态约束
- 工作流实例状态检查
- 任务节点状态检查

### 数值约束
- 优先级范围：0-100
- 重试次数不超过最大重试次数

## 使用说明

### 执行脚本
```bash
mysql -u username -p database_name < migration_v3.0.0.sql
```

### 验证安装
脚本执行完成后会显示：
- 创建的表列表
- 成功消息和完成时间

### 注意事项
1. **数据备份**：执行前请备份现有数据
2. **权限要求**：需要 CREATE、DROP、ALTER 权限
3. **MySQL 版本**：建议使用 MySQL 8.0+
4. **存储空间**：确保有足够的存储空间

## 版本兼容性

- **MySQL 8.0+**：完全支持所有特性
- **MySQL 5.7**：支持大部分特性，CHECK 约束会被忽略
- **字符集**：utf8mb4_unicode_ci
- **存储引擎**：InnoDB

## 后续维护

### 定期清理
- 执行 `CleanupExpiredLocks` 清理过期锁
- 定期清理历史日志数据

### 监控建议
- 监控引擎实例心跳状态
- 监控锁的使用情况
- 监控工作流执行性能

### 性能调优
- 根据实际使用情况调整索引
- 考虑对大表进行分区
- 定期分析表统计信息
