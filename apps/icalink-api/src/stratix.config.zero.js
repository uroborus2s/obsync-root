import databasePlugin from '@stratix/database';
import wasV7Plugin from '@stratix/was-v7';
import webPlugin from '@stratix/web';
import apiPlugin from './plugin/api/index.js';
// ============================================================================
// 🎯 零配置启动 - 无需任何参数即可运行
// ============================================================================
/**
 * 零配置启动函数
 * 使用智能默认值，适合快速开发和原型验证
 */
export const createZeroConfig = () => {
    const projectRootDir = getProjectRootDir();
    const environment = process.env.NODE_ENV || 'development';
    const isDev = environment === 'development';
    return {
        // 📋 应用基础信息 - 智能推导
        name: process.env.APP_NAME || 'stratix-app',
        version: process.env.APP_VERSION || '1.0.0',
        description: 'Stratix应用 - 零配置启动',
        // 📝 日志配置 - 环境自适应
        logger: {
            level: isDev ? 'debug' : 'info'
        },
        // 🌐 服务器配置 - 智能默认值
        server: {
            disableRequestLogging: !isDev,
            bodyLimit: isDev ? 50 * 1024 * 1024 : 20 * 1024 * 1024 // 开发50MB，生产20MB
        },
        // 🔌 插件配置 - 零配置插件
        registers: [
            // Web插件 - 自动配置
            [
                webPlugin,
                {
                    projectRootDir,
                    port: parseInt(process.env.PORT || '8090'),
                    formbody: {
                        bodyLimit: isDev ? 50 * 1024 * 1024 : 20 * 1024 * 1024
                    }
                }
            ]
            // 注意：其他插件需要敏感信息，在零配置模式下不启用
            // 用户可以通过 createCustomConfig 添加
        ]
    };
};
/**
 * 自定义配置创建函数
 * 基于零配置，允许用户渐进式添加配置
 */
export const createCustomConfig = (options = {}) => {
    // 从零配置开始
    const baseConfig = createZeroConfig();
    const { sensitiveInfo, environment, app } = options;
    // 环境配置
    const env = environment || process.env.NODE_ENV || 'development';
    const isDev = env === 'development';
    const projectRootDir = getProjectRootDir();
    // 合并应用信息
    if (app) {
        Object.assign(baseConfig, {
            name: app.name || baseConfig.name,
            version: app.version || baseConfig.version,
            description: app.description || baseConfig.description
        });
    }
    // 合并日志配置
    if (sensitiveInfo?.logger) {
        Object.assign(baseConfig.logger, {
            level: sensitiveInfo.logger.loglevle || baseConfig.logger.level,
            disableRequestLogging: sensitiveInfo.logger.disableRequestLogging ??
                baseConfig.server.disableRequestLogging
        });
    }
    // 合并服务器配置
    const httpsConfig = sensitiveInfo?.web?.https
        ? createHttpsConfig(projectRootDir, sensitiveInfo.web.https)
        : {};
    Object.assign(baseConfig.server, httpsConfig);
    // 动态添加插件
    const additionalPlugins = [];
    // WAS V7 插件（如果提供配置）
    if (sensitiveInfo?.wasV7) {
        additionalPlugins.push([
            wasV7Plugin,
            {
                appId: sensitiveInfo.wasV7.appId,
                appSecret: sensitiveInfo.wasV7.appSecret
            }
        ]);
    }
    // 数据库插件（如果提供配置）
    if (sensitiveInfo?.databases) {
        additionalPlugins.push([
            databasePlugin,
            {
                databases: createDatabaseConfig(sensitiveInfo.databases, env)
            }
        ]);
    }
    // API插件（如果提供配置）
    if (sensitiveInfo?.icalink_api) {
        additionalPlugins.push([apiPlugin, sensitiveInfo.icalink_api]);
    }
    // 合并插件配置
    baseConfig.registers.push(...additionalPlugins);
    return baseConfig;
};
// ============================================================================
// 🎨 配置预设模板 - 快速启动不同环境
// ============================================================================
/**
 * 开发环境预设
 * 适合本地开发，启用调试功能
 */
export const createDevelopmentConfig = (sensitiveInfo) => {
    return createCustomConfig({
        environment: 'development',
        app: {
            name: 'stratix-dev-app',
            description: 'Stratix开发环境应用'
        },
        sensitiveInfo
    });
};
/**
 * 生产环境预设
 * 适合生产部署，优化性能和安全性
 */
export const createProductionConfig = (sensitiveInfo) => {
    return createCustomConfig({
        environment: 'production',
        app: {
            name: 'stratix-prod-app',
            description: 'Stratix生产环境应用'
        },
        sensitiveInfo
    });
};
/**
 * 测试环境预设
 * 适合集成测试和预发布验证
 */
export const createStagingConfig = (sensitiveInfo) => {
    return createCustomConfig({
        environment: 'staging',
        app: {
            name: 'stratix-staging-app',
            description: 'Stratix测试环境应用'
        },
        sensitiveInfo
    });
};
// ============================================================================
// 🔧 辅助函数 - 内部工具函数
// ============================================================================
/**
 * 获取项目根目录
 */
function getProjectRootDir() {
    return path.resolve(typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url)), '..');
}
/**
 * 创建HTTPS配置
 * 自动处理SSL证书文件读取和错误处理
 */
function createHttpsConfig(projectRootDir, httpsInfo) {
    try {
        const keyPath = path.resolve(projectRootDir, 'ssl', httpsInfo.key);
        const certPath = path.resolve(projectRootDir, 'ssl', httpsInfo.cert);
        if (!fs.existsSync(keyPath)) {
            console.warn(`⚠️  SSL私钥文件不存在: ${keyPath}`);
            return {};
        }
        if (!fs.existsSync(certPath)) {
            console.warn(`⚠️  SSL证书文件不存在: ${certPath}`);
            return {};
        }
        return {
            https: {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            }
        };
    }
    catch (error) {
        console.warn('⚠️  HTTPS配置失败，将使用HTTP模式:', error);
        return {};
    }
}
/**
 * 创建数据库配置
 * 自动优化不同环境的连接池设置
 */
function createDatabaseConfig(databases, environment) {
    const isProduction = environment === 'production';
    const config = {};
    // 默认数据库配置
    if (databases.default) {
        config.default = {
            connection: {
                client: 'mysql',
                ...databases.default,
                // 环境特定的连接池配置
                pool: isProduction
                    ? { min: 2, max: 10, acquireTimeoutMillis: 30000 }
                    : { min: 1, max: 5, acquireTimeoutMillis: 10000 }
            }
        };
    }
    // 原始数据库配置
    if (databases.origin) {
        config.origin = {
            connection: {
                client: 'mysql',
                ...databases.origin,
                pool: isProduction
                    ? { min: 1, max: 5, acquireTimeoutMillis: 30000 }
                    : { min: 1, max: 3, acquireTimeoutMillis: 10000 }
            }
        };
    }
    return config;
}
/**
 * 验证配置
 * 提供详细的错误信息和修复建议
 */
export const validateConfig = (config) => {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    // 基础验证
    if (!config.name) {
        errors.push('❌ 应用名称不能为空');
        suggestions.push('💡 设置 app.name 或使用环境变量 APP_NAME');
    }
    if (!config.version) {
        errors.push('❌ 应用版本不能为空');
        suggestions.push('💡 设置 app.version 或使用环境变量 APP_VERSION');
    }
    // 日志配置验证
    if (config.logger?.level &&
        !['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(config.logger.level)) {
        errors.push(`❌ 无效的日志级别: ${config.logger.level}`);
        suggestions.push('💡 使用有效的日志级别: trace, debug, info, warn, error, fatal');
    }
    // 服务器配置验证
    if (config.server?.bodyLimit && config.server.bodyLimit > 100 * 1024 * 1024) {
        warnings.push('⚠️  bodyLimit 超过 100MB，可能影响性能');
        suggestions.push('💡 考虑减小 bodyLimit 或使用流式处理');
    }
    // 插件配置验证
    if (!config.registers || config.registers.length === 0) {
        warnings.push('⚠️  没有注册任何插件');
        suggestions.push('💡 使用 createCustomConfig 添加所需的插件');
    }
    // 环境特定验证
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        if (config.logger?.level === 'debug') {
            warnings.push('⚠️  生产环境使用 debug 日志级别可能影响性能');
            suggestions.push('💡 生产环境建议使用 info 或 warn 日志级别');
        }
        if (!config.server?.https) {
            warnings.push('⚠️  生产环境建议启用 HTTPS');
            suggestions.push('💡 配置 sensitiveInfo.web.https 启用 HTTPS');
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
    };
};
/**
 * 安全的配置创建函数
 * 自动验证配置并提供详细的反馈
 */
export const createValidatedConfig = (options = {}) => {
    const config = createCustomConfig(options);
    const validation = validateConfig(config);
    // 输出验证结果
    if (validation.errors.length > 0) {
        console.error('🚨 配置验证失败:');
        validation.errors.forEach((error) => console.error(`  ${error}`));
        console.error('\n💡 修复建议:');
        validation.suggestions.forEach((suggestion) => console.error(`  ${suggestion}`));
        throw new Error('配置验证失败，请修复上述错误后重试');
    }
    if (validation.warnings.length > 0) {
        console.warn('⚠️  配置警告:');
        validation.warnings.forEach((warning) => console.warn(`  ${warning}`));
        if (validation.suggestions.length > 0) {
            console.warn('\n💡 优化建议:');
            validation.suggestions.forEach((suggestion) => console.warn(`  ${suggestion}`));
        }
    }
    return config;
};
// ============================================================================
// 📚 使用示例和文档
// ============================================================================
/**
 * 使用示例
 *
 * 1. 零配置启动（最简单）:
 * ```typescript
 * import { createZeroConfig } from './stratix.config.zero.js';
 * export default createZeroConfig();
 * ```
 *
 * 2. 开发环境快速启动:
 * ```typescript
 * import { createDevelopmentConfig } from './stratix.config.zero.js';
 * export default createDevelopmentConfig();
 * ```
 *
 * 3. 自定义配置（渐进式）:
 * ```typescript
 * import { createCustomConfig } from './stratix.config.zero.js';
 * export default createCustomConfig({
 *   app: {
 *     name: 'my-awesome-app',
 *     version: '2.0.0'
 *   },
 *   sensitiveInfo: {
 *     databases: {
 *       default: {
 *         host: 'localhost',
 *         port: 3306,
 *         user: 'root',
 *         password: 'password',
 *         database: 'mydb'
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * 4. 生产环境配置:
 * ```typescript
 * import { createProductionConfig } from './stratix.config.zero.js';
 * export default createProductionConfig(sensitiveInfo);
 * ```
 *
 * 5. 带验证的安全配置:
 * ```typescript
 * import { createValidatedConfig } from './stratix.config.zero.js';
 * export default createValidatedConfig(options);
 * ```
 */
// ============================================================================
// 🔄 向后兼容 - 保持现有代码可用
// ============================================================================
/**
 * 默认导出 - 向后兼容原有配置方式
 * 如果提供了 sensitiveInfo 参数，使用自定义配置
 * 否则使用零配置
 */
export default (sensitiveInfo) => {
    if (sensitiveInfo) {
        return createValidatedConfig({ sensitiveInfo });
    }
    else {
        return createZeroConfig();
    }
};
//# sourceMappingURL=stratix.config.zero.js.map