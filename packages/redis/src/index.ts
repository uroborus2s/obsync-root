/**
 * @stratix/redis - Redis 适配器插件
 *
 * 提供 Redis 客户端的标准化接口，支持单实例和集群模式
 * 遵循 Stratix 框架的 Adapter 层规范
 */

import type { FastifyInstance, FastifyPluginOptions } from '@stratix/core';
import { withRegisterAutoDI } from '@stratix/core';
import { deepMerge } from '@stratix/core/data';

/**
 * Redis 插件配置选项
 */
export interface RedisPluginOptions extends FastifyPluginOptions {
  /** Redis 配置 */
  /** 单实例配置 */
  single?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    options?: any;
  };
  /** 集群配置 */
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
    options?: any;
  };
  /** 连接池大小 */
  poolSize?: number;
  /** 重试次数 */
  retryAttempts?: number;
  /** 重试延迟 */
  retryDelay?: number;
}

/**
 * Redis 插件主函数
 *
 * 实现 Redis 客户端的自动注册和管理：
 * - 自动发现和注册 Redis 适配器
 * - 提供统一的 Redis 操作接口
 * - 支持单实例和集群模式
 * - 完整的错误处理和日志记录
 *
 * @param fastify - Fastify 实例
 * @param options - 插件配置选项
 */
async function redis(
  fastify: FastifyInstance,
  options: RedisPluginOptions
): Promise<void> {
  fastify.log.info('🚀 @stratix/redis plugin initializing...');
}

// 使用 withRegisterAutoDI 包装插件以启用自动依赖注入和参数处理
export default withRegisterAutoDI<RedisPluginOptions>(redis, {
  discovery: {
    patterns: ['adapters/*.{ts,js}']
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'throw',
    debug: process.env.NODE_ENV === 'development'
  },
  debug: process.env.NODE_ENV === 'development',
  parameterProcessor: <T>(options: T): T =>
    deepMerge(
      {
        poolSize: 10,
        retryAttempts: 3,
        retryDelay: 1000
      },
      options || {}
    ) as T
});

// 导出类型和接口
export type { RedisAdapter, RedisConfig } from './adapters/redis.adapter.js';
