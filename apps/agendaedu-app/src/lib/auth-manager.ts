/**
 * WPS授权管理器
 * 处理用户授权流程和token管理
 */

export interface WpsAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  baseUrl?: string;
  authUrl?: string;
  tokenUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

export class WpsAuthManager {
  private config: WpsAuthConfig;
  private tokens: AuthTokens | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;

  constructor(config: WpsAuthConfig) {
    this.config = {
      baseUrl: 'https://openapi.wps.cn',
      authUrl: 'https://openapi.wps.cn/oauthapi/v2/authorize',
      tokenUrl: '/oauthapi/v3/user/token',
      ...config
    };

    // 从localStorage恢复token
    this.loadTokensFromStorage();
  }

  /**
   * 检查是否已授权
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && !this.isTokenExpired();
  }

  /**
   * 检查token是否过期
   */
  private isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt;
  }

  /**
   * 检查token是否即将过期（5分钟内）
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt - 5 * 60 * 1000;
  }

  /**
   * 获取有效的访问token
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.tokens) return null;

    // 如果token即将过期，尝试刷新
    if (this.isTokenExpiringSoon()) {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        console.error('刷新token失败:', error);
        this.clearTokens();
        return null;
      }
    }

    return this.tokens?.accessToken || null;
  }

  /**
   * 构造授权URL
   * 根据新的重构要求，重定向到指定的授权URL
   */
  getAuthUrl(state?: string): string {
    // 构建WPS授权URL，按照重构要求使用指定的参数
    const currentUrl = state || window.location.href;
    const encodedState = btoa(currentUrl); // 将当前页面URL进行base64编码

    const params = new URLSearchParams({
      appid: 'AK20250614WBSGPX',
      response_type: 'code',
      redirect_uri: 'https://kwps.jlufe.edu.cn/api/auth/authorization', // 不需要额外的encodeURIComponent，URLSearchParams会自动处理
      scope: 'user_info',
      state: encodedState
    });

    const authUrl = `https://openapi.wps.cn/oauthapi/v2/authorize?${params.toString()}`;
    console.log('🔗 生成的授权URL:', authUrl);
    return authUrl;
  }

  /**
   * 跳转到授权页面
   */
  redirectToAuth(state?: string): void {
    const authUrl = this.getAuthUrl(state);
    console.log('authUrl', authUrl);
    window.location.href = authUrl;
  }

  /**
   * 处理授权回调
   */
  async handleAuthCallback(code: string): Promise<AuthTokens> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}${this.config.tokenUrl}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code,
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          `获取token失败: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(`获取token失败: ${data.msg || '未知错误'}`);
      }

      const tokens: AuthTokens = {
        accessToken: data.data.access_token,
        refreshToken: data.data.refresh_token,
        expiresIn: data.data.expires_in,
        expiresAt: Date.now() + data.data.expires_in * 1000
      };

      this.setTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('处理授权回调失败:', error);
      throw error;
    }
  }

  /**
   * 刷新访问token
   */
  async refreshAccessToken(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('没有refresh token');
    }

    // 防止并发刷新
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshToken();

    try {
      const tokens = await this.refreshPromise;
      return tokens;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * 执行token刷新
   */
  private async doRefreshToken(): Promise<AuthTokens> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/oauthapi/v3/user/token/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refresh_token: this.tokens!.refreshToken
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          `刷新token失败: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(`刷新token失败: ${data.msg || '未知错误'}`);
      }

      const tokens: AuthTokens = {
        accessToken: data.data.access_token,
        refreshToken: data.data.refresh_token,
        expiresIn: data.data.expires_in,
        expiresAt: Date.now() + data.data.expires_in * 1000
      };

      this.setTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('刷新token失败:', error);
      this.clearTokens();
      throw error;
    }
  }

  /**
   * 设置tokens
   */
  private setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
    this.saveTokensToStorage();
  }

  /**
   * 清除tokens
   */
  clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem('wps_auth_tokens');
  }

  /**
   * 从localStorage加载tokens
   */
  private loadTokensFromStorage(): void {
    try {
      const stored = localStorage.getItem('wps_auth_tokens');
      if (stored) {
        const tokens = JSON.parse(stored) as AuthTokens;
        // 检查是否过期
        if (Date.now() < tokens.expiresAt) {
          this.tokens = tokens;
        } else {
          localStorage.removeItem('wps_auth_tokens');
        }
      }
    } catch (error) {
      console.error('加载tokens失败:', error);
      localStorage.removeItem('wps_auth_tokens');
    }
  }

  /**
   * 保存tokens到localStorage
   */
  private saveTokensToStorage(): void {
    if (this.tokens) {
      try {
        localStorage.setItem('wps_auth_tokens', JSON.stringify(this.tokens));
      } catch (error) {
        console.error('保存tokens失败:', error);
      }
    }
  }

  /**
   * 登出
   */
  logout(): void {
    this.clearTokens();
  }
}

// 创建全局授权管理器实例
export const authManager = new WpsAuthManager({
  clientId: import.meta.env.VITE_WPS_CLIENT_ID || '',
  redirectUri:
    import.meta.env.VITE_WPS_REDIRECT_URI ||
    `${window.location.origin}/app/auth/callback`,
  scope: 'user:read,drive:read,drive:write'
});
