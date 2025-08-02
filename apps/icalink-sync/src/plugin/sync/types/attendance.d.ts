/**
 * 签到相关类型定义
 */
/**
 * 签到状态枚举
 */
export declare enum AttendanceStatus {
    PRESENT = "present",
    ABSENT = "absent",
    LEAVE = "leave",
    PENDING_APPROVAL = "pending_approval",// 签到待审批
    LEAVE_PENDING = "leave_pending",// 请假申请待审批
    LEAVE_REJECTED = "leave_rejected"
}
/**
 * 课程信息接口
 */
export interface CourseInfo {
    /** 开课号 */
    kkh: string;
    /** 学年学期 */
    xnxq: string;
    /** 教学周 */
    jxz?: number | null;
    /** 周次 */
    zc?: number | null;
    /** 课程名称 */
    kcmc: string;
    /** 上课日期 */
    rq: string;
    /** 节次串 */
    jc_s: string;
    /** 教室串 */
    room_s: string;
    /** 教师工号串 */
    gh_s: string;
    /** 教师姓名串 */
    xm_s: string;
    /** 开始时间 */
    sj_f: string;
    /** 结束时间 */
    sj_t: string;
    /** 时间段 */
    sjd: 'am' | 'pm';
    /** 楼群或相关标识 */
    lq?: string;
}
/**
 * 学生信息接口
 */
export interface StudentInfo {
    /** 学号 */
    xh: string;
    /** 姓名 */
    xm: string;
    /** 学院代码 */
    xydm?: string;
    /** 学院名称 */
    xymc?: string;
    /** 专业代码 */
    zydm?: string;
    /** 专业名称 */
    zymc?: string;
    /** 班级代码 */
    bjdm?: string;
    /** 班级名称 */
    bjmc?: string;
    /** 手机号 */
    sjh?: string;
    /** 邮箱 */
    email?: string;
}
/**
 * 签到记录接口
 */
export interface AttendanceRecord {
    /** 记录ID */
    id: string;
    /** 开课号 */
    kkh: string;
    /** 学年学期 */
    xnxq: string;
    /** 教学周 */
    jxz?: number | null;
    /** 周次 */
    zc?: number | null;
    /** 日期 */
    rq: string;
    /** 节次串 */
    jc_s: string;
    /** 课程名称 */
    kcmc: string;
    /** 开始时间 */
    sj_f: string;
    /** 结束时间 */
    sj_t: string;
    /** 时间段 */
    sjd: 'am' | 'pm';
    /** 总人数 */
    total_count: number;
    /** 签到人数 */
    checkin_count: number;
    /** 旷课人数 */
    absent_count: number;
    /** 请假人数 */
    leave_count: number;
    /** 签到URL */
    checkin_url?: string;
    /** 请假URL */
    leave_url?: string;
    /** 签到令牌 */
    checkin_token?: string;
    /** 状态 */
    status: 'active' | 'closed';
    /** 自动开始时间 */
    auto_start_time?: string;
    /** 自动关闭时间 */
    auto_close_time?: string;
    /** 楼群或相关标识 */
    lq?: string;
    /** 创建时间 */
    created_at: Date;
    /** 更新时间 */
    updated_at: Date;
}
/**
 * 学生签到记录接口
 */
export interface StudentAttendanceRecord {
    /** 记录ID */
    id: string;
    /** 考勤记录ID */
    attendance_record_id: string;
    /** 学号 */
    student_id: string;
    /** 学生姓名 */
    student_name: string;
    /** 签到状态 */
    status: AttendanceStatus;
    /** 签到时间 */
    checkin_time?: Date;
    /** 位置信息 */
    location?: string;
    /** 纬度 */
    latitude?: number;
    /** 经度 */
    longitude?: number;
    /** 定位精度 */
    accuracy?: number;
    /** 备注 */
    remark?: string;
    /** 创建时间 */
    created_at: Date;
    /** 更新时间 */
    updated_at: Date;
}
/**
 * 签到请求接口
 */
export interface CheckInRequest {
    /** 签到令牌 */
    token: string;
    /** 学号 */
    student_id: string;
    /** 位置信息 */
    location?: string;
    /** 纬度 */
    latitude?: number;
    /** 经度 */
    longitude?: number;
    /** 定位精度 */
    accuracy?: number;
    /** 备注 */
    remark?: string;
}
/**
 * 签到响应接口
 */
export interface CheckInResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message: string;
    /** 签到状态 */
    status?: AttendanceStatus;
    /** 签到时间 */
    checkin_time?: Date;
    /** 是否迟到 */
    is_late?: boolean;
}
/**
 * 课程签到信息接口
 */
export interface CourseAttendanceInfo {
    /** 课程信息 */
    course: CourseInfo;
    /** 考勤记录 */
    attendance_record: AttendanceRecord;
    /** 学生信息 */
    student?: StudentInfo;
    /** 学生签到记录 */
    student_attendance?: StudentAttendanceRecord;
    /** 是否可以签到 */
    can_checkin: boolean;
    /** 签到时间窗口 */
    checkin_window: {
        /** 开始时间 */
        start_time: Date;
        /** 结束时间 */
        end_time: Date;
    };
}
/**
 * 签到令牌载荷接口
 */
export interface CheckInTokenPayload {
    /** 考勤记录ID */
    attendance_record_id: string;
    /** 开课号 */
    kkh: string;
    /** 学年学期 */
    xnxq: string;
    /** 日期 */
    rq: string;
    /** 过期时间 */
    exp: number;
    /** 签发时间 */
    iat: number;
}
/**
 * 签到统计接口
 */
export interface AttendanceStats {
    /** 总人数 */
    total_count: number;
    /** 签到人数 */
    checkin_count: number;
    /** 迟到人数 */
    late_count: number;
    /** 旷课人数 */
    absent_count: number;
    /** 请假人数 */
    leave_count: number;
    /** 签到率 */
    checkin_rate: number;
}
/**
 * 位置信息接口
 */
export interface LocationInfo {
    /** 纬度 */
    latitude: number;
    /** 经度 */
    longitude: number;
    /** 地址 */
    address?: string;
    /** 精度(米) */
    accuracy?: number;
}
export interface IicalinkPluginParams {
    appUrl: string;
    tokenSecret?: string;
}
/**
 * 学生签到搜索响应接口
 */
export interface StudentAttendanceSearchResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message?: string;
    /** 数据 */
    data?: {
        /** 课程信息 */
        course: {
            /** 课程名称 */
            kcmc: string;
            /** 课程状态：not_started(未开始), in_progress(进行中), finished(已结束) */
            status: 'not_started' | 'in_progress' | 'finished';
            /** 课程开始时间 */
            course_start_time: string;
            /** 课程结束时间 */
            course_end_time: string;
            /** 教室 */
            room_s: string;
            /** 教师姓名 */
            xm_s: string;
            /** 节次 */
            jc_s: string;
            /** 教学周 */
            jxz?: number | null;
            /** 楼区 */
            lq?: string | null;
        };
        /** 学生信息 */
        student: {
            /** 学号 */
            xh: string;
            /** 姓名 */
            xm: string;
            /** 班级名称 */
            bjmc?: string;
            /** 专业名称 */
            zymc?: string;
        };
        /** 签到状态信息 */
        attendance_status: {
            /** 是否已签到 */
            is_checked_in: boolean;
            /** 签到状态 */
            status?: AttendanceStatus;
            /** 签到时间 */
            checkin_time?: string;
            /** 是否可以签到 */
            can_checkin: boolean;
            /** 是否可以请假 */
            can_leave: boolean;
            /** 签到开始时间 */
            auto_start_time?: string;
            /** 签到结束时间 */
            auto_close_time?: string;
        };
        /** 考勤统计 */
        stats: {
            /** 总人数 */
            total_count: number;
            /** 已签到人数 */
            checkin_count: number;
            /** 迟到人数 */
            late_count: number;
            /** 旷课人数 */
            absent_count: number;
            /** 请假人数 */
            leave_count: number;
        };
    };
}
/**
 * 教师查看学生打卡详情响应接口
 */
export interface TeacherAttendanceRecordResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message?: string;
    /** 数据 */
    data?: {
        /** 课程信息 */
        course: {
            /** 课程名称 */
            kcmc: string;
            /** 上课日期 */
            rq: string;
            /** 开始时间 */
            sj_f: string;
            /** 结束时间 */
            sj_t: string;
            /** 教室 */
            room_s: string;
            /** 教师姓名 */
            xm_s: string;
            /** 节次 */
            jc_s: string;
            /** 周次 */
            jxz?: number;
        };
        /** 教师信息 */
        teacher: {
            /** 工号 */
            gh: string;
            /** 姓名 */
            xm: string;
            /** 部门名称 */
            ssdwmc?: string;
            /** 职称 */
            zc?: string;
        };
        /** 考勤统计 */
        stats: {
            /** 总人数 */
            total_count: number;
            /** 已签到人数 */
            checkin_count: number;
            /** 迟到人数 */
            late_count: number;
            /** 旷课人数 */
            absent_count: number;
            /** 请假人数 */
            leave_count: number;
            /** 签到率 */
            checkin_rate: number;
        };
        /** 签到状态信息 */
        attendance_status: {
            /** 签到状态 */
            status: 'active' | 'closed';
            /** 签到开始时间 */
            auto_start_time?: string;
            /** 签到结束时间 */
            auto_close_time?: string;
        };
        /** 课程状态信息 */
        course_status: {
            /** 课程状态：not_started(未开始), in_progress(进行中), finished(已结束) */
            status: 'not_started' | 'in_progress' | 'finished';
            /** 课程开始时间 */
            course_start_time: string;
            /** 课程结束时间 */
            course_end_time: string;
        };
        /** 学生打卡详情列表 */
        student_details: Array<{
            /** 学号 */
            xh: string;
            /** 姓名 */
            xm: string;
            /** 班级名称 */
            bjmc?: string;
            /** 专业名称 */
            zymc?: string;
            /** 签到状态 */
            status: AttendanceStatus;
            /** 签到时间 */
            checkin_time?: string;
            /** 请假时间 */
            leave_time?: string;
            /** 请假原因 */
            leave_reason?: string;
            /** 位置信息 */
            location?: string;
            /** IP地址 */
            ip_address?: string;
        }>;
    };
}
/**
 * 学生签到请求接口
 * 注意：attendance_record_id 现在从URL路径参数中获取
 */
export interface StudentCheckInRequest {
    /** 位置信息 */
    location?: string;
    /** 纬度 */
    latitude?: number;
    /** 经度 */
    longitude?: number;
    /** 定位精度 */
    accuracy?: number;
    /** 备注 */
    remark?: string;
}
/**
 * 学生签到响应接口
 */
export interface StudentCheckInResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message: string;
    /** 签到记录数据 */
    data?: {
        /** 签到记录ID */
        id: string;
        /** 签到状态 */
        status: AttendanceStatus;
        /** 签到时间 */
        checkin_time?: string;
        /** 审批时间 */
        approved_time?: string;
        /** 审批人信息 */
        approver?: {
            /** 审批人ID */
            id: string;
            /** 审批人姓名 */
            name: string;
        };
    };
}
/**
 * 学生请假请求接口
 */
export interface StudentLeaveRequest {
    /** 考勤记录ID */
    attendance_record_id: string;
    /** 请假原因 */
    leave_reason: string;
    /** 请假类型 */
    leave_type?: 'sick' | 'personal' | 'emergency' | 'other';
    /** 附件列表 */
    attachments?: Array<{
        /** 文件名 */
        file_name: string;
        /** 文件内容(Base64编码) */
        file_content: string;
        /** 文件类型 */
        file_type: string;
        /** 文件大小(字节) */
        file_size: number;
    }>;
}
/**
 * 学生请假响应接口
 */
export interface StudentLeaveResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message: string;
    /** 请假申请数据 */
    data?: {
        /** 签到记录ID */
        id: string;
        /** 请假状态 */
        status: AttendanceStatus;
        /** 请假时间 */
        leave_time?: string;
        /** 请假原因 */
        leave_reason: string;
        /** 审批人信息 */
        approver?: {
            /** 审批人ID */
            id: string;
            /** 审批人姓名 */
            name: string;
        };
    };
}
/**
 * 学生请假审批查询请求参数
 */
export interface StudentLeaveApplicationQueryParams {
    /** 状态筛选 */
    status?: 'all' | 'leave_pending' | 'leave' | 'leave_rejected';
    /** 页码 */
    page?: number;
    /** 每页大小 */
    page_size?: number;
    /** 开始日期 */
    start_date?: string;
    /** 结束日期 */
    end_date?: string;
}
/**
 * 学生请假审批记录项
 */
export interface StudentLeaveApplicationItem {
    /** 记录ID */
    id: string;
    /** 课程名称 */
    course_name: string;
    /** 上课日期 */
    class_date: string;
    /** 上课时间 */
    class_time: string;
    /** 上课地点 */
    class_location?: string;
    /** 任课教师 */
    teacher_name: string;
    /** 请假类型 */
    leave_type: 'sick' | 'personal' | 'emergency' | 'other';
    /** 请假原因 */
    leave_reason: string;
    /** 申请时间 */
    application_time: string;
    /** 审批状态 */
    status: 'leave_pending' | 'leave' | 'leave_rejected';
    /** 审批时间 */
    approval_time?: string;
    /** 审批意见 */
    approval_comment?: string;
    /** 课程详细信息 */
    course_info: {
        /** 课程名称 */
        kcmc: string;
        /** 教室 */
        room_s: string;
        /** 教师姓名 */
        xm_s: string;
        /** 节次 */
        jc_s: string;
        /** 教学周 */
        jxz: number | null;
        /** 楼群 */
        lq: string | null;
        /** 课程开始时间 */
        course_start_time: string;
        /** 课程结束时间 */
        course_end_time: string;
    };
    /** 附件列表 */
    attachments: Array<{
        /** 附件ID */
        id: string;
        /** 文件名 */
        file_name: string;
        /** 文件大小 */
        file_size: number;
        /** 文件类型 */
        file_type: string;
        /** 上传时间 */
        upload_time: string;
    }>;
    /** 审批记录列表 */
    approvals: Array<{
        /** 审批记录ID */
        id: string;
        /** 审批人工号 */
        approver_id: string;
        /** 审批人姓名 */
        approver_name: string;
        /** 审批结果 */
        approval_result: 'pending' | 'approved' | 'rejected' | 'cancelled';
        /** 审批意见 */
        approval_comment?: string;
        /** 审批时间 */
        approval_time?: string;
    }>;
}
/**
 * 学生请假审批查询响应
 */
export interface StudentLeaveApplicationQueryResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message?: string;
    /** 数据 */
    data?: {
        /** 请假申请列表 */
        applications: StudentLeaveApplicationItem[];
        /** 总数 */
        total: number;
        /** 当前页 */
        page: number;
        /** 每页大小 */
        page_size: number;
        /** 统计信息 */
        stats: {
            /** 总申请数 */
            total_count: number;
            /** 待审批数 */
            leave_pending_count: number;
            /** 已批准数 */
            leave_count: number;
            /** 已拒绝数 */
            leave_rejected_count: number;
        };
    };
}
/**
 * 教师请假单查询请求参数
 */
export interface TeacherLeaveApplicationQueryParams {
    /** 状态筛选 */
    status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
    /** 页码 */
    page?: number;
    /** 每页大小 */
    page_size?: number;
    /** 开始日期 */
    start_date?: string;
    /** 结束日期 */
    end_date?: string;
}
/**
 * 教师请假单记录项
 */
export interface TeacherLeaveApplicationItem {
    /** 记录ID */
    id: string;
    /** 学生信息 */
    student: {
        /** 学号 */
        student_id: string;
        /** 姓名 */
        student_name: string;
        /** 班级 */
        class_name?: string;
    };
    /** 课程信息 */
    course: {
        /** 课程名称 */
        course_name: string;
        /** 上课时间 */
        class_time: string;
        /** 上课地点 */
        class_location?: string;
    };
    /** 请假信息 */
    leave_info: {
        /** 请假类型 */
        leave_type: 'sick' | 'personal' | 'emergency' | 'other';
        /** 请假日期 */
        leave_date: string;
        /** 请假原因 */
        leave_reason: string;
    };
    /** 申请时间 */
    application_time: string;
    /** 审批状态 */
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    /** 审批时间 */
    approval_time?: string;
    /** 审批意见 */
    approval_comment?: string;
    /** 审批ID */
    approval_id?: string;
    /** 附件列表 */
    attachments?: Array<{
        /** 附件ID */
        id: string;
        /** 文件名 */
        file_name: string;
        /** 文件大小 */
        file_size: number;
        /** 文件类型 */
        file_type: string;
    }>;
}
/**
 * 教师请假单查询响应
 */
export interface TeacherLeaveApplicationQueryResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message?: string;
    /** 数据 */
    data?: {
        /** 请假申请列表 */
        applications: TeacherLeaveApplicationItem[];
        /** 总数 */
        total: number;
        /** 当前页 */
        page: number;
        /** 每页大小 */
        page_size: number;
        /** 统计信息 */
        stats: {
            /** 待审批数 */
            pending_count: number;
            /** 已处理数 */
            processed_count: number;
            /** 已批准数 */
            approved_count: number;
            /** 已拒绝数 */
            rejected_count: number;
            /** 已取消数 */
            cancelled_count: number;
            /** 总数 */
            total_count: number;
        };
    };
}
/**
 * 附件查看响应
 */
export interface AttachmentViewResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message?: string;
    /** 附件数据 */
    data?: {
        /** 附件ID */
        id: string;
        /** 文件名 */
        file_name: string;
        /** 文件大小 */
        file_size: number;
        /** 文件类型 */
        file_type: string;
        /** 文件内容（Base64编码） */
        file_content?: string;
        /** 文件URL */
        file_url?: string;
    };
}
/**
 * 课程历史考勤查询参数
 */
export interface CourseAttendanceHistoryParams {
    /** 课程号 */
    kkh: string;
    /** 学年学期 */
    xnxq?: string;
    /** 开始日期 */
    start_date?: string;
    /** 结束日期 */
    end_date?: string;
}
/**
 * 单节课考勤统计
 */
export interface ClassAttendanceStats {
    /** 考勤记录ID */
    attendance_record_id: string;
    /** 上课日期 */
    class_date: string;
    /** 上课时间 */
    class_time: string;
    /** 节次 */
    class_period: string;
    /** 教学周 */
    teaching_week?: number;
    /** 教室 */
    classroom?: string;
    /** 总学生数 */
    total_students: number | string;
    /** 签到人数 */
    present_count: number | string;
    /** 请假人数 */
    leave_count: number | string;
    /** 旷课人数 */
    absent_count: number | string;
    /** 出勤率 */
    attendance_rate: number | string;
    /** 考勤状态 */
    status: 'active' | 'closed';
    /** 课程实时状态 */
    course_status: 'not_started' | 'in_progress' | 'finished';
    /** 创建时间 */
    created_at: string;
}
/**
 * 课程历史考勤响应
 */
export interface CourseAttendanceHistoryResponse {
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
            /** 教师信息 */
            teachers: Array<{
                /** 教师工号 */
                gh: string;
                /** 教师姓名 */
                xm: string;
            }>;
        };
        /** 考勤历史统计 */
        attendance_history: ClassAttendanceStats[];
        /** 总体统计 */
        overall_stats: {
            /** 总课节数 */
            total_classes: number;
            /** 平均出勤率 */
            average_attendance_rate: number;
            /** 总学生数 */
            total_students: number;
            /** 总签到次数 */
            total_present: number;
            /** 总请假次数 */
            total_leave: number;
            /** 总旷课次数 */
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
        status: AttendanceStatus;
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
 * 新版教师审批请假单请求（基于审批记录ID）
 */
export interface TeacherApprovalRequest {
    /** 审批记录ID */
    approval_id: string;
    /** 审批动作 */
    action: 'approve' | 'reject';
    /** 审批意见 */
    comment?: string;
}
/**
 * 新版教师审批请假单响应（基于审批记录ID）
 */
export interface TeacherApprovalResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message: string;
    /** 审批结果数据 */
    data?: {
        /** 审批记录ID */
        approval_id: string;
        /** 请假申请ID */
        application_id: string;
        /** 审批动作 */
        action: 'approve' | 'reject';
        /** 最终状态 */
        final_status: 'pending' | 'approved' | 'rejected';
        /** 审批时间 */
        approval_time: string;
        /** 审批意见 */
        approval_comment?: string;
    };
}
/**
 * 学生撤回请假申请请求接口
 */
export interface StudentWithdrawLeaveRequest {
    /** 考勤记录ID */
    attendance_record_id: string;
}
/**
 * 学生撤回请假申请响应接口
 */
export interface StudentWithdrawLeaveResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message: string;
    /** 撤回结果数据 */
    data?: {
        /** 删除的签到记录ID */
        deleted_attendance_id: string;
        /** 取消的审批记录ID列表 */
        cancelled_approval_ids: string[];
        /** 撤回时间 */
        withdraw_time: string;
    };
}
//# sourceMappingURL=attendance.d.ts.map