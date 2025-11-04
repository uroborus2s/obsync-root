/**
 * 获取同步数据源处理器
 *
 * 功能：
 * 1. 从聚合表获取所有不重复的课程号（kkh）
 * 2. 返回课程号字符串数组，用于后续创建日历子节点
 * 3. 简化版本，专注于课程号获取，不包含复杂的分组数据
 */

import { Executor, type Logger } from '@stratix/core';
import {
  type ExecutionContext,
  type ExecutionResult,
  type TaskExecutor
} from '@stratix/tasks';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';

// 定义验证结果类型
interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * 同步数据源配置（简化版）
 */
export interface FetchSyncSourcesConfig {
  /** 学年学期 */
  xnxq: string;
}

// 移除复杂的接口定义，简化为只返回课程号数组

@Executor({
  name: 'fetchSyncSources',
  description: '获取同步数据源处理器 - 获取所有不重复的课程号',
  version: '4.0.0',
  tags: ['fetch', 'courses', 'v4.0'],
  category: 'icasync'
})
export default class FetchSyncSourcesProcessor implements TaskExecutor {
  readonly name = 'fetchSyncSources';
  readonly description = '获取所有不重复的课程号，用于后续创建日历子节点';
  readonly version = '4.0.0';
  readonly tags = ['sync', 'courses', 'kkh', 'simplified'];
  constructor(
    private juheRenwuRepository: IJuheRenwuRepository,
    private logger: Logger
  ) {}

  /**
   * 执行数据源获取（简化版）
   * 返回所有不重复的课程号数组
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const config = context.config as FetchSyncSourcesConfig;

      // 验证配置
      this.internalValidateConfig(config);

      this.logger.info('开始获取课程号列表', {
        xnxq: config.xnxq
      });

      // 🎯 核心功能：获取所有不重复的课程号
      const coursesResult = await this.juheRenwuRepository.findDistinctCourses(
        config.xnxq
      );
      if (isLeft(coursesResult)) {
        throw new Error(`获取课程列表失败: ${coursesResult.error}`);
      }

      const courseNumbers = coursesResult.right;
      const duration = Date.now() - startTime;

      this.logger.info('课程号获取完成', {
        xnxq: config.xnxq,
        courseCount: courseNumbers.length,
        duration: `${duration}ms`,
        courses: courseNumbers.slice(0, 5) // 只记录前5个课程号用于调试
      });

      // 🎯 直接返回课程号数组
      return {
        success: true,
        data: {
          items: courseNumbers,
          totalCount: courseNumbers.length,
          duration: duration
        } // 返回 string[] 类型
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('获取课程号失败', {
        error: errorMessage,
        duration: `${duration}ms`,
        config: context.config
      });

      return left(errorMessage
      );
    }
  }

  // 移除了 generateRecommendations 方法，简化版本不需要

  /**
   * 验证配置
   */
  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.xnxq) {
      errors.push('学年学期参数 xnxq 是必需的');
    } else if (!/^\d{4}-\d{4}-[12]$/.test(config.xnxq)) {
      errors.push('学年学期格式不正确，应为：YYYY-YYYY-S');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 内部验证配置（抛出异常）
   */
  private internalValidateConfig(config: FetchSyncSourcesConfig): void {
    const result = this.validateConfig(config);
    if (!result.valid && result.errors) {
      throw new Error(result.errors.join('; '));
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      if (!this.juheRenwuRepository) {
        return 'unhealthy';
      }
      return 'healthy';
    } catch (error) {
      this.logger.error('健康检查失败', error);
      return 'unhealthy';
    }
  }
}
