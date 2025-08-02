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
export const createServerConfig = (
  envConfig: EnvironmentConfig,
  projectRootDir: string
): ServerConfig => {
  const { sensitiveInfo, environment } = envConfig;

  // 环境特定的默认配置
  const bodyLimit =
    environment === 'production'
      ? 10 * 1024 * 1024 // 生产环境10MB
      : 20 * 1024 * 1024; // 开发环境20MB

  const config: ServerConfig = {
    disableRequestLogging: sensitiveInfo.logger?.disableRequestLogging || false,
    bodyLimit
  };

  // HTTPS配置（如果提供）
  if (sensitiveInfo.web?.https) {
    const httpsConfig = createHttpsConfig(
      projectRootDir,
      sensitiveInfo.web.https
    );
    if (httpsConfig) {
      config.https = httpsConfig;
    }
  }

  return config;
};

/**
 * 创建HTTPS配置
 */
function createHttpsConfig(projectRootDir: string, httpsInfo: any) {
  try {
    const fs = require('node:fs');
    const path = require('node:path');

    const keyPath = path.resolve(projectRootDir, 'ssl', httpsInfo.key);
    const certPath = path.resolve(projectRootDir, 'ssl', httpsInfo.cert);

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.warn('SSL证书文件不存在，跳过HTTPS配置');
      return null;
    }

    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  } catch (error) {
    console.warn('HTTPS配置失败:', error);
    return null;
  }
}
