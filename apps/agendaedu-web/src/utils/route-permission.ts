/**
 * 路由权限检查工具
 * 用于在路由级别进行权限验证
 */
import { redirect } from '@tanstack/react-router'
import { parseUserFromCookie } from './jwt.utils'

/**
 * 路由权限检查选项
 */
export interface RoutePermissionOptions {
  /** 必需的角色列表 */
  requiredRoles?: string[]
  /** 必需的权限列表 */
  requiredPermissions?: string[]
  /** 权限检查模式：'or'（默认）任一通过即可，'and'全部通过才行 */
  mode?: 'or' | 'and'
  /** 自定义权限检查函数 */
  customCheck?: (user: any) => boolean
  /** 权限不足时重定向的路径（默认为 /403） */
  redirectTo?: string
}

/**
 * 创建路由权限检查函数
 * 用于在 TanStack Router 的 beforeLoad 中进行权限验证
 * 
 * @example
 * // 在路由定义中使用
 * export const Route = createFileRoute('/admin/users')({
 *   beforeLoad: createRoutePermissionCheck({
 *     requiredRoles: ['admin'],
 *   }),
 *   component: AdminUsersPage,
 * })
 * 
 * @example
 * // 检查多个权限
 * export const Route = createFileRoute('/admin/system')({
 *   beforeLoad: createRoutePermissionCheck({
 *     requiredRoles: ['admin'],
 *     requiredPermissions: ['admin:system'],
 *     mode: 'and',
 *   }),
 *   component: SystemSettingsPage,
 * })
 */
export function createRoutePermissionCheck(options: RoutePermissionOptions = {}) {
  const {
    requiredRoles = [],
    requiredPermissions = [],
    mode = 'or',
    customCheck,
    redirectTo = '/403',
  } = options

  return () => {
    // 从Cookie中解析用户信息
    const userResult = parseUserFromCookie()

    // 如果用户未认证或解析失败，重定向到401页面
    if (!userResult.success || !userResult.user) {
      console.warn('🔒 路由权限检查: 用户未认证', {
        path: window.location.pathname,
        error: userResult.error,
        timestamp: new Date().toISOString(),
      })
      
      throw redirect({
        to: '/401',
      })
    }

    const user = userResult.user

    // 执行权限检查
    const hasPermission = checkRoutePermissions({
      user,
      requiredRoles,
      requiredPermissions,
      mode,
      customCheck,
    })

    // 权限不足时重定向到403页面
    if (!hasPermission) {
      console.warn('🚫 路由权限检查失败:', {
        path: window.location.pathname,
        userId: user.id,
        userRoles: user.roles,
        userPermissions: user.permissions,
        requiredRoles,
        requiredPermissions,
        mode,
        timestamp: new Date().toISOString(),
      })

      throw redirect({
        to: redirectTo,
      })
    }

    // 权限检查通过
    console.debug('✅ 路由权限检查通过:', {
      path: window.location.pathname,
      userId: user.id,
      userRoles: user.roles,
      requiredRoles,
      requiredPermissions,
      mode,
    })

    return { user }
  }
}

/**
 * 路由权限检查参数接口
 */
interface CheckRoutePermissionsParams {
  user: any
  requiredRoles: string[]
  requiredPermissions: string[]
  mode: 'or' | 'and'
  customCheck?: (user: any) => boolean
}

/**
 * 执行路由权限检查逻辑
 */
function checkRoutePermissions({
  user,
  requiredRoles,
  requiredPermissions,
  mode,
  customCheck,
}: CheckRoutePermissionsParams): boolean {
  // 如果有自定义检查函数，优先使用
  if (customCheck) {
    return customCheck(user)
  }

  // 如果没有任何权限要求，直接通过
  if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
    return true
  }

  // 检查角色
  const roleChecks = requiredRoles.map(role => 
    user.roles && user.roles.includes(role)
  )
  
  // 检查权限
  const permissionChecks = requiredPermissions.map(permission => 
    user.permissions && user.permissions.includes(permission)
  )
  
  // 合并所有检查结果
  const allChecks = [...roleChecks, ...permissionChecks]

  if (mode === 'and') {
    // 'and' 模式：所有检查都必须通过
    return allChecks.length > 0 && allChecks.every(check => check)
  } else {
    // 'or' 模式（默认）：任一检查通过即可
    return allChecks.length > 0 && allChecks.some(check => check)
  }
}

/**
 * 管理员路由权限检查（快捷方式）
 */
export function createAdminRouteCheck(redirectTo?: string) {
  return createRoutePermissionCheck({
    requiredRoles: ['admin', 'super_admin'],
    mode: 'or',
    redirectTo,
  })
}

/**
 * 教师路由权限检查（快捷方式）
 */
export function createTeacherRouteCheck(redirectTo?: string) {
  return createRoutePermissionCheck({
    requiredRoles: ['teacher', 'admin', 'super_admin'],
    mode: 'or',
    redirectTo,
  })
}

/**
 * 学生路由权限检查（快捷方式）
 */
export function createStudentRouteCheck(redirectTo?: string) {
  return createRoutePermissionCheck({
    requiredRoles: ['student', 'teacher', 'admin', 'super_admin'],
    mode: 'or',
    redirectTo,
  })
}

/**
 * 检查当前用户是否有指定权限（同步版本）
 * 用于在非React组件中进行权限检查
 */
export function hasCurrentUserPermission(options: Omit<RoutePermissionOptions, 'redirectTo'>): boolean {
  const userResult = parseUserFromCookie()
  
  if (!userResult.success || !userResult.user) {
    return false
  }

  return checkRoutePermissions({
    user: userResult.user,
    requiredRoles: options.requiredRoles || [],
    requiredPermissions: options.requiredPermissions || [],
    mode: options.mode || 'or',
    customCheck: options.customCheck,
  })
}

/**
 * 获取当前用户信息（同步版本）
 */
export function getCurrentUser() {
  const userResult = parseUserFromCookie()
  return userResult.success ? userResult.user : null
}
