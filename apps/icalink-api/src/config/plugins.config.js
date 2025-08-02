/**
 * 插件配置模块
 */
import databasePlugin from '@stratix/database';
import wasV7Plugin from '@stratix/was-v7';
import webPlugin from '@stratix/web';
import apiPlugin from '../plugin/api/index.js';
/**
 * 创建插件配置
 */
export const createPluginsConfig = (envConfig, projectRootDir) => {
    const { sensitiveInfo, environment } = envConfig;
    // 环境特定的默认配置
    const bodyLimit = environment === 'production'
        ? 10 * 1024 * 1024 // 生产环境10MB
        : 20 * 1024 * 1024; // 开发环境20MB
    return [
        // WAS V7 插件
        [
            wasV7Plugin,
            {
                appId: sensitiveInfo.wasV7?.appId,
                appSecret: sensitiveInfo.wasV7?.appSecret
            }
        ],
        // Web 插件
        [
            webPlugin,
            {
                projectRootDir,
                port: sensitiveInfo.web?.port || 8090,
                formbody: { bodyLimit }
            }
        ],
        // 数据库插件
        [
            databasePlugin,
            {
                databases: createDatabasesConfig(sensitiveInfo, environment)
            }
        ],
        // API 插件
        [apiPlugin, sensitiveInfo.icalink_api || {}]
    ];
};
/**
 * 创建数据库配置
 */
function createDatabasesConfig(sensitiveInfo, environment) {
    const databases = {};
    // 默认数据库
    if (sensitiveInfo.databases?.default) {
        databases.default = {
            connection: {
                client: 'mysql',
                ...sensitiveInfo.databases.default,
                // 环境特定的连接池配置
                pool: environment === 'production'
                    ? { min: 2, max: 10 }
                    : { min: 1, max: 5 }
            }
        };
    }
    // 原始数据库
    if (sensitiveInfo.databases?.origin) {
        databases.origin = {
            connection: {
                client: 'mysql',
                ...sensitiveInfo.databases.origin,
                pool: environment === 'production' ? { min: 1, max: 5 } : { min: 1, max: 3 }
            }
        };
    }
    return databases;
}
//# sourceMappingURL=plugins.config.js.map