/**
 * 用户认证服务
 * 负责用户身份验证和类型识别
 */

import type { Logger } from '@stratix/core';
import ContactRepository from 'src/repositories/ContactRepository.js';
import type { IcalinkContact } from '../types/database.js';
import type { AuthenticatedUser } from '../types/gateway.js';
import type { WPSUserInfo } from './WPSApiService.js';

/**
 * 扩展的认证用户信息（包含联系人信息）
 */
export interface ExtendedAuthenticatedUser extends AuthenticatedUser {
  /** 联系人完整信息 */
  contactInfo?: IcalinkContact;
}

/**
 * 用户匹配结果
 */
export interface UserMatchResult {
  /** 是否匹配成功 */
  matched: boolean;
  /** 匹配的用户信息 */
  user?: ExtendedAuthenticatedUser;
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
    private contactRepository: ContactRepository,
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

      // 通过 third_union_id（学号或工号）查找联系人
      const contact = await this.contactRepository.findByUserId(
        wpsUserInfo.third_union_id
      );

      if (!contact) {
        this.logger.warn(
          'No local user found for WPS user with third_union_id',
          {
            wpsOpenid: wpsUserInfo.openid,
            wpsNickname: wpsUserInfo.nickname,
            thirdUnionId: wpsUserInfo.third_union_id
          }
        );

        return {
          matched: false,
          matchType: 'none',
          error: `未找到与 third_union_id: ${wpsUserInfo.third_union_id} 匹配的用户`
        };
      }

      // 根据联系人信息构建认证用户
      const userMatch = this.buildAuthenticatedUserFromContact(contact);

      this.logger.info('User matched by third_union_id', {
        userId: userMatch.user?.id,
        userName: userMatch.user?.name,
        userType: userMatch.user?.userType,
        thirdUnionId: wpsUserInfo.third_union_id
      });

      return userMatch;
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
   * 根据联系人信息构建认证用户
   */
  private buildAuthenticatedUserFromContact(
    contact: IcalinkContact
  ): UserMatchResult {
    try {
      // 根据 role 字段确定用户类型
      const userType = contact.role === 'teacher' ? 'teacher' : 'student';

      const authenticatedUser: ExtendedAuthenticatedUser = {
        id: String(contact.id),
        name: contact.user_name,
        userType: userType,
        userNumber: contact.user_id, // 学号或工号
        collegeName: contact.school_name || undefined,
        majorName: contact.major_name || undefined,
        className: contact.class_name || undefined,
        contactInfo: contact
      };

      return {
        matched: true,
        user: authenticatedUser,
        matchType: 'exact',
        matchedFields: ['user_id']
      };
    } catch (error) {
      this.logger.error(
        'Failed to build authenticated user from contact:',
        error
      );
      return {
        matched: false,
        matchType: 'none',
        error: '构建用户信息时发生错误'
      };
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
      // 注意：ContactRepository 中的数据已经过滤了状态为 'add' 或 'update' 的用户
      // 如需更细粒度的状态检查，可以从原始表（out_xsxx 或 out_jsxx）查询

      return true;
    } catch (error) {
      this.logger.error('Failed to validate user access:', error);
      return false;
    }
  }
}
