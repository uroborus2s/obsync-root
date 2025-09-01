// @stratix/icasync 原始课程数据仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { DatabaseErrorHandler, QueryError, sql } from '@stratix/database';
import type {
  CourseChange,
  CourseRaw,
  CourseRawUpdate,
  NewCourseRaw
} from '../types/database.js';
import { BaseIcasyncRepository } from './base/BaseIcasyncRepository.js';

/**
 * 原始课程数据仓储接口
 */
export interface ICourseRawRepository {
  // 基础操作（使用便捷方法）
  findByIdNullable(id: number): Promise<DatabaseResult<CourseRaw | null>>;
  create(data: NewCourseRaw): Promise<DatabaseResult<CourseRaw>>;
  updateNullable(
    id: number,
    data: CourseRawUpdate
  ): Promise<DatabaseResult<CourseRaw | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;

  // 业务查询方法
  findByKkh(kkh: string): Promise<DatabaseResult<CourseRaw[]>>;
  findByXnxq(xnxq: string): Promise<DatabaseResult<CourseRaw[]>>;
  findByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<CourseRaw[]>>;
  findByKkhAndSemester(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<CourseRaw[]>>;
  findByKkhAndDate(
    kkh: string,
    rq: string
  ): Promise<DatabaseResult<CourseRaw[]>>;
  findDistinctKkh(xnxq: string): Promise<DatabaseResult<string[]>>;
  findByZt(zt: string): Promise<DatabaseResult<CourseRaw[]>>;
  findByGxZt(gxZt: string | null): Promise<DatabaseResult<CourseRaw[]>>;

  // 增量同步相关
  findUnprocessedChanges(): Promise<DatabaseResult<CourseRaw[]>>;
  findChangesByType(
    changeType: 'add' | 'update' | 'delete'
  ): Promise<DatabaseResult<CourseRaw[]>>;
  findChangesAfterTime(timestamp: Date): Promise<DatabaseResult<CourseRaw[]>>;
  getDistinctChangedCourses(): Promise<DatabaseResult<CourseChange[]>>;

  // 批量操作
  updateGxZtBatch(ids: number[], gxZt: string): Promise<DatabaseResult<number>>;
  updateGxZtByKkhAndXnxq(
    kkh: string,
    xnxq: string,
    gxZt: string
  ): Promise<DatabaseResult<number>>;
  markAsProcessed(ids: number[]): Promise<DatabaseResult<number>>;

  // 查询操作
  findCoursesByTeacher(
    teacherCode: string
  ): Promise<DatabaseResult<CourseRaw[]>>;
  findCoursesByRoom(room: string): Promise<DatabaseResult<CourseRaw[]>>;
  findCoursesByTimeSlot(
    zc: string,
    jc: string
  ): Promise<DatabaseResult<CourseRaw[]>>;
  findCoursesForAggregation(
    kkh: string,
    rq: string
  ): Promise<DatabaseResult<CourseRaw[]>>;

  // 统计查询
  countByXnxq(xnxq: string): Promise<DatabaseResult<number>>;
  countByKkh(kkh: string): Promise<DatabaseResult<number>>;
  countByKkhAndSemester(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<number>>;
  countUnprocessedChanges(): Promise<DatabaseResult<number>>;
  countByChangeType(
    changeType: 'add' | 'update' | 'delete'
  ): Promise<DatabaseResult<number>>;

  // 数据验证
  validateCourseData(
    data: Partial<CourseRaw>
  ): Promise<DatabaseResult<boolean>>;
  findDuplicateCourses(): Promise<DatabaseResult<CourseRaw[]>>;
  findConflictingCourses(): Promise<DatabaseResult<CourseRaw[]>>;

  // 原生 SQL 聚合操作
  executeFullAggregationSql(xnxq: string): Promise<DatabaseResult<any[]>>;

  // 增量聚合查询
  findUnprocessedAggregatedTasks(): Promise<DatabaseResult<any[]>>;

  // 反向查询方法
  findOriginalCoursesByJuheRenwuId(
    juheRenwuId: number
  ): Promise<DatabaseResult<CourseRaw[]>>;
  findOriginalCoursesByJuheRenwuIds(
    juheRenwuIds: number[]
  ): Promise<DatabaseResult<CourseRaw[]>>;

  // 使用组合键更新状态
  updateGxZtByCompositeKey(
    kkh: string,
    xnxq: string,
    jxz: number,
    zc: number,
    jc: number,
    gxZt: string
  ): Promise<DatabaseResult<number>>;

  // 根据聚合任务ID直接更新对应的原始课程记录状态（一条SQL完成）
  updateOriginalCoursesByJuheRenwuIds(
    juheRenwuIds: number[],
    gxZt: string
  ): Promise<DatabaseResult<number>>;

  // 增量同步相关方法
  updateJuheRenwuByIncrementalData(xnxq?: string): Promise<
    DatabaseResult<{
      updatedJuheRenwu: number;
      updatedCourseRaw: number;
    }>
  >;
  getIncrementalDataStats(xnxq: string): Promise<
    DatabaseResult<{
      totalCount: number;
      amCount: number;
      pmCount: number;
      distinctKkhs: string[];
    }>
  >;
  validateIncrementalUpdate(xnxq: string): Promise<
    DatabaseResult<{
      matchedJuheRenwu: number;
      updatedJuheRenwu: number;
      pendingIncrementalData: number;
    }>
  >;
}

/**
 * 原始课程数据仓储实现
 * 访问现有的 u_jw_kcb_cur 表
 */
export default class CourseRawRepository
  extends BaseIcasyncRepository<
    'u_jw_kcb_cur',
    CourseRaw,
    NewCourseRaw,
    CourseRawUpdate
  >
  implements ICourseRawRepository
{
  protected readonly tableName = 'u_jw_kcb_cur' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super('syncdb');
  }

  /**
   * 根据开课号查找课程
   */
  async findByKkh(kkh: string): Promise<DatabaseResult<CourseRaw[]>> {
    this.validateKkh(kkh);

    return await this.findMany((qb: any) => qb.where('kkh', '=', kkh), {
      orderBy: { field: 'gx_sj', direction: 'desc' }
    });
  }

  /**
   * 根据学年学期查找课程
   */
  async findByXnxq(xnxq: string): Promise<DatabaseResult<CourseRaw[]>> {
    this.validateXnxq(xnxq);

    return await this.findMany((qb: any) => qb.where('xnxq', '=', xnxq), {
      orderBy: { field: 'kkh', direction: 'asc' }
    });
  }

  /**
   * 根据开课号和学年学期查找课程
   */
  async findByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<CourseRaw[]>> {
    this.validateKkh(kkh);
    this.validateXnxq(xnxq);

    try {
      const operation = async (db: any) => {
        return await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('kkh', '=', kkh)
          .where('xnxq', '=', xnxq)
          .orderBy('zc', 'asc')
          .execute();
      };

      return await DatabaseErrorHandler.execute(async () => {
        const db = this.readConnection;
        return await operation(db);
      }, 'find-by-kkh-and-semester');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('findByKkhAndXnxq失败', {
        kkh,
        xnxq,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(errorMessage)
      };
    }
  }

  /**
   * 根据开课号和学期查找课程（别名方法）
   */
  async findByKkhAndSemester(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<CourseRaw[]>> {
    return await this.findByKkhAndXnxq(kkh, xnxq);
  }

  /**
   * 根据开课号和日期查找课程
   */
  async findByKkhAndDate(
    kkh: string,
    rq: string
  ): Promise<DatabaseResult<CourseRaw[]>> {
    this.validateKkh(kkh);

    if (!rq) {
      throw new Error('Date cannot be empty');
    }

    try {
      const operation = async (db: any) => {
        return await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('kkh', '=', kkh)
          .where('rq', 'like', `${rq}%`)
          .orderBy('st', 'asc')
          .execute();
      };

      return await DatabaseErrorHandler.execute(async () => {
        const db = this.readConnection;
        return await operation(db);
      }, 'find-by-kkh-and-date');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('findByKkhAndDate失败', {
        kkh,
        rq,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(errorMessage)
      };
    }
  }

  /**
   * 获取指定学期的所有不重复开课号
   */
  async findDistinctKkh(xnxq: string): Promise<DatabaseResult<string[]>> {
    this.validateXnxq(xnxq);

    try {
      // 这里需要使用原始SQL查询来获取DISTINCT值
      // 由于BaseRepository可能不直接支持DISTINCT，我们先返回一个简化实现
      const result = await this.findMany((qb: any) =>
        qb.where('xnxq', '=', xnxq)
      );

      if (!result.success) {
        return result as any;
      }

      // 手动去重，过滤掉null值
      const distinctKkhs = [
        ...new Set(
          result.data
            .map((course) => course.kkh)
            .filter((kkh): kkh is string => kkh !== null)
        )
      ];

      return {
        success: true,
        data: distinctKkhs
      };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'SELECT DISTINCT kkh FROM u_jw_kcb_cur WHERE xnxq = ?',
          [xnxq]
        )
      };
    }
  }

  /**
   * 根据状态标识查找课程
   */
  async findByZt(zt: string): Promise<DatabaseResult<CourseRaw[]>> {
    if (!zt) {
      throw new Error('Status cannot be empty');
    }

    return await this.findMany((qb: any) => qb.where('zt', '=', zt), {
      orderBy: { field: 'gx_sj', direction: 'desc' }
    });
  }

  /**
   * 根据更新状态查找课程
   */
  async findByGxZt(gxZt: string | null): Promise<DatabaseResult<CourseRaw[]>> {
    if (gxZt === null) {
      return await this.findMany((qb: any) => qb.where('gx_zt', 'is', null), {
        orderBy: { field: 'gx_sj', direction: 'desc' }
      });
    }

    return await this.findMany((qb: any) => qb.where('gx_zt', '=', gxZt), {
      orderBy: { field: 'gx_sj', direction: 'desc' }
    });
  }

  /**
   * 查找未处理的变更
   */
  async findUnprocessedChanges(): Promise<DatabaseResult<CourseRaw[]>> {
    return await this.findByGxZt(null);
  }

  /**
   * 根据变更类型查找课程
   */
  async findChangesByType(
    changeType: 'add' | 'update' | 'delete'
  ): Promise<DatabaseResult<CourseRaw[]>> {
    try {
      const operation = async (db: any) => {
        return await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('zt', '=', changeType)
          .where('gx_zt', 'is', null)
          .orderBy('gx_sj', 'desc')
          .execute();
      };

      return await DatabaseErrorHandler.execute(async () => {
        const db = this.readConnection;
        return await operation(db);
      }, 'find-changes-by-type');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('findChangesByType失败', {
        changeType,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(errorMessage)
      };
    }
  }

  /**
   * 查找指定时间后的变更
   */
  async findChangesAfterTime(
    timestamp: Date
  ): Promise<DatabaseResult<CourseRaw[]>> {
    try {
      const operation = async (db: any) => {
        return await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('gx_sj', '>', timestamp)
          .where('gx_zt', 'is', null)
          .orderBy('gx_sj', 'desc')
          .execute();
      };

      return await DatabaseErrorHandler.execute(async () => {
        const db = this.readConnection;
        return await operation(db);
      }, 'find-changes-after-time');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('findChangesAfterTime失败', {
        timestamp,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(errorMessage)
      };
    }
  }

  /**
   * 获取不同的变更课程
   */
  async getDistinctChangedCourses(): Promise<DatabaseResult<CourseChange[]>> {
    try {
      // 这里需要使用原始SQL查询来获取去重的课程变更
      // 由于BaseRepository可能不直接支持复杂的GROUP BY查询，
      // 我们先用简单的方法实现
      const changesResult = await this.findUnprocessedChanges();

      if (!changesResult.success) {
        return {
          success: false,
          error:
            (changesResult as any).error || new Error('Failed to fetch changes')
        };
      }

      // 手动去重和分组
      const courseChanges = new Map<string, CourseChange>();

      for (const course of changesResult.data) {
        const key = `${course.kkh}-${course.rq}`;
        if (!courseChanges.has(key) && course.kkh && course.rq && course.zt) {
          courseChanges.set(key, {
            kkh: course.kkh,
            rq: course.rq,
            changeType: course.zt as 'add' | 'update' | 'delete'
          });
        }
      }

      return {
        success: true,
        data: Array.from(courseChanges.values())
      };
    } catch (error) {
      this.handleDatabaseError('getDistinctChangedCourses', error);
    }
  }

  /**
   * 批量更新更新状态
   */
  async updateGxZtBatch(
    ids: number[],
    gxZt: string
  ): Promise<DatabaseResult<number>> {
    if (!ids || ids.length === 0) {
      throw new Error('IDs array cannot be empty');
    }

    if (!gxZt) {
      throw new Error('Update status cannot be empty');
    }

    // 直接构建更新数据，不使用 buildUpdateData 避免添加不存在的 updated_at 字段
    const updateData = this.cleanData({
      gx_zt: gxZt
    });

    // 使用正确的 WhereExpression 函数格式
    const whereExpression = (qb: any) => qb.where('id', 'in', ids);

    return await this.updateMany(
      whereExpression,
      updateData as CourseRawUpdate
    );
  }

  /**
   * 根据开课号和学年学期更新状态
   * 用于批量更新指定课程的所有记录
   */
  async updateGxZtByKkhAndXnxq(
    kkh: string,
    xnxq: string,
    gxZt: string
  ): Promise<DatabaseResult<number>> {
    this.validateKkh(kkh);
    this.validateXnxq(xnxq);

    if (!gxZt) {
      throw new Error('Update status cannot be empty');
    }

    try {
      this.logOperation('updateGxZtByKkhAndXnxq', { kkh, xnxq, gxZt });

      const updateTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '); // MySQL datetime format

      const operation = async (db: any) => {
        const result = await db
          .updateTable(this.tableName)
          .set({
            gx_zt: gxZt,
            gx_sj: updateTime
          })
          .where('kkh', '=', kkh)
          .where('xnxq', '=', xnxq)
          .where('gx_zt', 'is', null) // 只更新未处理的记录
          .executeTakeFirst();

        return result.numAffectedRows ? Number(result.numAffectedRows) : 0;
      };

      const result = await this.databaseApi.executeQuery(operation, {
        connectionName: 'syncdb'
      });

      if (result.success) {
        this.logOperation('updateGxZtByKkhAndXnxq完成', {
          kkh,
          xnxq,
          gxZt,
          updatedCount: result.data,
          updateTime
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('updateGxZtByKkhAndXnxq失败', {
        kkh,
        xnxq,
        gxZt,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(`更新课程状态失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 标记为已处理
   */
  async markAsProcessed(ids: number[]): Promise<DatabaseResult<number>> {
    return await this.updateGxZtBatch(ids, 'processed');
  }

  /**
   * 根据教师工号查找课程
   */
  async findCoursesByTeacher(
    teacherCode: string
  ): Promise<DatabaseResult<CourseRaw[]>> {
    if (!teacherCode) {
      throw new Error('Teacher code cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('ghs', 'like', `%${teacherCode}%`).orderBy('xnxq', 'desc')
    );
  }

  /**
   * 根据教室查找课程
   */
  async findCoursesByRoom(room: string): Promise<DatabaseResult<CourseRaw[]>> {
    if (!room) {
      throw new Error('Room cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('room', '=', room).orderBy('xnxq', 'desc')
    );
  }

  /**
   * 根据时间段查找课程
   */
  async findCoursesByTimeSlot(
    zc: string,
    jc: string
  ): Promise<DatabaseResult<CourseRaw[]>> {
    if (!zc || !jc) {
      throw new Error('Week and period cannot be empty');
    }

    try {
      const operation = async (db: any) => {
        return await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('zc', '=', zc)
          .where('jc', '=', jc)
          .orderBy('kkh', 'asc')
          .execute();
      };

      return await this.databaseApi.executeQuery(operation);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('findCoursesByTimeSlot失败', {
        zc,
        jc,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(errorMessage)
      };
    }
  }

  /**
   * 查找用于聚合的课程数据
   */
  async findCoursesForAggregation(
    kkh: string,
    rq: string
  ): Promise<DatabaseResult<CourseRaw[]>> {
    this.validateKkh(kkh);

    if (!rq) {
      throw new Error('Date cannot be empty');
    }

    try {
      const operation = async (db: any) => {
        return await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('kkh', '=', kkh)
          .where('rq', '=', rq)
          .orderBy('jc', 'asc')
          .execute();
      };
      return await DatabaseErrorHandler.execute(async () => {
        const db = this.readConnection;
        return await operation(db);
      }, 'find-courses-for-aggregation');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('findCoursesForAggregation失败', {
        kkh,
        rq,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(errorMessage)
      };
    }
  }

  /**
   * 执行全量聚合 SQL 查询
   * 使用原生 SQL 一次性聚合所有课程数据
   */
  async executeFullAggregationSql(
    xnxq: string
  ): Promise<DatabaseResult<any[]>> {
    this.validateXnxq(xnxq);

    try {
      this.logOperation('开始执行全量聚合SQL', { xnxq });

      const operation = async (db: any) => {
        // 使用 Kysely sql 模板字符串执行聚合查询
        const query = sql`
          SELECT
            kkh,
            xnxq,
            jxz,
            zc,
            LEFT(rq, 10) as rq,
            kcmc,
            sfdk,
            GROUP_CONCAT(jc ORDER BY jc SEPARATOR '/') as jc_s,
            GROUP_CONCAT(IFNULL(room, '无') ORDER BY jc SEPARATOR '/') as room_s,
            GROUP_CONCAT(DISTINCT ghs) as gh_s,
            GROUP_CONCAT(DISTINCT xms) as xm_s,
            SUBSTRING_INDEX(GROUP_CONCAT(lq ORDER BY st), ',', 1) as lq,
            SUBSTRING_INDEX(GROUP_CONCAT(st ORDER BY st), ',', 1) as sj_f,
            SUBSTRING_INDEX(GROUP_CONCAT(ed ORDER BY ed DESC), ',', 1) as sj_t,
            'am' as sjd
          FROM u_jw_kcb_cur
          WHERE xnxq = ${xnxq} AND gx_zt IS NULL AND jc < 5
          GROUP BY kkh, xnxq, jxz, zc, LEFT(rq, 10), kcmc, sfdk
          UNION
          SELECT
            kkh,
            xnxq,
            jxz,
            zc,
            LEFT(rq, 10) as rq,
            kcmc,
            sfdk,
            GROUP_CONCAT(jc ORDER BY jc SEPARATOR '/') as jc_s,
            GROUP_CONCAT(IFNULL(room, '无') ORDER BY jc SEPARATOR '/') as room_s,
            GROUP_CONCAT(DISTINCT ghs) as gh_s,
            GROUP_CONCAT(DISTINCT xms) as xm_s,
            SUBSTRING_INDEX(GROUP_CONCAT(lq ORDER BY st), ',', 1) as lq,
            SUBSTRING_INDEX(GROUP_CONCAT(st ORDER BY st), ',', 1) as sj_f,
            SUBSTRING_INDEX(GROUP_CONCAT(ed ORDER BY ed DESC), ',', 1) as sj_t,
            'pm' as sjd
          FROM u_jw_kcb_cur
          WHERE xnxq = ${xnxq} AND gx_zt IS NULL AND jc >= 5
          GROUP BY kkh, xnxq, jxz, zc, LEFT(rq, 10), kcmc, sfdk
          ORDER BY kkh, rq, sjd
        `;

        const results = await query.execute(db);
        return results.rows;
      };

      const result = await DatabaseErrorHandler.execute(async () => {
        const db = this.readConnection;
        return await operation(db);
      }, 'execute-full-aggregation-sql');

      if (result.success) {
        this.logOperation('执行全量聚合查询完成', {
          xnxq,
          aggregatedCount: result.data.length
        });
        return result;
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('全量聚合查询失败', { xnxq, error: errorMessage });
      return {
        success: false,
        error: QueryError.create(`全量聚合查询失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 查找未处理的聚合任务
   * 用于增量聚合模式
   */
  async findUnprocessedAggregatedTasks(): Promise<DatabaseResult<any[]>> {
    try {
      // 暂时返回空数组，因为这个方法需要查询 juhe_renwu 表
      // 应该在 JuheRenwuRepository 中实现
      this.logOperation('查找未处理聚合任务', {
        unprocessedCount: 0
      });

      return {
        success: true,
        data: [] as any[]
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('查找未处理聚合任务失败', { error: errorMessage });
      return {
        success: false,
        error: QueryError.create(`查找未处理聚合任务失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 统计指定学年学期的课程数量
   */
  async countByXnxq(xnxq: string): Promise<DatabaseResult<number>> {
    this.validateXnxq(xnxq);

    return await this.count((qb: any) => qb.where('xnxq', '=', xnxq));
  }

  /**
   * 统计指定开课号的课程数量
   */
  async countByKkh(kkh: string): Promise<DatabaseResult<number>> {
    this.validateKkh(kkh);

    return await this.count((qb: any) => qb.where('kkh', '=', kkh));
  }

  /**
   * 统计指定开课号和学期的课程数量
   */
  async countByKkhAndSemester(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<number>> {
    this.validateKkh(kkh);
    this.validateXnxq(xnxq);

    return await this.count((qb: any) =>
      qb.where('kkh', '=', kkh).where('xnxq', '=', xnxq)
    );
  }

  /**
   * 统计未处理的变更数量
   */
  async countUnprocessedChanges(): Promise<DatabaseResult<number>> {
    return await this.count((qb: any) => qb.where('gx_zt', 'is', null));
  }

  /**
   * 统计指定变更类型的数量
   */
  async countByChangeType(
    changeType: 'add' | 'update' | 'delete'
  ): Promise<DatabaseResult<number>> {
    return await this.count((qb: any) =>
      qb.where('zt', '=', changeType).where('gx_zt', 'is', null)
    );
  }

  /**
   * 验证课程数据
   */
  async validateCourseData(
    data: Partial<CourseRaw>
  ): Promise<DatabaseResult<boolean>> {
    try {
      // 验证必需字段
      if (data.kkh) {
        this.validateKkh(data.kkh);
      }
      if (data.xnxq) {
        this.validateXnxq(data.xnxq);
      }

      // 验证数据格式
      if (data.zc && !/^[1-7]$/.test(String(data.zc))) {
        throw new Error('Invalid week format');
      }

      if (data.jc && !/^\d+(-\d+)?$/.test(String(data.jc))) {
        throw new Error('Invalid period format');
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      throw new Error(
        `Course data validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 查找重复的课程
   */
  async findDuplicateCourses(): Promise<DatabaseResult<CourseRaw[]>> {
    // 这里需要使用复杂的SQL查询来查找重复课程
    // 由于BaseRepository可能不直接支持，我们先返回空数组
    // 实际实现需要使用原始SQL查询
    return {
      success: true,
      data: []
    };
  }

  /**
   * 查找冲突的课程
   */
  async findConflictingCourses(): Promise<DatabaseResult<CourseRaw[]>> {
    // 这里需要使用复杂的SQL查询来查找时间冲突的课程
    // 由于BaseRepository可能不直接支持，我们先返回空数组
    // 实际实现需要使用原始SQL查询
    return {
      success: true,
      data: []
    };
  }

  /**
   * 创建课程（重写以添加验证）
   */
  async create(data: NewCourseRaw): Promise<DatabaseResult<CourseRaw>> {
    // 验证必需字段
    const requiredFields = ['kkh', 'xnxq', 'jxz', 'zc', 'jc', 'kcmc'];
    for (const field of requiredFields) {
      if (!data[field as keyof NewCourseRaw]) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }

    // 验证数据格式
    const validationResult = await this.validateCourseData(data);
    if (!validationResult.success) {
      throw new Error('Course data validation failed');
    }

    const createData = this.buildCreateData({
      ...data,
      zt: data.zt || 'add',
      gx_zt: data.gx_zt || null
    });

    this.logOperation('create', {
      kkh: data.kkh,
      xnxq: data.xnxq,
      kcmc: data.kcmc
    });

    return await super.create(createData as NewCourseRaw);
  }

  /**
   * 删除课程（重写以添加日志）
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    this.logOperation('delete', { id });

    return await super.delete(id);
  }

  /**
   * 执行事务化聚合操作
   */
  async executeTransactionalAggregation(
    xnxq: string
  ): Promise<DatabaseResult<{ count: number; duration: number }>> {
    const startTime = Date.now();
    this.validateXnxq(xnxq);
    this.logOperation('executeTransactionalAggregation', { xnxq });

    try {
      const operation = async (db: any) => {
        // 在事务中执行聚合操作
        const result = await db
          .selectFrom(this.tableName)
          .select((eb: any) => eb.fn.count('*').as('count'))
          .where('xnxq', '=', xnxq)
          .executeTakeFirstOrThrow();

        return {
          count: Number(result.count),
          duration: Date.now() - startTime
        };
      };

      return await this.databaseApi.transaction(operation);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logError(
        'executeTransactionalAggregation',
        new Error(errorMessage),
        { xnxq }
      );

      return {
        success: false,
        error: {
          type: 'TRANSACTION_ERROR' as any,
          message: `事务化聚合操作失败: ${errorMessage}`,
          timestamp: new Date(),
          retryable: true
        }
      };
    }
  }

  /**
   * 根据聚合任务ID查找对应的原始课程记录
   * 实现反向查询：从 juhe_renwu 表的记录反向查找对应的 u_jw_kcb_cur 原始记录
   */
  async findOriginalCoursesByJuheRenwuId(
    juheRenwuId: number
  ): Promise<DatabaseResult<CourseRaw[]>> {
    if (!juheRenwuId || juheRenwuId <= 0) {
      throw new Error('JuheRenwu ID must be a positive number');
    }

    try {
      this.logOperation('findOriginalCoursesByJuheRenwuId', { juheRenwuId });

      const operation = async (db: any) => {
        const query = sql`
          SELECT u.*
          FROM u_jw_kcb_cur u
          JOIN juhe_renwu j ON (
            u.kkh = j.kkh
            AND u.xnxq = j.xnxq
            AND u.jxz = j.jxz
            AND u.zc = j.zc
            AND LEFT(u.rq, 10) = j.rq
            AND u.kcmc = j.kcmc
            AND IFNULL(u.sfdk, '0') = IFNULL(j.sfdk, '0')
            AND FIND_IN_SET(u.jc, REPLACE(j.jc_s, '/', ',')) > 0
            AND (
              (j.sjd = 'am' AND u.jc < 5) OR
              (j.sjd = 'pm' AND u.jc >= 5)
            )
          )
          WHERE j.id = ${juheRenwuId}
          ORDER BY u.jc ASC
        `;

        const result = await query.execute(db);
        return result.rows;
      };

      const result = await this.databaseApi.executeQuery(operation, {
        connectionName: 'syncdb'
      });

      if (result.success) {
        this.logOperation('findOriginalCoursesByJuheRenwuId完成', {
          juheRenwuId,
          foundCount: result.data.length
        });
      }

      return result as DatabaseResult<CourseRaw[]>;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('findOriginalCoursesByJuheRenwuId失败', {
        juheRenwuId,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(`反向查询失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 批量反向查询：根据多个聚合任务ID查找对应的原始课程记录
   * 直接返回所有匹配的原始课程记录，不分组
   */
  async findOriginalCoursesByJuheRenwuIds(
    juheRenwuIds: number[]
  ): Promise<DatabaseResult<CourseRaw[]>> {
    if (!juheRenwuIds || juheRenwuIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // 验证所有ID都是正数
    for (const id of juheRenwuIds) {
      if (!id || id <= 0) {
        throw new Error('All JuheRenwu IDs must be positive numbers');
      }
    }

    try {
      this.logOperation('findOriginalCoursesByJuheRenwuIds', {
        idsCount: juheRenwuIds.length,
        sampleIds: juheRenwuIds.slice(0, 5) // 只记录前5个ID作为样本
      });

      const operation = async (db: any) => {
        const query = sql`
          SELECT u.*
          FROM u_jw_kcb_cur u
          JOIN juhe_renwu j ON (
            u.kkh = j.kkh
            AND u.xnxq = j.xnxq
            AND u.rq = j.rq
            AND FIND_IN_SET(u.jc, REPLACE(j.jc_s, '/', ',')) > 0
            AND (
              (j.sjd = 'am' AND u.jc < 5) OR
              (j.sjd = 'pm' AND u.jc >= 5)
            )
          )
          WHERE j.id IN (${sql.join(juheRenwuIds)})
          ORDER BY u.kkh, u.xnxq, u.jxz, u.zc, u.jc ASC
        `;

        const result = await query.execute(db);
        return result.rows;
      };

      const result = await this.databaseApi.executeQuery(operation, {
        connectionName: 'syncdb'
      });

      if (result.success) {
        this.logOperation('findOriginalCoursesByJuheRenwuIds完成', {
          requestedCount: juheRenwuIds.length,
          totalRecords: result.data.length
        });

        return {
          success: true,
          data: result.data as CourseRaw[]
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('findOriginalCoursesByJuheRenwuIds失败', {
        idsCount: juheRenwuIds.length,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(`批量反向查询失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 使用组合键（kkh, xnxq, jxz, zc, jc）更新单条记录的状态
   * 这个方法用于精确更新特定的课程记录
   */
  async updateGxZtByCompositeKey(
    kkh: string,
    xnxq: string,
    jxz: number,
    zc: number,
    jc: number,
    gxZt: string
  ): Promise<DatabaseResult<number>> {
    if (!kkh || !xnxq || jxz === null || zc === null || jc === null) {
      throw new Error('All composite key fields must be provided');
    }

    if (!gxZt) {
      throw new Error('Update status cannot be empty');
    }

    try {
      this.logOperation('updateGxZtByCompositeKey', {
        kkh,
        xnxq,
        jxz,
        zc,
        jc,
        gxZt
      });

      const updateTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '); // MySQL datetime format

      const operation = async (db: any) => {
        const result = await db
          .updateTable(this.tableName)
          .set({
            gx_zt: gxZt,
            gx_sj: updateTime
          })
          .where('kkh', '=', kkh)
          .where('xnxq', '=', xnxq)
          .where('jxz', '=', jxz)
          .where('zc', '=', zc)
          .where('jc', '=', jc)
          .where('gx_zt', 'is', null) // 只更新未处理的记录
          .executeTakeFirst();

        return result.numAffectedRows ? Number(result.numAffectedRows) : 0;
      };

      const result = await this.databaseApi.executeQuery(operation, {
        connectionName: 'syncdb'
      });

      if (result.success) {
        this.logOperation('updateGxZtByCompositeKey完成', {
          kkh,
          xnxq,
          jxz,
          zc,
          jc,
          gxZt,
          updatedCount: result.data
        });
      }

      return result as DatabaseResult<number>;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('updateGxZtByCompositeKey失败', {
        kkh,
        xnxq,
        jxz,
        zc,
        jc,
        gxZt,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(`组合键更新失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 根据聚合任务ID直接更新对应的原始课程记录状态
   * 使用一条 UPDATE ... JOIN SQL 语句完成查找和更新，性能最优
   */
  async updateOriginalCoursesByJuheRenwuIds(
    juheRenwuIds: number[],
    gxZt: string
  ): Promise<DatabaseResult<number>> {
    if (!juheRenwuIds || juheRenwuIds.length === 0) {
      return {
        success: true,
        data: 0
      };
    }

    // 验证所有ID都是正数
    for (const id of juheRenwuIds) {
      if (!id || id <= 0) {
        throw new Error('All JuheRenwu IDs must be positive numbers');
      }
    }

    if (!gxZt) {
      throw new Error('Update status cannot be empty');
    }

    try {
      this.logOperation('updateOriginalCoursesByJuheRenwuIds', {
        juheRenwuIdsCount: juheRenwuIds.length,
        gxZt,
        sampleIds: juheRenwuIds.slice(0, 5)
      });

      const updateTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '); // MySQL datetime format

      const operation = async (db: any) => {
        // 使用 UPDATE ... JOIN 一条SQL完成查找和更新
        const query = sql`
          UPDATE u_jw_kcb_cur u
          JOIN juhe_renwu j ON (
            u.kkh = j.kkh
            AND u.xnxq = j.xnxq
            AND u.rq = j.rq
            AND FIND_IN_SET(u.jc, REPLACE(j.jc_s, '/', ',')) > 0
            AND (
              (j.sjd = 'am' AND u.jc < 5) OR
              (j.sjd = 'pm' AND u.jc >= 5)
            )
          )
          SET
            u.gx_zt = ${gxZt},
            u.gx_sj = ${updateTime}
          WHERE j.id IN (${sql.join(juheRenwuIds)})
            AND u.gx_zt IS NULL
        `;

        const result = await query.execute(db);
        return result.numAffectedRows ? Number(result.numAffectedRows) : 0;
      };

      const result = await this.databaseApi.executeQuery(operation, {
        connectionName: 'syncdb'
      });

      if (result.success) {
        this.logOperation('updateOriginalCoursesByJuheRenwuIds完成', {
          juheRenwuIdsCount: juheRenwuIds.length,
          gxZt,
          updatedCount: result.data
        });
      }

      return result as DatabaseResult<number>;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('updateOriginalCoursesByJuheRenwuIds失败', {
        juheRenwuIdsCount: juheRenwuIds.length,
        gxZt,
        error: errorMessage
      });
      return {
        success: false,
        error: QueryError.create(`批量更新原始课程记录失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 通过事务同时更新juhe_renwu和u_jw_kcb_cur表的状态
   * 根据u_jw_kcb_cur的增量数据（gx_zt is null）匹配juhe_renwu记录并更新状态
   *
   * 业务规则：
   * - jc < 5 的记录匹配 sjd = 'am' 的juhe_renwu记录
   * - jc > 4 的记录匹配 sjd = 'pm' 的juhe_renwu记录
   * - juhe_renwu.gx_zt 更新为 '4'（软删除未处理）
   * - u_jw_kcb_cur.gx_zt 更新为 '2'（已处理）
   */
  async updateJuheRenwuByIncrementalData(xnxq?: string): Promise<
    DatabaseResult<{
      updatedJuheRenwu: number;
      updatedCourseRaw: number;
    }>
  > {
    try {
      this.logOperation('updateJuheRenwuByIncrementalData', { xnxq });

      const result = await DatabaseErrorHandler.execute(async () => {
        const db = this.writeConnection;

        // 使用事务确保数据一致性
        return await db.transaction().execute(async (trx) => {
          // 1. 更新 juhe_renwu 表
          const updateJuheRenwuQuery = sql`
            UPDATE juhe_renwu j
            SET gx_zt = '4', gx_sj = NOW()
            WHERE EXISTS (
                SELECT 1
                FROM u_jw_kcb_cur u
                WHERE u.gx_zt IS NULL
                  AND u.kkh IS NOT NULL
                  AND u.kkh != ''
                  AND u.rq IS NOT NULL
                  AND u.rq != ''
                  AND u.st IS NOT NULL
                  AND u.ed IS NOT NULL
                  AND u.kcmc IS NOT NULL
                  ${xnxq ? sql`AND u.xnxq = ${xnxq}` : sql``}
                  AND j.kkh = u.kkh
                  AND j.rq = u.rq
                  AND (
                      (CAST(u.jc AS UNSIGNED) < 5 AND j.sjd = 'am') OR
                      (CAST(u.jc AS UNSIGNED) > 4 AND j.sjd = 'pm')
                  )
            )
          `;

          const juheResult = await updateJuheRenwuQuery.execute(trx);

          // 2. 更新 u_jw_kcb_cur 表
          const updateCourseRawQuery = sql`
            UPDATE u_jw_kcb_cur u
            SET gx_zt = '2', gx_sj = NOW()
            WHERE u.gx_zt IS NULL
              AND u.kkh IS NOT NULL
              AND u.kkh != ''
              AND u.rq IS NOT NULL
              AND u.rq != ''
              AND u.st IS NOT NULL
              AND u.ed IS NOT NULL
              AND u.kcmc IS NOT NULL
              ${xnxq ? sql`AND u.xnxq = ${xnxq}` : sql``}
              AND EXISTS (
                  SELECT 1
                  FROM juhe_renwu j
                  WHERE j.kkh = u.kkh
                    AND j.rq = u.rq
                    AND j.gx_zt = '4'
                    AND (
                        (CAST(u.jc AS UNSIGNED) < 5 AND j.sjd = 'am') OR
                        (CAST(u.jc AS UNSIGNED) > 4 AND j.sjd = 'pm')
                    )
              )
          `;

          const courseResult = await updateCourseRawQuery.execute(trx);

          return {
            updatedJuheRenwu: Number(juheResult.numAffectedRows || 0),
            updatedCourseRaw: Number(courseResult.numAffectedRows || 0)
          };
        });
      }, 'update-juhe-renwu-and-course-raw-by-incremental-data');

      if (!result.success) {
        return result;
      }

      this.logOperation('updateJuheRenwuByIncrementalData完成', {
        xnxq,
        updatedJuheRenwu: result.data.updatedJuheRenwu,
        updatedCourseRaw: result.data.updatedCourseRaw
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('updateJuheRenwuByIncrementalData失败', {
        xnxq,
        error: errorMessage
      });

      return {
        success: false,
        error: QueryError.create(
          `通过增量数据更新juhe_renwu失败: ${errorMessage}`,
          'TRANSACTION: UPDATE juhe_renwu and u_jw_kcb_cur',
          xnxq ? [xnxq] : []
        )
      };
    }
  }

  /**
   * 获取增量数据详情用于分析和验证
   * 返回u_jw_kcb_cur中gx_zt为null的记录统计信息
   */
  async getIncrementalDataStats(xnxq: string): Promise<
    DatabaseResult<{
      totalCount: number;
      amCount: number; // jc < 5 的记录数
      pmCount: number; // jc > 4 的记录数
      distinctKkhs: string[];
    }>
  > {
    if (!xnxq) {
      throw new Error('学年学期不能为空');
    }

    try {
      this.logOperation('getIncrementalDataStats', { xnxq });

      const operation = async (db: any) => {
        // 获取总数和时段统计
        const statsQuery = sql`
          SELECT 
            COUNT(*) as totalCount,
            SUM(CASE WHEN CAST(jc AS UNSIGNED) < 5 THEN 1 ELSE 0 END) as amCount,
            SUM(CASE WHEN CAST(jc AS UNSIGNED) > 4 THEN 1 ELSE 0 END) as pmCount
          FROM u_jw_kcb_cur
          WHERE gx_zt IS NULL
            AND kkh IS NOT NULL 
            AND kkh != ''
            AND rq IS NOT NULL 
            AND rq != ''
            AND xnxq = ${xnxq}
            AND st is not null
            AND ed is not null
            AND kcmc is not null
        `;

        // 获取不重复的开课号
        const kkhQuery = sql`
          SELECT DISTINCT kkh
          FROM u_jw_kcb_cur
          WHERE gx_zt IS NULL
            AND kkh IS NOT NULL 
            AND kkh != ''
            AND rq IS NOT NULL 
            AND rq != ''
            AND xnxq = ${xnxq}
            AND st is not null
            AND ed is not null
            AND kcmc is not null
          ORDER BY kkh
        `;

        const [statsResult, kkhResult] = await Promise.all([
          statsQuery.execute(db),
          kkhQuery.execute(db)
        ]);

        const stats = statsResult.rows[0] as any;
        const kkhs = kkhResult.rows.map((row: any) => row.kkh);

        return {
          totalCount: parseInt(stats.totalCount) || 0,
          amCount: parseInt(stats.amCount) || 0,
          pmCount: parseInt(stats.pmCount) || 0,
          distinctKkhs: kkhs
        };
      };

      const result = await this.databaseApi.executeQuery(operation, {
        connectionName: 'syncdb'
      });

      if (!result.success) {
        return result;
      }

      const stats = result.data;

      this.logOperation('getIncrementalDataStats完成', {
        xnxq,
        stats
      });

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('getIncrementalDataStats失败', {
        xnxq,
        error: errorMessage
      });

      return {
        success: false,
        error: QueryError.create(
          `获取增量数据统计失败: ${errorMessage}`,
          'SELECT COUNT(*), SUM(...) FROM u_jw_kcb_cur WHERE gx_zt IS NULL...',
          [xnxq]
        )
      };
    }
  }

  /**
   * 验证增量数据更新结果
   * 检查有多少juhe_renwu记录被成功匹配和更新
   */
  async validateIncrementalUpdate(xnxq: string): Promise<
    DatabaseResult<{
      matchedJuheRenwu: number;
      updatedJuheRenwu: number;
      pendingIncrementalData: number;
    }>
  > {
    if (!xnxq) {
      throw new Error('学年学期不能为空');
    }

    try {
      this.logOperation('validateIncrementalUpdate', { xnxq });

      const operation = async (db: any) => {
        // 检查匹配的juhe_renwu记录数
        const matchQuery = sql`
          SELECT COUNT(DISTINCT j.id) as matchedCount
          FROM juhe_renwu j
          WHERE EXISTS (
              SELECT 1 
              FROM u_jw_kcb_cur u
              WHERE u.gx_zt IS NULL
                AND u.kkh IS NOT NULL 
                AND u.kkh != ''
                AND u.rq IS NOT NULL 
                AND u.rq != ''
                AND u.xnxq = ${xnxq}
                AND j.kkh = u.kkh
                AND j.rq = u.rq
                AND (
                    (CAST(u.jc AS UNSIGNED) < 5 AND j.sjd = 'am') OR
                    (CAST(u.jc AS UNSIGNED) > 4 AND j.sjd = 'pm')
                )
          )
        `;

        // 检查已更新的juhe_renwu记录数（gx_zt = '4'）
        const updatedQuery = sql`
          SELECT COUNT(DISTINCT j.id) as updatedCount
          FROM juhe_renwu j
          WHERE j.gx_zt = '4'
            AND EXISTS (
                SELECT 1 
                FROM u_jw_kcb_cur u
                WHERE u.gx_zt IS NULL
                  AND u.kkh IS NOT NULL 
                  AND u.kkh != ''
                  AND u.rq IS NOT NULL 
                  AND u.rq != ''
                  AND u.xnxq = ${xnxq}
                  AND j.kkh = u.kkh
                  AND j.rq = u.rq
                  AND (
                      (CAST(u.jc AS UNSIGNED) < 5 AND j.sjd = 'am') OR
                      (CAST(u.jc AS UNSIGNED) > 4 AND j.sjd = 'pm')
                  )
            )
        `;

        // 检查剩余待处理的增量数据
        const pendingQuery = sql`
          SELECT COUNT(*) as pendingCount
          FROM u_jw_kcb_cur
          WHERE gx_zt IS NULL
            AND kkh IS NOT NULL 
            AND kkh != ''
            AND rq IS NOT NULL 
            AND rq != ''
            AND xnxq = ${xnxq}
        `;

        const [matchResult, updatedResult, pendingResult] = await Promise.all([
          db.execute(matchQuery),
          db.execute(updatedQuery),
          db.execute(pendingQuery)
        ]);

        return {
          matchedJuheRenwu: parseInt(matchResult.rows[0].matchedCount) || 0,
          updatedJuheRenwu: parseInt(updatedResult.rows[0].updatedCount) || 0,
          pendingIncrementalData:
            parseInt(pendingResult.rows[0].pendingCount) || 0
        };
      };

      const result = await this.databaseApi.executeQuery(operation);

      if (!result.success) {
        return result;
      }

      const validation = result.data;

      this.logOperation('validateIncrementalUpdate完成', {
        xnxq,
        validation
      });

      return {
        success: true,
        data: validation
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('validateIncrementalUpdate失败', {
        xnxq,
        error: errorMessage
      });

      return {
        success: false,
        error: QueryError.create(
          `验证增量更新结果失败: ${errorMessage}`,
          'SELECT COUNT(...) validation queries',
          [xnxq]
        )
      };
    }
  }
}
