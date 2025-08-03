/**
 * 代理服务
 * 负责HTTP请求的代理转发，使用@fastify/http-proxy实现
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Logger } from '@stratix/core';
import type { ProxyRouteConfig, GatewayConfig } from '../types/auth.js';

export interface IProxyService {
  /**
   * 注册代理路由
   */
  registerProxyRoutes(fastify: FastifyInstance): Promise<void>;

  /**
   * 处理代理请求
   */
  handleProxyRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    config: ProxyRouteConfig
  ): Promise<void>;
}

export default class ProxyService implements IProxyService {
  constructor(
    private gatewayConfig: GatewayConfig,
    private logger: Logger
  ) {}

  /**
   * 注册代理路由
   */
  async registerProxyRoutes(fastify: FastifyInstance): Promise<void> {
    try {
      // 注册@fastify/http-proxy插件
      await fastify.register(require('@fastify/http-proxy'), {
        // 全局代理配置
        upstream: '', // 将在每个路由中动态设置
        prefix: '', // 不使用全局前缀
        http2: false,
        undici: true // 使用undici作为HTTP客户端
      });

      // 注册每个代理路由
      for (const routeConfig of this.gatewayConfig.routes) {
        if (!routeConfig.enabled) {
          this.logger.info(`Skipping disabled route: ${routeConfig.path}`);
          continue;
        }

        await this.registerSingleProxyRoute(fastify, routeConfig);
      }

      this.logger.info(`Registered ${this.gatewayConfig.routes.length} proxy routes`);
    } catch (error) {
      this.logger.error('Failed to register proxy routes:', error);
      throw error;
    }
  }

  /**
   * 注册单个代理路由
   */
  private async registerSingleProxyRoute(
    fastify: FastifyInstance,
    config: ProxyRouteConfig
  ): Promise<void> {
    try {
      // 为每个路由注册独立的代理
      await fastify.register(async (fastifyInstance) => {
        await fastifyInstance.register(require('@fastify/http-proxy'), {
          upstream: config.target,
          prefix: config.path,
          http2: false,
          undici: true,
          
          // 代理选项
          replyOptions: {
            rewriteRequestHeaders: (originalReq, headers) => {
              // 保持原始headers，添加代理相关信息
              return {
                ...headers,
                'x-forwarded-for': originalReq.ip,
                'x-forwarded-proto': originalReq.protocol,
                'x-forwarded-host': originalReq.hostname,
                'x-gateway-version': '1.0.0'
              };
            },
            
            onResponse: (request, reply, res) => {
              // 记录代理响应
              this.logger.debug('Proxy response received', {
                path: request.url,
                target: config.target,
                statusCode: res.statusCode,
                responseTime: Date.now() - (request as any).startTime
              });
            },

            onError: (reply, error) => {
              // 处理代理错误
              this.logger.error('Proxy error occurred:', {
                error: error.message,
                target: config.target
              });

              return reply.code(502).send({
                success: false,
                error: 'PROXY_ERROR',
                message: '代理服务错误',
                target: config.target
              });
            }
          },

          // 请求选项
          httpMethods: config.methods,
          
          // 超时配置
          timeout: config.timeout || 30000,
          
          // 重试配置
          retries: config.retries || 0,

          // 预处理请求
          preHandler: async (request, reply) => {
            // 记录请求开始时间
            (request as any).startTime = Date.now();
            
            // 应用中间件
            if (config.middleware && config.middleware.length > 0) {
              await this.applyMiddleware(request, reply, config.middleware);
            }

            this.logger.debug('Proxying request', {
              method: request.method,
              path: request.url,
              target: config.target,
              userAgent: request.headers['user-agent']
            });
          }
        });
      });

      this.logger.info(`Registered proxy route: ${config.path} -> ${config.target}`);
    } catch (error) {
      this.logger.error(`Failed to register proxy route ${config.path}:`, error);
      throw error;
    }
  }

  /**
   * 应用中间件
   */
  private async applyMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
    middlewareList: string[]
  ): Promise<void> {
    for (const middlewareName of middlewareList) {
      try {
        switch (middlewareName) {
          case 'auth':
            // 认证中间件已在全局应用
            break;
          case 'rateLimit':
            // 限流中间件处理
            await this.applyRateLimit(request, reply);
            break;
          case 'audit':
            // 审计中间件处理
            await this.applyAudit(request, reply);
            break;
          default:
            this.logger.warn(`Unknown middleware: ${middlewareName}`);
        }
      } catch (error) {
        this.logger.error(`Middleware ${middlewareName} failed:`, error);
        throw error;
      }
    }
  }

  /**
   * 应用限流中间件
   */
  private async applyRateLimit(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // 这里可以实现自定义限流逻辑
    // 或者依赖@fastify/rate-limit插件
    this.logger.debug('Rate limit middleware applied');
  }

  /**
   * 应用审计中间件
   */
  private async applyAudit(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // 记录审计日志
    this.logger.info('Audit log', {
      method: request.method,
      path: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      user: (request as any).user?.userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理代理请求（手动代理模式）
   */
  async handleProxyRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    config: ProxyRouteConfig
  ): Promise<void> {
    try {
      const startTime = Date.now();
      
      // 构建目标URL
      const targetUrl = new URL(request.url, config.target);
      
      // 准备请求选项
      const requestOptions = {
        method: request.method,
        headers: {
          ...request.headers,
          'x-forwarded-for': request.ip,
          'x-forwarded-proto': request.protocol,
          'x-forwarded-host': request.hostname,
          'x-gateway-version': '1.0.0'
        },
        body: request.body,
        timeout: config.timeout || 30000
      };

      // 发送代理请求
      const response = await fetch(targetUrl.toString(), requestOptions);
      
      // 转发响应
      const responseBody = await response.text();
      const responseTime = Date.now() - startTime;

      // 记录响应日志
      this.logger.debug('Manual proxy response', {
        path: request.url,
        target: config.target,
        statusCode: response.status,
        responseTime
      });

      // 设置响应头
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      // 发送响应
      reply.code(response.status).send(responseBody);

    } catch (error) {
      this.logger.error('Manual proxy request failed:', error);
      
      reply.code(502).send({
        success: false,
        error: 'PROXY_ERROR',
        message: '代理请求失败',
        target: config.target
      });
    }
  }

  /**
   * 获取路由配置
   */
  getRouteConfig(path: string): ProxyRouteConfig | undefined {
    return this.gatewayConfig.routes.find(route => {
      if (route.path.endsWith('*')) {
        const prefix = route.path.slice(0, -1);
        return path.startsWith(prefix);
      }
      return path === route.path;
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; routes: number; message?: string }> {
    try {
      const enabledRoutes = this.gatewayConfig.routes.filter(route => route.enabled !== false);
      
      return {
        healthy: true,
        routes: enabledRoutes.length,
        message: `${enabledRoutes.length} proxy routes configured`
      };
    } catch (error) {
      return {
        healthy: false,
        routes: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
