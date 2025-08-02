// @stratix/database 数据库方言基础抽象类
// 为所有数据库类型提供统一的接口抽象
import { ConfigurationError, ConnectionError, DatabaseErrorHandler } from '../../utils/error-handler.js';
import { failureResult, successResult } from '../../utils/helpers.js';
/**
 * 数据库方言基础抽象类
 * 定义所有数据库方言必须实现的核心方法
 */
export class BaseDialect {
    /**
     * 构建连接字符串
     */
    buildConnectionString(config) {
        if (config.connectionString) {
            return config.connectionString;
        }
        const host = config.host || 'localhost';
        const port = config.port || this.defaultPort;
        const database = config.database;
        const username = config.username || '';
        const password = config.password || '';
        return this.formatConnectionString({
            host,
            port,
            database,
            username,
            password,
            ...config.options
        });
    }
    /**
     * 获取连接选项
     */
    getConnectionOptions(config) {
        return {
            host: config.host || 'localhost',
            port: config.port || this.defaultPort,
            database: config.database,
            user: config.username,
            password: config.password,
            ...this.getDialectSpecificOptions(config),
            ...config.options
        };
    }
    /**
     * 获取方言特定的连接选项
     */
    getDialectSpecificOptions(config) {
        return {};
    }
    /**
     * 处理连接错误
     */
    handleConnectionError(error, connectionName) {
        const message = this.formatErrorMessage(error);
        return ConnectionError.create(message, connectionName, error);
    }
    /**
     * 格式化错误消息
     */
    formatErrorMessage(error) {
        return `${this.type} connection failed: ${error.message}`;
    }
    /**
     * 通用配置验证
     */
    validateBaseConfig(config) {
        try {
            // 验证数据库类型
            if (config.type !== this.type) {
                throw new Error(`Invalid database type. Expected ${this.type}, got ${config.type}`);
            }
            // 验证必需字段
            if (!config.database) {
                throw new Error('Database name is required');
            }
            // 如果没有连接字符串，验证基本连接参数
            if (!config.connectionString) {
                if (!config.host && config.type !== 'sqlite') {
                    throw new Error('Host is required for non-SQLite databases');
                }
                if (config.type !== 'sqlite' && !config.username) {
                    console.warn(`No username provided for ${this.type} connection`);
                }
            }
            return successResult(true);
        }
        catch (error) {
            return failureResult(ConfigurationError.create(error instanceof Error ? error.message : String(error)));
        }
    }
    /**
     * 测试连接
     */
    async testConnection(config, logger) {
        const testOperation = async () => {
            // 验证配置
            const configResult = this.validateConfig(config);
            if (!configResult.success) {
                throw new Error(configResult.error?.message || 'Configuration validation failed');
            }
            // 检查驱动可用性
            const driverResult = await this.checkDriverAvailability();
            if (!driverResult.success) {
                throw new Error(driverResult.error?.message || 'Driver availability check failed');
            }
            // 创建临时连接
            const connectionResult = await this.createKysely(config, logger);
            if (!connectionResult.success) {
                throw new Error(connectionResult.error?.message || 'Connection creation failed');
            }
            const connection = connectionResult.data;
            try {
                // 执行简单的健康检查 - 先跳过实际查询
                // TODO: 实现具体的健康检查查询
                return true;
            }
            finally {
                // 确保关闭连接
                await connection.destroy();
            }
        };
        return await DatabaseErrorHandler.execute(testOperation, `test-connection:${this.type}`);
    }
    /**
     * 获取默认连接池配置
     */
    getDefaultPoolConfig() {
        return {
            min: 1,
            max: 10,
            acquireTimeoutMillis: 60000,
            createTimeoutMillis: 30000,
            destroyTimeoutMillis: 5000,
            idleTimeoutMillis: 300000,
            reapIntervalMillis: 10000,
            createRetryIntervalMillis: 200
        };
    }
    /**
     * 合并连接池配置
     */
    mergePoolConfig(config) {
        return {
            ...this.getDefaultPoolConfig(),
            ...config.pool
        };
    }
    /**
     * 获取SSL配置
     */
    getSSLConfig(config) {
        if (!config.ssl) {
            return undefined;
        }
        return {
            rejectUnauthorized: config.ssl.rejectUnauthorized ?? true,
            ca: config.ssl.ca,
            cert: config.ssl.cert,
            key: config.ssl.key,
            servername: config.ssl.servername,
            ...this.getDialectSpecificSSLOptions(config.ssl)
        };
    }
    /**
     * 获取方言特定的SSL选项
     */
    getDialectSpecificSSLOptions(ssl) {
        return {};
    }
    /**
     * 检查必需的模块是否可用
     * 使用动态导入替代 require，支持 ES6 模块
     */
    async checkRequiredModule(moduleName) {
        try {
            // 使用动态导入替代 require
            const module = await import(moduleName);
            return successResult(module);
        }
        catch (error) {
            return failureResult(ConnectionError.create(`Required module '${moduleName}' is not installed. Please install it using: npm install ${moduleName}`, undefined, error));
        }
    }
    /**
     * 创建数据库日志记录器
     */
    createDatabaseLogger(logger, dialectName) {
        const name = dialectName || this.type;
        return (event) => {
            try {
                // 使用框架日志器记录查询信息
                if (event.level === 'query') {
                    logger.debug({
                        dialect: name,
                        sql: event.query?.sql,
                        duration: event.queryDurationMillis,
                        params: event.query?.parameters
                    }, `[${name.toUpperCase()}] Query executed`);
                    // 检查慢查询
                    if (event.queryDurationMillis > 1000) {
                        logger.warn({
                            dialect: name,
                            sql: event.query?.sql,
                            duration: event.queryDurationMillis
                        }, `[${name.toUpperCase()}] Slow query detected: ${event.queryDurationMillis}ms`);
                    }
                }
                else if (event.level === 'error') {
                    logger.error({
                        dialect: name,
                        error: event.error,
                        sql: event.query?.sql
                    }, `[${name.toUpperCase()}] Query error`);
                }
            }
            catch (error) {
                // 如果框架日志器出错，回退到console
                console.log(`[${name.toUpperCase()}] ${event.level}: ${event.query?.sql}`);
                if (event.queryDurationMillis > 1000) {
                    console.warn(`[${name.toUpperCase()}] Slow query detected: ${event.queryDurationMillis}ms`);
                }
            }
        };
    }
    /**
     * 创建错误处理包装器
     */
    wrapConnectionCreation(operation, operationName) {
        return DatabaseErrorHandler.execute(operation, `${this.type}:${operationName}`);
    }
}
/**
 * 方言注册表
 */
export class DialectRegistry {
    /**
     * 注册方言
     */
    static register(dialect) {
        this.dialects.set(dialect.type, dialect);
    }
    /**
     * 获取方言
     */
    static get(type) {
        return this.dialects.get(type);
    }
    /**
     * 获取所有支持的方言类型
     */
    static getSupportedTypes() {
        return Array.from(this.dialects.keys());
    }
    /**
     * 检查是否支持指定类型
     */
    static isSupported(type) {
        return this.dialects.has(type);
    }
    /**
     * 清空注册表（主要用于测试）
     */
    static clear() {
        this.dialects.clear();
    }
}
DialectRegistry.dialects = new Map();
