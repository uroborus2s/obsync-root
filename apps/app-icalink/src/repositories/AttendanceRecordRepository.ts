// @wps/app-icalink 签到记录仓储实现
// 基于 Stratix 框架的仓储实现类

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { BaseRepository } from '@stratix/database';
import type {
  AttendanceStatus,
  IcalinkAttendanceRecord,
  IcalinkDatabase
} from '../types/database.js';
import type {
  PaginatedResult,
  QueryOptions,
  ServiceResult
} from '../types/service.js';
import { ServiceErrorCode, wrapServiceCall, isSuccessResult } from '../types/service.js';
import type {
  AttendanceRecordQueryConditions,
  AttendanceRecordStats,
  AttendanceRecordWithDetails,
  CreateAttendanceRecordData,
  IAttendanceRecordRepository,
  UpdateAttendanceRecordData
} from './interfaces/IAttendanceRecordRepository.js';
import { extractOptionFromServiceResult, convertToPaginatedResult } from '../utils/type-fixes.js';

/**
 * 签到记录仓储实现类
 * 继承BaseRepository，实现IAttendanceRecordRepository接口
 */
export default class AttendanceRecordRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_attendance_records',
    IcalinkAttendanceRecord,
    CreateAttendanceRecordData,
    UpdateAttendanceRecordData
  >
  implements IAttendanceRecordRepository
{
  protected readonly tableName = 'icalink_attendance_records' as const;
  protected readonly primaryKey = 'id';

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 根据课程ID和学生ID查找签到记录
   */
  async findByCourseAndStudent(
    courseId: number,
    studentId: string
  ): Promise<ServiceResult<IcalinkAttendanceRecord | null>> {
    return wrapServiceCall(async () => {
      const result = await this.findOne((qb) =>
        qb
          .where('attendance_course_id', '=', courseId)
          .where('student_id', '=', studentId)
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find attendance record'
        );
      }

      return extractOptionFromServiceResult<IcalinkAttendanceRecord>(result);
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据条件查询签到记录
   */
  async findByConditions(
    conditions: AttendanceRecordQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkAttendanceRecord[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany((qb) => {
        let query = qb;

        if (conditions.attendance_course_id) {
          query = query.where(
            'attendance_course_id',
            '=',
            conditions.attendance_course_id
          );
        }

        if (conditions.student_id) {
          query = query.where('student_id', '=', conditions.student_id);
        }

        if (conditions.status) {
          query = query.where('status', '=', conditions.status);
        }

        if (conditions.start_date) {
          query = query.where('created_at', '>=', conditions.start_date);
        }

        if (conditions.end_date) {
          query = query.where('created_at', '<=', conditions.end_date);
        }

        if (conditions.is_late !== undefined) {
          query = query.where('is_late', '=', conditions.is_late);
        }

        return query;
      }, options);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find attendance records'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 分页查询签到记录
   */
  async findByConditionsPaginated(
    conditions: AttendanceRecordQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<IcalinkAttendanceRecord>>> {
    return wrapServiceCall(async () => {
      const result = await this.paginate((qb) => {
        let query = qb;

        if (conditions.attendance_course_id) {
          query = query.where(
            'attendance_course_id',
            '=',
            conditions.attendance_course_id
          );
        }

        if (conditions.student_id) {
          query = query.where('student_id', '=', conditions.student_id);
        }

        if (conditions.status) {
          query = query.where('status', '=', conditions.status);
        }

        if (conditions.start_date) {
          query = query.where('created_at', '>=', conditions.start_date);
        }

        if (conditions.end_date) {
          query = query.where('created_at', '<=', conditions.end_date);
        }

        if (conditions.is_late !== undefined) {
          query = query.where('is_late', '=', conditions.is_late);
        }

        return query;
      }, options?.pagination as any);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to paginate attendance records'
        );
      }

      return convertToPaginatedResult<IcalinkAttendanceRecord>(result.data);
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 查询签到记录详细信息（包含关联数据）
   */
  async findWithDetails(
    conditions: AttendanceRecordQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<AttendanceRecordWithDetails[]>> {
    return wrapServiceCall(async () => {
      // 这里需要使用原生SQL或者复杂查询来关联多个表
      // 暂时返回基础数据，后续可以扩展
      const basicResult = await this.findByConditions(conditions, options);

      if (!basicResult.success) {
        throw new Error(
          basicResult.error?.message ||
            'Failed to find attendance records with details'
        );
      }

      // 转换为详细信息格式
      const detailsData: AttendanceRecordWithDetails[] = (basicResult.data || []).map(
        (record) => ({
          ...record,
          // 这里可以添加关联查询的数据
          course_name: undefined,
          course_code: undefined,
          teacher_names: undefined,
          class_location: undefined,
          class_date: undefined,
          class_time: undefined
        })
      );

      return detailsData;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 分页查询签到记录详细信息
   */
  async findWithDetailsPaginated(
    conditions: AttendanceRecordQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<AttendanceRecordWithDetails>>> {
    return wrapServiceCall(async () => {
      const paginatedResult = await this.findByConditionsPaginated(
        conditions,
        options
      );

      if (!paginatedResult.success) {
        throw new Error(
          paginatedResult.error?.message ||
            'Failed to paginate attendance records with details'
        );
      }

      // 转换为详细信息格式
      const detailsData: AttendanceRecordWithDetails[] =
        (paginatedResult.data?.data || []).map((record) => ({
          ...record,
          course_name: undefined,
          course_code: undefined,
          teacher_names: undefined,
          class_location: undefined,
          class_date: undefined,
          class_time: undefined
        }));

      return {
        ...paginatedResult.data,
        data: detailsData
      } as any;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 统计签到记录
   */
  async getStatistics(
    conditions: AttendanceRecordQueryConditions
  ): Promise<ServiceResult<AttendanceRecordStats>> {
    return wrapServiceCall(async () => {
      // 这里需要使用聚合查询来统计各种状态的数量
      // 暂时返回模拟数据，后续实现具体的统计逻辑
      const stats: AttendanceRecordStats = {
        total_count: 0,
        present_count: 0,
        late_count: 0,
        absent_count: 0,
        leave_count: 0,
        not_started_count: 0,
        attendance_rate: 0
      };

      return stats;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据课程ID统计签到情况
   */
  async getStatisticsByCourse(
    courseId: number
  ): Promise<ServiceResult<AttendanceRecordStats>> {
    return this.getStatistics({ attendance_course_id: courseId });
  }

  /**
   * 根据学生ID统计签到情况
   */
  async getStatisticsByStudent(
    studentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<AttendanceRecordStats>> {
    return this.getStatistics({
      student_id: studentId,
      start_date: startDate,
      end_date: endDate
    });
  }

  /**
   * 批量更新签到记录状态
   */
  async updateStatusBatch(
    courseId: number,
    studentIds: string[],
    status: AttendanceStatus,
    updatedBy?: string
  ): Promise<ServiceResult<number>> {
    return wrapServiceCall(async () => {
      const result = await this.updateMany(
        (qb) =>
          qb
            .where('attendance_course_id', '=', courseId)
            .where('student_id', 'in', studentIds),
        {
          status,
          updated_by: updatedBy,
          updated_at: new Date()
        } as UpdateAttendanceRecordData
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to update attendance records'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 检查签到记录是否存在
   */
  async existsByCourseAndStudent(
    courseId: number,
    studentId: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.exists((qb) =>
        qb
          .where('attendance_course_id', '=', courseId)
          .where('student_id', '=', studentId)
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to check attendance record existence'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取学生的最近签到记录
   */
  async getRecentByStudent(
    studentId: string,
    limit: number = 10
  ): Promise<ServiceResult<AttendanceRecordWithDetails[]>> {
    return this.findWithDetails(
      { student_id: studentId },
      {
        sort: { field: 'created_at', direction: 'desc' },
        pagination: { page_size: limit }
      }
    );
  }

  /**
   * 获取课程的最近签到记录
   */
  async getRecentByCourse(
    courseId: number,
    limit: number = 10
  ): Promise<ServiceResult<AttendanceRecordWithDetails[]>> {
    return this.findWithDetails(
      { attendance_course_id: courseId },
      {
        sort: { field: 'created_at', direction: 'desc' },
        pagination: { page_size: limit }
      }
    );
  }

  /**
   * 根据时间范围查询签到记录
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: QueryOptions
  ): Promise<ServiceResult<AttendanceRecordWithDetails[]>> {
    return this.findWithDetails(
      {
        start_date: startDate,
        end_date: endDate
      },
      options
    );
  }

  /**
   * 软删除签到记录
   */
  async softDelete(
    id: number,
    deletedBy?: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.update(id, {
        updated_by: deletedBy,
        metadata: { deleted_at: new Date(), deleted_by: deletedBy }
      } as UpdateAttendanceRecordData);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to soft delete attendance record'
        );
      }

      return result.data !== null;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 恢复软删除的签到记录
   */
  async restore(
    id: number,
    restoredBy?: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.update(id, {
        updated_by: restoredBy,
        metadata: { restored_at: new Date(), restored_by: restoredBy }
      } as UpdateAttendanceRecordData);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to restore attendance record'
        );
      }

      return result.data !== null;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取课程历史考勤记录
   */
  async getCourseHistory(
    courseId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<Array<{
    id?: number;
    class_date?: string;
    class_time?: string;
    class_period?: string;
    total_students?: number;
    present_count?: number;
    leave_count?: number;
    absent_count?: number;
    attendance_rate?: number;
    created_at?: Date;
  }>>> {
    return wrapServiceCall(async () => {
      // 暂时返回模拟数据，实际实现需要复杂的SQL查询
      const mockData = [
        {
          id: 1,
          class_date: '2024-01-15',
          class_time: '09:00-10:40',
          class_period: '1-2节',
          total_students: 30,
          present_count: 25,
          leave_count: 2,
          absent_count: 3,
          attendance_rate: 83.33,
          created_at: new Date()
        }
      ];
      
      return mockData;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取学生在特定课程的考勤统计
   */
  async getStatisticsByStudentAndCourse(
    studentId: string,
    courseId: number
  ): Promise<ServiceResult<{
    total_count: number;
    present_count: number;
    absent_count: number;
    leave_count: number;
    attendance_rate: number;
  }>> {
    return wrapServiceCall(async () => {
      const conditions = {
        student_id: studentId,
        attendance_course_id: courseId
      };

      const recordsResult = await this.findByConditions(conditions);
      if (!isSuccessResult(recordsResult)) {
        throw new Error('获取考勤记录失败');
      }

      const records = recordsResult.data || [];
      const totalCount = records.length;
      const presentCount = records.filter(r => r.status === 'present').length;
      const absentCount = records.filter(r => r.status === 'absent').length;
      const leaveCount = records.filter(r => r.status === 'leave').length;
      
      const attendanceRate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

      return {
        total_count: totalCount,
        present_count: presentCount,
        absent_count: absentCount,
        leave_count: leaveCount,
        attendance_rate: attendanceRate
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取学生在特定课程的最近考勤记录
   */
  async getRecentByStudentAndCourse(
    studentId: string,
    courseId: number,
    limit: number = 3
  ): Promise<ServiceResult<Array<{
    id: number;
    class_date?: string;
    status: string;
    checkin_time?: Date;
    leave_reason?: string;
  }>>> {
    return wrapServiceCall(async () => {
      const conditions = {
        student_id: studentId,
        attendance_course_id: courseId
      };

      const recordsResult = await this.findByConditions(conditions, {
        sort: { field: 'created_at', direction: 'desc' },
        pagination: { page_size: limit }
      });

      if (!isSuccessResult(recordsResult)) {
        throw new Error('获取最近考勤记录失败');
      }

      const records = recordsResult.data || [];
      return records.map(record => ({
        id: record.id,
        class_date: record.created_at?.toISOString().split('T')[0],
        status: record.status,
        checkin_time: record.checkin_time,
        leave_reason: record.remark // 使用remark字段作为请假原因
      }));
    }, ServiceErrorCode.DATABASE_ERROR);
  }
}
