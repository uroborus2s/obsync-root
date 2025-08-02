// @stratix/core 自动依赖注入插件
// 主要的withRegisterAutoDI函数实现

import { deepMerge } from '@stratix/utils/data';
import { isDevelopment } from '@stratix/utils/environment';
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions
} from 'fastify';
import { fileURLToPath } from 'node:url';
import { getLogger } from '../logger/index.js';

// 导入各个功能模块
import { registerServiceAdapters } from './adapter-registration.js';
import { registerControllerRoutes } from './controller-registration.js';
import {
  ConventionBasedLifecycleManager,
  type FastifyLifecycleMethod
} from './lifecycle-manager.js';
import {
  ensureAwilixPlugin,
  performAutoRegistration
} from './service-discovery.js';
import {
  type AutoDIConfig,
  getCallerFilePath,
  getPluginName,
  isAsyncPlugin,
  processPluginParameters,
  resolveBasePath
} from './utils.js';

/**
 * 默认的 AutoDI 配置
 */
const DEFAULT_AUTO_DI_CONFIG: AutoDIConfig = {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}'
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

      // 4. 设置默认配置
      const patterns = mergedConfig.discovery.patterns;

      // 🎯 使用捕获的调用者路径来解析基础路径
      const basePath = fileURLToPath(
        resolveBasePath(mergedConfig.discovery?.baseDir, callerFilePath)
      );

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

      // 6. 执行自动模块发现和注册（第一层：内部对象）
      const pluginContext = await performAutoRegistration(
        container,
        options,
        patterns,
        basePath,
        debugEnabled,
        lifecycleManager
      );
      // 7. 🎯 注册Fastify生命周期钩子
      if (
        mergedConfig.lifecycle?.enabled !== false &&
        pluginContext.lifecycleManager
      ) {
        const lifecycleManager = pluginContext.lifecycleManager;

        // 注册所有支持的Fastify钩子
        const hookMethods: FastifyLifecycleMethod[] = [
          'onReady',
          'onListen',
          'onClose',
          'preClose',
          'onRoute',
          'onRegister'
        ];

        hookMethods.forEach((hookMethod) => {
          const handler = lifecycleManager.createAggregatedHandler(hookMethod);
          if (handler) {
            // 使用类型断言来处理Fastify的钩子类型
            (fastify as any).addHook(hookMethod, handler);

            if (debugEnabled) {
              const logger = getLogger();
              logger.info(`🔗 Registered Fastify hook: ${hookMethod}`);
            }
          }
        });

        if (debugEnabled) {
          const logger = getLogger();
          const stats = lifecycleManager.getLifecycleStats();
          logger.info(
            `✅ Fastify lifecycle hooks registered for ${stats.totalServices} services`
          );
        }
      }

      // 8. 注册服务适配器（第二层：对外服务接口）
      if (mergedConfig.services?.enabled !== false) {
        await registerServiceAdapters(
          pluginContext,
          mergedConfig.services,
          basePath,
          pluginName,
          debugEnabled
        );

        if (debugEnabled) {
          const logger = getLogger();
          logger.info('✅ Service adapters registered successfully');
        }
      }

      // 9. 注册控制器路由
      if (mergedConfig.routing?.enabled !== false) {
        await registerControllerRoutes(
          fastify,
          pluginContext.internalContainer,
          mergedConfig.routing
        );

        if (debugEnabled) {
          const logger = getLogger();
          logger.info('✅ Controller routes registered successfully');
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

      // 12. 性能统计和调试信息
      if (debugEnabled) {
        const logger = getLogger();
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        logger.info(
          `🎯 Enhanced withRegisterAutoDI completed in ${totalTime}ms`
        );
        logger.info(`📁 Base path: ${basePath}`);
        logger.info(`🔧 Patterns: ${patterns.join(', ')}`);
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
