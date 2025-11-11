/**
 * 应用配置管理
 * 统一管理不同环境下的配置信息
 */

export interface AppConfig {
  /** API网关基础URL */
  apiBaseUrl: string
  /** 认证服务基础URL */
  authBaseUrl: string
  /** 是否为开发环境 */
  isDevelopment: boolean
  /** 是否为生产环境 */
  isProduction: boolean
  /** 当前环境名称 */
  environment: 'development' | 'production' | 'test'
}

/**
 * 根据当前环境获取API基础URL
 */
function getApiBaseUrl(): string {
  // 1. 优先使用环境变量（构建时注入）
  const envApiUrl = import.meta.env.VITE_API_BASE_URL
  if (envApiUrl) {
    console.log('🔧 使用环境变量 VITE_API_BASE_URL:', envApiUrl)
    return envApiUrl
  }

  // 2. 服务端渲染环境
  if (typeof window === 'undefined') {
    console.log('🔧 服务端渲染环境，使用生产地址')
    return 'https://kwps.jlufe.edu.cn'
  }

  const hostname = window.location.hostname
  console.log('🔧 当前 hostname:', hostname)
  console.log('🔧 当前 MODE:', import.meta.env.MODE)
  console.log('🔧 当前 DEV:', import.meta.env.DEV)
  console.log('🔧 当前 PROD:', import.meta.env.PROD)

  // 3. 生产环境：根据域名判断
  if (hostname.includes('whzhsc.cn') || hostname.includes('jlufe.edu.cn')) {
    console.log('🔧 检测到生产域名，使用生产地址')
    return 'https://kwps.jlufe.edu.cn'
  }

  // 4. 本地环境：根据构建模式决定
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const apiUrl = import.meta.env.DEV
      ? 'http://localhost:8090'
      : 'https://kwps.jlufe.edu.cn'
    console.log('🔧 本地环境，使用地址:', apiUrl)
    return apiUrl
  }

  // 5. 默认情况：使用生产地址
  console.log('🔧 默认情况，使用生产地址')
  return 'https://kwps.jlufe.edu.cn'
}

/**
 * 获取认证服务基础URL
 */
function getAuthBaseUrl(): string {
  // 认证服务通常与API网关在同一地址
  return getApiBaseUrl()
}

/**
 * 获取当前环境
 */
function getEnvironment(): 'development' | 'production' | 'test' {
  if (import.meta.env.MODE === 'production') {
    return 'production'
  }
  if (import.meta.env.MODE === 'test') {
    return 'test'
  }
  return 'development'
}

/**
 * 应用配置对象
 */
export const appConfig: AppConfig = {
  apiBaseUrl: getApiBaseUrl(),
  authBaseUrl: getAuthBaseUrl(),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  environment: getEnvironment(),
}

/**
 * 日志配置
 */
export const logConfig = {
  /** 是否启用控制台日志 */
  enableConsoleLog: appConfig.isDevelopment,
  /** 是否启用网络请求日志 */
  enableNetworkLog: appConfig.isDevelopment,
  /** 是否启用错误上报 */
  enableErrorReporting: appConfig.isProduction,
}

/**
 * 网络请求配置
 */
export const networkConfig = {
  /** 请求超时时间（毫秒） */
  timeout: 10000,
  /** 重试次数 */
  retryCount: 3,
  /** 重试延迟（毫秒） */
  retryDelay: 1000,
}

/**
 * 认证配置
 */
export const authConfig = {
  /** 认证验证接口路径 */
  verifyPath: '/api/auth/verify',
  /** 登出接口路径 */
  logoutPath: '/api/auth/logout',
  /** 认证页面URL */
  authPageUrl: '/api/auth/authorization',
  /** 认证状态检查间隔（毫秒） */
  checkInterval: 5 * 60 * 1000, // 5分钟
}

/**
 * 开发工具配置
 */
export const devConfig = {
  /** 是否启用React Query DevTools */
  enableReactQueryDevTools: appConfig.isDevelopment,
  /** 是否启用Redux DevTools */
  enableReduxDevTools: appConfig.isDevelopment,
  /** 是否显示性能监控 */
  enablePerformanceMonitor: appConfig.isDevelopment,
}

/**
 * 获取完整的API URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = appConfig.apiBaseUrl.replace(/\/$/, '') // 移除末尾斜杠
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

/**
 * 获取完整的认证URL
 */
export function getAuthUrl(path: string): string {
  const baseUrl = appConfig.authBaseUrl.replace(/\/$/, '') // 移除末尾斜杠
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

/**
 * 检查是否为本地开发环境
 */
export function isLocalDevelopment(): boolean {
  return (
    appConfig.isDevelopment &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
  )
}

/**
 * 检查是否为生产环境
 */
export function isProductionEnvironment(): boolean {
  return appConfig.isProduction
}

/**
 * 打印配置信息（开发和生产环境都打印，方便调试）
 */
if (typeof window !== 'undefined') {
  console.group('🔧 应用配置信息')
  console.log('环境:', appConfig.environment)
  console.log('API基础URL:', appConfig.apiBaseUrl)
  console.log('认证基础URL:', appConfig.authBaseUrl)
  console.log('开发模式:', appConfig.isDevelopment)
  console.log('生产模式:', appConfig.isProduction)
  console.log('MODE:', import.meta.env.MODE)
  console.log(
    'VITE_API_BASE_URL:',
    import.meta.env.VITE_API_BASE_URL || '(未设置)'
  )
  console.groupEnd()
}
