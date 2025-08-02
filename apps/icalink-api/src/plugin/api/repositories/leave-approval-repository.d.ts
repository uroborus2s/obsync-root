/**
 * 请假审批仓库
 * 处理请假审批记录的数据库操作
 */
import { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, LeaveApprovalEntity } from './types.js';
/**
 * 创建请假审批记录参数
 */
export interface CreateLeaveApprovalParams {
    application_id: string;
    approver_id: string;
    approver_name: string;
    approval_result?: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approval_comment?: string;
    approval_time?: Date;
}
/**
 * 请假审批仓库类
 */
export declare class LeaveApprovalRepository extends BaseRepository {
    private db;
    constructor(db: Kysely<ExtendedDatabase>, log: Logger);
    /**
     * 创建请假审批记录
     */
    createLeaveApproval(params: CreateLeaveApprovalParams): Promise<LeaveApprovalEntity>;
    /**
     * 批量创建请假审批记录
     */
    batchCreateLeaveApprovals(applicationId: string, teachers: Array<{
        approver_id: string;
        approver_name: string;
    }>): Promise<LeaveApprovalEntity[]>;
    /**
     * 根据ID获取请假审批记录
     */
    getLeaveApprovalById(id: string): Promise<LeaveApprovalEntity | null>;
    /**
     * 根据申请ID获取所有审批记录
     */
    getLeaveApprovalsByApplicationId(applicationId: string): Promise<LeaveApprovalEntity[]>;
    /**
     * 根据审批人ID获取待审批记录
     */
    getPendingApprovalsByApproverId(approverId: string, limit?: number, offset?: number): Promise<LeaveApprovalEntity[]>;
    /**
     * 更新审批结果
     */
    updateApprovalResult(id: string, result: 'approved' | 'rejected' | 'cancelled', comment?: string, approvalTime?: Date): Promise<void>;
    /**
     * 删除审批记录
     */
    deleteLeaveApproval(id: string): Promise<void>;
    /**
     * 获取教师审批记录
     */
    getTeacherApprovals(teacherId: string): Promise<any[]>;
    /**
     * 获取教师审批统计
     */
    getTeacherApprovalStats(teacherId: string): Promise<{
        pending_count: number;
        approved_count: number;
        rejected_count: number;
        cancelled_count: number;
        total_count: number;
    }>;
    /**
     * 处理教师审批
     * 更新审批记录，并根据所有审批记录的状态更新请假单状态
     */
    processApproval(approvalId: string, action: 'approve' | 'reject', comment?: string): Promise<{
        approval_id: string;
        application_id: string;
        action: 'approve' | 'reject';
        final_status: 'pending' | 'approved' | 'rejected';
        approval_time: string;
        approval_comment?: string;
    }>;
    /**
     * 更新请假申请状态
     * 注意：这里假设请假申请存储在icalink_student_attendance表中
     */
    private updateLeaveApplicationStatus;
    /**
     * 根据审批记录ID和审批人ID获取审批记录
     * 用于权限验证
     */
    getApprovalByIdAndApprover(approvalId: string, approverId: string): Promise<LeaveApprovalEntity | null>;
}
//# sourceMappingURL=leave-approval-repository.d.ts.map