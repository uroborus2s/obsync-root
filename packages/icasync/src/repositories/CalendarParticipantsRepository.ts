// @stratix/icasync 日历参与者映射仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { DatabaseErrorHandler } from '@stratix/database';
import type {
  CalendarParticipant,
  CalendarParticipantUpdate,
  NewCalendarParticipant,
  PermissionRole,
  UserType
} from '../types/database.js';
import { BaseIcasyncRepository } from './base/BaseIcasyncRepository.js';

/**
 * 日历参与者映射仓储接口
 */
export interface ICalendarParticipantsRepository {
  // 基础操作
  findByIdNullable(
    id: number
  ): Promise<DatabaseResult<CalendarParticipant | null>>;
  create(
    data: NewCalendarParticipant
  ): Promise<DatabaseResult<CalendarParticipant>>;
  updateNullable(
    id: number,
    data: CalendarParticipantUpdate
  ): Promise<DatabaseResult<CalendarParticipant | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;

  // 业务查询方法
  findByCalendarId(
    calendarId: string
  ): Promise<DatabaseResult<CalendarParticipant[]>>;
  findByUserCode(
    userCode: string
  ): Promise<DatabaseResult<CalendarParticipant[]>>;
  findByCalendarAndUser(
    calendarId: string,
    userCode: string,
    userType: UserType
  ): Promise<DatabaseResult<CalendarParticipant | null>>;
  findByKkh(kkh: string): Promise<DatabaseResult<CalendarParticipant[]>>;
  findByUserType(
    userType: UserType
  ): Promise<DatabaseResult<CalendarParticipant[]>>;
  findByPermissionRole(
    role: PermissionRole
  ): Promise<DatabaseResult<CalendarParticipant[]>>;

  // 批量操作
  createParticipantsBatch(
    participants: NewCalendarParticipant[]
  ): Promise<DatabaseResult<CalendarParticipant[]>>;
  updatePermissionRole(
    id: number,
    role: PermissionRole
  ): Promise<DatabaseResult<CalendarParticipant | null>>;
  updatePermissionRoleBatch(
    updates: Array<{ id: number; role: PermissionRole }>
  ): Promise<DatabaseResult<number>>;

  // 查询操作
  findCalendarTeachers(
    calendarId: string
  ): Promise<DatabaseResult<CalendarParticipant[]>>;
  findCalendarStudents(
    calendarId: string
  ): Promise<DatabaseResult<CalendarParticipant[]>>;
  findCalendarOwners(
    calendarId: string
  ): Promise<DatabaseResult<CalendarParticipant[]>>;

  // 统计查询
  countByCalendarId(calendarId: string): Promise<DatabaseResult<number>>;
  countByUserType(userType: UserType): Promise<DatabaseResult<number>>;
  countByPermissionRole(role: PermissionRole): Promise<DatabaseResult<number>>;
  countCalendarParticipants(
    calendarId: string,
    userType?: UserType
  ): Promise<DatabaseResult<number>>;

  // 软删除相关操作
  hardDelete(id: number): Promise<DatabaseResult<boolean>>;
  findDeleted(): Promise<DatabaseResult<CalendarParticipant[]>>;
  restore(id: number): Promise<DatabaseResult<CalendarParticipant | null>>;

  // 清理操作
  deleteByCalendarId(calendarId: string): Promise<DatabaseResult<number>>;
  deleteByUserCode(userCode: string): Promise<DatabaseResult<number>>;
}

/**
 * 日历参与者映射仓储实现
 */
export default class CalendarParticipantsRepository
  extends BaseIcasyncRepository<
    'icasync_calendar_participants',
    CalendarParticipant,
    NewCalendarParticipant,
    CalendarParticipantUpdate
  >
  implements ICalendarParticipantsRepository
{
  protected readonly tableName = 'icasync_calendar_participants' as const;

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
  async findDeleted(): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await this.findMany((qb: any) => qb.where('is_deleted', '=', true));
  }

  /**
   * 恢复软删除的记录
   */
  async restore(
    id: number
  ): Promise<DatabaseResult<CalendarParticipant | null>> {
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
  ): Promise<DatabaseResult<CalendarParticipant | null>> {
    return await this.findOneNullable((eb: any) =>
      eb.and([eb('id', '=', id), eb('is_deleted', '=', false)])
    );
  }

  /**
   * 根据日历ID查找参与者
   */
  async findByCalendarId(
    calendarId: string
  ): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateCalendarId(calendarId)) {
        throw new Error('日历ID格式无效');
      }

      const result = await this.findMany((eb: any) =>
        eb.and([
          eb('calendar_id', '=', calendarId),
          eb('is_deleted', '=', false)
        ])
      );

      return result.success ? result.data : [];
    });
  }

  /**
   * 根据用户编号查找参与者
   */
  async findByUserCode(
    userCode: string
  ): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateUserCode(userCode)) {
        throw new Error('用户编号格式无效');
      }

      const result = await this.findMany((eb: any) =>
        eb.and([eb('user_code', '=', userCode), eb('is_deleted', '=', false)])
      );

      return result.success ? result.data : [];
    });
  }

  /**
   * 根据日历ID和用户信息查找参与者
   */
  async findByCalendarAndUser(
    calendarId: string,
    userCode: string,
    userType: UserType
  ): Promise<DatabaseResult<CalendarParticipant | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateCalendarId(calendarId)) {
        throw new Error('日历ID格式无效');
      }
      if (!this.validateUserCode(userCode)) {
        throw new Error('用户编号格式无效');
      }

      const result = await this.findOneNullable((eb: any) =>
        eb.and([
          eb('calendar_id', '=', calendarId),
          eb('user_code', '=', userCode),
          eb('user_type', '=', userType),
          eb('is_deleted', '=', false)
        ])
      );

      return result.success ? result.data : null;
    });
  }

  /**
   * 根据开课号查找参与者
   */
  async findByKkh(kkh: string): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.validateKkh(kkh);

      const result = await this.findMany((eb: any) =>
        eb.and([eb('kkh', '=', kkh), eb('is_deleted', '=', false)])
      );

      return result.success ? result.data : [];
    });
  }

  /**
   * 根据用户类型查找参与者
   */
  async findByUserType(
    userType: UserType
  ): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await this.findMany((eb: any) =>
      eb.and([eb('user_type', '=', userType), eb('is_deleted', '=', false)])
    );
  }

  /**
   * 根据权限角色查找参与者
   */
  async findByPermissionRole(
    role: PermissionRole
  ): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await this.findMany((eb: any) =>
      eb.and([eb('permission_role', '=', role), eb('is_deleted', '=', false)])
    );
  }

  /**
   * 批量创建参与者
   */
  async createParticipantsBatch(
    participants: NewCalendarParticipant[]
  ): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      // 验证所有参与者数据
      for (const participant of participants) {
        if (!this.validateCalendarId(participant.calendar_id)) {
          throw new Error('日历ID格式无效');
        }
        this.validateKkh(participant.kkh);
        if (!this.validateUserCode(participant.user_code)) {
          throw new Error('用户编号格式无效');
        }
      }

      const result = await this.createMany(participants);
      return result.success ? result.data : [];
    });
  }

  /**
   * 更新权限角色
   */
  async updatePermissionRole(
    id: number,
    role: PermissionRole
  ): Promise<DatabaseResult<CalendarParticipant | null>> {
    return await this.updateNullable(id, {
      permission_role: role
    });
  }

  /**
   * 批量更新权限角色
   */
  async updatePermissionRoleBatch(
    updates: Array<{ id: number; role: PermissionRole }>
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      let updatedCount = 0;
      for (const update of updates) {
        const result = await this.updatePermissionRole(update.id, update.role);
        if (result.success && result.data) {
          updatedCount++;
        }
      }
      return updatedCount;
    });
  }

  /**
   * 查找日历中的教师
   */
  async findCalendarTeachers(
    calendarId: string
  ): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateCalendarId(calendarId)) {
        throw new Error('日历ID格式无效');
      }

      const result = await this.findMany((eb: any) =>
        eb.and([
          eb('calendar_id', '=', calendarId),
          eb('user_type', '=', 'teacher'),
          eb('is_deleted', '=', false)
        ])
      );

      return result.success ? result.data : [];
    });
  }

  /**
   * 查找日历中的学生
   */
  async findCalendarStudents(
    calendarId: string
  ): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateCalendarId(calendarId)) {
        throw new Error('日历ID格式无效');
      }

      const result = await this.findMany((eb: any) =>
        eb.and([
          eb('calendar_id', '=', calendarId),
          eb('user_type', '=', 'student'),
          eb('is_deleted', '=', false)
        ])
      );

      return result.success ? result.data : [];
    });
  }

  /**
   * 查找日历的拥有者
   */
  async findCalendarOwners(
    calendarId: string
  ): Promise<DatabaseResult<CalendarParticipant[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateCalendarId(calendarId)) {
        throw new Error('日历ID格式无效');
      }

      const result = await this.findMany((eb: any) =>
        eb.and([
          eb('calendar_id', '=', calendarId),
          eb('permission_role', '=', 'owner'),
          eb('is_deleted', '=', false)
        ])
      );

      return result.success ? result.data : [];
    });
  }

  /**
   * 根据日历ID统计参与者数量
   */
  async countByCalendarId(calendarId: string): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateCalendarId(calendarId)) {
        throw new Error('日历ID格式无效');
      }

      const result = await this.count((eb: any) =>
        eb.and([
          eb('calendar_id', '=', calendarId),
          eb('is_deleted', '=', false)
        ])
      );

      return result.success ? result.data : 0;
    });
  }

  /**
   * 根据用户类型统计参与者数量
   */
  async countByUserType(userType: UserType): Promise<DatabaseResult<number>> {
    return await this.count((eb: any) =>
      eb.and([eb('user_type', '=', userType), eb('is_deleted', '=', false)])
    );
  }

  /**
   * 根据权限角色统计参与者数量
   */
  async countByPermissionRole(
    role: PermissionRole
  ): Promise<DatabaseResult<number>> {
    return await this.count((eb: any) =>
      eb.and([eb('permission_role', '=', role), eb('is_deleted', '=', false)])
    );
  }

  /**
   * 统计日历参与者数量（可按用户类型过滤）
   */
  async countCalendarParticipants(
    calendarId: string,
    userType?: UserType
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateCalendarId(calendarId)) {
        throw new Error('日历ID格式无效');
      }

      const conditions = [
        (qb: any) => qb.where('calendar_id', '=', calendarId),
        (qb: any) => qb.where('is_deleted', '=', false)
      ];

      if (userType) {
        conditions.push((qb: any) => qb.where('user_type', '=', userType));
      }

      const result = await this.count((eb: any) => eb.and(conditions));
      return result.success ? result.data : 0;
    });
  }

  /**
   * 根据日历ID删除参与者（软删除）
   */
  async deleteByCalendarId(
    calendarId: string
  ): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateCalendarId(calendarId)) {
        throw new Error('日历ID格式无效');
      }

      const participants = await this.findByCalendarId(calendarId);
      if (!participants.success || participants.data.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      for (const participant of participants.data) {
        const deleteResult = await this.delete(participant.id);
        if (deleteResult.success && deleteResult.data) {
          deletedCount++;
        }
      }

      return deletedCount;
    });
  }

  /**
   * 根据用户编号删除参与者（软删除）
   */
  async deleteByUserCode(userCode: string): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (!this.validateUserCode(userCode)) {
        throw new Error('用户编号格式无效');
      }

      const participants = await this.findByUserCode(userCode);
      if (!participants.success || participants.data.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      for (const participant of participants.data) {
        const deleteResult = await this.delete(participant.id);
        if (deleteResult.success && deleteResult.data) {
          deletedCount++;
        }
      }

      return deletedCount;
    });
  }
}
