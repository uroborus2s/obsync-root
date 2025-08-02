/**
 * 仓库层类型定义
 */
/**
 * 课表数据实体
 */
export interface CourseScheduleEntity {
    kkh: string;
    xnxq: string;
    jxz: string;
    zc: number;
    rq: string;
    jc: number;
    kcmc: string;
    kcbh: string;
    room: string | null;
    ghs: string | null;
    xms: string | null;
    lq: string | null;
    st: string;
    ed: string;
    sfdk: string | null;
    gx_sj: string | null;
    gx_zt: number | null;
    zt: string | null;
}
/**
 * 聚合任务实体
 */
export interface CourseAggregateEntity {
    id?: number;
    kkh: string;
    xnxq: string;
    jxz: string;
    zc: number;
    rq: string;
    kcmc: string;
    sfdk: string | null;
    jc_s: string;
    room_s: string;
    gh_s: string | null;
    xm_s: string | null;
    lq: string | null;
    sj_f: string;
    sj_t: string;
    sjd: string;
    gx_zt: number | null;
    gx_sj: string | null;
    created_at?: Date;
    updated_at?: Date;
}
/**
 * 学生课表实体
 */
export interface StudentCourseEntity {
    kkh: string;
    xh: string;
    xnxq: string;
    kcbh: string;
    pyfadm: string | null;
    xsyd: string | null;
    xgxklbdm: string | null;
    sj: string | null;
    zt: string | null;
}
/**
 * 学生信息实体
 */
export interface StudentInfoEntity {
    id: string;
    xm: string | null;
    xh: string | null;
    xydm: string | null;
    xymc: string | null;
    zydm: string | null;
    zymc: string | null;
    bjdm: string | null;
    bjmc: string | null;
    xb: string | null;
    mz: string | null;
    sfzh: string | null;
    sjh: string | null;
    sznj: string | null;
    rxnf: string | null;
    email: string | null;
    lx: number;
    update_time: Date | null;
    ykth: string | null;
    sj: string | null;
    zt: string | null;
}
/**
 * 教师信息实体
 */
export interface TeacherInfoEntity {
    id: string;
    xm: string | null;
    gh: string | null;
    ssdwdm: string | null;
    ssdwmc: string | null;
    zgxw: string | null;
    zgxl: string | null;
    zc: string | null;
    xb: string | null;
    sjh: string | null;
    email: string | null;
    update_time: Date | null;
    ykth: string | null;
    sj: string | null;
    zt: string | null;
}
/**
 * 考勤记录实体
 */
export interface AttendanceEntity {
    id: string;
    kkh: string;
    xnxq: string;
    jxz: number | null;
    zc: number | null;
    rq: string;
    jc_s: string;
    kcmc: string;
    sj_f: string;
    sj_t: string;
    sjd: 'am' | 'pm';
    total_count: number;
    checkin_count: number;
    absent_count: number;
    leave_count: number;
    checkin_url: string | null;
    leave_url: string | null;
    checkin_token: string | null;
    status: 'active' | 'closed';
    auto_start_time: string | null;
    auto_close_time: string | null;
    lq: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * 学生签到记录实体
 */
export interface StudentAttendanceEntity {
    id: string;
    attendance_record_id: string;
    xh: string;
    xm: string;
    status: 'present' | 'absent' | 'leave' | 'pending_approval' | 'leave_pending' | 'leave_rejected';
    checkin_time: Date | null;
    location_id: string;
    leave_reason: string | null;
    leave_type: 'sick' | 'personal' | 'emergency' | 'other' | null;
    leave_time: Date | null;
    approver_id: string | null;
    approver_name: string | null;
    approved_time: Date | null;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    remark: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
}
/**
 * 课表映射实体
 */
export interface ScheduleMappingEntity {
    id: string;
    kkh: string;
    xnxq: string;
    wps_calendar_id: string | null;
    wps_event_id: string | null;
    participant_type: string;
    participant_id: string;
    sync_status: string;
    sync_time: Date | null;
    error_message: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * 同步日志实体
 */
export interface SyncLogEntity {
    id: string;
    task_id: string;
    task_type: string;
    xnxq: string;
    status: string;
    start_time: Date;
    end_time: Date | null;
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    error_message: string | null;
    metadata: string | null;
    created_at: Date;
    updated_at: Date;
}
/**
 * 请假申请实体
 */
export interface LeaveApplicationEntity {
    id: string;
    student_id: string;
    student_name: string;
    student_attendance_record_id: string;
    kkh: string;
    xnxq: string;
    course_name: string;
    class_date: Date;
    class_time: string;
    class_location: string | null;
    teacher_id: string;
    teacher_name: string;
    leave_type: 'sick' | 'personal' | 'emergency' | 'other';
    leave_date: Date;
    leave_reason: string;
    application_time: Date;
    status: 'pending' | 'approved' | 'rejected';
    created_at: Date;
    updated_at: Date;
}
/**
 * 请假附件实体
 */
export interface LeaveAttachmentEntity {
    id: string;
    application_id: string;
    file_name: string;
    file_path?: string;
    file_content?: Buffer;
    file_size: number;
    file_type: string;
    storage_type: 'file' | 'database';
    upload_time: Date;
}
/**
 * 请假审批实体
 */
export interface LeaveApprovalEntity {
    id: string;
    application_id: string;
    approver_id: string;
    approver_name: string;
    approval_result: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approval_comment: string | null;
    approval_time: Date | null;
    created_at: Date;
}
/**
 * 用户日历实体
 */
export interface UserCalendarEntity {
    id?: number;
    wpsId: string | null;
    xgh: string | null;
    name: string | null;
    calendar_id: string | null;
    status: 'normal' | null;
    ctime: Date;
    mtime: Date | null;
}
/**
 * 数据库表结构定义
 */
export interface IcalinkDatabase {
    u_jw_kcb_cur: CourseScheduleEntity;
    juhe_renwu: CourseAggregateEntity;
    out_jw_kcb_xs: StudentCourseEntity;
    out_xsxx: StudentInfoEntity;
    out_jsxx: TeacherInfoEntity;
    icalink_attendance_records: AttendanceEntity;
    icalink_student_attendance: StudentAttendanceEntity;
    icalink_schedule_mapping: ScheduleMappingEntity;
    icalink_sync_logs: SyncLogEntity;
    icalink_leave_applications: LeaveApplicationEntity;
    icalink_leave_attachments: LeaveAttachmentEntity;
    icalink_leave_approvals: LeaveApprovalEntity;
    user_calendar: UserCalendarEntity;
}
/**
 * 扩展的数据库类型
 */
export type ExtendedDatabase = IcalinkDatabase;
//# sourceMappingURL=types.d.ts.map