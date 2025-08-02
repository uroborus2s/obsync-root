// @stratix/database 插件入口文件
// Stratix 数据库插件主入口 - 采用函数式编程架构设计
import { withRegisterAutoDI } from '@stratix/core';
import { get, isDevelopment } from '@stratix/utils/environment';
// 导出类型
export * from './types/index.js';
// 导出函数式编程基础工具
export * from './utils/driver-checker.js';
export { ConfigurationError, ConnectionError, DatabaseErrorHandler, QueryError, TransactionError } from './utils/error-handler.js';
export { failure, failureResult, fromNullable, mapResult, memoize, success, successResult } from './utils/helpers.js';
// 导出配置管理
export * from './config/plugin-config.js';
// 导出 Kysely 工具函数
export { sql } from 'kysely';
import { getAutoDiscoveryConfig } from './config/plugin-config.js';
import { deepMerge } from './utils/helpers.js';
/**
 * 数据库插件主函数
 *
 * 基于函数式编程架构设计：
 * - 统一配置验证和默认值处理
 * - 函数式错误处理和恢复机制
 * - 连接管理和负载均衡
 * - 性能监控和指标收集
 * - 仓储模式和事务支持
 *
 * @param fastify - Fastify 实例
 * @param options - 数据库插件配置选项
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * // 基础配置
 * const basicConfig = {
 *   connections: {
 *     default: {
 *       type: 'sqlite',
 *       database: ':memory:'
 *     }
 *   }
 * };
 *
 * // 生产环境配置
 * const productionConfig = DatabasePluginHelpers.createProductionConfig({
 *   default: {
 *     type: 'postgresql',
 *     host: 'localhost',
 *     port: 5432,
 *     database: 'myapp',
 *     username: 'user',
 *     password: 'password'
 *   }
 * });
 * ```
 */
const database = async (fastify, options) => { };
/**
 * 创建并导出 Stratix 数据库插件
 *
 * 使用增强的 withRegisterAutoDI 启用双层生命周期架构：
 * - 统一的自动发现配置
 * - 优化的服务注册策略
 * - 清晰的模块边界定义
 * - 🎯 集成新的5个核心生命周期阶段
 */
const stratixDatabasePlugin = withRegisterAutoDI(database, {
    ...getAutoDiscoveryConfig({
        // 可以在这里覆盖默认配置
        debug: {
            enabled: isDevelopment(),
            verbose: get('DATABASE_DEBUG_VERBOSE') === 'true',
            logRegistrations: get('DATABASE_LOG_REGISTRATIONS') !== 'false'
        }
    }),
    // 🎯 参数处理器 - 深度合并默认配置和用户参数
    parameterProcessor: (options) => {
        const defaultConfig = {
            defaultConnection: 'default',
            healthCheck: {
                enabled: true,
                intervalMs: 30000,
                timeoutMs: 5000,
                retryCount: 3
            },
            logging: {
                enabled: true,
                level: 'info',
                queries: false,
                performance: true
            },
            monitoring: {
                enabled: true,
                sampleRate: 1.0,
                slowQueryThresholdMs: 1000
            },
            security: {
                enableSqlInjectionProtection: true,
                maxQueryLength: 100000,
                allowedOperations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
            }
        };
        // 使用深度合并将默认配置和用户参数合并
        return deepMerge(defaultConfig, options || {});
    },
    // 🎯 参数验证器 - 验证配置的正确性和安全性
    parameterValidator: (options) => {
        try {
            // 基础配置验证
            if (!options || typeof options !== 'object') {
                console.error('❌ Database plugin options must be an object');
                return false;
            }
            // 连接配置验证
            if (!options.connections) {
                console.error('❌ Database connections configuration is required');
                return false;
            }
            if (typeof options.connections !== 'object') {
                console.error('❌ Database connections must be an object');
                return false;
            }
            // 验证至少有一个连接配置
            const connectionNames = Object.keys(options.connections);
            if (connectionNames.length === 0) {
                console.error('❌ At least one database connection must be configured');
                return false;
            }
            // 验证每个连接配置
            for (const [name, config] of Object.entries(options.connections)) {
                const conn = config;
                if (!conn.type) {
                    console.error(`❌ Connection '${name}' must specify a database type`);
                    return false;
                }
                if (!conn.database) {
                    console.error(`❌ Connection '${name}' must specify a database name`);
                    return false;
                }
                // 验证端口号
                if (conn.port &&
                    (typeof conn.port !== 'number' ||
                        conn.port <= 0 ||
                        conn.port > 65535)) {
                    console.error(`❌ Connection '${name}' port must be a valid number between 1 and 65535`);
                    return false;
                }
            }
            // 验证默认连接存在
            const defaultConnection = options.defaultConnection || 'default';
            if (!options.connections[defaultConnection]) {
                console.error(`❌ Default connection '${defaultConnection}' is not defined in connections`);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('❌ Database plugin parameter validation failed:', error);
            return false;
        }
    },
    // 🎯 启用新的生命周期管理
    lifecycle: {
        enabled: true
    }
});
export default stratixDatabasePlugin;
/**
 * 插件版本信息
 */
export const VERSION = '1.0.0';
/**
 * 插件元数据
 */
export const PLUGIN_METADATA = {
    name: '@stratix/database',
    version: VERSION,
    description: 'Stratix Database Plugin with enhanced configuration management, functional architecture, and comprehensive monitoring'
};
export { BaseRepository } from './config/base-repository.js';
