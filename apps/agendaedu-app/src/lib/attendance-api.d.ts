/**
 * 考勤API服务模块
 * 基于@stratix/icalink的attendance.controller.ts接口
 */
export interface StudentAttendanceSearchResponse {
    success: boolean;
    message?: string;
    data?: {
        course: {
            kkh: string;
            kcmc: string;
            rq: string;
            sj_f: string;
            sj_t: string;
            room_s: string;
            xm_s: string;
            jc_s: string;
            jxz?: number | null;
            lq?: string | null;
            status: 'not_started' | 'in_progress' | 'finished';
            course_start_time: string;
            course_end_time: string;
        };
        student: {
            xh: string;
            xm: string;
            bjmc?: string;
            zymc?: string;
        };
        attendance_status: {
            is_checked_in: boolean;
            status?: 'not_started' | 'present' | 'absent' | 'leave' | 'pending_approval' | 'leave_pending';
            checkin_time?: string;
            can_checkin: boolean;
            can_leave: boolean;
            auto_start_time?: string;
            auto_close_time?: string;
        };
        stats: {
            total_count: number;
            checkin_count: number;
            late_count: number;
            absent_count: number;
            leave_count: number;
        };
    };
}
export interface TeacherAttendanceRecordResponse {
    success: boolean;
    message?: string;
    data?: {
        course: {
            kkh: string;
            kcmc: string;
            rq: string;
            sj_f: string;
            sj_t: string;
            room_s: string;
            xm_s: string;
            jc_s: string;
            jxz?: number;
        };
        teacher: {
            gh: string;
            xm: string;
            ssdwmc?: string;
            zc?: string;
        };
        stats: {
            total_count: number;
            checkin_count: number;
            late_count: number;
            absent_count: number;
            leave_count: number;
            checkin_rate: number;
        };
        attendance_status: {
            status: 'active' | 'closed';
            auto_start_time?: string;
            auto_close_time?: string;
        };
        course_status: {
            status: 'not_started' | 'in_progress' | 'finished';
            course_start_time: string;
            course_end_time: string;
        };
        student_details: Array<{
            xh: string;
            xm: string;
            bjmc?: string;
            zymc?: string;
            status: 'not_started' | 'present' | 'absent' | 'leave' | 'pending_approval' | 'leave_pending';
            checkin_time?: string;
            leave_time?: string;
            leave_reason?: string;
            location?: string;
            ip_address?: string;
        }>;
    };
}
export interface StudentCheckInRequest {
    location?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    remark?: string;
}
export interface StudentCheckInResponse {
    success: boolean;
    message: string;
    data?: {
        id: string;
        status: 'not_started' | 'present' | 'absent' | 'leave' | 'pending_approval' | 'leave_pending';
        checkin_time?: string;
        approver?: {
            id: string;
            name: string;
        };
    };
}
export interface StudentLeaveRequest {
    attendance_record_id: string;
    leave_reason: string;
    leave_type?: 'sick' | 'personal' | 'emergency' | 'other';
    attachments?: Array<{
        file_name: string;
        file_content: string;
        file_type: string;
        file_size: number;
    }>;
}
export interface StudentLeaveResponse {
    success: boolean;
    message: string;
    data?: {
        id: string;
        status: 'not_started' | 'present' | 'absent' | 'leave' | 'pending_approval' | 'leave_pending';
        leave_time?: string;
        leave_reason: string;
        approver?: {
            id: string;
            name: string;
        };
    };
}
export interface StudentWithdrawLeaveRequest {
    attendance_record_id: string;
}
export interface StudentWithdrawLeaveResponse {
    success: boolean;
    message: string;
    data?: {
        deleted_attendance_id: string;
        cancelled_approval_ids: string[];
        withdraw_time: string;
    };
}
export interface StudentLeaveApplicationItem {
    id: string;
    course_name: string;
    class_date: string;
    class_time: string;
    class_location?: string;
    teacher_name: string;
    leave_type: 'sick' | 'personal' | 'emergency' | 'other';
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
}
export interface StudentLeaveApplicationQueryResponse {
    success: boolean;
    message?: string;
    data?: {
        applications: StudentLeaveApplicationItem[];
        total: number;
        page: number;
        page_size: number;
        stats: {
            total_count: number;
            leave_pending_count: number;
            leave_count: number;
            leave_rejected_count: number;
        };
    };
}
export interface TeacherLeaveApplicationItem {
    id: string;
    student_id: string;
    student_name: string;
    course_id: string;
    course_name: string;
    class_date: string;
    class_time: string;
    class_location?: string;
    teacher_name: string;
    leave_date: string;
    leave_reason: string;
    leave_type: 'sick' | 'personal' | 'emergency' | 'other';
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approval_comment?: string;
    approval_time?: string;
    application_time: string;
    approval_id?: string;
    lq?: string;
    room_s?: string;
    jxz?: number | null;
    course_start_time?: string;
    course_end_time?: string;
    student_info?: {
        student_id: string;
        student_name: string;
        class_name?: string;
        major_name?: string;
    };
    teacher_info?: {
        teacher_id: string;
        teacher_name: string;
        teacher_department?: string;
    };
    attachments?: Array<{
        id: string;
        file_name: string;
        file_size: number;
        file_type: string;
        upload_time?: string;
    }>;
}
export interface TeacherLeaveApplicationQueryResponse {
    success: boolean;
    message?: string;
    data?: {
        applications: TeacherLeaveApplicationItem[];
        total: number;
        page: number;
        page_size: number;
        stats: {
            pending_count: number;
            processed_count: number;
            approved_count: number;
            rejected_count: number;
            cancelled_count: number;
            total_count: number;
        };
    };
}
export interface TeacherApprovalRequest {
    approval_id: string;
    action: 'approve' | 'reject';
    comment?: string;
}
export interface TeacherApprovalResponse {
    success: boolean;
    message: string;
    data?: {
        approval_id: string;
        application_id: string;
        action: 'approve' | 'reject';
        final_status: 'pending' | 'approved' | 'rejected';
        approval_time: string;
        approval_comment?: string;
    };
}
export interface AttachmentViewResponse {
    success: boolean;
    message?: string;
    data?: {
        id: string;
        file_name: string;
        file_size: number;
        file_type: string;
        file_content?: string;
        file_url?: string;
    };
}
export interface StudentLeaveApplicationQueryParams {
    status?: 'all' | 'leave_pending' | 'leave' | 'leave_rejected';
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
}
export interface TeacherLeaveApplicationQueryParams {
    status?: string | string[];
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
}
export interface CourseAttendanceHistoryParams {
    kkh: string;
    xnxq?: string;
    start_date?: string;
    end_date?: string;
}
export interface ClassAttendanceStats {
    attendance_record_id: string;
    class_date: string;
    class_time: string;
    class_period: string;
    teaching_week?: number;
    classroom?: string;
    total_students: number;
    present_count: number;
    leave_count: number;
    absent_count: number;
    attendance_rate: number;
    status: 'active' | 'closed';
    course_status: 'not_started' | 'in_progress' | 'finished';
    created_at: string;
}
export interface CourseAttendanceHistoryResponse {
    success: boolean;
    message?: string;
    data?: {
        course_info: {
            kkh: string;
            course_name: string;
            xnxq: string;
            teachers: Array<{
                gh: string;
                xm: string;
            }>;
        };
        attendance_history: ClassAttendanceStats[];
        overall_stats: {
            total_classes: number;
            average_attendance_rate: number;
            total_students: number;
            total_present: number;
            total_leave: number;
            total_absent: number;
        };
    };
}
/**
 * 个人课程统计查询参数
 */
export interface PersonalCourseStatsParams {
    /** 课程号 */
    kkh: string;
    /** 学年学期 */
    xnxq?: string;
}
/**
 * 学生个人考勤统计
 */
export interface StudentPersonalStats {
    /** 学号 */
    xh: string;
    /** 姓名 */
    xm: string;
    /** 班级名称 */
    bjmc?: string;
    /** 专业名称 */
    zymc?: string;
    /** 出勤率 */
    attendance_rate: number;
    /** 签到次数 */
    present_count: number;
    /** 旷课次数 */
    absent_count: number;
    /** 请假次数 */
    leave_count: number;
    /** 总课节数 */
    total_classes: number;
    /** 最近签到记录 */
    recent_records: Array<{
        /** 上课日期 */
        class_date: string;
        /** 签到状态 */
        status: 'not_started' | 'present' | 'absent' | 'leave' | 'pending_approval' | 'leave_pending';
        /** 签到时间 */
        checkin_time?: string;
        /** 请假原因 */
        leave_reason?: string;
    }>;
}
/**
 * 个人课程统计响应
 */
export interface PersonalCourseStatsResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message?: string;
    /** 数据 */
    data?: {
        /** 课程信息 */
        course_info: {
            /** 课程号 */
            kkh: string;
            /** 课程名称 */
            course_name: string;
            /** 学年学期 */
            xnxq: string;
            /** 总课时 */
            total_classes: number;
            /** 班级人数 */
            total_students: number;
            /** 整体出勤率 */
            overall_attendance_rate: number;
            /** 授课教师 */
            teachers: string;
        };
        /** 学生统计列表 */
        student_stats: StudentPersonalStats[];
    };
}
/**
 * 考勤API服务类
 */
export declare class AttendanceApiService {
    private apiClient;
    constructor(baseUrl?: string);
    /**
     * 获取学生签到记录
     */
    getStudentAttendanceRecord(attendanceId: string): Promise<StudentAttendanceSearchResponse>;
    /**
     * 获取教师签到记录
     */
    getTeacherAttendanceRecord(attendanceId: string): Promise<TeacherAttendanceRecordResponse>;
    /**
     * 学生签到
     */
    studentCheckIn(attendanceRecordId: string, request: StudentCheckInRequest): Promise<StudentCheckInResponse>;
    /**
     * 学生请假
     */
    studentLeave(request: StudentLeaveRequest): Promise<StudentLeaveResponse>;
    /**
     * 学生查询请假申请
     */
    getStudentLeaveApplications(params?: StudentLeaveApplicationQueryParams): Promise<StudentLeaveApplicationQueryResponse>;
    /**
     * 教师查询请假申请
     */
    getTeacherLeaveApplications(params?: TeacherLeaveApplicationQueryParams): Promise<TeacherLeaveApplicationQueryResponse>;
    /**
     * 教师审批请假申请
     */
    teacherApproveLeave(request: TeacherApprovalRequest): Promise<TeacherApprovalResponse>;
    /**
     * 查看请假申请附件
     */
    viewLeaveAttachment(attachmentId: string): Promise<AttachmentViewResponse>;
    /**
     * 下载请假申请附件
     */
    downloadLeaveAttachment(attachmentId: string): Promise<Blob>;
    /**
     * 获取课程历史考勤数据
     */
    getCourseAttendanceHistory(kkh: string, params?: {
        xnxq?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<CourseAttendanceHistoryResponse>;
    /**
     * 获取个人课程统计
     */
    getPersonalCourseStats(kkh: string, params?: {
        xnxq?: string;
    }): Promise<PersonalCourseStatsResponse>;
    /**
     * 获取访问令牌（私有方法）
     */
    private getAccessToken;
    /**
     * 学生撤回请假申请
     */
    studentWithdrawLeave(request: StudentWithdrawLeaveRequest): Promise<StudentWithdrawLeaveResponse>;
}
export declare const attendanceApi: AttendanceApiService;
//# sourceMappingURL=attendance-api.d.ts.map