/**
 * 网关认证管理器
 * 集成api-gateway的认证机制，简化认证流程
 * 重构后成为唯一的认证管理器，使用统一的WPS认证配置
 */
import {
  clearReturnUrl,
  getReturnUrl,
  redirectToWpsAuth,
} from '@/config/wps-auth-config'
import { authApi, type AuthUser } from './auth-api'

/**
 * 认证状态
 */
export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

/**
 * 网关认证管理器类
 */
export class GatewayAuthManager {
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  }

  private listeners: Array<(state: AuthState) => void> = []

  constructor() {
    // 初始化时检查认证状态
    this.checkAuthStatus()

    // 监听登出事件
    window.addEventListener('auth-logout', () => {
      this.handleLogout()
    })
  }

  /**
   * 获取当前认证状态
   */
  getState(): AuthState {
    return { ...this.state }
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener)

    // 返回取消订阅函数
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * 更新状态并通知监听器
   */
  private setState(newState: Partial<AuthState>): void {
    this.state = { ...this.state, ...newState }
    this.listeners.forEach((listener) => listener(this.state))
  }

  /**
   * 检查认证状态
   */
  async checkAuthStatus(): Promise<void> {
    this.setState({ isLoading: true, error: null })

    try {
      const result = await authApi.verifyAuth()

      if (result.success && result.user) {
        this.setState({
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
          error: null,
        })
      } else {
        this.setState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: result.error || null,
        })
      }
    } catch (error) {
      this.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : '认证检查失败',
      })
    }
  }

  /**
   * 获取访问令牌
   * 由于使用Cookie认证，这里返回空字符串
   */
  async getAccessToken(): Promise<string | null> {
    // 网关使用Cookie认证，不需要在请求头中添加token
    return null
  }

  /**
   * 刷新访问令牌
   * 由于使用Cookie认证，这里只需要重新检查认证状态
   */
  async refreshAccessToken(): Promise<void> {
    await this.checkAuthStatus()
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): AuthUser | null {
    return this.state.user
  }

  /**
   * 跳转到认证页面
   * 使用统一的WPS认证配置
   */
  redirectToAuth(returnUrl?: string): void {
    redirectToWpsAuth(returnUrl)
  }

  /**
   * 登出
   */
  logout(): void {
    authApi.logout()
  }

  /**
   * 处理登出
   */
  private handleLogout(): void {
    this.setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    })
  }

  /**
   * 处理认证回调
   */
  handleAuthCallback(): void {
    authApi.handleAuthCallback()
  }

  /**
   * 清除令牌（兼容性方法）
   */
  clearTokens(): void {
    this.handleLogout()
  }

  /**
   * 初始化SDK监听器（兼容性方法）
   */
  initSDKListeners(): void {
    // 网关认证不需要SDK监听器
  }

  /**
   * 处理认证成功后的回调
   * 检查是否有保存的返回URL并进行重定向
   */
  handleAuthSuccess(): void {
    const returnUrl = getReturnUrl()
    if (returnUrl) {
      clearReturnUrl()
      // 重新检查认证状态
      this.checkAuthStatus().then(() => {
        window.location.href = returnUrl
      })
    } else {
      // 没有保存的返回URL，重新检查认证状态即可
      this.checkAuthStatus()
    }
  }
}

// 创建全局认证管理器实例
export const gatewayAuthManager = new GatewayAuthManager()

// 为了兼容性，也导出为authManager
export const authManager = gatewayAuthManager
