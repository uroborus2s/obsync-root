# @stratix/queue 常见问题解答

本文档收集了使用 @stratix/queue 插件时的常见问题及其解答。

## 基础问题

### Q: @stratix/queue 插件与 BullMQ 有什么区别？

A: @stratix/queue 是 Stratix 框架的任务队列插件，它基于 BullMQ 实现，但提供了以下额外优势：

1. 完全集成到 Stratix 框架生态系统中
2. 提供统一的抽象层，允许切换到其他队列实现
3. 符合 Stratix 的纯配置和函数式编程理念
4. 支持与其他 Stratix 插件无缝集成，如 @stratix/cache
5. 提供更丰富的类型定义和更好的 TypeScript 支持

### Q: 我需要单独安装 BullMQ 吗？

A: 是的。由于 BullMQ 是可选依赖，您需要单独安装它：

```bash
npm install bullmq
```

如果您使用的是内存队列驱动或自定义队列驱动，则不需要安装 BullMQ。

### Q: 可以同时使用多种队列驱动吗？

A: 可以。@stratix/queue 插件支持创建使用不同驱动的多个队列实例：

```typescript
// 创建使用默认驱动的队列
const defaultQueue = app.queue.createQueue('default-queue');

// 创建使用内存驱动的队列
const memoryQueue = app.queue.createQueue('memory-queue', {
  driver: 'memory'
});

// 创建使用BullMQ驱动的队列
const bullQueue = app.queue.createQueue('bull-queue', {
  driver: 'bullmq',
  redis: {
    host: 'localhost',
    port: 6379
  }
});
```

### Q: 队列数据存储在哪里？

A: 这取决于使用的队列驱动：

- **BullMQ 驱动**：数据存储在 Redis 中，包括任务数据、状态和元数据。
- **内存驱动**：数据存储在应用内存中，应用重启后数据会丢失，除非配置了持久化选项。
- **自定义驱动**：数据存储取决于驱动的实现。

## 配置问题

### Q: 如何配置队列前缀？

A: 可以在插件配置或创建队列时指定前缀：

```typescript
// 插件全局配置
app.register(queuePlugin, {
  prefix: 'myapp:'
});

// 特定队列配置
const queue = app.queue.createQueue('emails', {
  prefix: 'emails:'
});
```

### Q: 如何使用现有的 Redis 连接？

A: 如果您已经在应用中配置了 Redis 连接（例如，通过 @stratix/cache 插件），可以复用该连接：

```typescript
app.register(queuePlugin, {
  useExistingRedis: true
});
```

### Q: 如何配置任务的默认过期时间？

A: 可以通过 `defaultJobOptions` 设置默认任务选项：

```typescript
app.register(queuePlugin, {
  defaultJobOptions: {
    timeout: 60000 // 默认超时时间为60秒
  }
});
```

### Q: 如何设置队列处理器的并发数？

A: 可以在全局配置或特定队列上设置并发数：

```typescript
// 全局并发数配置
app.register(queuePlugin, {
  processor: {
    concurrency: 5
  }
});

// 特定队列并发数配置
const queue = app.queue.createQueue('heavy-tasks', {
  concurrency: 2
});
```

## 任务管理问题

### Q: 如何保证任务的唯一性？

A: 可以使用任务ID来确保任务的唯一性：

```typescript
// 使用自定义ID添加任务
await queue.add('process-order', { orderId: '12345' }, {
  jobId: 'order:12345' // 确保相同订单ID只会创建一个任务
});

// 检查任务是否存在
const existingJob = await queue.getJob('order:12345');
if (!existingJob) {
  // 任务不存在，可以添加新任务
}
```

### Q: 如何处理任务的优先级？

A: BullMQ 支持任务优先级，数字越小优先级越高：

```typescript
// 添加高优先级任务
await queue.add('high-priority-task', data, { priority: 1 });

// 添加普通优先级任务
await queue.add('normal-task', data, { priority: 10 });

// 添加低优先级任务
await queue.add('low-priority-task', data, { priority: 100 });
```

### Q: 任务处理失败后会发生什么？

A: 默认情况下，失败的任务不会重试。您可以配置任务的重试策略：

```typescript
await queue.add('risky-task', data, {
  attempts: 5, // 最多尝试5次
  backoff: {
    type: 'exponential', // 指数退避策略
    delay: 1000 // 初始延迟1秒
  }
});
```

### Q: 如何中止正在处理的任务？

A: BullMQ 暂时不支持直接中止正在处理的任务。但您可以：

1. 在处理函数中定期检查中止标志
2. 设置任务超时
3. 实现自定义中止机制

```typescript
// 设置任务超时
await queue.add('long-task', data, {
  timeout: 30000 // 30秒后超时
});

// 在处理函数中检查中止标志
queue.process(async (job) => {
  for (let i = 0; i < 100; i++) {
    // 每个步骤检查是否已请求中止
    const jobInstance = await queue.getJob(job.id);
    if (jobInstance.data.abort === true) {
      throw new Error('任务已被用户中止');
    }
    
    await doWorkStep(i);
    await job.updateProgress(i);
  }
});
```

## 事件和监控问题

### Q: 如何监听所有队列的事件？

A: 可以使用 QueueEvents 来监听队列事件：

```typescript
// 创建队列事件监听器
const queueEvents = app.queue.createQueueEvents('emails');

// 监听所有任务完成事件
queueEvents.on('completed', ({ jobId }) => {
  console.log(`任务 ${jobId} 已完成`);
});

// 不再需要时关闭事件监听器
await queueEvents.close();
```

### Q: 如何监控队列的性能和健康状况？

A: @stratix/queue 提供了获取队列状态和指标的API：

```typescript
// 获取队列状态
const status = await queue.getStatus();
console.log('队列状态:', status);

// 获取队列指标
const metrics = await queue.getMetrics();
console.log('队列指标:', metrics);

// 获取任务计数
const counts = await queue.getJobCounts();
console.log('任务计数:', counts);
```

您也可以设置定期监控：

```typescript
// 设置定期监控
setInterval(async () => {
  try {
    const metrics = await queue.getMetrics();
    
    // 发送指标到监控系统
    monitoringService.reportMetrics('emails-queue', metrics);
    
    // 检查异常状况
    if (metrics.waiting > 1000) {
      alertService.sendAlert('队列任务堆积过多');
    }
  } catch (error) {
    console.error('监控队列出错:', error);
  }
}, 60000); // 每分钟监控一次
```

## 高级问题

### Q: 如何实现分布式锁？

A: 可以利用 Redis 和队列系统实现分布式锁：

```typescript
// 使用任务ID作为锁
async function withLock(lockName, ttl, callback) {
  const lockId = `lock:${lockName}`;
  
  // 尝试获取锁
  const acquired = await app.queue.acquireLock(lockId, ttl);
  if (!acquired) {
    throw new Error('无法获取锁');
  }
  
  try {
    // 执行受保护的操作
    return await callback();
  } finally {
    // 释放锁
    await app.queue.releaseLock(lockId);
  }
}

// 使用分布式锁
await withLock('process-daily-report', 30000, async () => {
  // 这部分代码在任何时候只会有一个实例执行
  await generateDailyReport();
});
```

### Q: 如何处理大型数据集的任务？

A: 处理大型数据集时，建议：

1. 避免将大数据直接存储在任务中，而是存储引用或ID
2. 将大型任务拆分为多个小任务
3. 使用流式处理或分页处理

```typescript
// 避免这样做
await queue.add('process-large-data', { 
  hugeDataset: [...veryLargeArray] // 不要直接存储大数据
});

// 推荐这样做
await queue.add('process-large-data', { 
  datasetId: 'dataset-123', // 只存储引用
  chunkSize: 1000,
  totalChunks: 50
});

// 处理函数
queue.process('process-large-data', async (job) => {
  const { datasetId, chunkSize, totalChunks } = job.data;
  
  // 处理每个数据块
  for (let i = 0; i < totalChunks; i++) {
    const dataChunk = await datasetService.getChunk(datasetId, i, chunkSize);
    await processChunk(dataChunk);
    await job.updateProgress(Math.floor((i / totalChunks) * 100));
  }
  
  return { processed: true, totalRecords: chunkSize * totalChunks };
});
```

### Q: 如何实现任务的动态优先级？

A: 可以使用任务提升功能来动态调整任务的优先级：

```typescript
// 管理任务优先级的服务
class TaskPriorityManager {
  constructor(queue) {
    this.queue = queue;
  }
  
  // 提升任务优先级
  async promoteTasks(criteria) {
    // 获取匹配条件的任务
    const jobs = await this.queue.getJobs(['waiting', 'delayed']);
    
    // 筛选满足条件的任务
    const matchingJobs = jobs.filter(job => {
      // 根据条件筛选任务
      return criteria(job);
    });
    
    // 提升任务优先级
    for (const job of matchingJobs) {
      await job.promote();
    }
    
    return matchingJobs.length;
  }
}

// 使用示例
const priorityManager = new TaskPriorityManager(emailsQueue);

// 提升VIP用户的任务优先级
await priorityManager.promoteTasks(job => job.data.userType === 'vip');

// 提升紧急任务优先级
await priorityManager.promoteTasks(job => job.data.priority === 'urgent');
```

### Q: 如何在不同服务器之间共享队列？

A: 只要使用相同的 Redis 实例，不同服务器上的队列实例就能共享队列数据：

**服务器 A：**
```typescript
// 生产者服务器
const app = createApp();
app.register(queuePlugin, {
  driver: 'bullmq',
  redis: {
    host: 'shared-redis.example.com',
    port: 6379
  }
});

// 添加任务
await app.queue.getQueue('shared-tasks').add('task-type', { data: 'value' });
```

**服务器 B：**
```typescript
// 消费者服务器
const app = createApp();
app.register(queuePlugin, {
  driver: 'bullmq',
  redis: {
    host: 'shared-redis.example.com',
    port: 6379
  }
});

// 处理任务
app.queue.getQueue('shared-tasks').process(async (job) => {
  // 处理来自服务器A的任务
  return processTask(job.data);
});
```

## 故障排除问题

### Q: Redis 连接失败怎么办？

A: 检查以下几点：

1. Redis 服务器是否正在运行
2. 连接配置是否正确（主机、端口、密码等）
3. 网络是否允许连接
4. Redis 版本是否兼容（建议使用 Redis 5.x 或以上版本）

可以实现连接失败重试机制：

```typescript
app.register(queuePlugin, {
  driver: 'bullmq',
  redis: {
    host: 'redis-server',
    port: 6379,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      // 重试间隔（毫秒）
      return Math.min(times * 1000, 10000);
    }
  }
});
```

### Q: 任务一直处于 "stalled" 状态怎么办？

A: "stalled" 状态表示任务开始处理后没有正常完成或失败。可能的原因有：

1. 处理函数崩溃或被强制终止
2. 处理时间超过 BullMQ 的 stalled 检测间隔
3. Redis 连接问题

解决方案：

```typescript
app.register(queuePlugin, {
  bullmq: {
    stalledCheckInterval: 30000, // 检查 stalled 任务的间隔（毫秒）
    maxStalledCount: 3 // 任务被标记为 stalled 的最大次数
  }
});

// 监听 stalled 事件
queue.on('stalled', (job) => {
  console.warn(`任务 ${job.id} 被标记为 stalled`);
  // 记录日志或发送警报
});
```

### Q: 处理大量任务时 Redis 内存占用过高怎么办？

A: Redis 内存占用过高可能是因为：

1. 保留了太多已完成/失败的任务
2. 任务数据过大
3. 任务数量过多

解决方案：

```typescript
// 配置自动清理
app.register(queuePlugin, {
  defaultJobOptions: {
    // 只保留最近100个已完成任务
    removeOnComplete: 100,
    // 只保留最近100个失败任务
    removeOnFail: 100
  }
});

// 定期手动清理
async function cleanupOldJobs() {
  // 清理超过7天的已完成任务
  const completedCount = await queue.removeJobs('completed', {
    olderThan: 7 * 24 * 60 * 60 * 1000 // 7天（毫秒）
  });
  
  // 清理超过30天的失败任务
  const failedCount = await queue.removeJobs('failed', {
    olderThan: 30 * 24 * 60 * 60 * 1000 // 30天（毫秒）
  });
  
  console.log(`已清理 ${completedCount} 个已完成任务和 ${failedCount} 个失败任务`);
}

// 每天运行一次清理
setInterval(cleanupOldJobs, 24 * 60 * 60 * 1000);
```

### Q: 如何调试任务处理问题？

A: 调试任务处理问题的方法：

1. 启用详细日志：

```typescript
app.register(queuePlugin, {
  debug: true
});
```

2. 监听所有队列事件：

```typescript
const events = ['added', 'completed', 'failed', 'stalled', 'progress', 'removed', 'waiting', 'active', 'delayed', 'paused', 'resumed', 'drained'];

events.forEach(event => {
  queue.on(event, (...args) => {
    console.log(`[Queue:${event}]`, JSON.stringify(args));
  });
});
```

3. 检查任务状态和日志：

```typescript
// 获取任务详情
const job = await queue.getJob('job-id-123');
console.log('任务状态:', await job.getState());
console.log('任务数据:', job.data);
console.log('任务选项:', job.opts);
console.log('任务日志:', await job.getLogs());
```

4. 手动处理任务（用于测试）：

```typescript
// 测试任务处理函数
async function testJobProcessor() {
  const job = await queue.getJob('job-id-to-test');
  
  if (!job) {
    console.error('任务不存在');
    return;
  }
  
  try {
    // 手动调用处理函数
    const processor = getProcessorForJobName(job.name);
    const result = await processor(job);
    console.log('处理结果:', result);
  } catch (error) {
    console.error('处理出错:', error);
  }
}

// 运行测试
testJobProcessor().catch(console.error);
``` 