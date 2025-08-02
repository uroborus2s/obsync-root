/**
 * 日志配置模块
 */
import type { EnvironmentConfig } from '../stratix.config.structured.js';
/**
 * 日志配置接口
 */
export interface LoggerConfig {
    readonly level: string;
    readonly disableRequestLogging?: boolean;
}
/**
 * 创建日志配置
 */
export declare const createLoggerConfig: (envConfig: EnvironmentConfig) => LoggerConfig;
//# sourceMappingURL=logger.config.d.ts.map