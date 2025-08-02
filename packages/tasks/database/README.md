# @stratix/tasks 数据库设计文档

## 📋 概述

本文档描述了 Stratix 工作流引擎的数据库架构设计，支持工作流的持久化、故障恢复、状态查询和性能监控。

## 🏗️ 架构设计原则

### 1. 数据一致性
- 使用外键约束确保数据完整性
- 关键操作使用事务保证原子性
- 支持乐观锁和悲观锁机制

### 2. 高性能查询
- 针对常见查询模式设计复合索引
- 支持分区表处理大数据量
- 提供预定义视图简化复杂查询

### 3. 可扩展性
- JSON字段支持灵活的数据结构
- 预留扩展字段适应业务变化
- 支持水平分片和读写分离

### 4. 故障恢复
- 完整的执行历史记录
- 状态快照支持断点续传
- 自动清理和归档机制

## 📊 数据库表结构

### 核心表关系图

```
workflow_definitions (工作流定义)
    ↓ 1:N
workflow_instances (工作流实例)
    ↓ 1:N
task_instances (任务实例)
    ↓ 1:N
execution_history (执行历史)

workflow_definitions
    ↓ 1:N
workflow_schedules (调度配置)

workflow_instances/task_instances
    ↓ 1:N
performance_metrics (性能指标)
```

### 1. 工作流定义层

#### workflow_definitions (工作流定义表)
存储工作流的元数据和JSON定义。

**关键字段：**
- `id`: 工作流定义唯一标识
- `name` + `version`: 业务唯一键
- `definition_json`: 完整的工作流定义
- `is_active`: 支持版本管理和灰度发布

**索引策略：**
- 主键索引：`id`
- 唯一索引：`(name, version)`
- 查询索引：`name`, `category`, `is_active`

#### workflow_definition_history (定义变更历史)
记录工作流定义的所有变更历史，支持审计和回滚。

### 2. 工作流实例层

#### workflow_instances (工作流实例表)
存储工作流的执行实例和状态信息。

**状态流转：**
```
pending → running → completed/failed/cancelled
   ↓         ↓
paused → resumed
```

**关键字段：**
- `status`: 实例状态，支持暂停/恢复
- `input_data/output_data`: 输入输出数据
- `context_data`: 执行上下文
- `correlation_id`: 业务关联标识

**索引策略：**
- 复合索引：`(status, created_at)` - 状态查询
- 复合索引：`(definition_id, status, created_at)` - 定义相关查询

#### task_instances (任务实例表)
存储工作流中每个任务的执行实例。

**任务类型：**
- `executor`: 执行器任务
- `condition`: 条件判断
- `parallel`: 并行执行
- `sequential`: 顺序执行
- `sub_workflow`: 子工作流

**依赖管理：**
- `dependencies`: JSON数组存储依赖的任务ID
- `execution_order`: 执行顺序控制

### 3. 历史和审计层

#### execution_history (执行历史表)
记录所有工作流和任务的执行事件。

**事件类型：**
- 工作流事件：`workflow_*`
- 任务事件：`task_*`

**用途：**
- 故障诊断和调试
- 性能分析和优化
- 审计和合规要求

### 4. 调度和触发层

#### workflow_schedules (工作流调度表)
支持多种触发方式的调度配置。

**触发类型：**
- `cron`: Cron表达式定时触发
- `interval`: 固定间隔触发
- `event`: 事件驱动触发
- `manual`: 手动触发

### 5. 监控和指标层

#### performance_metrics (性能指标表)
存储工作流和任务的性能数据。

**指标维度：**
- 时间维度：小时/天级别聚合
- 实体维度：工作流/任务/执行器
- 性能维度：执行时间、资源使用、成功率

## 🔍 查询优化

### 1. 常见查询模式

#### 获取活跃工作流实例
```sql
SELECT * FROM workflow_instances 
WHERE status IN ('running', 'pending') 
ORDER BY priority DESC, created_at ASC;
```

#### 查询工作流执行统计
```sql
SELECT 
    definition_id,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success,
    AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at)) as avg_duration
FROM workflow_instances 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY definition_id;
```

### 2. 索引设计

#### 复合索引策略
- **状态查询**：`(status, created_at DESC)`
- **定义查询**：`(definition_id, status, created_at DESC)`
- **调度查询**：`(is_active, next_run_at)`

#### 覆盖索引
为高频查询创建覆盖索引，避免回表操作。

### 3. 分区策略

#### 按时间分区
```sql
-- 执行历史表按月分区
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at))
```

#### 按状态分区
```sql
-- 工作流实例按状态分区
PARTITION BY LIST (status) (
    PARTITION p_active VALUES IN ('pending', 'running', 'paused'),
    PARTITION p_completed VALUES IN ('completed', 'failed', 'cancelled')
)
```

## 🛠️ 维护和运维

### 1. 数据清理

#### 自动清理策略
- 执行历史：保留90天
- 完成实例：保留30天
- 性能指标：保留1年

#### 清理脚本
```sql
-- 清理过期执行历史
CALL CleanupExecutionHistory(90);

-- 归档完成的工作流
CALL ArchiveCompletedWorkflows(30);
```

### 2. 监控告警

#### 关键指标
- 长时间运行的工作流
- 高失败率的工作流定义
- 资源消耗异常的任务

#### 告警查询
```sql
-- 查找长时间运行的工作流
SELECT * FROM v_long_running_workflows;

-- 查找高失败率的工作流
SELECT * FROM v_high_failure_rate_workflows;
```

### 3. 性能优化

#### 查询优化
- 使用预定义视图简化复杂查询
- 定期分析慢查询并优化索引
- 合理使用查询缓存

#### 存储优化
- 定期重建索引和统计信息
- 压缩历史数据表
- 监控表空间使用情况

## 📈 扩展性考虑

### 1. 水平扩展

#### 分片策略
- 按工作流定义ID分片
- 按时间范围分片
- 按业务域分片

#### 读写分离
- 主库处理写操作
- 从库处理查询和报表
- 使用连接池管理连接

### 2. 数据迁移

#### 版本升级
- 使用迁移脚本管理schema变更
- 支持灰度升级和回滚
- 保持向后兼容性

#### 数据同步
- 支持跨数据中心同步
- 实时同步关键数据
- 异步同步历史数据

## 🔒 安全性

### 1. 访问控制
- 基于角色的权限管理
- 敏感数据加密存储
- 审计日志记录

### 2. 数据保护
- 定期备份和恢复测试
- 数据脱敏和匿名化
- 符合GDPR等法规要求

## 📝 使用示例

### 1. 创建工作流定义
```sql
INSERT INTO workflow_definitions (id, name, version, definition_json) 
VALUES ('wf-001', 'data-processing', '1.0', '{"tasks": [...]}');
```

### 2. 启动工作流实例
```sql
INSERT INTO workflow_instances (id, definition_id, status, input_data) 
VALUES ('wi-001', 'wf-001', 'pending', '{"file": "data.csv"}');
```

### 3. 查询执行状态
```sql
SELECT wi.*, wd.name 
FROM workflow_instances wi
JOIN workflow_definitions wd ON wi.definition_id = wd.id
WHERE wi.correlation_id = 'batch-001';
```
