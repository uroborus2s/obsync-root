// @stratix/core 模块发现和筛选工具
// 负责获取插件域内的模块并进行分类筛选

import { AwilixContainer, isClass, isFunction } from 'awilix';
import type { FastifyInstance } from 'fastify';
import {
  ExecutorMetadata,
  MetadataManager,
  RouteMetadata
} from '../decorators/metadata.js';
import { getLogger } from '../logger/index.js';
import { PluginContainerContext } from './service-discovery.js';

/**
 * 支持的 Fastify 生命周期方法列表
 */
export const FASTIFY_LIFECYCLE_METHODS = [
  'onReady',
  'onListen',
  'onClose',
  'preClose',
  'onRoute',
  'onRegister'
] as const;

/**
 * 获取注册类型的描述（用于调试）
 *
 * @param registration - Awilix 注册对象
 * @returns 注册类型描述
 */
function getRegistrationType(registration: any): string {
  const resolver = registration.resolver;
  if (!resolver) {
    return 'unknown';
  }

  if (resolver.fn && typeof resolver.fn === 'function') {
    // 进一步判断是类还是函数
    if (isClass(resolver.fn)) {
      return 'asClass';
    } else if (isFunction(resolver.fn)) {
      return 'asFunction';
    }
    return 'function';
  }

  return 'asValue';
}

/**
 * 检测模块实例是否包含生命周期方法
 *
 * @param instance - 模块实例
 * @returns 生命周期方法检测结果
 */
function detectLifecycleMethods(instance: any): {
  hasLifecycleMethods: boolean;
  lifecycleMethods: string[];
} {
  const lifecycleMethods: string[] = [];

  if (!instance || typeof instance !== 'object') {
    return { hasLifecycleMethods: false, lifecycleMethods };
  }

  // 检测每个生命周期方法
  for (const method of FASTIFY_LIFECYCLE_METHODS) {
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
 * 模块信息接口
 */
export interface ModuleInfo {
  /** 模块名称 */
  name: string;
  /** 模块实例 */
  instance: any;
  /** 模块构造函数 */
  constructor?: new (...args: any[]) => any;
  /** 是否为类 */
  isClass: boolean;
  /** 是否为控制器 */
  isController: boolean;
  /** 是否为执行器 */
  isExecutor: boolean;
  /** 是否有路由 */
  hasRoutes: boolean;
  /** 是否有生命周期方法 */
  hasLifecycleMethods: boolean;
  /** 生命周期方法列表 */
  lifecycleMethods: string[];
}

/**
 * 路由配置信息
 */
export interface RouteConfig {
  /** 控制器名称 */
  controllerName: string;
  /** 控制器实例 */
  controllerInstance: any;
  /** 控制器构造函数 */
  controllerConstructor: new (...args: any[]) => any;
  /** 路由方法列表 */
  routeMethods: string[];
}

/**
 * 执行器配置信息
 */
export interface ExecutorConfig {
  /** 执行器名称 */
  name: string;
  /** 执行器实例 */
  instance: any;
  /** 执行器元数据 */
  metadata: any;
}

/**
 * 生命周期配置信息
 */
export interface LifecycleConfig {
  /** 服务名称 */
  serviceName: string;
  /** 服务实例 */
  serviceInstance: any;
  /** 生命周期方法列表 */
  lifecycleMethods: string[];
}

/**
 * 模块处理结果接口（新的一次性处理模式）
 */
export interface ModuleProcessingResult {
  /** 统计信息 */
  statistics: {
    totalModules: number;
    classModules: number;
    controllerModules: number;
    executorModules: number;
    lifecycleModules: number;
    skippedModules: number;
  };
  /** 可直接用于路由注册的配置 */
  routeConfigs: RouteConfig[];
  /** 可直接用于执行器注册的配置 */
  executorConfigs: ExecutorConfig[];
  /** 可直接用于生命周期注册的配置 */
  lifecycleConfigs: LifecycleConfig[];
  /** 处理过程中的错误 */
  errors: Array<{ moduleName: string; error: string }>;
}

/**
 * 模块分类结果接口（向后兼容）
 */
export interface ModuleClassificationResult {
  /** 所有模块 */
  allModules: ModuleInfo[];
  /** 类对象模块 */
  classModules: ModuleInfo[];
  /** 控制器模块 */
  controllerModules: ModuleInfo[];
  /** 执行器模块 */
  executorModules: ModuleInfo[];
  /** 有路由的模块 */
  routeModules: ModuleInfo[];
  /** 有生命周期方法的模块 */
  lifecycleModules: ModuleInfo[];
}

export type ModuleKeyType = keyof ModuleClassificationResult;

/**
 * 路由配置信息
 */
export interface RouteConfig {
  /** 控制器名称 */
  controllerName: string;
  /** 控制器实例 */
  controllerInstance: any;
  /** 控制器构造函数 */
  controllerConstructor: new (...args: any[]) => any;
  /** 路由方法列表 */
  routeMethods: string[];
}

/**
 * 执行器配置信息
 */
export interface ExecutorConfig {
  /** 执行器名称 */
  name: string;
  /** 执行器实例 */
  instance: any;
  /** 执行器元数据 */
  metadata: any;
}

/**
 * 生命周期配置信息
 */
export interface LifecycleConfig {
  /** 服务名称 */
  serviceName: string;
  /** 服务实例 */
  serviceInstance: any;
  /** 生命周期方法列表 */
  lifecycleMethods: string[];
}

/**
 * 模块处理结果接口（新的一次性处理模式）
 */
export interface ModuleProcessingResult {
  /** 统计信息 */
  statistics: {
    totalModules: number;
    classModules: number;
    controllerModules: number;
    executorModules: number;
    lifecycleModules: number;
    skippedModules: number;
  };
  /** 可直接用于路由注册的配置 */
  routeConfigs: RouteConfig[];
  /** 可直接用于执行器注册的配置 */
  executorConfigs: ExecutorConfig[];
  /** 可直接用于生命周期注册的配置 */
  lifecycleConfigs: LifecycleConfig[];
  /** 处理过程中的错误 */
  errors: Array<{ moduleName: string; error: string }>;
}

/**
 * 即时注册单个控制器的路由
 * 在模块发现阶段立即注册路由，避免批量处理延迟
 */
async function registerControllerRoutesImmediate(
  fastify: FastifyInstance,
  controllerName: string,
  controllerInstance: any,
  routeMetadataList: RouteMetadata[],
  debugEnabled: boolean = false
): Promise<void> {
  // 获取路由元数据

  if (!routeMetadataList || routeMetadataList.length === 0) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.warn(`Controller ${controllerName} has no route metadata`);
    }
    return;
  }

  // 逐个注册路由
  for (const routeMetadata of routeMetadataList) {
    try {
      // 验证路由元数据
      if (
        !routeMetadata.path ||
        !routeMetadata.method ||
        !routeMetadata.propertyKey
      ) {
        if (debugEnabled) {
          const logger = getLogger();
          logger.warn(
            `Invalid route metadata for controller ${controllerName}:`,
            routeMetadata
          );
        }
        continue;
      }

      // 创建路由处理器
      const handler = async (request: any, reply: any) => {
        try {
          if (
            !controllerInstance ||
            typeof controllerInstance[routeMetadata.propertyKey] !== 'function'
          ) {
            throw new Error(
              `Method ${routeMetadata.propertyKey} not found on controller ${controllerName}`
            );
          }

          const boundMethod =
            controllerInstance[routeMetadata.propertyKey].bind(
              controllerInstance
            );
          return await boundMethod(request, reply);
        } catch (error) {
          const enhancedError = new Error(
            `Error in controller ${controllerName}.${routeMetadata.propertyKey}: ${error instanceof Error ? error.message : String(error)}`
          );
          enhancedError.cause = error;
          throw enhancedError;
        }
      };

      // 构建路由选项
      const routeOptions: any = {
        method: routeMetadata.method.toUpperCase(),
        url: routeMetadata.path,
        handler,
        ...routeMetadata.options
      };

      // 注册路由到 Fastify
      fastify.route(routeOptions);

      if (debugEnabled) {
        const logger = getLogger();
        logger.debug(
          `✅ Route registered: ${routeMetadata.method.toUpperCase()} ${routeMetadata.path} -> ${controllerName}.${routeMetadata.propertyKey}`
        );
      }
    } catch (error) {
      if (debugEnabled) {
        const logger = getLogger();
        logger.error(
          `Failed to register route ${routeMetadata.method} ${routeMetadata.path} for controller ${controllerName}:`,
          error
        );
      }
      throw error;
    }
  }
}

/**
 * 即时注册单个执行器
 * 在模块发现阶段立即注册执行器，避免批量处理延迟
 */
async function registerExecutorImmediate(
  rootContainer: AwilixContainer,
  executorName: string,
  executorInstance: any,
  executorMetadata: ExecutorMetadata | undefined,
  debugEnabled: boolean = false
): Promise<void> {
  // 检查 Fastify 实例是否已注册 tasks 插件的装饰器方法
  if (!rootContainer.getRegistration('registerTaskExecutor')) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.warn(
        '⚠️ Tasks plugin decorators not found, skipping executor registration'
      );
    }
    return;
  }

  // 获取执行器元数据

  if (!executorMetadata) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.warn(`⚠️ Executor ${executorName} has no metadata, skipping`);
    }
    return;
  }

  // 验证执行器实例是否实现了必要的接口
  if (
    !executorInstance ||
    typeof executorInstance !== 'object' ||
    typeof executorInstance.name !== 'string' ||
    typeof executorInstance.execute !== 'function'
  ) {
    if (debugEnabled) {
      const logger = getLogger();
      logger.warn(
        `⚠️ Executor ${executorName} does not implement TaskExecutor interface, skipping`
      );
    }
    return;
  }

  // 确定执行器名称
  const finalExecutorName = executorMetadata.name || executorName;
  const registerTaskExecutor = rootContainer.resolve('registerTaskExecutor');
  // 注册执行器到 tasks 插件
  registerTaskExecutor(finalExecutorName, executorInstance);

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(`📝 Executor immediately registered: ${finalExecutorName}`, {
      originalName: executorName,
      description: executorMetadata.description,
      version: executorMetadata.version,
      tags: executorMetadata.tags
    });
  }
}

/**
 * 一次性处理模块：发现、分类并立即处理（重构版本）
 *
 * 重构目标：
 * - 路由模块：发现后立即注册路由到 Fastify
 * - 执行器模块：发现后立即使用 tasks 装饰器方法注册执行器
 * - 生命周期方法：在完成所有模块处理后统一组装和注册
 *
 * @param container - Awilix 容器实例
 * @param fastify - Fastify 实例（用于立即注册路由和执行器）
 * @param routeConfig - 路由配置
 * @param lifecycleManager - 生命周期管理器（可选）
 * @param debugEnabled - 是否启用调试模式
 * @returns 模块处理结果
 */
export async function discoverAndProcessModules<T>(
  {
    internalContainer,
    rootContainer,
    lifecycleManager,
    debugEnabled
  }: PluginContainerContext<T>,
  fastify: FastifyInstance
): Promise<ModuleProcessingResult> {
  const startTime = Date.now();

  // 初始化结果对象
  const result: ModuleProcessingResult = {
    statistics: {
      totalModules: 0,
      classModules: 0,
      controllerModules: 0,
      executorModules: 0,
      lifecycleModules: 0,
      skippedModules: 0
    },
    routeConfigs: [],
    executorConfigs: [],
    lifecycleConfigs: [],
    errors: []
  };

  // 初始化即时注册统计
  const immediateRegistrationStats = {
    routesRegistered: 0,
    executorsRegistered: 0,
    routeErrors: 0,
    executorErrors: 0
  };

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      '🔍 Starting unified module discovery with immediate processing...',
      {
        hasRouteRegistration: !!fastify,
        hasExecutorRegistration: rootContainer.hasRegistration(
          'registerTaskExecutor'
        )
      }
    );
  }

  // 遍历容器中的所有注册项，一次性完成发现和处理
  for (const [name, registration] of Object.entries(
    internalContainer.registrations
  )) {
    try {
      // 检查是否为有效的注册
      if (!registration || typeof registration.resolve !== 'function') {
        continue;
      }

      const instance = internalContainer.resolve(name);
      if (!instance && !instance.constructor) {
        result.statistics.skippedModules++;
        if (debugEnabled) {
          const logger = getLogger();
          logger.debug(`⏭️ Skipping non-class/function registration: ${name}`, {
            registrationType: getRegistrationType(registration)
          });
        }
        continue;
      }

      // 检查是否为类注册（asClass）
      const constructor = instance.constructor as new (...args: any[]) => any;
      result.statistics.classModules++;

      result.statistics.totalModules++;

      // 检查装饰器元数据
      const isController = MetadataManager.isController(
        constructor || instance
      );
      const isExecutor = MetadataManager.isExecutor(constructor || instance);
      const hasRoutes = MetadataManager.hasRoutes(constructor || instance);

      // 检测生命周期方法
      const lifecycleInfo = detectLifecycleMethods(instance);

      if (debugEnabled) {
        const logger = getLogger();
        logger.debug(`📋 Module discovered: ${name}`, {
          isController,
          isExecutor,
          hasRoutes,
          hasLifecycleMethods: lifecycleInfo.hasLifecycleMethods,
          lifecycleMethods: lifecycleInfo.lifecycleMethods
        });
      }

      // 立即处理控制器模块
      if (isController) {
        result.statistics.controllerModules++;
        const routeMetadata = MetadataManager.getRouteMetadata(constructor);

        if (hasRoutes && constructor && fastify) {
          // 🚀 即时路由注册：发现控制器后立即注册路由
          try {
            await registerControllerRoutesImmediate(
              fastify,
              name,
              instance,
              routeMetadata,
              debugEnabled
            );

            const routeMethods = routeMetadata.map(
              (route) => route.propertyKey
            );

            // 保留配置信息用于统计和向后兼容
            result.routeConfigs.push({
              controllerName: name,
              controllerInstance: instance,
              controllerConstructor: constructor,
              routeMethods: routeMethods
            });

            immediateRegistrationStats.routesRegistered += routeMethods.length;

            if (debugEnabled) {
              const logger = getLogger();
              logger.debug(`✅ Routes immediately registered for: ${name}`, {
                routeCount: routeMethods.length
              });
            }
          } catch (error) {
            immediateRegistrationStats.routeErrors++;
            result.errors.push({
              moduleName: name,
              error: `Route registration failed: ${error instanceof Error ? error.message : String(error)}`
            });

            if (debugEnabled) {
              const logger = getLogger();
              logger.error(`❌ Failed to register routes for: ${name}`, error);
            }
          }
        } else if (hasRoutes && constructor) {
          // 如果没有 fastify 实例，保留原有的配置收集逻辑
          const routeMethods = routeMetadata.map((route) => route.propertyKey);
          result.routeConfigs.push({
            controllerName: name,
            controllerInstance: instance,
            controllerConstructor: constructor,
            routeMethods: routeMethods
          });

          if (debugEnabled) {
            const logger = getLogger();
            logger.debug(`🛣️ Route config prepared for: ${name}`, {
              routeCount: routeMethods.length
            });
          }
        }
      }

      // 立即处理执行器模块
      if (isExecutor) {
        result.statistics.executorModules++;
        // 🚀 即时执行器注册：发现执行器后立即注册
        const executorMetadata =
          MetadataManager.getExecutorMetadata(constructor);
        if (constructor && fastify) {
          try {
            await registerExecutorImmediate(
              rootContainer,
              name,
              instance,
              executorMetadata,
              debugEnabled
            );

            // 保留配置信息用于统计和向后兼容
            result.executorConfigs.push({
              name: executorMetadata?.name || name,
              instance,
              metadata: executorMetadata
            });

            immediateRegistrationStats.executorsRegistered++;

            if (debugEnabled) {
              const logger = getLogger();
              logger.debug(`✅ Executor immediately registered: ${name}`, {
                executorName: executorMetadata?.name || name
              });
            }
          } catch (error) {
            immediateRegistrationStats.executorErrors++;
            result.errors.push({
              moduleName: name,
              error: `Executor registration failed: ${error instanceof Error ? error.message : String(error)}`
            });

            if (debugEnabled) {
              const logger = getLogger();
              logger.error(`❌ Failed to register executor: ${name}`, error);
            }
          }
        } else {
          result.executorConfigs.push({
            name: executorMetadata?.name || name,
            instance,
            metadata: executorMetadata
          });

          if (debugEnabled) {
            const logger = getLogger();
            logger.debug(`⚙️ Executor config prepared for: ${name}`, {
              executorName: executorMetadata?.name || name
            });
          }
        }
      }

      // 立即处理生命周期模块
      if (lifecycleInfo.hasLifecycleMethods) {
        result.statistics.lifecycleModules++;

        // 如果提供了生命周期管理器，立即注册
        if (lifecycleManager) {
          lifecycleManager.scanAndRegisterService(name, instance);
        }

        result.lifecycleConfigs.push({
          serviceName: name,
          serviceInstance: instance,
          lifecycleMethods: lifecycleInfo.lifecycleMethods
        });

        if (debugEnabled) {
          const logger = getLogger();
          logger.debug(`🔄 Lifecycle config prepared for: ${name}`, {
            methods: lifecycleInfo.lifecycleMethods
          });
        }
      }
    } catch (error) {
      result.errors.push({
        moduleName: name,
        error: error instanceof Error ? error.message : String(error)
      });

      if (debugEnabled) {
        const logger = getLogger();
        logger.warn(`⚠️ Failed to process module: ${name}`, error);
      }
    }
  }

  const processingTime = Date.now() - startTime;

  if (debugEnabled) {
    const logger = getLogger();
    logger.info(
      '✅ Unified module processing with immediate registration completed',
      {
        ...result.statistics,
        processingTimeMs: processingTime,
        routeConfigs: result.routeConfigs.length,
        executorConfigs: result.executorConfigs.length,
        lifecycleConfigs: result.lifecycleConfigs.length,
        errors: result.errors.length,
        immediateRegistration: {
          routesRegistered: immediateRegistrationStats.routesRegistered,
          executorsRegistered: immediateRegistrationStats.executorsRegistered,
          routeErrors: immediateRegistrationStats.routeErrors,
          executorErrors: immediateRegistrationStats.executorErrors
        }
      }
    );
  }

  return result;
}
