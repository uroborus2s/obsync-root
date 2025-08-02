// @stratix/core 服务发现和自动注册模块
// 负责扫描、发现和注册服务到Awilix容器

import { asValue, InjectionMode, Lifetime, type AwilixContainer } from 'awilix';
import { getLogger } from '../logger/index.js';
import { ConventionBasedLifecycleManager } from './lifecycle-manager.js';

/**
 * 插件容器上下文
 */
export interface PluginContainerContext<T> {
  /** 插件域内部容器 */
  internalContainer: AwilixContainer;
  /** 根容器引用 */
  rootContainer: AwilixContainer;
  /** 插件选项 */
  options: T;
  /** 生命周期管理器（可选，仅在启用生命周期管理时存在） */
  lifecycleManager?: ConventionBasedLifecycleManager;
}

/**
 * 执行精细化的自动模块注册
 * 基于 Awilix listModules() 实现 per-module local injections
 * 返回插件容器上下文，包含内部容器和根容器的引用
 */
export async function performAutoRegistration<T>(
  container: AwilixContainer,
  options: T,
  patterns: string[],
  basePath: string,
  debugEnabled: boolean,
  lifecycleManager?: ConventionBasedLifecycleManager
): Promise<PluginContainerContext<T>> {
  // 创建插件专属的 SCOPED 容器（内部对象容器）
  const pluginInternalContainer = container.createScope();

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      `🎯 Starting enhanced auto registration with patterns: ${patterns.join(', ')}`
    );
    if (lifecycleManager) {
      logger.info('🔄 Lifecycle management enabled');
    }
  }

  try {
    // 注册插件配置到内部容器
    pluginInternalContainer.register('config', asValue(options));

    if (debugEnabled) {
      const logger = getLogger();
      logger.info(
        `🎯 Starting loadModules auto registration with patterns: ${patterns.join(', ')}`
      );
      logger.info(`📁 Base path: ${basePath}`);
    }
    // 使用 loadModules 直接加载所有模块到插件内部容器
    await pluginInternalContainer.loadModules(patterns, {
      cwd: basePath,
      formatName: 'camelCase', // 使用驼峰命名
      resolverOptions: {
        // 默认生命周期为 SCOPED（插件内部对象不使用 SINGLETON）
        lifetime: Lifetime.SCOPED,
        injectionMode: InjectionMode.CLASSIC
      },
      esModules: true
    });
    // 🎯 扫描和注册生命周期方法（如果启用）
    if (lifecycleManager) {
      await scanAndRegisterLifecycleMethods(
        pluginInternalContainer,
        lifecycleManager,
        debugEnabled
      );
    }

    if (debugEnabled) {
      // 获取注册的模块数量
      const registrations = Object.keys(pluginInternalContainer.registrations);
      const moduleCount = registrations.filter(
        (name) => !['pluginConfig', 'lifecycleManager'].includes(name)
      ).length;

      const logger = getLogger();
      logger.info(
        `🎉 LoadModules registration completed: ${moduleCount} modules loaded`
      );
      logger.info(
        `📋 Registered modules: ${registrations.filter((name) => !['pluginConfig', 'lifecycleManager'].includes(name)).join(', ')}`
      );

      if (lifecycleManager) {
        const stats = lifecycleManager.getLifecycleStats();
        logger.info(
          `🔄 Lifecycle services: ${stats.totalServices}, methods: ${JSON.stringify(stats.methodsByHook)}`
        );
      }
    }
  } catch (error) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.error('❌ LoadModules registration failed:', error);
    }
    throw error;
  }

  // 返回插件容器上下文
  return {
    internalContainer: pluginInternalContainer,
    rootContainer: container,
    options,
    lifecycleManager
  };
}

/**
 * 扫描和注册生命周期方法
 */
async function scanAndRegisterLifecycleMethods(
  container: AwilixContainer,
  lifecycleManager: ConventionBasedLifecycleManager,
  debugEnabled: boolean
): Promise<void> {
  if (debugEnabled) {
    const logger = getLogger();
    logger.info('🔍 Scanning for lifecycle methods...');
  }

  let registeredCount = 0;

  // 遍历容器中的所有注册项
  for (const [serviceName] of Object.entries(container.registrations)) {
    // 跳过内置服务
    if (['config', 'logger'].includes(serviceName)) {
      continue;
    }

    try {
      // 解析服务实例
      const serviceInstance = container.resolve(serviceName);

      // 扫描并注册生命周期方法（基于方法名约定）
      if (lifecycleManager) {
        lifecycleManager.scanAndRegisterService(serviceName, serviceInstance);
        registeredCount++;

        if (debugEnabled) {
          const logger = getLogger();
          logger.info(`📋 Scanned lifecycle methods for: ${serviceName}`);
        }
      }
    } catch (error) {
      if (debugEnabled) {
        const logger = getLogger();
        logger.warn(
          `⚠️ Failed to scan service for lifecycle methods: ${serviceName}`,
          error
        );
      }
    }
  }

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      `✅ Lifecycle scanning completed: ${registeredCount} services registered`
    );
  }
}

/**
 * 确保 @fastify/awilix 插件已注册
 */
export async function ensureAwilixPlugin(
  fastify: any
): Promise<AwilixContainer> {
  if (!fastify.hasDecorator('diContainer')) {
    throw new Error(
      '@fastify/awilix plugin is not registered. Please register it before using withAutoDI.'
    );
  }
  return fastify.diContainer;
}
