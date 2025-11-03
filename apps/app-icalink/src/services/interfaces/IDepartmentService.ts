import type { DeptInfo, GetDeptChildrenResponse } from '@stratix/was-v7';

/**
 * 部门服务接口
 * 提供组织架构相关的业务逻辑
 */
export interface IDepartmentService {
  /**
   * 获取根部门信息
   * @returns 根部门信息
   */
  getRootDepartment(): Promise<{
    success: boolean;
    data?: DeptInfo;
    error?: string;
  }>;

  /**
   * 获取子部门列表
   * @param deptId 部门ID
   * @param pageSize 分页大小（可选，默认10，最大50）
   * @param pageToken 分页标记（可选）
   * @param withTotal 是否返回总数（可选）
   * @param rootDeptId 根部门ID（可选，用于优化性能，避免额外的API调用）
   * @param userId 登录用户ID（可选，用于权限过滤）
   * @param userType 登录用户类型（可选，用于权限过滤）
   * @param parentExDeptId 父部门的 ex_dept_id（可选，用于权限过滤）
   * @returns 子部门列表响应
   */
  getDepartmentChildren(
    deptId: string,
    pageSize?: number,
    pageToken?: string,
    withTotal?: boolean,
    rootDeptId?: string,
    userId?: string,
    userType?: 'student' | 'teacher',
    parentExDeptId?: string
  ): Promise<{
    success: boolean;
    data?: GetDeptChildrenResponse;
    error?: string;
  }>;
}
