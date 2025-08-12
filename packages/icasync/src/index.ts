// @stratix/icasync 插件入口文件
// 提供课程同步相关的仓储和服务

import { withRegisterAutoDI, type FastifyInstance } from '@stratix/core';

/**
 * Icasync 插件选项
 */
export interface IcasyncPluginOptions {
  /** 数据库连接名称 */
  connectionName?: string;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** API路由前缀 */
  prefix?: string;
  /** 是否启用请求验证 */
  enableValidation?: boolean;
  /** 是否启用请求日志 */
  enableLogging?: boolean;
}

/**
 * Icasync 插件主函数
 */
async function icasync(
  fastify: FastifyInstance,
  options: IcasyncPluginOptions
): Promise<void> {
  fastify.log.info('Initializing @stratix/icasync plugin...');

  // 注册ICAsync特定的服务
  // 这些服务会通过自动发现机制被注册，但我们在这里记录日志
  fastify.log.info('ICAsync services will be auto-discovered and registered:', {
    services: [
      'ICAsyncSyncHistoryService',
      'SyncExecutionRuleEngine',
      'ICAsyncMutexManager'
    ]
  });

  fastify.log.info('@stratix/icasync plugin initialized successfully');
}

/**
 * 创建并导出 Stratix Icasync 插件
 *
 * 使用增强的 withRegisterAutoDI 启用自动发现：
 * - 自动发现和注册仓储类（SCOPED生命周期）
 * - 自动发现和注册服务类（SINGLETON生命周期）
 * - 支持依赖注入
 */
const stratixIcasyncPlugin = withRegisterAutoDI(icasync, {
  // 自动发现配置
  discovery: {
    patterns: []
  },
  // 路由配置
  routing: {
    enabled: true, // 启用路由注册
    prefix: '/api/icasync',
    validation: false
  },
  // 生命周期配置
  lifecycle: {
    enabled: true,
    errorHandling: 'throw',
    debug: process.env.NODE_ENV === 'development'
  },
  // 调试配置
  debug: process.env.NODE_ENV === 'development'
});

// 导出插件
export default stratixIcasyncPlugin;

export type { default as FullSyncAdapter } from './adapters/full-sync.adapter.js';
export type { default as IncrementalSyncAdapter } from './adapters/incremental-sync.adapter.js';
export type { default as UserSyncAdapter } from './adapters/user-sync.adapter.js';
