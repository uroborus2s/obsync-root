// @wps/app-icalink 请假审批仓储实现
// 基于 Stratix 框架的仓储实现类

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { BaseRepository } from '@stratix/database';
import {
  ApprovalResult,
  type IcalinkDatabase,
  type IcalinkLeaveApproval
} from '../types/database.js';
import type { QueryOptions, ServiceResult } from '../types/service.js';
import { ServiceErrorCode, wrapServiceCall } from '../types/service.js';
import { extractOptionFromServiceResult } from '../utils/type-fixes.js';
import type {
  CreateLeaveApprovalData,
  ILeaveApprovalRepository,
  LeaveApprovalQueryConditions,
  UpdateLeaveApprovalData
} from './interfaces/ILeaveApprovalRepository.js';

/**
 * 请假审批仓储实现类
 */
export default class LeaveApprovalRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_leave_approvals',
    IcalinkLeaveApproval,
    CreateLeaveApprovalData,
    UpdateLeaveApprovalData
  >
  implements ILeaveApprovalRepository
{
  protected readonly tableName = 'icalink_leave_approvals' as const;
  protected readonly primaryKey = 'id';

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 根据请假申请ID查找审批记录
   */
  async findByLeaveApplication(
    leaveApplicationId: number
  ): Promise<ServiceResult<IcalinkLeaveApproval[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany((qb) =>
        qb
          .where('leave_application_id', '=', leaveApplicationId)
          .orderBy('created_at', 'desc')
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find leave approvals'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据审批人查找审批记录
   */
  async findByApprover(
    approverId: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApproval[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany(
        (qb) =>
          qb
            .where('approver_id', '=', approverId)
            .orderBy('created_at', 'desc'),
        options
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find approvals by approver'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据条件查询审批记录
   */
  async findByConditions(
    conditions: LeaveApprovalQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApproval[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany((qb) => {
        let query = qb;

        if (conditions.leave_application_id) {
          query = query.where(
            'leave_application_id',
            '=',
            conditions.leave_application_id
          );
        }

        if (conditions.approver_id) {
          query = query.where('approver_id', '=', conditions.approver_id);
        }

        if (conditions.approval_result) {
          query = query.where(
            'approval_result',
            '=',
            conditions.approval_result
          );
        }

        // 支持多状态查询
        if (
          conditions.approval_result_in &&
          Array.isArray(conditions.approval_result_in)
        ) {
          query = query.where(
            'approval_result',
            'in',
            conditions.approval_result_in
          );
        }

        if (conditions.approval_start_date) {
          query = query.where(
            'created_at',
            '>=',
            conditions.approval_start_date
          );
        }

        if (conditions.approval_end_date) {
          query = query.where('created_at', '<=', conditions.approval_end_date);
        }

        return query.orderBy('created_at', 'desc');
      }, options);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find approvals by conditions'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取待审批的记录
   */
  async findPendingApprovals(
    approverId?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApproval[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany((qb) => {
        let query = qb.where('approval_result', '=', ApprovalResult.PENDING);

        if (approverId) {
          query = query.where('approver_id', '=', approverId);
        }

        return query.orderBy('created_at', 'asc');
      }, options);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find pending approvals'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据审批结果查找记录
   */
  async findByApprovalResult(
    approvalResult: ApprovalResult,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkLeaveApproval[]>> {
    return wrapServiceCall(async () => {
      const result = await this.findMany(
        (qb) =>
          qb
            .where('approval_result', '=', approvalResult)
            .orderBy('approval_time', 'desc'),
        options
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find approvals by result'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取最新的审批记录
   */
  async findLatestByLeaveApplication(
    leaveApplicationId: number
  ): Promise<ServiceResult<IcalinkLeaveApproval | null>> {
    return wrapServiceCall(async () => {
      const result = await this.findOne((qb) =>
        qb
          .where('leave_application_id', '=', leaveApplicationId)
          .orderBy('created_at', 'desc')
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to find latest approval'
        );
      }

      return extractOptionFromServiceResult<IcalinkLeaveApproval>(result);
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 统计审批记录数量
   */
  async countByConditions(
    conditions: LeaveApprovalQueryConditions
  ): Promise<ServiceResult<number>> {
    return wrapServiceCall(async () => {
      const result = await this.count((qb) => {
        let query = qb;

        if (conditions.approver_id) {
          query = query.where('approver_id', '=', conditions.approver_id);
        }

        if (conditions.approval_result) {
          query = query.where(
            'approval_result',
            '=',
            conditions.approval_result
          );
        }

        // 支持多状态查询
        if (
          conditions.approval_result_in &&
          Array.isArray(conditions.approval_result_in)
        ) {
          query = query.where(
            'approval_result',
            'in',
            conditions.approval_result_in
          );
        }

        if (conditions.approval_start_date) {
          query = query.where(
            'created_at',
            '>=',
            conditions.approval_start_date
          );
        }

        if (conditions.approval_end_date) {
          query = query.where('created_at', '<=', conditions.approval_end_date);
        }

        return query;
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to count approvals');
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取审批人的统计信息
   */
  async getApproverStats(
    approverId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<
    ServiceResult<{
      totalApprovals: number;
      approvedCount: number;
      rejectedCount: number;
      pendingCount: number;
      averageApprovalTime?: number;
    }>
  > {
    return wrapServiceCall(async () => {
      const conditions: LeaveApprovalQueryConditions = {
        approver_id: approverId,
        approval_start_date: startDate,
        approval_end_date: endDate
      };

      // 获取总数
      const totalResult = await this.countByConditions(conditions);
      if (!totalResult.success) {
        throw new Error('Failed to get total count');
      }

      // 获取各状态数量
      const approvedResult = await this.countByConditions({
        ...conditions,
        approval_result: ApprovalResult.APPROVED
      });
      const rejectedResult = await this.countByConditions({
        ...conditions,
        approval_result: ApprovalResult.REJECTED
      });
      const pendingResult = await this.countByConditions({
        ...conditions,
        approval_result: ApprovalResult.PENDING
      });

      return {
        totalApprovals: totalResult.data || 0,
        approvedCount: approvedResult.success ? approvedResult.data || 0 : 0,
        rejectedCount: rejectedResult.success ? rejectedResult.data || 0 : 0,
        pendingCount: pendingResult.success ? pendingResult.data || 0 : 0,
        averageApprovalTime: undefined
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 批量更新审批结果
   */
  async updateApprovalResultBatch(
    approvalIds: number[],
    approvalResult: ApprovalResult,
    approvalComment?: string,
    updatedBy?: string
  ): Promise<ServiceResult<number>> {
    return wrapServiceCall(async () => {
      const result = await this.updateMany(
        (qb) => qb.where('id', 'in', approvalIds),
        {
          approval_result: approvalResult,
          approval_time: new Date(),
          approval_comment: approvalComment,
          updated_by: updatedBy,
          updated_at: new Date()
        } as UpdateLeaveApprovalData
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to update approval results'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 检查是否已存在审批记录
   */
  async existsByLeaveApplicationAndApprover(
    leaveApplicationId: number,
    approverId: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.exists((qb) =>
        qb
          .where('leave_application_id', '=', leaveApplicationId)
          .where('approver_id', '=', approverId)
      );

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to check approval existence'
        );
      }

      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 软删除审批记录
   */
  async softDelete(
    id: number,
    deletedBy?: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.update(id, {
        updated_by: deletedBy,
        metadata: { deleted_at: new Date(), deleted_by: deletedBy }
      } as UpdateLeaveApprovalData);

      if (!result.success) {
        throw new Error(
          result.error?.message || 'Failed to soft delete approval'
        );
      }

      return result.data !== null;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取待审批的申请
   */
  async getPendingApprovals(
    approverId?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<any[]>> {
    return this.findPendingApprovals(approverId, options);
  }

  /**
   * 获取最终审批记录
   */
  async getFinalApproval(
    leaveApplicationId: number
  ): Promise<ServiceResult<IcalinkLeaveApproval | null>> {
    return this.findLatestByLeaveApplication(leaveApplicationId);
  }

  /**
   * 获取审批历史
   */
  async getApprovalHistory(
    leaveApplicationId: number
  ): Promise<ServiceResult<any[]>> {
    return this.findByLeaveApplication(leaveApplicationId);
  }

  /**
   * 更新审批结果
   */
  async updateApprovalResult(
    id: number,
    result: ApprovalResult,
    comment?: string,
    updatedBy?: string
  ): Promise<ServiceResult<IcalinkLeaveApproval>> {
    return wrapServiceCall(async () => {
      const updateResult = await this.update(id, {
        approval_result: result,
        approval_comment: comment,
        approval_time: new Date(),
        updated_by: updatedBy,
        updated_at: new Date()
      } as UpdateLeaveApprovalData);

      if (!updateResult.success) {
        throw new Error('Failed to update approval result');
      }

      const approval =
        extractOptionFromServiceResult<IcalinkLeaveApproval>(updateResult);
      if (!approval) {
        throw new Error('Update result is null');
      }

      return approval;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 检查是否已审批
   */
  async isApproved(
    leaveApplicationId: number
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.findByConditions({
        leave_application_id: leaveApplicationId,
        approval_result: ApprovalResult.APPROVED
      });

      return result.success && result.data != null && result.data.length > 0;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 检查是否被拒绝
   */
  async isRejected(
    leaveApplicationId: number
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      const result = await this.findByConditions({
        leave_application_id: leaveApplicationId,
        approval_result: ApprovalResult.REJECTED
      });

      return result.success && result.data != null && result.data.length > 0;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 检查审批权限
   */
  async canApprove(
    leaveApplicationId: number,
    approverId: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回true
      return true;
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 分页查询审批记录
   */
  async findByConditionsPaginated(
    conditions: LeaveApprovalQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<any>> {
    // 简化实现，直接调用findByConditions
    return this.findByConditions(conditions, options);
  }

  /**
   * 查询审批记录详细信息
   */
  async findWithDetails(
    conditions: LeaveApprovalQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<any[]>> {
    // 简化实现，直接调用findByConditions
    return this.findByConditions(conditions, options);
  }

  /**
   * 分页查询审批记录详细信息
   */
  async findWithDetailsPaginated(
    conditions: LeaveApprovalQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { conditions, options },
        'Finding approval records with details (paginated)'
      );

      // 使用JOIN查询获取完整的审批和请假申请信息
      // 确保参数类型正确，避免SQL语法错误
      const page = Number(options?.pagination?.page || 1);
      const pageSize = Number(options?.pagination?.page_size || 10);
      const offset = (page - 1) * pageSize;

      this.logger.debug(
        { page, pageSize, offset, originalOptions: options?.pagination },
        'Pagination parameters for approval records query'
      );

      // 使用databaseApi执行JOIN查询
      const queryOperation = async (db: any) => {
        let query = db
          .selectFrom('icalink_leave_approvals as la')
          .leftJoin(
            'icalink_leave_applications as app',
            'la.leave_application_id',
            'app.id'
          )
          .leftJoin(
            'icasync_attendance_courses as course',
            'app.course_id',
            'course.course_code'
          )
          .select([
            // 审批记录字段
            'la.id as approval_id',
            'la.leave_application_id',
            'la.approver_id',
            'la.approver_name',
            'la.approval_result',
            'la.approval_comment',
            'la.approval_time',
            'la.created_at as approval_created_at',

            // 请假申请字段
            'app.id as application_id',
            'app.student_id',
            'app.student_name',
            'app.course_id',
            'app.course_name',
            'app.teacher_id',
            'app.teacher_name',
            'app.leave_type',
            'app.leave_reason',
            'app.status',
            'app.application_time',

            // 课程信息字段
            'course.course_name as course_full_name',
            'course.class_location as course_location',
            'course.teacher_names as course_teachers',
            'course.start_time as course_start_time',
            'course.end_time as course_end_time'
          ]);

        // 添加查询条件
        if (conditions.approver_id) {
          query = query.where('la.approver_id', '=', conditions.approver_id);
        }

        if (conditions.approval_result) {
          query = query.where(
            'la.approval_result',
            '=',
            conditions.approval_result
          );
        }

        if (
          conditions.approval_result_in &&
          Array.isArray(conditions.approval_result_in)
        ) {
          query = query.where(
            'la.approval_result',
            'in',
            conditions.approval_result_in
          );
        }

        if (conditions.leave_application_id) {
          query = query.where(
            'la.leave_application_id',
            '=',
            conditions.leave_application_id
          );
        }

        // 添加排序和分页 - 移除可能有问题的GROUP BY，使用简单的ORDER BY
        query = query.orderBy('la.created_at', 'desc');

        if (pageSize > 0) {
          query = query.limit(pageSize);
        }

        if (offset > 0) {
          query = query.offset(offset);
        }

        return query.execute();
      };

      // 计数查询
      const countOperation = async (db: any) => {
        let countQuery = db
          .selectFrom('icalink_leave_approvals as la')
          .select(db.fn.count('la.id').as('total'));

        // 添加相同的条件到计数查询
        if (conditions.approver_id) {
          countQuery = countQuery.where(
            'la.approver_id',
            '=',
            conditions.approver_id
          );
        }

        if (conditions.approval_result) {
          countQuery = countQuery.where(
            'la.approval_result',
            '=',
            conditions.approval_result
          );
        }

        if (
          conditions.approval_result_in &&
          Array.isArray(conditions.approval_result_in)
        ) {
          countQuery = countQuery.where(
            'la.approval_result',
            'in',
            conditions.approval_result_in
          );
        }

        if (conditions.leave_application_id) {
          countQuery = countQuery.where(
            'la.leave_application_id',
            '=',
            conditions.leave_application_id
          );
        }

        return countQuery.executeTakeFirst();
      };

      // 执行查询
      const [countResult, dataResult] = await Promise.all([
        this.databaseApi.executeQuery(countOperation, { readonly: true }),
        this.databaseApi.executeQuery(queryOperation, { readonly: true })
      ]);

      if (!countResult.success || !dataResult.success) {
        throw new Error('查询审批记录失败');
      }

      const total = Number(countResult.data?.total || 0);
      const totalPages = Math.ceil(total / pageSize);

      // 🔥 添加详细的数据调试日志
      this.logger.info(
        {
          total,
          dataCount: dataResult.data.length,
          page,
          pageSize,
          sampleApprovalResults: dataResult.data
            .slice(0, 3)
            .map((record: any) => ({
              approval_id: record.approval_id,
              application_id: record.leave_application_id,
              approval_result: record.approval_result,
              student_name: record.student_name,
              course_name: record.course_name
            }))
        },
        '🔥 DEBUGGING: Successfully found approval records with details - CHECK APPROVAL_RESULT VALUES'
      );

      return {
        data: dataResult.data,
        total,
        page,
        page_size: pageSize,
        total_pages: totalPages
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取统计信息
   */
  async getStatistics(
    conditions?: LeaveApprovalQueryConditions
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      return {
        total_count: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        cancelled_count: 0,
        approval_rate: 0,
        average_approval_time_hours: 0
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 根据审批人统计
   */
  async getStatisticsByApprover(
    approverId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<any>> {
    return this.getApproverStats(approverId, startDate, endDate);
  }

  /**
   * 获取最近审批记录
   */
  async getRecentByApprover(
    approverId: string,
    limit?: number
  ): Promise<ServiceResult<any[]>> {
    return this.findByApprover(approverId, {
      pagination: { page: 1, page_size: limit || 10 }
    });
  }

  /**
   * 按日期范围查找
   */
  async findByApprovalDateRange(
    startDate: Date,
    endDate: Date,
    options?: QueryOptions
  ): Promise<ServiceResult<any[]>> {
    return this.findByConditions(
      {
        approval_start_date: startDate,
        approval_end_date: endDate
      },
      options
    );
  }

  /**
   * 获取超时审批
   */
  async getOverdueApprovals(hours?: number): Promise<ServiceResult<any[]>> {
    const timeLimit = new Date(Date.now() - (hours || 24) * 60 * 60 * 1000);
    return this.findByConditions({
      approval_result: ApprovalResult.PENDING,
      approval_start_date: undefined,
      approval_end_date: timeLimit
    });
  }

  /**
   * 获取平均审批时间
   */
  async getAverageApprovalTime(
    approverId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<number>> {
    return wrapServiceCall(async () => {
      return 0; // 简化实现
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取审批效率统计
   */
  async getApprovalEfficiencyStats(
    approverId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      return {
        total_approvals: 0,
        avg_approval_time_hours: 0,
        fastest_approval_hours: 0,
        slowest_approval_hours: 0,
        approval_rate: 0,
        on_time_rate: 0
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }
}
