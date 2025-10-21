// @wps/hltnlink 源课程Repository实现
// 基于AutoSaveRepository的源课程数据管理实现

import type { Logger } from '@stratix/core';
import {
  AutoSaveRepository,
  DatabaseErrorHandler,
  DatabaseResult
} from '@stratix/database';
import type { HltnlinkDatabase } from '../types/database.schema.js';

/**
 * 源课程Repository实现
 * 基于AutoSaveRepository，直接保存API原始数据
 */
export default class SourceCourseRepository extends AutoSaveRepository<
  HltnlinkDatabase,
  'source_courses',
  any,
  any,
  any
> {
  protected readonly tableName = 'source_courses' as const;

  constructor(protected readonly logger: Logger) {
    super();
  }

  /**
   * 从API数据批量同步源课程数据
   * 直接保存原始API数据，不做转换
   */
  async syncSourceCoursesFromApi(apiData: any[]): Promise<DatabaseResult<any>> {
    const startTime = Date.now();

    try {
      this.logger.info(
        `Starting sync of ${apiData.length} source course records`
      );

      // 处理空数据的情况
      if (apiData.length === 0) {
        this.logger.info('No data to sync');
        return DatabaseErrorHandler.success({
          success: true,
          batchId: '',
          data: [],
          count: 0,
          duration: Date.now() - startTime
        });
      }

      // 直接调用AutoSaveRepository的createTableWithBatch方法
      const batchResult = await this.createTableWithBatch(apiData);

      if (!batchResult.success) {
        return DatabaseErrorHandler.failure(batchResult.error);
      }

      const totalDuration = Date.now() - startTime;

      this.logger.info(
        `Successfully synced ${apiData.length} source course records in ${totalDuration}ms, batch ID: ${batchResult.data.batchId}`
      );

      return DatabaseErrorHandler.success({
        success: true,
        batchId: batchResult.data.batchId,
        data: batchResult.data.data,
        count: apiData.length,
        duration: totalDuration
      });
    } catch (error) {
      this.logger.error('Failed to sync source courses from API:', error);
      return DatabaseErrorHandler.failure(error as any);
    }
  }

  /**
   * 根据批次ID查询源课程数据
   */
  async findByBatchId(batchId: string): Promise<DatabaseResult<any[]>> {
    try {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('batch_id', '=', batchId)
        .execute();

      return DatabaseErrorHandler.success(result);
    } catch (error) {
      this.logger.error(
        `Failed to find source courses by batch ID ${batchId}:`,
        error
      );
      return DatabaseErrorHandler.failure(error as any);
    }
  }

  /**
   * 根据批次ID和学期查询唯一的课程序号和课程名称
   * 用于日历创建功能
   * @param batchId 批次ID
   * @param semester 学期码（KKXQM）
   * @returns 唯一的课程序号和名称列表
   */
  async findCourseSequencesBySemester(
    batchId: string,
    semester: string
  ): Promise<
    DatabaseResult<
      Array<{
        KXH: string;
        KCMC: string;
      }>
    >
  > {
    try {
      this.logger.debug(
        `Querying course sequences for batch ${batchId}, semester ${semester}`
      );

      const connection = await this.getQueryConnection();

      // 查询所有字段 - AutoSaveRepository保留了API原始字段名
      const allResults = await connection
        .selectFrom(this.tableName)
        .select(['KXH', 'KCMC'])
        .distinct()
        .where('batch_id', '=', batchId)
        .where('KKXQM', '=', semester)
        .execute();

      // 转换为期望的返回格式
      const formattedResult = (allResults as any[]).map((course: any) => ({
        KXH: course.KXH || '',
        KCMC: course.KCMC || '',
        JSXM: '', // 这个查询只返回KXH和KCMC，其他字段为空
        JSGH: '',
        KCH: '',
        KKXQM: semester
      }));

      this.logger.info(
        `Found ${formattedResult.length} unique course sequences for semester ${semester}`
      );

      return DatabaseErrorHandler.success(formattedResult);
    } catch (error) {
      this.logger.error(
        `Failed to find course sequences by semester for batch ${batchId}, semester ${semester}:`,
        error
      );
      return DatabaseErrorHandler.failure(error as any);
    }
  }

  /**
   * 根据批次ID查询源选课数据
   */
  async findSchedulesByKXH(
    batchId: string,
    semester: string,
    kxh: string
  ): Promise<DatabaseResult<any[]>> {
    try {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .selectAll()
        .where('batch_id', '=', batchId)
        .where('KKXQM', '=', semester)
        .where('KXH', '=', kxh)
        .where('JSH', 'not like', '%STOP%')
        .execute();

      return DatabaseErrorHandler.success(result);
    } catch (error) {
      this.logger.error(
        `Failed to find source course selections by batch ID ${batchId}:`,
        error
      );
      return DatabaseErrorHandler.failure(error as any);
    }
  }
}
