// @wps/app-icalink 签到统计相关类型定义
// 用于签到数据分析和排行榜功能

/**
 * 出勤统计基础接口
 */
export interface AttendanceStatsBase {
  /** 应签到人数 */
  total_should_attend: number;
  /** 实际出勤人数(present + late) */
  actual_attended: number;
  /** 请假人数 */
  leave_count: number;
  /** 缺勤人数 */
  absent_count: number;
  /** 出勤率 = (actual_attended + leave_count) / total_should_attend */
  attendance_rate: number;
}

/**
 * 课程维度统计
 */
export interface CourseAttendanceStats extends AttendanceStatsBase {
  /** 课程代码(kkh) */
  course_code: string;
  /** 课程名称 */
  course_name: string;
  /** 学期 */
  semester: string;
  /** 教师姓名 */
  teacher_names: string;
  /** 教师工号列表 */
  teacher_codes: string;
  /** 总课次数 */
  class_count: number;
  /** 最近上课时间 */
  last_class_time?: Date;
}

/**
 * 教师维度统计
 */
export interface TeacherAttendanceStats extends AttendanceStatsBase {
  /** 教师工号 */
  teacher_code: string;
  /** 教师姓名 */
  teacher_name: string;
  /** 授课课程数 */
  course_count: number;
  /** 总课次数 */
  class_count: number;
  /** 授课课程列表 */
  courses?: string[];
}

/**
 * 学生维度统计
 */
export interface StudentAttendanceStats extends AttendanceStatsBase {
  /** 学号 */
  student_id: string;
  /** 姓名 */
  student_name: string;
  /** 班级 */
  class_name?: string;
  /** 专业 */
  major_name?: string;
  /** 选课数量 */
  course_count: number;
  /** 最近签到时间 */
  last_checkin_time?: Date;
}

/**
 * 统计查询条件
 */
export interface AttendanceStatsQuery {
  /** 学期筛选 */
  semester?: string;
  /** 开始日期 */
  start_date?: Date;
  /** 结束日期 */
  end_date?: Date;
  /** 课程代码筛选 */
  course_code?: string;
  /** 教师工号筛选 */
  teacher_code?: string;
  /** 学生学号筛选 */
  student_id?: string;
  /** 分页参数 */
  page?: number;
  /** 每页大小 */
  page_size?: number;
  /** 排序字段 */
  sort_by?:
    | 'attendance_rate'
    | 'class_count'
    | 'course_count'
    | 'last_class_time';
  /** 排序方向 */
  sort_order?: 'asc' | 'desc';
}

/**
 * 排行榜项目
 */
export interface RankingItem {
  /** 排名 */
  rank: number;
  /** 标识符(学号/课程代码/教师工号) */
  id: string;
  /** 名称 */
  name: string;
  /** 出勤率 */
  attendance_rate: number;
  /** 总课次/选课数 */
  total_count: number;
  /** 额外信息 */
  extra_info?: string;
}

/**
 * 出勤率计算说明
 */
export interface AttendanceRateExplanation {
  /** 计算公式 */
  formula: string;
  /** 公式说明 */
  description: string;
  /** 状态说明 */
  status_explanation: {
    present: string;
    late: string;
    leave: string;
    absent: string;
  };
}

/**
 * 统计响应数据
 */
export interface AttendanceStatsResponse<T> {
  /** 统计数据 */
  data: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页大小 */
  page_size: number;
  /** 出勤率计算说明 */
  explanation?: AttendanceRateExplanation;
}
