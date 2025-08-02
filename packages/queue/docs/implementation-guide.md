# @stratix/queue 实现指导文档

## 🎯 实现路线图

### 开发阶段规划

#### 第一阶段：核心基础 (2-3周)
- [x] 项目结构搭建
- [ ] Redis连接管理
- [ ] 基础消息发送/接收
- [ ] 消费者组支持
- [ ] 消息确认机制
- [ ] 基础测试用例

#### 第二阶段：高级功能 (3-4周)
- [ ] 延迟消息实现
- [ ] 重试机制
- [ ] 死信队列
- [ ] 批量操作
- [ ] 消息优先级
- [ ] 性能优化

#### 第三阶段：集群支持 (2-3周)
- [ ] Redis Cluster支持
- [ ] 负载均衡
- [ ] 故障转移
- [ ] 数据分片
- [ ] 集群监控

#### 第四阶段：监控运维 (2-3周)
- [ ] 性能监控
- [ ] 健康检查
- [ ] 管理工具
- [ ] 可视化界面
- [ ] 文档完善

## 🏗️ 项目结构

### 目录结构设计

```
packages/queue/
├── src/
│   ├── core/                 # 核心模块
│   │   ├── queue-manager.ts  # 队列管理器
│   │   ├── queue.ts          # 队列实现
│   │   ├── producer.ts       # 生产者
│   │   ├── consumer.ts       # 消费者
│   │   └── index.ts          # 核心导出
│   ├── redis/                # Redis相关
│   │   ├── connection.ts     # 连接管理
│   │   ├── cluster.ts        # 集群支持
│   │   ├── commands.ts       # Redis命令封装
│   │   └── index.ts          # Redis导出
│   ├── serialization/        # 序列化
│   │   ├── json.ts           # JSON序列化
│   │   ├── msgpack.ts        # MessagePack序列化
│   │   ├── protobuf.ts       # Protocol Buffers
│   │   └── index.ts          # 序列化导出
│   ├── retry/                # 重试机制
│   │   ├── policy.ts         # 重试策略
│   │   ├── exponential.ts    # 指数退避
│   │   ├── linear.ts         # 线性退避
│   │   └── index.ts          # 重试导出
│   ├── monitoring/           # 监控模块
│   │   ├── metrics.ts        # 指标收集
│   │   ├── health.ts         # 健康检查
│   │   ├── alerts.ts         # 告警管理
│   │   └── index.ts          # 监控导出
│   ├── utils/                # 工具函数
│   │   ├── logger.ts         # 日志工具
│   │   ├── validator.ts      # 参数验证
│   │   ├── hash.ts           # 哈希工具
│   │   └── index.ts          # 工具导出
│   ├── types/                # 类型定义
│   │   ├── queue.ts          # 队列类型
│   │   ├── message.ts        # 消息类型
│   │   ├── config.ts         # 配置类型
│   │   └── index.ts          # 类型导出
│   ├── errors/               # 错误定义
│   │   ├── queue-error.ts    # 队列错误
│   │   ├── redis-error.ts    # Redis错误
│   │   └── index.ts          # 错误导出
│   ├── examples/             # 使用示例
│   │   ├── basic.ts          # 基础使用
│   │   ├── advanced.ts       # 高级功能
│   │   └── cluster.ts        # 集群使用
│   └── index.ts              # 主入口文件
├── tests/                    # 测试文件
│   ├── unit/                 # 单元测试
│   ├── integration/          # 集成测试
│   ├── performance/          # 性能测试
│   └── fixtures/             # 测试数据
├── docs/                     # 文档目录
├── scripts/                  # 构建脚本
├── package.json              # 包配置
├── tsconfig.json             # TypeScript配置
├── vitest.config.ts          # 测试配置
└── README.md                 # 项目说明
```

## 🔧 核心模块实现

### 1. Redis连接管理

```typescript
// src/redis/connection.ts
import Redis, { Cluster, ClusterOptions, RedisOptions } from 'ioredis';
import { EventEmitter } from 'events';

export interface ConnectionConfig {
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
    options?: ClusterOptions;
  };
  single?: {
    host: string;
    port: number;
    options?: RedisOptions;
  };
  poolSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class RedisConnectionManager extends EventEmitter {
  private connections: Map<string, Redis | Cluster> = new Map();
  private config: ConnectionConfig;
  private isConnected = false;

  constructor(config: ConnectionConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      if (this.config.cluster) {
        const cluster = new Cluster(
          this.config.cluster.nodes,
          this.config.cluster.options
        );
        
        cluster.on('connect', () => {
          this.isConnected = true;
          this.emit('connected');
        });
        
        cluster.on('error', (error) => {
          this.emit('error', error);
        });
        
        this.connections.set('default', cluster);
      } else if (this.config.single) {
        const redis = new Redis({
          host: this.config.single.host,
          port: this.config.single.port,
          ...this.config.single.options
        });
        
        redis.on('connect', () => {
          this.isConnected = true;
          this.emit('connected');
        });
        
        redis.on('error', (error) => {
          this.emit('error', error);
        });
        
        this.connections.set('default', redis);
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  getConnection(name = 'default'): Redis | Cluster {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`Connection '${name}' not found`);
    }
    return connection;
  }

  async disconnect(): Promise<void> {
    for (const [name, connection] of this.connections) {
      await connection.disconnect();
      this.connections.delete(name);
    }
    this.isConnected = false;
    this.emit('disconnected');
  }

  isConnectionHealthy(): boolean {
    return this.isConnected && this.connections.size > 0;
  }
}
```

### 2. 队列核心实现

```typescript
// src/core/queue.ts
import { EventEmitter } from 'events';
import { RedisConnectionManager } from '../redis/connection';
import { Message, QueueConfig, SendOptions, SendResult } from '../types';

export class Queue<T = any> extends EventEmitter {
  private name: string;
  private config: QueueConfig;
  private redis: RedisConnectionManager;
  private streamKey: string;
  private dlqKey: string;

  constructor(
    name: string, 
    config: QueueConfig, 
    redis: RedisConnectionManager
  ) {
    super();
    this.name = name;
    this.config = config;
    this.redis = redis;
    this.streamKey = `queue:${name}`;
    this.dlqKey = `queue:${name}:dlq`;
  }

  async send(message: Message<T>, options?: SendOptions): Promise<SendResult> {
    const connection = this.redis.getConnection();
    
    const messageData = {
      payload: JSON.stringify(message.payload),
      priority: options?.priority || message.priority || 0,
      delay: options?.delay || message.delay || 0,
      headers: JSON.stringify(options?.headers || message.headers || {}),
      timestamp: Date.now(),
      id: message.id || this.generateMessageId()
    };

    try {
      let messageId: string;
      
      if (messageData.delay > 0) {
        // 延迟消息处理
        messageId = await this.sendDelayedMessage(messageData);
      } else {
        // 立即发送
        messageId = await connection.xadd(
          this.streamKey,
          '*',
          ...Object.entries(messageData).flat()
        );
      }

      const result: SendResult = {
        messageId,
        timestamp: messageData.timestamp,
        queue: this.name
      };

      this.emit('message-sent', result);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async sendBatch(
    messages: Message<T>[], 
    options?: SendOptions
  ): Promise<SendResult[]> {
    const connection = this.redis.getConnection();
    const pipeline = connection.pipeline();
    
    const results: SendResult[] = [];
    
    for (const message of messages) {
      const messageData = {
        payload: JSON.stringify(message.payload),
        priority: options?.priority || message.priority || 0,
        delay: options?.delay || message.delay || 0,
        headers: JSON.stringify(options?.headers || message.headers || {}),
        timestamp: Date.now(),
        id: message.id || this.generateMessageId()
      };
      
      pipeline.xadd(
        this.streamKey,
        '*',
        ...Object.entries(messageData).flat()
      );
    }
    
    const pipelineResults = await pipeline.exec();
    
    pipelineResults?.forEach((result, index) => {
      if (result[0] === null) {
        const messageId = result[1] as string;
        results.push({
          messageId,
          timestamp: Date.now(),
          queue: this.name
        });
      }
    });
    
    this.emit('batch-sent', results);
    return results;
  }

  private async sendDelayedMessage(messageData: any): Promise<string> {
    const connection = this.redis.getConnection();
    const delayKey = `queue:${this.name}:delayed`;
    const executeTime = Date.now() + messageData.delay;
    
    // 将延迟消息存储到有序集合中
    await connection.zadd(delayKey, executeTime, JSON.stringify(messageData));
    
    return `delayed:${executeTime}:${messageData.id}`;
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getLength(): Promise<number> {
    const connection = this.redis.getConnection();
    return await connection.xlen(this.streamKey);
  }

  async purge(): Promise<number> {
    const connection = this.redis.getConnection();
    const length = await this.getLength();
    await connection.del(this.streamKey);
    return length;
  }
}
```

### 3. 生产者实现

```typescript
// src/core/producer.ts
import { EventEmitter } from 'events';
import { Queue } from './queue';
import { ProducerConfig, ProducerMetrics, SendOptions, SendResult } from '../types';

export class Producer<T = any> extends EventEmitter {
  private queue: Queue<T>;
  private config: ProducerConfig;
  private metrics: ProducerMetrics;
  private batchBuffer: T[] = [];
  private batchTimer?: NodeJS.Timeout;
  private isStarted = false;

  constructor(queue: Queue<T>, config?: ProducerConfig) {
    super();
    this.queue = queue;
    this.config = {
      batchSize: 100,
      batchTimeout: 1000,
      compression: false,
      serialization: 'json',
      ...config
    };
    
    this.metrics = {
      messagesSent: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      errorRate: 0
    };
  }

  async start(): Promise<void> {
    if (this.isStarted) return;
    
    this.isStarted = true;
    this.startBatchTimer();
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isStarted) return;
    
    this.isStarted = false;
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    // 发送剩余的批量消息
    if (this.batchBuffer.length > 0) {
      await this.flushBatch();
    }
    
    this.emit('stopped');
  }

  async send(payload: T, options?: SendOptions): Promise<SendResult> {
    if (!this.isStarted) {
      throw new Error('Producer not started');
    }

    const startTime = Date.now();
    
    try {
      const result = await this.queue.send({ payload }, options);
      
      this.updateMetrics(Date.now() - startTime, false);
      this.emit('sent', result);
      
      return result;
    } catch (error) {
      this.updateMetrics(Date.now() - startTime, true);
      this.emit('error', error);
      throw error;
    }
  }

  async sendBatch(payloads: T[], options?: SendOptions): Promise<SendResult[]> {
    if (!this.isStarted) {
      throw new Error('Producer not started');
    }

    const messages = payloads.map(payload => ({ payload }));
    const results = await this.queue.sendBatch(messages, options);
    
    this.emit('batch-sent', results);
    return results;
  }

  // 添加到批量缓冲区
  addToBatch(payload: T): void {
    if (!this.isStarted) return;
    
    this.batchBuffer.push(payload);
    
    if (this.batchBuffer.length >= this.config.batchSize!) {
      this.flushBatch();
    }
  }

  private startBatchTimer(): void {
    this.batchTimer = setTimeout(() => {
      if (this.batchBuffer.length > 0) {
        this.flushBatch();
      }
      if (this.isStarted) {
        this.startBatchTimer();
      }
    }, this.config.batchTimeout);
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;
    
    const batch = [...this.batchBuffer];
    this.batchBuffer = [];
    
    try {
      await this.sendBatch(batch);
    } catch (error) {
      this.emit('error', error);
    }
  }

  private updateMetrics(latency: number, isError: boolean): void {
    this.metrics.messagesSent++;
    
    // 更新平均延迟
    this.metrics.averageLatency = 
      (this.metrics.averageLatency + latency) / 2;
    
    // 更新错误率
    if (isError) {
      this.metrics.errorRate = 
        (this.metrics.errorRate * (this.metrics.messagesSent - 1) + 1) / 
        this.metrics.messagesSent;
    }
  }

  getMetrics(): ProducerMetrics {
    return { ...this.metrics };
  }
}
```

### 4. 消费者实现

```typescript
// src/core/consumer.ts
import { EventEmitter } from 'events';
import { Queue } from './queue';
import { 
  ConsumerOptions, 
  ConsumeResult, 
  ConsumerMetrics, 
  MessageHandler 
} from '../types';

export class Consumer<T = any> extends EventEmitter {
  private queue: Queue<T>;
  private options: ConsumerOptions;
  private metrics: ConsumerMetrics;
  private isRunning = false;
  private consumerName: string;
  private groupName: string;

  constructor(queue: Queue<T>, options: ConsumerOptions) {
    super();
    this.queue = queue;
    this.options = {
      batchSize: 1,
      timeout: 5000,
      autoAck: false,
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };
    
    this.groupName = options.groupName;
    this.consumerName = options.consumerName || 
      `consumer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    this.metrics = {
      messagesProcessed: 0,
      messagesPerSecond: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      pendingMessages: 0
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    await this.createConsumerGroup();
    this.isRunning = true;
    this.emit('started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.emit('stopped');
  }

  async consume(handler: MessageHandler<T>): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Consumer not started');
    }

    while (this.isRunning) {
      try {
        const messages = await this.readMessages();
        
        for (const message of messages) {
          await this.processMessage(message, handler);
        }
      } catch (error) {
        this.emit('error', error);
        await this.sleep(1000); // 错误后等待1秒
      }
    }
  }

  private async createConsumerGroup(): Promise<void> {
    const connection = this.queue['redis'].getConnection();
    const streamKey = this.queue['streamKey'];
    
    try {
      await connection.xgroup(
        'CREATE',
        streamKey,
        this.groupName,
        '$',
        'MKSTREAM'
      );
    } catch (error) {
      // 消费者组可能已存在，忽略错误
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  private async readMessages(): Promise<any[]> {
    const connection = this.queue['redis'].getConnection();
    const streamKey = this.queue['streamKey'];
    
    const result = await connection.xreadgroup(
      'GROUP',
      this.groupName,
      this.consumerName,
      'COUNT',
      this.options.batchSize!,
      'BLOCK',
      this.options.timeout!,
      'STREAMS',
      streamKey,
      '>'
    );
    
    if (!result || result.length === 0) {
      return [];
    }
    
    return result[0][1]; // 返回消息数组
  }

  private async processMessage(
    rawMessage: any, 
    handler: MessageHandler<T>
  ): Promise<void> {
    const startTime = Date.now();
    const [messageId, fields] = rawMessage;
    
    try {
      const message = this.parseMessage(fields);
      const result: ConsumeResult<T> = {
        message,
        ack: () => this.ackMessage(messageId),
        nack: () => this.nackMessage(messageId),
        retry: (delay?: number) => this.retryMessage(messageId, delay)
      };
      
      await handler(result);
      
      if (this.options.autoAck) {
        await this.ackMessage(messageId);
      }
      
      this.updateMetrics(Date.now() - startTime, false);
      this.emit('message', result);
    } catch (error) {
      this.updateMetrics(Date.now() - startTime, true);
      this.emit('error', error);
      
      if (!this.options.autoAck) {
        await this.nackMessage(messageId);
      }
    }
  }

  private parseMessage(fields: string[]): any {
    const message: any = {};
    
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      const value = fields[i + 1];
      
      if (key === 'payload') {
        message.payload = JSON.parse(value);
      } else if (key === 'headers') {
        message.headers = JSON.parse(value);
      } else {
        message[key] = value;
      }
    }
    
    return message;
  }

  private async ackMessage(messageId: string): Promise<void> {
    const connection = this.queue['redis'].getConnection();
    const streamKey = this.queue['streamKey'];
    
    await connection.xack(streamKey, this.groupName, messageId);
  }

  private async nackMessage(messageId: string): Promise<void> {
    // Redis Streams没有直接的NACK命令
    // 这里可以实现重新入队逻辑
    console.warn(`Message ${messageId} nacked`);
  }

  private async retryMessage(messageId: string, delay?: number): Promise<void> {
    if (delay) {
      await this.sleep(delay);
    }
    // 实现重试逻辑
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateMetrics(processingTime: number, isError: boolean): void {
    this.metrics.messagesProcessed++;
    
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime + processingTime) / 2;
    
    if (isError) {
      this.metrics.errorRate = 
        (this.metrics.errorRate * (this.metrics.messagesProcessed - 1) + 1) / 
        this.metrics.messagesProcessed;
    }
  }

  getMetrics(): ConsumerMetrics {
    return { ...this.metrics };
  }
}
```

## 🧪 测试策略

### 1. 单元测试

```typescript
// tests/unit/queue.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Queue } from '../../src/core/queue';
import { RedisConnectionManager } from '../../src/redis/connection';

describe('Queue', () => {
  let queue: Queue;
  let redis: RedisConnectionManager;

  beforeEach(async () => {
    redis = new RedisConnectionManager({
      single: { host: 'localhost', port: 6379 }
    });
    await redis.connect();
    
    queue = new Queue('test-queue', {}, redis);
  });

  afterEach(async () => {
    await queue.purge();
    await redis.disconnect();
  });

  it('should send and receive messages', async () => {
    const message = { payload: { test: 'data' } };
    const result = await queue.send(message);
    
    expect(result.messageId).toBeDefined();
    expect(result.queue).toBe('test-queue');
  });

  it('should handle batch sending', async () => {
    const messages = [
      { payload: { id: 1 } },
      { payload: { id: 2 } },
      { payload: { id: 3 } }
    ];
    
    const results = await queue.sendBatch(messages);
    expect(results).toHaveLength(3);
  });
});
```

### 2. 集成测试

```typescript
// tests/integration/producer-consumer.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { QueueManager } from '../../src/core/queue-manager';
import { Producer } from '../../src/core/producer';
import { Consumer } from '../../src/core/consumer';

describe('Producer-Consumer Integration', () => {
  let queueManager: QueueManager;
  let producer: Producer;
  let consumer: Consumer;

  beforeAll(async () => {
    queueManager = new QueueManager({
      redis: {
        single: { host: 'localhost', port: 6379 }
      }
    });
    
    await queueManager.connect();
    
    const queue = await queueManager.createQueue('integration-test');
    producer = new Producer(queue);
    consumer = new Consumer(queue, { groupName: 'test-group' });
    
    await producer.start();
    await consumer.start();
  });

  afterAll(async () => {
    await producer.stop();
    await consumer.stop();
    await queueManager.disconnect();
  });

  it('should process messages end-to-end', async () => {
    const receivedMessages: any[] = [];
    
    consumer.consume(async (result) => {
      receivedMessages.push(result.message);
      await result.ack();
    });
    
    await producer.send({ test: 'message' });
    
    // 等待消息处理
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0].payload.test).toBe('message');
  });
});
```

## 📋 开发检查清单

### 代码质量
- [ ] TypeScript类型完整性
- [ ] ESLint规则通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 性能测试达标

### 功能完整性
- [ ] 基础消息发送/接收
- [ ] 消费者组支持
- [ ] 消息确认机制
- [ ] 重试机制
- [ ] 死信队列
- [ ] 延迟消息
- [ ] 批量操作

### 性能要求
- [ ] 吞吐量 > 10,000 TPS
- [ ] 延迟 < 10ms (P99)
- [ ] 内存使用合理
- [ ] CPU使用优化

### 可靠性
- [ ] 错误处理完善
- [ ] 连接重试机制
- [ ] 数据持久化
- [ ] 故障恢复

### 文档完整性
- [ ] API文档
- [ ] 使用示例
- [ ] 部署指南
- [ ] 故障排除
