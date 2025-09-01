/**
 * 统一错误处理工具函数
 * 提供HTTP状态码错误处理、日志记录和用户友好的错误提示
 */
import { AxiosError } from 'axios'
import { toast } from 'sonner'

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  /** 请求URL */
  url?: string
  /** HTTP方法 */
  method?: string
  /** HTTP状态码 */
  status?: number
  /** 错误消息 */
  message?: string
  /** 错误发生时间 */
  timestamp?: string
  /** 用户代理信息 */
  userAgent?: string
  /** 当前页面路径 */
  currentPath?: string
  /** 错误堆栈信息 */
  stack?: string
  /** 用户ID（如果已登录） */
  userId?: string
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误处理配置
 */
interface ErrorHandlerConfig {
  /** 是否显示toast提示 */
  showToast?: boolean
  /** 是否记录到控制台 */
  logToConsole?: boolean
  /** 是否存储错误信息 */
  storeError?: boolean
  /** 自定义错误消息 */
  customMessage?: string
}

/**
 * 从AxiosError提取错误信息
 */
export function extractErrorInfo(error: AxiosError): ErrorInfo {
  return {
    url: error.config?.url,
    method: error.config?.method?.toUpperCase(),
    status: error.response?.status,
    message: (error.response?.data as any)?.message || error.message,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    currentPath: window.location.href,
    stack: error.stack,
  }
}

/**
 * 根据HTTP状态码确定错误类型
 */
export function getErrorType(status?: number): ErrorType {
  if (!status) return ErrorType.UNKNOWN_ERROR

  switch (status) {
    case 401:
      return ErrorType.UNAUTHORIZED
    case 403:
      return ErrorType.FORBIDDEN
    case 404:
      return ErrorType.NOT_FOUND
    case 422:
      return ErrorType.VALIDATION_ERROR
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER_ERROR
    default:
      if (status >= 400 && status < 500) {
        return ErrorType.VALIDATION_ERROR
      }
      if (status >= 500) {
        return ErrorType.SERVER_ERROR
      }
      return ErrorType.UNKNOWN_ERROR
  }
}

/**
 * 获取用户友好的错误消息
 */
export function getFriendlyErrorMessage(
  errorType: ErrorType,
  originalMessage?: string
): string {
  const messages = {
    [ErrorType.UNAUTHORIZED]: '您需要登录才能访问此功能',
    [ErrorType.FORBIDDEN]: '您没有权限执行此操作',
    [ErrorType.NOT_FOUND]: '请求的资源不存在',
    [ErrorType.SERVER_ERROR]: '服务器暂时无法处理您的请求，请稍后重试',
    [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查您的网络连接',
    [ErrorType.VALIDATION_ERROR]:
      originalMessage || '请求参数有误，请检查输入信息',
    [ErrorType.UNKNOWN_ERROR]: '发生了未知错误，请稍后重试',
  }

  return messages[errorType]
}

/**
 * 记录错误日志
 */
export function logError(_errorInfo: ErrorInfo, _errorType: ErrorType): void {
  // const _logData = {
  //   type: errorType,
  //   ...errorInfo,
  //   // 添加额外的调试信息
  //   url_pathname: window.location.pathname,
  //   url_search: window.location.search,
  //   referrer: document.referrer,
  //   timestamp_local: new Date().toLocaleString('zh-CN'),
  // }

  // 在生产环境中，这些错误应该发送到日志服务
  // 开发环境可以根据需要启用控制台输出

  // 在开发环境下，可以将错误发送到外部日志服务
  if (import.meta.env.DEV) {
    // 这里可以集成如 Sentry、LogRocket 等错误监控服务
    // sendToErrorService(logData)
  }
}

/**
 * 存储错误信息到sessionStorage
 */
export function storeErrorInfo(key: string, errorInfo: ErrorInfo): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(errorInfo))
  } catch (error) {
    console.warn('⚠️ 无法存储错误信息到sessionStorage:', error)
  }
}

/**
 * 从sessionStorage获取错误信息
 */
export function getStoredErrorInfo(key: string): ErrorInfo | null {
  try {
    const stored = sessionStorage.getItem(key)
    if (stored) {
      sessionStorage.removeItem(key) // 读取后立即清除
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('⚠️ 无法从sessionStorage读取错误信息:', error)
  }
  return null
}

/**
 * 统一的错误处理函数
 */
export function handleError(
  error: unknown,
  config: ErrorHandlerConfig = {}
): ErrorInfo {
  const {
    showToast = true,
    logToConsole = true,
    storeError = false,
    customMessage,
  } = config

  let errorInfo: ErrorInfo
  let errorType: ErrorType

  if (error instanceof AxiosError) {
    errorInfo = extractErrorInfo(error)
    errorType = getErrorType(errorInfo.status)
  } else if (error instanceof Error) {
    errorInfo = {
      message: error.message,
      timestamp: new Date().toISOString(),
      currentPath: window.location.href,
      stack: error.stack,
    }
    errorType = ErrorType.UNKNOWN_ERROR
  } else {
    errorInfo = {
      message: String(error),
      timestamp: new Date().toISOString(),
      currentPath: window.location.href,
    }
    errorType = ErrorType.UNKNOWN_ERROR
  }

  // 记录日志
  if (logToConsole) {
    logError(errorInfo, errorType)
  }

  // 显示用户友好的错误提示
  if (showToast) {
    const friendlyMessage =
      customMessage || getFriendlyErrorMessage(errorType, errorInfo.message)

    // 根据错误类型使用不同的toast样式
    switch (errorType) {
      case ErrorType.UNAUTHORIZED:
      case ErrorType.FORBIDDEN:
        toast.error(friendlyMessage, { duration: 5000 })
        break
      case ErrorType.VALIDATION_ERROR:
        toast.error(friendlyMessage, { duration: 4000 })
        break
      default:
        toast.error(friendlyMessage, { duration: 6000 })
    }
  }

  // 存储错误信息
  if (storeError) {
    const storageKey = `error_${errorType.toLowerCase()}_${Date.now()}`
    storeErrorInfo(storageKey, errorInfo)
  }

  return errorInfo
}

/**
 * 专门处理401未授权错误
 */
export function handle401Error(error: AxiosError): void {
  const errorInfo = extractErrorInfo(error)
  logError(errorInfo, ErrorType.UNAUTHORIZED)

  // 401错误不显示toast，因为会自动重定向到登录页
  console.log('🔒 401错误: 用户未授权，将重定向到登录页面')
}

/**
 * 专门处理403权限不足错误
 */
export function handle403Error(error: AxiosError): void {
  const errorInfo = extractErrorInfo(error)
  logError(errorInfo, ErrorType.FORBIDDEN)

  // 存储错误信息供403错误页面使用
  storeErrorInfo('last_403_error', errorInfo)

  console.log('🚫 403错误: 权限不足，错误信息已存储')
}
