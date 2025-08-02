// @stratix/database 插件配置管理
// 统一的配置验证、默认值处理和类型定义
import { ConfigurationError } from '../utils/error-handler.js';
import { deepMerge } from '../utils/helpers.js';
/**
 * 插件默认配置
 */
export const DEFAULT_PLUGIN_CONFIG = {
    // 默认连接名称
    defaultConnection: 'default',
    // 连接工厂配置
    connectionFactory: {
        autoReconnect: false,
        reconnectInterval: 5000,
        maxReconnectAttempts: 3,
        connectionTestInterval: 30000,
        testOnCreate: true,
        testOnAcquire: false
    },
    // 健康检查配置
    healthCheck: {
        enabled: true,
        intervalMs: 30000,
        interval: 30000,
        timeoutMs: 5000,
        timeout: 5000,
        retryCount: 3,
        retries: 3,
        endpoint: '/health/database'
    },
    // 日志配置
    logging: {
        enabled: true,
        level: 'info',
        queries: false,
        performance: true
    },
    // 监控配置
    monitoring: {
        enabled: true,
        sampleRate: 1.0,
        maxMetricsCount: 10000,
        aggregationWindowMs: 60000,
        slowQueryThresholdMs: 1000
    },
    // 安全配置
    security: {
        enableSqlInjectionProtection: true,
        maxQueryLength: 100000,
        allowedOperations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    }
};
/**
 * 自动发现配置
 */
export const AUTO_DISCOVERY_CONFIG = {
    // 核心模块发现模式
    discovery: {
        enabled: true,
        patterns: [
            'core/*.{ts,js}', // 数据库管理器、连接管理器
            'controllers/*.{ts,js}' // 控制器（路由）
        ],
        exclude: [
            '**/*.test.{ts,js}', // 排除测试文件
            '**/*.spec.{ts,js}', // 排除规范文件
            '**/test/**/*' // 排除测试目录
        ]
    },
    // 服务适配器层发现
    services: {
        enabled: true,
        naming: {
            prefix: 'database' // 服务名前缀
        }
    },
    // 路由配置
    routing: {
        enabled: true, // 启用控制器路由自动扫描
        validation: true // 启用参数验证
    },
    // 调试配置
    debug: {
        enabled: process.env.NODE_ENV === 'development',
        verbose: false,
        logRegistrations: true
    }
};
/**
 * 配置验证器
 */
export class PluginConfigValidator {
    /**
     * 验证插件配置
     */
    static validateConfig(options) {
        try {
            // 基础配置验证
            if (!options || typeof options !== 'object') {
                throw new ConfigurationError('Plugin options must be an object');
            }
            // 连接配置验证
            if (!options.connections) {
                throw new ConfigurationError('Database connections configuration is required');
            }
            if (typeof options.connections !== 'object') {
                throw new ConfigurationError('Connections must be an object');
            }
            // 验证至少有一个连接配置
            const connectionNames = Object.keys(options.connections);
            if (connectionNames.length === 0) {
                throw new ConfigurationError('At least one database connection must be configured');
            }
            // 验证每个连接配置
            for (const [name, config] of Object.entries(options.connections)) {
                this.validateConnectionConfig(name, config);
            }
            // 验证默认连接存在
            const defaultConnection = options.defaultConnection || DEFAULT_PLUGIN_CONFIG.defaultConnection;
            if (defaultConnection && !options.connections[defaultConnection]) {
                throw new ConfigurationError(`Default connection '${defaultConnection}' is not defined in connections`);
            }
            // 合并默认配置
            const validatedConfig = deepMerge(DEFAULT_PLUGIN_CONFIG, options);
            return validatedConfig;
        }
        catch (error) {
            if (error instanceof ConfigurationError) {
                throw error;
            }
            throw new ConfigurationError(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 验证单个连接配置
     */
    static validateConnectionConfig(name, config) {
        if (!config || typeof config !== 'object') {
            throw new ConfigurationError(`Connection '${name}' configuration must be an object`);
        }
        // 验证数据库类型
        if (!config.type) {
            throw new ConfigurationError(`Connection '${name}' must specify a database type`);
        }
        const supportedTypes = ['postgresql', 'mysql', 'sqlite', 'mssql'];
        if (!supportedTypes.includes(config.type)) {
            throw new ConfigurationError(`Connection '${name}' has unsupported database type '${config.type}'. ` +
                `Supported types: ${supportedTypes.join(', ')}`);
        }
        // SQLite 特殊验证
        if (config.type === 'sqlite') {
            if (!config.database) {
                throw new ConfigurationError(`SQLite connection '${name}' must specify a database file path`);
            }
        }
        else {
            // 其他数据库类型的验证
            if (!config.host) {
                throw new ConfigurationError(`Connection '${name}' must specify a host`);
            }
            if (!config.database) {
                throw new ConfigurationError(`Connection '${name}' must specify a database name`);
            }
        }
        // 验证连接池配置
        if (config.pool) {
            this.validatePoolConfig(name, config.pool);
        }
    }
    /**
     * 验证连接池配置
     */
    static validatePoolConfig(connectionName, poolConfig) {
        if (typeof poolConfig !== 'object') {
            throw new ConfigurationError(`Connection '${connectionName}' pool configuration must be an object`);
        }
        // 验证数值配置
        const numericFields = [
            'min',
            'max',
            'acquireTimeoutMillis',
            'createTimeoutMillis'
        ];
        for (const field of numericFields) {
            if (poolConfig[field] !== undefined) {
                if (typeof poolConfig[field] !== 'number' || poolConfig[field] < 0) {
                    throw new ConfigurationError(`Connection '${connectionName}' pool.${field} must be a non-negative number`);
                }
            }
        }
        // 验证 min <= max
        if (poolConfig.min !== undefined && poolConfig.max !== undefined) {
            if (poolConfig.min > poolConfig.max) {
                throw new ConfigurationError(`Connection '${connectionName}' pool.min (${poolConfig.min}) cannot be greater than pool.max (${poolConfig.max})`);
            }
        }
    }
    /**
     * 验证健康检查配置
     */
    static validateHealthCheckConfig(config) {
        if (!config)
            return;
        if (typeof config !== 'object') {
            throw new ConfigurationError('Health check configuration must be an object');
        }
        // 验证数值字段
        const numericFields = ['intervalMs', 'timeoutMs', 'retryCount'];
        for (const field of numericFields) {
            if (config[field] !== undefined) {
                if (typeof config[field] !== 'number' || config[field] <= 0) {
                    throw new ConfigurationError(`Health check ${field} must be a positive number`);
                }
            }
        }
        // 验证端点路径
        if (config.endpoint && typeof config.endpoint !== 'string') {
            throw new ConfigurationError('Health check endpoint must be a string');
        }
    }
    /**
     * 验证监控配置
     */
    static validateMonitoringConfig(config) {
        if (!config)
            return;
        if (typeof config !== 'object') {
            throw new ConfigurationError('Monitoring configuration must be an object');
        }
        // 验证采样率
        if (config.sampleRate !== undefined) {
            if (typeof config.sampleRate !== 'number' ||
                config.sampleRate < 0 ||
                config.sampleRate > 1) {
                throw new ConfigurationError('Monitoring sampleRate must be a number between 0 and 1');
            }
        }
        // 验证其他数值字段
        const numericFields = [
            'maxMetricsCount',
            'aggregationWindowMs',
            'slowQueryThresholdMs'
        ];
        for (const field of numericFields) {
            if (config[field] !== undefined) {
                if (typeof config[field] !== 'number' || config[field] <= 0) {
                    throw new ConfigurationError(`Monitoring ${field} must be a positive number`);
                }
            }
        }
    }
}
/**
 * 配置工厂函数
 */
export const createPluginConfig = (options) => {
    return PluginConfigValidator.validateConfig(options);
};
/**
 * 获取自动发现配置
 */
export const getAutoDiscoveryConfig = (overrides = {}) => {
    return deepMerge(AUTO_DISCOVERY_CONFIG, overrides);
};
/**
 * 配置助手函数
 */
export const ConfigHelpers = {
    /**
     * 检查是否启用健康检查
     */
    isHealthCheckEnabled: (config) => {
        return config.healthCheck?.enabled !== false;
    },
    /**
     * 获取健康检查端点
     */
    getHealthCheckEndpoint: (config) => {
        return (config.healthCheck?.endpoint ||
            DEFAULT_PLUGIN_CONFIG.healthCheck.endpoint);
    },
    /**
     * 检查是否启用监控
     */
    isMonitoringEnabled: (config) => {
        return config.monitoring?.enabled !== false;
    }
};
