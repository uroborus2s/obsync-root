/**
 * 学生信息Repository
 * 负责学生数据的查询操作
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { BaseRepository } from '@stratix/database';
import type {
  GatewayDatabase,
  NewStudentInfo,
  StudentInfo,
  StudentInfoUpdate,
  StudentSearchCriteria
} from '../types/database.js';

export interface IStudentRepository {
  /**
   * 根据姓名查找学生
   */
  findByName(name: string): Promise<DatabaseResult<StudentInfo[]>>;

  /**
   * 根据邮箱查找学生
   */
  findByEmail(email: string): Promise<DatabaseResult<StudentInfo | null>>;

  /**
   * 根据手机号查找学生
   */
  findByPhone(phone: string): Promise<DatabaseResult<StudentInfo | null>>;

  /**
   * 根据学号查找学生
   */
  findByStudentNumber(
    studentNumber: string
  ): Promise<DatabaseResult<StudentInfo | null>>;

  /**
   * 多条件匹配查找学生
   */
  findByMultipleFields(
    criteria: StudentSearchCriteria
  ): Promise<DatabaseResult<StudentInfo[]>>;
}

export default class StudentRepository
  extends BaseRepository<
    GatewayDatabase,
    'out_xsxx',
    StudentInfo,
    NewStudentInfo,
    StudentInfoUpdate
  >
  implements IStudentRepository
{
  protected readonly tableName = 'out_xsxx' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
    this.logger.info('✅ StudentRepository initialized');
  }

  /**
   * 根据姓名查找学生
   */
  async findByName(name: string): Promise<DatabaseResult<StudentInfo[]>> {
    if (!name) {
      throw new Error('Name cannot be empty');
    }

    this.logger.debug('Finding students by name', { name });

    return await this.findMany((qb: any) => qb.where('xm', '=', name));
  }

  /**
   * 根据邮箱查找学生
   */
  async findByEmail(
    email: string
  ): Promise<DatabaseResult<StudentInfo | null>> {
    if (!email) {
      throw new Error('Email cannot be empty');
    }

    this.logger.debug('Finding student by email', { email });

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
   * 根据手机号查找学生
   */
  async findByPhone(
    phone: string
  ): Promise<DatabaseResult<StudentInfo | null>> {
    if (!phone) {
      throw new Error('Phone cannot be empty');
    }

    this.logger.debug('Finding student by phone', { phone });

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
   * 根据学号查找学生
   */
  async findByStudentNumber(
    studentNumber: string
  ): Promise<DatabaseResult<StudentInfo | null>> {
    if (!studentNumber) {
      throw new Error('Student number cannot be empty');
    }

    this.logger.debug('Finding student by student number', { studentNumber });

    const result = await this.findOne((qb: any) =>
      qb.where('xh', '=', studentNumber)
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
   * 多条件匹配查找学生
   */
  async findByMultipleFields(
    criteria: StudentSearchCriteria
  ): Promise<DatabaseResult<StudentInfo[]>> {
    this.logger.debug('Finding students by multiple criteria', criteria);

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
      if (criteria.studentNumber) {
        query = query.orWhere('xh', '=', criteria.studentNumber);
      }

      // 如果没有条件，返回空结果
      if (
        !criteria.name &&
        !criteria.email &&
        !criteria.phone &&
        !criteria.studentNumber
      ) {
        query = query.where('id', '=', 'no-match'); // 确保没有结果
      }

      return query;
    });
  }
}
