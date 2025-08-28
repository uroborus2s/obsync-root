// @stratix/icasync 签到课程仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type {
  AttendanceCourse,
  AttendanceCourseUpdate,
  NewAttendanceCourse
} from '../types/database.js';
import { BaseIcasyncRepository } from './base/BaseIcasyncRepository.js';

/**
 * 签到课程仓储接口
 */
export interface IAttendanceCoursesRepository {
  // 基础操作
  findByIdNullable(
    id: number
  ): Promise<DatabaseResult<AttendanceCourse | null>>;
  create(data: NewAttendanceCourse): Promise<DatabaseResult<AttendanceCourse>>;
  updateNullable(
    id: number,
    data: AttendanceCourseUpdate
  ): Promise<DatabaseResult<AttendanceCourse | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;

  // 查询操作
  findByJuheRenwuId(
    juheRenwuId: number
  ): Promise<DatabaseResult<AttendanceCourse | null>>;
  findByExternalId(
    externalId: string
  ): Promise<DatabaseResult<AttendanceCourse | null>>;
  findByCourseCode(
    courseCode: string,
    semester: string
  ): Promise<DatabaseResult<AttendanceCourse[]>>;
  findBySemester(semester: string): Promise<DatabaseResult<AttendanceCourse[]>>;
  findByTeacherCode(
    teacherCode: string,
    semester: string
  ): Promise<DatabaseResult<AttendanceCourse[]>>;
  findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<DatabaseResult<AttendanceCourse[]>>;
  findEnabledCourses(
    semester: string
  ): Promise<DatabaseResult<AttendanceCourse[]>>;

  // 批量操作
  createBatch(
    courses: NewAttendanceCourse[]
  ): Promise<DatabaseResult<AttendanceCourse[]>>;
  updateAttendanceStatus(
    ids: number[],
    enabled: boolean
  ): Promise<DatabaseResult<number>>;
  deleteBySemester(semester: string): Promise<DatabaseResult<number>>;
  deleteByCourseCode(
    courseCode: string,
    semester: string
  ): Promise<DatabaseResult<number>>;

  // 统计查询
  countBySemester(semester: string): Promise<DatabaseResult<number>>;
  countEnabledCourses(semester: string): Promise<DatabaseResult<number>>;
  countByTeacher(
    teacherCode: string,
    semester: string
  ): Promise<DatabaseResult<number>>;

  // 软删除操作
  softDeleteAll(deletedBy?: string): Promise<DatabaseResult<number>>;
  softDeleteBySemester(
    semester: string,
    deletedBy?: string
  ): Promise<DatabaseResult<number>>;
  softDeleteByCourseCode(
    courseCode: string,
    semester: string,
    deletedBy?: string
  ): Promise<DatabaseResult<number>>;
  softDeleteById(
    id: number,
    deletedBy?: string
  ): Promise<DatabaseResult<boolean>>;
  softDeleteByIds(
    ids: number[],
    deletedBy?: string
  ): Promise<DatabaseResult<number>>;

  // 查询活跃记录（未软删除）
  findActiveOnly(
    semester?: string
  ): Promise<DatabaseResult<AttendanceCourse[]>>;
  findActiveByJuheRenwuId(
    juheRenwuId: number
  ): Promise<DatabaseResult<AttendanceCourse | null>>;
  findActiveByCourseCode(
    courseCode: string,
    semester: string
  ): Promise<DatabaseResult<AttendanceCourse[]>>;

  // 恢复软删除
  restoreById(
    id: number,
    restoredBy?: string
  ): Promise<DatabaseResult<boolean>>;
  restoreByIds(
    ids: number[],
    restoredBy?: string
  ): Promise<DatabaseResult<number>>;

  // 查询已删除记录
  findDeletedOnly(
    semester?: string
  ): Promise<DatabaseResult<AttendanceCourse[]>>;
}

/**
 * 签到课程仓储实现
 * 继承BaseIcasyncRepository，提供签到课程相关的数据访问操作
 */
export default class AttendanceCoursesRepository
  extends BaseIcasyncRepository<
    'icasync_attendance_courses',
    AttendanceCourse,
    NewAttendanceCourse,
    AttendanceCourseUpdate,
    number
  >
  implements IAttendanceCoursesRepository
{
  protected readonly tableName = 'icasync_attendance_courses' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 根据聚合任务ID查找签到课程
   */
  async findByJuheRenwuId(
    juheRenwuId: number
  ): Promise<DatabaseResult<AttendanceCourse | null>> {
    this.validateId(juheRenwuId, 'juheRenwuId');

    const result = await this.findOneNullable((qb: any) =>
      qb
        .where('juhe_renwu_id', '=', juheRenwuId)
        .where('deleted_at', 'is', null)
    );

    this.logOperation('findByJuheRenwuId', { juheRenwuId });
    return result;
  }

  /**
   * 根据外部ID查找签到课程
   */
  async findByExternalId(
    externalId: string
  ): Promise<DatabaseResult<AttendanceCourse | null>> {
    this.validateRequired({ externalId }, ['externalId']);

    const result = await this.findOneNullable((qb: any) =>
      qb.where('external_id', '=', externalId).where('deleted_at', 'is', null)
    );

    this.logOperation('findByExternalId', { externalId });
    return result;
  }

  /**
   * 根据课程代码查找签到课程
   */
  async findByCourseCode(
    courseCode: string,
    semester: string
  ): Promise<DatabaseResult<AttendanceCourse[]>> {
    this.validateRequired({ courseCode, semester }, ['courseCode', 'semester']);

    const result = await this.findMany((qb: any) =>
      qb
        .where('course_code', '=', courseCode)
        .where('semester', '=', semester)
        .where('deleted_at', 'is', null)
        .orderBy('start_time', 'asc')
    );

    this.logOperation('findByCourseCode', { courseCode, semester });
    return result;
  }

  /**
   * 根据学期查找签到课程
   */
  async findBySemester(
    semester: string
  ): Promise<DatabaseResult<AttendanceCourse[]>> {
    this.validateRequired({ semester }, ['semester']);

    const result = await this.findMany((qb: any) =>
      qb
        .where('semester', '=', semester)
        .where('deleted_at', 'is', null)
        .orderBy('start_time', 'asc')
    );

    this.logOperation('findBySemester', { semester });
    return result;
  }

  /**
   * 根据教师工号查找签到课程
   */
  async findByTeacherCode(
    teacherCode: string,
    semester: string
  ): Promise<DatabaseResult<AttendanceCourse[]>> {
    this.validateRequired({ teacherCode, semester }, [
      'teacherCode',
      'semester'
    ]);

    const result = await this.findMany((qb: any) =>
      qb
        .where('teacher_codes', 'like', `%${teacherCode}%`)
        .where('semester', '=', semester)
        .where('deleted_at', 'is', null)
        .orderBy('start_time', 'asc')
    );

    this.logOperation('findByTeacherCode', { teacherCode, semester });
    return result;
  }

  /**
   * 根据日期范围查找签到课程
   */
  async findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<DatabaseResult<AttendanceCourse[]>> {
    this.validateRequired({ startDate, endDate }, ['startDate', 'endDate']);

    const result = await this.findMany((qb: any) =>
      qb
        .where('start_time', '>=', startDate)
        .where('start_time', '<=', endDate)
        .where('deleted_at', 'is', null)
        .orderBy('start_time', 'asc')
    );

    this.logOperation('findByDateRange', { startDate, endDate });
    return result;
  }

  /**
   * 查找启用签到的课程
   */
  async findEnabledCourses(
    semester: string
  ): Promise<DatabaseResult<AttendanceCourse[]>> {
    this.validateRequired({ semester }, ['semester']);

    const result = await this.findMany((qb: any) =>
      qb
        .where('semester', '=', semester)
        .where('attendance_enabled', '=', 1)
        .where('deleted_at', 'is', null)
        .orderBy('start_time', 'asc')
    );

    this.logOperation('findEnabledCourses', { semester });
    return result;
  }

  /**
   * 批量创建签到课程
   */
  async createBatch(
    courses: NewAttendanceCourse[]
  ): Promise<DatabaseResult<AttendanceCourse[]>> {
    if (!courses || courses.length === 0) {
      throw new Error('Courses array cannot be empty');
    }

    // 验证每个课程的必需字段
    courses.forEach((course, index) => {
      try {
        this.validateRequired(course, [
          'juhe_renwu_id',
          'external_id',
          'course_code',
          'course_name',
          'semester',
          'teaching_week',
          'week_day',
          'start_time',
          'end_time',
          'time_period'
        ]);

        // 应用层验证：检查juhe_renwu_id的有效性
        this.validateJuheRenwuId(course.juhe_renwu_id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Course at index ${index}: ${message}`);
      }
    });

    const createData = courses.map((course) => this.buildCreateData(course));

    this.logOperation('createBatch', { count: courses.length });

    return await this.createMany(createData as NewAttendanceCourse[]);
  }

  /**
   * 更新签到状态
   */
  async updateAttendanceStatus(
    ids: number[],
    enabled: boolean
  ): Promise<DatabaseResult<number>> {
    if (!ids || ids.length === 0) {
      throw new Error('IDs array cannot be empty');
    }

    const updateData = this.buildUpdateData({
      attendance_enabled: enabled ? 1 : 0
    });

    const result = await this.updateMany(
      (qb: any) => qb.where('id', 'in', ids),
      updateData as AttendanceCourseUpdate
    );

    this.logOperation('updateAttendanceStatus', { ids, enabled });
    return result;
  }

  /**
   * 根据学期删除签到课程
   */
  async deleteBySemester(semester: string): Promise<DatabaseResult<number>> {
    this.validateRequired({ semester }, ['semester']);

    const result = await this.deleteMany((qb: any) =>
      qb.where('semester', '=', semester)
    );

    this.logOperation('deleteBySemester', { semester });
    return result;
  }

  /**
   * 根据课程代码删除签到课程
   */
  async deleteByCourseCode(
    courseCode: string,
    semester: string
  ): Promise<DatabaseResult<number>> {
    this.validateRequired({ courseCode, semester }, ['courseCode', 'semester']);

    const result = await this.deleteMany((qb: any) =>
      qb.where('course_code', '=', courseCode).where('semester', '=', semester)
    );

    this.logOperation('deleteByCourseCode', { courseCode, semester });
    return result;
  }

  /**
   * 统计学期内的签到课程数量
   */
  async countBySemester(semester: string): Promise<DatabaseResult<number>> {
    this.validateRequired({ semester }, ['semester']);

    const result = await this.count((qb: any) =>
      qb.where('semester', '=', semester).where('deleted_at', 'is', null)
    );

    this.logOperation('countBySemester', { semester });
    return result;
  }

  /**
   * 统计启用签到的课程数量
   */
  async countEnabledCourses(semester: string): Promise<DatabaseResult<number>> {
    this.validateRequired({ semester }, ['semester']);

    const result = await this.count((qb: any) =>
      qb
        .where('semester', '=', semester)
        .where('attendance_enabled', '=', 1)
        .where('deleted_at', 'is', null)
    );

    this.logOperation('countEnabledCourses', { semester });
    return result;
  }

  /**
   * 统计教师的签到课程数量
   */
  async countByTeacher(
    teacherCode: string,
    semester: string
  ): Promise<DatabaseResult<number>> {
    this.validateRequired({ teacherCode, semester }, [
      'teacherCode',
      'semester'
    ]);

    const result = await this.count((qb: any) =>
      qb
        .where('teacher_codes', 'like', `%${teacherCode}%`)
        .where('semester', '=', semester)
        .where('deleted_at', 'is', null)
    );

    this.logOperation('countByTeacher', { teacherCode, semester });
    return result;
  }

  /**
   * 软删除所有签到课程记录
   */
  async softDeleteAll(
    deletedBy: string = 'system'
  ): Promise<DatabaseResult<number>> {
    const updateData = this.buildUpdateData({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy
    });

    const result = await this.updateMany(
      (qb: any) => qb.where('deleted_at', 'is', null),
      updateData as AttendanceCourseUpdate
    );

    this.logOperation('softDeleteAll', { deletedBy });
    return result;
  }

  /**
   * 软删除指定学期的签到课程
   */
  async softDeleteBySemester(
    semester: string,
    deletedBy: string = 'system'
  ): Promise<DatabaseResult<number>> {
    this.validateRequired({ semester }, ['semester']);

    const updateData = this.buildUpdateData({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy
    });

    const result = await this.updateMany(
      (qb: any) =>
        qb.where('semester', '=', semester).where('deleted_at', 'is', null),
      updateData as AttendanceCourseUpdate
    );

    this.logOperation('softDeleteBySemester', { semester, deletedBy });
    return result;
  }

  /**
   * 软删除指定课程代码的签到课程
   */
  async softDeleteByCourseCode(
    courseCode: string,
    semester: string,
    deletedBy: string = 'system'
  ): Promise<DatabaseResult<number>> {
    this.validateRequired({ courseCode, semester }, ['courseCode', 'semester']);

    const updateData = this.buildUpdateData({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy
    });

    const result = await this.updateMany(
      (qb: any) =>
        qb
          .where('course_code', '=', courseCode)
          .where('semester', '=', semester)
          .where('deleted_at', 'is', null),
      updateData as AttendanceCourseUpdate
    );

    this.logOperation('softDeleteByCourseCode', {
      courseCode,
      semester,
      deletedBy
    });
    return result;
  }

  /**
   * 软删除指定ID的签到课程
   */
  async softDeleteById(
    id: number,
    deletedBy: string = 'system'
  ): Promise<DatabaseResult<boolean>> {
    this.validateId(id, 'id');

    const updateData = {
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy
    } as AttendanceCourseUpdate;

    const result = await this.updateNullable(id, updateData);

    this.logOperation('softDeleteById', { id, deletedBy });

    if (result.success) {
      return {
        success: true,
        data: result.data !== null
      };
    } else {
      return result as DatabaseResult<boolean>;
    }
  }

  /**
   * 批量软删除指定ID的签到课程
   */
  async softDeleteByIds(
    ids: number[],
    deletedBy: string = 'system'
  ): Promise<DatabaseResult<number>> {
    if (!ids || ids.length === 0) {
      throw new Error('IDs array cannot be empty');
    }

    const updateData = this.buildUpdateData({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy
    });

    const result = await this.updateMany(
      (qb: any) => qb.where('id', 'in', ids).where('deleted_at', 'is', null),
      updateData as AttendanceCourseUpdate
    );

    this.logOperation('softDeleteByIds', { ids, deletedBy });
    return result;
  }

  /**
   * 查询活跃的签到课程（未软删除）
   */
  async findActiveOnly(
    semester?: string
  ): Promise<DatabaseResult<AttendanceCourse[]>> {
    const result = await this.findMany((qb: any) => {
      let query = qb.where('deleted_at', 'is', null);
      if (semester) {
        query = query.where('semester', '=', semester);
      }
      return query.orderBy('start_time', 'asc');
    });

    this.logOperation('findActiveOnly', { semester });
    return result;
  }

  /**
   * 根据聚合任务ID查找活跃的签到课程
   */
  async findActiveByJuheRenwuId(
    juheRenwuId: number
  ): Promise<DatabaseResult<AttendanceCourse | null>> {
    this.validateId(juheRenwuId, 'juheRenwuId');

    const result = await this.findOneNullable((qb: any) =>
      qb
        .where('juhe_renwu_id', '=', juheRenwuId)
        .where('deleted_at', 'is', null)
    );

    this.logOperation('findActiveByJuheRenwuId', { juheRenwuId });
    return result;
  }

  /**
   * 根据课程代码查找活跃的签到课程
   */
  async findActiveByCourseCode(
    courseCode: string,
    semester: string
  ): Promise<DatabaseResult<AttendanceCourse[]>> {
    this.validateRequired({ courseCode, semester }, ['courseCode', 'semester']);

    const result = await this.findMany((qb: any) =>
      qb
        .where('course_code', '=', courseCode)
        .where('semester', '=', semester)
        .where('deleted_at', 'is', null)
        .orderBy('start_time', 'asc')
    );

    this.logOperation('findActiveByCourseCode', { courseCode, semester });
    return result;
  }

  /**
   * 恢复软删除的签到课程
   */
  async restoreById(
    id: number,
    restoredBy: string = 'system'
  ): Promise<DatabaseResult<boolean>> {
    this.validateId(id, 'id');

    const updateData = {
      deleted_at: null,
      deleted_by: null,
      updated_by: restoredBy
    } as AttendanceCourseUpdate;

    const result = await this.updateNullable(id, updateData);

    this.logOperation('restoreById', { id, restoredBy });

    if (result.success) {
      return {
        success: true,
        data: result.data !== null
      };
    } else {
      return result as DatabaseResult<boolean>;
    }
  }

  /**
   * 批量恢复软删除的签到课程
   */
  async restoreByIds(
    ids: number[],
    restoredBy: string = 'system'
  ): Promise<DatabaseResult<number>> {
    if (!ids || ids.length === 0) {
      throw new Error('IDs array cannot be empty');
    }

    const updateData = this.buildUpdateData({
      deleted_at: null,
      deleted_by: null,
      updated_by: restoredBy
    });

    const result = await this.updateMany(
      (qb: any) =>
        qb.where('id', 'in', ids).where('deleted_at', 'is not', null),
      updateData as AttendanceCourseUpdate
    );

    this.logOperation('restoreByIds', { ids, restoredBy });
    return result;
  }

  /**
   * 查询已删除的签到课程
   */
  async findDeletedOnly(
    semester?: string
  ): Promise<DatabaseResult<AttendanceCourse[]>> {
    const result = await this.findMany((qb: any) => {
      let query = qb.where('deleted_at', 'is not', null);
      if (semester) {
        query = query.where('semester', '=', semester);
      }
      return query.orderBy('deleted_at', 'desc');
    });

    this.logOperation('findDeletedOnly', { semester });
    return result;
  }

  /**
   * 验证ID
   */
  private validateId(id: number, fieldName: string): void {
    if (!id || id <= 0) {
      throw new Error(`${fieldName} must be a positive number`);
    }
  }

  /**
   * 验证必需字段
   */
  private validateRequired(
    data: Record<string, any>,
    requiredFields: string[]
  ) {
    const missingFields = requiredFields.filter(
      (field) => data[field] === undefined || data[field] === null
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }
  /**
   * 验证juhe_renwu_id的有效性
   * 由于移除了外键约束，需要在应用层进行验证
   */
  private validateJuheRenwuId(juheRenwuId: number): void {
    if (!juheRenwuId || juheRenwuId <= 0) {
      throw new Error('juhe_renwu_id must be a positive integer');
    }

    // 可以在这里添加更多的业务逻辑验证
    // 例如：检查ID格式、范围等
    if (juheRenwuId > Number.MAX_SAFE_INTEGER) {
      throw new Error('juhe_renwu_id exceeds maximum safe integer');
    }
  }

  /**
   * 记录操作日志
   */
  protected logOperation(operation: string, params: any): void {
    this.logger.debug(`AttendanceCoursesRepository.${operation}`, params);
  }
}
