// @stratix/core 控制器注册模块
// 负责扫描控制器并注册路由到Fastify

import type { AwilixContainer } from 'awilix';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { MetadataManager } from '../decorators/metadata.js';

/**
 * 路由配置接口
 */
export interface RouteConfig {
  enabled?: boolean;
  prefix?: string;
  validation?: boolean;
}

/**
 * 控制器信息接口
 */
interface ControllerInfo {
  name: string;
  constructor: new (...args: any[]) => any;
  instance: any;
  hasRoutes: boolean;
}

/**
 * 路由处理器缓存
 * 全局缓存，避免重复创建处理器
 */
const routeHandlerCache = new Map<
  string,
  (request: FastifyRequest, reply: FastifyReply) => Promise<any>
>();

/**
 * 路由冲突检测器
 */
class RouteRegistry {
  private routes = new Set<string>();

  register(method: string, path: string): void {
    const routeKey = `${method.toUpperCase()}:${path}`;

    if (this.routes.has(routeKey)) {
      throw new Error(`Route conflict: ${routeKey} already exists`);
    }

    this.routes.add(routeKey);
  }
}

/**
 * 发现并验证控制器
 * 优化：直接从容器注册信息中获取类构造函数，避免不必要的实例化
 */
function discoverControllers(container: AwilixContainer): ControllerInfo[] {
  const controllers: ControllerInfo[] = [];

  // 遍历容器注册信息
  for (const [name, registration] of Object.entries(container.registrations)) {
    try {
      // 检查是否为有效的注册
      if (!registration || typeof registration.resolve !== 'function') {
        continue;
      }

      const instance = container.resolve(name);
      // 检查是否为类注册（asClass）
      if (
        instance &&
        instance.constructor &&
        typeof instance.constructor === 'function'
      ) {
        // 获取原始类构造函数
        const ConstructorClass = instance.constructor as new (
          ...args: any[]
        ) => any;

        // 检查是否为控制器类
        if (MetadataManager.isController(ConstructorClass)) {
          const hasRoutes = MetadataManager.hasRoutes(ConstructorClass);

          controllers.push({
            name,
            constructor: ConstructorClass,
            instance,
            hasRoutes
          });
        }
      }
    } catch (error) {
      // 记录警告但继续处理其他注册
      console.warn(
        `Failed to check controller registration for ${name}:`,
        error
      );
      continue;
    }
  }

  return controllers;
}

/**
 * 创建优化的路由处理器
 * 优化：使用全局缓存，改进类型安全性，要求预解析的控制器实例
 */
function createOptimizedRouteHandler(
  controllerName: string,
  methodName: string,
  controllerInstance: any
): (request: FastifyRequest, reply: FastifyReply) => Promise<any> {
  const cacheKey = `${controllerName}.${methodName}`;

  // 检查缓存
  if (routeHandlerCache.has(cacheKey)) {
    return routeHandlerCache.get(cacheKey)!;
  }

  const handler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    try {
      // 验证控制器实例存在
      if (!controllerInstance) {
        throw new Error(
          `Controller instance not provided for ${controllerName}. ` +
            `Pre-resolved controller instances are required for optimal performance.`
        );
      }

      // 验证方法存在
      if (typeof controllerInstance[methodName] !== 'function') {
        throw new Error(
          `Method ${methodName} not found on controller ${controllerName}`
        );
      }

      // 绑定方法并调用
      const boundMethod =
        controllerInstance[methodName].bind(controllerInstance);
      return await boundMethod(request, reply);
    } catch (error) {
      // 增强错误信息
      const enhancedError = new Error(
        `Error in controller ${controllerName}.${methodName}: ${error instanceof Error ? error.message : String(error)}`
      );
      enhancedError.cause = error;
      throw enhancedError;
    }
  };

  // 缓存处理器
  routeHandlerCache.set(cacheKey, handler);
  return handler;
}

/**
 * 注册单个控制器的路由
 * 优化：改进错误处理和类型安全性
 */
async function registerSingleControllerRoutes(
  fastify: FastifyInstance,
  controllerInfo: ControllerInfo,
  routeConfig?: RouteConfig,
  routeRegistry?: RouteRegistry
): Promise<void> {
  // 检查路由是否启用
  if (routeConfig?.enabled === false) {
    return;
  }

  // 如果控制器没有路由，直接返回
  if (!controllerInfo.hasRoutes) {
    fastify.log.debug(
      `Controller ${controllerInfo.name} has no routes, skipping`
    );
    return;
  }

  // 获取路由元数据
  const routeMetadataList = MetadataManager.getRouteMetadata(
    controllerInfo.constructor
  );

  if (!routeMetadataList || routeMetadataList.length === 0) {
    fastify.log.warn(
      `Controller ${controllerInfo.name} marked as having routes but no route metadata found`
    );
    return;
  }

  let registeredRoutes = 0;

  // 注册每个路由方法
  for (const routeMetadata of routeMetadataList) {
    if (!routeMetadata) {
      continue;
    }

    try {
      // 验证路由元数据
      if (
        !routeMetadata.path ||
        !routeMetadata.method ||
        !routeMetadata.propertyKey
      ) {
        fastify.log.warn(
          `Invalid route metadata for controller ${controllerInfo.name}:`,
          routeMetadata
        );
        continue;
      }

      // 直接使用路由路径，前缀由 Fastify 原生机制处理
      const routePath = routeMetadata.path;
      const method = routeMetadata.method.toLowerCase();

      // 路由冲突检测
      if (routeRegistry) {
        try {
          routeRegistry.register(method, routePath);
        } catch (error) {
          fastify.log.warn(
            `Route conflict detected: ${method.toUpperCase()} ${routePath} in controller ${controllerInfo.name}`
          );
          continue;
        }
      }

      // 创建优化的路由处理器，传递预解析的控制器实例
      const handler = createOptimizedRouteHandler(
        controllerInfo.name,
        routeMetadata.propertyKey,
        controllerInfo.instance
      );

      // 构建路由选项
      const routeOptions: any = {
        method: method.toUpperCase(),
        url: routePath,
        handler,
        ...routeMetadata.options
      };

      // 如果配置了验证，可以在这里添加验证逻辑
      if (routeConfig?.validation) {
        // 这里可以添加验证相关的配置
        // routeOptions.schema = ...
      }

      // 注册路由到 Fastify
      fastify.route(routeOptions);
      registeredRoutes++;

      fastify.log.debug(
        `✅ Registered route: ${method.toUpperCase()} ${routePath} -> ${controllerInfo.name}.${routeMetadata.propertyKey}`
      );
    } catch (error) {
      fastify.log.error(
        `Failed to register route ${routeMetadata.method} ${routeMetadata.path} for controller ${controllerInfo.name}:`,
        error
      );
      // 继续处理其他路由
    }
  }

  fastify.log.info(
    `Controller ${controllerInfo.name}: registered ${registeredRoutes} routes`
  );
}

/**
 * 优化的控制器路由注册
 * 使用 Fastify 原生 Route Prefixing 特性
 */
export async function registerControllerRoutes(
  fastify: FastifyInstance,
  container: AwilixContainer,
  routeConfig?: RouteConfig
): Promise<void> {
  // 检查路由是否启用
  if (routeConfig?.enabled === false) {
    fastify.log.info('Controller routes are disabled');
    return;
  }

  const routeRegistry = new RouteRegistry();

  // 使用优化的控制器发现机制
  const controllers = discoverControllers(container);

  if (controllers.length === 0) {
    fastify.log.info('No controllers found in container');
    return;
  }

  fastify.log.info(`Discovered ${controllers.length} controllers`);

  // 如果配置了路由前缀，使用 Fastify 原生前缀机制
  if (routeConfig?.prefix) {
    await fastify.register(
      async (subFastify) => {
        // 在子上下文中注册路由，自动获得前缀
        for (const controllerInfo of controllers) {
          try {
            await registerSingleControllerRoutes(
              subFastify,
              controllerInfo,
              {
                enabled: routeConfig.enabled,
                validation: routeConfig.validation
              },
              routeRegistry
            );
          } catch (error) {
            subFastify.log.error(
              `Failed to register routes for controller ${controllerInfo.name}:`,
              error
            );
            // 继续处理其他控制器，不中断整个过程
          }
        }
      },
      { prefix: routeConfig.prefix }
    );

    fastify.log.info(
      `Controller routes registered with prefix: ${routeConfig.prefix}`
    );
  } else {
    // 无前缀直接注册
    for (const controllerInfo of controllers) {
      try {
        await registerSingleControllerRoutes(
          fastify,
          controllerInfo,
          routeConfig,
          routeRegistry
        );
      } catch (error) {
        fastify.log.error(
          `Failed to register routes for controller ${controllerInfo.name}:`,
          error
        );
        // 继续处理其他控制器，不中断整个过程
      }
    }
  }
}
