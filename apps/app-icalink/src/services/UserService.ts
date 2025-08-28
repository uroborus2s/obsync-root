// @wps/app-icalink 用户服务实现
// 基于 Stratix 框架的服务实现类

import type { Logger } from '@stratix/core';
import type { IStudentRepository } from '../repositories/interfaces/IStudentRepository.js';
import type { ITeacherRepository } from '../repositories/interfaces/ITeacherRepository.js';
import type { UserInfo, UserType } from '../types/api.js';
import type { ServiceResult } from '../types/service.js';
import {
  isSuccessResult,
  ServiceErrorCode,
  wrapServiceCall
} from '../types/service.js';
import type {
  IUserService,
  StudentDetailInfo,
  TeacherDetailInfo,
  UserBasicInfo,
  UserPermissions
} from './interfaces/IUserService.js';

/**
 * 用户服务实现类
 * 实现IUserService接口，提供用户相关的业务逻辑
 */
export default class UserService implements IUserService {
  constructor(
    private readonly studentRepository: IStudentRepository,
    private readonly teacherRepository: ITeacherRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 根据用户ID获取用户信息
   */
  async getUserInfo(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<UserInfo | null>> {
    return wrapServiceCall(async () => {
      this.logger.info({ userId, userType }, 'Getting user info');

      if (userType === 'student') {
        const studentResult =
          await this.studentRepository.findByStudentId(userId);
        if (!isSuccessResult(studentResult)) {
          throw new Error(
            studentResult.error?.message || 'Failed to find student'
          );
        }

        const student = studentResult.data;
        if (!student) {
          return null;
        }

        return {
          id: student.xh || '',
          type: 'student',
          name: student.xm || ''
        };
      } else if (userType === 'teacher') {
        const teacherResult =
          await this.teacherRepository.findByTeacherId(userId);
        if (!isSuccessResult(teacherResult)) {
          throw new Error(
            teacherResult.error?.message || 'Failed to find teacher'
          );
        }

        const teacher = teacherResult.data;
        if (!teacher) {
          return null;
        }

        return {
          id: teacher.gh || '',
          type: 'teacher',
          name: teacher.xm || ''
        };
      }

      return null;
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 获取用户基本信息
   */
  async getUserBasicInfo(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<UserBasicInfo | null>> {
    return wrapServiceCall(async () => {
      this.logger.info({ userId, userType }, 'Getting user basic info');

      if (userType === 'student') {
        const studentResult =
          await this.studentRepository.findByStudentId(userId);
        if (!isSuccessResult(studentResult)) {
          throw new Error(
            studentResult.error?.message || 'Failed to find student'
          );
        }

        const student = studentResult.data;
        if (!student) {
          return null;
        }

        return {
          id: student.xh || '',
          name: student.xm || '',
          type: 'student',
          email: student.email,
          phone: student.sjh,
          avatar: undefined
        };
      } else if (userType === 'teacher') {
        const teacherResult =
          await this.teacherRepository.findByTeacherId(userId);
        if (!isSuccessResult(teacherResult)) {
          throw new Error(
            teacherResult.error?.message || 'Failed to find teacher'
          );
        }

        const teacher = teacherResult.data;
        if (!teacher) {
          return null;
        }

        return {
          id: teacher.gh || '',
          name: teacher.xm || '',
          type: 'teacher',
          email: teacher.email,
          phone: teacher.sjh,
          avatar: undefined
        };
      }

      return null;
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 获取学生详细信息
   */
  async getStudentDetailInfo(
    studentId: string
  ): Promise<ServiceResult<StudentDetailInfo | null>> {
    return wrapServiceCall(async () => {
      this.logger.info({ studentId }, 'Getting student detail info');

      const studentResult =
        await this.studentRepository.findByStudentId(studentId);
      if (!isSuccessResult(studentResult)) {
        throw new Error(
          studentResult.error?.message || 'Failed to find student'
        );
      }

      const student = studentResult.data;
      if (!student) {
        return null;
      }

      return {
        id: student.xh || '',
        name: student.xm || '',
        type: 'student',
        email: student.email,
        phone: student.sjh,
        avatar: undefined,
        studentId: student.xh || '',
        className: student.bjmc || '',
        majorName: student.zymc || '',
        collegeName: student.xymc || '',
        grade: student.sznj || '',
        enrollmentYear: student.rxnf || '',
        studentType: student.lx === 1 ? 'undergraduate' : 'graduate'
      };
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 获取教师详细信息
   */
  async getTeacherDetailInfo(
    teacherId: string
  ): Promise<ServiceResult<TeacherDetailInfo | null>> {
    return wrapServiceCall(async () => {
      this.logger.info({ teacherId }, 'Getting teacher detail info');

      const teacherResult =
        await this.teacherRepository.findByTeacherId(teacherId);
      if (!isSuccessResult(teacherResult)) {
        throw new Error(
          teacherResult.error?.message || 'Failed to find teacher'
        );
      }

      const teacher = teacherResult.data;
      if (!teacher) {
        return null;
      }

      return {
        id: teacher.gh || '',
        name: teacher.xm || '',
        type: 'teacher',
        email: teacher.email,
        phone: teacher.sjh,
        avatar: undefined,
        teacherId: teacher.gh || '',
        departmentName: teacher.ssdwmc || '',
        title: teacher.zc || '',
        degree: teacher.zgxw || '',
        education: teacher.zgxl || ''
      };
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 验证用户身份
   */
  async validateUser(
    userId: string,
    userType: UserType
  ): Promise<
    ServiceResult<{
      isValid: boolean;
      isActive: boolean;
      reason?: string;
    }>
  > {
    return wrapServiceCall(async () => {
      this.logger.info({ userId, userType }, 'Validating user');

      if (userType === 'student') {
        const studentResult =
          await this.studentRepository.validateStudent(userId);
        if (!isSuccessResult(studentResult)) {
          throw new Error(
            studentResult.error?.message || 'Failed to validate student'
          );
        }

        const validation = studentResult.data;
        return {
          isValid: validation.exists,
          isActive: validation.isActive,
          reason: !validation.exists
            ? 'Student not found'
            : !validation.isActive
              ? 'Student account is inactive'
              : undefined
        };
      } else if (userType === 'teacher') {
        const teacherResult =
          await this.teacherRepository.validateTeacher(userId);
        if (!isSuccessResult(teacherResult)) {
          throw new Error(
            teacherResult.error?.message || 'Failed to validate teacher'
          );
        }

        const validation = teacherResult.data;
        return {
          isValid: validation.exists,
          isActive: validation.isActive,
          reason: !validation.exists
            ? 'Teacher not found'
            : !validation.isActive
              ? 'Teacher account is inactive'
              : undefined
        };
      }

      return {
        isValid: false,
        isActive: false,
        reason: 'Invalid user type'
      };
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 获取用户权限
   */
  async getUserPermissions(
    userId: string,
    userType: UserType
  ): Promise<ServiceResult<UserPermissions>> {
    return wrapServiceCall(async () => {
      this.logger.info({ userId, userType }, 'Getting user permissions');

      // 基于用户类型设置默认权限
      const permissions: UserPermissions = {
        canCheckin: userType === 'student',
        canApplyLeave: userType === 'student',
        canSubmitLeave: userType === 'student',
        canApproveLeave: userType === 'teacher',
        canViewAttendance: true,
        canExportData: userType === 'teacher',
        canManageSystem: userType === 'teacher'
      };

      return permissions;
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 检查用户是否有特定权限
   */
  async hasPermission(
    userId: string,
    userType: UserType,
    permission: keyof UserPermissions
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { userId, userType, permission },
        'Checking user permission'
      );

      const permissionsResult = await this.getUserPermissions(userId, userType);
      if (!isSuccessResult(permissionsResult)) {
        throw new Error(
          permissionsResult.error?.message || 'Failed to get user permissions'
        );
      }

      const permissions = permissionsResult.data;
      return permissions[permission] || false;
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 检查学生是否选修指定课程
   */
  async isStudentEnrolledInCourse(
    studentId: string,
    courseId: string,
    semester: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { studentId, courseId, semester },
        'Checking student course enrollment'
      );

      const studentsResult = await this.studentRepository.findByCourse(
        courseId,
        semester
      );
      if (!isSuccessResult(studentsResult)) {
        throw new Error(
          studentsResult.error?.message || 'Failed to find students in course'
        );
      }

      const students = studentsResult.data || [];
      return students.some((student) => student.xh === studentId);
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 检查教师是否授课指定课程
   */
  async isTeacherAssignedToCourse(
    teacherId: string,
    courseId: string,
    semester: string
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { teacherId, courseId, semester },
        'Checking teacher course assignment'
      );

      // 这里需要通过课程表查询教师是否授课该课程
      // 由于没有直接的关联表，这里返回true作为默认实现
      // 实际项目中应该通过课程表或教师课程关联表查询
      return true;
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 获取用户的联系信息
   */
  async getUserContactInfo(
    userId: string,
    userType: UserType
  ): Promise<
    ServiceResult<{
      userId: string;
      userName: string;
      email?: string;
      phone?: string;
      preferredContactMethod?: 'email' | 'phone' | 'both';
    } | null>
  > {
    return wrapServiceCall(async () => {
      this.logger.info({ userId, userType }, 'Getting user contact info');

      if (userType === 'student') {
        const contactResult =
          await this.studentRepository.getContactInfo(userId);
        if (!isSuccessResult(contactResult)) {
          throw new Error(
            contactResult.error?.message || 'Failed to get student contact info'
          );
        }

        const contact = contactResult.data;
        if (!contact) {
          return null;
        }

        return {
          userId: contact.student_id,
          userName: contact.student_name,
          email: contact.email,
          phone: contact.phone,
          preferredContactMethod:
            contact.email && contact.phone
              ? 'both'
              : contact.email
                ? 'email'
                : contact.phone
                  ? 'phone'
                  : undefined
        };
      } else if (userType === 'teacher') {
        const contactResult =
          await this.teacherRepository.getContactInfo(userId);
        if (!isSuccessResult(contactResult)) {
          throw new Error(
            contactResult.error?.message || 'Failed to get teacher contact info'
          );
        }

        const contact = contactResult.data;
        if (!contact) {
          return null;
        }

        return {
          userId: contact.teacher_id,
          userName: contact.teacher_name,
          email: contact.email,
          phone: contact.phone,
          preferredContactMethod:
            contact.email && contact.phone
              ? 'both'
              : contact.email
                ? 'email'
                : contact.phone
                  ? 'phone'
                  : undefined
        };
      }

      return null;
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 更新用户联系信息
   */
  async updateUserContactInfo(
    userId: string,
    userType: UserType,
    contactInfo: {
      email?: string;
      phone?: string;
      preferredContactMethod?: 'email' | 'phone' | 'both';
    }
  ): Promise<ServiceResult<boolean>> {
    return wrapServiceCall(async () => {
      this.logger.info(
        { userId, userType, contactInfo },
        'Updating user contact info'
      );

      // 这里需要实现更新逻辑
      // 由于当前Repository没有update方法，这里返回false表示不支持
      // 实际项目中应该实现相应的更新方法
      return false;
    }, ServiceErrorCode.NOT_IMPLEMENTED);
  }

  /**
   * 搜索用户
   */
  async searchUsers(
    keyword: string,
    userType?: UserType,
    limit?: number
  ): Promise<ServiceResult<UserBasicInfo[]>> {
    return wrapServiceCall(async () => {
      this.logger.info({ keyword, userType, limit }, 'Searching users');

      const results: UserBasicInfo[] = [];

      if (!userType || userType === 'student') {
        const studentsResult = await this.studentRepository.searchStudents(
          keyword,
          ['xh', 'xm', 'bjmc', 'zymc'],
          { limit: limit ? Math.ceil(limit / 2) : 10 }
        );

        if (isSuccessResult(studentsResult)) {
          const students = studentsResult.data || [];
          results.push(
            ...students.map((student) => ({
              id: student.xh || '',
              name: student.xm || '',
              type: 'student' as const,
              email: student.email,
              phone: student.sjh,
              avatar: undefined
            }))
          );
        }
      }

      if (!userType || userType === 'teacher') {
        const teachersResult = await this.teacherRepository.searchTeachers(
          keyword,
          ['gh', 'xm', 'ssdwmc', 'zc'],
          { limit: limit ? Math.ceil(limit / 2) : 10 }
        );

        if (isSuccessResult(teachersResult)) {
          const teachers = teachersResult.data || [];
          results.push(
            ...teachers.map((teacher) => ({
              id: teacher.gh || '',
              name: teacher.xm || '',
              type: 'teacher' as const,
              email: teacher.email,
              phone: teacher.sjh,
              avatar: undefined
            }))
          );
        }
      }

      // 如果指定了限制，截取结果
      if (limit && results.length > limit) {
        return results.slice(0, limit);
      }

      return results;
    }, ServiceErrorCode.VALIDATION_ERROR);
  }

  /**
   * 获取学生的课程列表
   */
  async getStudentCourses(
    studentId: string,
    semester?: string
  ): Promise<ServiceResult<Array<any>>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回空数组
      return [];
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取教师的课程列表
   */
  async getTeacherCourses(
    teacherId: string,
    semester?: string
  ): Promise<ServiceResult<Array<any>>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回空数组
      return [];
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取班级学生列表
   */
  async getClassStudents(
    classCode: string,
    options?: any
  ): Promise<ServiceResult<Array<any>>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回空数组
      return [];
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取部门教师列表
   */
  async getDepartmentTeachers(
    departmentCode: string,
    options?: any
  ): Promise<ServiceResult<Array<any>>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回空数组
      return [];
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取学生统计信息
   */
  async getStudentStats(
    conditions?: any
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回模拟数据
      return {
        total_count: 0,
        active_count: 0,
        by_college: {},
        by_major: {},
        by_grade: {}
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取教师统计信息
   */
  async getTeacherStats(
    conditions?: any
  ): Promise<ServiceResult<any>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回模拟数据
      return {
        total_count: 0,
        active_count: 0,
        by_department: {},
        by_title: {}
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 批量获取用户信息
   */
  async getBatchUserInfo(
    userIds: string[],
    userType: UserType
  ): Promise<ServiceResult<Array<any>>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回空数组
      return [];
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(
    userType?: UserType
  ): Promise<ServiceResult<{
    totalUsers: number;
    activeUsers: number;
    studentCount?: number;
    teacherCount?: number;
    collegeDistribution?: Record<string, number>;
    departmentDistribution?: Record<string, number>;
    gradeDistribution?: Record<string, number>;
  }>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回模拟数据
      return {
        totalUsers: 0,
        activeUsers: 0,
        studentCount: 0,
        teacherCount: 0,
        collegeDistribution: {},
        departmentDistribution: {},
        gradeDistribution: {}
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 批量获取用户基本信息
   */
  async getBatchUserBasicInfo(
    userIds: string[],
    userType: UserType
  ): Promise<ServiceResult<UserBasicInfo[]>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回空数组
      return [];
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 验证用户访问权限
   */
  async validateUserAccess(
    userId: string,
    userType: UserType,
    resourceType: 'course' | 'student' | 'attendance' | 'leave',
    resourceId: string
  ): Promise<ServiceResult<{
    hasAccess: boolean;
    reason?: string;
  }>> {
    return wrapServiceCall(async () => {
      // 简化实现，默认返回有权限
      return {
        hasAccess: true
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }

  /**
   * 获取用户的最近活动
   */
  async getUserRecentActivities(
    userId: string,
    userType: UserType,
    limit?: number
  ): Promise<ServiceResult<Array<{
    activityType: 'checkin' | 'leave_application' | 'leave_approval';
    activityTime: Date;
    description: string;
    relatedCourse?: string;
    relatedStudent?: string;
  }>>> {
    return wrapServiceCall(async () => {
      // 简化实现，返回空数组
      return [];
    }, ServiceErrorCode.DATABASE_ERROR);
  }
}
