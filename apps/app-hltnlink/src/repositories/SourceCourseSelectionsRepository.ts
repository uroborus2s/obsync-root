// @wps/hltnlink 源选课Repository实现
// 基于AutoSaveRepository的源选课数据管理实现

import type { Logger } from '@stratix/core';
import {
  AutoSaveRepository,
  DatabaseErrorHandler,
  DatabaseResult
} from '@stratix/database';
import type { HltnlinkDatabase } from '../types/database.schema.js';

/**
 * 源选课Repository实现
 * 基于AutoSaveRepository，直接保存API原始数据
 */
export default class SourceCourseSelectionsRepository extends AutoSaveRepository<
  HltnlinkDatabase,
  'source_course_selections',
  any,
  any,
  any
> {
  protected readonly tableName = 'source_course_selections' as const;

  constructor(protected readonly logger: Logger) {
    super();
  }

  /**
   * 从API数据批量同步源选课数据
   * 直接保存原始API数据，不做转换
   */
  async syncSourceCourseSelectionsFromApi(
    apiData: any[]
  ): Promise<DatabaseResult<any>> {
    const startTime = Date.now();

    try {
      this.logger.info(
        `Starting sync of ${apiData.length} source course selection records`
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
        `Successfully synced ${apiData.length} source course selection records in ${totalDuration}ms, batch ID: ${batchResult.data.batchId}`
      );

      return DatabaseErrorHandler.success({
        success: true,
        batchId: batchResult.data.batchId,
        data: batchResult.data.data,
        count: apiData.length,
        duration: totalDuration
      });
    } catch (error) {
      this.logger.error(
        'Failed to sync source course selections from API:',
        error
      );
      return DatabaseErrorHandler.failure(error as any);
    }
  }

  /**
   * 根据批次ID查询源选课数据
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
        `Failed to find source course selections by batch ID ${batchId}:`,
        error
      );
      return DatabaseErrorHandler.failure(error as any);
    }
  }

  /**
   * 根据批次ID查询源选课数据
   */
  async findPermissionByKXH(
    batchId: string,
    semester: string,
    kxh: string
  ): Promise<DatabaseResult<any[]>> {
    try {
      const connection = await this.getQueryConnection();
      const result = await connection
        .selectFrom(this.tableName)
        .select('XSID')
        .distinct()
        .where('batch_id', '=', batchId)
        .where('KKXQM', '=', semester)
        .where('XKKH', '=', kxh)
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
