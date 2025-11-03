import type { Logger } from '@stratix/core';
import type {
  DeptInfo,
  GetDeptChildrenResponse,
  WpsDepartmentAdapter
} from '@stratix/was-v7';
import type ContactRepository from '../repositories/ContactRepository.js';
import type { IDepartmentService } from './interfaces/IDepartmentService.js';

/**
 * 部门服务实现
 * 负责组织架构相关的业务逻辑处理
 *
 * @remarks
 * - 通过依赖注入获取 WPS V7 部门适配器
 * - 提供统一的错误处理和结果格式转换
 * - 遵循 Stratix 框架的 Service 层规范
 */
export default class DepartmentService implements IDepartmentService {
  constructor(
    private readonly logger: Logger,
    private readonly wasV7ApiDepartment: WpsDepartmentAdapter,
    private readonly contactRepository: ContactRepository
  ) {
    this.logger.info('✅ DepartmentService initialized');
  }

  /**
   * 获取用户所属学院ID
   *
   * @param userId - 用户ID（学号或工号）
   * @param userType - 用户类型（'student' 或 'teacher'）
   * @returns 学院ID或 null
   *
   * @remarks
   * 从 icalink_contacts 表查询用户的学院ID
   * - icalink_contacts 表基于 v_contacts 视图创建
   * - 统一了教师（out_jsxx）和学生（out_xsxx）的联系信息
   */
  private async getUserSchoolId(
    userId: string,
    userType: 'student' | 'teacher'
  ): Promise<string | null> {
    try {
      this.logger.debug('Getting user school_id from icalink_contacts', {
        userId,
        userType
      });

      const schoolId = await this.contactRepository.getSchoolIdByUserId(userId);

      if (schoolId) {
        this.logger.debug('Found user school_id', {
          userId,
          userType,
          schoolId
        });
      } else {
        this.logger.warn('User school_id not found', { userId, userType });
      }

      return schoolId;
    } catch (error: any) {
      this.logger.error('Failed to get user school_id', {
        userId,
        userType,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 获取根部门信息
   *
   * @returns 包含根部门信息的服务结果
   *
   * @example
   * ```typescript
   * const result = await departmentService.getRootDepartment();
   * if (result.success) {
   *   console.log('根部门:', result.data);
   * } else {
   *   console.error('错误:', result.error);
   * }
   * ```
   */
  public async getRootDepartment(): Promise<{
    success: boolean;
    data?: DeptInfo;
    error?: string;
  }> {
    try {
      this.logger.debug('Getting root department');

      const rootDept = await this.wasV7ApiDepartment.getRootDept();

      this.logger.debug('Successfully retrieved root department', {
        deptId: rootDept.id,
        deptName: rootDept.name
      });

      return {
        success: true,
        data: rootDept
      };
    } catch (error: any) {
      this.logger.error('Failed to get root department', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message || 'Failed to get root department'
      };
    }
  }

  /**
   * 获取子部门列表
   *
   * @param deptId - 部门ID
   * @param pageSize - 分页大小（可选，默认10，最大50）
   * @param pageToken - 分页标记（可选）
   * @param withTotal - 是否返回总数（可选）
   * @param rootDeptId - 根部门ID（可选，用于优化性能，避免额外的API调用）
   * @param userId - 登录用户ID（可选，用于权限过滤）
   * @param userType - 登录用户类型（可选，用于权限过滤）
   * @param parentExDeptId - 父部门的 ex_dept_id（可选，用于权限过滤）
   * @returns 包含子部门列表的服务结果
   *
   * @remarks
   * 过滤规则：
   * 1. 全局过滤：过滤掉 ex_dept_id 为 null 或 undefined 的部门
   * 2. 根部门特殊过滤：当父部门是根部门时，只保留 ex_dept_id 以 "02" 或 "03" 开头的部门
   * 3. 学院权限过滤：当父部门的 ex_dept_id 为 '02' 或 '03' 时，只返回与登录用户所属学院ID匹配的部门
   *
   * 性能优化：
   * - 如果传入了 rootDeptId 参数，将通过比较 deptId === rootDeptId 来判断是否为根部门
   * - 如果未传入 rootDeptId 参数，将调用 batchGetDeptInfo API 来判断（向后兼容）
   *
   * @example
   * ```typescript
   * // 推荐方式：传入根部门ID（性能更好）
   * const rootDept = await departmentService.getRootDepartment();
   * const result = await departmentService.getDepartmentChildren(
   *   'dept-id',
   *   20,
   *   undefined,
   *   undefined,
   *   rootDept.data?.id,
   *   'user123',
   *   'teacher',
   *   '02'
   * );
   *
   * // 兼容方式：不传入根部门ID（会额外调用API）
   * const result = await departmentService.getDepartmentChildren('dept-id', 20);
   * ```
   */
  public async getDepartmentChildren(
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
  }> {
    try {
      // 参数验证
      if (!deptId || deptId.trim().length === 0) {
        this.logger.warn('Invalid department ID provided');
        return {
          success: false,
          error: 'Department ID is required'
        };
      }

      if (!rootDeptId) {
        this.logger.debug('Root department ID not provided');
        return {
          success: false,
          error: 'Root department ID is required'
        };
      }

      // 验证 pageSize 范围
      if (pageSize !== undefined && (pageSize < 1 || pageSize > 50)) {
        this.logger.warn('Invalid page size, using default value', {
          providedPageSize: pageSize
        });
        pageSize = 10;
      }

      this.logger.debug('Getting department children', {
        deptId,
        pageSize,
        pageToken,
        withTotal,
        rootDeptId
      });

      // 判断是否为根部门
      const isRootDept = deptId === rootDeptId;

      this.logger.debug('Using provided rootDeptId for comparison', {
        deptId,
        rootDeptId,
        isRootDept
      });

      const children = await this.wasV7ApiDepartment.getDeptChildren({
        dept_id: deptId,
        page_size: pageSize,
        page_token: pageToken,
        with_total: withTotal
      });

      // 获取用户学院ID（如果需要权限过滤）
      let userSchoolId: string | null = null;
      if (
        userId &&
        userType &&
        parentExDeptId &&
        (parentExDeptId === '02' || parentExDeptId === '03')
      ) {
        userSchoolId = await this.getUserSchoolId(userId, userType);
        this.logger.debug('User school_id for permission filtering', {
          userId,
          userType,
          userSchoolId,
          parentExDeptId
        });
      }

      // 应用过滤规则
      const filteredItems = children.items.filter((dept) => {
        // 全局过滤：过滤掉 ex_dept_id 为 null 或 undefined 的部门
        if (!dept.ex_dept_id) {
          this.logger.debug('Filtered out department without ex_dept_id', {
            deptId: dept.id,
            deptName: dept.name
          });
          return false;
        }

        // 根部门特殊过滤：只保留 ex_dept_id 以 "02" 或 "03" 开头的部门
        if (isRootDept) {
          const startsWithValidPrefix =
            dept.ex_dept_id.startsWith('02') ||
            dept.ex_dept_id.startsWith('03');

          if (!startsWithValidPrefix) {
            this.logger.debug(
              'Filtered out root department child with invalid ex_dept_id prefix',
              {
                deptId: dept.id,
                deptName: dept.name,
                exDeptId: dept.ex_dept_id
              }
            );
            return false;
          }
        }

        // 学院权限过滤：当父部门的 ex_dept_id 为 '02' 或 '03' 时
        // 只返回与登录用户所属学院ID匹配的部门
        if (
          userSchoolId &&
          parentExDeptId &&
          (parentExDeptId === '02' || parentExDeptId === '03')
        ) {
          // 提取部门的 ex_dept_id 的前两位之后的部分作为学院ID
          // 例如：'0201' -> '01', '0302' -> '02'
          const deptSchoolId = dept.ex_dept_id.substring(2);

          if (deptSchoolId !== userSchoolId) {
            this.logger.debug(
              'Filtered out department due to school permission',
              {
                deptId: dept.id,
                deptName: dept.name,
                deptExDeptId: dept.ex_dept_id,
                deptSchoolId,
                userSchoolId,
                parentExDeptId
              }
            );
            return false;
          }
        }

        return true;
      });

      this.logger.debug(
        'Successfully retrieved and filtered department children',
        {
          deptId,
          originalCount: children.items.length,
          filteredCount: filteredItems.length,
          hasNextPage: !!children.next_page_token
        }
      );

      return {
        success: true,
        data: {
          items: filteredItems,
          next_page_token: children.next_page_token
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to get department children', {
        deptId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message || 'Failed to get department children'
      };
    }
  }
}
