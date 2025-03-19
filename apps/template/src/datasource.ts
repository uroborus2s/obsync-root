/**
 * 自定义数据源实现
 * 开发者需要实现此文件，从源系统获取数据
 */
import {
  DataSourceAdapter,
  Department,
  Person,
  PersonDepartmentRelation
} from '@obsync/account-sync';

export function createCustomDataSource(
  app: any,
  config: any
): DataSourceAdapter {
  // 获取ORM插件
  const orm = app.getContext().plugins.get('@obsync/stratix-orm');
  // 获取日志插件
  const logger = app.getContext().plugins.get('@obsync/logger')?.logger;

  return {
    name: 'custom-datasource',
    description: '自定义数据源实现',

    /**
     * 获取人员数据
     * TODO: 开发者实现从源系统获取人员数据
     */
    async getPersons(): Promise<Person[]> {
      logger?.info('开始获取人员数据');

      try {
        // 使用ORM插件查询数据库示例
        // 下面的代码只是示例，开发者需要根据实际情况修改SQL语句
        const result = await orm.getConnection().query(`
          SELECT 
            id,
            name,
            email,
            phone,
            employee_id as employeeId,
            status,
            created_at as createdAt,
            updated_at as updatedAt
          FROM employees
          WHERE deleted = 0
        `);

        // 将结果转换为标准的Person结构
        // 注意：这里的转换逻辑可以很简单，详细的转换可以在transformer中实现
        return result.map((row: any) => ({
          id: row.id.toString(),
          name: row.name,
          email: row.email,
          phone: row.phone,
          employeeId: row.employeeId,
          status: row.status === 1 ? 'active' : 'inactive',
          attributes: {
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          }
        }));
      } catch (error) {
        logger?.error('获取人员数据失败', error);
        throw error;
      }
    },

    /**
     * 获取部门数据
     * TODO: 开发者实现从源系统获取部门数据
     */
    async getDepartments(): Promise<Department[]> {
      logger?.info('开始获取部门数据');

      try {
        // 使用ORM插件查询数据库示例
        const result = await orm.getConnection().query(`
          SELECT 
            id,
            name,
            code,
            parent_id as parentId,
            display_order as displayOrder,
            status
          FROM departments
          WHERE deleted = 0
        `);

        // 将结果转换为标准的Department结构
        return result.map((row: any) => ({
          id: row.id.toString(),
          name: row.name,
          code: row.code,
          parentId: row.parentId ? row.parentId.toString() : undefined,
          order: row.displayOrder,
          status: row.status === 1 ? 'active' : 'inactive',
          attributes: {}
        }));
      } catch (error) {
        logger?.error('获取部门数据失败', error);
        throw error;
      }
    },

    /**
     * 获取人员部门关系数据
     * TODO: 开发者实现从源系统获取人员部门关系数据
     */
    async getPersonDepartmentRelations(): Promise<PersonDepartmentRelation[]> {
      logger?.info('开始获取人员部门关系数据');

      try {
        // 使用ORM插件查询数据库示例
        const result = await orm.getConnection().query(`
          SELECT 
            employee_id as personId,
            department_id as departmentId,
            is_primary as isPrimary,
            title
          FROM employee_department
          WHERE deleted = 0
        `);

        // 将结果转换为标准的PersonDepartmentRelation结构
        return result.map((row: any) => ({
          personId: row.personId.toString(),
          departmentId: row.departmentId.toString(),
          isPrimary: row.isPrimary === 1,
          title: row.title
        }));
      } catch (error) {
        logger?.error('获取人员部门关系数据失败', error);
        throw error;
      }
    },

    // 增量同步相关方法，如果不需要自定义增量逻辑，可以不实现
    // 插件会使用全量同步策略

    async getChangedPersonsSince(timestamp: Date): Promise<Person[]> {
      // 可选实现：获取自指定时间以来变更的人员数据
      logger?.info(`获取${timestamp}以来变更的人员数据`);

      // 如果有增量获取的需求，开发者在这里实现
      // 默认返回所有人员
      return this.getPersons();
    },

    async getChangedDepartmentsSince(timestamp: Date): Promise<Department[]> {
      // 可选实现：获取自指定时间以来变更的部门数据
      logger?.info(`获取${timestamp}以来变更的部门数据`);

      // 如果有增量获取的需求，开发者在这里实现
      // 默认返回所有部门
      return this.getDepartments();
    },

    async getChangedRelationsSince(
      timestamp: Date
    ): Promise<PersonDepartmentRelation[]> {
      // 可选实现：获取自指定时间以来变更的关系数据
      logger?.info(`获取${timestamp}以来变更的关系数据`);

      // 如果有增量获取的需求，开发者在这里实现
      // 默认返回所有关系
      return this.getPersonDepartmentRelations();
    }
  };
}
