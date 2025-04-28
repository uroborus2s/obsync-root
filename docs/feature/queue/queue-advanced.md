# @stratix/queue 高级特性

本文档详细介绍 @stratix/queue 插件的高级特性和使用场景。

## 目录

- [任务流与依赖关系](#任务流与依赖关系)
- [重复任务与调度](#重复任务与调度)
- [与调度插件集成](#与调度插件集成)
- [沙箱处理器](#沙箱处理器)
- [限流控制](#限流控制)
- [自定义队列驱动](#自定义队列驱动)
- [性能优化](#性能优化)
- [高可用性与容错](#高可用性与容错)
- [监控与指标](#监控与指标)
- [队列模式与最佳实践](#队列模式与最佳实践)

## 任务流与依赖关系

@stratix/queue 支持创建具有依赖关系的任务流，允许定义任务之间的前后依赖关系。

### 基本任务依赖

```typescript
// 创建父任务
const parentJob = await queue.add('parent-task', { step: 'first' });

// 创建依赖于父任务的子任务
const childJob = await queue.add('child-task', { step: 'second' }, {
  dependencies: [parentJob.id]
});
```

在这个例子中，`child-task` 只有在 `parent-task` 成功完成后才会开始处理。

### 创建复杂工作流

```typescript
// 初始任务
const initJob = await queue.add('init-process', { processId: 'abc123' });

// 并行任务（都依赖初始任务）
const task1 = await queue.add('process-data', { part: 1 }, {
  dependencies: [initJob.id]
});

const task2 = await queue.add('process-data', { part: 2 }, {
  dependencies: [initJob.id]
});

const task3 = await queue.add('process-data', { part: 3 }, {
  dependencies: [initJob.id]
});

// 最终任务（依赖所有并行任务）
const finalizeJob = await queue.add('finalize-process', { processId: 'abc123' }, {
  dependencies: [task1.id, task2.id, task3.id]
});
```

这种模式适用于需要多步骤处理的复杂工作流，如数据ETL流程、媒体处理流水线等。

### 动态依赖管理

任务依赖关系也可以在任务创建后动态管理：

```typescript
// 添加依赖
await job.addDependency('another-job-id');

// 移除依赖
await job.removeDependency('another-job-id');

// 获取依赖任务
const dependencies = await job.getDependencies();

// 获取依赖这个任务的子任务
const dependents = await job.getDependents();
```

### 处理依赖任务失败

默认情况下，如果依赖任务失败，依赖它的任务不会被处理。可以配置如何处理依赖失败：

```typescript
// 即使依赖任务失败，也处理这个任务
const job = await queue.add('resilient-task', data, {
  dependenciesMode: 'optional' // 依赖是可选的
});

// 标准模式（默认）：依赖任务必须成功
const job2 = await queue.add('strict-task', data, {
  dependenciesMode: 'required' // 依赖是必需的
});
```

## 重复任务与调度

@stratix/queue 支持创建按计划重复执行的任务，使用 cron 表达式或固定间隔。

### 使用 Cron 表达式

```typescript
// 每天凌晨3:30执行
await queue.addRepeatableJob('nightly-backup', { type: 'full' }, {
  cron: '30 3 * * *'
});

// 每周一早上9点执行
await queue.addRepeatableJob('weekly-report', { format: 'pdf' }, {
  cron: '0 9 * * 1'
});

// 每月1号执行，使用上海时区
await queue.addRepeatableJob('monthly-invoice', { generate: true }, {
  cron: '0 0 1 * *',
  timezone: 'Asia/Shanghai'
});
```

### 使用固定间隔

```typescript
// 每10分钟执行一次
await queue.addRepeatableJob('health-check', { endpoints: [...] }, {
  every: 10 * 60 * 1000 // 毫秒
});

// 每小时执行，只执行10次
await queue.addRepeatableJob('hourly-task', data, {
  every: 60 * 60 * 1000, // 每小时
  limit: 10              // 只执行10次
});
```

### 高级调度选项

```typescript
// 在特定时间范围内执行
await queue.addRepeatableJob('business-hours-task', data, {
  cron: '0 * 9-17 * * 1-5', // 工作日9点到17点，每小时执行
  startDate: new Date('2023-01-01'), // 开始日期
  endDate: new Date('2023-12-31')    // 结束日期
});

// 立即执行一次，然后按计划重复
await queue.addRepeatableJob('immediate-then-scheduled', data, {
  cron: '0 0 * * *', // 每天0点
  immediately: true  // 立即执行一次
});
```

### 管理重复任务

```typescript
// 获取所有重复任务
const repeatableJobs = await queue.getRepeatableJobs();

// 删除重复任务
await queue.removeRepeatableJob({
  name: 'nightly-backup',
  cron: '30 3 * * *'
});

// 更新重复任务（先删除再添加）
await queue.removeRepeatableJob(oldRepeatOptions);
await queue.addRepeatableJob(jobName, data, newRepeatOptions);
```

## 与调度插件集成

虽然 @stratix/queue 内置了重复任务功能，但对于更复杂的调度需求，可以与 @stratix/schedule 插件集成，实现更灵活的任务调度。

### 基本集成

```typescript
import { createApp } from 'stratix';
import { queuePlugin } from '@stratix/queue';
import { schedulePlugin } from '@stratix/schedule';

const app = createApp();

// 注册队列插件
app.register(queuePlugin, {
  driver: 'bullmq',
  redis: {
    host: 'localhost',
    port: 6379
  }
});

// 注册调度插件
app.register(schedulePlugin);

// 启动应用
await app.start();
```

### 使用调度插件创建任务

```typescript
// 获取队列实例
const emailQueue = app.queue.getQueue('emails');

// 使用调度插件创建定时任务
app.schedule.cron('30 3 * * *', async () => {
  // 在每天凌晨3:30向队列添加备份任务
  await emailQueue.add('nightly-backup', { type: 'full' });
});

// 每周一创建报表任务
app.schedule.cron('0 9 * * 1', async () => {
  await emailQueue.add('weekly-report', { recipients: ['manager@example.com'] });
});

// 使用特定时区
app.schedule.cron('0 0 1 * *', async () => {
  await emailQueue.add('monthly-invoice', { generate: true });
}, { timezone: 'Asia/Shanghai' });
```

### 间隔任务与队列结合

```typescript
// 每10分钟执行一次健康检查
app.schedule.interval('10 minutes', async () => {
  await app.queue.getQueue('maintenance').add('health-check', {
    endpoints: ['api/health', 'api/status']
  });
});

// 限制执行次数
app.schedule.interval('1 hour', async () => {
  await app.queue.getQueue('reports').add('hourly-stats', { type: 'summary' });
}, { limit: 24 }); // 只执行24次
```

### 动态调度管理

```typescript
// 动态创建调度
const scheduleId = await app.schedule.register({
  cron: '*/5 * * * *',
  handler: async () => {
    await app.queue.getQueue('tasks').add('data-sync', { source: 'external-api' });
  },
  name: 'data-sync-schedule'
});

// 暂停调度
await app.schedule.pause(scheduleId);

// 恢复调度
await app.schedule.resume(scheduleId);

// 删除调度
await app.schedule.unregister(scheduleId);
```

### 调度与队列的选择

@stratix/queue 的重复任务与 @stratix/schedule 各有优缺点：

| 功能 | @stratix/queue 重复任务 | @stratix/schedule |
|------|--------------------------|-------------------|
| 任务持久化 | ✅ (使用Redis) | ❌ |
| 失败重试 | ✅ | ❌ |
| 任务进度 | ✅ | ❌ |
| 简单定时执行 | ⚠️ (较复杂) | ✅ (简单直接) |
| 精确的cron表达式 | ✅ | ✅ |
| 分布式支持 | ✅ | ⚠️ (需要额外配置) |
| 任务依赖关系 | ✅ | ❌ |

### 最佳实践

1. **合理分工**：使用 @stratix/schedule 负责调度触发，@stratix/queue 负责任务执行和可靠性保障

2. **避免重复执行**：在分布式环境中确保调度任务只在一个实例上执行

3. **选择标准**：
   - 对于需要高可靠性、需要重试机制、有依赖关系的任务，使用 @stratix/queue 的重复任务
   - 对于简单的定时触发、临时调度或者动态调度需求，使用 @stratix/schedule

4. **分布式环境**：在分布式环境中，使用 @stratix/schedule 触发 @stratix/queue 任务时，确保调度器有适当的分布式锁机制，避免任务重复执行

```typescript
// 在分布式环境中安全地调度任务
app.schedule.cron('0 0 * * *', async () => {
  // 使用分布式锁确保只有一个实例执行此调度
  const lock = await app.distributedLock.acquire('daily-task-lock', 30000);
  
  if (lock) {
    try {
      await app.queue.getQueue('daily-tasks').add('generate-reports');
    } finally {
      await app.distributedLock.release('daily-task-lock');
    }
  }
});
```

## 沙箱处理器

沙箱处理器将任务处理函数运行在独立的进程中，提供更好的隔离性和容错性。

### 启用沙箱处理器

```typescript
// 全局启用沙箱处理器
app.register(queuePlugin, {
  processor: {
    sandboxed: true
  }
});

// 为特定队列启用沙箱处理器
const imageQueue = app.queue.createQueue('image-processing', {
  processor: {
    sandboxed: true,
    maxSandboxes: 4 // 最多4个沙箱进程
  }
});
```

### 使用外部脚本文件

```typescript
// 注册外部处理器文件
queue.process('task-type', path.join(__dirname, 'processors/my-processor.js'));

// processors/my-processor.js 内容:
module.exports = async (job) => {
  // 此代码在独立进程中运行
  const { data } = job;
  // 处理任务...
  return result;
};
```

### 沙箱配置选项

```typescript
const queue = app.queue.createQueue('cpu-intensive', {
  processor: {
    sandboxed: true,
    timeout: 60000,       // 沙箱进程超时时间（毫秒）
    maxMemoryUsage: 512,  // 最大内存使用量（MB）
    killBehavior: 'force' // 如何终止超时的沙箱进程
  }
});
```

### 沙箱处理器的优缺点

**优点：**
- 更好的进程隔离，一个任务崩溃不会影响其他任务
- 适合CPU密集型任务，避免阻塞事件循环
- 可以限制内存使用和执行时间

**缺点：**
- 启动新进程有一定开销
- 进程间通信限制了可传递的数据类型
- 配置和调试相对复杂

## 限流控制

限流控制可以限制队列处理任务的速率，避免系统过载或第三方服务限制。

### 队列级别限流

```typescript
// 创建限流队列
const apiQueue = app.queue.createQueue('api-calls', {
  limiter: {
    max: 100,    // 时间窗口内最多处理100个任务
    duration: 60000, // 时间窗口为60秒（即最多每分钟100个请求）
    bounceBack: true // 超出限制的任务会被推迟到下一个窗口
  }
});
```

### 任务级别限流

```typescript
// 不同任务类型使用不同的限流设置
await queue.add('high-frequency-task', data, {
  limiter: {
    max: 50,
    duration: 1000 // 每秒最多50个
  }
});

await queue.add('low-frequency-task', data, {
  limiter: {
    max: 10,
    duration: 60000 // 每分钟最多10个
  }
});
```

### 分布式限流

限流在所有处理同一队列的Worker之间共享，实现分布式限流：

```typescript
// 服务器A
const queue1 = app1.queue.createQueue('shared-queue', {
  limiter: {
    max: 200,
    duration: 60000 // 所有服务器总共每分钟最多200个请求
  }
});

// 服务器B
const queue2 = app2.queue.createQueue('shared-queue', {
  limiter: {
    max: 200,
    duration: 60000 // 与服务器A共享限流配置
  }
});
```

### 令牌桶限流

```typescript
// 使用令牌桶算法的限流器
const tokenBucketLimiter = {
  max: 100,         // 桶容量
  duration: 60000,  // 补充周期（毫秒）
  refillRate: 10,   // 每秒补充10个令牌
  initialTokens: 50 // 初始令牌数
};

const queue = app.queue.createQueue('throttled-queue', {
  limiter: tokenBucketLimiter
});
```

## 自定义队列驱动

@stratix/queue 允许实现和注册自定义队列驱动，适配不同的队列后端。

### 实现自定义驱动

```typescript
// 自定义队列驱动实现
class MyCustomQueueDriver implements QueueDriver {
  private options: any;
  
  constructor(options: any) {
    this.options = options;
  }
  
  async init(): Promise<void> {
    // 初始化驱动
  }
  
  createQueue(name: string, options?: any): QueueInstance {
    // 创建队列实例
    return new MyCustomQueueInstance(name, options);
  }
  
  async close(): Promise<void> {
    // 关闭连接
  }
  
  getName(): string {
    return 'custom';
  }
  
  async checkHealth(): Promise<boolean> {
    // 检查健康状态
    return true;
  }
}

// 自定义队列实例实现
class MyCustomQueueInstance implements QueueInstance {
  // 实现队列实例接口...
}
```

### 注册自定义驱动

```typescript
import { queuePlugin, registerQueueDriver } from '@stratix/queue';

// 注册自定义驱动
registerQueueDriver('custom', (options) => new MyCustomQueueDriver(options));

// 使用自定义驱动
app.register(queuePlugin, {
  driver: 'custom',
  custom: {
    // 自定义驱动选项
  }
});
```

### 使用第三方队列系统

```typescript
// 适配AWS SQS的驱动实现示例
class SQSQueueDriver implements QueueDriver {
  private sqs: any; // AWS SQS客户端
  
  constructor(options: any) {
    // 初始化AWS SQS客户端
    this.sqs = new AWS.SQS(options.aws);
  }
  
  // 实现其他接口方法...
}

// 注册SQS驱动
registerQueueDriver('sqs', (options) => new SQSQueueDriver(options));

// 使用SQS驱动
app.register(queuePlugin, {
  driver: 'sqs',
  sqs: {
    aws: {
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'YOUR_ACCESS_KEY',
        secretAccessKey: 'YOUR_SECRET_KEY'
      }
    }
  }
});
```

## 性能优化

高性能队列处理的策略和最佳实践。

### 批量操作

```typescript
// 批量添加任务（比单个添加更高效）
const jobs = await queue.addBulk([
  { name: 'task1', data: { id: 1 } },
  { name: 'task1', data: { id: 2 } },
  { name: 'task1', data: { id: 3 } },
  // 可以添加上百或上千任务
]);

// 批量处理结果
const processResults = await Promise.all(jobs.map(job => job.waitUntilFinished()));
```

### 优化数据大小

```typescript
// 避免存储大数据
const badPractice = await queue.add('process-image', {
  imageData: largeBase64String, // 坏习惯：直接存储大数据
  metadata: { ... }
});

// 推荐做法：只存储引用
const goodPractice = await queue.add('process-image', {
  imageUrl: 's3://bucket/image.jpg', // 好习惯：存储引用
  metadata: { ... }
});
```

### 并发调优

```typescript
// 对IO密集型任务使用高并发
const ioQueue = app.queue.createQueue('io-tasks', {
  concurrency: 50 // IO密集型任务可以用较高的并发
});

// 对CPU密集型任务使用低并发
const cpuQueue = app.queue.createQueue('cpu-tasks', {
  concurrency: 4, // CPU密集型任务应限制并发
  processor: {
    sandboxed: true // 使用沙箱避免阻塞
  }
});
```

### Redis连接池优化

```typescript
// 优化Redis连接池
app.register(queuePlugin, {
  redis: {
    host: 'localhost',
    port: 6379,
    connectTimeout: 10000,   // 连接超时（毫秒）
    maxRetriesPerRequest: 3, // 每个请求的最大重试次数
    enableReadyCheck: true,  // 启用就绪检查
    autoResendUnfulfilledCommands: true,
    // 连接池设置
    connectionNamespace: 'queue', // 连接命名空间
    enableOfflineQueue: true,    // 启用离线队列
    connectRetryStrategy: (times) => {
      return Math.min(times * 200, 5000); // 重试间隔
    }
  }
});
```

### 任务清理策略

```typescript
// 设置合理的清理策略，避免Redis内存过大
app.register(queuePlugin, {
  defaultJobOptions: {
    // 策略1：保留最近的N个任务
    removeOnComplete: 1000, // 保留最近1000个完成的任务
    removeOnFail: 500,      // 保留最近500个失败的任务
    
    // 策略2：保留特定时间
    // removeOnComplete: 24 * 3600 * 1000, // 保留24小时内完成的任务
    // removeOnFail: 7 * 24 * 3600 * 1000  // 保留7天内失败的任务
  }
});
```

## 高可用性与容错

构建高可用、容错的队列系统的策略。

### Redis高可用配置

```typescript
// 使用Redis Sentinel
app.register(queuePlugin, {
  driver: 'bullmq',
  redis: {
    sentinels: [
      { host: 'sentinel-1', port: 26379 },
      { host: 'sentinel-2', port: 26379 },
      { host: 'sentinel-3', port: 26379 }
    ],
    name: 'mymaster', // Redis Sentinel主节点名称
    sentinelPassword: 'sentinel-password',
    password: 'redis-password'
  }
});

// 使用Redis集群
app.register(queuePlugin, {
  driver: 'bullmq',
  redis: {
    cluster: [
      { host: 'redis-node1', port: 6379 },
      { host: 'redis-node2', port: 6379 },
      { host: 'redis-node3', port: 6379 }
    ],
    options: {
      redisOptions: {
        password: 'cluster-password'
      }
    }
  }
});
```

### 任务重试策略

```typescript
// 配置重试策略
await queue.add('critical-operation', data, {
  attempts: 10, // 最多重试10次
  backoff: {
    type: 'exponential', // 指数退避
    delay: 1000 // 初始延迟1秒
  }
});

// 自定义重试策略
await queue.add('api-call', data, {
  attempts: 5,
  backoff: {
    custom: (attemptsMade) => {
      // 自定义延迟计算逻辑
      const delays = [1000, 5000, 15000, 30000, 60000];
      return delays[attemptsMade - 1] || 60000;
    }
  }
});
```

### 处理故障转移

```typescript
// 监听stalled事件处理故障转移
queue.on('stalled', (job) => {
  console.warn(`任务 ${job.id} 已被标记为stalled，将会自动重试`);
  // 记录故障转移事件
  logFailover(job);
});

// 优化stalled任务检测
app.register(queuePlugin, {
  bullmq: {
    stalledCheckInterval: 30000, // 检查间隔（毫秒）
    maxStalledCount: 2 // 最多被标记stalled的次数
  }
});
```

### 优雅关闭

```typescript
// 实现优雅关闭
app.hook('beforeClose', async () => {
  console.log('应用正在关闭，等待任务完成...');
  
  // 停止接受新任务
  await app.queue.getQueue('emails').pause();
  
  // 等待活跃任务完成
  const maxWaitTime = 30000; // 最多等待30秒
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const counts = await app.queue.getQueue('emails').getJobCounts();
    if (counts.active === 0) {
      break; // 没有活跃任务了
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 关闭所有队列连接
  await app.queue.closeAll();
  console.log('所有队列已安全关闭');
});
```

## 监控与指标

队列系统的监控和指标收集。

### 基本指标收集

```typescript
// 定期收集队列指标
async function collectQueueMetrics() {
  const queues = app.queue.getAllQueues();
  
  for (const queue of queues) {
    try {
      // 获取队列状态
      const status = await queue.getStatus();
      // 获取任务计数
      const counts = await queue.getJobCounts();
      // 获取性能指标
      const metrics = await queue.getMetrics();
      
      // 发送到监控系统
      sendToMonitoring({
        queueName: queue.name,
        status,
        counts,
        metrics,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`收集队列 ${queue.name} 指标失败:`, error);
    }
  }
}

// 每分钟收集一次
setInterval(collectQueueMetrics, 60000);
```

### 集成Prometheus

```typescript
// 创建Prometheus指标
const queueSizeGauge = new prometheus.Gauge({
  name: 'queue_size',
  help: '队列中的任务数量',
  labelNames: ['queue', 'status']
});

const processingTimeHistogram = new prometheus.Histogram({
  name: 'job_processing_time',
  help: '任务处理时间（毫秒）',
  labelNames: ['queue', 'job_name'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000]
});

// 更新指标
async function updatePrometheusMetrics() {
  const queues = app.queue.getAllQueues();
  
  for (const queue of queues) {
    const counts = await queue.getJobCounts();
    
    // 更新队列大小指标
    for (const [status, count] of Object.entries(counts)) {
      queueSizeGauge.set({ queue: queue.name, status }, count);
    }
  }
}

// 监听任务完成事件，记录处理时间
queue.on('completed', (job, result) => {
  const processingTime = Date.now() - new Date(job.processedOn).getTime();
  processingTimeHistogram.observe({ queue: queue.name, job_name: job.name }, processingTime);
});
```

### 自定义事件和指标

```typescript
// 添加自定义事件
class EnhancedQueue {
  constructor(queue) {
    this.queue = queue;
    this.eventEmitter = new EventEmitter();
  }
  
  // 添加自定义事件
  emitCustomEvent(event, data) {
    this.eventEmitter.emit(event, data);
  }
  
  // 监听自定义事件
  onCustomEvent(event, handler) {
    this.eventEmitter.on(event, handler);
  }
  
  // 包装原始方法，添加指标收集
  async add(name, data, opts) {
    const startTime = Date.now();
    const result = await this.queue.add(name, data, opts);
    const duration = Date.now() - startTime;
    
    // 记录添加任务的延迟
    this.emitCustomEvent('metrics:addLatency', { 
      queue: this.queue.name,
      name,
      duration
    });
    
    return result;
  }
}

// 使用增强的队列
const enhancedQueue = new EnhancedQueue(app.queue.getQueue('emails'));

// 监听自定义指标
enhancedQueue.onCustomEvent('metrics:addLatency', ({ queue, name, duration }) => {
  console.log(`Queue: ${queue}, Job: ${name}, Add Latency: ${duration}ms`);
  // 将指标发送到监控系统
});
```

## 队列模式与最佳实践

常见的队列使用模式和最佳实践。

### 生产者-消费者分离模式

```typescript
// 生产者服务
const producerApp = createApp();
producerApp.register(queuePlugin, {
  redis: { host: 'shared-redis.example.com' }
});

// 只添加任务，不处理
const producerQueue = producerApp.queue.getQueue('tasks');
await producerQueue.add('task-type', data);

// 消费者服务
const consumerApp = createApp();
consumerApp.register(queuePlugin, {
  redis: { host: 'shared-redis.example.com' }
});

// 只处理任务，不添加
const consumerQueue = consumerApp.queue.getQueue('tasks');
consumerQueue.process(async (job) => {
  // 处理任务
});
```

### 优先级队列模式

```typescript
// 创建多个优先级队列
const highPriorityQueue = app.queue.createQueue('high-priority-tasks');
const normalPriorityQueue = app.queue.createQueue('normal-priority-tasks');
const lowPriorityQueue = app.queue.createQueue('low-priority-tasks');

// 添加任务到适当的队列
await highPriorityQueue.add('urgent-task', data);
await normalPriorityQueue.add('regular-task', data);
await lowPriorityQueue.add('background-task', data);

// 处理优先级顺序：先高优先级，再普通，最后低优先级
highPriorityQueue.process(async (job) => { /* 处理高优先级任务 */ });

// 等高优先级队列空闲时处理普通优先级任务
highPriorityQueue.on('drained', () => {
  normalPriorityQueue.process(async (job) => { /* 处理普通优先级任务 */ });
});

// 等普通优先级队列空闲时处理低优先级任务
normalPriorityQueue.on('drained', () => {
  lowPriorityQueue.process(async (job) => { /* 处理低优先级任务 */ });
});
```

### 工作池模式

```typescript
// 创建主队列
const mainQueue = app.queue.createQueue('main-tasks');

// 创建工作池队列
const workerPools = {
  'image-processing': app.queue.createQueue('image-worker-pool', { concurrency: 2 }),
  'video-processing': app.queue.createQueue('video-worker-pool', { concurrency: 1 }),
  'text-processing': app.queue.createQueue('text-worker-pool', { concurrency: 5 })
};

// 主队列分发任务到对应的工作池
mainQueue.process(async (job) => {
  const { type, data } = job.data;
  
  if (workerPools[type]) {
    // 分发到专门的工作池
    const poolJob = await workerPools[type].add(type, data);
    
    // 等待工作池处理完成
    return await poolJob.waitUntilFinished();
  } else {
    throw new Error(`未知的任务类型: ${type}`);
  }
});

// 配置各工作池的处理器
workerPools['image-processing'].process(async (job) => {
  // 处理图片任务
});

workerPools['video-processing'].process(async (job) => {
  // 处理视频任务
});

workerPools['text-processing'].process(async (job) => {
  // 处理文本任务
});
```

### 事件驱动模式

```typescript
// 事件驱动架构
// 队列作为事件总线

// 发布事件
const publishEvent = async (eventName, eventData) => {
  await app.queue.getQueue('events').add(eventName, {
    timestamp: Date.now(),
    data: eventData
  });
};

// 订阅事件
const subscribeToEvent = (eventName, handler) => {
  app.queue.getQueue('events').process(eventName, async (job) => {
    await handler(job.data);
  });
};

// 用法示例
// 发布用户注册事件
await publishEvent('user.registered', { 
  userId: 123, 
  email: 'user@example.com' 
});

// 订阅用户注册事件
subscribeToEvent('user.registered', async (eventData) => {
  const { data } = eventData;
  await sendWelcomeEmail(data.email);
  await createUserProfile(data.userId);
});
```

### 死信队列模式

```typescript
// 主队列
const mainQueue = app.queue.createQueue('main-tasks');

// 死信队列（存储无法处理的任务）
const deadLetterQueue = app.queue.createQueue('dead-letter');

// 主队列处理逻辑
mainQueue.process(async (job) => {
  try {
    // 尝试处理任务
    const result = await processTask(job.data);
    return result;
  } catch (error) {
    // 如果是永久性错误（非临时故障）
    if (isPermanentError(error)) {
      // 移动到死信队列
      await deadLetterQueue.add('failed-task', {
        originalJob: {
          id: job.id,
          name: job.name,
          data: job.data
        },
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        },
        timestamp: Date.now()
      });
      
      // 通知任务已移至死信队列
      throw new Error(`任务移至死信队列: ${error.message}`);
    } else {
      // 临时故障，允许重试
      throw error;
    }
  }
});

// 定期处理死信队列
deadLetterQueue.process(async (job) => {
  const { originalJob, error } = job.data;
  
  // 记录死信任务
  console.error(`处理死信任务: ${originalJob.id}`, {
    name: originalJob.name,
    error: error.message,
    timestamp: new Date().toISOString()
  });
  
  // 可以实现人工干预或修复逻辑
  await notifyAdministrator(originalJob, error);
});
``` 