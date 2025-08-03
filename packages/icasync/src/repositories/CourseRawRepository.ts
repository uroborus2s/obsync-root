// @stratix/icasync 原始课程数据仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { QueryError } from '@stratix/database';
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
  executeAggregationQuery(xnxq: string): Promise<DatabaseResult<any[]>>;
  aggregateCourseDataWithSql(
    xnxq: string,
    juheRenwuRepository: any
  ): Promise<DatabaseResult<{ count: number; aggregatedData: any[] }>>;

  // 事务化聚合操作
  executeTransactionalAggregation(
    xnxq: string
  ): Promise<DatabaseResult<{ count: number; duration: number }>>;
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

    return await this.findMany(
      (eb: any) => eb.and([eb('kkh', '=', kkh), eb('xnxq', '=', xnxq)]),
      { orderBy: { field: 'zc', direction: 'asc' } }
    );
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

    return await this.findMany(
      (eb: any) => eb.and([eb('kkh', '=', kkh), eb('rq', 'like', `${rq}%`)]),
      { orderBy: { field: 'st', direction: 'asc' } }
    );
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
    return await this.findMany(
      (eb: any) => eb.and([eb('zt', '=', changeType), eb('gx_zt', 'is', null)]),
      { orderBy: { field: 'gx_sj', direction: 'desc' } }
    );
  }

  /**
   * 查找指定时间后的变更
   */
  async findChangesAfterTime(
    timestamp: Date
  ): Promise<DatabaseResult<CourseRaw[]>> {
    return await this.findMany(
      (eb: any) =>
        eb.and([eb('gx_sj', '>', timestamp), eb('gx_zt', 'is', null)]),
      { orderBy: { field: 'gx_sj', direction: 'desc' } }
    );
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

    const updateData = this.buildUpdateData({
      gx_zt: gxZt
    });

    return await this.updateMany(
      { id: ids } as any,
      updateData as CourseRawUpdate
    );
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

    return await this.findMany(
      (qb: any) => qb.where('ghs', 'like', `%${teacherCode}%`),
      {
        orderBy: 'xnxq',
        order: 'desc'
      }
    );
  }

  /**
   * 根据教室查找课程
   */
  async findCoursesByRoom(room: string): Promise<DatabaseResult<CourseRaw[]>> {
    if (!room) {
      throw new Error('Room cannot be empty');
    }

    return await this.findMany((qb: any) => qb.where('room', '=', room), {
      orderBy: 'zc',
      order: 'asc'
    });
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

    return await this.findMany(
      (eb: any) => eb.and([eb('zc', '=', zc), eb('jc', '=', jc)]),
      { orderBy: { field: 'kkh', direction: 'asc' } }
    );
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

    return await this.findMany(
      (eb: any) => eb.and([eb('kkh', '=', kkh), eb('rq', '=', rq)]),
      { orderBy: { field: 'jc', direction: 'asc' } }
    );
  }

  /**
   * 执行原生 SQL 聚合查询
   * 使用数据库层面的 GROUP BY 和聚合函数来提升性能
   */
  async executeAggregationQuery(xnxq: string): Promise<DatabaseResult<any[]>> {
    this.validateXnxq(xnxq);

    try {
      // 使用 BaseRepository 的 advancedQuery 方法执行 Kysely 聚合查询
      const result = await this.advancedQuery(async (db) => {
        // 使用 Kysely 的查询构建器进行聚合查询
        return await (db as any)
          .selectFrom('u_jw_kcb_cur')
          .select([
            'kkh',
            'xnxq',
            'kcmc',
            'rq',
            'ghs',
            'room',
            'zc',
            // 使用 SQL 函数进行聚合
            (eb: any) => eb.fn.min('jc').as('jc_min'),
            (eb: any) => eb.fn.max('jc').as('jc_max'),
            (eb: any) => eb.fn.count('*').as('course_count'),
            // 计算时间段
            (eb: any) =>
              eb
                .case()
                .when(eb.fn.min('jc'), '<=', 2)
                .then('上午')
                .when(eb.fn.min('jc'), '<=', 4)
                .then('下午')
                .else('晚上')
                .end()
                .as('sjd'),
            // 聚合开始和结束时间
            (eb: any) => eb.fn.min('st').as('sj_f'),
            (eb: any) => eb.fn.max('et').as('sj_z'),
            // 其他聚合字段 - 使用 MySQL 的 GROUP_CONCAT
            (eb: any) =>
              eb
                .fn('GROUP_CONCAT', [
                  eb.ref('jc'),
                  eb.lit(' ORDER BY '),
                  eb.ref('jc')
                ])
                .as('jc_list'),
            (eb: any) =>
              eb
                .fn('GROUP_CONCAT', [
                  eb.ref('st'),
                  eb.lit(' ORDER BY '),
                  eb.ref('jc')
                ])
                .as('st_list'),
            (eb: any) =>
              eb
                .fn('GROUP_CONCAT', [
                  eb.ref('et'),
                  eb.lit(' ORDER BY '),
                  eb.ref('jc')
                ])
                .as('et_list')
          ])
          .where('xnxq', '=', xnxq)
          .where('gx_zt', 'is', null)
          .groupBy(['kkh', 'rq', 'ghs', 'room', 'zc'])
          .having((eb: any) => eb.fn.count('*'), '>', 0)
          .orderBy(['rq', 'sj_f'])
          .execute();
      });

      if (result.success) {
        this.logOperation('执行聚合查询', {
          xnxq,
          aggregatedCount: result.data.length
        });
        return {
          success: true,
          data: result.data
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
      this.logOperation('聚合查询失败', { xnxq, error: errorMessage });
      return {
        success: false,
        error: QueryError.create(`聚合查询失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 执行完整的课程数据聚合操作
   * 包括 SQL 聚合查询、数据转换和批量插入到聚合任务表
   * Repository 层负责所有数据访问逻辑
   */
  async aggregateCourseDataWithSql(
    xnxq: string,
    juheRenwuRepository: any
  ): Promise<DatabaseResult<{ count: number; aggregatedData: any[] }>> {
    this.validateXnxq(xnxq);

    try {
      // 1. 执行原生 SQL 聚合查询
      const aggregationResult = await this.executeAggregationQuery(xnxq);

      if (!aggregationResult.success) {
        return {
          success: false,
          error: aggregationResult.error
        };
      }

      const aggregatedCourses = aggregationResult.data;
      this.logOperation('SQL 聚合查询完成', {
        xnxq,
        aggregatedCount: aggregatedCourses.length
      });

      // 2. 转换聚合结果为 JuheRenwu 格式并批量插入
      const insertResults = [];
      let insertedCount = 0;

      for (const course of aggregatedCourses) {
        try {
          // 转换为 JuheRenwu 格式
          const juheRenwuData = this.transformToJuheRenwuFormat(course);

          const result = await juheRenwuRepository.create(juheRenwuData);
          if (result.success) {
            insertedCount++;
            insertResults.push(result.data);
          } else {
            this.logOperation('插入聚合数据失败', {
              course: course.kkh,
              error: result.error
            });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logOperation('转换聚合数据失败', {
            course: course.kkh,
            error: errorMessage
          });
        }
      }

      this.logOperation('批量插入聚合数据完成', {
        xnxq,
        totalAggregated: aggregatedCourses.length,
        successfullyInserted: insertedCount
      });

      return {
        success: true,
        data: {
          count: insertedCount,
          aggregatedData: insertResults
        }
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('聚合课程数据失败', { xnxq, error: errorMessage });
      return {
        success: false,
        error: QueryError.create(`聚合课程数据失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 转换聚合查询结果为 JuheRenwu 格式
   * Repository 层负责数据格式转换逻辑
   */
  private transformToJuheRenwuFormat(course: any): any {
    return {
      kkh: course.kkh,
      xnxq: course.xnxq,
      kcmc: course.kcmc,
      rq: course.rq,
      ghs: course.ghs,
      room: course.room,
      zc: course.zc,
      jc: course.jc_min, // 使用最小节次
      jc_s: course.jc_min,
      jc_z: course.jc_max,
      sjd: course.sjd,
      sj_f: course.sj_f,
      sj_z: course.sj_z,
      lq: null,
      gx_sj: new Date().toISOString(),
      gx_zt: '0', // 未处理状态
      sfdk: '0',
      // 扩展字段：保存聚合统计信息
      course_count: course.course_count,
      jc_list: course.jc_list,
      st_list: course.st_list,
      et_list: course.et_list
    };
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

    return await this.count((eb: any) =>
      eb.and([eb('kkh', '=', kkh), eb('xnxq', '=', xnxq)])
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
    return await this.count((eb: any) =>
      eb.and([eb('zt', '=', changeType), eb('gx_zt', 'is', null)])
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
    this.validateRequired(data, ['kkh', 'xnxq', 'jxz', 'zc', 'jc', 'kcmc']);

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
}
