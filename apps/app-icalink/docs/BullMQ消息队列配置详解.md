# BullMQ 消息队列配置详解

## 📋 目录

1. [配置参数详解](#配置参数详解)
2. [多节点部署机制](#多节点部署机制)
3. [Worker 启动流程](#worker-启动流程)
4. [实际应用示例](#实际应用示例)

---

## 配置参数详解

### 当前配置

```typescript
{
  name: '@stratix/queue',
  plugin: queuePlugin,
  options: {
    defaultJobOptions: {
      removeOnComplete: true,      // 自动删除已完成的任务
      removeOnFail: 100,            // 保留最近 100 个失败的任务
      attempts: 3,                  // 最多重试 3 次
      backoff: {
        type: 'exponential',        // 指数退避策略
        delay: 1000                 // 初始延迟 1 秒
      }
    }
  }
}
```

### 参数说明

#### 1. `removeOnComplete: true`

**含义**: 任务成功完成后自动从 Redis 中删除

**优点**:
- 节省 Redis 内存空间
- 避免 Redis 数据膨胀
- 适合不需要保留历史记录的任务

**缺点**:
- 无法查看已完成任务的历史记录
- 无法进行事后审计

**建议**:
- 对于日常重复性任务（如自动标记缺勤），可以设置为 `true`
- 对于重要业务任务（如数据归档），建议设置为 `false` 或保留一定数量（如 `removeOnComplete: 1000`）

#### 2. `removeOnFail: 100`

**含义**: 保留最近 100 个失败的任务，超过 100 个后自动删除最旧的

**优点**:
- 保留失败任务用于调试和分析
- 限制失败任务数量，避免内存溢出
- 可以查看最近的错误模式

**建议**:
- 开发环境：设置为 `false`（保留所有失败任务）
- 生产环境：设置为 `100-1000`（根据任务频率调整）
- 关键任务：设置为 `false` 并配合监控告警

#### 3. `attempts: 3`

**含义**: 任务失败后最多重试 3 次（总共执行 4 次：1 次初始 + 3 次重试）

**重试逻辑**:
```
第 1 次执行 → 失败 → 等待 1 秒 → 第 2 次执行
第 2 次执行 → 失败 → 等待 2 秒 → 第 3 次执行
第 3 次执行 → 失败 → 等待 4 秒 → 第 4 次执行
第 4 次执行 → 失败 → 标记为永久失败
```

**建议**:
- 网络请求类任务：`attempts: 3-5`
- 数据库操作：`attempts: 2-3`
- 幂等性任务：可以设置更高的重试次数
- 非幂等性任务：谨慎设置重试次数

#### 4. `backoff.type: 'exponential'`

**含义**: 使用指数退避策略计算重试延迟

**退避策略对比**:

| 策略类型 | 延迟计算公式 | 示例（delay=1000） |
|---------|-------------|-------------------|
| `fixed` | 固定延迟 | 1s, 1s, 1s |
| `exponential` | delay × 2^(attempt-1) | 1s, 2s, 4s |
| `custom` | 自定义函数 | 可自定义 |

**指数退避的优势**:
- 给系统恢复时间（如数据库重启、网络恢复）
- 避免雪崩效应（大量任务同时重试）
- 适合处理临时性故障

#### 5. `backoff.delay: 1000`

**含义**: 初始延迟 1000 毫秒（1 秒）

**实际延迟时间**:
- 第 1 次重试：1 秒
- 第 2 次重试：2 秒
- 第 3 次重试：4 秒

**建议**:
- 快速任务（如缓存刷新）：`delay: 500-1000`
- 普通任务（如数据同步）：`delay: 1000-3000`
- 慢速任务（如文件处理）：`delay: 3000-5000`

---

## 多节点部署机制

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         Redis Server                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Queue 1   │  │  Queue 2   │  │  Queue 3   │            │
│  │ (checkin)  │  │ (archive)  │  │ (cleanup)  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
         ↑                ↑                ↑
         │                │                │
    ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
    │ Node 1  │      │ Node 2  │      │ Node 3  │
    │ Worker  │      │ Worker  │      │ Worker  │
    └─────────┘      └─────────┘      └─────────┘
```

### 工作原理

#### 1. **Redis 作为中央协调器**

- **队列存储**: 所有任务存储在 Redis 中
- **分布式锁**: 使用 Redis 的 `SETNX` 命令实现分布式锁
- **原子操作**: 使用 Redis 的 Lua 脚本保证操作原子性

#### 2. **Worker 竞争机制**

当一个任务被推送到 Redis 队列后：

```typescript
// 伪代码示例
async function processNextJob() {
  // 1. 所有 Worker 监听同一个队列
  const job = await redis.blpop('queue:checkin', 0);
  
  // 2. 第一个获取到任务的 Worker 开始处理
  // 其他 Worker 继续等待下一个任务
  
  // 3. Worker 获取分布式锁
  const lockAcquired = await redis.set(
    `lock:job:${job.id}`,
    workerId,
    'NX',  // 只在键不存在时设置
    'EX',  // 设置过期时间
    30     // 30 秒后自动释放锁
  );
  
  if (lockAcquired) {
    // 4. 执行任务
    await executeJob(job);
    
    // 5. 释放锁
    await redis.del(`lock:job:${job.id}`);
  }
}
```

#### 3. **负载均衡**

BullMQ 自动实现负载均衡：

- **轮询分配**: 任务按顺序分配给空闲的 Worker
- **并发控制**: 每个 Worker 可以配置最大并发数
- **优先级队列**: 支持任务优先级，高优先级任务优先处理

#### 4. **故障转移**

**Worker 崩溃处理**:

```typescript
// Worker 心跳机制
setInterval(async () => {
  await redis.set(
    `worker:${workerId}:heartbeat`,
    Date.now(),
    'EX',
    60  // 60 秒过期
  );
}, 30000);  // 每 30 秒发送一次心跳

// 任务超时检测
if (Date.now() - job.processedOn > job.timeout) {
  // 任务超时，重新入队
  await queue.add(job.name, job.data, {
    attempts: job.attemptsMade + 1
  });
}
```

**自动恢复**:
- Worker 崩溃后，正在处理的任务会因为锁超时而被释放
- 其他 Worker 可以重新获取该任务
- 任务会根据 `attempts` 配置进行重试

### 多节点部署示例

#### 场景：3 个节点部署

```typescript
// Node 1: 主要处理签到任务
onReady: async (fastify) => {
  const container = fastify.diContainer;
  const queueAdapter = container.resolve('queueAdapter');
  const checkinHandler = container.resolve(CheckinJobHandler);
  
  // 注册 Worker，并发数 5
  queueAdapter.process('checkin', 5, (job) =>
    checkinHandler.process(job)
  );
}

// Node 2: 主要处理归档任务
onReady: async (fastify) => {
  const container = fastify.diContainer;
  const queueAdapter = container.resolve('queueAdapter');
  const archiveHandler = container.resolve(ArchiveJobHandler);
  
  // 注册 Worker，并发数 2（归档任务较慢）
  queueAdapter.process('archive', 2, (job) =>
    archiveHandler.process(job)
  );
}

// Node 3: 混合处理
onReady: async (fastify) => {
  const container = fastify.diContainer;
  const queueAdapter = container.resolve('queueAdapter');
  const checkinHandler = container.resolve(CheckinJobHandler);
  const cleanupHandler = container.resolve(CleanupJobHandler);
  
  // 同时注册多个 Worker
  queueAdapter.process('checkin', 3, (job) =>
    checkinHandler.process(job)
  );
  queueAdapter.process('cleanup', 1, (job) =>
    cleanupHandler.process(job)
  );
}
```

#### 任务分配示例

假设有 10 个签到任务同时到达：

```
Redis Queue: [Task1, Task2, Task3, Task4, Task5, Task6, Task7, Task8, Task9, Task10]

Node 1 (并发5): Task1, Task2, Task3, Task4, Task5
Node 3 (并发3): Task6, Task7, Task8
等待处理:      Task9, Task10

// 当 Node 1 完成 Task1 后
Node 1: Task9 (替换 Task1)

// 当 Node 3 完成 Task6 后
Node 3: Task10 (替换 Task6)
```

---

## Worker 启动流程

### 在 onReady 方法中启动

```typescript
// apps/app-icalink/src/stratix.config.ts
export const createStratixConfig = (
  sensitiveConfig: SensitiveConfig
): StratixConfig => ({
  server: {
    onReady: async (fastify) => {
      // 1. 添加权限钩子
      fastify.addHook(
        'onRequest',
        onRequestPermissionHook([], { skipPaths: ['/health'] })
      );

      // 2. 启动消息队列 Worker
      const container = fastify.diContainer;
      const queueAdapter = container.resolve('queueAdapter');
      
      // 3. 注册自动标记缺勤 Worker
      const autoAbsentHandler = container.resolve(AutoAbsentJobHandler);
      queueAdapter.process('auto-absent', 5, async (job) => {
        return await autoAbsentHandler.process(job);
      });
      
      // 4. 注册数据归档 Worker
      const archiveHandler = container.resolve(ArchiveAttendanceJobHandler);
      queueAdapter.process('archive-attendance', 2, async (job) => {
        return await archiveHandler.process(job);
      });
      
      // 5. 注册附件清理 Worker
      const cleanupHandler = container.resolve(CleanupAttachmentsJobHandler);
      queueAdapter.process('cleanup-attachments', 1, async (job) => {
        return await cleanupHandler.process(job);
      });
      
      fastify.log.info('✅ All queue workers registered successfully');
    }
  }
});
```

### 启动时机

1. **应用启动** → Fastify 服务器启动
2. **插件加载** → `@stratix/queue` 插件初始化，连接 Redis
3. **onReady 触发** → 服务器准备就绪，开始注册 Worker
4. **Worker 监听** → Worker 开始监听 Redis 队列
5. **任务处理** → 接收并处理任务

### 生命周期

```
应用启动
  ↓
加载配置
  ↓
初始化插件 (@stratix/queue)
  ↓
连接 Redis
  ↓
触发 onReady 钩子
  ↓
注册 Worker (queueAdapter.process)
  ↓
Worker 开始监听队列
  ↓
[运行中] 处理任务
  ↓
应用关闭
  ↓
Worker 优雅关闭 (完成当前任务)
  ↓
断开 Redis 连接
```

---

## 实际应用示例

### 示例 1: 自动标记缺勤

```typescript
// 1. 创建 Job Handler
export class AutoAbsentJobHandler {
  constructor(
    private attendanceRecordRepository: AttendanceRecordRepository,
    private logger: Logger
  ) {}

  async process(job: Job): Promise<void> {
    const { courseId, recordId } = job.data;
    
    this.logger.info({ courseId, recordId }, 'Processing auto-absent job');
    
    // 查找超时未签到的记录
    const records = await this.attendanceRecordRepository.findMany(
      (qb) => qb
        .where('course_id', '=', courseId)
        .where('status', '=', 'not_checked_in')
        .where('created_at', '<', new Date(Date.now() - 60 * 60 * 1000)) // 1小时前
    );
    
    // 批量更新为缺勤
    for (const record of records) {
      await this.attendanceRecordRepository.update(record.id, {
        status: 'absent',
        updated_by: 'system'
      });
    }
    
    this.logger.info(
      { count: records.length },
      'Auto-absent job completed'
    );
  }
}

// 2. 在 onReady 中注册
onReady: async (fastify) => {
  const queueAdapter = fastify.diContainer.resolve('queueAdapter');
  const handler = fastify.diContainer.resolve(AutoAbsentJobHandler);
  
  queueAdapter.process('auto-absent', 5, (job) => handler.process(job));
}

// 3. 添加定时任务（每 5 分钟执行一次）
import { CronJob } from 'cron';

const job = new CronJob('*/5 * * * *', async () => {
  await queueAdapter.add('auto-absent', {
    courseId: 'all',
    timestamp: Date.now()
  });
});

job.start();
```

### 示例 2: 数据归档

```typescript
// 每天凌晨 2:00 执行
const archiveJob = new CronJob('0 2 * * *', async () => {
  await queueAdapter.add('archive-attendance', {
    retentionDays: 1095,  // 3 年
    batchSize: 1000
  }, {
    attempts: 5,  // 归档任务重试 5 次
    backoff: {
      type: 'exponential',
      delay: 5000  // 初始延迟 5 秒
    }
  });
});
```

---

## 总结

### 关键要点

1. **配置优化**: 根据任务特性调整 `attempts`、`backoff`、`removeOnComplete` 等参数
2. **多节点部署**: Redis 自动实现负载均衡和故障转移，无需额外配置
3. **Worker 启动**: 在 `onReady` 钩子中注册 Worker，确保应用完全启动后再处理任务
4. **监控告警**: 配合 BullMQ Dashboard 或自定义监控，及时发现和处理失败任务

### 最佳实践

- ✅ 使用指数退避策略处理临时性故障
- ✅ 保留一定数量的失败任务用于调试
- ✅ 为不同类型的任务设置不同的并发数
- ✅ 使用定时任务（Cron）触发周期性任务
- ✅ 实现幂等性，确保任务可以安全重试
- ✅ 添加详细的日志记录，便于问题排查

