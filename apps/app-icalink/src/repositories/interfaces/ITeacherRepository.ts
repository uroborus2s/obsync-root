// @wps/app-icalink 教师信息仓储接口
// 基于 Stratix 框架的仓储接口定义

import { BaseRepository } from '@stratix/database';
import type { 
  OutJsxx, 
  IcalinkDatabase 
} from '../../types/database.js';
import type { 
  ServiceResult, 
  PaginatedResult, 
  QueryOptions 
} from '../../types/service.js';

/**
 * 教师信息查询条件
 */
export interface TeacherQueryConditions {
  gh?: string; // 工号
  xm?: string; // 姓名
  ssdwdm?: string; // 所属单位代码
  ssdwmc?: string; // 所属单位名称
  zgxw?: string; // 最高学位
  zgxl?: string; // 最高学历
  zc?: string; // 职称
  xb?: string; // 性别
}

/**
 * 教师详细信息（包含关联数据）
 */
export interface TeacherWithDetails extends OutJsxx {
  course_count?: number;
  student_count?: number;
  department_info?: {
    department_code: string;
    department_name: string;
    parent_department?: string;
  };
  teaching_load?: {
    current_semester_courses: number;
    total_students: number;
    weekly_hours: number;
  };
}

/**
 * 教师统计信息
 */
export interface TeacherStats {
  total_count: number;
  department_distribution: Record<string, number>;
  title_distribution: Record<string, number>;
  degree_distribution: Record<string, number>;
  gender_distribution: Record<string, number>;
}

/**
 * 教师信息仓储接口
 * 继承基础仓储接口，提供教师信息相关的数据访问方法
 */
export interface ITeacherRepository extends InstanceType<typeof BaseRepository<
  IcalinkDatabase,
  'out_jsxx',
  OutJsxx,
  Partial<OutJsxx>,
  Partial<OutJsxx>
>> {
  /**
   * 根据工号查找教师
   * @param teacherId 工号
   * @returns 教师信息或null
   */
  findByTeacherId(
    teacherId: string
  ): Promise<ServiceResult<OutJsxx | null>>;

  /**
   * 根据姓名查找教师
   * @param name 姓名
   * @param options 查询选项
   * @returns 教师信息列表
   */
  findByName(
    name: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutJsxx[]>>;

  /**
   * 根据部门查找教师
   * @param departmentCode 部门代码
   * @param options 查询选项
   * @returns 教师信息列表
   */
  findByDepartment(
    departmentCode: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutJsxx[]>>;

  /**
   * 根据职称查找教师
   * @param title 职称
   * @param options 查询选项
   * @returns 教师信息列表
   */
  findByTitle(
    title: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutJsxx[]>>;

  /**
   * 根据条件查询教师
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 教师信息列表
   */
  findByConditions(
    conditions: TeacherQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<OutJsxx[]>>;

  /**
   * 分页查询教师
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的教师信息列表
   */
  findByConditionsPaginated(
    conditions: TeacherQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<OutJsxx>>>;

  /**
   * 查询教师详细信息（包含关联数据）
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 教师详细信息列表
   */
  findWithDetails(
    conditions: TeacherQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<TeacherWithDetails[]>>;

  /**
   * 根据课程查找授课教师
   * @param courseCode 开课号
   * @param semester 学年学期
   * @param options 查询选项
   * @returns 教师信息列表
   */
  findByCourse(
    courseCode: string,
    semester: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutJsxx[]>>;

  /**
   * 获取教师的授课课程列表
   * @param teacherId 工号
   * @param semester 学年学期（可选）
   * @param options 查询选项
   * @returns 课程列表
   */
  getTeacherCourses(
    teacherId: string,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<Array<{
    course_id: number;
    course_code: string;
    course_name: string;
    semester: string;
    student_count: number;
    class_location?: string;
    start_time: Date;
    end_time: Date;
  }>>>;

  /**
   * 检查教师是否授课指定课程
   * @param teacherId 工号
   * @param courseCode 开课号
   * @param semester 学年学期
   * @returns 是否授课
   */
  isTeachingCourse(
    teacherId: string,
    courseCode: string,
    semester: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 统计教师信息
   * @param conditions 查询条件
   * @returns 统计信息
   */
  getStatistics(
    conditions?: TeacherQueryConditions
  ): Promise<ServiceResult<TeacherStats>>;

  /**
   * 搜索教师
   * @param keyword 关键词
   * @param searchFields 搜索字段
   * @param options 查询选项
   * @returns 匹配的教师列表
   */
  searchTeachers(
    keyword: string,
    searchFields?: ('gh' | 'xm' | 'ssdwmc' | 'zc')[],
    options?: QueryOptions
  ): Promise<ServiceResult<OutJsxx[]>>;

  /**
   * 获取所有部门列表
   * @returns 部门列表
   */
  getAllDepartments(): Promise<ServiceResult<Array<{
    code: string;
    name: string;
    teacher_count: number;
  }>>>;

  /**
   * 获取所有职称列表
   * @returns 职称列表
   */
  getAllTitles(): Promise<ServiceResult<Array<{
    title: string;
    teacher_count: number;
  }>>>;

  /**
   * 获取所有学位列表
   * @returns 学位列表
   */
  getAllDegrees(): Promise<ServiceResult<Array<{
    degree: string;
    teacher_count: number;
  }>>>;

  /**
   * 验证教师信息
   * @param teacherId 工号
   * @returns 验证结果
   */
  validateTeacher(
    teacherId: string
  ): Promise<ServiceResult<{
    exists: boolean;
    isActive: boolean;
    teacherInfo?: OutJsxx;
  }>>;

  /**
   * 获取教师的基本信息
   * @param teacherId 工号
   * @returns 基本信息
   */
  getBasicInfo(
    teacherId: string
  ): Promise<ServiceResult<{
    teacher_id: string;
    teacher_name: string;
    department_name: string;
    title: string;
    degree: string;
    education: string;
  } | null>>;

  /**
   * 批量获取教师基本信息
   * @param teacherIds 工号数组
   * @returns 基本信息列表
   */
  getBatchBasicInfo(
    teacherIds: string[]
  ): Promise<ServiceResult<Array<{
    teacher_id: string;
    teacher_name: string;
    department_name: string;
    title: string;
    degree: string;
    education: string;
  }>>>;

  /**
   * 获取教师的联系信息
   * @param teacherId 工号
   * @returns 联系信息
   */
  getContactInfo(
    teacherId: string
  ): Promise<ServiceResult<{
    teacher_id: string;
    teacher_name: string;
    phone?: string;
    email?: string;
    department: string;
  } | null>>;

  /**
   * 获取教师的教学负荷
   * @param teacherId 工号
   * @param semester 学年学期（可选）
   * @returns 教学负荷信息
   */
  getTeachingLoad(
    teacherId: string,
    semester?: string
  ): Promise<ServiceResult<{
    teacher_id: string;
    teacher_name: string;
    semester: string;
    course_count: number;
    total_students: number;
    weekly_hours: number;
    courses: Array<{
      course_name: string;
      student_count: number;
      weekly_hours: number;
    }>;
  }>>;

  /**
   * 获取教师的考勤统计
   * @param teacherId 工号
   * @param semester 学年学期（可选）
   * @returns 考勤统计信息
   */
  getAttendanceStats(
    teacherId: string,
    semester?: string
  ): Promise<ServiceResult<{
    teacher_id: string;
    teacher_name: string;
    total_courses: number;
    total_students: number;
    total_classes: number;
    overall_attendance_rate: number;
    course_stats: Array<{
      course_name: string;
      student_count: number;
      attendance_rate: number;
      present_count: number;
      late_count: number;
      absent_count: number;
      leave_count: number;
    }>;
  }>>;

  /**
   * 检查教师是否有权限访问指定学生的数据
   * @param teacherId 工号
   * @param studentId 学号
   * @param semester 学年学期（可选）
   * @returns 是否有权限
   */
  hasAccessToStudent(
    teacherId: string,
    studentId: string,
    semester?: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取教师可访问的学生列表
   * @param teacherId 工号
   * @param semester 学年学期（可选）
   * @param options 查询选项
   * @returns 学生列表
   */
  getAccessibleStudents(
    teacherId: string,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<Array<{
    student_id: string;
    student_name: string;
    class_name: string;
    course_name: string;
  }>>>;
}
