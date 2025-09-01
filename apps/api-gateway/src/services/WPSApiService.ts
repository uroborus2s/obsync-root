/**
 * WPS开放平台API服务
 * 负责与金山WPS开放平台的API交互
 */

import { AwilixContainer, RESOLVER, type Logger } from '@stratix/core';
import { createHash } from 'crypto';

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

export interface WPSConfig {
  baseUrl: string;
  appid: string;
  appkey: string;
}

/**
 * WPS JSAPI Token响应接口
 */
export interface WPSJSAPITokenResponse {
  /** 状态码，非0表示失败 */
  result: number;
  /** 错误信息 */
  msg?: string;
  /** 服务端凭证 */
  jsapi_token: string;
  /** 凭证有效期，单位为秒 */
  expires_in: number;
}

/**
 * WPS JSAPI Ticket响应接口
 */
export interface WPSJSAPITicketResponse {
  /** 状态码，非0表示失败 */
  result: number;
  /** 错误信息 */
  msg?: string;
  /** JS-API调用凭证 */
  jsapi_ticket: string;
  /** 凭证有效期，单位为秒 */
  expires_in: number;
}

/**
 * WPS JSAPI配置接口（返回给前端的配置信息）
 */
export interface WPSJSAPIConfig {
  /** 监权的应用ID */
  appId: string;
  /** 生成签名时用到的时间戳 */
  timeStamp: number;
  /** 生成签名时用到的随机字符串 */
  nonceStr: string;
  /** 生成的签名 */
  signature: string;
  url: string;
}

/**
 * WPS API服务接口
 */

export interface IWPSApiService {
  /**
   * 使用授权码获取访问令牌
   */
  getAccessToken(code: string): Promise<WPSTokenResponse>;

  /**
   * 使用访问令牌获取用户信息
   */
  getUserInfo(accessToken: string): Promise<WPSUserInfo>;

  /**
   * 获取服务端凭证（用于JSAPI）
   */
  getServerAccessToken(): Promise<WPSJSAPITokenResponse>;

  /**
   * 获取JS-API调用凭证
   */
  getJSAPITicket(accessToken: string): Promise<WPSJSAPITicketResponse>;
}

export default class WPSApiService implements IWPSApiService {
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      const orgOptions = container.resolve('options');
      return {
        options: orgOptions.wps || {}
      };
    }
  };

  constructor(
    private logger: Logger,
    private options: WPSConfig
  ) {
    if (!this.options.appid || !this.options.appkey) {
      this.logger.warn('WPS API credentials not configured properly');
    }

    this.logger.info('✅ WPSApiService initialized', {
      baseUrl: this.options.baseUrl,
      appid: this.options.appid ? '***' : 'not set'
    });
  }

  /**
   * 获取WPS配置（供外部使用）
   */
  getConfig(): WPSConfig {
    return this.options;
  }

  /**
   * 生成RFC1123格式的日期字符串
   */
  private generateRFC1123Date(): string {
    return new Date().toUTCString();
  }

  /**
   * 计算字符串的MD5哈希值（十六进制）
   */
  private calculateMD5(content: string): string {
    return createHash('md5').update(content, 'utf8').digest('hex');
  }

  /**
   * 计算SHA1哈希值（十六进制）
   */
  private calculateSHA1(content: string): string {
    return createHash('sha1').update(content, 'utf8').digest('hex');
  }

  /**
   * 生成WPS-3签名
   * @param secretKey 应用密钥
   * @param contentMd5 请求体的MD5值
   * @param url 请求URL（不包含域名，只包含path和query）
   * @param contentType 内容类型
   * @param date RFC1123格式的日期
   */
  private generateWPS3Signature(
    secretKey: string,
    contentMd5: string,
    url: string,
    contentType: string,
    date: string
  ): string {
    // 按照WPS-3签名算法：sha1(ToLower(SecretKey) + Content-Md5 + URL + Content-Type + Date)
    const signString =
      secretKey.toLowerCase() + contentMd5 + url + contentType + date;
    return this.calculateSHA1(signString);
  }

  /**
   * 生成WPS-3认证头
   * @param appId 应用ID
   * @param signature 签名
   */
  private generateWPS3AuthHeader(appId: string, signature: string): string {
    return `WPS-3:${appId}:${signature}`;
  }

  /**
   * 生成随机字符串（用于JSAPI签名）
   * @param length 字符串长度，默认16位
   */
  private generateNonceStr(length: number = 16): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成JSAPI签名
   * 根据jsapi_ticket、nonceStr、timestamp、url计算签名
   *
   * 签名算法：
   * 1. 按照键值对格式拼接字符串：jsapi_ticket=xxx&noncestr=xxx&timestamp=xxx&url=xxx
   * 2. 对拼接字符串进行SHA1哈希计算
   * 3. 返回十六进制字符串
   *
   * @param jsapiTicket JS-API调用凭证
   * @param nonceStr 随机字符串
   * @param timestamp 时间戳（毫秒级，如：1510045655000）
   * @param url 当前网页的URL（需要进行URL编码处理）
   * @returns SHA1签名的十六进制字符串
   */
  private generateJSAPISignature(
    jsapiTicket: string,
    nonceStr: string,
    timestamp: number,
    url: string
  ): string {
    // 按照WPS JSAPI签名算法：使用URL键值对格式拼接字符串
    const verifyStr = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;

    // 对拼接的字符串进行SHA1签名
    return this.calculateSHA1(verifyStr);
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
        appid: this.options.appid,
        appkey: this.options.appkey,
        code: code
      });

      const url = `${this.options.baseUrl}/oauthapi/v2/token?${params.toString()}`;

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
        appid: this.options.appid
      });

      const url = `${this.options.baseUrl}/oauthapi/v3/user?${params.toString()}`;

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

  /**
   * 获取服务端凭证（用于JSAPI）
   * 使用WPS-3签名方式获取服务端访问令牌
   */
  async getServerAccessToken(): Promise<WPSJSAPITokenResponse> {
    try {
      this.logger.debug(
        'Requesting server access token from WPS API using WPS-3 signature'
      );

      // 请求URL和基本信息
      const requestUrl = '/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token';
      const fullUrl = `${this.options.baseUrl}${requestUrl}`;
      const contentType = 'application/json';
      const requestBody = ''; // GET请求，body为空

      // 生成必要的头部信息
      const date = this.generateRFC1123Date();
      const contentMd5 = this.calculateMD5(requestBody);

      // 生成WPS-3签名
      const signature = this.generateWPS3Signature(
        this.options.appkey, // 使用appkey作为secretKey
        contentMd5,
        requestUrl, // 只包含path，不包含域名
        contentType,
        date
      );

      // 生成认证头
      const authHeader = this.generateWPS3AuthHeader(
        this.options.appid,
        signature
      );

      this.logger.debug('WPS-3 signature details', {
        url: requestUrl,
        contentType,
        date,
        contentMd5,
        authHeader: authHeader.substring(0, 20) + '...' // 只显示前20个字符用于调试
      });

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': contentType,
          Date: date,
          'Content-Md5': contentMd5,
          'X-Auth': authHeader,
          'User-Agent': 'Stratix-Gateway/1.0.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('WPS API server token request failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          requestUrl,
          authHeader: authHeader.substring(0, 20) + '...'
        });
        throw new Error(
          `WPS API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as
        | WPSJSAPITokenResponse
        | WPSApiError;

      // 检查是否为错误响应
      if ('error' in data) {
        this.logger.error('WPS API returned error', data);
        throw new Error(
          `WPS API error: ${data.error} - ${data.error_description || 'Unknown error'}`
        );
      }

      // 检查result状态码
      const tokenResponse = data as WPSJSAPITokenResponse;
      if (tokenResponse.result !== 0) {
        this.logger.error('WPS API returned non-zero result', {
          result: tokenResponse.result,
          msg: tokenResponse.msg
        });
        throw new Error(
          `WPS API error: result code ${tokenResponse.result}, message: ${tokenResponse.msg}`
        );
      }

      this.logger.info(
        'Successfully obtained server access token from WPS API using WPS-3 signature',
        {
          expires_in: tokenResponse.expires_in
        }
      );

      return tokenResponse;
    } catch (error) {
      this.logger.error(
        'Failed to get server access token from WPS API:',
        error
      );

      if (error instanceof Error) {
        throw error;
      }
      throw new Error(
        'Unknown error occurred while getting server access token'
      );
    }
  }

  /**
   * 获取JS-API调用凭证
   * 使用WPS-3签名方式获取JS-API调用所需的ticket
   */
  async getJSAPITicket(accessToken: string): Promise<WPSJSAPITicketResponse> {
    try {
      this.logger.debug(
        'Requesting JSAPI ticket from WPS API using WPS-3 signature'
      );

      // 请求URL和基本信息
      const requestUrl = `/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_ticket?jsapi_token=${accessToken}`;
      const fullUrl = `${this.options.baseUrl}${requestUrl}`;
      const contentType = 'application/json';
      const requestBody = ''; // GET请求，body为空

      // 生成必要的头部信息
      const date = this.generateRFC1123Date();
      const contentMd5 = this.calculateMD5(requestBody);

      // 生成WPS-3签名
      const signature = this.generateWPS3Signature(
        this.options.appkey, // 使用appkey作为secretKey
        contentMd5,
        requestUrl, // 包含query参数的完整路径
        contentType,
        date
      );

      // 生成认证头
      const authHeader = this.generateWPS3AuthHeader(
        this.options.appid,
        signature
      );

      this.logger.debug('WPS-3 signature details for JSAPI ticket', {
        url: requestUrl,
        contentType,
        date,
        contentMd5,
        authHeader: authHeader.substring(0, 20) + '...' // 只显示前20个字符用于调试
      });

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': contentType,
          Date: date,
          'Content-Md5': contentMd5,
          'X-Auth': authHeader,
          'User-Agent': 'Stratix-Gateway/1.0.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('WPS API JSAPI ticket request failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          requestUrl,
          authHeader: authHeader.substring(0, 20) + '...'
        });
        throw new Error(
          `WPS API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as
        | WPSJSAPITicketResponse
        | WPSApiError;

      // 检查是否为错误响应
      if ('error' in data) {
        this.logger.error('WPS API returned error', data);
        throw new Error(
          `WPS API error: ${data.error} - ${data.error_description || 'Unknown error'}`
        );
      }

      // 检查result状态码
      const ticketResponse = data as WPSJSAPITicketResponse;
      if (ticketResponse.result !== 0) {
        this.logger.error('WPS API returned non-zero result', {
          result: ticketResponse.result,
          msg: ticketResponse.msg
        });
        throw new Error(
          `WPS API error: result code ${ticketResponse.result}, message: ${ticketResponse.msg}`
        );
      }

      this.logger.info(
        'Successfully obtained JSAPI ticket from WPS API using WPS-3 signature',
        {
          expires_in: ticketResponse.expires_in
        }
      );

      return ticketResponse;
    } catch (error) {
      this.logger.error('Failed to get JSAPI ticket from WPS API:', error);

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while getting JSAPI ticket');
    }
  }

  /**
   * 获取WPS JSAPI配置信息
   * 完整流程：获取服务端令牌 -> 获取JSAPI票据 -> 计算签名 -> 返回前端配置
   * @param url 当前网页的URL（需要进行URL编码处理）
   */
  async getWPSJSAPIConfig(url: string): Promise<WPSJSAPIConfig> {
    try {
      this.logger.debug('Getting WPS JSAPI config for URL:', { url });

      // Step 1: 获取服务端访问令牌
      const tokenResponse = await this.getServerAccessToken();

      // Step 2: 获取JSAPI调用凭证
      const ticketResponse = await this.getJSAPITicket(
        tokenResponse.jsapi_token
      );

      // Step 3: 计算签名
      const timeStamp = Date.now(); // 当前时间戳（毫秒级）
      const nonceStr = this.generateNonceStr(16); // 生成16位随机字符串

      // 生成JSAPI签名
      const signature = this.generateJSAPISignature(
        ticketResponse.jsapi_ticket,
        nonceStr,
        timeStamp,
        url
      );

      const config: WPSJSAPIConfig = {
        appId: this.options.appid,
        timeStamp,
        nonceStr,
        signature,
        url
      };

      this.logger.info('Successfully generated WPS JSAPI config', {
        appId: config.appId,
        timeStamp: config.timeStamp,
        nonceStr: config.nonceStr,
        url,
        // 不记录完整签名，只记录前几位用于调试
        signaturePrefix: signature.substring(0, 8) + '...'
      });

      return config;
    } catch (error) {
      this.logger.error('Failed to get WPS JSAPI config:', error);

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while getting WPS JSAPI config');
    }
  }
}
