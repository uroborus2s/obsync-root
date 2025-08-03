/**
 * @stratix/tasks - 工作流任务管理插件
 *
 * 基于 Stratix 框架的企业级工作流任务管理系统
 * 支持流程定义与实例分离、动态并行任务生成、中断恢复机制
 */

import type { FastifyInstance, FastifyPluginOptions } from '@stratix/core';
import { asFunction, Lifetime, withRegisterAutoDI } from '@stratix/core';
import { isDevelopment } from '@stratix/utils/environment';
import { registerTaskExecutor } from './registerTask.js';

// 导出核心类型
export * from './types/index.js';

// 导出服务类
export { ExecutorFactoryService } from './services/ExecutorFactoryService.js';
export { ExecutorRegistryService } from './services/ExecutorRegistryService.js';
export { TaskScheduler } from './services/TaskScheduler.js';
export { WorkflowDefinitionService } from './services/WorkflowDefinitionService.js';
export { WorkflowEngineService } from './services/WorkflowEngine.js';

// 导出工厂函数

// 导出插件注册函数
export { getExecutor, registerTaskExecutor } from './registerTask.js';

/**
 * 插件配置接口
 */
export interface TasksPluginOptions extends FastifyPluginOptions {
  /** 数据库配置 */
  database?: {
    /** 是否自动运行迁移 */
    autoMigrate?: boolean;
    /** 连接名称 (使用@stratix/database插件的连接名) */
    connectionName?: string;
  };

  /** 执行器配置 */
  executors?: {
    /** 是否启用内置执行器 */
    enableBuiltIn?: boolean;
    /** 自定义执行器目录 */
    customPath?: string;
  };

  /** 调度器配置 */
  scheduler?: {
    /** 是否启用调度器 */
    enabled?: boolean;
    /** 调度间隔（毫秒） */
    interval?: number;
    /** 最大并发任务数 */
    maxConcurrency?: number;
  };

  /** 监控配置 */
  monitoring?: {
    /** 是否启用监控 */
    enabled?: boolean;
    /** 指标收集间隔 */
    metricsInterval?: number;
    /** 日志级别 */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };

  /** API配置 */
  api?: {
    /** 是否启用REST API */
    enabled?: boolean;
    /** API路径前缀 */
    prefix?: string;
    /** 是否启用API文档 */
    docs?: boolean;
  };
}

/**
 * 默认插件配置（暂时保留用于未来扩展）
 */
// const DEFAULT_OPTIONS: Required<TasksPluginOptions> = {
//   database: {
//     autoMigrate: isDevelopment(),
//     connectionName: 'default'
//   },
//   executors: {
//     enableBuiltIn: true,
//     customPath: './executors'
//   },
//   scheduler: {
//     enabled: true,
//     interval: 1000,
//     maxConcurrency: 100
//   },
//   monitoring: {
//     enabled: true,
//     metricsInterval: 30000,
//     logLevel: isDevelopment() ? 'debug' : 'info'
//   },
//   api: {
//     enabled: true,
//     prefix: '/api/workflows',
//     docs: isDevelopment()
//   }
// };

/**
 * Tasks 插件主函数
 *
 * 实现工作流任务管理的核心功能：
 * - 工作流定义和实例管理
 * - 任务调度和执行
 * - 执行器注册和管理
 * - 监控和日志记录
 *
 * @param fastify - Fastify 实例
 * @param options - 插件配置选项
 */
async function tasks(
  fastify: FastifyInstance,
  _options: TasksPluginOptions
): Promise<void> {
  fastify.log.info('🚀 @stratix/tasks plugin initializing...');

  try {
    fastify.diContainer.register({
      registerTaskExecutor: asFunction(registerTaskExecutor, {
        lifetime: Lifetime.SINGLETON
      })
    });
    // 将注册函数添加到 fastify 实例上，供其他插件使用
    fastify.decorate('registerTaskExecutor', registerTaskExecutor);

    fastify.log.info('✅ @stratix/tasks plugin initialized successfully');
  } catch (error) {
    fastify.log.error('❌ @stratix/tasks plugin initialization failed:', error);
    throw error;
  }
}

// 使用 withRegisterAutoDI 包装插件以启用自动依赖注入
export default withRegisterAutoDI(tasks, {
  discovery: {
    patterns: []
  },
  routing: {
    enabled: true,
    prefix: '/api/workflows',
    validation: true
  },
  debug: isDevelopment()
});

/**
 * 插件元数据
 */
export const pluginMetadata = {
  name: '@stratix/tasks',
  version: '1.0.0',
  description:
    'Advanced task management system with tree structure and execution engine for Stratix framework',
  author: 'Stratix Team',
  license: 'MIT',
  dependencies: ['@stratix/core', '@stratix/database', '@stratix/utils']
};
