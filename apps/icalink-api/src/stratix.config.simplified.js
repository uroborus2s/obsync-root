import databasePlugin from '@stratix/database';
import wasV7Plugin from '@stratix/was-v7';
import webPlugin from '@stratix/web';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import apiPlugin from './plugin/api/index.js';
// 简化的配置构建器
export const createConfig = (sensitiveInfo) => {
    const projectRootDir = path.resolve(typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url)), '..');
    // 简化的HTTPS配置处理
    const httpsConfig = sensitiveInfo.web.https
        ? createHttpsConfig(projectRootDir, sensitiveInfo.web.https)
        : {};
    // 统一的大小限制配置
    const bodyLimit = 20 * 1024 * 1024; // 20MB
    return {
        // 应用基础信息
        app: {
            name: 'stratix-example-app',
            version: '1.0.0',
            description: 'Stratix框架示例应用'
        },
        // 日志配置
        logger: {
            level: sensitiveInfo.logger.loglevle
        },
        // 服务器配置
        server: {
            disableRequestLogging: sensitiveInfo.logger.disableRequestLogging,
            bodyLimit,
            ...httpsConfig
        },
        // 简化的插件配置 - 使用对象语法
        plugins: {
            // WAS V7 插件
            wasV7: {
                plugin: wasV7Plugin,
                config: {
                    appId: sensitiveInfo.wasV7.appId,
                    appSecret: sensitiveInfo.wasV7.appSecret
                }
            },
            // Web 插件
            web: {
                plugin: webPlugin,
                config: {
                    projectRootDir,
                    port: 8090,
                    formbody: { bodyLimit }
                }
            },
            // 数据库插件
            database: {
                plugin: databasePlugin,
                config: {
                    databases: {
                        default: {
                            connection: {
                                client: 'mysql',
                                ...sensitiveInfo.databases.default
                            }
                        },
                        origin: {
                            connection: {
                                client: 'mysql',
                                ...sensitiveInfo.databases.origin
                            }
                        }
                    }
                }
            },
            // API 插件
            api: {
                plugin: apiPlugin,
                config: sensitiveInfo.icalink_api
            }
        }
    };
};
// 辅助函数：创建HTTPS配置
function createHttpsConfig(projectRootDir, httpsInfo) {
    const keyPath = path.resolve(projectRootDir, 'ssl', httpsInfo.key);
    const certPath = path.resolve(projectRootDir, 'ssl', httpsInfo.cert);
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        throw new Error('SSL证书不存在');
    }
    return {
        https: {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        }
    };
}
// 配置转换器：将简化配置转换为原始格式
export const convertToLegacyFormat = (config) => {
    const { plugins, app, ...rest } = config;
    return {
        name: app.name,
        version: app.version,
        description: app.description,
        ...rest,
        registers: Object.values(plugins).map(({ plugin, config }) => [
            plugin,
            config
        ])
    };
};
// 默认导出：保持向后兼容
export default (sensitiveInfo) => {
    const simplifiedConfig = createConfig(sensitiveInfo);
    return convertToLegacyFormat(simplifiedConfig);
};
//# sourceMappingURL=stratix.config.simplified.js.map