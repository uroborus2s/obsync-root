/**
 * 请假申请仓库
 * 处理请假申请记录的数据库操作
 */
import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, LeaveApplicationEntity } from './types.js';
/**
 * 请假类型枚举
 */
export declare enum LeaveType {
    SICK = "sick",
    PERSONAL = "personal",
    EMERGENCY = "emergency",
    OTHER = "other"
}
/**
 * 申请状态枚举
 */
export declare enum ApplicationStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
/**
 * 创建请假申请参数
 */
export interface CreateLeaveApplicationParams {
    student_id: string;
    student_name: string;
    student_attendance_record_id: string;
    kkh: string;
    xnxq: string;
    course_name: string;
    class_date: Date;
    class_time: string;
    class_location?: string;
    teacher_id: string;
    teacher_name: string;
    leave_type: LeaveType;
    leave_date: Date;
    leave_reason: string;
    application_time?: Date;
}
/**
 * 更新请假申请参数
 */
export interface UpdateLeaveApplicationParams {
    leave_type?: LeaveType;
    leave_date?: Date;
    leave_reason?: string;
    status?: ApplicationStatus;
}
/**
 * 查询请假申请条件
 */
export interface LeaveApplicationQueryConditions {
    student_id?: string;
    teacher_id?: string;
    kkh?: string;
    xnxq?: string;
    status?: ApplicationStatus;
    leave_type?: LeaveType;
    class_date_start?: Date;
    class_date_end?: Date;
    application_time_start?: Date;
    application_time_end?: Date;
}
/**
 * 请假申请统计结果
 */
export interface LeaveApplicationStats {
    total_count: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    sick_leave_count: number;
    personal_leave_count: number;
    emergency_leave_count: number;
    other_leave_count: number;
}
/**
 * 请假申请仓库类
 */
export declare class LeaveApplicationRepository extends BaseRepository {
    private db;
    constructor(db: Kysely<ExtendedDatabase>, log: Logger);
    /**
     * 创建请假申请
     */
    createLeaveApplication(params: CreateLeaveApplicationParams): Promise<LeaveApplicationEntity>;
    /**
     * 根据ID获取请假申请
     */
    getLeaveApplicationById(id: string): Promise<LeaveApplicationEntity | null>;
    /**
     * 根据学生考勤记录ID获取请假申请
     */
    getLeaveApplicationByAttendanceRecordId(attendanceRecordId: string): Promise<LeaveApplicationEntity | null>;
    /**
     * 根据条件查询请假申请
     */
    findLeaveApplications(conditions: LeaveApplicationQueryConditions, limit?: number, offset?: number): Promise<LeaveApplicationEntity[]>;
    /**
     * 更新请假申请
     */
    updateLeaveApplication(id: string, updates: UpdateLeaveApplicationParams): Promise<void>;
    /**
     * 删除请假申请
     */
    deleteLeaveApplication(id: string): Promise<void>;
    /**
     * 批准请假申请
     */
    approveLeaveApplication(id: string): Promise<void>;
    /**
     * 拒绝请假申请
     */
    rejectLeaveApplication(id: string): Promise<void>;
    /**
     * 获取请假申请统计
     */
    getLeaveApplicationStats(conditions?: Partial<LeaveApplicationQueryConditions>): Promise<LeaveApplicationStats>;
    /**
     * 获取学生的请假申请历史
     */
    getStudentLeaveApplicationHistory(studentId: string, limit?: number, offset?: number): Promise<LeaveApplicationEntity[]>;
    /**
     * 获取教师需要审批的请假申请
     */
    getTeacherPendingApplications(teacherId: string, limit?: number, offset?: number): Promise<LeaveApplicationEntity[]>;
    /**
     * 检查学生是否已有相同课程的请假申请
     */
    hasExistingLeaveApplication(studentId: string, kkh: string, classDate: Date): Promise<boolean>;
    /**
     * 批量创建请假申请
     */
    batchCreateLeaveApplications(applications: CreateLeaveApplicationParams[]): Promise<LeaveApplicationEntity[]>;
}
//# sourceMappingURL=leave-application-repository.d.ts.map