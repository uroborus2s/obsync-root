/**
 * 学生信息Repository
 * 专门管理out_xsxx表的CRUD操作
 */

import { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, StudentInfoEntity } from './types.js';

/**
 * 学生信息Repository实现
 */
export class StudentInfoRepository extends BaseRepository {
  constructor(db: Kysely<ExtendedDatabase>, log: Logger) {
    super(db, log);
  }

  /**
   * 根据学号查询学生信息
   */
  async findByXh(xh: string): Promise<StudentInfoEntity | null> {
    try {
      const result = await this.db
        .selectFrom('out_xsxx')
        .selectAll()
        .where('xh', '=', xh)
        .executeTakeFirst();

      this.logOperation('根据学号查询学生信息', { xh, found: !!result });
      return result || null;
    } catch (error) {
      this.handleDatabaseError('根据学号查询学生信息', error, { xh });
    }
  }

  /**
   * 根据ID查询学生信息
   */
  async findById(id: string): Promise<StudentInfoEntity | null> {
    try {
      const result = await this.db
        .selectFrom('out_xsxx')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      this.logOperation('根据ID查询学生信息', { id, found: !!result });
      return result || null;
    } catch (error) {
      this.handleDatabaseError('根据ID查询学生信息', error, { id });
    }
  }

  /**
   * 批量根据学号查询学生信息
   */
  async findByXhs(xhs: string[]): Promise<StudentInfoEntity[]> {
    try {
      if (xhs.length === 0) {
        return [];
      }

      const results = await this.db
        .selectFrom('out_xsxx')
        .selectAll()
        .where('xh', 'in', xhs)
        .execute();

      this.logOperation('批量查询学生信息', {
        xhCount: xhs.length,
        foundCount: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('批量查询学生信息', error, {
        xhCount: xhs.length
      });
    }
  }

  /**
   * 根据班级查询学生信息
   */
  async findByClass(bjdm: string): Promise<StudentInfoEntity[]> {
    try {
      const results = await this.db
        .selectFrom('out_xsxx')
        .selectAll()
        .where('bjdm', '=', bjdm)
        .orderBy('xh', 'asc')
        .execute();

      this.logOperation('根据班级查询学生信息', {
        bjdm,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据班级查询学生信息', error, { bjdm });
    }
  }

  /**
   * 根据学院查询学生信息
   */
  async findByCollege(xydm: string): Promise<StudentInfoEntity[]> {
    try {
      const results = await this.db
        .selectFrom('out_xsxx')
        .selectAll()
        .where('xydm', '=', xydm)
        .orderBy('bjdm', 'asc')
        .orderBy('xh', 'asc')
        .execute();

      this.logOperation('根据学院查询学生信息', {
        xydm,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据学院查询学生信息', error, { xydm });
    }
  }

  /**
   * 根据专业查询学生信息
   */
  async findByMajor(zydm: string): Promise<StudentInfoEntity[]> {
    try {
      const results = await this.db
        .selectFrom('out_xsxx')
        .selectAll()
        .where('zydm', '=', zydm)
        .orderBy('bjdm', 'asc')
        .orderBy('xh', 'asc')
        .execute();

      this.logOperation('根据专业查询学生信息', {
        zydm,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据专业查询学生信息', error, { zydm });
    }
  }

  /**
   * 根据年级查询学生信息
   */
  async findByGrade(sznj: string): Promise<StudentInfoEntity[]> {
    try {
      const results = await this.db
        .selectFrom('out_xsxx')
        .selectAll()
        .where('sznj', '=', sznj)
        .orderBy('xydm', 'asc')
        .orderBy('zydm', 'asc')
        .orderBy('bjdm', 'asc')
        .orderBy('xh', 'asc')
        .execute();

      this.logOperation('根据年级查询学生信息', {
        sznj,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据年级查询学生信息', error, { sznj });
    }
  }

  /**
   * 根据学生类型查询学生信息
   */
  async findByType(lx: number): Promise<StudentInfoEntity[]> {
    try {
      const results = await this.db
        .selectFrom('out_xsxx')
        .selectAll()
        .where('lx', '=', lx)
        .orderBy('sznj', 'asc')
        .orderBy('xydm', 'asc')
        .orderBy('zydm', 'asc')
        .orderBy('bjdm', 'asc')
        .orderBy('xh', 'asc')
        .execute();

      this.logOperation('根据学生类型查询学生信息', {
        lx,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据学生类型查询学生信息', error, { lx });
    }
  }

  /**
   * 根据条件查询学生信息
   */
  async findByConditions(conditions: {
    xh?: string;
    xm?: string;
    xydm?: string;
    zydm?: string;
    bjdm?: string;
    sznj?: string;
    lx?: number;
    zt?: string;
  }): Promise<StudentInfoEntity[]> {
    try {
      let query = this.db.selectFrom('out_xsxx').selectAll();

      if (conditions.xh) {
        query = query.where('xh', '=', conditions.xh);
      }

      if (conditions.xm) {
        query = query.where('xm', 'like', `%${conditions.xm}%`);
      }

      if (conditions.xydm) {
        query = query.where('xydm', '=', conditions.xydm);
      }

      if (conditions.zydm) {
        query = query.where('zydm', '=', conditions.zydm);
      }

      if (conditions.bjdm) {
        query = query.where('bjdm', '=', conditions.bjdm);
      }

      if (conditions.sznj) {
        query = query.where('sznj', '=', conditions.sznj);
      }

      if (conditions.lx !== undefined) {
        query = query.where('lx', '=', conditions.lx);
      }

      if (conditions.zt) {
        query = query.where('zt', '=', conditions.zt);
      }

      const results = await query
        .orderBy('sznj', 'asc')
        .orderBy('xydm', 'asc')
        .orderBy('zydm', 'asc')
        .orderBy('bjdm', 'asc')
        .orderBy('xh', 'asc')
        .execute();

      this.logOperation('条件查询学生信息', {
        conditions,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('条件查询学生信息', error, { conditions });
    }
  }

  /**
   * 搜索学生信息（模糊查询）
   */
  async searchStudents(keyword: string): Promise<StudentInfoEntity[]> {
    try {
      const results = await this.db
        .selectFrom('out_xsxx')
        .selectAll()
        .where((eb) =>
          eb.or([
            eb('xh', 'like', `%${keyword}%`),
            eb('xm', 'like', `%${keyword}%`),
            eb('sfzh', 'like', `%${keyword}%`),
            eb('sjh', 'like', `%${keyword}%`)
          ])
        )
        .orderBy('xh', 'asc')
        .execute();

      this.logOperation('搜索学生信息', { keyword, count: results.length });
      return results;
    } catch (error) {
      this.handleDatabaseError('搜索学生信息', error, { keyword });
    }
  }

  /**
   * 获取学生统计信息
   */
  async getStudentStats(): Promise<{
    total: number;
    undergraduate: number;
    graduate: number;
    byCollege: Array<{ xydm: string; xymc: string; count: number }>;
    byGrade: Array<{ sznj: string; count: number }>;
  }> {
    try {
      // 总数和类型统计
      const totalStats = await this.db
        .selectFrom('out_xsxx')
        .select([
          this.db.fn.count('id').as('total'),
          this.db.fn.count('id').filterWhere('lx', '=', 1).as('undergraduate'),
          this.db.fn.count('id').filterWhere('lx', '=', 2).as('graduate')
        ])
        .executeTakeFirst();

      // 按学院统计
      const collegeStats = await this.db
        .selectFrom('out_xsxx')
        .select(['xydm', 'xymc', this.db.fn.count('id').as('count')])
        .where('xydm', 'is not', null)
        .groupBy(['xydm', 'xymc'])
        .orderBy('count', 'desc')
        .execute();

      // 按年级统计
      const gradeStats = await this.db
        .selectFrom('out_xsxx')
        .select(['sznj', this.db.fn.count('id').as('count')])
        .where('sznj', 'is not', null)
        .groupBy('sznj')
        .orderBy('sznj', 'desc')
        .execute();

      const stats = {
        total: Number(totalStats?.total || 0),
        undergraduate: Number(totalStats?.undergraduate || 0),
        graduate: Number(totalStats?.graduate || 0),
        byCollege: collegeStats.map((item) => ({
          xydm: item.xydm || '',
          xymc: item.xymc || '',
          count: Number(item.count)
        })),
        byGrade: gradeStats.map((item) => ({
          sznj: item.sznj || '',
          count: Number(item.count)
        }))
      };

      this.logOperation('获取学生统计信息', { stats });
      return stats;
    } catch (error) {
      this.handleDatabaseError('获取学生统计信息', error);
    }
  }

  /**
   * 检查学号是否存在
   */
  async existsByXh(xh: string): Promise<boolean> {
    try {
      const result = await this.db
        .selectFrom('out_xsxx')
        .select('id')
        .where('xh', '=', xh)
        .executeTakeFirst();

      const exists = !!result;
      this.logOperation('检查学号是否存在', { xh, exists });
      return exists;
    } catch (error) {
      this.handleDatabaseError('检查学号是否存在', error, { xh });
    }
  }

  /**
   * 获取班级学生列表
   */
  async getClassStudents(bjdm: string): Promise<
    Array<{
      xh: string;
      xm: string;
      xb: string;
      sjh: string;
    }>
  > {
    try {
      const results = await this.db
        .selectFrom('out_xsxx')
        .select(['xh', 'xm', 'xb', 'sjh'])
        .where('bjdm', '=', bjdm)
        .orderBy('xh', 'asc')
        .execute();

      this.logOperation('获取班级学生列表', { bjdm, count: results.length });
      return results.map((item) => ({
        xh: item.xh || '',
        xm: item.xm || '',
        xb: item.xb || '',
        sjh: item.sjh || ''
      }));
    } catch (error) {
      this.handleDatabaseError('获取班级学生列表', error, { bjdm });
    }
  }

  /**
   * 获取学院专业班级树形结构
   */
  async getCollegeMajorClassTree(): Promise<
    Array<{
      xydm: string;
      xymc: string;
      majors: Array<{
        zydm: string;
        zymc: string;
        classes: Array<{
          bjdm: string;
          bjmc: string;
          studentCount: number;
        }>;
      }>;
    }>
  > {
    try {
      const results = await this.db
        .selectFrom('out_xsxx')
        .select([
          'xydm',
          'xymc',
          'zydm',
          'zymc',
          'bjdm',
          'bjmc',
          this.db.fn.count('id').as('studentCount')
        ])
        .where('xydm', 'is not', null)
        .where('zydm', 'is not', null)
        .where('bjdm', 'is not', null)
        .groupBy(['xydm', 'xymc', 'zydm', 'zymc', 'bjdm', 'bjmc'])
        .orderBy('xydm', 'asc')
        .orderBy('zydm', 'asc')
        .orderBy('bjdm', 'asc')
        .execute();

      // 构建树形结构
      const collegeMap = new Map();

      for (const row of results) {
        const collegeKey = row.xydm;
        if (!collegeMap.has(collegeKey)) {
          collegeMap.set(collegeKey, {
            xydm: row.xydm || '',
            xymc: row.xymc || '',
            majors: new Map()
          });
        }

        const college = collegeMap.get(collegeKey);
        const majorKey = row.zydm;
        if (!college.majors.has(majorKey)) {
          college.majors.set(majorKey, {
            zydm: row.zydm || '',
            zymc: row.zymc || '',
            classes: []
          });
        }

        const major = college.majors.get(majorKey);
        major.classes.push({
          bjdm: row.bjdm || '',
          bjmc: row.bjmc || '',
          studentCount: Number(row.studentCount)
        });
      }

      // 转换为数组格式
      const tree = Array.from(collegeMap.values()).map((college) => ({
        ...college,
        majors: Array.from(college.majors.values())
      }));

      this.logOperation('获取学院专业班级树', { collegeCount: tree.length });
      return tree;
    } catch (error) {
      this.handleDatabaseError('获取学院专业班级树', error);
    }
  }
}
