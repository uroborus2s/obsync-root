// @stratix/icasync 聚合任务仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { QueryError, sql } from '@stratix/database';
import type {
  JuheRenwu,
  JuheRenwuUpdate,
  NewJuheRenwu
} from '../types/database.js';
import { BaseIcasyncRepository } from './base/BaseIcasyncRepository.js';

// 依赖注入装饰器

/**
 * 聚合任务仓储接口
 */
export interface IJuheRenwuRepository {
  // 基础操作
  findByIdNullable(id: number): Promise<DatabaseResult<JuheRenwu | null>>;
  create(data: NewJuheRenwu): Promise<DatabaseResult<JuheRenwu>>;
  updateNullable(
    id: number,
    data: JuheRenwuUpdate
  ): Promise<DatabaseResult<JuheRenwu | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;

  // 业务查询方法
  findByKkh(kkh: string): Promise<DatabaseResult<JuheRenwu[]>>;
  findByKkhAndDate(
    kkh: string,
    rq: string
  ): Promise<DatabaseResult<JuheRenwu[]>>;
  findByGxZt(gxZt: string): Promise<DatabaseResult<JuheRenwu[]>>;
  findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<DatabaseResult<JuheRenwu[]>>;
  findByTeacher(teacherCode: string): Promise<DatabaseResult<JuheRenwu[]>>;
  findByXnxq(xnxq: string): Promise<DatabaseResult<JuheRenwu[]>>;

  // 同步状态管理
  findPendingTasks(): Promise<DatabaseResult<JuheRenwu[]>>;
  findProcessedTasks(): Promise<DatabaseResult<JuheRenwu[]>>;
  findSoftDeletedTasks(): Promise<DatabaseResult<JuheRenwu[]>>;
  updateSyncStatus(
    id: number,
    gxZt: string
  ): Promise<DatabaseResult<JuheRenwu | null>>;
  updateSyncStatusBatch(
    ids: number[],
    gxZt: string
  ): Promise<DatabaseResult<number>>;

  // 批量操作
  createTasksBatch(tasks: NewJuheRenwu[]): Promise<DatabaseResult<JuheRenwu[]>>;
  softDeleteByKkh(kkh: string): Promise<DatabaseResult<number>>;
  softDeleteByKkhAndDate(
    kkh: string,
    rq: string
  ): Promise<DatabaseResult<number>>;
  markAsProcessed(ids: number[]): Promise<DatabaseResult<number>>;

  // 查询操作
  findTasksForSync(limit?: number): Promise<DatabaseResult<JuheRenwu[]>>;
  findTasksForCalendar(
    calendarId: string
  ): Promise<DatabaseResult<JuheRenwu[]>>;
  findConflictingTasks(
    kkh: string,
    rq: string,
    timeSlot: string
  ): Promise<DatabaseResult<JuheRenwu[]>>;
  findTasksByTimeSlot(
    rq: string,
    timeSlot: string
  ): Promise<DatabaseResult<JuheRenwu[]>>;

  // 统计查询
  countByKkh(kkh: string): Promise<DatabaseResult<number>>;
  countByXnxq(xnxq: string): Promise<DatabaseResult<number>>;
  countByGxZt(gxZt: string): Promise<DatabaseResult<number>>;
  countByDateRange(
    startDate: string,
    endDate: string
  ): Promise<DatabaseResult<number>>;
  countPendingTasks(): Promise<DatabaseResult<number>>;

  // 数据聚合
  aggregateFromRawCourses(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<JuheRenwu[]>>;

  // 清理操作
  deleteByKkh(kkh: string): Promise<DatabaseResult<number>>;
  deleteSoftDeletedTasks(): Promise<DatabaseResult<number>>;
  deleteOldTasks(daysOld: number): Promise<DatabaseResult<number>>;
  clearAllTasks(): Promise<DatabaseResult<number>>;

  // SQL 聚合操作
  insertAggregatedDataBatch(
    aggregatedData: any[]
  ): Promise<DatabaseResult<number>>;

  // 课程获取方法
  findDistinctCourses(xnxq: string): Promise<DatabaseResult<string[]>>;
  findCoursesForCalendarCreation(
    xnxq: string
  ): Promise<DatabaseResult<JuheRenwu[]>>;
}

/**
 * 聚合任务仓储实现
 * 访问现有的 juhe_renwu 表
 */
export default class JuheRenwuRepository
  extends BaseIcasyncRepository<
    'juhe_renwu',
    JuheRenwu,
    NewJuheRenwu,
    JuheRenwuUpdate
  >
  implements IJuheRenwuRepository
{
  protected readonly tableName = 'juhe_renwu' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super('syncdb');
  }

  /**
   * 根据开课号查找聚合任务
   */
  async findByKkh(kkh: string): Promise<DatabaseResult<JuheRenwu[]>> {
    this.validateKkh(kkh);

    return await this.findMany((qb: any) => qb.where('kkh', '=', kkh), {
      orderBy: 'rq',
      order: 'asc'
    });
  }

  /**
   * 根据开课号和日期查找聚合任务
   */
  async findByKkhAndDate(
    kkh: string,
    rq: string
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    this.validateKkh(kkh);

    if (!rq) {
      throw new Error('Date cannot be empty');
    }

    return await this.findMany(
      (eb: any) => eb.and([eb('kkh', '=', kkh), eb('rq', '=', rq)]),
      { orderBy: { field: 'sj_f', direction: 'asc' } }
    );
  }

  /**
   * 根据更新状态查找聚合任务
   */
  async findByGxZt(gxZt: string): Promise<DatabaseResult<JuheRenwu[]>> {
    if (!gxZt) {
      throw new Error('Update status cannot be empty');
    }

    return await this.findMany((qb: any) => qb.where('gx_zt', '=', gxZt), {
      orderBy: 'gx_sj',
      order: 'desc'
    });
  }

  /**
   * 根据日期范围查找聚合任务
   */
  async findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date cannot be empty');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    return await this.findMany(
      (eb: any) => eb.and([eb('rq', '>=', startDate), eb('rq', '<=', endDate)]),
      { orderBy: { field: 'rq', direction: 'asc' } }
    );
  }

  /**
   * 根据教师工号查找聚合任务
   */
  async findByTeacher(
    teacherCode: string
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    if (!teacherCode) {
      throw new Error('Teacher code cannot be empty');
    }

    return await this.findMany(
      (qb: any) => qb.where('gh_s', 'like', `%${teacherCode}%`),
      {
        orderBy: 'rq',
        order: 'desc'
      }
    );
  }

  /**
   * 查找待处理的任务
   */
  async findPendingTasks(): Promise<DatabaseResult<JuheRenwu[]>> {
    return await this.findByGxZt('0'); // 0 = 未处理
  }

  /**
   * 查找已处理的任务
   */
  async findProcessedTasks(): Promise<DatabaseResult<JuheRenwu[]>> {
    return await this.findMany(
      (qb: any) => qb.where('gx_zt', 'in', ['1', '2']), // 1 = 教师日历已推送, 2 = 学生日历已推送
      { orderBy: { field: 'gx_sj', direction: 'desc' } }
    );
  }

  /**
   * 查找软删除的任务
   */
  async findSoftDeletedTasks(): Promise<DatabaseResult<JuheRenwu[]>> {
    return await this.findMany(
      (qb: any) => qb.where('gx_zt', 'in', ['3', '4']), // 3 = 软删除未处理, 4 = 软删除处理完毕
      { orderBy: { field: 'gx_sj', direction: 'desc' } }
    );
  }

  /**
   * 更新同步状态
   */
  async updateSyncStatus(
    id: number,
    gxZt: string
  ): Promise<DatabaseResult<JuheRenwu | null>> {
    if (!gxZt) {
      throw new Error('Update status cannot be empty');
    }

    const updateData = this.buildUpdateData({
      gx_zt: gxZt
    });

    return await this.updateNullable(id, updateData as JuheRenwuUpdate);
  }

  /**
   * 批量更新同步状态
   */
  async updateSyncStatusBatch(
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
      updateData as JuheRenwuUpdate
    );
  }

  /**
   * 批量创建聚合任务
   */
  async createTasksBatch(
    tasks: NewJuheRenwu[]
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    if (!tasks || tasks.length === 0) {
      throw new Error('Tasks array cannot be empty');
    }

    // 验证每个任务数据
    for (const task of tasks) {
      this.validateRequired(task, ['kkh', 'rq', 'jc_s', 'sj_f', 'sj_t']);
      if (task.kkh) {
        this.validateKkh(task.kkh);
      }

      if (!task.rq) {
        throw new Error('Date cannot be empty');
      }

      if (!task.sj_f || !task.sj_t) {
        throw new Error('Start time and end time cannot be empty');
      }
    }

    return await this.createMany(tasks);
  }

  /**
   * 根据开课号软删除任务
   */
  async softDeleteByKkh(kkh: string): Promise<DatabaseResult<number>> {
    this.validateKkh(kkh);

    const updateData = this.buildUpdateData({
      gx_zt: '3' // 3 = 软删除未处理
    });

    return await this.updateMany(
      (qb: any) => qb.where('kkh', '=', kkh),
      updateData as JuheRenwuUpdate
    );
  }

  /**
   * 根据开课号和日期软删除任务
   */
  async softDeleteByKkhAndDate(
    kkh: string,
    rq: string
  ): Promise<DatabaseResult<number>> {
    this.validateKkh(kkh);

    if (!rq) {
      throw new Error('Date cannot be empty');
    }

    const updateData = this.buildUpdateData({
      gx_zt: '3' // 3 = 软删除未处理
    });

    return await this.updateMany(
      (eb: any) => eb.and([eb('kkh', '=', kkh), eb('rq', '=', rq)]),
      updateData as JuheRenwuUpdate
    );
  }

  /**
   * 标记为已处理
   */
  async markAsProcessed(ids: number[]): Promise<DatabaseResult<number>> {
    return await this.updateSyncStatusBatch(ids, '2'); // 2 = 学生日历已推送
  }

  /**
   * 查找需要同步的任务
   */
  async findTasksForSync(
    limit: number = 100
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    return await this.findMany(
      (qb: any) => qb.where('gx_zt', '=', '0'), // 0 = 未处理
      { orderBy: { field: 'rq', direction: 'asc' }, limit }
    );
  }

  /**
   * 查找指定日历的任务
   */
  async findTasksForCalendar(
    calendarId: string
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    // 这个方法需要与日历映射表关联查询
    // 由于涉及跨表查询，这里先返回空数组
    // 实际实现需要在服务层完成
    // TODO: 实现与calendar_mapping表的关联查询
    console.log(`Finding tasks for calendar: ${calendarId}`);
    return {
      success: true,
      data: []
    };
  }

  /**
   * 查找冲突的任务
   */
  async findConflictingTasks(
    kkh: string,
    rq: string,
    timeSlot: string
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    this.validateKkh(kkh);

    if (!rq || !timeSlot) {
      throw new Error('Date and time slot cannot be empty');
    }

    return await this.findMany(
      (eb: any) =>
        eb.and([
          eb('kkh', '!=', kkh),
          eb('rq', '=', rq),
          eb('jc_s', '=', timeSlot)
        ]),
      { orderBy: { field: 'sj_f', direction: 'asc' } }
    );
  }

  /**
   * 根据时间段查找任务
   */
  async findTasksByTimeSlot(
    rq: string,
    timeSlot: string
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    if (!rq || !timeSlot) {
      throw new Error('Date and time slot cannot be empty');
    }

    return await this.findMany(
      (eb: any) => eb.and([eb('rq', '=', rq), eb('jc_s', '=', timeSlot)]),
      { orderBy: { field: 'kkh', direction: 'asc' } }
    );
  }

  /**
   * 统计指定开课号的任务数量
   */
  async countByKkh(kkh: string): Promise<DatabaseResult<number>> {
    this.validateKkh(kkh);

    return await this.count((qb: any) => qb.where('kkh', '=', kkh));
  }

  /**
   * 统计指定学年学期的任务数量
   */
  async countByXnxq(xnxq: string): Promise<DatabaseResult<number>> {
    this.validateXnxq(xnxq);

    return await this.count((qb: any) => qb.where('xnxq', '=', xnxq));
  }

  /**
   * 统计指定状态的任务数量
   */
  async countByGxZt(gxZt: string): Promise<DatabaseResult<number>> {
    if (!gxZt) {
      throw new Error('Update status cannot be empty');
    }

    return await this.count((qb: any) => qb.where('gx_zt', '=', gxZt));
  }

  /**
   * 统计指定日期范围的任务数量
   */
  async countByDateRange(
    startDate: string,
    endDate: string
  ): Promise<DatabaseResult<number>> {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date cannot be empty');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    // 这里需要使用范围查询，BaseRepository可能不直接支持
    // 先返回简单实现
    return {
      success: true,
      data: 0
    };
  }

  /**
   * 统计待处理任务数量
   */
  async countPendingTasks(): Promise<DatabaseResult<number>> {
    return await this.countByGxZt('0');
  }

  /**
   * 从原始课程数据聚合
   */
  async aggregateFromRawCourses(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    // 这个方法需要复杂的聚合逻辑，涉及从u_jw_kcb_cur表读取数据并聚合
    // 由于涉及复杂的业务逻辑，这里先返回空数组
    // 实际实现需要在服务层完成
    this.validateKkh(kkh);
    this.validateXnxq(xnxq);

    return {
      success: true,
      data: []
    };
  }

  /**
   * 删除指定开课号的所有任务
   */
  async deleteByKkh(kkh: string): Promise<DatabaseResult<number>> {
    this.validateKkh(kkh);

    return await this.deleteMany((qb: any) => qb.where('kkh', '=', kkh));
  }

  /**
   * 删除软删除状态的任务
   */
  async deleteSoftDeletedTasks(): Promise<DatabaseResult<number>> {
    return await this.deleteMany((qb: any) => qb.where('gx_zt', '=', '4')); // 4 = 软删除处理完毕
  }

  /**
   * 删除旧任务
   */
  async deleteOldTasks(daysOld: number): Promise<DatabaseResult<number>> {
    if (daysOld <= 0) {
      throw new Error('Days old must be positive');
    }

    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    return await this.deleteMany({
      created_at: cutoffDate
    } as any); // 这里需要特殊处理日期比较
  }

  /**
   * 创建聚合任务（重写以添加验证）
   */
  async create(data: NewJuheRenwu): Promise<DatabaseResult<JuheRenwu>> {
    // 验证必需字段
    this.validateRequired(data, ['kkh', 'rq', 'jc_s', 'sj_f', 'sj_t']);

    // 验证字段格式
    if (data.kkh) {
      this.validateKkh(data.kkh);
    }

    if (!data.rq) {
      throw new Error('Date cannot be empty');
    }

    if (!data.sj_f || !data.sj_t) {
      throw new Error('Start time and end time cannot be empty');
    }

    const createData = this.buildCreateData({
      ...data,
      gx_zt: data.gx_zt || '0' // 默认为未处理
    });

    this.logOperation('create', {
      kkh: data.kkh,
      rq: data.rq,
      jc_s: data.jc_s
    });

    return await super.create(createData as NewJuheRenwu);
  }

  /**
   * 删除聚合任务（重写以添加日志）
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    this.logOperation('delete', { id });

    return await super.delete(id);
  }

  /**
   * 清空所有聚合任务
   * 用于全量同步前的数据清理
   * 使用 TRUNCATE TABLE 快速清空表并重置自增ID
   */
  async clearAllTasks(): Promise<DatabaseResult<number>> {
    this.logOperation('clearAll', {});

    const operation = async (db: any) => {
      // 先获取当前表的行数（可选，用于日志记录）
      const countResult = await db
        .selectFrom(this.tableName)
        .select(db.fn.count('id').as('total'))
        .executeTakeFirst();

      const rowCount = Number(countResult?.total || 0);

      // 使用 TRUNCATE TABLE 快速清空表
      // 优势：比 DELETE 更快，重置自增ID，释放表空间
      await sql`TRUNCATE TABLE juhe_renwu`.execute(db);

      this.logger.info(`Truncated table juhe_renwu`, {
        previousRowCount: rowCount,
        operation: 'TRUNCATE'
      });

      return rowCount; // 返回清空前的行数
    };

    return await this.databaseApi.executeQuery(operation, {
      connectionName: 'syncdb'
    });
  }

  /**
   * 批量插入聚合数据
   * 直接从 SQL 聚合结果插入到 juhe_renwu 表
   */
  async insertAggregatedDataBatch(
    aggregatedData: any[]
  ): Promise<DatabaseResult<number>> {
    if (!aggregatedData || aggregatedData.length === 0) {
      return {
        success: true,
        data: 0
      };
    }

    try {
      const operation = async (db: any) => {
        // 转换聚合数据为 NewJuheRenwu 格式，并处理日期格式
        const juheRenwuData = aggregatedData.map((item) => {
          // 确保日期格式正确（只保留前10位：YYYY-MM-DD）
          let formattedDate = item.rq;
          if (formattedDate && formattedDate.length > 10) {
            formattedDate = formattedDate.substring(0, 10);
          }

          return {
            kkh: item.kkh,
            xnxq: item.xnxq,
            jxz: item.jxz,
            zc: item.zc,
            rq: formattedDate,
            kcmc: item.kcmc,
            sfdk: item.sfdk || '0',
            jc_s: item.jc_s,
            room_s: item.room_s,
            gh_s: item.gh_s,
            xm_s: item.xm_s,
            lq: item.lq,
            sj_f: item.sj_f,
            sj_t: item.sj_t,
            sjd: item.sjd,
            gx_zt: '0' // 默认为未处理
          };
        });

        const result = await db
          .insertInto(this.tableName)
          .values(juheRenwuData)
          .execute();

        return Number(result.numInsertedRows || juheRenwuData.length);
      };

      const result = await this.databaseApi.executeQuery(operation, {
        readonly: false,
        connectionName: 'syncdb'
      });

      if (result.success) {
        this.logOperation('批量插入聚合数据', {
          insertedCount: result.data,
          totalData: aggregatedData.length
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('批量插入聚合数据失败', {
        error: errorMessage,
        dataCount: aggregatedData.length
      });
      return {
        success: false,
        error: QueryError.create(errorMessage)
      };
    }
  }

  /**
   * 根据学年学期查询任务
   */
  async findByXnxq(xnxq: string): Promise<DatabaseResult<JuheRenwu[]>> {
    this.validateXnxq(xnxq);
    this.logOperation('findByXnxq', { xnxq });

    const operation = async (db: any) => {
      return await db
        .selectFrom(this.tableName)
        .selectAll()
        .where('xnxq', '=', xnxq)
        .orderBy('rq', 'asc')
        .orderBy('kssj', 'asc')
        .execute();
    };

    return await this.databaseApi.executeQuery(operation, {
      connectionName: 'syncdb'
    });
  }

  /**
   * 获取指定学期的所有不重复课程号
   * 用于日历创建时统计课程数量
   */
  async findDistinctCourses(xnxq: string): Promise<DatabaseResult<string[]>> {
    this.validateXnxq(xnxq);
    this.logOperation('findDistinctCourses', { xnxq });

    try {
      const result = await this.findByXnxq(xnxq);
      if (!result.success) {
        return result as any;
      }

      // 手动去重，过滤掉null值
      const distinctKkhs = [
        ...new Set(
          result.data
            .map((task) => task.kkh)
            .filter((kkh): kkh is string => kkh !== null)
        )
      ];

      this.logOperation('findDistinctCourses完成', {
        xnxq,
        distinctCount: distinctKkhs.length,
        totalTasks: result.data.length
      });

      return {
        success: true,
        data: distinctKkhs
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logOperation('findDistinctCourses失败', {
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
   * 获取用于日历创建的课程数据
   * 只返回未处理的聚合任务（gx_zt = '0' 或 NULL）
   */
  async findCoursesForCalendarCreation(
    xnxq: string
  ): Promise<DatabaseResult<JuheRenwu[]>> {
    this.validateXnxq(xnxq);
    this.logOperation('findCoursesForCalendarCreation', { xnxq });

    const operation = async (db: any) => {
      return await db
        .selectFrom(this.tableName)
        .selectAll()
        .where('xnxq', '=', xnxq)
        .where((eb: any) =>
          eb.or([
            eb('gx_zt', '=', '0'), // 未处理
            eb('gx_zt', 'is', null) // 空值
          ])
        )
        .orderBy('kkh', 'asc')
        .orderBy('rq', 'asc')
        .orderBy('sj_f', 'asc')
        .execute();
    };

    const result = await this.databaseApi.executeQuery(operation, {
      connectionName: 'syncdb'
    });

    if (result.success) {
      this.logOperation('findCoursesForCalendarCreation完成', {
        xnxq,
        courseCount: result.data.length
      });
    }

    return result;
  }
}
