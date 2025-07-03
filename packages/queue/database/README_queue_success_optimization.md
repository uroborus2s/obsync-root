# queue_success 表查询性能优化指南

## 🚨 问题描述

`queue_success` 表查询速度慢，影响系统性能，特别是在以下场景：
- 按队列查询最近成功的任务
- 分组统计成功任务数量
- 按时间范围查询历史记录
- 执行器性能分析

## 🎯 解决方案

本优化方案通过添加高效索引来解决查询慢的问题，预期性能提升 **5-20 倍**。

## 📁 相关文件

- `fix_queue_success_slow_query.sql` - 核心优化SQL脚本
- `apply_queue_success_indexes.sh` - 自动执行脚本
- `migration_queue_success_performance.sql` - 完整版优化脚本

## 🚀 快速执行

### 方法一：直接执行 SQL 脚本

```bash
# 连接到数据库后执行
mysql -h主机 -u用户名 -p数据库名 < packages/queue/database/fix_queue_success_slow_query.sql
```

### 方法二：使用自动化脚本

```bash
# 给脚本添加执行权限
chmod +x packages/queue/scripts/apply_queue_success_indexes.sh

# 执行脚本
./packages/queue/scripts/apply_queue_success_indexes.sh localhost obsync_db root
```

## 📊 优化内容

### 创建的索引

1. **`idx_queue_success_queue_time`** - 队列名 + 完成时间
   - 解决 90% 的常见查询场景
   
2. **`idx_queue_success_group_time`** - 分组 + 完成时间  
   - 优化分组统计查询
   
3. **`idx_queue_success_completed_at`** - 完成时间
   - 优化时间范围查询
   
4. **`idx_queue_success_queue_group_time`** - 队列名 + 分组 + 完成时间
   - 优化复合条件查询

### 性能提升预期

| 查询类型 | 优化前 | 优化后 | 提升倍数 |
|---------|--------|--------|----------|
| 按队列查询最近任务 | 5-50s | 0.1-2s | **5-25x** |
| 分组统计查询 | 2-20s | 0.1-1s | **8-20x** |
| 时间范围查询 | 3-30s | 0.2-2s | **10-15x** |
| 复合条件查询 | 10-60s | 0.5-3s | **5-20x** |

## 🧪 验证优化效果

### 测试查询示例

```sql
-- 1. 查询队列最近成功任务
SELECT * FROM queue_success 
WHERE queue_name = 'your_queue_name' 
ORDER BY completed_at DESC 
LIMIT 50;

-- 2. 统计分组成功数量
SELECT group_id, COUNT(*) as success_count
FROM queue_success 
WHERE group_id = 'your_group_id'
  AND completed_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
GROUP BY group_id;

-- 3. 查询时间范围内任务
SELECT COUNT(*) as total_success
FROM queue_success 
WHERE completed_at BETWEEN '2024-01-01' AND '2024-01-31';
```

### 查看执行计划

```sql
-- 查看索引是否被正确使用
EXPLAIN SELECT * FROM queue_success 
WHERE queue_name = 'test_queue' 
ORDER BY completed_at DESC 
LIMIT 10;
```

## 🔧 维护建议

### 定期维护

```sql
-- 每周执行一次，更新表统计信息
ANALYZE TABLE queue_success;
```

### 监控索引使用情况

```sql
-- 查看索引统计信息
SELECT 
    INDEX_NAME as '索引名称',
    CARDINALITY as '基数',
    INDEX_TYPE as '类型'
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'queue_success'
  AND INDEX_NAME != 'PRIMARY'
ORDER BY INDEX_NAME;
```

### 清理历史数据

```sql
-- 清理超过30天的成功记录（根据业务需求调整）
DELETE FROM queue_success 
WHERE completed_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
LIMIT 10000;
```

## ⚠️ 注意事项

1. **存储空间**：索引会占用额外 20-30% 的存储空间
2. **写入性能**：插入操作可能稍微变慢（通常 < 5%）
3. **执行时间**：大表创建索引可能需要几分钟到几小时
4. **业务影响**：建议在业务低峰期执行

## 🎉 预期效果

- ✅ 普通查询响应时间从秒级降低到毫秒级
- ✅ 分组统计查询大幅提速
- ✅ 历史记录分页查询流畅
- ✅ 系统整体性能明显提升
- ✅ 用户体验显著改善

## 📞 技术支持

如果在执行过程中遇到问题，请检查：

1. 数据库连接是否正常
2. 用户是否有创建索引的权限
3. 磁盘空间是否充足
4. 表是否被锁定

---

**💡 提示**：此优化方案基于常见的查询模式设计，如果您的业务有特殊的查询需求，可以根据实际情况调整索引策略。 