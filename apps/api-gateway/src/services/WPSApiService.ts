/**
 * WPS开放平台API服务
 * 负责与金山WPS开放平台的API交互
 */

import { AwilixContainer, RESOLVER, type Logger } from '@stratix/core';
import { RedisAdapter } from '@stratix/redis';
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
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 提前过期时间（秒），避免在过期边界时出现问题 */
  earlyExpireBuffer: number;
  /** 最小缓存时间（秒） */
  minCacheTtl: number;
  /** 最大缓存时间（秒） */
  maxCacheTtl: number;
  /** 降级缓存时间（秒） */
  fallbackCacheTtl: number;
}

/**
 * 缓存数据接口
 */
export interface CachedTokenData {
  jsapi_token: string;
  expires_at: number; // Unix时间戳（毫秒）
  cached_at: number; // 缓存时间戳（毫秒）
}

export interface CachedTicketData {
  jsapi_ticket: string;
  expires_at: number; // Unix时间戳（毫秒）
  cached_at: number; // 缓存时间戳（毫秒）
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

/**
 * 缓存相关常量
 */
const CACHE_KEYS = {
  JSAPI_TOKEN: (appId: string) => `wps:jsapi:token:${appId}`,
  JSAPI_TICKET: (appId: string) => `wps:jsapi:ticket:${appId}`,
  CACHE_META: (appId: string, type: 'token' | 'ticket') =>
    `wps:jsapi:meta:${appId}:${type}`
};

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  earlyExpireBuffer: 300, // 5分钟
  minCacheTtl: 60, // 1分钟
  maxCacheTtl: 7200, // 2小时
  fallbackCacheTtl: 300 // 5分钟
};

export default class WPSApiService implements IWPSApiService {
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      const orgOptions = container.resolve('options');
      return {
        options: orgOptions.wps || {}
      };
    }
  };

  // 内存缓存降级存储
  private memoryCache = new Map<string, { data: any; expiresAt: number }>();
  private cacheConfig: CacheConfig;

  constructor(
    private logger: Logger,
    private options: WPSConfig,
    private redisClient: RedisAdapter
  ) {
    this.cacheConfig = DEFAULT_CACHE_CONFIG;
    if (!this.options.appid || !this.options.appkey) {
      this.logger.warn('WPS API credentials not configured properly');
    }

    this.logger.info('✅ WPSApiService initialized', {
      baseUrl: this.options.baseUrl,
      appid: this.options.appid ? '***' : 'not set',
      redisEnabled: !!this.redisClient
    });
  }

  /**
   * 计算缓存TTL
   * @param expiresIn API返回的过期时间（秒）
   * @returns 实际缓存TTL（秒）
   */
  private calculateCacheTtl(expiresIn: number): number {
    // 减去提前过期缓冲时间
    const adjustedTtl = expiresIn - this.cacheConfig.earlyExpireBuffer;

    // 确保在最小和最大范围内
    return Math.max(
      this.cacheConfig.minCacheTtl,
      Math.min(adjustedTtl, this.cacheConfig.maxCacheTtl)
    );
  }

  /**
   * 从Redis获取缓存数据
   */
  private async getFromRedisCache<T>(key: string): Promise<T | null> {
    if (!this.redisClient) {
      return null;
    }

    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        const data = JSON.parse(cached) as T;
        this.logger.debug('Cache hit from Redis', { key });
        return data;
      }
    } catch (error) {
      this.logger.warn('Redis cache get failed, falling back', { key, error });
    }

    return null;
  }

  /**
   * 设置Redis缓存数据
   */
  private async setToRedisCache<T>(
    key: string,
    data: T,
    ttlSeconds: number
  ): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      await this.redisClient.set(key, JSON.stringify(data), ttlSeconds);
      this.logger.debug('Data cached to Redis', { key, ttl: ttlSeconds });
    } catch (error) {
      this.logger.warn('Redis cache set failed', { key, error });
    }
  }

  /**
   * 从内存缓存获取数据（降级机制）
   */
  private getFromMemoryCache<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug('Cache hit from memory fallback', { key });
      return cached.data as T;
    }

    if (cached) {
      this.memoryCache.delete(key);
    }

    return null;
  }

  /**
   * 设置内存缓存数据（降级机制）
   */
  private setToMemoryCache<T>(key: string, data: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { data, expiresAt });
    this.logger.debug('Data cached to memory fallback', {
      key,
      ttl: ttlSeconds
    });
  }

  /**
   * 清理过期的内存缓存
   */
  private cleanupExpiredMemoryCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug('Cleaned up expired memory cache entries', {
        cleanedCount,
        remainingCount: this.memoryCache.size
      });
    }
  }

  /**
   * 获取缓存统计信息（用于监控）
   */
  public getCacheStats(): {
    memoryCache: { size: number; keys: string[] };
    redisEnabled: boolean;
  } {
    this.cleanupExpiredMemoryCache();

    return {
      memoryCache: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys())
      },
      redisEnabled: !!this.redisClient
    };
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
   * 使用WPS-3签名方式获取服务端访问令牌，支持Redis缓存
   */
  async getServerAccessToken(): Promise<WPSJSAPITokenResponse> {
    const cacheKey = CACHE_KEYS.JSAPI_TOKEN(this.options.appid);

    try {
      // 1. 尝试从Redis缓存获取
      const cachedData =
        await this.getFromRedisCache<CachedTokenData>(cacheKey);
      if (cachedData && cachedData.expires_at > Date.now()) {
        this.logger.debug('Using cached JSAPI token from Redis');
        return {
          result: 0,
          jsapi_token: cachedData.jsapi_token,
          expires_in: Math.floor((cachedData.expires_at - Date.now()) / 1000)
        };
      }

      // 2. 尝试从内存缓存获取（降级）
      const memoryCachedData =
        this.getFromMemoryCache<CachedTokenData>(cacheKey);
      if (memoryCachedData && memoryCachedData.expires_at > Date.now()) {
        this.logger.debug('Using cached JSAPI token from memory fallback');
        return {
          result: 0,
          jsapi_token: memoryCachedData.jsapi_token,
          expires_in: Math.floor(
            (memoryCachedData.expires_at - Date.now()) / 1000
          )
        };
      }

      // 3. 缓存未命中，调用API获取新token
      this.logger.debug(
        'Cache miss, requesting server access token from WPS API using WPS-3 signature'
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

      // 4. 缓存新获取的token
      const now = Date.now();
      const expiresAt = now + tokenResponse.expires_in * 1000;
      const cacheData: CachedTokenData = {
        jsapi_token: tokenResponse.jsapi_token,
        expires_at: expiresAt,
        cached_at: now
      };

      // 计算缓存TTL
      const cacheTtl = this.calculateCacheTtl(tokenResponse.expires_in);

      // 存储到Redis缓存
      await this.setToRedisCache(cacheKey, cacheData, cacheTtl);

      // 同时存储到内存缓存作为降级
      this.setToMemoryCache(
        cacheKey,
        cacheData,
        this.cacheConfig.fallbackCacheTtl
      );

      return tokenResponse;
    } catch (error) {
      this.logger.error(
        'Failed to get server access token from WPS API:',
        error
      );

      // 5. API调用失败时的降级策略：尝试返回过期的缓存数据
      try {
        const expiredCachedData =
          await this.getFromRedisCache<CachedTokenData>(cacheKey);
        if (expiredCachedData) {
          this.logger.warn(
            'API failed, using expired cached JSAPI token as fallback',
            {
              expiredAt: new Date(expiredCachedData.expires_at).toISOString(),
              cachedAt: new Date(expiredCachedData.cached_at).toISOString()
            }
          );
          return {
            result: 0,
            jsapi_token: expiredCachedData.jsapi_token,
            expires_in: 60 // 给1分钟的临时有效期
          };
        }

        const expiredMemoryData =
          this.getFromMemoryCache<CachedTokenData>(cacheKey);
        if (expiredMemoryData) {
          this.logger.warn(
            'API failed, using expired memory cached JSAPI token as fallback'
          );
          return {
            result: 0,
            jsapi_token: expiredMemoryData.jsapi_token,
            expires_in: 60 // 给1分钟的临时有效期
          };
        }
      } catch (fallbackError) {
        this.logger.error(
          'Fallback cache retrieval also failed:',
          fallbackError
        );
      }

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
   * 使用WPS-3签名方式获取JS-API调用所需的ticket，支持Redis缓存
   */
  async getJSAPITicket(accessToken: string): Promise<WPSJSAPITicketResponse> {
    const cacheKey = CACHE_KEYS.JSAPI_TICKET(this.options.appid);

    try {
      // 1. 尝试从Redis缓存获取
      const cachedData =
        await this.getFromRedisCache<CachedTicketData>(cacheKey);
      if (cachedData && cachedData.expires_at > Date.now()) {
        this.logger.debug('Using cached JSAPI ticket from Redis');
        return {
          result: 0,
          jsapi_ticket: cachedData.jsapi_ticket,
          expires_in: Math.floor((cachedData.expires_at - Date.now()) / 1000)
        };
      }

      // 2. 尝试从内存缓存获取（降级）
      const memoryCachedData =
        this.getFromMemoryCache<CachedTicketData>(cacheKey);
      if (memoryCachedData && memoryCachedData.expires_at > Date.now()) {
        this.logger.debug('Using cached JSAPI ticket from memory fallback');
        return {
          result: 0,
          jsapi_ticket: memoryCachedData.jsapi_ticket,
          expires_in: Math.floor(
            (memoryCachedData.expires_at - Date.now()) / 1000
          )
        };
      }

      // 3. 缓存未命中，调用API获取新ticket
      this.logger.debug(
        'Cache miss, requesting JSAPI ticket from WPS API using WPS-3 signature'
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

      // 4. 缓存新获取的ticket
      const now = Date.now();
      const expiresAt = now + ticketResponse.expires_in * 1000;
      const cacheData: CachedTicketData = {
        jsapi_ticket: ticketResponse.jsapi_ticket,
        expires_at: expiresAt,
        cached_at: now
      };

      // 计算缓存TTL
      const cacheTtl = this.calculateCacheTtl(ticketResponse.expires_in);

      // 存储到Redis缓存
      await this.setToRedisCache(cacheKey, cacheData, cacheTtl);

      // 同时存储到内存缓存作为降级
      this.setToMemoryCache(
        cacheKey,
        cacheData,
        this.cacheConfig.fallbackCacheTtl
      );

      return ticketResponse;
    } catch (error) {
      this.logger.error('Failed to get JSAPI ticket from WPS API:', error);

      // 5. API调用失败时的降级策略：尝试返回过期的缓存数据
      try {
        const expiredCachedData =
          await this.getFromRedisCache<CachedTicketData>(cacheKey);
        if (expiredCachedData) {
          this.logger.warn(
            'API failed, using expired cached JSAPI ticket as fallback',
            {
              expiredAt: new Date(expiredCachedData.expires_at).toISOString(),
              cachedAt: new Date(expiredCachedData.cached_at).toISOString()
            }
          );
          return {
            result: 0,
            jsapi_ticket: expiredCachedData.jsapi_ticket,
            expires_in: 60 // 给1分钟的临时有效期
          };
        }

        const expiredMemoryData =
          this.getFromMemoryCache<CachedTicketData>(cacheKey);
        if (expiredMemoryData) {
          this.logger.warn(
            'API failed, using expired memory cached JSAPI ticket as fallback'
          );
          return {
            result: 0,
            jsapi_ticket: expiredMemoryData.jsapi_ticket,
            expires_in: 60 // 给1分钟的临时有效期
          };
        }
      } catch (fallbackError) {
        this.logger.error(
          'Fallback cache retrieval also failed:',
          fallbackError
        );
      }

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
