import {
  withRegisterAutoDI,
  type FastifyInstance,
  type FastifyPluginAsync
} from '@stratix/core/plugin';
import type { WpsConfig } from './types/index.js';

/**
 * WPS V7 API 插件配置选项
 */
export interface WasV7PluginOptions extends WpsConfig {}

/**
 * 参数验证错误类
 */
export class ParameterValidationError extends Error {
  constructor(
    message: string,
    public field: string
  ) {
    super(message);
    this.name = 'ParameterValidationError';
  }
}

/**
 * WPS V7 API 插件主函数
 * 专注于注册适配器到根容器，核心服务通过自动发现注册
 */
const wasV7Api: FastifyPluginAsync<WasV7PluginOptions> = async (
  fastify: FastifyInstance,
  _options: WasV7PluginOptions
): Promise<void> => {
  fastify.log.info('WPS V7 API plugin loaded successfully');
};

/**
 * 创建并导出 Stratix WPS V7 插件
 *
 * 使用增强的 withRegisterAutoDI 启用参数处理和验证：
 * - 统一的参数处理和默认值合并
 * - 完整的参数验证和错误处理
 * - 自动发现和服务注册
 */
const stratixWasV7Plugin: FastifyPluginAsync<any> = withRegisterAutoDI(
  wasV7Api,
  {
    // 自动发现配置
    discovery: {
      patterns: []
    },
    services: {
      enabled: true,
      patterns: ['adapters/*.{ts,js}']
    },
    routing: {
      enabled: false, // 不启用路由注册
      prefix: '',
      validation: false
    },
    debug: process.env.NODE_ENV === 'development',

    // 🎯 参数处理器 - 合并默认配置和用户参数
    parameterProcessor: <T>(options: T): T => {
      const defaultConfig: Partial<WasV7PluginOptions> = {
        baseUrl: 'https://openapi.wps.cn',
        timeout: 60000, // 60秒
        retryTimes: 3,
        debug: false
      };

      // 合并默认配置和用户配置
      const processedOptions = {
        ...defaultConfig,
        ...options
      } as any;

      // 确保必需参数存在
      if (!processedOptions.appId) {
        throw new ParameterValidationError('appId is required', 'appId');
      }

      if (!processedOptions.appSecret) {
        throw new ParameterValidationError(
          'appSecret is required',
          'appSecret'
        );
      }

      return processedOptions as T;
    },

    // 🎯 参数验证器 - 验证配置的正确性和安全性
    parameterValidator: <T>(options: T): boolean => {
      try {
        const opts = options as any;

        // 验证 appId 格式
        if (typeof opts.appId !== 'string' || opts.appId.trim().length === 0) {
          console.error('❌ appId must be a non-empty string');
          return false;
        }

        if (opts.appId.trim() === 'your-app-id') {
          console.error('❌ appId must not use the public placeholder value');
          return false;
        }

        // 验证 appSecret 格式
        if (
          typeof opts.appSecret !== 'string' ||
          opts.appSecret.trim().length === 0
        ) {
          console.error('❌ appSecret must be a non-empty string');
          return false;
        }

        if (opts.appSecret.trim() === 'your-app-secret') {
          console.error(
            '❌ appSecret must not use the public placeholder value'
          );
          return false;
        }

        // 验证 baseUrl 格式
        if (opts.baseUrl) {
          try {
            new URL(opts.baseUrl);
          } catch {
            console.error(`❌ baseUrl must be a valid URL: ${opts.baseUrl}`);
            return false;
          }

          // 确保是 HTTPS 协议（生产环境安全要求）
          const url = new URL(opts.baseUrl);
          if (url.protocol !== 'https:' && !opts.debug) {
            console.error('❌ baseUrl must use HTTPS protocol in production');
            return false;
          }
        }

        // 验证 timeout 范围
        if (opts.timeout !== undefined) {
          if (
            typeof opts.timeout !== 'number' ||
            opts.timeout <= 0 ||
            opts.timeout > 300000
          ) {
            console.error(
              '❌ timeout must be a positive number between 1 and 300000 (5 minutes)'
            );
            return false;
          }
        }

        // 验证 retryTimes 范围
        if (opts.retryTimes !== undefined) {
          if (
            typeof opts.retryTimes !== 'number' ||
            opts.retryTimes < 0 ||
            opts.retryTimes > 10
          ) {
            console.error('❌ retryTimes must be a number between 0 and 10');
            return false;
          }
        }

        // 验证 debug 类型
        if (opts.debug !== undefined && typeof opts.debug !== 'boolean') {
          console.error('❌ debug must be a boolean value');
          return false;
        }

        return true;
      } catch (error) {
        console.error('❌ WPS V7 plugin parameter validation failed:', error);
        return false;
      }
    }
  }
);

export default stratixWasV7Plugin;
