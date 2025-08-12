/**
 * 仓库层类型定义
 */

/**
 * 课表数据实体
 */
export interface CourseScheduleEntity {
  kkh: string; // 开课号
  xnxq: string; // 学年学期
  jxz: string; // 教学周
  zc: number; // 周次
  rq: string; // 日期
  jc: number; // 节次
  kcmc: string; // 课程名称
  kcbh: string; // 课程编号
  room: string | null; // 教室
  ghs: string | null; // 工号
  xms: string | null; // 姓名
  lq: string | null; // 楼群
  st: string; // 开始时间
  ed: string; // 结束时间
  sfdk: string | null; // 是否打卡
  gx_sj: string | null; // 更新时间
  gx_zt: number | null; // 更新状态
  zt: string | null; // 状态
}

/**
 * 聚合任务实体
 */
export interface CourseAggregateEntity {
  id?: number; // 自增ID
  kkh: string; // 开课号
  xnxq: string; // 学年学期
  jxz: string; // 教学周
  zc: number; // 周次
  rq: string; // 日期
  kcmc: string; // 课程名称
  sfdk: string | null; // 是否打卡
  jc_s: string; // 节次串
  room_s: string; // 教室串
  gh_s: string | null; // 工号串
  xm_s: string | null; // 姓名串
  lq: string | null; // 楼群
  sj_f: string; // 开始时间
  sj_t: string; // 结束时间
  sjd: string; // 时间段 (am/pm)
  gx_zt: number | null; // 更新状态
  gx_sj: string | null; // 更新时间
  created_at?: Date; // 创建时间
  updated_at?: Date; // 更新时间
}

/**
 * 学生课表实体
 */
export interface StudentCourseEntity {
  kkh: string; // 开课号
  xh: string; // 学号
  xnxq: string; // 学年学期
  kcbh: string; // 课程编号
  pyfadm: string | null; // 培养方案代码
  xsyd: string | null; // 学生异动标识
  xgxklbdm: string | null; // 校公选课类别代码
  sj: string | null; // 时间
  zt: string | null; // 状态
}

/**
 * 学生信息实体
 */
export interface StudentInfoEntity {
  id: string; // 主键ID
  xm: string | null; // 姓名
  xh: string | null; // 学号
  xydm: string | null; // 学院代码
  xymc: string | null; // 学院名称
  zydm: string | null; // 专业代码
  zymc: string | null; // 专业名称
  bjdm: string | null; // 班级代码
  bjmc: string | null; // 班级名称
  xb: string | null; // 性别
  mz: string | null; // 民族
  sfzh: string | null; // 身份证号
  sjh: string | null; // 手机号
  sznj: string | null; // 所在年级
  rxnf: string | null; // 入学年份
  email: string | null; // 邮箱
  lx: number; // 类型 1本科生 2研究生
  update_time: Date | null; // 更新时间
  ykth: string | null; // 一卡通号
  sj: string | null; // 时间
  zt: string | null; // 状态
}

/**
 * 教师信息实体
 */
export interface TeacherInfoEntity {
  id: string; // 主键ID
  xm: string | null; // 姓名
  gh: string | null; // 工号
  ssdwdm: string | null; // 所属单位代码
  ssdwmc: string | null; // 所属单位名称
  zgxw: string | null; // 最高学位
  zgxl: string | null; // 最高学历
  zc: string | null; // 职称
  xb: string | null; // 性别
  sjh: string | null; // 手机号
  email: string | null; // 邮箱
  update_time: Date | null; // 更新时间
  ykth: string | null; // 一卡通号
  sj: string | null; // 时间
  zt: string | null; // 状态
}

/**
 * 考勤记录实体
 */
export interface AttendanceEntity {
  id: string; // 主键ID
  kkh: string; // 开课号
  xnxq: string; // 学年学期
  jxz: number | null; // 教学周
  zc: number | null; // 周次
  rq: string; // 日期
  jc_s: string; // 节次串
  kcmc: string; // 课程名称
  sj_f: string; // 开始时间
  sj_t: string; // 结束时间
  sjd: 'am' | 'pm'; // 时间段
  total_count: number; // 总人数
  checkin_count: number; // 签到人数
  absent_count: number; // 旷课人数
  leave_count: number; // 请假人数
  checkin_url: string | null; // 签到URL
  leave_url: string | null; // 请假URL
  checkin_token: string | null; // 签到令牌
  status: 'active' | 'closed'; // 状态
  auto_start_time: string | null; // 自动开始时间 (varchar(50))
  auto_close_time: string | null; // 自动关闭时间 (varchar(50))
  lq: string | null; // 楼群或相关标识
  created_at: Date; // 创建时间
  updated_at: Date; // 更新时间
}

/**
 * 学生签到记录实体
 */
export interface StudentAttendanceEntity {
  id: string; // 主键ID
  attendance_record_id: string; // 考勤记录ID
  xh: string; // 学号
  xm: string; // 学生姓名
  status:
    | 'present'
    | 'absent'
    | 'leave'
    | 'pending_approval'
    | 'leave_pending'
    | 'leave_rejected'; // 签到状态
  checkin_time: Date | null; // 签到时间
  location_id: string; // 签到地点记录ID
  leave_reason: string | null; // 请假原因
  leave_type: 'sick' | 'personal' | 'emergency' | 'other' | null; // 请假类型
  leave_time: Date | null; // 请假时间
  approver_id: string | null; // 审批人ID(教师工号)
  approver_name: string | null; // 审批人姓名
  approved_time: Date | null; // 审批时间
  latitude: number | null; // 纬度
  longitude: number | null; // 经度
  accuracy: number | null; // 定位精度
  remark: string | null; // 备注
  ip_address: string | null; // 签到IP地址
  user_agent: string | null; // 用户代理
  created_at: Date; // 创建时间
}

/**
 * 课表映射实体
 */
export interface ScheduleMappingEntity {
  id: string; // 主键ID
  kkh: string; // 开课号
  xnxq: string; // 学年学期
  wps_calendar_id: string | null; // WPS日历ID
  wps_event_id: string | null; // WPS事件ID
  participant_type: string; // 参与者类型 (teacher/student)
  participant_id: string; // 参与者ID
  sync_status: string; // 同步状态
  sync_time: Date | null; // 同步时间
  error_message: string | null; // 错误信息
  created_at: Date; // 创建时间
  updated_at: Date; // 更新时间
}

/**
 * 同步日志实体
 */
export interface SyncLogEntity {
  id: string; // 主键ID
  task_id: string; // 任务ID
  task_type: string; // 任务类型 (full_sync/incremental_sync)
  xnxq: string; // 学年学期
  status: string; // 状态
  start_time: Date; // 开始时间
  end_time: Date | null; // 结束时间
  total_tasks: number; // 总任务数
  completed_tasks: number; // 完成任务数
  failed_tasks: number; // 失败任务数
  error_message: string | null; // 错误信息
  metadata: string | null; // 元数据 JSON
  created_at: Date; // 创建时间
  updated_at: Date; // 更新时间
}

/**
 * 请假申请实体
 */
export interface LeaveApplicationEntity {
  id: string; // 主键ID
  student_id: string; // 学生学号
  student_name: string; // 学生姓名
  student_attendance_record_id: string; // 关联学生考勤记录ID
  kkh: string; // 开课号
  xnxq: string; // 学年学期
  course_name: string; // 课程名称
  class_date: Date; // 上课日期
  class_time: string; // 上课时间
  class_location: string | null; // 上课地点
  teacher_id: string; // 任课教师工号
  teacher_name: string; // 任课教师姓名
  leave_type: 'sick' | 'personal' | 'emergency' | 'other'; // 请假类型
  leave_date: Date; // 请假日期
  leave_reason: string; // 请假原因
  application_time: Date; // 申请时间
  status: 'pending' | 'approved' | 'rejected'; // 申请状态
  created_at: Date; // 创建时间
  updated_at: Date; // 更新时间
}

/**
 * 请假附件实体
 */
export interface LeaveAttachmentEntity {
  id: string; // 主键ID
  application_id: string; // 请假申请ID
  file_name: string; // 文件名
  file_path?: string; // 文件路径(可选，用于文件系统存储)
  file_content?: Buffer; // 文件内容(二进制数据，用于数据库存储)
  file_size: number; // 文件大小
  file_type: string; // 文件类型
  storage_type: 'file' | 'database'; // 存储类型
  upload_time: Date; // 上传时间
}

/**
 * 请假审批实体
 */
export interface LeaveApprovalEntity {
  id: string; // 主键ID
  application_id: string; // 请假申请ID
  approver_id: string; // 审批人ID
  approver_name: string; // 审批人姓名
  approval_result: 'pending' | 'approved' | 'rejected' | 'cancelled'; // 审批结果
  approval_comment: string | null; // 审批意见
  approval_time: Date | null; // 审批时间
  created_at: Date; // 创建时间
}

/**
 * 用户日历实体
 */
export interface UserCalendarEntity {
  id?: number; // 自增主键，插入时可选
  wpsId: string | null;
  xgh: string | null; // 学号/工号
  name: string | null; // 用户姓名
  calendar_id: string | null; // WPS日历ID
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
