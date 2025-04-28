# @stratix/queue 插件使用指南

本文档提供了 @stratix/queue 插件的详细使用指南，帮助开发者快速上手使用队列功能。

## 目录

- [安装](#安装)
- [基本配置](#基本配置)
- [队列操作](#队列操作)
- [任务管理](#任务管理)
- [事件处理](#事件处理)
- [高级用例](#高级用例)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## 安装

### 前置条件

使用 @stratix/queue 插件之前，需要满足以下条件：

1. Node.js 12.x 或更高版本
2. Redis 5.x 或更高版本（如果使用 BullMQ 驱动）
3. @stratix/core 框架

### 安装步骤

```bash
# 使用 npm
npm install @stratix/queue

# 使用 yarn
yarn add @stratix/queue

# 使用 pnpm
pnpm add @stratix/queue
```

如果需要使用 BullMQ 驱动（默认），还需要安装相关依赖：

```bash
npm install bullmq
```

## 基本配置

### 在 Stratix 应用中注册插件

在你的 Stratix 应用中注册队列插件：

```typescript
import { createApp } from 'stratix';
import { queuePlugin } from '@stratix/queue';

const app = createApp();

// 注册队列插件
app.register(queuePlugin, {
  driver: 'bullmq',
  redis: {
    host: 'localhost',
    port: 6379
  }
});

// 启动应用
await app.start();
```

### 通过配置文件注册

也可以在 Stratix 配置文件中添加队列插件配置：

```javascript
// stratix.config.js
module.exports = {
  name: 'my-app',
  plugins: {
    // 其他插件配置...
    queue: {
      driver: 'bullmq',
      redis: {
        host: 'localhost',
        port: 6379
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      },
      queues: {
        emails: {
          concurrency: 5
        },
        media: {
          concurrency: 2
        }
      }
    }
  }
};
```

### 配置选项详解

以下是队列插件的常用配置选项说明：

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `driver` | `string` | `'bullmq'` | 队列驱动类型，支持 `'bullmq'`、`'memory'` |
| `prefix` | `string` | 应用名称 + `:` | 队列名称前缀 |
| `redis.host` | `string` | `'localhost'` | Redis 主机地址 |
| `redis.port` | `number` | `6379` | Redis 端口 |
| `redis.password` | `string` | - | Redis 密码 |
| `redis.db` | `number` | `0` | Redis 数据库索引 |
| `defaultJobOptions.attempts` | `number` | `1` | 任务失败后的重试次数 |
| `defaultJobOptions.timeout` | `number` | - | 任务超时时间（毫秒） |
| `defaultJobOptions.removeOnComplete` | `boolean\|number` | `false` | 任务完成后是否删除 |
| `defaultJobOptions.removeOnFail` | `boolean\|number` | `false` | 任务失败后是否删除 |
| `processor.concurrency` | `number` | `1` | 全局并发数 |
| `processor.sandboxed` | `boolean` | `false` | 是否使用沙箱处理器 |

## 队列操作

一旦注册了队列插件，你可以通过 `app.queue` 访问队列管理器：

### 创建队列

```typescript
// 创建一个名为 'emails' 的队列
const emailsQueue = app.queue.createQueue('emails', {
  concurrency: 5 // 设置并发数
});

// 获取已存在的队列
const mediaQueue = app.queue.getQueue('media');
```

### 注册处理器

```typescript
// 注册处理器处理任务
emailsQueue.process(async (job) => {
  const { to, subject, body } = job.data;
  
  // 更新任务进度
  await job.updateProgress(50);
  
  // 发送邮件逻辑
  await sendEmail(to, subject, body);
  
  // 返回处理结果
  return { sent: true, messageId: '123456' };
});

// 注册命名处理器
mediaQueue.process({
  'video-upload': async (job) => {
    // 处理视频上传任务
    return { uploadedTo: 's3://bucket/path' };
  },
  'video-transcode': async (job) => {
    // 处理视频转码任务
    return { formats: ['mp4', 'webm'] };
  }
});
```

### 队列状态管理

```typescript
// 暂停队列
await emailsQueue.pause();

// 检查队列是否暂停
const isPaused = await emailsQueue.isPaused();

// 恢复队列
await emailsQueue.resume();

// 清空队列
await emailsQueue.empty();

// 获取队列状态
const status = await emailsQueue.getStatus();
console.log(status);
// 输出: { isPaused: false, jobCounts: { waiting: 5, active: 2, ... } }

// 获取队列指标
const metrics = await emailsQueue.getMetrics();
console.log(metrics);
// 输出: { throughput: 10.5, latency: 120, ... }

// 关闭队列连接
await emailsQueue.close();
```

## 任务管理

### 添加任务

```typescript
// 添加简单任务
const job = await emailsQueue.add('welcome-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: '<h1>Welcome to our platform</h1>'
});

// 添加带选项的任务
const priorityJob = await emailsQueue.add('urgent-email', {
  to: 'boss@example.com',
  subject: 'Urgent matter',
  body: 'We need to talk ASAP'
}, {
  priority: 1, // 高优先级（数字越小优先级越高）
  attempts: 5, // 失败后最多重试5次
  backoff: {
    type: 'exponential',
    delay: 1000 // 初始延迟1秒，然后指数增长
  }
});

// 添加延迟任务
const delayedJob = await emailsQueue.addDelayed('reminder-email', {
  to: 'user@example.com',
  subject: 'Don\'t forget!',
  body: 'Your trial period is ending soon'
}, 24 * 60 * 60 * 1000); // 延迟24小时

// 添加重复任务（每天上午10点执行）
const repeatableJob = await emailsQueue.addRepeatableJob('daily-newsletter', {
  template: 'daily-news',
  recipients: ['user1@example.com', 'user2@example.com']
}, {
  cron: '0 10 * * *', // 每天上午10点
  timezone: 'Asia/Shanghai'
});

// 批量添加任务
const jobs = await emailsQueue.addBulk([
  { name: 'welcome-email', data: { to: 'user1@example.com' } },
  { name: 'welcome-email', data: { to: 'user2@example.com' } },
  { name: 'welcome-email', data: { to: 'user3@example.com' } }
]);
```

### 任务操作

```typescript
// 获取任务
const job = await emailsQueue.getJob('job-id-123');

// 获取任务状态
const state = await job.getState();
console.log(state);
// 输出: { status: 'active', progress: 50, ... }

// 更新任务进度
await job.updateProgress(75);

// 获取任务进度
const progress = await job.getProgress();
console.log(progress); // 输出: 75

// 添加任务日志
await job.log('Processing step 3...');

// 获取任务日志
const logs = await job.getLogs();
console.log(logs);
// 输出: [{ message: 'Processing step 3...', timestamp: '2023-01-01T...' }, ...]

// 重试失败的任务
await job.retry();

// 提升延迟任务优先级（立即执行）
await job.promote();

// 移除任务
await job.remove();
```

### 获取队列中的任务

```typescript
// 获取等待中的任务
const waitingJobs = await emailsQueue.getJobs('waiting');

// 获取多种状态的任务
const jobs = await emailsQueue.getJobs(['active', 'delayed']);

// 获取分页任务
const page1 = await emailsQueue.getJobs('completed', 0, 9); // 前10个
const page2 = await emailsQueue.getJobs('completed', 10, 19); // 第11-20个

// 获取任务计数
const counts = await emailsQueue.getJobCounts();
console.log(counts);
// 输出: { waiting: 5, active: 2, completed: 10, failed: 1, delayed: 3 }
```

## 事件处理

### 监听任务事件

```typescript
// 监听任务完成事件
emailsQueue.on('completed', (job, result) => {
  console.log(`任务 ${job.id} 已完成，结果:`, result);
});

// 监听任务失败事件
emailsQueue.on('failed', (job, error) => {
  console.error(`任务 ${job.id} 失败:`, error.message);
});

// 监听任务进度更新事件
emailsQueue.on('progress', (job, progress) => {
  console.log(`任务 ${job.id} 进度更新:`, progress);
});

// 监听任务添加事件
emailsQueue.on('added', (job) => {
  console.log(`新任务 ${job.id} 已添加到队列`);
});

// 监听队列排空事件
emailsQueue.on('drained', () => {
  console.log('队列已排空，所有任务处理完毕');
});
```

### 使用全局事件

要监听所有队列的事件，可以使用全局事件：

```typescript
// 创建队列事件监听器
const queueEvents = app.queue.createQueueEvents('emails');

// 监听全局完成事件
queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`任务 ${jobId} 已完成，结果:`, returnvalue);
});

// 监听全局失败事件
queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`任务 ${jobId} 失败:`, failedReason);
});

// 关闭事件监听器
await queueEvents.close();
```

## 高级用例

### 任务依赖关系（工作流）

```typescript
// 创建任务流
const uploadJob = await mediaQueue.add('video-upload', {
  fileId: 'abc123',
  userId: 456
});

// 添加依赖任务
const transcodeJob = await mediaQueue.add('video-transcode', {
  fileId: 'abc123',
  formats: ['mp4', 'webm']
}, {
  dependencies: [uploadJob.id] // 依赖上传任务完成
});

const thumbnailJob = await mediaQueue.add('video-thumbnail', {
  fileId: 'abc123'
}, {
  dependencies: [uploadJob.id] // 也依赖上传任务完成
});

// 最终任务依赖前面两个任务
await mediaQueue.add('video-publish', {
  fileId: 'abc123',
  userId: 456
}, {
  dependencies: [transcodeJob.id, thumbnailJob.id]
});
```

### 使用沙箱处理器

对于 CPU 密集型任务，建议使用沙箱处理器隔离执行环境：

```typescript
// 在插件配置中启用沙箱处理器
app.register(queuePlugin, {
  driver: 'bullmq',
  processor: {
    sandboxed: true,
    maxSandboxes: 4 // 最多4个沙箱进程
  }
});

// 对特定队列启用沙箱处理器
const imageQueue = app.queue.createQueue('image-processing', {
  processor: {
    sandboxed: true
  }
});

// 处理器文件（将被在沙箱中执行）
// processors/image-processor.js
module.exports = async (job) => {
  const { imageUrl, filters } = job.data;
  // 进行图像处理...
  return { processed: true, resultUrl: 'https://...' };
};

// 注册外部处理器文件
imageQueue.process('image-resize', path.join(__dirname, 'processors/image-processor.js'));
```

### 限流控制

```typescript
// 创建带限流的队列
const apiQueue = app.queue.createQueue('api-calls', {
  limiter: {
    max: 10, // 每时间窗口最多处理10个任务
    duration: 1000 // 时间窗口为1秒
  }
});
```

### 使用Redis集群

```typescript
// 配置Redis集群
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

### 自定义重试策略

```typescript
// 配置指数退避重试策略
const job = await emailsQueue.add('important-email', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000 // 初始延迟1秒
  }
});

// 配置固定间隔重试策略
const job2 = await emailsQueue.add('notification', data, {
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 5000 // 每次重试间隔5秒
  }
});

// 配置自定义重试策略
const job3 = await emailsQueue.add('api-call', data, {
  attempts: 10,
  backoff: {
    custom: (attemptsMade) => {
      // 根据已尝试次数动态计算延迟
      return Math.min(1000 * Math.pow(2, attemptsMade), 30000);
    }
  }
});
```

## 最佳实践

### 配置持久化

为了避免任务丢失，建议配置任务持久化：

```typescript
app.register(queuePlugin, {
  defaultJobOptions: {
    // 保留最近100个已完成的任务
    removeOnComplete: 100,
    // 保留所有失败的任务
    removeOnFail: false
  }
});
```

### 优化内存使用

为了避免 Redis 内存占用过大，可以配置自动清理：

```typescript
app.register(queuePlugin, {
  defaultJobOptions: {
    // 完成后立即删除任务数据
    removeOnComplete: true,
    // 最多保留100个失败的任务
    removeOnFail: 100
  }
});
```

### 实现优雅关闭

```typescript
// 在应用关闭前，优雅关闭队列连接
app.hook('beforeClose', async () => {
  // 等待正在处理的任务完成
  await app.queue.gracefulShutdown(10000); // 最多等待10秒
});
```

### 监控和警报

建议实现队列监控和警报机制：

```typescript
// 监控失败任务
emailsQueue.on('failed', (job, error) => {
  // 记录错误日志
  app.logger.error(`任务 ${job.name}:${job.id} 失败`, {
    error: error.message,
    stack: error.stack,
    data: job.data
  });
  
  // 发送警报
  if (job.attemptsMade >= job.opts.attempts) {
    alertService.sendAlert(`任务 ${job.name} 已失败 ${job.opts.attempts} 次，需要人工介入`);
  }
});

// 监控队列健康状态
setInterval(async () => {
  const metrics = await emailsQueue.getMetrics();
  
  // 检查任务堆积
  if (metrics.waiting > 1000) {
    alertService.sendAlert(`邮件队列任务堆积: ${metrics.waiting} 个任务等待处理`);
  }
  
  // 检查失败率
  const failRate = metrics.failed / (metrics.completed + metrics.failed);
  if (failRate > 0.1) { // 失败率超过10%
    alertService.sendAlert(`邮件队列失败率过高: ${(failRate * 100).toFixed(2)}%`);
  }
}, 60000); // 每分钟检查一次
```

### 使用命名任务

使用命名任务可以提高代码可读性和可维护性：

```typescript
// 不推荐
await queue.add({ type: 'email', to: 'user@example.com' });

// 推荐
await queue.add('send-email', { to: 'user@example.com' });
```

## 故障排除

### 常见问题

1. **任务没有被处理**
   - 检查 Redis 连接是否正常
   - 确认处理器已正确注册
   - 检查队列是否被暂停
   - 验证任务是否有未满足的依赖

2. **任务处理失败并不断重试**
   - 检查任务处理逻辑是否有错误
   - 确认外部资源（如API、数据库）是否可访问
   - 考虑调整重试策略或重试次数
   - 检查是否有超时设置过短的问题

3. **Redis 内存占用过高**
   - 配置适当的 `removeOnComplete` 和 `removeOnFail` 选项
   - 减少任务数据量，避免存储不必要的数据
   - 考虑使用 Redis 集群或增加 Redis 内存容量

4. **并发处理导致性能问题**
   - 调整并发数以匹配服务器资源
   - 对 CPU 密集型任务使用沙箱处理器
   - 考虑使用限流控制避免资源过载

### 日志和调试

启用详细日志以帮助排查问题：

```typescript
app.register(queuePlugin, {
  debug: true,  // 启用详细日志
  events: {
    log: true   // 记录详细事件日志
  }
});

// 对特定队列监听所有事件
const allEvents = [
  'added', 'completed', 'failed', 'progress', 'stalled',
  'waiting', 'active', 'delayed', 'drained', 'removed', 'error'
];

allEvents.forEach(event => {
  emailsQueue.on(event, (...args) => {
    console.log(`[Queue:${event}]`, ...args);
  });
});
```

### 健康检查

实现健康检查以验证队列系统是否正常工作：

```typescript
app.register(webPlugin, {
  routes: {
    '/health/queue': {
      get: async (req, reply) => {
        try {
          // 检查Redis连接
          const isRedisConnected = await app.queue.checkHealth();
          
          // 获取队列状态
          const emailsStatus = await app.queue.getQueue('emails').getStatus();
          const mediaStatus = await app.queue.getQueue('media').getStatus();
          
          return {
            status: 'healthy',
            redis: isRedisConnected ? 'connected' : 'disconnected',
            queues: {
              emails: emailsStatus,
              media: mediaStatus
            }
          };
        } catch (error) {
          reply.status(500);
          return {
            status: 'unhealthy',
            error: error.message
          };
        }
      }
    }
  }
});
``` 