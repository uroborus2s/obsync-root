/**
 * 重构后的签到服务
 * 使用仓库层进行数据访问，遵循良好的架构设计原则
 */
import type { AttendanceRecord, AttendanceStats, CheckInRequest, CheckInResponse, CourseAttendanceInfo, CourseInfo, StudentAttendanceSearchResponse, StudentInfo } from '../../types/attendance.js';
/**
 * 签到服务
 */
export declare class AttendanceService {
    private readonly courseAggregateRepo;
    private readonly studentInfoRepo;
    private readonly studentAttendanceRepo;
    private pageUrlService;
    private attendanceRepo;
    private constructor();
    /**
     * 创建考勤记录
     * @param taskId 任务ID
     * @param courseInfo 课程信息
     * @param totalCount 总人数
     * @returns 考勤记录
     */
    createAttendanceRecord(taskId: string, courseInfo: CourseInfo, totalCount: number): Promise<AttendanceRecord>;
    /**
     * 获取课程信息
     * @param kkh 开课号
     * @param xnxq 学年学期
     * @param rq 日期
     * @param sjd 时间段
     * @returns 课程信息
     */
    getCourseInfo(kkh: string, xnxq: string, rq: string, sjd: 'am' | 'pm'): Promise<CourseInfo | null>;
    /**
     * 获取学生信息
     * @param studentId 学号
     * @returns 学生信息
     */
    getStudentInfo(studentId: string): Promise<StudentInfo | null>;
    /**
     * 获取课程签到信息
     * @param taskId 任务ID
     * @param studentId 学号（可选）
     * @returns 课程签到信息
     */
    getCourseAttendanceInfo(taskId: string, studentId?: string): Promise<CourseAttendanceInfo>;
    /**
     * 学生签到
     * @param request 签到请求
     * @returns 签到响应
     */
    checkIn(request: CheckInRequest): Promise<CheckInResponse>;
    /**
     * 获取考勤统计
     * @param attendanceRecordId 考勤记录ID
     * @returns 考勤统计
     */
    getAttendanceStats(attendanceRecordId: string): Promise<AttendanceStats | null>;
    /**
     * 搜索学生签到信息
     * @param taskId 任务ID (格式: xnxq-kkh-startDate)
     * @param studentId 学号
     * @returns 学生签到搜索响应
     */
    searchStudentAttendance(taskId: string, studentId: string): Promise<StudentAttendanceSearchResponse>;
}
//# sourceMappingURL=attendance.service.d.ts.map