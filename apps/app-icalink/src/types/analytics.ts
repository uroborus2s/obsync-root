// 签到数据分析类型定义
export interface AttendanceAnalyticsRequest {
  xnxq?: string;        // 学年学期
  start_date?: string;  // 开始日期 YYYY-MM-DD
  end_date?: string;    // 结束日期 YYYY-MM-DD
  page?: number;
  page_size?: number;
}

// 课程维度统计
export interface CourseAttendanceStats {
  kkh: string;                    // 课程号
  course_name: string;            // 课程名称
  xnxq: string;                   // 学年学期
  teacher_names: string[];        // 授课教师名称列表
  total_classes: number;          // 总课次
  total_students: number;         // 应签到学生总数
  present_count: number;          // 实际出勤人次
  leave_count: number;            // 请假人次
  absent_count: number;           // 缺勤人次
  attendance_rate: number;        // 出勤率 = (present_count + leave_count) / total_students
  created_at: Date;
}

// 教师维度统计
export interface TeacherAttendanceStats {
  teacher_id: string;             // 教师工号
  teacher_name: string;           // 教师姓名
  department?: string;            // 所属部门
  total_courses: number;          // 授课总数
  total_classes: number;          // 总课次
  total_students: number;         // 应签到学生总数
  present_count: number;          // 实际出勤人次
  leave_count: number;            // 请假人次
  absent_count: number;           // 缺勤人次
  attendance_rate: number;        // 平均出勤率
  courses: {
    kkh: string;
    course_name: string;
    attendance_rate: number;
  }[];
}

// 学生维度统计
export interface StudentAttendanceStats {
  student_id: string;             // 学号
  student_name: string;           // 学生姓名
  class_name: string;             // 班级名称
  major_name: string;             // 专业名称
  total_courses: number;          // 选课总数
  total_classes: number;          // 总课次
  present_count: number;          // 出勤次数
  leave_count: number;            // 请假次数
  absent_count: number;           // 缺勤次数
  late_count: number;             // 迟到次数
  attendance_rate: number;        // 出勤率
  courses: {
    kkh: string;
    course_name: string;
    present_count: number;
    leave_count: number;
    absent_count: number;
    attendance_rate: number;
  }[];
}

// 教学班维度统计
export interface ClassAttendanceStats {
  class_name: string;             // 班级名称
  major_name: string;             // 专业名称
  total_students: number;         // 班级总人数
  total_courses: number;          // 班级课程数
  total_classes: number;          // 总课次
  present_count: number;          // 班级出勤人次
  leave_count: number;            // 班级请假人次
  absent_count: number;           // 班级缺勤人次
  attendance_rate: number;        // 班级平均出勤率
  students: {
    student_id: string;
    student_name: string;
    attendance_rate: number;
    present_count: number;
    leave_count: number;
    absent_count: number;
  }[];
}

// 排行榜相关类型
export interface AttendanceRankingRequest {
  xnxq?: string;
  type: 'student' | 'course' | 'class' | 'teacher';
  order_by?: 'attendance_rate' | 'present_count' | 'total_classes';
  order_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface StudentRanking {
  rank: number;
  student_id: string;
  student_name: string;
  class_name: string;
  major_name: string;
  attendance_rate: number;
  total_classes: number;
  present_count: number;
  leave_count: number;
  absent_count: number;
}

export interface CourseRanking {
  rank: number;
  kkh: string;
  course_name: string;
  teacher_names: string[];
  attendance_rate: number;
  total_students: number;
  total_classes: number;
  present_count: number;
  leave_count: number;
  absent_count: number;
}

export interface ClassRanking {
  rank: number;
  class_name: string;
  major_name: string;
  attendance_rate: number;
  total_students: number;
  total_courses: number;
  present_count: number;
  leave_count: number;
  absent_count: number;
}

export interface TeacherRanking {
  rank: number;
  teacher_id: string;
  teacher_name: string;
  department?: string;
  attendance_rate: number;
  total_courses: number;
  total_classes: number;
  present_count: number;
  leave_count: number;
  absent_count: number;
}

// API响应类型
export interface AnalyticsApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedAnalyticsResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}