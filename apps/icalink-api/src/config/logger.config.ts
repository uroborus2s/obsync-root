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
export const createLoggerConfig = (
  envConfig: EnvironmentConfig
): LoggerConfig => {
  const { sensitiveInfo, environment } = envConfig;

  // 环境特定的默认日志级别
  const defaultLevel = environment === 'production' ? 'info' : 'debug';

  return {
    level: sensitiveInfo.logger?.loglevle || defaultLevel,
    disableRequestLogging: sensitiveInfo.logger?.disableRequestLogging || false
  };
};
