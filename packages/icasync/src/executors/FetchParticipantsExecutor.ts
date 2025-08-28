/**
 * 获取课程参与者执行器
 *
 * 功能：
 * 1. 根据开课号(kkh)查询课程参与者
 * 2. 将参与者按100个一组进行分组
 * 3. 返回分组结果供后续执行器使用
 */

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { IStudentCourseRepository } from '../repositories/StudentCourseRepository.js';

/**
 * 获取参与者配置接口
 */
export interface FetchParticipantsConfig {
  /** 开课号 */
  kkh: string;
  /** 日历ID */
  calendarId: string;
  /** 每组用户数量，默认100 */
  batch_size?: number;
}

/**
 * 获取参与者结果接口
 */
export interface FetchParticipantsResult {
  /** 日历ID */
  calendarId: string;
  /** 总参与者数量 */
  total_participants: number;
  /** 分组数量 */
  batch_count: number;
  /** 每组用户数量 */
  batch_size: number;
  /** 分组结果：每组包含用户ID数组 */
  items: any[];
  /** 错误信息 */
  error?: string;
  /** 执行时长(ms) */
  duration: number;
}

/**
 * 获取课程参与者执行器
 */
@Executor({
  name: 'fetchParticipants',
  description: '获取课程参与者执行器 - 根据开课号查询课程参与者并分组',
  version: '1.0.0',
  tags: ['fetch', 'participants', 'course', 'group'],
  category: 'icasync'
})
export default class FetchParticipantsExecutor implements TaskExecutor {
  readonly name = 'fetchParticipants';

  constructor(
    private studentCourseRepository: IStudentCourseRepository,
    private logger: Logger
  ) {}

  /**
   * 执行获取参与者任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FetchParticipantsConfig;

    try {
      // 1. 验证输入参数
      const validationResult = this.validateInputParameters(config);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          duration: Date.now() - startTime
        };
      }

      const { kkh, batch_size = 100 } = config;

      this.logger.info(`开始获取课程参与者，开课号: ${kkh}`);

      // 2. 查询课程参与者
      const participantsResult = await this.getParticipantsByKkh(kkh);
      if (!participantsResult.success) {
        return {
          success: false,
          error: `查询课程参与者失败: ${participantsResult.error}`,
          duration: Date.now() - startTime
        };
      }

      const participantsData = participantsResult.data!;
      // 合并学生和教师ID为完整的参与者列表
      const allParticipantIds = [
        ...participantsData.studentIds,
        ...participantsData.teacherIds
      ];

      this.logger.info(`查询到课程参与者`, {
        kkh,
        students: participantsData.studentIds.length,
        teachers: participantsData.teacherIds.length,
        total: allParticipantIds.length
      });

      // 3. 将参与者按批次分组
      const batches = this.groupParticipants(allParticipantIds, batch_size);
      this.logger.info(
        `参与者分为 ${batches.length} 个批次，每批最多 ${batch_size} 个`
      );

      // 4. 构造返回结果
      const result: FetchParticipantsResult = {
        calendarId: config.calendarId,
        total_participants: allParticipantIds.length,
        batch_count: batches.length,
        batch_size,
        items: batches.map((item) => ({
          permissions: item
        })),
        duration: Date.now() - startTime
      };

      this.logger.info(`获取课程参与者完成`, {
        kkh,
        students: participantsData.studentIds.length,
        teachers: participantsData.teacherIds.length,
        total: allParticipantIds.length,
        batches: batches.length
      });

      return {
        success: true,
        data: result,
        duration: result.duration
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('执行获取参与者任务失败', {
        config,
        error: errorMessage
      });

      return {
        success: false,
        error: `执行失败: ${errorMessage}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 验证输入参数
   */
  private validateInputParameters(config: FetchParticipantsConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config) {
      return { valid: false, error: '配置参数不能为空' };
    }

    if (!config.kkh || typeof config.kkh !== 'string') {
      return { valid: false, error: '开课号(kkh)必须是非空字符串' };
    }

    // 验证开课号格式
    if (config.kkh.length < 3 || config.kkh.length > 40) {
      return {
        valid: false,
        error: '开课号长度应在3-20个字符之间'
      };
    }

    // 验证批次大小
    if (
      config.batch_size &&
      (config.batch_size < 1 || config.batch_size > 100)
    ) {
      return {
        valid: false,
        error: '批次大小应在1-100之间'
      };
    }

    return { valid: true };
  }

  /**
   * 根据开课号查询参与者ID列表
   */
  private async getParticipantsByKkh(kkh: string) {
    try {
      this.logger.debug('查询课程参与者', { kkh });

      const result = await this.studentCourseRepository.findStudentsByKkh(kkh);
      if (!result.success) {
        this.logger.warn('查询课程参与者失败', {
          kkh,
          error: result.error
        });
        return {
          success: false,
          error: result.error
        };
      }

      const participantsData = result.data!;
      const totalCount =
        participantsData.studentIds.length + participantsData.teacherIds.length;

      this.logger.debug('课程参与者查询完成', {
        kkh,
        students: participantsData.studentIds.length,
        teachers: participantsData.teacherIds.length,
        total: totalCount
      });

      return {
        success: true,
        data: participantsData
      };
    } catch (error) {
      this.logger.error('查询课程参与者异常', { kkh, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 将参与者ID列表按指定大小分组
   */
  private groupParticipants(
    participantIds: string[],
    batchSize: number
  ): string[][] {
    const batches: string[][] = [];

    for (let i = 0; i < participantIds.length; i += batchSize) {
      batches.push(participantIds.slice(i, i + batchSize));
    }

    this.logger.debug('参与者分组完成', {
      total: participantIds.length,
      batchSize,
      batchCount: batches.length,
      batchSizes: batches.map((batch) => batch.length)
    });

    return batches;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      // 检查依赖服务是否可用
      if (!this.studentCourseRepository) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}
