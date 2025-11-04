// @stratix/icasync 变更检测服务
// 负责检测课程数据变更，用于增量同步

import { Logger, type ServiceError } from '@stratix/core';
import {
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import type { ICourseAggregationService } from './CourseAggregation.service.js';

/**
 * 变更详情接口
 */
export interface ChangeDetail {
  kkh: string; // 课程号
  changeType: 'new' | 'updated' | 'deleted'; // 变更类型
  oldData?: any; // 旧数据
  newData?: any; // 新数据
  changedFields?: string[]; // 变更字段
  timestamp: Date; // 变更时间
}

/**
 * 变更检测结果
 */
export interface ChangeDetectionResult {
  totalChanges: number; // 总变更数
  newCourses: number; // 新增课程数
  updatedCourses: number; // 更新课程数
  deletedCourses: number; // 删除课程数
  changeDetails: ChangeDetail[]; // 变更详情
  reportUrl?: string; // 变更报告URL
}

/**
 * 变更检测配置
 */
export interface ChangeDetectionConfig {
  timeWindow?: number; // 检测时间窗口(小时)
  generateChangeReport?: boolean; // 是否生成变更报告
  compareWithExisting?: boolean; // 是否与现有数据比较
}

/**
 * 变更检测服务接口
 */
export interface IChangeDetectionService {
  /**
   * 检测课程变更
   */
  detectCourseChanges(
    xnxq: string,
    config?: ChangeDetectionConfig
  ): Promise<Either<ServiceError, ChangeDetectionResult>>;

  /**
   * 生成变更报告
   */
  generateChangeReport(
    xnxq: string,
    changes: ChangeDetail[]
  ): Promise<Either<ServiceError, string>>;

  /**
   * 创建课程快照
   */
  createCourseSnapshot(xnxq: string): Promise<Either<ServiceError, string>>;

  /**
   * 比较快照差异
   */
  compareSnapshots(
    oldSnapshot: string,
    newSnapshot: string
  ): Promise<Either<ServiceError, ChangeDetail[]>>;
}

/**
 * 变更检测服务实现
 */
export default class ChangeDetectionService implements IChangeDetectionService {
  constructor(
    private readonly courseAggregationService: ICourseAggregationService,
    private readonly logger: Logger
  ) {}

  /**
   * 检测课程变更
   */
  async detectCourseChanges(
    xnxq: string,
    config: ChangeDetectionConfig = {}
  ): Promise<Either<ServiceError, ChangeDetectionResult>> {
    try {
      this.logger.info(`开始检测课程变更，学年学期: ${xnxq}`, {
        timeWindow: config.timeWindow,
        generateChangeReport: config.generateChangeReport
      });

      // 简化实现：通过 CourseAggregationService 执行聚合获取课程数据
      // 实际应该比较不同时间点的数据快照
      const coursesResult =
        await this.courseAggregationService.executeAggregationAndSave(xnxq);

      if (coursesResult._tag === 'Left') {
        return left({
          code: 'COURSE_DATA_FETCH_FAILED',
          message: `获取课程数据失败: ${coursesResult.left}`
        });
      }

      // 模拟变更检测结果
      const changeDetails: ChangeDetail[] = [];
      const totalChanges = 0; // 实际应该通过比较算法计算

      const result: ChangeDetectionResult = {
        totalChanges,
        newCourses: 0,
        updatedCourses: 0,
        deletedCourses: 0,
        changeDetails
      };

      // 生成变更报告
      if (config.generateChangeReport && changeDetails.length > 0) {
        const reportResult = await this.generateChangeReport(
          xnxq,
          changeDetails
        );
        if (reportResult._tag === 'Right') {
          result.reportUrl = reportResult.right;
        } else {
          this.logger.warn('生成变更报告失败', {
            xnxq,
            error: reportResult.left
          });
        }
      }

      this.logger.info(`课程变更检测完成`, {
        xnxq,
        totalChanges: result.totalChanges,
        newCourses: result.newCourses,
        updatedCourses: result.updatedCourses,
        deletedCourses: result.deletedCourses
      });

      return right(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`检测课程变更失败: ${errorMsg}`);

      return left({
        code: 'CHANGE_DETECTION_FAILED',
        message: errorMsg,
        details: error
      });
    }
  }

  /**
   * 生成变更报告
   */
  async generateChangeReport(
    xnxq: string,
    changes: ChangeDetail[]
  ): Promise<Either<ServiceError, string>> {
    try {
      this.logger.info(`生成变更报告，学年学期: ${xnxq}`, {
        changeCount: changes.length
      });

      // 这里应该生成实际的报告文件
      // 目前只返回模拟的URL
      const reportUrl = `/reports/change-detection/${xnxq}-${Date.now()}.html`;

      this.logger.info(`变更报告生成完成`, {
        xnxq,
        reportUrl,
        changeCount: changes.length
      });

      return right(reportUrl);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`生成变更报告失败: ${errorMsg}`);
      return left({
        code: 'REPORT_GENERATION_FAILED',
        message: errorMsg,
        details: error
      });
    }
  }

  /**
   * 创建课程快照
   */
  async createCourseSnapshot(
    xnxq: string
  ): Promise<Either<ServiceError, string>> {
    try {
      this.logger.info(`创建课程快照，学年学期: ${xnxq}`);

      // 这里应该创建实际的数据快照
      // 目前只返回模拟的快照ID
      const snapshotId = `snapshot-${xnxq}-${Date.now()}`;

      this.logger.info(`课程快照创建完成`, {
        xnxq,
        snapshotId
      });

      return right(snapshotId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`创建课程快照失败: ${errorMsg}`);
      return left({
        code: 'SNAPSHOT_CREATION_FAILED',
        message: errorMsg,
        details: error
      });
    }
  }

  /**
   * 比较快照差异
   */
  async compareSnapshots(
    oldSnapshot: string,
    newSnapshot: string
  ): Promise<Either<ServiceError, ChangeDetail[]>> {
    try {
      this.logger.info(`比较快照差异`, {
        oldSnapshot,
        newSnapshot
      });

      // 这里应该实现实际的快照比较算法
      // 目前返回空数组
      const changes: ChangeDetail[] = [];

      this.logger.info(`快照比较完成`, {
        oldSnapshot,
        newSnapshot,
        changeCount: changes.length
      });

      return right(changes);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`比较快照差异失败: ${errorMsg}`);
      return left({
        code: 'SNAPSHOT_COMPARISON_FAILED',
        message: errorMsg,
        details: error
      });
    }
  }
}
