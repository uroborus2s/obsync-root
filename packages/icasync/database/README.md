# @stratix/icasync 数据库迁移文档

## 概述

本目录包含 @stratix/icasync 插件的数据库迁移脚本和相关文档。所有的数据库表结构变更都通过版本化的 SQL 脚本进行管理。

## 文件结构

```
packages/icasync/database/
├── README.md                           # 本文档
├── 001_create_icasync_tables.sql       # 初始表结构创建脚本
└── migrations/                         # 未来的迁移脚本目录
```

## 迁移脚本

### 001_create_icasync_tables.sql

**版本**: 1.0.0  
**创建时间**: 2024-01-15  
**描述**: 创建 icasync 插件的初始数据表结构

#### 包含的表

1. **icasync_calendar_mapping** - 课程日历映射表
   - 存储课程（kkh）与 WPS 日历 ID 的映射关系
   - 主键: `id` (int AUTO_INCREMENT)
   - 唯一约束: `kkh` + `xnxq`

2. **icasync_schedule_mapping** - 日程映射表
   - 存储聚合任务与 WPS 日程 ID 的映射关系
   - 主键: `id` (int AUTO_INCREMENT)
   - 唯一约束: `juhe_renwu_id`

3. **icasync_user_view** - 用户视图表
   - 统一的用户视图，包含学生和教师信息
   - 主键: `id` (int AUTO_INCREMENT)
   - 唯一约束: `user_code` + `user_type`

4. **icasync_calendar_participants** - 日历参与者映射表
   - 存储日历参与者关系和权限
   - 主键: `id` (int AUTO_INCREMENT)
   - 唯一约束: `calendar_id` + `user_code` + `user_type`

5. **icasync_sync_tasks** - 同步任务记录表
   - 记录同步任务的执行历史和状态
   - 主键: `id` (int AUTO_INCREMENT)
   - 索引: `task_type`, `xnxq`, `task_tree_id`, `status`, `created_at`

## 执行指南

### 环境要求

- **数据库版本**: MySQL 5.7+ 或 MariaDB 10.2+
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_unicode_ci
- **权限**: CREATE, DROP, ALTER, INDEX

### 执行步骤

#### 1. 连接数据库

```bash
mysql -h <host> -u <username> -p <database_name>
```

#### 2. 执行迁移脚本

```sql
-- 方式一：在 MySQL 命令行中执行
source packages/icasync/database/001_create_icasync_tables.sql;

-- 方式二：使用命令行直接执行
mysql -h <host> -u <username> -p <database_name> < packages/icasync/database/001_create_icasync_tables.sql
```

#### 3. 验证执行结果

```sql
-- 检查表是否创建成功
SHOW TABLES LIKE 'icasync_%';

-- 检查表结构
DESCRIBE icasync_calendar_mapping;
DESCRIBE icasync_schedule_mapping;
DESCRIBE icasync_user_view;
DESCRIBE icasync_calendar_participants;
DESCRIBE icasync_sync_tasks;

-- 检查索引
SHOW INDEX FROM icasync_calendar_mapping;
SHOW INDEX FROM icasync_schedule_mapping;
SHOW INDEX FROM icasync_user_view;
SHOW INDEX FROM icasync_calendar_participants;
SHOW INDEX FROM icasync_sync_tasks;
```

### 回滚操作

如果需要回滚，可以执行以下 SQL：

```sql
-- 删除所有 icasync 相关表
DROP TABLE IF EXISTS `icasync_sync_tasks`;
DROP TABLE IF EXISTS `icasync_calendar_participants`;
DROP TABLE IF EXISTS `icasync_user_view`;
DROP TABLE IF EXISTS `icasync_schedule_mapping`;
DROP TABLE IF EXISTS `icasync_calendar_mapping`;
```

## 数据库设计说明

### 主键设计

所有表都使用自增整数作为主键：
- 类型: `int(11) NOT NULL AUTO_INCREMENT`
- 优势: 性能好、存储空间小、索引效率高

### 字符集和排序规则

- **字符集**: `utf8mb4` - 支持完整的 UTF-8 字符集，包括 emoji
- **排序规则**: `utf8mb4_unicode_ci` - 不区分大小写的 Unicode 排序

### 索引策略

#### 主键索引
- 所有表都有自增主键，自动创建聚簇索引

#### 唯一索引
- 防止业务数据重复
- 确保数据一致性

#### 普通索引
- 基于查询频率和性能需求创建
- 支持高效的条件查询和排序

### 字段设计原则

#### 时间字段
- `created_at`: 创建时间，默认当前时间
- `updated_at`: 更新时间，自动更新为当前时间

#### 状态字段
- 使用 `enum` 类型限制可选值
- 提供默认值确保数据完整性

#### JSON 字段
- `metadata`: 存储扩展信息，提供灵活性
- 适用于非结构化或半结构化数据

## 性能优化建议

### 1. 索引优化

```sql
-- 定期分析表统计信息
ANALYZE TABLE icasync_calendar_mapping;
ANALYZE TABLE icasync_schedule_mapping;
ANALYZE TABLE icasync_user_view;
ANALYZE TABLE icasync_calendar_participants;
ANALYZE TABLE icasync_sync_tasks;
```

### 2. 查询优化

- 使用索引字段进行查询
- 避免在 WHERE 子句中使用函数
- 合理使用 LIMIT 限制结果集大小

### 3. 维护建议

- 定期清理过期的同步任务记录
- 监控表大小和索引使用情况
- 根据业务需求调整索引策略

## 故障排除

### 常见问题

#### 1. 字符集问题

```sql
-- 检查数据库字符集
SHOW VARIABLES LIKE 'character_set%';

-- 检查表字符集
SHOW CREATE TABLE icasync_calendar_mapping;
```

#### 2. 权限问题

```sql
-- 检查用户权限
SHOW GRANTS FOR CURRENT_USER();
```

#### 3. 存储引擎问题

```sql
-- 检查存储引擎支持
SHOW ENGINES;

-- 检查表存储引擎
SHOW TABLE STATUS LIKE 'icasync_%';
```

### 联系支持

如果遇到问题，请提供以下信息：
- MySQL 版本信息
- 错误日志内容
- 执行的 SQL 语句
- 数据库配置信息

## 版本历史

| 版本 | 日期 | 描述 | 作者 |
|------|------|------|------|
| 1.0.0 | 2024-01-15 | 初始版本，创建基础表结构 | @stratix/icasync |

## 下一步计划

- 添加数据迁移脚本
- 创建测试数据脚本
- 添加性能监控脚本
- 实现自动化迁移工具
