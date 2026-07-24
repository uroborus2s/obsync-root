// @stratix/core 统一模块处理器
// 将分散的模块处理逻辑整合到一个统一的循环中

import type { FastifyInstance } from 'fastify';
import { getLogger } from '../logger/index.js';
import { registerControllerRoutes } from './controller-registration.js';
import type { FastifyLifecycleMethod } from './lifecycle-manager.js';
import type {
  ModuleClassificationResult,
  ModuleInfo
} from './module-discovery.js';
import type { PluginContainerContext } from './service-discovery.js';
import type { AutoDIConfig } from './utils.js';

/**
 * 模块处理结果接口
 */
export interface ModuleProcessingResult {
  /** 生命周期处理结果 */
  lifecycle: {
    hooksRegistered: number;
    servicesProcessed: number;
  };
  /** 路由处理结果 */
  routing: {
    controllersProcessed: number;
    routesRegistered: number;
  };
  /** 总体统计 */
  summary: {
    totalModulesProcessed: number;
    processingTimeMs: number;
  };
}

/**
 * 统一模块处理器
 * 在一个主循环中处理所有类型的模块，避免重复遍历
 *
 * @param fastify - Fastify 实例
 * @param moduleClassification - 模块分类结果
 * @param pluginContext - 插件上下文
 * @param config - AutoDI 配置
 * @param debugEnabled - 是否启用调试模式
 * @returns 模块处理结果
 */
export async function processModulesUnified<T>(
  fastify: FastifyInstance,
  moduleClassification: ModuleClassificationResult,
  pluginContext: PluginContainerContext<T>,
  config: AutoDIConfig,
  debugEnabled: boolean = false
): Promise<ModuleProcessingResult> {
  const startTime = Date.now();

  const result: ModuleProcessingResult = {
    lifecycle: { hooksRegistered: 0, servicesProcessed: 0 },
    routing: { controllersProcessed: 0, routesRegistered: 0 },
    summary: { totalModulesProcessed: 0, processingTimeMs: 0 }
  };

  if (debugEnabled) {
    const logger = getLogger();
    logger.info('🔄 Starting unified module processing...', {
      totalModules: moduleClassification.allModules.length,
      classModules: moduleClassification.classModules.length,
      controllerModules: moduleClassification.controllerModules.length,
      routeModules: moduleClassification.routeModules.length,
      lifecycleModules: moduleClassification.lifecycleModules.length
    });
  }

  // 1. 处理生命周期方法（如果启用）
  if (config.lifecycle?.enabled !== false && pluginContext.lifecycleManager) {
    await processLifecycleMethods(
      fastify,
      moduleClassification,
      pluginContext,
      result,
      debugEnabled
    );
  }

  // 2. 处理路由注册（如果启用）
  if (config.routing?.enabled !== false) {
    await processRouting(
      fastify,
      moduleClassification,
      pluginContext,
      config,
      result,
      debugEnabled
    );
  }

  // 3. 计算总体统计
  result.summary.totalModulesProcessed = moduleClassification.allModules.length;
  result.summary.processingTimeMs = Date.now() - startTime;

  if (debugEnabled) {
    const logger = getLogger();
    logger.info('✅ Unified module processing completed', {
      processingTime: `${result.summary.processingTimeMs}ms`,
      lifecycle: result.lifecycle,
      routing: result.routing
    });
  }

  return result;
}

/**
 * 处理生命周期方法
 * 使用预分类的生命周期模块，避免重复扫描容器
 */
async function processLifecycleMethods<T>(
  fastify: FastifyInstance,
  moduleClassification: ModuleClassificationResult,
  pluginContext: PluginContainerContext<T>,
  result: ModuleProcessingResult,
  debugEnabled: boolean
): Promise<void> {
  const lifecycleManager = pluginContext.lifecycleManager!;
  const { lifecycleModules } = moduleClassification;

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      `🔄 Processing ${lifecycleModules.length} lifecycle modules...`
    );
  }

  // 首先将所有生命周期模块注册到生命周期管理器
  for (const moduleInfo of lifecycleModules) {
    lifecycleManager.scanAndRegisterService(
      moduleInfo.name,
      moduleInfo.instance
    );

    if (debugEnabled) {
      const logger = getLogger();
      logger.debug(`📋 Registered lifecycle module: ${moduleInfo.name}`, {
        methods: moduleInfo.lifecycleMethods
      });
    }
  }

  // 然后为每个生命周期方法创建聚合处理器并注册到 Fastify
  const supportedMethods: FastifyLifecycleMethod[] = [
    'onReady',
    'onListen',
    'onClose',
    'preClose',
    'onRoute',
    'onRegister'
  ];

  for (const hookMethod of supportedMethods) {
    const handler = lifecycleManager.createAggregatedHandler(hookMethod);
    if (handler) {
      // 使用类型断言来处理Fastify的钩子类型
      (fastify as any).addHook(hookMethod, handler);
      result.lifecycle.hooksRegistered++;

      if (debugEnabled) {
        const logger = getLogger();
        logger.info(`🔗 Registered Fastify hook: ${hookMethod}`);
      }
    }
  }

  // 统计处理的服务数量
  result.lifecycle.servicesProcessed = lifecycleModules.length;

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      `✅ Lifecycle processing completed: ${result.lifecycle.hooksRegistered} hooks, ${result.lifecycle.servicesProcessed} services`
    );
  }
}

/**
 * 处理路由注册
 */
async function processRouting<T>(
  fastify: FastifyInstance,
  moduleClassification: ModuleClassificationResult,
  pluginContext: PluginContainerContext<T>,
  config: AutoDIConfig,
  result: ModuleProcessingResult,
  debugEnabled: boolean
): Promise<void> {
  // 使用现有的控制器路由注册逻辑
  await registerControllerRoutes(
    fastify,
    pluginContext.internalContainer,
    config.routing
  );

  // 统计控制器和路由数量
  result.routing.controllersProcessed =
    moduleClassification.controllerModules.length;

  // 计算路由数量（简化统计，实际可以更精确）
  result.routing.routesRegistered = moduleClassification.routeModules.reduce(
    (total, module) => {
      // 这里可以更精确地计算每个控制器的路由数量
      return total + (module.hasRoutes ? 1 : 0);
    },
    0
  );

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      `✅ Routing processing completed: ${result.routing.controllersProcessed} controllers, ${result.routing.routesRegistered} route modules`
    );
  }
}

/**
 * 处理单个模块（预留接口，用于未来扩展）
 *
 * @param moduleInfo - 模块信息
 * @param context - 处理上下文
 */
export async function processSingleModule(
  moduleInfo: ModuleInfo,
  context: {
    fastify: FastifyInstance;
    pluginContext: PluginContainerContext<any>;
    config: AutoDIConfig;
    debugEnabled: boolean;
  }
): Promise<void> {
  // 预留接口，用于处理特殊的单个模块
  // 可以在这里添加自定义的模块处理逻辑

  if (context.debugEnabled) {
    const logger = getLogger();
    logger.debug(`Processing individual module: ${moduleInfo.name}`, {
      isClass: moduleInfo.isClass,
      isController: moduleInfo.isController,
      hasRoutes: moduleInfo.hasRoutes
    });
  }
}
