import { LinkProps } from '@tanstack/react-router'
import { UserPermission, UserRole } from '@/types/user.types'

interface User {
  name: string
  email: string
  avatar: string
}

interface Team {
  name: string
  logo: React.ElementType
  plan: string
}

/**
 * 菜单权限配置
 */
interface MenuPermission {
  /** 必需的角色列表 */
  requiredRoles?: UserRole[]
  /** 必需的权限列表 */
  requiredPermissions?: UserPermission[]
  /** 权限检查模式：'or'（默认）任一通过即可，'and'全部通过才行 */
  mode?: 'or' | 'and'
  /** 自定义权限检查函数 */
  customCheck?: (user: any) => boolean
}

interface BaseNavItem {
  title: string
  badge?: string
  icon?: React.ElementType
  /** 菜单权限配置 */
  permission?: MenuPermission
}

type NavLink = BaseNavItem & {
  url: LinkProps['to']
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

interface NavGroup {
  title: string
  items: NavItem[]
}

interface SidebarData {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

export type {
  MenuPermission,
  NavCollapsible,
  NavGroup,
  NavItem,
  NavLink,
  SidebarData,
}
