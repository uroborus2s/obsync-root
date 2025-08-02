# @stratix/queue

高可靠、基于Redis Streams的消息队列系统，支持多生产者多消费者模式、优先级队列、延迟消息、重试机制和完整的监控功能。

## ✨ 特性

- 🚀 **高性能**: 基于Redis Streams，支持高并发消息处理
- 🔄 **多模式**: 支持单实例和集群模式Redis
- 📊 **优先级队列**: 支持0-9级消息优先级
- ⏰ **延迟消息**: 支持定时和延迟消息发送
- 🔁 **重试机制**: 支持指数退避、线性退避等多种重试策略
- 📈 **监控告警**: 完整的指标收集和健康检查
- 🛡️ **类型安全**: 完整的TypeScript类型定义
- 🧪 **测试覆盖**: 完整的单元测试和集成测试

## 📦 安装

```bash
npm install @stratix/queue
# 或
pnpm add @stratix/queue
# 或
yarn add @stratix/queue
```

## 🚀 快速开始

### 基础使用

```typescript
import { QueueManager, Producer, Consumer } from '@stratix/queue';

// 1. 创建队列管理器
const queueManager = new QueueManager({
  redis: {
    single: {
      host: 'localhost',
      port: 6379
    }
  }
});

// 2. 连接并启动
await queueManager.connect();
await queueManager.start();

// 3. 创建队列
const queue = await queueManager.createQueue('task-queue');

// 4. 创建生产者
const producer = new Producer(queue);
await producer.start();

// 5. 发送消息
await producer.send({
  payload: { type: 'email', to: 'user@example.com' },
  priority: 5
});

// 6. 创建消费者
const consumer = new Consumer(
  queue,
  async (result) => {
    console.log('收到消息:', result.message.payload);
    await result.ack(); // 确认消息
  },
  queueManager['connectionManager']
);

await consumer.start();
```

### Redis集群模式

```typescript
const queueManager = new QueueManager({
  redis: {
    cluster: {
      nodes: [
        { host: 'localhost', port: 7000 },
        { host: 'localhost', port: 7001 },
        { host: 'localhost', port: 7002 }
      ]
    }
  }
});
```

### 优先级和延迟消息

```typescript
// 高优先级消息
await producer.sendPriority({
  payload: { type: 'urgent-alert' }
}, 9);

// 延迟消息（1分钟后执行）
await producer.sendDelayed({
  payload: { type: 'reminder' }
}, 60000);

// 批量发送
const messages = [
  { payload: { id: 1 } },
  { payload: { id: 2 } },
  { payload: { id: 3 } }
];
await producer.sendBatch(messages);
```

### 重试机制

```typescript
import { createRetryPolicy, withRetry } from '@stratix/queue';

// 创建重试策略
const retryPolicy = createRetryPolicy('exponential', {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000
});

// 使用重试执行操作
await withRetry(
  async () => {
    // 可能失败的操作
    await someUnreliableOperation();
  },
  retryPolicy
);
```

### 监控和健康检查

```typescript
// 健康检查
const health = await queueManager.healthCheck();
console.log('系统健康:', health.healthy);

// 获取指标
const metrics = await queueManager.getMetrics();
console.log('队列指标:', metrics.queues);

// 生产者指标
const producerMetrics = producer.getMetrics();
console.log('发送消息数:', producerMetrics.messagesSent);

// 消费者指标
const consumerMetrics = consumer.getMetrics();
console.log('处理消息数:', consumerMetrics.messagesProcessed);
```

## 📖 API文档

### QueueManager

队列管理器是整个系统的核心，负责管理Redis连接和队列实例。

```typescript
interface QueueManagerConfig {
  redis: RedisConnectionConfig;
  defaultQueue?: QueueConfig;
}

class QueueManager {
  constructor(config: QueueManagerConfig);
  
  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // 队列管理
  createQueue(name: string, config?: QueueConfig): Promise<IQueue>;
  getQueue(name: string): IQueue | null;
  deleteQueue(name: string): Promise<boolean>;
  listQueues(): string[];
  
  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // 监控
  healthCheck(): Promise<HealthStatus>;
  getMetrics(): Promise<Metrics>;
}
```

### Producer

生产者负责发送消息到队列。

```typescript
interface ProducerConfig {
  batchSize?: number;
  batchTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class Producer<T = any> {
  constructor(queue: IQueue<T>, config?: ProducerConfig);
  
  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  
  // 消息发送
  send(message: Message<T>, options?: SendOptions): Promise<SendResult>;
  sendBatch(messages: Message<T>[]): Promise<SendResult[]>;
  sendPriority(message: Message<T>, priority: number): Promise<SendResult>;
  sendDelayed(message: Message<T>, delay: number): Promise<SendResult>;
  
  // 指标
  getMetrics(): ProducerMetrics;
  resetMetrics(): void;
}
```

### Consumer

消费者负责从队列接收和处理消息。

```typescript
interface ConsumerOptions {
  consumerId?: string;
  consumerGroup?: string;
  batchSize?: number;
  timeout?: number;
  autoAck?: boolean;
  maxRetries?: number;
  concurrency?: number;
}

class Consumer<T = any> {
  constructor(
    queue: IQueue<T>,
    handler: MessageHandler<T>,
    connectionManager: RedisConnectionManager,
    options?: ConsumerOptions
  );
  
  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  
  // 消费控制
  pause(): void;
  resume(): void;
  
  // 消息确认
  ack(messageId: string): Promise<void>;
  nack(messageId: string, requeue?: boolean): Promise<void>;
  
  // 指标
  getMetrics(): ConsumerMetrics;
  resetMetrics(): void;
}
```

## 🔧 配置选项

### Redis配置

```typescript
interface RedisConnectionConfig {
  // 单实例模式
  single?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  
  // 集群模式
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
    options?: ClusterOptions;
  };
  
  // 连接池配置
  pool?: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
  
  // 重试配置
  retryAttempts?: number;
  retryDelay?: number;
}
```

### 队列配置

```typescript
interface QueueConfig {
  maxLength?: number;        // 队列最大长度
  priority?: boolean;        // 是否启用优先级
  retryAttempts?: number;    // 重试次数
  deadLetterQueue?: string;  // 死信队列
  serialization?: 'json' | 'msgpack' | 'protobuf';
}
```

## 📊 监控指标

系统提供完整的监控指标：

- **队列指标**: 消息数量、处理速度、错误率
- **生产者指标**: 发送速度、批次大小、延迟
- **消费者指标**: 处理速度、并发数、消费延迟
- **系统指标**: 内存使用、CPU使用、连接数

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test queue-manager

# 生成覆盖率报告
pnpm test:coverage
```

## 📝 示例

查看 `examples/` 目录获取更多使用示例：

- `basic-usage.ts` - 基础使用示例
- `cluster-mode.ts` - 集群模式示例
- `priority-queue.ts` - 优先级队列示例
- `retry-mechanism.ts` - 重试机制示例
- `monitoring.ts` - 监控和指标示例

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License
