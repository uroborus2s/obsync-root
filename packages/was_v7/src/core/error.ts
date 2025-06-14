/**
 * WPS API 错误类
 */
export class WpsError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;
  public readonly originalError?: any;

  constructor(
    message: string,
    code: string,
    originalError?: any,
    httpStatus?: number
  ) {
    super(message);
    this.name = 'WpsError';
    this.code = code;
    this.originalError = originalError;
    this.httpStatus = httpStatus;

    // 确保错误堆栈正确显示
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WpsError);
    }
  }

  /**
   * 转换为JSON格式
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      httpStatus: this.httpStatus,
      stack: this.stack,
      originalError: this.originalError
    };
  }

  /**
   * 判断是否为网络错误
   */
  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }

  /**
   * 判断是否为API业务错误
   */
  isApiError(): boolean {
    return this.code === 'API_ERROR';
  }

  /**
   * 判断是否为HTTP错误
   */
  isHttpError(): boolean {
    return this.code === 'HTTP_ERROR';
  }

  /**
   * 判断是否为认证错误
   */
  isAuthError(): boolean {
    return this.code === 'AUTH_ERROR' || this.httpStatus === 401;
  }

  /**
   * 判断是否为权限错误
   */
  isPermissionError(): boolean {
    return this.code === 'PERMISSION_ERROR' || this.httpStatus === 403;
  }

  /**
   * 判断是否为资源不存在错误
   */
  isNotFoundError(): boolean {
    return this.code === 'NOT_FOUND_ERROR' || this.httpStatus === 404;
  }

  /**
   * 判断是否为请求频率限制错误
   */
  isRateLimitError(): boolean {
    return this.code === 'RATE_LIMIT_ERROR' || this.httpStatus === 429;
  }

  /**
   * 判断是否为服务器错误
   */
  isServerError(): boolean {
    return (
      this.code === 'SERVER_ERROR' ||
      (this.httpStatus !== undefined && this.httpStatus >= 500)
    );
  }
}

/**
 * 错误码常量
 */
export const ERROR_CODES = {
  // 网络相关错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // HTTP相关错误
  HTTP_ERROR: 'HTTP_ERROR',

  // API业务错误
  API_ERROR: 'API_ERROR',

  // 认证相关错误
  AUTH_ERROR: 'AUTH_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // 权限相关错误
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  INSUFFICIENT_SCOPE: 'INSUFFICIENT_SCOPE',

  // 资源相关错误
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 请求相关错误
  INVALID_PARAMS: 'INVALID_PARAMS',
  REQUEST_CONFIG_ERROR: 'REQUEST_CONFIG_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',

  // 服务器相关错误
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // 签名相关错误
  SIGNATURE_ERROR: 'SIGNATURE_ERROR',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',

  // 其他错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const;

/**
 * 创建特定类型的错误
 */
export const createError = {
  network: (message: string, originalError?: any) =>
    new WpsError(message, ERROR_CODES.NETWORK_ERROR, originalError),

  auth: (message: string, originalError?: any) =>
    new WpsError(message, ERROR_CODES.AUTH_ERROR, originalError, 401),

  permission: (message: string, originalError?: any) =>
    new WpsError(message, ERROR_CODES.PERMISSION_ERROR, originalError, 403),

  notFound: (message: string, originalError?: any) =>
    new WpsError(message, ERROR_CODES.NOT_FOUND_ERROR, originalError, 404),

  rateLimit: (message: string, originalError?: any) =>
    new WpsError(message, ERROR_CODES.RATE_LIMIT_ERROR, originalError, 429),

  server: (message: string, originalError?: any) =>
    new WpsError(message, ERROR_CODES.SERVER_ERROR, originalError, 500),

  validation: (message: string, originalError?: any) =>
    new WpsError(message, ERROR_CODES.VALIDATION_ERROR, originalError),

  signature: (message: string, originalError?: any) =>
    new WpsError(message, ERROR_CODES.SIGNATURE_ERROR, originalError)
};
