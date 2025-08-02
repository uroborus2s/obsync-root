/**
 * 生产者 - 消息发送和路由
 */
import { EventEmitter } from 'events';
import { createQueueError, MessageValidationError } from '../errors/index.js';
import { createLogger, sleep } from '../utils/index.js';
// 错误类型转换辅助函数
const toError = (error) => {
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
};
export class Producer extends EventEmitter {
    queue;
    config;
    logger;
    isStarted = false;
    metrics;
    batchBuffer = [];
    batchTimer;
    retryQueue = [];
    retryTimer;
    constructor(queue, config = {}) {
        super();
        this.queue = queue;
        this.config = config;
        this.logger = createLogger({
            level: 1
        });
        // 初始化指标
        this.metrics = {
            messagesSent: 0,
            messagesPerSecond: 0,
            averageLatency: 0,
            errorRate: 0,
            batchesSent: 0,
            averageBatchSize: 0
        };
        // 合并默认配置
        this.config = {
            batchSize: 100,
            batchTimeout: 1000,
            compression: false,
            serialization: 'json',
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
    }
    /**
     * 启动生产者
     */
    async start() {
        try {
            if (this.isStarted) {
                return;
            }
            this.logger.info('Starting producer...');
            // 启动批处理定时器
            this.startBatchTimer();
            // 启动重试处理
            this.startRetryProcessor();
            this.isStarted = true;
            this.emit('started');
            this.logger.info('Producer started successfully');
        }
        catch (error) {
            this.logger.error('Failed to start producer', toError(error));
            throw error;
        }
    }
    /**
     * 停止生产者
     */
    async stop() {
        try {
            if (!this.isStarted) {
                return;
            }
            this.logger.info('Stopping producer...');
            // 停止批处理定时器
            this.stopBatchTimer();
            // 停止重试处理
            this.stopRetryProcessor();
            // 发送剩余的批处理消息
            await this.flushBatch();
            // 处理剩余的重试消息
            await this.flushRetryQueue();
            this.isStarted = false;
            this.emit('stopped');
            this.logger.info('Producer stopped successfully');
        }
        catch (error) {
            this.logger.error('Failed to stop producer', toError(error));
            throw error;
        }
    }
    /**
     * 检查生产者是否运行中
     */
    isRunning() {
        return this.isStarted;
    }
    /**
     * 发送单条消息
     */
    async send(message, options) {
        try {
            if (!this.isStarted) {
                throw new Error('Producer is not started');
            }
            this.validateMessage(message);
            const startTime = Date.now();
            // 如果启用批处理且不是高优先级消息，加入批处理队列
            if (this.shouldBatch(message, options)) {
                return await this.addToBatch(message, options);
            }
            // 直接发送消息
            const result = await this.sendDirect(message, options);
            // 更新指标
            this.updateMetrics(startTime, 1, true);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to send message', toError(error));
            // 如果启用重试，加入重试队列
            if (this.shouldRetry(error)) {
                return await this.addToRetryQueue(message, options, 0);
            }
            throw error;
        }
    }
    /**
     * 批量发送消息
     */
    async sendBatch(messages, options) {
        try {
            if (!this.isStarted) {
                throw new Error('Producer is not started');
            }
            if (!messages || messages.length === 0) {
                return [];
            }
            this.logger.debug(`Sending batch of ${messages.length} messages`);
            // 验证所有消息
            messages.forEach((message) => this.validateMessage(message));
            const startTime = Date.now();
            const results = await this.queue.sendBatch(messages, options);
            // 更新指标
            this.updateMetrics(startTime, messages.length, true);
            this.metrics.batchesSent++;
            this.metrics.averageBatchSize =
                (this.metrics.averageBatchSize + messages.length) / 2;
            this.emit('batch-sent', {
                count: messages.length,
                results,
                timestamp: Date.now()
            });
            return results;
        }
        catch (error) {
            this.logger.error('Failed to send batch', toError(error));
            this.updateMetrics(Date.now(), messages.length, false);
            throw error;
        }
    }
    /**
     * 发送延迟消息
     */
    async sendDelayed(message, delay, options) {
        const delayedMessage = {
            ...message,
            delay
        };
        return await this.send(delayedMessage, options);
    }
    /**
     * 发送优先级消息
     */
    async sendPriority(message, priority, options) {
        const priorityMessage = {
            ...message,
            priority
        };
        return await this.send(priorityMessage, options);
    }
    /**
     * 获取生产者指标
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * 重置指标
     */
    resetMetrics() {
        this.metrics = {
            messagesSent: 0,
            messagesPerSecond: 0,
            averageLatency: 0,
            errorRate: 0,
            batchesSent: 0,
            averageBatchSize: 0
        };
    }
    /**
     * 直接发送消息
     */
    async sendDirect(message, options) {
        try {
            const result = await this.queue.send(message, options);
            this.emit('message-sent', {
                messageId: result.messageId,
                queue: this.queue.name,
                timestamp: result.timestamp
            });
            return result;
        }
        catch (error) {
            this.emit('send-error', {
                message,
                error,
                timestamp: Date.now()
            });
            throw error;
        }
    }
    /**
     * 判断是否应该批处理
     */
    shouldBatch(message, options) {
        // 高优先级消息不批处理
        if ((message.priority || options?.priority || 5) >= 8) {
            return false;
        }
        // 延迟消息不批处理
        if (message.delay || options?.delay) {
            return false;
        }
        // 如果禁用批处理
        if (this.config.batchSize === 1) {
            return false;
        }
        return true;
    }
    /**
     * 添加到批处理队列
     */
    async addToBatch(message, options) {
        return new Promise((resolve, reject) => {
            this.batchBuffer.push({
                message,
                options,
                resolve,
                reject
            });
            // 如果达到批处理大小，立即发送
            if (this.batchBuffer.length >= (this.config.batchSize || 100)) {
                this.flushBatch().catch(reject);
            }
        });
    }
    /**
     * 刷新批处理队列
     */
    async flushBatch() {
        if (this.batchBuffer.length === 0) {
            return;
        }
        const batch = this.batchBuffer.splice(0);
        try {
            const messages = batch.map((item) => item.message);
            const results = await this.queue.sendBatch(messages);
            // 解析Promise
            batch.forEach((item, index) => {
                item.resolve(results[index]);
            });
            this.logger.debug(`Batch flushed successfully`, { count: batch.length });
        }
        catch (error) {
            // 拒绝所有Promise
            batch.forEach((item) => {
                item.reject(error);
            });
            this.logger.error('Failed to flush batch', toError(error));
        }
    }
    /**
     * 启动批处理定时器
     */
    startBatchTimer() {
        if (this.config.batchTimeout && this.config.batchTimeout > 0) {
            this.batchTimer = setInterval(() => {
                this.flushBatch().catch((error) => {
                    this.logger.error('Batch timer flush failed', error);
                });
            }, this.config.batchTimeout);
        }
    }
    /**
     * 停止批处理定时器
     */
    stopBatchTimer() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.batchTimer = undefined;
        }
    }
    /**
     * 判断是否应该重试
     */
    shouldRetry(error) {
        // 配置错误不重试
        if (error instanceof MessageValidationError) {
            return false;
        }
        // 检查最大重试次数
        return (this.config.maxRetries || 0) > 0;
    }
    /**
     * 添加到重试队列
     */
    async addToRetryQueue(message, options, attempt = 0) {
        return new Promise((resolve, reject) => {
            if (attempt >= (this.config.maxRetries || 3)) {
                reject(createQueueError.maxRetriesExceeded(this.queue.name, attempt));
                return;
            }
            this.retryQueue.push({
                message,
                options,
                attempt: attempt + 1,
                resolve,
                reject
            });
        });
    }
    /**
     * 启动重试处理器
     */
    startRetryProcessor() {
        this.retryTimer = setInterval(async () => {
            await this.processRetryQueue();
        }, this.config.retryDelay || 1000);
    }
    /**
     * 停止重试处理器
     */
    stopRetryProcessor() {
        if (this.retryTimer) {
            clearInterval(this.retryTimer);
            this.retryTimer = undefined;
        }
    }
    /**
     * 处理重试队列
     */
    async processRetryQueue() {
        if (this.retryQueue.length === 0) {
            return;
        }
        const retryItems = this.retryQueue.splice(0, 10); // 每次处理10个
        for (const item of retryItems) {
            try {
                // 指数退避延迟
                const delay = Math.min(1000 * Math.pow(2, item.attempt - 1), 30000);
                await sleep(delay);
                const result = await this.sendDirect(item.message, item.options);
                item.resolve(result);
                this.logger.debug(`Message retried successfully`, {
                    messageId: item.message.id,
                    attempt: item.attempt
                });
            }
            catch (error) {
                if (item.attempt >= (this.config.maxRetries || 3)) {
                    item.reject(createQueueError.maxRetriesExceeded(this.queue.name, item.attempt));
                }
                else {
                    // 重新加入重试队列
                    this.retryQueue.push({
                        ...item,
                        attempt: item.attempt + 1
                    });
                }
            }
        }
    }
    /**
     * 刷新重试队列
     */
    async flushRetryQueue() {
        const remainingItems = this.retryQueue.splice(0);
        for (const item of remainingItems) {
            item.reject(new Error('Producer stopped before retry could complete'));
        }
    }
    /**
     * 更新指标
     */
    updateMetrics(startTime, messageCount, success) {
        const latency = Date.now() - startTime;
        if (success) {
            this.metrics.messagesSent += messageCount;
            this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
        }
        // 计算错误率（简化实现）
        const totalAttempts = this.metrics.messagesSent + (success ? 0 : messageCount);
        this.metrics.errorRate = success
            ? this.metrics.errorRate * 0.95
            : this.metrics.errorRate * 0.95 + 0.05;
        // 更新最后发送时间
        this.metrics.lastSentAt = Date.now();
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
//# sourceMappingURL=producer.js.map