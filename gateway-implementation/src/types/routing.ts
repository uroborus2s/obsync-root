// 路由相关类型定义

import type { FastifyRequest } from 'fastify';

/**
 * 负载均衡策略
 */
export type LoadBalancingStrategy = 'round-robin' | 'least-connections' | 'random' | 'weighted';

/**
 * HTTP方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 路由配置接口
 */
export interface RouteConfig {
  /** 路由唯一标识 */
  id: string;
  
  /** 路由路径模式 */
  path: string;
  
  /** 支持的HTTP方法 */
  method?: HttpMethod | HttpMethod[];
  
  /** 目标服务地址（支持多个用于负载均衡） */
  target: string | string[];
  
  /** 路径重写规则 */
  rewrite?: Record<string, string>;
  
  /** 自定义请求头 */
  headers?: Record<string, string>;
  
  /** 请求超时时间（毫秒） */
  timeout?: number;
  
  /** 重试次数 */
  retries?: number;
  
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  
  /** 负载均衡配置 */
  loadBalancing?: LoadBalancingConfig;
  
  /** 认证配置 */
  auth?: AuthConfig;
  
  /** 限流配置 */
  rateLimit?: RateLimitConfig;
  
  /** 缓存配置 */
  cache?: CacheConfig;
  
  /** 安全配置 */
  security?: SecurityConfig;
  
  /** WebSocket配置 */
  websocket?: WebSocketConfig;
  
  /** 特殊配置 */
  special?: SpecialConfig;
  
  /** 是否启用此路由 */
  enabled?: boolean;
  
  /** 路由描述 */
  description?: string;
  
  /** 路由标签 */
  tags?: string[];
}

/**
 * 负载均衡配置
 */
export interface LoadBalancingConfig {
  /** 负载均衡策略 */
  strategy: LoadBalancingStrategy;
  
  /** 是否启用健康检查 */
  healthCheck?: boolean;
  
  /** 健康检查配置 */
  healthCheckConfig?: {
    /** 检查间隔（毫秒） */
    interval: number;
    /** 检查超时（毫秒） */
    timeout: number;
    /** 健康检查路径 */
    path: string;
    /** 期望的状态码 */
    expectedStatus?: number;
  };
  
  /** 权重配置（用于加权轮询） */
  weights?: Record<string, number>;
  
  /** 故障转移配置 */
  failover?: {
    /** 最大失败次数 */
    maxFailures: number;
    /** 恢复检查间隔 */
    recoveryInterval: number;
  };
}

/**
 * 认证配置
 */
export interface AuthConfig {
  /** 是否需要认证 */
  required: boolean;
  
  /** 需要的角色 */
  roles?: string[];
  
  /** 需要的权限 */
  permissions?: string[];
  
  /** 条件认证（基于HTTP方法） */
  conditionalAuth?: Record<string, {
    required: boolean;
    roles?: string[];
    permissions?: string[];
  }>;
  
  /** 自定义认证函数 */
  customAuth?: (request: FastifyRequest) => Promise<boolean>;
}

/**
 * 限流配置
 */
export interface RateLimitConfig {
  /** 最大请求数 */
  max: number;
  
  /** 时间窗口 */
  timeWindow: string;
  
  /** 自定义键生成器 */
  keyGenerator?: (request: FastifyRequest) => string;
  
  /** 错误时是否跳过限流 */
  skipOnError?: boolean;
  
  /** 是否跳过成功请求 */
  skipSuccessfulRequests?: boolean;
  
  /** 是否跳过失败请求 */
  skipFailedRequests?: boolean;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 是否启用缓存 */
  enabled: boolean;
  
  /** 缓存TTL（秒） */
  ttl?: number;
  
  /** 缓存的HTTP方法 */
  methods?: HttpMethod[];
  
  /** 缓存变化依据 */
  varyBy?: string[];
  
  /** 自定义缓存键生成器 */
  keyGenerator?: (request: FastifyRequest) => string;
  
  /** 缓存条件 */
  condition?: (request: FastifyRequest) => boolean;
}

/**
 * 安全配置
 */
export interface SecurityConfig {
  /** 是否要求HTTPS */
  requireHttps?: boolean;
  
  /** IP白名单 */
  ipWhitelist?: string[];
  
  /** IP黑名单 */
  ipBlacklist?: string[];
  
  /** 额外的安全头 */
  additionalHeaders?: Record<string, string>;
  
  /** CORS配置 */
  cors?: {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
}

/**
 * WebSocket配置
 */
export interface WebSocketConfig {
  /** 是否启用WebSocket代理 */
  enabled: boolean;
  
  /** WebSocket超时时间 */
  timeout?: number;
  
  /** Ping间隔 */
  pingInterval?: number;
  
  /** 最大消息大小 */
  maxMessageSize?: number;
}

/**
 * 特殊配置
 */
export interface SpecialConfig {
  /** 请求体大小限制 */
  bodyLimit?: number;
  
  /** 是否启用流式传输 */
  streaming?: boolean;
  
  /** 自定义中间件 */
  middleware?: Array<(request: FastifyRequest, reply: any) => Promise<void>>;
}

/**
 * 路由匹配结果
 */
export interface RouteMatch {
  /** 匹配的路由配置 */
  config: RouteConfig;
  
  /** 路径参数 */
  params: Record<string, string>;
  
  /** 查询参数 */
  query: Record<string, string>;
  
  /** 选中的目标服务 */
  selectedTarget: string;
}

/**
 * 代理请求选项
 */
export interface ProxyOptions {
  /** 目标URL */
  target: string;
  
  /** 请求头 */
  headers?: Record<string, string>;
  
  /** 超时时间 */
  timeout?: number;
  
  /** 重试次数 */
  retries?: number;
  
  /** 重试延迟 */
  retryDelay?: number;
  
  /** 是否跟随重定向 */
  followRedirects?: boolean;
  
  /** 最大重定向次数 */
  maxRedirects?: number;
}

/**
 * 代理响应
 */
export interface ProxyResponse {
  /** 状态码 */
  statusCode: number;
  
  /** 响应头 */
  headers: Record<string, string>;
  
  /** 响应体 */
  body: any;
  
  /** 响应时间（毫秒） */
  responseTime: number;
  
  /** 是否来自缓存 */
  fromCache?: boolean;
}

/**
 * 服务健康状态
 */
export interface ServiceHealth {
  /** 服务地址 */
  target: string;
  
  /** 是否健康 */
  healthy: boolean;
  
  /** 最后检查时间 */
  lastCheck: Date;
  
  /** 响应时间 */
  responseTime?: number;
  
  /** 错误信息 */
  error?: string;
  
  /** 连续失败次数 */
  consecutiveFailures: number;
}

/**
 * 负载均衡器接口
 */
export interface LoadBalancer {
  /** 选择目标服务 */
  selectTarget(targets: string[], request?: FastifyRequest): string;
  
  /** 更新服务健康状态 */
  updateHealth(target: string, healthy: boolean): void;
  
  /** 获取健康的服务列表 */
  getHealthyTargets(targets: string[]): string[];
  
  /** 记录请求结果 */
  recordRequest(target: string, success: boolean, responseTime: number): void;
}

/**
 * 路由器接口
 */
export interface Router {
  /** 添加路由 */
  addRoute(config: RouteConfig): void;
  
  /** 移除路由 */
  removeRoute(id: string): void;
  
  /** 更新路由 */
  updateRoute(id: string, config: Partial<RouteConfig>): void;
  
  /** 匹配路由 */
  match(method: string, path: string): RouteMatch | null;
  
  /** 获取所有路由 */
  getRoutes(): RouteConfig[];
  
  /** 重新加载路由配置 */
  reload(): Promise<void>;
}