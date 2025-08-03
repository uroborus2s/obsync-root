/**
 * 认证相关类型定义
 */

/**
 * JWT Token 载荷
 */
export interface JWTPayload {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 用户邮箱 */
  email?: string;
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
 * 认证请求参数
 */
export interface AuthRequest {
  /** 授权码 */
  code: string;
  /** 状态参数 */
  state: string;
  /** 错误信息 */
  error?: string;
  /** 错误描述 */
  error_description?: string;
}

/**
 * 认证响应结果
 */
export interface AuthResult {
  /** 是否成功 */
  success: boolean;
  /** 用户信息 */
  user?: UserInfo;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  code?: string;
}

/**
 * 用户信息
 */
export interface UserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  name: string;
  /** 邮箱 */
  email: string;
  /** 头像 */
  avatar?: string;
  /** 角色 */
  roles?: string[];
  /** 权限 */
  permissions?: string[];
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
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
 * Cookie 配置选项
 */
export interface CookieOptions {
  /** 最大存活时间（毫秒） */
  maxAge?: number;
  /** 过期时间 */
  expires?: Date;
  /** 是否仅HTTP访问 */
  httpOnly?: boolean;
  /** 是否安全传输 */
  secure?: boolean;
  /** 同站策略 */
  sameSite?: 'strict' | 'lax' | 'none';
  /** 路径 */
  path?: string;
  /** 域名 */
  domain?: string;
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
  /** Cookie 配置 */
  cookieOptions?: CookieOptions;
  /** 白名单路径 */
  excludePaths?: string[];
  /** 是否启用认证 */
  enabled?: boolean;
}

/**
 * 代理路由配置
 */
export interface ProxyRouteConfig {
  /** 路径模式 */
  path: string;
  /** 支持的HTTP方法 */
  methods: string[];
  /** 目标服务地址 */
  target: string;
  /** 超时时间 */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 负载均衡策略 */
  loadBalancing?: 'round-robin' | 'random' | 'least-connections';
  /** 中间件列表 */
  middleware?: string[];
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 网关配置
 */
export interface GatewayConfig {
  /** 代理路由配置 */
  routes: ProxyRouteConfig[];
  /** 认证配置 */
  auth: AuthConfig;
  /** 限流配置 */
  rateLimit?: {
    global?: {
      max: number;
      timeWindow: string;
    };
    perRoute?: Record<string, {
      max: number;
      timeWindow: string;
    }>;
  };
}
