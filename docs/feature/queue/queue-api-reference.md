# @stratix/queue API参考文档

本文档提供了 @stratix/queue 插件的详细 API 说明。

## 目录

- [插件注册](#插件注册)
- [QueueManager API](#queuemanager-api)
- [Queue API](#queue-api)
- [Job API](#job-api)
- [Worker API](#worker-api)
- [QueueEvents API](#queueevents-api)
- [配置选项](#配置选项)
- [类型定义](#类型定义)

## 插件注册

### 注册方式

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

// 通过配置文件注册
// stratix.config.js
module.exports = {
  plugins: {
    queue: {
      driver: 'bullmq',
      redis: {
        host: 'localhost',
        port: 6379
      }
    }
  }
};
```

### 创建自定义队列插件

```typescript
import { createQueuePlugin } from '@stratix/queue';

// 创建自定义配置的队列插件
const myQueuePlugin = createQueuePlugin({
  driver: 'bullmq',
  redis: {
    host: 'redis.example.com',
    port: 6379
  }
});

app.register(myQueuePlugin);
```

## QueueManager API

QueueManager 是全局队列管理器，负责创建和管理所有队列实例。

### 方法

#### `createQueue(name, options?): Queue`

创建一个新的队列实例。

**参数：**
- `name` (string): 队列名称
- `options` (QueueOptions, 可选): 队列选项

**返回：** Queue 实例

#### `getQueue(name): Queue`

获取一个现有的队列实例。

**参数：**
- `name` (string): 队列名称

**返回：** Queue 实例，如果不存在则抛出错误

#### `hasQueue(name): boolean`

检查队列是否存在。

**参数：**
- `name` (string): 队列名称

**返回：** 布尔值，表示队列是否存在

#### `getAllQueues(): Queue[]`

获取所有队列实例的数组。

**返回：** Queue 实例数组

#### `removeQueue(name): Promise<boolean>`

移除一个队列实例并关闭其连接。

**参数：**
- `name` (string): 队列名称

**返回：** Promise<boolean>，表示是否成功移除

#### `getQueueStatus(name): Promise<QueueStatus>`

获取指定队列的状态。

**参数：**
- `name` (string): 队列名称

**返回：** Promise<QueueStatus>，队列状态对象

#### `closeAll(): Promise<void>`

关闭所有队列实例的连接。

**返回：** Promise<void>

## Queue API

Queue 类提供了队列的核心功能，包括添加作业、处理作业等。

### 方法

#### `add<T, R>(name, data?, options?): Promise<Job<T, R>>`

向队列添加一个作业。

**参数：**
- `name` (string): 作业名称
- `data` (T, 可选): 作业数据
- `options` (JobOptions, 可选): 作业选项

**返回：** Promise<Job<T, R>>，新创建的作业

#### `addBulk<T, R>(jobs): Promise<Job<T, R>[]>`

批量添加多个作业到队列。

**参数：**
- `jobs` (Array<{name: string, data?: T, opts?: JobOptions}>): 作业配置数组

**返回：** Promise<Job<T, R>[]>，新创建的作业数组

#### `addDelayed<T, R>(name, data, delay, options?): Promise<Job<T, R>>`

添加延迟执行的作业。

**参数：**
- `name` (string): 作业名称
- `data` (T): 作业数据
- `delay` (number): 延迟毫秒数
- `options` (JobOptions, 可选): 作业选项

**返回：** Promise<Job<T, R>>，新创建的作业

#### `addRepeatableJob<T, R>(name, data, repeatOptions, jobOptions?): Promise<Job<T, R>>`

添加重复执行的作业。

**参数：**
- `name` (string): 作业名称
- `data` (T): 作业数据
- `repeatOptions` (RepeatOptions): 重复配置选项
- `jobOptions` (JobOptions, 可选): 作业选项

**返回：** Promise<Job<T, R>>，新创建的作业

#### `process<T, R>(processor): void`

注册一个处理器函数来处理队列中的作业。

**参数：**
- `processor` (ProcessorCallback<T, R> | Record<string, ProcessorCallback<T, R>>): 处理器函数或处理器映射

**返回：** void

#### `getJob<T, R>(jobId): Promise<Job<T, R> | null>`

获取一个作业实例。

**参数：**
- `jobId` (string): 作业ID

**返回：** Promise<Job<T, R> | null>，作业实例或null

#### `getJobs(status, start?, end?, asc?): Promise<Job[]>`

获取指定状态的作业列表。

**参数：**
- `status` (JobStatus | JobStatus[]): 作业状态或状态数组
- `start` (number, 可选): 起始索引
- `end` (number, 可选): 结束索引
- `asc` (boolean, 可选): 是否升序排序

**返回：** Promise<Job[]>，作业实例数组

#### `getJobCounts(): Promise<JobCounts>`

获取不同状态的作业数量。

**返回：** Promise<JobCounts>，各状态作业数量

#### `removeJob(jobId): Promise<boolean>`

移除一个作业。

**参数：**
- `jobId` (string): 作业ID

**返回：** Promise<boolean>，是否成功移除

#### `removeJobs(pattern): Promise<number>`

批量移除匹配模式的作业。

**参数：**
- `pattern` (string): 作业ID匹配模式

**返回：** Promise<number>，移除的作业数量

#### `pause(): Promise<void>`

暂停队列处理。

**返回：** Promise<void>

#### `resume(): Promise<void>`

恢复队列处理。

**返回：** Promise<void>

#### `isPaused(): Promise<boolean>`

检查队列是否已暂停。

**返回：** Promise<boolean>，队列是否已暂停

#### `empty(): Promise<void>`

清空队列中的所有作业。

**返回：** Promise<void>

#### `close(): Promise<void>`

关闭队列连接。

**返回：** Promise<void>

#### `getStatus(): Promise<QueueStatus>`

获取队列状态。

**返回：** Promise<QueueStatus>，队列状态对象

#### `getMetrics(): Promise<QueueMetrics>`

获取队列指标。

**返回：** Promise<QueueMetrics>，队列指标对象

#### `on(event, handler): void`

注册事件监听器。

**参数：**
- `event` (QueueEvent): 事件名称
- `handler` (Function): 事件处理函数

**返回：** void

#### `off(event, handler): void`

移除事件监听器。

**参数：**
- `event` (QueueEvent): 事件名称
- `handler` (Function): 事件处理函数

**返回：** void

## Job API

Job 类表示队列中的一个作业实例。

### 属性

- `id` (string): 作业ID
- `name` (string): 作业名称
- `data` (any): 作业数据
- `returnvalue` (any): 作业执行结果
- `attemptsMade` (number): 已尝试执行次数
- `opts` (JobOptions): 作业选项
- `status` (JobStatus): 作业状态

### 方法

#### `updateProgress(progress): Promise<void>`

更新作业进度。

**参数：**
- `progress` (number | object): 进度值或对象

**返回：** Promise<void>

#### `getProgress(): Promise<number | object>`

获取作业进度。

**返回：** Promise<number | object>，进度值或对象

#### `retry(): Promise<void>`

重试作业。

**返回：** Promise<void>

#### `remove(): Promise<void>`

移除作业。

**返回：** Promise<void>

#### `moveToFailed(error): Promise<void>`

将作业移至失败状态。

**参数：**
- `error` (Error): 失败原因

**返回：** Promise<void>

#### `promote(): Promise<void>`

将延迟作业提升为立即执行。

**返回：** Promise<void>

#### `discard(): Promise<void>`

废弃作业，不再处理。

**返回：** Promise<void>

#### `log(message): Promise<void>`

添加作业日志。

**参数：**
- `message` (string): 日志消息

**返回：** Promise<void>

#### `getLogs(): Promise<LogEntry[]>`

获取作业日志。

**返回：** Promise<LogEntry[]>，日志条目数组

#### `addDependency(jobId): Promise<void>`

添加依赖作业。

**参数：**
- `jobId` (string): 依赖作业ID

**返回：** Promise<void>

#### `removeDependency(jobId): Promise<void>`

移除依赖作业。

**参数：**
- `jobId` (string): 依赖作业ID

**返回：** Promise<void>

#### `getState(): Promise<JobState>`

获取作业详细状态。

**返回：** Promise<JobState>，作业状态详情

## Worker API

Worker 类负责处理队列中的作业。

### 方法

#### `constructor(queueName, processor, options?)`

创建一个新的 Worker 实例。

**参数：**
- `queueName` (string): 队列名称
- `processor` (ProcessorCallback | Record<string, ProcessorCallback>): 处理器函数或处理器映射
- `options` (WorkerOptions, 可选): Worker 选项

#### `start(): Promise<void>`

启动 Worker。

**返回：** Promise<void>

#### `pause(): Promise<void>`

暂停 Worker 处理。

**返回：** Promise<void>

#### `resume(): Promise<void>`

恢复 Worker 处理。

**返回：** Promise<void>

#### `close(): Promise<void>`

关闭 Worker 连接。

**返回：** Promise<void>

#### `on(event, handler): void`

注册事件监听器。

**参数：**
- `event` (WorkerEvent): 事件名称
- `handler` (Function): 事件处理函数

**返回：** void

## QueueEvents API

QueueEvents 类用于监听队列事件。

### 方法

#### `constructor(queueName, options?)`

创建一个新的 QueueEvents 实例。

**参数：**
- `queueName` (string): 队列名称
- `options` (QueueEventsOptions, 可选): 选项

#### `on(event, handler): void`

注册事件监听器。

**参数：**
- `event` (QueueEvent): 事件名称
- `handler` (Function): 事件处理函数

**返回：** void

#### `off(event, handler): void`

移除事件监听器。

**参数：**
- `event` (QueueEvent): 事件名称
- `handler` (Function): 事件处理函数

**返回：** void

#### `close(): Promise<void>`

关闭 QueueEvents 连接。

**返回：** Promise<void>

## 配置选项

### QueuePluginOptions

队列插件的主要配置选项。

```typescript
interface QueuePluginOptions {
  // 队列驱动
  driver?: 'bullmq' | 'memory' | string;
  
  // 通用配置
  prefix?: string;
  defaultJobOptions?: JobOptions;
  
  // Redis配置
  redis?: RedisOptions;
  
  // BullMQ特定配置
  bullmq?: BullMQOptions;
  
  // 内存驱动配置
  memory?: MemoryDriverOptions;
  
  // 处理器配置
  processor?: ProcessorOptions;
  
  // 事件配置
  events?: EventsOptions;
  
  // 队列定义
  queues?: Record<string, QueueDefinition>;
  
  // 默认队列名称
  defaultQueue?: string;
  
  // 是否使用现有的Redis连接
  useExistingRedis?: boolean;
}
```

### QueueOptions

单个队列的配置选项。

```typescript
interface QueueOptions {
  // 连接选项
  connection?: ConnectionOptions;
  
  // 默认作业选项
  defaultJobOptions?: JobOptions;
  
  // 前缀
  prefix?: string;
  
  // 并发数
  concurrency?: number;
  
  // 限流选项
  limiter?: RateLimiterOptions;
  
  // 处理器选项
  processor?: ProcessorOptions;
  
  // 其他选项...
}
```

### JobOptions

作业的配置选项。

```typescript
interface JobOptions {
  // 优先级（数字越小优先级越高）
  priority?: number;
  
  // 延迟时间（毫秒）
  delay?: number;
  
  // 重试次数
  attempts?: number;
  
  // 超时时间（毫秒）
  timeout?: number;
  
  // 重试策略
  backoff?: BackoffOptions;
  
  // 是否LIFO（后进先出）
  lifo?: boolean;
  
  // 任务ID
  jobId?: string;
  
  // 完成后删除
  removeOnComplete?: boolean | number;
  
  // 失败后删除
  removeOnFail?: boolean | number;
  
  // 重复配置
  repeat?: RepeatOptions;
  
  // 依赖的作业ID
  dependencies?: string[];
  
  // 其他选项...
}
```

### WorkerOptions

Worker 的配置选项。

```typescript
interface WorkerOptions {
  // 并发数
  concurrency?: number;
  
  // 连接选项
  connection?: ConnectionOptions;
  
  // 前缀
  prefix?: string;
  
  // 是否使用沙箱
  sandbox?: boolean;
  
  // 限流选项
  limiter?: RateLimiterOptions;
  
  // 监控选项
  metrics?: MetricsOptions;
  
  // 其他选项...
}
```

### RepeatOptions

重复作业的配置选项。

```typescript
interface RepeatOptions {
  // Cron表达式
  cron?: string;
  
  // 重复间隔（毫秒）
  every?: number;
  
  // 重复次数限制
  limit?: number;
  
  // 开始日期
  startDate?: Date | string | number;
  
  // 结束日期
  endDate?: Date | string | number;
  
  // 时区
  tz?: string;
  
  // 其他选项...
}
```

## 类型定义

### JobStatus

作业状态枚举。

```typescript
enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused'
}
```

### QueueEvent

队列事件枚举。

```typescript
enum QueueEvent {
  ADDED = 'added',
  WAITING = 'waiting',
  ACTIVE = 'active',
  STALLED = 'stalled',
  PROGRESS = 'progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
  RESUMED = 'resumed',
  CLEANED = 'cleaned',
  DRAINED = 'drained',
  REMOVED = 'removed',
  ERROR = 'error'
}
```

### ProcessorCallback

处理器回调函数类型。

```typescript
type ProcessorCallback<T = any, R = any> = (job: Job<T>) => Promise<R> | R;
```

### QueueStatus

队列状态类型。

```typescript
interface QueueStatus {
  isPaused: boolean;
  jobCounts: JobCounts;
}
```

### JobCounts

各状态作业数量类型。

```typescript
interface JobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}
```

### QueueMetrics

队列指标类型。

```typescript
interface QueueMetrics {
  throughput: number;    // 处理速率（每秒作业数）
  latency: number;       // 延迟时间（毫秒）
  waiting: number;       // 等待作业数
  active: number;        // 活动作业数
  completed: number;     // 已完成作业数
  failed: number;        // 失败作业数
  delayed: number;       // 延迟作业数
}
```

### BackoffOptions

重试策略选项类型。

```typescript
interface BackoffOptions {
  // 策略类型
  type: 'fixed' | 'exponential';
  
  // 延迟时间（毫秒）
  delay: number;
  
  // 自定义算法函数
  custom?: (attemptsMade: number) => number;
}
``` 