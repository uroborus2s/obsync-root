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
export const createSecurityConfig = (
  envConfig: EnvironmentConfig,
  projectRootDir: string
): SecurityConfig => {
  const { environment } = envConfig;

  // 环境特定的安全配置
  const config: SecurityConfig = {};

  // CORS配置
  if (environment === 'development') {
    config.cors = {
      origin: ['http://localhost:3000', 'http://localhost:8090'],
      credentials: true
    };
  } else {
    config.cors = {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
      credentials: true
    };
  }

  // 速率限制
  config.rateLimit = {
    max: environment === 'production' ? 100 : 1000,
    timeWindow: '1 minute'
  };

  // Helmet安全头
  config.helmet = {
    contentSecurityPolicy: environment === 'production',
    crossOriginEmbedderPolicy: environment === 'production'
  };

  return config;
};
