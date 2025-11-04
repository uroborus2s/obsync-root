// @stratix/icasync 课程日历映射仓储
import { Logger } from '@stratix/core';
import type {
  DatabaseAPI,
  DatabaseResult,
  QueryOptions
} from '@stratix/database';
import { DatabaseErrorHandler } from '@stratix/database';
import { isRight } from '@stratix/utils/functional';
import type {
  CalendarMapping,
  CalendarMappingUpdate,
  NewCalendarMapping
} from '../types/database.js';
import { BaseIcasyncRepository } from './base/BaseIcasyncRepository.js';

/**
 * 将JavaScript Date转换为MySQL datetime格式
 * @param date Date对象或null
 * @returns MySQL兼容的datetime字符串或null
 */
function toMySQLDateTime(date: Date | null): string | null {
  if (!date) return null;

  // 转换为MySQL datetime格式: YYYY-MM-DD HH:MM:SS
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

/**
 * 课程日历映射仓储接口
 */
export interface ICalendarMappingRepository {
  // 基础操作（使用便捷方法）
  findByIdNullable(id: number): Promise<DatabaseResult<CalendarMapping | null>>;
  create(data: NewCalendarMapping): Promise<DatabaseResult<CalendarMapping>>;
  updateNullable(
    id: number,
    data: CalendarMappingUpdate
  ): Promise<DatabaseResult<CalendarMapping | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;
  findMany(
    filter?: any,
    options?: any
  ): Promise<DatabaseResult<CalendarMapping[]>>;
  count(filter?: any): Promise<DatabaseResult<number>>;

  // 业务查询方法
  findByKkh(kkh: string): Promise<DatabaseResult<CalendarMapping | null>>;
  findByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<CalendarMapping | null>>;
  findByCalendarId(
    calendarId: string
  ): Promise<DatabaseResult<CalendarMapping | null>>;
  findByXnxq(xnxq: string): Promise<DatabaseResult<CalendarMapping[]>>;
  findByXnxqWithOptions(
    xnxq: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarMapping[]>>;
  findByXnxqWithStatus(
    xnxq: string,
    statuses: string[],
    limit?: number
  ): Promise<DatabaseResult<CalendarMapping[]>>;

  // 批量操作
  createMappingsBatch(
    mappings: NewCalendarMapping[]
  ): Promise<DatabaseResult<CalendarMapping[]>>;

  // 统计查询
  countByXnxq(xnxq: string): Promise<DatabaseResult<number>>;

  // 软删除相关操作
  hardDelete(id: number): Promise<DatabaseResult<boolean>>;
  findDeleted(): Promise<DatabaseResult<CalendarMapping[]>>;
  restore(id: number): Promise<DatabaseResult<CalendarMapping | null>>;

  // 清理操作
  deleteByXnxq(xnxq: string): Promise<DatabaseResult<number>>;
  deleteByCalendarId(calendarId: string): Promise<DatabaseResult<boolean>>;
  markAsDeleted(calendarId: string): Promise<DatabaseResult<boolean>>;
}

/**
 * 课程日历映射仓储实现
 */
export default class CalendarMappingRepository
  extends BaseIcasyncRepository<
    'icasync_calendar_mapping',
    CalendarMapping,
    NewCalendarMapping,
    CalendarMappingUpdate
  >
  implements ICalendarMappingRepository
{
  protected readonly tableName = 'icasync_calendar_mapping' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
  }

  /**
   * 重写 delete 方法为软删除
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await this.updateNullable(id, {
        is_deleted: true,
        deleted_at: toMySQLDateTime(new Date())
      });

      return isRight(result) && result.right !== null;
    });
  }

  /**
   * 物理删除记录
   */
  async hardDelete(id: number): Promise<DatabaseResult<boolean>> {
    // 调用父类的 delete 方法进行物理删除
    return await super.delete(id);
  }

  /**
   * 查询已删除的记录
   */
  async findDeleted(): Promise<DatabaseResult<CalendarMapping[]>> {
    return await this.findMany((qb: any) => qb.where('is_deleted', '=', true));
  }

  /**
   * 恢复软删除的记录
   */
  async restore(id: number): Promise<DatabaseResult<CalendarMapping | null>> {
    return await this.updateNullable(id, {
      is_deleted: false,
      deleted_at: null
    });
  }

  /**
   * 重写基础查询方法，默认过滤软删除的记录
   */
  async findByIdNullable(
    id: number
  ): Promise<DatabaseResult<CalendarMapping | null>> {
    return await this.findOneNullable((eb: any) =>
      eb.and([eb('id', '=', id), eb('is_deleted', '=', false)])
    );
  }

  /**
   * 根据开课号查找日历映射
   */
  async findByKkh(
    kkh: string
  ): Promise<DatabaseResult<CalendarMapping | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.validateKkh(kkh);

      const result = await this.findOneNullable((qb: any) =>
        qb.where('kkh', '=', kkh).where('is_deleted', '=', false)
      );

      return result.success ? result.data : null;
    });
  }

  /**
   * 根据开课号和学年学期查找日历映射
   */
  async findByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<CalendarMapping | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.validateKkh(kkh);

      this.validateXnxq(xnxq);

      const result = await this.findOneNullable((qb: any) =>
        qb
          .where('kkh', '=', kkh)
          .where('xnxq', '=', xnxq)
          .where('is_deleted', '=', false)
      );

      return result.success ? result.data : null;
    });
  }

  /**
   * 根据日历ID查找日历映射
   */
  async findByCalendarId(
    calendarId: string
  ): Promise<DatabaseResult<CalendarMapping | null>> {
    this.validateCalendarId(calendarId);

    return await this.findOneNullable((qb: any) =>
      qb.where('calendar_id', '=', calendarId).where('is_deleted', '=', false)
    );
  }

  /**
   * 根据学年学期查找日历映射列表
   */
  async findByXnxq(xnxq: string): Promise<DatabaseResult<CalendarMapping[]>> {
    this.validateXnxq(xnxq);

    return await this.findMany((qb: any) =>
      qb.where('xnxq', '=', xnxq).where('is_deleted', '=', false)
    );
  }

  /**
   * 根据学年学期查找日历映射列表（支持排序和其他查询选项）
   */
  async findByXnxqWithOptions(
    xnxq: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<CalendarMapping[]>> {
    this.validateXnxq(xnxq);

    return await this.findMany(
      (qb: any) => qb.where('xnxq', '=', xnxq).where('is_deleted', '=', false),
      options
    );
  }

  /**
   * 批量创建日历映射
   */
  async createMappingsBatch(
    mappings: NewCalendarMapping[]
  ): Promise<DatabaseResult<CalendarMapping[]>> {
    // 验证所有映射数据
    for (const mapping of mappings) {
      this.validateKkh(mapping.kkh);
      this.validateXnxq(mapping.xnxq);
      this.validateCalendarId(mapping.calendar_id);
    }

    return await this.createMany(mappings);
  }

  /**
   * 根据学年学期统计日历映射数量
   */
  async countByXnxq(xnxq: string): Promise<DatabaseResult<number>> {
    this.validateXnxq(xnxq);

    return await this.count((qb: any) =>
      qb.where('xnxq', '=', xnxq).where('is_deleted', '=', false)
    );
  }

  /**
   * 根据学年学期删除日历映射（软删除）
   */
  async deleteByXnxq(xnxq: string): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.validateXnxq(xnxq);

      const mappings = await this.findByXnxq(xnxq);
      if (!mappings.success || mappings.data.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      for (const mapping of mappings.data) {
        const deleteResult = await this.delete(mapping.id);
        if (deleteResult.success && deleteResult.data) {
          deletedCount++;
        }
      }

      return deletedCount;
    });
  }

  /**
   * 根据学年学期和状态查询日历映射
   */
  async findByXnxqWithStatus(
    xnxq: string,
    statuses: string[],
    limit?: number
  ): Promise<DatabaseResult<CalendarMapping[]>> {
    this.validateXnxq(xnxq);

    if (!statuses || statuses.length === 0) {
      throw new Error('状态列表不能为空');
    }

    // 简化实现：由于当前表结构没有 status 字段，我们先返回基于 xnxq 的查询
    // TODO: 当表结构更新后，可以添加状态过滤
    let query = (qb: any) =>
      qb.where('xnxq', '=', xnxq).where('is_deleted', '=', false);

    if (limit && limit > 0) {
      query = (qb: any) =>
        qb
          .where('xnxq', '=', xnxq)
          .where('is_deleted', '=', false)
          .limit(limit);
    }

    return await this.findMany(query);
  }

  /**
   * 根据日历ID删除映射记录（软删除）
   */
  async deleteByCalendarId(
    calendarId: string
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.validateCalendarId(calendarId);

      const mapping = await this.findByCalendarId(calendarId);
      if (!mapping.success || !mapping.data) {
        return false; // 记录不存在，认为删除成功
      }

      const deleteResult = await this.delete(mapping.data.id);
      return deleteResult.success && deleteResult.data;
    });
  }

  /**
   * 标记日历为已删除状态
   */
  async markAsDeleted(calendarId: string): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.validateCalendarId(calendarId);

      const mapping = await this.findByCalendarId(calendarId);
      if (!mapping.success || !mapping.data) {
        return false; // 记录不存在
      }

      const updateResult = await this.updateNullable(mapping.data.id, {
        is_deleted: true,
        deleted_at: toMySQLDateTime(new Date())
      });

      return updateResult.success && updateResult.data !== null;
    });
  }
}
