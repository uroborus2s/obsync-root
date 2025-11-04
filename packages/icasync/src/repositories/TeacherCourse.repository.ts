/**
 * 教师课程关联仓储
 *
 * 功能：
 * 1. 访问现有的 out_jw_kcb_js 表
 * 2. 根据工号查询教师课程关联
 * 3. 根据开课号查询教师课程关联
 * 4. 支持按学年学期过滤
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import {
  isRight,
  isLeft,
  eitherMap as map,
  eitherRight as right,
  eitherLeft as left
} from '@stratix/utils/functional';
import { QueryError } from '@stratix/database';
import type {
  NewTeacherCourse,
  TeacherCourse,
  TeacherCourseUpdate
} from '../types/database.js';
import {
  BaseIcasyncRepository,
  fromOption
} from './base/BaseIcasyncRepository.js';

/**
 * 教师课程关联仓储接口
 */
export interface ITeacherCourseRepository {
  /**
   * 根据工号查找教师课程关联
   */
  findByGh(gh: string): Promise<DatabaseResult<TeacherCourse[]>>;

  /**
   * 根据开课号查找教师课程关联
   */
  findByKkh(kkh: string): Promise<DatabaseResult<TeacherCourse[]>>;

  /**
   * 根据学年学期查找教师课程关联
   */
  findByXnxq(xnxq: string): Promise<DatabaseResult<TeacherCourse[]>>;

  /**
   * 根据工号和学年学期查找教师课程关联
   */
  findByGhAndXnxq(
    gh: string,
    xnxq: string
  ): Promise<DatabaseResult<TeacherCourse[]>>;

  /**
   * 根据开课号和学年学期查找教师课程关联
   */
  findByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<TeacherCourse[]>>;

  /**
   * 检查教师是否有指定课程的权限
   */
  checkTeacherCoursePermission(
    gh: string,
    kkh: string,
    xnxq?: string
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 获取教师的所有课程号列表
   */
  getTeacherCourseNumbers(
    gh: string,
    xnxq?: string
  ): Promise<DatabaseResult<string[]>>;
}

/**
 * 教师课程关联仓储实现
 * 访问现有的 out_jw_kcb_js 表
 */
export default class TeacherCourseRepository
  extends BaseIcasyncRepository<
    'out_jw_kcb_js',
    TeacherCourse,
    NewTeacherCourse,
    TeacherCourseUpdate
  >
  implements ITeacherCourseRepository
{
  protected readonly tableName = 'out_jw_kcb_js' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super('syncdb');
  }

  /**
   * 根据工号查找教师课程关联
   */
  async findByGh(gh: string): Promise<DatabaseResult<TeacherCourse[]>> {
    if (!gh) {
      throw new Error('Teacher number cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('gh', '=', gh).where('zt', '!=', 'delete').orderBy('kkh', 'asc')
    );
  }

  /**
   * 根据开课号查找教师课程关联
   */
  async findByKkh(kkh: string): Promise<DatabaseResult<TeacherCourse[]>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('kkh', '=', kkh).orderBy('gh', 'asc')
    );
  }

  /**
   * 根据学年学期查找教师课程关联
   */
  async findByXnxq(xnxq: string): Promise<DatabaseResult<TeacherCourse[]>> {
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('xnxq', '=', xnxq).orderBy('gh', 'asc')
    );
  }

  /**
   * 根据工号和学年学期查找教师课程关联
   */
  async findByGhAndXnxq(
    gh: string,
    xnxq: string
  ): Promise<DatabaseResult<TeacherCourse[]>> {
    if (!gh) {
      throw new Error('Teacher number cannot be empty');
    }
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb
        .where('gh', '=', gh)
        .where('xnxq', '=', xnxq)
        .where('zt', '!=', 'delete')
        .orderBy('kkh', 'asc')
    );
  }

  /**
   * 根据开课号和学年学期查找教师课程关联
   */
  async findByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<TeacherCourse[]>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('kkh', '=', kkh).where('xnxq', '=', xnxq).orderBy('gh', 'asc')
    );
  }

  /**
   * 检查教师是否有指定课程的权限
   */
  async checkTeacherCoursePermission(
    gh: string,
    kkh: string,
    xnxq?: string
  ): Promise<DatabaseResult<boolean>> {
    if (!gh) {
      throw new Error('Teacher number cannot be empty');
    }
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }

    const result = await this.findOneNullable((qb: any) => {
      let query = qb.where('gh', '=', gh).where('kkh', '=', kkh);
      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }
      return query;
    });

    if (isLeft(result)) {
      return left(result.left
      );
    }

    return right(result.right !== null
    );
  }

  /**
   * 获取教师的所有课程号列表
   */
  async getTeacherCourseNumbers(
    gh: string,
    xnxq?: string
  ): Promise<DatabaseResult<string[]>> {
    if (!gh) {
      throw new Error('Teacher number cannot be empty');
    }

    try {
      const result = await this.rightbaseApi.executeQuery(
        async (db: any) => {
          let query = db
            .selectFrom('out_jw_kcb_js')
            .select('kkh')
            .distinct()
            .where('gh', '=', gh)
            .where('kkh', 'is not', null)
            .where('zt', '!=', 'delete');

          if (xnxq) {
            query = query.where('xnxq', '=', xnxq);
          }

          const records = await query.execute();
          return records.map((record: any) => record.kkh).filter(Boolean);
        },
        { readonly: true, connectionName: 'syncdb' }
      );

      if (isLeft(result)) {
        this.logger.left('Failed to get teacher course numbers', {
          gh,
          xnxq,
          error: result.left
        });
        return left(result.left
        );
      }

      this.logger.debug('Successfully retrieved teacher course numbers', {
        gh,
        xnxq,
        courseCount: result.right.length
      });

      return right(result.right
      );
    } catch (error) {
      this.logger.left('Error getting teacher course numbers', {
        gh,
        xnxq,
        error
      });
      return left(QueryError.create(
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }

  /**
   * 验证开课号格式
   */
  protected validateKkh(kkh: string): void {
    if (!kkh || kkh.trim().length === 0) {
      throw new Error('Course number cannot be empty');
    }
  }
}

// 框架会自动发现和注册此仓储类
// 使用 SCOPED 生命周期，文件名符合 repositories/**/*.ts 模式
