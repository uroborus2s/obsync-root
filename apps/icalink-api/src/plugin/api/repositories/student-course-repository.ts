/**
 * 学生课表Repository
 * 专门管理out_jw_kcb_xs表的CRUD操作
 */

import { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, StudentCourseEntity } from './types.js';

/**
 * 学生课表Repository实现
 */
export class StudentCourseRepository extends BaseRepository {
  constructor(db: Kysely<ExtendedDatabase>, log: Logger) {
    super(db, log);
  }

  /**
   * 根据开课号查询学生列表
   */
  async findStudentsByKkh(kkh: string): Promise<StudentCourseEntity[]> {
    try {
      const results = await this.db
        .selectFrom('out_jw_kcb_xs')
        .selectAll()
        .where('kkh', '=', kkh)
        .execute();

      this.logOperation('根据开课号查询学生', { kkh, count: results.length });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据开课号查询学生', error, { kkh });
    }
  }

  /**
   * 根据学号查询课表
   */
  async findCoursesByXh(
    xh: string,
    xnxq?: string
  ): Promise<StudentCourseEntity[]> {
    try {
      let query = this.db
        .selectFrom('out_jw_kcb_xs')
        .selectAll()
        .where('xh', '=', xh);

      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      const results = await query.execute();

      this.logOperation('根据学号查询课表', {
        xh,
        xnxq,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据学号查询课表', error, { xh, xnxq });
    }
  }

  /**
   * 根据学年学期查询学生课表
   */
  async findByXnxq(xnxq: string): Promise<StudentCourseEntity[]> {
    try {
      const results = await this.db
        .selectFrom('out_jw_kcb_xs')
        .selectAll()
        .where('xnxq', '=', xnxq)
        .execute();

      this.logOperation('根据学年学期查询学生课表', {
        xnxq,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据学年学期查询学生课表', error, { xnxq });
    }
  }

  /**
   * 根据开课号和学年学期查询学生列表
   */
  async findStudentsByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<StudentCourseEntity[]> {
    try {
      const results = await this.db
        .selectFrom('out_jw_kcb_xs')
        .selectAll()
        .where('kkh', '=', kkh)
        .where('xnxq', '=', xnxq)
        .execute();

      this.logOperation('根据开课号和学年学期查询学生', {
        kkh,
        xnxq,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据开课号和学年学期查询学生', error, {
        kkh,
        xnxq
      });
    }
  }

  /**
   * 根据课程编号查询学生课表
   */
  async findByKcbh(
    kcbh: string,
    xnxq?: string
  ): Promise<StudentCourseEntity[]> {
    try {
      let query = this.db
        .selectFrom('out_jw_kcb_xs')
        .selectAll()
        .where('kcbh', '=', kcbh);

      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      const results = await query.execute();

      this.logOperation('根据课程编号查询学生课表', {
        kcbh,
        xnxq,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据课程编号查询学生课表', error, {
        kcbh,
        xnxq
      });
    }
  }

  /**
   * 根据班级查询学生课表
   */
  async findByClass(
    bjdm: string,
    xnxq?: string
  ): Promise<StudentCourseEntity[]> {
    try {
      // 需要关联学生信息表来获取班级信息
      let query = this.db
        .selectFrom('out_jw_kcb_xs')
        .innerJoin('out_xsxx', 'out_jw_kcb_xs.xh', 'out_xsxx.xh')
        .selectAll('out_jw_kcb_xs')
        .where('out_xsxx.bjdm', '=', bjdm);

      if (xnxq) {
        query = query.where('out_jw_kcb_xs.xnxq', '=', xnxq);
      }

      const results = await query.execute();

      this.logOperation('根据班级查询学生课表', {
        bjdm,
        xnxq,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据班级查询学生课表', error, { bjdm, xnxq });
    }
  }

  /**
   * 获取学生课表统计信息
   */
  async getStudentCourseStats(xnxq: string): Promise<{
    totalStudents: number;
    totalCourses: number;
    totalRecords: number;
  }> {
    try {
      const results = await this.db
        .selectFrom('out_jw_kcb_xs')
        .select([
          this.db.fn.count('xh').as('totalStudents'),
          this.db.fn.count('kkh').as('totalCourses'),
          this.db.fn.count('xh').as('totalRecords')
        ])
        .where('xnxq', '=', xnxq)
        .executeTakeFirst();

      const stats = {
        totalStudents: Number(results?.totalStudents || 0),
        totalCourses: Number(results?.totalCourses || 0),
        totalRecords: Number(results?.totalRecords || 0)
      };

      this.logOperation('获取学生课表统计', { xnxq, stats });
      return stats;
    } catch (error) {
      this.handleDatabaseError('获取学生课表统计', error, { xnxq });
    }
  }

  /**
   * 根据条件查询学生课表
   */
  async findByConditions(conditions: {
    kkh?: string;
    xh?: string;
    xnxq?: string;
    kcbh?: string;
    pyfadm?: string;
    zt?: string;
  }): Promise<StudentCourseEntity[]> {
    try {
      let query = this.db.selectFrom('out_jw_kcb_xs').selectAll();

      if (conditions.kkh) {
        query = query.where('kkh', '=', conditions.kkh);
      }

      if (conditions.xh) {
        query = query.where('xh', '=', conditions.xh);
      }

      if (conditions.xnxq) {
        query = query.where('xnxq', '=', conditions.xnxq);
      }

      if (conditions.kcbh) {
        query = query.where('kcbh', '=', conditions.kcbh);
      }

      if (conditions.pyfadm) {
        query = query.where('pyfadm', '=', conditions.pyfadm);
      }

      if (conditions.zt) {
        query = query.where('zt', '=', conditions.zt);
      }

      const results = await query.execute();

      this.logOperation('条件查询学生课表', {
        conditions,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('条件查询学生课表', error, { conditions });
    }
  }

  /**
   * 获取课程的学生数量
   */
  async getStudentCountByKkh(kkh: string): Promise<number> {
    try {
      const result = await this.db
        .selectFrom('out_jw_kcb_xs')
        .select(this.db.fn.count('xh').as('count'))
        .where('kkh', '=', kkh)
        .executeTakeFirst();

      const count = Number(result?.count || 0);

      this.logOperation('获取课程学生数量', { kkh, count });
      return count;
    } catch (error) {
      this.handleDatabaseError('获取课程学生数量', error, { kkh });
    }
  }

  /**
   * 获取学生的课程数量
   */
  async getCourseCountByXh(xh: string, xnxq?: string): Promise<number> {
    try {
      let query = this.db
        .selectFrom('out_jw_kcb_xs')
        .select(this.db.fn.count('kkh').as('count'))
        .where('xh', '=', xh);

      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      const result = await query.executeTakeFirst();
      const count = Number(result?.count || 0);

      this.logOperation('获取学生课程数量', { xh, xnxq, count });
      return count;
    } catch (error) {
      this.handleDatabaseError('获取学生课程数量', error, { xh, xnxq });
    }
  }

  /**
   * 批量查询多个开课号的学生列表
   */
  async findStudentsByKkhs(kkhs: string[]): Promise<StudentCourseEntity[]> {
    try {
      if (kkhs.length === 0) {
        return [];
      }

      const results = await this.db
        .selectFrom('out_jw_kcb_xs')
        .selectAll()
        .where('kkh', 'in', kkhs)
        .execute();

      this.logOperation('批量查询开课号学生', {
        kkhCount: kkhs.length,
        studentCount: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('批量查询开课号学生', error, {
        kkhCount: kkhs.length
      });
    }
  }

  /**
   * 获取学生课表详情（关联学生信息）
   */
  async findStudentCourseDetails(conditions: {
    kkh?: string;
    xh?: string;
    xnxq?: string;
  }): Promise<
    Array<
      StudentCourseEntity & {
        xm?: string | null;
        bjmc?: string | null;
        xymc?: string | null;
      }
    >
  > {
    try {
      let query = this.db
        .selectFrom('out_jw_kcb_xs')
        .leftJoin('out_xsxx', 'out_jw_kcb_xs.xh', 'out_xsxx.xh')
        .select([
          'out_jw_kcb_xs.kkh',
          'out_jw_kcb_xs.xh',
          'out_jw_kcb_xs.xnxq',
          'out_jw_kcb_xs.kcbh',
          'out_jw_kcb_xs.pyfadm',
          'out_jw_kcb_xs.xsyd',
          'out_jw_kcb_xs.xgxklbdm',
          'out_jw_kcb_xs.sj',
          'out_jw_kcb_xs.zt',
          'out_xsxx.xm',
          'out_xsxx.bjmc',
          'out_xsxx.xymc'
        ]);

      if (conditions.kkh) {
        query = query.where('out_jw_kcb_xs.kkh', '=', conditions.kkh);
      }

      if (conditions.xh) {
        query = query.where('out_jw_kcb_xs.xh', '=', conditions.xh);
      }

      if (conditions.xnxq) {
        query = query.where('out_jw_kcb_xs.xnxq', '=', conditions.xnxq);
      }

      const results = await query.execute();

      this.logOperation('查询学生课表详情', {
        conditions,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('查询学生课表详情', error, { conditions });
    }
  }

  /**
   * 检查学生是否选修了指定课程
   */
  async hasStudentCourse(
    xh: string,
    kkh: string,
    xnxq?: string
  ): Promise<boolean> {
    try {
      let query = this.db
        .selectFrom('out_jw_kcb_xs')
        .select('xh')
        .where('xh', '=', xh)
        .where('kkh', '=', kkh);

      if (xnxq) {
        query = query.where('xnxq', '=', xnxq);
      }

      const result = await query.executeTakeFirst();
      const exists = !!result;

      this.logOperation('检查学生课程', { xh, kkh, xnxq, exists });
      return exists;
    } catch (error) {
      this.handleDatabaseError('检查学生课程', error, { xh, kkh, xnxq });
    }
  }
}
