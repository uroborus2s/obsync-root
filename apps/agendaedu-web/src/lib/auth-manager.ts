/**
 * WPS授权管理器 - Web端
 * 处理WPS OAuth认证流程，包括直接跳转授权、token管理和自动刷新
 * 根据WPS开放平台文档实现: https://open-xz.wps.cn/pages/server/API-certificate/access-token/org-app/
 */

interface LoginSuccessData {
  code: string
  userInfo?: {
    user_id: string
    nickname: string
    avatar?: string
  }
  state: string
}

export interface WpsAuthConfig {
  clientId: string
  redirectUri: string
  scope: string
  baseUrl?: string
  authUrl?: string
  tokenUrl?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  expiresAt: number
}

export interface WpsUserInfo {
  id: string
  name: string
  email?: string
  avatar?: string
}

export class WpsAuthManager {
  private config: WpsAuthConfig
  private tokens: AuthTokens | null = null
  private refreshPromise: Promise<AuthTokens> | null = null

  constructor(config: WpsAuthConfig) {
    this.config = {
      baseUrl: 'https://openapi.wps.cn',
      authUrl: 'https://openapi.wps.cn/oauth2/auth',
      tokenUrl: '/oauthapi/v3/user/token',
      ...config,
    }

    // 从localStorage恢复token
    this.loadTokensFromStorage()
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && !this.isTokenExpired()
  }

  /**
   * 检查token是否过期
   */
  private isTokenExpired(): boolean {
    if (!this.tokens) return true
    return Date.now() >= this.tokens.expiresAt
  }

  /**
   * 检查token是否即将过期（30分钟内）
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.tokens) return true
    return Date.now() >= this.tokens.expiresAt - 30 * 60 * 1000
  }

  /**
   * 获取访问token
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.tokens) return null

    if (this.isTokenExpired()) {
      try {
        await this.refreshAccessToken()
      } catch {
        return null
      }
    } else if (this.isTokenExpiringSoon()) {
      // 异步刷新，不等待结果
      this.refreshAccessToken().catch(() => {
        // 静默处理错误
      })
    }

    return this.tokens?.accessToken || null
  }

  /**
   * 构造授权URL - 根据WPS开放平台文档
   * https://open-xz.wps.cn/pages/server/API-certificate/access-token/org-app/
   */
  getAuthUrl(state?: string): string {
    const randomState = Math.random().toString(36).substring(2, 15)
    const finalState = state ? btoa(`${state}||type=web`) : randomState

    const params = new URLSearchParams({
      client_id: this.config.clientId, // 使用appid而不是client_id
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      state: finalState,
      login_type: '0', // 0: 账号登录, 1: 手机验证码登录
    })

    return `${this.config.authUrl}?${params.toString()}`
  }

  /**
   * 直接跳转到WPS授权页面
   * 当API返回401时调用此方法
   */
  redirectToAuth(state?: string): void {
    const authUrl = this.getAuthUrl(state)

    // 开发环境下输出调试信息
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('跳转到WPS授权页面:', authUrl)
    }

    // 保存当前页面URL，授权成功后返回
    const currentUrl = window.location.href
    localStorage.setItem('wps_auth_return_url', currentUrl)

    // 跳转到WPS授权页面
    window.location.href = authUrl
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<WpsUserInfo | null> {
    const token = await this.getAccessToken()
    if (!token) return null

    try {
      const response = await fetch(
        `${this.config.baseUrl}/oauthapi/v3/user/info`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`获取用户信息失败: ${response.status}`)
      }

      const data = await response.json()

      if (data.code !== 0) {
        throw new Error(`获取用户信息失败: ${data.msg}`)
      }

      return {
        id: data.data.id,
        name: data.data.name,
        email: data.data.email,
        avatar: data.data.avatar,
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('获取用户信息失败:', error)
      return null
    }
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          `获取token失败: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      if (data.code !== 0) {
        throw new Error(`获取token失败: ${data.msg || '未知错误'}`)
      }

      const tokens: AuthTokens = {
        accessToken: data.data.access_token,
        refreshToken: data.data.refresh_token,
        expiresIn: data.data.expires_in,
        expiresAt: Date.now() + data.data.expires_in * 1000,
      }

      this.setTokens(tokens)
      return tokens
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('处理授权回调失败:', error)
      throw error
    }
  }

  /**
   * 刷新访问token
   */
  async refreshAccessToken(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('没有refresh token')
    }

    // 防止并发刷新
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.doRefreshToken()

    try {
      const tokens = await this.refreshPromise
      return tokens
    } finally {
      this.refreshPromise = null
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: this.tokens!.refreshToken,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          `刷新token失败: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      if (data.code !== 0) {
        throw new Error(`刷新token失败: ${data.msg || '未知错误'}`)
      }

      const tokens: AuthTokens = {
        accessToken: data.data.access_token,
        refreshToken: data.data.refresh_token,
        expiresIn: data.data.expires_in,
        expiresAt: Date.now() + data.data.expires_in * 1000,
      }

      this.setTokens(tokens)
      return tokens
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('刷新token失败:', error)
      this.clearTokens()
      throw error
    }
  }

  /**
   * 设置tokens
   */
  private setTokens(tokens: AuthTokens): void {
    this.tokens = tokens
    this.saveTokensToStorage()
  }

  /**
   * 清除tokens
   */
  clearTokens(): void {
    this.tokens = null
    localStorage.removeItem('wps_auth_tokens')
  }

  /**
   * 从localStorage加载tokens
   */
  private loadTokensFromStorage(): void {
    try {
      const stored = localStorage.getItem('wps_auth_tokens')
      if (stored) {
        const tokens = JSON.parse(stored) as AuthTokens
        // 检查是否过期
        if (Date.now() < tokens.expiresAt) {
          this.tokens = tokens
        } else {
          // 过期则清除
          localStorage.removeItem('wps_auth_tokens')
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('加载tokens失败:', error)
      localStorage.removeItem('wps_auth_tokens')
    }
  }

  /**
   * 保存tokens到localStorage
   */
  private saveTokensToStorage(): void {
    if (this.tokens) {
      try {
        localStorage.setItem('wps_auth_tokens', JSON.stringify(this.tokens))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('保存tokens失败:', error)
      }
    }
  }

  /**
   * 处理SDK登录成功（保持向后兼容）
   */
  async handleSDKLoginSuccess(data: LoginSuccessData): Promise<void> {
    try {
      if (!data.code) {
        throw new Error('授权码为空')
      }

      await this.handleAuthCallback(data.code)

      // 触发登录成功事件
      window.dispatchEvent(
        new CustomEvent('wps-login-success', {
          detail: { userInfo: data.userInfo },
        })
      )
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('处理SDK登录成功失败:', error)
      window.dispatchEvent(
        new CustomEvent('wps-login-error', {
          detail: {
            error: error instanceof Error ? error.message : '未知错误',
          },
        })
      )
    }
  }

  /**
   * 初始化SDK监听（保持向后兼容）
   */
  initSDKListeners(): void {
    // 监听WPS SDK登录成功事件
    window.addEventListener('wps-login-success', (event: Event) => {
      const customEvent = event as CustomEvent<LoginSuccessData>
      this.handleSDKLoginSuccess(customEvent.detail).catch(() => {
        // 错误已在handleSDKLoginSuccess中处理
      })
    })
  }

  /**
   * 登出
   */
  logout(): void {
    this.clearTokens()

    // 清理返回URL
    localStorage.removeItem('wps_auth_return_url')

    // 触发登出事件
    window.dispatchEvent(new CustomEvent('auth-logout'))
  }
}

// 创建全局授权管理器实例
export const authManager = new WpsAuthManager({
  clientId: 'AK20250614WBSGPX', // 使用与agendaedu-app相同的clientId
  redirectUri: 'https://chat.whzhsc.cn/api/auth/authorization', // 动态获取回调地址
  scope: 'kso.user_base.read', // Web端权限范围
})
