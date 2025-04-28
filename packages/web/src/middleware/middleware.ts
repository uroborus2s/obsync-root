/**
 * 中间件系统 - 管理请求处理管道
 */

import { FastifyInstance } from 'fastify';
import { Middleware, RouteContext } from '../types/options.js';

/**
 * 路径匹配辅助函数
 * 实现简单的路径模式匹配
 */
function matchPath(pattern: string, path: string): boolean {
  // 转换为通配符格式正则表达式
  const wildcardToRegex = (p: string): string => {
    let regexPattern = p
      .replace(/\//g, '\\/') // 转义斜杠
      .replace(/\./g, '\\.') // 转义点
      .replace(/\?/g, '\\?') // 转义问号
      .replace(/\*/g, '.*'); // 星号转为通配符

    // 确保全路径匹配
    if (!regexPattern.startsWith('^')) {
      regexPattern = '^' + regexPattern;
    }
    if (!regexPattern.endsWith('$')) {
      regexPattern = regexPattern + '$';
    }

    return regexPattern;
  };

  // 创建正则并测试
  try {
    const regex = new RegExp(wildcardToRegex(pattern));
    return regex.test(path);
  } catch (err) {
    console.error('Invalid path pattern:', pattern, err);
    return false;
  }
}

/**
 * 中间件管理器
 */
export class MiddlewareManager {
  private fastify: FastifyInstance;
  private globalMiddleware: Middleware[] = [];
  private routeMiddleware: Map<string, Middleware[]> = new Map();

  /**
   * 构造函数
   * @param fastify Fastify实例
   */
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * 添加全局中间件
   * @param middleware 中间件函数
   */
  public use(middleware: Middleware): void {
    this.globalMiddleware.push(middleware);

    // 注册到Fastify的onRequest钩子
    this.fastify.addHook('onRequest', async (request, reply) => {
      const ctx = this.createContext(request, reply);

      // 中间件中的next函数，这里是一个空操作，因为Fastify会继续处理请求
      const next = async () => {};

      await middleware(ctx, next);
    });
  }

  /**
   * 创建路由上下文
   * @param request 请求对象
   * @param reply 响应对象
   */
  private createContext(request: any, reply: any): RouteContext {
    return {
      request,
      reply,
      server: this.fastify
    };
  }

  /**
   * 为特定路由添加中间件
   * @param path 路由路径
   * @param middleware 中间件函数
   */
  public forRoute(path: string, middleware: Middleware): void {
    // 获取已存在的中间件数组，如果不存在则创建新数组
    let middlewares = this.routeMiddleware.get(path) || [];
    middlewares = [...middlewares, middleware];

    // 更新中间件映射
    this.routeMiddleware.set(path, middlewares);

    // 注册到Fastify的preHandler钩子
    this.fastify.addHook('preHandler', async (request, reply) => {
      const url = request.url;

      // 检查请求URL是否匹配路由模式
      if (matchPath(path, url)) {
        const ctx = this.createContext(request, reply);
        const next = async () => {};
        await middleware(ctx, next);
      }
    });
  }

  /**
   * 组合多个中间件为一个
   * @param middlewares 中间件数组
   */
  public compose(middlewares: Middleware[]): Middleware {
    return async (ctx: RouteContext, next: () => Promise<void>) => {
      // 创建执行中间件的函数
      const dispatch = async (index: number): Promise<void> => {
        if (index >= middlewares.length) {
          return await next();
        }

        const middleware = middlewares[index];
        return await middleware(ctx, () => dispatch(index + 1));
      };

      // 开始执行第一个中间件
      return await dispatch(0);
    };
  }

  /**
   * 获取所有全局中间件
   */
  public getGlobalMiddlewares(): Middleware[] {
    return [...this.globalMiddleware];
  }

  /**
   * 获取特定路由的中间件
   * @param path 路由路径
   */
  public getRouteMiddlewares(path: string): Middleware[] {
    const middlewares: Middleware[] = [];

    // 遍历所有路由中间件，检查是否匹配路径
    this.routeMiddleware.forEach((mwArray, pattern) => {
      if (matchPath(pattern, path)) {
        middlewares.push(...mwArray);
      }
    });

    return middlewares;
  }
}
