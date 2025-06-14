/**
 * 配置相关类型定义
 */
import { FastifyServerOptions } from 'fastify';
import { CacheConfig } from '../cache/memory-cache.js';
import { DeclarativePlugin } from './plugin.js';

/**
 * 日志配置
 */
export interface LogConfig {
  /**
   * 日志级别
   */
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  /**
   * 是否美化输出
   */
  pretty?: boolean;

  /**
   * 文件日志配置
   */
  file?:
    | boolean
    | string
    | {
        dir?: string;
        name?: string;
        errorFile?: boolean;
        /**
         * 日志轮转配置
         */
        rotation?:
          | boolean
          | {
              size?: string;
              interval?: string;
              maxFiles?: number;
            };
      };

  /**
   * 需要脱敏的字段
   */
  redact?: boolean | string[];
}

/**
 * 应用配置
 */
export interface AppConfig {
  /**
   * 应用名称
   */
  name: string;

  /**
   * 应用版本
   */
  version: string;

  /**
   * 运行环境
   */
  environment?: 'development' | 'test' | 'production';

  /**
   * 其他应用配置
   */
  [key: string]: any;
}

/**
 * Stratix应用配置
 */
export interface StratixConfig extends DeclarativePlugin {
  /**
   * 日志配置
   */
  logger?: LogConfig;

  /**
   * 服务器配置
   */
  server?: Omit<FastifyServerOptions, 'logger' | 'loggerInstance'>;

  /**
   * 缓存配置
   */
  cache?: CacheConfig;
}
