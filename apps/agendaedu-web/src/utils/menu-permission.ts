/**
 * 菜单权限检查工具
 * 用于在菜单渲染时进行权限验证
 */
import type { UserInfo } from '@/types/user.types'
import type { MenuPermission } from '@/components/layout/types'

/**
 * 菜单权限检查参数接口
 */
interface CheckMenuPermissionParams {
  user: UserInfo | null
  permission?: MenuPermission
}

/**
 * 检查菜单项权限
 * @param user 当前用户信息
 * @param permission 菜单权限配置
 * @returns 是否有权限访问该菜单项
 */
export function checkMenuPermission({
  user,
  permission,
}: CheckMenuPermissionParams): boolean {
  // 如果没有权限配置，默认允许访问
  if (!permission) {
    return true
  }

  // 如果用户未登录，拒绝访问
  if (!user) {
    console.log('🔒 checkMenuPermission: 用户未登录，拒绝访问')
    return false
  }

  const {
    requiredRoles = [],
    requiredPermissions = [],
    mode = 'or',
    customCheck,
  } = permission

  // 如果有自定义检查函数，优先使用
  if (customCheck) {
    const result = customCheck(user)
    console.log('🔍 checkMenuPermission: 自定义检查', { result })
    return result
  }

  // 如果没有任何权限要求，直接通过
  if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
    return true
  }

  // 检查角色
  const roleChecks = requiredRoles.map(
    (role) => user.roles && user.roles.includes(role)
  )

  // 检查权限
  const permissionChecks = requiredPermissions.map(
    (permission) => user.permissions && user.permissions.includes(permission)
  )

  // 合并所有检查结果
  const allChecks = [...roleChecks, ...permissionChecks]

  const result =
    mode === 'and'
      ? allChecks.length > 0 && allChecks.every((check) => check)
      : allChecks.length > 0 && allChecks.some((check) => check)

  console.log('🔍 checkMenuPermission:', {
    requiredRoles,
    requiredPermissions,
    userRoles: user.roles,
    userPermissions: user.permissions,
    mode,
    roleChecks,
    permissionChecks,
    result,
  })

  return result
}

/**
 * 过滤菜单项（移除无权限的菜单项）
 * @param menuItems 菜单项列表
 * @param user 当前用户信息
 * @returns 过滤后的菜单项列表
 */
export function filterMenuItems<
  T extends { permission?: MenuPermission; items?: any[] },
>(menuItems: T[], user: UserInfo | null): T[] {
  return (
    menuItems
      .filter((item) =>
        checkMenuPermission({ user, permission: item.permission })
      )
      .map((item) => {
        // 如果有子菜单，递归过滤子菜单
        if (item.items && Array.isArray(item.items)) {
          return {
            ...item,
            items: filterMenuItems(item.items, user),
          }
        }
        return item
      })
      // 过滤掉没有子菜单的空父菜单
      .filter((item) => {
        if (item.items && Array.isArray(item.items)) {
          return item.items.length > 0
        }
        return true
      })
  )
}
