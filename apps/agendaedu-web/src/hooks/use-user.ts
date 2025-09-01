/**
 * 用户信息管理Hook
 */
import { useCallback, useEffect, useState } from 'react'
import type { AuthState } from '@/types/user.types'
import { clearJWTCookie, parseUserFromCookie } from '@/utils/jwt.utils'

/**
 * 用户信息管理Hook
 */
export function useUser() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  })

  /**
   * 加载用户信息
   */
  const loadUser = useCallback(() => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const result = parseUserFromCookie()

      if (result.success && result.user) {
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          loading: false,
          error: null,
        })
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: result.error || '用户信息解析失败',
        })

        // 如果JWT过期，清除Cookie
        if (result.expired) {
          clearJWTCookie()
        }
      }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : '加载用户信息失败',
      })
    }
  }, [])

  /**
   * 登出用户
   */
  const logout = useCallback(() => {
    clearJWTCookie()
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    })
  }, [])

  /**
   * 刷新用户信息
   */
  const refreshUser = useCallback(() => {
    loadUser()
  }, [loadUser])

  /**
   * 检查用户是否有特定权限
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return authState.user?.permissions.includes(permission as any) || false
    },
    [authState.user]
  )

  /**
   * 检查用户是否有特定角色
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return authState.user?.roles.includes(role as any) || false
    },
    [authState.user]
  )

  /**
   * 获取用户显示名称
   */
  const getDisplayName = useCallback((): string => {
    if (!authState.user) return '未知用户'
    return authState.user.name || authState.user.number || '用户'
  }, [authState.user])

  /**
   * 获取用户头像
   */
  const getAvatar = useCallback((): string => {
    return authState.user?.avatar || ''
  }, [authState.user])

  /**
   * 获取用户角色显示文本
   */
  const getRoleDisplayText = useCallback((): string => {
    if (!authState.user || !authState.user.roles.length) return '未知角色'

    const roleMap: Record<string, string> = {
      teacher: '教师',
      student: '学生',
      admin: '管理员',
      staff: '职员',
      super_admin: '超级管理员',
    }

    return authState.user.roles.map((role) => roleMap[role] || role).join(', ')
  }, [authState.user])

  /**
   * 获取用户类型显示文本
   */
  const getUserTypeDisplayText = useCallback((): string => {
    if (!authState.user) return '未知类型'

    const typeMap: Record<string, string> = {
      teacher: '教师',
      student: '学生',
      admin: '管理员',
      staff: '职员',
    }

    return typeMap[authState.user.type] || authState.user.type
  }, [authState.user])

  // 组件挂载时加载用户信息
  useEffect(() => {
    loadUser()
  }, [loadUser])

  // 监听Cookie变化（可选，用于多标签页同步）
  useEffect(() => {
    const handleStorageChange = () => {
      loadUser()
    }

    // 监听storage事件（虽然Cookie不会触发，但可以用于其他同步机制）
    window.addEventListener('storage', handleStorageChange)

    // 监听focus事件，当页面重新获得焦点时检查用户状态
    window.addEventListener('focus', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [loadUser])

  return {
    // 状态
    ...authState,

    // 方法
    loadUser,
    logout,
    refreshUser,
    hasPermission,
    hasRole,

    // 辅助方法
    getDisplayName,
    getAvatar,
    getRoleDisplayText,
    getUserTypeDisplayText,
  }
}

/**
 * 用户信息Hook的返回类型
 */
export type UseUserReturn = ReturnType<typeof useUser>
