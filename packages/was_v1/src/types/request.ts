/**
 * WPS API请求错误
 */
export interface WasV1RequestError {
  message: string;
  status?: number;
  code?: string | number;
  data?: any;
}

/**
 * WPS V1 API分页参数
 */
export interface WasV1PaginationParams {
  page_size?: number;
  page_number?: number; // V1版本使用page_number，而不是V7中的page_token
}

/**
 * HTTP请求选项扩展
 */
export interface WasV1RequestOptions {
  retry?: boolean; // 是否允许重试，默认为true
  maxRetries?: number; // 最大重试次数，默认使用全局配置
  retryDelay?: number; // 重试延迟时间，默认使用全局配置
  timeout?: number; // 超时时间，默认使用全局配置
  skipTokenRefresh?: boolean; // 是否跳过token刷新，默认为false
  skipSign?: boolean; // 是否跳过签名，默认为false
}
