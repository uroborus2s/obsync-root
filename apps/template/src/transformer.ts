/**
 * 自定义数据转换器实现
 * 开发者需要实现此文件，将源数据转换为标准格式
 */
import {
  DataTransformer,
  Department,
  Person,
  PersonDepartmentRelation
} from '@obsync/account-sync';

export function createCustomTransformer(): DataTransformer {
  return {
    name: 'custom-transformer',
    description: '自定义数据转换器',

    /**
     * 转换人员数据
     * TODO: 开发者实现自定义的人员数据转换逻辑
     */
    transformPerson(sourcePerson: any): Person {
      // 开发者需要根据实际的源数据结构进行转换
      // 示例实现:
      return {
        id: sourcePerson.id?.toString() || '',
        name: sourcePerson.full_name || sourcePerson.name || '',
        email: sourcePerson.email_address || sourcePerson.email || '',
        phone: sourcePerson.mobile_phone || sourcePerson.phone || '',
        employeeId: sourcePerson.employee_number || sourcePerson.emp_id || '',
        status: this.determinePersonStatus(sourcePerson),
        attributes: {
          // 额外的属性字段，可以是任何JSON可序列化的值
          position: sourcePerson.position || sourcePerson.job_title,
          department: sourcePerson.department_name,
          hireDate: sourcePerson.hire_date
          // 可以添加更多...
        }
      };
    },

    /**
     * 转换部门数据
     * TODO: 开发者实现自定义的部门数据转换逻辑
     */
    transformDepartment(sourceDepartment: any): Department {
      // 开发者需要根据实际的源数据结构进行转换
      // 示例实现:
      return {
        id: sourceDepartment.id?.toString() || '',
        name: sourceDepartment.department_name || sourceDepartment.name || '',
        code: sourceDepartment.department_code || sourceDepartment.code || '',
        parentId: sourceDepartment.parent_id
          ? sourceDepartment.parent_id.toString()
          : undefined,
        order: Number(
          sourceDepartment.display_order || sourceDepartment.sort_order || 0
        ),
        status: this.determineDepartmentStatus(sourceDepartment),
        attributes: {
          // 额外的属性字段
          description: sourceDepartment.description,
          managerName: sourceDepartment.manager_name
          // 可以添加更多...
        }
      };
    },

    /**
     * 转换人员部门关系数据
     * TODO: 开发者实现自定义的关系数据转换逻辑
     */
    transformRelation(sourceRelation: any): PersonDepartmentRelation {
      // 开发者需要根据实际的源数据结构进行转换
      // 示例实现:
      return {
        personId: (
          sourceRelation.employee_id ||
          sourceRelation.person_id ||
          ''
        ).toString(),
        departmentId: (sourceRelation.department_id || '').toString(),
        isPrimary: Boolean(sourceRelation.is_primary || sourceRelation.primary),
        title: sourceRelation.job_title || sourceRelation.position_name || ''
      };
    },

    // 辅助方法: 确定人员状态
    determinePersonStatus(sourcePerson: any): 'active' | 'inactive' {
      if (sourcePerson.hasOwnProperty('is_active')) {
        return sourcePerson.is_active ? 'active' : 'inactive';
      }

      if (sourcePerson.hasOwnProperty('status')) {
        const status = String(sourcePerson.status).toLowerCase();
        return ['active', 'normal', '1', 'true', 'yes'].includes(status)
          ? 'active'
          : 'inactive';
      }

      if (
        sourcePerson.hasOwnProperty('deleted') ||
        sourcePerson.hasOwnProperty('is_deleted')
      ) {
        const isDeleted = sourcePerson.deleted || sourcePerson.is_deleted;
        return isDeleted ? 'inactive' : 'active';
      }

      // 默认为活跃状态
      return 'active';
    },

    // 辅助方法: 确定部门状态
    determineDepartmentStatus(sourceDepartment: any): 'active' | 'inactive' {
      if (sourceDepartment.hasOwnProperty('is_active')) {
        return sourceDepartment.is_active ? 'active' : 'inactive';
      }

      if (sourceDepartment.hasOwnProperty('status')) {
        const status = String(sourceDepartment.status).toLowerCase();
        return ['active', 'normal', '1', 'true', 'yes'].includes(status)
          ? 'active'
          : 'inactive';
      }

      if (
        sourceDepartment.hasOwnProperty('deleted') ||
        sourceDepartment.hasOwnProperty('is_deleted')
      ) {
        const isDeleted =
          sourceDepartment.deleted || sourceDepartment.is_deleted;
        return isDeleted ? 'inactive' : 'active';
      }

      // 默认为活跃状态
      return 'active';
    }
  };
}
