/**
 * @stratix/tasks - 工作流任务管理插件
 *
 * 基于 Stratix 框架的函数式编程模式重构的工作流任务管理系统
 * 支持工作流定义与实例分离、动态节点生成、中断恢复机制
 * 版本: v3.0.0-refactored
 */

import type { FastifyInstance, FastifyPluginOptions } from '@stratix/core';
import { asFunction, Lifetime, withRegisterAutoDI } from '@stratix/core';
import { isDevelopment } from '@stratix/core/environment';
import { registerTaskExecutor } from './registerTask.js';

// 导出核心类型
export * from './interfaces/index.js';
export * from './types/index.js';

// 导出输入验证相关类型
export type {
  InputProcessingOptions,
  InputValidationError,
  InputValidationReport,
  InputValidationResult
} from './types/input-validation.js';

// 导出新架构的服务类
export type { ITemplateService } from './interfaces/services.js';
export { default as ExecutionLockService } from './services/ExecutionLockService.js';
export { default as InputValidationService } from './services/InputValidationService.js';
export { default as NodeExecutionService } from './services/NodeExecutionService.js';
export { default as TemplateService } from './services/TemplateService.js';
export { default as VariableContextService } from './services/VariableContextService.js';
export { default as WorkflowExecutionService } from './services/WorkflowExecutionService.js';
export { default as WorkflowInstanceService } from './services/WorkflowInstanceService.js';

// 导出仓储类
export { default as ExecutionLockRepository } from './repositories/ExecutionLockRepository.js';
export { default as ExecutionLogRepository } from './repositories/ExecutionLogRepository.js';
export { default as NodeInstanceRepository } from './repositories/NodeInstanceRepository.js';
export { default as WorkflowDefinitionRepository } from './repositories/WorkflowDefinitionRepository.js';
export { default as WorkflowInstanceRepository } from './repositories/WorkflowInstanceRepository.js';

// 导出适配器类
export { default as TasksWorkflowAdapter } from './adapters/TasksWorkflowAdapter.js';

// 导出调度器服务 (已优化为事件驱动架构)
// OptimizedSchedulerService 不再单独导出，通过SchedulerService使用

// 导出工作流定义服务
export { default as WorkflowDefinitionService } from './services/WorkflowDefinitionService.js';

export type { ITasksWorkflowAdapter } from './interfaces/adapters.js';

export type { TaskExecutor } from './registerTask.js';
export type { ExecutionContext } from './types/workflow.js';
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
    /** 默认执行器参数 */
    defaultParameters?: {
      /** 执行超时时间（毫秒） */
      timeout?: number;
      /** 最大重试次数 */
      maxRetries?: number;
      /** 重试延迟（毫秒） */
      retryDelay?: number;
    };
  };

  /** 调度器配置 */
  scheduler?: {
    /** 是否启用调度器 */
    enabled?: boolean;
    /** 调度间隔（毫秒） */
    recoveryCheckInterval?: number;
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

  /** 执行锁配置 */
  executionLock?: {
    /** 默认锁超时时间（毫秒） */
    defaultTimeout?: number;
    /** 锁续期间隔（毫秒） */
    renewalInterval?: number;
    /** 过期锁清理间隔（毫秒） */
    cleanupInterval?: number;
  };

  /** 中断恢复配置 */
  recovery?: {
    /** 是否启用自动恢复 */
    enabled?: boolean;
    /** 恢复检查间隔（毫秒） */
    checkInterval?: number;
    /** 最大恢复尝试次数 */
    maxAttempts?: number;
  };

  /** 锁续期配置 */
  lockRenewal?: {
    /** 是否启用自动续期 */
    enabled?: boolean;
    /** 续期间隔（毫秒），建议设置为锁超时时间的20-30% */
    renewalInterval?: number;
    /** 每次续期延长的时间（毫秒） */
    lockExtension?: number;
    /** 最大续期重试次数 */
    maxRetryAttempts?: number;
    /** 续期失败后的重试间隔（毫秒） */
    retryInterval?: number;
  };
}

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
  options: TasksPluginOptions
): Promise<void> {
  fastify.log.info('🚀 @stratix/tasks plugin initializing...');

  // 处理配置

  try {
    fastify.diContainer.register({
      registerTaskExecutor: asFunction(registerTaskExecutor, {
        lifetime: Lifetime.SINGLETON
      })
    });

    // 将注册函数添加到 fastify 实例上，供其他插件使用
    fastify.decorate('registerTaskExecutor', registerTaskExecutor);
    // API路由注册已移除 - 由具体应用层负责路由注册

    fastify.log.info('✅ @stratix/tasks plugin initialized successfully');
  } catch (error) {
    fastify.log.error('❌ @stratix/tasks plugin initialization failed:', error);
    throw error;
  }
}

/**
 * 默认执行器参数配置
 * 为所有 task 执行器提供统一的默认参数
 */
const DEFAULT_EXECUTOR_PARAMETERS = {
  /** 执行超时时间（毫秒） */
  timeout: 300000, // 5分钟
  /** 最大重试次数 */
  maxRetries: 3,
  /** 重试延迟（毫秒） */
  retryDelay: 5000,
  /** 是否启用详细日志 */
  enableVerboseLogging: isDevelopment(),
  /** 执行器标签 */
  tags: ['stratix-tasks'],
  /** 执行器版本 */
  version: '1.0.0',
  /** 健康检查配置 */
  healthCheck: {
    enabled: true,
    interval: 60000, // 1分钟
    timeout: 10000 // 10秒
  },
  /** 监控配置 */
  monitoring: {
    enabled: true,
    metricsCollection: true,
    performanceTracking: true
  },
  /** 错误处理配置 */
  errorHandling: {
    strategy: 'retry',
    logErrors: true,
    notifyOnFailure: false
  }
} as const;

/**
 * 处理插件参数的函数
 * 为执行器相关的配置提供默认值和参数合并
 * 使用深度合并确保嵌套配置对象的正确处理
 */
function processPluginParameters<T = TasksPluginOptions>(options: T): T {
  // 检查是否是 TasksPluginOptions 类型
  if (!options || typeof options !== 'object') {
    return options;
  }

  // 定义默认配置结构
  const defaultConfig = {
    // 执行器配置增强
    executors: {
      enableBuiltIn: true,
      customPath: './executors',
      // 默认执行器参数
      defaultParameters: DEFAULT_EXECUTOR_PARAMETERS
    },

    // 调度器配置增强
    scheduler: {
      enabled: true,
      recoveryCheckInterval: 600000,
      maxConcurrency: 10
    },

    // 并发控制配置
    concurrency: {
      maxConcurrentWorkflows: 10,
      maxConcurrentNodesPerWorkflow: 5,
      maxConcurrentTasksPerNode: 3,
      resourceLimits: {
        maxMemoryUsage: 1024, // 1GB
        maxCpuUsage: 80 // 80%
      },
      queueConfig: {
        maxQueueSize: 100,
        priorityLevels: 5
      }
    },

    // 监控配置增强
    monitoring: {
      enabled: DEFAULT_EXECUTOR_PARAMETERS.monitoring.enabled,
      metricsInterval: 30000,
      logLevel: isDevelopment() ? 'debug' : 'info',
      // 执行器监控配置
      executorMonitoring: {
        healthCheckInterval: DEFAULT_EXECUTOR_PARAMETERS.healthCheck.interval,
        performanceTracking:
          DEFAULT_EXECUTOR_PARAMETERS.monitoring.performanceTracking,
        metricsCollection:
          DEFAULT_EXECUTOR_PARAMETERS.monitoring.metricsCollection
      }
    },

    // 分布式配置增强
    distributed: {
      enabled: false,
      assignmentStrategy: 'round-robin' as const,
      heartbeatInterval: 30000,
      failureDetectionTimeout: 60000,
      lockTimeout: 300000, // 5分钟
      maxRetries: 3,
      enableFailover: false,
      // 锁管理器配置
      lockManager: {
        renewalThreshold: 0.3,
        maxRenewals: 10,
        checkInterval: 30000, // 30秒
        defaultDuration: 300000 // 5分钟
      },
      // 引擎发现配置
      engineDiscovery: {
        enabled: true,
        baseInterval: 60000, // 1分钟基础间隔
        maxInterval: 300000, // 5分钟最大间隔
        incrementalThreshold: 3, // 连续3次无变化后延长间隔
        fullSyncInterval: 1800000, // 30分钟全量同步
        enableSmartInterval: true // 启用智能间隔调整
      },
      // 执行器分布式配置
      executorDistribution: {
        loadBalancing: true,
        affinityEnabled: false,
        capabilityMatching: true
      }
    },

    // 恢复配置增强
    recovery: {
      enabled: true,
      checkInterval: 60000,
      maxRecoveryAttempts: 3,
      recoveryTimeout: 120000, // 2分钟
      failureDetectionTimeout: 90000, // 90秒
      enableAutoFailover: false,
      startupDelay: 5000, // 5秒
      retryOnFailure: true,
      // 执行器恢复配置
      executorRecovery: {
        checkpointInterval: 30000,
        statePreservation: true,
        automaticRestart: true
      }
    },

    // 锁续期配置增强
    lockRenewal: {
      enabled: true,
      renewalInterval: 120000, // 1分钟续期间隔（锁超时时间的20%）
      lockExtension: 300000, // 5分钟锁延长时间（重新设置完整锁时间）
      maxRetryAttempts: 3, // 最大重试3次（提供容错能力）
      retryInterval: 10000 // 10秒重试间隔（避免频繁重试）
    }
  };

  // 简单的配置合并
  // 配置优先级：用户配置 > 默认配置
  const processedOptions = {
    ...defaultConfig,
    ...options
  };

  return processedOptions as T;
}

/**
 * 验证插件参数的函数
 * 确保关键配置的有效性
 */
function validatePluginParameters<T>(options: T): boolean {
  // 检查是否是对象类型
  if (!options || typeof options !== 'object') {
    return true;
  }

  const opts = options as any;

  // 验证超时时间
  if (
    opts.executors?.defaultParameters?.timeout &&
    opts.executors.defaultParameters.timeout <= 0
  ) {
    throw new Error('Executor timeout must be greater than 0');
  }

  // 验证重试次数
  if (
    opts.executors?.defaultParameters?.maxRetries &&
    opts.executors.defaultParameters.maxRetries < 0
  ) {
    throw new Error('Executor maxRetries must be non-negative');
  }

  // 验证调度器配置
  if (
    opts.scheduler?.enabled &&
    opts.scheduler.maxConcurrency &&
    opts.scheduler.maxConcurrency <= 0
  ) {
    throw new Error('Scheduler maxConcurrency must be greater than 0');
  }

  // 验证分布式配置
  if (
    opts.distributed?.enabled &&
    opts.distributed.lockTimeout &&
    opts.distributed.lockTimeout <= 0
  ) {
    throw new Error('Distributed lockTimeout must be greater than 0');
  }

  return true;
}

// 使用 withRegisterAutoDI 包装插件以启用自动依赖注入和参数处理
export default withRegisterAutoDI<TasksPluginOptions>(tasks, {
  discovery: {
    patterns: []
  },
  routing: {
    enabled: true,
    prefix: '',
    validation: true
  },
  // 🎯 添加参数处理函数
  parameterProcessor: processPluginParameters,
  // 🎯 添加参数验证函数
  parameterValidator: validatePluginParameters,
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
  dependencies: ['@stratix/core', '@stratix/database']
};
