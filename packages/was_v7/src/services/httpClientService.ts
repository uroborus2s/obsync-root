import { RESOLVER, type Logger } from '@stratix/core';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createError, WpsError } from '../core/error.js';
import type {
  AccessToken,
  RequestConfig,
  WpsApiResponse,
  WpsConfig,
  WpsErrorResponse
} from '../types/index.js';
import { SignatureService } from './signatureService.js';

/**
 * WPS API HTTP客户端
 */
export class HttpClientService {
  static [RESOLVER] = {};

  private axiosInstance: AxiosInstance;
  private accessToken?: AccessToken;
  private tokenExpireTime?: number;

  // 签名白名单：这些路径不需要添加签名信息
  private readonly signatureWhitelist = ['/oauth2/token'];

  constructor(
    private readonly signatureService: SignatureService,
    private readonly logger: Logger,
    private config: WpsConfig
  ) {
    this.axiosInstance = this.createAxiosInstance(
      config.baseUrl,
      config.timeout
    );
    this.config = config;
    this.setupInterceptors();
  }

  /**
   * 检查路径是否在签名白名单中
   */
  private isPathInSignatureWhitelist(url: string): boolean {
    try {
      // 解析URL获取路径
      const urlObj = new URL(url, 'https://example.com');
      const pathname = urlObj.pathname;

      // 检查是否在白名单中
      return this.signatureWhitelist.some(
        (whitelistPath) =>
          pathname === whitelistPath || pathname.startsWith(whitelistPath + '/')
      );
    } catch {
      // 如果URL解析失败，直接检查原始URL
      return this.signatureWhitelist.some(
        (whitelistPath) =>
          url === whitelistPath || url.startsWith(whitelistPath + '/')
      );
    }
  }

  /**
   * 创建axios实例
   */
  private createAxiosInstance(baseUrl: string, timeout: number): AxiosInstance {
    return axios.create({
      baseURL: baseUrl,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 获取应用访问凭证（自建应用获取租户的access_token）
   * 用于应用级别的API调用
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/get-token/selfapp-tenant-access-token.html
   */
  async getAppAccessToken(): Promise<string> {
    try {
      // 使用form-urlencoded格式发送请求
      const formData = new URLSearchParams();
      formData.append('grant_type', 'client_credentials');
      formData.append('client_id', this.config.appId);
      formData.append('client_secret', this.config.appSecret);

      const response: any = await this.post(
        '/oauth2/token',
        formData.toString(),
        {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      );

      // 🔧 修复：保存完整的AccessToken对象，而不是字符串
      this.accessToken = {
        access_token: response.access_token,
        token_type: response.token_type || 'bearer',
        expires_in: response.expires_in,
        refresh_token: response.refresh_token,
        scope: response.scope
      };
      this.tokenExpireTime = Date.now() + response.expires_in * 1000;

      // 设置到HTTP客户端
      this.setAccessToken(response.access_token);

      return this.accessToken.access_token;
    } catch (error) {
      throw createError.auth('获取应用访问凭证失败', error);
    }
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        try {
          // 准备请求参数
          const method = config.method?.toUpperCase() || 'GET';
          const url = config.url || '/';
          const contentType = String(
            config.headers?.['Content-Type'] || 'application/json'
          );

          // 检查是否在签名白名单中
          if (this.isPathInSignatureWhitelist(url)) {
            this.logger.debug(
              'Path in signature whitelist, skipping signature:',
              url
            );

            // 白名单路径只设置Content-Type，不添加签名
            if (config.headers) {
              config.headers['Content-Type'] = contentType;
            }
          } else {
            // 非白名单路径需要添加签名
            const requestBody = config.data
              ? typeof config.data === 'string'
                ? config.data
                : JSON.stringify(config.data)
              : '';

            // 生成KSO-1签名
            const signatureParams =
              this.signatureService.generateRequestSignature(
                method,
                url,
                contentType,
                requestBody
              );

            // 添加签名到请求头
            if (config.headers) {
              config.headers['Content-Type'] = contentType;
              config.headers['X-Kso-Date'] = signatureParams.timestamp;
              config.headers['X-Kso-Authorization'] = signatureParams.signature;
            }

            this.logger.debug('Added KSO-1 signature for path:', url);
          }
        } catch (error) {
          this.logger.error('Failed to generate KSO-1 signature:', error);
          throw error;
        }

        this.logger.debug('WPS API Request:', {
          url: config.url,
          method: config.method,
          headers: config.headers,
          data: config.data
        });

        return config;
      },
      (error) => {
        return Promise.reject(
          new WpsError('请求配置错误', 'REQUEST_CONFIG_ERROR', error)
        );
      }
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<WpsApiResponse>) => {
        this.logger.debug('WPS API Response:', response.data);

        // 检查是否是token请求，token请求不需要检查业务状态码
        const isTokenRequest = response.config.url?.includes('/oauth2/token');

        if (!isTokenRequest) {
          // 非token请求才检查业务状态码
          if (response.data.code !== 0) {
            throw new WpsError(
              response.data.msg || '请求失败',
              'API_ERROR',
              response.data
            );
          }
        }

        return response;
      },
      (error) => {
        this.logger.debug('WPS API Error:', error);

        // 处理HTTP错误
        if (error.response) {
          const errorData: WpsErrorResponse = error.response.data;
          throw new WpsError(
            errorData.msg || error.message,
            'HTTP_ERROR',
            errorData,
            error.response.status
          );
        }

        // 处理网络错误
        if (error.request) {
          throw new WpsError('网络请求失败', 'NETWORK_ERROR', error);
        }

        // 处理其他错误
        throw new WpsError(error.message || '未知错误', 'UNKNOWN_ERROR', error);
      }
    );
  }

  /**
   * 发送HTTP请求
   */
  async request<T = any>(config: RequestConfig): Promise<WpsApiResponse<T>> {
    const axiosConfig: AxiosRequestConfig = {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data,
      headers: config.headers
    };
    const response = await this.axiosInstance.request(axiosConfig);
    return response.data;
  }

  /**
   * GET请求
   */
  async get<T = any>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<WpsApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      headers
    });
  }

  /**
   * POST请求
   */
  async post<T = any>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<WpsApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      headers
    });
  }

  /**
   * PUT请求
   */
  async put<T = any>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<WpsApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      headers
    });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<WpsApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url,
      params,
      headers
    });
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<WpsApiResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data,
      headers
    });
  }

  /**
   * 设置访问令牌
   */
  setAccessToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] =
      `Bearer ${token}`;
  }

  /**
   * 清除访问令牌
   */
  clearAccessToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  /**
   * 检查token是否有效
   */
  isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpireTime) {
      return false;
    }

    // 提前15分钟过期
    return Date.now() < this.tokenExpireTime - 15 * 60 * 1000;
  }

  /**
   * 获取当前访问凭证
   */
  getCurrentAccessToken(): AccessToken | undefined {
    return this.accessToken;
  }

  // 确保访问令牌有效的辅助函数
  async ensureAccessToken(): Promise<void> {
    if (!this.isTokenValid()) {
      this.logger.debug('Token expired, refreshing...');
      await this.getAppAccessToken();
      this.logger.debug('Token refreshed successfully');
    }
  }
}
