/**
 * 服务器配置模块
 */
import type { EnvironmentConfig } from '../stratix.config.structured.js';
/**
 * 服务器配置接口
 */
export interface ServerConfig {
    readonly disableRequestLogging: boolean;
    readonly bodyLimit: number;
    readonly https?: {
        readonly key: Buffer;
        readonly cert: Buffer;
    };
}
/**
 * 创建服务器配置
 */
export declare const createServerConfig: (envConfig: EnvironmentConfig, projectRootDir: string) => ServerConfig;
//# sourceMappingURL=server.config.d.ts.map