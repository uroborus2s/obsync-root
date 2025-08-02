/**
 * 安全配置模块
 */
import type { EnvironmentConfig } from '../stratix.config.structured.js';
/**
 * 安全配置接口
 */
export interface SecurityConfig {
    readonly cors?: {
        readonly origin: string | string[];
        readonly credentials: boolean;
    };
    readonly rateLimit?: {
        readonly max: number;
        readonly timeWindow: string;
    };
    readonly helmet?: {
        readonly contentSecurityPolicy: boolean;
        readonly crossOriginEmbedderPolicy: boolean;
    };
}
/**
 * 创建安全配置
 */
export declare const createSecurityConfig: (envConfig: EnvironmentConfig, projectRootDir: string) => SecurityConfig;
//# sourceMappingURL=security.config.d.ts.map