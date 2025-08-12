// @stratix/icasync 变更检测处理器
// 负责检测自上次同步以来的数据变更，用于增量同步

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { IChangeDetectionService } from '../services/ChangeDetectionService.js';

/**
 * 变更检测配置接口
 */
export interface ChangeDetectionConfig {
  xnxq: string; // 学年学期
  lastSyncTimestamp?: string; // 上次同步时间戳
  detectionScope?: string[]; // 检测范围
  timeWindow?: number; // 检测时间窗口(小时)
  generateReport?: boolean; // 是否生成变更报告
  maxChanges?: number; // 最大变更数量限制
}

/**
 * 检测到的变更接口
 */
export interface DetectedChange {
  kkh: string; // 课程号
  changeType: 'new' | 'updated' | 'deleted'; // 变更类型
  timestamp: string; // 变更时间
  fields?: string[]; // 变更字段
  priority: 'high' | 'medium' | 'low'; // 变更优先级
}

/**
 * 变更检测结果接口
 */
export interface ChangeDetectionResult {
  hasChanges: boolean; // 是否有变更
  changes: DetectedChange[]; // 变更列表
  totalChanges: number; // 总变更数
  newCount: number; // 新增数量
  updatedCount: number; // 更新数量
  deletedCount: number; // 删除数量
  highPriorityCount: number; // 高优先级变更数量
  detectionScope: string[]; // 实际检测范围
  timeWindow: number; // 实际时间窗口
  duration: number; // 检测耗时(ms)
  reportUrl?: string; // 变更报告URL
}

/**
 * 变更检测处理器
 *
 * 功能：
 * 1. 检测指定学期自上次同步以来的数据变更
 * 2. 分析变更类型（新增、更新、删除）
 * 3. 计算变更优先级和影响范围
 * 4. 生成详细的变更报告
 * 5. 为增量同步提供变更依据
 */
@Executor({
  name: 'changeDetection',
  description: '变更检测处理器 - 检测自上次同步以来的数据变更',
  version: '3.0.0',
  tags: ['change', 'detection', 'incremental', 'sync', 'v3.0'],
  category: 'icasync'
})
export default class ChangeDetectionProcessor implements TaskExecutor {
  readonly name = 'changeDetection';
  readonly description = '变更检测处理器';
  readonly version = '3.0.0';

  constructor(
    private changeDetectionService: IChangeDetectionService,
    private logger: Logger
  ) {}

  /**
   * 执行变更检测任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as ChangeDetectionConfig;

    this.logger.info('开始执行变更检测', {
      xnxq: config.xnxq,
      lastSyncTimestamp: config.lastSyncTimestamp,
      detectionScope: config.detectionScope,
      timeWindow: config.timeWindow,
      maxChanges: config.maxChanges
    });

    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 执行变更检测
      const result = await this.performChangeDetection(config);

      result.duration = Date.now() - startTime;

      this.logger.info('变更检测完成', {
        xnxq: config.xnxq,
        hasChanges: result.hasChanges,
        totalChanges: result.totalChanges,
        newCount: result.newCount,
        updatedCount: result.updatedCount,
        deletedCount: result.deletedCount,
        highPriorityCount: result.highPriorityCount,
        duration: result.duration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('变更检测失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          hasChanges: false,
          changes: [],
          totalChanges: 0,
          newCount: 0,
          updatedCount: 0,
          deletedCount: 0,
          highPriorityCount: 0,
          detectionScope: config.detectionScope || [],
          timeWindow: config.timeWindow || 24,
          duration
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: ChangeDetectionConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    if (!this.isValidXnxq(config.xnxq)) {
      return { valid: false, error: '学年学期格式不正确，应为：YYYY-YYYY-N' };
    }

    if (config.timeWindow && (config.timeWindow <= 0 || config.timeWindow > 168)) {
      return { valid: false, error: '时间窗口必须在1-168小时之间' };
    }

    if (config.maxChanges && (config.maxChanges <= 0 || config.maxChanges > 10000)) {
      return { valid: false, error: '最大变更数量必须在1-10000之间' };
    }

    return { valid: true };
  }

  /**
   * 执行变更检测
   */
  private async performChangeDetection(
    config: ChangeDetectionConfig
  ): Promise<ChangeDetectionResult> {
    try {
      this.logger.info('开始执行数据变更检测', {
        xnxq: config.xnxq,
        lastSyncTimestamp: config.lastSyncTimestamp
      });

      // 构建检测配置
      const detectionConfig = {
        timeWindow: config.timeWindow || 24,
        generateChangeReport: config.generateReport !== false,
        compareWithExisting: true
      };

      // 调用变更检测服务
      const detectionResult = await this.changeDetectionService.detectCourseChanges(
        config.xnxq,
        detectionConfig
      );

      this.logger.info('数据变更检测完成', {
        xnxq: config.xnxq,
        totalChanges: detectionResult.totalChanges,
        newCourses: detectionResult.newCourses,
        updatedCourses: detectionResult.updatedCourses,
        deletedCourses: detectionResult.deletedCourses
      });

      // 转换检测结果格式
      const changes: DetectedChange[] = detectionResult.changeDetails.map(detail => ({
        kkh: detail.kkh,
        changeType: detail.changeType,
        timestamp: detail.timestamp.toISOString(),
        fields: detail.changedFields,
        priority: this.calculateChangePriority(detail.changeType, detail.changedFields)
      }));

      // 应用最大变更数量限制
      let finalChanges = changes;
      if (config.maxChanges && changes.length > config.maxChanges) {
        // 按优先级排序，保留最重要的变更
        finalChanges = changes
          .sort((a, b) => this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority))
          .slice(0, config.maxChanges);

        this.logger.warn('变更数量超过限制，已截取高优先级变更', {
          totalChanges: changes.length,
          maxChanges: config.maxChanges,
          keptChanges: finalChanges.length
        });
      }

      // 统计信息
      const totalChanges = finalChanges.length;
      const newCount = finalChanges.filter(c => c.changeType === 'new').length;
      const updatedCount = finalChanges.filter(c => c.changeType === 'updated').length;
      const deletedCount = finalChanges.filter(c => c.changeType === 'deleted').length;
      const highPriorityCount = finalChanges.filter(c => c.priority === 'high').length;

      const result: ChangeDetectionResult = {
        hasChanges: totalChanges > 0,
        changes: finalChanges,
        totalChanges,
        newCount,
        updatedCount,
        deletedCount,
        highPriorityCount,
        detectionScope: config.detectionScope || ['calendars', 'schedules', 'participants'],
        timeWindow: detectionConfig.timeWindow,
        duration: 0, // 将在上层设置
        reportUrl: detectionResult.reportUrl
      };

      this.logger.info('变更检测结果处理完成', {
        xnxq: config.xnxq,
        hasChanges: result.hasChanges,
        finalChangesCount: totalChanges,
        highPriorityCount
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('变更检测过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      throw error;
    }
  }

  /**
   * 计算变更优先级
   */
  private calculateChangePriority(
    changeType: 'new' | 'updated' | 'deleted',
    changedFields?: string[]
  ): 'high' | 'medium' | 'low' {
    // 新增和删除通常是高优先级
    if (changeType === 'new' || changeType === 'deleted') {
      return 'high';
    }

    // 更新操作根据变更字段判断优先级
    if (changeType === 'updated' && changedFields) {
      const highPriorityFields = ['kcmc', 'rkjs', 'sksj', 'zt']; // 课程名称、任课教师、上课时间、状态
      const mediumPriorityFields = ['jxdd', 'bz']; // 教学地点、备注

      const hasHighPriorityChange = changedFields.some(field => 
        highPriorityFields.includes(field)
      );
      const hasMediumPriorityChange = changedFields.some(field => 
        mediumPriorityFields.includes(field)
      );

      if (hasHighPriorityChange) {
        return 'high';
      } else if (hasMediumPriorityChange) {
        return 'medium';
      }
    }

    return 'low';
  }

  /**
   * 获取优先级分数（用于排序）
   */
  private getPriorityScore(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }

  /**
   * 验证学年学期格式
   */
  private isValidXnxq(xnxq: string): boolean {
    const pattern = /^\d{4}-\d{4}-[12]$/;
    return pattern.test(xnxq);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查 ChangeDetectionService 是否可用
      if (!this.changeDetectionService) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      this.logger.error('健康检查失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'unhealthy';
    }
  }
}