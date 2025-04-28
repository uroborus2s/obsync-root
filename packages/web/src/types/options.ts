/**
 * @stratix/web 插件配置选项类型定义
 */

import { FastifyPluginOptions } from 'fastify';
import { JSONSchema } from 'json-schema-to-ts';

/**
 * HTTP方法类型
 */
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS';

/**
 * 服务器配置选项
 */
export interface ServerOptions {
  port?: number; // 服务器端口，默认3000
  host?: string; // 主机地址，默认'localhost'
  logger?: boolean | Record<string, any>; // 日志配置
  https?: {
    // HTTPS配置
    key: string | Buffer;
    cert: string | Buffer;
    [key: string]: any;
  };
  watch?: boolean; // 文件监视（开发模式）
  ignoreTrailingSlash?: boolean; // 忽略路径末尾斜杠
  caseSensitive?: boolean; // 路由大小写敏感
}

/**
 * Schema验证选项
 */
export interface SchemaOptions {
  body?: JSONSchema; // 请求体验证
  querystring?: JSONSchema; // 查询参数验证
  params?: JSONSchema; // 路径参数验证
  headers?: JSONSchema; // 请求头验证
  response?: {
    // 响应验证
    [statusCode: number]: JSONSchema;
  };
}

/**
 * 路由选项
 */
export interface RouteOptions {
  schema?: SchemaOptions; // 请求验证Schema
}

/**
 * 中间件函数类型
 */
export type Middleware = (
  ctx: RouteContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * 中间件列表类型
 */
export type MiddlewareList = Array<string | Middleware>;

/**
 * 路由中间件映射
 */
export interface RouteMiddlewareMap {
  [path: string]: MiddlewareList;
}

/**
 * 中间件配置
 */
export interface MiddlewareOptions {
  global?: MiddlewareList; // 全局中间件
  route?: RouteMiddlewareMap; // 路由中间件
}

/**
 * 静态文件服务配置
 */
export interface StaticOptions {
  root: string; // 静态文件根目录
  prefix?: string; // URL前缀
  index?: string[]; // 索引文件
  decorateReply?: boolean; // 装饰响应对象
  cacheControl?: boolean | string; // 缓存控制
  immutable?: boolean; // 不可变标志
  maxAge?: number; // 最大缓存时间
  lastModified?: boolean; // 最后修改时间
  etag?: boolean; // ETag支持
}

/**
 * Fastify插件配置
 */
export interface PluginConfig {
  name: string; // 插件名称
  options?: FastifyPluginOptions; // 插件配置
  enabled?: boolean; // 是否启用
}

/**
 * 健康检查处理函数
 */
export type HealthCheckHandler = (request: any) => Promise<any> | any;

/**
 * WebSocket处理函数
 */
export type WebSocketHandler = (connection: any, request: any) => void;

/**
 * WebSocket配置
 */
export interface WebSocketOptions {
  path?: string; // WebSocket路径
  options?: Record<string, any>; // WebSocket服务器选项
  handler: WebSocketHandler; // WebSocket处理函数
}

/**
 * 路由处理函数
 */
export type RouteHandler = (ctx: RouteContext) => Promise<any> | any;

/**
 * 错误处理函数
 */
export type ErrorHandler = (error: Error, request: any, reply: any) => void;

/**
 * 路由定义
 */
export interface RouteDefinition {
  handler: RouteHandler | string; // 处理函数或路径引用
  schema?: SchemaOptions; // Schema验证
  middleware?: MiddlewareList; // 路由中间件
}

/**
 * 路由配置定义
 */
export interface RouteConfig {
  [path: string]: {
    [method: string]: RouteHandler | RouteDefinition | Record<string, any>;
  };
}

/**
 * 路由上下文
 */
export interface RouteContext {
  request: any; // 请求对象
  reply: any; // 响应对象
  server: any; // 服务器实例
  app?: any; // 应用实例
}

/**
 * Helmet配置选项
 */
export interface HelmetPluginOptions {
  enabled?: boolean; // 是否启用Helmet，默认为true
  options?: Record<string, any>; // Helmet详细配置选项
}

/**
 * Swagger配置选项
 */
export interface SwaggerOptions {
  routePrefix?: string; // 路由前缀
  swagger?: Record<string, any>; // Swagger文档配置
  exposeRoute?: boolean; // 是否暴露路由
  ui?: Record<string, any>; // UI配置
  [key: string]: any; // 其他选项
}

/**
 * Web插件配置选项
 */
export interface WebPluginOptions {
  // 服务器配置
  server?: ServerOptions;

  // 路由配置
  routes?: {
    prefix?: string; // 全局路由前缀
    definitions?: RouteConfig; // 路由定义
  };

  // 中间件配置
  middleware?: MiddlewareOptions;

  // 中间件实现
  middlewares?: {
    [name: string]: Middleware;
  };

  // Fastify插件
  plugins?: Array<string | PluginConfig>;

  // 静态文件服务
  static?: StaticOptions | StaticOptions[];

  // 错误处理
  errorHandler?: ErrorHandler;

  // 健康检查
  healthCheck?: {
    path?: string;
    handler?: HealthCheckHandler;
  };

  // WebSocket支持
  websocket?: boolean | WebSocketOptions;

  // Helmet安全配置
  helmet?: boolean | HelmetPluginOptions;

  // CORS配置，若为true则使用默认配置，false禁用
  cors?: boolean | Record<string, any>;

  // 压缩配置，若为true则使用默认配置，false禁用
  compression?: boolean | Record<string, any>;

  // Swagger API文档，若为true则使用默认配置，false禁用
  swagger?: boolean | SwaggerOptions;
}
