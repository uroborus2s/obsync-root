/**
 * 权限保护组件
 * 用于在前端页面中检查用户权限，当权限不足时显示403错误页面
 */
import { ReactNode } from 'react'
import { useUser } from '@/hooks/use-user'
import { Skeleton } from '@/components/ui/skeleton'
import ForbiddenError from '@/features/errors/forbidden'

export interface PermissionGuardProps {
  /** 子组件 */
  children: ReactNode
  /** 必需的角色列表（任一匹配即可） */
  requiredRoles?: string[]
  /** 必需的权限列表（任一匹配即可） */
  requiredPermissions?: string[]
  /** 权限检查模式：'or'（默认）任一通过即可，'and'全部通过才行 */
  mode?: 'or' | 'and'
  /** 自定义权限检查函数 */
  customCheck?: (user: any) => boolean
  /** 加载时显示的组件 */
  fallback?: ReactNode
  /** 权限不足时显示的组件（默认显示403错误页面） */
  forbiddenComponent?: ReactNode
}

/**
 * 权限保护组件
 *
 * @example
 * // 检查admin角色
 * <PermissionGuard requiredRoles={['admin']}>
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * @example
 * // 检查多个权限（任一通过）
 * <PermissionGuard requiredPermissions={['admin', 'admin:users']}>
 *   <UserManagement />
 * </PermissionGuard>
 *
 * @example
 * // 检查多个权限（全部通过）
 * <PermissionGuard
 *   requiredRoles={['admin']}
 *   requiredPermissions={['admin:system']}
 *   mode="and"
 * >
 *   <SystemSettings />
 * </PermissionGuard>
 *
 * @example
 * // 自定义权限检查
 * <PermissionGuard customCheck={(user) => user?.type === 'teacher' && user?.department === 'IT'}>
 *   <ITTeacherPanel />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  mode = 'or',
  customCheck,
  fallback,
  forbiddenComponent,
}: PermissionGuardProps) {
  const { isAuthenticated, user, loading, hasRole, hasPermission } = useUser()

  // 加载中状态
  if (loading) {
    return (
      fallback || (
        <div className='flex h-64 items-center justify-center'>
          <Skeleton className='h-8 w-48' />
        </div>
      )
    )
  }

  // 未认证状态（这种情况通常不会发生，因为会被API拦截器处理）
  if (!isAuthenticated || !user) {
    return forbiddenComponent || <ForbiddenError />
  }

  // 执行权限检查
  const hasRequiredPermission = checkPermissions({
    user,
    requiredRoles,
    requiredPermissions,
    mode,
    customCheck,
    hasRole,
    hasPermission,
  })

  // 权限不足
  if (!hasRequiredPermission) {
    // 记录权限检查失败的日志
    console.warn('🚫 权限检查失败:', {
      userId: user.id,
      userRoles: user.roles,
      userPermissions: user.permissions,
      requiredRoles,
      requiredPermissions,
      mode,
      timestamp: new Date().toISOString(),
    })

    return forbiddenComponent || <ForbiddenError />
  }

  // 权限检查通过，渲染子组件
  return <>{children}</>
}

/**
 * 权限检查参数接口
 */
interface CheckPermissionsParams {
  user: any
  requiredRoles: string[]
  requiredPermissions: string[]
  mode: 'or' | 'and'
  customCheck?: (user: any) => boolean
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
}

/**
 * 执行权限检查逻辑
 */
function checkPermissions({
  user,
  requiredRoles,
  requiredPermissions,
  mode,
  customCheck,
  hasRole,
  hasPermission,
}: CheckPermissionsParams): boolean {
  // 如果有自定义检查函数，优先使用
  if (customCheck) {
    return customCheck(user)
  }

  // 如果没有任何权限要求，直接通过
  if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
    return true
  }

  // 检查角色
  const roleChecks = requiredRoles.map((role) => hasRole(role))

  // 检查权限
  const permissionChecks = requiredPermissions.map((permission) =>
    hasPermission(permission)
  )

  // 合并所有检查结果
  const allChecks = [...roleChecks, ...permissionChecks]

  if (mode === 'and') {
    // 'and' 模式：所有检查都必须通过
    return allChecks.length > 0 && allChecks.every((check) => check)
  } else {
    // 'or' 模式（默认）：任一检查通过即可
    return allChecks.length > 0 && allChecks.some((check) => check)
  }
}

/**
 * 权限检查Hook
 * 用于在组件中进行权限检查，不渲染UI
 */
export function usePermissionCheck(
  options: Omit<
    PermissionGuardProps,
    'children' | 'fallback' | 'forbiddenComponent'
  >
) {
  const { user, hasRole, hasPermission } = useUser()

  if (!user) {
    return false
  }

  return checkPermissions({
    user,
    requiredRoles: options.requiredRoles || [],
    requiredPermissions: options.requiredPermissions || [],
    mode: options.mode || 'or',
    customCheck: options.customCheck,
    hasRole,
    hasPermission,
  })
}

/**
 * 管理员权限保护组件（快捷方式）
 */
export function AdminGuard({
  children,
  fallback,
  forbiddenComponent,
}: {
  children: ReactNode
  fallback?: ReactNode
  forbiddenComponent?: ReactNode
}) {
  return (
    <PermissionGuard
      requiredRoles={['admin', 'super_admin']}
      mode='or'
      fallback={fallback}
      forbiddenComponent={forbiddenComponent}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * 教师权限保护组件（快捷方式）
 */
export function TeacherGuard({
  children,
  fallback,
  forbiddenComponent,
}: {
  children: ReactNode
  fallback?: ReactNode
  forbiddenComponent?: ReactNode
}) {
  return (
    <PermissionGuard
      requiredRoles={['teacher', 'admin', 'super_admin']}
      mode='or'
      fallback={fallback}
      forbiddenComponent={forbiddenComponent}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * 学生权限保护组件（快捷方式）
 */
export function StudentGuard({
  children,
  fallback,
  forbiddenComponent,
}: {
  children: ReactNode
  fallback?: ReactNode
  forbiddenComponent?: ReactNode
}) {
  return (
    <PermissionGuard
      requiredRoles={['student', 'teacher', 'admin', 'super_admin']}
      mode='or'
      fallback={fallback}
      forbiddenComponent={forbiddenComponent}
    >
      {children}
    </PermissionGuard>
  )
}
