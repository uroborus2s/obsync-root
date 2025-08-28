// @stratix/icasync 基础仓储
import type { RepositoryConnectionOptions } from '@stratix/database';
import { BaseRepository, type DatabaseResult } from '@stratix/database';
import type { IcasyncDatabase } from '../../types/database.js';

// Option 类型定义（从 @stratix/database 复制）
export type Option<T> = { some: true; value: T } | { some: false };

// Option 工具函数
export const fromOption = <T>(option: Option<T>): T | null => {
  return option.some ? option.value : null;
};

export const toOption = <T>(value: T | null | undefined): Option<T> => {
  return value != null ? { some: true, value } : { some: false };
};

/**
 * Icasync 基础仓储接口
 * 提供 T | null 返回类型的便捷方法
 */
export interface IBaseIcasyncRepository<T, CreateT, UpdateT, IdType = number> {
  // 基础CRUD操作（便捷方法，返回 T | null）
  findByIdNullable(id: IdType): Promise<DatabaseResult<T | null>>;
  updateNullable(id: IdType, data: UpdateT): Promise<DatabaseResult<T | null>>;

  // 查询操作（便捷方法）
  findOneNullable(filter: any): Promise<DatabaseResult<T | null>>;
  findMany(filter?: any, options?: any): Promise<DatabaseResult<T[]>>;
}

/**
 * Icasync 基础仓储实现
 * 扩展 BaseRepository，添加 icasync 特定的工具方法
 * 自动注入 database.manager 适配器
 */
export abstract class BaseIcasyncRepository<
  TB extends keyof IcasyncDatabase & string,
  T,
  CreateT,
  UpdateT,
  IdType = number
> extends BaseRepository<IcasyncDatabase, TB, T, CreateT, UpdateT> {
  constructor(connectionOptions?: RepositoryConnectionOptions) {
    // 从DI容器中注入 database.manager 适配器
    super(connectionOptions);
  }

  /**
   * 便捷方法：findById 返回 T | null 类型
   */
  async findByIdNullable(id: IdType): Promise<DatabaseResult<T | null>> {
    const result = await super.findById(id as any);
    if (result.success) {
      return {
        success: true,
        data: fromOption(result.data)
      };
    }
    return result as DatabaseResult<T | null>;
  }

  /**
   * 便捷方法：update 返回 T | null 类型
   */
  async updateNullable(
    id: IdType,
    data: UpdateT
  ): Promise<DatabaseResult<T | null>> {
    const result = await super.update(id as any, data);
    if (result.success) {
      return {
        success: true,
        data: fromOption(result.data)
      };
    }
    return result as DatabaseResult<T | null>;
  }

  /**
   * 便捷方法：findOne 返回 T | null 类型
   */
  async findOneNullable(
    filter: any,
    options?: any
  ): Promise<DatabaseResult<T | null>> {
    const result = await super.findOne(filter);
    if (result.success) {
      return {
        success: true,
        data: fromOption(result.data)
      };
    }
    return result as DatabaseResult<T | null>;
  }

  /**
   * 生成自增ID（由数据库自动生成）
   */
  protected generateId(): number {
    // 自增ID由数据库自动生成，这里返回0作为占位符
    return 0;
  }

  /**
   * 获取当前时间戳
   */
  protected getCurrentTimestamp(): Date {
    return new Date();
  }

  /**
   * 验证同步状态
   */
  protected validateSyncStatus(status: string): boolean {
    const validStatuses = [
      'pending',
      'syncing',
      'completed',
      'failed',
      'deleted'
    ];
    return validStatuses.includes(status);
  }

  /**
   * 验证用户类型
   */
  protected validateUserType(userType: string): boolean {
    return ['student', 'teacher'].includes(userType);
  }

  /**
   * 验证权限角色
   */
  protected validatePermissionRole(role: string): boolean {
    return ['reader', 'writer', 'owner'].includes(role);
  }

  /**
   * 验证任务类型
   */
  protected validateTaskType(taskType: string): boolean {
    return ['full_sync', 'incremental_sync', 'user_sync'].includes(taskType);
  }

  /**
   * 验证任务状态
   */
  protected validateTaskStatus(status: string): boolean {
    return ['pending', 'running', 'completed', 'failed', 'cancelled'].includes(
      status
    );
  }

  /**
   * 验证开课号格式
   */
  protected validateKkh(kkh: string): void {
    if (!kkh) {
      throw new Error('开课号参数不能为空');
    }

    if (typeof kkh !== 'string') {
      throw new Error('开课号参数必须是字符串');
    }

    // 开课号不能为空且长度合理
    if (kkh.length === 0 || kkh.length > 60) {
      throw new Error(`开课号长度必须在1-60字符之间，实际长度: ${kkh.length}`);
    }
  }

  /**
   * 验证用户编号格式
   */
  protected validateUserCode(userCode: string): boolean {
    // 用户编号不能为空且长度合理
    return (
      typeof userCode === 'string' &&
      userCode.length > 0 &&
      userCode.length <= 100
    );
  }

  /**
   * 验证日历ID格式
   */
  protected validateCalendarId(calendarId: string): boolean {
    // 日历ID不能为空且长度合理
    return (
      typeof calendarId === 'string' &&
      calendarId.length > 0 &&
      calendarId.length <= 100
    );
  }

  /**
   * 验证日程ID格式
   */
  protected validateScheduleId(scheduleId: string): boolean {
    // 日程ID不能为空且长度合理
    return (
      typeof scheduleId === 'string' &&
      scheduleId.length > 0 &&
      scheduleId.length <= 100
    );
  }

  /**
   * 验证进度值
   */
  protected validateProgress(progress: number): boolean {
    return typeof progress === 'number' && progress >= 0 && progress <= 100;
  }

  /**
   * 构建分页查询选项
   */
  protected buildPaginationOptions(page: number = 1, pageSize: number = 20) {
    const offset = (page - 1) * pageSize;
    return {
      limit: pageSize,
      offset: offset
    };
  }

  /**
   * 构建排序选项
   */
  protected buildOrderOptions(
    orderBy: string = 'id',
    order: 'asc' | 'desc' = 'desc'
  ) {
    return {
      orderBy,
      order
    };
  }

  /**
   * 处理JSON字段
   */
  protected serializeJsonField(data: any): string | null {
    if (data === null || data === undefined) {
      return null;
    }
    try {
      return JSON.stringify(data);
    } catch (error) {
      throw new Error(
        `Failed to serialize JSON field: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 解析JSON字段
   */
  protected parseJsonField<T = any>(jsonString: string | null): T | null {
    if (!jsonString) {
      return null;
    }
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse JSON field: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 构建WHERE条件
   */
  protected buildWhereConditions(filter: Partial<T>) {
    const conditions: Array<{ field: string; operator: string; value: any }> =
      [];

    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          conditions.push({ field: key, operator: 'in', value });
        } else if (typeof value === 'string' && value.includes('%')) {
          conditions.push({ field: key, operator: 'like', value });
        } else {
          conditions.push({ field: key, operator: '=', value });
        }
      }
    }

    return conditions;
  }

  /**
   * 处理数据库操作错误
   */
  protected handleDatabaseError(
    operation: string,
    error: unknown,
    context?: Record<string, any>
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logError(operation, new Error(errorMessage), context);
    throw new Error(`${operation} failed: ${errorMessage}`);
  }

  /**
   * 清理数据（移除undefined值）
   */
  protected cleanData<T extends Record<string, any>>(data: T): T {
    const cleaned = {} as T;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key as keyof T] = value;
      }
    }
    return cleaned;
  }

  /**
   * 构建更新数据（添加updated_at时间戳）
   */
  protected buildUpdateData<T extends Record<string, any>>(
    data: T
  ): T & { updated_at?: Date } {
    return {
      ...this.cleanData(data),
      updated_at: this.getCurrentTimestamp()
    };
  }

  /**
   * 构建创建数据（添加created_at时间戳）
   */
  protected buildCreateData<T extends Record<string, any>>(
    data: T
  ): T & { created_at?: Date } {
    const now = this.getCurrentTimestamp();
    return {
      ...this.cleanData(data),
      created_at: now,
      updated_at: now
    };
  }

  /**
   * 验证学年学期格式
   */
  protected validateXnxq(xnxq: string): void {
    if (!xnxq || !/^\d{4}-\d{4}-[12]$/.test(xnxq)) {
      throw new Error('Invalid xnxq format. Expected format: YYYY-YYYY-S');
    }
  }
}
