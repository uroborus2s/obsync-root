/**
 * 方案2：增强结构化配置
 *
 * 主要改进：
 * 1. 模块化配置文件拆分
 * 2. 强类型配置定义
 * 3. 配置验证和默认值
 * 4. 环境特定配置
 * 5. 自文档化配置
 */
import { type StratixConfig } from '@stratix/core';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 配置模块导入
import { createAppConfig } from './config/app.config.js';
import { createLoggerConfig } from './config/logger.config.js';
import { createPluginsConfig } from './config/plugins.config.js';
import { createSecurityConfig } from './config/security.config.js';
import { createServerConfig } from './config/server.config.js';

/**
 * 环境配置接口
 */
export interface EnvironmentConfig {
  readonly environment: 'development' | 'staging' | 'production';
  readonly debug: boolean;
  readonly sensitiveInfo: any;
}

/**
 * 结构化配置构建器
 */
export class StratixConfigBuilder {
  private readonly projectRootDir: string;
  private readonly envConfig: EnvironmentConfig;

  constructor(sensitiveInfo: any, environment?: string) {
    this.projectRootDir = path.resolve(
      typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url)),
      '..'
    );

    this.envConfig = {
      environment:
        (environment as any) || process.env.NODE_ENV || 'development',
      debug: process.env.NODE_ENV !== 'production',
      sensitiveInfo
    };
  }

  /**
   * 构建完整配置
   */
  build(): StratixConfig {
    const config = {
      // 应用配置
      ...createAppConfig(this.envConfig),

      // 日志配置
      logger: createLoggerConfig(this.envConfig),

      // 服务器配置
      server: createServerConfig(this.envConfig, this.projectRootDir),

      // 安全配置
      security: createSecurityConfig(this.envConfig, this.projectRootDir),

      // 插件配置
      registers: createPluginsConfig(this.envConfig, this.projectRootDir)
    };

    // 配置验证
    this.validateConfig(config);

    return config;
  }

  /**
   * 配置验证
   */
  private validateConfig(config: StratixConfig): void {
    const errors: string[] = [];

    // 基础验证
    if (!config.name) errors.push('应用名称不能为空');
    if (!config.version) errors.push('应用版本不能为空');
    if (!config.logger) errors.push('日志配置不能为空');

    // 环境特定验证
    if (this.envConfig.environment === 'production') {
      if (config.logger.level === 'debug') {
        errors.push('生产环境不应使用debug日志级别');
      }
    }

    if (errors.length > 0) {
      throw new Error(`配置验证失败: ${errors.join(', ')}`);
    }
  }

  /**
   * 获取环境特定配置
   */
  getEnvironmentConfig(): EnvironmentConfig {
    return this.envConfig;
  }

  /**
   * 获取项目根目录
   */
  getProjectRootDir(): string {
    return this.projectRootDir;
  }
}

/**
 * 配置工厂函数
 */
export const createStratixConfig = (
  sensitiveInfo: any,
  environment?: string
): StratixConfig => {
  const builder = new StratixConfigBuilder(sensitiveInfo, environment);
  return builder.build();
};

/**
 * 默认导出：保持向后兼容
 */
export default (sensitiveInfo: any): StratixConfig => {
  return createStratixConfig(sensitiveInfo);
};
