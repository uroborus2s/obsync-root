/**
 * 认证 API 服务
 * 调用 api-gateway 项目中的认证接口
 */
import { apiClient } from './api-client'
import { authConfig } from './config'

/**
 * 认证用户信息
 */
export interface AuthUser {
  userId: string
  username?: string
  name?: string
  email?: string
  avatar?: string
  userType?: 'student' | 'teacher'
  userNumber?: string
  collegeName?: string
  majorName?: string
  className?: string
  roles?: string[]
  permissions?: string[]
}

/**
 * 认证验证响应
 */
export interface AuthVerifyResponse {
  success: boolean
  user?: AuthUser
  message?: string
  error?: string
}

/**
 * 认证API服务类
 */
export class AuthApiService {
  /**
   * 验证当前认证状态
   * 调用网关的 /api/auth/verify 接口
   */
  async verifyAuth(): Promise<AuthVerifyResponse> {
    try {
      const response = await apiClient.get<AuthVerifyResponse>(
        authConfig.verifyPath
      )
      return response
    } catch (error: any) {
      // 如果是401错误，说明未认证
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: '未认证或认证已过期',
        }
      }

      // 其他错误
      return {
        success: false,
        error: 'VERIFICATION_ERROR',
        message: error.message || '认证验证失败',
      }
    }
  }

  /**
   * 获取当前用户信息
   * 如果认证有效，返回用户信息；否则返回null
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const result = await this.verifyAuth()
      return result.success ? result.user || null : null
    } catch (error) {
      console.error('获取当前用户信息失败:', error)
      return null
    }
  }

  /**
   * 检查是否已认证
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const result = await this.verifyAuth()
      return result.success
    } catch (error) {
      return false
    }
  }

  /**
   * 跳转到认证页面
   * 使用统一的WPS认证配置
   */
  redirectToAuth(returnUrl?: string): void {
    // 使用统一的认证配置进行重定向
    import('@/config/wps-auth-config').then(({ redirectToWpsAuth }) => {
      redirectToWpsAuth(returnUrl || window.location.href)
    })
  }

  /**
   * 登出
   * 清除本地认证状态并跳转到登录页
   */
  logout(): void {
    // 清除本地存储的认证信息
    localStorage.removeItem('auth_return_url')

    // 触发登出事件
    window.dispatchEvent(new CustomEvent('auth-logout'))

    // 跳转到认证页面
    this.redirectToAuth()
  }

  /**
   * 处理认证回调
   * 在认证成功后调用，跳转回原页面
   */
  handleAuthCallback(): void {
    const returnUrl = localStorage.getItem('auth_return_url')
    localStorage.removeItem('auth_return_url')

    if (returnUrl && returnUrl !== window.location.href) {
      window.location.href = returnUrl
    } else {
      // 默认跳转到首页
      window.location.href = '/'
    }
  }
}

// 导出单例实例
export const authApi = new AuthApiService()
