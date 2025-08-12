import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios'
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

    // 响应拦截器 - 简化的401处理
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response.data,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          metadata?: { skipAuth?: boolean }
        }

        // 处理401未授权响应 - 直接重定向，不重试
        if (
          error.response?.status === 401 &&
          !originalRequest.metadata?.skipAuth
        ) {
          console.log('🔒 API客户端: 检测到401错误，触发WPS认证重定向')
          this.handleUnauthorized()
          return Promise.reject(new Error('需要重新授权'))
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 处理未授权情况 - 直接跳转到WPS授权页面
   */
  private handleUnauthorized(): void {
    // 直接跳转到WPS授权页面，不使用SDK
    authManager.redirectToAuth()
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
