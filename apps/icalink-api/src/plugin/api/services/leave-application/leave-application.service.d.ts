/**
 * 请假申请服务
 * 处理请假申请的业务逻辑
 */
import { Logger } from '@stratix/core';
import { AttendanceRepository } from '../../repositories/attendance-repository.js';
import { LeaveApplicationRepository } from '../../repositories/leave-application-repository.js';
import { StudentAttendanceRepository } from '../../repositories/student-attendance-repository.js';
import { StudentInfoRepository } from '../../repositories/student-info-repository.js';
import type { ApproveLeaveApplicationRequest, CreateLeaveApplicationRequest, LeaveApplicationListResponse, LeaveApplicationQueryParams, LeaveApplicationResponse, LeaveApplicationStatistics } from '../../types/leave-application.js';
/**
 * 请假申请服务类
 */
export declare class LeaveApplicationService {
    private readonly leaveApplicationRepo;
    private readonly attendanceRepo;
    private readonly studentAttendanceRepo;
    private readonly studentInfoRepo;
    private readonly log;
    constructor(leaveApplicationRepo: LeaveApplicationRepository, attendanceRepo: AttendanceRepository, studentAttendanceRepo: StudentAttendanceRepository, studentInfoRepo: StudentInfoRepository, log: Logger);
    /**
     * 创建请假申请
     */
    createLeaveApplication(request: CreateLeaveApplicationRequest): Promise<LeaveApplicationResponse>;
    /**
     * 获取学生的请假申请列表
     */
    getStudentLeaveApplications(studentId: string, params?: LeaveApplicationQueryParams): Promise<LeaveApplicationListResponse>;
    /**
     * 获取教师待审批的请假申请
     */
    getTeacherPendingApplications(teacherId: string, params?: LeaveApplicationQueryParams): Promise<LeaveApplicationListResponse>;
    /**
     * 审批请假申请
     */
    approveLeaveApplication(request: ApproveLeaveApplicationRequest): Promise<LeaveApplicationResponse>;
    /**
     * 获取请假申请统计
     */
    getLeaveApplicationStatistics(params?: Partial<LeaveApplicationQueryParams>): Promise<LeaveApplicationStatistics>;
    /**
     * 撤销请假申请
     */
    cancelLeaveApplication(applicationId: string, studentId: string): Promise<LeaveApplicationResponse>;
    /**
     * 转换实体为业务对象
     */
    private convertToLeaveApplication;
    /**
     * 工厂方法创建服务实例
     */
    static create(leaveApplicationRepo: LeaveApplicationRepository, attendanceRepo: AttendanceRepository, studentAttendanceRepo: StudentAttendanceRepository, studentInfoRepo: StudentInfoRepository, log: Logger): LeaveApplicationService;
}
//# sourceMappingURL=leave-application.service.d.ts.map