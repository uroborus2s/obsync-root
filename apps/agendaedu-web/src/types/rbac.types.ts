/**
 * RBAC权限管理系统类型定义
 */

// 用户类型
export type UserType = 'student' | 'teacher'

// 角色状态
export type RoleStatus = 'active' | 'inactive'

// 菜单类型
export type MenuType = 'group' | 'item' | 'link'

/**
 * 权限实体
 */
export interface PermissionEntity {
  id: number
  name: string
  code: string
  resource: string
  action: string
  description: string | null
}

/**
 * 角色实体
 */
export interface RoleEntity {
  id: number
  name: string
  code: string
  description: string | null
  isSystem: boolean
  status: RoleStatus
}

/**
 * 菜单实体
 */
export interface MenuEntity {
  id: number
  name: string
  path: string | null
  icon: string | null
  parentId: number | null
  permissionCode: string | null
  sortOrder: number
  isVisible: boolean
  menuType: MenuType
  externalLink: string | null
  children?: MenuEntity[]
}

/**
 * 用户权限数据
 */
export interface UserPermissionData {
  userId: string
  userType: UserType
  roles: RoleEntity[]
  permissions: PermissionEntity[]
  menus: MenuEntity[]
}

/**
 * 创建权限数据
 */
export interface CreatePermissionData {
  name: string
  code: string
  resource: string
  action: string
  description?: string | null
  is_system?: number
  created_by?: string | null
}

/**
 * 更新权限数据
 */
export interface UpdatePermissionData {
  name?: string
  description?: string | null
  updated_by?: string | null
}

/**
 * 创建角色数据
 */
export interface CreateRoleData {
  name: string
  code: string
  description?: string | null
  is_system?: number
  status?: RoleStatus
  created_by?: string | null
}

/**
 * 更新角色数据
 */
export interface UpdateRoleData {
  name?: string
  description?: string | null
  status?: RoleStatus
  updated_by?: string | null
}

/**
 * 创建菜单数据
 */
export interface CreateMenuData {
  name: string
  path?: string | null
  icon?: string | null
  parent_id?: number | null
  permission_code?: string | null
  sort_order?: number
  is_visible?: number
  menu_type?: MenuType
  external_link?: string | null
  description?: string | null
  created_by?: string | null
}

/**
 * 更新菜单数据
 */
export interface UpdateMenuData {
  name?: string
  path?: string | null
  icon?: string | null
  parent_id?: number | null
  permission_code?: string | null
  sort_order?: number
  is_visible?: number
  menu_type?: MenuType
  external_link?: string | null
  description?: string | null
  updated_by?: string | null
}

/**
 * 分配角色权限请求
 */
export interface AssignRolePermissionsRequest {
  roleId: number
  permissionIds: number[]
}

/**
 * 分配用户角色请求
 */
export interface AssignUserRolesRequest {
  userId: string
  userType: UserType
  roleIds: number[]
}

/**
 * 菜单排序请求
 */
export interface SortMenusRequest {
  menuOrders: Array<{
    id: number
    sortOrder: number
  }>
}

/**
 * 教师信息（用于人员管理）
 */
export interface TeacherInfo {
  id: string
  name: string
  email?: string
  department?: string
  title?: string
}

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: string
}

