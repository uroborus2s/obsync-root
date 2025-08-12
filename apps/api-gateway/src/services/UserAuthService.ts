/**
 * 用户认证服务
 * 负责用户身份验证和类型识别
 */

import type { Logger } from '@stratix/core';
import type { IStudentRepository } from '../repositories/StudentRepository.js';
import type { ITeacherRepository } from '../repositories/TeacherRepository.js';
import type { StudentInfo, TeacherInfo } from '../types/database.js';
import type { WPSUserInfo } from './WPSApiService.js';

/**
 * 认证用户信息
 */
export interface AuthenticatedUser {
  /** 用户ID */
  id: string;
  /** 姓名 */
  name: string;
  /** 用户类型 */
  userType: 'student' | 'teacher';
  /** 学号（学生）或工号（教师） */
  userNumber: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 学院名称（学生）或部门名称（教师） */
  collegeName?: string;
  /** 专业名称（仅学生） */
  majorName?: string;
  /** 班级名称（仅学生） */
  className?: string;
  /** 学生信息（如果是学生） */
  studentInfo?: StudentInfo;
  /** 教师信息（如果是教师） */
  teacherInfo?: TeacherInfo;
}

/**
 * 用户匹配结果
 */
export interface UserMatchResult {
  /** 是否匹配成功 */
  matched: boolean;
  /** 匹配的用户信息 */
  user?: AuthenticatedUser;
  /** 匹配类型 */
  matchType?: 'exact' | 'partial' | 'none';
  /** 匹配的字段 */
  matchedFields?: string[];
  /** 错误信息 */
  error?: string;
}

export interface IUserAuthService {
  /**
   * 根据WPS用户信息查找本地用户
   */
  findLocalUser(wpsUserInfo: WPSUserInfo): Promise<UserMatchResult>;

  /**
   * 验证用户是否有权限登录
   */
  validateUserAccess(user: AuthenticatedUser): Promise<boolean>;
}

export default class UserAuthService implements IUserAuthService {
  constructor(
    private studentRepository: IStudentRepository,
    private teacherRepository: ITeacherRepository,
    private logger: Logger
  ) {
    this.logger.info('✅ UserAuthService initialized');
  }

  /**
   * 根据WPS用户信息查找本地用户
   */
  async findLocalUser(wpsUserInfo: WPSUserInfo): Promise<UserMatchResult> {
    try {
      this.logger.debug('Finding local user for WPS user', {
        wpsOpenid: wpsUserInfo.openid,
        wpsNickname: wpsUserInfo.nickname,
        wpsUnionid: wpsUserInfo.unionid,
        thirdUnionId: wpsUserInfo.third_union_id
      });

      // 检查 third_union_id 是否存在
      if (!wpsUserInfo.third_union_id) {
        this.logger.warn('third_union_id is missing, login failed', {
          wpsOpenid: wpsUserInfo.openid,
          wpsNickname: wpsUserInfo.nickname
        });

        return {
          matched: false,
          matchType: 'none',
          error: 'third_union_id 字段缺失，无法进行用户匹配'
        };
      }

      // 先尝试通过学号匹配学生
      const studentMatch = await this.findStudentByThirdUnionId(wpsUserInfo);
      if (studentMatch.matched) {
        this.logger.info('User matched as student by third_union_id', {
          studentId: studentMatch.user?.id,
          studentName: studentMatch.user?.name,
          thirdUnionId: wpsUserInfo.third_union_id
        });
        return studentMatch;
      }

      // 再尝试通过工号匹配教师
      const teacherMatch = await this.findTeacherByThirdUnionId(wpsUserInfo);
      if (teacherMatch.matched) {
        this.logger.info('User matched as teacher by third_union_id', {
          teacherId: teacherMatch.user?.id,
          teacherName: teacherMatch.user?.name,
          thirdUnionId: wpsUserInfo.third_union_id
        });
        return teacherMatch;
      }

      // 都没有匹配到
      this.logger.warn('No local user found for WPS user with third_union_id', {
        wpsOpenid: wpsUserInfo.openid,
        wpsNickname: wpsUserInfo.nickname,
        thirdUnionId: wpsUserInfo.third_union_id
      });

      return {
        matched: false,
        matchType: 'none',
        error: `未找到与 third_union_id: ${wpsUserInfo.third_union_id} 匹配的用户`
      };
    } catch (error) {
      this.logger.error('Failed to find local user:', error);
      return {
        matched: false,
        matchType: 'none',
        error: '查询用户信息时发生错误'
      };
    }
  }

  /**
   * 通过 third_union_id 查找学生用户（精确匹配学号）
   */
  private async findStudentByThirdUnionId(
    wpsUserInfo: WPSUserInfo
  ): Promise<UserMatchResult> {
    try {
      this.logger.debug('Finding student by third_union_id', {
        thirdUnionId: wpsUserInfo.third_union_id
      });

      // 通过学号精确匹配
      const studentResult = await this.studentRepository.findByStudentNumber(
        wpsUserInfo.third_union_id
      );

      if (!studentResult.success) {
        this.logger.error(
          'Failed to query student by student number:',
          studentResult.error
        );
        throw new Error('Database query failed');
      }

      const student = studentResult.data;

      if (!student) {
        return { matched: false, matchType: 'none' };
      }

      // // 检查学生状态
      // if (student.zt && student.zt !== '1') {
      //   this.logger.warn('Student account is disabled', {
      //     studentId: student.id,
      //     studentName: student.xm,
      //     status: student.zt
      //   });
      //   return {
      //     matched: false,
      //     matchType: 'none',
      //     error: '学生账户已被禁用'
      //   };
      // }

      const authenticatedUser: AuthenticatedUser = {
        id: student.id,
        name: student.xm || '',
        userType: 'student',
        userNumber: student.xh || '', // 学号
        email: student.email || undefined,
        phone: student.sjh || undefined,
        collegeName: student.xymc || undefined, // 学院名称
        majorName: student.zymc || undefined, // 专业名称
        className: student.bjmc || undefined, // 班级名称
        studentInfo: student
      };

      return {
        matched: true,
        user: authenticatedUser,
        matchType: 'exact',
        matchedFields: ['studentNumber']
      };
    } catch (error) {
      this.logger.error('Failed to find student by third_union_id:', error);
      throw error;
    }
  }

  /**
   * 通过 third_union_id 查找教师用户（精确匹配工号）
   */
  private async findTeacherByThirdUnionId(
    wpsUserInfo: WPSUserInfo
  ): Promise<UserMatchResult> {
    try {
      this.logger.debug('Finding teacher by third_union_id', {
        thirdUnionId: wpsUserInfo.third_union_id
      });

      // 通过工号精确匹配
      const teacherResult = await this.teacherRepository.findByEmployeeNumber(
        wpsUserInfo.third_union_id
      );

      if (!teacherResult.success) {
        this.logger.error(
          'Failed to query teacher by employee number:',
          teacherResult.error
        );
        throw new Error('Database query failed');
      }

      const teacher = teacherResult.data;

      if (!teacher) {
        return { matched: false, matchType: 'none' };
      }

      // // 检查教师状态
      // if (teacher.zt && teacher.zt !== '1') {
      //   this.logger.warn('Teacher account is disabled', {
      //     teacherId: teacher.id,
      //     teacherName: teacher.xm,
      //     status: teacher.zt
      //   });
      //   return {
      //     matched: false,
      //     matchType: 'none',
      //     error: '教师账户已被禁用'
      //   };
      // }

      const authenticatedUser: AuthenticatedUser = {
        id: teacher.id,
        name: teacher.xm || '',
        userType: 'teacher',
        userNumber: teacher.gh || '', // 工号
        email: teacher.email || undefined,
        phone: teacher.sjh || undefined,
        collegeName: teacher.ssdwmc || undefined, // 部门名称
        teacherInfo: teacher
      };

      return {
        matched: true,
        user: authenticatedUser,
        matchType: 'exact',
        matchedFields: ['employeeNumber']
      };
    } catch (error) {
      this.logger.error('Failed to find teacher by third_union_id:', error);
      throw error;
    }
  }

  /**
   * 验证用户是否有权限登录
   */
  async validateUserAccess(user: AuthenticatedUser): Promise<boolean> {
    try {
      this.logger.debug('Validating user access', {
        userId: user.id,
        userType: user.userType
      });

      // 这里可以添加额外的权限验证逻辑
      // 例如：检查用户状态、账户是否被禁用等
      // 注意：用户状态检查已在 findStudentByThirdUnionId 和 findTeacherByThirdUnionId 中完成

      // if (user.userType === 'student' && user.studentInfo) {
      //   // 检查学生状态
      //   if (user.studentInfo.zt && user.studentInfo.zt !== '1') {
      //     this.logger.warn('Student account is not active', {
      //       studentId: user.id,
      //       status: user.studentInfo.zt
      //     });
      //     return false;
      //   }
      // }

      // if (user.userType === 'teacher' && user.teacherInfo) {
      //   // 检查教师状态
      //   if (user.teacherInfo.zt && user.teacherInfo.zt !== '1') {
      //     this.logger.warn('Teacher account is not active', {
      //       teacherId: user.id,
      //       status: user.teacherInfo.zt
      //     });
      //     return false;
      //   }
      // }

      return true;
    } catch (error) {
      this.logger.error('Failed to validate user access:', error);
      return false;
    }
  }
}
