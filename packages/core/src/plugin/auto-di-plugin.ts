// @stratix/core 自动依赖注入插件
// 主要的withRegisterAutoDI函数实现

import { deepMerge } from '../utils/data/index.js';
import { isDevelopment } from '../utils/environment/index.js';
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions
} from 'fastify';
import { getLogger } from '../logger/index.js';

// 跨插件工作流相关导入

// 导入各个功能模块
import { fileURLToPath } from 'url';
import { registerServiceAdapters } from './adapter-registration.js';
import { ConventionBasedLifecycleManager } from './lifecycle-manager.js';
import {
  discoverAndProcessModules,
  type ModuleProcessingResult
} from './module-discovery.js';
import {
  ensureAwilixPlugin,
  performAutoRegistration,
  PluginContainerContext
} from './service-discovery.js';
import {
  getCallerFilePath,
  getPluginName,
  isAsyncPlugin,
  processPluginParameters,
  resolveBasePath,
  type AutoDIConfig
} from './utils.js';

/**
 * 默认的 AutoDI 配置
 */
const DEFAULT_AUTO_DI_CONFIG: AutoDIConfig = {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}',
      'executors/*.{ts,js}'
    ]
  },
  routing: {
    prefix: '',
    enabled: true,
    validation: false
  },
  services: {
    enabled: true,
    patterns: ['adapters/*.{ts,js}']
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'throw',
    debug: false
  },
  debug: false
};

/**
 * 简化的自动依赖注入高阶函数
 *
 * @param plugin - 原始插件函数
 * @param config - 自动依赖注入配置
 * @returns 包装后的 Fastify 插件
 */
export function withRegisterAutoDI<
  T extends FastifyPluginOptions = FastifyPluginOptions
>(
  plugin: FastifyPluginAsync<T> | FastifyPluginCallback<T>,
  config: Partial<AutoDIConfig> = {}
): FastifyPluginAsync<T> {
  // 🎯 合并默认配置和用户配置
  const mergedConfig = deepMerge(
    DEFAULT_AUTO_DI_CONFIG,
    config
  ) as AutoDIConfig;

  // 🎯 在包装时立即捕获调用者的文件路径
  const callerFilePath = getCallerFilePath();

  return async (fastify: FastifyInstance, options: T) => {
    const startTime = Date.now();
    const debugEnabled = mergedConfig.debug || isDevelopment();

    try {
      // 1. 获取插件名称（从插件函数名称中获取）
      const pluginName = getPluginName(plugin);

      // 2. 🎯 处理插件参数
      let processedOptions: T;
      try {
        processedOptions = processPluginParameters(
          options,
          mergedConfig,
          debugEnabled
        );

        if (debugEnabled) {
          const logger = getLogger();
          logger.info(`🔧 Plugin parameters processed for ${pluginName}`);
        }
      } catch (error) {
        const logger = getLogger();
        logger.error(
          `❌ Parameter processing failed for ${pluginName}:`,
          error
        );
        throw error;
      }

      // 3. 确保 @fastify/awilix 已注册
      const container = await ensureAwilixPlugin(fastify);

      // 5. 🎯 创建基于方法名约定的生命周期管理器
      let lifecycleManager: ConventionBasedLifecycleManager | undefined =
        undefined;
      if (mergedConfig.lifecycle?.enabled !== false) {
        try {
          lifecycleManager = new ConventionBasedLifecycleManager(
            mergedConfig.lifecycle?.debug || debugEnabled
          );

          if (debugEnabled) {
            const logger = getLogger();
            logger.info('✅ ConventionBasedLifecycleManager created');
          }
        } catch (error) {
          if (debugEnabled) {
            const logger = getLogger();
            logger.warn('⚠️ Lifecycle manager creation failed:', error);
          }
        }
      }

      // 6. 创建插件专属 SCOPED 容器（内部对象容器）
      const pluginContext: PluginContainerContext<T> = {
        internalContainer: container.createScope(),
        rootContainer: container,
        options: processedOptions,
        lifecycleManager,
        patterns: mergedConfig.discovery.patterns,
        // 🎯 使用捕获的调用者路径来解析基础路径
        basePath: fileURLToPath(
          resolveBasePath(mergedConfig.discovery?.baseDir, callerFilePath)
        ),
        autoDIConfig: mergedConfig,
        debugEnabled,
        pluginName
      };

      // 6. 执行自动模块发现和注册（第一层：内部对象）
      await performAutoRegistration(pluginContext);

      // 7. 🎯 统一模块发现和即时处理：单循环完成发现、分类和立即注册
      const moduleProcessingResult = await discoverAndProcessModules(
        pluginContext,
        fastify
      );

      if (debugEnabled) {
        const logger = getLogger();
        logger.info(
          '🔍 Unified module processing with immediate registration completed',
          {
            ...moduleProcessingResult.statistics,
            routeConfigs: moduleProcessingResult.routeConfigs.length,
            executorConfigs: moduleProcessingResult.executorConfigs.length,
            lifecycleConfigs: moduleProcessingResult.lifecycleConfigs.length,
            errors: moduleProcessingResult.errors.length
          }
        );
      }

      // 8. � 注册生命周期钩子：路由和执行器已在发现阶段立即注册
      const processingResult = await registerProcessedModules(
        fastify,
        moduleProcessingResult,
        pluginContext,
        mergedConfig,
        debugEnabled
      );

      if (debugEnabled) {
        const logger = getLogger();
        logger.info('🎯 Immediate registration mode summary', {
          processingTime: `${processingResult.summary.processingTimeMs}ms`,
          totalModules: processingResult.summary.totalModulesProcessed,
          lifecycle: {
            hooks: processingResult.lifecycle.hooksRegistered,
            services: processingResult.lifecycle.servicesProcessed
          },
          routing: {
            controllers: processingResult.routing.controllersProcessed,
            routes: processingResult.routing.routesRegistered,
            note: 'Routes registered immediately during discovery'
          },
          executors: {
            registered: processingResult.executor.registered,
            skipped: processingResult.executor.skipped,
            failed: processingResult.executor.failed,
            names: processingResult.executor.executors,
            note: 'Executors registered immediately during discovery'
          },
          performance:
            'Optimized with immediate registration - no batch processing delays'
        });
      }

      // 9. 注册服务适配器（第二层：对外服务接口）
      if (mergedConfig.services?.enabled !== false) {
        await registerServiceAdapters(pluginContext);

        if (debugEnabled) {
          const logger = getLogger();
          logger.info('✅ Service adapters registered successfully');
        }
      }

      // 10. 注册插件关闭时的清理钩子
      fastify.addHook('onClose', async () => {
        try {
          // 清理插件内部容器
          await pluginContext.internalContainer.dispose();

          // 清理生命周期管理器
          if (pluginContext.lifecycleManager) {
            pluginContext.lifecycleManager.dispose();
          }

          if (debugEnabled) {
            const logger = getLogger();
            logger.info(
              `🧹 Plugin container disposed successfully for: ${pluginName}`
            );
          }
        } catch (error) {
          if (debugEnabled) {
            const logger = getLogger();
            logger.error(
              `❌ Failed to dispose plugin container for ${pluginName}:`,
              error
            );
          }
        }
      });

      // 11. 执行原始插件函数
      if (isAsyncPlugin(plugin)) {
        await plugin(fastify, processedOptions);
      } else {
        await new Promise<void>((resolve, reject) => {
          (plugin as FastifyPluginCallback<T>)(
            fastify,
            processedOptions,
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      // 13. 性能统计和调试信息
      if (debugEnabled) {
        const logger = getLogger();
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        logger.info(
          `🎯 Enhanced withRegisterAutoDI completed in ${totalTime}ms`
        );
        logger.info(`📁 Base path: ${pluginContext.basePath}`);
        logger.info(`🔧 Patterns: ${pluginContext.patterns.join(', ')}`);
        logger.info(
          `🏗️ Two-layer architecture: Internal objects + Service adapters`
        );

        // 🎯 生命周期统计信息
        if (
          config.lifecycle?.enabled !== false &&
          pluginContext.lifecycleManager
        ) {
          const stats = pluginContext.lifecycleManager.getLifecycleStats();
          logger.info(`🔄 Lifecycle services: ${stats.totalServices}`);
          logger.info(
            `📋 Lifecycle methods: ${JSON.stringify(stats.methodsByHook)}`
          );
        }
      }
    } catch (error) {
      if (debugEnabled) {
        const logger = getLogger();
        logger.error('❌ withRegisterAutoDI failed:', error);
      }
      throw error;
    }
  };
}

/**
 * 直接注册预处理的模块结果
 * 使用 discoverAndProcessModules 的输出，避免重复处理
 */
async function registerProcessedModules<T>(
  fastify: FastifyInstance,
  moduleProcessingResult: ModuleProcessingResult,
  pluginContext: PluginContainerContext<T>,
  config: AutoDIConfig,
  debugEnabled: boolean
): Promise<{
  lifecycle: { hooksRegistered: number; servicesProcessed: number };
  routing: { controllersProcessed: number; routesRegistered: number };
  executor: {
    registered: number;
    skipped: number;
    failed: number;
    executors: string[];
  };
  summary: { totalModulesProcessed: number; processingTimeMs: number };
}> {
  const startTime = Date.now();

  const result = {
    lifecycle: { hooksRegistered: 0, servicesProcessed: 0 },
    routing: { controllersProcessed: 0, routesRegistered: 0 },
    executor: {
      registered: 0,
      skipped: 0,
      failed: 0,
      executors: [] as string[]
    },
    summary: { totalModulesProcessed: 0, processingTimeMs: 0 }
  };

  if (debugEnabled) {
    const logger = getLogger();
    logger.info('🚀 Starting direct registration of processed modules...', {
      routeConfigs: moduleProcessingResult.routeConfigs.length,
      executorConfigs: moduleProcessingResult.executorConfigs.length,
      lifecycleConfigs: moduleProcessingResult.lifecycleConfigs.length
    });
  }

  // 1. 注册生命周期钩子（生命周期方法已经在 discoverAndProcessModules 中注册到管理器）
  if (config.lifecycle?.enabled !== false && pluginContext.lifecycleManager) {
    const supportedMethods: Array<
      'onReady' | 'onListen' | 'onClose' | 'preClose' | 'onRoute' | 'onRegister'
    > = ['onReady', 'onListen', 'onClose', 'preClose', 'onRoute', 'onRegister'];

    for (const hookMethod of supportedMethods) {
      const handler =
        pluginContext.lifecycleManager.createAggregatedHandler(hookMethod);
      if (handler) {
        (fastify as any).addHook(hookMethod, handler);
        result.lifecycle.hooksRegistered++;

        if (debugEnabled) {
          const logger = getLogger();
          logger.info(`🔗 Registered Fastify hook: ${hookMethod}`);
        }
      }
    }

    result.lifecycle.servicesProcessed =
      moduleProcessingResult.lifecycleConfigs.length;
  }

  // 2. 路由统计（路由已在发现阶段立即注册）
  if (
    config.routing?.enabled !== false &&
    moduleProcessingResult.routeConfigs.length > 0
  ) {
    result.routing.controllersProcessed =
      moduleProcessingResult.routeConfigs.length;
    result.routing.routesRegistered =
      moduleProcessingResult.routeConfigs.reduce(
        (total, config) => total + config.routeMethods.length,
        0
      );

    if (debugEnabled) {
      const logger = getLogger();
      logger.info(
        `✅ Routes already registered during discovery: ${result.routing.routesRegistered} routes from ${result.routing.controllersProcessed} controllers`
      );
    }
  }

  // 3. 执行器统计（执行器已在发现阶段立即注册）
  if (moduleProcessingResult.executorConfigs.length > 0) {
    // 统计执行器注册结果
    result.executor = {
      registered: moduleProcessingResult.executorConfigs.length,
      skipped: 0,
      failed: 0,
      executors: moduleProcessingResult.executorConfigs.map(
        (config) => config.name
      )
    };

    if (debugEnabled) {
      const logger = getLogger();
      logger.info(
        `✅ Executors already registered during discovery: ${result.executor.registered} executors`
      );
    }
  }

  const processingTime = Date.now() - startTime;
  result.summary.totalModulesProcessed =
    moduleProcessingResult.statistics.totalModules;
  result.summary.processingTimeMs = processingTime;

  if (debugEnabled) {
    const logger = getLogger();
    logger.info('🎉 Immediate registration mode completed', {
      processingTimeMs: processingTime,
      lifecycle: result.lifecycle,
      routing: result.routing,
      executor: {
        registered: result.executor.registered,
        failed: result.executor.failed
      },
      note: 'Routes and executors were registered immediately during discovery phase'
    });
  }

  return result;
}
