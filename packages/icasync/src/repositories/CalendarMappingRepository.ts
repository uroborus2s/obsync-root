// @stratix/icasync 课程日历映射仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { DatabaseErrorHandler } from '@stratix/database';
import type {
  CalendarMapping,
  CalendarMappingUpdate,
  NewCalendarMapping
} from '../types/database.js';
import { BaseIcasyncRepository } from './base/BaseIcasyncRepository.js';

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
        deleted_at: new Date().toISOString()
      });

      return result.success && result.data !== null;
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

      const result = await this.findOneNullable((eb: any) =>
        eb.and([eb('kkh', '=', kkh), eb('is_deleted', '=', false)])
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

      const result = await this.findOneNullable((eb: any) =>
        eb.and([
          eb('kkh', '=', kkh),
          eb('xnxq', '=', xnxq),
          eb('is_deleted', '=', false)
        ])
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

    return await this.findOneNullable((eb: any) =>
      eb.and([eb('calendar_id', '=', calendarId), eb('is_deleted', '=', false)])
    );
  }

  /**
   * 根据学年学期查找日历映射列表
   */
  async findByXnxq(xnxq: string): Promise<DatabaseResult<CalendarMapping[]>> {
    this.validateXnxq(xnxq);

    return await this.findMany((eb: any) =>
      eb.and([eb('xnxq', '=', xnxq), eb('is_deleted', '=', false)])
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

    return await this.count((eb: any) =>
      eb.and([eb('xnxq', '=', xnxq), eb('is_deleted', '=', false)])
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
    return await this.findMany((eb: any) =>
      eb.and([eb('xnxq', '=', xnxq), eb('is_deleted', '=', false)])
    );
  }
}
