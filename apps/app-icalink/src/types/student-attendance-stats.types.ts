// @wps/app-icalink 学生考勤统计相关类型定义
// 用于学生本学期课程和考勤情况统计

/**
 * 学生学期考勤统计视图实体
 * 对应数据库视图：v_student_semester_attendance_stats
 */
export interface VStudentSemesterAttendanceStats {
  /** 学生ID */
  student_id: string;
  /** 学生姓名 */
  student_name: string;
  /** 学院名称 */
  school_name: string | null;
  /** 班级名称 */
  class_name: string | null;
  /** 专业名称 */
  major_name: string | null;
  /** 学期 */
  semester: string;
  /** 本学期总课程数（总课时数） */
  total_courses: number;
  /** 截止当前已上课程数（已上课时数） */
  completed_courses: number;
  /** 缺勤次数 */
  absence_count: number;
  /** 请假次数 */
  leave_count: number;
  /** 出勤次数 */
  attendance_count: number;
  /** 出勤率（百分比，保留2位小数） */
  attendance_rate: number;
}

/**
 * 学生考勤统计查询参数
 */
export interface StudentAttendanceStatsQuery {
  /** 学生ID */
  student_id: string;
  /** 学期（可选，默认当前学期） */
  semester?: string;
}

/**
 * 学生考勤统计响应
 */
export interface StudentAttendanceStatsResponse {
  /** 学生ID */
  student_id: string;
  /** 学生姓名 */
  student_name: string;
  /** 学院名称 */
  school_name: string | null;
  /** 班级名称 */
  class_name: string | null;
  /** 专业名称 */
  major_name: string | null;
  /** 学期 */
  semester: string;
  /** 本学期总课程数（总课时数） */
  total_courses: number;
  /** 截止当前已上课程数（已上课时数） */
  completed_courses: number;
  /** 缺勤次数 */
  absence_count: number;
  /** 请假次数 */
  leave_count: number;
  /** 出勤次数 */
  attendance_count: number;
  /** 出勤率（百分比） */
  attendance_rate: number;
}

