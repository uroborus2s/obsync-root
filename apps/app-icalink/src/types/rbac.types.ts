/**
 * RBAC权限管理系统类型定义
 * 
 * 包含:
 * - 数据库表类型
 * - 业务实体类型
 * - 请求/响应类型
 */

// =====================================================
// 数据库表类型 (对应数据库表结构)
// =====================================================

/**
 * 用户类型枚举
 */
export type UserType = 'student' | 'teacher';

/**
 * 角色状态枚举
 */
export type RoleStatus = 'active' | 'inactive';

/**
 * 菜单类型枚举
 */
export type MenuType = 'group' | 'item' | 'link';

/**
 * 角色表 (rbac_roles)
 */
export interface RbacRole {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_system: number; // 0 or 1
  status: RoleStatus;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 权限表 (rbac_permissions)
 */
export interface RbacPermission {
  id: number;
  name: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
  is_system: number; // 0 or 1
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 角色权限关联表 (rbac_role_permissions)
 */
export interface RbacRolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  created_at: Date;
  created_by: string | null;
}

/**
 * 用户角色关联表 (rbac_user_roles)
 */
export interface RbacUserRole {
  id: number;
  user_id: string;
  user_type: UserType;
  role_id: number;
  created_at: Date;
  created_by: string | null;
}

/**
 * 菜单表 (rbac_menus)
 */
export interface RbacMenu {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  parent_id: number | null;
  permission_code: string | null;
  sort_order: number;
  is_visible: number; // 0 or 1
  menu_type: MenuType;
  external_link: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

// =====================================================
// 创建/更新类型 (用于Repository)
// =====================================================

/**
 * 创建角色数据
 */
export interface CreateRoleData {
  name: string;
  code: string;
  description?: string | null;
  is_system?: number;
  status?: RoleStatus;
  created_by?: string | null;
}

/**
 * 更新角色数据
 */
export interface UpdateRoleData {
  name?: string;
  description?: string | null;
  status?: RoleStatus;
  updated_by?: string | null;
}

/**
 * 创建权限数据
 */
export interface CreatePermissionData {
  name: string;
  code: string;
  resource: string;
  action: string;
  description?: string | null;
  is_system?: number;
  created_by?: string | null;
}

/**
 * 更新权限数据
 */
export interface UpdatePermissionData {
  name?: string;
  description?: string | null;
  updated_by?: string | null;
}

/**
 * 创建角色权限关联数据
 */
export interface CreateRolePermissionData {
  role_id: number;
  permission_id: number;
  created_by?: string | null;
}

/**
 * 创建用户角色关联数据
 */
export interface CreateUserRoleData {
  user_id: string;
  user_type: UserType;
  role_id: number;
  created_by?: string | null;
}

/**
 * 创建菜单数据
 */
export interface CreateMenuData {
  name: string;
  path?: string | null;
  icon?: string | null;
  parent_id?: number | null;
  permission_code?: string | null;
  sort_order?: number;
  is_visible?: number;
  menu_type?: MenuType;
  external_link?: string | null;
  description?: string | null;
  created_by?: string | null;
}

/**
 * 更新菜单数据
 */
export interface UpdateMenuData {
  name?: string;
  path?: string | null;
  icon?: string | null;
  parent_id?: number | null;
  permission_code?: string | null;
  sort_order?: number;
  is_visible?: number;
  menu_type?: MenuType;
  external_link?: string | null;
  description?: string | null;
  updated_by?: string | null;
}

// =====================================================
// 业务实体类型 (用于Service层返回)
// =====================================================

/**
 * 角色实体 (简化版,用于前端)
 */
export interface RoleEntity {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  status: RoleStatus;
}

/**
 * 权限实体 (简化版,用于前端)
 */
export interface PermissionEntity {
  id: number;
  name: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
}

/**
 * 菜单实体 (树形结构)
 */
export interface MenuEntity {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  parentId: number | null;
  permissionCode: string | null;
  sortOrder: number;
  isVisible: boolean;
  menuType: MenuType;
  externalLink: string | null;
  children?: MenuEntity[];
}

/**
 * 用户权限数据 (完整的权限信息)
 */
export interface UserPermissionData {
  userId: string;
  userType: UserType;
  roles: RoleEntity[];
  permissions: PermissionEntity[];
  menus: MenuEntity[];
}

// =====================================================
// 请求/响应类型
// =====================================================

/**
 * 分配角色权限请求
 */
export interface AssignRolePermissionsRequest {
  roleId: number;
  permissionIds: number[];
}

/**
 * 分配用户角色请求
 */
export interface AssignUserRolesRequest {
  userId: string;
  userType: UserType;
  roleIds: number[];
}

/**
 * 菜单排序请求
 */
export interface SortMenusRequest {
  menuOrders: Array<{
    id: number;
    sortOrder: number;
  }>;
}

