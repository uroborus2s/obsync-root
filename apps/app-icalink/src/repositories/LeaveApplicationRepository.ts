// @wps/app-icalink 请假申请仓储实现
// 基于 Stratix 框架的仓储实现类

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { BaseRepository } from '@stratix/database';
import type {
  IcalinkDatabase,
  IcalinkLeaveApplication,
  LeaveStatus
} from '../types/database.js';
import type {
  PaginatedResult,
  QueryOptions,
  ServiceResult
} from '../types/service.js';
import { ServiceErrorCode, wrapServiceCall } from '../types/service.js';
import type {
  CreateLeaveApplicationData,
  ILeaveApplicationRepository,
  LeaveApplicationQueryConditions,
  LeaveApplicationWithDetails,
  UpdateLeaveApplicationData
} from './interfaces/ILeaveApplicationRepository.js';
import { extractOptionFromServiceResult, convertToPaginatedResult } from '../utils/type-fixes.js';

/**
 * 请假申请仓储实现类
 */
export default class LeaveApplicationRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_leave_applications',
    IcalinkLeaveApplication,
    CreateLeaveApplicationData,
    UpdateLeaveApplicationData
  >
  implements ILeaveApplicationRepository
{
  protected readonly tableName = 'icalink_leave_applications' as const;
  protected readonly primaryKey = 'id';

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 根据签到记录ID查找请假申请
   */
  async findByAttendanceRecord(
    attendanceRecordId: number
  ): Promise<ServiceResult<IcalinkLeaveApplication | null>> {
    return wrapServiceCall(async () => {
      const result = await this.findOne((qb) =>
        qb.where('attendance_record_id', '=', attendanceRecordId)
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find leave application'
        );
      }

      return extractOptionFromServiceResult<IcalinkLeaveApplication>(result);
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据条件查询请假申请
   */
  async findByConditions(
    conditions: LeaveApplicationQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany((qb) => {
        let query = qb;

        if (conditions.student_id) {
          query = query.where('student_id', '=', conditions.student_id);
        }

        if (conditions.teacher_id) {
          query = query.where('teacher_id', '=', conditions.teacher_id);
        }

        if (conditions.course_id) {
          query = query.where('course_id', '=', conditions.course_id);
        }

        if (conditions.status) {
          query = query.where('status', '=', conditions.status);
        }

        if (conditions.leave_type) {
          query = query.where('leave_type', '=', conditions.leave_type);
        }

        if (conditions.start_date) {
          query = query.where('application_time', '>=', conditions.start_date);
        }

        if (conditions.end_date) {
          query = query.where('application_time', '<=', conditions.end_date);
        }

        return query;
      }, options);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find leave applications'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 分页查询请假申请
   */
  async findByConditionsPaginated(
    conditions: LeaveApplicationQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<IcalinkLeaveApplication>>> {
    return wrapServiceCall(async () => {
      const result = await this.paginate((qb) => {
        let query = qb;

        if (conditions.student_id) {
          query = query.where('student_id', '=', conditions.student_id);
        }

        if (conditions.teacher_id) {
          query = query.where('teacher_id', '=', conditions.teacher_id);
        }

        if (conditions.course_id) {
          query = query.where('course_id', '=', conditions.course_id);
        }

        if (conditions.status) {
          query = query.where('status', '=', conditions.status);
        }

        if (conditions.leave_type) {
          query = query.where('leave_type', '=', conditions.leave_type);
        }

        if (conditions.start_date) {
          query = query.where('application_time', '>=', conditions.start_date);
        }

        if (conditions.end_date) {
          query = query.where('application_time', '<=', conditions.end_date);
        }

        return query;
      }, options?.pagination as any);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to paginate leave applications'
        );
      }

      return convertToPaginatedResult<IcalinkLeaveApplication>(result.data);
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 查询请假申请详细信息
   */
  async findWithDetails(
    conditions: LeaveApplicationQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<LeaveApplicationWithDetails[]>> {
    return wrapServiceCall(async () => {
      // 基础查询
      const basicResult = await this.findByConditions(conditions, options);

      if (!basicResult.success) {
        throw new Error(
          basicResult.error?.message ||
            'Failed to find leave applications with details'
        );
      }

      // 转换为详细信息格式
      const detailsData: LeaveApplicationWithDetails[] = (basicResult.data || []).map(
        (app: any) => ({
          ...app,
          attachment_count: 0, // 需要查询附件数量
          class_date: new Date(), // 需要从课程信息获取
          class_time: '' // 需要从课程信息获取
        })
      );

      return detailsData;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 分页查询请假申请详细信息
   */
  async findWithDetailsPaginated(
    conditions: LeaveApplicationQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<LeaveApplicationWithDetails>>> {
    return wrapServiceCall(async () => {
      const paginatedResult =   await this.findByConditionsPaginated(
        conditions,
        options
      );

      if (!paginatedResult.success) {
        throw new Error(
          paginatedResult.error?.message ||
            'Failed to paginate leave applications with details'
        );
      }

      // 转换为详细信息格式
      const detailsData: LeaveApplicationWithDetails[] =
        (paginatedResult.data?.data || []).map((app: any) => ({
          ...app,
          attachment_count: 0,
          class_date: new Date(),
          class_time: ''
        }));

      return convertToPaginatedResult({
        ...paginatedResult.data,
        data: detailsData
      }) as any;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据学生ID查询请假申请
   */
  async findByStudent(
    studentId: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    return this.findByConditions({ student_id: studentId }, options);
  }

  /**
   * 根据教师ID查询请假申请
   */
  async findByTeacher(
    teacherId: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    return this.findByConditions({ teacher_id: teacherId }, options);
  }

  /**
   * 根据状态查询请假申请
   */
  async findByStatus(
    status: LeaveStatus,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    return this.findByConditions({ status }, options);
  }

  /**
   * 获取待审批的请假申请
   */
  async findPendingApplications(
    teacherId?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    const conditions: LeaveApplicationQueryConditions = {
      status: 'leave_pending' as any
    };

    if (teacherId) {
      conditions.teacher_id = teacherId;
    }

    return this.findByConditions(conditions, options);
  }



  /**
   * 软删除请假申请
   */
  async softDelete(
    id: number,
    deletedBy?: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.update(id, {
        updated_by: deletedBy,
        metadata: { deleted_at: new Date(), deleted_by: deletedBy }
      } as UpdateLeaveApplicationData);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to soft delete leave application'
        );
      }

      return result.data !== null;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 统计请假申请
   */
  async getStatistics(
    conditions: LeaveApplicationQueryConditions
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回模拟数据
      return {
        total_count: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        cancelled_count: 0
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据学生ID统计请假申请
   */
  async getStatisticsByStudent(
    studentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<any>> {
    return this.getStatistics({ student_id: studentId });
  }

  /**
   * 根据教师ID统计请假申请
   */
  async getStatisticsByTeacher(
    teacherId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<any>> {
    return this.getStatistics({ teacher_id: teacherId });
  }

  /**
   * 根据课程ID统计请假申请
   */
  async getStatisticsByCourse(
    courseId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<any>> {
    return this.getStatistics({ course_id: courseId });
  }

  /**
   * 检查学生是否已有待审批的请假申请
   */
  async hasPendingApplication(
    studentId: string,
    courseId?: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const conditions: LeaveApplicationQueryConditions = {
        student_id: studentId,
        status: 'leave_pending' as any
      };
      if (courseId) {
        conditions.course_id = courseId;
      }
      
      const result = await this.findByConditions(conditions);
      return result.success && result.data != null && result.data.length > 0;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取待审批的请假申请
   */
  async getPendingApplications(
    teacherId?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<any[]>> {
    const conditions: LeaveApplicationQueryConditions = {
      status: 'leave_pending' as any
    };
    if (teacherId) {
      conditions.teacher_id = teacherId;
    }
    return this.findByConditions(conditions, options);
  }

  /**
   * 获取学生的请假申请
   */
  async getStudentApplications(
    studentId: string,
    options?: QueryOptions
  ): Promise<ServiceResult<any[]>> {
    return this.findByConditions({ student_id: studentId }, options);
  }

  /**
   * 获取教师需要处理的请假申请
   */
  async getTeacherApplications(
    teacherId: string,
    options?: QueryOptions
  ): Promise<ServiceResult<any[]>> {
    return this.findByConditions({ teacher_id: teacherId }, options);
  }

  /**
   * 更新请假申请状态
   */
  async updateStatus(
    id: number,
    status: LeaveStatus,
    approvalComment?: string,
    updatedBy?: string
  ): Promise<ServiceResult<IcalinkLeaveApplication>> {
    return wrapServiceCall(async () => {
      const result = await this.update(id, {
        status,
        approval_comment: approvalComment,
        updated_by: updatedBy,
        updated_at: new Date()
      } as UpdateLeaveApplicationData);

      if (!result.success) {
        throw new Error('Failed to update leave application status');
      }

      const application = extractOptionFromServiceResult<IcalinkLeaveApplication>(result);
      if (!application) {
        throw new Error('Update result is null');
      }

      return application;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 批量更新请假申请状态
   */
  async updateStatusBatch(
    ids: number[],
    status: any,
    updatedBy?: string
  ): Promise<ServiceResult<number>> {
    return wrapServiceCall(async () => {
      const result = await this.updateMany(
        (qb) => qb.whereIn('id', ids),
        {
          status,
          updated_by: updatedBy,
          updated_at: new Date()
        } as UpdateLeaveApplicationData
      );

      return result.success ? result.data : 0;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 统计请假申请数量
   */
  async countByConditions(
    conditions: LeaveApplicationQueryConditions
  ): Promise<ServiceResult<number>> {
    return wrapServiceCall(async () => {
      const result = await this.count((qb) => {
        let query = qb;

        if (conditions.student_id) {
          query = query.where('student_id', '=', conditions.student_id);
        }

        if (conditions.teacher_id) {
          query = query.where('teacher_id', '=', conditions.teacher_id);
        }

        if (conditions.course_id) {
          query = query.where('course_id', '=', conditions.course_id);
        }

        if (conditions.status) {
          query = query.where('status', '=', conditions.status);
        }

        if (conditions.leave_type) {
          query = query.where('leave_type', '=', conditions.leave_type);
        }

        if (conditions.start_date) {
          query = query.where('application_time', '>=', conditions.start_date);
        }

        if (conditions.end_date) {
          query = query.where('application_time', '<=', conditions.end_date);
        }

        return query;
      });

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to count leave applications'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 检查是否可以撤回
   */
  async canWithdraw(
    id: number,
    studentId: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.findOne((qb) => qb.where('id', '=', id));
      
      if (!result.success) {
        return false;
      }

      const application = extractOptionFromServiceResult<IcalinkLeaveApplication>(result);
      if (!application) {
        return false;
      }

      return application.student_id === studentId && application.status === 'leave_pending';
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 检查是否可以审批
   */
  async canApprove(
    id: number,
    teacherId: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.findOne((qb) => qb.where('id', '=', id));
      
      if (!result.success) {
        return false;
      }

      const application = extractOptionFromServiceResult<IcalinkLeaveApplication>(result);
      if (!application) {
        return false;
      }

      return application.teacher_id === teacherId && application.status === 'leave_pending';
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取学生的最近申请
   */
  async getRecentByStudent(
    studentId: string,
    limit?: number
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    return this.findByConditions(
      { student_id: studentId },
      { 
        pagination: { page: 1, page_size: limit || 10 },
        sort: { field: 'application_time', direction: 'desc' }
      }
    );
  }

  /**
   * 获取教师的最近申请
   */
  async getRecentByTeacher(
    teacherId: string,
    limit?: number
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    return this.findByConditions(
      { teacher_id: teacherId },
      { 
        pagination: { page: 1, page_size: limit || 10 },
        sort: { field: 'application_time', direction: 'desc' }
      }
    );
  }

  /**
   * 获取即将过期的申请
   */
  async getExpiredApplications(
    hours?: number
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    return wrapServiceCall(async () => {
      const timeLimit = new Date(Date.now() - (hours || 24) * 60 * 60 * 1000);
      const result = await this.findByConditions({
        status: 'leave_pending' as any,
        start_date: undefined,
        end_date: timeLimit
      });
      return result.success && result.data ? result.data : [];
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据日期范围查找
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    return this.findByConditions({
      start_date: startDate,
      end_date: endDate
    }, options);
  }

  /**
   * 获取即将到期的申请
   */
  async getExpiringApplications(
    hours?: number
  ): Promise<ServiceResult<IcalinkLeaveApplication[]>> {
    return this.getExpiredApplications(hours);
  }
}
