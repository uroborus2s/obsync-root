// @stratix/icasync 增量数据标记处理器
// 负责根据u_jw_kcb_cur的增量数据匹配juhe_renwu记录并将状态标记为'4'

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ICourseRawRepository } from '../repositories/CourseRawRepository.js';

/**
 * 增量数据标记配置接口
 */
export interface MarkIncrementalDataConfig {
  xnxq: string; // 学年学期
  dryRun?: boolean; // 是否仅测试运行
  validateResults?: boolean; // 是否验证结果
}

/**
 * 增量数据标记结果接口
 */
export interface MarkIncrementalDataResult {
  incrementalDataStats: {
    totalCount: number; // 增量数据总数
    amCount: number; // 上午课程数
    pmCount: number; // 下午课程数
    distinctKkhs: string[]; // 不重复的开课号
  };
  markedJuheRenwu: number; // 标记的juhe_renwu记录数
  validationResult?: {
    matchedJuheRenwu: number; // 匹配的juhe_renwu记录数
    updatedJuheRenwu: number; // 已更新的juhe_renwu记录数
    pendingIncrementalData: number; // 待处理的增量数据数
  };
  duration: number; // 执行时长(ms)
  dryRun: boolean; // 是否为测试运行
  errors?: string[]; // 错误信息列表
}

/**
 * 增量数据标记处理器
 *
 * 功能：
 * 1. 分析u_jw_kcb_cur表中的增量数据（gx_zt IS NULL且kkh、rq不为空）
 * 2. 根据业务规则匹配对应的juhe_renwu记录：
 *    - jc < 5 的记录匹配 sjd = 'am' 的juhe_renwu记录
 *    - jc > 4 的记录匹配 sjd = 'pm' 的juhe_renwu记录
 * 3. 将匹配的juhe_renwu记录的gx_zt状态更新为'4'（表示待删除）
 * 4. 提供详细的统计和验证信息
 */
@Executor({
  name: 'markIncrementalDataProcessor',
  description: '增量数据标记处理器 - 标记需要处理的juhe_renwu记录',
  version: '1.0.0',
  tags: ['incremental', 'mark', 'data', 'preprocessing'],
  category: 'icasync'
})
export default class MarkIncrementalDataProcessor implements TaskExecutor {
  readonly name = 'markIncrementalDataProcessor';
  readonly description = '增量数据标记处理器';
  readonly version = '1.0.0';

  constructor(
    private courseRawRepository: ICourseRawRepository,
    private logger: Logger
  ) {}

  /**
   * 执行增量数据标记任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as MarkIncrementalDataConfig;

    this.logger.info('开始执行增量数据标记任务', {
      xnxq: config.xnxq,
      dryRun: config.dryRun,
      validateResults: config.validateResults
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

      // 执行增量数据标记
      const result = await this.performMarkIncrementalData(config);

      result.duration = Date.now() - startTime;

      this.logger.info('增量数据标记任务完成', {
        xnxq: config.xnxq,
        incrementalDataCount: result.incrementalDataStats.totalCount,
        distinctKkhs: result.incrementalDataStats.distinctKkhs.length,
        markedJuheRenwu: result.markedJuheRenwu,
        duration: result.duration,
        dryRun: result.dryRun
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('增量数据标记任务失败', {
        xnxq: config.xnxq,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          incrementalDataStats: {
            totalCount: 0,
            amCount: 0,
            pmCount: 0,
            distinctKkhs: []
          },
          markedJuheRenwu: 0,
          duration,
          errors: [error instanceof Error ? error.message : String(error)],
          dryRun: config.dryRun || false
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: MarkIncrementalDataConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    // 验证学年学期格式（例如: 2023-2024-1）
    const xnxqPattern = /^[0-9]{4}-[0-9]{4}-[12]$/;
    if (!xnxqPattern.test(config.xnxq)) {
      return { valid: false, error: '学年学期格式不正确，应为YYYY-YYYY-N格式' };
    }

    return { valid: true };
  }

  /**
   * 执行增量数据标记
   */
  private async performMarkIncrementalData(
    config: MarkIncrementalDataConfig
  ): Promise<MarkIncrementalDataResult> {
    let markedJuheRenwu = 0;
    const errors: string[] = [];

    try {
      // // 1. 获取增量数据统计信息
      // this.logger.info('获取增量数据统计信息', { xnxq: config.xnxq });

      // const statsResult =
      //   await this.courseRawRepository.getIncrementalDataStats(config.xnxq);
      // if (!statsResult.success) {
      //   throw new Error(`获取增量数据统计失败: ${statsResult.error}`);
      // }

      // const incrementalDataStats = statsResult.data;
      // this.logger.info('增量数据统计', {
      //   xnxq: config.xnxq,
      //   totalCount: incrementalDataStats.totalCount,
      //   amCount: incrementalDataStats.amCount,
      //   pmCount: incrementalDataStats.pmCount,
      //   distinctKkhs: incrementalDataStats.distinctKkhs.length
      // });

      // // 如果没有增量数据，直接返回
      // if (incrementalDataStats.totalCount === 0) {
      //   this.logger.info('未发现增量数据，无需处理');
      //   return {
      //     incrementalDataStats,
      //     markedJuheRenwu: 0,
      //     duration: 0,
      //     dryRun: config.dryRun || false
      //   };
      // }

      // 2. 标记juhe_renwu记录（如果不是测试运行）
      if (!config.dryRun) {
        this.logger.info('开始标记juhe_renwu记录', { xnxq: config.xnxq });

        const markResult =
          await this.courseRawRepository.updateJuheRenwuByIncrementalData(
            config.xnxq
          );
        if (!markResult.success) {
          throw new Error(`标记juhe_renwu记录失败: ${markResult.error}`);
        }

        markedJuheRenwu = markResult.data.updatedJuheRenwu;
        this.logger.info('juhe_renwu记录标记完成', {
          xnxq: config.xnxq,
          updatedJuheRenwu: markResult.data.updatedJuheRenwu,
          updatedCourseRaw: markResult.data.updatedCourseRaw
        });
      } else {
        // 测试运行：估算将要标记的记录数
        // markedJuheRenwu =
        //   incrementalDataStats.amCount + incrementalDataStats.pmCount;
        this.logger.info('[测试运行] 估算标记的juhe_renwu记录数', {
          xnxq: config.xnxq,
          estimatedCount: markedJuheRenwu
        });
      }

      // 3. 验证结果（如果启用）
      let validationResult;
      if (config.validateResults && !config.dryRun) {
        this.logger.info('验证标记结果', { xnxq: config.xnxq });

        const validateResult =
          await this.courseRawRepository.validateIncrementalUpdate(config.xnxq);
        if (validateResult.success) {
          validationResult = validateResult.data;
          this.logger.info('标记结果验证', {
            xnxq: config.xnxq,
            matchedJuheRenwu: validationResult.matchedJuheRenwu,
            updatedJuheRenwu: validationResult.updatedJuheRenwu,
            pendingIncrementalData: validationResult.pendingIncrementalData
          });
        } else {
          const errorMsg = `验证标记结果失败: ${validateResult.error}`;
          this.logger.warn(errorMsg);
          errors.push(errorMsg);
        }
      }

      this.logger.info('增量数据标记处理完成', {
        xnxq: config.xnxq,
        // incrementalDataCount: incrementalDataStats.totalCount,
        markedJuheRenwu,
        hasValidation: !!validationResult
      });

      return {
        incrementalDataStats: {
          totalCount: 0,
          amCount: 0,
          pmCount: 0,
          distinctKkhs: []
        },
        markedJuheRenwu,
        validationResult,
        duration: 0, // 将在上层设置
        errors: errors.length > 0 ? errors : undefined,
        dryRun: config.dryRun || false
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('增量数据标记过程中发生错误', {
        xnxq: config.xnxq,
        error: errorMsg
      });

      errors.push(errorMsg);

      return {
        incrementalDataStats: {
          totalCount: 0,
          amCount: 0,
          pmCount: 0,
          distinctKkhs: []
        },
        markedJuheRenwu,
        duration: 0,
        errors,
        dryRun: config.dryRun || false
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查 CourseRawRepository 是否可用
      if (!this.courseRawRepository) {
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
