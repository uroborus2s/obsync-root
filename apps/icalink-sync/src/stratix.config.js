import wasV7Plugin from '@stratix/was-v7';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvironment } from './config/environment.js';
import syncPlugin from './plugin/sync/index.js';
/**
 * 创建 HTTPS 配置
 *
 * @param sensitiveInfo - 敏感配置信息
 * @param projectRootDir - 项目根目录
 * @returns HTTPS 配置对象
 */
function createHttpsOptions(sensitiveInfo, projectRootDir) {
    if (!sensitiveInfo.web?.https) {
        return {};
    }
    const keyPath = path.resolve(projectRootDir, 'ssl', sensitiveInfo.web.https.key);
    const certPath = path.resolve(projectRootDir, 'ssl', sensitiveInfo.web.https.cert);
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        throw new Error(`SSL证书不存在: key=${keyPath}, cert=${certPath}`);
    }
    return {
        https: {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        }
    };
}
/**
 * 创建 Stratix 配置
 *
 * @param sensitiveInfo - 敏感配置信息
 * @returns Stratix 配置对象
 */
function createStratixConfig(sensitiveInfo) {
    const projectRootDir = path.resolve(typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url)), '..');
    // 创建 HTTPS 配置
    const httpsOptions = createHttpsOptions(sensitiveInfo, projectRootDir);
    return {
        server: {
            port: sensitiveInfo.web?.port || 3000,
            host: sensitiveInfo.web?.host || '0.0.0.0',
            disableRequestLogging: sensitiveInfo.logger.disableRequestLogging,
            ...httpsOptions
        },
        plugins: [
            {
                name: 'wasv7-plugin',
                plugin: wasV7Plugin,
                options: {
                    appId: sensitiveInfo.wasV7.appId,
                    appSecret: sensitiveInfo.wasV7.appSecret
                }
            },
            {
                name: 'sync-plugin',
                plugin: syncPlugin,
                options: {
                    appUrl: sensitiveInfo.icalink_api.appUrl,
                    tokenSecret: sensitiveInfo.icalink_api.tokenSecret
                }
            }
        ],
        autoLoad: {
            services: {
                pattern: 'services/**/*.service.{ts,js}',
                registrationOptions: { lifetime: 'SINGLETON' }
            },
            repositories: {
                pattern: 'repositories/**/*.repository.{ts,js}',
                registrationOptions: { lifetime: 'SCOPED' }
            }
        },
        logger: {
            level: sensitiveInfo.logger.loglevle
        }
    };
}
/**
 * 主配置导出函数
 *
 * 支持两种使用方式：
 * 1. 传入敏感配置信息：export default createStratixConfig(sensitiveInfo)
 * 2. 自动加载环境配置：export default createStratixConfig()
 *
 * @param sensitiveInfo - 可选的敏感配置信息，如果不提供则自动从环境变量加载
 * @returns Stratix 配置对象
 */
export default function createConfigWithEnvironment(sensitiveInfo) {
    try {
        // 如果没有提供敏感配置，则从环境变量加载
        const config = sensitiveInfo || loadEnvironment();
        // 创建并返回 Stratix 配置
        return createStratixConfig(config);
    }
    catch (error) {
        console.error('❌ 创建 Stratix 配置失败:', error);
        throw error;
    }
}
//# sourceMappingURL=stratix.config.js.map