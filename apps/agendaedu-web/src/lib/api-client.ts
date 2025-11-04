import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios'
import { handle401Error, handle403Error } from '@/utils/error-handler'
import { appConfig, networkConfig } from './config'
import { authManager } from './gateway-auth-manager'

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}

export interface RequestOptions extends AxiosRequestConfig {
  skipAuth?: boolean
  retryOnAuth?: boolean
}

export class ApiClient {
  private client: AxiosInstance
  private isRedirecting = false // 防止重复重定向

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || appConfig.apiBaseUrl,
      timeout: networkConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // 请求拦截器 - 网关使用Cookie认证，不需要添加Authorization头
    this.client.interceptors.request.use(
      async (config) => {
        // 跳过认证的请求直接返回
        if (config.metadata?.skipAuth) {
          return config
        }

        // 网关使用Cookie认证，确保发送Cookie
        config.withCredentials = true

        return config
      },
      (error) => Promise.reject(error)
    )

    // 响应拦截器 - 完整的错误处理
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response.data,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          metadata?: { skipAuth?: boolean }
        }

        // 处理401未授权响应
        if (
          error.response?.status === 401 &&
          !originalRequest.metadata?.skipAuth
        ) {
          handle401Error(error)
          this.handleUnauthorized()
          return Promise.reject(new Error('需要重新授权'))
        }

        // 处理403权限不足响应
        if (error.response?.status === 403) {
          handle403Error(error)
          this.handleForbidden(error)
          return Promise.reject(error)
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 处理未授权情况 - 保存当前页面并跳转到WPS授权页面
   */
  private handleUnauthorized(): void {
    // 防止重复重定向
    if (this.isRedirecting) {
      console.log('⏭️ API客户端: 已在重定向中，跳过本次401处理')
      return
    }

    this.isRedirecting = true
    console.log('🔒 API客户端: 检测到401未授权，准备重定向到登录页')

    // 保存当前页面路径，用于登录成功后返回
    const currentPath = window.location.href
    console.log('💾 API客户端: 保存当前页面路径:', currentPath)

    // 清除可能存在的认证信息
    authManager.clearTokens()

    // 跳转到WPS授权页面，传入当前页面作为返回URL
    authManager.redirectToAuth(currentPath)
  }

  /**
   * 处理权限不足情况 - 导航到403页面
   */
  private handleForbidden(error: AxiosError): void {
    const responseData = error.response?.data as any

    // 存储详细的错误信息，供403错误页面使用
    const errorInfo = {
      type: 'FORBIDDEN',
      url: error.config?.url || '',
      method: error.config?.method?.toUpperCase() || 'GET',
      status: error.response?.status || 403,
      message: responseData?.message || '权限不足，无法访问此资源',
      userRoles: responseData?.userRoles || [],
      currentPath: window.location.href,
      timestamp: new Date().toISOString(),
    }

    // 存储到sessionStorage供403页面读取
    try {
      sessionStorage.setItem('last_403_error', JSON.stringify(errorInfo))
    } catch (e) {
      console.warn('无法存储403错误信息到sessionStorage:', e)
    }

    // 导航到403错误页面
    // 使用setTimeout避免在请求处理过程中立即导航
    setTimeout(() => {
      window.location.href = '/web/403'
    }, 100)
  }

  async get<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this.client.get(url, {
      ...options,
      metadata: { skipAuth: options?.skipAuth },
    })
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.client.post(url, data, {
      ...options,
      metadata: { skipAuth: options?.skipAuth },
    })
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.client.put(url, data, {
      ...options,
      metadata: { skipAuth: options?.skipAuth },
    })
  }

  async delete<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this.client.delete(url, {
      ...options,
      metadata: { skipAuth: options?.skipAuth },
    })
  }
}

// 创建全局API客户端实例
export const apiClient = new ApiClient()

// 扩展Axios配置类型以支持metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      skipAuth?: boolean
    }
  }
}
