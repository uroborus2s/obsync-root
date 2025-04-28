/**
 * 失败处理器
 * 处理任务失败并应用重试策略
 */

import { Job, JobOptions } from '../types/index.js';
import { RetryStrategy } from './abstract-strategy.js';
import { RetryStrategyFactory } from './strategy-factory.js';

/**
 * 失败处理结果
 */
export enum FailureHandlingResult {
  /**
   * 将重试任务
   */
  RETRY = 'retry',

  /**
   * 任务失败，不再重试
   */
  FAIL = 'fail',

  /**
   * 忽略错误，标记任务为成功
   */
  IGNORE = 'ignore'
}

/**
 * 失败处理选项
 */
export interface FailureHandlingOptions {
  /**
   * 最大重试次数
   */
  maxAttempts?: number;

  /**
   * 重试策略
   */
  retryStrategy?: RetryStrategy;

  /**
   * 是否保留失败的任务
   */
  keepFailed?: boolean;

  /**
   * 是否忽略特定类型的错误
   */
  ignoreErrors?: Array<string | RegExp>;
}

/**
 * 失败处理器
 * 处理任务失败并应用重试策略
 */
export class FailureHandler {
  /**
   * 处理任务失败
   * @param job 失败的任务
   * @param error 错误对象
   * @param options 处理选项
   * @returns 处理结果和延迟时间
   */
  public static async handleFailure(
    job: Job,
    error: Error,
    options: FailureHandlingOptions = {}
  ): Promise<{
    result: FailureHandlingResult;
    delay: number;
  }> {
    // 如果配置了忽略特定错误，检查是否应该忽略
    if (this.shouldIgnoreError(error, options.ignoreErrors)) {
      return {
        result: FailureHandlingResult.IGNORE,
        delay: 0
      };
    }

    // 获取任务选项
    const jobOptions = await this.getJobOptions(job);

    // 确定最大重试次数
    const maxAttempts = options.maxAttempts ?? jobOptions.attempts ?? 0;

    // 如果不应该重试或已达到最大重试次数，标记为失败
    if (maxAttempts <= 0 || job.attemptsMade >= maxAttempts) {
      return {
        result: FailureHandlingResult.FAIL,
        delay: 0
      };
    }

    // 获取重试策略
    const retryStrategy =
      options.retryStrategy ??
      RetryStrategyFactory.createFromBackoff(jobOptions.backoff);

    // 计算重试延迟时间
    const delay = retryStrategy.getDelay(job.attemptsMade);

    // 记录重试信息
    await this.logRetry(job, error, delay, job.attemptsMade, maxAttempts);

    return {
      result: FailureHandlingResult.RETRY,
      delay
    };
  }

  /**
   * 检查是否应该忽略错误
   * @param error 错误对象
   * @param ignorePatterns 要忽略的错误模式
   * @returns 是否应该忽略错误
   */
  private static shouldIgnoreError(
    error: Error,
    ignorePatterns?: Array<string | RegExp>
  ): boolean {
    if (!ignorePatterns || ignorePatterns.length === 0) {
      return false;
    }

    const errorMessage = error.message || '';

    return ignorePatterns.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(errorMessage);
      } else if (typeof pattern === 'string') {
        return errorMessage.includes(pattern);
      }
      return false;
    });
  }

  /**
   * 获取任务选项
   * @param job 任务对象
   * @returns 任务选项
   */
  private static async getJobOptions(job: Job): Promise<JobOptions> {
    try {
      const state = await job.getState();
      // 因为JobState类型中没有定义opts属性，使用any类型绕过类型检查
      return (state as any).opts || {};
    } catch (error) {
      // 如果无法获取状态，返回空对象
      return {};
    }
  }

  /**
   * 记录重试信息
   * @param job 任务对象
   * @param error 错误对象
   * @param delay 延迟时间
   * @param attemptsMade 已尝试次数
   * @param maxAttempts 最大尝试次数
   */
  private static async logRetry(
    job: Job,
    error: Error,
    delay: number,
    attemptsMade: number,
    maxAttempts: number
  ): Promise<void> {
    try {
      const message = `任务失败，将在 ${delay} ms 后重试。尝试 ${
        attemptsMade + 1
      }/${maxAttempts}。错误: ${error.message}`;

      await job.log(message);
    } catch (error) {
      // 忽略日志记录错误
      console.error('记录重试信息失败:', error);
    }
  }
}
