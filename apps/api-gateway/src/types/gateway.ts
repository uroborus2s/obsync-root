/**
 * API网关类型定义
 * 包含代理、监控、认证等相关类型
 */

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
 * 代理请求上下文接口
 */
export interface ProxyRequestContext {
  /** 请求ID */
  requestId: string;
  /** 开始时间 */
  startTime: number;
  /** 用户信息 */
  user?: AuthenticatedUser;
  /** 目标服务 */
  targetService: string;
  /** 原始URL */
  originalUrl: string;
  /** 转发URL */
  forwardedUrl: string;
}

/**
 * 认证用户信息接口
 */
export interface AuthenticatedUser {
  /** 用户ID */
  id: string;
  /** 用户姓名 */
  name: string;
  /** 用户类型 */
  userType: 'student' | 'teacher';
  /** 用户编号（学号/工号） */
  userNumber: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 学院名称 */
  collegeName?: string;
  /** 专业名称 */
  majorName?: string;
  /** 班级名称 */
  className?: string;
  /** 用户角色 */
  roles?: string[];
}

/**
 * JWT载荷接口
 */
export interface JWTPayload {
  /** 用户ID */
  userId: string;
  /** 用户姓名 */
  userName: string;
  /** 用户类型 */
  userType: 'student' | 'teacher';
  /** 用户编号 */
  userNumber: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 学院名称 */
  collegeName?: string;
  /** 专业名称 */
  majorName?: string;
  /** 班级名称 */
  className?: string;
  /** 签发时间 */
  iat?: number;
  /** 过期时间 */
  exp?: number;
  /** 签发者 */
  iss?: string;
  /** 受众 */
  aud?: string;
}

/**
 * JWT验证结果接口
 */
export interface JWTVerificationResult {
  /** 是否有效 */
  valid: boolean;
  /** 载荷信息 */
  payload?: JWTPayload;
  /** 错误信息 */
  error?: string;
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
 * 监控指标接口
 */
export interface MetricsData {
  /** 请求总数 */
  totalRequests: number;
  /** 成功请求数 */
  successfulRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 当前活跃连接数 */
  activeConnections: number;
  /** 内存使用情况 */
  memoryUsage: NodeJS.MemoryUsage;
  /** CPU使用率 */
  cpuUsage: number;
  /** 服务健康状态 */
  servicesHealth: ServiceHealth[];
}

/**
 * 配置验证结果接口
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
}

/**
 * 网关配置接口
 */
export interface GatewayConfig {
  /** 服务器配置 */
  server: {
    port: number;
    host: string;
    keepAliveTimeout: number;
    requestTimeout: number;
    bodyLimit: number;
    trustProxy: boolean;
  };
  /** 代理服务配置 */
  services: ProxyServiceConfig[];
  /** 认证配置 */
  auth: {
    enabled: boolean;
    jwtSecret: string;
    tokenExpiry: string;
    cookieName: string;
    excludePaths: string[];
  };
  /** 监控配置 */
  monitoring: {
    enabled: boolean;
    metricsPath: string;
    healthCheckPath: string;
    healthCheckInterval: number;
  };
  /** 日志配置 */
  logging: {
    level: string;
    enableRequestLogging: boolean;
    enableResponseLogging: boolean;
  };
}
