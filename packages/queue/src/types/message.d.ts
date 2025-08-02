/**
 * 消息相关类型定义
 */
export interface Message<T = any> {
    id?: string;
    payload: T;
    priority?: number;
    delay?: number;
    headers?: Record<string, any>;
    timestamp?: number;
    retryCount?: number;
    maxRetries?: number;
    source?: string;
    traceId?: string;
}
export interface SendOptions {
    priority?: number;
    delay?: number;
    headers?: Record<string, any>;
    timeout?: number;
    retryPolicy?: string;
    deadLetterQueue?: string;
    compression?: boolean;
}
export interface SendResult {
    messageId: string;
    redisMessageId?: string;
    timestamp: number;
    queue: string;
    status?: 'sent' | 'delayed' | 'failed';
    success: boolean;
    error?: string;
    delayed?: boolean;
    executeAt?: number;
}
export interface BatchSendResult {
    results: SendResult[];
    successCount: number;
    failureCount: number;
    totalCount: number;
}
export interface ConsumeResult<T = any> {
    message: Message<T>;
    messageId: string;
    queue: string;
    consumer: string;
    timestamp: number;
    ack(): Promise<void>;
    nack(requeue?: boolean): Promise<void>;
}
export type MessageHandler<T = any> = (result: ConsumeResult<T>) => Promise<void>;
export type BatchMessageHandler<T = any> = (results: ConsumeResult<T>[]) => Promise<void>;
export declare enum MessageStatus {
    PENDING = "pending",// 待处理
    PROCESSING = "processing",// 处理中
    COMPLETED = "completed",// 已完成
    FAILED = "failed",// 失败
    RETRYING = "retrying",// 重试中
    DEAD_LETTER = "dead_letter"
}
export interface MessageMetadata {
    id: string;
    queue: string;
    status: MessageStatus;
    createdAt: number;
    updatedAt: number;
    processedAt?: number;
    retryCount: number;
    maxRetries: number;
    lastError?: string;
    processingTime?: number;
    consumerGroup?: string;
    consumerName?: string;
}
export interface DelayedMessage<T = any> extends Message<T> {
    executeAt: number;
    originalQueue: string;
}
export interface DeadLetterMessage<T = any> extends Message<T> {
    originalQueue: string;
    failureReason: string;
    failedAt: number;
    attempts: number;
}
export interface MessageStats {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    retrying: number;
    deadLetter: number;
}
export type QueueEvent = 'message-sent' | 'message-received' | 'message-acked' | 'message-nacked' | 'message-retried' | 'message-failed' | 'message-dead-letter' | 'queue-created' | 'queue-deleted' | 'consumer-joined' | 'consumer-left' | 'batch-sent' | 'batch-processed';
export interface QueueEventData {
    queue: string;
    messageId?: string;
    consumer?: string;
    timestamp: number;
    metadata?: any;
}
export interface MessageFilter {
    priority?: number | number[];
    headers?: Record<string, any>;
    source?: string | string[];
    createdAfter?: number;
    createdBefore?: number;
}
export interface MessageQueryOptions {
    limit?: number;
    offset?: number;
    filter?: MessageFilter;
    sortBy?: 'timestamp' | 'priority';
    sortOrder?: 'asc' | 'desc';
}
export interface MessageQueryResult<T = any> {
    messages: Message<T>[];
    total: number;
    offset: number;
    limit: number;
    hasMore?: boolean;
}
//# sourceMappingURL=message.d.ts.map