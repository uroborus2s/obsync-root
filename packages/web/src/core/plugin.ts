/**
 * Web插件注册和集成
 */

import fastify, { FastifyServerOptions } from 'fastify';
import { HooksManager } from '../hooks/manager.js';
import { MiddlewareManager } from '../middleware/middleware.js';
import { registerHelmet } from '../plugins/helmet.js';
import { registerIntegrations } from '../plugins/integrations.js';
import { PluginManager } from '../plugins/manager.js';
import { Router } from '../router/router.js';
import { SchemaManager } from '../schema/validator.js';
import {
  HttpMethod,
  Middleware,
  RouteHandler,
  RouteOptions,
  WebPluginOptions
} from '../types/options.js';
import { Server } from './server.js';

/**
 * 创建Fastify服务器选项
 * @param options Web插件配置选项
 */
function createFastifyOptions(options: WebPluginOptions): FastifyServerOptions {
  const serverOptions = options.server || {};

  // 创建基本配置
  const fastifyOptions: FastifyServerOptions = {
    logger: serverOptions.logger,
    ignoreTrailingSlash: serverOptions.ignoreTrailingSlash,
    caseSensitive: serverOptions.caseSensitive
  };

  // 如果配置了https，则添加https选项
  if (serverOptions.https) {
    // 使用类型断言，因为FastifyServerOptions类型定义可能不完整
    (fastifyOptions as any).https = serverOptions.https;
  }

  return fastifyOptions;
}

/**
 * 注册路由配置
 * @param router 路由管理器
 * @param routes 路由配置
 */
function registerRoutesFromConfig(router: Router, routes: any) {
  const prefix = routes.prefix || '';
  const definitions = routes.definitions || {};

  // 处理每个路由定义
  for (const [path, routeDef] of Object.entries(definitions)) {
    // 确保路径格式正确
    const routePath = prefix + (path.startsWith('/') ? path : `/${path}`);

    // 遍历所有HTTP方法和处理函数
    for (const [method, handler] of Object.entries(
      routeDef as Record<string, any>
    )) {
      // 忽略非HTTP方法的属性
      if (method === 'children' || method.startsWith('_')) {
        continue;
      }

      // 处理HTTP方法，转换为大写
      const httpMethod = method.toUpperCase() as HttpMethod;

      // 处理不同类型的处理函数定义
      if (typeof handler === 'function') {
        // 直接使用函数作为处理函数
        router.register(httpMethod, routePath, handler as RouteHandler);
      } else if (typeof handler === 'object') {
        // 使用对象配置
        const { handler: routeHandler, schema, middleware } = handler as any;

        // 确保有处理函数
        if (routeHandler) {
          router.register(httpMethod, routePath, routeHandler as RouteHandler, {
            schema
          });
        }
      }
    }
  }
}

/**
 * 注册中间件配置
 * @param middlewareManager 中间件管理器
 * @param middleware 中间件配置
 * @param middlewares 中间件实现
 */
function registerMiddlewareFromConfig(
  middlewareManager: MiddlewareManager,
  middleware: any,
  middlewares: Record<string, Middleware> = {}
) {
  // 注册全局中间件
  if (middleware.global) {
    for (const mw of middleware.global) {
      if (typeof mw === 'function') {
        middlewareManager.use(mw);
      } else if (typeof mw === 'string' && middlewares[mw]) {
        middlewareManager.use(middlewares[mw]);
      }
    }
  }

  // 注册路由级中间件
  if (middleware.route) {
    for (const [path, routeMws] of Object.entries(middleware.route)) {
      for (const mw of routeMws as any[]) {
        if (typeof mw === 'function') {
          middlewareManager.forRoute(path, mw);
        } else if (typeof mw === 'string' && middlewares[mw]) {
          middlewareManager.forRoute(path, middlewares[mw]);
        }
      }
    }
  }
}

/**
 * Web插件注册函数
 * @param app Stratix应用实例
 * @param options 插件配置选项
 */
export async function register(
  app: any,
  options: WebPluginOptions = {}
): Promise<void> {
  // 创建Fastify实例
  const fastifyInstance = app.hasDecoration('fastify')
    ? app.fastify
    : fastify(createFastifyOptions(options));

  // 创建服务器
  const server = new Server(fastifyInstance, options.server);

  // 创建路由管理器
  const router = new Router(fastifyInstance);

  // 创建中间件管理器
  const middleware = new MiddlewareManager(fastifyInstance);

  // 创建钩子管理器
  const hooks = new HooksManager(fastifyInstance);

  // 创建Schema管理器
  const schema = new SchemaManager(fastifyInstance);

  // 创建插件管理器
  const plugins = new PluginManager(fastifyInstance);

  // 注册Helmet安全插件（默认启用）
  await registerHelmet(fastifyInstance, options.helmet);

  // 注册基础集成插件（CORS、Compression、Swagger等）
  await registerIntegrations(fastifyInstance, options);

  // 注册Fastify插件
  if (options.plugins && options.plugins.length > 0) {
    await plugins.registerAll(options.plugins);
  }

  // 注册路由配置
  if (options.routes) {
    registerRoutesFromConfig(router, options.routes);
  }

  // 注册中间件配置
  if (options.middleware) {
    registerMiddlewareFromConfig(
      middleware,
      options.middleware,
      options.middlewares
    );
  }

  // 注册错误处理器
  if (options.errorHandler) {
    fastifyInstance.setErrorHandler(options.errorHandler);
  }

  // 注册健康检查
  if (options.healthCheck) {
    const { path = '/health', handler } = options.healthCheck;
    router.get(path, async (ctx) => {
      if (handler) {
        return await handler(ctx.request);
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
    });
  }

  // 向应用实例添加装饰器
  app.decorate('web', {
    server,
    router,
    middleware,
    hooks,
    schema,
    plugins,
    /**
     * 添加路由
     */
    addRoute: (
      method: HttpMethod,
      path: string,
      handler: RouteHandler,
      options?: RouteOptions
    ) => {
      router.register(method, path, handler, options);
    },
    /**
     * 添加中间件
     */
    addMiddleware: (middlewareFn: Middleware) => {
      middleware.use(middlewareFn);
    },
    /**
     * 添加Schema
     */
    addSchema: (id: string, schemaObj: any) => {
      schema.add(id, schemaObj);
    },
    /**
     * 创建Schema引用
     */
    ref: (id: string) => {
      return schema.ref(id);
    }
  });

  // 注册启动和关闭钩子
  app.hook('beforeStart', async () => {
    await server.start();
  });

  app.hook('beforeClose', async () => {
    await server.stop();
  });
}
