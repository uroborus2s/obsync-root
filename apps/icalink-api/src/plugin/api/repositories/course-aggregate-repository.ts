/**
 * 聚合任务Repository
 * 专门管理juhe_renwu表的CRUD操作
 */

import { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { CourseAggregateEntity, ExtendedDatabase } from './types.js';

/**
 * 聚合任务Repository实现
 */
export class CourseAggregateRepository extends BaseRepository {
  constructor(db: Kysely<ExtendedDatabase>, log: Logger) {
    super(db, log);
  }

  /**
   * 创建聚合任务
   */
  async create(
    taskData: Omit<CourseAggregateEntity, 'id' | 'created_at' | 'updated_at'>
  ): Promise<number> {
    try {
      const now = this.getCurrentTime();

      const entity: Omit<CourseAggregateEntity, 'id'> = {
        ...taskData,
        created_at: now,
        updated_at: now
      };

      const result = await this.db
        .insertInto('juhe_renwu')
        .values(entity)
        .execute();

      const insertId = Number(result[0].insertId);

      this.logOperation('创建聚合任务', {
        insertId,
        kkh: taskData.kkh,
        xnxq: taskData.xnxq,
        rq: taskData.rq
      });

      return insertId;
    } catch (error) {
      this.handleDatabaseError('创建聚合任务', error, {
        kkh: taskData.kkh,
        xnxq: taskData.xnxq
      });
    }
  }

  /**
   * 批量创建聚合任务
   */
  async batchCreate(
    tasks: Array<
      Omit<CourseAggregateEntity, 'id' | 'created_at' | 'updated_at'>
    >
  ): Promise<number> {
    try {
      const now = this.getCurrentTime();

      const entities = tasks.map((task) => ({
        ...task,
        created_at: now,
        updated_at: now
      }));

      const result = await this.db
        .insertInto('juhe_renwu')
        .values(entities)
        .execute();

      const insertedCount = result.length;

      this.logOperation('批量创建聚合任务', {
        count: tasks.length,
        insertedCount
      });

      return insertedCount;
    } catch (error) {
      this.handleDatabaseError('批量创建聚合任务', error, {
        count: tasks.length
      });
    }
  }

  /**
   * 根据ID查询聚合任务
   */
  async findById(id: number): Promise<CourseAggregateEntity | null> {
    try {
      const result = await this.db
        .selectFrom('juhe_renwu')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      this.logOperation('根据ID查询聚合任务', { id, found: !!result });
      return result || null;
    } catch (error) {
      this.handleDatabaseError('根据ID查询聚合任务', error, { id });
    }
  }

  /**
   * 根据学年学期查询聚合任务
   */
  async findByXnxq(xnxq: string): Promise<CourseAggregateEntity[]> {
    try {
      const results = await this.db
        .selectFrom('juhe_renwu')
        .selectAll()
        .where('xnxq', '=', xnxq)
        .where('gx_zt', 'is', null)
        .orderBy('rq', 'asc')
        .orderBy('sj_f', 'asc')
        .execute();

      this.logOperation('根据学年学期查询聚合任务', {
        xnxq,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据学年学期查询聚合任务', error, { xnxq });
    }
  }

  /**
   * 根据同步状态查询聚合任务
   */
  async findByStatus(
    xnxq: string,
    gxZt?: number | null
  ): Promise<CourseAggregateEntity[]> {
    try {
      let query = this.db
        .selectFrom('juhe_renwu')
        .selectAll()
        .where('xnxq', '=', xnxq);

      if (gxZt !== undefined) {
        if (gxZt === null) {
          query = query.where('gx_zt', 'is', null);
        } else {
          query = query.where('gx_zt', '=', gxZt);
        }
      }

      const results = await query
        .orderBy('rq', 'asc')
        .orderBy('sj_f', 'asc')
        .execute();

      this.logOperation('根据状态查询聚合任务', {
        xnxq,
        gxZt,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据状态查询聚合任务', error, { xnxq, gxZt });
    }
  }

  /**
   * 根据日期查询聚合任务
   */
  async findByDate(xnxq: string, rq: string): Promise<CourseAggregateEntity[]> {
    try {
      const results = await this.db
        .selectFrom('juhe_renwu')
        .selectAll()
        .where('xnxq', '=', xnxq)
        .where('rq', '=', rq)
        .orderBy('sj_f', 'asc')
        .execute();

      this.logOperation('根据日期查询聚合任务', {
        xnxq,
        rq,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据日期查询聚合任务', error, { xnxq, rq });
    }
  }

  /**
   * 根据日期范围查询聚合任务
   */
  async findByDateRange(
    xnxq: string,
    startDate: string,
    endDate: string
  ): Promise<CourseAggregateEntity[]> {
    try {
      const results = await this.db
        .selectFrom('juhe_renwu')
        .selectAll()
        .where('xnxq', '=', xnxq)
        .where('rq', '>=', startDate)
        .where('rq', '<=', endDate)
        .orderBy('rq', 'asc')
        .orderBy('sj_f', 'asc')
        .execute();

      this.logOperation('根据日期范围查询聚合任务', {
        xnxq,
        startDate,
        endDate,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('根据日期范围查询聚合任务', error, {
        xnxq,
        startDate,
        endDate
      });
    }
  }

  /**
   * 更新聚合任务状态
   */
  async updateStatus(id: number, gxZt: number): Promise<boolean> {
    try {
      const now = this.getCurrentTime();

      const result = await this.db
        .updateTable('juhe_renwu')
        .set({
          gx_zt: gxZt,
          gx_sj: now.toISOString(), // 同时更新gx_sj为当前时间
          updated_at: now
        })
        .where('id', '=', id)
        .execute();

      const updated = result.length > 0 && result[0].numUpdatedRows > BigInt(0);

      this.logOperation('更新聚合任务状态', { id, gxZt, updated });
      return updated;
    } catch (error) {
      this.handleDatabaseError('更新聚合任务状态', error, { id, gxZt });
    }
  }

  /**
   * 批量更新聚合任务状态
   */
  async batchUpdateStatus(ids: number[], gxZt: number): Promise<number> {
    try {
      const now = this.getCurrentTime();

      const result = await this.db
        .updateTable('juhe_renwu')
        .set({
          gx_zt: gxZt,
          gx_sj: now.toISOString(), // 同时更新gx_sj为当前时间
          updated_at: now
        })
        .where('id', 'in', ids)
        .execute();

      const updatedCount =
        result.length > 0 ? Number(result[0].numUpdatedRows) : 0;

      this.logOperation('批量更新聚合任务状态', {
        ids: ids.length,
        gxZt,
        updatedCount
      });
      return updatedCount;
    } catch (error) {
      this.handleDatabaseError('批量更新聚合任务状态', error, {
        ids: ids.length,
        gxZt
      });
    }
  }

  /**
   * 软删除聚合任务（设置状态为3）
   */
  async softDelete(kkh: string, rq: string): Promise<number> {
    try {
      const now = this.getCurrentTime();

      const result = await this.db
        .updateTable('juhe_renwu')
        .set({
          gx_zt: 3, // 软删除未处理
          gx_sj: now.toISOString(), // 同时更新gx_sj为当前时间
          updated_at: now
        })
        .where('kkh', '=', kkh)
        .where('rq', '=', rq)
        .execute();

      const updatedCount =
        result.length > 0 ? Number(result[0].numUpdatedRows) : 0;

      this.logOperation('软删除聚合任务', { kkh, rq, updatedCount });
      return updatedCount;
    } catch (error) {
      this.handleDatabaseError('软删除聚合任务', error, { kkh, rq });
    }
  }

  /**
   * 删除聚合任务
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db
        .deleteFrom('juhe_renwu')
        .where('id', '=', id)
        .execute();

      const deleted = result.length > 0 && result[0].numDeletedRows > BigInt(0);

      this.logOperation('删除聚合任务', { id, deleted });
      return deleted;
    } catch (error) {
      this.handleDatabaseError('删除聚合任务', error, { id });
    }
  }

  /**
   * 清空指定学年学期的聚合任务
   */
  async clearByXnxq(xnxq: string): Promise<number> {
    try {
      const result = await this.db
        .deleteFrom('juhe_renwu')
        .where('xnxq', '=', xnxq)
        .execute();

      const deletedCount =
        result.length > 0 ? Number(result[0].numDeletedRows) : 0;

      this.logOperation('清空学年学期聚合任务', { xnxq, deletedCount });
      return deletedCount;
    } catch (error) {
      this.handleDatabaseError('清空学年学期聚合任务', error, { xnxq });
    }
  }

  /**
   * 获取聚合任务统计
   */
  async getStats(xnxq: string): Promise<{
    total: number;
    pending: number;
    teacherSynced: number;
    studentSynced: number;
    softDeleted: number;
    processed: number;
  }> {
    try {
      const results = await this.db
        .selectFrom('juhe_renwu')
        .select([
          this.db.fn.count('id').as('total'),
          this.db.fn.count('id').filterWhere('gx_zt', 'is', null).as('pending'),
          this.db.fn
            .count('id')
            .filterWhere('gx_zt', '=', 1)
            .as('teacherSynced'),
          this.db.fn
            .count('id')
            .filterWhere('gx_zt', '=', 2)
            .as('studentSynced'),
          this.db.fn.count('id').filterWhere('gx_zt', '=', 3).as('softDeleted'),
          this.db.fn.count('id').filterWhere('gx_zt', '=', 4).as('processed')
        ])
        .where('xnxq', '=', xnxq)
        .executeTakeFirst();

      const stats = {
        total: Number(results?.total || 0),
        pending: Number(results?.pending || 0),
        teacherSynced: Number(results?.teacherSynced || 0),
        studentSynced: Number(results?.studentSynced || 0),
        softDeleted: Number(results?.softDeleted || 0),
        processed: Number(results?.processed || 0)
      };

      this.logOperation('获取聚合任务统计', { xnxq, stats });
      return stats;
    } catch (error) {
      this.handleDatabaseError('获取聚合任务统计', error, { xnxq });
    }
  }

  /**
   * 根据条件查询聚合任务
   */
  async findByConditions(conditions: {
    xnxq?: string;
    kkh?: string;
    rq?: string;
    sjd?: string;
    gxZt?: number | null;
    sjf?: string;
  }): Promise<CourseAggregateEntity[]> {
    try {
      let query = this.db.selectFrom('juhe_renwu').selectAll();

      if (conditions.xnxq) {
        query = query.where('xnxq', '=', conditions.xnxq);
      }

      if (conditions.kkh) {
        query = query.where('kkh', '=', conditions.kkh);
      }

      if (conditions.rq) {
        query = query.where('rq', '=', conditions.rq);
      }

      if (conditions.sjd) {
        query = query.where('sjd', '=', conditions.sjd);
      }
      if (conditions.sjf) {
        query = query.where('sj_f', '=', conditions.sjf);
      }

      if (conditions.gxZt !== undefined) {
        if (conditions.gxZt === null) {
          query = query.where('gx_zt', 'is', null);
        } else {
          query = query.where('gx_zt', '=', conditions.gxZt);
        }
      }

      const results = await query
        .orderBy('rq', 'asc')
        .orderBy('sj_f', 'asc')
        .execute();

      this.logOperation('条件查询聚合任务', {
        conditions,
        count: results.length
      });
      return results;
    } catch (error) {
      this.handleDatabaseError('条件查询聚合任务', error, { conditions });
    }
  }

  /**
   * 获取需要打卡的聚合任务
   */
  async findAttendanceTasks(xnxq: string): Promise<CourseAggregateEntity[]> {
    try {
      const results = await this.db
        .selectFrom('juhe_renwu')
        .selectAll()
        .where('xnxq', '=', xnxq)
        .where('sfdk', '=', '1')
        .orderBy('rq', 'asc')
        .orderBy('sj_f', 'asc')
        .execute();

      this.logOperation('查询打卡任务', { xnxq, count: results.length });
      return results;
    } catch (error) {
      this.handleDatabaseError('查询打卡任务', error, { xnxq });
    }
  }
}
