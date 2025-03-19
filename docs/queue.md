# Stratix消息队列插件设计文档 (@stratix/queue)

## 目录
- [Stratix消息队列插件设计文档 (@stratix/queue)](#stratix消息队列插件设计文档-stratixqueue)
  - [目录](#目录)
  - [1. 插件概述](#1-插件概述)
  - [2. 使用方式](#2-使用方式)
    - [2.1 基本使用](#21-基本使用)
    - [2.2 高级配置](#22-高级配置)
    - [2.3 队列工作模式](#23-队列工作模式)
    - [2.4 分布式队列](#24-分布式队列)
    - [2.5 错误处理与重试](#25-错误处理与重试)
  - [3. API设计](#3-api设计)
    - [3.1 插件API](#31-插件api)
    - [3.2 队列管理器API](#32-队列管理器api)
    - [3.3 队列存储API](#33-队列存储api)
    - [3.4 配置选项](#34-配置选项)
  - [4. 实现细节](#4-实现细节)
    - [4.1 核心实现](#41-核心实现)
    - [4.2 存储适配器](#42-存储适配器)
    - [4.3 队列策略](#43-队列策略)
    - [4.4 与框架集成](#44-与框架集成)
  - [5. 高级特性](#5-高级特性)
    - [5.1 优先级队列](#51-优先级队列)
    - [5.2 延迟队列](#52-延迟队列)
    - [5.3 死信队列](#53-死信队列)
    - [5.4 队列监控](#54-队列监控)

## 1. 插件概述

`@stratix/queue` 是Stratix框架的官方消息队列插件，提供简单而强大的队列处理能力，支持多种队列存储后端。插件设计遵循依赖倒置原则，通过抽象接口将队列逻辑与具体存储实现分离，使应用代码不依赖特定的消息队列技术。

核心特点：
- **多后端支持**：内置支持内存队列、Redis、数据库等多种队列存储
- **统一接口**：提供简洁一致的API，易于使用和切换存储方式
- **多种队列类型**：支持普通队列、优先级队列、延迟队列和死信队列
- **类型安全**：使用TypeScript提供完整类型定义
- **分布式支持**：内置集群支持，确保消息只被处理一次
- **可靠性**：支持消息确认、重试和死信处理
- **可扩展**：易于扩展自定义存储适配器和队列策略

## 2. 使用方式

### 2.1 基本使用

```typescript
// 引入Stratix框架和队列插件
import { createApp } from 'stratix';
import queuePlugin from '@stratix/queue';

// 创建应用实例并注册队列插件
const app = createApp();
app.register(queuePlugin, {
  // 默认使用内存队列
  default: {
    type: 'memory',
    options: {
      maxItems: 1000  // 最大队列长度
    }
  }
});

// 启动应用后使用队列
await app.start();

// 方式1: 直接通过框架访问
const queue = app.queue;

// 生产者：添加消息到队列
await queue.add('taskQueue', { 
  type: 'email', 
  to: 'user@example.com', 
  subject: 'Welcome' 
});

// 消费者：处理队列消息
queue.process('taskQueue', async (job) => {
  const { type, to, subject } = job.data;
  if (type === 'email') {
    await sendEmail(to, subject);
  }
  return { success: true };
});

// 方式2: 通过依赖注入使用
app.register(async (app) => {
  const queueManager = await app.resolve('queueManager');
  
  // 添加任务
  await queueManager.add('notificationQueue', {
    userId: 123,
    message: 'New update available'
  });
  
  // 处理任务
  queueManager.process('notificationQueue', async (job) => {
    // 业务逻辑
    return { processed: true };
  });
});
```

### 2.2 高级配置

```typescript
// 注册带有高级配置的队列插件
app.register(queuePlugin, {
  // 默认队列配置
  default: {
    type: 'redis',
    options: {
      host: 'localhost',
      port: 6379,
      password: 'secret',
      db: 0,
      // 键前缀
      keyPrefix: 'app:queue:',
      // Redis客户端配置
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    }
  },
  
  // 定义多个队列实例
  instances: {
    // 高优先级队列
    highPriority: {
      type: 'redis',
      options: {
        host: 'localhost',
        db: 1,
        keyPrefix: 'app:high:'
      }
    },
    
    // 本地内存队列（用于不需要持久化的任务）
    localTasks: {
      type: 'memory',
      options: {
        maxItems: 500
      }
    },
    
    // 数据库队列（用于需要事务支持的任务）
    dbTasks: {
      type: 'database',
      options: {
        tableName: 'queue_jobs',
        connection: 'default' // 使用默认数据库连接
      }
    }
  },
  
  // 全局序列化器
  serializer: {
    stringify: (data) => JSON.stringify(data),
    parse: (text) => JSON.parse(text)
  },
  
  // 错误处理
  onError: (error, operation, queueName) => {
    console.error(`Queue error in ${queueName} during ${operation}:`, error);
  }
});
```

### 2.3 队列工作模式

插件支持多种工作模式，适应不同的应用场景：

```typescript
// 单机处理模式
queue.process('emails', async (job) => {
  // 处理逻辑
});

// 并行处理（指定并发数）
queue.process('imageResizing', 5, async (job) => {
  // 并行处理图片调整大小
});

// 处理器分组（支持水平扩展）
queue.process('orders', { group: 'worker-group-1' }, async (job) => {
  // 订单处理逻辑
});

// 延迟队列（定时任务）
await queue.add('reminders', 
  { userId: 123, message: 'Meeting in 10 minutes' },
  { delay: 60 * 1000 * 50 } // 50分钟后执行
);

// 优先级队列
await queue.add('notifications', 
  { type: 'system', message: 'System maintenance' },
  { priority: 1 } // 高优先级（数字越小优先级越高）
);

// 带有超时的处理
queue.process('longTasks', { timeout: 5 * 60 * 1000 }, async (job) => {
  // 任务处理逻辑
  // 如果超过5分钟未完成，任务会自动失败
});
```

### 2.4 分布式队列

在分布式环境中使用队列：

```typescript
// 在多个节点上使用相同的Redis配置
const app1 = createApp({ name: 'worker-1' });
const app2 = createApp({ name: 'worker-2' });

const queueConfig = {
  default: {
    type: 'redis',
    options: {
      host: 'redis-server',
      port: 6379,
      // 集群环境标识，确保消息只处理一次
      clusterId: 'app-cluster'
    }
  }
};

// 注册到两个应用实例
app1.register(queuePlugin, queueConfig);
app2.register(queuePlugin, queueConfig);

// 两个应用都启动处理器
app1.queue.process('jobs', async (job) => { /* 处理逻辑 */ });
app2.queue.process('jobs', async (job) => { /* 处理逻辑 */ });

// 任务会被均衡分配到两个处理器，每个任务只会被处理一次
```

### 2.5 错误处理与重试

```typescript
// 添加带有重试配置的任务
await queue.add('importData', 
  { fileUrl: 'https://example.com/data.csv' },
  { 
    attempts: 5,              // 最多尝试5次
    backoff: {
      type: 'exponential',    // 指数退避策略
      delay: 1000             // 初始延迟1秒
    }
  }
);

// 处理失败处理
queue.process('importData', async (job) => {
  try {
    // 处理逻辑
    return { success: true };
  } catch (error) {
    // 自定义错误，决定是否重试
    if (error.code === 'NETWORK_ERROR') {
      // 标记为可重试
      throw new queue.errors.RetryableError(error.message);
    } else {
      // 标记为不可重试的失败
      throw new queue.errors.FatalError(error.message);
    }
  }
});

// 注册失败事件处理器
queue.on('failed', (job, error) => {
  console.error(`Job ${job.id} in queue ${job.queue} failed:`, error);
  
  // 可以在这里记录到日志系统或发送告警
});

// 配置死信队列
app.register(queuePlugin, {
  default: {
    type: 'redis',
    options: {
      // ...Redis配置
      
      // 配置死信队列
      deadLetter: {
        enabled: true,
        queueName: 'dead-letter-queue', // 死信队列名称
        maxSize: 1000                   // 最大容量
      }
    }
  }
});

// 处理死信队列消息
queue.process('dead-letter-queue', async (job) => {
  // 处理失败任务的逻辑
  const { originalQueue, originalData, error } = job.data;
  
  // 记录或处理失败的任务
});
```

## 3. API设计

### 3.1 插件API

```typescript
// 插件定义
interface QueuePlugin {
  name: string;
  dependencies: string[];
  register: (app: StratixApp, options: QueueOptions) => Promise<void>;
}

// 默认导出
export default QueuePlugin;
```

### 3.2 队列管理器API

```typescript
// 队列管理器接口
interface QueueManager {
  // 获取默认队列实例
  default: Queue;
  
  // 获取指定队列实例
  instance(name: string): Queue;
  
  // 所有队列实例映射
  instances: Record<string, Queue>;
  
  // 添加新队列实例
  addInstance(name: string, config: QueueConfig): Queue;
  
  // 移除队列实例
  removeInstance(name: string): boolean;
  
  // 清空所有队列
  clearAll(): Promise<void>;
  
  // 关闭所有连接
  close(): Promise<void>;
  
  // 错误类型
  errors: {
    QueueError: ErrorConstructor;
    RetryableError: ErrorConstructor;
    FatalError: ErrorConstructor;
    TimeoutError: ErrorConstructor;
  };
}
```

### 3.3 队列存储API

```typescript
// 队列接口
interface Queue {
  // 队列名称
  name: string;
  
  // 添加任务到队列
  add(queueName: string, data: any, options?: JobOptions): Promise<Job>;
  
  // 批量添加任务
  addBulk(queueName: string, jobs: Array<{ data: any, options?: JobOptions }>): Promise<Job[]>;
  
  // 处理队列任务
  process(queueName: string, concurrency: number | ProcessorOptions, handler: JobHandler): void;
  process(queueName: string, handler: JobHandler): void;
  process(queueName: string, options: ProcessorOptions, handler: JobHandler): void;
  
  // 获取队列状态
  getStatus(queueName: string): Promise<QueueStatus>;
  
  // 暂停队列处理
  pause(queueName: string): Promise<void>;
  
  // 恢复队列处理
  resume(queueName: string): Promise<void>;
  
  // 删除队列
  remove(queueName: string): Promise<void>;
  
  // 清空队列
  clear(queueName: string): Promise<void>;
  
  // 获取队列长度
  count(queueName: string): Promise<number>;
  
  // 获取队列中指定状态的任务数量
  countByState(queueName: string, state: JobState): Promise<number>;
  
  // 获取任务详情
  getJob(queueName: string, jobId: string): Promise<Job | null>;
  
  // 获取队列中所有任务
  getJobs(queueName: string, options?: GetJobsOptions): Promise<Job[]>;
  
  // 事件监听
  on(event: QueueEvent, handler: EventHandler): void;
  off(event: QueueEvent, handler: EventHandler): void;
  
  // 资源清理
  close(): Promise<void>;
}

// 任务接口
interface Job {
  // 任务ID
  id: string;
  
  // 队列名
  queue: string;
  
  // 任务数据
  data: any;
  
  // 任务选项
  opts: JobOptions;
  
  // 任务状态
  state: JobState;
  
  // 已尝试次数
  attemptsMade: number;
  
  // 创建时间
  timestamp: number;
  
  // 处理时间
  processedOn?: number;
  
  // 完成时间
  finishedOn?: number;
  
  // 重试任务
  retry(): Promise<void>;
  
  // 移动到另一个队列
  moveToQueue(queueName: string): Promise<Job>;
  
  // 移至死信队列
  moveToDeadLetter(reason: string): Promise<Job>;
  
  // 完成任务（只在处理期间有效）
  complete(result?: any): Promise<void>;
  
  // 标记任务失败
  fail(error: Error): Promise<void>;
  
  // 丢弃任务
  discard(): Promise<void>;
  
  // 发出进度事件
  progress(percent: number): Promise<void>;
}
```

### 3.4 配置选项

```typescript
// 插件配置选项
interface QueueOptions {
  // 默认队列配置
  default: QueueConfig;
  
  // 多实例配置
  instances?: Record<string, QueueConfig>;
  
  // 全局序列化器
  serializer?: {
    stringify: (data: any) => string;
    parse: (text: string) => any;
  };
  
  // 错误处理
  onError?: (error: Error, operation: string, queueName?: string) => void;
}

// 队列配置
interface QueueConfig {
  // 存储类型
  type: 'memory' | 'redis' | 'database' | 'custom';
  
  // 自定义适配器
  adapter?: QueueAdapter;
  
  // 配置选项
  options?: any;
}

// 内存队列选项
interface MemoryQueueOptions {
  maxItems?: number;         // 最大项目数
  defaultJobOptions?: JobOptions; // 默认任务选项
}

// Redis队列选项
interface RedisQueueOptions {
  // 连接信息
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
  
  // 集群配置
  cluster?: Array<{ host: string, port: number }>;
  sentinels?: Array<{ host: string, port: number }>;
  name?: string;
  
  // 键配置
  keyPrefix?: string;
  
  // 分布式设置
  clusterId?: string;
  
  // 任务选项
  defaultJobOptions?: JobOptions;
  
  // 死信队列配置
  deadLetter?: {
    enabled: boolean;
    queueName?: string;
    maxSize?: number;
  };
  
  // Redis客户端配置
  maxRetriesPerRequest?: number;
  enableOfflineQueue?: boolean;
  reconnectOnError?: (err: Error) => boolean;
}

// 数据库队列选项
interface DatabaseQueueOptions {
  tableName: string;        // 队列表名
  connection?: string;      // 数据库连接名称
  defaultJobOptions?: JobOptions; // 默认任务选项
  pollInterval?: number;    // 轮询间隔（毫秒）
}

// 任务选项
interface JobOptions {
  // 任务ID（不指定则自动生成）
  id?: string;
  
  // 优先级（数字越小优先级越高）
  priority?: number;
  
  // 延迟执行时间（毫秒）
  delay?: number;
  
  // 重试次数
  attempts?: number;
  
  // 重试策略
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  
  // 任务超时（毫秒）
  timeout?: number;
  
  // 自定义元数据
  meta?: Record<string, any>;
  
  // 是否允许重复
  allowDuplicate?: boolean;
}

// 处理器选项
interface ProcessorOptions {
  // 并发数
  concurrency?: number;
  
  // 处理器组ID（用于集群环境）
  group?: string;
  
  // 处理超时（毫秒）
  timeout?: number;
  
  // 处理间隔（轮询场景）
  pollInterval?: number;
}

// 任务状态
type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

// 队列事件
type QueueEvent = 
  'added' | 
  'waiting' | 
  'active' | 
  'completed' | 
  'failed' | 
  'progress' | 
  'paused' | 
  'resumed' | 
  'removed' | 
  'cleaned' | 
  'drained' | 
  'error';
```

## 4. 实现细节

### 4.1 核心实现

队列管理器是插件的核心组件，负责协调各种队列实例和处理器：

```typescript
// 队列管理器实现
class QueueManagerImpl implements QueueManager {
  private app: StratixApp;
  private options: QueueOptions;
  private _instances: Map<string, Queue> = new Map();
  private logger: Logger;
  
  constructor(app: StratixApp, options: QueueOptions) {
    this.app = app;
    this.options = options;
    this.logger = app.logger.child({ component: 'queue' });
    
    // 创建错误类型
    this.errors = {
      QueueError: createQueueError('QueueError'),
      RetryableError: createQueueError('RetryableError'),
      FatalError: createQueueError('FatalError'),
      TimeoutError: createQueueError('TimeoutError')
    };
  }
  
  // 初始化队列实例
  async initialize() {
    // 创建默认队列
    await this.addInstance('default', this.options.default);
    
    // 创建其他配置的队列
    if (this.options.instances) {
      for (const [name, config] of Object.entries(this.options.instances)) {
        await this.addInstance(name, config);
      }
    }
  }
  
  // 获取队列实例
  instance(name: string): Queue {
    const instance = this._instances.get(name);
    if (!instance) {
      throw new Error(`Queue instance '${name}' not found`);
    }
    return instance;
  }
  
  // 添加队列实例
  async addInstance(name: string, config: QueueConfig): Promise<Queue> {
    if (this._instances.has(name)) {
      throw new Error(`Queue instance '${name}' already exists`);
    }
    
    // 创建适配器
    const adapter = await this.createAdapter(config);
    
    // 创建队列实例
    const queue = new QueueImpl(name, adapter, {
      serializer: this.options.serializer,
      onError: this.options.onError,
      logger: this.logger.child({ queue: name })
    });
    
    // 存储实例
    this._instances.set(name, queue);
    
    return queue;
  }
  
  // 创建适配器
  private async createAdapter(config: QueueConfig) {
    switch (config.type) {
      case 'memory':
        return new MemoryQueueAdapter(config.options);
      
      case 'redis':
        const redis = await this.app.resolve('redis');
        return new RedisQueueAdapter(redis, config.options);
      
      case 'database':
        const db = await this.app.resolve('database');
        return new DatabaseQueueAdapter(db, config.options);
      
      case 'custom':
        if (!config.adapter) {
          throw new Error('Custom queue adapter not provided');
        }
        return config.adapter;
      
      default:
        throw new Error(`Unsupported queue type: ${config.type}`);
    }
  }
  
  // 队列实例属性
  get instances() {
    return Object.fromEntries(this._instances);
  }
  
  // 默认队列
  get default() {
    return this.instance('default');
  }
  
  // 移除队列实例
  removeInstance(name: string): boolean {
    if (name === 'default') {
      throw new Error('Cannot remove default queue instance');
    }
    
    const instance = this._instances.get(name);
    if (instance) {
      // 关闭队列
      instance.close();
      // 移除实例
      this._instances.delete(name);
      return true;
    }
    
    return false;
  }
  
  // 清空所有队列
  async clearAll(): Promise<void> {
    for (const queue of this._instances.values()) {
      await queue.clear('*');
    }
  }
  
  // 关闭所有队列
  async close(): Promise<void> {
    for (const queue of this._instances.values()) {
      await queue.close();
    }
    
    this._instances.clear();
  }
  
  // 错误类型
  errors: {
    QueueError: ErrorConstructor;
    RetryableError: ErrorConstructor;
    FatalError: ErrorConstructor;
    TimeoutError: ErrorConstructor;
  };
}
```

### 4.2 存储适配器

队列存储适配器提供了不同后端的实现：

```typescript
// 队列适配器接口
interface QueueAdapter {
  // 添加任务到队列
  add(queueName: string, jobData: JobData): Promise<string>;
  
  // 批量添加任务
  addBulk(queueName: string, jobs: JobData[]): Promise<string[]>;
  
  // 获取下一个任务
  getNext(queueName: string): Promise<JobData | null>;
  
  // 更新任务状态
  updateState(queueName: string, jobId: string, state: JobState, data?: any): Promise<boolean>;
  
  // 移除任务
  remove(queueName: string, jobId: string): Promise<boolean>;
  
  // 清空队列
  clear(queueName: string): Promise<void>;
  
  // 获取队列长度
  count(queueName: string): Promise<number>;
  
  // 获取任务
  getJob(queueName: string, jobId: string): Promise<JobData | null>;
  
  // 获取队列中的所有任务
  getJobs(queueName: string, options?: any): Promise<JobData[]>;
  
  // 关闭连接
  close(): Promise<void>;
}

// 内存队列适配器
class MemoryQueueAdapter implements QueueAdapter {
  private queues: Map<string, JobData[]> = new Map();
  private options: MemoryQueueOptions;
  
  constructor(options: MemoryQueueOptions = {}) {
    this.options = {
      maxItems: 10000,
      ...options
    };
  }
  
  // 实现适配器接口方法
  // ...
}

// Redis队列适配器
class RedisQueueAdapter implements QueueAdapter {
  private redis: Redis;
  private options: RedisQueueOptions;
  private keyPrefix: string;
  
  constructor(redis: Redis, options: RedisQueueOptions = {}) {
    this.redis = redis;
    this.options = options;
    this.keyPrefix = options.keyPrefix || 'queue:';
  }
  
  // 实现适配器接口方法
  // ...
}

// 数据库队列适配器
class DatabaseQueueAdapter implements QueueAdapter {
  private db: Database;
  private options: DatabaseQueueOptions;
  private tableName: string;
  
  constructor(db: Database, options: DatabaseQueueOptions) {
    this.db = db;
    this.options = options;
    this.tableName = options.tableName;
  }
  
  // 实现适配器接口方法
  // ...
}
```

### 4.3 队列策略

队列策略实现了不同的队列行为：

```typescript
// 基本队列策略
interface QueueStrategy {
  // 为新任务生成ID
  generateId(): string;
  
  // 决定下一个处理的任务
  selectNext(jobs: JobData[]): JobData;
  
  // 决定任务存储顺序
  sortJobs(jobs: JobData[]): JobData[];
  
  // 决定重试策略
  calculateBackoff(job: JobData): number;
}

// FIFO策略（先进先出）
class FIFOStrategy implements QueueStrategy {
  generateId() {
    return uuidv4();
  }
  
  selectNext(jobs: JobData[]) {
    return jobs[0]; // 最早添加的任务
  }
  
  sortJobs(jobs: JobData[]) {
    return [...jobs].sort((a, b) => a.timestamp - b.timestamp);
  }
  
  calculateBackoff(job: JobData) {
    const { backoff } = job.options;
    
    if (!backoff) {
      return 1000; // 默认延迟1秒
    }
    
    if (backoff.type === 'fixed') {
      return backoff.delay;
    }
    
    if (backoff.type === 'exponential') {
      // 指数退避: delay * (2 ^ attempts)
      return backoff.delay * Math.pow(2, job.attemptsMade);
    }
    
    return 1000;
  }
}

// 优先级队列策略
class PriorityStrategy implements QueueStrategy {
  // ...类似实现，但根据priority字段排序
}
```

### 4.4 与框架集成

插件与Stratix框架的集成：

```typescript
// 插件注册函数
const queuePlugin: StratixPlugin = {
  name: 'queue',
  dependencies: ['logger'],
  register: async (app, options: QueueOptions) => {
    // 验证配置
    validateOptions(options);
    
    // 创建队列管理器
    const queueManager = new QueueManagerImpl(app, options);
    
    // 初始化队列实例
    await queueManager.initialize();
    
    // 注册到依赖注入容器
    app.inject('queueManager', () => queueManager);
    
    // 装饰应用实例
    app.decorate('queue', queueManager.default);
    
    // 添加钩子
    app.hook('beforeClose', async () => {
      // 关闭所有队列连接
      await queueManager.close();
    });
    
    // 添加错误处理
    app.errors.QueueError = queueManager.errors.QueueError;
    app.errors.RetryableError = queueManager.errors.RetryableError;
    app.errors.FatalError = queueManager.errors.FatalError;
    app.errors.TimeoutError = queueManager.errors.TimeoutError;
    
    // 日志记录
    app.log.info('Queue plugin registered successfully');
  }
};

export default queuePlugin;
```

## 5. 高级特性

### 5.1 优先级队列

优先级队列允许重要任务优先处理：

```typescript
// 创建优先级队列
app.register(queuePlugin, {
  default: {
    type: 'redis',
    options: {
      // ...Redis配置
      strategy: 'priority' // 使用优先级策略
    }
  }
});

// 添加不同优先级的任务
await queue.add('notifications', 
  { type: 'critical', message: 'System down' },
  { priority: 1 } // 最高优先级
);

await queue.add('notifications', 
  { type: 'warning', message: 'Disk space low' },
  { priority: 5 } // 中等优先级
);

await queue.add('notifications', 
  { type: 'info', message: 'New version available' },
  { priority: 10 } // 低优先级
);

// 任务将按优先级顺序处理，而不是添加顺序
```

### 5.2 延迟队列

延迟队列允许任务在未来某个时间点执行：

```typescript
// 创建延迟队列
app.register(queuePlugin, {
  default: {
    type: 'redis',
    options: {
      // ...Redis配置
      enableDelayed: true
    }
  }
});

// 添加延迟任务
await queue.add('emails', 
  { 
    to: 'user@example.com', 
    template: 'reminder' 
  },
  { 
    delay: 24 * 60 * 60 * 1000 // 24小时后执行
  }
);

// 添加定时任务（指定时间点）
const executeAt = new Date('2023-12-31T23:59:59');
const now = new Date();
const delay = executeAt.getTime() - now.getTime();

await queue.add('yearEndTasks', 
  { task: 'generateReport' },
  { delay }
);

// 添加周期性任务（通常结合cron插件）
cron.schedule('0 9 * * *', async () => { // 每天早上9点
  await queue.add('dailyTasks', { task: 'syncData' });
});
```

### 5.3 死信队列

死信队列存储无法正常处理的任务：

```typescript
// 配置死信队列
app.register(queuePlugin, {
  default: {
    type: 'redis',
    options: {
      // ...Redis配置
      
      // 启用死信队列
      deadLetter: {
        enabled: true,
        queueName: 'failed-jobs',
        maxSize: 1000
      }
    }
  }
});

// 手动将任务移至死信队列
queue.process('importData', async (job) => {
  try {
    // 尝试处理任务
    const result = await importData(job.data);
    return result;
  } catch (error) {
    // 如果是不可恢复的错误，移至死信队列
    if (error.code === 'DATA_CORRUPT') {
      await job.moveToDeadLetter('Data is corrupted: ' + error.message);
    } else {
      // 其他错误可以重试
      throw error;
    }
  }
});

// 处理死信队列
queue.process('failed-jobs', async (job) => {
  const { originalQueue, originalData, reason, attemptsMade } = job.data;
  
  // 记录失败任务
  await logFailedJob({
    queue: originalQueue,
    data: originalData,
    reason,
    attempts: attemptsMade
  });
  
  // 如果需要，可以尝试重新处理或修复数据
  if (canRepair(originalData)) {
    const repairedData = repairData(originalData);
    await queue.add(originalQueue, repairedData);
  }
  
  // 标记死信任务已处理
  return { processed: true };
});
```

### 5.4 队列监控

实时监控队列状态：

```typescript
// 注册监控服务
app.register(async (app) => {
  const queue = app.queue;
  const metrics = await app.resolve('metrics');
  
  // 注册队列监控端点
  app.get('/api/queues', async (req, reply) => {
    const queues = [];
    
    // 遍历所有队列
    for (const queueName of await queue.getQueueNames()) {
      const status = await queue.getStatus(queueName);
      const waitingCount = await queue.countByState(queueName, 'waiting');
      const activeCount = await queue.countByState(queueName, 'active');
      const completedCount = await queue.countByState(queueName, 'completed');
      const failedCount = await queue.countByState(queueName, 'failed');
      
      queues.push({
        name: queueName,
        status,
        counts: {
          waiting: waitingCount,
          active: activeCount,
          completed: completedCount,
          failed: failedCount,
          total: waitingCount + activeCount + completedCount + failedCount
        }
      });
    }
    
    return { queues };
  });
  
  // 监听队列事件以收集指标
  queue.on('completed', (job) => {
    metrics.increment(`queue.${job.queue}.completed`);
    metrics.histogram(`queue.${job.queue}.processingTime`, 
      job.finishedOn - job.processedOn);
  });
  
  queue.on('failed', (job) => {
    metrics.increment(`queue.${job.queue}.failed`);
  });
  
  // 定期发布队列健康状态
  setInterval(async () => {
    for (const queueName of await queue.getQueueNames()) {
      const waitingCount = await queue.countByState(queueName, 'waiting');
      metrics.gauge(`queue.${queueName}.waiting`, waitingCount);
      
      const activeCount = await queue.countByState(queueName, 'active');
      metrics.gauge(`queue.${queueName}.active`, activeCount);
    }
  }, 30000); // 每30秒
});
``` 