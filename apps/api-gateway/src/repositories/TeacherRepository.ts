/**
 * 教师信息Repository
 * 负责教师数据的查询操作
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { BaseRepository } from '@stratix/database';
import type {
  GatewayDatabase,
  NewTeacherInfo,
  TeacherInfo,
  TeacherInfoUpdate,
  TeacherSearchCriteria
} from '../types/database.js';

export interface ITeacherRepository {
  /**
   * 根据姓名查找教师
   */
  findByName(name: string): Promise<DatabaseResult<TeacherInfo[]>>;

  /**
   * 根据邮箱查找教师
   */
  findByEmail(email: string): Promise<DatabaseResult<TeacherInfo | null>>;

  /**
   * 根据手机号查找教师
   */
  findByPhone(phone: string): Promise<DatabaseResult<TeacherInfo | null>>;

  /**
   * 根据工号查找教师
   */
  findByEmployeeNumber(
    employeeNumber: string
  ): Promise<DatabaseResult<TeacherInfo | null>>;

  /**
   * 多条件匹配查找教师
   */
  findByMultipleFields(
    criteria: TeacherSearchCriteria
  ): Promise<DatabaseResult<TeacherInfo[]>>;
}

export default class TeacherRepository
  extends BaseRepository<
    GatewayDatabase,
    'out_jsxx',
    TeacherInfo,
    NewTeacherInfo,
    TeacherInfoUpdate
  >
  implements ITeacherRepository
{
  protected readonly tableName = 'out_jsxx' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
    this.logger.info('✅ TeacherRepository initialized');
  }

  /**
   * 根据姓名查找教师
   */
  async findByName(name: string): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!name) {
      throw new Error('Name cannot be empty');
    }

    this.logger.debug('Finding teachers by name', { name });

    return await this.findMany((qb: any) => qb.where('xm', '=', name));
  }

  /**
   * 根据邮箱查找教师
   */
  async findByEmail(
    email: string
  ): Promise<DatabaseResult<TeacherInfo | null>> {
    if (!email) {
      throw new Error('Email cannot be empty');
    }

    this.logger.debug('Finding teacher by email', { email });

    const result = await this.findOne((qb: any) =>
      qb.where('email', '=', email)
    );

    // 转换Option类型为T | null
    if (result.success) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }

    return result;
  }

  /**
   * 根据手机号查找教师
   */
  async findByPhone(
    phone: string
  ): Promise<DatabaseResult<TeacherInfo | null>> {
    if (!phone) {
      throw new Error('Phone cannot be empty');
    }

    this.logger.debug('Finding teacher by phone', { phone });

    const result = await this.findOne((qb: any) => qb.where('sjh', '=', phone));

    // 转换Option类型为T | null
    if (result.success) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }

    return result;
  }

  /**
   * 根据工号查找教师
   */
  async findByEmployeeNumber(
    employeeNumber: string
  ): Promise<DatabaseResult<TeacherInfo | null>> {
    if (!employeeNumber) {
      throw new Error('Employee number cannot be empty');
    }

    this.logger.debug('Finding teacher by employee number', {
      employeeNumber
    });

    const result = await this.findOne((qb: any) =>
      qb.where('gh', '=', employeeNumber)
    );

    // 转换Option类型为T | null
    if (result.success) {
      return {
        success: true,
        data: result.data.some ? result.data.value : null
      };
    }

    return result;
  }

  /**
   * 多条件匹配查找教师
   */
  async findByMultipleFields(
    criteria: TeacherSearchCriteria
  ): Promise<DatabaseResult<TeacherInfo[]>> {
    this.logger.debug('Finding teachers by multiple criteria', criteria);

    // 构建查询条件
    return await this.findMany((qb: any) => {
      let query = qb;

      if (criteria.name) {
        query = query.where('xm', '=', criteria.name);
      }
      if (criteria.email) {
        query = query.orWhere('email', '=', criteria.email);
      }
      if (criteria.phone) {
        query = query.orWhere('sjh', '=', criteria.phone);
      }
      if (criteria.employeeNumber) {
        query = query.orWhere('gh', '=', criteria.employeeNumber);
      }

      // 如果没有条件，返回空结果
      if (
        !criteria.name &&
        !criteria.email &&
        !criteria.phone &&
        !criteria.employeeNumber
      ) {
        query = query.where('id', '=', 'no-match'); // 确保没有结果
      }

      return query;
    });
  }
}
