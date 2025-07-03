import { useCallback, useEffect, useState } from 'react'
import { authManager, type WpsUserInfo } from '@/lib/auth-manager'

export interface UseWpsAuthReturn {
  isAuthenticated: boolean
  user: WpsUserInfo | null
  isLoading: boolean
  showQrLogin: boolean
  openQrLogin: () => void
  closeQrLogin: () => void
  logout: () => void
  refreshUser: () => Promise<void>
}

export function useWpsAuth(): UseWpsAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<WpsUserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showQrLogin, setShowQrLogin] = useState(false)

  // 检查认证状态
  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      // 直接向服务器验证认证状态
      const response = await fetch(
        'https://chat.whzhsc.cn/apiv2/tasks/tree/roots?page=1&page_size=1',
        {
          method: 'GET',
          credentials: 'include', // 包含cookies
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.status === 401) {
        // 服务器返回401，表示未认证或认证失败
        setIsAuthenticated(false)
        setUser(null)
      } else if (response.ok) {
        // 服务器认证成功，设置认证状态
        setIsAuthenticated(true)
        // 由于我们不依赖本地认证管理器，这里可以设置一个默认用户信息
        // 或者从响应中获取用户信息
        setUser({
          id: 'unknown',
          name: '已登录用户',
          email: '',
          avatar: '',
        })
      } else {
        // 其他错误（如网络错误、服务器错误等），认为未认证
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (_error) {
      // 网络错误等情况，认为未认证
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    // 重新检查认证状态
    await checkAuthStatus()
  }, [checkAuthStatus])

  // 打开二维码登录
  const openQrLogin = useCallback(() => {
    setShowQrLogin(true)
  }, [])

  // 关闭二维码登录
  const closeQrLogin = useCallback(() => {
    setShowQrLogin(false)
  }, [])

  // 登出
  const logout = useCallback(() => {
    // 清理认证状态
    setIsAuthenticated(false)
    setUser(null)
    setShowQrLogin(false)
    // 可选：也清理本地认证管理器状态
    authManager.logout()
  }, [])

  // 监听认证事件
  useEffect(() => {
    // 监听登录成功事件
    const handleLoginSuccess = () => {
      checkAuthStatus()
      setShowQrLogin(false)
    }

    // 监听URL变化，检查是否有认证回调
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('auth_success') === 'true') {
        checkAuthStatus()
        // 清理URL参数
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        )
      }

      // 检查是否有认证错误
      const authError = urlParams.get('auth_error')
      if (authError) {
        // eslint-disable-next-line no-console
        console.error('WPS授权失败:', decodeURIComponent(authError))
        // 清理URL参数
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        )
        // 可以选择显示错误提示
        setShowQrLogin(true)
      }
    }

    window.addEventListener('wps-login-success', handleLoginSuccess)
    window.addEventListener('popstate', handleUrlChange)

    // 初始检查
    checkAuthStatus()
    handleUrlChange()

    return () => {
      window.removeEventListener('wps-login-success', handleLoginSuccess)
      window.removeEventListener('popstate', handleUrlChange)
    }
  }, [checkAuthStatus])

  return {
    isAuthenticated,
    user,
    isLoading,
    showQrLogin,
    openQrLogin,
    closeQrLogin,
    logout,
    refreshUser,
  }
}
