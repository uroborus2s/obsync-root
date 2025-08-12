/**
 * Tasks插件基础仓储类
 *
 * 继承自@stratix/database的BaseRepository，提供Tasks插件特定的数据访问方法
 */

import type {
  DatabaseResult,
  Option,
  RepositoryConnectionOptions
} from '@stratix/database';
import { BaseRepository } from '@stratix/database';
import type { TasksDatabase } from '../../types/database.js';

// Option 工具函数
export const fromOption = <T>(option: Option<T>): T | null => {
  return option.some ? option.value : null;
};

export const toOption = <T>(value: T | null | undefined): Option<T> => {
  return value != null ? { some: true, value } : { some: false };
};

/**
 * Tasks插件基础仓储实现
 * 继承BaseRepository，添加Tasks特定的便捷方法
 */
export abstract class BaseTasksRepository<
  TB extends keyof TasksDatabase & string,
  T,
  CreateT,
  UpdateT,
  IdType = number
> extends BaseRepository<TasksDatabase, TB, T, CreateT, UpdateT> {
  constructor(connectionOptions?: RepositoryConnectionOptions) {
    super(connectionOptions);
  }

  /**
   * 便捷方法：findById 返回 T | null 类型
   */
  async findByIdNullable(id: IdType): Promise<DatabaseResult<T | null>> {
    const result = await this.findById(id as string | number);
    if (result.success) {
      return {
        success: true,
        data: fromOption(result.data)
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  }

  /**
   * 便捷方法：update 返回 T | null 类型
   */
  async updateNullable(
    id: IdType,
    data: UpdateT
  ): Promise<DatabaseResult<T | null>> {
    const result = await this.update(id as string | number, data);
    if (result.success) {
      return {
        success: true,
        data: fromOption(result.data)
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  }

  /**
   * 便捷方法：findOne 返回 T | null 类型
   * 支持两种参数格式：
   * 1. 简单的filter对象：{ field: value }
   * 2. 查询构建函数：(qb) => qb.where(...)
   */
  async findOneNullable(
    filter: any | ((qb: any) => any)
  ): Promise<DatabaseResult<T | null>> {
    let whereExpression: (qb: any) => any;

    // 判断参数类型
    if (typeof filter === 'function') {
      // 如果是函数，直接使用
      whereExpression = filter;
    } else {
      // 如果是对象，转换为WhereExpression
      whereExpression = (qb: any) => {
        if (!filter) return qb;

        Object.entries(filter).forEach(([key, value]) => {
          qb = qb.where(key, '=', value);
        });
        return qb;
      };
    }

    const result = await this.findOne(whereExpression);
    if (result.success) {
      return {
        success: true,
        data: fromOption(result.data)
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  }

  /**
   * 根据JSON字段查询记录
   * 使用MySQL的JSON_CONTAINS函数
   */
  protected queryByJsonContains(field: string, value: any) {
    return (qb: any) =>
      qb.whereRaw(`JSON_CONTAINS(${field}, ?)`, [JSON.stringify(value)]);
  }

  /**
   * 根据JSON字段路径查询记录
   * 使用MySQL的JSON_EXTRACT函数
   */
  protected queryByJsonPath(field: string, path: string, value: any) {
    return (qb: any) =>
      qb.whereRaw(`JSON_UNQUOTE(JSON_EXTRACT(${field}, ?)) = ?`, [path, value]);
  }

  /**
   * 查询JSON数组中包含指定值的记录
   */
  protected queryByJsonArrayContains(field: string, value: any) {
    return (qb: any) =>
      qb.whereRaw(`JSON_CONTAINS(${field}, ?)`, [`"${value}"`]);
  }

  /**
   * 根据状态查询记录
   */
  protected queryByStatus(status: string | string[]) {
    if (Array.isArray(status)) {
      return (qb: any) => qb.where('status', 'in', status);
    }
    return (qb: any) => qb.where('status', '=', status);
  }

  /**
   * 根据时间范围查询记录
   */
  protected queryByTimeRange(field: string, from?: Date, to?: Date) {
    return (qb: any) => {
      if (from) {
        qb = qb.where(field, '>=', from);
      }
      if (to) {
        qb = qb.where(field, '<=', to);
      }
      return qb;
    };
  }

  /**
   * 获取统计信息的基础查询
   */
  protected getStatsQuery(groupByField: string) {
    return (qb: any) =>
      qb.select(groupByField).count('* as count').groupBy(groupByField);
  }

  /**
   * 计算平均执行时间
   * 使用MySQL的TIMESTAMPDIFF函数
   */
  protected getAverageExecutionTime(startField: string, endField: string) {
    return (qb: any) =>
      qb
        .whereNotNull(startField)
        .whereNotNull(endField)
        .select(
          qb.raw(
            `AVG(TIMESTAMPDIFF(SECOND, ${startField}, ${endField})) as avg_duration`
          )
        );
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(
    ids: number[],
    status: string,
    additionalData?: Partial<T>
  ): Promise<DatabaseResult<number>> {
    const updateData = {
      status,
      ...additionalData,
      updated_at: new Date()
    };

    // 使用BaseRepository的updateMany方法
    const whereExpression = (qb: any) => qb.whereIn('id', ids);
    return await this.updateMany(whereExpression, updateData as UpdateT);
  }

  /**
   * 验证必需字段
   */
  protected validateRequired(data: any, fields: string[]): void {
    for (const field of fields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ''
      ) {
        throw new Error(`Field '${field}' is required`);
      }
    }
  }

  /**
   * 构建创建数据（添加时间戳）
   */
  protected buildCreateData(data: any): any {
    return {
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  /**
   * 构建更新数据（添加更新时间戳）
   */
  protected buildUpdateData(data: any): any {
    return {
      ...data,
      updated_at: new Date()
    };
  }

  /**
   * 记录操作日志
   */
  protected logOperation(operation: string, data: any): void {
    this.logger.debug(`Repository operation: ${operation}`, {
      table: this.tableName,
      operation,
      data
    });
  }
}
