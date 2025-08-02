// @stratix/icasync 日程映射仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type {
  ExtendedSyncStatus,
  NewScheduleMapping,
  ScheduleMapping,
  ScheduleMappingUpdate
} from '../types/database.js';
import { BaseIcasyncRepository } from './base/BaseIcasyncRepository.js';

/**
 * 日程映射仓储接口
 */
export interface IScheduleMappingRepository {
  // 基础操作
  findByIdNullable(id: number): Promise<DatabaseResult<ScheduleMapping | null>>;
  create(data: NewScheduleMapping): Promise<DatabaseResult<ScheduleMapping>>;
  updateNullable(
    id: number,
    data: ScheduleMappingUpdate
  ): Promise<DatabaseResult<ScheduleMapping | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;

  // 业务查询方法
  findByJuheRenwuId(
    juheRenwuId: number
  ): Promise<DatabaseResult<ScheduleMapping | null>>;
  findByScheduleId(
    scheduleId: string
  ): Promise<DatabaseResult<ScheduleMapping | null>>;
  findByKkh(kkh: string): Promise<DatabaseResult<ScheduleMapping[]>>;
  findByCalendarId(
    calendarId: string
  ): Promise<DatabaseResult<ScheduleMapping[]>>;
  findBySyncStatus(
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<ScheduleMapping[]>>;

  // 批量操作
  createMappingsBatch(
    mappings: NewScheduleMapping[]
  ): Promise<DatabaseResult<ScheduleMapping[]>>;
  updateSyncStatus(
    id: number,
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<ScheduleMapping | null>>;
  updateSyncStatusBatch(
    ids: number[],
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<number>>;
  updateSyncStatusByJuheRenwuIds(
    juheRenwuIds: number[],
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<number>>;

  // 查询操作
  findPendingSchedules(): Promise<DatabaseResult<ScheduleMapping[]>>;
  findFailedSchedules(): Promise<DatabaseResult<ScheduleMapping[]>>;
  findDeletedSchedules(): Promise<DatabaseResult<ScheduleMapping[]>>;

  // 统计查询
  countByKkh(kkh: string): Promise<DatabaseResult<number>>;
  countByCalendarId(calendarId: string): Promise<DatabaseResult<number>>;
  countBySyncStatus(
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<number>>;

  // 清理操作
  deleteByKkh(kkh: string): Promise<DatabaseResult<number>>;
  deleteByCalendarId(calendarId: string): Promise<DatabaseResult<number>>;
  deleteSoftDeletedSchedules(): Promise<DatabaseResult<number>>;
}

/**
 * 日程映射仓储实现
 */
export default class ScheduleMappingRepository
  extends BaseIcasyncRepository<
    'icasync_schedule_mapping',
    ScheduleMapping,
    NewScheduleMapping,
    ScheduleMappingUpdate
  >
  implements IScheduleMappingRepository
{
  protected readonly tableName = 'icasync_schedule_mapping' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
  }

  /**
   * 根据聚合任务ID查找日程映射
   */
  async findByJuheRenwuId(
    juheRenwuId: number
  ): Promise<DatabaseResult<ScheduleMapping | null>> {
    if (!juheRenwuId || juheRenwuId <= 0) {
      throw new Error('Invalid juhe_renwu_id');
    }

    return await this.findOneNullable((eb: any) =>
      eb('juhe_renwu_id', '=', juheRenwuId)
    );
  }

  /**
   * 根据日程ID查找映射
   */
  async findByScheduleId(
    scheduleId: string
  ): Promise<DatabaseResult<ScheduleMapping | null>> {
    this.validateScheduleId(scheduleId);

    return await this.findOneNullable((eb: any) =>
      eb('schedule_id', '=', scheduleId)
    );
  }

  /**
   * 根据开课号查找所有日程映射
   */
  async findByKkh(kkh: string): Promise<DatabaseResult<ScheduleMapping[]>> {
    this.validateKkh(kkh);

    return await this.findMany((qb: any) => qb.where('kkh', '=', kkh), {
      orderBy: 'created_at',
      order: 'desc'
    });
  }

  /**
   * 根据日历ID查找所有日程映射
   */
  async findByCalendarId(
    calendarId: string
  ): Promise<DatabaseResult<ScheduleMapping[]>> {
    this.validateCalendarId(calendarId);

    return await this.findMany(
      (qb: any) => qb.where('calendar_id', '=', calendarId),
      {
        orderBy: 'created_at',
        order: 'desc'
      }
    );
  }

  /**
   * 根据同步状态查找日程映射
   */
  async findBySyncStatus(
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<ScheduleMapping[]>> {
    if (!this.validateExtendedSyncStatus(status)) {
      throw new Error(`Invalid sync status: ${status}`);
    }

    return await this.findMany((qb: any) => qb.where('sync_status', '=', status), {
      orderBy: 'created_at',
      order: 'desc'
    });
  }

  /**
   * 批量创建日程映射
   */
  async createMappingsBatch(
    mappings: NewScheduleMapping[]
  ): Promise<DatabaseResult<ScheduleMapping[]>> {
    if (!mappings || mappings.length === 0) {
      throw new Error('Mappings array cannot be empty');
    }

    // 验证每个映射数据
    for (const mapping of mappings) {
      this.validateRequired(mapping, [
        'juhe_renwu_id',
        'kkh',
        'calendar_id',
        'schedule_id'
      ]);

      if (mapping.juhe_renwu_id <= 0) {
        throw new Error('Invalid juhe_renwu_id');
      }

      this.validateKkh(mapping.kkh);
      this.validateCalendarId(mapping.calendar_id);
      this.validateScheduleId(mapping.schedule_id);

      if (
        mapping.sync_status &&
        !this.validateExtendedSyncStatus(mapping.sync_status)
      ) {
        throw new Error(`Invalid sync status: ${mapping.sync_status}`);
      }
    }

    return await this.createMany(mappings);
  }

  /**
   * 更新同步状态
   */
  async updateSyncStatus(
    id: number,
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<ScheduleMapping | null>> {
    if (!this.validateExtendedSyncStatus(status)) {
      throw new Error(`Invalid sync status: ${status}`);
    }

    const updateData = this.buildUpdateData({
      sync_status: status
    });

    const result = await super.update(id, updateData as ScheduleMappingUpdate);
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }
    return result as DatabaseResult<ScheduleMapping | null>;
  }

  /**
   * 批量更新同步状态
   */
  async updateSyncStatusBatch(
    ids: number[],
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<number>> {
    if (!ids || ids.length === 0) {
      throw new Error('IDs array cannot be empty');
    }

    if (!this.validateExtendedSyncStatus(status)) {
      throw new Error(`Invalid sync status: ${status}`);
    }

    const updateData = this.buildUpdateData({
      sync_status: status
    });

    return await this.updateMany(
      { id: ids } as any,
      updateData as ScheduleMappingUpdate
    );
  }

  /**
   * 根据聚合任务ID批量更新同步状态
   */
  async updateSyncStatusByJuheRenwuIds(
    juheRenwuIds: number[],
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<number>> {
    if (!juheRenwuIds || juheRenwuIds.length === 0) {
      throw new Error('JuheRenwu IDs array cannot be empty');
    }

    if (!this.validateExtendedSyncStatus(status)) {
      throw new Error(`Invalid sync status: ${status}`);
    }

    const updateData = this.buildUpdateData({
      sync_status: status
    });

    return await this.updateMany(
      { juhe_renwu_id: juheRenwuIds } as any,
      updateData as ScheduleMappingUpdate
    );
  }

  /**
   * 查找待处理的日程
   */
  async findPendingSchedules(): Promise<DatabaseResult<ScheduleMapping[]>> {
    return await this.findBySyncStatus('pending');
  }

  /**
   * 查找失败的日程
   */
  async findFailedSchedules(): Promise<DatabaseResult<ScheduleMapping[]>> {
    return await this.findBySyncStatus('failed');
  }

  /**
   * 查找已删除的日程
   */
  async findDeletedSchedules(): Promise<DatabaseResult<ScheduleMapping[]>> {
    return await this.findBySyncStatus('deleted');
  }

  /**
   * 统计指定开课号的日程映射数量
   */
  async countByKkh(kkh: string): Promise<DatabaseResult<number>> {
    this.validateKkh(kkh);

    return await this.count((qb: any) => qb.where('kkh', '=', kkh));
  }

  /**
   * 统计指定日历的日程映射数量
   */
  async countByCalendarId(calendarId: string): Promise<DatabaseResult<number>> {
    this.validateCalendarId(calendarId);

    return await this.count((qb: any) => qb.where('calendar_id', '=', calendarId));
  }

  /**
   * 统计指定同步状态的日程映射数量
   */
  async countBySyncStatus(
    status: ExtendedSyncStatus
  ): Promise<DatabaseResult<number>> {
    if (!this.validateExtendedSyncStatus(status)) {
      throw new Error(`Invalid sync status: ${status}`);
    }

    return await this.count((qb: any) => qb.where('sync_status', '=', status));
  }

  /**
   * 删除指定开课号的所有日程映射
   */
  async deleteByKkh(kkh: string): Promise<DatabaseResult<number>> {
    this.validateKkh(kkh);

    return await this.deleteMany((qb: any) => qb.where('kkh', '=', kkh));
  }

  /**
   * 删除指定日历的所有日程映射
   */
  async deleteByCalendarId(
    calendarId: string
  ): Promise<DatabaseResult<number>> {
    this.validateCalendarId(calendarId);

    return await this.deleteMany((eb: any) =>
      eb('calendar_id', '=', calendarId)
    );
  }

  /**
   * 删除软删除状态的日程映射
   */
  async deleteSoftDeletedSchedules(): Promise<DatabaseResult<number>> {
    return await this.deleteMany((eb: any) =>
      eb('sync_status', '=', 'deleted')
    );
  }

  /**
   * 验证扩展同步状态
   */
  private validateExtendedSyncStatus(status: string): boolean {
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
   * 创建日程映射（重写以添加验证）
   */
  async create(
    data: NewScheduleMapping
  ): Promise<DatabaseResult<ScheduleMapping>> {
    // 验证必需字段
    this.validateRequired(data, [
      'juhe_renwu_id',
      'kkh',
      'calendar_id',
      'schedule_id'
    ]);

    // 验证字段格式
    if (data.juhe_renwu_id <= 0) {
      throw new Error('Invalid juhe_renwu_id');
    }

    this.validateKkh(data.kkh);
    this.validateCalendarId(data.calendar_id);
    this.validateScheduleId(data.schedule_id);

    if (
      data.sync_status &&
      !this.validateExtendedSyncStatus(data.sync_status)
    ) {
      throw new Error(`Invalid sync status: ${data.sync_status}`);
    }

    // 检查是否已存在相同的映射
    const existingResult = await this.findByJuheRenwuId(data.juhe_renwu_id);
    if (existingResult.success && existingResult.data) {
      throw new Error(
        `Schedule mapping already exists for juhe_renwu_id: ${data.juhe_renwu_id}`
      );
    }

    const createData = this.buildCreateData({
      ...data,
      sync_status: data.sync_status || 'pending'
    });

    this.logOperation('create', {
      juhe_renwu_id: data.juhe_renwu_id,
      kkh: data.kkh,
      schedule_id: data.schedule_id
    });

    return await super.create(createData as NewScheduleMapping);
  }

  /**
   * 删除日程映射（重写以添加日志）
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    this.logOperation('delete', { id });

    return await super.delete(id);
  }
}
