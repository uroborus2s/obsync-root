/**
 * 抽象重试策略
 * 定义所有重试策略必须实现的接口
 */

/**
 * 重试策略接口
 * 用于计算任务失败后的重试延迟时间
 */
export interface RetryStrategy {
  /**
   * 获取重试延迟时间（毫秒）
   * @param attemptsMade 已经尝试的次数
   * @returns 下次重试的延迟时间（毫秒）
   */
  getDelay(attemptsMade: number): number;

  /**
   * 检查是否应该重试
   * @param attemptsMade 已经尝试的次数
   * @param maxAttempts 最大尝试次数
   * @returns 是否应该继续重试
   */
  shouldRetry(attemptsMade: number, maxAttempts: number): boolean;

  /**
   * 获取策略类型
   * @returns 策略类型名称
   */
  getType(): string;
}

/**
 * 基础重试策略抽象类
 * 提供通用的重试逻辑实现
 */
export abstract class AbstractRetryStrategy implements RetryStrategy {
  /**
   * 检查是否应该重试
   * @param attemptsMade 已经尝试的次数
   * @param maxAttempts 最大尝试次数
   * @returns 是否应该继续重试
   */
  public shouldRetry(attemptsMade: number, maxAttempts: number): boolean {
    // 如果最大尝试次数为0或负数，表示不进行重试
    if (maxAttempts <= 0) {
      return false;
    }

    return attemptsMade < maxAttempts;
  }

  /**
   * 获取重试延迟时间（毫秒）
   * 由子类实现具体的延迟计算逻辑
   */
  public abstract getDelay(attemptsMade: number): number;

  /**
   * 获取策略类型
   * 由子类实现返回具体的策略类型名称
   */
  public abstract getType(): string;
}
