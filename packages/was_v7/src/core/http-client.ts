import type { Logger } from '@stratix/core';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  RequestConfig,
  WpsApiResponse,
  WpsConfig,
  WpsErrorResponse
} from '../types/index.js';
import { SignatureUtil } from '../utils/signature.js';
import { WpsError } from './error.js';

/**
 * WPS API HTTP客户端
 */
export class HttpClient {
  private axiosInstance: AxiosInstance;
  private config: WpsConfig;

  constructor(
    private readonly wasV7SignatureUtil: SignatureUtil,
    private readonly log: Logger,
    config: WpsConfig
  ) {
    this.config = config;
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * 创建axios实例
   */
  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 添加签名
        const signatureParams = this.wasV7SignatureUtil.generateSignature();

        // 添加签名到请求头
        if (config.headers) {
          config.headers['X-WPS-Timestamp'] = signatureParams.timestamp;
          config.headers['X-WPS-Nonce'] = signatureParams.nonce;
          config.headers['X-WPS-Signature'] = signatureParams.signature;
        }

        this.log.debug('WPS API Request:', {
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
        this.log.debug('WPS API Response:', response.data);

        // 检查是否是token请求，token请求不需要检查业务状态码
        const isTokenRequest = response.config.url?.includes('/oauth2/token');

        // if (!isTokenRequest) {
        //   // 非token请求才检查业务状态码
        //   if (response.data.code !== 0) {
        //     throw new WpsError(
        //       response.data.msg || '请求失败',
        //       'API_ERROR',
        //       response.data
        //     );
        //   }
        // }

        return response;
      },
      (error) => {
        this.log.debug('WPS API Error:', error);

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
      headers: config.headers,
      timeout: config.timeout || this.config.timeout
    };

    // 检查是否是token请求，需要特殊处理认证头
    const isTokenRequest = config.url.includes('/oauth2/token');
    let originalAuthHeader: string | undefined;

    if (
      isTokenRequest &&
      this.axiosInstance.defaults.headers.common['Authorization']
    ) {
      // 对于token请求，临时移除Authorization头
      originalAuthHeader = this.axiosInstance.defaults.headers.common[
        'Authorization'
      ] as string;
      delete this.axiosInstance.defaults.headers.common['Authorization'];
    }

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
}
