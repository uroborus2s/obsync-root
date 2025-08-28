// @wps/app-icalink 学生信息仓储接口
// 基于 Stratix 框架的仓储接口定义

import { BaseRepository } from '@stratix/database';
import type { 
  OutXsxx, 
  OutJwKcbXs,
  IcalinkDatabase 
} from '../../types/database.js';
import type { 
  ServiceResult, 
  PaginatedResult, 
  QueryOptions 
} from '../../types/service.js';

/**
 * 学生信息查询条件
 */
export interface StudentQueryConditions {
  xh?: string; // 学号
  xm?: string; // 姓名
  xydm?: string; // 学院代码
  xymc?: string; // 学院名称
  zydm?: string; // 专业代码
  zymc?: string; // 专业名称
  bjdm?: string; // 班级代码
  bjmc?: string; // 班级名称
  sznj?: string; // 所在年级
  lx?: number; // 类型 1本科生 2研究生
}

/**
 * 学生课程查询条件
 */
export interface StudentCourseQueryConditions {
  xh?: string; // 学号
  kkh?: string; // 开课号
  xnxq?: string; // 学年学期
  kcbh?: string; // 课程编号
}

/**
 * 学生详细信息（包含关联数据）
 */
export interface StudentWithDetails extends OutXsxx {
  course_count?: number;
  attendance_count?: number;
  attendance_rate?: number;
  recent_attendance?: Array<{
    course_name: string;
    attendance_date: Date;
    status: string;
  }>;
}

/**
 * 学生统计信息
 */
export interface StudentStats {
  total_count: number;
  undergraduate_count: number;
  graduate_count: number;
  college_distribution: Record<string, number>;
  major_distribution: Record<string, number>;
  grade_distribution: Record<string, number>;
}

/**
 * 学生信息仓储接口
 * 继承基础仓储接口，提供学生信息相关的数据访问方法
 */
export interface IStudentRepository extends InstanceType<typeof BaseRepository<
  IcalinkDatabase,
  'out_xsxx',
  OutXsxx,
  Partial<OutXsxx>,
  Partial<OutXsxx>
>> {
  /**
   * 根据学号查找学生
   * @param studentId 学号
   * @returns 学生信息或null
   */
  findByStudentId(
    studentId: string
  ): Promise<ServiceResult<OutXsxx | null>>;

  /**
   * 根据姓名查找学生
   * @param name 姓名
   * @param options 查询选项
   * @returns 学生信息列表
   */
  findByName(
    name: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutXsxx[]>>;

  /**
   * 根据班级查找学生
   * @param classCode 班级代码
   * @param options 查询选项
   * @returns 学生信息列表
   */
  findByClass(
    classCode: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutXsxx[]>>;

  /**
   * 根据专业查找学生
   * @param majorCode 专业代码
   * @param options 查询选项
   * @returns 学生信息列表
   */
  findByMajor(
    majorCode: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutXsxx[]>>;

  /**
   * 根据学院查找学生
   * @param collegeCode 学院代码
   * @param options 查询选项
   * @returns 学生信息列表
   */
  findByCollege(
    collegeCode: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutXsxx[]>>;

  /**
   * 根据年级查找学生
   * @param grade 年级
   * @param options 查询选项
   * @returns 学生信息列表
   */
  findByGrade(
    grade: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutXsxx[]>>;

  /**
   * 根据条件查询学生
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 学生信息列表
   */
  findByConditions(
    conditions: StudentQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<OutXsxx[]>>;

  /**
   * 分页查询学生
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的学生信息列表
   */
  findByConditionsPaginated(
    conditions: StudentQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<OutXsxx>>>;

  /**
   * 查询学生详细信息（包含关联数据）
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 学生详细信息列表
   */
  findWithDetails(
    conditions: StudentQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<StudentWithDetails[]>>;

  /**
   * 根据课程查找学生
   * @param courseCode 开课号
   * @param semester 学年学期
   * @param options 查询选项
   * @returns 学生信息列表
   */
  findByCourse(
    courseCode: string,
    semester: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutXsxx[]>>;

  /**
   * 获取学生的课程列表
   * @param studentId 学号
   * @param semester 学年学期（可选）
   * @param options 查询选项
   * @returns 课程列表
   */
  getStudentCourses(
    studentId: string,
    semester?: string,
    options?: QueryOptions
  ): Promise<ServiceResult<OutJwKcbXs[]>>;

  /**
   * 检查学生是否选修了指定课程
   * @param studentId 学号
   * @param courseCode 开课号
   * @param semester 学年学期
   * @returns 是否选修
   */
  isEnrolledInCourse(
    studentId: string,
    courseCode: string,
    semester: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 统计学生信息
   * @param conditions 查询条件
   * @returns 统计信息
   */
  getStatistics(
    conditions?: StudentQueryConditions
  ): Promise<ServiceResult<StudentStats>>;

  /**
   * 搜索学生
   * @param keyword 关键词
   * @param searchFields 搜索字段
   * @param options 查询选项
   * @returns 匹配的学生列表
   */
  searchStudents(
    keyword: string,
    searchFields?: ('xh' | 'xm' | 'bjmc' | 'zymc')[],
    options?: QueryOptions
  ): Promise<ServiceResult<OutXsxx[]>>;

  /**
   * 获取所有学院列表
   * @returns 学院列表
   */
  getAllColleges(): Promise<ServiceResult<Array<{
    code: string;
    name: string;
    student_count: number;
  }>>>;

  /**
   * 获取所有专业列表
   * @param collegeCode 学院代码（可选）
   * @returns 专业列表
   */
  getAllMajors(
    collegeCode?: string
  ): Promise<ServiceResult<Array<{
    code: string;
    name: string;
    college_code: string;
    college_name: string;
    student_count: number;
  }>>>;

  /**
   * 获取所有班级列表
   * @param majorCode 专业代码（可选）
   * @returns 班级列表
   */
  getAllClasses(
    majorCode?: string
  ): Promise<ServiceResult<Array<{
    code: string;
    name: string;
    major_code: string;
    major_name: string;
    student_count: number;
  }>>>;

  /**
   * 获取所有年级列表
   * @returns 年级列表
   */
  getAllGrades(): Promise<ServiceResult<Array<{
    grade: string;
    student_count: number;
  }>>>;

  /**
   * 验证学生信息
   * @param studentId 学号
   * @returns 验证结果
   */
  validateStudent(
    studentId: string
  ): Promise<ServiceResult<{
    exists: boolean;
    isActive: boolean;
    studentInfo?: OutXsxx;
  }>>;

  /**
   * 获取学生的基本信息
   * @param studentId 学号
   * @returns 基本信息
   */
  getBasicInfo(
    studentId: string
  ): Promise<ServiceResult<{
    student_id: string;
    student_name: string;
    class_name: string;
    major_name: string;
    college_name: string;
    grade: string;
    student_type: string;
  } | null>>;

  /**
   * 批量获取学生基本信息
   * @param studentIds 学号数组
   * @returns 基本信息列表
   */
  getBatchBasicInfo(
    studentIds: string[]
  ): Promise<ServiceResult<Array<{
    student_id: string;
    student_name: string;
    class_name: string;
    major_name: string;
    college_name: string;
    grade: string;
    student_type: string;
  }>>>;

  /**
   * 获取学生的联系信息
   * @param studentId 学号
   * @returns 联系信息
   */
  getContactInfo(
    studentId: string
  ): Promise<ServiceResult<{
    student_id: string;
    student_name: string;
    phone?: string;
    email?: string;
  } | null>>;
}
