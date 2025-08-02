# @stratix/queue API接口设计

## 🎯 设计原则

### API设计理念
1. **简单易用**: 提供直观的API接口
2. **类型安全**: 完整的TypeScript类型定义
3. **函数式**: 支持函数式编程模式
4. **可扩展**: 支持插件和中间件
5. **向后兼容**: 保持API稳定性

### 编程范式
- **Promise/Async**: 异步操作支持
- **Event-Driven**: 事件驱动架构
- **Functional**: 函数式编程支持
- **Reactive**: 响应式编程支持

## 📚 核心API

### 1. QueueManager (队列管理器)

```typescript
interface QueueManagerConfig {
  redis: {
    cluster: {
      nodes: Array<{ host: string; port: number }>;
      options?: ClusterOptions;
    };
    options?: RedisOptions;
  };
  queues: {
    [queueName: string]: QueueConfig;
  };
  monitoring?: MonitoringConfig;
  security?: SecurityConfig;
}

class QueueManager {
  constructor(config: QueueManagerConfig);
  
  // 队列管理
  createQueue(name: string, config?: QueueConfig): Promise<Queue>;
  getQueue(name: string): Queue | null;
  deleteQueue(name: string): Promise<boolean>;
  listQueues(): string[];
  
  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // 健康检查
  healthCheck(): Promise<HealthStatus>;
  getMetrics(): Promise<Metrics>;
  
  // 事件监听
  on(event: 'connected' | 'disconnected' | 'error', handler: Function): void;
  off(event: string, handler: Function): void;
}
```

### 2. Queue (队列操作)

```typescript
interface QueueConfig {
  maxLength?: number;           // 队列最大长度
  retention?: number;           // 消息保留时间(ms)
  deadLetterQueue?: string;     // 死信队列名称
  retryAttempts?: number;       // 最大重试次数
  retryDelay?: number;          // 重试延迟(ms)
  priority?: boolean;           // 是否支持优先级
  compression?: boolean;        // 是否压缩消息
}

interface Message<T = any> {
  id?: string;                  // 消息ID
  payload: T;                   // 消息内容
  priority?: number;            // 优先级 (0-9)
  delay?: number;               // 延迟时间(ms)
  headers?: Record<string, any>; // 消息头
  timestamp?: number;           // 时间戳
}

interface SendOptions {
  priority?: number;
  delay?: number;
  headers?: Record<string, any>;
  timeout?: number;
}

interface SendResult {
  messageId: string;
  timestamp: number;
  queue: string;
}

class Queue<T = any> {
  constructor(name: string, config: QueueConfig);
  
  // 消息发送
  send(message: Message<T>, options?: SendOptions): Promise<SendResult>;
  sendBatch(messages: Message<T>[], options?: SendOptions): Promise<SendResult[]>;
  
  // 延迟消息
  sendDelayed(message: Message<T>, delay: number): Promise<SendResult>;
  
  // 优先级消息
  sendPriority(message: Message<T>, priority: number): Promise<SendResult>;
  
  // 消息消费
  createConsumer(groupName: string, options?: ConsumerOptions): Consumer<T>;
  
  // 队列管理
  purge(): Promise<number>;
  getLength(): Promise<number>;
  getInfo(): Promise<QueueInfo>;
  
  // 事件监听
  on(event: QueueEvent, handler: Function): void;
  off(event: QueueEvent, handler: Function): void;
}
```

### 3. Producer (生产者)

```typescript
interface ProducerConfig {
  queue: string;
  batchSize?: number;           // 批量发送大小
  batchTimeout?: number;        // 批量超时时间
  compression?: boolean;        // 是否压缩
  serialization?: 'json' | 'msgpack' | 'protobuf';
}

interface ProducerMetrics {
  messagesSent: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
}

class Producer<T = any> {
  constructor(queue: Queue<T>, config?: ProducerConfig);
  
  // 消息发送
  send(payload: T, options?: SendOptions): Promise<SendResult>;
  sendBatch(payloads: T[], options?: SendOptions): Promise<SendResult[]>;
  
  // 模板消息
  sendTemplate(template: string, data: any): Promise<SendResult>;
  
  // 事务支持
  transaction(): ProducerTransaction<T>;
  
  // 性能监控
  getMetrics(): ProducerMetrics;
  
  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // 事件监听
  on(event: 'sent' | 'error' | 'batch-sent', handler: Function): void;
}

// 生产者事务
class ProducerTransaction<T = any> {
  send(payload: T, options?: SendOptions): ProducerTransaction<T>;
  commit(): Promise<SendResult[]>;
  rollback(): Promise<void>;
}
```

### 4. Consumer (消费者)

```typescript
interface ConsumerOptions {
  groupName: string;            // 消费者组名称
  consumerName?: string;        // 消费者名称
  batchSize?: number;           // 批量消费大小
  timeout?: number;             // 消费超时时间
  autoAck?: boolean;            // 自动确认
  maxRetries?: number;          // 最大重试次数
  retryDelay?: number;          // 重试延迟
  deadLetterQueue?: string;     // 死信队列
}

interface ConsumeResult<T = any> {
  message: Message<T>;
  ack(): Promise<void>;         // 确认消息
  nack(): Promise<void>;        // 拒绝消息
  retry(delay?: number): Promise<void>; // 重试消息
}

interface ConsumerMetrics {
  messagesProcessed: number;
  messagesPerSecond: number;
  averageProcessingTime: number;
  errorRate: number;
  pendingMessages: number;
}

class Consumer<T = any> {
  constructor(queue: Queue<T>, options: ConsumerOptions);
  
  // 消息消费
  consume(handler: MessageHandler<T>): Promise<void>;
  consumeBatch(handler: BatchMessageHandler<T>): Promise<void>;
  
  // 流式消费
  stream(): AsyncIterable<ConsumeResult<T>>;
  
  // 消费控制
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  
  // 消费者组管理
  joinGroup(): Promise<void>;
  leaveGroup(): Promise<void>;
  
  // 性能监控
  getMetrics(): ConsumerMetrics;
  
  // 事件监听
  on(event: 'message' | 'error' | 'batch', handler: Function): void;
}

// 消息处理器类型
type MessageHandler<T> = (result: ConsumeResult<T>) => Promise<void>;
type BatchMessageHandler<T> = (results: ConsumeResult<T>[]) => Promise<void>;
```

### 5. Monitor (监控器)

```typescript
interface MonitoringConfig {
  enabled: boolean;
  interval?: number;            // 监控间隔(ms)
  metrics?: MetricsConfig;
  alerts?: AlertConfig[];
}

interface Metrics {
  queues: QueueMetrics[];
  producers: ProducerMetrics[];
  consumers: ConsumerMetrics[];
  cluster: ClusterMetrics;
  system: SystemMetrics;
}

interface QueueMetrics {
  name: string;
  length: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  consumers: number;
  producers: number;
}

interface ClusterMetrics {
  nodes: NodeMetrics[];
  totalMemory: number;
  usedMemory: number;
  connections: number;
  commandsPerSecond: number;
}

class Monitor {
  constructor(queueManager: QueueManager, config: MonitoringConfig);
  
  // 指标收集
  getMetrics(): Promise<Metrics>;
  getQueueMetrics(queueName: string): Promise<QueueMetrics>;
  getClusterMetrics(): Promise<ClusterMetrics>;
  
  // 健康检查
  healthCheck(): Promise<HealthStatus>;
  
  // 告警管理
  addAlert(alert: AlertConfig): void;
  removeAlert(alertId: string): void;
  
  // 监控控制
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // 事件监听
  on(event: 'metrics' | 'alert' | 'health', handler: Function): void;
}
```

## 🔧 工具类API

### 1. Serializer (序列化器)

```typescript
interface SerializerOptions {
  type: 'json' | 'msgpack' | 'protobuf';
  compression?: boolean;
  schema?: any;
}

class Serializer {
  static json(options?: JsonOptions): Serializer;
  static msgpack(options?: MsgpackOptions): Serializer;
  static protobuf(schema: any, options?: ProtobufOptions): Serializer;
  
  serialize(data: any): Buffer;
  deserialize<T>(buffer: Buffer): T;
}
```

### 2. RetryPolicy (重试策略)

```typescript
interface RetryPolicyOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter?: boolean;
}

class RetryPolicy {
  static exponential(options: RetryPolicyOptions): RetryPolicy;
  static linear(options: RetryPolicyOptions): RetryPolicy;
  static fixed(delay: number, maxAttempts: number): RetryPolicy;
  
  getDelay(attempt: number): number;
  shouldRetry(attempt: number, error: Error): boolean;
}
```

### 3. LoadBalancer (负载均衡器)

```typescript
interface LoadBalancerOptions {
  strategy: 'round-robin' | 'weighted' | 'least-connections';
  weights?: number[];
  healthCheck?: boolean;
}

class LoadBalancer {
  constructor(nodes: RedisNode[], options: LoadBalancerOptions);
  
  getNode(): RedisNode;
  addNode(node: RedisNode, weight?: number): void;
  removeNode(nodeId: string): void;
  updateWeights(weights: number[]): void;
}
```

## 📊 事件系统

### 事件类型定义

```typescript
// 队列事件
type QueueEvent = 
  | 'message-sent'
  | 'message-received'
  | 'message-acked'
  | 'message-nacked'
  | 'message-retried'
  | 'message-failed'
  | 'queue-created'
  | 'queue-deleted'
  | 'consumer-joined'
  | 'consumer-left';

// 系统事件
type SystemEvent =
  | 'connected'
  | 'disconnected'
  | 'node-added'
  | 'node-removed'
  | 'failover'
  | 'error'
  | 'warning';

// 监控事件
type MonitorEvent =
  | 'metrics-collected'
  | 'alert-triggered'
  | 'health-check'
  | 'threshold-exceeded';
```

### 事件数据结构

```typescript
interface QueueEventData {
  queue: string;
  messageId?: string;
  consumer?: string;
  timestamp: number;
  metadata?: any;
}

interface SystemEventData {
  type: string;
  node?: string;
  error?: Error;
  timestamp: number;
  metadata?: any;
}

interface MonitorEventData {
  type: string;
  metrics?: Metrics;
  alert?: AlertInfo;
  timestamp: number;
}
```

## 🚀 使用示例

### 基础使用

```typescript
import { QueueManager, Queue, Producer, Consumer } from '@stratix/queue';

// 创建队列管理器
const queueManager = new QueueManager({
  redis: {
    cluster: {
      nodes: [
        { host: 'redis-1', port: 6379 },
        { host: 'redis-2', port: 6379 },
        { host: 'redis-3', port: 6379 }
      ]
    }
  }
});

// 连接Redis集群
await queueManager.connect();

// 创建队列
const taskQueue = await queueManager.createQueue('tasks', {
  maxLength: 10000,
  retryAttempts: 3,
  deadLetterQueue: 'tasks-dlq'
});

// 创建生产者
const producer = new Producer(taskQueue);
await producer.start();

// 发送消息
await producer.send({
  type: 'email',
  recipient: 'user@example.com',
  subject: 'Welcome!'
});

// 创建消费者
const consumer = new Consumer(taskQueue, {
  groupName: 'email-workers',
  batchSize: 10
});

// 消费消息
await consumer.consume(async (result) => {
  const { message, ack, nack } = result;
  
  try {
    // 处理消息
    await processEmail(message.payload);
    await ack(); // 确认消息
  } catch (error) {
    console.error('处理失败:', error);
    await nack(); // 拒绝消息，触发重试
  }
});

await consumer.start();
```

### 高级功能

```typescript
// 延迟消息
await producer.send({
  type: 'reminder',
  message: '会议提醒'
}, {
  delay: 60000 // 1分钟后发送
});

// 优先级消息
await producer.send({
  type: 'urgent',
  message: '紧急通知'
}, {
  priority: 9 // 高优先级
});

// 批量发送
await producer.sendBatch([
  { type: 'notification', user: 'user1' },
  { type: 'notification', user: 'user2' },
  { type: 'notification', user: 'user3' }
]);

// 流式消费
for await (const result of consumer.stream()) {
  const { message, ack } = result;
  await processMessage(message);
  await ack();
}

// 事务支持
const transaction = producer.transaction();
transaction
  .send({ type: 'order', id: 1 })
  .send({ type: 'payment', orderId: 1 })
  .send({ type: 'notification', orderId: 1 });

await transaction.commit();
```

## 📋 类型定义

### 完整类型导出

```typescript
// 核心类型
export {
  QueueManager,
  Queue,
  Producer,
  Consumer,
  Monitor
};

// 配置类型
export {
  QueueManagerConfig,
  QueueConfig,
  ProducerConfig,
  ConsumerOptions,
  MonitoringConfig
};

// 数据类型
export {
  Message,
  SendResult,
  ConsumeResult,
  Metrics,
  HealthStatus
};

// 事件类型
export {
  QueueEvent,
  SystemEvent,
  MonitorEvent,
  QueueEventData,
  SystemEventData,
  MonitorEventData
};

// 工具类型
export {
  Serializer,
  RetryPolicy,
  LoadBalancer
};
```
