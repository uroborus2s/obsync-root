/**
 * 学生签到仓库
 * 处理学生签到记录的数据库操作
 */
import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { AttendanceStatus } from '../types/attendance.js';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, StudentAttendanceEntity } from './types.js';
/**
 * 创建学生签到记录参数
 */
export interface CreateStudentAttendanceParams {
    attendance_record_id: string;
    xh: string;
    xm: string;
    status: AttendanceStatus;
    checkin_time?: Date;
    location_id: string;
    leave_reason?: string;
    leave_type?: 'sick' | 'personal' | 'emergency' | 'other';
    leave_time?: Date;
    approver_id?: string;
    approver_name?: string;
    approved_time?: Date;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    remark?: string;
    ip_address?: string;
    user_agent?: string;
}
/**
 * 更新学生签到记录参数
 */
export interface UpdateStudentAttendanceParams {
    status?: AttendanceStatus;
    checkin_time?: Date;
    location_id?: string;
    leave_reason?: string;
    leave_type?: 'sick' | 'personal' | 'emergency' | 'other';
    leave_time?: Date;
    approver_id?: string;
    approver_name?: string;
    ip_address?: string;
    user_agent?: string;
}
/**
 * 查询学生签到记录条件
 */
export interface StudentAttendanceQueryConditions {
    attendance_record_id?: string;
    xh?: string;
    status?: AttendanceStatus;
    checkin_time_start?: Date;
    checkin_time_end?: Date;
}
export interface DetailedAttendanceQueryConditions {
    studentId?: string;
    teacherName?: string;
    week?: number;
    startTime?: string;
    endTime?: string;
    page?: number;
    pageSize?: number;
}
/**
 * 学生签到统计结果
 */
export interface StudentAttendanceStats {
    total_count: number;
    present_count: number;
    absent_count: number;
    leave_count: number;
    present_rate: number;
}
/**
 * 学生签到仓库类
 */
export declare class StudentAttendanceRepository extends BaseRepository {
    private db;
    constructor(db: Kysely<ExtendedDatabase>, log: Logger);
    /**
     * 创建学生签到记录
     */
    createStudentAttendance(params: CreateStudentAttendanceParams): Promise<StudentAttendanceEntity>;
    /**
     * 根据ID获取学生签到记录
     */
    getStudentAttendanceById(id: string): Promise<StudentAttendanceEntity | null>;
    /**
     * 根据考勤记录ID获取所有学生签到记录
     */
    findByAttendanceRecordId(attendanceRecordId: string): Promise<StudentAttendanceEntity[]>;
    /**
     * 根据考勤记录ID列表获取所有学生签到记录
     */
    findByAttendanceRecordIds(attendanceRecordIds: string[]): Promise<StudentAttendanceEntity[]>;
    /**
     * 根据考勤记录ID和学号获取学生签到记录
     */
    getStudentAttendanceByRecordAndStudent(attendanceRecordId: string, studentId: string): Promise<StudentAttendanceEntity | null>;
    /**
     * 根据条件查询学生签到记录
     */
    findStudentAttendances(conditions: StudentAttendanceQueryConditions, limit?: number, offset?: number): Promise<StudentAttendanceEntity[]>;
    /**
     * 更新学生签到记录
     */
    updateStudentAttendance(id: string, updates: UpdateStudentAttendanceParams): Promise<void>;
    /**
     * 删除学生签到记录
     */
    deleteStudentAttendance(id: string): Promise<void>;
    /**
     * 获取考勤统计信息
     */
    getAttendanceStats(attendanceRecordId: string): Promise<StudentAttendanceStats>;
    /**
     * 批量创建学生签到记录
     */
    batchCreateStudentAttendances(attendanceRecordId: string, students: Array<{
        xh: string;
        xm: string;
        location_id: string;
    }>, defaultStatus?: AttendanceStatus): Promise<StudentAttendanceEntity[]>;
    /**
     * 获取学生的签到历史记录
     */
    getStudentAttendanceHistory(studentId: string, limit?: number, offset?: number): Promise<StudentAttendanceEntity[]>;
    /**
     * 检查学生是否已签到
     */
    isStudentCheckedIn(attendanceRecordId: string, studentId: string): Promise<boolean>;
    /**
     * 获取考勤记录的签到学生列表
     */
    getCheckedInStudents(attendanceRecordId: string): Promise<StudentAttendanceEntity[]>;
    /**
     * 获取考勤记录的所有学生打卡详情（包含学生基本信息）
     */
    getAttendanceRecordWithStudentDetails(attendanceRecordId: string): Promise<Array<{
        id: string;
        xh: string;
        xm: string;
        bjmc?: string;
        zymc?: string;
        status: AttendanceStatus;
        checkin_time?: Date;
        leave_time?: Date;
        leave_reason?: string;
        location_id?: string;
        ip_address?: string;
        user_agent?: string;
        created_at: Date;
    }>>;
    /**
     * 获取学生请假申请记录
     */
    getStudentLeaveApplications(studentId: string, status?: 'all' | 'leave_pending' | 'leave' | 'leave_rejected', startDate?: Date, endDate?: Date, limit?: number, offset?: number): Promise<{
        applications: Array<{
            id: string;
            course_name: string;
            class_date: string;
            class_time: string;
            class_location?: string;
            teacher_name: string;
            leave_type: string;
            leave_reason: string;
            application_time: string;
            status: 'leave_pending' | 'leave' | 'leave_rejected';
            approval_time?: string;
            approval_comment?: string;
            course_info: {
                kcmc: string;
                room_s: string;
                xm_s: string;
                jc_s: string;
                jxz: number | null;
                lq: string | null;
                course_start_time: string;
                course_end_time: string;
            };
            attachments: Array<{
                id: string;
                file_name: string;
                file_size: number;
                file_type: string;
                upload_time: string;
            }>;
            approvals: Array<{
                id: string;
                approver_id: string;
                approver_name: string;
                approval_result: 'pending' | 'approved' | 'rejected' | 'cancelled';
                approval_comment?: string;
                approval_time?: string;
            }>;
        }>;
        total: number;
    }>;
    /**
     * 获取学生请假审批统计信息
     */
    getStudentLeaveApplicationStats(studentId: string, startDate?: Date, endDate?: Date): Promise<{
        total_count: number;
        leave_pending_count: number;
        leave_count: number;
        leave_rejected_count: number;
    }>;
    /**
     * 教师查询请假申请记录
     */
    getTeacherLeaveApplications(teacherId: string, status?: 'pending' | 'processed', startDate?: Date, endDate?: Date, limit?: number, offset?: number): Promise<{
        applications: Array<{
            id: string;
            student: {
                student_id: string;
                student_name: string;
                class_name?: string;
            };
            course: {
                course_name: string;
                class_time: string;
                class_location?: string;
                kcmc: string;
                room_s: string;
                xm_s: string;
                jc_s: string;
                jxz: number | null;
                lq: string | null;
                course_start_time: string;
                course_end_time: string;
            };
            leave_info: {
                leave_type: string;
                leave_date: string;
                leave_reason: string;
            };
            application_time: string;
            status: 'pending' | 'approved' | 'rejected';
            approval_time?: string;
            approval_comment?: string;
        }>;
        total: number;
    }>;
    /**
     * 获取教师请假申请统计信息
     */
    getTeacherLeaveApplicationStats(teacherId: string, startDate?: Date, endDate?: Date): Promise<{
        pending_count: number;
        processed_count: number;
        approved_count: number;
        rejected_count: number;
    }>;
    /**
     * 获取课程历史考勤数据
     */
    getCourseAttendanceHistory(kkh: string, xnxq?: string, startDate?: Date, endDate?: Date): Promise<{
        course_info: {
            kkh: string;
            course_name: string;
            xnxq: string;
            teachers: Array<{
                gh: string;
                xm: string;
            }>;
        };
        attendance_history: Array<{
            attendance_record_id: string;
            class_date: string;
            class_time: string;
            class_period: string;
            teaching_week?: number;
            classroom?: string;
            total_students: number | string;
            present_count: number | string;
            leave_count: number | string;
            absent_count: number | string;
            attendance_rate: number | string;
            status: 'active' | 'closed';
            course_status: 'not_started' | 'in_progress' | 'finished';
            created_at: string;
        }>;
        overall_stats: {
            total_classes: number;
            average_attendance_rate: number;
            total_students: number | string;
            total_present: number;
            total_leave: number;
            total_absent: number;
        };
    }>;
    /**
     * 教师审批请假申请
     */
    approveLeaveApplication(applicationId: string, teacherId: string, action: 'approve' | 'reject', comment?: string): Promise<{
        application_id: string;
        status: 'approved' | 'rejected';
        approval_time: string;
        approval_comment?: string;
        application_details: {
            course_name: string;
            class_date: string;
            class_time: string;
            class_location?: string;
            teacher_name: string;
            leave_type: string;
            leave_reason: string;
            application_time: string;
            student_info: {
                student_id: string;
                student_name: string;
                class_name?: string;
                major_name?: string;
            };
            teacher_info: {
                teacher_id: string;
                teacher_name: string;
            };
            attachments: Array<{
                id: string;
                file_name: string;
                file_size: number;
                file_type: string;
                upload_time: string;
            }>;
        };
    }>;
    /**
     * 获取个人课程统计
     * 根据课程号统计每个学生的考勤信息
     */
    getPersonalCourseStats(kkh: string, xnxq?: string): Promise<any>;
    /**
     * 撤回学生请假申请
     * 删除学生签到记录，并将关联的审批记录状态改为cancelled
     */
    withdrawStudentLeaveApplication(studentId: string, attendanceRecordId: string): Promise<{
        success: boolean;
        message: string;
        deletedAttendanceId?: string;
        cancelledApprovalIds?: string[];
    }>;
    findWithDetails(params: DetailedAttendanceQueryConditions): Promise<{
        total: number;
        records: any[];
    }>;
}
//# sourceMappingURL=student-attendance-repository.d.ts.map