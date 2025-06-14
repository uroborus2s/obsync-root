# 失败任务处理机制更新文档

## 概述

本次更新优化了队列系统的失败任务处理机制，解决了任务失败后`moveToFailure`保存到失败库也失败的问题。新的实现更加简洁和可靠。

## 主要变更

### 1. 数据库结构变更

#### 1.1 queue_jobs 表新增字段
- `error_message` TEXT - 错误消息
- `error_stack` TEXT - 错误堆栈
- `error_code` VARCHAR(100) - 错误代码  
- `failed_at` TIMESTAMP - 失败时间

#### 1.2 状态枚举更新
- 任务状态新增 `'failed'` 状态
- 约束更新：`('waiting', 'executing', 'delayed', 'paused', 'failed')`

#### 1.3 queue_success 表优化
- 移除 `metadata` 字段，简化成功任务记录

### 2. 失败处理逻辑变更

#### 2.1 成功任务处理
```typescript
// 成功时：转移到成功表（不包含metadata）
await jobRepository.moveToSuccess(job, executionTime);
```

#### 2.2 失败任务处理
```typescript
// 失败时：标记为失败状态，保留在queue_jobs表中
await jobRepository.markAsFailed(job, {
  message: error.message,
  stack: error.stack,
  code: error.code
});
```

### 3. 新增功能

#### 3.1 失败任务管理
```typescript
// 获取失败任务列表
const failedTasks = await queueService.getFailedTasks(100, 0);

// 重试单个失败任务
const success = await queueService.retryFailedTask(taskId);

// 批量重试失败任务
const result = await queueService.retryFailedTasks([taskId1, taskId2]);

// 获取失败任务统计
const stats = await queueService.getFailedTasksStats();
```

#### 3.2 任务模型增强
```typescript
// 检查任务是否失败
if (job.isFailed()) {
  const errorInfo = job.getErrorInfo();
  console.log('错误信息:', errorInfo);
}
```

## 优势对比

### 旧实现问题
- ❌ 失败任务移动到失败表可能失败
- ❌ 失败任务无法直接重试
- ❌ 需要维护多个表的数据一致性
- ❌ 成功表包含不必要的metadata字段

### 新实现优势
- ✅ 失败任务直接标记状态，操作简单可靠
- ✅ 失败任务保留在主表中，便于重试
- ✅ 减少数据库事务复杂度
- ✅ 成功表结构更简洁
- ✅ 支持失败任务的查询和管理

## 数据库迁移

### 自动迁移
运行迁移脚本：
```sql
-- 执行迁移脚本
source packages/queue/database/migration_add_failed_status.sql
```

### 手动迁移
如果需要手动执行：
```sql
-- 1. 添加错误字段
ALTER TABLE queue_jobs 
ADD COLUMN error_message TEXT NULL,
ADD COLUMN error_stack TEXT NULL,
ADD COLUMN error_code VARCHAR(100) NULL,
ADD COLUMN failed_at TIMESTAMP NULL;

-- 2. 更新状态约束
ALTER TABLE queue_jobs DROP CONSTRAINT chk_queue_jobs_status;
ALTER TABLE queue_jobs 
ADD CONSTRAINT chk_queue_jobs_status 
CHECK (status IN ('waiting', 'executing', 'delayed', 'paused', 'failed'));

-- 3. 移除成功表metadata字段（如果存在）
ALTER TABLE queue_success DROP COLUMN metadata;
```

## API 使用示例

### 基本使用
```typescript
import { QueueService } from '@stratix/queue';

const queueService = new QueueService();

// 添加任务
await queueService.addTask({
  name: 'processData',
  executor: 'dataProcessor',
  payload: { data: 'example' }
});

// 查看失败任务
const failedTasks = await queueService.getFailedTasks();
console.log('失败任务数量:', failedTasks.length);

// 重试失败任务
for (const task of failedTasks) {
  const success = await queueService.retryFailedTask(task.id);
  console.log(`任务 ${task.id} 重试${success ? '成功' : '失败'}`);
}
```

### 高级管理
```typescript
// 获取详细统计
const stats = await queueService.getFailedTasksStats();
console.log('失败任务统计:', {
  总数: stats.total,
  按执行器: stats.byExecutor,
  按分组: stats.byGroup
});

// 批量重试
const taskIds = failedTasks.map(t => t.id);
const retryResult = await queueService.retryFailedTasks(taskIds);
console.log('重试结果:', {
  成功: retryResult.success.length,
  失败: retryResult.failed.length
});
```

## 兼容性说明

### API 兼容性
- ✅ 所有现有API保持兼容
- ✅ 新增API不影响现有功能
- ✅ 任务状态类型向后兼容

### 数据兼容性
- ✅ 现有任务数据不受影响
- ✅ 迁移脚本安全可靠
- ✅ 支持回滚操作

### 行为变更
- 🔄 失败任务不再移动到失败表
- 🔄 失败任务可以直接重试
- 🔄 成功表不再包含metadata

## 监控和调试

### 新增日志
```
✅ 任务执行成功 - 转移到成功表
❌ 任务执行失败，已标记为失败状态
🔄 失败任务已重置为等待状态
```

### 数据库查询
```sql
-- 查看失败任务
SELECT id, job_name, error_message, failed_at 
FROM queue_jobs 
WHERE status = 'failed' 
ORDER BY failed_at DESC;

-- 统计各状态任务数量
SELECT status, COUNT(*) as count 
FROM queue_jobs 
GROUP BY status;
```

## 总结

本次更新通过简化失败任务处理流程，提高了系统的可靠性和可维护性：

1. **可靠性提升**：失败任务处理不再依赖复杂的表间数据移动
2. **功能增强**：支持失败任务的查询、统计和重试
3. **性能优化**：减少数据库事务复杂度
4. **维护简化**：统一的任务状态管理

新的实现更符合实际业务需求，为队列系统提供了更好的错误处理和恢复能力。 