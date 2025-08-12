/**
 * WPS开放平台API服务
 * 负责与金山WPS开放平台的API交互
 */

import type { Logger } from '@stratix/core';

/**
 * WPS API响应接口
 */
export interface WPSTokenResponse {
  /** 状态码，非0表示失败 */
  result: number;
  /** 凭证信息 */
  token: {
    /** 凭证所属的应用id */
    appid: string;
    /** 凭证有效期，单位为秒 */
    expires_in: number;
    /** 访问凭证 */
    access_token: string;
    /** 刷新凭证 */
    refresh_token: string;
    /** 用户在应用内的唯一标识 */
    openid: string;
  };
}

/**
 * WPS用户信息响应接口
 */
export interface WPSUserInfoResponse {
  /** 状态码，非0表示失败 */
  result: number;
  /** 用户信息 */
  user: WPSUserInfo;
}

/**
 * WPS用户信息接口
 */
export interface WPSUserInfo {
  /** 用户昵称 */
  nickname: string;
  /** 头像URL */
  avatar?: string;
  /** 性别 */
  sex?: string;
  /** 用户在应用内的唯一标识 */
  openid: string;
  /** 用户在服务商内的唯一标识 */
  unionid?: string;
  /** 企业的唯一标识 */
  company_id?: string;
  /** 用户在企业内的唯一标识 */
  company_uid?: string;
  /** 第三方联合ID，用于匹配学号/工号 */
  third_union_id: string;
  /** 其他扩展信息 */
  [key: string]: any;
}

/**
 * API错误接口
 */
export interface WPSApiError {
  error: string;
  error_description?: string;
  error_code?: number;
}

export interface IWPSApiService {
  /**
   * 使用授权码获取访问令牌
   */
  getAccessToken(code: string): Promise<WPSTokenResponse>;

  /**
   * 使用访问令牌获取用户信息
   */
  getUserInfo(accessToken: string): Promise<WPSUserInfo>;
}

export default class WPSApiService implements IWPSApiService {
  private readonly baseUrl: string;
  private readonly appid: string;
  private readonly appkey: string;

  constructor(private logger: Logger) {
    // 从环境变量获取WPS API配置
    this.baseUrl = process.env.WPS_API_BASE_URL || 'https://openapi.wps.cn';
    this.appid = process.env.WPS_CLIENT_ID || 'AK20250614WBSGPX';
    this.appkey =
      process.env.WPS_CLIENT_SECRET || '8f36473839cc5c5c30bb9a0b5b2167d7';

    if (!this.appid || !this.appkey) {
      this.logger.warn('WPS API credentials not configured properly');
    }

    this.logger.info('✅ WPSApiService initialized', {
      baseUrl: this.baseUrl,
      appid: this.appid ? '***' : 'not set'
    });
  }

  /**
   * 使用授权码获取访问令牌
   */
  async getAccessToken(code: string): Promise<WPSTokenResponse> {
    try {
      this.logger.debug('Requesting access token from WPS API', {
        code: '***'
      });

      // 构建GET请求的URL，参数放在query中
      const params = new URLSearchParams({
        appid: this.appid,
        appkey: this.appkey,
        code: code
      });

      const url = `${this.baseUrl}/oauthapi/v2/token?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Stratix-Gateway/1.0.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('WPS API token request failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(
          `WPS API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as WPSTokenResponse | WPSApiError;

      // 检查是否为错误响应
      if ('error' in data) {
        this.logger.error('WPS API returned error', data);
        throw new Error(
          `WPS API error: ${data.error} - ${data.error_description || 'Unknown error'}`
        );
      }

      // 检查result状态码
      const tokenResponse = data as WPSTokenResponse;
      if (tokenResponse.result !== 0) {
        this.logger.error('WPS API returned non-zero result', {
          result: tokenResponse.result
        });
        throw new Error(`WPS API error: result code ${tokenResponse.result}`);
      }

      this.logger.info('Successfully obtained access token from WPS API');
      return tokenResponse;
    } catch (error) {
      this.logger.error('Failed to get access token from WPS API:', error);

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while getting access token');
    }
  }

  /**
   * 使用访问令牌获取用户信息
   */
  async getUserInfo(accessToken: string): Promise<WPSUserInfo> {
    try {
      this.logger.debug('Requesting user info from WPS API');

      // 构建GET请求的URL，参数放在query中
      const params = new URLSearchParams({
        access_token: accessToken,
        appid: this.appid
      });

      const url = `${this.baseUrl}/oauthapi/v3/user?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Stratix-Gateway/1.0.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('WPS API user info request failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(
          `WPS API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as WPSUserInfoResponse | WPSApiError;

      // 检查是否为错误响应
      if ('error' in data) {
        this.logger.error('WPS API returned error', data);
        throw new Error(
          `WPS API error: ${data.error} - ${data.error_description || 'Unknown error'}`
        );
      }

      // 检查result状态码
      const userResponse = data as WPSUserInfoResponse;
      if (userResponse.result !== 0) {
        this.logger.error('WPS API returned non-zero result', {
          result: userResponse.result
        });
        throw new Error(`WPS API error: result code ${userResponse.result}`);
      }

      this.logger.info('Successfully obtained user info from WPS API', {
        openid: userResponse.user.openid,
        nickname: userResponse.user.nickname,
        unionId: userResponse.user.third_union_id
      });

      return userResponse.user;
    } catch (error) {
      this.logger.error('Failed to get user info from WPS API:', error);

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while getting user info');
    }
  }
}
