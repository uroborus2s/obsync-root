/**
 * @fastify/http-proxy 类型定义增强
 * 解决类型兼容性问题的更安全方案
 */

import type { FastifyPluginAsync } from '@stratix/core';

/**
 * HTTP代理选项接口
 */
export interface HttpProxyOptions {
  upstream: string | (() => string);
  prefix?: string;
  rewritePrefix?: string;
  http2?: boolean;
  websocket?: boolean;
  preHandler?: any[];
  timeout?: number;
  retries?: number;
  httpMethods?: string[];
  internalRewriteLocationHeader?: boolean;
  replyOptions?: {
    rewriteRequestHeaders?: (
      originalReq: any,
      headers: Record<string, string>
    ) => Record<string, string>;
    onResponse?: (request: any, reply: any, res: any) => void;
    onError?: (reply: any, error: Error) => void;
  };
  undici?: {
    connections?: number;
    pipelining?: number;
    keepAliveTimeout?: number;
    keepAliveMaxTimeout?: number;
  };
}

/**
 * 类型安全的代理插件注册函数
 */
export type SafeHttpProxyPlugin = FastifyPluginAsync<HttpProxyOptions>;

/**
 * 代理配置验证器
 */
export function validateProxyOptions(options: HttpProxyOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!options.upstream) {
    errors.push('upstream is required');
  }

  if (options.timeout && options.timeout < 0) {
    errors.push('timeout must be positive');
  }

  if (options.retries && options.retries < 0) {
    errors.push('retries must be positive');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 代理选项构建器
 */
export class ProxyOptionsBuilder {
  private options: Partial<HttpProxyOptions> = {};

  upstream(url: string | (() => string)): this {
    this.options.upstream = url;
    return this;
  }

  prefix(path: string): this {
    this.options.prefix = path;
    return this;
  }

  rewritePrefix(path: string): this {
    this.options.rewritePrefix = path;
    return this;
  }

  timeout(ms: number): this {
    this.options.timeout = ms;
    return this;
  }

  retries(count: number): this {
    this.options.retries = count;
    return this;
  }

  websocket(enabled: boolean = true): this {
    this.options.websocket = enabled;
    return this;
  }

  preHandler(handlers: any[]): this {
    this.options.preHandler = handlers;
    return this;
  }

  replyOptions(options: HttpProxyOptions['replyOptions']): this {
    this.options.replyOptions = options;
    return this;
  }

  undici(config: HttpProxyOptions['undici']): this {
    this.options.undici = config;
    return this;
  }

  build(): HttpProxyOptions {
    if (!this.options.upstream) {
      throw new Error('upstream is required');
    }
    return this.options as HttpProxyOptions;
  }
}

/**
 * 使用示例：
 *
 * const proxyOptions = new ProxyOptionsBuilder()
 *   .upstream('http://localhost:3001')
 *   .prefix('/api/tasks')
 *   .rewritePrefix('/api/tasks')
 *   .timeout(30000)
 *   .websocket(true)
 *   .build();
 *
 * await createProxyRegistration(fastify, httpProxy, proxyOptions);
 */
