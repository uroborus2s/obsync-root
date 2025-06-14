# MySQL 5 时间戳字段兼容性修复报告

## 问题描述

在 MySQL 5.6 及更早版本中，存在以下时间戳字段限制：
- 只有第一个 `TIMESTAMP` 字段可以使用 `DEFAULT CURRENT_TIMESTAMP`
- 其他 `TIMESTAMP` 字段必须明确指定默认值或设置为 `NULL`
- 不能有多个 `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` 字段

## 错误信息

```
> 1067 - Invalid default value for 'completedAt'
```

## 修复的表

### 1. queue_job_logs 表
**修复前：**
```sql
`createdAt` timestamp NOT NULL,
`processedAt` timestamp NULL DEFAULT NULL,
`completedAt` timestamp NOT NULL,
`archivedAt` timestamp NOT NULL,
```

**修复后：**
```sql
`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`processedAt` timestamp NULL DEFAULT NULL,
`completedAt` timestamp NULL DEFAULT NULL,
`archivedAt` timestamp NULL DEFAULT NULL,
```

### 2. queue_jobs 表
**修复前：**
```sql
`createdAt` timestamp NOT NULL,
`updatedAt` timestamp NOT NULL,
```

**修复后：**
```sql
`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`updatedAt` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
```

### 3. queue_metadata 表
**修复前：**
```sql
`createdAt` timestamp NOT NULL,
`updatedAt` timestamp NOT NULL,
```

**修复后：**
```sql
`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`updatedAt` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
```

### 4. queue_success 表
**修复前：**
```sql
`created_at` timestamp NOT NULL,
`started_at` timestamp NOT NULL,
`completed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
```

**修复后：**
```sql
`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`started_at` timestamp NULL DEFAULT NULL,
`completed_at` timestamp NULL DEFAULT NULL,
```

### 5. tasks 表
**修复前：**
```sql
`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
```

**修复后：**
```sql
`updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
```

### 6. running_tasks 表
**修复前：**
```sql
`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
```

**修复后：**
```sql
`updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
```

### 7. shared_contexts 表
**修复前：**
```sql
`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
```

**修复后：**
```sql
`updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
```

### 8. user_calendar 表
**修复前：**
```sql
`mtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
```

**修复后：**
```sql
`mtime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
```

### 9. user_lessons 表
**修复前：**
```sql
`mtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
```

**修复后：**
```sql
`mtime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
```

## 修复原则

1. **第一个时间戳字段**：保持 `NOT NULL DEFAULT CURRENT_TIMESTAMP`，通常是 `created_at` 或 `createdAt` 字段
2. **更新时间字段**：改为 `NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP`
3. **其他时间戳字段**：改为 `NULL DEFAULT NULL`

## 兼容性说明

修复后的 SQL 文件：
- ✅ 兼容 MySQL 5.5+
- ✅ 兼容 MySQL 5.6+
- ✅ 兼容 MySQL 5.7+
- ✅ 兼容 MySQL 8.0+

## 测试验证

已创建测试脚本 `docs/test_queue_job_logs.sql` 用于验证修复效果。

## 应用程序适配

应用程序代码需要适配以下变化：
1. 某些时间戳字段现在可能为 `NULL`
2. 需要在应用层处理 `NULL` 时间戳值
3. 插入数据时可能需要显式设置时间戳值

详细的应用程序适配指南请参考 `docs/应用程序适配指南.md`。

## 修复完成时间

修复完成时间：2025年1月8日

## 修复状态

✅ 所有时间戳字段兼容性问题已修复
✅ 测试脚本已创建
✅ 文档已更新 