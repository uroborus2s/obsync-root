/**
 * 消费者 - 消息消费和处理
 */
import { EventEmitter } from 'events';
import { RedisConnectionManager } from '../redis/connection.js';
import { BatchMessageHandler, ConsumerMetrics, ConsumerOptions, IConsumer, IQueue, MessageHandler } from '../types/index.js';
import { DeadLetterQueueManager } from './dead-letter-queue.js';
export declare class Consumer<T = any> extends EventEmitter implements IConsumer<T> {
    private readonly handler;
    private readonly options;
    private connectionManager;
    private logger;
    private isStarted;
    private isConsuming;
    private consumerId;
    private consumerGroup;
    private streamKey;
    private deadLetterKey?;
    private deadLetterManager?;
    private retryPolicy;
    private metrics;
    private processingPromises;
    private consumeTimer?;
    readonly queue: IQueue<T>;
    readonly config: ConsumerOptions;
    readonly groupName: string;
    readonly consumerName: string;
    constructor(queue: IQueue<T>, handler: MessageHandler<T> | BatchMessageHandler<T>, connectionManager: RedisConnectionManager, options?: ConsumerOptions);
    /**
     * 启动消费者
     */
    start(): Promise<void>;
    /**
     * 停止消费者
     */
    stop(): Promise<void>;
    /**
     * 检查消费者是否运行中
     */
    isRunning(): boolean;
    /**
     * 消费单条消息
     */
    consume(_handler: MessageHandler<T>): Promise<void>;
    /**
     * 批量消费消息
     */
    consumeBatch(_handler: BatchMessageHandler<T>): Promise<void>;
    /**
     * 暂停消费
     */
    pause(): void;
    /**
     * 恢复消费
     */
    resume(): void;
    /**
     * 确认消息
     */
    ack(messageId: string): Promise<void>;
    /**
     * 拒绝消息
     */
    nack(messageId: string, requeue?: boolean): Promise<void>;
    /**
     * 获取消费者指标
     */
    getMetrics(): ConsumerMetrics;
    /**
     * 获取死信队列管理器
     */
    getDeadLetterManager(): DeadLetterQueueManager | undefined;
    /**
     * 重置指标
     */
    resetMetrics(): void;
    /**
     * 确保消费者组存在
     */
    private ensureConsumerGroup;
    /**
     * 开始消费消息
     */
    private startConsuming;
    /**
     * 停止消费消息
     */
    private stopConsuming;
    /**
     * 调度消费
     */
    private scheduleConsume;
    /**
     * 消费消息
     */
    private consumeMessages;
    /**
     * 处理流消息
     */
    private processStreamMessages;
    /**
     * 处理消息
     */
    private processMessages;
    /**
     * 解析消息
     */
    private parseMessage;
    /**
     * 判断是否为批量处理器
     */
    private isBatchHandler;
    /**
     * 处理消息错误
     */
    private handleMessageError;
    /**
     * 处理处理错误
     */
    private handleProcessingError;
    /**
     * 重试消息
     */
    private retryMessage;
    /**
     * 发送到死信队列
     */
    private sendToDeadLetter;
    /**
     * 等待处理完成
     */
    private waitForProcessingComplete;
    /**
     * 更新指标
     */
    private updateMetrics;
}
//# sourceMappingURL=consumer.d.ts.map