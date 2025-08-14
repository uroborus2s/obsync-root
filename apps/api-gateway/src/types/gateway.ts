/**
 * API网关类型定义
 *
 * 包含代理、监控、认证等相关类型定义，为整个网关系统提供类型安全保障。
 *
 * ## 主要类型分类
 *
 * ### 认证相关
 * - {@link JWTPayload} - JWT Token 载荷结构
 * - {@link AuthenticatedUser} - 认证用户信息
 * - {@link TokenValidationResult} - Token 验证结果
 * - {@link AuthConfig} - 认证配置
 *
 * ### 代理相关
 * - {@link ProxyServiceConfig} - 代理服务配置
 * - {@link ProxyError} - 代理错误信息
 * - {@link ProxyErrorType} - 代理错误类型
 *
 * ### 监控相关
 * - {@link ServiceHealth} - 服务健康状态
 * - {@link GatewayStatus} - 网关整体状态
 * - {@link HealthCheckConfig} - 健康检查配置
 *
 * ### 配置管理
 * - {@link EnvironmentConfig} - 环境变量配置
 * - {@link ConfigValidationResult} - 配置验证结果
 *
 * ### 通用响应
 * - {@link ApiResponse} - 标准 API 响应格式
 * - {@link ErrorResponse} - 错误响应格式
 *
 * @example
 * ```typescript
 * import type {
 *   ProxyServiceConfig,
 *   EnvironmentConfig,
 *   JWTPayload
 * } from './types/gateway.js';
 *
 * // 配置代理服务
 * const serviceConfig: ProxyServiceConfig = {
 *   name: 'user-service',
 *   upstream: 'http://localhost:3002',
 *   prefix: '/api/users',
 *   requireAuth: true,
 *   timeout: 30000,
 *   retries: 3,
 *   httpMethods: ['GET', 'POST']
 * };
 *
 * // 处理 JWT 载荷
 * const payload: JWTPayload = {
 *   userId: '123',
 *   username: 'john',
 *   userType: 'student'
 * };
 * ```
 */

/**
 * JWT Token 载荷（统一定义）
 */
export interface JWTPayload {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 用户名（兼容旧字段） */
  userName?: string;
  /** 用户类型 */
  userType?: 'student' | 'teacher';
  /** 用户编号 */
  userNumber?: string;
  /** 用户邮箱 */
  email?: string;
  /** 用户手机号 */
  phone?: string;
  /** 学院名称 */
  collegeName?: string;
  /** 专业名称 */
  majorName?: string;
  /** 班级名称 */
  className?: string;
  /** 用户角色 */
  roles?: string[];
  /** 权限列表 */
  permissions?: string[];
  /** 发布时间 */
  iat?: number;
  /** 过期时间 */
  exp?: number;
  /** 发布者 */
  iss?: string;
  /** 受众 */
  aud?: string;
}

/**
 * 用户身份信息（用于内网转发）
 */
export interface UserIdentity {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 用户类型 */
  userType?: 'student' | 'teacher';
  /** 用户编号 */
  userNumber?: string;
  /** 用户邮箱 */
  email?: string;
  /** 用户手机号 */
  phone?: string;
  /** 学院名称 */
  collegeName?: string;
  /** 专业名称 */
  majorName?: string;
  /** 班级名称 */
  className?: string;
  /** 用户角色 */
  roles?: string[];
  /** 权限列表 */
  permissions?: string[];
  /** 请求时间戳 */
  timestamp?: number;
}

/**
 * 认证用户信息接口（统一定义）
 */
export interface AuthenticatedUser {
  /** 用户ID */
  id: string;
  /** 用户名 */
  name: string;
  /** 用户类型 */
  userType: 'student' | 'teacher';
  /** 用户编号 */
  userNumber: string;
  /** 用户邮箱 */
  email?: string;
  /** 用户手机号 */
  phone?: string;
  /** 学院名称 */
  collegeName?: string;
  /** 专业名称 */
  majorName?: string;
  /** 班级名称 */
  className?: string;
  /** 用户角色列表 */
  roles?: string[];
  /** 权限列表 */
  permissions?: string[];
}

/**
 * Token 验证结果
 */
export interface TokenValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 解析后的载荷 */
  payload?: JWTPayload;
  /** 错误信息 */
  error?: string;
  /** 错误类型 */
  errorType?: 'EXPIRED' | 'INVALID' | 'MALFORMED' | 'MISSING';
}

/**
 * 认证配置
 */
export interface AuthConfig {
  /** JWT 密钥 */
  jwtSecret: string;
  /** Token 过期时间 */
  tokenExpiry?: string;
  /** 刷新Token过期时间 */
  refreshTokenExpiry?: string;
  /** Cookie 名称 */
  cookieName?: string;
  /** 白名单路径 */
  excludePaths?: string[];
  /** 是否启用认证 */
  enabled?: boolean;
}

/**
 * 代理服务配置接口
 */
export interface ProxyServiceConfig {
  /** 服务名称 */
  name: string;
  /** 上游服务地址 */
  upstream: string;
  /** 路由前缀 */
  prefix: string;
  /** 前缀重写 */
  rewritePrefix?: string;
  /** 是否需要认证 */
  requireAuth: boolean;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retries: number;
  /** 支持的HTTP方法 */
  httpMethods: string[];
  /** 自定义头部 */
  headers?: Record<string, string>;
  /** 健康检查配置 */
  healthCheck?: HealthCheckConfig;
}

/**
 * 健康检查配置接口
 */
export interface HealthCheckConfig {
  /** 健康检查URL */
  url: string;
  /** 检查间隔（毫秒） */
  interval: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retries: number;
  /** 期望的状态码 */
  expectedStatus?: number;
  /** 自定义头部 */
  headers?: Record<string, string>;
}

/**
 * 服务健康状态接口
 */
export interface ServiceHealth {
  /** 服务名称 */
  name: string;
  /** 健康状态 */
  status: 'healthy' | 'unhealthy' | 'unknown';
  /** 响应时间（毫秒） */
  responseTime?: number;
  /** 错误信息 */
  error?: string;
  /** 最后检查时间 */
  lastCheck: string;
  /** 运行时间（秒） */
  uptime?: number;
}

/**
 * 网关状态接口
 */
export interface GatewayStatus {
  /** 网关状态 */
  status: 'healthy' | 'unhealthy' | 'degraded';
  /** 时间戳 */
  timestamp: string;
  /** 运行时间（秒） */
  uptime: number;
  /** 版本信息 */
  version: string;
  /** 服务列表 */
  services: ServiceHealth[];
  /** 系统信息 */
  system: {
    nodeVersion: string;
    platform: string;
    memory: NodeJS.MemoryUsage;
    pid: number;
  };
}

/**
 * API响应基础接口
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误代码 */
  error?: string;
  /** 错误消息 */
  message?: string;
  /** 时间戳 */
  timestamp?: string;
  /** 请求ID */
  requestId?: string;
}

/**
 * 错误响应接口
 */
export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  message: string;
  /** 错误详情 */
  details?: any;
  /** 重试建议 */
  retryAfter?: number;
}

/**
 * 代理错误类型
 */
export type ProxyErrorType =
  | 'CONNECTION_REFUSED'
  | 'TIMEOUT'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CIRCUIT_BREAKER_OPEN'
  | 'UNKNOWN_ERROR';

/**
 * 代理错误接口
 */
export interface ProxyError {
  /** 错误类型 */
  type: ProxyErrorType;
  /** 错误消息 */
  message: string;
  /** 目标服务 */
  service: string;
  /** 状态码 */
  statusCode: number;
  /** 原始错误 */
  originalError?: Error;
  /** 重试建议 */
  retryAfter?: number;
}

/**
 * 环境变量配置接口
 */
export interface EnvironmentConfig {
  /** 服务器配置 */
  server: {
    port: number;
    host: string;
    nodeEnv: string;
    gatewayVersion: string;
  };
  /** 数据库配置 */
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  /** JWT认证配置 */
  jwt: {
    secret: string;
    tokenExpiry: string;
    refreshTokenExpiry: string;
    cookieName: string;
    authEnabled: boolean;
  };
  /** WPS API配置 */
  wps: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  /** 后端服务配置 */
  services: {
    tasks: {
      protocol: string;
      host: string;
      port: number;
      timeout: number;
      retries: number;
    };
    users: {
      protocol: string;
      host: string;
      port: number;
      timeout: number;
      retries: number;
    };
  };
  /** Redis配置 */
  redis: {
    host?: string;
    port?: number;
    password?: string;
  };
  /** 限流配置 */
  rateLimit: {
    globalMax: number;
    globalWindow: string;
  };
  /** CORS配置 */
  cors: {
    origin?: string[];
  };
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}
