/**
 * 健康检查和系统状态监控
 */
import { EventEmitter } from 'events';
import { createLogger, LogLevel } from '../utils/index.js';
// 抽象健康检查基类
export class BaseHealthCheck {
    name;
    logger;
    timeout;
    required;
    constructor(name, config = {}) {
        this.name = name;
        this.logger = createLogger({ level: LogLevel.INFO, format: 'json' });
        this.logger.setContext({ component: `HealthCheck:${name}` });
        this.timeout = config.timeout || 5000;
        this.required = config.required !== false;
    }
    getTimeout() {
        return this.timeout;
    }
    isRequired() {
        return this.required;
    }
    /**
     * 带超时的健康检查
     */
    async checkWithTimeout() {
        const startTime = Date.now();
        try {
            const result = await Promise.race([
                this.check(),
                this.createTimeoutPromise()
            ]);
            return {
                ...result,
                duration: Date.now() - startTime,
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                healthy: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime,
                timestamp: Date.now()
            };
        }
    }
    /**
     * 创建超时Promise
     */
    createTimeoutPromise() {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Health check timeout after ${this.timeout}ms`));
            }, this.timeout);
        });
    }
}
// Redis健康检查
export class RedisHealthCheck extends BaseHealthCheck {
    getConnection;
    constructor(getConnection, config = {}) {
        super('redis', config);
        this.getConnection = getConnection;
    }
    async check() {
        try {
            const connection = this.getConnection();
            const response = await connection.ping();
            return {
                healthy: true,
                message: 'Redis connection is healthy',
                details: { response: response },
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                healthy: false,
                message: `Redis connection failed: ${error instanceof Error ? error.message : String(error)}`,
                details: {
                    error: error instanceof Error ? error.message : String(error)
                },
                timestamp: Date.now()
            };
        }
    }
}
// 队列健康检查
export class QueueHealthCheck extends BaseHealthCheck {
    queueName;
    getQueueInfo;
    constructor(queueName, getQueueInfo, config = {}) {
        super(`Queue:${queueName}`, config);
        this.queueName = queueName;
        this.getQueueInfo = getQueueInfo;
    }
    async check() {
        try {
            const queueInfo = await this.getQueueInfo();
            return {
                healthy: !!queueInfo,
                message: queueInfo ? 'Queue is healthy' : 'Queue check failed',
                details: { queueInfo },
                timestamp: Date.now()
            };
        }
        catch (error) {
            return {
                healthy: false,
                message: `Queue check failed: ${error instanceof Error ? error.message : String(error)}`,
                details: {
                    error: error instanceof Error ? error.message : String(error)
                },
                timestamp: Date.now()
            };
        }
    }
}
// 内存健康检查
export class MemoryHealthCheck extends BaseHealthCheck {
    maxMemoryUsage;
    constructor(maxMemoryUsage = 0.9, // 90%
    config = {}) {
        super('Memory', config);
        this.maxMemoryUsage = maxMemoryUsage;
    }
    async check() {
        const memUsage = process.memoryUsage();
        const totalMemory = memUsage.heapTotal;
        const usedMemory = memUsage.heapUsed;
        const usageRatio = usedMemory / totalMemory;
        return {
            healthy: usageRatio <= this.maxMemoryUsage,
            message: `Memory usage: ${(usageRatio * 100).toFixed(2)}%`,
            details: {
                usedMemory,
                totalMemory,
                usageRatio,
                threshold: this.maxMemoryUsage
            },
            timestamp: Date.now()
        };
    }
}
// 事件循环延迟健康检查
export class EventLoopHealthCheck extends BaseHealthCheck {
    maxLag;
    constructor(maxLag = 100, // 100ms
    config = {}) {
        super('EventLoop', config);
        this.maxLag = maxLag;
    }
    async check() {
        const lag = await this.measureEventLoopLag();
        return {
            healthy: lag <= this.maxLag,
            message: `Event loop lag: ${lag}ms`,
            details: {
                lag,
                threshold: this.maxLag
            },
            timestamp: Date.now()
        };
    }
    async measureEventLoopLag() {
        return new Promise((resolve) => {
            const start = process.hrtime.bigint();
            setImmediate(() => {
                const lag = Number(process.hrtime.bigint() - start) / 1e6;
                resolve(lag);
            });
        });
    }
}
// 健康监控器
export class HealthMonitor extends EventEmitter {
    config;
    healthChecks = new Map();
    lastResults = new Map();
    logger;
    monitorInterval;
    isMonitoring = false;
    constructor(config = {}) {
        super();
        this.config = config;
        this.logger = createLogger({
            level: 1,
            format: 'json'
        });
        this.config = {
            checkInterval: 30000, // 30秒
            enableAutoCheck: true,
            ...config
        };
    }
    /**
     * 启动健康监控
     */
    start() {
        if (this.isMonitoring) {
            return;
        }
        this.logger.info('Starting health monitoring...');
        if (this.config.enableAutoCheck) {
            this.monitorInterval = setInterval(() => {
                this.checkAll().catch((error) => {
                    this.logger.error('Health check failed', error);
                });
            }, this.config.checkInterval);
        }
        this.isMonitoring = true;
        this.emit('started');
    }
    /**
     * 停止健康监控
     */
    stop() {
        if (!this.isMonitoring) {
            return;
        }
        this.logger.info('Stopping health monitoring...');
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = undefined;
        }
        this.isMonitoring = false;
        this.emit('stopped');
    }
    /**
     * 注册健康检查
     */
    registerCheck(healthCheck) {
        this.healthChecks.set(healthCheck.name, healthCheck);
        this.logger.debug(`Registered health check: ${healthCheck.name}`);
    }
    /**
     * 注销健康检查
     */
    unregisterCheck(name) {
        this.healthChecks.delete(name);
        this.lastResults.delete(name);
        this.logger.debug(`Unregistered health check: ${name}`);
    }
    /**
     * 执行所有健康检查
     */
    async checkAll() {
        const results = {};
        const promises = [];
        for (const [name, healthCheck] of this.healthChecks) {
            const promise = this.executeHealthCheck(name, healthCheck)
                .then((result) => {
                results[name] = result;
                this.lastResults.set(name, result);
            })
                .catch((error) => {
                const errorResult = {
                    healthy: false,
                    message: `Health check execution failed: ${error.message}`,
                    timestamp: Date.now()
                };
                results[name] = errorResult;
                this.lastResults.set(name, errorResult);
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        const overallHealth = this.calculateOverallHealth(results);
        this.emit('health-checked', overallHealth);
        return overallHealth;
    }
    /**
     * 执行单个健康检查
     */
    async checkOne(name) {
        const healthCheck = this.healthChecks.get(name);
        if (!healthCheck) {
            return null;
        }
        const result = await this.executeHealthCheck(name, healthCheck);
        this.lastResults.set(name, result);
        return result;
    }
    /**
     * 获取最后的健康检查结果
     */
    getLastResults() {
        return new Map(this.lastResults);
    }
    /**
     * 获取特定检查的最后结果
     */
    getLastResult(name) {
        return this.lastResults.get(name);
    }
    /**
     * 执行健康检查
     */
    async executeHealthCheck(name, healthCheck) {
        const startTime = Date.now();
        try {
            this.logger.debug(`Executing health check: ${name}`);
            const result = await Promise.race([
                healthCheck.check(),
                this.createTimeoutPromise(healthCheck.getTimeout())
            ]);
            const finalResult = {
                ...result,
                duration: Date.now() - startTime,
                timestamp: Date.now()
            };
            this.logger.debug(`Health check completed: ${name}`, {
                healthy: finalResult.healthy,
                duration: finalResult.duration
            });
            return finalResult;
        }
        catch (error) {
            const errorResult = {
                healthy: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime,
                timestamp: Date.now()
            };
            this.logger.warn(`Health check failed: ${name}`, error);
            return errorResult;
        }
    }
    /**
     * 创建超时Promise
     */
    createTimeoutPromise(timeout) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Health check timeout after ${timeout}ms`));
            }, timeout);
        });
    }
    /**
     * 计算整体健康状态
     */
    calculateOverallHealth(results) {
        const checks = Object.entries(results);
        const requiredChecks = checks.filter(([name]) => {
            const healthCheck = this.healthChecks.get(name);
            return healthCheck?.isRequired() !== false;
        });
        const requiredHealthy = requiredChecks.every(([, result]) => result.healthy);
        // 转换结果格式以匹配HealthStatus接口
        const healthChecks = Object.entries(results).map(([name, result]) => ({
            name,
            status: result.healthy ? 'pass' : 'fail',
            message: result.message,
            duration: result.duration || 0,
            timestamp: result.timestamp
        }));
        return {
            status: requiredHealthy ? 'healthy' : 'unhealthy',
            checks: healthChecks,
            timestamp: Date.now(),
            uptime: process.uptime()
        };
    }
}
// 便捷函数
export const createHealthMonitor = (config) => {
    return new HealthMonitor(config);
};
//# sourceMappingURL=health.js.map