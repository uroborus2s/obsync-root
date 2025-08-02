/**
 * 队列管理器 - 统一管理所有队列实例
 */
import { EventEmitter } from 'events';
import { cpus } from 'os';
import { createQueueError, QueueConfigurationError } from '../errors/index.js';
import { RedisConnectionManager } from '../redis/connection.js';
import { createLogger } from '../utils/index.js';
import { Queue } from './queue.js';
// 错误类型转换辅助函数
const toError = (error) => {
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
};
export class QueueManager extends EventEmitter {
    config;
    connectionManager;
    queues = new Map();
    logger;
    isStarted = false;
    healthCheckInterval;
    metricsInterval;
    constructor(config) {
        super();
        this.config = config;
        // 验证配置
        this.validateConfig(config);
        // 初始化连接管理器
        this.connectionManager = new RedisConnectionManager(config.redis);
        // 初始化日志器
        this.logger = createLogger({
            level: 1
        });
        // 设置连接管理器事件监听
        this.setupConnectionEvents();
    }
    /**
     * 连接到Redis
     */
    async connect() {
        try {
            this.logger.info('Connecting to Redis cluster...');
            await this.connectionManager.connect();
            this.emit('connected');
            this.logger.info('Successfully connected to Redis cluster');
        }
        catch (error) {
            this.logger.error('Failed to connect to Redis cluster', toError(error));
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * 断开Redis连接
     */
    async disconnect() {
        try {
            this.logger.info('Disconnecting from Redis cluster...');
            // 停止所有队列
            await this.stopAllQueues();
            // 断开Redis连接
            await this.connectionManager.disconnect();
            this.emit('disconnected');
            this.logger.info('Successfully disconnected from Redis cluster');
        }
        catch (error) {
            this.logger.error('Error during disconnection', toError(error));
            throw error;
        }
    }
    /**
     * 检查是否已连接
     */
    isConnected() {
        return this.connectionManager.isConnectionHealthy();
    }
    /**
     * 创建队列
     */
    async createQueue(name, config) {
        try {
            // 验证队列名称
            this.validateQueueName(name);
            // 检查队列是否已存在
            if (this.queues.has(name)) {
                throw createQueueError.alreadyExists(name);
            }
            // 合并配置
            const queueConfig = {
                ...this.config.defaultQueue,
                ...config
            };
            // 创建队列实例
            const queue = new Queue(name, queueConfig, this.connectionManager);
            // 启动队列（如果管理器已启动）
            if (this.isStarted) {
                await queue.start();
            }
            // 注册队列
            this.queues.set(name, queue);
            // 设置队列事件监听
            this.setupQueueEvents(queue);
            this.emit('queue-created', { name, config: queueConfig });
            this.logger.info(`Queue '${name}' created successfully`);
            return queue;
        }
        catch (error) {
            this.logger.error(`Failed to create queue '${name}'`, toError(error));
            throw error;
        }
    }
    /**
     * 获取队列
     */
    getQueue(name) {
        return this.queues.get(name) || null;
    }
    /**
     * 删除队列
     */
    async deleteQueue(name) {
        try {
            const queue = this.queues.get(name);
            if (!queue) {
                return false;
            }
            // 停止队列
            await queue.stop();
            // 清空队列数据
            await queue.purge();
            // 移除队列
            this.queues.delete(name);
            this.emit('queue-deleted', { name });
            this.logger.info(`Queue '${name}' deleted successfully`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to delete queue '${name}'`, toError(error));
            throw error;
        }
    }
    /**
     * 列出所有队列名称
     */
    listQueues() {
        return Array.from(this.queues.keys());
    }
    /**
     * 启动队列管理器
     */
    async start() {
        try {
            if (this.isStarted) {
                return;
            }
            this.logger.info('Starting queue manager...');
            // 确保已连接
            if (!this.isConnected()) {
                await this.connect();
            }
            // 启动所有队列
            await this.startAllQueues();
            // 启动健康检查
            this.startHealthCheck();
            // 启动指标收集
            this.startMetricsCollection();
            this.isStarted = true;
            this.emit('started');
            this.logger.info('Queue manager started successfully');
        }
        catch (error) {
            this.logger.error('Failed to start queue manager', toError(error));
            throw error;
        }
    }
    /**
     * 停止队列管理器
     */
    async stop() {
        try {
            if (!this.isStarted) {
                return;
            }
            this.logger.info('Stopping queue manager...');
            // 停止健康检查
            this.stopHealthCheck();
            // 停止指标收集
            this.stopMetricsCollection();
            // 停止所有队列
            await this.stopAllQueues();
            this.isStarted = false;
            this.emit('stopped');
            this.logger.info('Queue manager stopped successfully');
        }
        catch (error) {
            this.logger.error('Failed to stop queue manager', toError(error));
            throw error;
        }
    }
    /**
     * 健康检查
     */
    async healthCheck() {
        const startTime = Date.now();
        const checks = [];
        try {
            // Redis健康检查
            const redisStartTime = Date.now();
            const redisHealthy = await this.connectionManager.healthCheck();
            checks.push({
                name: 'redis-connection',
                status: redisHealthy ? 'pass' : 'fail',
                message: redisHealthy
                    ? 'Redis connection is healthy'
                    : 'Redis connection failed',
                duration: Date.now() - redisStartTime,
                timestamp: Date.now()
            });
            // 队列健康检查
            const queueStartTime = Date.now();
            const queueStatuses = await Promise.all(Array.from(this.queues.values()).map(async (queue) => {
                const queueHealthy = queue.isRunning();
                return {
                    name: queue.name,
                    healthy: queueHealthy,
                    info: await queue.getInfo().catch(() => null)
                };
            }));
            const allQueuesHealthy = queueStatuses.every((q) => q.healthy);
            checks.push({
                name: 'queues-status',
                status: allQueuesHealthy ? 'pass' : 'fail',
                message: `${queueStatuses.filter((q) => q.healthy).length}/${queueStatuses.length} queues healthy`,
                duration: Date.now() - queueStartTime,
                timestamp: Date.now()
            });
            // 确定整体状态
            const hasFailures = checks.some((check) => check.status === 'fail');
            const hasWarnings = checks.some((check) => check.status === 'warn');
            let status;
            if (hasFailures) {
                status = 'unhealthy';
            }
            else if (hasWarnings) {
                status = 'degraded';
            }
            else {
                status = 'healthy';
            }
            return {
                status,
                checks,
                timestamp: Date.now(),
                uptime: process.uptime()
            };
        }
        catch (error) {
            this.logger.error('Health check failed', toError(error));
            checks.push({
                name: 'system-health',
                status: 'fail',
                message: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime,
                timestamp: Date.now()
            });
            return {
                status: 'unhealthy',
                checks,
                timestamp: Date.now(),
                uptime: process.uptime()
            };
        }
    }
    /**
     * 获取指标
     */
    async getMetrics() {
        try {
            // 收集队列指标
            const queueMetricsArray = await Promise.all(Array.from(this.queues.values()).map(async (queue) => {
                try {
                    const stats = await queue.getStats();
                    return { name: queue.name, stats };
                }
                catch {
                    return null;
                }
            }));
            const queues = {};
            queueMetricsArray
                .filter((item) => item !== null)
                .forEach(({ name, stats }) => {
                queues[name] = stats;
            });
            // 获取系统指标
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            return {
                queues,
                producers: {}, // TODO: 实现生产者指标收集
                consumers: {}, // TODO: 实现消费者指标收集
                cluster: {
                    nodes: [],
                    totalMemory: 0,
                    usedMemory: 0,
                    totalConnections: 0,
                    commandsPerSecond: 0,
                    keyspaceHits: 0,
                    keyspaceMisses: 0,
                    evictedKeys: 0,
                    expiredKeys: 0
                }, // TODO: 实现集群指标收集
                system: {
                    cpu: {
                        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // 转换为秒
                        cores: cpus().length
                    },
                    memory: {
                        used: memoryUsage.heapUsed,
                        total: memoryUsage.heapTotal,
                        free: memoryUsage.heapTotal - memoryUsage.heapUsed
                    },
                    network: {
                        bytesIn: 0, // TODO: 实现网络指标收集
                        bytesOut: 0,
                        packetsIn: 0,
                        packetsOut: 0
                    },
                    disk: {
                        used: 0, // TODO: 实现磁盘指标收集
                        total: 0,
                        free: 0,
                        iops: 0
                    }
                },
                timestamp: Date.now()
            };
        }
        catch (error) {
            this.logger.error('Failed to get metrics', toError(error));
            throw error;
        }
    }
    /**
     * 验证配置
     */
    validateConfig(config) {
        if (!config.redis) {
            throw new QueueConfigurationError('Redis configuration is required');
        }
        if (!config.redis.cluster && !config.redis.single) {
            throw new QueueConfigurationError('Either cluster or single Redis configuration must be provided');
        }
    }
    /**
     * 验证队列名称
     */
    validateQueueName(name) {
        if (!name || typeof name !== 'string') {
            throw createQueueError.invalidName('Queue name must be a non-empty string');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            throw createQueueError.invalidName('Queue name can only contain letters, numbers, underscores and hyphens');
        }
        if (name.length > 100) {
            throw createQueueError.invalidName('Queue name cannot exceed 100 characters');
        }
    }
    /**
     * 设置连接事件监听
     */
    setupConnectionEvents() {
        this.connectionManager.on('connected', () => {
            this.logger.info('Redis connection established');
        });
        this.connectionManager.on('disconnected', () => {
            this.logger.warn('Redis connection lost');
        });
        this.connectionManager.on('error', (error) => {
            this.logger.error('Redis connection error', error);
            this.emit('error', error);
        });
    }
    /**
     * 设置队列事件监听
     */
    setupQueueEvents(queue) {
        queue.on('error', (error) => {
            this.logger.error(`Queue '${queue.name}' error`, toError(error));
            this.emit('error', error);
        });
        queue.on('message-sent', (data) => {
            this.emit('message-sent', data);
        });
        queue.on('message-received', (data) => {
            this.emit('message-received', data);
        });
    }
    /**
     * 启动所有队列
     */
    async startAllQueues() {
        const startPromises = Array.from(this.queues.values()).map((queue) => queue.start());
        await Promise.all(startPromises);
    }
    /**
     * 停止所有队列
     */
    async stopAllQueues() {
        const stopPromises = Array.from(this.queues.values()).map((queue) => queue.stop());
        await Promise.all(stopPromises);
    }
    /**
     * 启动健康检查
     */
    startHealthCheck() {
        if (this.config.healthCheck?.enabled !== false) {
            const interval = this.config.healthCheck?.interval || 30000; // 30秒
            this.healthCheckInterval = setInterval(async () => {
                try {
                    const health = await this.healthCheck();
                    this.emit('health-check', health);
                }
                catch (error) {
                    this.logger.error('Health check error', toError(error));
                }
            }, interval);
        }
    }
    /**
     * 停止健康检查
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
    }
    /**
     * 启动指标收集
     */
    startMetricsCollection() {
        if (this.config.metrics?.enabled !== false) {
            const interval = this.config.monitoring?.interval || 10000; // 10秒
            this.metricsInterval = setInterval(async () => {
                try {
                    const metrics = await this.getMetrics();
                    this.emit('metrics-updated', metrics);
                }
                catch (error) {
                    this.logger.error('Metrics collection error', toError(error));
                }
            }, interval);
        }
    }
    /**
     * 停止指标收集
     */
    stopMetricsCollection() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = undefined;
        }
    }
}
//# sourceMappingURL=queue-manager.js.map