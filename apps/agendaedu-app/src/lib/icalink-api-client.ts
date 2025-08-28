/**
 * 统一API客户端
 * 集成WPS授权管理器和IcaLink接口，自动处理401响应和token刷新
 */

import { authManager } from './auth-manager';
import { getUserInfoFromCookie, JWTPayload } from './jwt-utils';

// 通用API响应接口
export interface ApiResponse<T = any> {
  success: boolean | number;
  message: string;
  data?: T;
  code?: string;
}

// 请求选项接口
export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retryOnAuth?: boolean;
}

// 请求配置接口
interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  skipAuth: boolean;
  retryOnAuth: boolean;
}

export interface IcaLinkAuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: JWTPayload;
  };
  code?: string;
}

export interface AttendanceCourseInfo {
  id: string;
  external_id: string;
  course_name: string;
  teacher_name: string;
  class_location: string;
  class_date: string;
  class_time: string;
  [key: string]: any;
}

export class IcaLinkApiClient {
  private baseUrl: string;
  private mockMode: boolean;
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

    // 开发环境下检测是否启用模拟模式
    this.mockMode =
      import.meta.env.DEV &&
      localStorage.getItem('icalink_mock_mode') === 'true';
    console.log(
      '🔧 IcaLinkApiClient 初始化，baseUrl:',
      this.baseUrl,
      '模拟模式:',
      this.mockMode
    );
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
        body: config.body,
        credentials: 'include' // 确保发送cookie
      });

      // 处理401未授权响应
      if (response.status === 401 && !config.skipAuth && config.retryOnAuth) {
        return this.handleUnauthorized(config);
      }

      // 处理其他HTTP错误
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

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

  /**
   * 检查用户登录状态
   */
  async checkAuthStatus(): Promise<IcaLinkAuthResponse> {
    // 首先从cookie中获取用户信息
    const jwtPayload = getUserInfoFromCookie();
    if (!jwtPayload) {
      console.log('❌ 未找到有效的JWT token');
      return {
        success: false,
        message: '用户未登录',
        code: 'UNAUTHORIZED'
      };
    }

    // 映射字段以适配前端期望的格式
    const userInfo = {
      ...jwtPayload,
      type: jwtPayload.userType // 将 userType 映射为 type
    };

    return {
      success: true,
      message: '认证成功',
      data: { user: userInfo }
    };
  }

  /**
   * 学生签到
   */
  async checkin(
    courseId: string,
    checkinData: {
      location?: {
        latitude?: number;
        longitude?: number;
        accuracy?: number;
        address?: string;
      };
      remark?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
    code?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/icalink/v1/attendance/${courseId}/checkin`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            checkin_location: checkinData.location?.address,
            checkin_latitude: checkinData.location?.latitude,
            checkin_longitude: checkinData.location?.longitude,
            checkin_accuracy: checkinData.location?.accuracy,
            remark: checkinData.remark
          })
        }
      );

      if (response.status === 401) {
        return {
          success: false,
          message: '用户未登录',
          code: 'UNAUTHORIZED'
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || '签到失败',
          code: errorData.code || 'CHECKIN_FAILED'
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('签到失败:', error);
      return {
        success: false,
        message: '网络错误或服务异常',
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * 获取当前课程的考勤信息（教师用）
   */
  async getCurrentAttendance(courseId: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
    code?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/courses/${courseId}/current-attendance`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 401) {
        return {
          success: false,
          message: '用户未登录',
          code: 'UNAUTHORIZED'
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || '获取考勤信息失败',
          code: errorData.code || 'FETCH_FAILED'
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取考勤信息失败:', error);
      return {
        success: false,
        message: '网络错误或服务异常',
        code: 'NETWORK_ERROR'
      };
    }
  }
}

// 创建全局实例
const getBaseUrl = () => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // 开发环境使用本地API
  if (import.meta.env.DEV) {
    return 'http://localhost:8090/api';
  }
  // 生产环境使用实际地址
  return 'https://kwps.jlufe.edu.cn/api';
};

export const icaLinkApiClient = new IcaLinkApiClient(getBaseUrl());

// 创建全局API客户端实例（兼容原api-client.ts）
export const apiClient = icaLinkApiClient;

// 导出便捷方法（兼容原api-client.ts）
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    icaLinkApiClient.get<T>(endpoint, options),

  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    icaLinkApiClient.post<T>(endpoint, data, options),

  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    icaLinkApiClient.put<T>(endpoint, data, options),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    icaLinkApiClient.delete<T>(endpoint, options)
};
