/**
 * Router类 - 管理路由注册和请求分发
 */

import { FastifyInstance, RouteOptions as FastifyRouteOptions } from 'fastify';
import {
  HttpMethod,
  RouteContext,
  RouteHandler,
  RouteOptions
} from '../types/options.js';

/**
 * 路由管理器类
 */
export class Router {
  private fastify: FastifyInstance;
  private prefix: string = '';

  /**
   * 构造函数
   * @param fastify Fastify实例
   * @param prefix 路由前缀
   */
  constructor(fastify: FastifyInstance, prefix: string = '') {
    this.fastify = fastify;
    this.prefix = prefix;
  }

  /**
   * 创建路由上下文
   */
  private createContext(request: any, reply: any): RouteContext {
    return {
      request,
      reply,
      server: this.fastify
    };
  }

  /**
   * 转换处理函数
   */
  private transformHandler(
    handler: RouteHandler
  ): (request: any, reply: any) => Promise<any> {
    return async (request, reply) => {
      const ctx = this.createContext(request, reply);
      return await handler(ctx);
    };
  }

  /**
   * 转换路由选项
   */
  private transformOptions(
    options?: RouteOptions
  ): Omit<FastifyRouteOptions, 'method' | 'url' | 'handler'> {
    return {
      schema: options?.schema
    };
  }

  /**
   * 获取完整路径
   */
  private getFullPath(path: string): string {
    // 确保路径以/开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    // 如果有前缀，拼接前缀和路径
    return this.prefix ? `${this.prefix}${normalizedPath}` : normalizedPath;
  }

  /**
   * 注册路由
   * @param method HTTP方法
   * @param path 路由路径
   * @param handler 处理函数
   * @param options 路由选项
   */
  public register(
    method: HttpMethod | HttpMethod[],
    path: string,
    handler: RouteHandler,
    options?: RouteOptions
  ): void {
    const fullPath = this.getFullPath(path);
    const transformedHandler = this.transformHandler(handler);
    const routeOptions = this.transformOptions(options);

    // 处理多个HTTP方法
    if (Array.isArray(method)) {
      method.forEach((m) => {
        this.fastify.route({
          method: m,
          url: fullPath,
          handler: transformedHandler,
          ...routeOptions
        });
      });
    } else {
      // 单个HTTP方法
      this.fastify.route({
        method,
        url: fullPath,
        handler: transformedHandler,
        ...routeOptions
      });
    }
  }

  /**
   * 路由分组
   * @param prefix 分组前缀
   * @param callback 分组回调函数
   */
  public group(prefix: string, callback: (router: Router) => void): void {
    // 创建带有新前缀的路由器
    const groupPrefix = this.prefix
      ? `${this.prefix}${prefix.startsWith('/') ? prefix : `/${prefix}`}`
      : prefix;

    const groupRouter = new Router(this.fastify, groupPrefix);
    callback(groupRouter);
  }

  /**
   * GET路由
   */
  public get(
    path: string,
    handler: RouteHandler,
    options?: RouteOptions
  ): void {
    this.register('GET', path, handler, options);
  }

  /**
   * POST路由
   */
  public post(
    path: string,
    handler: RouteHandler,
    options?: RouteOptions
  ): void {
    this.register('POST', path, handler, options);
  }

  /**
   * PUT路由
   */
  public put(
    path: string,
    handler: RouteHandler,
    options?: RouteOptions
  ): void {
    this.register('PUT', path, handler, options);
  }

  /**
   * DELETE路由
   */
  public delete(
    path: string,
    handler: RouteHandler,
    options?: RouteOptions
  ): void {
    this.register('DELETE', path, handler, options);
  }

  /**
   * PATCH路由
   */
  public patch(
    path: string,
    handler: RouteHandler,
    options?: RouteOptions
  ): void {
    this.register('PATCH', path, handler, options);
  }

  /**
   * HEAD路由
   */
  public head(
    path: string,
    handler: RouteHandler,
    options?: RouteOptions
  ): void {
    this.register('HEAD', path, handler, options);
  }

  /**
   * OPTIONS路由
   */
  public options(
    path: string,
    handler: RouteHandler,
    options?: RouteOptions
  ): void {
    this.register('OPTIONS', path, handler, options);
  }
}
