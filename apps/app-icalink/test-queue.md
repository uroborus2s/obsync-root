# BullMQ 队列测试指南

## 当前问题诊断结果

### ✅ Redis 状态
- Redis 正常运行在端口 16379
- 连接正常：`PONG`

### ❌ 发现的问题
1. **任务失败**: 有 2 个任务失败，原因是 `job stalled more than allowable limit`
2. **Worker 超时**: Worker 处理任务时间过长或卡住

## 解决方案

### 1. 重启应用
重启应用以应用新的 Worker 配置（已添加详细日志和错误处理）

### 2. 查看启动日志
应该看到以下日志：
```
Registering checkin queue worker...
Creating worker for queue: checkin
✅ Checkin queue worker registered successfully
```

### 3. 使用诊断接口测试

#### 3.1 查看队列状态
```bash
curl http://localhost:8090/api/icalink/v1/queue/status
```

应该返回：
```json
{
  "success": true,
  "data": {
    "queueName": "checkin",
    "counts": {
      "waiting": 0,
      "active": 0,
      "completed": 0,
      "failed": 0,
      "delayed": 0,
      "total": 0
    },
    "recentJobs": {
      "waiting": [],
      "active": [],
      "failed": []
    }
  }
}
```

#### 3.2 添加测试任务
```bash
curl -X POST http://localhost:8090/api/icalink/v1/queue/test
```

应该返回：
```json
{
  "success": true,
  "message": "Test job added to queue",
  "data": {
    "jobId": "1",
    "queueName": "checkin"
  }
}
```

#### 3.3 查看应用日志
应该看到：
```
🔄 Worker received job 1 { jobId: '1', data: { test: true, ... } }
Processing checkin job from queue
✅ Job 1 completed successfully
Job 1 in queue checkin completed.
```

#### 3.4 再次查看队列状态
```bash
curl http://localhost:8090/api/icalink/v1/queue/status
```

应该看到 `completed` 计数增加。

### 4. 使用 Redis CLI 检查

```bash
# 连接到 Redis
/opt/homebrew/bin/redis-cli -p 16379 -a "_pV)h#5}hl8[?" --no-auth-warning

# 查看所有 BullMQ 键
KEYS bull:checkin:*

# 查看等待中的任务数量
LLEN bull:checkin:wait

# 查看活跃任务数量
LLEN bull:checkin:active

# 查看已完成任务数量（如果配置了保留）
ZCARD bull:checkin:completed

# 查看失败任务数量
ZCARD bull:checkin:failed
```

## 常见问题排查

### 问题 1: Worker 没有收到任务
**症状**: 任务添加后一直在 `waiting` 状态

**检查**:
```bash
# 查看等待队列
LLEN bull:checkin:wait
```

**可能原因**:
1. Worker 没有注册
2. Worker 注册的队列名称不匹配
3. Redis 连接问题

**解决**:
- 检查应用日志，确认看到 "Checkin queue worker registered successfully"
- 重启应用

### 问题 2: 任务一直在 `active` 状态
**症状**: 任务被 Worker 取走但不完成

**检查**:
```bash
# 查看活跃队列
LLEN bull:checkin:active
```

**可能原因**:
1. Worker 处理函数抛出异常
2. Worker 处理函数卡住（死锁、无限循环）
3. 数据库连接问题

**解决**:
- 查看应用日志中的错误信息
- 检查 `processCheckinJob` 方法的逻辑
- 添加超时控制

### 问题 3: 任务失败
**症状**: 任务进入 `failed` 状态

**检查**:
```bash
# 查看失败任务
ZRANGE bull:checkin:failed 0 -1

# 查看失败任务详情
HGETALL bull:checkin:<job_id>
```

**可能原因**:
1. Worker 处理函数抛出异常
2. 业务逻辑错误
3. 数据验证失败

**解决**:
- 查看应用日志中的错误堆栈
- 使用诊断接口查看失败原因
- 修复业务逻辑

### 问题 4: 任务 stalled
**症状**: 任务失败，原因是 "job stalled more than allowable limit"

**可能原因**:
1. Worker 处理时间超过 `stalledInterval`（默认 30 秒）
2. Worker 进程崩溃或重启
3. 数据库查询慢

**解决**:
```typescript
// 增加 stalledInterval
this.queueClient.process('checkin', processor, {
  stalledInterval: 60000, // 60 秒
  maxStalledCount: 3      // 最多标记为 stalled 3 次
});
```

## 监控建议

### 1. 添加 Prometheus 指标
```typescript
// 记录任务处理时间
const startTime = Date.now();
const result = await this.processCheckinJob(job.data);
const duration = Date.now() - startTime;
this.logger.info(`Job processed in ${duration}ms`);
```

### 2. 设置告警
- 失败任务数量超过阈值
- 等待任务数量超过阈值
- 任务处理时间超过阈值

### 3. 定期清理
```typescript
// 每天清理 7 天前的已完成任务
await queue.clean(7 * 24 * 60 * 60 * 1000, 'completed');

// 每天清理 30 天前的失败任务
await queue.clean(30 * 24 * 60 * 60 * 1000, 'failed');
```

