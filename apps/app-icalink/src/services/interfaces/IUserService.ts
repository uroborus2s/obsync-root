// @wps/app-icalink 用户服务接口
// 基于 Stratix 框架的服务接口定义

import type {
  ServiceResult
} from '../../types/service.js';
import type {
  UserInfo,
  UserType
} from '../../types/api.js';

/**
 * 用户基本信息
 */
export interface UserBasicInfo {
  id: string;
  name: string;
  type: UserType;
  email?: string;
  phone?: string;
  avatar?: string;
}

/**
 * 学生详细信息
 */
export interface StudentDetailInfo extends UserBasicInfo {
  type: 'student';
  studentId: string;
  className: string;
  majorName: string;
  collegeName: string;
  grade: string;
  enrollmentYear: string;
  studentType: 'undergraduate' | 'graduate';
}

/**
 * 教师详细信息
 */
export interface TeacherDetailInfo extends UserBasicInfo {
  type: 'teacher';
  teacherId: string;
  departmentName: string;
  title: string;
  degree: string;
  education: string;
}

/**
 * 用户权限信息
 */
export interface UserPermissions {
  canCheckin: boolean;
  canApplyLeave: boolean;
  canSubmitLeave: boolean;
  canApproveLeave: boolean;
  canViewAttendance: boolean;
  canExportData: boolean;
  canManageSystem: boolean;
}

/**
 * 用户服务接口
 * 提供用户相关的业务逻辑处理
 */
export interface IUserService {
  /**
   * 根据用户ID获取用户信息
   * @param userId 用户ID
   * @param userType 用户类型
   * @returns 用户信息
   */
  getUserInfo(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<UserInfo | null>>;

  /**
   * 获取用户基本信息
   * @param userId 用户ID
   * @param userType 用户类型
   * @returns 用户基本信息
   */
  getUserBasicInfo(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<UserBasicInfo | null>>;

  /**
   * 获取学生详细信息
   * @param studentId 学生ID
   * @returns 学生详细信息
   */
  getStudentDetailInfo(
    studentId: string
  ): Promise<ServiceResult<StudentDetailInfo | null>>;

  /**
   * 获取教师详细信息
   * @param teacherId 教师ID
   * @returns 教师详细信息
   */
  getTeacherDetailInfo(
    teacherId: string
  ): Promise<ServiceResult<TeacherDetailInfo | null>>;

  /**
   * 验证用户身份
   * @param userId 用户ID
   * @param userType 用户类型
   * @returns 验证结果
   */
  validateUser(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<{
    isValid: boolean;
    isActive: boolean;
    reason?: string;
  }>>;

  /**
   * 获取用户权限
   * @param userId 用户ID
   * @param userType 用户类型
   * @returns 用户权限信息
   */
  getUserPermissions(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<UserPermissions>>;

  /**
   * 检查用户是否有特定权限
   * @param userId 用户ID
   * @param userType 用户类型
   * @param permission 权限名称
   * @returns 是否有权限
   */
  hasPermission(
    userId: string,
    userType: UserType,
    permission: keyof UserPermissions
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取学生的课程列表
   * @param studentId 学生ID
   * @param semester 学期（可选）
   * @returns 课程列表
   */
  getStudentCourses(
    studentId: string,
    semester?: string
  ): Promise<ServiceResult<Array<{
    courseId: string;
    courseName: string;
    courseCode: string;
    teacherName: string;
    semester: string;
    classLocation?: string;
    schedules: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
      weeks: number[];
    }>;
  }>>>;

  /**
   * 获取教师的课程列表
   * @param teacherId 教师ID
   * @param semester 学期（可选）
   * @returns 课程列表
   */
  getTeacherCourses(
    teacherId: string,
    semester?: string
  ): Promise<ServiceResult<Array<{
    courseId: string;
    courseName: string;
    courseCode: string;
    semester: string;
    studentCount: number;
    classLocation?: string;
    schedules: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
      weeks: number[];
    }>;
  }>>>;

  /**
   * 检查学生是否选修了指定课程
   * @param studentId 学生ID
   * @param courseId 课程ID
   * @param semester 学期
   * @returns 是否选修
   */
  isStudentEnrolledInCourse(
    studentId: string,
    courseId: string,
    semester: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 检查教师是否授课指定课程
   * @param teacherId 教师ID
   * @param courseId 课程ID
   * @param semester 学期
   * @returns 是否授课
   */
  isTeacherAssignedToCourse(
    teacherId: string,
    courseId: string,
    semester: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取用户的联系信息
   * @param userId 用户ID
   * @param userType 用户类型
   * @returns 联系信息
   */
  getUserContactInfo(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<{
    userId: string;
    userName: string;
    email?: string;
    phone?: string;
    preferredContactMethod?: 'email' | 'phone' | 'both';
  } | null>>;

  /**
   * 更新用户联系信息
   * @param userId 用户ID
   * @param userType 用户类型
   * @param contactInfo 联系信息
   * @returns 更新结果
   */
  updateUserContactInfo(
    userId: string,
    userType: UserType,
    contactInfo: {
      email?: string;
      phone?: string;
      preferredContactMethod?: 'email' | 'phone' | 'both';
    }
  ): Promise<ServiceResult<boolean>>;

  /**
   * 搜索用户
   * @param keyword 关键词
   * @param userType 用户类型（可选）
   * @param limit 结果数量限制
   * @returns 用户列表
   */
  searchUsers(
    keyword: string,
    userType?: UserType,
    limit?: number
  ): Promise<ServiceResult<UserBasicInfo[]>>;

  /**
   * 获取班级学生列表
   * @param classCode 班级代码
   * @returns 学生列表
   */
  getClassStudents(
    classCode: string
  ): Promise<ServiceResult<StudentDetailInfo[]>>;

  /**
   * 获取部门教师列表
   * @param departmentCode 部门代码
   * @returns 教师列表
   */
  getDepartmentTeachers(
    departmentCode: string
  ): Promise<ServiceResult<TeacherDetailInfo[]>>;

  /**
   * 获取用户统计信息
   * @param userType 用户类型（可选）
   * @returns 统计信息
   */
  getUserStatistics(
    userType?: UserType
  ): Promise<ServiceResult<{
    totalUsers: number;
    activeUsers: number;
    studentCount?: number;
    teacherCount?: number;
    collegeDistribution?: Record<string, number>;
    departmentDistribution?: Record<string, number>;
    gradeDistribution?: Record<string, number>;
  }>>;

  /**
   * 批量获取用户基本信息
   * @param userIds 用户ID数组
   * @param userType 用户类型
   * @returns 用户基本信息列表
   */
  getBatchUserBasicInfo(
    userIds: string[],
    userType: UserType
  ): Promise<ServiceResult<UserBasicInfo[]>>;

  /**
   * 验证用户访问权限
   * @param userId 用户ID
   * @param userType 用户类型
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @returns 是否有访问权限
   */
  validateUserAccess(
    userId: string,
    userType: UserType,
    resourceType: 'course' | 'student' | 'attendance' | 'leave',
    resourceId: string
  ): Promise<ServiceResult<{
    hasAccess: boolean;
    reason?: string;
  }>>;

  /**
   * 获取用户的最近活动
   * @param userId 用户ID
   * @param userType 用户类型
   * @param limit 活动数量限制
   * @returns 最近活动列表
   */
  getUserRecentActivities(
    userId: string,
    userType: UserType,
    limit?: number
  ): Promise<ServiceResult<Array<{
    activityType: 'checkin' | 'leave_application' | 'leave_approval';
    activityTime: Date;
    description: string;
    relatedCourse?: string;
    relatedStudent?: string;
  }>>>;
}
