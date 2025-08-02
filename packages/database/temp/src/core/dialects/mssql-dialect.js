// @stratix/database MSSQL方言实现
// 基于Kysely和tedious驱动的Microsoft SQL Server数据库支持
import { Pool } from 'tarn';
import { Connection } from 'tedious';
import { failureResult, successResult } from '../../utils/helpers.js';
import { BaseDialect } from './base-dialect.js';
/**
 * MSSQL数据库方言实现
 */
export class MSSQLDialect extends BaseDialect {
    constructor() {
        super(...arguments);
        this.type = 'mssql';
        this.defaultPort = 1433;
    }
    /**
     * 创建 Kysely 实例
     */
    async createKysely(config) {
        return this.wrapConnectionCreation(async () => {
            // 验证配置
            const configResult = this.validateConfig(config);
            if (!configResult.success) {
                throw new Error(configResult.error?.message || 'Configuration validation failed');
            }
            // 检查tedious驱动是否可用
            const driverResult = await this.checkDriverAvailability();
            if (!driverResult.success) {
                throw new Error(driverResult.error?.message || 'Driver availability check failed');
            }
            // MSSQL 方言暂未完全实现
            // 返回错误提示用户使用其他数据库类型
            throw new Error('MSSQL dialect is not fully implemented yet. ' +
                'Please use PostgreSQL, MySQL, or SQLite instead. ' +
                'MSSQL support will be added in a future release.');
        }, 'create-connection');
    }
    /**
     * 验证配置
     */
    validateConfig(config) {
        // 基础验证
        const baseResult = this.validateBaseConfig(config);
        if (!baseResult.success) {
            return baseResult;
        }
        try {
            // MSSQL特定验证
            if (!config.connectionString) {
                if (!config.host) {
                    throw new Error('Host is required for MSSQL connections');
                }
                if (!config.username) {
                    throw new Error('Username is required for MSSQL connections');
                }
                if (!config.database) {
                    throw new Error('Database name is required for MSSQL connections');
                }
            }
            // 验证认证类型
            if (config.options?.authentication) {
                const validAuthTypes = [
                    'default',
                    'ntlm',
                    'azure-active-directory-password',
                    'azure-active-directory-access-token'
                ];
                if (!validAuthTypes.includes(config.options.authentication.type)) {
                    throw new Error(`Invalid authentication type for MSSQL: ${config.options.authentication.type}`);
                }
            }
            return successResult(true);
        }
        catch (error) {
            return failureResult(this.handleConnectionError(error));
        }
    }
    /**
     * 获取健康检查查询
     */
    getHealthCheckQuery() {
        return 'SELECT 1 as health';
    }
    /**
     * 检查驱动依赖是否可用
     */
    async checkDriverAvailability() {
        const tediousResult = await this.checkRequiredModule('tedious');
        if (!tediousResult.success) {
            return tediousResult;
        }
        const tarnResult = await this.checkRequiredModule('tarn');
        if (!tarnResult.success) {
            return tarnResult;
        }
        return successResult(true);
    }
    /**
     * 格式化连接字符串
     */
    formatConnectionString(params) {
        const { host, port, database, username, password } = params;
        // MSSQL连接字符串格式
        let connectionString = `mssql://${username}`;
        if (password) {
            connectionString += `:${password}`;
        }
        connectionString += `@${host}:${port}/${database}`;
        // 添加查询参数
        const queryParams = this.buildQueryParams(params);
        if (queryParams) {
            connectionString += `?${queryParams}`;
        }
        return connectionString;
    }
    /**
     * 获取方言特定的连接选项
     */
    getDialectSpecificOptions(config) {
        const options = {};
        // 连接超时
        if (config.options?.connectTimeout) {
            options.connectTimeout = config.options.connectTimeout;
        }
        // 请求超时
        if (config.options?.requestTimeout) {
            options.requestTimeout = config.options.requestTimeout;
        }
        // 取消超时
        if (config.options?.cancelTimeout) {
            options.cancelTimeout = config.options.cancelTimeout;
        }
        // 数据包大小
        if (config.options?.packetSize) {
            options.packetSize = config.options.packetSize;
        }
        // 实例名称
        if (config.options?.instanceName) {
            options.instanceName = config.options.instanceName;
        }
        // 加密选项
        if (config.options?.encrypt !== undefined) {
            options.encrypt = config.options.encrypt;
        }
        // 信任服务器证书
        if (config.options?.trustServerCertificate !== undefined) {
            options.trustServerCertificate = config.options.trustServerCertificate;
        }
        // 认证配置
        if (config.options?.authentication) {
            options.authentication = config.options.authentication;
        }
        return options;
    }
    /**
     * 创建连接池配置
     * 注意：此方法为未来完整实现保留，当前 MSSQL 方言尚未完全实现
     */
    // @ts-ignore - 保留用于未来实现
    createPoolConfig(config) {
        const baseConfig = this.getConnectionOptions(config);
        // @ts-ignore - 保留用于未来实现
        const poolSettings = this.mergePoolConfig(config);
        const tediousConfig = {
            server: baseConfig.host,
            authentication: {
                type: 'default',
                options: {
                    userName: baseConfig.user,
                    password: baseConfig.password
                }
            },
            options: {
                database: baseConfig.database,
                port: baseConfig.port,
                connectTimeout: baseConfig.connectTimeout || 15000,
                requestTimeout: baseConfig.requestTimeout || 15000,
                cancelTimeout: baseConfig.cancelTimeout || 5000,
                encrypt: baseConfig.encrypt ?? true,
                trustServerCertificate: baseConfig.trustServerCertificate ?? false,
                packetSize: baseConfig.packetSize || 4096,
                useUTC: true,
                abortTransactionOnError: true,
                ...config.options
            }
        };
        // 处理实例名称
        if (baseConfig.instanceName) {
            tediousConfig.options.instanceName = baseConfig.instanceName;
        }
        // 处理认证配置
        if (baseConfig.authentication) {
            tediousConfig.authentication = baseConfig.authentication;
        }
        // 如果提供了连接字符串，解析并覆盖配置
        if (config.connectionString) {
            const parsedConfig = this.parseConnectionString(config.connectionString);
            Object.assign(tediousConfig, parsedConfig);
        }
        return tediousConfig;
    }
    /**
     * 创建连接池
     * 注意：此方法为未来完整实现保留，当前 MSSQL 方言尚未完全实现
     */
    // @ts-ignore - 保留用于未来实现
    createConnectionPool(tediousConfig) {
        const poolConfig = this.mergePoolConfig({
            pool: {
                min: 1,
                max: 10,
                acquireTimeoutMillis: 30000,
                createTimeoutMillis: 10000,
                destroyTimeoutMillis: 5000,
                idleTimeoutMillis: 300000
            }
        });
        return new Pool({
            create: async () => {
                return new Promise((resolve, reject) => {
                    const connection = new Connection(tediousConfig);
                    connection.connect((err) => {
                        if (err) {
                            reject(this.handleConnectionError(err));
                        }
                        else {
                            resolve(connection);
                        }
                    });
                });
            },
            destroy: async (connection) => {
                return new Promise((resolve) => {
                    connection.close();
                    resolve(undefined);
                });
            },
            validate: (connection) => {
                return (connection && connection.state && connection.state.name === 'LoggedIn');
            },
            min: poolConfig.min,
            max: poolConfig.max,
            acquireTimeoutMillis: poolConfig.acquireTimeoutMillis,
            createTimeoutMillis: poolConfig.createTimeoutMillis,
            destroyTimeoutMillis: poolConfig.destroyTimeoutMillis,
            idleTimeoutMillis: poolConfig.idleTimeoutMillis,
            reapIntervalMillis: poolConfig.reapIntervalMillis
        });
    }
    /**
     * 解析连接字符串
     */
    parseConnectionString(connectionString) {
        // 简化的连接字符串解析
        const url = new URL(connectionString);
        const config = {
            server: url.hostname,
            authentication: {
                type: 'default',
                options: {
                    userName: url.username,
                    password: url.password
                }
            },
            options: {
                database: url.pathname.substring(1), // 去掉开头的 '/'
                port: parseInt(url.port) || this.defaultPort
            }
        };
        // 解析查询参数
        url.searchParams.forEach((value, key) => {
            switch (key.toLowerCase()) {
                case 'encrypt':
                    config.options.encrypt = value.toLowerCase() === 'true';
                    break;
                case 'trustservercertificate':
                    config.options.trustServerCertificate =
                        value.toLowerCase() === 'true';
                    break;
                case 'connecttimeout':
                    config.options.connectTimeout = parseInt(value);
                    break;
                case 'requesttimeout':
                    config.options.requestTimeout = parseInt(value);
                    break;
                case 'instancename':
                    config.options.instanceName = value;
                    break;
            }
        });
        return config;
    }
    /**
     * 构建查询参数字符串
     */
    buildQueryParams(params) {
        const queryParams = [];
        if (params.encrypt !== undefined) {
            queryParams.push(`encrypt=${params.encrypt}`);
        }
        if (params.trustServerCertificate !== undefined) {
            queryParams.push(`trustServerCertificate=${params.trustServerCertificate}`);
        }
        if (params.connectTimeout) {
            queryParams.push(`connectTimeout=${params.connectTimeout}`);
        }
        if (params.requestTimeout) {
            queryParams.push(`requestTimeout=${params.requestTimeout}`);
        }
        if (params.instanceName) {
            queryParams.push(`instanceName=${params.instanceName}`);
        }
        return queryParams.join('&');
    }
    /**
     * 格式化错误消息
     */
    formatErrorMessage(error) {
        const message = error.message;
        // MSSQL特定错误处理
        if (message.includes('Login failed')) {
            return 'MSSQL login failed. Please check your username and password.';
        }
        if (message.includes('Cannot open database')) {
            return 'MSSQL cannot open database. Please check the database name and permissions.';
        }
        if (message.includes('Server is not found or not accessible')) {
            return 'MSSQL server not found or not accessible. Please check the server name and network connection.';
        }
        if (message.includes('timeout')) {
            return 'MSSQL connection timeout. Please check your network connection and server status.';
        }
        if (message.includes('SSL/TLS')) {
            return 'MSSQL SSL/TLS error. Please check your encryption settings.';
        }
        if (message.includes('Invalid object name')) {
            return 'MSSQL invalid object name. Please check your table or view names.';
        }
        return `MSSQL error: ${message}`;
    }
    /**
     * 获取默认连接池配置
     */
    getDefaultPoolConfig() {
        return {
            ...super.getDefaultPoolConfig(),
            // MSSQL特定的默认值
            max: 15,
            acquireTimeoutMillis: 30000,
            createTimeoutMillis: 15000
        };
    }
}
/**
 * 创建MSSQL方言实例
 */
export const createMSSQLDialect = () => {
    return new MSSQLDialect();
};
