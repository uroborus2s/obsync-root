/**
 * WPS API集成V1版本插件配置选项
 */
export interface WasV1Options {
  // 基础配置
  appId: string; // WPS应用ID
  appKey: string; // WPS应用密钥
  baseUrl?: string; // WPS API基础URL，默认为"https://openapi.wps.cn"

  // Token配置
  tokenCacheEnabled?: boolean; // 是否启用token缓存，默认为true
  tokenCacheTTL?: number; // token缓存有效期（毫秒），默认为1小时

  // 请求配置
  requestTimeout?: number; // 请求超时时间（毫秒），默认为10000
  maxRetries?: number; // 最大重试次数，默认为3
  retryDelay?: number; // 重试延迟时间（毫秒），默认为1000

  // 日志配置
  logLevel?: 'debug' | 'info' | 'warn' | 'error'; // 日志级别，默认为'info'

  // API模块配置，支持选择性加载模块
  apiModules?: {
    auth?: boolean; // 是否加载认证API模块
    contact?: boolean; // 是否加载通讯录API模块
    document?: boolean; // 是否加载文档API模块
    message?: boolean; // 是否加载消息API模块
  };
}
