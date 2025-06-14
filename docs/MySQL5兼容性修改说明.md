# MySQL 5 兼容性修改说明

## 概述
本文档说明了将 `sql.sql` 文件从 MySQL 8 格式转换为 MySQL 5 兼容格式所做的修改。

## 主要兼容性问题及解决方案

### 1. 字符集兼容性问题

#### 问题描述
- 原文件使用了 `utf8mb4_0900_ai_ci` 字符集，这是 MySQL 8.0 引入的新字符集
- MySQL 5.x 版本不支持此字符集，会导致 `1273 - Unknown collation` 错误

#### 解决方案
- 将所有 `utf8mb4_0900_ai_ci` 替换为 `utf8_unicode_ci`
- 将所有 `utf8mb4_unicode_ci` 替换为 `utf8_unicode_ci`
- 将所有 `DEFAULT CHARSET=utf8mb4` 替换为 `DEFAULT CHARSET=utf8`
- 将所有 `CHARACTER SET utf8mb4` 替换为 `CHARACTER SET utf8`

#### 影响的表
- `juhe_renwu` 表的 `jc_s` 和 `sjd` 字段
- `juhe_renwu_copy1` 表的 `jc_s` 和 `sjd` 字段
- `queue_failures` 表及其所有字段
- `queue_groups` 表及其所有字段
- `queue_metrics` 表及其所有字段
- `queue_success` 表及其所有字段
- `running_tasks` 表及其所有字段
- `shared_contexts` 表及其所有字段
- `tasks` 表

### 2. JSON 数据类型兼容性

#### 问题描述
- MySQL 5.6 及以下版本不支持原生 JSON 数据类型

#### 解决方案
- 将所有 `json` 数据类型替换为 `text` 数据类型
- 应用程序层面需要手动处理 JSON 序列化/反序列化

#### 影响的字段
- `running_tasks.metadata`
- `queue_success.payload`
- `queue_success.result`
- `queue_success.metadata`

### 3. CHECK 约束兼容性

#### 问题描述
- MySQL 5.7 之前的版本不支持 CHECK 约束

#### 解决方案
- 删除所有 CHECK 约束
- 应用程序层面需要实现数据验证逻辑

#### 影响的约束
- `queue_groups` 表的 `chk_queue_groups_status` 约束

### 4. 字符集引用修复

#### 问题描述
- 原文件中包含 `_utf8mb4'value'` 格式的字符集引用

#### 解决方案
- 将所有 `_utf8mb4` 替换为 `_utf8`

## 修改后的文件

### 输出文件
- `docs/sql_new.sql` - MySQL 5 兼容版本

### 测试文件
- `docs/test_mysql5_compatibility.sql` - 兼容性测试脚本

## 验证步骤

1. 在 MySQL 5 环境中执行测试脚本：
   ```sql
   SOURCE docs/test_mysql5_compatibility.sql;
   ```

2. 如果测试通过，执行主SQL文件：
   ```sql
   SOURCE docs/sql_new.sql;
   ```

## 注意事项

### 应用程序适配
1. **JSON 字段处理**：应用程序需要手动处理 JSON 数据的序列化和反序列化
2. **数据验证**：由于删除了 CHECK 约束，需要在应用程序层面实现数据验证
3. **字符集处理**：确保应用程序连接使用正确的字符集设置

### 数据迁移
- 如果从 MySQL 8 迁移现有数据，JSON 字段的数据会自动转换为文本格式
- 需要验证数据完整性，特别是包含特殊字符的数据

### 性能考虑
- `utf8` 字符集相比 `utf8mb4` 在某些情况下可能有轻微的性能优势
- TEXT 类型相比 JSON 类型在查询时可能需要额外的解析开销

## 兼容性矩阵

| 特性 | MySQL 5.5 | MySQL 5.6 | MySQL 5.7 | MySQL 8.0 |
|------|-----------|-----------|-----------|-----------|
| utf8_unicode_ci | ✅ | ✅ | ✅ | ✅ |
| TEXT 数据类型 | ✅ | ✅ | ✅ | ✅ |
| TIMESTAMP 字段 | ✅ | ✅ | ✅ | ✅ |
| 外键约束 | ✅ | ✅ | ✅ | ✅ |

修改后的 SQL 文件应该能在 MySQL 5.5 及以上版本中正常运行。 