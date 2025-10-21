// @wps/hltnlink 源数据同步服务
// 负责从外部API获取数据并同步到数据库

import { RESOLVER, type AwilixContainer, type Logger } from '@stratix/core';
import type { DatabaseResult } from '@stratix/database';
import axios, { type AxiosInstance } from 'axios';
import { getUnixTime } from 'date-fns';
import type SourceCourseRepository from '../repositories/SourceCourseRepository.js';
import type SourceCourseSelectionsRepository from '../repositories/SourceCourseSelectionsRepository.js';
import type {
  ApiResponse,
  SourceDataSyncConfig
} from '../types/source-course-sync.js';

/**
 * 数据类型映射
 */
const TYPES = {
  COURSE: '6a7e3d6566aa348acb131ee6287de1ca',
  COURSESELECTION: '88edfcbb9f66e86b3cd490ebf2ed40de'
} as const;

/**
 * 源数据同步服务
 * 负责从外部API获取课程数据并同步到数据库
 */
export default class SourceDataSyncService {
  private axiosClient: AxiosInstance;
  private accessToken: string = '';
  private current: number = 0;
  private expiresIn: number = 3600; // 默认1小时过期

  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      const orgOptions = container.resolve('options');
      return { config: orgOptions.api || {} };
    }
  };

  constructor(
    private readonly config: SourceDataSyncConfig,
    private readonly sourceCourseRepository: SourceCourseRepository,
    private readonly sourceCourseSelectionsRepository: SourceCourseSelectionsRepository,
    private readonly logger: Logger
  ) {
    this.axiosClient = axios.create({
      baseURL: `${config.url}/gateway-api`,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8'
      }
    });
  }

  /**
   * 刷新访问令牌
   */
  private async refreshToken(): Promise<string | undefined> {
    try {
      const now = getUnixTime(new Date());
      if (
        this.accessToken === '' ||
        now - this.current + 60 >= this.expiresIn
      ) {
        this.logger.info('Refreshing access token...');

        const token = await this.axiosClient.post('/jwt/token', {
          appid: this.config.appId,
          secret: this.config.appSecret
        });

        this.accessToken = token.data.data;
        this.current = now;

        this.logger.info('Access token refreshed successfully');
      }
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to refresh token:', error);
      return undefined;
    }
  }

  /**
   * 读取单页数据
   */
  private async readOnePage(
    type: keyof typeof TYPES,
    pageSize: number,
    pageNum: number
  ): Promise<ApiResponse<any>> {
    try {
      const token = await this.refreshToken();
      if (!token) {
        throw new Error('Failed to get access token');
      }

      const params = JSON.stringify({
        id: TYPES[type],
        pageSize,
        pageIndex: pageNum
      });

      this.logger.debug(`Fetching page ${pageNum} with size ${pageSize}`);

      const resp = await this.axiosClient.get(
        `/api/agent/data-service/api-use?token=${token}&jsonStr=${encodeURIComponent(params)}`
      );

      return resp.data;
    } catch (error) {
      this.logger.error(`Failed to read page ${pageNum}:`, error);
      throw error;
    }
  }

  /**
   * 读取所有页面数据
   */
  private async readAllPages(type: keyof typeof TYPES): Promise<any[]> {
    const pageSize = this.config.pageSize || 1000;
    let currentPageNum = 1;
    let maxPageNum = 0;
    const infos: any[] = [];

    this.logger.info(`Starting to fetch all pages for type: ${type}`);

    do {
      const res = await this.readOnePage(type, pageSize, currentPageNum);

      if (maxPageNum === 0) {
        maxPageNum = res.data.totalPages;
        this.logger.info(`Total pages to fetch: ${maxPageNum}`);
      }

      currentPageNum += 1;
      infos.push(...res.data.list);

      this.logger.debug(
        `Fetched page ${currentPageNum - 1}/${maxPageNum}, total records: ${infos.length}`
      );
    } while (currentPageNum <= maxPageNum);

    this.logger.info(
      `Successfully fetched ${infos.length} records from ${maxPageNum} pages`
    );
    return infos;
  }

  /**
   * 同步课程数据
   */
  async syncCourseData(): Promise<DatabaseResult<any>> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting course data synchronization...');

      // 1. 从API获取数据
      const apiStartTime = Date.now();
      const apiData = await this.readAllPages('COURSE');
      const apiDuration = Date.now() - apiStartTime;

      if (apiData.length === 0) {
        this.logger.warn('No course data received from API');
        return {
          success: true,
          data: {
            success: true,
            batchId: '',
            data: [],
            count: 0,
            duration: Date.now() - startTime,
            details: {
              apiDuration,
              transformDuration: 0,
              dbDuration: 0,
              totalPages: 0,
              processedPages: 0
            }
          }
        };
      }

      this.logger.info(`Received ${apiData.length} course records from API`);

      // 2. 同步到数据库
      const syncResult =
        await this.sourceCourseRepository.syncSourceCoursesFromApi(apiData);

      if (!syncResult.success) {
        this.logger.error(
          'Failed to sync course data to database:',
          syncResult.error
        );
        return syncResult;
      }

      // 3. 更新同步结果中的API持续时间
      if (syncResult.data.details) {
        syncResult.data.details.apiDuration = apiDuration;
      }

      const totalDuration = Date.now() - startTime;
      this.logger.info(
        `Course data synchronization completed successfully in ${totalDuration}ms. ` +
          `Batch ID: ${syncResult.data.batchId}, Records: ${syncResult.data.count}`
      );

      return syncResult;
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      this.logger.error(
        `Course data synchronization failed after ${totalDuration}ms:`,
        error
      );

      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 同步选课数据
   */
  async syncCourseSelectionsData(): Promise<DatabaseResult<any>> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting course selections data synchronization...');

      // 1. 从API获取数据
      const apiStartTime = Date.now();
      const apiData = await this.readAllPages('COURSESELECTION');
      const apiDuration = Date.now() - apiStartTime;

      if (apiData.length === 0) {
        this.logger.warn('No course selections data received from API');
        return {
          success: true,
          data: {
            success: true,
            batchId: '',
            data: [],
            count: 0,
            duration: Date.now() - startTime,
            details: {
              apiDuration,
              transformDuration: 0,
              dbDuration: 0,
              totalPages: 0,
              processedPages: 0
            }
          }
        };
      }

      this.logger.info(
        `Received ${apiData.length} course selection records from API`
      );

      // 2. 同步到数据库
      const syncResult =
        await this.sourceCourseSelectionsRepository.syncSourceCourseSelectionsFromApi(
          apiData
        );

      if (!syncResult.success) {
        this.logger.error(
          'Failed to sync course selections data to database:',
          syncResult.error
        );
        return syncResult;
      }

      // 3. 更新同步结果中的API持续时间
      if (syncResult.data.details) {
        syncResult.data.details.apiDuration = apiDuration;
      }

      const totalDuration = Date.now() - startTime;
      this.logger.info(
        `Course selections data synchronization completed successfully in ${totalDuration}ms. ` +
          `Batch ID: ${syncResult.data.batchId}, Records: ${syncResult.data.count}`
      );

      return syncResult;
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      this.logger.error(
        `Course selections data synchronization failed after ${totalDuration}ms:`,
        error
      );

      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 同步所有数据（课程和选课）
   */
  async syncAllData(): Promise<DatabaseResult<any>> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting synchronization of all data...');

      // 1. 同步课程数据
      const courseResult = await this.syncCourseData();
      if (!courseResult.success) {
        this.logger.error('Failed to sync course data');
        return courseResult;
      }

      // 2. 同步选课数据
      const selectionsResult = await this.syncCourseSelectionsData();
      if (!selectionsResult.success) {
        this.logger.error('Failed to sync course selections data');
        return selectionsResult;
      }

      const totalDuration = Date.now() - startTime;
      this.logger.info(
        `All data synchronization completed successfully in ${totalDuration}ms`
      );

      return {
        success: true,
        data: {
          success: true,
          courseSync: courseResult.data,
          selectionsSync: selectionsResult.data,
          totalDuration
        }
      };
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      this.logger.error(
        `All data synchronization failed after ${totalDuration}ms:`,
        error
      );

      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const token = await this.refreshToken();
      return !!token;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 获取同步统计信息
   */
  async getSyncStatistics(): Promise<DatabaseResult<any>> {
    try {
      // 这里可以实现统计逻辑，目前返回基本信息
      return {
        success: true,
        data: {
          message: 'Statistics feature not implemented yet'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get sync statistics:', error);
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 清理旧批次数据
   */
  async cleanupOldBatches(keepCount: number = 3): Promise<DatabaseResult<any>> {
    try {
      // 这里可以实现清理逻辑，目前返回基本信息
      this.logger.info(
        `Cleanup old batches, keeping ${keepCount} latest batches`
      );
      return {
        success: true,
        data: {
          deletedCount: 0,
          message: 'Cleanup feature not implemented yet'
        }
      };
    } catch (error) {
      this.logger.error('Failed to cleanup old batches:', error);
      return {
        success: false,
        error: error as any
      };
    }
  }
}
