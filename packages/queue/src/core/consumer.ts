/**
 * 消费者 - 消息消费和处理
 */

import { EventEmitter } from 'events';
import { RedisConnectionManager } from '../redis/connection.js';
import { RetryPolicyFactory, type RetryPolicy } from '../retry/policy.js';
import {
  BatchMessageHandler,
  ConsumeResult,
  ConsumerMetrics,
  ConsumerOptions,
  IConsumer,
  IQueue,
  Message,
  MessageHandler
} from '../types/index.js';
import { createLogger, generateUUID, Logger, sleep } from '../utils/index.js';
import { DeadLetterQueueManager } from './dead-letter-queue.js';

// 错误类型转换辅助函数
const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};

export class Consumer<T = any> extends EventEmitter implements IConsumer<T> {
  private connectionManager: RedisConnectionManager;
  private logger: Logger;
  private isStarted = false;
  private isConsuming = false;
  private consumerId: string;
  private consumerGroup: string;
  private streamKey: string;
  private deadLetterKey?: string;
  private deadLetterManager?: DeadLetterQueueManager;
  private retryPolicy: RetryPolicy;
  private metrics: ConsumerMetrics;
  private processingPromises: Set<Promise<void>> = new Set();
  private consumeTimer?: NodeJS.Timeout;

  // 实现接口属性
  readonly queue: IQueue<T>;
  readonly config: ConsumerOptions;
  readonly groupName: string;
  readonly consumerName: string;

  constructor(
    queue: IQueue<T>,
    private readonly handler: MessageHandler<T> | BatchMessageHandler<T>,
    connectionManager: RedisConnectionManager,
    private readonly options: ConsumerOptions = {}
  ) {
    super();

    // 初始化接口属性
    this.queue = queue;
    this.config = options;
    this.groupName = options.consumerGroup || `${queue.name}-consumers`;
    this.consumerName = options.consumerId || generateUUID();

    this.connectionManager = connectionManager;
    this.consumerId = this.consumerName;
    this.consumerGroup = this.groupName;
    this.streamKey = `queue:${queue.name}`;

    if (options.deadLetterQueue) {
      this.deadLetterKey = `queue:${options.deadLetterQueue}`;
      this.deadLetterManager = new DeadLetterQueueManager(
        options.deadLetterQueue,
        queue.config,
        connectionManager
      );
    }

    this.logger = createLogger({
      level: 1
    });

    // 初始化重试策略
    this.retryPolicy = options.retryPolicy
      ? typeof options.retryPolicy === 'string'
        ? RetryPolicyFactory.create(options.retryPolicy, {
            maxAttempts: options.maxRetries
          })
        : options.retryPolicy
      : RetryPolicyFactory.createProductionPolicy();

    // 初始化指标
    this.metrics = {
      messagesProcessed: 0,
      messagesPerSecond: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      pendingMessages: 0,
      consumerLag: 0
    };

    // 合并默认配置
    this.options = {
      batchSize: 1,
      timeout: 5000,
      autoAck: false,
      maxRetries: 3,
      retryDelay: 1000,
      concurrency: 1,
      ...options
    };
  }

  /**
   * 启动消费者
   */
  async start(): Promise<void> {
    try {
      if (this.isStarted) {
        return;
      }

      this.logger.info('Starting consumer...');

      // 确保消费者组存在
      await this.ensureConsumerGroup();

      // 开始消费消息
      this.startConsuming();

      this.isStarted = true;
      this.emit('started');
      this.logger.info('Consumer started successfully');
    } catch (error) {
      this.logger.error(
        'Failed to start consumer',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * 停止消费者
   */
  async stop(): Promise<void> {
    try {
      if (!this.isStarted) {
        return;
      }

      this.logger.info('Stopping consumer...');

      // 停止消费
      this.stopConsuming();

      // 等待所有处理中的消息完成
      await this.waitForProcessingComplete();

      this.isStarted = false;
      this.emit('stopped');
      this.logger.info('Consumer stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop consumer', toError(error));
      throw error;
    }
  }

  /**
   * 检查消费者是否运行中
   */
  isRunning(): boolean {
    return this.isStarted;
  }

  /**
   * 消费单条消息
   */
  async consume(_handler: MessageHandler<T>): Promise<void> {
    // 实现接口方法，但实际使用构造函数中的handler
    // 这里可以选择覆盖handler或者忽略参数
  }

  /**
   * 批量消费消息
   */
  async consumeBatch(_handler: BatchMessageHandler<T>): Promise<void> {
    // 实现接口方法，但实际使用构造函数中的handler
    // 这里可以选择覆盖handler或者忽略参数
  }

  /**
   * 暂停消费
   */
  pause(): void {
    if (this.isConsuming) {
      this.stopConsuming();
      this.emit('paused');
      this.logger.info('Consumer paused');
    }
  }

  /**
   * 恢复消费
   */
  resume(): void {
    if (this.isStarted && !this.isConsuming) {
      this.startConsuming();
      this.emit('resumed');
      this.logger.info('Consumer resumed');
    }
  }

  /**
   * 确认消息
   */
  async ack(messageId: string): Promise<void> {
    try {
      const connection = this.connectionManager.getConnection();
      await connection.xack(this.streamKey, this.consumerGroup, messageId);

      this.emit('message-acked', {
        messageId,
        consumer: this.consumerId,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error(`Failed to ack message ${messageId}`, toError(error));
      throw error;
    }
  }

  /**
   * 拒绝消息
   */
  async nack(messageId: string, requeue: boolean = true): Promise<void> {
    try {
      if (requeue) {
        // 重新入队（简化实现，实际应该有更复杂的重试逻辑）
        this.logger.warn(`Message ${messageId} nacked and requeued`);
      } else {
        // 确认消息以从队列中移除
        await this.ack(messageId);
      }

      this.emit('message-nacked', {
        messageId,
        consumer: this.consumerId,
        requeue,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error(`Failed to nack message ${messageId}`, toError(error));
      throw error;
    }
  }

  /**
   * 获取消费者指标
   */
  getMetrics(): ConsumerMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取死信队列管理器
   */
  getDeadLetterManager(): DeadLetterQueueManager | undefined {
    return this.deadLetterManager;
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      messagesProcessed: 0,
      messagesPerSecond: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      pendingMessages: 0,
      consumerLag: 0
    };
  }

  /**
   * 确保消费者组存在
   */
  private async ensureConsumerGroup(): Promise<void> {
    try {
      const connection = this.connectionManager.getConnection();
      await connection.xgroup(
        'CREATE',
        this.streamKey,
        this.consumerGroup,
        '$',
        'MKSTREAM'
      );
    } catch (error) {
      // 消费者组可能已存在
      if (!toError(error).message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  /**
   * 开始消费消息
   */
  private startConsuming(): void {
    if (this.isConsuming) {
      return;
    }

    this.isConsuming = true;
    this.scheduleConsume();
  }

  /**
   * 停止消费消息
   */
  private stopConsuming(): void {
    this.isConsuming = false;

    if (this.consumeTimer) {
      clearTimeout(this.consumeTimer);
      this.consumeTimer = undefined;
    }
  }

  /**
   * 调度消费
   */
  private scheduleConsume(): void {
    if (!this.isConsuming) {
      return;
    }

    // 控制并发数
    if (this.processingPromises.size >= (this.options.concurrency || 1)) {
      this.consumeTimer = setTimeout(() => this.scheduleConsume(), 100);
      return;
    }

    const consumePromise = this.consumeMessages()
      .catch((error) => {
        this.logger.error('Consume error', error);
        this.emit('error', error);
      })
      .finally(() => {
        this.processingPromises.delete(consumePromise);
        this.scheduleConsume();
      });

    this.processingPromises.add(consumePromise);
  }

  /**
   * 消费消息
   */
  private async consumeMessages(): Promise<void> {
    try {
      const connection = this.connectionManager.getConnection();
      const batchSize = this.options.batchSize || 1;
      const timeout = this.options.timeout || 5000;

      // 首先处理待处理的消息
      const pendingMessages = await connection.xreadgroup(
        'GROUP',
        this.consumerGroup,
        this.consumerId,
        'COUNT',
        batchSize,
        'STREAMS',
        this.streamKey,
        '0'
      );

      if (pendingMessages && pendingMessages.length > 0) {
        await this.processStreamMessages(pendingMessages);
        return;
      }

      // 读取新消息
      const newMessages = await connection.xreadgroup(
        'GROUP',
        this.consumerGroup,
        this.consumerId,
        'COUNT',
        batchSize,
        'BLOCK',
        timeout,
        'STREAMS',
        this.streamKey,
        '>'
      );

      if (newMessages && newMessages.length > 0) {
        await this.processStreamMessages(newMessages);
      }
    } catch (error) {
      // 超时是正常的，不需要记录错误
      if (!toError(error).message.includes('timeout')) {
        throw error;
      }
    }
  }

  /**
   * 处理流消息
   */
  private async processStreamMessages(streamMessages: any[]): Promise<void> {
    for (const [_streamName, messages] of streamMessages) {
      if (messages.length === 0) continue;

      const consumeResults: ConsumeResult<T>[] = [];

      for (const [messageId, fields] of messages) {
        try {
          const message = this.parseMessage(messageId, fields);
          const consumeResult: ConsumeResult<T> = {
            message,
            messageId,
            queue: this.queue.name,
            consumer: this.consumerId,
            timestamp: Date.now(),
            ack: () => this.ack(messageId),
            nack: (requeue = true) => this.nack(messageId, requeue)
          };

          consumeResults.push(consumeResult);
        } catch (error) {
          this.logger.error(
            `Failed to parse message ${messageId}`,
            toError(error)
          );
          await this.handleMessageError(messageId, toError(error));
        }
      }

      if (consumeResults.length > 0) {
        await this.processMessages(consumeResults);
      }
    }
  }

  /**
   * 处理消息
   */
  private async processMessages(results: ConsumeResult<T>[]): Promise<void> {
    const startTime = Date.now();

    try {
      if (this.isBatchHandler()) {
        // 批量处理
        await (this.handler as BatchMessageHandler<T>)(results);

        // 自动确认所有消息
        if (this.options.autoAck) {
          await Promise.all(results.map((result) => result.ack()));
        }
      } else {
        // 单条处理
        for (const result of results) {
          await (this.handler as MessageHandler<T>)(result);

          // 自动确认消息
          if (this.options.autoAck) {
            await result.ack();
          }
        }
      }

      // 更新指标
      this.updateMetrics(startTime, results.length, true);

      this.emit('messages-processed', {
        count: results.length,
        consumer: this.consumerId,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Message processing failed', toError(error));

      // 更新指标
      this.updateMetrics(startTime, results.length, false);

      // 处理错误
      await this.handleProcessingError(results, toError(error));
    }
  }

  /**
   * 解析消息
   */
  private parseMessage(messageId: string, fields: string[]): Message<T> {
    const fieldMap = new Map();
    for (let i = 0; i < fields.length; i += 2) {
      fieldMap.set(fields[i], fields[i + 1]);
    }

    return {
      id: fieldMap.get('id') || messageId,
      payload: JSON.parse(fieldMap.get('payload') || '{}'),
      priority: parseInt(fieldMap.get('priority') || '5'),
      headers: JSON.parse(fieldMap.get('headers') || '{}'),
      timestamp: parseInt(fieldMap.get('timestamp') || '0'),
      retryCount: parseInt(fieldMap.get('retryCount') || '0'),
      maxRetries: parseInt(fieldMap.get('maxRetries') || '3'),
      source: fieldMap.get('source') || 'unknown',
      traceId: fieldMap.get('traceId')
    };
  }

  /**
   * 判断是否为批量处理器
   */
  private isBatchHandler(): boolean {
    return this.handler.length > 1; // 批量处理器接受数组参数
  }

  /**
   * 处理消息错误
   */
  private async handleMessageError(
    messageId: string,
    error: any
  ): Promise<void> {
    try {
      // 确认错误消息以从队列中移除
      await this.ack(messageId);

      this.emit('message-error', {
        messageId,
        error,
        consumer: this.consumerId,
        timestamp: Date.now()
      });
    } catch (ackError) {
      this.logger.error(
        `Failed to ack error message ${messageId}`,
        toError(ackError)
      );
    }
  }

  /**
   * 处理处理错误
   */
  private async handleProcessingError(
    results: ConsumeResult<T>[],
    error: any
  ): Promise<void> {
    const processingError = toError(error);

    for (const result of results) {
      try {
        const message = result.message;
        const retryCount = message.retryCount || 0;

        // 使用重试策略判断是否应该重试
        if (this.retryPolicy.shouldRetry(retryCount + 1, processingError)) {
          // 重试消息
          await this.retryMessage(result, retryCount + 1, processingError);
        } else {
          // 发送到死信队列
          await this.sendToDeadLetter(result);
          await result.ack();
        }
      } catch (handleError) {
        this.logger.error(
          `Failed to handle processing error for message ${result.messageId}`,
          toError(handleError)
        );
      }
    }
  }

  /**
   * 重试消息
   */
  private async retryMessage(
    result: ConsumeResult<T>,
    retryCount: number,
    lastError?: Error
  ): Promise<void> {
    try {
      // 使用重试策略计算延迟
      const delay = this.retryPolicy.calculateDelay(retryCount, lastError);

      if (delay === -1) {
        this.logger.warn(
          `Retry policy rejected retry for message ${result.messageId}`
        );
        // 如果重试策略拒绝重试，发送到死信队列
        await this.sendToDeadLetter(result);
        await result.ack();
        return;
      }

      this.logger.debug(
        `Retrying message ${result.messageId} after ${delay}ms delay`,
        {
          retryCount,
          delay,
          strategy: this.retryPolicy.constructor.name
        }
      );

      await sleep(delay);

      // 更新重试计数并重新发送
      const retryMessage = {
        ...result.message,
        retryCount,
        headers: {
          ...result.message.headers,
          lastRetryAt: Date.now(),
          retryReason: lastError?.message || 'Processing failed'
        }
      };

      await this.queue.send(retryMessage);
      await result.ack();

      this.emit('message-retried', {
        messageId: result.messageId,
        retryCount,
        delay,
        consumer: this.consumerId,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error(
        `Failed to retry message ${result.messageId}`,
        toError(error)
      );
      throw error;
    }
  }

  /**
   * 发送到死信队列
   */
  private async sendToDeadLetter(result: ConsumeResult<T>): Promise<void> {
    if (!this.deadLetterManager) {
      this.logger.warn(
        `No dead letter queue configured for message ${result.messageId}`
      );
      return;
    }

    try {
      await this.deadLetterManager.addMessage(
        result.message,
        'max_retries_exceeded',
        this.queue.name,
        {
          consumerId: this.consumerId,
          consumerGroup: this.consumerGroup,
          lastProcessedAt: Date.now()
        }
      );

      this.emit('message-dead-letter', {
        messageId: result.messageId,
        consumer: this.consumerId,
        timestamp: Date.now()
      });

      this.logger.debug(`Message sent to dead letter queue`, {
        messageId: result.messageId,
        originalQueue: this.queue.name
      });
    } catch (error) {
      this.logger.error(
        `Failed to send message ${result.messageId} to dead letter queue`,
        toError(error)
      );
      throw error;
    }
  }

  /**
   * 等待处理完成
   */
  private async waitForProcessingComplete(): Promise<void> {
    if (this.processingPromises.size === 0) {
      return;
    }

    this.logger.info(
      `Waiting for ${this.processingPromises.size} processing tasks to complete...`
    );
    await Promise.all(Array.from(this.processingPromises));
  }

  /**
   * 更新指标
   */
  private updateMetrics(
    startTime: number,
    messageCount: number,
    success: boolean
  ): void {
    const processingTime = Date.now() - startTime;

    if (success) {
      this.metrics.messagesProcessed += messageCount;
      this.metrics.averageProcessingTime =
        (this.metrics.averageProcessingTime + processingTime) / 2;
    }

    // 计算错误率（简化实现）
    this.metrics.errorRate = success
      ? this.metrics.errorRate * 0.95
      : this.metrics.errorRate * 0.95 + 0.05;

    // 更新最后处理时间
    this.metrics.lastProcessedAt = Date.now();
  }
}
