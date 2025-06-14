/**
 * API客户端
 * 集成WPS授权管理器，自动处理401响应和token刷新
 */

import { authManager } from './auth-manager';

export interface ApiResponse<T = any> {
  success: number;
  message: string;
  data: T;
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retryOnAuth?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    config: RequestConfig;
  }> = [];

  constructor(baseUrl?: string) {
    // 优先使用传入的baseUrl，然后是环境变量，最后是默认值
    this.baseUrl =
      baseUrl ||
      import.meta.env.VITE_API_BASE_URL ||
      'http://localhost:8090/api';

    console.log('API Client initialized with baseUrl:', this.baseUrl);
  }

  /**
   * 发送HTTP请求
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const config: RequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {})
      },
      body: typeof options.body === 'string' ? options.body : undefined,
      skipAuth: options.skipAuth || false,
      retryOnAuth: options.retryOnAuth !== false
    };

    return this.executeRequest(config);
  }

  /**
   * 执行请求
   */
  private async executeRequest<T>(
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      // 添加授权头
      if (!config.skipAuth) {
        const token = await authManager.getAccessToken();
        if (token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`
          };
        }
      }

      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body
      });

      // 处理401未授权响应
      if (response.status === 401 && !config.skipAuth && config.retryOnAuth) {
        return this.handleUnauthorized(config);
      }

      // 处理其他HTTP错误
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 解析响应
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  /**
   * 处理401未授权响应
   */
  private async handleUnauthorized<T>(
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    // 如果正在刷新token，将请求加入队列
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject, config });
      });
    }

    this.isRefreshing = true;

    try {
      // 尝试刷新token
      if (authManager.isAuthenticated()) {
        try {
          await authManager.refreshAccessToken();
          // 刷新成功，重试原请求
          this.processQueue(null);
          return this.executeRequest(config);
        } catch (refreshError) {
          console.error('刷新token失败:', refreshError);
          // 刷新失败，清除token并跳转授权
          authManager.clearTokens();
          this.processQueue(refreshError);
          this.redirectToAuth();
          throw new Error('需要重新授权');
        }
      } else {
        // 没有有效token，直接跳转授权
        this.processQueue(new Error('需要授权'));
        this.redirectToAuth();
        throw new Error('需要授权');
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 处理队列中的请求
   */
  private processQueue(error: any): void {
    this.failedQueue.forEach(({ resolve, reject, config }) => {
      if (error) {
        reject(error);
      } else {
        resolve(this.executeRequest(config));
      }
    });

    this.failedQueue = [];
  }

  /**
   * 跳转到授权页面
   */
  private redirectToAuth(): void {
    // 保存当前页面URL，授权后返回
    const currentUrl = window.location.href;
    sessionStorage.setItem('auth_redirect_url', currentUrl);

    // 跳转到WPS授权页面
    authManager.redirectToAuth(currentUrl);
  }

  /**
   * GET请求
   */
  async get<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT请求
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  skipAuth: boolean;
  retryOnAuth: boolean;
}

// 创建全局API客户端实例
export const apiClient = new ApiClient();

// 导出便捷方法
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient.get<T>(endpoint, options),

  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient.post<T>(endpoint, data, options),

  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient.put<T>(endpoint, data, options),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient.delete<T>(endpoint, options)
};
