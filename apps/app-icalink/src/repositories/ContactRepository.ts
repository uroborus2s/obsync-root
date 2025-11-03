import type { Logger } from '@stratix/core';
import { BaseRepository } from '@stratix/database';
import type { IcalinkContact, IcalinkDatabase } from '../types/database.js';

/**
 * 联系人仓储实现
 * 负责从 icalink_contacts 表查询统一的用户联系信息
 * 
 * @remarks
 * icalink_contacts 表基于 v_contacts 视图创建，统一了教师和学生的联系信息
 * - 教师数据来源：out_jsxx 表
 * - 学生数据来源：out_xsxx 表
 */
export default class ContactRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_contacts',
  IcalinkContact
> {
  protected readonly tableName = 'icalink_contacts';
  protected readonly primaryKey = 'id';

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ ContactRepository initialized');
  }

  /**
   * 根据用户ID查找联系人信息
   * 
   * @param userId - 用户ID（学号或工号）
   * @returns 联系人信息或 null
   */
  async findByUserId(userId: string): Promise<IcalinkContact | null> {
    try {
      const contacts = (await this.findMany((qb) =>
        qb.where('user_id', '=', userId)
      )) as IcalinkContact[];

      if (contacts.length === 0) {
        this.logger.debug('Contact not found', { userId });
        return null;
      }

      if (contacts.length > 1) {
        this.logger.warn('Multiple contacts found for user_id', {
          userId,
          count: contacts.length
        });
      }

      return contacts[0];
    } catch (error: any) {
      this.logger.error('Failed to find contact by user_id', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据角色查找联系人列表
   * 
   * @param role - 角色类型（'teacher' 或 'student'）
   * @returns 联系人列表
   */
  async findByRole(role: 'teacher' | 'student'): Promise<IcalinkContact[]> {
    try {
      return (await this.findMany((qb) =>
        qb.where('role', '=', role)
      )) as IcalinkContact[];
    } catch (error: any) {
      this.logger.error('Failed to find contacts by role', {
        role,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据学院ID查找联系人列表
   * 
   * @param schoolId - 学院ID
   * @returns 联系人列表
   */
  async findBySchoolId(schoolId: string): Promise<IcalinkContact[]> {
    try {
      return (await this.findMany((qb) =>
        qb.where('school_id', '=', schoolId)
      )) as IcalinkContact[];
    } catch (error: any) {
      this.logger.error('Failed to find contacts by school_id', {
        schoolId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据用户ID获取学院ID
   * 
   * @param userId - 用户ID（学号或工号）
   * @returns 学院ID或 null
   */
  async getSchoolIdByUserId(userId: string): Promise<string | null> {
    try {
      const contact = await this.findByUserId(userId);
      
      if (!contact) {
        this.logger.debug('Contact not found, cannot get school_id', { userId });
        return null;
      }

      if (!contact.school_id) {
        this.logger.debug('Contact found but school_id is null', {
          userId,
          role: contact.role
        });
        return null;
      }

      this.logger.debug('Found school_id for user', {
        userId,
        schoolId: contact.school_id,
        role: contact.role
      });

      return contact.school_id;
    } catch (error: any) {
      this.logger.error('Failed to get school_id by user_id', {
        userId,
        error: error.message
      });
      return null;
    }
  }
}

