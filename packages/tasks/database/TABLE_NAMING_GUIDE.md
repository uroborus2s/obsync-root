# 工作流数据库表命名规范

## 📋 表名优化说明

为了保持数据库表命名的一致性和规范性，所有工作流相关的表都统一使用 `workflow_` 前缀。

## 🔄 表名映射对照

### 原表名 → 新表名

| 原表名 | 新表名 | 说明 |
|--------|--------|------|
| `workflow_definitions` | `workflow_definitions` | ✅ 无变化 |
| `workflow_instances` | `workflow_instances` | ✅ 无变化 |
| `task_nodes` | `workflow_task_nodes` | 🔄 添加前缀 |
| `workflow_locks` | `workflow_locks` | ✅ 无变化 |
| `workflow_engine_instances` | `workflow_engine_instances` | ✅ 无变化 |
| `workflow_assignments` | `workflow_assignments` | ✅ 无变化 |
| `node_assignments` | `workflow_node_assignments` | 🔄 添加前缀 |
| `failover_events` | `workflow_failover_events` | 🔄 添加前缀 |
| `execution_logs` | `workflow_execution_logs` | 🔄 添加前缀 |

## 📊 完整表结构概览

### 核心业务表
- `workflow_definitions` - 工作流定义表
- `workflow_instances` - 工作流实例表
- `workflow_task_nodes` - 工作流任务节点表

### 分布式执行表
- `workflow_locks` - 分布式锁表
- `workflow_engine_instances` - 工作流引擎实例表
- `workflow_assignments` - 工作流分配记录表
- `workflow_node_assignments` - 工作流节点分配记录表

### 监控和日志表
- `workflow_failover_events` - 工作流故障转移事件表
- `workflow_execution_logs` - 工作流执行日志表

## 🎯 命名规范优势

### ✅ **一致性**
- 所有表都以 `workflow_` 开头
- 便于识别和管理工作流相关表
- 避免与其他业务表混淆

### ✅ **可维护性**
- 清晰的表名层次结构
- 便于数据库管理和备份
- 支持按前缀进行批量操作

### ✅ **可扩展性**
- 为未来新增表预留了命名空间
- 便于集成到现有系统中
- 支持多租户场景下的表隔离

## 🔧 代码更新指南

### Repository 层更新
需要更新以下 Repository 接口和实现中的表名：

```typescript
// 原来的表名
const TABLE_NAME = 'task_nodes';
const TABLE_NAME = 'execution_logs';
const TABLE_NAME = 'node_assignments';
const TABLE_NAME = 'failover_events';

// 新的表名
const TABLE_NAME = 'workflow_task_nodes';
const TABLE_NAME = 'workflow_execution_logs';
const TABLE_NAME = 'workflow_node_assignments';
const TABLE_NAME = 'workflow_failover_events';
```

### SQL 查询更新
所有涉及这些表的 SQL 查询都需要更新表名：

```sql
-- 原来的查询
SELECT * FROM task_nodes WHERE workflow_instance_id = ?;
SELECT * FROM execution_logs WHERE level = 'error';

-- 新的查询
SELECT * FROM workflow_task_nodes WHERE workflow_instance_id = ?;
SELECT * FROM workflow_execution_logs WHERE level = 'error';
```

### 外键约束更新
外键约束中的表名引用也已经更新：

```sql
-- 原来的外键
FOREIGN KEY (task_node_id) REFERENCES task_nodes(id)

-- 新的外键
FOREIGN KEY (task_node_id) REFERENCES workflow_task_nodes(id)
```

## 📝 迁移注意事项

### 1. **数据迁移**
如果已有数据，需要执行表重命名操作：
```sql
RENAME TABLE task_nodes TO workflow_task_nodes;
RENAME TABLE execution_logs TO workflow_execution_logs;
RENAME TABLE node_assignments TO workflow_node_assignments;
RENAME TABLE failover_events TO workflow_failover_events;
```

### 2. **应用代码更新**
- 更新所有 Repository 实现
- 更新 SQL 查询语句
- 更新测试用例
- 更新文档和注释

### 3. **配置文件更新**
- 更新数据库迁移脚本
- 更新监控配置
- 更新备份脚本

## 🚀 实施建议

1. **分阶段实施**: 先更新新环境，再迁移现有环境
2. **充分测试**: 确保所有功能正常工作
3. **备份数据**: 迁移前做好完整备份
4. **文档同步**: 及时更新相关技术文档

这种统一的命名规范将大大提升工作流系统的可维护性和专业性。
