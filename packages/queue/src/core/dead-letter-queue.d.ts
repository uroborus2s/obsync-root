/**
 * 死信队列管理器
 * 提供死信消息的处理、重新入队、统计等功能
 */
import { EventEmitter } from 'events';
import type { RedisConnectionManager } from '../redis/connection.js';
import type { DeadLetterMessage, Message, MessageQueryOptions, MessageQueryResult, QueueConfig } from '../types/index.js';
/**
 * 死信队列处理选项
 */
export interface DeadLetterProcessOptions {
    batchSize?: number;
    timeout?: number;
    retryOriginalQueue?: boolean;
    maxReprocessAttempts?: number;
}
/**
 * 死信队列统计信息
 */
export interface DeadLetterStats {
    totalMessages: number;
    messagesByQueue: Record<string, number>;
    messagesByReason: Record<string, number>;
    oldestMessage?: number;
    newestMessage?: number;
}
/**
 * 死信队列管理器
 */
export declare class DeadLetterQueueManager extends EventEmitter {
    private readonly queueName;
    private readonly config;
    private connectionManager;
    private logger;
    private deadLetterKey;
    private isProcessing;
    constructor(queueName: string, config: QueueConfig, connectionManager: RedisConnectionManager);
    /**
     * 添加消息到死信队列
     */
    addMessage<T = any>(message: Message<T>, reason: string, originalQueue: string, metadata?: Record<string, any>): Promise<string>;
    /**
     * 获取死信队列统计信息
     */
    getStats(): Promise<DeadLetterStats>;
    /**
     * 查询死信消息
     */
    queryMessages(options?: MessageQueryOptions): Promise<MessageQueryResult<DeadLetterMessage<any>>>;
    /**
     * 重新处理死信消息（重新入队到原队列）
     */
    reprocessMessage(messageId: string, targetQueue?: string): Promise<boolean>;
    /**
     * 批量重新处理消息
     */
    reprocessBatch(messageIds: string[], options?: DeadLetterProcessOptions): Promise<{
        success: string[];
        failed: Array<{
            id: string;
            error: string;
        }>;
    }>;
    /**
     * 清理过期的死信消息
     */
    cleanup(maxAge: number): Promise<number>;
    /**
     * 解析Redis消息字段
     */
    private parseRedisMessage;
    /**
     * 获取死信队列长度
     */
    getLength(): Promise<number>;
    /**
     * 清空死信队列
     */
    purge(): Promise<number>;
}
//# sourceMappingURL=dead-letter-queue.d.ts.map