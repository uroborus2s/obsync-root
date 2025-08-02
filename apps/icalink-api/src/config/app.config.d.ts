/**
 * 应用配置模块
 */
import type { EnvironmentConfig } from '../stratix.config.structured.js';
/**
 * 应用配置接口
 */
export interface AppConfig {
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly environment: string;
    readonly debug: boolean;
}
/**
 * 创建应用配置
 */
export declare const createAppConfig: (envConfig: EnvironmentConfig) => AppConfig;
//# sourceMappingURL=app.config.d.ts.map