// 统一日志器工厂
// 负责创建和配置单一的 Pino 日志器实例，确保整个应用使用同一个日志器

import { get, getNodeEnv, isProduction } from '@stratix/utils/environment';
import { pino, type Logger, type LoggerOptions } from 'pino';
import type { StratixRunOptions } from '../types/config.js';
import type { LoggerConfig, LogLevel } from '../types/index.js';

/**
 * 统一日志器工厂
 * 确保整个应用使用同一个 Pino 实例
 */
export class LoggerFactory {
  private static pinoInstance: Logger | null = null;

  /**
   * 创建或获取统一的 Pino 日志器实例
   * 这是整个应用唯一的日志器创建入口
   */
  static createUnifiedLogger(options?: StratixRunOptions): Logger {
    // 如果已经有实例且没有新的配置，直接返回
    if (LoggerFactory.pinoInstance && !options?.logger) {
      return LoggerFactory.pinoInstance;
    }

    // 1. 检查是否直接传入了 Pino 实例
    if (options?.logger && LoggerFactory.isPinoInstance(options.logger)) {
      LoggerFactory.pinoInstance = options.logger as Logger;
      return LoggerFactory.pinoInstance;
    }

    // 2. 从环境变量构建基础 Pino 配置
    const envConfig = LoggerFactory.buildConfigFromEnvironment();

    // 3. 合并用户配置（用户配置优先级更高）
    const userConfig = LoggerFactory.extractUserConfig(options?.logger);
    const finalConfig = { ...envConfig, ...userConfig };

    // 4. 创建统一 Pino 实例
    LoggerFactory.pinoInstance = pino(finalConfig);

    return LoggerFactory.pinoInstance;
  }

  /**
   * 获取当前的 Pino 实例
   */
  static getCurrentInstance(): Logger | null {
    return LoggerFactory.pinoInstance;
  }

  /**
   * 重置 Pino 实例（主要用于测试）
   */
  static resetInstance(): void {
    LoggerFactory.pinoInstance = null;
  }

  /**
   * 检查对象是否为 Pino 实例
   */
  private static isPinoInstance(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.info === 'function' &&
      typeof obj.error === 'function' &&
      typeof obj.debug === 'function' &&
      typeof obj.warn === 'function' &&
      typeof obj.fatal === 'function' &&
      typeof obj.trace === 'function' &&
      typeof obj.child === 'function'
    );
  }

  /**
   * 从环境变量构建 Pino 配置
   */
  private static buildConfigFromEnvironment(): LoggerOptions {
    const env = getNodeEnv();
    const isProd = isProduction();

    return {
      // 基础配置
      name: get('STRATIX_APP_NAME') || 'stratix-app',
      level:
        (get('STRATIX_LOG_LEVEL') as LogLevel) || (isProd ? 'info' : 'debug'),

      // 时间戳配置
      timestamp: pino.stdTimeFunctions.isoTime,

      // 格式化配置
      ...(isProd
        ? {
            // 生产环境：JSON 格式，性能优先
            transport: undefined
          }
        : {
            // 开发环境：美化输出
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
              }
            }
          }),

      // 序列化器
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res
      },

      // 敏感信息过滤
      redact: {
        paths: [
          'password',
          'token',
          'authorization',
          'cookie',
          'secret',
          'key',
          'apiKey',
          'api_key',
          'accessToken',
          'access_token',
          'refreshToken',
          'refresh_token'
        ],
        censor: '[REDACTED]'
      },

      // 基础绑定
      base: {
        pid: process.pid,
        env
      }
    };
  }

  /**
   * 从用户选项中提取日志配置
   */
  private static extractUserConfig(logger?: any): Partial<LoggerOptions> {
    if (!logger || LoggerFactory.isPinoInstance(logger)) {
      return {};
    }

    // 如果是 LoggerConfig 对象，转换为 Pino 配置
    if (typeof logger === 'object') {
      return LoggerFactory.convertLoggerConfigToPino(logger);
    }

    return {};
  }

  /**
   * 将 LoggerConfig 转换为 Pino 配置
   */
  private static convertLoggerConfigToPino(
    config: LoggerConfig
  ): LoggerOptions {
    const pinoConfig: LoggerOptions = {};

    // 日志级别
    if (config.level) {
      pinoConfig.level = config.level;
    }

    // 美化输出
    if (config.pretty) {
      pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      };
    } else {
      pinoConfig.transport = undefined;
    }

    return pinoConfig;
  }
}

/**
 * 获取统一的日志器实例
 */
export function getLogger(): any {
  try {
    // 动态导入以避免循环依赖
    return LoggerFactory.getCurrentInstance() || console;
  } catch (error) {
    // 如果无法获取统一日志器，回退到 console
    return console;
  }
}
