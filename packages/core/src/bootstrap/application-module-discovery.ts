// @stratix/core 应用级模块发现和处理模块
// 实现应用级的统一循环处理架构，同时处理生命周期函数和路由注册
// 复用现有的ConventionBasedLifecycleManager和fastify.addHook机制

import { type AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import { MetadataManager } from '../decorators/metadata.js';
import { getLogger } from '../logger/index.js';
import { registerControllerRoutes } from '../plugin/controller-registration.js';
import { ConventionBasedLifecycleManager } from '../plugin/lifecycle-manager.js';
import {
  ApplicationErrorHandler,
  ApplicationErrorType,
  safeExecute
} from './application-error-handler.js';

/**
 * 应用级模块处理结果
 */
export interface ApplicationModuleProcessingResult {
  /** 统计信息 */
  statistics: {
    totalModules: number;
    classModules: number;
    controllerModules: number;
    lifecycleModules: number;
    skippedModules: number;
  };
  /** 生命周期执行结果 */
  lifecycleResults: {
    onRegister?: any; // LifecyclePhaseResult
    onReady?: any; // LifecyclePhaseResult
  };
  /** 路由注册结果 */
  routeRegistrationResult?: {
    success: boolean;
    error?: string;
  };
  /** 处理错误 */
  errors: Array<{
    moduleName: string;
    error: string;
  }>;
  /** 错误处理器实例 */
  errorHandler?: any;
}

/**
 * 应用级模块发现和处理配置
 */
export interface ApplicationModuleProcessingConfig {
  /** 是否启用路由注册 */
  routingEnabled?: boolean;
  /** 路由前缀 */
  routePrefix?: string;
  /** 是否启用路由验证 */
  routeValidation?: boolean;
  /** 是否启用生命周期管理 */
  lifecycleEnabled?: boolean;
  /** 生命周期错误处理策略 */
  lifecycleErrorHandling?: 'throw' | 'warn' | 'ignore';
  /** 是否启用调试模式 */
  debug?: boolean;
}

/**
 * 检测实例是否包含生命周期方法
 */
function detectApplicationLifecycleMethods(instance: any): {
  hasLifecycleMethods: boolean;
  lifecycleMethods: string[];
} {
  const supportedMethods = [
    'onReady',
    'onListen',
    'onClose',
    'preClose',
    'onRoute',
    'onRegister'
  ];
  const lifecycleMethods: string[] = [];

  if (!instance || typeof instance !== 'object') {
    return { hasLifecycleMethods: false, lifecycleMethods };
  }

  // 检测每个生命周期方法
  for (const method of supportedMethods) {
    if (typeof instance[method] === 'function') {
      lifecycleMethods.push(method);
    }
  }

  return {
    hasLifecycleMethods: lifecycleMethods.length > 0,
    lifecycleMethods
  };
}

/**
 * 应用级统一模块发现和处理
 * 复用现有的ConventionBasedLifecycleManager和fastify.addHook机制
 */
export async function discoverAndProcessApplicationModules(
  rootContainer: AwilixContainer,
  fastifyInstance?: FastifyInstance,
  config: ApplicationModuleProcessingConfig = {}
): Promise<ApplicationModuleProcessingResult> {
  const startTime = Date.now();
  const logger = getLogger();

  const errorHandler = new ApplicationErrorHandler(config.debug || false);

  // 初始化结果对象
  const result: ApplicationModuleProcessingResult = {
    statistics: {
      totalModules: 0,
      classModules: 0,
      controllerModules: 0,
      lifecycleModules: 0,
      skippedModules: 0
    },
    lifecycleResults: {},
    errors: [],
    errorHandler
  };

  // 创建生命周期管理器（复用现有的ConventionBasedLifecycleManager）
  const lifecycleManager =
    config.lifecycleEnabled !== false
      ? new ConventionBasedLifecycleManager(config.debug || false)
      : null;

  if (config.debug) {
    logger.info(
      '🔍 Starting application-level unified module discovery and processing...',
      {
        hasRouteRegistration: !!fastifyInstance,
        hasLifecycleManagement: !!lifecycleManager,
        routingEnabled: config.routingEnabled,
        lifecycleEnabled: config.lifecycleEnabled
      }
    );
  }

  // 遍历根容器中的所有注册项，一次性完成发现和处理
  for (const [name, registration] of Object.entries(
    rootContainer.registrations
  )) {
    try {
      // 检查是否为有效的注册
      if (!registration || typeof registration.resolve !== 'function') {
        continue;
      }
      const instance = await safeExecute(
        () => rootContainer.resolve(name),
        errorHandler,
        ApplicationErrorType.CONTAINER_RESOLUTION,
        'ignore',
        { moduleName: name, operationName: 'resolve' }
      );

      if (!instance) {
        result.statistics.skippedModules++;
        continue;
      }

      if (!instance || !instance.constructor) {
        result.statistics.skippedModules++;
        if (config.debug) {
          logger.debug(`⏭️ Skipping non-class registration: ${name}`);
        }
        continue;
      }

      // 检查是否为类注册
      const constructor = instance.constructor as new (...args: any[]) => any;
      result.statistics.classModules++;
      result.statistics.totalModules++;
      if (!constructor) {
        result.statistics.skippedModules++;
        continue;
      }
      // 检查装饰器元数据
      const isController = MetadataManager.isController(
        constructor || instance
      );
      const hasRoutes = MetadataManager.hasRoutes(constructor || instance);

      // 检测生命周期方法（简化版本，直接检测）
      const lifecycleInfo = detectApplicationLifecycleMethods(instance);

      if (config.debug) {
        logger.debug(`📋 Application module discovered: ${name}`, {
          isController,
          hasRoutes,
          hasLifecycleMethods: lifecycleInfo.hasLifecycleMethods,
          lifecycleMethods: lifecycleInfo.lifecycleMethods
        });
      }

      // 处理控制器模块
      if (isController) {
        result.statistics.controllerModules++;

        if (config.debug) {
          logger.debug(`🎮 Processing controller: ${name}`);
        }
      }

      // 处理生命周期模块
      if (lifecycleInfo.hasLifecycleMethods && lifecycleManager) {
        result.statistics.lifecycleModules++;

        // 立即注册生命周期方法
        lifecycleManager.scanAndRegisterService(name, instance);

        if (config.debug) {
          logger.debug(`🔄 Lifecycle methods registered for: ${name}`, {
            methods: lifecycleInfo.lifecycleMethods
          });
        }
      }
    } catch (error) {
      result.errors.push({
        moduleName: name,
        error: error instanceof Error ? error.message : String(error)
      });

      if (config.debug) {
        logger.warn(`⚠️ Failed to process application module: ${name}`, error);
      }
    }
  }

  // 注册生命周期钩子到Fastify（按照现有的registerProcessedModules模式）
  if (
    lifecycleManager &&
    fastifyInstance &&
    result.statistics.lifecycleModules > 0
  ) {
    try {
      if (config.debug) {
        logger.info('🔗 Registering application lifecycle hooks to Fastify...');
      }

      // 支持的生命周期方法
      const supportedMethods: Array<
        | 'onReady'
        | 'onListen'
        | 'onClose'
        | 'preClose'
        | 'onRoute'
        | 'onRegister'
      > = [
        'onReady',
        'onListen',
        'onClose',
        'preClose',
        'onRoute',
        'onRegister'
      ];

      let hooksRegistered = 0;
      for (const hookMethod of supportedMethods) {
        const handler = lifecycleManager.createAggregatedHandler(hookMethod);
        if (handler) {
          (fastifyInstance as any).addHook(hookMethod, handler);
          hooksRegistered++;

          if (config.debug) {
            logger.info(`🔗 Registered Fastify hook: ${hookMethod}`);
          }
        }
      }

      result.lifecycleResults.onRegister = {
        phase: 'onRegister',
        totalDuration: 0,
        successCount: hooksRegistered,
        failureCount: 0,
        results: []
      };

      if (config.debug) {
        logger.info(
          `✅ Application lifecycle hooks registered: ${hooksRegistered} hooks`
        );
      }
    } catch (error) {
      result.errors.push({
        moduleName: 'lifecycle:hooks',
        error: error instanceof Error ? error.message : String(error)
      });

      if (config.lifecycleErrorHandling === 'throw') {
        throw error;
      } else if (config.lifecycleErrorHandling === 'warn' || config.debug) {
        logger.warn(
          '⚠️ Application lifecycle hooks registration failed:',
          error
        );
      }
    }
  }

  // 执行路由注册
  if (
    fastifyInstance &&
    config.routingEnabled !== false &&
    result.statistics.controllerModules > 0
  ) {
    try {
      if (config.debug) {
        logger.info('🛣️ Registering application-level controller routes...');
      }

      await registerControllerRoutes(fastifyInstance, rootContainer, {
        enabled: config.routingEnabled,
        prefix: config.routePrefix,
        validation: config.routeValidation
      });

      result.routeRegistrationResult = { success: true };

      if (config.debug) {
        logger.info(
          '✅ Application-level controller routes registered successfully'
        );
      }
    } catch (error) {
      result.routeRegistrationResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      result.errors.push({
        moduleName: 'routing',
        error: error instanceof Error ? error.message : String(error)
      });

      if (config.debug) {
        logger.warn(
          '⚠️ Failed to register application-level controller routes:',
          error
        );
      }
      // 路由注册失败不应该影响应用启动，所以不抛出错误
    }
  }

  // 生命周期钩子已经通过fastify.addHook注册，无需额外处理

  const processingTime = Date.now() - startTime;

  if (config.debug) {
    logger.info('✅ Application-level unified module processing completed', {
      ...result.statistics,
      processingTimeMs: processingTime,
      lifecyclePhases: Object.keys(result.lifecycleResults).length,
      routeRegistration: result.routeRegistrationResult?.success || false,
      errors: result.errors.length
    });
  }

  return result;
}

/**
 * 创建应用级生命周期管理器的便捷函数
 * 复用现有的ConventionBasedLifecycleManager
 */
export async function createApplicationLifecycleManager(
  debugEnabled: boolean = false
): Promise<any> {
  const { ConventionBasedLifecycleManager } = await import(
    '../plugin/lifecycle-manager.js'
  );
  return new ConventionBasedLifecycleManager(debugEnabled);
}
