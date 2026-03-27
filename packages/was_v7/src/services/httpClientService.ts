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
import type { ITokenCacheService } from './interfaces/ITokenCacheService.js';
import { SignatureService } from './signatureService.js';

/**
 * WPS API HTTP客户端
 */
export class HttpClientService {
  static [RESOLVER] = {
    tokenCacheService: 'tokenCacheService'
  };

  private axiosInstance: AxiosInstance;

  // 签名白名单：这些路径不需要添加签名信息
  private readonly signatureWhitelist = ['/oauth2/token'];

  constructor(
    private readonly signatureService: SignatureService,
    private readonly logger: Logger,
    private readonly tokenCacheService: ITokenCacheService,
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
      // 首先检查缓存中是否有有效的 token
      const cachedTokenResult = await this.tokenCacheService.getToken(
        this.config.appId
      );
      if (cachedTokenResult.success && cachedTokenResult.data) {
        const cachedToken = cachedTokenResult.data;
        this.logger.debug('Using cached access token', {
          appId: this.config.appId
        });

        // 设置到HTTP客户端
        this.setAccessToken(cachedToken.access_token);
        return cachedToken.access_token;
      }

      this.logger.debug('Fetching new access token from WPS API', {
        appId: this.config.appId
      });

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

      // 构建完整的AccessToken对象
      const accessToken: AccessToken = {
        access_token: response.access_token,
        token_type: response.token_type || 'bearer',
        expires_in: response.expires_in,
        refresh_token: response.refresh_token,
        scope: response.scope
      };

      // 存储到缓存
      const cacheResult = await this.tokenCacheService.setToken(
        this.config.appId,
        accessToken
      );
      if (!cacheResult.success) {
        this.logger.warn('Failed to cache access token', {
          appId: this.config.appId,
          error: cacheResult.error
        });
      }

      // 设置到HTTP客户端
      this.setAccessToken(accessToken.access_token);

      this.logger.info('New access token obtained and cached', {
        appId: this.config.appId,
        expiresIn: accessToken.expires_in
      });

      return accessToken.access_token;
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
  async isTokenValid(): Promise<boolean> {
    try {
      const result = await this.tokenCacheService.isTokenValid(
        this.config.appId
      );
      return result.success ? (result.data ?? false) : false;
    } catch (error) {
      this.logger.error('Error checking token validity', { error });
      return false;
    }
  }

  /**
   * 获取当前访问凭证
   */
  async getCurrentAccessToken(): Promise<AccessToken | undefined> {
    try {
      const result = await this.tokenCacheService.getToken(this.config.appId);
      return result.success ? result.data || undefined : undefined;
    } catch (error) {
      this.logger.error('Error getting current access token', { error });
      return undefined;
    }
  }

  // 确保访问令牌有效的辅助函数
  async ensureAccessToken(): Promise<void> {
    const isValid = await this.isTokenValid();

    if (!isValid) {
      // Token 无效，需要重新获取
      this.logger.debug('Token expired or invalid, refreshing...', {
        appId: this.config.appId
      });
      await this.getAppAccessToken();
      this.logger.debug('Token refreshed successfully', {
        appId: this.config.appId
      });
    } else {
      // Token 有效，但需要确保 HTTP 请求头已正确设置
      const currentToken = await this.getCurrentAccessToken();
      if (currentToken) {
        const currentAuthHeader =
          this.axiosInstance.defaults.headers.common['Authorization'];
        const expectedAuthHeader = `Bearer ${currentToken.access_token}`;

        // 检查当前请求头是否与有效 token 匹配
        if (currentAuthHeader !== expectedAuthHeader) {
          this.logger.debug('Setting cached token to HTTP client', {
            appId: this.config.appId
          });
          this.setAccessToken(currentToken.access_token);
        }
      }
    }
  }
}
