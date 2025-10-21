/**
 * RBAC权限管理API客户端
 */

import { apiClient } from './api-client'
import type {
  ApiResponse,
  AssignRolePermissionsRequest,
  AssignUserRolesRequest,
  CreateMenuData,
  CreatePermissionData,
  CreateRoleData,
  MenuEntity,
  PermissionEntity,
  RoleEntity,
  SortMenusRequest,
  TeacherInfo,
  UpdateMenuData,
  UpdatePermissionData,
  UpdateRoleData,
  UserPermissionData,
  UserType,
} from '@/types/rbac.types'

const BASE_URL = '/api/icalink/v1/rbac'

/**
 * 权限管理API
 */
export const permissionApi = {
  /**
   * 获取所有权限
   */
  async getAllPermissions(): Promise<PermissionEntity[]> {
    const response = await apiClient.get<ApiResponse<PermissionEntity[]>>(
      `${BASE_URL}/permissions`
    )
    return response.data.data || []
  },

  /**
   * 根据ID获取权限
   */
  async getPermissionById(id: number): Promise<PermissionEntity | null> {
    const response = await apiClient.get<ApiResponse<PermissionEntity>>(
      `${BASE_URL}/permissions/${id}`
    )
    return response.data.data || null
  },

  /**
   * 创建权限
   */
  async createPermission(data: CreatePermissionData): Promise<PermissionEntity> {
    const response = await apiClient.post<ApiResponse<PermissionEntity>>(
      `${BASE_URL}/permissions`,
      data
    )
    return response.data.data!
  },

  /**
   * 更新权限
   */
  async updatePermission(
    id: number,
    data: UpdatePermissionData
  ): Promise<PermissionEntity> {
    const response = await apiClient.put<ApiResponse<PermissionEntity>>(
      `${BASE_URL}/permissions/${id}`,
      data
    )
    return response.data.data!
  },

  /**
   * 删除权限
   */
  async deletePermission(id: number): Promise<boolean> {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `${BASE_URL}/permissions/${id}`
    )
    return response.data.data?.deleted || false
  },

  /**
   * 获取系统权限列表
   */
  async getSystemPermissions(): Promise<PermissionEntity[]> {
    const response = await apiClient.get<ApiResponse<PermissionEntity[]>>(
      `${BASE_URL}/permissions/system`
    )
    return response.data.data || []
  },

  /**
   * 获取自定义权限列表
   */
  async getCustomPermissions(): Promise<PermissionEntity[]> {
    const response = await apiClient.get<ApiResponse<PermissionEntity[]>>(
      `${BASE_URL}/permissions/custom`
    )
    return response.data.data || []
  },
}

/**
 * 角色管理API
 */
export const roleApi = {
  /**
   * 获取所有角色
   */
  async getAllRoles(): Promise<RoleEntity[]> {
    const response = await apiClient.get<ApiResponse<RoleEntity[]>>(
      `${BASE_URL}/roles`
    )
    return response.data.data || []
  },

  /**
   * 根据ID获取角色
   */
  async getRoleById(id: number): Promise<RoleEntity | null> {
    const response = await apiClient.get<ApiResponse<RoleEntity>>(
      `${BASE_URL}/roles/${id}`
    )
    return response.data.data || null
  },

  /**
   * 创建角色
   */
  async createRole(data: CreateRoleData): Promise<RoleEntity> {
    const response = await apiClient.post<ApiResponse<RoleEntity>>(
      `${BASE_URL}/roles`,
      data
    )
    return response.data.data!
  },

  /**
   * 更新角色
   */
  async updateRole(id: number, data: UpdateRoleData): Promise<RoleEntity> {
    const response = await apiClient.put<ApiResponse<RoleEntity>>(
      `${BASE_URL}/roles/${id}`,
      data
    )
    return response.data.data!
  },

  /**
   * 删除角色
   */
  async deleteRole(id: number): Promise<boolean> {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `${BASE_URL}/roles/${id}`
    )
    return response.data.data?.deleted || false
  },

  /**
   * 获取角色的所有权限
   */
  async getRolePermissions(roleId: number): Promise<PermissionEntity[]> {
    const response = await apiClient.get<ApiResponse<PermissionEntity[]>>(
      `${BASE_URL}/roles/${roleId}/permissions`
    )
    return response.data.data || []
  },

  /**
   * 为角色分配权限
   */
  async assignPermissionsToRole(
    roleId: number,
    permissionIds: number[]
  ): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<{ assigned: boolean }>>(
      `${BASE_URL}/roles/${roleId}/permissions`,
      { permissionIds }
    )
    return response.data.data?.assigned || false
  },
}

/**
 * 菜单管理API
 */
export const menuApi = {
  /**
   * 获取所有菜单
   */
  async getAllMenus(): Promise<MenuEntity[]> {
    const response = await apiClient.get<ApiResponse<MenuEntity[]>>(
      `${BASE_URL}/menus`
    )
    return response.data.data || []
  },

  /**
   * 获取菜单树形结构
   */
  async getMenuTree(): Promise<MenuEntity[]> {
    const response = await apiClient.get<ApiResponse<MenuEntity[]>>(
      `${BASE_URL}/menus/tree`
    )
    return response.data.data || []
  },

  /**
   * 根据ID获取菜单
   */
  async getMenuById(id: number): Promise<MenuEntity | null> {
    const response = await apiClient.get<ApiResponse<MenuEntity>>(
      `${BASE_URL}/menus/${id}`
    )
    return response.data.data || null
  },

  /**
   * 创建菜单
   */
  async createMenu(data: CreateMenuData): Promise<MenuEntity> {
    const response = await apiClient.post<ApiResponse<MenuEntity>>(
      `${BASE_URL}/menus`,
      data
    )
    return response.data.data!
  },

  /**
   * 更新菜单
   */
  async updateMenu(id: number, data: UpdateMenuData): Promise<MenuEntity> {
    const response = await apiClient.put<ApiResponse<MenuEntity>>(
      `${BASE_URL}/menus/${id}`,
      data
    )
    return response.data.data!
  },

  /**
   * 删除菜单
   */
  async deleteMenu(id: number): Promise<boolean> {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `${BASE_URL}/menus/${id}`
    )
    return response.data.data?.deleted || false
  },

  /**
   * 批量更新菜单排序
   */
  async sortMenus(request: SortMenusRequest): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<{ sorted: boolean }>>(
      `${BASE_URL}/menus/sort`,
      request
    )
    return response.data.data?.sorted || false
  },

  /**
   * 获取用户可访问的菜单树
   */
  async getUserMenuTree(
    userId: string,
    userType: UserType
  ): Promise<MenuEntity[]> {
    const response = await apiClient.get<ApiResponse<MenuEntity[]>>(
      `${BASE_URL}/menus/user/${userId}`,
      { params: { userType } }
    )
    return response.data.data || []
  },
}

/**
 * 用户角色管理API
 */
export const userRoleApi = {
  /**
   * 获取用户的所有角色
   */
  async getUserRoles(userId: string, userType: UserType): Promise<RoleEntity[]> {
    const response = await apiClient.get<ApiResponse<RoleEntity[]>>(
      `${BASE_URL}/user-roles/${userId}`,
      { params: { userType } }
    )
    return response.data.data || []
  },

  /**
   * 获取用户的完整权限数据
   */
  async getUserPermissionData(
    userId: string,
    userType: UserType
  ): Promise<UserPermissionData> {
    const response = await apiClient.get<ApiResponse<UserPermissionData>>(
      `${BASE_URL}/user-permissions/${userId}`,
      { params: { userType } }
    )
    return response.data.data!
  },

  /**
   * 为用户分配角色
   */
  async assignRolesToUser(request: AssignUserRolesRequest): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<{ assigned: boolean }>>(
      `${BASE_URL}/user-roles`,
      request
    )
    return response.data.data?.assigned || false
  },

  /**
   * 移除用户的角色
   */
  async removeRoleFromUser(
    userId: string,
    userType: UserType,
    roleId: number
  ): Promise<boolean> {
    const response = await apiClient.delete<ApiResponse<{ removed: boolean }>>(
      `${BASE_URL}/user-roles/${userId}/${roleId}`,
      { params: { userType } }
    )
    return response.data.data?.removed || false
  },

  /**
   * 获取教师列表
   */
  async getTeachers(params?: {
    page?: number
    page_size?: number
    keyword?: string
  }): Promise<{
    teachers: TeacherInfo[]
    total: number
    page: number
    page_size: number
    total_pages: number
  }> {
    const response = await apiClient.get<
      ApiResponse<{
        teachers: TeacherInfo[]
        total: number
        page: number
        page_size: number
        total_pages: number
      }>
    >(`${BASE_URL}/teachers`, { params })
    return response.data.data!
  },

  /**
   * 根据角色ID获取用户列表
   */
  async getUsersByRole(
    roleId: number,
    userType?: UserType
  ): Promise<{ userIds: string[]; count: number }> {
    const response = await apiClient.get<
      ApiResponse<{ userIds: string[]; count: number }>
    >(`${BASE_URL}/roles/${roleId}/users`, { params: { userType } })
    return response.data.data!
  },
}

