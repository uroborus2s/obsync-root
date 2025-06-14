import { createError } from '../core/error.js';
import type { HttpClient } from '../core/http-client.js';
import type { AccessToken, WpsConfig } from '../types/index.js';

/**
 * 认证管理器
 * 负责access_token的获取、刷新和管理
 */
export class AuthManager {
  private accessToken?: AccessToken;
  private tokenExpireTime?: number;
  private config: WpsConfig;

  constructor(
    private readonly wasV7HttpClient: HttpClient,
    config: WpsConfig
  ) {
    this.config = config;
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

      const response: any = await this.wasV7HttpClient.post(
        '/oauth2/token',
        formData.toString(),
        {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      );

      this.tokenExpireTime = Date.now() + response.expires_in * 1000;

      // 设置到HTTP客户端
      this.wasV7HttpClient.setAccessToken(response.access_token);

      return response.access_token;
    } catch (error) {
      throw createError.auth('获取应用访问凭证失败', error);
    }
  }

  /**
   * 获取租户访问凭证
   * 用于租户级别的API调用
   */
  async getTenantAccessToken(tenantKey: string): Promise<string> {
    try {
      // 先获取应用访问凭证
      if (!this.isTokenValid()) {
        await this.getAppAccessToken();
      }

      const response = await this.wasV7HttpClient.post<AccessToken>(
        '/v1/oauth2/tenant/access_token',
        {
          tenant_key: tenantKey
        }
      );

      return response.data.tenant_access_token || response.data.access_token;
    } catch (error) {
      throw createError.auth('获取租户访问凭证失败', error);
    }
  }

  /**
   * 获取用户访问凭证
   * 通过授权码获取用户访问凭证
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/get-token/get-user-access-token.html
   */
  async getUserAccessToken(
    code: string,
    redirectUri?: string
  ): Promise<AccessToken> {
    try {
      // 使用form-urlencoded格式发送请求
      const formData = new URLSearchParams();
      formData.append('grant_type', 'authorization_code');
      formData.append('client_id', this.config.appId);
      formData.append('client_secret', this.config.appSecret);
      formData.append('code', code);

      if (redirectUri) {
        formData.append('redirect_uri', redirectUri);
      }

      const response: any = await this.wasV7HttpClient.post(
        '/oauth2/token',
        formData.toString(),
        {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      );

      return {
        access_token: response.access_token,
        token_type: response.token_type || 'bearer',
        expires_in: response.expires_in,
        refresh_token: response.refresh_token,
        scope: response.scope
      };
    } catch (error) {
      throw createError.auth('获取用户访问凭证失败', error);
    }
  }

  /**
   * 获取用户访问凭证
   * 通过授权码获取用户访问凭证
   * @see https://open-xz.wps.cn/pages/server/API-certificate/access-token/org-app/
   */
  async getXZUserAccessToken(code: string): Promise<AccessToken> {
    try {
      const response: any = await this.wasV7HttpClient.get(
        '/oauthapi/v2/token',
        {
          appid: this.config.appId,
          appkey: this.config.appSecret,
          code
        },
        {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      );

      return {
        access_token: response.token.access_token,
        expires_in: response.token.expires_in,
        refresh_token: response.token.refresh_token
      };
    } catch (error) {
      throw createError.auth('获取用户访问凭证失败', error);
    }
  }

  /**
   * 获取当前用户信息
   * 获取当前访问令牌对应的用户详细信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/user-authorization/user-info.html
   * @returns 用户信息
   */
  async getXZCurrentUserInfo(token: string): Promise<any> {
    try {
      const response = (await this.wasV7HttpClient.get('/oauthapi/v3/user', {
        access_token: token,
        appid: this.config.appId
      })) as any;

      if (response.result !== 0) {
        throw createError.auth(`获取用户信息失败: ${response.data.msg}`);
      }

      return response.user;
    } catch (error) {
      throw createError.auth('获取用户信息失败', error);
    }
  }

  /**
   * 刷新用户访问凭证
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/get-token/refresh-user-access-token.html
   */
  async refreshUserAccessToken(refreshToken: string): Promise<AccessToken> {
    try {
      // 使用form-urlencoded格式发送请求
      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('client_id', this.config.appId);
      formData.append('client_secret', this.config.appSecret);
      formData.append('refresh_token', refreshToken);

      const response: any = await this.wasV7HttpClient.post(
        '/oauth2/token',
        formData.toString(),
        {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      );

      this.accessToken = {
        access_token: response.access_token,
        token_type: response.token_type || 'bearer',
        expires_in: response.expires_in,
        refresh_token: response.refresh_token,
        scope: response.scope
      };
      this.tokenExpireTime = Date.now() + response.expires_in * 1000;

      // 设置到HTTP客户端
      this.wasV7HttpClient.setAccessToken(response.access_token);

      return this.accessToken;
    } catch (error) {
      throw createError.auth('刷新用户访问凭证失败', error);
    }
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

  /**
   * 设置访问凭证
   */
  setAccessToken(token: AccessToken): void {
    this.accessToken = token;
    this.tokenExpireTime = Date.now() + token.expires_in * 1000;
    this.wasV7HttpClient.setAccessToken(token.access_token);
  }

  /**
   * 清除访问凭证
   */
  clearAccessToken(): void {
    this.accessToken = undefined;
    this.tokenExpireTime = undefined;
    this.wasV7HttpClient.clearAccessToken();
  }

  /**
   * 生成授权URL
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/user-authorization/flow.html
   */
  generateAuthUrl(
    redirectUri: string,
    scope: string = 'user:read',
    state?: string
  ): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope
    });

    if (state) {
      params.append('state', state);
    }

    return `https://openapi.wps.cn/oauth2/auth?${params.toString()}`;
  }

  /**
   * 验证回调参数
   */
  validateCallback(code?: string, state?: string, error?: string): void {
    if (error) {
      throw createError.auth(`授权失败: ${error}`);
    }

    if (!code) {
      throw createError.auth('授权码不能为空');
    }
  }

  /**
   * 自动刷新token（如果需要）
   */
  async ensureValidToken(): Promise<void> {
    if (!this.isTokenValid()) {
      if (this.accessToken?.refresh_token) {
        await this.refreshUserAccessToken(this.accessToken.refresh_token);
      } else {
        throw createError.auth('访问凭证已过期，需要重新授权');
      }
    }
  }
}
