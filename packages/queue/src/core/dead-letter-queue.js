/**
 * 死信队列管理器
 * 提供死信消息的处理、重新入队、统计等功能
 */
import { EventEmitter } from 'events';
import { createLogger, generateMessageId, toError } from '../utils/index.js';
/**
 * 死信队列管理器
 */
export class DeadLetterQueueManager extends EventEmitter {
    queueName;
    config;
    connectionManager;
    logger;
    deadLetterKey;
    isProcessing = false;
    constructor(queueName, config, connectionManager) {
        super();
        this.queueName = queueName;
        this.config = config;
        this.connectionManager = connectionManager;
        this.deadLetterKey = `queue:${queueName}:dlq`;
        this.logger = createLogger({ level: 1 });
    }
    /**
     * 添加消息到死信队列
     */
    async addMessage(message, reason, originalQueue, metadata) {
        try {
            const connection = this.connectionManager.getConnection();
            const deadLetterMessage = {
                ...message,
                originalQueue,
                failureReason: reason,
                failedAt: Date.now(),
                attempts: (message.retryCount || 0) + 1,
                id: message.id || generateMessageId()
            };
            // 添加额外的元数据
            if (metadata) {
                deadLetterMessage.headers = {
                    ...deadLetterMessage.headers,
                    ...metadata
                };
            }
            const messageData = {
                id: deadLetterMessage.id,
                payload: JSON.stringify(deadLetterMessage.payload),
                originalQueue,
                failureReason: reason,
                failedAt: deadLetterMessage.failedAt,
                attempts: deadLetterMessage.attempts,
                headers: JSON.stringify(deadLetterMessage.headers || {}),
                timestamp: deadLetterMessage.timestamp || Date.now(),
                retryCount: deadLetterMessage.retryCount || 0,
                maxRetries: deadLetterMessage.maxRetries || 0,
                source: deadLetterMessage.source || 'unknown',
                traceId: deadLetterMessage.traceId || generateMessageId()
            };
            const redisMessageId = await connection.xadd(this.deadLetterKey, 'MAXLEN', '~', this.config.maxLength || 10000, '*', ...Object.entries(messageData).flat().map(String));
            this.emit('message-added', {
                messageId: deadLetterMessage.id,
                redisMessageId,
                reason,
                originalQueue,
                timestamp: Date.now()
            });
            this.logger.debug('Message added to dead letter queue', {
                messageId: deadLetterMessage.id,
                reason,
                originalQueue
            });
            return redisMessageId || '';
        }
        catch (error) {
            this.logger.error('Failed to add message to dead letter queue', toError(error));
            throw error;
        }
    }
    /**
     * 获取死信队列统计信息
     */
    async getStats() {
        try {
            const connection = this.connectionManager.getConnection();
            const length = await connection.xlen(this.deadLetterKey);
            if (length === 0) {
                return {
                    totalMessages: 0,
                    messagesByQueue: {},
                    messagesByReason: {}
                };
            }
            // 获取所有消息进行统计
            const messages = await connection.xrange(this.deadLetterKey, '-', '+');
            const stats = {
                totalMessages: length,
                messagesByQueue: {},
                messagesByReason: {},
                oldestMessage: undefined,
                newestMessage: undefined
            };
            for (const [messageId, fields] of messages) {
                const messageData = this.parseRedisMessage(fields);
                // 按原队列统计
                const originalQueue = messageData.originalQueue || 'unknown';
                stats.messagesByQueue[originalQueue] =
                    (stats.messagesByQueue[originalQueue] || 0) + 1;
                // 按失败原因统计
                const reason = messageData.failureReason || 'unknown';
                stats.messagesByReason[reason] =
                    (stats.messagesByReason[reason] || 0) + 1;
                // 更新时间范围
                const timestamp = parseInt(messageData.timestamp || '0');
                if (!stats.oldestMessage || timestamp < stats.oldestMessage) {
                    stats.oldestMessage = timestamp;
                }
                if (!stats.newestMessage || timestamp > stats.newestMessage) {
                    stats.newestMessage = timestamp;
                }
            }
            return stats;
        }
        catch (error) {
            this.logger.error('Failed to get dead letter queue stats', toError(error));
            throw error;
        }
    }
    /**
     * 查询死信消息
     */
    async queryMessages(options = {}) {
        try {
            const connection = this.connectionManager.getConnection();
            const limit = options.limit || 50;
            const offset = options.offset || 0;
            // 获取消息
            const messages = await connection.xrange(this.deadLetterKey, '-', '+', 'COUNT', limit + offset);
            const parsedMessages = messages
                .slice(offset)
                .map(([messageId, fields]) => {
                const data = this.parseRedisMessage(fields);
                return {
                    id: data.id,
                    payload: JSON.parse(data.payload),
                    originalQueue: data.originalQueue,
                    failureReason: data.failureReason,
                    failedAt: parseInt(data.failedAt),
                    attempts: parseInt(data.attempts),
                    headers: data.headers ? JSON.parse(data.headers) : {},
                    timestamp: parseInt(data.timestamp),
                    retryCount: parseInt(data.retryCount || '0'),
                    maxRetries: parseInt(data.maxRetries || '0'),
                    source: data.source,
                    traceId: data.traceId
                };
            });
            const total = await connection.xlen(this.deadLetterKey);
            return {
                messages: parsedMessages,
                total,
                offset,
                limit,
                hasMore: offset + limit < total
            };
        }
        catch (error) {
            this.logger.error('Failed to query dead letter messages', toError(error));
            throw error;
        }
    }
    /**
     * 重新处理死信消息（重新入队到原队列）
     */
    async reprocessMessage(messageId, targetQueue) {
        try {
            const connection = this.connectionManager.getConnection();
            // 获取消息
            const messages = await connection.xrange(this.deadLetterKey, messageId, messageId);
            if (messages.length === 0) {
                throw new Error(`Message ${messageId} not found in dead letter queue`);
            }
            const [, fields] = messages[0];
            const messageData = this.parseRedisMessage(fields);
            const originalQueue = targetQueue || messageData.originalQueue;
            if (!originalQueue) {
                throw new Error('No target queue specified and no original queue found');
            }
            // 重新构造消息
            const reprocessedMessage = {
                id: generateMessageId(), // 生成新的消息ID
                payload: messageData.payload,
                headers: messageData.headers ? JSON.parse(messageData.headers) : {},
                timestamp: Date.now(),
                retryCount: 0, // 重置重试次数
                maxRetries: parseInt(messageData.maxRetries || '3'),
                source: messageData.source,
                traceId: messageData.traceId,
                reprocessedFrom: messageId // 标记来源
            };
            // 发送到目标队列
            const targetKey = `queue:${originalQueue}`;
            await connection.xadd(targetKey, '*', ...Object.entries(reprocessedMessage).flat().map(String));
            // 从死信队列中删除
            await connection.xdel(this.deadLetterKey, messageId);
            this.emit('message-reprocessed', {
                messageId,
                targetQueue: originalQueue,
                timestamp: Date.now()
            });
            this.logger.info('Message reprocessed successfully', {
                messageId,
                targetQueue: originalQueue
            });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to reprocess message', toError(error));
            throw error;
        }
    }
    /**
     * 批量重新处理消息
     */
    async reprocessBatch(messageIds, options = {}) {
        const results = {
            success: [],
            failed: []
        };
        const batchSize = options.batchSize || 10;
        for (let i = 0; i < messageIds.length; i += batchSize) {
            const batch = messageIds.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(async (messageId) => {
                try {
                    await this.reprocessMessage(messageId);
                    results.success.push(messageId);
                }
                catch (error) {
                    results.failed.push({
                        id: messageId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }));
        }
        return results;
    }
    /**
     * 清理过期的死信消息
     */
    async cleanup(maxAge) {
        try {
            const connection = this.connectionManager.getConnection();
            const cutoffTime = Date.now() - maxAge;
            // 获取所有消息
            const messages = await connection.xrange(this.deadLetterKey, '-', '+');
            const toDelete = [];
            for (const [messageId, fields] of messages) {
                const messageData = this.parseRedisMessage(fields);
                const timestamp = parseInt(messageData.timestamp || '0');
                if (timestamp < cutoffTime) {
                    toDelete.push(messageId);
                }
            }
            if (toDelete.length > 0) {
                await connection.xdel(this.deadLetterKey, ...toDelete);
                this.emit('messages-cleaned', {
                    count: toDelete.length,
                    timestamp: Date.now()
                });
            }
            return toDelete.length;
        }
        catch (error) {
            this.logger.error('Failed to cleanup dead letter queue', toError(error));
            throw error;
        }
    }
    /**
     * 解析Redis消息字段
     */
    parseRedisMessage(fields) {
        const result = {};
        for (let i = 0; i < fields.length; i += 2) {
            result[fields[i]] = fields[i + 1];
        }
        return result;
    }
    /**
     * 获取死信队列长度
     */
    async getLength() {
        try {
            const connection = this.connectionManager.getConnection();
            return await connection.xlen(this.deadLetterKey);
        }
        catch (error) {
            this.logger.error('Failed to get dead letter queue length', toError(error));
            throw error;
        }
    }
    /**
     * 清空死信队列
     */
    async purge() {
        try {
            const connection = this.connectionManager.getConnection();
            const length = await connection.xlen(this.deadLetterKey);
            if (length > 0) {
                await connection.del(this.deadLetterKey);
                this.emit('queue-purged', {
                    count: length,
                    timestamp: Date.now()
                });
            }
            return length;
        }
        catch (error) {
            this.logger.error('Failed to purge dead letter queue', toError(error));
            throw error;
        }
    }
}
//# sourceMappingURL=dead-letter-queue.js.map