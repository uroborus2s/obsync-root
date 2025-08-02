/**
 * 队列核心类 - 基于Redis Streams的消息队列实现
 */
import { EventEmitter } from 'events';
import { createQueueError, MessageValidationError, QueueOperationError } from '../errors/index.js';
import { createLogger, generateMessageId } from '../utils/index.js';
// 错误类型转换辅助函数
const toError = (error) => {
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
};
export class Queue extends EventEmitter {
    name;
    config;
    connectionManager;
    logger;
    _isRunning = false;
    streamKey;
    consumerGroupKey;
    deadLetterKey;
    priorityKeys = new Map();
    constructor(name, config, connectionManager) {
        super();
        this.name = name;
        this.config = config;
        this.connectionManager = connectionManager;
        this.logger = createLogger({
            level: 1
        });
        // 初始化Redis键名
        this.streamKey = `queue:${name}`;
        this.consumerGroupKey = `queue:${name}:consumers`;
        if (config.deadLetterQueue) {
            this.deadLetterKey = `queue:${config.deadLetterQueue}`;
        }
        // 如果启用优先级，初始化优先级队列键
        if (config.priority) {
            for (let i = 0; i <= 9; i++) {
                this.priorityKeys.set(i, `queue:${name}:priority:${i}`);
            }
        }
    }
    /**
     * 启动队列
     */
    async start() {
        try {
            if (this.isRunning()) {
                return;
            }
            this.logger.info('Starting queue...');
            // 初始化Redis Streams
            await this.initializeStreams();
            this._isRunning = true;
            this.emit('started');
            this.logger.info('Queue started successfully');
        }
        catch (error) {
            this.logger.error('Failed to start queue', toError(error));
            throw error;
        }
    }
    /**
     * 停止队列
     */
    async stop() {
        try {
            if (!this.isRunning) {
                return;
            }
            this.logger.info('Stopping queue...');
            this._isRunning = false;
            this.emit('stopped');
            this.logger.info('Queue stopped successfully');
        }
        catch (error) {
            this.logger.error('Failed to stop queue', toError(error));
            throw error;
        }
    }
    /**
     * 检查队列是否运行中
     */
    isRunning() {
        return this._isRunning;
    }
    /**
     * 发送单条消息
     */
    async send(message, options) {
        try {
            this.validateMessage(message);
            const connection = this.connectionManager.getConnection();
            const messageId = message.id || generateMessageId();
            const timestamp = Date.now();
            // 合并选项
            const sendOptions = {
                priority: message.priority || options?.priority || 5,
                delay: message.delay || options?.delay || 0,
                headers: { ...message.headers, ...options?.headers },
                ...options
            };
            // 准备消息数据
            const messageData = {
                id: messageId,
                payload: JSON.stringify(message.payload),
                priority: sendOptions.priority,
                headers: JSON.stringify(sendOptions.headers),
                timestamp,
                retryCount: 0,
                maxRetries: message.maxRetries || this.config.retryAttempts || 3,
                source: message.source || 'unknown',
                traceId: message.traceId || generateMessageId()
            };
            let streamKey = this.streamKey;
            // 如果启用优先级，选择对应的优先级队列
            if (this.config.priority && sendOptions.priority !== undefined) {
                streamKey =
                    this.priorityKeys.get(sendOptions.priority) || this.streamKey;
            }
            // 处理延迟消息
            if (sendOptions.delay && sendOptions.delay > 0) {
                return await this.sendDelayedMessage(messageData, sendOptions.delay, connection);
            }
            // 发送消息到Redis Stream
            const redisMessageId = await connection.xadd(streamKey, 'MAXLEN', '~', this.config.maxLength || 10000, '*', ...Object.entries(messageData).flat());
            const result = {
                messageId,
                redisMessageId: redisMessageId || undefined,
                queue: this.name,
                timestamp,
                success: true
            };
            this.emit('message-sent', {
                queue: this.name,
                messageId,
                timestamp,
                metadata: { priority: sendOptions.priority }
            });
            this.logger.debug(`Message sent successfully`, {
                messageId,
                redisMessageId
            });
            return result;
        }
        catch (error) {
            this.logger.error('Failed to send message', toError(error));
            throw createQueueError.sendFailed(this.name, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * 批量发送消息
     */
    async sendBatch(messages, options) {
        try {
            if (!messages || messages.length === 0) {
                return [];
            }
            this.logger.debug(`Sending batch of ${messages.length} messages`);
            // 验证所有消息
            messages.forEach((message) => this.validateMessage(message));
            const connection = this.connectionManager.getConnection();
            const pipeline = connection.pipeline();
            const results = [];
            const timestamp = Date.now();
            for (const message of messages) {
                const messageId = message.id || generateMessageId();
                const sendOptions = {
                    priority: message.priority || options?.priority || 5,
                    delay: message.delay || options?.delay || 0,
                    headers: { ...message.headers, ...options?.headers },
                    ...options
                };
                const messageData = {
                    id: messageId,
                    payload: JSON.stringify(message.payload),
                    priority: sendOptions.priority,
                    headers: JSON.stringify(sendOptions.headers),
                    timestamp,
                    retryCount: 0,
                    maxRetries: message.maxRetries || this.config.retryAttempts || 3,
                    source: message.source || 'unknown',
                    traceId: message.traceId || generateMessageId()
                };
                let streamKey = this.streamKey;
                // 如果启用优先级，选择对应的优先级队列
                if (this.config.priority && sendOptions.priority !== undefined) {
                    streamKey =
                        this.priorityKeys.get(sendOptions.priority) || this.streamKey;
                }
                // 跳过延迟消息（批量发送不支持延迟）
                if (sendOptions.delay && sendOptions.delay > 0) {
                    this.logger.warn(`Skipping delayed message in batch: ${messageId}`);
                    continue;
                }
                pipeline.xadd(streamKey, 'MAXLEN', '~', this.config.maxLength || 10000, '*', ...Object.entries(messageData).flat());
                results.push({
                    messageId,
                    redisMessageId: '', // 将在pipeline执行后填充
                    queue: this.name,
                    timestamp,
                    success: true
                });
            }
            // 执行批量操作
            const pipelineResults = await pipeline.exec();
            if (!pipelineResults) {
                throw new QueueOperationError('Pipeline execution failed');
            }
            // 更新结果中的Redis消息ID
            pipelineResults.forEach(([error, redisMessageId], index) => {
                if (error) {
                    results[index].success = false;
                    results[index].error = error.message;
                }
                else {
                    results[index].redisMessageId = redisMessageId;
                }
            });
            this.emit('batch-sent', {
                queue: this.name,
                count: results.length,
                timestamp
            });
            this.logger.debug(`Batch sent successfully`, { count: results.length });
            return results;
        }
        catch (error) {
            this.logger.error('Failed to send batch', toError(error));
            throw createQueueError.sendFailed(this.name, error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * 清空队列
     */
    async purge() {
        try {
            const connection = this.connectionManager.getConnection();
            let deletedCount = 0;
            // 删除主队列
            const mainLength = await connection.xlen(this.streamKey);
            if (mainLength > 0) {
                await connection.del(this.streamKey);
                deletedCount += mainLength;
            }
            // 删除优先级队列
            if (this.config.priority) {
                for (const priorityKey of this.priorityKeys.values()) {
                    const priorityLength = await connection.xlen(priorityKey);
                    if (priorityLength > 0) {
                        await connection.del(priorityKey);
                        deletedCount += priorityLength;
                    }
                }
            }
            this.logger.info(`Queue purged, deleted ${deletedCount} messages`);
            return deletedCount;
        }
        catch (error) {
            this.logger.error('Failed to purge queue', toError(error));
            throw createQueueError.operationFailed(this.name, 'purge', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * 获取队列长度
     */
    async getLength() {
        try {
            const connection = this.connectionManager.getConnection();
            let totalLength = 0;
            // 主队列长度
            totalLength += await connection.xlen(this.streamKey);
            // 优先级队列长度
            if (this.config.priority) {
                for (const priorityKey of this.priorityKeys.values()) {
                    totalLength += await connection.xlen(priorityKey);
                }
            }
            return totalLength;
        }
        catch (error) {
            this.logger.error('Failed to get queue length', toError(error));
            throw createQueueError.operationFailed(this.name, 'getLength', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * 获取队列信息
     */
    async getInfo() {
        try {
            const connection = this.connectionManager.getConnection();
            const length = await this.getLength();
            // 获取消费者组信息
            let consumers = 0;
            try {
                const groups = await connection.xinfo('GROUPS', this.streamKey);
                consumers = Array.isArray(groups) ? groups.length : 0;
            }
            catch (error) {
                // 消费者组可能不存在
                consumers = 0;
            }
            return {
                name: this.name,
                length,
                consumers,
                producers: 1, // 简化实现，假设只有一个生产者
                messagesPerSecond: 0, // 需要通过指标收集计算
                averageLatency: 0, // 需要通过指标收集计算
                errorRate: 0, // 需要通过指标收集计算
                createdAt: Date.now(), // 简化实现
                lastActivity: Date.now(),
                config: this.config
            };
        }
        catch (error) {
            this.logger.error('Failed to get queue info', toError(error));
            throw createQueueError.operationFailed(this.name, 'getInfo', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * 获取队列统计信息
     */
    async getStats() {
        try {
            const info = await this.getInfo();
            // 简化实现，返回基础统计信息
            return {
                total: info.length,
                pending: info.length,
                processing: 0,
                completed: 0,
                failed: 0,
                retrying: 0,
                deadLetter: 0,
                throughput: {
                    sent: 0,
                    processed: 0,
                    failed: 0
                },
                latency: {
                    p50: 0,
                    p95: 0,
                    p99: 0,
                    avg: 0
                },
                consumers: {
                    active: info.consumers,
                    idle: 0,
                    total: info.consumers
                },
                memory: {
                    used: 0,
                    peak: 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to get queue stats', toError(error));
            throw createQueueError.operationFailed(this.name, 'getStats', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * 查询消息
     */
    async queryMessages(options) {
        try {
            const connection = this.connectionManager.getConnection();
            const limit = options?.limit || 100;
            const offset = options?.offset || 0;
            // 从Redis Stream读取消息
            const messages = await connection.xrange(this.streamKey, '-', '+', 'COUNT', limit + offset);
            // 跳过offset数量的消息
            const filteredMessages = messages.slice(offset, offset + limit);
            const results = filteredMessages.map(([id, fields]) => {
                const fieldMap = new Map();
                for (let i = 0; i < fields.length; i += 2) {
                    fieldMap.set(fields[i], fields[i + 1]);
                }
                return {
                    id: fieldMap.get('id') || id,
                    payload: JSON.parse(fieldMap.get('payload') || '{}'),
                    priority: parseInt(fieldMap.get('priority') || '5'),
                    headers: JSON.parse(fieldMap.get('headers') || '{}'),
                    timestamp: parseInt(fieldMap.get('timestamp') || '0'),
                    retryCount: parseInt(fieldMap.get('retryCount') || '0'),
                    maxRetries: parseInt(fieldMap.get('maxRetries') || '3'),
                    source: fieldMap.get('source') || 'unknown',
                    traceId: fieldMap.get('traceId')
                };
            });
            const total = await this.getLength();
            return {
                messages: results,
                total,
                offset,
                limit,
                hasMore: offset + limit < total
            };
        }
        catch (error) {
            this.logger.error('Failed to query messages', toError(error));
            throw createQueueError.operationFailed(this.name, 'queryMessages', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * 初始化Redis Streams
     */
    async initializeStreams() {
        const connection = this.connectionManager.getConnection();
        try {
            // 创建主队列的消费者组
            await connection.xgroup('CREATE', this.streamKey, this.consumerGroupKey, '$', 'MKSTREAM');
        }
        catch (error) {
            // 消费者组可能已存在，忽略错误
            if (!toError(error).message.includes('BUSYGROUP')) {
                throw error;
            }
        }
        // 如果启用优先级，为每个优先级队列创建消费者组
        if (this.config.priority) {
            for (const priorityKey of this.priorityKeys.values()) {
                try {
                    await connection.xgroup('CREATE', priorityKey, `${this.consumerGroupKey}:priority`, '$', 'MKSTREAM');
                }
                catch (error) {
                    // 消费者组可能已存在，忽略错误
                    if (!toError(error).message.includes('BUSYGROUP')) {
                        this.logger.warn(`Failed to create consumer group for priority queue: ${priorityKey}`, error);
                    }
                }
            }
        }
    }
    /**
     * 发送延迟消息
     */
    async sendDelayedMessage(messageData, delay, connection) {
        const delayedKey = `queue:${this.name}:delayed`;
        const executeAt = Date.now() + delay;
        // 将消息存储到延迟队列（使用sorted set）
        await connection.zadd(delayedKey, executeAt, JSON.stringify(messageData));
        return {
            messageId: messageData.id,
            redisMessageId: `delayed:${executeAt}`,
            queue: this.name,
            timestamp: messageData.timestamp,
            success: true,
            delayed: true,
            executeAt
        };
    }
    /**
     * 验证消息
     */
    validateMessage(message) {
        if (!message || typeof message !== 'object') {
            throw new MessageValidationError('Message must be an object');
        }
        if (message.payload === undefined || message.payload === null) {
            throw new MessageValidationError('Message payload is required');
        }
        if (message.priority !== undefined &&
            (message.priority < 0 || message.priority > 9)) {
            throw new MessageValidationError('Message priority must be between 0 and 9');
        }
        if (message.delay !== undefined && message.delay < 0) {
            throw new MessageValidationError('Message delay must be non-negative');
        }
    }
}
//# sourceMappingURL=queue.js.map