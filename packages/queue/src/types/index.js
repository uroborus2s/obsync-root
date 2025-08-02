/**
 * 类型定义统一导出
 */
// 常量定义
export const DEFAULT_CONFIG = {
    QUEUE: {
        maxLength: 10000,
        retention: 24 * 60 * 60 * 1000, // 24小时
        retryAttempts: 3,
        retryDelay: 1000,
        priority: false,
        compression: false,
        serialization: 'json'
    },
    PRODUCER: {
        batchSize: 100,
        batchTimeout: 1000,
        compression: false,
        serialization: 'json',
        maxRetries: 3,
        retryDelay: 1000
    },
    CONSUMER: {
        batchSize: 1,
        timeout: 5000,
        autoAck: false,
        maxRetries: 3,
        retryDelay: 1000,
        concurrency: 1
    },
    REDIS: {
        poolSize: 10,
        retryAttempts: 3,
        retryDelay: 1000
    },
    MONITORING: {
        enabled: true,
        interval: 10000, // 10秒
        retention: 24 * 60 * 60 * 1000 // 24小时
    }
};
// 优先级常量
export const PRIORITY = {
    LOWEST: 0,
    LOW: 2,
    NORMAL: 5,
    HIGH: 7,
    HIGHEST: 9
};
// 消息状态常量
export const MESSAGE_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    RETRYING: 'retrying',
    DEAD_LETTER: 'dead_letter'
};
// 健康状态常量
export const HEALTH_STATUS = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy'
};
// 告警严重级别常量
export const ALERT_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};
//# sourceMappingURL=index.js.map