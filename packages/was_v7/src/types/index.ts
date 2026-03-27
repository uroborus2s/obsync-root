/**
 * WPS V7 API 类型定义
 */

// 基础响应类型
export type WpsApiResponse<T = any> = {
  code: number;
  msg: string;
  data: T;
};

// 分页响应类型
export interface WpsPageResponse<T = any> {
  code: number;
  msg: string;
  data: {
    items: T[];
    page_token?: string;
    has_more: boolean;
    total?: number;
  };
}

// 错误响应类型
export interface WpsErrorResponse {
  code: number;
  msg: string;
  error?: string;
  error_description?: string;
}

// 配置类型
export interface WpsConfig {
  appId: string;
  appSecret: string;
  baseUrl: string;
  timeout: number;
  retryTimes?: number;
  debug?: boolean;
}

// 访问凭证类型
export interface AccessToken {
  access_token: string;
  token_type?: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  tenant_access_token?: string;
  app_access_token?: string;
}

// 签名参数类型
export interface SignatureParams {
  timestamp: string;
  signature: string;
}

// HTTP请求配置类型
export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

// 企业信息类型
export interface CompanyInfo {
  company_id: string;
  name: string;
  domain?: string;
  avatar?: string;
  description?: string;
}

// Token 缓存相关类型
export interface TokenCacheError extends Error {
  code:
    | 'REDIS_UNAVAILABLE'
    | 'FALLBACK_DISABLED'
    | 'INVALID_TOKEN'
    | 'CACHE_ERROR';
  details?: any;
}

// WPS 配置扩展，支持 token 缓存配置
export interface WpsConfigWithCache extends WpsConfig {
  /** Token 缓存配置 */
  tokenCache?: {
    /** Redis 键前缀 */
    keyPrefix?: string;
    /** 默认过期时间（秒） */
    defaultTtl?: number;
    /** 提前过期时间（秒） */
    earlyExpireSeconds?: number;
    /** 是否启用降级模式 */
    enableFallback?: boolean;
  };
}

// 导出所有类型
// export * from './auth.js';
export * from './contact.js';
export * from './drive.js';
// export * from './message.js';

// 导出日历相关类型
export * from './calendar.js';

// 导出 DBSheet 相关类型
export * from './dbsheet.js';

export * from './drive.js';
