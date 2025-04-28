# @stratix/queue 插件设计文档

## 1. 插件概述

@stratix/queue 是 Stratix 框架的任务队列管理插件，提供高效、可靠的分布式任务处理解决方案。该插件遵循 Stratix 的纯配置和函数式编程理念，支持多种队列驱动和处理策略。

### 1.1 设计目标

- **高性能**：提供低延迟、高吞吐量的任务队列操作
- **可靠性**：确保任务至少被处理一次，避免任务丢失
- **灵活性**：支持多种队列驱动和处理策略
- **类型安全**：完整的 TypeScript 类型定义
- **可扩展**：允许自定义队列驱动和处理器
- **纯函数式 API**：遵循函数式编程原则，提供纯函数 API
- **声明式配置**：通过配置定义队列行为

### 1.2 核心特性

- 默认集成 BullMQ，支持切换到其他队列实现
- 支持延迟任务、重复任务和计划任务
- 自动重试机制和失败策略
- 任务优先级和并发控制
- 支持任务依赖关系（工作流）
- 任务进度跟踪和事件系统
- 分布式锁和原子操作
- 监控和统计功能
- 优雅关闭和恢复机制

## 2. 插件架构

### 2.1 整体架构

@stratix/queue 插件采用分层架构设计：

1. **API 层**：向应用提供统一的队列操作接口
2. **驱动层**：封装不同的队列实现（BullMQ、内存队列等）
3. **处理层**：负责任务的执行和生命周期管理
4. **存储层**：利用 Redis 或其他存储机制持久化任务
5. **事件层**：提供任务事件和生命周期钩子

### 2.2 组件结构

```
@stratix/queue/
├── api/                 // API 接口层
│   ├── queue.ts         // 主队列 API
│   └── decorators.ts    // 队列装饰器
├── drivers/             // 队列驱动实现
│   ├── bull-driver.ts   // BullMQ 驱动
│   ├── memory-driver.ts // 内存队列驱动
│   └── abstract.ts      // 抽象驱动接口
├── processors/          // 任务处理器
│   ├── local.ts         // 本地处理器
│   └── sandbox.ts       // 沙箱处理器
├── storage/             // 存储适配器
│   ├── redis.ts         // Redis 存储
│   └── memory.ts        // 内存存储
├── utils/               // 工具函数
│   ├── serializer.ts    // 序列化工具
│   └── patterns.ts      // 常用模式实现
├── types/               // 类型定义
│   ├── queue.ts         // 队列类型
│   ├── job.ts           // 任务类型
│   └── driver.ts        // 驱动类型
├── index.ts             // 插件入口
└── plugin.ts            // 插件定义
```

## 3. 接口设计

### 3.1 队列插件配置

```typescript
interface QueuePluginOptions {
  // 队列驱动配置
  driver?: 'bullmq' | 'memory' | string;  // 队列驱动类型，默认为 'bullmq'
  
  // 通用配置
  prefix?: string;                   // 队列名称前缀
  defaultJobOptions?: {              // 默认任务选项
    attempts?: number;               // 重试次数
    backoff?: BackoffOptions;        // 重试策略
    timeout?: number;                // 超时时间（毫秒）
    removeOnComplete?: boolean | number; // 完成后删除
    removeOnFail?: boolean | number; // 失败后删除
  };
  
  // Redis配置（用于BullMQ驱动）
  redis?: {
    host?: string;                   // Redis主机
    port?: number;                   // Redis端口
    password?: string;               // Redis密码
    db?: number;                     // Redis数据库索引
    tls?: boolean | object;          // TLS配置
    // 其他Redis选项...
  };
  
  // BullMQ特定配置
  bullmq?: {
    connection?: ConnectionOptions;  // 连接选项
    // 其他BullMQ特定选项...
  };
  
  // 内存驱动配置
  memory?: {
    maxJobs?: number;                // 最大任务数
    persistence?: boolean;           // 是否持久化
  };
  
  // 处理器配置
  processor?: {
    concurrency?: number;            // 全局并发数
    sandboxed?: boolean;             // 是否使用沙箱处理器
    maxSandboxes?: number;           // 最大沙箱数量
  };
  
  // 事件配置
  events?: {
    enabled?: boolean;               // 是否启用事件
    global?: boolean;                // 是否启用全局事件
  };
  
  // 队列定义
  queues?: {
    [name: string]: {
      concurrency?: number;          // 队列特定并发数
      processors?: Record<string, QueueProcessor>; // 处理器函数
      // 其他队列特定配置...
    };
  };
  
  // 默认队列名称
  defaultQueue?: string;
}
```

### 3.2 队列 API

```typescript
interface Queue {
  /**
   * 添加任务到队列
   */
  add<T = any, R = any>(name: string, data?: T, opts?: JobOptions): Promise<Job<T, R>>;
  
  /**
   * 添加带延迟的任务
   */
  addDelayed<T = any, R = any>(name: string, data: T, delay: number, opts?: JobOptions): Promise<Job<T, R>>;
  
  /**
   * 添加重复任务
   */
  addRepeatableJob<T = any, R = any>(name: string, data: T, repeatOpts: RepeatOptions, jobOpts?: JobOptions): Promise<Job<T, R>>;
  
  /**
   * 批量添加任务
   */
  addBulk<T = any, R = any>(jobs: Array<{ name: string, data: T, opts?: JobOptions }>): Promise<Job<T, R>[]>;
  
  /**
   * 暂停队列处理
   */
  pause(): Promise<void>;
  
  /**
   * 恢复队列处理
   */
  resume(): Promise<void>;
  
  /**
   * 清空队列
   */
  empty(): Promise<void>;
  
  /**
   * 关闭队列连接
   */
  close(): Promise<void>;
  
  /**
   * 获取任务实例
   */
  getJob<T = any, R = any>(jobId: string): Promise<Job<T, R> | null>;
  
  /**
   * 获取队列状态
   */
  getStatus(): Promise<QueueStatus>;
  
  /**
   * 获取队列指标
   */
  getMetrics(): Promise<QueueMetrics>;
  
  /**
   * 注册事件监听器
   */
  on(event: QueueEvent, handler: (...args: any[]) => void): void;
  
  /**
   * 注册处理器
   */
  process<T = any, R = any>(processor: QueueProcessor<T, R> | Record<string, QueueProcessor<T, R>>): void;
}
```

### 3.3 任务接口

```typescript
interface Job<T = any, R = any> {
  /**
   * 任务ID
   */
  readonly id: string;
  
  /**
   * 任务名称
   */
  readonly name: string;
  
  /**
   * 任务数据
   */
  readonly data: T;
  
  /**
   * 任务返回结果
   */
  readonly returnvalue: R | null;
  
  /**
   * 任务状态
   */
  readonly status: JobStatus;
  
  /**
   * 重试次数
   */
  readonly attemptsMade: number;
  
  /**
   * 更新任务进度
   */
  updateProgress(progress: number | object): Promise<void>;
  
  /**
   * 获取任务进度
   */
  getProgress(): Promise<number | object>;
  
  /**
   * 移除任务
   */
  remove(): Promise<void>;
  
  /**
   * 重试任务
   */
  retry(): Promise<void>;
  
  /**
   * 将任务标记为完成
   */
  complete(result?: R): Promise<void>;
  
  /**
   * 将任务标记为失败
   */
  fail(error: Error): Promise<void>;
  
  /**
   * 将任务推迟处理
   */
  delay(delayMs: number): Promise<void>;
  
  /**
   * 升级任务优先级
   */
  promote(): Promise<void>;
  
  /**
   * 添加依赖任务
   */
  addDependency(jobId: string): Promise<void>;
  
  /**
   * 移除依赖任务
   */
  removeDependency(jobId: string): Promise<void>;
}
```

## 4. 驱动实现

@stratix/queue 插件支持多种队列驱动实现，默认使用 BullMQ 驱动。每个驱动都需要实现相同的接口，以确保在不同驱动之间切换时的兼容性。

### 4.1 抽象驱动接口

所有队列驱动都需要实现的核心接口：

```typescript
interface QueueDriver {
  // 初始化驱动
  init(options: any): Promise<void>;
  
  // 创建队列
  createQueue(name: string, options?: any): QueueInstance;
  
  // 关闭连接
  close(): Promise<void>;
  
  // 获取驱动名称
  getName(): string;
  
  // 检查驱动状态
  checkHealth(): Promise<boolean>;
}

interface QueueInstance {
  // 队列基本操作
  add(name: string, data: any, options?: any): Promise<JobInstance>;
  process(processor: Function): void;
  getJob(jobId: string): Promise<JobInstance | null>;
  removeJob(jobId: string): Promise<boolean>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  empty(): Promise<void>;
  close(): Promise<void>;
  
  // 事件处理
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  
  // 队列状态
  getStatus(): Promise<any>;
  getMetrics(): Promise<any>;
}

interface JobInstance {
  // 任务基本属性
  readonly id: string;
  readonly name: string;
  readonly data: any;
  readonly status: string;
  
  // 任务操作
  updateProgress(progress: any): Promise<void>;
  retry(): Promise<void>;
  remove(): Promise<void>;
  promote(): Promise<void>;
  // 其他操作...
}
```

### 4.2 BullMQ 驱动实现

BullMQ 驱动是默认的队列驱动实现，它封装了 BullMQ 库的功能，提供了高性能、可靠的分布式队列处理能力。

```typescript
class BullMQDriver implements QueueDriver {
  private connection: any; // Redis连接
  private queues: Map<string, Queue>;
  
  constructor(options: BullMQDriverOptions) {
    this.queues = new Map();
    // 初始化...
  }
  
  async init(options: BullMQDriverOptions): Promise<void> {
    // 初始化Redis连接...
  }
  
  createQueue(name: string, options?: QueueOptions): BullMQQueueInstance {
    // 创建BullMQ队列实例...
    return new BullMQQueueInstance(name, this.connection, options);
  }
  
  // 其他方法实现...
}

class BullMQQueueInstance implements QueueInstance {
  private queue: any; // BullMQ Queue实例
  private queueEvents: any; // BullMQ QueueEvents实例
  
  constructor(name: string, connection: any, options?: any) {
    // 初始化BullMQ队列...
  }
  
  async add(name: string, data: any, options?: any): Promise<BullMQJobInstance> {
    // 添加任务到BullMQ队列...
  }
  
  process(processor: Function): void {
    // 注册BullMQ处理器...
  }
  
  // 其他方法实现...
}
```

### 4.3 内存队列驱动

内存队列驱动提供了一个简单的内存中队列实现，主要用于开发和测试环境。

```typescript
class MemoryQueueDriver implements QueueDriver {
  private queues: Map<string, MemoryQueueInstance>;
  
  constructor(options?: MemoryDriverOptions) {
    this.queues = new Map();
  }
  
  // 方法实现...
}
```

## 5. 与其他Stratix组件集成

### 5.1 与Cache插件集成

@stratix/queue 插件可以与 @stratix/cache 插件集成，利用 Redis 缓存功能进行任务存储和性能优化。

```typescript
// 使用@stratix/cache提供的Redis连接
import { createApp } from 'stratix';
import { queuePlugin } from '@stratix/queue';
import { cachePlugin } from '@stratix/cache';

const app = createApp();

// 先注册缓存插件
app.register(cachePlugin, {
  driver: 'redis',
  redis: {
    host: 'localhost',
    port: 6379
  }
});

// 注册队列插件，使用缓存插件的Redis连接
app.register(queuePlugin, {
  driver: 'bullmq',
  useExistingRedis: true // 使用已有的Redis连接
});
```

### 5.2 与Web插件集成

@stratix/queue 插件可以与 @stratix/web 插件集成，提供API接口进行队列管理和监控。

```typescript
// 注册Web路由用于队列管理
app.register(webPlugin, {
  routes: {
    '/api/queues': {
      get: async (req, reply) => {
        // 获取所有队列状态
        const queues = await app.queue.getQueues();
        return queues;
      }
    },
    '/api/queues/:name': {
      get: async (req, reply) => {
        // 获取特定队列状态
        const queue = app.queue.getQueue(req.params.name);
        return await queue.getStatus();
      },
      post: async (req, reply) => {
        // 添加任务到队列
        const queue = app.queue.getQueue(req.params.name);
        const job = await queue.add(req.body.name, req.body.data, req.body.options);
        return job;
      }
    }
  }
});
```

## 6. 使用示例

### 6.1 基本使用

```typescript
// 创建应用实例并注册队列插件
const app = createApp();

app.register(queuePlugin, {
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
  }
});

// 定义队列处理器
app.queue.getQueue('emails').process(async (job) => {
  const { to, subject, body } = job.data;
  await sendEmail(to, subject, body);
  return { sent: true, to };
});

// 添加任务到队列
await app.queue.getQueue('emails').add('welcome-email', {
  to: 'user@example.com',
  subject: 'Welcome to our platform',
  body: 'Thank you for registering...'
});

// 监听任务完成事件
app.queue.getQueue('emails').on('completed', (job, result) => {
  console.log(`邮件发送成功: ${job.id}, 结果:`, result);
});
```

### 6.2 使用延迟任务

```typescript
// 添加延迟任务
await app.queue.getQueue('notifications').addDelayed(
  'reminder', 
  { userId: 123, message: '别忘了完成您的个人资料' }, 
  24 * 60 * 60 * 1000 // 延迟24小时
);
```

### 6.3 使用重复任务

```typescript
// 添加重复任务（每天凌晨2点执行）
await app.queue.getQueue('reports').addRepeatableJob(
  'daily-report',
  { type: 'daily-summary' },
  { cron: '0 2 * * *' }
);
```

### 6.4 任务流和依赖关系

```typescript
// 创建具有依赖关系的任务流
const videoJob = await app.queue.getQueue('media').add('video-upload', {
  fileId: 'abc123',
  userId: 456
});

// 添加依赖任务
const transcodeJob = await app.queue.getQueue('media').add(
  'video-transcode', 
  { fileId: 'abc123', formats: ['mp4', 'webm'] },
  { dependencies: [videoJob.id] } // 依赖上传任务完成
);

const thumbnailJob = await app.queue.getQueue('media').add(
  'video-thumbnail', 
  { fileId: 'abc123' },
  { dependencies: [videoJob.id] } // 也依赖上传任务完成
);

// 发布任务依赖上一步的两个任务都完成
await app.queue.getQueue('media').add(
  'video-publish', 
  { fileId: 'abc123', userId: 456 },
  { dependencies: [transcodeJob.id, thumbnailJob.id] }
);
```

## 7. 最佳实践

### 7.1 生产环境配置

* 使用持久化的Redis实例，确保任务不会丢失
* 配置适当的任务重试策略和超时时间
* 为关键任务启用沙箱处理器，隔离执行环境
* 实现健康检查和监控，及时发现问题
* 设置合理的任务清理策略，避免Redis内存占用过大

### 7.2 性能优化

* 合理设置并发数，根据服务器资源和任务特性调整
* 对于I/O密集型任务，可以设置较高的并发数
* 对于CPU密集型任务，建议使用沙箱处理器并限制并发数
* 使用批量添加API提高添加任务的效率
* 适当使用移除已完成/失败任务的功能，避免队列过大

### 7.3 错误处理

* 实现全面的错误处理策略，包括重试机制
* 对于临时错误（如网络问题），使用指数退避重试策略
* 对于永久错误（如无效数据），及时标记失败并通知
* 实现死信队列，收集无法处理的任务以便后续分析
* 记录详细的错误日志，便于排查问题

## 8. API参考

详细的API文档请参考 [API参考文档](./queue-api-reference.md)。

## 9. 更多资源

- [使用指南](./queue-usage.md)
- [高级特性](./queue-advanced.md)
- [常见问题解答](./queue-faq.md)
- [BullMQ官方文档](https://docs.bullmq.io/) 